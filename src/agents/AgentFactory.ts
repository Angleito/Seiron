import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { BaseAgent, AgentConfig, AgentError } from './base/BaseAgent';
import { LendingAgent } from './lending/LendingAgent';
import { CLPAgent } from './liquidity/CLPAgent';
import { MarketAgent } from './market/MarketAgent';

/**
 * Agent Factory for creating specialized DeFi agents
 */

export type AgentType = 'lending' | 'liquidity' | 'market';

export interface AgentCreationConfig {
  type: AgentType;
  config: AgentConfig;
  customSettings?: Record<string, any>;
}

export class AgentFactory {
  /**
   * Create an agent of the specified type
   */
  public static createAgent(creationConfig: AgentCreationConfig): Either<AgentError, BaseAgent> {
    try {
      switch (creationConfig.type) {
        case 'lending':
          return right(new LendingAgent(creationConfig.config));
        
        case 'liquidity':
          return right(new CLPAgent(creationConfig.config));
        
        case 'market':
          return right(new MarketAgent(creationConfig.config));
        
        default:
          return left({
            code: 'UNKNOWN_AGENT_TYPE',
            message: `Unknown agent type: ${creationConfig.type}`,
            timestamp: new Date(),
            agentId: 'factory'
          });
      }
    } catch (error) {
      return left({
        code: 'AGENT_CREATION_FAILED',
        message: `Failed to create agent: ${error}`,
        timestamp: new Date(),
        agentId: 'factory'
      });
    }
  }

  /**
   * Create multiple agents with default configurations
   */
  public static createAgentSuite(baseConfig?: Partial<AgentConfig>): Either<AgentError, BaseAgent[]> {
    const defaultConfig: AgentConfig = {
      id: 'default',
      name: 'Default Agent',
      version: '1.0.0',
      description: 'Default DeFi agent',
      capabilities: [],
      settings: {},
      ...baseConfig
    };

    const agentConfigs: AgentCreationConfig[] = [
      {
        type: 'lending',
        config: {
          ...defaultConfig,
          id: 'lending-agent',
          name: 'Lending Oracle',
          description: 'Sophisticated DeFi lending optimization agent',
          capabilities: ['lending', 'yield-optimization', 'risk-assessment'],
          elizaCharacterPath: './characters/lending-agent.json'
        }
      },
      {
        type: 'liquidity',
        config: {
          ...defaultConfig,
          id: 'liquidity-agent',
          name: 'Liquidity Maestro',
          description: 'Advanced concentrated liquidity position manager',
          capabilities: ['concentrated-liquidity', 'amm-optimization', 'impermanent-loss-management'],
          elizaCharacterPath: './characters/liquidity-agent.json'
        }
      },
      {
        type: 'market',
        config: {
          ...defaultConfig,
          id: 'market-agent',
          name: 'Market Prophet',
          description: 'Advanced market analysis and prediction agent',
          capabilities: ['market-analysis', 'price-prediction', 'trend-analysis'],
          elizaCharacterPath: './characters/market-agent.json'
        }
      }
    ];

    const agents: BaseAgent[] = [];
    
    for (const config of agentConfigs) {
      const agentResult = this.createAgent(config);
      
      if (agentResult._tag === 'Left') {
        return agentResult;
      }
      
      agents.push(agentResult.right);
    }

    return right(agents);
  }

  /**
   * Validate agent configuration
   */
  public static validateConfig(config: AgentConfig): Either<AgentError, void> {
    if (!config.id || config.id.trim().length === 0) {
      return left({
        code: 'INVALID_CONFIG',
        message: 'Agent ID is required',
        timestamp: new Date(),
        agentId: 'factory'
      });
    }

    if (!config.name || config.name.trim().length === 0) {
      return left({
        code: 'INVALID_CONFIG',
        message: 'Agent name is required',
        timestamp: new Date(),
        agentId: 'factory'
      });
    }

    if (!config.capabilities || config.capabilities.length === 0) {
      return left({
        code: 'INVALID_CONFIG',
        message: 'Agent must have at least one capability',
        timestamp: new Date(),
        agentId: 'factory'
      });
    }

    return right(undefined);
  }

  /**
   * Get default configuration for agent type
   */
  public static getDefaultConfig(type: AgentType): AgentConfig {
    const baseConfig: AgentConfig = {
      id: `${type}-agent`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
      version: '1.0.0',
      description: `Default ${type} agent configuration`,
      capabilities: [],
      settings: {}
    };

    switch (type) {
      case 'lending':
        return {
          ...baseConfig,
          name: 'Lending Oracle',
          description: 'Sophisticated DeFi lending optimization agent',
          capabilities: ['lending', 'yield-optimization', 'risk-assessment', 'protocol-analysis'],
          settings: {
            maxProtocols: 10,
            riskTolerance: 'medium',
            rebalanceFrequency: 'daily',
            gasOptimization: true
          }
        };

      case 'liquidity':
        return {
          ...baseConfig,
          name: 'Liquidity Maestro',
          description: 'Advanced concentrated liquidity position manager',
          capabilities: ['concentrated-liquidity', 'amm-optimization', 'impermanent-loss-management', 'range-strategies'],
          settings: {
            maxPositions: 20,
            defaultStrategy: 'dynamic',
            autoRebalance: true,
            slippageTolerance: 0.5
          }
        };

      case 'market':
        return {
          ...baseConfig,
          name: 'Market Prophet',
          description: 'Advanced market analysis and prediction agent',
          capabilities: ['market-analysis', 'price-prediction', 'trend-analysis', 'risk-assessment'],
          settings: {
            predictionHorizon: '7d',
            confidenceThreshold: 0.7,
            analysisFrequency: 'hourly',
            modelEnsemble: true
          }
        };

      default:
        return baseConfig;
    }
  }
}