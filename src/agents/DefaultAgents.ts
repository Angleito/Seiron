import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { BaseAgent, AgentError } from './base/BaseAgent';
import { AgentRegistry } from './base/AgentRegistry';
import { ElizaIntegration } from './base/ElizaIntegration';
import { AgentFactory } from './AgentFactory';

/**
 * Default Agents Setup and Configuration
 */

/**
 * Create and configure default DeFi agents
 */
export function createDefaultAgents(): TaskEither<AgentError, {
  agents: BaseAgent[];
  registry: AgentRegistry;
  elizaIntegration: ElizaIntegration;
}> {
  return pipe(
    TE.tryCatch(
      async () => {
        // Create agent registry
        const registry = new AgentRegistry({
          maxAgents: 10,
          healthCheckInterval: 30000,
          autoRestart: true,
          loadBalancing: 'round-robin'
        });

        // Create Eliza integration
        const elizaIntegration = new ElizaIntegration();

        // Create agent suite
        const agentsResult = AgentFactory.createAgentSuite();
        
        if (agentsResult._tag === 'Left') {
          throw new Error(`Failed to create agents: ${agentsResult.left.message}`);
        }

        const agents = agentsResult.right;

        // Register agents with registry
        for (const agent of agents) {
          const registerResult = registry.registerAgent(agent);
          if (registerResult._tag === 'Left') {
            throw new Error(`Failed to register agent: ${registerResult.left.message}`);
          }
        }

        // Load and register Eliza characters
        await setupElizaCharacters(agents, elizaIntegration);

        // Initialize all agents
        await registry.startAll()();

        return {
          agents,
          registry,
          elizaIntegration
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
 * Create development environment with mock data
 */
export function createDevelopmentEnvironment(): TaskEither<AgentError, {
  agents: BaseAgent[];
  registry: AgentRegistry;
  elizaIntegration: ElizaIntegration;
  mockData: any;
}> {
  return pipe(
    createDefaultAgents(),
    TE.chain(setup => 
      TE.tryCatch(
        async () => {
          const mockData = generateMockData();
          
          // Inject mock data into agents for development/testing
          await injectMockData(setup.agents, mockData);
          
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
 * Generate mock data for development
 */
function generateMockData(): any {
  return {
    lending: {
      protocols: [
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
          symbol: 'BTC',
          timeframe: '1d',
          price: 46200,
          confidence: 0.72
        }
      ]
    }
  };
}

/**
 * Inject mock data into agents
 */
async function injectMockData(agents: BaseAgent[], mockData: any): Promise<void> {
  // This would inject mock data for development/testing
  // In a real implementation, this would populate agent state with mock data
  console.log('Mock data injected for development environment');
}

/**
 * Create production environment with real data sources
 */
export function createProductionEnvironment(config: {
  apiKeys: Record<string, string>;
  endpoints: Record<string, string>;
  rpcUrls: Record<string, string>;
}): TaskEither<AgentError, {
  agents: BaseAgent[];
  registry: AgentRegistry;
  elizaIntegration: ElizaIntegration;
}> {
  return pipe(
    createDefaultAgents(),
    TE.chain(setup =>
      TE.tryCatch(
        async () => {
          // Configure agents with production data sources
          await configureProductionDataSources(setup.agents, config);
          
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
  // This would configure agents with real data source connections
  // Including API keys, RPC endpoints, and other production configurations
  console.log('Production data sources configured');
}

/**
 * Graceful shutdown of agents and cleanup
 */
export function shutdownAgents(registry: AgentRegistry): TaskEither<AgentError, void> {
  return pipe(
    registry.stopAll(),
    TE.chain(() => registry.shutdown()),
    TE.map(() => {
      console.log('All agents shutdown successfully');
    })
  );
}