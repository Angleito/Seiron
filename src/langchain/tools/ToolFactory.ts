/**
 * Tool Factory for Converting Agent Actions to LangChain Tools
 * 
 * This module provides a factory system for automatically converting existing
 * agent actions into LangChain tools, maintaining compatibility with the existing
 * agent architecture while enabling natural language interaction.
 */

import { z } from 'zod';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { BaseDeFiTool, DeFiToolConfig, DeFiToolResult, ToolContext } from './BaseTool';
import { AgentAction, ActionContext, ActionResult, AgentError } from '../../agents/base/BaseAgent';

/**
 * Configuration for converting an action to a tool
 */
export interface ActionToToolConfig {
  action: AgentAction;
  toolName: string;
  toolDescription: string;
  category: 'lending' | 'liquidity' | 'market' | 'cross-protocol';
  schema: z.ZodSchema<any>;
  examples: string[];
  parameterMapping?: Record<string, string>;
  resultMapping?: (result: ActionResult) => DeFiToolResult;
  naturalLanguageHints?: string[];
}

/**
 * Factory for creating tools from agent actions
 */
export class ToolFactory {
  private static instance: ToolFactory;
  private actionRegistry: Map<string, AgentAction> = new Map();
  private toolConfigs: Map<string, ActionToToolConfig> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ToolFactory {
    if (!ToolFactory.instance) {
      ToolFactory.instance = new ToolFactory();
    }
    return ToolFactory.instance;
  }

  /**
   * Register an action for tool conversion
   */
  public registerAction(action: AgentAction, config: Omit<ActionToToolConfig, 'action'>): void {
    const fullConfig: ActionToToolConfig = {
      action,
      ...config
    };

    this.actionRegistry.set(action.id, action);
    this.toolConfigs.set(action.id, fullConfig);
  }

  /**
   * Create a LangChain tool from an action
   */
  public createTool(actionId: string, context: ToolContext = {}): BaseDeFiTool | null {
    const config = this.toolConfigs.get(actionId);
    if (!config) {
      return null;
    }

    const toolConfig: DeFiToolConfig = {
      name: config.toolName,
      description: config.toolDescription,
      category: config.category,
      schema: config.schema,
      examples: config.examples
    };

    return new ActionDerivedTool(toolConfig, context, config);
  }

  /**
   * Create all tools from registered actions
   */
  public createAllTools(context: ToolContext = {}): BaseDeFiTool[] {
    return Array.from(this.toolConfigs.keys())
      .map(actionId => this.createTool(actionId, context))
      .filter(tool => tool !== null) as BaseDeFiTool[];
  }

  /**
   * Get tools by category
   */
  public getToolsByCategory(category: string, context: ToolContext = {}): BaseDeFiTool[] {
    return Array.from(this.toolConfigs.values())
      .filter(config => config.category === category)
      .map(config => this.createTool(config.action.id, context))
      .filter(tool => tool !== null) as BaseDeFiTool[];
  }

  /**
   * Get all registered action IDs
   */
  public getRegisteredActionIds(): string[] {
    return Array.from(this.actionRegistry.keys());
  }

  /**
   * Get action configuration
   */
  public getActionConfig(actionId: string): ActionToToolConfig | null {
    return this.toolConfigs.get(actionId) || null;
  }

  /**
   * Register multiple actions with default configurations
   */
  public registerActionsWithDefaults(actions: AgentAction[]): void {
    actions.forEach(action => {
      const config = this.generateDefaultConfig(action);
      this.registerAction(action, config);
    });
  }

  /**
   * Generate default configuration for an action
   */
  private generateDefaultConfig(action: AgentAction): Omit<ActionToToolConfig, 'action'> {
    // Determine category from action name
    const category = this.inferCategory(action.name);
    
    // Generate schema based on action validation rules
    const schema = this.generateSchemaFromAction(action);
    
    // Generate examples
    const examples = this.generateExamples(action);
    
    // Generate natural language hints
    const naturalLanguageHints = this.generateNaturalLanguageHints(action);

    return {
      toolName: action.name,
      toolDescription: action.description,
      category,
      schema,
      examples,
      naturalLanguageHints
    };
  }

