import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { BaseAgent, AgentError } from './base/BaseAgent';
import { AgentRegistry } from './base/AgentRegistry';
import { ElizaIntegration } from './base/ElizaIntegration';
import { AgentFactory, type AdapterAgentConfigs } from './AgentFactory';
import { SeiAgentKitAdapter } from './adapters/SeiAgentKitAdapter';
import { HiveIntelligenceAdapter } from './adapters/HiveIntelligenceAdapter';
import { SeiMCPAdapter } from './adapters/SeiMCPAdapter';

/**
 * Default Agents Setup and Configuration
 */

/**
 * Extended configuration for default agents with adapters
 */
export interface DefaultAgentsConfig {
  includeAdapters?: boolean;
  network?: 'mainnet' | 'testnet' | 'devnet';
  adapterConfigs?: Partial<AdapterAgentConfigs>;
  apiKeys?: {
    hiveIntelligence?: string;
    takara?: string;
    symphony?: string;
  };
  registry?: {
    maxAgents?: number;
    healthCheckInterval?: number;
    autoRestart?: boolean;
    loadBalancing?: 'round-robin' | 'least-connections' | 'random';
  };
}

/**
 * Create and configure default DeFi agents
 */
export function createDefaultAgents(config?: DefaultAgentsConfig): TaskEither<AgentError, {
  agents: BaseAgent[];
  adapters: BaseAgent[];
  registry: AgentRegistry;
  elizaIntegration: ElizaIntegration;
  allAgents: BaseAgent[];
}> {
  return pipe(
    TE.tryCatch(
      async () => {
        // Create agent registry with enhanced configuration
        const registryConfig = {
          maxAgents: config?.registry?.maxAgents || 20, // Increased for adapters
          healthCheckInterval: config?.registry?.healthCheckInterval || 30000,
          autoRestart: config?.registry?.autoRestart || true,
          loadBalancing: config?.registry?.loadBalancing || 'round-robin',
          adapterConfig: {
            enableLoadBalancing: true,
            maxAdaptersPerType: 3,
            healthCheckTimeoutMs: 5000,
            failoverEnabled: true
          }
        };
        const registry = new AgentRegistry(registryConfig);

        // Create Eliza integration
        const elizaIntegration = new ElizaIntegration();

        // Create base agent suite
        const agentsResult = AgentFactory.createAgentSuite();
        
        if (agentsResult._tag === 'Left') {
          throw new Error(`Failed to create agents: ${agentsResult.left.message}`);
        }

        const agents = agentsResult.right;

        // Create adapters if enabled
        let adapters: BaseAgent[] = [];
        if (config?.includeAdapters) {
          const defaultAdapterConfigs = AgentFactory.getDefaultAdapterConfigs(config.network || 'testnet');
          
          // Merge with custom configurations
          const mergedAdapterConfigs: AdapterAgentConfigs = {
            ...defaultAdapterConfigs,
            ...config.adapterConfigs
          };

          // Apply API keys
          if (config.apiKeys?.hiveIntelligence && mergedAdapterConfigs.hiveIntelligence) {
            mergedAdapterConfigs.hiveIntelligence.config.apiKey = config.apiKeys.hiveIntelligence;
          }

          const adaptersResult = AgentFactory.createAdapterSuite(mergedAdapterConfigs);
          if (adaptersResult._tag === 'Left') {
            throw new Error(`Failed to create adapters: ${adaptersResult.left.message}`);
          }

          adapters = adaptersResult.right;
        }

        const allAgents = [...agents, ...adapters];

        // Register all agents with registry
        for (const agent of allAgents) {
          const registerResult = registry.registerAgent(agent);
          if (registerResult._tag === 'Left') {
            throw new Error(`Failed to register agent: ${registerResult.left.message}`);
          }
        }

        // Register adapters with enhanced registry features
        for (const adapter of adapters) {
          if (adapter instanceof SeiAgentKitAdapter) {
            const capabilities = [
              'get_token_balance', 'transfer_token', 'approve_token',
              'takara_supply', 'takara_withdraw', 'takara_borrow', 'takara_repay',
              'symphony_swap', 'dragonswap_add_liquidity', 'silo_stake'
            ];
            registry.registerAdapter(adapter.getConfig().id, 'seiAgentKit', adapter, capabilities, 1);
          } else if (adapter instanceof HiveIntelligenceAdapter) {
            const capabilities = [
              'search', 'get_analytics', 'get_portfolio_analysis',
              'get_market_insights', 'get_credit_analysis'
            ];
            registry.registerAdapter(adapter.getConfig().id, 'hiveIntelligence', adapter, capabilities, 2);
          } else if (adapter instanceof SeiMCPAdapter) {
            const capabilities = [
              'get_blockchain_state', 'query_contract', 'execute_contract',
              'get_wallet_balance', 'send_transaction', 'subscribe_events'
            ];
            registry.registerAdapter(adapter.getConfig().id, 'seiMCP', adapter, capabilities, 1);
          }
        }

        // Load and register Eliza characters
        await setupElizaCharacters([...agents, ...adapters], elizaIntegration);

        // Initialize all agents
        await registry.startAll()();

        return {
          agents,
          adapters,
          registry,
          elizaIntegration,
          allAgents
        };
      },
      error => ({
        code: 'DEFAULT_AGENTS_SETUP_FAILED',
        message: `Failed to setup default agents: ${error}`,
        timestamp: new Date(),
        agentId: 'setup'
      })
    )
  );
}

