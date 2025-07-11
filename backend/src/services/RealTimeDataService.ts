import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import type { SeiIntegrationService } from './SeiIntegrationService';
import type { SocketService } from './SocketService';
import { createServiceLogger } from './LoggingService';
// Import types from SeiIntegrationService
import type { 
  BlockchainState, 
  WalletBalance, 
  TransactionResponse,
  SeiMCPAdapter
} from './SeiIntegrationService';

/**
 * RealTimeDataService - Real-Time Data Coordination
 * 
 * This service coordinates real-time data streams from all adapters and manages
 * data synchronization, caching, and distribution. It provides a unified interface
 * for real-time blockchain data, market updates, and portfolio changes.
 */

// ============================================================================
// Real-Time Data Types
// ============================================================================

export interface RealTimeConfig {
  dataStreams: {
    blockchain: {
      enabled: boolean;
      interval: number;
      priority: 'high' | 'medium' | 'low';
    };
    wallet: {
      enabled: boolean;
      interval: number;
      priority: 'high' | 'medium' | 'low';
    };
    market: {
      enabled: boolean;
      interval: number;
      priority: 'medium' | 'low';
    };
    portfolio: {
      enabled: boolean;
      interval: number;
      priority: 'high' | 'medium';
    };
    transactions: {
      enabled: boolean;
      realTime: boolean;
      priority: 'high';
    };
  };
  caching: {
    enabled: boolean;
    defaultTTL: number;
    maxCacheSize: number;
    compressionEnabled: boolean;
  };
  synchronization: {
    batchSize: number;
    maxDelay: number;
    conflictResolution: 'latest' | 'highest_priority' | 'merge';
  };
  performance: {
    maxConcurrentStreams: number;
    throttleThreshold: number;
    circuitBreakerThreshold: number;
  };
  alerts: {
    enabled: boolean;
    criticalThresholds: {
      networkCongestion: number;
      walletValueChange: number;
      riskLevelChange: number;
    };
  };
}

export interface DataStream {
  id: string;
  type: 'blockchain' | 'wallet' | 'market' | 'portfolio' | 'transaction';
  walletAddress?: string;
  status: 'active' | 'paused' | 'error' | 'stopped';
  lastUpdate: Date;
  updateCount: number;
  errorCount: number;
  priority: 'high' | 'medium' | 'low';
  dataSource: 'hive' | 'sak' | 'mcp' | 'integration';
  metadata: {
    interval?: number;
    lastData?: any;
    lastError?: string;
    performanceMetrics?: {
      avgLatency: number;
      successRate: number;
      dataSize: number;
    };
  };
}

export interface RealTimeUpdate {
  id: string;
  timestamp: Date;
  type: 'blockchain_state' | 'wallet_balance' | 'market_data' | 'portfolio_change' | 'transaction_event';
  walletAddress?: string;
  data: any;
  source: 'hive' | 'sak' | 'mcp' | 'integration';
  priority: 'critical' | 'high' | 'medium' | 'low';
  metadata: {
    latency: number;
    dataSize: number;
    cached: boolean;
    sequenceNumber: number;
    correlationId?: string;
    dragonBallPowerLevel?: number;
  };
  validation: {
    checksum?: string;
    verified: boolean;
    dataIntegrity: boolean;
  };
}

export interface ConnectionStatus {
  walletAddress: string;
  adapters: {
    hive: {
      connected: boolean;
      lastActivity?: Date;
      creditRemaining?: number;
      error?: string;
    };
    sak: {
      connected: boolean;
      activeTools: number;
      lastOperation?: Date;
      error?: string;
    };
    mcp: {
      connected: boolean;
      subscriptions: string[];
      lastBlockNumber?: number;
      error?: string;
    };
  };
  streams: {
    active: number;
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  };
  performance: {
    avgLatency: number;
    successRate: number;
    errorRate: number;
    throughput: number; // Updates per second
  };
  alerts: Array<{
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }>;
}

