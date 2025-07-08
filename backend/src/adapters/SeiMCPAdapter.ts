import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import axios from 'axios';
import { SeiMCPAdapter as ISeiMCPAdapter } from '../services/SeiIntegrationService';
import type {
  BlockchainState,
  WalletBalance
} from '../services/SeiIntegrationService';
import logger from '../utils/logger';

/**
 * Real SeiMCPAdapter Implementation
 * 
 * This adapter provides real-time blockchain data and WebSocket connections
 * for live updates from the Sei Network.
 */
export class SeiMCPAdapter extends EventEmitter implements ISeiMCPAdapter {
  private ws?: WebSocket;
  private isConnectedFlag: boolean = false;
  private reconnectAttempts: number = 0;
  private heartbeatInterval?: NodeJS.Timeout;
  private subscriptions: Set<string> = new Set();
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = new Map();

  constructor(private config: {
    endpoint: string;
    port: number;
    secure: boolean;
    apiKey?: string;
    network: 'mainnet' | 'testnet' | 'devnet';
    connectionTimeout?: number;
    heartbeatInterval?: number;
    maxReconnectAttempts?: number;
  }) {
    super();
    
    // Setup cache cleanup
    setInterval(() => this.cleanupCache(), 60000); // Clean every minute
  }

  /**
   * Get real-time blockchain state
   */
  public getBlockchainState = (): TE.TaskEither<Error, BlockchainState> => {
    const cacheKey = 'blockchain:state';
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return TE.right(cached);
    }