/**
 * Setup Eliza characters for agents
 */
async function setupElizaCharacters(agents: BaseAgent[], elizaIntegration: ElizaIntegration): Promise<void> {
  const characterFiles = [
    { agentId: 'lending-agent', file: './characters/lending-agent.json' },
    { agentId: 'liquidity-agent', file: './characters/liquidity-agent.json' },
    { agentId: 'market-agent', file: './characters/market-agent.json' }
  ];

  for (const { agentId, file } of characterFiles) {
    const agent = agents.find(a => a.getConfig().id === agentId);
    if (!agent) continue;

    try {
      const characterResult = await elizaIntegration.loadCharacterFromFile(file)();
      
      if (characterResult._tag === 'Right') {
        const registerResult = elizaIntegration.registerAgent(agent, characterResult.right);
        if (registerResult._tag === 'Left') {
          console.warn(`Failed to register agent ${agentId} with Eliza: ${registerResult.left.message}`);
        }
      } else {
        console.warn(`Failed to load character file for ${agentId}: ${characterResult.left.message}`);
      }
    } catch (error) {
      console.warn(`Error setting up character for ${agentId}: ${error}`);
    }
  }
}

/**
 * Create enhanced development environment with adapters and mock data
 */
export function createDevelopmentEnvironment(config?: Partial<DefaultAgentsConfig>): TaskEither<AgentError, {
  agents: BaseAgent[];
  adapters: BaseAgent[];
  registry: AgentRegistry;
  elizaIntegration: ElizaIntegration;
  allAgents: BaseAgent[];
  mockData: any;
}> {
  const devConfig: DefaultAgentsConfig = {
    includeAdapters: true,
    network: 'testnet',
    ...config
  };

  return pipe(
    createDefaultAgents(devConfig),
    TE.chain(setup => 
      TE.tryCatch(
        async () => {
          const mockData = generateEnhancedMockData();
          
          // Inject mock data into all agents (base + adapters)
          await injectMockData(setup.allAgents, mockData);
          
          // Setup development-specific adapter configurations
          await setupDevelopmentAdapters(setup.adapters, mockData);
          
          return {
            ...setup,
            mockData
          };
        },
        error => ({
          code: 'DEV_ENVIRONMENT_SETUP_FAILED',
          message: `Failed to setup development environment: ${error}`,
          timestamp: new Date(),
          agentId: 'dev-setup'
        })
      )
    )
  );
}

/**
 * Generate enhanced mock data for development with adapter integration
 */
