/**
 * Agent Tool Adapter for LangChain Integration
 * 
 * This module provides a bridge between the existing agent architecture
 * and LangChain tools, enabling seamless integration while maintaining
 * the existing action patterns and fp-ts functional programming approach.
 */

import { BaseDeFiTool, ToolContext } from '../tools/BaseTool';
import { defaultToolRegistry, ToolRegistry } from '../tools/ToolRegistry';
import { defaultToolFactory, ToolFactory } from '../tools/ToolFactory';
import { BaseAgent, AgentAction } from '../../agents/base/BaseAgent';
import { lendingActions } from '../../agents/actions/lending';
import { EventEmitter } from 'events';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

/**
 * Configuration for agent tool adapter
 */
export interface AgentToolAdapterConfig {
  registry?: ToolRegistry;
  factory?: ToolFactory;
  autoRegisterActions?: boolean;
  enableMetrics?: boolean;
  defaultContext?: ToolContext;
}

/**
 * Tool execution metrics
 */
export interface ToolExecutionMetrics {
  toolId: string;
  executionTime: number;
  success: boolean;
  inputTokens?: number;
  outputTokens?: number;
  errorType?: string;
  timestamp: Date;
}

/**
 * Agent Tool Adapter Events
 */
export interface AdapterEvents {
  'tool:registered': { toolId: string; agentId: string };
  'tool:executed': { toolId: string; metrics: ToolExecutionMetrics };
  'tool:error': { toolId: string; error: Error };
  'agent:connected': { agentId: string; toolCount: number };
  'agent:disconnected': { agentId: string };
}

/**
 * Main adapter class that bridges agents and LangChain tools
 */
export class AgentToolAdapter extends EventEmitter {
  private registry: ToolRegistry;
  private factory: ToolFactory;
  private config: AgentToolAdapterConfig;
  private connectedAgents: Map<string, BaseAgent> = new Map();
  private agentTools: Map<string, Set<string>> = new Map(); // agentId -> toolIds
  private executionMetrics: ToolExecutionMetrics[] = [];

  constructor(config: AgentToolAdapterConfig = {}) {
    super();
    this.config = {
      autoRegisterActions: true,
      enableMetrics: true,
      ...config
    };
    
    this.registry = config.registry || defaultToolRegistry;
    this.factory = config.factory || defaultToolFactory;
    
    this.setupEventHandlers();
  }

