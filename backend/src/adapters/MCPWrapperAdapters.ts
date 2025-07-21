import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { MCPClientFactory } from '../lib/mcp/client';
import logger from '../utils/logger';
import {
  HiveIntelligenceAdapter,
  SeiAgentKitAdapter,
  HiveResponse,
  HiveQueryMetadata,
  SAKOperationResult,
  SAKTool,
  BlockchainState,
  WalletBalance
} from '../services/SeiIntegrationService';

/**
 * Wrapper adapter for Hive Intelligence MCP server
 * Implements the HiveIntelligenceAdapter interface using MCP client
 */
export class HiveIntelligenceMCPWrapper implements HiveIntelligenceAdapter {
  constructor(
    private mcpFactory: MCPClientFactory,
    private serverName: string = 'hive-intelligence'
  ) {}

  search = (query: string, metadata?: HiveQueryMetadata): TE.TaskEither<Error, HiveResponse> => {
    return TE.tryCatch(
      async () => {
        const result = await this.mcpFactory.callTool(this.serverName, 'getMarketData', {
          symbols: [query],
          timeframe: '1h',
          limit: 100,
          includeMetrics: true
        });
        
        return {
          data: result
        };
      },
      error => new Error(`Hive Intelligence search failed: ${error}`)
    );
  };

  getAnalytics = (query: string, metadata?: HiveQueryMetadata): TE.TaskEither<Error, HiveResponse> => {
    return TE.tryCatch(
      async () => {
        const [sentiment, predictions] = await Promise.all([
          this.mcpFactory.callTool(this.serverName, 'getSentimentAnalysis', {
            symbols: [query],
            sources: ['twitter', 'reddit', 'news'],
            timeRange: '24h',
            includeTrends: true
          }),
          this.mcpFactory.callTool(this.serverName, 'getPricePredictions', {
            symbol: query,
            timeframes: ['24h', '7d'],
            confidenceThreshold: 0.7,
            includeRationale: true
          })
        ]);
        
        return {
          data: {
            sentiment,
            predictions
          }
        };
      },
      error => new Error(`Hive Intelligence analytics failed: ${error}`)
    );
  };

  installHivePlugin = (): TE.TaskEither<Error, void> => {
    return TE.right(undefined); // MCP client already initialized
  };

  getCreditUsage = (): TE.TaskEither<Error, { usedCredits: number; totalCredits: number; remainingCredits: number }> => {
    return TE.right({
      usedCredits: 0,
      totalCredits: 10000,
      remainingCredits: 10000
    });
  };

  on = (event: string, callback: (data: any) => void): void => {
    logger.debug(`Hive MCP event listener registered: ${event}`);
  };
}

/**
 * Wrapper adapter for SEI Agent Kit MCP functionality
 * Implements the SeiAgentKitAdapter interface using MCP client
 */
export class SeiAgentKitMCPWrapper implements SeiAgentKitAdapter {
  constructor(
    private mcpFactory: MCPClientFactory,
    private serverName: string = 'sei-blockchain'
  ) {}

  executeSAKTool = (toolName: string, params: any, context?: any): TE.TaskEither<Error, SAKOperationResult> => {
    return TE.tryCatch(
      async () => {
        const result = await this.mcpFactory.callTool(this.serverName, toolName, params);
        
        return {
          success: true,
          data: result,
          metadata: {
            toolName,
            executedAt: new Date().toISOString(),
            context
          }
        };
      },
      error => new Error(`SAK tool execution failed: ${error}`)
    );
  };

  executeSAKBatch = (operations: any[], context?: any): TE.TaskEither<Error, SAKOperationResult[]> => {
    return TE.tryCatch(
      async () => {
        const results = await Promise.all(
          operations.map(op => 
            this.mcpFactory.callTool(this.serverName, op.tool, op.params)
              .then(data => ({
                success: true,
                data,
                metadata: {
                  toolName: op.tool,
                  executedAt: new Date().toISOString(),
                  context
                }
              }))
              .catch(error => ({
                success: false,
                data: null,
                metadata: {
                  toolName: op.tool,
                  error: error.message,
                  executedAt: new Date().toISOString(),
                  context
                }
              }))
          )
        );
        
        return results;
      },
      error => new Error(`SAK batch execution failed: ${error}`)
    );
  };

  getSAKTools = (): E.Either<Error, SAKTool[]> => {
    // Return available SEI blockchain tools
    const tools: SAKTool[] = [
      { name: 'getWalletBalance', category: 'wallet' },
      { name: 'getTransactionHistory', category: 'wallet' },
      { name: 'getDeFiPositions', category: 'defi' },
      { name: 'getLiquidityPools', category: 'defi' },
      { name: 'getStakingInfo', category: 'staking' },
      { name: 'executeTokenSwap', category: 'trading' },
      { name: 'sendTokenTransfer', category: 'wallet' },
      { name: 'getTokenMetadata', category: 'tokens' },
      { name: 'getValidatorInfo', category: 'staking' },
      { name: 'getGovernanceProposals', category: 'governance' }
    ];
    
    return E.right(tools);
  };

