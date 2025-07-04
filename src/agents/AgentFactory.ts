import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { BaseAgent, AgentConfig, AgentError } from './base/BaseAgent';
import { LendingAgent } from './lending/LendingAgent';
import { CLPAgent } from './liquidity/CLPAgent';
import { MarketAgent } from './market/MarketAgent';
import { SeiAgentKitAdapter, type SAKIntegrationConfig } from './adapters/SeiAgentKitAdapter';
import { HiveIntelligenceAdapter, type HiveIntelligenceConfig } from './adapters/HiveIntelligenceAdapter';
import { SeiMCPAdapter, type MCPServerConfig } from './adapters/SeiMCPAdapter';

/**
 * Agent Factory for creating specialized DeFi agents
 */

export type AgentType = 'lending' | 'liquidity' | 'market' | 'seiAgentKit' | 'hiveIntelligence' | 'seiMCP';

export interface AgentCreationConfig {
  type: AgentType;
  config: AgentConfig;
  customSettings?: Record<string, any>;
  adapterConfig?: SAKIntegrationConfig | HiveIntelligenceConfig | MCPServerConfig;
}

/**
 * Configuration for creating adapter agents
 */
export interface AdapterAgentConfigs {
  seiAgentKit?: {
    enabled: boolean;
    config: SAKIntegrationConfig;
    agentConfig?: Partial<AgentConfig>;
  };
  hiveIntelligence?: {
    enabled: boolean;
    config: HiveIntelligenceConfig;
    agentConfig?: Partial<AgentConfig>;
  };
  seiMCP?: {
    enabled: boolean;
    config: MCPServerConfig;
    agentConfig?: Partial<AgentConfig>;
  };
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
        
        case 'seiAgentKit':
          if (!creationConfig.adapterConfig) {
            return left({
              code: 'MISSING_ADAPTER_CONFIG',
              message: 'SeiAgentKit adapter requires adapter configuration',
              timestamp: new Date(),
              agentId: 'factory'
            });
          }
          return right(new SeiAgentKitAdapter(
            creationConfig.config,
            creationConfig.adapterConfig as SAKIntegrationConfig
          ));
        
        case 'hiveIntelligence':
          if (!creationConfig.adapterConfig) {
            return left({
              code: 'MISSING_ADAPTER_CONFIG',
              message: 'HiveIntelligence adapter requires adapter configuration',
              timestamp: new Date(),
              agentId: 'factory'
            });
          }
          return right(new HiveIntelligenceAdapter(
            creationConfig.config,
            creationConfig.adapterConfig as HiveIntelligenceConfig
          ));
        