export interface DataSynchronizationResult {
  success: boolean;
  conflictsResolved: number;
  dataPointsSynchronized: number;
  errors: Array<{
    source: string;
    error: string;
    timestamp: Date;
  }>;
  performanceMetrics: {
    syncTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export interface RealTimeError {
  name: string;
  code: string;
  message: string;
  source: 'stream' | 'sync' | 'cache' | 'network' | 'validation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  retryCount?: number;
}

// ============================================================================
// Core RealTimeDataService Implementation
// ============================================================================

export class RealTimeDataService extends EventEmitter {
  private config: RealTimeConfig;
  private seiIntegration: SeiIntegrationService;
  private socketService: SocketService;
  private serviceLogger = createServiceLogger('RealTimeDataService');
  
  // Stream management
  private activeStreams: Map<string, DataStream> = new Map();
  private streamIntervals: Map<string, NodeJS.Timeout> = new Map();
  private sequenceNumber: number = 0;
  
  // Data management
  private dataCache: Map<string, { data: any; expiresAt: number; priority: string }> = new Map();
  private pendingUpdates: Map<string, RealTimeUpdate[]> = new Map();
  
  // Performance monitoring
  private performanceMetrics: Map<string, {
    latencies: number[];
    successCount: number;
    errorCount: number;
    lastUpdate: Date;
  }> = new Map();
  
  // Circuit breaker state
  private circuitBreakers: Map<string, {
    state: 'closed' | 'open' | 'half-open';
    errorCount: number;
    lastFailure: Date;
    nextAttempt: Date;
  }> = new Map();

  constructor(
    seiIntegration: SeiIntegrationService,
    socketService: SocketService,
    config?: RealTimeConfig
  ) {
    super();
    
    this.serviceLogger.info('Initializing RealTimeDataService', {
      hasCustomConfig: !!config
    });
    
    this.seiIntegration = seiIntegration;
    this.socketService = socketService;
    this.config = config || this.getDefaultConfig();
    
    this.serviceLogger.info('RealTimeDataService configuration', {
      enabledStreams: Object.entries(this.config.dataStreams)
        .filter(([_, stream]) => stream.enabled)
        .map(([name]) => name),
      cachingEnabled: this.config.caching.enabled,
      alertsEnabled: this.config.alerts.enabled
    });
    
    this.setupRealTimeEventHandlers();
    this.startPerformanceMonitoring();
    
    this.serviceLogger.info('RealTimeDataService initialization completed');
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Start real-time data streams for a wallet
   */
  public startDataStreams = (
    walletAddress: string,
    streamTypes?: Array<'blockchain' | 'wallet' | 'market' | 'portfolio' | 'transactions'>
  ): TE.TaskEither<RealTimeError, DataStream[]> => {
    const types = streamTypes || ['blockchain', 'wallet', 'portfolio', 'transactions'] as const;
    
    return pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Starting data streams', {
          walletAddress,
          streamTypes: types,
          method: 'startDataStreams'
        });
        this.serviceLogger.startTimer('startDataStreams');
      })),
      TE.bind('streams', () => this.serviceLogger.logTaskEither(
        this.initializeStreams(walletAddress, types),
        'startDataStreams.initializeStreams',
        { walletAddress, streamTypes: types }
      )),
      TE.bind('validation', ({ streams }) => this.serviceLogger.logTaskEither(
        this.validateStreamSetup(streams),
        'startDataStreams.validateStreams',
        { walletAddress, streamCount: streams.length }
      )),
      TE.map(({ streams }) => {
        this.serviceLogger.endTimer('startDataStreams', {
          walletAddress,
          streamCount: streams.length
        });
        
        this.serviceLogger.info('Data streams started successfully', {
          walletAddress,
          streamCount: streams.length,
          streamIds: streams.map(s => s.id),
          types: streams.map(s => s.type)
        });
        
        this.emit('realtime:streams:started', {
          walletAddress,
          streamCount: streams.length,
          types: streams.map(s => s.type),
          timestamp: new Date()
        });
        
        return streams;
      }),
      TE.mapLeft(error => {
        this.serviceLogger.error('Failed to start data streams', {
          walletAddress,
          streamTypes: types
        }, error as Error);
        return error;
      })
    );
  };

  /**
   * Stop data streams for a wallet
   */
  public stopDataStreams = (walletAddress: string): TE.TaskEither<RealTimeError, void> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Stopping data streams', { walletAddress });
        this.serviceLogger.startTimer('stopDataStreams');
      })),
      TE.chain(() => TE.tryCatch(
        async () => {
          const streamsToStop = Array.from(this.activeStreams.values())
            .filter(stream => stream.walletAddress === walletAddress);
          
          this.serviceLogger.debug('Found streams to stop', {
            walletAddress,
            streamCount: streamsToStop.length,
            streamIds: streamsToStop.map(s => s.id)
          });
          
          for (const stream of streamsToStop) {
            this.serviceLogger.debug('Stopping stream', {
              streamId: stream.id,
              streamType: stream.type
            });
            this.stopStream(stream.id);
          }
          
          this.pendingUpdates.delete(walletAddress);
          
          this.serviceLogger.endTimer('stopDataStreams', {
            walletAddress,
            streamCount: streamsToStop.length
          });
          
          this.serviceLogger.info('Data streams stopped successfully', {
            walletAddress,
            streamCount: streamsToStop.length
          });
          
          this.emit('realtime:streams:stopped', {
            walletAddress,
            streamCount: streamsToStop.length,
            timestamp: new Date()
          });
        },
        error => {
          this.serviceLogger.error('Failed to stop data streams', { walletAddress }, error as Error);
          return this.createRealTimeError('STREAM_STOP_FAILED', `Failed to stop streams: ${error}`, 'stream');
        }
      ))
    );

  /**
   * Get connection status for a wallet
   */
  public getConnectionStatus = (walletAddress: string): TE.TaskEither<RealTimeError, ConnectionStatus> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Getting connection status', {
          walletAddress,
          method: 'getConnectionStatus'
        });
        this.serviceLogger.startTimer('getConnectionStatus');
      })),
      TE.chain(() => TE.tryCatch(
        async () => {
          this.serviceLogger.debug('Fetching adapter status', { walletAddress });
          const adapterStatus = await this.seiIntegration.getIntegrationStatus()();
          
          const userStreams = Array.from(this.activeStreams.values())
            .filter(stream => stream.walletAddress === walletAddress);
          
          this.serviceLogger.debug('Checking socket connection', { walletAddress });
          const socketConnected = this.socketService.isUserConnected(walletAddress);
          
          this.serviceLogger.debug('Calculating performance metrics', { walletAddress });
          const performance = this.calculatePerformanceMetrics(walletAddress);
          
          this.serviceLogger.debug('Generating alerts', { walletAddress });
          const alerts = this.generateAlerts(walletAddress, performance);

          const connectionStatus = {
            walletAddress,
            adapters: {
              hive: {
                connected: adapterStatus._tag === 'Right' ? adapterStatus.right.hive.connected : false,
                lastActivity: adapterStatus._tag === 'Right' ? adapterStatus.right.hive.lastActivity : undefined,
                creditRemaining: adapterStatus._tag === 'Right' ? adapterStatus.right.hive.creditUsage?.remaining : undefined,
                error: adapterStatus._tag === 'Right' ? adapterStatus.right.hive.error : undefined
              },
              sak: {
                connected: adapterStatus._tag === 'Right' ? adapterStatus.right.sak.connected : false,
                activeTools: adapterStatus._tag === 'Right' ? adapterStatus.right.sak.availableTools || 0 : 0,
                lastOperation: adapterStatus._tag === 'Right' ? adapterStatus.right.sak.lastOperation : undefined,
                error: adapterStatus._tag === 'Right' ? adapterStatus.right.sak.error : undefined
              },
              mcp: {
                connected: adapterStatus._tag === 'Right' ? adapterStatus.right.mcp.connected : false,
                subscriptions: adapterStatus._tag === 'Right' ? adapterStatus.right.mcp.subscriptions || [] : [],
                lastBlockNumber: adapterStatus._tag === 'Right' ? adapterStatus.right.mcp.lastBlockNumber : undefined,
                error: adapterStatus._tag === 'Right' ? adapterStatus.right.mcp.error : undefined
              }
            },
            streams: {
              active: userStreams.filter(s => s.status === 'active').length,
              total: userStreams.length,
              byType: this.groupStreamsByType(userStreams),
              byPriority: this.groupStreamsByPriority(userStreams)
            },
            performance,
            alerts
          };
          
          this.serviceLogger.endTimer('getConnectionStatus', {
            walletAddress,
            activeStreams: connectionStatus.streams.active,
            alertCount: alerts.length,
            avgLatency: performance.avgLatency
          });
          
          this.serviceLogger.info('Connection status retrieved', {
            walletAddress,
            adaptersConnected: {
              hive: connectionStatus.adapters.hive.connected,
              sak: connectionStatus.adapters.sak.connected,
              mcp: connectionStatus.adapters.mcp.connected
            },
            activeStreams: connectionStatus.streams.active,
            totalStreams: connectionStatus.streams.total,
            performanceStatus: {
              avgLatency: performance.avgLatency,
              successRate: performance.successRate,
              errorRate: performance.errorRate
            },
            alertCount: alerts.length
          });
          
          return connectionStatus;
        },
        error => {
          this.serviceLogger.error('Failed to get connection status', { walletAddress }, error as Error);
          return this.createRealTimeError('STATUS_CHECK_FAILED', `Failed to get connection status: ${error}`, 'network');
        }
      ))
    );

  /**
   * Force data synchronization across all adapters
   */
  public synchronizeData = (
    walletAddress: string,
    options: {
      force?: boolean;
      includeCache?: boolean;
      priority?: 'high' | 'medium' | 'low';
    } = {}
  ): TE.TaskEither<RealTimeError, DataSynchronizationResult> => {
    const startTime = Date.now();
    
    return pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Starting data synchronization', {
          walletAddress,
          options,
          method: 'synchronizeData'
        });
        this.serviceLogger.startTimer('synchronizeData');
      })),
      TE.bind('blockchainData', () => {
        this.serviceLogger.debug('Fetching blockchain data for sync', { walletAddress });
        return this.serviceLogger.logTaskEither(
          this.fetchBlockchainData(),
          'synchronizeData.fetchBlockchainData',
          { walletAddress }
        );
      }),
      TE.bind('walletData', () => {
        this.serviceLogger.debug('Fetching wallet data for sync', { walletAddress });
        return this.serviceLogger.logTaskEither(
          this.fetchWalletData(walletAddress),
          'synchronizeData.fetchWalletData',
          { walletAddress }
        );
      }),
      TE.bind('portfolioData', () => {
        this.serviceLogger.debug('Fetching portfolio data for sync', { walletAddress });
        return this.serviceLogger.logTaskEither(
          this.fetchPortfolioData(walletAddress),
          'synchronizeData.fetchPortfolioData',
          { walletAddress }
        );
      }),
      TE.bind('syncResult', ({ blockchainData, walletData, portfolioData }) => {
        this.serviceLogger.debug('Performing data synchronization', {
          walletAddress,
          hasBlockchainData: !!blockchainData,
          hasWalletData: !!walletData,
          hasPortfolioData: !!portfolioData
        });
        return this.serviceLogger.logTaskEither(
          this.performDataSynchronization(walletAddress, {
            blockchain: blockchainData,
            wallet: walletData,
            portfolio: portfolioData
          }, options),
          'synchronizeData.performSync',
          { walletAddress }
        );
      }),
      TE.map(({ syncResult }) => {
        const totalSyncTime = Date.now() - startTime;
        
        this.serviceLogger.endTimer('synchronizeData', {
          walletAddress,
          syncTime: totalSyncTime,
          conflictsResolved: syncResult.conflictsResolved,
          dataPointsSynchronized: syncResult.dataPointsSynchronized
        });
        
        this.serviceLogger.info('Data synchronization completed', {
          walletAddress,
          success: syncResult.success,
          conflictsResolved: syncResult.conflictsResolved,
          dataPointsSynchronized: syncResult.dataPointsSynchronized,
          totalSyncTime,
          errorCount: syncResult.errors.length
        });
        
        return {
          ...syncResult,
          performanceMetrics: {
            ...syncResult.performanceMetrics,
            syncTime: totalSyncTime
          }
        };
      }),
      TE.mapLeft(error => {
        this.serviceLogger.error('Data synchronization failed', { walletAddress }, error as Error);
        return error;
      })
    );
  };

  /**
   * Get real-time data for a specific type
   */
  public getRealTimeData = <T>(
    type: 'blockchain' | 'wallet' | 'market' | 'portfolio',
    walletAddress?: string,
    maxAge: number = 30000 // 30 seconds default
  ): TE.TaskEither<RealTimeError, T> => {
    this.serviceLogger.info('Getting real-time data', {
      type,
      walletAddress,
      maxAge,
      method: 'getRealTimeData'
    });
    this.serviceLogger.startTimer('getRealTimeData');
    
    const cacheKey = this.generateCacheKey(type, walletAddress);
    const cached = this.getFromCache<T>(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < maxAge) {
      this.serviceLogger.endTimer('getRealTimeData', {
        type,
        walletAddress,
        cacheHit: true,
        cacheAge: Date.now() - cached.timestamp
      });
      
      this.serviceLogger.debug('Returning cached data', {
        type,
        walletAddress,
        cacheAge: Date.now() - cached.timestamp,
        maxAge
      });
      
      return TE.right(cached.data);
    }
    
    this.serviceLogger.debug('Cache miss, fetching fresh data', {
      type,
      walletAddress,
      cacheKey,
      hasCached: !!cached,
      cacheAge: cached ? Date.now() - cached.timestamp : null
    });
    
    return pipe(
      this.fetchFreshData<T>(type, walletAddress),
      TE.map(data => {
        this.serviceLogger.endTimer('getRealTimeData', {
          type,
          walletAddress,
          cacheHit: false
        });
        return data;
      }),
      TE.mapLeft(error => {
        this.serviceLogger.error('Failed to get real-time data', {
          type,
          walletAddress
        }, error as Error);
        return error;
      })
    );
  };

  /**
   * Subscribe to real-time updates
   */
  public subscribeToUpdates = (
    walletAddress: string,
    updateTypes: string[],
    callback: (update: RealTimeUpdate) => void
  ): TE.TaskEither<RealTimeError, string> => {
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Creating real-time subscription', {
          walletAddress,
          updateTypes,
          subscriptionId,
          method: 'subscribeToUpdates'
        });
        this.serviceLogger.startTimer('subscribeToUpdates');
      })),
      TE.chain(() => TE.tryCatch(
        async () => {
          this.serviceLogger.debug('Registering subscription event handler', {
            subscriptionId,
            walletAddress,
            updateTypes
          });
          
          // Register subscription
          this.on(`update:${walletAddress}`, (update: RealTimeUpdate) => {
            if (updateTypes.includes(update.type)) {
              this.serviceLogger.debug('Calling subscription callback', {
                subscriptionId,
                updateId: update.id,
                updateType: update.type,
                walletAddress
              });
              
              try {
                callback(update);
              } catch (callbackError) {
                this.serviceLogger.error('Subscription callback error', {
                  subscriptionId,
                  updateId: update.id,
                  updateType: update.type
                }, callbackError as Error);
              }
            }
          });
          
          this.serviceLogger.endTimer('subscribeToUpdates', {
            subscriptionId,
            walletAddress
          });
          
          this.serviceLogger.info('Subscription created successfully', {
            subscriptionId,
            walletAddress,
            updateTypes
          });
          
          this.emit('realtime:subscription:created', {
            subscriptionId,
            walletAddress,
            updateTypes,
            timestamp: new Date()
          });
          
          return subscriptionId;
        },
        error => {
          this.serviceLogger.error('Failed to create subscription', {
            walletAddress,
            updateTypes
          }, error as Error);
          return this.createRealTimeError('SUBSCRIPTION_FAILED', `Failed to create subscription: ${error}`, 'stream');
        }
      ))
    );
  };

  /**
   * Get stream statistics
   */
  public getStreamStatistics = (): TE.TaskEither<RealTimeError, {
    activeStreams: number;
    eventsProcessed: number;
    avgLatency: number;
  }> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Getting stream statistics', { method: 'getStreamStatistics' });
        this.serviceLogger.startTimer('getStreamStatistics');
      })),
      TE.chain(() => TE.tryCatch(
        async () => {
          this.serviceLogger.debug('Calculating stream statistics', {
            totalStreams: this.activeStreams.size,
            metricsCount: this.performanceMetrics.size
          });
          
          const totalEventsProcessed = Array.from(this.performanceMetrics.values())
            .reduce((sum, metrics) => sum + metrics.successCount + metrics.errorCount, 0);
          
          const latencies = Array.from(this.performanceMetrics.values())
            .flatMap(metrics => metrics.latencies);
          
          const avgLatency = latencies.length > 0 
            ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length 
            : 0;

          const activeStreamsCount = Array.from(this.activeStreams.values()).filter(s => s.status === 'active').length;
          
          const statistics = {
            activeStreams: activeStreamsCount,
            eventsProcessed: totalEventsProcessed,
            avgLatency
          };
          
          this.serviceLogger.endTimer('getStreamStatistics', {
            activeStreams: activeStreamsCount,
            eventsProcessed: totalEventsProcessed
          });
          
          this.serviceLogger.info('Stream statistics calculated', {
            activeStreams: activeStreamsCount,
            totalStreams: this.activeStreams.size,
            eventsProcessed: totalEventsProcessed,
            avgLatency: Math.round(avgLatency * 100) / 100,
            latencyDataPoints: latencies.length
          });
          
          return statistics;
        },
        error => {
          this.serviceLogger.error('Failed to get stream statistics', {}, error as Error);
          return this.createRealTimeError('STATS_RETRIEVAL_FAILED', `Failed to get stream statistics: ${error}`, 'stream');
        }
      ))
    );

  /**
   * Update stream configuration
   */
  public updateStreamConfig = (
    streamId: string,
    newConfig: Partial<{
      interval: number;
      priority: 'high' | 'medium' | 'low';
      enabled: boolean;
    }>
  ): TE.TaskEither<RealTimeError, DataStream> => {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream) {
      return TE.left(this.createRealTimeError('STREAM_NOT_FOUND', `Stream ${streamId} not found`, 'stream'));
    }
    
    return TE.tryCatch(
      async () => {
        // Update stream configuration
        if (newConfig.priority) stream.priority = newConfig.priority;
        if (newConfig.interval && newConfig.interval !== stream.metadata.interval) {
          stream.metadata.interval = newConfig.interval;
          this.restartStream(streamId);
        }
        if (newConfig.enabled === false) {
          this.pauseStream(streamId);
        } else if (newConfig.enabled === true && stream.status === 'paused') {
          this.resumeStream(streamId);
        }
        
        this.activeStreams.set(streamId, stream);
        
        this.emit('realtime:stream:updated', {
          streamId,
          newConfig,
          timestamp: new Date()
        });
        
        return stream;
      },
      error => this.createRealTimeError('STREAM_UPDATE_FAILED', `Failed to update stream: ${error}`, 'stream')
    );
  };

  // ============================================================================
  // Stream Management Methods
  // ============================================================================

  /**
   * Initialize streams for a wallet
   */
  private initializeStreams = (
    walletAddress: string,
    types: string[]
  ): TE.TaskEither<RealTimeError, DataStream[]> =>
    TE.tryCatch(
      async () => {
        const streams: DataStream[] = [];
        
        for (const type of types) {
          if (!this.config.dataStreams[type as keyof typeof this.config.dataStreams]?.enabled) {
            continue;
          }
          
          const streamId = `${type}-${walletAddress}-${Date.now()}`;
          const streamConfig = this.config.dataStreams[type as keyof typeof this.config.dataStreams];
          
          const stream: DataStream = {
            id: streamId,
            type: type as any,
            walletAddress,
            status: 'active',
            lastUpdate: new Date(),
            updateCount: 0,
            errorCount: 0,
            priority: streamConfig.priority,
            dataSource: this.determineDataSource(type),
            metadata: {
              interval: 'interval' in streamConfig ? streamConfig.interval : 30000,
              performanceMetrics: {
                avgLatency: 0,
                successRate: 100,
                dataSize: 0
              }
            }
          };
          
          this.activeStreams.set(streamId, stream);
          this.startStream(stream);
          streams.push(stream);
        }
        
        return streams;
      },
      error => this.createRealTimeError('STREAM_INIT_FAILED', `Failed to initialize streams: ${error}`, 'stream')
    );

  /**
   * Start a data stream
   */
  private startStream(stream: DataStream): void {
    const intervalMs = stream.metadata.interval || 30000;
    
    this.serviceLogger.info('Starting data stream', {
      streamId: stream.id,
      streamType: stream.type,
      walletAddress: stream.walletAddress,
      interval: intervalMs,
      priority: stream.priority
    });
    
    const interval = setInterval(async () => {
      try {
        if (this.shouldSkipUpdate(stream)) {
          this.serviceLogger.debug('Skipping stream update', {
            streamId: stream.id,
            reason: 'circuit_breaker_or_paused'
          });
          return;
        }
        
        this.serviceLogger.debug('Fetching stream data', {
          streamId: stream.id,
          streamType: stream.type
        });
        
        const update = await this.fetchStreamData(stream);
        if (update) {
          this.serviceLogger.debug('Processing stream update', {
            updateId: update.id,
            streamId: stream.id,
            latency: update.metadata.latency
          });
          
          await this.processUpdate(update);
          this.updateStreamMetrics(stream, true);
          
          this.serviceLogger.debug('Stream update processed successfully', {
            updateId: update.id,
            streamId: stream.id
          });
        } else {
          this.serviceLogger.debug('No data returned from stream', {
            streamId: stream.id
          });
        }
      } catch (error) {
        this.serviceLogger.error('Stream error occurred', {
          streamId: stream.id,
          streamType: stream.type
        }, error as Error);
        this.handleStreamError(stream, error);
      }
    }, intervalMs);
    
    this.streamIntervals.set(stream.id, interval);
    
    this.serviceLogger.info('Data stream started', {
      streamId: stream.id,
      interval: intervalMs
    });
  }

  /**
   * Stop a stream
   */
  private stopStream(streamId: string): void {
    const interval = this.streamIntervals.get(streamId);
    if (interval) {
      clearInterval(interval);
      this.streamIntervals.delete(streamId);
    }
    
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.status = 'stopped';
      this.activeStreams.set(streamId, stream);
    }
  }

  /**
   * Pause a stream
   */
  private pauseStream(streamId: string): void {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.status = 'paused';
      this.activeStreams.set(streamId, stream);
    }
  }

  /**
   * Resume a stream
   */
  private resumeStream(streamId: string): void {
    const stream = this.activeStreams.get(streamId);
    if (stream && stream.status === 'paused') {
      stream.status = 'active';
      this.activeStreams.set(streamId, stream);
    }
  }

  /**
   * Restart a stream with new configuration
   */
  private restartStream(streamId: string): void {
    this.stopStream(streamId);
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      setTimeout(() => this.startStream(stream), 1000);
    }
  }

  // ============================================================================
  // Data Fetching and Processing Methods
  // ============================================================================

  /**
   * Fetch stream data based on stream type
   */
  private async fetchStreamData(stream: DataStream): Promise<RealTimeUpdate | null> {
    const startTime = Date.now();
    
    this.serviceLogger.debug('Fetching stream data', {
      streamId: stream.id,
      streamType: stream.type,
      dataSource: stream.dataSource
    });
    
    try {
      let data: any = null;
      let source: 'hive' | 'sak' | 'mcp' | 'integration' = 'integration';
      
      switch (stream.type) {
        case 'blockchain':
          this.serviceLogger.debug('Fetching blockchain state via MCP', { streamId: stream.id });
          const blockchainResult = await this.seiIntegration.getMCPBlockchainState()();
          if (blockchainResult._tag === 'Right') {
            data = blockchainResult.right;
            source = 'mcp';
            this.serviceLogger.debug('Blockchain data fetched successfully', {
              streamId: stream.id,
              blockNumber: data.blockNumber
            });
          } else {
            this.serviceLogger.warn('Failed to fetch blockchain data', {
              streamId: stream.id,
              error: blockchainResult.left
            });
          }
          break;
          
        case 'wallet':
          if (stream.walletAddress) {
            this.serviceLogger.debug('Fetching wallet balance via MCP', {
              streamId: stream.id,
              walletAddress: stream.walletAddress
            });
            const walletResult = await this.seiIntegration.getMCPWalletBalance(stream.walletAddress)();
            if (walletResult._tag === 'Right') {
              data = walletResult.right;
              source = 'mcp';
              this.serviceLogger.debug('Wallet data fetched successfully', {
                streamId: stream.id,
                walletAddress: stream.walletAddress,
                totalBalance: data.totalValueUSD
              });
            } else {
              this.serviceLogger.warn('Failed to fetch wallet data', {
                streamId: stream.id,
                walletAddress: stream.walletAddress,
                error: walletResult.left
              });
            }
          }
          break;
          
        case 'portfolio':
          if (stream.walletAddress) {
            this.serviceLogger.debug('Fetching portfolio analysis via integration', {
              streamId: stream.id,
              walletAddress: stream.walletAddress
            });
            const portfolioResult = await this.seiIntegration.generateIntegratedAnalysis(stream.walletAddress)();
            if (portfolioResult._tag === 'Right') {
              data = portfolioResult.right;
              source = 'integration';
              this.serviceLogger.debug('Portfolio data fetched successfully', {
                streamId: stream.id,
                walletAddress: stream.walletAddress,
                powerLevel: data.synthesis?.dragonBallTheme?.powerLevel
              });
            } else {
              this.serviceLogger.warn('Failed to fetch portfolio data', {
                streamId: stream.id,
                walletAddress: stream.walletAddress,
                error: portfolioResult.left
              });
            }
          }
          break;
          
        case 'market':
          this.serviceLogger.debug('Fetching market analytics via Hive', { streamId: stream.id });
          const marketResult = await this.seiIntegration.getHiveAnalytics('current market conditions and trends')();
          if (marketResult._tag === 'Right') {
            data = marketResult.right;
            source = 'hive';
            this.serviceLogger.debug('Market data fetched successfully', {
              streamId: stream.id
            });
          } else {
            this.serviceLogger.warn('Failed to fetch market data', {
              streamId: stream.id,
              error: marketResult.left
            });
          }
          break;
      }
      
      if (!data) {
        this.serviceLogger.debug('No data available for stream', {
          streamId: stream.id,
          streamType: stream.type
        });
        return null;
      }
      
      const latency = Date.now() - startTime;
      const dataSize = JSON.stringify(data).length;
      const powerLevel = this.calculateDragonBallPowerLevel(data, stream.type);
      
      const update: RealTimeUpdate = {
        id: `update-${++this.sequenceNumber}`,
        timestamp: new Date(),
        type: this.mapStreamTypeToUpdateType(stream.type),
        walletAddress: stream.walletAddress,
        data,
        source,
        priority: this.mapStreamPriorityToUpdatePriority(stream.priority),
        metadata: {
          latency,
          dataSize,
          cached: false,
          sequenceNumber: this.sequenceNumber,
          correlationId: `${stream.id}-${this.sequenceNumber}`,
          dragonBallPowerLevel: powerLevel
        },
        validation: {
          verified: true,
          dataIntegrity: this.validateDataIntegrity(data, stream.type),
          checksum: this.generateDataChecksum(data)
        }
      };
      
      this.serviceLogger.info('Stream data fetched and update created', {
        updateId: update.id,
        streamId: stream.id,
        streamType: stream.type,
        latency,
        dataSize,
        powerLevel,
        priority: update.priority
      });
      
      return update;
    } catch (error) {
      this.serviceLogger.error('Error fetching stream data', {
        streamId: stream.id,
        streamType: stream.type,
        latency: Date.now() - startTime
      }, error as Error);
      throw error;
    }
  }

  /**
   * Process a real-time update
   */
  private async processUpdate(update: RealTimeUpdate): Promise<void> {
    this.serviceLogger.debug('Processing real-time update', {
      updateId: update.id,
      updateType: update.type,
      priority: update.priority,
      walletAddress: update.walletAddress,
      dataSize: update.metadata.dataSize,
      latency: update.metadata.latency
    });
    
    try {
      // Cache the update
      if (this.config.caching.enabled) {
        this.serviceLogger.debug('Caching update', { updateId: update.id });
        this.cacheUpdate(update);
      }
      
      // Validate update
      if (!this.validateUpdate(update)) {
        const error = new Error('Update validation failed');
        this.serviceLogger.error('Update validation failed', {
          updateId: update.id,
          updateType: update.type,
          validationResult: {
            hasId: !!update.id,
            hasTimestamp: !!update.timestamp,
            hasType: !!update.type,
            hasData: !!update.data,
            hasSource: !!update.source,
            hasPriority: !!update.priority,
            hasMetadata: !!update.metadata,
            hasValidation: !!update.validation
          }
        }, error);
        throw error;
      }
      
      // Send to socket service for real-time distribution
      if (update.walletAddress) {
        this.serviceLogger.debug('Distributing update via socket', {
          updateId: update.id,
          walletAddress: update.walletAddress,
          priority: update.priority
        });
        await this.distributePriorityUpdate(update);
      }
      
      // Emit update event
      this.emit(`update:${update.walletAddress}`, update);
      this.emit('realtime:update:processed', update);
      
      // Process any pending synchronization
      if (update.walletAddress) {
        await this.processPendingUpdates(update.walletAddress);
      }
      
      this.serviceLogger.debug('Update processed successfully', {
        updateId: update.id,
        updateType: update.type,
        processingTime: Date.now() - update.timestamp.getTime()
      });
      
    } catch (error) {
      this.serviceLogger.error('Error processing update', {
        updateId: update.id,
        updateType: update.type,
        walletAddress: update.walletAddress
      }, error as Error);
      
      this.emit('realtime:update:error', {
        update,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Distribute update based on priority
   */
  private async distributePriorityUpdate(update: RealTimeUpdate): Promise<void> {
    if (!update.walletAddress) return;
    
    const sendUpdate = async () => {
      await this.socketService.sendPortfolioUpdate(update.walletAddress!, {
        type: 'position_update',
        data: update.data,
        timestamp: update.timestamp.toISOString()
      })();
    };
    
    switch (update.priority) {
      case 'critical':
        // Immediate distribution
        await sendUpdate();
        break;
        
      case 'high':
        // Fast distribution
        setTimeout(sendUpdate, 100);
        break;
        
      case 'medium':
        // Standard distribution
        setTimeout(sendUpdate, 500);
        break;
        
      case 'low':
        // Batched distribution
        this.addToPendingUpdates(update);
        break;
    }
  }

  // ============================================================================
  // Data Synchronization Methods
  // ============================================================================

  /**
   * Perform data synchronization
   */
  private performDataSynchronization = (
    walletAddress: string,
    data: { blockchain: any; wallet: any; portfolio: any },
    options: any
  ): TE.TaskEither<RealTimeError, DataSynchronizationResult> =>
    TE.tryCatch(
      async () => {
        const startTime = Date.now();
        let conflictsResolved = 0;
        let dataPointsSynchronized = 0;
        const errors: any[] = [];
        
        try {
          // Synchronize blockchain data
          if (data.blockchain) {
            const syncResult = await this.synchronizeBlockchainData(data.blockchain);
            dataPointsSynchronized += syncResult.points;
            conflictsResolved += syncResult.conflicts;
          }
          
          // Synchronize wallet data
          if (data.wallet) {
            const syncResult = await this.synchronizeWalletData(walletAddress, data.wallet);
            dataPointsSynchronized += syncResult.points;
            conflictsResolved += syncResult.conflicts;
          }
          
          // Synchronize portfolio data
          if (data.portfolio) {
            const syncResult = await this.synchronizePortfolioData(walletAddress, data.portfolio);
            dataPointsSynchronized += syncResult.points;
            conflictsResolved += syncResult.conflicts;
          }
          
        } catch (error) {
          errors.push({
            source: 'synchronization',
            error: error.message,
            timestamp: new Date()
          });
        }
        
        const syncTime = Date.now() - startTime;
        
        return {
          success: errors.length === 0,
          conflictsResolved,
          dataPointsSynchronized,
          errors,
          performanceMetrics: {
            syncTime,
            memoryUsage: process.memoryUsage().heapUsed,
            cpuUsage: process.cpuUsage().user
          }
        };
      },
      error => this.createRealTimeError('SYNC_FAILED', `Data synchronization failed: ${error}`, 'sync')
    );

  // ============================================================================
  // Utility and Helper Methods
  // ============================================================================

  /**
   * Determine data source for stream type
   */
  private determineDataSource(type: string): 'hive' | 'sak' | 'mcp' | 'integration' {
    switch (type) {
      case 'blockchain':
      case 'wallet':
      case 'transactions':
        return 'mcp';
      case 'market':
        return 'hive';
      case 'portfolio':
        return 'integration';
      default:
        return 'integration';
    }
  }

  /**
   * Map stream type to update type
   */
  private mapStreamTypeToUpdateType(streamType: string): RealTimeUpdate['type'] {
    const mapping: Record<string, RealTimeUpdate['type']> = {
      blockchain: 'blockchain_state',
      wallet: 'wallet_balance',
      market: 'market_data',
      portfolio: 'portfolio_change',
      transactions: 'transaction_event'
    };
    return mapping[streamType] || 'portfolio_change';
  }

  /**
   * Map stream priority to update priority
   */
  private mapStreamPriorityToUpdatePriority(streamPriority: string): RealTimeUpdate['priority'] {
    const mapping: Record<string, RealTimeUpdate['priority']> = {
      high: 'critical',
      medium: 'medium',
      low: 'low'
    };
    return mapping[streamPriority] || 'medium';
  }

  /**
   * Calculate Dragon Ball power level based on data
   */
  private calculateDragonBallPowerLevel(data: any, streamType: string): number {
    switch (streamType) {
      case 'wallet':
        return (data.totalValueUSD || 0) * 100;
      case 'portfolio':
        return (data.synthesis?.dragonBallTheme?.powerLevel || 9000);
      case 'blockchain':
        return data.networkStatus === 'healthy' ? 9000 : 4500;
      default:
        return 9000;
    }
  }

  /**
   * Validate data integrity
   */
  private validateDataIntegrity(data: any, streamType: string): boolean {
    if (!data || typeof data !== 'object') return false;
    
    switch (streamType) {
      case 'blockchain':
        return !!(data.blockNumber && data.networkStatus);
      case 'wallet':
        return !!(data.address && data.balances);
      case 'portfolio':
        return !!(data.walletAddress && data.timestamp);
      default:
        return true;
    }
  }

  /**
   * Generate data checksum
   */
  private generateDataChecksum(data: any): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').substring(0, 16);
  }

  /**
   * Validate update
   */
  private validateUpdate(update: RealTimeUpdate): boolean {
    return !!(
      update.id &&
      update.timestamp &&
      update.type &&
      update.data &&
      update.source &&
      update.priority &&
      update.metadata &&
      update.validation
    );
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(type: string, walletAddress?: string): string {
    return `${type}:${walletAddress || 'global'}`;
  }

  /**
   * Cache update
   */
  private cacheUpdate(update: RealTimeUpdate): void {
    const key = this.generateCacheKey(update.type, update.walletAddress);
    const expiresAt = Date.now() + this.config.caching.defaultTTL;
    
    this.dataCache.set(key, {
      data: update.data,
      expiresAt,
      priority: update.priority
    });
    
    // Cleanup old cache entries
    this.cleanupCache();
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): { data: T; timestamp: number } | null {
    const entry = this.dataCache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.dataCache.delete(key);
      return null;
    }
    return { data: entry.data as T, timestamp: entry.expiresAt - this.config.caching.defaultTTL };
  }

  /**
   * Cleanup cache
   */
  private cleanupCache(): void {
    if (this.dataCache.size <= this.config.caching.maxCacheSize) return;
    
    const now = Date.now();
    Array.from(this.dataCache.entries()).forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        this.dataCache.delete(key);
      }
    });
    
    // If still over limit, remove oldest entries
    if (this.dataCache.size > this.config.caching.maxCacheSize) {
      const sortedEntries = Array.from(this.dataCache.entries())
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      
      const toRemove = this.dataCache.size - this.config.caching.maxCacheSize;
      for (let i = 0; i < toRemove; i++) {
        this.dataCache.delete(sortedEntries[i][0]);
      }
    }
  }

  // Additional helper methods for data fetching, stream management, etc.
  private fetchBlockchainData = (): TE.TaskEither<RealTimeError, any> =>
    pipe(
      this.seiIntegration.getMCPBlockchainState(),
      TE.mapLeft(error => this.createRealTimeError('BLOCKCHAIN_FETCH_FAILED', error.message, 'network'))
    );

  private fetchWalletData = (walletAddress: string): TE.TaskEither<RealTimeError, any> =>
    pipe(
      this.seiIntegration.getMCPWalletBalance(walletAddress),
      TE.mapLeft(error => this.createRealTimeError('WALLET_FETCH_FAILED', error.message, 'network'))
    );

  private fetchPortfolioData = (walletAddress: string): TE.TaskEither<RealTimeError, any> =>
    pipe(
      this.seiIntegration.generateIntegratedAnalysis(walletAddress),
      TE.mapLeft(error => this.createRealTimeError('PORTFOLIO_FETCH_FAILED', error.message, 'network'))
    );

  private fetchFreshData = <T>(type: string, walletAddress?: string): TE.TaskEither<RealTimeError, T> =>
    TE.tryCatch(
      async () => {
        switch (type) {
          case 'blockchain':
            const blockchainResult = await this.fetchBlockchainData()();
            return blockchainResult._tag === 'Right' ? blockchainResult.right : null;
          case 'wallet':
            if (!walletAddress) throw new Error('Wallet address required');
            const walletResult = await this.fetchWalletData(walletAddress)();
            return walletResult._tag === 'Right' ? walletResult.right : null;
          case 'portfolio':
            if (!walletAddress) throw new Error('Wallet address required');
            const portfolioResult = await this.fetchPortfolioData(walletAddress)();
            return portfolioResult._tag === 'Right' ? portfolioResult.right : null;
          default:
            throw new Error(`Unknown data type: ${type}`);
        }
      },
      error => this.createRealTimeError('FRESH_DATA_FETCH_FAILED', `Failed to fetch fresh data: ${error}`, 'network')
    );

  // Stream management helper methods
  private shouldSkipUpdate(stream: DataStream): boolean {
    // Skip if circuit breaker is open
    const breaker = this.circuitBreakers.get(stream.id);
    if (breaker?.state === 'open' && Date.now() < breaker.nextAttempt.getTime()) {
      return true;
    }
    
    // Skip if stream is paused or stopped
    if (stream.status !== 'active') {
      return true;
    }
    
    return false;
  }

  private updateStreamMetrics(stream: DataStream, success: boolean): void {
    stream.updateCount++;
    stream.lastUpdate = new Date();
    
    if (!success) {
      stream.errorCount++;
    }
    
    // Update performance metrics
    const metrics = this.performanceMetrics.get(stream.id) || {
      latencies: [],
      successCount: 0,
      errorCount: 0,
      lastUpdate: new Date()
    };
    
    if (success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }
    
    metrics.lastUpdate = new Date();
    this.performanceMetrics.set(stream.id, metrics);
    
    // Update stream performance metrics
    const total = metrics.successCount + metrics.errorCount;
    if (stream.metadata.performanceMetrics) {
      stream.metadata.performanceMetrics.successRate = (metrics.successCount / total) * 100;
    }
    
    this.activeStreams.set(stream.id, stream);
    
    this.serviceLogger.debug('Stream metrics updated', {
      streamId: stream.id,
      streamType: stream.type,
      success,
      updateCount: stream.updateCount,
      errorCount: stream.errorCount,
      successRate: stream.metadata.performanceMetrics?.successRate
    });
  }

  private handleStreamError(stream: DataStream, error: any): void {
    this.serviceLogger.error('Stream error occurred', {
      streamId: stream.id,
      streamType: stream.type,
      walletAddress: stream.walletAddress,
      errorCount: stream.errorCount + 1,
      updateCount: stream.updateCount
    }, error);
    
    this.updateStreamMetrics(stream, false);
    stream.metadata.lastError = error.message;
    
    // Update circuit breaker
    this.updateCircuitBreaker(stream.id, false);
    
    // Check if stream should be paused due to too many errors
    const errorRate = stream.errorCount / Math.max(stream.updateCount, 1);
    if (errorRate > 0.5 && stream.updateCount > 10) {
      this.serviceLogger.warn('Stream has high error rate, consider pausing', {
        streamId: stream.id,
        errorRate,
        errorCount: stream.errorCount,
        updateCount: stream.updateCount
      });
    }
    
    this.emit('realtime:stream:error', {
      streamId: stream.id,
      streamType: stream.type,
      error: error.message,
      timestamp: new Date()
    });
  }

  private updateCircuitBreaker(streamId: string, success: boolean): void {
    const breaker = this.circuitBreakers.get(streamId) || {
      state: 'closed',
      errorCount: 0,
      lastFailure: new Date(),
      nextAttempt: new Date()
    };
    
    if (success) {
      breaker.state = 'closed';
      breaker.errorCount = 0;
    } else {
      breaker.errorCount++;
      breaker.lastFailure = new Date();
      
      if (breaker.errorCount >= this.config.performance.circuitBreakerThreshold) {
        breaker.state = 'open';
        breaker.nextAttempt = new Date(Date.now() + 60000); // 1 minute
      }
    }
    
    this.circuitBreakers.set(streamId, breaker);
  }

  // Data synchronization helper methods
  private async synchronizeBlockchainData(data: any): Promise<{ points: number; conflicts: number }> {
    // Placeholder implementation // TODO: REMOVE_MOCK - Mock-related keywords
    return { points: 1, conflicts: 0 };
  }

  private async synchronizeWalletData(walletAddress: string, data: any): Promise<{ points: number; conflicts: number }> {
    // Placeholder implementation // TODO: REMOVE_MOCK - Mock-related keywords
    return { points: data.balances?.length || 0, conflicts: 0 };
  }

  private async synchronizePortfolioData(walletAddress: string, data: any): Promise<{ points: number; conflicts: number }> {
    // Placeholder implementation // TODO: REMOVE_MOCK - Mock-related keywords
    return { points: 1, conflicts: 0 };
  }

  // Performance monitoring methods
  private calculatePerformanceMetrics(walletAddress: string): any {
    const userStreams = Array.from(this.activeStreams.values())
      .filter(stream => stream.walletAddress === walletAddress);
    
    let totalLatency = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let latencyCount = 0;
    
    userStreams.forEach(stream => {
      const metrics = this.performanceMetrics.get(stream.id);
      if (metrics) {
        totalSuccess += metrics.successCount;
        totalErrors += metrics.errorCount;
        if (metrics.latencies.length > 0) {
          totalLatency += metrics.latencies.reduce((sum, lat) => sum + lat, 0);
          latencyCount += metrics.latencies.length;
        }
      }
    });
    
    const total = totalSuccess + totalErrors;
    
    return {
      avgLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
      successRate: total > 0 ? (totalSuccess / total) * 100 : 100,
      errorRate: total > 0 ? (totalErrors / total) * 100 : 0,
      throughput: total / Math.max(1, (Date.now() - this.startTime) / 1000) // Updates per second
    };
  }

  private generateAlerts(walletAddress: string, performance: any): any[] {
    const alerts: any[] = [];
    
    if (performance.errorRate > 20) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'warning',
        message: `High error rate detected: ${performance.errorRate.toFixed(1)}%`,
        timestamp: new Date()
      });
    }
    
    if (performance.avgLatency > 5000) {
      alerts.push({
        type: 'high_latency',
        severity: 'warning',
        message: `High average latency: ${performance.avgLatency.toFixed(0)}ms`,
        timestamp: new Date()
      });
    }
    
    return alerts;
  }

  private groupStreamsByType(streams: DataStream[]): Record<string, number> {
    return streams.reduce((acc, stream) => {
      acc[stream.type] = (acc[stream.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupStreamsByPriority(streams: DataStream[]): Record<string, number> {
    return streams.reduce((acc, stream) => {
      acc[stream.priority] = (acc[stream.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private validateStreamSetup = (streams: DataStream[]): TE.TaskEither<RealTimeError, void> =>
    TE.tryCatch(
      async () => {
        if (streams.length === 0) {
          throw new Error('No streams were created');
        }
        
        const activeStreams = streams.filter(s => s.status === 'active');
        if (activeStreams.length !== streams.length) {
          throw new Error('Some streams failed to activate');
        }
      },
      error => this.createRealTimeError('STREAM_VALIDATION_FAILED', `Stream validation failed: ${error}`, 'stream')
    );

  // Pending updates management
  private addToPendingUpdates(update: RealTimeUpdate): void {
    if (!update.walletAddress) return;
    
    const pending = this.pendingUpdates.get(update.walletAddress) || [];
    pending.push(update);
    this.pendingUpdates.set(update.walletAddress, pending);
    
    // Process in batches
    if (pending.length >= this.config.synchronization.batchSize) {
      this.processPendingUpdates(update.walletAddress);
    }
  }

  private async processPendingUpdates(walletAddress: string): Promise<void> {
    const pending = this.pendingUpdates.get(walletAddress);
    if (!pending || pending.length === 0) return;
    
    // Process batch
    for (const update of pending) {
      await this.socketService.sendPortfolioUpdate(walletAddress, {
        type: 'position_update',
        data: update.data,
        timestamp: update.timestamp.toISOString()
      })();
    }
    
    this.pendingUpdates.delete(walletAddress);
  }

  // Event handlers and initialization
  private setupRealTimeEventHandlers(): void {
    this.seiIntegration.on('integration:alert', (alert) => {
      this.emit('realtime:integration:alert', alert);
    });
    
    // Note: SocketService doesn't extend EventEmitter, so we'll handle disconnections differently
    // This would typically be handled by the socket connection management layer
  }

  private startTime = Date.now();
  
  private startPerformanceMonitoring(): void {
    // Performance monitoring interval
    setInterval(() => {
      this.emit('realtime:performance:update', {
        activeStreams: this.activeStreams.size,
        cacheSize: this.dataCache.size,
        pendingUpdates: Array.from(this.pendingUpdates.values()).reduce((sum, arr) => sum + arr.length, 0),
        timestamp: new Date()
      });
    }, 60000); // Every minute
  }

  private createRealTimeError(code: string, message: string, source: string, details?: any): RealTimeError {
    return {
      name: 'RealTimeError',
      code,
      message,
      source: source as any,
      severity: this.determineSeverity(code),
      details,
      timestamp: new Date(),
      recoverable: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT'].includes(code)
    };
  }

  private determineSeverity(code: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCodes = ['STREAM_INIT_FAILED', 'SYNC_FAILED'];
    const highCodes = ['STREAM_UPDATE_FAILED', 'VALIDATION_FAILED'];
    const mediumCodes = ['FETCH_FAILED', 'CACHE_ERROR'];
    
    if (criticalCodes.includes(code)) return 'critical';
    if (highCodes.includes(code)) return 'high';
    if (mediumCodes.includes(code)) return 'medium';
    return 'low';
  }

  private getDefaultConfig(): RealTimeConfig {
    return {
      dataStreams: {
        blockchain: { enabled: true, interval: 15000, priority: 'medium' },
        wallet: { enabled: true, interval: 30000, priority: 'high' },
        market: { enabled: true, interval: 60000, priority: 'medium' },
        portfolio: { enabled: true, interval: 45000, priority: 'high' },
        transactions: { enabled: true, realTime: true, priority: 'high' }
      },
      caching: {
        enabled: true,
        defaultTTL: 30000,
        maxCacheSize: 1000,
        compressionEnabled: false
      },
      synchronization: {
        batchSize: 10,
        maxDelay: 5000,
        conflictResolution: 'latest'
      },
      performance: {
        maxConcurrentStreams: 50,
        throttleThreshold: 100,
        circuitBreakerThreshold: 5
      },
      alerts: {
        enabled: true,
        criticalThresholds: {
          networkCongestion: 80,
          walletValueChange: 10,
          riskLevelChange: 25
        }
      }
    };
  }
}