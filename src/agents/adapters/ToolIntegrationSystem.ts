import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { EventEmitter } from 'events';

import { AgentError } from '../base/BaseAgent';
import { SAKTool, SAKOperationResult, SAKContext } from './SeiAgentKitAdapter';
import {
  ToolSchema,
  ToolRegistration,
  ToolHandler,
  ToolMiddleware,
  ToolConfig,
  ExecutionContext,
  ExecutionResult,
  ValidationResult,
  ParameterValidator,
  ToolValidator,
  SAKAdapterEvent,
  SAKError
} from './types';

/**
 * Tool Integration System
 * 
 * Comprehensive system for registering, discovering, and executing SAK tools
 * with advanced capabilities including middleware, validation, caching, and monitoring.
 */

// ============================================================================
// Core Tool Integration Engine
// ============================================================================

export class ToolIntegrationEngine extends EventEmitter {
  private readonly toolRegistry = new Map<string, ToolRegistration>();
  private readonly middlewareRegistry = new Map<string, ToolMiddleware>();
  private readonly validatorRegistry = new Map<string, ParameterValidator>();
  private readonly executionQueue = new Map<string, ExecutionContext>();
  private readonly metrics = new ToolMetrics();
  
  constructor(
    private readonly config: ToolIntegrationConfig
  ) {
    super();
    this.setupDefaultValidators();
    this.setupDefaultMiddleware();
    this.setupCleanupTimers();
  }

  // ============================================================================
  // Tool Registration Methods
  // ============================================================================

  /**
   * Register a SAK tool with comprehensive configuration
   */
  public registerTool(
    sakTool: SAKTool,
    schema: ToolSchema,
    config: Partial<ToolConfig> = {}
  ): Either<SAKError, void> {
    return pipe(
      this.validateToolRegistration(sakTool, schema),
      Either.chain(() => this.createToolRegistration(sakTool, schema, config)),
      Either.map(registration => {
        this.toolRegistry.set(sakTool.name, registration);
        this.emitEvent({
          type: 'tool:registered',
          toolName: sakTool.name,
          timestamp: Date.now(),
          metadata: { category: sakTool.category }
        });
        return undefined;
      })
    );
  }

  /**
   * Unregister a tool
   */
  public unregisterTool(toolName: string): Either<SAKError, void> {
    const registration = this.toolRegistry.get(toolName);
    if (!registration) {
      return left(this.createError('TOOL_NOT_FOUND', `Tool ${toolName} not registered`));
    }

    this.toolRegistry.delete(toolName);
    this.emitEvent({
      type: 'tool:unregistered',
      toolName,
      timestamp: Date.now(),
      metadata: {}
    });

    return right(undefined);
  }

  /**
   * Get tool registration
   */
  public getTool(toolName: string): Either<SAKError, ToolRegistration> {
    const registration = this.toolRegistry.get(toolName);
    if (!registration) {
      return left(this.createError('TOOL_NOT_FOUND', `Tool ${toolName} not registered`));
    }

    return right(registration);
  }

  /**
   * List all registered tools
   */
  public listTools(): ToolRegistration[] {
    return Array.from(this.toolRegistry.values());
  }

  /**
   * Get tools by category
   */
  public getToolsByCategory(category: string): ToolRegistration[] {
    return this.listTools().filter(tool => 
      tool.schema.tags.includes(category)
    );
  }

  /**
   * Search tools by criteria
   */
  public searchTools(criteria: ToolSearchCriteria): ToolRegistration[] {
    return this.listTools().filter(tool => {
      if (criteria.name && !tool.toolName.toLowerCase().includes(criteria.name.toLowerCase())) {
        return false;
      }
      if (criteria.category && !tool.schema.tags.includes(criteria.category)) {
        return false;
      }
      if (criteria.tags && !criteria.tags.every(tag => tool.schema.tags.includes(tag))) {
        return false;
      }
      if (criteria.status && tool.status !== criteria.status) {
        return false;
      }
      return true;
    });
  }

  // ============================================================================
  // Tool Execution Methods
  // ============================================================================

  /**
   * Execute a tool with full middleware pipeline
   */
  public executeTool(
    toolName: string,
    parameters: Record<string, any>,
    context: Partial<ExecutionContext> = {}
  ): TaskEither<SAKError, ExecutionResult> {
    return pipe(
      this.createExecutionContext(toolName, parameters, context),
      TE.fromEither,
      TE.chain(execContext => 
        pipe(
          this.executeWithMiddleware(execContext),
          TE.map(result => {
            this.updateMetrics(toolName, result);
            this.emitExecutionEvent(execContext, result);
            return result;
          })
        )
      )
    );
  }