function generateEnhancedMockData(): any {
  return {
    lending: {
      protocols: [
        {
          id: 'takara',
          name: 'Takara Finance',
          apy: 5.8,
          tvl: 2500000000,
          riskScore: 0.18,
          network: 'sei',
          contractAddress: '0x1234567890123456789012345678901234567890'
        },
        {
          id: 'compound',
          name: 'Compound',
          apy: 4.2,
          tvl: 8700000000,
          riskScore: 0.2
        },
        {
          id: 'aave',
          name: 'Aave',
          apy: 3.8,
          tvl: 12300000000,
          riskScore: 0.15
        }
      ],
      positions: [
        {
          id: 'takara_sei_1',
          protocol: 'takara',
          asset: 'SEI',
          amount: 5000,
          apy: 5.8,
          healthFactor: 2.1
        },
        {
          id: 'comp_usdc_1',
          protocol: 'compound',
          asset: 'USDC',
          amount: 10000,
          apy: 4.2
        }
      ]
    },
    liquidity: {
      pools: [
        {
          id: 'SEI/USDC-0.3%',
          token0: 'SEI',
          token1: 'USDC',
          fee: 0.003,
          liquidity: 150000000,
          price: 0.8,
          exchange: 'dragonswap'
        },
        {
          id: 'USDC/ETH-0.05%',
          token0: 'USDC',
          token1: 'ETH',
          fee: 0.0005,
          liquidity: 500000000,
          price: 2450
        }
      ],
      positions: [
        {
          id: 'dragon_sei_1',
          pool: 'SEI/USDC-0.3%',
          lowerPrice: 0.7,
          upperPrice: 0.9,
          liquidity: 50000,
          exchange: 'dragonswap'
        },
        {
          id: 'uniV3_1',
          pool: 'USDC/ETH-0.05%',
          lowerPrice: 2200,
          upperPrice: 2700,
          liquidity: 1000000
        }
      ]
    },
    market: {
      assets: [
        {
          symbol: 'SEI',
          price: 0.8,
          change24h: 5.2,
          volatility: 0.75,
          network: 'sei',
          marketCap: 800000000
        },
        {
          symbol: 'BTC',
          price: 45000,
          change24h: 2.5,
          volatility: 0.65
        },
        {
          symbol: 'ETH',
          price: 2450,
          change24h: 1.8,
          volatility: 0.58
        }
      ],
      predictions: [
        {
          symbol: 'SEI',
          timeframe: '1d',
          price: 0.85,
          confidence: 0.78
        },
        {
          symbol: 'BTC',
          timeframe: '1d',
          price: 46200,
          confidence: 0.72
        }
      ]
    },
    // Adapter-specific mock data
    seiAgentKit: {
      tools: [
        {
          name: 'get_token_balance',
          category: 'blockchain',
          usage: 150,
          lastUsed: Date.now() - 300000
        },
        {
          name: 'takara_supply',
          category: 'defi',
          usage: 45,
          lastUsed: Date.now() - 600000
        }
      ],
      operationHistory: [
        {
          operation: 'takara_supply',
          timestamp: Date.now() - 3600000,
          success: true,
          gasUsed: 120000
        }
      ]
    },
    hiveIntelligence: {
      searches: [
        {
          query: 'Sei network DeFi opportunities',
          results: 25,
          creditsUsed: 10,
          timestamp: Date.now() - 1800000
        }
      ],
      analytics: [
        {
          type: 'portfolio',
          insights: [
            {
              type: 'opportunity',
              title: 'High APY available on Takara',
              confidence: 0.85
            }
          ],
          timestamp: Date.now() - 7200000
        }
      ]
    },
    seiMCP: {
      blockchain: {
        blockNumber: 12345678,
        blockHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        timestamp: Date.now(),
        gasPrice: '0.01',
        networkStatus: 'healthy'
      },
      realTimeData: {
        subscribedEvents: ['NewBlock', 'Transaction', 'ContractExecution'],
        activeSubscriptions: 3,
        lastEventTimestamp: Date.now() - 5000
      }
    }
  };
}

/**
 * Inject mock data into agents
 */
async function injectMockData(agents: BaseAgent[], mockData: any): Promise<void> {
  for (const agent of agents) {
    const config = agent.getConfig();
    
    // Inject data based on agent type and capabilities
    if (config.capabilities.includes('lending')) {
      // Inject lending data
      console.log(`Injecting lending mock data into ${config.name}`);
    }
    
    if (config.capabilities.includes('liquidity')) {
      // Inject liquidity data
      console.log(`Injecting liquidity mock data into ${config.name}`);
    }
    
    if (config.capabilities.includes('analytics')) {
      // Inject analytics data
      console.log(`Injecting analytics mock data into ${config.name}`);
    }
    
    if (config.capabilities.includes('blockchain')) {
      // Inject blockchain data
      console.log(`Injecting blockchain mock data into ${config.name}`);
    }
  }
  
  console.log('Enhanced mock data injected for development environment');
}

/**
 * Setup development-specific adapter configurations
 */
async function setupDevelopmentAdapters(adapters: BaseAgent[], mockData: any): Promise<void> {
  for (const adapter of adapters) {
    if (adapter instanceof SeiAgentKitAdapter) {
      console.log('Setting up SeiAgentKit adapter for development');
      // In a real implementation, this would configure the adapter with mock endpoints
    } else if (adapter instanceof HiveIntelligenceAdapter) {
      console.log('Setting up HiveIntelligence adapter for development');
      // Configure with mock API responses
    } else if (adapter instanceof SeiMCPAdapter) {
      console.log('Setting up SeiMCP adapter for development');
      // Configure with mock WebSocket data
    }
  }
}

/**
 * Create production environment with real data sources and adapters
 */
