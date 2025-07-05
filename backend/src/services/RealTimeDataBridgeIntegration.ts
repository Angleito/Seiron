import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { Subscription } from 'rxjs';
import { RealTimeDataBridge, DataStreamEvent, PriceUpdate, PortfolioUpdate, TransactionUpdate } from './RealTimeDataBridge';
import { SocketService } from './SocketService';
import { RealTimeDataService, RealTimeUpdate } from './RealTimeDataService';

/**
 * RealTimeDataBridgeIntegration - Integrates RealTimeDataBridge with existing services
 * 
 * This integration layer connects the RxJS-based RealTimeDataBridge with the
 * existing SocketService and RealTimeDataService, providing a seamless bridge
 * between WebSocket events and throttled frontend updates.
 */

export class RealTimeDataBridgeIntegration {
  private bridge: RealTimeDataBridge;
  private socketService: SocketService;
  private realTimeDataService: RealTimeDataService;
  private subscriptions: Map<string, Subscription[]> = new Map();
  
  constructor(
    socketService: SocketService,
    realTimeDataService: RealTimeDataService,
    bridgeConfig?: {
      priceThrottleMs?: number;
      portfolioThrottleMs?: number;
      transactionThrottleMs?: number;
    }
  ) {
    this.socketService = socketService;
    this.realTimeDataService = realTimeDataService;
    
    // Initialize bridge with custom throttle settings
    this.bridge = new RealTimeDataBridge({
      streams: {
        prices: {
          throttleMs: bridgeConfig?.priceThrottleMs || 500,
          retryAttempts: 3,
          retryDelay: 1000,
          bufferSize: 1,
          distinctKey: (data: PriceUpdate) => data.symbol
        },
        portfolio: {
          throttleMs: bridgeConfig?.portfolioThrottleMs || 500,
          retryAttempts: 3,
          retryDelay: 1000,
          bufferSize: 1
        },
        transactions: {
          throttleMs: bridgeConfig?.transactionThrottleMs || 500,
          retryAttempts: 3,
          retryDelay: 1000,
          bufferSize: 10
        }
      },
      enableMetrics: true,
      enableLogging: true
    });
    
    this.setupEventListeners();
  }

  /**
   * Start real-time streams for a wallet address
   */
  public startWalletStreams = (
    walletAddress: string,
    connectionId: string
  ): TE.TaskEither<Error, void> =>
    pipe(
      // Register connection
      this.bridge.registerConnection(walletAddress, connectionId),
      TE.chain(() => {
        // Create subscriptions for different stream types
        const subscriptions: Subscription[] = [];
        
        // Price stream subscription
        const priceStreamSub = this.bridge.createPriceStream(walletAddress)
          .subscribe({
            next: (event) => this.handlePriceUpdate(walletAddress, event),
            error: (error) => console.error('Price stream error:', error)
          });
        subscriptions.push(priceStreamSub);
        
        // Portfolio stream subscription
        const portfolioStreamSub = this.bridge.createPortfolioStream(walletAddress)
          .subscribe({
            next: (event) => this.handlePortfolioUpdate(walletAddress, event),
            error: (error) => console.error('Portfolio stream error:', error)
          });
        subscriptions.push(portfolioStreamSub);
        
        // Transaction stream subscription
        const transactionStreamSub = this.bridge.createTransactionStream(walletAddress)
          .subscribe({
            next: (event) => this.handleTransactionUpdate(walletAddress, event),
            error: (error) => console.error('Transaction stream error:', error)
          });
        subscriptions.push(transactionStreamSub);
        
        // Aggregated stream for comprehensive updates
        const aggregatedStreamSub = this.bridge.createAggregatedStream(walletAddress, 1000)
          .subscribe({
            next: (aggregated) => this.handleAggregatedUpdate(walletAddress, aggregated),
            error: (error) => console.error('Aggregated stream error:', error)
          });
        subscriptions.push(aggregatedStreamSub);
        
        // Store subscriptions
        this.subscriptions.set(walletAddress, subscriptions);
        
        return TE.right(undefined);
      })
    );

  /**
   * Stop real-time streams for a wallet address
   */
  public stopWalletStreams = (
    walletAddress: string,
    connectionId: string
  ): TE.TaskEither<Error, void> =>
    pipe(
      // Unregister connection
      this.bridge.unregisterConnection(walletAddress, connectionId),
      TE.chain(() => {
        // Check if this was the last connection
        if (this.bridge.getActiveConnections(walletAddress) === 0) {
          // Unsubscribe all streams
          const subscriptions = this.subscriptions.get(walletAddress);
          if (subscriptions) {
            subscriptions.forEach(sub => sub.unsubscribe());
            this.subscriptions.delete(walletAddress);
          }
        }
        
        return TE.right(undefined);
      })
    );

  /**
   * Forward RealTimeDataService updates to the bridge
   */
  public forwardRealTimeUpdate = (update: RealTimeUpdate): TE.TaskEither<Error, void> => {
    // Convert RealTimeUpdate to DataStreamEvent
    const eventType = this.mapUpdateTypeToStreamType(update.type);
    if (!eventType) {
      return TE.right(undefined); // Skip unsupported types
    }
    
    const streamEvent: DataStreamEvent = {
      type: eventType,
      walletAddress: update.walletAddress || '',
      data: update.data,
      timestamp: update.timestamp,
      source: 'websocket',
      metadata: {
        sequenceNumber: update.metadata.sequenceNumber,
        latency: update.metadata.latency,
        priority: update.priority === 'critical' ? 'high' : 
                 update.priority === 'high' ? 'high' :
                 update.priority === 'medium' ? 'medium' : 'low'
      }
    };
    
    return pipe(
      this.bridge.emitDataEvent(streamEvent),
      TE.mapLeft(error => new Error(error.message))
    );
  };