  /**
   * Execute multiple tools in batch
   */
  public executeBatch(
    operations: Array<{
      toolName: string;
      parameters: Record<string, any>;
      context?: Partial<ExecutionContext>;
    }>
  ): TaskEither<SAKError, ExecutionResult[]> {
    const batchId = this.generateExecutionId();
    const startTime = Date.now();

    return pipe(
      operations.map(op => this.executeTool(op.toolName, op.parameters, op.context)),
      TE.sequenceArray,
      TE.map(results => {
        const duration = Date.now() - startTime;
        const successCount = results.filter(r => r.success).length;
        
        this.emitEvent({
          type: 'batch:executed',
          batchId,
          toolCount: operations.length,
          successCount,
          failureCount: operations.length - successCount,
          duration,
          timestamp: Date.now(),
          metadata: { operations: operations.map(op => op.toolName) }
        });

        return results;
      })
    );
  }

  /**
   * Execute tool with caching
   */
  public executeWithCache(
    toolName: string,
    parameters: Record<string, any>,
    context: Partial<ExecutionContext> = {}
  ): TaskEither<SAKError, ExecutionResult> {
    const cacheKey = this.generateCacheKey(toolName, parameters);
    
    return pipe(
      this.getFromCache(cacheKey),
      TE.fromEither,
      TE.fold(
        () => pipe(
          this.executeTool(toolName, parameters, context),
          TE.map(result => {
            if (result.success && this.shouldCache(toolName, result)) {
              this.setInCache(cacheKey, result);
            }
            return result;
          })
        ),
        cachedResult => TE.right(cachedResult)
      )
    );
  }

  // ============================================================================
  // Middleware Management
  // ============================================================================

  /**
   * Register middleware
   */
  public registerMiddleware(middleware: ToolMiddleware): Either<SAKError, void> {
    if (this.middlewareRegistry.has(middleware.name)) {
      return left(this.createError('MIDDLEWARE_EXISTS', `Middleware ${middleware.name} already registered`));
    }

    this.middlewareRegistry.set(middleware.name, middleware);
    return right(undefined);
  }

  /**
   * Unregister middleware
   */
  public unregisterMiddleware(middlewareName: string): Either<SAKError, void> {
    if (!this.middlewareRegistry.has(middlewareName)) {
      return left(this.createError('MIDDLEWARE_NOT_FOUND', `Middleware ${middlewareName} not found`));
    }

    this.middlewareRegistry.delete(middlewareName);
    return right(undefined);
  }

  /**
   * Execute with middleware pipeline
   */
  private executeWithMiddleware(context: ExecutionContext): TaskEither<SAKError, ExecutionResult> {
    const registration = this.toolRegistry.get(context.toolName);
    if (!registration) {
      return TE.left(this.createError('TOOL_NOT_FOUND', `Tool ${context.toolName} not registered`));
    }

    // Get applicable middleware sorted by priority
    const middleware = [...registration.middleware, ...this.getGlobalMiddleware()]
      .sort((a, b) => b.priority - a.priority);

    // Build middleware chain
    const executeChain = middleware.reduceRight(
      (next, mw) => () => mw.handler(context, next),
      () => this.executeToolCore(context, registration)
    );

    return executeChain();
  }

  /**
   * Core tool execution (without middleware)
   */
  private executeToolCore(
    context: ExecutionContext,
    registration: ToolRegistration
  ): TaskEither<SAKError, ExecutionResult> {
    const startTime = Date.now();

    return pipe(
      this.validateExecution(context, registration),
      TE.fromEither,
      TE.chain(() => registration.handler(context)),
      TE.map(result => ({
        ...result,
        metadata: {
          ...result.metadata,
          executionId: context.id,
          toolName: context.toolName,
          duration: Date.now() - startTime,
          timestamp: Date.now()
        }
      })),
      TE.mapLeft(error => ({
        ...error,
        context,
        category: 'execution' as const,
        severity: 'medium' as const,
        retryable: this.isRetryableError(error)
      }))
    );
  }

  // ============================================================================
  // Validation System
  // ============================================================================

