import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { HiveIntelligenceAdapter } from '../adapters/HiveIntelligenceAdapter';
import { SeiAgentKitAdapter } from '../adapters/SeiAgentKitAdapter';
import { SeiIntegrationService } from './SeiIntegrationService';
import { AIService } from './AIService';
import logger from '../utils/logger';

// MCP Client imports
import { MCPClientFactory, MCPConnectionManager, initializeMCPConnectionManager } from '../lib/mcp/client';
import { HiveIntelligenceMCPConfig } from '../config/mcp/hive-intelligence';
import { seiBlockchainMCPConfig } from '../config/mcp/sei-blockchain';
import { portfolioManagerConfig } from '../config/mcp/portfolio-manager';
import { createMCPWrapperAdapters, UnifiedMCPAdapter } from '../adapters/MCPWrapperAdapters';

/**
 * AdapterInitializer - Handles initialization of real AI adapters
 * 
 * This service initializes and configures the real implementations of:
 * - HiveIntelligenceAdapter (AI search and analytics)
 * - SeiAgentKitAdapter (protocol interactions)
 * - SeiMCPAdapter (real-time blockchain data)
 */
export class AdapterInitializer {
  private hiveAdapter?: HiveIntelligenceAdapter;
  private sakAdapter?: SeiAgentKitAdapter;
  private mcpConnectionManager?: MCPConnectionManager;
  private mcpClients: Map<string, any> = new Map();

  constructor(private config: {
    hive: {
      enabled: boolean;
      openaiApiKey: string;
      baseUrl?: string;
      maxRequestsPerMinute?: number;
      cacheEnabled?: boolean;
      cacheTTL?: number;
    };
    sak: {
      enabled: boolean;
      seiRpcUrl: string;
      seiEvmRpcUrl: string;
      privateKey?: string;
      mnemonic?: string;
      chainId: string;
      network: 'mainnet' | 'testnet' | 'devnet';
      maxRequestsPerMinute?: number;
    };
    mcp: {
      enabled: boolean;
      endpoint: string;
      port: number;
      secure: boolean;
      apiKey?: string;
      network: 'mainnet' | 'testnet' | 'devnet';
      connectionTimeout?: number;
      heartbeatInterval?: number;
      maxReconnectAttempts?: number;
    };
  }) {}

  /**
   * Initialize all enabled adapters
   */
  public initializeAdapters = (): TE.TaskEither<Error, {
    hive?: HiveIntelligenceAdapter;
    sak?: SeiAgentKitAdapter;
    mcpClients?: Map<string, any>;
  }> => {
    logger.info('Initializing AI adapters', {
      hiveEnabled: this.config.hive.enabled,
      sakEnabled: this.config.sak.enabled,
      mcpEnabled: this.config.mcp.enabled
    });

    return pipe(
      TE.Do,
      TE.bind('hive', () => this.initializeHiveAdapter()),
      TE.bind('sak', () => this.initializeSAKAdapter()),
      TE.bind('mcp', () => this.initializeMCPClients()),
      TE.map(({ hive, sak, mcp }) => {
        const adapters: {
          hive?: HiveIntelligenceAdapter;
          sak?: SeiAgentKitAdapter;
          mcpClients?: Map<string, any>;
        } = {};
        if (hive) adapters.hive = hive;
        if (sak) adapters.sak = sak;
        if (mcp) adapters.mcpClients = mcp;

        logger.info('AI adapters initialized successfully', {
          hiveInitialized: !!hive,
          sakInitialized: !!sak,
          mcpInitialized: !!mcp && mcp.size > 0,
          mcpServersConnected: mcp ? Array.from(mcp.keys()) : []
        });

        return adapters;
      })
    );
  };