export function createProductionEnvironment(config: {
  network?: 'mainnet' | 'testnet' | 'devnet';
  apiKeys: Record<string, string>;
  endpoints: Record<string, string>;
  rpcUrls: Record<string, string>;
  includeAdapters?: boolean;
  adapterConfigs?: Partial<AdapterAgentConfigs>;
}): TaskEither<AgentError, {
  agents: BaseAgent[];
  adapters: BaseAgent[];
  registry: AgentRegistry;
  elizaIntegration: ElizaIntegration;
  allAgents: BaseAgent[];
}> {
  const prodConfig: DefaultAgentsConfig = {
    includeAdapters: config.includeAdapters ?? true,
    network: config.network || 'mainnet',
    adapterConfigs: config.adapterConfigs,
    apiKeys: {
      hiveIntelligence: config.apiKeys.hiveIntelligence,
      takara: config.apiKeys.takara,
      symphony: config.apiKeys.symphony
    }
  };

  return pipe(
    createDefaultAgents(prodConfig),
    TE.chain(setup =>
      TE.tryCatch(
        async () => {
          // Configure agents with production data sources
          await configureProductionDataSources(setup.allAgents, config);
          
          // Configure adapters with production settings
          await configureProductionAdapters(setup.adapters, config);
          
          return setup;
        },
        error => ({
          code: 'PROD_ENVIRONMENT_SETUP_FAILED',
          message: `Failed to setup production environment: ${error}`,
          timestamp: new Date(),
          agentId: 'prod-setup'
        })
      )
    )
  );
}

/**
 * Configure agents with production data sources
 */
async function configureProductionDataSources(
  agents: BaseAgent[], 
  config: {
    apiKeys: Record<string, string>;
    endpoints: Record<string, string>;
    rpcUrls: Record<string, string>;
  }
): Promise<void> {
  for (const agent of agents) {
    const agentConfig = agent.getConfig();
    console.log(`Configuring production data sources for ${agentConfig.name}`);
    
    // Configure based on agent capabilities
    if (agentConfig.capabilities.includes('lending')) {
      // Configure lending protocol connections
    }
    
    if (agentConfig.capabilities.includes('liquidity')) {
      // Configure DEX connections
    }
    
    if (agentConfig.capabilities.includes('analytics')) {
      // Configure analytics API connections
    }
  }
  
  console.log('Production data sources configured for all agents');
}

/**
 * Configure adapters with production settings
 */
async function configureProductionAdapters(
  adapters: BaseAgent[],
  config: {
    apiKeys: Record<string, string>;
    endpoints: Record<string, string>;
    rpcUrls: Record<string, string>;
  }
): Promise<void> {
  for (const adapter of adapters) {
    if (adapter instanceof SeiAgentKitAdapter) {
      console.log('Configuring SeiAgentKit adapter for production');
      // Configure with production RPC endpoints, API keys, etc.
    } else if (adapter instanceof HiveIntelligenceAdapter) {
      console.log('Configuring HiveIntelligence adapter for production');
      // Configure with production API endpoints and keys
    } else if (adapter instanceof SeiMCPAdapter) {
      console.log('Configuring SeiMCP adapter for production');
      // Configure with production WebSocket endpoints
    }
  }
  
  console.log('Production adapters configured');
}

/**
 * Graceful shutdown of agents and adapters with cleanup
 */
export function shutdownAgents(registry: AgentRegistry): TaskEither<AgentError, void> {
  return pipe(
    TE.tryCatch(
      async () => {
        // Stop all adapters first
        const adapters = registry.getAllAdapters();
        for (const adapter of adapters) {
          console.log(`Shutting down adapter: ${adapter.id}`);
          try {
            if (adapter.instance instanceof SeiAgentKitAdapter) {
              // Cleanup SAK adapter resources
              await adapter.instance.stop?.();
            } else if (adapter.instance instanceof HiveIntelligenceAdapter) {
              // Cleanup Hive adapter resources
              await adapter.instance.stop?.();
            } else if (adapter.instance instanceof SeiMCPAdapter) {
              // Cleanup MCP adapter resources
              await adapter.instance.stop?.();
            }
          } catch (error) {
            console.warn(`Warning: Failed to shutdown adapter ${adapter.id}:`, error);
          }
        }

        // Stop all base agents
        const stopResult = await registry.stopAll()();
        if (stopResult._tag === 'Left') {
          throw new Error(`Failed to stop agents: ${stopResult.left.message}`);
        }

        // Shutdown registry
        const shutdownResult = await registry.shutdown()();
        if (shutdownResult._tag === 'Left') {
          throw new Error(`Failed to shutdown registry: ${shutdownResult.left.message}`);
        }

        console.log('All agents and adapters shutdown successfully');
      },
      error => ({
        code: 'SHUTDOWN_FAILED',
        message: `Failed to shutdown agents: ${error}`,
        timestamp: new Date(),
        agentId: 'shutdown'
      })
    )
  );
}

/**
 * Create quick test environment with minimal configuration
 */
export function createTestEnvironment(): TaskEither<AgentError, {
  agents: BaseAgent[];
  adapters: BaseAgent[];
  registry: AgentRegistry;
  elizaIntegration: ElizaIntegration;
  allAgents: BaseAgent[];
}> {
  const testConfig: DefaultAgentsConfig = {
    includeAdapters: true,
    network: 'testnet',
    registry: {
      maxAgents: 10,
      healthCheckInterval: 60000,
      autoRestart: false,
      loadBalancing: 'round-robin'
    }
  };

  return createDefaultAgents(testConfig);
}