        case 'seiMCP':
          if (!creationConfig.adapterConfig) {
            return left({
              code: 'MISSING_ADAPTER_CONFIG',
              message: 'SeiMCP adapter requires adapter configuration',
              timestamp: new Date(),
              agentId: 'factory'
            });
          }
          return right(new SeiMCPAdapter(
            creationConfig.config,
            creationConfig.adapterConfig as MCPServerConfig
          ));
        
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
   * Create adapter agents with configurations
   */
  public static createAdapterSuite(
    adapterConfigs: AdapterAgentConfigs,
    baseConfig?: Partial<AgentConfig>
  ): Either<AgentError, BaseAgent[]> {
    const adapters: BaseAgent[] = [];
    const defaultConfig: AgentConfig = {
      id: 'default-adapter',
      name: 'Default Adapter Agent',
      version: '1.0.0',
      description: 'Default adapter agent',
      capabilities: [],
      settings: {},
      ...baseConfig
    };

    // Create SeiAgentKit adapter if enabled
    if (adapterConfigs.seiAgentKit?.enabled) {
      const sakConfig: AgentCreationConfig = {
        type: 'seiAgentKit',
        config: {
          ...defaultConfig,
          id: 'sei-agent-kit-adapter',
          name: 'Sei Agent Kit Adapter',
          description: 'Sei blockchain operations and protocol integrations',
          capabilities: ['blockchain', 'defi', 'trading', 'lending', 'liquidity'],
          ...adapterConfigs.seiAgentKit.agentConfig
        },
        adapterConfig: adapterConfigs.seiAgentKit.config
      };

      const sakResult = this.createAgent(sakConfig);
      if (sakResult._tag === 'Left') {
        return sakResult;
      }
      adapters.push(sakResult.right);
    }

    // Create HiveIntelligence adapter if enabled
    if (adapterConfigs.hiveIntelligence?.enabled) {
      const hiveConfig: AgentCreationConfig = {
        type: 'hiveIntelligence',
        config: {
          ...defaultConfig,
          id: 'hive-intelligence-adapter',
          name: 'Hive Intelligence Adapter',
          description: 'AI-powered blockchain analytics and insights',
          capabilities: ['analytics', 'search', 'insights', 'market-analysis'],
          ...adapterConfigs.hiveIntelligence.agentConfig
        },
        adapterConfig: adapterConfigs.hiveIntelligence.config
      };

      const hiveResult = this.createAgent(hiveConfig);
      if (hiveResult._tag === 'Left') {
        return hiveResult;
      }
      adapters.push(hiveResult.right);
    }

    // Create SeiMCP adapter if enabled
    if (adapterConfigs.seiMCP?.enabled) {
      const mcpConfig: AgentCreationConfig = {
        type: 'seiMCP',
        config: {
          ...defaultConfig,
          id: 'sei-mcp-adapter',
          name: 'Sei MCP Adapter',
          description: 'Real-time blockchain state and contract interactions',
          capabilities: ['realtime', 'blockchain', 'contract', 'monitoring'],
          ...adapterConfigs.seiMCP.agentConfig
        },
        adapterConfig: adapterConfigs.seiMCP.config
      };

      const mcpResult = this.createAgent(mcpConfig);
      if (mcpResult._tag === 'Left') {
        return mcpResult;
      }
      adapters.push(mcpResult.right);
    }

    return right(adapters);
  }

  /**
   * Create enhanced agent suite with adapters
   */
  public static createEnhancedAgentSuite(
    baseConfig?: Partial<AgentConfig>,
    adapterConfigs?: AdapterAgentConfigs
  ): Either<AgentError, { 
    baseAgents: BaseAgent[]; 
    adapters: BaseAgent[]; 
    combined: BaseAgent[]; 
  }> {
    // Create base agents
    const baseAgentsResult = this.createAgentSuite(baseConfig);
    if (baseAgentsResult._tag === 'Left') {
      return baseAgentsResult;
    }
    const baseAgents = baseAgentsResult.right;

    // Create adapters if configuration provided
    let adapters: BaseAgent[] = [];
    if (adapterConfigs) {
      const adaptersResult = this.createAdapterSuite(adapterConfigs, baseConfig);
      if (adaptersResult._tag === 'Left') {
        return adaptersResult;
      }
      adapters = adaptersResult.right;
    }

    return right({
      baseAgents,
      adapters,
      combined: [...baseAgents, ...adapters]
    });
  }