  /**
   * Register adapters with services
   */
  public registerAdapters = (
    seiIntegrationService: SeiIntegrationService,
    aiService: AIService
  ): TE.TaskEither<Error, void> => {
    return pipe(
      this.initializeAdapters(),
      TE.chain(adapters => {
        // Create MCP wrapper adapters for backward compatibility
        const mcpWrappers = this.createMCPWrapperAdapters(adapters.mcpClients);
        
        // Register traditional adapters with SeiIntegrationService
        seiIntegrationService.registerAdapters({
          hive: adapters.hive || mcpWrappers.hive,
          sak: adapters.sak || mcpWrappers.sak
        });
        
        // Register MCP clients separately if available
        if (adapters.mcpClients && this.mcpConnectionManager) {
          const factory = this.mcpConnectionManager.getFactory();
          seiIntegrationService.registerMCPClients({
            hiveIntelligence: factory,
            seiBlockchain: factory,
            portfolioManager: factory
          });
        }

        // Register with AIService - cast to any to avoid interface mismatch
        aiService.initializeAdapters(
          adapters.hive || mcpWrappers.hive as any,
          adapters.sak || mcpWrappers.sak as any,
          this.createMCPWrapper(adapters.mcpClients) as any
        );

        logger.info('Adapters registered with services', {
          registeredCount: Object.keys(adapters).length,
          mcpServersRegistered: adapters.mcpClients ? adapters.mcpClients.size : 0,
          mcpWrappersCreated: Object.keys(mcpWrappers).length
        });

        return TE.right(undefined);
      })
    );
  };

  /**
   * Initialize Hive Intelligence Adapter
   */
  private initializeHiveAdapter = (): TE.TaskEither<Error, HiveIntelligenceAdapter | undefined> => {
    if (!this.config.hive.enabled) {
      logger.info('Hive Intelligence adapter disabled');
      return TE.right(undefined);
    }

    if (!this.config.hive.openaiApiKey) {
      logger.error('OpenAI API key not provided for Hive Intelligence adapter');
      return TE.left(new Error('OpenAI API key required for Hive Intelligence'));
    }

    return TE.tryCatch(
      async () => {
        this.hiveAdapter = new HiveIntelligenceAdapter({
          openaiApiKey: this.config.hive.openaiApiKey,
          baseUrl: this.config.hive.baseUrl,
          maxRequestsPerMinute: this.config.hive.maxRequestsPerMinute,
          cacheEnabled: this.config.hive.cacheEnabled,
          cacheTTL: this.config.hive.cacheTTL
        });

        // Initialize the adapter
        const result = await this.hiveAdapter.installHivePlugin()();
        if (E.isLeft(result)) {
          throw result.left;
        }

        logger.info('Hive Intelligence adapter initialized');
        return this.hiveAdapter;
      },
      error => new Error(`Failed to initialize Hive adapter: ${error}`)
    );
  };

  /**
   * Initialize Sei Agent Kit Adapter
   */
  private initializeSAKAdapter = (): TE.TaskEither<Error, SeiAgentKitAdapter | undefined> => {
    if (!this.config.sak.enabled) {
      logger.info('Sei Agent Kit adapter disabled');
      return TE.right(undefined);
    }

    return TE.tryCatch(
      async () => {
        this.sakAdapter = new SeiAgentKitAdapter({
          seiRpcUrl: this.config.sak.seiRpcUrl,
          seiEvmRpcUrl: this.config.sak.seiEvmRpcUrl,
          privateKey: this.config.sak.privateKey,
          mnemonic: this.config.sak.mnemonic,
          chainId: this.config.sak.chainId,
          network: this.config.sak.network,
          maxRequestsPerMinute: this.config.sak.maxRequestsPerMinute
        });

        // Initialize the adapter
        const result = await this.sakAdapter.installSAKPlugin()();
        if (E.isLeft(result)) {
          throw result.left;
        }

        logger.info('Sei Agent Kit adapter initialized');
        return this.sakAdapter;
      },
      error => new Error(`Failed to initialize SAK adapter: ${error}`)
    );
  };

