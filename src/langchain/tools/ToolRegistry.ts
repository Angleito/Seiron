/**
 * Tool Registry for Central Tool Management
 * 
 * This module provides a centralized registry for managing all LangChain tools
 * with dynamic loading, categorization, permission control, and tool discovery.
 */

import { BaseDeFiTool, DeFiToolConfig, ToolContext } from './BaseTool';
import { ToolFactory } from './ToolFactory';
import { AgentAction } from '../../agents/base/BaseAgent';
import { EventEmitter } from 'events';

/**
 * Tool metadata for registry
 */
export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  tags: string[];
  permissions: string[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  dependencies?: string[];
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tool registration configuration
 */
export interface ToolRegistrationConfig {
  metadata: ToolMetadata;
  toolFactory: () => BaseDeFiTool;
  dependencies?: string[];
  healthCheck?: () => Promise<boolean>;
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
}

/**
 * Tool category configuration
 */
export interface ToolCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  priority: number;
  enabled: boolean;
}

/**
 * Tool search criteria
 */
export interface ToolSearchCriteria {
  category?: string;
  tags?: string[];
  permissions?: string[];
  enabled?: boolean;
  namePattern?: string;
  limit?: number;
}

/**
 * Tool load configuration
 */
export interface ToolLoadConfig {
  context?: ToolContext;
  categories?: string[];
  exclude?: string[];
  include?: string[];
  lazy?: boolean;
}

/**
 * Tool usage statistics
 */
export interface ToolUsageStats {
  toolId: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgResponseTime: number;
  lastUsed: Date;
  errorRate: number;
}

/**
 * Central Tool Registry
 */
export class ToolRegistry extends EventEmitter {
  private static instance: ToolRegistry;
  private tools: Map<string, ToolRegistrationConfig> = new Map();
  private categories: Map<string, ToolCategory> = new Map();
  private loadedTools: Map<string, BaseDeFiTool> = new Map();
  private toolUsageStats: Map<string, ToolUsageStats> = new Map();
  private rateLimiters: Map<string, Map<string, { count: number; resetTime: number }>> = new Map();

  private constructor() {
    super();
    this.initializeDefaultCategories();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Register a tool
   */
  public registerTool(config: ToolRegistrationConfig): void {
    const { metadata } = config;
    
    if (this.tools.has(metadata.id)) {
      throw new Error(`Tool with ID ${metadata.id} already exists`);
    }

    // Validate dependencies
    if (config.dependencies) {
      const missingDeps = config.dependencies.filter(dep => !this.tools.has(dep));
      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
      }
    }

    this.tools.set(metadata.id, config);
    this.emit('tool:registered', { toolId: metadata.id, metadata });
  }

  /**
   * Unregister a tool
   */
  public async unregisterTool(toolId: string): Promise<void> {
    const config = this.tools.get(toolId);
    if (!config) {
      throw new Error(`Tool ${toolId} not found`);
    }

    // Check for dependent tools
    const dependentTools = Array.from(this.tools.values())
      .filter(t => t.dependencies?.includes(toolId));
    
    if (dependentTools.length > 0) {
      throw new Error(`Cannot unregister tool ${toolId} - it has dependent tools`);
    }

    // Unload if loaded
    if (this.loadedTools.has(toolId)) {
      await this.unloadTool(toolId);
    }

    // Run cleanup
    if (config.onUnload) {
      await config.onUnload();
    }

    this.tools.delete(toolId);
    this.toolUsageStats.delete(toolId);
    this.emit('tool:unregistered', { toolId });
  }

  /**
   * Load a tool
   */
  public async loadTool(toolId: string, context?: ToolContext): Promise<BaseDeFiTool> {
    const config = this.tools.get(toolId);
    if (!config) {
      throw new Error(`Tool ${toolId} not found`);
    }

    if (!config.metadata.enabled) {
      throw new Error(`Tool ${toolId} is disabled`);
    }

    // Check if already loaded
    if (this.loadedTools.has(toolId)) {
      return this.loadedTools.get(toolId)!;
    }

    // Load dependencies first
    if (config.dependencies) {
      for (const depId of config.dependencies) {
        if (!this.loadedTools.has(depId)) {
          await this.loadTool(depId, context);
        }
      }
    }

    // Health check
    if (config.healthCheck) {
      const isHealthy = await config.healthCheck();
      if (!isHealthy) {
        throw new Error(`Tool ${toolId} failed health check`);
      }
    }

    // Load the tool
    const tool = config.toolFactory();
    
    // Update context if provided
    if (context) {
      tool.updateContext(context);
    }

    // Initialize usage stats
    if (!this.toolUsageStats.has(toolId)) {
      this.toolUsageStats.set(toolId, {
        toolId,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        avgResponseTime: 0,
        lastUsed: new Date(),
        errorRate: 0
      });
    }

    // Run onLoad hook
    if (config.onLoad) {
      await config.onLoad();
    }

    this.loadedTools.set(toolId, tool);
    this.emit('tool:loaded', { toolId, tool });
    
    return tool;
  }