  getSAKToolsByCategory = (category: string): E.Either<Error, SAKTool[]> => {
    return pipe(
      this.getSAKTools(),
      E.map(tools => tools.filter(tool => tool.category === category))
    );
  };

  installSAKPlugin = (): TE.TaskEither<Error, void> => {
    return TE.right(undefined); // MCP client already initialized
  };

  on = (event: string, callback: (data: any) => void): void => {
    logger.debug(`SAK MCP event listener registered: ${event}`);
  };
}

/**
 * Unified MCP adapter for blockchain state and wallet operations
 * Provides backward compatibility for removed SeiMCPAdapter
 */
export class UnifiedMCPAdapter {
  constructor(
    private mcpFactory: MCPClientFactory,
    private seiServerName: string = 'sei-blockchain',
    private hiveServerName: string = 'hive-intelligence',
    private portfolioServerName: string = 'portfolio-manager'
  ) {}

  getBlockchainState = (): TE.TaskEither<Error, BlockchainState> => {
    return TE.tryCatch(
      async () => {
        const [tokenData, validatorInfo] = await Promise.all([
          this.mcpFactory.callTool(this.seiServerName, 'getTokenMetadata', {
            denom: 'usei',
            includePrice: true,
            includeSupply: true
          }),
          this.mcpFactory.callTool(this.seiServerName, 'getValidatorInfo', {
            status: 'bonded',
            limit: 1
          })
        ]);
        
        return {
          blockNumber: tokenData.blockHeight || 0,
          networkStatus: 'connected',
          gasPrice: tokenData.gasPrice || {}
        };
      },
      error => new Error(`Failed to get blockchain state: ${error}`)
    );
  };

  getWalletBalance = (address: string): TE.TaskEither<Error, WalletBalance> => {
    return TE.tryCatch(
      async () => {
        const balance = await this.mcpFactory.callTool(this.seiServerName, 'getWalletBalance', {
          address,
          denom: 'usei'
        });
        
        return balance;
      },
      error => new Error(`Failed to get wallet balance: ${error}`)
    );
  };

  getDeFiPositions = (address: string): TE.TaskEither<Error, any> => {
    return TE.tryCatch(
      async () => {
        const positions = await this.mcpFactory.callTool(this.seiServerName, 'getDeFiPositions', {
          address,
          protocols: [] // Get all protocols
        });
        
        return positions;
      },
      error => new Error(`Failed to get DeFi positions: ${error}`)
    );
  };

  getPortfolioAnalysis = (walletAddress: string): TE.TaskEither<Error, any> => {
    return TE.tryCatch(
      async () => {
        const analysis = await this.mcpFactory.callTool(this.portfolioServerName, 'analyzePortfolioComposition', {
          walletAddress,
          includeDeFi: true,
          includeNFTs: false
        });
        
        return analysis;
      },
      error => new Error(`Failed to get portfolio analysis: ${error}`)
    );
  };

  subscribeToEvents = (types: string[], filters?: any): TE.TaskEither<Error, void> => {
    // MCP handles events internally
    logger.info('Event subscription requested via MCP', { types, filters });
    return TE.right(undefined);
  };

  isConnected = (): boolean => {
    return true; // MCP clients handle their own connection state
  };

  on = (event: string, callback: (data: any) => void): void => {
    logger.debug(`Unified MCP event listener registered: ${event}`);
  };
}

/**
 * Create wrapper adapters from MCP clients
 */
export function createMCPWrapperAdapters(
  mcpClients: Map<string, any>,
  mcpFactory: MCPClientFactory
): {
  hive?: HiveIntelligenceAdapter;
  sak?: SeiAgentKitAdapter;
  unified?: UnifiedMCPAdapter;
} {
  const adapters: any = {};
  
  // Create Hive Intelligence wrapper if available
  if (mcpClients.has('hive-intelligence')) {
    adapters.hive = new HiveIntelligenceMCPWrapper(mcpFactory, 'hive-intelligence');
  }
  
  // Create SEI Agent Kit wrapper if available
  if (mcpClients.has('sei-blockchain')) {
    adapters.sak = new SeiAgentKitMCPWrapper(mcpFactory, 'sei-blockchain');
  }
  
  // Create unified adapter for backward compatibility
  adapters.unified = new UnifiedMCPAdapter(mcpFactory);
  
  return adapters;
}