  /**
   * Infer category from action name
   */
  private inferCategory(actionName: string): 'lending' | 'liquidity' | 'market' | 'cross-protocol' {
    const name = actionName.toLowerCase();
    
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
  private generateSchemaFromAction(action: AgentAction): z.ZodSchema<any> {
    const schemaFields: Record<string, z.ZodTypeAny> = {};
    
    if (action.validation) {
      action.validation.forEach(rule => {
        let fieldSchema: z.ZodTypeAny;
        
        switch (rule.type) {
          case 'string':
            fieldSchema = z.string();
            break;
          case 'number':
            fieldSchema = z.number();
            break;
          case 'boolean':
            fieldSchema = z.boolean();
            break;
          case 'array':
            fieldSchema = z.array(z.any());
            break;
          case 'object':
            fieldSchema = z.object({});
            break;
          default:
            fieldSchema = z.any();
        }
        
        if (!rule.required) {
          fieldSchema = fieldSchema.optional();
        }
        
        schemaFields[rule.field] = fieldSchema;
      });
    }
    
    // Add common fields if not present
    if (!schemaFields.walletAddress) {
      schemaFields.walletAddress = z.string().optional();
    }
    
    return z.object(schemaFields);
  }

  /**
   * Generate examples for an action
   */
  private generateExamples(action: AgentAction): string[] {
    const examples: string[] = [];
    const name = action.name.toLowerCase();
    
    if (name.includes('deposit')) {
      examples.push('Deposit 100 USDC');
      examples.push('Deposit 0.5 ETH');
    }
    
    if (name.includes('withdraw')) {
      examples.push('Withdraw 50 USDC');
      examples.push('Withdraw all my ETH');
    }
    
    if (name.includes('borrow')) {
      examples.push('Borrow 200 USDC');
      examples.push('Borrow 0.1 ETH with variable rate');
    }
    
    if (name.includes('repay')) {
      examples.push('Repay 100 USDC');
      examples.push('Repay all my debt');
    }
    
    if (name.includes('swap')) {
      examples.push('Swap 100 USDC for ETH');
      examples.push('Swap 0.1 ETH for SEI');
    }
    
    if (name.includes('liquidity')) {
      examples.push('Add liquidity: 100 USDC and 0.05 ETH');
      examples.push('Remove liquidity from position 123');
    }
    
    return examples;
  }

  /**
   * Generate natural language hints
   */
  private generateNaturalLanguageHints(action: AgentAction): string[] {
    const hints: string[] = [];
    const name = action.name.toLowerCase();
    
    if (name.includes('deposit') || name.includes('withdraw')) {
      hints.push('You can specify amounts like "100 USDC" or "0.5 ETH"');
      hints.push('Use "all" or "max" to operate on your entire balance');
    }
    
    if (name.includes('borrow')) {
      hints.push('Specify interest rate mode: "stable" or "variable"');
      hints.push('Check your health factor before borrowing');
    }
    
    if (name.includes('swap')) {
      hints.push('Specify tokens like "USDC to ETH" or "ETH for SEI"');
      hints.push('You can set slippage tolerance (e.g., "5% slippage")');
    }
    
    return hints;
  }
}

/**
 * Tool class that wraps an agent action
 */
class ActionDerivedTool extends BaseDeFiTool {
  private actionConfig: ActionToToolConfig;

  constructor(config: DeFiToolConfig, context: ToolContext, actionConfig: ActionToToolConfig) {
    super(config, context);
    this.actionConfig = actionConfig;
  }

  /**
   * Enhanced natural language parsing using action-specific hints
   */
  protected parseNaturalLanguage(input: string): Record<string, any> {
    const params = super.parseNaturalLanguage(input);
    
    // Apply parameter mapping if defined
    if (this.actionConfig.parameterMapping) {
      const mappedParams: Record<string, any> = {};
      
      Object.entries(params).forEach(([key, value]) => {
        const mappedKey = this.actionConfig.parameterMapping![key] || key;
        mappedParams[mappedKey] = value;
      });
      
      return mappedParams;
    }
    
    return params;
  }

  /**
   * Execute the underlying agent action
   */
  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const actionContext: ActionContext = {
      agentId: this.context.sessionId || 'langchain-tool',
      userId: this.context.userId,
      parameters: params,
      state: {
        status: 'active',
        lastUpdate: new Date(),
        metrics: {
          actionsExecuted: 0,
          successRate: 1.0,
          avgResponseTime: 0,
          errorCount: 0,
          uptime: 0
        },
        context: this.context.agentState || {}
      },
      metadata: this.context.metadata || {}
    };

    try {
      // Execute the action using TaskEither
      const result = await this.actionConfig.action.handler(actionContext)();
      
      if (result._tag === 'Right') {
        // Success case
        const actionResult = result.right;
        
        // Apply result mapping if defined
        if (this.actionConfig.resultMapping) {
          return this.actionConfig.resultMapping(actionResult);
        }
        
        // Default result mapping
        return {
          success: actionResult.success,
          data: actionResult.data,
          message: actionResult.message || 'Operation completed successfully',
          timestamp: new Date(),
          metadata: actionResult.metrics
        };
      } else {
        // Error case
        const error = result.left;
        return {
          success: false,
          message: error.message,
          timestamp: new Date(),
          metadata: { error: error.details }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        metadata: { error }
      };
    }
  }
}

/**
 * Default factory instance
 */
export const defaultToolFactory = ToolFactory.getInstance();

/**
 * Helper function to quickly create a tool from an action
 */
export function createToolFromAction(
  action: AgentAction,
  config: Omit<ActionToToolConfig, 'action'>,
  context: ToolContext = {}
): BaseDeFiTool | null {
  defaultToolFactory.registerAction(action, config);
  return defaultToolFactory.createTool(action.id, context);
}

/**
 * Helper function to create tools from multiple actions
 */
export function createToolsFromActions(
  actions: AgentAction[],
  context: ToolContext = {}
): BaseDeFiTool[] {
  defaultToolFactory.registerActionsWithDefaults(actions);
  return actions
    .map(action => defaultToolFactory.createTool(action.id, context))
    .filter(tool => tool !== null) as BaseDeFiTool[];
}