    return pipe(
      TE.tryCatch(
        async () => {
          const state = await this.fetchBlockchainState();
          
          // Cache for 10 seconds
          this.setInCache(cacheKey, state, 10000);
          
          return state;
        },
        error => new Error(`Failed to get blockchain state: ${error}`)
      ),
      TE.mapLeft(error => {
        logger.error('Failed to get blockchain state:', error);
        return error;
      })
    );
  };

  /**
   * Get wallet balance with real-time updates
   */
  public getWalletBalance = (address: string): TE.TaskEither<Error, WalletBalance> => {
    const cacheKey = `wallet:balance:${address}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return TE.right(cached);
    }

    return pipe(
      TE.tryCatch(
        async () => {
          const balance = await this.fetchWalletBalance(address);
          
          // Cache for 30 seconds
          this.setInCache(cacheKey, balance, 30000);
          
          return balance;
        },
        error => new Error(`Failed to get wallet balance: ${error}`)
      ),
      TE.mapLeft(error => {
        logger.error('Failed to get wallet balance:', error);
        return error;
      })
    );
  };

  /**
   * Subscribe to real-time events
   */
  public subscribeToEvents = (
    types: string[],
    filters?: any
  ): TE.TaskEither<Error, void> => {
    return TE.tryCatch(
      async () => {
        if (!this.isConnectedFlag) {
          throw new Error('Not connected to MCP server');
        }

        // Send subscription message
        const message = {
          type: 'subscribe',
          eventTypes: types,
          filters: filters || {},
          timestamp: Date.now()
        };

        this.sendMessage(message);
        
        // Track subscriptions
        types.forEach(type => this.subscriptions.add(type));
        
        logger.info(`Subscribed to events: ${types.join(', ')}`);
      },
      error => new Error(`Failed to subscribe to events: ${error}`)
    );
  };

  /**
   * Connect to MCP server
   */
  public connectToMCP = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const protocol = this.config.secure ? 'wss' : 'ws';
      const url = `${protocol}://${this.config.endpoint}:${this.config.port}`;
      
      logger.info(`Connecting to MCP server at ${url}`);
      
      this.ws = new WebSocket(url, {
        headers: this.config.apiKey ? {
          'Authorization': `Bearer ${this.config.apiKey}`
        } : undefined
      });

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout || 30000);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.isConnectedFlag = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        logger.info('Connected to MCP server');
        this.emit('mcp:connected');
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', () => {
        this.isConnectedFlag = false;
        this.stopHeartbeat();
        logger.warn('Disconnected from MCP server');
        this.emit('mcp:disconnected');
        this.attemptReconnect();
      });

      this.ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.emit('mcp:error', error);
        if (!this.isConnectedFlag) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  };

  /**
   * Disconnect from MCP server
   */
  public disconnectFromMCP = (): void => {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.isConnectedFlag = false;
    this.stopHeartbeat();
    this.subscriptions.clear();
    logger.info('Disconnected from MCP server');
  };

  /**
   * Check if connected
   */
  public isConnected = (): boolean => {
    return this.isConnectedFlag && this.ws?.readyState === WebSocket.OPEN;
  };

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Fetch blockchain state from RPC
   */
  private fetchBlockchainState = async (): Promise<BlockchainState> => {
    try {
      // Get RPC endpoint based on network
      const rpcUrl = this.getRpcUrl();
      
      // Fetch latest block
      const blockResponse = await axios.post(rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'status',
        params: {}
      });

      const blockData = blockResponse.data.result;
      
      // Fetch network info
      const netInfoResponse = await axios.post(rpcUrl, {
        jsonrpc: '2.0',
        id: 2,
        method: 'net_info',
        params: {}
      });

      const netInfo = netInfoResponse.data.result;
      
      return {
        blockNumber: parseInt(blockData.sync_info.latest_block_height),
        networkStatus: this.determineNetworkStatus(netInfo),
        gasPrice: '0.025usei' // Default gas price
      };
    } catch (error) {
      logger.error('Failed to fetch blockchain state:', error);
      // Return default state on error
      return {
        blockNumber: 0,
        networkStatus: 'offline',
        gasPrice: '0.025usei'
      };
    }
  };

  /**
   * Fetch wallet balance
   */
  private fetchWalletBalance = async (address: string): Promise<WalletBalance> => {
    try {
      const rpcUrl = this.getRpcUrl();
      
      // Fetch native balance
      const balanceResponse = await axios.post(rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'bank_balances',
        params: {
          address: address
        }
      });

      const balances = balanceResponse.data.result || [];
      
      // Convert to our format
      const tokenBalances = balances.map((balance: any) => ({
        denom: balance.denom,
        amount: balance.amount,
        decimals: balance.denom === 'usei' ? 6 : 18,
        symbol: balance.denom === 'usei' ? 'SEI' : balance.denom.toUpperCase(),
        name: balance.denom === 'usei' ? 'Sei' : balance.denom,
        valueUSD: 0, // Would need price oracle
        logoUri: undefined
      }));

      // Calculate total value (simplified - would need price data)
      const totalValueUSD = tokenBalances.reduce((sum: number, token: any) => {
        return sum + (parseFloat(token.amount) / Math.pow(10, token.decimals));
      }, 0);

      return {
        address,
        balances: tokenBalances,
        totalValueUSD
      };
    } catch (error) {
      logger.error('Failed to fetch wallet balance:', error);
      return {
        address,
        balances: [],
        totalValueUSD: 0
      };
    }
  };

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage = (data: string): void => {
    try {
      const message = JSON.parse(data);
      
      // Handle different message types
      switch (message.type) {
        case 'event':
          this.emit('mcp:event', message);
          break;
        case 'response':
          this.handleResponse(message);
          break;
        case 'error':
          logger.error('MCP error message:', message);
          break;
        default:
          logger.debug('Unknown message type:', message.type);
      }
    } catch (error) {
      logger.error('Failed to parse message:', error);
    }
  };

  /**
   * Handle response messages
   */
  private handleResponse = (message: any): void => {
    const pending = this.pendingRequests.get(message.id);
    if (pending) {
      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message.result);
      }
      this.pendingRequests.delete(message.id);
    }
  };

  /**
   * Send message via WebSocket
   */
  private sendMessage = (message: any): void => {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    const messageId = `${Date.now()}-${Math.random()}`;
    const fullMessage = {
      ...message,
      id: messageId
    };
    
    this.ws.send(JSON.stringify(fullMessage));
  };

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat = (): void => {
    const interval = this.config.heartbeatInterval || 30000;
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, interval);
  };

  /**
   * Stop heartbeat
   */
  private stopHeartbeat = (): void => {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  };

  /**
   * Attempt to reconnect
   */
  private attemptReconnect = (): void => {
    const maxAttempts = this.config.maxReconnectAttempts || 5;
    
    if (this.reconnectAttempts < maxAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      logger.info(`Attempting reconnect ${this.reconnectAttempts}/${maxAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        this.connectToMCP().catch(error => {
          logger.error('Reconnect failed:', error);
        });
      }, delay);
    } else {
      logger.error('Max reconnection attempts reached');
      this.emit('mcp:reconnect:failed');
    }
  };

  /**
   * Get RPC URL based on network
   */
  private getRpcUrl = (): string => {
    switch (this.config.network) {
      case 'mainnet':
        return 'https://rpc.sei.io';
      case 'testnet':
        return 'https://rpc-testnet.sei.io';
      case 'devnet':
        return 'https://rpc-devnet.sei.io';
      default:
        return 'https://rpc.sei.io';
    }
  };

  /**
   * Determine network status from net info
   */
  private determineNetworkStatus = (netInfo: any): 'healthy' | 'congested' | 'offline' => {
    if (!netInfo) return 'offline';
    
    const numPeers = parseInt(netInfo.n_peers || '0');
    if (numPeers === 0) return 'offline';
    if (numPeers < 5) return 'congested';
    
    return 'healthy';
  };

  /**
   * Cache management
   */
  private getFromCache = (key: string): any => {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  };

  private setInCache = (key: string, data: any, ttl: number): void => {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  };

  private cleanupCache = (): void => {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  };
}