  /**
   * Get stream metrics for monitoring
   */
  public getStreamMetrics = () => this.bridge.getStreamMetrics();

  /**
   * Get connection health
   */
  public getConnectionHealth$ = () => this.bridge.getConnectionHealth$();

  /**
   * Cleanup and destroy integration
   */
  public destroy(): void {
    // Unsubscribe all active subscriptions
    for (const [walletAddress, subscriptions] of this.subscriptions.entries()) {
      subscriptions.forEach(sub => sub.unsubscribe());
    }
    this.subscriptions.clear();
    
    // Destroy bridge
    this.bridge.destroy();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private setupEventListeners(): void {
    // Listen to RealTimeDataService updates
    this.realTimeDataService.on('realtime:update:processed', (update: RealTimeUpdate) => {
      this.forwardRealTimeUpdate(update);
    });
    
    // Listen to bridge events for logging
    this.bridge.on('connection:registered', (event) => {
      console.log('Bridge connection registered:', event);
    });
    
    this.bridge.on('connection:unregistered', (event) => {
      console.log('Bridge connection unregistered:', event);
    });
    
    this.bridge.on('stream:error', (event) => {
      console.error('Bridge stream error:', event);
    });
  }

  private handlePriceUpdate(walletAddress: string, event: DataStreamEvent<PriceUpdate>): void {
    // Forward to socket service
    this.socketService.sendPortfolioUpdate(walletAddress, {
      type: 'position_update',
      data: {
        updateType: 'price',
        symbol: event.data.symbol,
        price: event.data.price,
        change24h: event.data.change24h,
        volume24h: event.data.volume24h,
        timestamp: event.timestamp
      },
      timestamp: event.timestamp.toISOString()
    });
  }

  private handlePortfolioUpdate(walletAddress: string, event: DataStreamEvent<PortfolioUpdate>): void {
    // Forward to socket service
    this.socketService.sendPortfolioUpdate(walletAddress, {
      type: 'balance_change',
      data: {
        totalValue: event.data.totalValue,
        totalValueChange24h: event.data.totalValueChange24h,
        positions: event.data.positions,
        timestamp: event.timestamp
      },
      timestamp: event.timestamp.toISOString()
    });
  }

  private handleTransactionUpdate(walletAddress: string, event: DataStreamEvent<TransactionUpdate>): void {
    // Forward to socket service
    this.socketService.sendTransactionUpdate(
      walletAddress,
      event.data.hash,
      event.data.status,
      {
        from: event.data.from,
        to: event.data.to,
        value: event.data.value,
        symbol: event.data.symbol,
        confirmations: event.data.confirmations,
        timestamp: event.data.timestamp
      }
    );
  }

  private handleAggregatedUpdate(
    walletAddress: string, 
    aggregated: {
      prices: PriceUpdate[];
      portfolio: PortfolioUpdate | null;
      recentTransactions: TransactionUpdate[];
      timestamp: Date;
    }
  ): void {
    // Send comprehensive update
    this.socketService.sendPortfolioUpdate(walletAddress, {
      type: 'position_update',
      data: {
        updateType: 'aggregated',
        prices: aggregated.prices,
        portfolio: aggregated.portfolio,
        recentTransactions: aggregated.recentTransactions,
        timestamp: aggregated.timestamp
      },
      timestamp: aggregated.timestamp.toISOString()
    });
  }

  private mapUpdateTypeToStreamType(
    updateType: string
  ): 'price' | 'portfolio' | 'transaction' | null {
    switch (updateType) {
      case 'market_data':
        return 'price';
      case 'portfolio_change':
      case 'wallet_balance':
        return 'portfolio';
      case 'transaction_event':
        return 'transaction';
      default:
        return null;
    }
  }
}

// ============================================================================
// Usage Example
// ============================================================================

export const createRealTimeDataBridgeIntegration = (
  socketService: SocketService,
  realTimeDataService: RealTimeDataService
): RealTimeDataBridgeIntegration => {
  return new RealTimeDataBridgeIntegration(socketService, realTimeDataService, {
    priceThrottleMs: 500,
    portfolioThrottleMs: 500,
    transactionThrottleMs: 500
  });
};

// Example integration in server setup:
/*
const bridgeIntegration = createRealTimeDataBridgeIntegration(
  socketService,
  realTimeDataService
);

// On user connection
io.on('connection', (socket) => {
  const walletAddress = socket.handshake.auth.walletAddress;
  
  if (walletAddress) {
    // Start streams
    bridgeIntegration.startWalletStreams(walletAddress, socket.id)();
    
    // On disconnect
    socket.on('disconnect', () => {
      bridgeIntegration.stopWalletStreams(walletAddress, socket.id)();
    });
  }
});

// Monitor health
bridgeIntegration.getConnectionHealth$().subscribe(health => {
  console.log('Bridge health:', health);
});

// Get metrics periodically
setInterval(async () => {
  const metricsResult = await bridgeIntegration.getStreamMetrics()();
  if (E.isRight(metricsResult)) {
    console.log('Stream metrics:', metricsResult.right);
  }
}, 60000);
*/