  /**
   * Connect an agent to the adapter
   */
  public async connectAgent(agent: BaseAgent, context?: ToolContext): Promise<void> {
    const agentId = agent.getConfig().id;
    
    if (this.connectedAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} is already connected`);
    }
    
    this.connectedAgents.set(agentId, agent);
    
    // Auto-register agent actions if enabled
    if (this.config.autoRegisterActions) {
      await this.registerAgentActions(agent, context);
    }
    
    const toolCount = this.agentTools.get(agentId)?.size || 0;
    this.emit('agent:connected', { agentId, toolCount });
  }

  /**
   * Disconnect an agent from the adapter
   */
  public async disconnectAgent(agentId: string): Promise<void> {
    const agent = this.connectedAgents.get(agentId);
    if (!agent) {
      return;
    }
    
    // Unregister agent tools
    const toolIds = this.agentTools.get(agentId) || new Set();
    for (const toolId of toolIds) {
      try {
        await this.registry.unregisterTool(toolId);
      } catch (error) {
        this.emit('tool:error', { toolId, error: error as Error });
      }
    }
    
    this.connectedAgents.delete(agentId);
    this.agentTools.delete(agentId);
    
    this.emit('agent:disconnected', { agentId });
  }

  /**
   * Register actions from an agent as LangChain tools
   */
  public async registerAgentActions(agent: BaseAgent, context?: ToolContext): Promise<void> {
    const agentId = agent.getConfig().id;
    const agentConfig = agent.getConfig();
    
    // Get actions based on agent capabilities
    const actions = this.getActionsForAgent(agentConfig.capabilities);
    
    const toolContext: ToolContext = {
      ...this.config.defaultContext,
      ...context,
      sessionId: agentId,
      agentState: agent.getState().context
    };
    
    const registeredToolIds = new Set<string>();
    
    for (const action of actions) {
      try {
        const toolId = `${agentId}_${action.id}`;
        
        // Register action with factory
        this.factory.registerAction(action, {
          toolName: `${agentConfig.name}_${action.name}`,
          toolDescription: `${action.description} (via ${agentConfig.name})`,
          category: this.inferCategoryFromAction(action),
          schema: this.generateSchemaFromAction(action),
          examples: this.generateExamplesForAction(action)
        });
        
        // Register tool with registry
        await this.registry.registerTool({
          metadata: {
            id: toolId,
            name: `${agentConfig.name}_${action.name}`,
            description: `${action.description} (via ${agentConfig.name})`,
            category: this.inferCategoryFromAction(action),
            version: agentConfig.version,
            tags: action.validation?.map(v => v.field) || [],
            permissions: [],
            enabled: true,
            priority: 50,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          toolFactory: () => this.factory.createTool(action.id, toolContext)!,
          healthCheck: async () => agent.getState().status === 'active'
        });
        
        registeredToolIds.add(toolId);
        this.emit('tool:registered', { toolId, agentId });
        
      } catch (error) {
        this.emit('tool:error', { 
          toolId: `${agentId}_${action.id}`, 
          error: error as Error 
        });
      }
    }
    
    this.agentTools.set(agentId, registeredToolIds);
  }

  /**
   * Get all tools for a specific agent
   */
  public async getAgentTools(agentId: string, context?: ToolContext): Promise<BaseDeFiTool[]> {
    const toolIds = this.agentTools.get(agentId);
    if (!toolIds) {
      return [];
    }
    
    const tools: BaseDeFiTool[] = [];
    
    for (const toolId of toolIds) {
      try {
        const tool = await this.registry.loadTool(toolId, context);
        tools.push(tool);
      } catch (error) {
        this.emit('tool:error', { toolId, error: error as Error });
      }
    }
    
    return tools;
  }

  /**
   * Get all available tools across all connected agents
   */
  public async getAllTools(context?: ToolContext): Promise<BaseDeFiTool[]> {
    return await this.registry.loadTools({ context });
  }

  /**
   * Execute a tool with metrics tracking
   */
  public async executeTool(
    toolId: string, 
    input: string, 
    context?: ToolContext
  ): Promise<{ result: string; metrics?: ToolExecutionMetrics }> {
    const startTime = Date.now();
    let metrics: ToolExecutionMetrics | undefined;
    
    try {
      const tool = await this.registry.loadTool(toolId, context);
      const result = await tool._call(input);
      
      if (this.config.enableMetrics) {
        metrics = {
          toolId,
          executionTime: Date.now() - startTime,
          success: true,
          timestamp: new Date()
        };
        
        this.recordMetrics(metrics);
        this.emit('tool:executed', { toolId, metrics });
      }
      
      return { result, metrics };
      
    } catch (error) {
      if (this.config.enableMetrics) {
        metrics = {
          toolId,
          executionTime: Date.now() - startTime,
          success: false,
          errorType: error instanceof Error ? error.name : 'Unknown',
          timestamp: new Date()
        };
        
        this.recordMetrics(metrics);
      }
      
      this.emit('tool:error', { toolId, error: error as Error });
      
      return { 
        result: `Error executing tool ${toolId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metrics 
      };
    }
  }

  /**
   * Get tools by category
   */
  public async getToolsByCategory(category: string, context?: ToolContext): Promise<BaseDeFiTool[]> {
    return await this.registry.loadTools({ 
      categories: [category],
      context 
    });
  }

  /**
   * Search tools by criteria
   */
  public searchTools(query: string): BaseDeFiTool[] {
    const searchResults = this.registry.searchTools({
      namePattern: query,
      limit: 10
    });
    
    return searchResults
      .map(metadata => this.registry.getTool(metadata.id))
      .filter(tool => tool !== null) as BaseDeFiTool[];
  }

  /**
   * Get execution metrics
   */
  public getExecutionMetrics(): ToolExecutionMetrics[] {
    return [...this.executionMetrics];
  }

  /**
   * Get metrics for a specific tool
   */
  public getToolMetrics(toolId: string): ToolExecutionMetrics[] {
    return this.executionMetrics.filter(m => m.toolId === toolId);
  }

  /**
   * Get connected agents
   */
  public getConnectedAgents(): string[] {
    return Array.from(this.connectedAgents.keys());
  }

  /**
   * Check if an agent is connected
   */
  public isAgentConnected(agentId: string): boolean {
    return this.connectedAgents.has(agentId);
  }

  /**
   * Update context for all tools of an agent
   */
  public async updateAgentContext(agentId: string, contextUpdates: Partial<ToolContext>): Promise<void> {
    const tools = await this.getAgentTools(agentId);
    
    for (const tool of tools) {
      tool.updateContext(contextUpdates);
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.registry.on('tool:loaded', (event) => {
      // Tool loaded successfully
    });
    
    this.registry.on('tool:load:error', (event) => {
      this.emit('tool:error', event);
    });
  }

  /**
   * Get actions based on agent capabilities
   */
  private getActionsForAgent(capabilities: string[]): AgentAction[] {
    const actions: AgentAction[] = [];
    
    // Add lending actions if agent has lending capability
    if (capabilities.includes('lending')) {
      actions.push(...lendingActions);
    }
    
    // Add liquidity actions if agent has liquidity capability
    if (capabilities.includes('liquidity')) {
      // Import and add liquidity actions
      // actions.push(...liquidityActions);
    }
    
    // Add market actions if agent has market capability
    if (capabilities.includes('market')) {
      // Import and add market actions
      // actions.push(...marketActions);
    }
    
    return actions;
  }

  /**
   * Infer category from action
   */
  private inferCategoryFromAction(action: AgentAction): 'lending' | 'liquidity' | 'market' | 'cross-protocol' {
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

  /**
   * Generate schema from action validation rules
   */
  private generateSchemaFromAction(action: AgentAction): any {
    // This would generate a Zod schema based on the action's validation rules
    // For now, return a basic schema
    return {
      type: 'object',
      properties: {
        input: { type: 'string', description: action.description }
      },
      required: ['input']
    };
  }

  /**
   * Generate examples for action
   */
  private generateExamplesForAction(action: AgentAction): string[] {
    const examples = [];
    const name = action.name.toLowerCase();
    
    if (name.includes('deposit')) {
      examples.push('Deposit 100 USDC', 'Supply 0.5 ETH');
    } else if (name.includes('withdraw')) {
      examples.push('Withdraw 50 USDC', 'Remove 0.2 ETH');
    } else if (name.includes('borrow')) {
      examples.push('Borrow 200 USDC', 'Take loan of 0.1 ETH');
    } else if (name.includes('repay')) {
      examples.push('Repay 100 USDC', 'Pay back loan');
    }
    
    return examples;
  }

  /**
   * Record execution metrics
   */
  private recordMetrics(metrics: ToolExecutionMetrics): void {
    this.executionMetrics.push(metrics);
    
    // Keep only last 1000 metrics to prevent memory issues
    if (this.executionMetrics.length > 1000) {
      this.executionMetrics = this.executionMetrics.slice(-1000);
    }
    
    // Update registry usage stats
    this.registry.recordToolUsage(
      metrics.toolId,
      metrics.success,
      metrics.executionTime
    );
  }
}

/**
 * Helper function to create and configure an adapter
 */
export function createAgentToolAdapter(config: AgentToolAdapterConfig = {}): AgentToolAdapter {
  return new AgentToolAdapter(config);
}

/**
 * Helper function to create adapter with default configuration
 */
export function createDefaultAdapter(): AgentToolAdapter {
  return new AgentToolAdapter({
    autoRegisterActions: true,
    enableMetrics: true,
    defaultContext: {
      sessionId: 'default-session',
      metadata: {
        source: 'langchain-adapter',
        version: '1.0.0'
      }
    }
  });
}

/**
 * Export default adapter instance
 */
export const defaultAgentToolAdapter = createDefaultAdapter();