  /**
   * Create agents with adapter integration
   */
  public static createIntegratedAgents(
    agentConfigs: AgentCreationConfig[],
    adapterConfigs?: AdapterAgentConfigs
  ): Either<AgentError, BaseAgent[]> {
    const agents: BaseAgent[] = [];

    // Create specified agents
    for (const config of agentConfigs) {
      const agentResult = this.createAgent(config);
      if (agentResult._tag === 'Left') {
        return agentResult;
      }
      agents.push(agentResult.right);
    }

    // Add adapters if configuration provided
    if (adapterConfigs) {
      const adaptersResult = this.createAdapterSuite(adapterConfigs);
      if (adaptersResult._tag === 'Left') {
        return adaptersResult;
      }
      agents.push(...adaptersResult.right);
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

  /**
   * Get default adapter configurations
   */
  public static getDefaultAdapterConfigs(network: 'mainnet' | 'testnet' | 'devnet' = 'testnet'): AdapterAgentConfigs {
    return {
      seiAgentKit: {
        enabled: true,
        config: {
          seiRpcUrl: network === 'mainnet' ? 'https://rpc.sei.io' : 'https://rpc-testnet.sei.io',
          seiEvmRpcUrl: network === 'mainnet' ? 'https://evm-rpc.sei.io' : 'https://evm-rpc-testnet.sei.io',
          chainId: network === 'mainnet' ? 'pacific-1' : 'atlantic-2',
          network,
          defaultPermissions: ['read', 'write'],
          rateLimitConfig: {
            defaultMaxCalls: network === 'mainnet' ? 100 : 50,
            defaultWindowMs: 60000
          },
          cacheConfig: {
            enabled: true,
            ttlMs: network === 'mainnet' ? 30000 : 15000,
            maxSize: network === 'mainnet' ? 1000 : 500
          },
          retryConfig: {
            maxRetries: 3,
            backoffMs: 1000
          },
          protocolConfigs: {
            takara: {
              enabled: true,
              contractAddresses: {
                comptroller: '0x0000000000000000000000000000000000000000', // Replace with actual
                priceOracle: '0x0000000000000000000000000000000000000000'
              }
            },
            symphony: {
              enabled: true,
              contractAddresses: {
                router: '0x0000000000000000000000000000000000000000',
                quoter: '0x0000000000000000000000000000000000000000'
              }
            },
            dragonswap: {
              enabled: true,
              contractAddresses: {
                factory: '0x0000000000000000000000000000000000000000',
                router: '0x0000000000000000000000000000000000000000'
              }
            },
            silo: {
              enabled: true,
              contractAddresses: {
                staking: '0x0000000000000000000000000000000000000000'
              }
            }
          }
        },
        agentConfig: {
          capabilities: ['blockchain', 'defi', 'trading', 'lending', 'liquidity'],
          settings: {
            enableRealTimeUpdates: true,
            maxConcurrentOperations: 5,
            defaultGasMultiplier: 1.2
          }
        }
      },
      hiveIntelligence: {
        enabled: true,
        config: {
          baseUrl: 'https://api.hive.intelligence', // Replace with actual URL
          apiKey: process.env.HIVE_INTELLIGENCE_API_KEY || '',
          version: 'v1',
          rateLimitConfig: {
            maxRequests: 100,
            windowMs: 60000
          },
          cacheConfig: {
            enabled: true,
            ttlMs: 300000, // 5 minutes
            maxSize: 1000
          },
          retryConfig: {
            maxRetries: 3,
            backoffMs: 1000
          },
          creditConfig: {
            trackUsage: true,
            maxCreditsPerQuery: 100,
            alertThreshold: 80
          }
        },
        agentConfig: {
          capabilities: ['analytics', 'search', 'insights', 'market-analysis'],
          settings: {
            enableAdvancedAnalytics: true,
            maxResultsPerQuery: 50,
            confidenceThreshold: 0.7
          }
        }
      },
      seiMCP: {
        enabled: true,
        config: {
          endpoint: network === 'mainnet' ? 'wss://mcp.sei.io' : 'wss://mcp-testnet.sei.io',
          port: 443,
          secure: true,
          network,
          connectionTimeout: 30000,
          heartbeatInterval: 30000,
          retryAttempts: 3,
          retryDelay: 5000
        },
        agentConfig: {
          capabilities: ['realtime', 'blockchain', 'contract', 'monitoring'],
          settings: {
            enableRealTimeData: true,
            subscribeToBlocks: true,
            subscribeToTransactions: true,
            dragonBallMode: true
          }
        }
      }
    };
  }

  /**
   * Validate adapter configuration
   */
  public static validateAdapterConfig(
    type: 'seiAgentKit' | 'hiveIntelligence' | 'seiMCP',
    config: SAKIntegrationConfig | HiveIntelligenceConfig | MCPServerConfig
  ): Either<AgentError, void> {
    try {
      switch (type) {
        case 'seiAgentKit':
          const sakConfig = config as SAKIntegrationConfig;
          if (!sakConfig.seiRpcUrl || !sakConfig.seiEvmRpcUrl) {
            return left({
              code: 'INVALID_ADAPTER_CONFIG',
              message: 'SeiAgentKit requires both seiRpcUrl and seiEvmRpcUrl',
              timestamp: new Date(),
              agentId: 'factory'
            });
          }
          break;

        case 'hiveIntelligence':
          const hiveConfig = config as HiveIntelligenceConfig;
          if (!hiveConfig.baseUrl || !hiveConfig.apiKey) {
            return left({
              code: 'INVALID_ADAPTER_CONFIG',
              message: 'HiveIntelligence requires baseUrl and apiKey',
              timestamp: new Date(),
              agentId: 'factory'
            });
          }
          break;

        case 'seiMCP':
          const mcpConfig = config as MCPServerConfig;
          if (!mcpConfig.endpoint) {
            return left({
              code: 'INVALID_ADAPTER_CONFIG',
              message: 'SeiMCP requires endpoint configuration',
              timestamp: new Date(),
              agentId: 'factory'
            });
          }
          break;

        default:
          return left({
            code: 'UNKNOWN_ADAPTER_TYPE',
            message: `Unknown adapter type: ${type}`,
            timestamp: new Date(),
            agentId: 'factory'
          });
      }

      return right(undefined);
    } catch (error) {
      return left({
        code: 'ADAPTER_CONFIG_VALIDATION_FAILED',
        message: `Failed to validate adapter config: ${error}`,
        timestamp: new Date(),
        agentId: 'factory'
      });
    }
  }

  /**
   * Create a complete production environment setup
   */
  public static createProductionSuite(
    network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet',
    customConfigs?: {
      base?: Partial<AgentConfig>;
      adapters?: Partial<AdapterAgentConfigs>;
      apiKeys?: {
        hiveIntelligence?: string;
        takara?: string;
        symphony?: string;
      };
    }
  ): Either<AgentError, {
    agents: BaseAgent[];
    config: {
      base: AgentConfig;
      adapters: AdapterAgentConfigs;
    };
  }> {
    // Get default configurations
    const defaultAdapterConfigs = this.getDefaultAdapterConfigs(network);
    
    // Apply custom configurations
    const mergedAdapterConfigs: AdapterAgentConfigs = {
      ...defaultAdapterConfigs,
      ...customConfigs?.adapters
    };

    // Apply API keys
    if (customConfigs?.apiKeys?.hiveIntelligence && mergedAdapterConfigs.hiveIntelligence) {
      mergedAdapterConfigs.hiveIntelligence.config.apiKey = customConfigs.apiKeys.hiveIntelligence;
    }

    // Validate all adapter configurations
    for (const [type, config] of Object.entries(mergedAdapterConfigs)) {
      if (config?.enabled) {
        const validation = this.validateAdapterConfig(
          type as 'seiAgentKit' | 'hiveIntelligence' | 'seiMCP',
          config.config
        );
        if (validation._tag === 'Left') {
          return validation;
        }
      }
    }

    // Create the enhanced agent suite
    const baseConfig: AgentConfig = {
      id: 'production-suite',
      name: 'Production Agent Suite',
      version: '1.0.0',
      description: 'Complete DeFi agent suite with adapter integrations',
      capabilities: [],
      settings: {
        environment: 'production',
        network,
        enableMetrics: true,
        enableLogging: true
      },
      ...customConfigs?.base
    };

    const suiteResult = this.createEnhancedAgentSuite(baseConfig, mergedAdapterConfigs);
    if (suiteResult._tag === 'Left') {
      return suiteResult;
    }

    return right({
      agents: suiteResult.right.combined,
      config: {
        base: baseConfig,
        adapters: mergedAdapterConfigs
      }
    });
  }
}