  /**
   * Validate tool registration
   */
  private validateToolRegistration(
    sakTool: SAKTool,
    schema: ToolSchema
  ): Either<SAKError, void> {
    // Check tool name uniqueness
    if (this.toolRegistry.has(sakTool.name)) {
      return left(this.createError('TOOL_EXISTS', `Tool ${sakTool.name} already registered`));
    }

    // Validate schema
    const schemaValidation = this.validateToolSchema(schema);
    if (!schemaValidation.isValid) {
      return left(this.createError('INVALID_SCHEMA', 'Tool schema validation failed', schemaValidation.errors));
    }

    // Validate SAK tool structure
    const sakToolValidation = this.validateSAKTool(sakTool);
    if (!sakToolValidation.isValid) {
      return left(this.createError('INVALID_SAK_TOOL', 'SAK tool validation failed', sakToolValidation.errors));
    }

    return right(undefined);
  }

  /**
   * Validate execution context
   */
  private validateExecution(
    context: ExecutionContext,
    registration: ToolRegistration
  ): Either<SAKError, void> {
    // Validate permissions
    const permissionCheck = this.checkPermissions(context, registration);
    if (permissionCheck._tag === 'Left') {
      return permissionCheck;
    }

    // Validate rate limits
    const rateLimitCheck = this.checkRateLimit(context, registration);
    if (rateLimitCheck._tag === 'Left') {
      return rateLimitCheck;
    }

    // Validate parameters
    const parameterValidation = this.validateParameters(context.parameters, registration.schema);
    if (!parameterValidation.isValid) {
      return left(this.createError('PARAMETER_VALIDATION_FAILED', 'Parameter validation failed', parameterValidation.errors));
    }

    return right(undefined);
  }

