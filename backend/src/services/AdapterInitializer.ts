import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { HiveIntelligenceAdapter } from '../adapters/HiveIntelligenceAdapter';
import { SeiAgentKitAdapter } from '../adapters/SeiAgentKitAdapter';
import { SeiMCPAdapter } from '../adapters/SeiMCPAdapter';
import { SeiIntegrationService } from './SeiIntegrationService';
import { AIService } from './AIService';
import logger from '../utils/logger';

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
  private mcpAdapter?: SeiMCPAdapter;

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
    mcp?: SeiMCPAdapter;
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
      TE.bind('mcp', () => this.initializeMCPAdapter()),
      TE.map(({ hive, sak, mcp }) => {
        const adapters: {
          hive?: HiveIntelligenceAdapter;
          sak?: SeiAgentKitAdapter;
          mcp?: SeiMCPAdapter;
        } = {};
        if (hive) adapters.hive = hive;
        if (sak) adapters.sak = sak;
        if (mcp) adapters.mcp = mcp;

        logger.info('AI adapters initialized successfully', {
          hiveInitialized: !!hive,
          sakInitialized: !!sak,
          mcpInitialized: !!mcp
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
        // Register with SeiIntegrationService
        seiIntegrationService.registerAdapters(adapters);

        // Register with AIService - cast to any to avoid interface mismatch
        aiService.initializeAdapters(
          adapters.hive as any,
          adapters.sak as any,
          adapters.mcp as any
        );

        logger.info('Adapters registered with services', {
          registeredCount: Object.keys(adapters).length
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

  /**
   * Initialize Sei MCP Adapter
   */
  private initializeMCPAdapter = (): TE.TaskEither<Error, SeiMCPAdapter | undefined> => {
    if (!this.config.mcp.enabled) {
      logger.info('Sei MCP adapter disabled');
      return TE.right(undefined);
    }

    return TE.tryCatch(
      async () => {
        this.mcpAdapter = new SeiMCPAdapter({
          endpoint: this.config.mcp.endpoint,
          port: this.config.mcp.port,
          secure: this.config.mcp.secure,
          apiKey: this.config.mcp.apiKey,
          network: this.config.mcp.network,
          connectionTimeout: this.config.mcp.connectionTimeout,
          heartbeatInterval: this.config.mcp.heartbeatInterval,
          maxReconnectAttempts: this.config.mcp.maxReconnectAttempts
        });

        // Connect to MCP server
        await this.mcpAdapter.connectToMCP();

        logger.info('Sei MCP adapter initialized and connected');
        return this.mcpAdapter;
      },
      error => new Error(`Failed to initialize MCP adapter: ${error}`)
    );
  };

  /**
   * Cleanup adapters
   */
  public cleanup = (): TE.TaskEither<Error, void> => {
    return TE.tryCatch(
      async () => {
        if (this.mcpAdapter) {
          this.mcpAdapter.disconnectFromMCP();
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