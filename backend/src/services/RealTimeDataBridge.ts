import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import { Observable, Subject, BehaviorSubject, merge, combineLatest, from, timer, EMPTY } from 'rxjs';
import { 
  filter, 
  throttleTime, 
  distinctUntilChanged, 
  catchError, 
  retry, 
  tap, 
  map, 
  switchMap,
  shareReplay,
  startWith,
  takeUntil,
  scan,
  debounceTime
} from 'rxjs/operators';
import { EventEmitter } from 'events';

/**
 * RealTimeDataBridge - Bridge between WebSocket events and frontend updates
 * 
 * This service provides a functional bridge for real-time data streams,
 * implementing throttling, filtering, and stream management using RxJS
 * with fp-ts for error handling and functional composition.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface StreamConfig {
  throttleMs: number;
  retryAttempts: number;
  retryDelay: number;
  bufferSize?: number;
  distinctKey?: (data: any) => string;
}

export interface DataStreamEvent<T = any> {
  type: 'price' | 'portfolio' | 'transaction' | 'balance' | 'position' | 'risk';
  walletAddress: string;
  data: T;
  timestamp: Date;
  source: 'websocket' | 'polling' | 'cache';
  metadata?: {
    sequenceNumber?: number;
    latency?: number;
    priority?: 'high' | 'medium' | 'low';
  };
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
  lastUpdate: Date;
}

export interface PortfolioUpdate {
  walletAddress: string;
  totalValue: number;
  totalValueChange24h: number;
  positions: Array<{
    symbol: string;
    amount: number;
    value: number;
    change24h: number;
  }>;
  lastUpdate: Date;
}

export interface TransactionUpdate {
  hash: string;
  from: string;
  to: string;
  value: string;
  symbol: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations?: number;
  timestamp: Date;
}

export interface ConnectionHealth {
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  lastHeartbeat: Date;
  missedHeartbeats: number;
  latency: number;
  errors: number;
}

export interface StreamMetrics {
  eventsProcessed: number;
  eventsThrottled: number;
  eventsFiltered: number;
  averageLatency: number;
  errors: number;
  lastUpdate: Date;
}

export interface BridgeConfig {
  streams: {
    prices: StreamConfig;
    portfolio: StreamConfig;
    transactions: StreamConfig;
  };
  connectionTimeout: number;
  heartbeatInterval: number;
  maxReconnectAttempts: number;
  enableMetrics: boolean;
  enableLogging: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export class StreamError extends Error {
  constructor(
    public code: string,
    message: string,
    public streamType?: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'StreamError';
  }
}

// ============================================================================
// RealTimeDataBridge Implementation
// ============================================================================

export class RealTimeDataBridge extends EventEmitter {
  private config: BridgeConfig;
  
  // Stream subjects
  private priceSubject$ = new Subject<DataStreamEvent<PriceUpdate>>();
  private portfolioSubject$ = new Subject<DataStreamEvent<PortfolioUpdate>>();
  private transactionSubject$ = new Subject<DataStreamEvent<TransactionUpdate>>();
  private destroy$ = new Subject<void>();
  
  // Connection management
  private connectionHealth$ = new BehaviorSubject<ConnectionHealth>({
    status: 'disconnected',
    lastHeartbeat: new Date(),
    missedHeartbeats: 0,
    latency: 0,
    errors: 0
  });
  
  // Metrics tracking
  private metrics: Map<string, StreamMetrics> = new Map();
  
  // Active connections by wallet
  private activeConnections = new Map<string, Set<string>>();
  
  constructor(config?: Partial<BridgeConfig>) {
    super();
    this.config = this.mergeWithDefaultConfig(config);
    this.initializeMetrics();
    this.setupHealthMonitoring();
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Create a merged stream for all data types for a specific wallet
   */
  public createMergedStream(
    walletAddress: string,
    streamTypes: Array<'prices' | 'portfolio' | 'transactions'> = ['prices', 'portfolio', 'transactions'] // TODO: REMOVE_MOCK - Hard-coded array literals
  ): Observable<DataStreamEvent> {
    const streams: Observable<DataStreamEvent>[] = [];
    
    if (streamTypes.includes('prices')) {
      streams.push(this.createPriceStream(walletAddress));
    }
    
    if (streamTypes.includes('portfolio')) {
      streams.push(this.createPortfolioStream(walletAddress));
    }
    
    if (streamTypes.includes('transactions')) {
      streams.push(this.createTransactionStream(walletAddress));
    }
    
    return merge(...streams).pipe(
      filter(event => event.walletAddress === walletAddress),
      tap(event => this.updateMetrics(event.type, 'processed')),
      catchError(error => {
        this.handleStreamError(error, 'merged');
        return EMPTY;
      }),
      takeUntil(this.destroy$),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  /**
   * Create a price update stream with throttling
   */
  public createPriceStream(walletAddress: string): Observable<DataStreamEvent<PriceUpdate>> {
    const config = this.config.streams.prices;
    
    return this.priceSubject$.pipe(
      filter(event => event.walletAddress === walletAddress),
      throttleTime(config.throttleMs, undefined, { leading: true, trailing: true }),
      distinctUntilChanged((prev, curr) => 
        config.distinctKey ? config.distinctKey(prev.data) === config.distinctKey(curr.data) : false
      ),
      tap(() => this.updateMetrics('price', 'processed')),
      retry({
        count: config.retryAttempts,
        delay: config.retryDelay
      }),
      catchError(error => {
        this.handleStreamError(error, 'price');
        return EMPTY;
      }),
      takeUntil(this.destroy$),
      shareReplay({ 
        bufferSize: config.bufferSize || 1, 
        refCount: true 
      })
    );
  }

  /**
   * Create a portfolio update stream with throttling
   */
  public createPortfolioStream(walletAddress: string): Observable<DataStreamEvent<PortfolioUpdate>> {
    const config = this.config.streams.portfolio;
    
    return this.portfolioSubject$.pipe(
      filter(event => event.walletAddress === walletAddress),
      throttleTime(config.throttleMs, undefined, { leading: true, trailing: true }),
      distinctUntilChanged((prev, curr) => 
        JSON.stringify(prev.data.positions) === JSON.stringify(curr.data.positions)
      ),
      tap(() => this.updateMetrics('portfolio', 'processed')),
      retry({
        count: config.retryAttempts,
        delay: config.retryDelay
      }),
      catchError(error => {
        this.handleStreamError(error, 'portfolio');
        return EMPTY;
      }),
      takeUntil(this.destroy$),
      shareReplay({ 
        bufferSize: config.bufferSize || 1, 
        refCount: true 
      })
    );
  }

  /**
   * Create a transaction update stream with throttling
   */
  public createTransactionStream(walletAddress: string): Observable<DataStreamEvent<TransactionUpdate>> {
    const config = this.config.streams.transactions;
    
    return this.transactionSubject$.pipe(
      filter(event => 
        event.walletAddress === walletAddress ||
        event.data.from === walletAddress ||
        event.data.to === walletAddress
      ),
      throttleTime(config.throttleMs, undefined, { leading: true, trailing: true }),
      distinctUntilChanged((prev, curr) => prev.data.hash === curr.data.hash),
      tap(() => this.updateMetrics('transaction', 'processed')),
      retry({
        count: config.retryAttempts,
        delay: config.retryDelay
      }),
      catchError(error => {
        this.handleStreamError(error, 'transaction');
        return EMPTY;
      }),
      takeUntil(this.destroy$),
      shareReplay({ 
        bufferSize: config.bufferSize || 10, 
        refCount: true 
      })
    );
  }

  /**
   * Get connection health observable
   */
  public getConnectionHealth$(): Observable<ConnectionHealth> {
    return this.connectionHealth$.asObservable();
  }

  /**
   * Get stream metrics
   */
  public getStreamMetrics(streamType?: string): TE.TaskEither<Error, StreamMetrics | Map<string, StreamMetrics>> {
    return TE.tryCatch(
      async () => {
        if (streamType) {
          const metrics = this.metrics.get(streamType);
          if (!metrics) {
            throw new Error(`No metrics found for stream type: ${streamType}`);
          }
          return metrics;
        }
        return new Map(this.metrics);
      },
      error => new Error(`Failed to get metrics: ${error}`)
    );
  }

  /**
   * Emit a data event to the appropriate stream
   */
  public emitDataEvent<T>(event: DataStreamEvent<T>): TE.TaskEither<StreamError, void> {
    return pipe(
      this.validateEvent(event),
      TE.chain(() => {
        try {
          switch (event.type) {
            case 'price':
              this.priceSubject$.next(event as DataStreamEvent<PriceUpdate>);
              break;
            case 'portfolio':
              this.portfolioSubject$.next(event as DataStreamEvent<PortfolioUpdate>);
              break;
            case 'transaction':
              this.transactionSubject$.next(event as DataStreamEvent<TransactionUpdate>);
              break;
            default:
              return TE.left(new StreamError('INVALID_EVENT_TYPE', `Unknown event type: ${event.type}`));
          }
          
          this.updateConnectionHealth({ status: 'connected', lastHeartbeat: new Date() });
          return TE.right(undefined);
        } catch (error) {
          return TE.left(new StreamError('EMIT_FAILED', `Failed to emit event: ${error}`));
        }
      })
    );
  }

  /**
   * Register a connection for a wallet
   */
  public registerConnection(walletAddress: string, connectionId: string): TE.TaskEither<Error, void> {
    return TE.tryCatch(
      async () => {
        const connections = this.activeConnections.get(walletAddress) || new Set();
        connections.add(connectionId);
        this.activeConnections.set(walletAddress, connections);
        
        this.emit('connection:registered', { walletAddress, connectionId, timestamp: new Date() });
      },
      error => new Error(`Failed to register connection: ${error}`)
    );
  }

  /**
   * Unregister a connection for a wallet
   */
  public unregisterConnection(walletAddress: string, connectionId: string): TE.TaskEither<Error, void> {
    return TE.tryCatch(
      async () => {
        const connections = this.activeConnections.get(walletAddress);
        if (connections) {
          connections.delete(connectionId);
          if (connections.size === 0) {
            this.activeConnections.delete(walletAddress);
          }
        }
        
        this.emit('connection:unregistered', { walletAddress, connectionId, timestamp: new Date() });
      },
      error => new Error(`Failed to unregister connection: ${error}`)
    );
  }

  /**
   * Get active connections for a wallet
   */
  public getActiveConnections(walletAddress: string): number {
    return this.activeConnections.get(walletAddress)?.size || 0;
  }

  /**
   * Create a combined stream with aggregated data
   */
  public createAggregatedStream(
    walletAddress: string,
    aggregationInterval: number = 1000
  ): Observable<{
    prices: PriceUpdate[];
    portfolio: PortfolioUpdate | null;
    recentTransactions: TransactionUpdate[];
    timestamp: Date;
  }> {
    return combineLatest([
      this.createPriceStream(walletAddress).pipe(
        scan((acc, event) => {
          const prices = [...acc];
          const existingIndex = prices.findIndex(p => p.symbol === event.data.symbol);
          if (existingIndex >= 0) {
            prices[existingIndex] = event.data;
          } else {
            prices.push(event.data);
          }
          return prices;
        }, [] as PriceUpdate[]),
        startWith([])
      ),
      this.createPortfolioStream(walletAddress).pipe(
        map(event => event.data),
        startWith(null)
      ),
      this.createTransactionStream(walletAddress).pipe(
        scan((acc, event) => {
          const transactions = [event.data, ...acc].slice(0, 50); // Keep last 50
          return transactions;
        }, [] as TransactionUpdate[]),
        startWith([])
      )
    ]).pipe(
      debounceTime(aggregationInterval),
      map(([prices, portfolio, recentTransactions]) => ({
        prices,
        portfolio,
        recentTransactions,
        timestamp: new Date()
      })),
      catchError(error => {
        this.handleStreamError(error, 'aggregated');
        return EMPTY;
      }),
      takeUntil(this.destroy$),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  /**
   * Destroy the bridge and clean up resources
   */
  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.priceSubject$.complete();
    this.portfolioSubject$.complete();
    this.transactionSubject$.complete();
    this.connectionHealth$.complete();
    this.activeConnections.clear();
    this.removeAllListeners();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private mergeWithDefaultConfig(config?: Partial<BridgeConfig>): BridgeConfig {
    const defaultConfig: BridgeConfig = {
      streams: {
        prices: {
          throttleMs: 500,
          retryAttempts: 3,
          retryDelay: 1000,
          bufferSize: 1,
          distinctKey: (data: PriceUpdate) => data.symbol
        },
        portfolio: {
          throttleMs: 500,
          retryAttempts: 3,
          retryDelay: 1000,
          bufferSize: 1
        },
        transactions: {
          throttleMs: 500,
          retryAttempts: 3,
          retryDelay: 1000,
          bufferSize: 10
        }
      },
      connectionTimeout: 30000,
      heartbeatInterval: 10000,
      maxReconnectAttempts: 5,
      enableMetrics: true,
      enableLogging: true
    };

    return {
      ...defaultConfig,
      ...config,
      streams: {
        ...defaultConfig.streams,
        ...(config?.streams || {})
      }
    };
  }

  private initializeMetrics(): void {
    const streamTypes = ['price', 'portfolio', 'transaction', 'merged', 'aggregated']; // TODO: REMOVE_MOCK - Hard-coded array literals
    
    streamTypes.forEach(type => {
      this.metrics.set(type, {
        eventsProcessed: 0,
        eventsThrottled: 0,
        eventsFiltered: 0,
        averageLatency: 0,
        errors: 0,
        lastUpdate: new Date()
      });
    });
  }

  private setupHealthMonitoring(): void {
    // Heartbeat monitoring
    timer(0, this.config.heartbeatInterval).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const health = this.connectionHealth$.value;
      const timeSinceLastHeartbeat = Date.now() - health.lastHeartbeat.getTime();
      
      if (timeSinceLastHeartbeat > this.config.connectionTimeout) {
        this.updateConnectionHealth({
          status: 'disconnected',
          missedHeartbeats: health.missedHeartbeats + 1
        });
      }
    });
  }

  private validateEvent<T>(event: DataStreamEvent<T>): TE.TaskEither<StreamError, void> {
    return TE.tryCatch(
      async () => {
        if (!event.type || !event.walletAddress || !event.data) {
          throw new Error('Invalid event structure');
        }
        
        if (!event.timestamp || !(event.timestamp instanceof Date)) {
          throw new Error('Invalid or missing timestamp');
        }
        
        // Validate specific event types
        switch (event.type) {
          case 'price':
            this.validatePriceUpdate(event.data as any);
            break;
          case 'portfolio':
            this.validatePortfolioUpdate(event.data as any);
            break;
          case 'transaction':
            this.validateTransactionUpdate(event.data as any);
            break;
        }
      },
      error => new StreamError('VALIDATION_FAILED', `Event validation failed: ${error}`, event.type)
    );
  }

  private validatePriceUpdate(data: PriceUpdate): void {
    if (!data.symbol || typeof data.price !== 'number' || data.price < 0) {
      throw new Error('Invalid price update data');
    }
  }

  private validatePortfolioUpdate(data: PortfolioUpdate): void {
    if (!data.walletAddress || typeof data.totalValue !== 'number' || !Array.isArray(data.positions)) {
      throw new Error('Invalid portfolio update data');
    }
  }

  private validateTransactionUpdate(data: TransactionUpdate): void {
    if (!data.hash || !data.from || !data.to || !data.status) {
      throw new Error('Invalid transaction update data');
    }
  }

  private updateMetrics(streamType: string, action: 'processed' | 'throttled' | 'filtered' | 'error'): void {
    if (!this.config.enableMetrics) return;
    
    const metrics = this.metrics.get(streamType);
    if (!metrics) return;
    
    switch (action) {
      case 'processed':
        metrics.eventsProcessed++;
        break;
      case 'throttled':
        metrics.eventsThrottled++;
        break;
      case 'filtered':
        metrics.eventsFiltered++;
        break;
      case 'error':
        metrics.errors++;
        break;
    }
    
    metrics.lastUpdate = new Date();
    this.metrics.set(streamType, metrics);
  }

  private updateConnectionHealth(updates: Partial<ConnectionHealth>): void {
    const currentHealth = this.connectionHealth$.value;
    this.connectionHealth$.next({
      ...currentHealth,
      ...updates
    });
  }

  private handleStreamError(error: any, streamType: string): void {
    this.updateMetrics(streamType, 'error');
    this.updateConnectionHealth({
      errors: this.connectionHealth$.value.errors + 1
    });
    
    if (this.config.enableLogging) {
      console.error(`Stream error in ${streamType}:`, error);
    }
    
    this.emit('stream:error', {
      streamType,
      error,
      timestamp: new Date(),
      recoverable: error instanceof StreamError ? error.recoverable : true
    });
  }
}

// ============================================================================
// Functional Utilities
// ============================================================================

/**
 * Create a throttled stream from TaskEither events
 */
export const createThrottledStream = <T>(
  source$: Observable<TE.TaskEither<Error, T>>,
  throttleMs: number
): Observable<T> => {
  return source$.pipe(
    throttleTime(throttleMs, undefined, { leading: true, trailing: true }),
    switchMap(task => from(task())),
    filter(E.isRight),
    map(either => either.right),
    catchError(() => EMPTY)
  );
};

/**
 * Merge multiple TaskEither streams with error handling
 */
export const mergeTaskEitherStreams = <T>(
  streams: Array<Observable<TE.TaskEither<Error, T>>>
): Observable<T> => {
  return merge(...streams).pipe(
    switchMap(task => from(task())),
    filter(E.isRight),
    map(either => either.right),
    catchError(error => {
      console.error('Stream merge error:', error);
      return EMPTY;
    })
  );
};

/**
 * Create a filtered stream by wallet address
 */
export const filterByWallet = <T extends { walletAddress: string }>(
  source$: Observable<T>,
  walletAddress: string
): Observable<T> => {
  return source$.pipe(
    filter(event => event.walletAddress === walletAddress)
  );
};

/**
 * Create a retry strategy for stream errors
 */
export const createRetryStrategy = (maxRetries: number, delayMs: number) => ({
  count: maxRetries,
  delay: delayMs,
  resetOnSuccess: true
});