  // /**
  //  * Initialize Sei MCP Adapter
  //  */
  // private initializeMCPAdapter = (): TE.TaskEither<Error, SeiMCPAdapter | undefined> => {
  //   if (!this.config.mcp.enabled) {
  //     logger.info('Sei MCP adapter disabled');
  //     return TE.right(undefined);
  //   }
  //
  //   return TE.tryCatch(
  //     async () => {
  //       this.mcpAdapter = new SeiMCPAdapter({
  //         endpoint: this.config.mcp.endpoint,
  //         port: this.config.mcp.port,
  //         secure: this.config.mcp.secure,
  //         apiKey: this.config.mcp.apiKey,
  //         network: this.config.mcp.network,
  //         connectionTimeout: this.config.mcp.connectionTimeout,
  //         heartbeatInterval: this.config.mcp.heartbeatInterval,
  //         maxReconnectAttempts: this.config.mcp.maxReconnectAttempts
  //       });
  //
  //       // Connect to MCP server
  //       await this.mcpAdapter.connectToMCP();
  //
  //       logger.info('Sei MCP adapter initialized and connected');
  //       return this.mcpAdapter;
  //     },
  //     error => new Error(`Failed to initialize MCP adapter: ${error}`)
  //   );
  // };

  /**
   * Initialize MCP Clients
   */
  private initializeMCPClients = (): TE.TaskEither<Error, Map<string, any> | undefined> => {
    if (!this.config.mcp.enabled) {
      logger.info('MCP adapters disabled');
      return TE.right(undefined);
    }

    return TE.tryCatch(
      async () => {
        // Configure MCP servers
        const mcpConfig = {
          servers: [
            {
              name: 'hive-intelligence',
              type: 'websocket' as const,
              url: `${this.config.mcp.secure ? 'wss' : 'ws'}://${this.config.mcp.endpoint}:${this.config.mcp.port}/hive`,
              apiKey: this.config.mcp.apiKey,
              metadata: HiveIntelligenceMCPConfig
            },
            {
              name: 'sei-blockchain',
              type: 'websocket' as const,
              url: `${this.config.mcp.secure ? 'wss' : 'ws'}://${this.config.mcp.endpoint}:${this.config.mcp.port}/sei`,
              apiKey: this.config.mcp.apiKey,
              metadata: seiBlockchainMCPConfig
            },
            {
              name: 'portfolio-manager',
              type: 'websocket' as const,
              url: `${this.config.mcp.secure ? 'wss' : 'ws'}://${this.config.mcp.endpoint}:${this.config.mcp.port}/portfolio`,
              apiKey: this.config.mcp.apiKey,
              metadata: portfolioManagerConfig
            }
          ],
          retryAttempts: this.config.mcp.maxReconnectAttempts,
          retryDelay: 1000,
          timeout: this.config.mcp.connectionTimeout
        };

        // Initialize connection manager
        this.mcpConnectionManager = initializeMCPConnectionManager(mcpConfig);
        
        // Initialize all servers
        await this.mcpConnectionManager.initializeAll();
        
        // Get connected clients
        const factory = this.mcpConnectionManager.getFactory();
        this.mcpClients = factory.getClients();
        
        logger.info('MCP clients initialized', {
          connectedServers: Array.from(this.mcpClients.keys())
        });
        
        return this.mcpClients;
      },
      error => new Error(`Failed to initialize MCP clients: ${error}`)
    );
  };

  /**
   * Create MCP wrapper adapters for backward compatibility
   */
  private createMCPWrapperAdapters(mcpClients?: Map<string, any>): any {
    if (!mcpClients || !this.mcpConnectionManager) return {};

    const factory = this.mcpConnectionManager.getFactory();
    return createMCPWrapperAdapters(mcpClients, factory);
  }

  /**
   * Create a unified MCP wrapper for AIService
   */
  private createMCPWrapper(mcpClients?: Map<string, any>): any {
    if (!mcpClients || !this.mcpConnectionManager) return null;

    const factory = this.mcpConnectionManager.getFactory();
    const unifiedAdapter = new UnifiedMCPAdapter(factory);
    
    return {
      // Provide methods expected by AIService
      getBlockchainState: () => unifiedAdapter.getBlockchainState(),
      getWalletBalance: (address: string) => unifiedAdapter.getWalletBalance(address),
      subscribeToEvents: (types: string[], filters?: any) => unifiedAdapter.subscribeToEvents(types, filters),
      isConnected: () => unifiedAdapter.isConnected(),
      on: (event: string, callback: (data: any) => void) => unifiedAdapter.on(event, callback)
    };
  }