  /**
   * Unload a tool
   */
  public async unloadTool(toolId: string): Promise<void> {
    const tool = this.loadedTools.get(toolId);
    if (!tool) {
      return;
    }

    const config = this.tools.get(toolId);
    if (config?.onUnload) {
      await config.onUnload();
    }

    this.loadedTools.delete(toolId);
    this.emit('tool:unloaded', { toolId });
  }

  /**
   * Load tools by configuration
   */
  public async loadTools(config: ToolLoadConfig = {}): Promise<BaseDeFiTool[]> {
    const tools: BaseDeFiTool[] = [];
    const toolsToLoad = this.findToolsToLoad(config);

    for (const toolId of toolsToLoad) {
      try {
        const tool = await this.loadTool(toolId, config.context);
        tools.push(tool);
      } catch (error) {
        this.emit('tool:load:error', { toolId, error });
        if (!config.lazy) {
          throw error;
        }
      }
    }

    return tools;
  }

  /**
   * Get a loaded tool
   */
  public getTool(toolId: string): BaseDeFiTool | null {
    return this.loadedTools.get(toolId) || null;
  }

  /**
   * Get all loaded tools
   */
  public getLoadedTools(): BaseDeFiTool[] {
    return Array.from(this.loadedTools.values());
  }

  /**
   * Search tools by criteria
   */
  public searchTools(criteria: ToolSearchCriteria): ToolMetadata[] {
    const results: ToolMetadata[] = [];
    
    for (const [id, config] of this.tools) {
      const metadata = config.metadata;
      
      // Apply filters
      if (criteria.category && metadata.category !== criteria.category) {
        continue;
      }
      
      if (criteria.enabled !== undefined && metadata.enabled !== criteria.enabled) {
        continue;
      }
      
      if (criteria.tags && !criteria.tags.some(tag => metadata.tags.includes(tag))) {
        continue;
      }
      
      if (criteria.permissions && !criteria.permissions.every(perm => metadata.permissions.includes(perm))) {
        continue;
      }
      
      if (criteria.namePattern) {
        const regex = new RegExp(criteria.namePattern, 'i');
        if (!regex.test(metadata.name) && !regex.test(metadata.description)) {
          continue;
        }
      }
      
      results.push(metadata);
    }
    
    // Sort by priority
    results.sort((a, b) => b.priority - a.priority);
    
    // Apply limit
    if (criteria.limit) {
      return results.slice(0, criteria.limit);
    }
    
    return results;
  }

  /**
   * Get tools by category
   */
  public getToolsByCategory(category: string): ToolMetadata[] {
    return this.searchTools({ category });
  }

  /**
   * Register a category
   */
  public registerCategory(category: ToolCategory): void {
    this.categories.set(category.id, category);
    this.emit('category:registered', { category });
  }