  /**
   * Validate tool schema
   */
  private validateToolSchema(schema: ToolSchema): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!schema.name || typeof schema.name !== 'string') {
      errors.push({ field: 'name', message: 'Tool name is required', code: 'REQUIRED' });
    }

    if (!schema.description || typeof schema.description !== 'string') {
      errors.push({ field: 'description', message: 'Tool description is required', code: 'REQUIRED' });
    }

    if (!schema.parameters || typeof schema.parameters !== 'object') {
      errors.push({ field: 'parameters', message: 'Tool parameters are required', code: 'REQUIRED' });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate SAK tool
   */
  private validateSAKTool(sakTool: SAKTool): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!sakTool.name || typeof sakTool.name !== 'string') {
      errors.push({ field: 'name', message: 'SAK tool name is required', code: 'REQUIRED' });
    }

    if (!sakTool.execute || typeof sakTool.execute !== 'function') {
      errors.push({ field: 'execute', message: 'SAK tool execute function is required', code: 'REQUIRED' });
    }

    if (!sakTool.category || !['blockchain', 'defi', 'trading', 'analysis', 'utility'].includes(sakTool.category)) {
      errors.push({ field: 'category', message: 'Valid SAK tool category is required', code: 'INVALID_VALUE' });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate parameters against schema
   */
  private validateParameters(
    parameters: Record<string, any>,
    schema: ToolSchema
  ): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    for (const [paramName, paramSchema] of Object.entries(schema.parameters)) {
      const value = parameters[paramName];

      // Check required parameters
      if (paramSchema.required && (value === undefined || value === null)) {
        errors.push({
          field: paramName,
          message: `Parameter ${paramName} is required`,
          code: 'REQUIRED'
        });
        continue;
      }

      // Skip validation for optional undefined parameters
      if (value === undefined || value === null) {
        continue;
      }

      // Validate parameter using registered validator
      const validator = this.validatorRegistry.get(paramSchema.type);
      if (validator) {
        const validation = validator(value, paramSchema);
        errors.push(...validation.errors);
        warnings.push(...validation.warnings);
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // ============================================================================
  // Permission and Rate Limiting
  // ============================================================================

  /**
   * Check permissions
   */
  private checkPermissions(
    context: ExecutionContext,
    registration: ToolRegistration
  ): Either<SAKError, void> {
    const requiredPermissions = registration.config.permissions;
    const userPermissions = context.permissions;

    const hasPermission = requiredPermissions.every(required => 
      userPermissions.includes(required) || userPermissions.includes('*')
    );

    if (!hasPermission) {
      this.emitEvent({
        type: 'permission:denied',
        toolName: context.toolName,
        userId: context.userId,
        requiredPermissions,
        userPermissions,
        timestamp: Date.now(),
        metadata: { executionId: context.id }
      });

      return left(this.createPermissionError(requiredPermissions, userPermissions, context.toolName));
    }

    return right(undefined);
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(
    context: ExecutionContext,
    registration: ToolRegistration
  ): Either<SAKError, void> {
    const rateLimit = registration.config.rateLimit;
    if (!rateLimit) {
      return right(undefined);
    }

    const key = `${context.toolName}:${context.userId || 'anonymous'}`;
    const now = Date.now();
    const window = now - rateLimit.windowMs;

    // Get recent executions
    const recentExecutions = this.getRecentExecutions(key, window);
    
    if (recentExecutions.length >= rateLimit.maxRequests) {
      this.emitEvent({
        type: 'rateLimit:exceeded',
        toolName: context.toolName,
        userId: context.userId,
        limit: rateLimit.maxRequests,
        windowMs: rateLimit.windowMs,
        timestamp: Date.now(),
        metadata: { executionId: context.id }
      });

      return left(this.createRateLimitError(rateLimit, context.toolName));
    }

    // Record this execution
    this.recordExecution(key, now);
    return right(undefined);
  }

  // ============================================================================
  // Caching System
  // ============================================================================

  /**
   * Get result from cache
   */
  private getFromCache(key: string): Either<SAKError, ExecutionResult> {
    if (!this.config.cache.enabled) {
      return left(this.createError('CACHE_DISABLED', 'Caching is disabled'));
    }

    const cached = this.cache.get(key);
    if (!cached || Date.now() > cached.expiresAt) {
      this.emitEvent({
        type: 'cache:miss',
        key,
        timestamp: Date.now(),
        metadata: {}
      });
      return left(this.createError('CACHE_MISS', 'Cache miss'));
    }

    this.emitEvent({
      type: 'cache:hit',
      key,
      timestamp: Date.now(),
      metadata: {}
    });

    return right({
      ...cached.result,
      metadata: {
        ...cached.result.metadata,
        cacheHit: true
      }
    });
  }

  /**
   * Set result in cache
   */
  private setInCache(key: string, result: ExecutionResult): void {
    if (!this.config.cache.enabled) {
      return;
    }

    this.cache.set(key, {
      result,
      expiresAt: Date.now() + this.config.cache.ttl,
      createdAt: Date.now()
    });

    // Clean up expired entries if cache is full
    if (this.cache.size > this.config.cache.maxSize) {
      this.cleanupCache();
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(toolName: string, parameters: Record<string, any>): string {
    const paramHash = this.hashObject(parameters);
    return `${this.config.cache.keyPrefix}:${toolName}:${paramHash}`;
  }

  /**
   * Check if result should be cached
   */
  private shouldCache(toolName: string, result: ExecutionResult): boolean {
    const registration = this.toolRegistry.get(toolName);
    if (!registration?.config.cache?.enabled) {
      return false;
    }

    return result.success && !result.error;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Create tool registration
   */
  private createToolRegistration(
    sakTool: SAKTool,
    schema: ToolSchema,
    configOverride: Partial<ToolConfig>
  ): Either<SAKError, ToolRegistration> {
    const defaultConfig: ToolConfig = {
      timeout: this.config.execution.defaultTimeout,
      retries: this.config.execution.defaultRetries,
      permissions: sakTool.permission ? [sakTool.permission] : [],
      validation: {
        strict: true,
        sanitize: true
      }
    };

    const config = { ...defaultConfig, ...configOverride };
    
    // Create tool handler that wraps SAK tool execution
    const handler: ToolHandler = (context: ExecutionContext) => {
      return pipe(
        TE.tryCatch(
          async () => {
            const result = await sakTool.execute(context.parameters);
            return {
              success: true,
              data: result as ReadonlyRecord<string, unknown>,
              metadata: {
                executionId: context.id,
                toolName: context.toolName,
                duration: 0, // Will be set by middleware
                timestamp: Date.now()
              }
            } as ExecutionResult;
          },
          error => this.createError('TOOL_EXECUTION_FAILED', `Tool execution failed: ${error}`, error)
        )
      );
    };

    const registration: ToolRegistration = {
      toolName: sakTool.name,
      schema,
      handler,
      middleware: [],
      config,
      status: 'active',
      registeredAt: Date.now(),
      usageCount: 0
    };

    return right(registration);
  }

  /**
   * Create execution context
   */
  private createExecutionContext(
    toolName: string,
    parameters: Record<string, any>,
    contextOverride: Partial<ExecutionContext>
  ): Either<SAKError, ExecutionContext> {
    const registration = this.toolRegistry.get(toolName);
    if (!registration) {
      return left(this.createError('TOOL_NOT_FOUND', `Tool ${toolName} not registered`));
    }

    const context: ExecutionContext = {
      id: this.generateExecutionId(),
      sessionId: this.generateSessionId(),
      toolName,
      parameters,
      metadata: {
        source: 'api',
        priority: 'medium',
        tags: [],
        retryCount: 0,
        maxRetries: registration.config.retries
      },
      permissions: [],
      startTime: Date.now(),
      timeout: registration.config.timeout,
      ...contextOverride
    };

    return right(context);
  }

  /**
   * Setup default validators
   */
  private setupDefaultValidators(): void {
    // String validator
    this.validatorRegistry.set('string', (value, schema) => {
      const errors: any[] = [];
      const warnings: any[] = [];

      if (typeof value !== 'string') {
        errors.push({ field: 'value', message: 'Value must be a string', code: 'TYPE_MISMATCH' });
        return { isValid: false, errors, warnings };
      }

      if (schema.constraints?.min && value.length < schema.constraints.min) {
        errors.push({ field: 'value', message: `String must be at least ${schema.constraints.min} characters`, code: 'MIN_LENGTH' });
      }

      if (schema.constraints?.max && value.length > schema.constraints.max) {
        errors.push({ field: 'value', message: `String must be at most ${schema.constraints.max} characters`, code: 'MAX_LENGTH' });
      }

      if (schema.constraints?.pattern && !new RegExp(schema.constraints.pattern).test(value)) {
        errors.push({ field: 'value', message: `String must match pattern ${schema.constraints.pattern}`, code: 'PATTERN_MISMATCH' });
      }

      if (schema.constraints?.enum && !schema.constraints.enum.includes(value)) {
        errors.push({ field: 'value', message: `Value must be one of: ${schema.constraints.enum.join(', ')}`, code: 'ENUM_MISMATCH' });
      }

      return { isValid: errors.length === 0, errors, warnings };
    });

    // Number validator
    this.validatorRegistry.set('number', (value, schema) => {
      const errors: any[] = [];
      const warnings: any[] = [];

      if (typeof value !== 'number' || isNaN(value)) {
        errors.push({ field: 'value', message: 'Value must be a number', code: 'TYPE_MISMATCH' });
        return { isValid: false, errors, warnings };
      }

      if (schema.constraints?.min !== undefined && value < schema.constraints.min) {
        errors.push({ field: 'value', message: `Number must be at least ${schema.constraints.min}`, code: 'MIN_VALUE' });
      }

      if (schema.constraints?.max !== undefined && value > schema.constraints.max) {
        errors.push({ field: 'value', message: `Number must be at most ${schema.constraints.max}`, code: 'MAX_VALUE' });
      }

      return { isValid: errors.length === 0, errors, warnings };
    });

    // Boolean validator
    this.validatorRegistry.set('boolean', (value, schema) => {
      const errors: any[] = [];
      const warnings: any[] = [];

      if (typeof value !== 'boolean') {
        errors.push({ field: 'value', message: 'Value must be a boolean', code: 'TYPE_MISMATCH' });
      }

      return { isValid: errors.length === 0, errors, warnings };
    });

    // Object validator
    this.validatorRegistry.set('object', (value, schema) => {
      const errors: any[] = [];
      const warnings: any[] = [];

      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push({ field: 'value', message: 'Value must be an object', code: 'TYPE_MISMATCH' });
        return { isValid: false, errors, warnings };
      }

      // Validate object properties if schema provided
      if (schema.constraints?.properties) {
        for (const [propName, propSchema] of Object.entries(schema.constraints.properties)) {
          const propValue = value[propName];
          const validator = this.validatorRegistry.get(propSchema.type);
          
          if (validator) {
            const validation = validator(propValue, propSchema);
            errors.push(...validation.errors.map(e => ({ ...e, field: `${propName}.${e.field}` })));
            warnings.push(...validation.warnings.map(w => ({ ...w, field: `${propName}.${w.field}` })));
          }
        }
      }

      return { isValid: errors.length === 0, errors, warnings };
    });

    // Array validator
    this.validatorRegistry.set('array', (value, schema) => {
      const errors: any[] = [];
      const warnings: any[] = [];

      if (!Array.isArray(value)) {
        errors.push({ field: 'value', message: 'Value must be an array', code: 'TYPE_MISMATCH' });
        return { isValid: false, errors, warnings };
      }

      if (schema.constraints?.min && value.length < schema.constraints.min) {
        errors.push({ field: 'value', message: `Array must have at least ${schema.constraints.min} items`, code: 'MIN_LENGTH' });
      }

      if (schema.constraints?.max && value.length > schema.constraints.max) {
        errors.push({ field: 'value', message: `Array must have at most ${schema.constraints.max} items`, code: 'MAX_LENGTH' });
      }

      // Validate array items if schema provided
      if (schema.constraints?.items) {
        const itemValidator = this.validatorRegistry.get(schema.constraints.items.type);
        if (itemValidator) {
          value.forEach((item, index) => {
            const validation = itemValidator(item, schema.constraints!.items!);
            errors.push(...validation.errors.map(e => ({ ...e, field: `[${index}].${e.field}` })));
            warnings.push(...validation.warnings.map(w => ({ ...w, field: `[${index}].${w.field}` })));
          });
        }
      }

      return { isValid: errors.length === 0, errors, warnings };
    });
  }

  /**
   * Setup default middleware
   */
  private setupDefaultMiddleware(): void {
    // Logging middleware
    this.registerMiddleware({
      name: 'logging',
      priority: 1000,
      handler: (context, next) => {
        console.log(`Executing tool: ${context.toolName} with ID: ${context.id}`);
        return pipe(
          next(),
          TE.map(result => {
            console.log(`Tool execution completed: ${context.toolName} - Success: ${result.success}`);
            return result;
          }),
          TE.mapLeft(error => {
            console.error(`Tool execution failed: ${context.toolName} - Error: ${error.message}`);
            return error;
          })
        );
      }
    });

    // Timeout middleware
    this.registerMiddleware({
      name: 'timeout',
      priority: 900,
      handler: (context, next) => {
        return pipe(
          TE.fromTask(() => 
            Promise.race([
              next()(),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Execution timeout')), context.timeout)
              )
            ])
          ),
          TE.mapLeft(error => 
            this.createError('EXECUTION_TIMEOUT', `Tool execution timed out after ${context.timeout}ms`, error)
          )
        );
      }
    });

    // Error handling middleware
    this.registerMiddleware({
      name: 'errorHandling',
      priority: 800,
      handler: (context, next) => {
        return pipe(
          next(),
          TE.mapLeft(error => {
            // Log error
            console.error(`Tool execution error in ${context.toolName}:`, error);
            
            // Check if error is retryable
            if (this.isRetryableError(error) && context.metadata.retryCount < context.metadata.maxRetries) {
              console.log(`Retrying execution: attempt ${context.metadata.retryCount + 1}`);
              context.metadata.retryCount++;
              return error; // Will trigger retry logic
            }
            
            return error;
          })
        );
      }
    });
  }

  /**
   * Setup cleanup timers
   */
  private setupCleanupTimers(): void {
    // Cache cleanup
    if (this.config.cache.enabled) {
      setInterval(() => {
        this.cleanupCache();
      }, this.config.cache.cleanupInterval || 300000); // 5 minutes
    }

    // Execution queue cleanup
    setInterval(() => {
      this.cleanupExecutionQueue();
    }, 60000); // 1 minute

    // Metrics cleanup
    setInterval(() => {
      this.cleanupMetrics();
    }, 3600000); // 1 hour
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private readonly cache = new Map<string, CacheEntry>();
  private readonly executionHistory = new Map<string, number[]>();

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashObject(obj: any): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').substr(0, 16);
  }

  private getGlobalMiddleware(): ToolMiddleware[] {
    return Array.from(this.middlewareRegistry.values())
      .filter(mw => mw.name.startsWith('global:'));
  }

  private updateMetrics(toolName: string, result: ExecutionResult): void {
    this.metrics.recordExecution(toolName, result);
  }

  private emitExecutionEvent(context: ExecutionContext, result: ExecutionResult): void {
    this.emitEvent({
      type: result.success ? 'tool:executed' : 'tool:failed',
      toolName: context.toolName,
      executionId: context.id,
      duration: result.metadata.duration || 0,
      success: result.success,
      error: result.error?.message,
      timestamp: Date.now(),
      metadata: { userId: context.userId }
    });
  }

  private emitEvent(event: SAKAdapterEvent): void {
    this.emit('sak:adapter:event', event);
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'TEMPORARY_UNAVAILABLE'];
    return retryableCodes.includes(error.code);
  }

  private getRecentExecutions(key: string, since: number): number[] {
    const executions = this.executionHistory.get(key) || [];
    return executions.filter(time => time > since);
  }

  private recordExecution(key: string, timestamp: number): void {
    const executions = this.executionHistory.get(key) || [];
    executions.push(timestamp);
    this.executionHistory.set(key, executions);
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  private cleanupExecutionQueue(): void {
    const now = Date.now();
    const timeout = 300000; // 5 minutes
    
    for (const [id, context] of this.executionQueue.entries()) {
      if (now - context.startTime > timeout) {
        this.executionQueue.delete(id);
      }
    }
  }

  private cleanupMetrics(): void {
    this.metrics.cleanup();
  }

  private createError(code: string, message: string, details?: any): SAKError {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
      agentId: 'tool-integration-engine',
      category: 'execution',
      severity: 'medium',
      retryable: false
    };
  }

  private createPermissionError(required: string[], user: string[], resource: string): SAKError {
    return {
      code: 'PERMISSION_DENIED',
      message: `Insufficient permissions for ${resource}`,
      details: { required, user, resource },
      timestamp: new Date(),
      agentId: 'tool-integration-engine',
      category: 'permission',
      severity: 'medium',
      retryable: false
    } as any;
  }

  private createRateLimitError(limit: any, toolName: string): SAKError {
    return {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded for tool ${toolName}`,
      details: { limit, toolName },
      timestamp: new Date(),
      agentId: 'tool-integration-engine',
      category: 'rateLimit',
      severity: 'low',
      retryable: true
    } as any;
  }
}

// ============================================================================
// Supporting Classes and Interfaces
// ============================================================================

interface ToolIntegrationConfig {
  execution: {
    defaultTimeout: number;
    defaultRetries: number;
    maxConcurrentExecutions: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    keyPrefix: string;
    cleanupInterval?: number;
  };
  validation: {
    strict: boolean;
    sanitizeInput: boolean;
    validateOutput: boolean;
  };
  monitoring: {
    enabled: boolean;
    metricsRetention: number;
    alertThresholds: {
      errorRate: number;
      responseTime: number;
    };
  };
}

interface ToolSearchCriteria {
  name?: string;
  category?: string;
  tags?: string[];
  status?: 'active' | 'inactive' | 'deprecated';
}

interface CacheEntry {
  result: ExecutionResult;
  expiresAt: number;
  createdAt: number;
}

class ToolMetrics {
  private readonly metrics = new Map<string, ToolMetricData>();

  recordExecution(toolName: string, result: ExecutionResult): void {
    const data = this.metrics.get(toolName) || this.createEmptyMetrics();
    
    data.totalExecutions++;
    data.lastExecution = Date.now();
    
    if (result.success) {
      data.successCount++;
    } else {
      data.errorCount++;
    }
    
    if (result.metadata.duration) {
      data.totalDuration += result.metadata.duration;
      data.averageDuration = data.totalDuration / data.totalExecutions;
    }
    
    this.metrics.set(toolName, data);
  }

  getMetrics(toolName: string): ToolMetricData | undefined {
    return this.metrics.get(toolName);
  }

  getAllMetrics(): Map<string, ToolMetricData> {
    return new Map(this.metrics);
  }

  cleanup(): void {
    const oneHourAgo = Date.now() - 3600000;
    for (const [toolName, data] of this.metrics.entries()) {
      if (data.lastExecution < oneHourAgo && data.totalExecutions === 0) {
        this.metrics.delete(toolName);
      }
    }
  }

  private createEmptyMetrics(): ToolMetricData {
    return {
      totalExecutions: 0,
      successCount: 0,
      errorCount: 0,
      totalDuration: 0,
      averageDuration: 0,
      lastExecution: 0
    };
  }
}

interface ToolMetricData {
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  totalDuration: number;
  averageDuration: number;
  lastExecution: number;
}

export {
  ToolIntegrationEngine,
  ToolIntegrationConfig,
  ToolSearchCriteria,
  ToolMetrics,
  ToolMetricData
};