  /**
   * Get current adapters and MCP clients
   */
  public getAdapters = (): {
    hive?: HiveIntelligenceAdapter;
    sak?: SeiAgentKitAdapter;
    mcpClients?: Map<string, any>;
    mcpConnectionManager?: MCPConnectionManager;
  } => {
    const mcpWrappers = this.createMCPWrapperAdapters(this.mcpClients);
    
    return {
      hive: this.hiveAdapter || mcpWrappers.hive,
      sak: this.sakAdapter || mcpWrappers.sak,
      mcpClients: this.mcpClients,
      mcpConnectionManager: this.mcpConnectionManager
    };
  };

  /**
   * Check if MCP clients are connected
   */
  public isMCPConnected = (): boolean => {
    return this.mcpClients.size > 0;
  };

  /**
   * Get MCP connection status
   */
  public getMCPStatus = (): {
    connected: boolean;
    servers: string[];
    clientCount: number;
  } => {
    return {
      connected: this.mcpClients.size > 0,
      servers: Array.from(this.mcpClients.keys()),
      clientCount: this.mcpClients.size
    };
  };

  /**
   * Cleanup adapters
   */
  public cleanup = (): TE.TaskEither<Error, void> => {
    return TE.tryCatch(
      async () => {
        // Shutdown MCP connections
        if (this.mcpConnectionManager) {
          await this.mcpConnectionManager.shutdown();
        }

        logger.info('Adapters cleaned up');
      },
      error => new Error(`Failed to cleanup adapters: ${error}`)
    );
  };
}

/**
 * Create adapter configuration from environment variables
 */
export const createAdapterConfig = () => ({
  hive: {
    enabled: process.env.HIVE_ENABLED !== 'false',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.HIVE_BASE_URL,
    maxRequestsPerMinute: parseInt(process.env.HIVE_RATE_LIMIT || '60'),
    cacheEnabled: process.env.HIVE_CACHE_ENABLED !== 'false',
    cacheTTL: parseInt(process.env.HIVE_CACHE_TTL || '300000')
  },
  sak: {
    enabled: process.env.SAK_ENABLED !== 'false',
    seiRpcUrl: process.env.SEI_RPC_URL || 'https://rpc-testnet.sei.io',
    seiEvmRpcUrl: process.env.SEI_EVM_RPC_URL || 'https://evm-rpc-testnet.sei.io',
    privateKey: process.env.SAK_WALLET_PRIVATE_KEY,
    mnemonic: process.env.SAK_WALLET_MNEMONIC,
    chainId: process.env.SEI_CHAIN_ID || 'atlantic-2',
    network: (process.env.SEI_NETWORK || 'testnet') as 'mainnet' | 'testnet' | 'devnet',
    maxRequestsPerMinute: parseInt(process.env.SAK_RATE_LIMIT || '60')
  },
  mcp: {
    enabled: process.env.MCP_ENABLED !== 'false',
    endpoint: process.env.MCP_ENDPOINT || 'localhost',
    port: parseInt(process.env.MCP_PORT || '8765'),
    secure: process.env.MCP_SECURE === 'true',
    apiKey: process.env.MCP_API_KEY,
    network: (process.env.SEI_NETWORK || 'testnet') as 'mainnet' | 'testnet' | 'devnet',
    connectionTimeout: parseInt(process.env.MCP_CONNECTION_TIMEOUT || '30000'),
    heartbeatInterval: parseInt(process.env.MCP_HEARTBEAT_INTERVAL || '30000'),
    maxReconnectAttempts: parseInt(process.env.MCP_MAX_RECONNECT_ATTEMPTS || '5')
  }
});