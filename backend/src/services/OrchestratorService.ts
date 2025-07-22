import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { createServiceLogger } from './LoggingService';
import axios, { AxiosInstance } from 'axios';
import OpenAI from 'openai';
import { getMCPHttpClient, mcpTools } from '../utils/mcp-http-client';
import { getConfig } from '../config';
// import type { Orchestrator } from '../../../src/orchestrator/core';
import type { SeiIntegrationService } from './SeiIntegrationService';
import type { PortfolioAnalyticsService } from './PortfolioAnalyticsService';
import type { RealTimeDataService } from './RealTimeDataService';
import type { SocketService } from './SocketService';

/**
 * OrchestratorService - Backend Integration Orchestrator
 * 
 * This service bridges the core orchestrator with backend services, providing
 * enhanced orchestration capabilities with real-time data, analytics, and
 * socket-based communication. It maintains fp-ts patterns throughout.
 */

// ============================================================================
// Enhanced Orchestrator Types
// ============================================================================

export interface MCPServerEndpoint {
  name: string;
  url: string;
  apiKey?: string;
  timeout?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatContext {
  walletAddress?: string;
  sessionId: string;
  messages: ChatMessage[];
  metadata?: Record<string, any>;
}

export interface ChatOrchestrationRequest {
  message: string;
  context: ChatContext;
  intent?: string;
  requiresBlockchainData?: boolean;
}

export interface ChatOrchestrationResponse {
  response: string;
  data?: any;
  actions?: Array<{
    type: string;
    params: any;
  }>;
  metadata: {
    mcpServersUsed: string[];
    processingTime: number;
    intent?: string;
    confidence?: number;
  };
}

export interface BackendOrchestratorConfig {
  core: {
    maxConcurrentTasks: number;
    taskTimeout: number;
    retryAttempts: number;
    priorityQueueSize: number;
  };
  adapters: {
    hive: {
      enabled: boolean;
      baseUrl: string;
      apiKey: string;
      rateLimitConfig: {
        maxRequests: number;
        windowMs: number;
      };
    };
    sak: {
      enabled: boolean;
      seiRpcUrl: string;
      seiEvmRpcUrl: string;
      chainId: string;
      network: 'mainnet' | 'testnet' | 'devnet';
      defaultPermissions: string[];
    };
    mcp: {
      enabled: boolean;
      endpoint: string;
      port: number;
      secure: boolean;
      apiKey?: string;
    };
  };
  mcpServers: {
    hiveIntelligence: MCPServerEndpoint;
    seiBlockchain: MCPServerEndpoint;
    portfolioManager: MCPServerEndpoint;
  };
  openai: {
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
  realTime: {
    enabled: boolean;
    streamTypes: string[];
    batchSize: number;
    maxDelay: number;
  };
  analytics: {
    enabled: boolean;
    autoAnalysis: boolean;
    analysisInterval: number;
    dragonBallTheme: boolean;
  };
  notifications: {
    enabled: boolean;
    criticalAlerts: boolean;
    performanceAlerts: boolean;
    portfolioAlerts: boolean;
  };
}

export interface EnhancedUserIntent {
  id: string;
  userId: string;
  walletAddress: string;
  type: 'lending' | 'liquidity' | 'portfolio' | 'trading' | 'analysis' | 'info' | 'risk';
  action: string;
  parameters: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context: {
    sessionId: string;
    timestamp: Date;
    source: 'chat' | 'api' | 'automated' | 'webhook';
    metadata?: Record<string, any>;
  };
  constraints?: {
    maxGasCost?: number;
    timeLimit?: number;
    riskTolerance?: 'low' | 'medium' | 'high';
    requireConfirmation?: boolean;
  };
}

export interface OrchestrationResult {
  intentId: string;
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
    recoverable: boolean;
  };
  metadata: {
    executionTime: number;
    adaptersUsed: string[];
    tasksExecuted: number;
    gasUsed?: number;
    confirmationRequired?: boolean;
  };
  analytics?: {
    riskAssessment: any;
    performanceMetrics: any;
    recommendations: string[];
    dragonBallAssessment?: {
      powerLevel: number;
      tier: string;
      message: string;
    };
  };
  realTimeUpdates?: {
    streamId: string;
    eventCount: number;
    lastUpdate: Date;
  };
}

export interface TaskPipeline {
  id: string;
  intentId: string;
  userId: string;
  walletAddress: string;
  steps: TaskStep[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    estimatedDuration: number;
    actualDuration?: number;
  };
}

export interface TaskStep {
  id: string;
  type: 'adapter_call' | 'validation' | 'analytics' | 'notification' | 'confirmation';
  adapter?: 'hive' | 'sak' | 'mcp' | 'integration';
  operation: string;
  parameters: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  dependencies: string[];
  retryCount: number;
  maxRetries: number;
}

export interface OrchestratorStats {
  intents: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  };
  adapters: {
    hive: {
      calls: number;
      successRate: number;
      avgLatency: number;
    };
    sak: {
      calls: number;
      successRate: number;
      avgLatency: number;
    };
    mcp: {
      calls: number;
      successRate: number;
      avgLatency: number;
    };
  };
  performance: {
    avgExecutionTime: number;
    throughput: number; // Intents per minute
    concurrentTasks: number;
    queueLength: number;
  };
  realTime: {
    activeStreams: number;
    eventsProcessed: number;
    avgLatency: number;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export interface OrchestrationError {
  code: string;
  message: string;
  component: 'orchestrator' | 'adapter' | 'analytics' | 'realtime' | 'validation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  retryable: boolean;
}

// ============================================================================
// Core OrchestratorService Implementation
// ============================================================================

export class OrchestratorService extends EventEmitter {
  private config: BackendOrchestratorConfig;
  // TODO: Define proper Orchestrator interface when core orchestrator module is available
  // private coreOrchestrator?: Orchestrator;
  private seiIntegration: SeiIntegrationService;
  private portfolioAnalytics: PortfolioAnalyticsService;
  private realTimeData: RealTimeDataService;
  private socketService: SocketService;
  private logger = createServiceLogger('OrchestratorService');
  
  // OpenAI integration
  private openai: OpenAI;
  
  // MCP HTTP clients
  private mcpClients: Map<string, AxiosInstance> = new Map();
  
  // Task management
  private taskPipelines: Map<string, TaskPipeline> = new Map();
  private taskQueue: Array<{ intent: EnhancedUserIntent; priority: number }> = [];
  private runningTasks: Map<string, Promise<OrchestrationResult>> = new Map();
  
  // Performance tracking
  private stats: OrchestratorStats;
  private performanceHistory: Array<{
    timestamp: Date;
    executionTime: number;
    success: boolean;
    intentType: string;
  }> = [];

  constructor(
    seiIntegration: SeiIntegrationService,
    portfolioAnalytics: PortfolioAnalyticsService,
    realTimeData: RealTimeDataService,
    socketService: SocketService,
    config?: BackendOrchestratorConfig
  ) {
    super();
    this.seiIntegration = seiIntegration;
    this.portfolioAnalytics = portfolioAnalytics;
    this.realTimeData = realTimeData;
    this.socketService = socketService;
    this.config = config || this.getDefaultConfig();
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.config.openai.apiKey,
    });
    
    // Initialize MCP HTTP clients
    this.initializeMCPClients();
    
    this.stats = this.initializeStats();
    this.setupOrchestratorEventHandlers();
    this.startTaskProcessor();
    
    this.logger.info('OrchestratorService initialized', {
      maxConcurrentTasks: this.config.core.maxConcurrentTasks,
      taskTimeout: this.config.core.taskTimeout,
      adaptersEnabled: {
        hive: this.config.adapters.hive.enabled,
        sak: this.config.adapters.sak.enabled,
        mcp: this.config.adapters.mcp.enabled
      },
      mcpServers: {
        hiveIntelligence: this.config.mcpServers.hiveIntelligence.url,
        seiBlockchain: this.config.mcpServers.seiBlockchain.url,
        portfolioManager: this.config.mcpServers.portfolioManager.url
      },
      realTimeEnabled: this.config.realTime.enabled,
      analyticsEnabled: this.config.analytics.enabled,
      timestamp: new Date().toISOString()
    });
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Orchestrate chat message with MCP servers and OpenAI
   */
  public orchestrateChatMessage = (
    request: ChatOrchestrationRequest
  ): TE.TaskEither<OrchestrationError, ChatOrchestrationResponse> => {
    const startTime = performance.now();
    
    this.logger.info('Orchestrating chat message', {
      sessionId: request.context.sessionId,
      walletAddress: request.context.walletAddress,
      messageLength: request.message.length,
      hasIntent: !!request.intent,
      requiresBlockchainData: request.requiresBlockchainData,
      timestamp: new Date().toISOString()
    });
    
    return pipe(
      // Step 1: Analyze intent and gather context from MCP servers
      this.gatherMCPContext(request),
      TE.chain(mcpContext => 
        // Step 2: Generate response using OpenAI with MCP context
        this.generateAIResponse(request, mcpContext)
      ),
      TE.map(result => {
        const processingTime = performance.now() - startTime;
        
        this.logger.info('Chat orchestration completed', {
          sessionId: request.context.sessionId,
          processingTime: Math.round(processingTime),
          mcpServersUsed: result.metadata.mcpServersUsed,
          hasActions: !!result.actions && result.actions.length > 0
        });
        
        return {
          ...result,
          metadata: {
            ...result.metadata,
            processingTime
          }
        };
      }),
      TE.mapLeft(error => {
        const processingTime = performance.now() - startTime;
        this.logger.error('Chat orchestration failed', {
          sessionId: request.context.sessionId,
          processingTime: Math.round(processingTime),
          error: error.message,
          errorCode: error.code
        });
        return error;
      })
    );
  };

  /**
   * Process enhanced user intent with full orchestration
   */
  public processIntent = (
    intent: EnhancedUserIntent
  ): TE.TaskEither<OrchestrationError, OrchestrationResult> => {
    const startTime = Date.now();
    
    this.logger.info('Processing intent', {
      intentId: intent.id,
      userId: intent.userId,
      walletAddress: intent.walletAddress,
      intentType: intent.type,
      intentAction: intent.action,
      priority: intent.priority,
      parametersCount: Object.keys(intent.parameters).length,
      hasConstraints: !!intent.constraints,
      timestamp: new Date().toISOString()
    });
    
    return pipe(
      this.validateIntent(intent),
      TE.chain(() => this.createTaskPipeline(intent)),
      TE.chain(pipeline => this.executePipeline(pipeline)),
      TE.chain(result => this.enhanceResultWithAnalytics(result, intent)),
      TE.chain(result => this.handleRealTimeUpdates(result, intent)),
      TE.map(result => {
        const executionTime = Date.now() - startTime;
        this.updateStats(intent, result, executionTime);
        
        this.logger.info('Intent processing completed', {
          intentId: intent.id,
          success: result.success,
          executionTime,
          adaptersUsed: result.metadata.adaptersUsed,
          tasksExecuted: result.metadata.tasksExecuted,
          gasUsed: result.metadata.gasUsed
        });
        
        this.emit('orchestration:completed', {
          intentId: intent.id,
          result,
          executionTime,
          timestamp: new Date()
        });
        
        return {
          ...result,
          metadata: {
            ...result.metadata,
            executionTime
          }
        };
      }),
      TE.mapLeft(error => {
        const executionTime = Date.now() - startTime;
        this.logger.error('Intent processing failed', {
          intentId: intent.id,
          error: error.message,
          errorCode: error.code,
          errorComponent: error.component,
          executionTime,
          recoverable: error.recoverable,
          retryable: error.retryable
        });
        return error;
      })
    );
  };

  /**
   * Process multiple intents in batch
   */
  public processBatchIntents = (
    intents: EnhancedUserIntent[]
  ): TE.TaskEither<OrchestrationError, OrchestrationResult[]> =>
    pipe(
      intents,
      TE.traverseArray(intent => this.processIntent(intent)),
      TE.map(results => results as OrchestrationResult[])
    );

  /**
   * Get orchestrator statistics
   */
  public getStats = (): TE.TaskEither<OrchestrationError, OrchestratorStats> =>
    TE.right(this.stats);

  /**
   * Get task pipeline status
   */
  public getTaskPipelineStatus = (
    pipelineId: string
  ): TE.TaskEither<OrchestrationError, TaskPipeline> => {
    const pipeline = this.taskPipelines.get(pipelineId);
    
    return pipeline
      ? TE.right(pipeline)
      : TE.left(this.createOrchestrationError('PIPELINE_NOT_FOUND', `Pipeline ${pipelineId} not found`, 'orchestrator'));
  };

  /**
   * Cancel task pipeline
   */
  public cancelTaskPipeline = (
    pipelineId: string
  ): TE.TaskEither<OrchestrationError, void> => {
    const pipeline = this.taskPipelines.get(pipelineId);
    
    if (!pipeline) {
      return TE.left(this.createOrchestrationError('PIPELINE_NOT_FOUND', `Pipeline ${pipelineId} not found`, 'orchestrator'));
    }
    
    return TE.tryCatch(
      async () => {
        pipeline.status = 'cancelled';
        pipeline.completedAt = new Date();
        this.taskPipelines.set(pipelineId, pipeline);
        
        // Cancel running task if exists
        this.runningTasks.delete(pipeline.intentId);
        
        this.emit('orchestration:cancelled', {
          pipelineId,
          intentId: pipeline.intentId,
          timestamp: new Date()
        });
      },
      error => this.createOrchestrationError('CANCELLATION_FAILED', `Failed to cancel pipeline: ${error}`, 'orchestrator')
    );
  };

  /**
   * Get orchestrator health status
   */
  public getHealthStatus = (): TE.TaskEither<OrchestrationError, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, 'healthy' | 'unhealthy'>;
    metrics: {
      queueLength: number;
      runningTasks: number;
      errorRate: number;
    };
  }> =>
    TE.tryCatch(
      async () => {
        const integrationStatus = await this.seiIntegration.getIntegrationStatus()();
        const realtimeStatusResult = await this.realTimeData.getStreamStatistics()();
        const realtimeStatus = realtimeStatusResult._tag === 'Right' ? realtimeStatusResult.right : { activeStreams: 0, eventsProcessed: 0, avgLatency: 0 };
        
        const components = {
          integration: integrationStatus._tag === 'Right' && integrationStatus.right.overall.healthy ? 'healthy' : 'unhealthy',
          analytics: 'healthy', // Assume healthy for now
          realtime: realtimeStatus.activeStreams > 0 ? 'healthy' : 'unhealthy',
          sockets: 'healthy' // Assume healthy for now
        } as const;
        
        const unhealthyComponents = Object.values(components).filter(status => status === 'unhealthy').length;
        const overallStatus = unhealthyComponents === 0 ? 'healthy' : 
                            unhealthyComponents <= 1 ? 'degraded' : 'unhealthy';
        
        const errorRate = this.calculateErrorRate();
        
        return {
          status: overallStatus,
          components,
          metrics: {
            queueLength: this.taskQueue.length,
            runningTasks: this.runningTasks.size,
            errorRate
          }
        };
      },
      error => this.createOrchestrationError('HEALTH_CHECK_FAILED', `Health check failed: ${error}`, 'orchestrator')
    );