  /**
   * Get all categories
   */
  public getCategories(): ToolCategory[] {
    return Array.from(this.categories.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get category by ID
   */
  public getCategory(id: string): ToolCategory | null {
    return this.categories.get(id) || null;
  }

  /**
   * Enable/disable a tool
   */
  public setToolEnabled(toolId: string, enabled: boolean): void {
    const config = this.tools.get(toolId);
    if (!config) {
      throw new Error(`Tool ${toolId} not found`);
    }

    config.metadata.enabled = enabled;
    config.metadata.updatedAt = new Date();
    
    if (!enabled && this.loadedTools.has(toolId)) {
      this.unloadTool(toolId);
    }
    
    this.emit('tool:enabled:changed', { toolId, enabled });
  }

  /**
   * Get tool usage statistics
   */
  public getToolUsageStats(toolId: string): ToolUsageStats | null {
    return this.toolUsageStats.get(toolId) || null;
  }

  /**
   * Get all usage statistics
   */
  public getAllUsageStats(): ToolUsageStats[] {
    return Array.from(this.toolUsageStats.values());
  }

  /**
   * Record tool usage
   */
  public recordToolUsage(toolId: string, success: boolean, responseTime: number): void {
    const stats = this.toolUsageStats.get(toolId);
    if (!stats) {
      return;
    }

    stats.totalCalls++;
    stats.lastUsed = new Date();
    
    if (success) {
      stats.successfulCalls++;
    } else {
      stats.failedCalls++;
    }
    
    // Update average response time
    const totalTime = stats.avgResponseTime * (stats.totalCalls - 1) + responseTime;
    stats.avgResponseTime = totalTime / stats.totalCalls;
    
    // Update error rate
    stats.errorRate = stats.failedCalls / stats.totalCalls;
    
    this.emit('tool:usage:recorded', { toolId, stats });
  }

  /**
   * Check rate limit for a tool
   */
  public checkRateLimit(toolId: string, userId: string): boolean {
    const config = this.tools.get(toolId);
    if (!config?.metadata.rateLimit) {
      return true;
    }

    const { maxRequests, windowMs } = config.metadata.rateLimit;
    const now = Date.now();
    
    if (!this.rateLimiters.has(toolId)) {
      this.rateLimiters.set(toolId, new Map());
    }
    
    const toolLimiters = this.rateLimiters.get(toolId)!;
    const userLimit = toolLimiters.get(userId) || { count: 0, resetTime: now + windowMs };
    
    if (now > userLimit.resetTime) {
      userLimit.count = 0;
      userLimit.resetTime = now + windowMs;
    }
    
    if (userLimit.count >= maxRequests) {
      return false;
    }
    
    userLimit.count++;
    toolLimiters.set(userId, userLimit);
    
    return true;
  }

  /**
   * Get health status of all tools
   */
  public async getHealthStatus(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();
    
    for (const [toolId, config] of this.tools) {
      if (config.healthCheck) {
        try {
          const isHealthy = await config.healthCheck();
          healthStatus.set(toolId, isHealthy);
        } catch (error) {
          healthStatus.set(toolId, false);
        }
      } else {
        healthStatus.set(toolId, true);
      }
    }
    
    return healthStatus;
  }

  /**
   * Initialize default categories
   */
  private initializeDefaultCategories(): void {
    const categories: ToolCategory[] = [
      {
        id: 'lending',
        name: 'Lending',
        description: 'Tools for lending and borrowing operations',
        icon: '🏦',
        priority: 100,
        enabled: true
      },
      {
        id: 'liquidity',
        name: 'Liquidity',
        description: 'Tools for liquidity management and DEX operations',
        icon: '💧',
        priority: 90,
        enabled: true
      },
      {
        id: 'market',
        name: 'Market',
        description: 'Tools for market analysis and trading',
        icon: '📈',
        priority: 80,
        enabled: true
      },
      {
        id: 'cross-protocol',
        name: 'Cross-Protocol',
        description: 'Tools for cross-protocol operations and optimization',
        icon: '🔗',
        priority: 70,
        enabled: true
      }
    ];

    categories.forEach(category => {
      this.categories.set(category.id, category);
    });
  }

  /**
   * Find tools to load based on configuration
   */
  private findToolsToLoad(config: ToolLoadConfig): string[] {
    const allTools = Array.from(this.tools.keys());
    let toolsToLoad = allTools;

    // Filter by categories
    if (config.categories && config.categories.length > 0) {
      toolsToLoad = toolsToLoad.filter(toolId => {
        const toolConfig = this.tools.get(toolId);
        return toolConfig && config.categories!.includes(toolConfig.metadata.category);
      });
    }

    // Apply include filter
    if (config.include && config.include.length > 0) {
      toolsToLoad = toolsToLoad.filter(toolId => config.include!.includes(toolId));
    }

    // Apply exclude filter
    if (config.exclude && config.exclude.length > 0) {
      toolsToLoad = toolsToLoad.filter(toolId => !config.exclude!.includes(toolId));
    }

    // Filter enabled tools
    toolsToLoad = toolsToLoad.filter(toolId => {
      const toolConfig = this.tools.get(toolId);
      return toolConfig && toolConfig.metadata.enabled;
    });

    return toolsToLoad;
  }
}

/**
 * Default registry instance
 */
export const defaultToolRegistry = ToolRegistry.getInstance();

/**
 * Helper function to register tools from actions
 */
export async function registerToolsFromActions(
  actions: AgentAction[],
  context: ToolContext = {}
): Promise<void> {
  const toolFactory = ToolFactory.getInstance();
  const registry = defaultToolRegistry;

  for (const action of actions) {
    // Register action with tool factory
    toolFactory.registerActionsWithDefaults([action]);
    
    // Create registration config
    const config: ToolRegistrationConfig = {
      metadata: {
        id: action.id,
        name: action.name,
        description: action.description,
        category: inferCategoryFromAction(action),
        version: '1.0.0',
        tags: action.validation?.map(v => v.field) || [],
        permissions: [],
        enabled: true,
        priority: 50,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      toolFactory: () => toolFactory.createTool(action.id, context)!,
      healthCheck: async () => true
    };

    registry.registerTool(config);
  }
}

/**
 * Helper function to infer category from action
 */
function inferCategoryFromAction(action: AgentAction): string {
  const name = action.name.toLowerCase();
  
  if (name.includes('deposit') || name.includes('withdraw') || name.includes('borrow') || name.includes('repay')) {
    return 'lending';
  }
  
  if (name.includes('swap') || name.includes('liquidity') || name.includes('pool')) {
    return 'liquidity';
  }
  
  if (name.includes('trade') || name.includes('market') || name.includes('price')) {
    return 'market';
  }
  
  return 'cross-protocol';
}