  /**
   * Update orchestrator configuration
   */
  public updateConfig = (
    newConfig: Partial<BackendOrchestratorConfig>
  ): TE.TaskEither<OrchestrationError, void> =>
    TE.tryCatch(
      async () => {
        this.config = { ...this.config, ...newConfig };
        
        this.emit('orchestration:config:updated', {
          newConfig,
          timestamp: new Date()
        });
      },
      error => this.createOrchestrationError('CONFIG_UPDATE_FAILED', `Failed to update config: ${error}`, 'orchestrator')
    );

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Initialize MCP HTTP clients
   */
  private initializeMCPClients(): void {
    try {
      // Initialize the shared MCP HTTP client
      const mcpClient = getMCPHttpClient();
      
      this.logger.info('MCP HTTP clients initialized successfully', {
        servers: {
          hiveIntelligence: this.config.mcpServers.hiveIntelligence.url,
          seiBlockchain: this.config.mcpServers.seiBlockchain.url,
          portfolioManager: this.config.mcpServers.portfolioManager.url
        }
      });
      
      // Keep legacy clients for backward compatibility during migration
      const { hiveIntelligence, seiBlockchain, portfolioManager } = this.config.mcpServers;
      
      // Create fallback Hive Intelligence client
      this.mcpClients.set('hive', axios.create({
        baseURL: hiveIntelligence.url,
        timeout: hiveIntelligence.timeout || 30000,
        headers: {
          'Content-Type': 'application/json',
          ...(hiveIntelligence.apiKey && { 'Authorization': `Bearer ${hiveIntelligence.apiKey}` })
        }
      }));
      
      // Create fallback SEI Blockchain client
      this.mcpClients.set('sei', axios.create({
        baseURL: seiBlockchain.url,
        timeout: seiBlockchain.timeout || 30000,
        headers: {
          'Content-Type': 'application/json',
          ...(seiBlockchain.apiKey && { 'Authorization': `Bearer ${seiBlockchain.apiKey}` })
        }
    }));
    
    // Create fallback Portfolio Manager client
    this.mcpClients.set('portfolio', axios.create({
      baseURL: portfolioManager.url,
      timeout: portfolioManager.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(portfolioManager.apiKey && { 'Authorization': `Bearer ${portfolioManager.apiKey}` })
      }
    }));
    
    this.logger.info('Legacy MCP HTTP clients initialized as fallbacks', {
      servers: ['hive', 'sei', 'portfolio']
    });
    } catch (error) {
      this.logger.error('Failed to initialize MCP HTTP clients', error);
      throw error;
    }
  }

  /**
   * Health check all MCP servers
   */
  public async checkMCPServersHealth(): Promise<Record<string, boolean>> {
    const mcpClient = getMCPHttpClient();
    return mcpClient.healthCheckAll();
  }

  /**
   * Call MCP tool with proper error handling
   */
  public async callMCPTool(serverType: 'hiveIntelligence' | 'seiBlockchain' | 'portfolioManager', toolName: string, params: any): Promise<any> {
    const mcpClient = getMCPHttpClient();
    
    try {
      return await mcpClient.callTool(serverType, toolName, params);
    } catch (error) {
      this.logger.error(`MCP tool call failed: ${serverType}.${toolName}`, { params, error });
      throw error;
    }
  }

  /**
   * Gather context from MCP servers
   */
  private gatherMCPContext = (
    request: ChatOrchestrationRequest
  ): TE.TaskEither<OrchestrationError, any> => {
    return TE.tryCatch(
      async () => {
        const mcpContext: any = {
          timestamp: new Date().toISOString(),
          serversUsed: []
        };
        
        // Determine which MCP servers to query based on intent
        const queries: Promise<void>[] = [];
        
        // Always get market intelligence
        queries.push(
          this.queryMCPServer('hive', 'getMarketInsights', {
            query: request.message,
            walletAddress: request.context.walletAddress
          }).then(data => {
            mcpContext.marketInsights = data;
            mcpContext.serversUsed.push('hive-intelligence');
          }).catch(err => {
            this.logger.warn('Failed to get market insights', { error: err.message });
          })
        );
        
        // Get blockchain data if wallet address is provided
        if (request.context.walletAddress || request.requiresBlockchainData) {
          queries.push(
            this.queryMCPServer('sei', 'getWalletData', {
              address: request.context.walletAddress,
              includeBalance: true,
              includeDeFi: true
            }).then(data => {
              mcpContext.walletData = data;
              mcpContext.serversUsed.push('sei-blockchain');
            }).catch(err => {
              this.logger.warn('Failed to get wallet data', { error: err.message });
            })
          );
          
          // Get portfolio analysis
          queries.push(
            this.queryMCPServer('portfolio', 'analyzePortfolio', {
              walletAddress: request.context.walletAddress,
              includePredictions: true
            }).then(data => {
              mcpContext.portfolioAnalysis = data;
              mcpContext.serversUsed.push('portfolio-manager');
            }).catch(err => {
              this.logger.warn('Failed to get portfolio analysis', { error: err.message });
            })
          );
        }
        
        // Execute all queries in parallel
        await Promise.all(queries);
        
        this.logger.debug('MCP context gathered', {
          serversUsed: mcpContext.serversUsed,
          hasMarketInsights: !!mcpContext.marketInsights,
          hasWalletData: !!mcpContext.walletData,
          hasPortfolioAnalysis: !!mcpContext.portfolioAnalysis
        });
        
        return mcpContext;
      },
      error => this.createOrchestrationError(
        'MCP_CONTEXT_FAILED',
        `Failed to gather MCP context: ${error}`,
        'orchestrator'
      )
    );
  };

  /**
   * Query a specific MCP server
   */
  private async queryMCPServer(
    serverName: string,
    method: string,
    params: any
  ): Promise<any> {
    const client = this.mcpClients.get(serverName);
    if (!client) {
      throw new Error(`MCP client not found: ${serverName}`);
    }
    
    try {
      const response = await client.post('/call', {
        method,
        params,
        id: `${Date.now()}-${Math.random()}`
      });
      
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      
      return response.data.result;
    } catch (error: any) {
      this.logger.error('MCP server query failed', {
        serverName,
        method,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate AI response using OpenAI with MCP context
   */
  private generateAIResponse = (
    request: ChatOrchestrationRequest,
    mcpContext: any
  ): TE.TaskEither<OrchestrationError, ChatOrchestrationResponse> => {
    return TE.tryCatch(
      async () => {
        // Build system prompt with MCP context
        const systemPrompt = this.buildSystemPrompt(mcpContext);
        
        // Prepare messages for OpenAI
        const messages: OpenAI.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          ...request.context.messages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })),
          { role: 'user', content: request.message }
        ];
        
        // Call OpenAI API
        const completion = await this.openai.chat.completions.create({
          model: this.config.openai.model,
          messages,
          temperature: this.config.openai.temperature || 0.7,
          max_tokens: this.config.openai.maxTokens || 1000,
          tools: this.getAvailableTools(),
          tool_choice: 'auto'
        });
        
        const response = completion.choices[0].message;
        
        // Extract actions if any tools were called
        const actions: any[] = [];
        if (response.tool_calls) {
          for (const toolCall of response.tool_calls) {
            actions.push({
              type: toolCall.function.name,
              params: JSON.parse(toolCall.function.arguments)
            });
          }
        }
        
        // Prepare response
        const result: ChatOrchestrationResponse = {
          response: response.content || '',
          data: mcpContext,
          actions: actions.length > 0 ? actions : undefined,
          metadata: {
            mcpServersUsed: mcpContext.serversUsed || [],
            processingTime: 0, // Will be set by caller
            intent: this.detectIntent(request.message),
            confidence: 0.95 // TODO: Implement proper confidence scoring
          }
        };
        
        return result;
      },
      error => this.createOrchestrationError(
        'AI_RESPONSE_FAILED',
        `Failed to generate AI response: ${error}`,
        'orchestrator'
      )
    );
  };

  /**
   * Build system prompt with MCP context
   */
  private buildSystemPrompt(mcpContext: any): string {
    let prompt = `You are Seiron, an AI-powered DeFi portfolio management assistant for the Sei Network. 
You have access to real-time market data, blockchain information, and portfolio analytics.

Current Context:
- Timestamp: ${mcpContext.timestamp}
`;

    if (mcpContext.marketInsights) {
      prompt += `
Market Insights:
${JSON.stringify(mcpContext.marketInsights, null, 2)}
`;
    }

    if (mcpContext.walletData) {
      prompt += `
Wallet Data:
${JSON.stringify(mcpContext.walletData, null, 2)}
`;
    }

    if (mcpContext.portfolioAnalysis) {
      prompt += `
Portfolio Analysis:
${JSON.stringify(mcpContext.portfolioAnalysis, null, 2)}
`;
    }

    prompt += `
Please provide helpful, accurate, and actionable responses based on this real-time data.
When discussing financial matters, always include appropriate disclaimers.
If you need to perform actions like token swaps or portfolio rebalancing, suggest them clearly.`;

    return prompt;
  }

  /**
   * Get available tools for OpenAI function calling
   */
  private getAvailableTools(): OpenAI.ChatCompletionTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'execute_token_swap',
          description: 'Execute a token swap on the Sei Network',
          parameters: {
            type: 'object',
            properties: {
              fromToken: { type: 'string', description: 'Token to swap from' },
              toToken: { type: 'string', description: 'Token to swap to' },
              amount: { type: 'string', description: 'Amount to swap' },
              slippage: { type: 'number', description: 'Slippage tolerance (0-1)' }
            },
            required: ['fromToken', 'toToken', 'amount']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'rebalance_portfolio',
          description: 'Propose portfolio rebalancing',
          parameters: {
            type: 'object',
            properties: {
              targetAllocation: { 
                type: 'object', 
                description: 'Target allocation percentages by asset'
              },
              riskTolerance: { 
                type: 'string', 
                enum: ['low', 'medium', 'high'],
                description: 'Risk tolerance level'
              }
            },
            required: ['targetAllocation']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'analyze_defi_opportunity',
          description: 'Analyze a DeFi opportunity',
          parameters: {
            type: 'object',
            properties: {
              protocol: { type: 'string', description: 'DeFi protocol name' },
              type: { 
                type: 'string', 
                enum: ['lending', 'liquidity', 'staking'],
                description: 'Type of opportunity'
              },
              amount: { type: 'string', description: 'Amount to invest' }
            },
            required: ['protocol', 'type']
          }
        }
      }
    ];
  }

  /**
   * Detect intent from user message
   */
  private detectIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('swap') || lowerMessage.includes('trade') || lowerMessage.includes('exchange')) {
      return 'trading';
    } else if (lowerMessage.includes('portfolio') || lowerMessage.includes('balance') || lowerMessage.includes('holdings')) {
      return 'portfolio';
    } else if (lowerMessage.includes('lend') || lowerMessage.includes('borrow') || lowerMessage.includes('apy')) {
      return 'lending';
    } else if (lowerMessage.includes('liquidity') || lowerMessage.includes('pool') || lowerMessage.includes('lp')) {
      return 'liquidity';
    } else if (lowerMessage.includes('risk') || lowerMessage.includes('safe') || lowerMessage.includes('analysis')) {
      return 'analysis';
    } else {
      return 'general';
    }
  }

  /**
   * Validate enhanced user intent
   */
  private validateIntent = (
    intent: EnhancedUserIntent
  ): TE.TaskEither<OrchestrationError, EnhancedUserIntent> => {
    const startTime = performance.now();
    
    this.logger.debug('Validating intent', {
      intentId: intent.id,
      intentType: intent.type,
      intentAction: intent.action
    });
    
    return TE.tryCatch(
      async () => {
        // Basic validation
        if (!intent.id || !intent.userId || !intent.walletAddress) {
          throw new Error('Intent must have id, userId, and walletAddress');
        }
        
        if (!intent.type || !intent.action) {
          throw new Error('Intent must have type and action');
        }
        
        // Priority validation
        const validPriorities = ['low', 'medium', 'high', 'urgent'] as const;
        if (!validPriorities.includes(intent.priority)) {
          throw new Error('Invalid priority level');
        }
        
        // Constraint validation
        if (intent.constraints?.maxGasCost && intent.constraints.maxGasCost < 0) {
          throw new Error('Max gas cost must be positive');
        }
        
        const duration = performance.now() - startTime;
        this.logger.debug('Intent validation completed', {
          intentId: intent.id,
          duration: Math.round(duration),
          valid: true
        });
        
        return intent;
      },
      error => {
        const duration = performance.now() - startTime;
        this.logger.error('Intent validation failed', {
          intentId: intent.id,
          duration: Math.round(duration),
          error: error instanceof Error ? error.message : String(error)
        });
        return this.createOrchestrationError('INTENT_VALIDATION_FAILED', `Intent validation failed: ${error}`, 'validation');
      }
    );
  };

  /**
   * Create task pipeline from intent
   */
  private createTaskPipeline = (
    intent: EnhancedUserIntent
  ): TE.TaskEither<OrchestrationError, TaskPipeline> => {
    const startTime = performance.now();
    
    this.logger.debug('Creating task pipeline', {
      intentId: intent.id,
      intentType: intent.type,
      intentAction: intent.action
    });
    
    return TE.tryCatch(
      async () => {
        const pipelineId = `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const steps = await this.generateTaskSteps(intent);
        
        const pipeline: TaskPipeline = {
          id: pipelineId,
          intentId: intent.id,
          userId: intent.userId,
          walletAddress: intent.walletAddress,
          steps,
          status: 'pending',
          priority: this.mapPriorityToNumber(intent.priority),
          createdAt: new Date(),
          metadata: {
            totalSteps: steps.length,
            completedSteps: 0,
            failedSteps: 0,
            estimatedDuration: this.estimatePipelineDuration(steps)
          }
        };
        
        this.taskPipelines.set(pipelineId, pipeline);
        
        const duration = performance.now() - startTime;
        this.logger.info('Task pipeline created', {
          pipelineId,
          intentId: intent.id,
          totalSteps: steps.length,
          estimatedDuration: pipeline.metadata.estimatedDuration,
          priority: pipeline.priority,
          duration: Math.round(duration),
          stepTypes: steps.map(s => s.type)
        });
        
        this.emit('orchestration:pipeline:created', {
          pipelineId,
          intentId: intent.id,
          steps: steps.length,
          timestamp: new Date()
        });
        
        return pipeline;
      },
      error => {
        const duration = performance.now() - startTime;
        this.logger.error('Pipeline creation failed', {
          intentId: intent.id,
          duration: Math.round(duration),
          error: error instanceof Error ? error.message : String(error)
        });
        return this.createOrchestrationError('PIPELINE_CREATION_FAILED', `Failed to create task pipeline: ${error}`, 'orchestrator');
      }
    );
  };

  /**
   * Execute task pipeline
   */
  private executePipeline = (
    pipeline: TaskPipeline
  ): TE.TaskEither<OrchestrationError, OrchestrationResult> => {
    const startTime = performance.now();
    
    this.logger.info('Executing task pipeline', {
      pipelineId: pipeline.id,
      intentId: pipeline.intentId,
      totalSteps: pipeline.steps.length,
      priority: pipeline.priority
    });
    
    return TE.tryCatch(
      async () => {
        pipeline.status = 'running';
        pipeline.startedAt = new Date();
        this.taskPipelines.set(pipeline.id, pipeline);
        
        const results: any[] = [];
        const adaptersUsed: Set<string> = new Set();
        let totalGasUsed = 0;
        let tasksExecuted = 0;
        
        for (let i = 0; i < pipeline.steps.length; i++) {
          const step = pipeline.steps[i];
          const stepStartTime = performance.now();
          
          this.logger.debug('Executing pipeline step', {
            pipelineId: pipeline.id,
            stepId: step.id,
            stepType: step.type,
            stepIndex: i + 1,
            totalSteps: pipeline.steps.length,
            adapter: step.adapter,
            operation: step.operation
          });
          
          try {
            step.status = 'running';
            step.startTime = new Date();
            
            const stepResult = await this.executeTaskStep(step, pipeline);
            
            step.status = 'completed';
            step.endTime = new Date();
            step.result = stepResult;
            
            const stepDuration = performance.now() - stepStartTime;
            this.logger.debug('Pipeline step completed', {
              pipelineId: pipeline.id,
              stepId: step.id,
              stepDuration: Math.round(stepDuration),
              hasResult: !!stepResult,
              gasUsed: stepResult?.gasUsed
            });
            
            results.push(stepResult);
            if (step.adapter) adaptersUsed.add(step.adapter);
            if (stepResult.gasUsed) totalGasUsed += stepResult.gasUsed;
            tasksExecuted++;
            
            pipeline.metadata.completedSteps++;
            
          } catch (error) {
            const stepDuration = performance.now() - stepStartTime;
            step.status = 'failed';
            step.endTime = new Date();
            step.error = error instanceof Error ? error.message : 'Unknown error';
            step.retryCount++;
            
            pipeline.metadata.failedSteps++;
            
            this.logger.error('Pipeline step failed', {
              pipelineId: pipeline.id,
              stepId: step.id,
              stepDuration: Math.round(stepDuration),
              error: step.error,
              retryCount: step.retryCount,
              maxRetries: step.maxRetries,
              isRetryable: this.isRetryableError(error),
              isCritical: this.isCriticalStep(step)
            });
            
            // Retry logic
            if (step.retryCount < step.maxRetries && this.isRetryableError(error)) {
              step.status = 'pending';
              this.logger.info('Retrying pipeline step', {
                pipelineId: pipeline.id,
                stepId: step.id,
                retryAttempt: step.retryCount + 1
              });
              // Re-add to queue for retry
              continue;
            }
            
            // If step is critical, fail the entire pipeline
            if (this.isCriticalStep(step)) {
              throw error;
            }
          }
        }
        
        pipeline.status = 'completed';
        pipeline.completedAt = new Date();
        pipeline.metadata.actualDuration = pipeline.completedAt.getTime() - pipeline.startedAt!.getTime();
        
        this.taskPipelines.set(pipeline.id, pipeline);
        
        const totalDuration = performance.now() - startTime;
        const result = {
          intentId: pipeline.intentId,
          success: pipeline.metadata.failedSteps === 0,
          data: results.length === 1 ? results[0] : results,
          metadata: {
            executionTime: pipeline.metadata.actualDuration || 0,
            adaptersUsed: Array.from(adaptersUsed),
            tasksExecuted,
            gasUsed: totalGasUsed || undefined
          }
        };
        
        this.logger.info('Pipeline execution completed', {
          pipelineId: pipeline.id,
          intentId: pipeline.intentId,
          success: result.success,
          totalDuration: Math.round(totalDuration),
          actualDuration: pipeline.metadata.actualDuration,
          completedSteps: pipeline.metadata.completedSteps,
          failedSteps: pipeline.metadata.failedSteps,
          adaptersUsed: Array.from(adaptersUsed),
          totalGasUsed
        });
        
        return result;
      },
      error => {
        const duration = performance.now() - startTime;
        this.logger.error('Pipeline execution failed', {
          pipelineId: pipeline.id,
          intentId: pipeline.intentId,
          duration: Math.round(duration),
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        return this.createOrchestrationError('PIPELINE_EXECUTION_FAILED', `Pipeline execution failed: ${error}`, 'orchestrator');
      }
    );
  };

  /**
   * Execute individual task step
   */
  private async executeTaskStep(step: TaskStep, pipeline: TaskPipeline): Promise<any> {
    const stepStartTime = performance.now();
    
    this.logger.debug('Executing task step', {
      stepId: step.id,
      stepType: step.type,
      adapter: step.adapter,
      operation: step.operation,
      pipelineId: pipeline.id
    });
    
    try {
      let result;
      
      switch (step.type) {
        case 'adapter_call':
          result = await this.executeAdapterCall(step);
          break;
        case 'validation':
          result = await this.executeValidationStep(step, pipeline);
          break;
        case 'analytics':
          result = await this.executeAnalyticsStep(step, pipeline);
          break;
        case 'notification':
          result = await this.executeNotificationStep(step, pipeline);
          break;
        case 'confirmation':
          result = await this.executeConfirmationStep(step, pipeline);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
      
      const duration = performance.now() - stepStartTime;
      this.logger.debug('Task step executed successfully', {
        stepId: step.id,
        stepType: step.type,
        duration: Math.round(duration),
        hasResult: !!result,
        resultType: typeof result
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - stepStartTime;
      this.logger.error('Task step execution failed', {
        stepId: step.id,
        stepType: step.type,
        duration: Math.round(duration),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Execute adapter call step
   */
  private async executeAdapterCall(step: TaskStep): Promise<any> {
    const startTime = performance.now();
    
    if (!step.adapter) {
      throw new Error('Adapter call step must specify adapter');
    }
    
    this.logger.debug('Executing adapter call', {
      stepId: step.id,
      adapter: step.adapter,
      operation: step.operation,
      parametersCount: Object.keys(step.parameters).length
    });
    
    try {
      let result;
      
      switch (step.adapter) {
        case 'hive':
          result = await this.executeHiveCall(step.operation, step.parameters);
          break;
        case 'sak':
          result = await this.executeSAKCall(step.operation, step.parameters);
          break;
        case 'mcp':
          result = await this.executeMCPCall(step.operation, step.parameters);
          break;
        case 'integration':
          result = await this.executeIntegrationCall(step.operation, step.parameters);
          break;
        default:
          throw new Error(`Unknown adapter: ${step.adapter}`);
      }
      
      const duration = performance.now() - startTime;
      this.logger.debug('Adapter call completed', {
        stepId: step.id,
        adapter: step.adapter,
        operation: step.operation,
        duration: Math.round(duration),
        hasResult: !!result
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error('Adapter call failed', {
        stepId: step.id,
        adapter: step.adapter,
        operation: step.operation,
        duration: Math.round(duration),
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Execute Hive Intelligence call
   */
  private async executeHiveCall(operation: string, parameters: any): Promise<any> {
    const startTime = performance.now();
    
    this.logger.debug('Executing Hive call', {
      operation,
      query: parameters.query,
      walletAddress: parameters.walletAddress,
      hasMetadata: !!parameters.metadata
    });
    
    const result = await this.seiIntegration.getHiveAnalytics(
      parameters.query || 'portfolio analysis',
      parameters.metadata,
      parameters.walletAddress
    )();
    
    const duration = performance.now() - startTime;
    
    if (result._tag === 'Left') {
      this.logger.error('Hive call failed', {
        operation,
        duration: Math.round(duration),
        error: result.left.message
      });
      throw new Error(result.left.message);
    }
    
    this.logger.debug('Hive call completed', {
      operation,
      duration: Math.round(duration),
      resultSize: JSON.stringify(result.right).length
    });
    
    return result.right;
  }

  /**
   * Execute SAK call
   */
  private async executeSAKCall(operation: string, parameters: any): Promise<any> {
    const startTime = performance.now();
    
    this.logger.debug('Executing SAK call', {
      operation,
      paramsKeys: Object.keys(parameters.params || {}),
      hasContext: !!parameters.context,
      walletAddress: parameters.context?.walletAddress
    });
    
    const result = await this.seiIntegration.executeSAKTool(
      operation,
      parameters.params || {},
      parameters.context
    )();
    
    const duration = performance.now() - startTime;
    
    if (result._tag === 'Left') {
      this.logger.error('SAK call failed', {
        operation,
        duration: Math.round(duration),
        error: result.left.message
      });
      throw new Error(result.left.message);
    }
    
    this.logger.debug('SAK call completed', {
      operation,
      duration: Math.round(duration),
      resultSize: JSON.stringify(result.right).length
    });
    
    return result.right;
  }

  /**
   * Execute MCP call
   */
  private async executeMCPCall(operation: string, parameters: any): Promise<any> {
    const startTime = performance.now();
    
    this.logger.debug('Executing MCP call', {
      operation,
      walletAddress: parameters.walletAddress,
      parametersCount: Object.keys(parameters).length
    });
    
    try {
      let result;
      
      switch (operation) {
        case 'get_blockchain_state':
          const blockchainResult = await this.seiIntegration.getMCPBlockchainState()();
          if (blockchainResult._tag === 'Left') throw new Error(blockchainResult.left.message);
          result = blockchainResult.right;
          break;
          
        case 'get_wallet_balance':
          const balanceResult = await this.seiIntegration.getMCPWalletBalance(parameters.walletAddress)();
          if (balanceResult._tag === 'Left') throw new Error(balanceResult.left.message);
          result = balanceResult.right;
          break;
          
        default:
          throw new Error(`Unknown MCP operation: ${operation}`);
      }
      
      const duration = performance.now() - startTime;
      this.logger.debug('MCP call completed', {
        operation,
        duration: Math.round(duration),
        resultSize: JSON.stringify(result).length
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error('MCP call failed', {
        operation,
        duration: Math.round(duration),
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Execute integration call
   */
  private async executeIntegrationCall(operation: string, parameters: any): Promise<any> {
    const startTime = performance.now();
    
    this.logger.debug('Executing integration call', {
      operation,
      walletAddress: parameters.walletAddress,
      analysisType: parameters.analysisType,
      query: parameters.query,
      hasOptions: !!parameters.options
    });
    
    try {
      let result;
      
      switch (operation) {
        case 'integrated_analysis':
          const analysisResult = await this.seiIntegration.generateIntegratedAnalysis(
            parameters.walletAddress,
            parameters.analysisType,
            parameters.options
          )();
          if (analysisResult._tag === 'Left') throw new Error(analysisResult.left.message);
          result = analysisResult.right;
          break;
          
        case 'integrated_search':
          const searchResult = await this.seiIntegration.performIntegratedSearch(
            parameters.query,
            parameters.walletAddress,
            parameters.options
          )();
          if (searchResult._tag === 'Left') throw new Error(searchResult.left.message);
          result = searchResult.right;
          break;
          
        default:
          throw new Error(`Unknown integration operation: ${operation}`);
      }
      
      const duration = performance.now() - startTime;
      this.logger.debug('Integration call completed', {
        operation,
        duration: Math.round(duration),
        resultSize: JSON.stringify(result).length
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error('Integration call failed', {
        operation,
        duration: Math.round(duration),
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Execute validation step
   */
  private async executeValidationStep(step: TaskStep, pipeline: TaskPipeline): Promise<any> {
    // Implement validation logic based on step parameters
    return { validated: true, timestamp: new Date() };
  }

  /**
   * Execute analytics step
   */
  private async executeAnalyticsStep(step: TaskStep, pipeline: TaskPipeline): Promise<any> {
    const analysisResult = await this.portfolioAnalytics.generateEnhancedAnalysis(
      pipeline.walletAddress,
      step.parameters.analysisType || 'comprehensive',
      step.parameters.options || {}
    )();
    
    if (analysisResult._tag === 'Left') {
      throw new Error(analysisResult.left.message);
    }
    
    return analysisResult.right;
  }

  /**
   * Execute notification step
   */
  private async executeNotificationStep(step: TaskStep, pipeline: TaskPipeline): Promise<any> {
    await this.socketService.sendPortfolioUpdate(pipeline.walletAddress, {
      type: 'position_update',
      data: {
        pipelineId: pipeline.id,
        step: step.id,
        message: step.parameters.message || 'Task step completed'
      },
      timestamp: new Date().toISOString()
    })();
    
    return { notificationSent: true, timestamp: new Date() };
  }

  /**
   * Execute confirmation step
   */
  private async executeConfirmationStep(step: TaskStep, pipeline: TaskPipeline): Promise<any> {
    // Send confirmation request
    await this.socketService.sendConfirmationRequest(
      pipeline.walletAddress,
      pipeline.id,
      step.parameters
    )();
    
    return { confirmationRequested: true, timestamp: new Date() };
  }

  /**
   * Enhance result with analytics
   */
  private enhanceResultWithAnalytics = (
    result: OrchestrationResult,
    intent: EnhancedUserIntent
  ): TE.TaskEither<OrchestrationError, OrchestrationResult> => {
    if (!this.config.analytics.enabled) {
      return TE.right(result);
    }
    
    return pipe(
      this.portfolioAnalytics.performRiskAssessment(intent.walletAddress, result.data),
      TE.mapLeft(analyticsError => this.createOrchestrationError(
        'ANALYTICS_ENHANCEMENT_FAILED',
        `Analytics enhancement failed: ${analyticsError.message}`,
        'analytics'
      )),
      TE.map(riskAssessment => ({
        ...result,
        analytics: {
          riskAssessment,
          performanceMetrics: this.calculatePerformanceMetrics(result),
          recommendations: this.generateRecommendations(result, intent),
          ...(this.config.analytics.dragonBallTheme && {
            dragonBallAssessment: this.generateDragonBallAssessment(result, intent)
          })
        }
      }))
    );
  };

  /**
   * Handle real-time updates
   */
  private handleRealTimeUpdates = (
    result: OrchestrationResult,
    intent: EnhancedUserIntent
  ): TE.TaskEither<OrchestrationError, OrchestrationResult> => {
    if (!this.config.realTime.enabled) {
      return TE.right(result);
    }
    
    return pipe(
      this.realTimeData.startDataStreams(intent.walletAddress, this.config.realTime.streamTypes as any),
      TE.mapLeft(realTimeError => this.createOrchestrationError(
        'REALTIME_SETUP_FAILED',
        `Real-time setup failed: ${realTimeError.message}`,
        'realtime'
      )),
      TE.map(streams => ({
        ...result,
        realTimeUpdates: {
          streamId: streams[0]?.id || 'none',
          eventCount: 0,
          lastUpdate: new Date()
        }
      }))
    );
  };

  /**
   * Generate task steps from intent
   */
  private async generateTaskSteps(intent: EnhancedUserIntent): Promise<TaskStep[]> {
    const steps: TaskStep[] = [];
    let stepId = 0;
    
    // Always start with validation
    steps.push({
      id: `step-${++stepId}`,
      type: 'validation',
      operation: 'validate_intent',
      parameters: { intent },
      status: 'pending',
      dependencies: [],
      retryCount: 0,
      maxRetries: 1
    });
    
    // Add adapter calls based on intent type
    switch (intent.type) {
      case 'portfolio':
        steps.push({
          id: `step-${++stepId}`,
          type: 'adapter_call',
          adapter: 'integration',
          operation: 'integrated_analysis',
          parameters: {
            walletAddress: intent.walletAddress,
            analysisType: intent.parameters.analysisType || 'comprehensive',
            options: intent.parameters
          },
          status: 'pending',
          dependencies: [`step-1`],
          retryCount: 0,
          maxRetries: 2
        });
        break;
        
      case 'analysis':
        steps.push({
          id: `step-${++stepId}`,
          type: 'adapter_call',
          adapter: 'hive',
          operation: 'get_analytics',
          parameters: {
            query: intent.parameters.query || 'market analysis',
            walletAddress: intent.walletAddress,
            metadata: intent.parameters
          },
          status: 'pending',
          dependencies: [`step-1`],
          retryCount: 0,
          maxRetries: 2
        });
        break;
        
      case 'lending':
      case 'liquidity':
      case 'trading':
        steps.push({
          id: `step-${++stepId}`,
          type: 'adapter_call',
          adapter: 'sak',
          operation: this.mapIntentToSAKOperation(intent),
          parameters: {
            params: intent.parameters,
            context: { walletAddress: intent.walletAddress }
          },
          status: 'pending',
          dependencies: [`step-1`],
          retryCount: 0,
          maxRetries: 3
        });
        break;
        
      case 'info':
        steps.push({
          id: `step-${++stepId}`,
          type: 'adapter_call',
          adapter: 'mcp',
          operation: 'get_wallet_balance',
          parameters: { walletAddress: intent.walletAddress },
          status: 'pending',
          dependencies: [`step-1`],
          retryCount: 0,
          maxRetries: 2
        });
        break;
    }
    
    // Add analytics step if enabled
    if (this.config.analytics.enabled && intent.type !== 'analysis') {
      steps.push({
        id: `step-${++stepId}`,
        type: 'analytics',
        operation: 'enhanced_analysis',
        parameters: {
          analysisType: 'comprehensive',
          options: { includeHiveInsights: true, includeSAKData: true, includeMCPRealtime: true }
        },
        status: 'pending',
        dependencies: steps.length > 1 ? [`step-${steps.length}`] : [],
        retryCount: 0,
        maxRetries: 1
      });
    }
    
    // Add confirmation step if required
    if (intent.constraints?.requireConfirmation) {
      steps.push({
        id: `step-${++stepId}`,
        type: 'confirmation',
        operation: 'request_confirmation',
        parameters: {
          action: intent.action,
          parameters: intent.parameters,
          riskLevel: 'medium'
        },
        status: 'pending',
        dependencies: [`step-${steps.length}`],
        retryCount: 0,
        maxRetries: 0
      });
    }
    
    // Add notification step
    steps.push({
      id: `step-${++stepId}`,
      type: 'notification',
      operation: 'send_completion_notification',
      parameters: {
        message: `Intent ${intent.type} completed successfully`,
        type: 'success'
      },
      status: 'pending',
      dependencies: steps.length > 0 ? [`step-${steps.length}`] : [],
      retryCount: 0,
      maxRetries: 1
    });
    
    return steps;
  }

  // Helper methods
  private mapIntentToSAKOperation(intent: EnhancedUserIntent): string {
    const operationMap: Record<string, Record<string, string>> = {
      lending: {
        supply: 'takara_supply',
        withdraw: 'takara_withdraw',
        borrow: 'takara_borrow',
        repay: 'takara_repay'
      },
      liquidity: {
        add: 'dragonswap_add_liquidity',
        remove: 'dragonswap_remove_liquidity'
      },
      trading: {
        swap: 'symphony_swap',
        buy: 'symphony_swap',
        sell: 'symphony_swap'
      }
    };
    
    return operationMap[intent.type]?.[intent.action] || 'get_native_balance';
  }

  private mapPriorityToNumber(priority: string): number {
    const mapping: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      urgent: 4
    };
    return mapping[priority] || 2;
  }

  private estimatePipelineDuration(steps: TaskStep[]): number {
    const baseDuration = 2000; // 2 seconds base
    const stepDuration = 1000; // 1 second per step
    return baseDuration + (steps.length * stepDuration);
  }

  private isRetryableError(error: any): boolean {
    const retryableErrors = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT_EXCEEDED', 'TEMPORARY_UNAVAILABLE'];
    const errorMessage = error instanceof Error ? error.message : String(error);
    return retryableErrors.some(retryable => errorMessage.includes(retryable));
  }

  private isCriticalStep(step: TaskStep): boolean {
    return step.type === 'validation' || step.operation.includes('critical');
  }

  private calculatePerformanceMetrics(result: OrchestrationResult): any {
    return {
      executionTime: result.metadata.executionTime,
      adaptersUsed: result.metadata.adaptersUsed.length,
      success: result.success
    };
  }

  private generateRecommendations(result: OrchestrationResult, intent: EnhancedUserIntent): string[] {
    const recommendations: string[] = [];
    
    if (result.metadata.executionTime > 10000) {
      recommendations.push('Consider breaking complex operations into smaller tasks');
    }
    
    if (result.metadata.gasUsed && result.metadata.gasUsed > 200000) {
      recommendations.push('Monitor gas usage for cost optimization');
    }
    
    if (intent.type === 'portfolio') {
      recommendations.push('Regular portfolio analysis recommended for optimal performance');
    }
    
    return recommendations;
  }

  private generateDragonBallAssessment(result: OrchestrationResult, intent: EnhancedUserIntent): any {
    const powerLevel = (result.metadata.gasUsed || 50000) / 1000;
    
    return {
      powerLevel: Math.round(powerLevel),
      tier: powerLevel > 100 ? 'Super Saiyan' : powerLevel > 50 ? 'Elite Warrior' : 'Trainee',
      message: result.success 
        ? 'Your transaction power has increased! Well done, warrior!'
        : 'Your power needs training. Analyze the error and grow stronger!'
    };
  }

  private calculateErrorRate(): number {
    if (this.performanceHistory.length === 0) return 0;
    
    const recentHistory = this.performanceHistory.slice(-100); // Last 100 operations
    const failures = recentHistory.filter(h => !h.success).length;
    return (failures / recentHistory.length) * 100;
  }

  private updateStats(intent: EnhancedUserIntent, result: OrchestrationResult, executionTime: number): void {
    // Update intents stats
    this.stats.intents.total++;
    if (result.success) {
      this.stats.intents.successful++;
    } else {
      this.stats.intents.failed++;
    }
    
    this.stats.intents.byType[intent.type] = (this.stats.intents.byType[intent.type] || 0) + 1;
    this.stats.intents.byPriority[intent.priority] = (this.stats.intents.byPriority[intent.priority] || 0) + 1;
    
    // Update adapter stats
    result.metadata.adaptersUsed.forEach(adapter => {
      if (this.stats.adapters[adapter as keyof typeof this.stats.adapters]) {
        const adapterStats = this.stats.adapters[adapter as keyof typeof this.stats.adapters];
        adapterStats.calls++;
        // Update success rate and latency (simplified)
        adapterStats.avgLatency = (adapterStats.avgLatency + executionTime) / 2;
      }
    });
    
    // Update performance stats
    this.stats.performance.avgExecutionTime = (this.stats.performance.avgExecutionTime + executionTime) / 2;
    this.stats.performance.concurrentTasks = this.runningTasks.size;
    this.stats.performance.queueLength = this.taskQueue.length;
    
    // Add to performance history
    this.performanceHistory.push({
      timestamp: new Date(),
      executionTime,
      success: result.success,
      intentType: intent.type
    });
    
    // Keep only last 1000 entries
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }
  }

  private setupOrchestratorEventHandlers(): void {
    this.seiIntegration.on('integration:alert', (alert) => {
      this.emit('orchestration:alert', {
        type: 'integration_alert',
        alert,
        timestamp: new Date()
      });
    });
    
    this.realTimeData.on('realtime:stream:error', (error) => {
      this.emit('orchestration:alert', {
        type: 'realtime_error',
        error,
        timestamp: new Date()
      });
    });
  }

  private startTaskProcessor(): void {
    // Simple task processor - runs every second
    setInterval(() => {
      this.processTaskQueue();
    }, 1000);
  }

  private async processTaskQueue(): Promise<void> {
    if (this.taskQueue.length === 0 || this.runningTasks.size >= this.config.core.maxConcurrentTasks) {
      return;
    }
    
    // Sort by priority and take the highest priority task
    this.taskQueue.sort((a, b) => b.priority - a.priority);
    const nextTask = this.taskQueue.shift();
    
    if (nextTask) {
      const promise = this.processIntent(nextTask.intent)()
        .then(result => result._tag === 'Right' ? result.right : null)
        .catch(() => null);
      this.runningTasks.set(nextTask.intent.id, promise as Promise<OrchestrationResult>);
      
      promise.finally(() => {
        this.runningTasks.delete(nextTask.intent.id);
      });
    }
  }

  private initializeStats(): OrchestratorStats {
    return {
      intents: {
        total: 0,
        successful: 0,
        failed: 0,
        pending: 0,
        byType: {},
        byPriority: {}
      },
      adapters: {
        hive: { calls: 0, successRate: 100, avgLatency: 0 },
        sak: { calls: 0, successRate: 100, avgLatency: 0 },
        mcp: { calls: 0, successRate: 100, avgLatency: 0 }
      },
      performance: {
        avgExecutionTime: 0,
        throughput: 0,
        concurrentTasks: 0,
        queueLength: 0
      },
      realTime: {
        activeStreams: 0,
        eventsProcessed: 0,
        avgLatency: 0
      }
    };
  }

  private createOrchestrationError(code: string, message: string, component: string, details?: any): OrchestrationError {
    return {
      code,
      message,
      component: component as any,
      severity: this.determineSeverity(code),
      details,
      timestamp: new Date(),
      recoverable: this.isRecoverableError(code),
      retryable: this.isRetryableError(code)
    };
  }

  private determineSeverity(code: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCodes = ['PIPELINE_EXECUTION_FAILED', 'INTENT_VALIDATION_FAILED'];
    const highCodes = ['ADAPTER_CALL_FAILED', 'TASK_TIMEOUT'];
    const mediumCodes = ['ANALYTICS_FAILED', 'NOTIFICATION_FAILED'];
    
    if (criticalCodes.includes(code)) return 'critical';
    if (highCodes.includes(code)) return 'high';
    if (mediumCodes.includes(code)) return 'medium';
    return 'low';
  }

  private isRecoverableError(code: string): boolean {
    const recoverableErrors = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT_EXCEEDED'];
    return recoverableErrors.includes(code);
  }

  private getDefaultConfig(): BackendOrchestratorConfig {
    const appConfig = getConfig();
    
    return {
      core: {
        maxConcurrentTasks: 10,
        taskTimeout: 30000,
        retryAttempts: 3,
        priorityQueueSize: 100
      },
      adapters: {
        hive: {
          enabled: true,
          baseUrl: appConfig.ai.hiveIntelligence.baseUrl,
          apiKey: appConfig.ai.hiveIntelligence.apiKey,
          rateLimitConfig: {
            maxRequests: appConfig.ai.hiveIntelligence.maxRequestsPerMinute,
            windowMs: 60000
          }
        },
        sak: {
          enabled: true,
          seiRpcUrl: appConfig.blockchain.sei.rpcUrl,
          seiEvmRpcUrl: 'https://evm-rpc.sei.io',
          chainId: 'pacific-1',
          network: 'mainnet',
          defaultPermissions: ['read', 'write']
        },
        mcp: {
          enabled: true,
          endpoint: 'localhost',
          port: 3001,
          secure: false,
          apiKey: process.env.MCP_API_KEY
        }
      },
      mcpServers: {
        hiveIntelligence: {
          name: 'hive-intelligence',
          url: appConfig.mcp.servers.hiveIntelligence.url,
          apiKey: appConfig.mcp.servers.hiveIntelligence.apiKey,
          timeout: appConfig.mcp.servers.hiveIntelligence.timeout
        },
        seiBlockchain: {
          name: 'sei-blockchain',
          url: appConfig.mcp.servers.seiBlockchain.url,
          apiKey: appConfig.mcp.servers.seiBlockchain.apiKey,
          timeout: appConfig.mcp.servers.seiBlockchain.timeout
        },
        portfolioManager: {
          name: 'portfolio-manager',
          url: appConfig.mcp.servers.portfolioManager.url,
          apiKey: appConfig.mcp.servers.portfolioManager.apiKey,
          timeout: appConfig.mcp.servers.portfolioManager.timeout
        }
      },
      openai: {
        apiKey: appConfig.ai.openai.apiKey,
        model: appConfig.ai.openai.model,
        temperature: 0.7,
        maxTokens: 1000
      },
      realTime: {
        enabled: true,
        streamTypes: ['blockchain', 'wallet', 'portfolio'] as const,
        batchSize: 10,
        maxDelay: 5000
      },
      analytics: {
        enabled: true,
        autoAnalysis: true,
        analysisInterval: 300000, // 5 minutes
        dragonBallTheme: true
      },
      notifications: {
        enabled: true,
        criticalAlerts: true,
        performanceAlerts: true,
        portfolioAlerts: true
      }
    };
  }
}