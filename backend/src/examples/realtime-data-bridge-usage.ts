import { RealTimeDataBridge, DataStreamEvent, PriceUpdate, PortfolioUpdate, TransactionUpdate } from '../services/RealTimeDataBridge';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import { Subscription } from 'rxjs';

/**
 * RealTimeDataBridge Usage Examples
 * 
 * This file demonstrates various usage patterns for the RealTimeDataBridge,
 * including stream creation, filtering, throttling, and error handling.
 */

// ============================================================================
// Example 1: Basic Stream Setup
// ============================================================================

async function basicStreamExample() {
  console.log('=== Basic Stream Example ===');
  
  // Create bridge with default settings
  const bridge = new RealTimeDataBridge();
  
  const walletAddress = '0x1234567890abcdef';
  const connectionId = 'conn-123';
  
  // Register connection
  const registerResult = await bridge.registerConnection(walletAddress, connectionId)();
  if (E.isLeft(registerResult)) {
    console.error('Failed to register connection:', registerResult.left);
    return;
  }
  
  // Create individual streams
  const priceStream$ = bridge.createPriceStream(walletAddress);
  const portfolioStream$ = bridge.createPortfolioStream(walletAddress);
  const transactionStream$ = bridge.createTransactionStream(walletAddress);
  
  // Subscribe to streams
  const subscriptions: Subscription[] = [];
  
  subscriptions.push(
    priceStream$.subscribe({
      next: (event) => console.log('Price update:', event.data),
      error: (error) => console.error('Price stream error:', error),
      complete: () => console.log('Price stream completed')
    })
  );
  
  subscriptions.push(
    portfolioStream$.subscribe({
      next: (event) => console.log('Portfolio update:', event.data),
      error: (error) => console.error('Portfolio stream error:', error)
    })
  );
  
  subscriptions.push(
    transactionStream$.subscribe({
      next: (event) => console.log('Transaction update:', event.data),
      error: (error) => console.error('Transaction stream error:', error)
    })
  );
  
  // Emit some test events
  const priceEvent: DataStreamEvent<PriceUpdate> = {
    type: 'price',
    walletAddress,
    data: {
      symbol: 'SEI',
      price: 0.75,
      change24h: 5.2,
      volume24h: 10000000,
      marketCap: 1000000000,
      lastUpdate: new Date()
    },
    timestamp: new Date(),
    source: 'websocket'
  };
  
  await bridge.emitDataEvent(priceEvent)();
  
  // Cleanup after 5 seconds
  setTimeout(() => {
    subscriptions.forEach(sub => sub.unsubscribe());
    bridge.destroy();
    console.log('Basic example cleanup complete');
  }, 5000);
}

// ============================================================================
// Example 2: Merged Stream with Throttling
// ============================================================================

async function mergedStreamExample() {
  console.log('\n=== Merged Stream Example ===');
  
  // Create bridge with custom throttle settings
  const bridge = new RealTimeDataBridge({
    streams: {
      prices: {
        throttleMs: 1000, // 1 second throttle
        retryAttempts: 3,
        retryDelay: 500
      },
      portfolio: {
        throttleMs: 2000, // 2 second throttle
        retryAttempts: 3,
        retryDelay: 500
      },
      transactions: {
        throttleMs: 500, // 500ms throttle
        retryAttempts: 3,
        retryDelay: 500
      }
    }
  });
  
  const walletAddress = '0xabcdef1234567890';
  
  // Create merged stream
  const mergedStream$ = bridge.createMergedStream(walletAddress);
  
  const subscription = mergedStream$.subscribe({
    next: (event) => {
      console.log(`[${event.type}] Update received:`, {
        timestamp: event.timestamp,
        data: event.data
      });
    },
    error: (error) => console.error('Merged stream error:', error)
  });
  
  // Simulate rapid updates to demonstrate throttling
  console.log('Emitting rapid price updates...');
  for (let i = 0; i < 10; i++) {
    const priceEvent: DataStreamEvent<PriceUpdate> = {
      type: 'price',
      walletAddress,
      data: {
        symbol: 'SEI',
        price: 0.75 + (i * 0.01),
        change24h: 5.2 + i,
        volume24h: 10000000 + (i * 100000),
        lastUpdate: new Date()
      },
      timestamp: new Date(),
      source: 'websocket'
    };
    
    await bridge.emitDataEvent(priceEvent)();
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms between events
  }
  
  // Cleanup after 5 seconds
  setTimeout(() => {
    subscription.unsubscribe();
    bridge.destroy();
    console.log('Merged example cleanup complete');
  }, 5000);
}

// ============================================================================
// Example 3: Aggregated Stream for Dashboard
// ============================================================================

async function aggregatedStreamExample() {
  console.log('\n=== Aggregated Stream Example ===');
  
  const bridge = new RealTimeDataBridge();
  const walletAddress = '0x9876543210fedcba';
  
  // Create aggregated stream with 2 second aggregation interval
  const aggregatedStream$ = bridge.createAggregatedStream(walletAddress, 2000);
  
  const subscription = aggregatedStream$.subscribe({
    next: (aggregated) => {
      console.log('Aggregated update received:');
      console.log('- Prices:', aggregated.prices.map(p => `${p.symbol}: $${p.price}`));
      console.log('- Portfolio value:', aggregated.portfolio?.totalValue || 'N/A');
      console.log('- Recent transactions:', aggregated.recentTransactions.length);
      console.log('- Timestamp:', aggregated.timestamp);
      console.log('---');
    },
    error: (error) => console.error('Aggregated stream error:', error)
  });
  
  // Emit various updates
  const symbols = ['SEI', 'BTC', 'ETH']; // TODO: REMOVE_MOCK - Hard-coded array literals
  
  // Price updates
  for (const symbol of symbols) {
    const priceEvent: DataStreamEvent<PriceUpdate> = {
      type: 'price',
      walletAddress,
      data: {
        symbol,
        price: Math.random() * 1000, // TODO: REMOVE_MOCK - Random value generation
        change24h: (Math.random() - 0.5) * 20, // TODO: REMOVE_MOCK - Random value generation
        volume24h: Math.random() * 10000000, // TODO: REMOVE_MOCK - Random value generation
        lastUpdate: new Date()
      },
      timestamp: new Date(),
      source: 'websocket'
    };
    
    await bridge.emitDataEvent(priceEvent)();
  }
  
  // Portfolio update
  const portfolioEvent: DataStreamEvent<PortfolioUpdate> = {
    type: 'portfolio',
    walletAddress,
    data: {
      walletAddress,
      totalValue: 50000,
      totalValueChange24h: 2500,
      positions: symbols.map(symbol => ({
        symbol,
        amount: Math.random() * 100, // TODO: REMOVE_MOCK - Random value generation
        value: Math.random() * 20000, // TODO: REMOVE_MOCK - Random value generation
        change24h: (Math.random() - 0.5) * 10 // TODO: REMOVE_MOCK - Random value generation
      })),
      lastUpdate: new Date()
    },
    timestamp: new Date(),
    source: 'websocket'
  };
  
  await bridge.emitDataEvent(portfolioEvent)();
  
  // Transaction updates
  for (let i = 0; i < 3; i++) {
    const txEvent: DataStreamEvent<TransactionUpdate> = {
      type: 'transaction',
      walletAddress,
      data: {
        hash: `0x${Math.random().toString(16).substring(2, 10)}`, // TODO: REMOVE_MOCK - Random value generation
        from: i % 2 === 0 ? walletAddress : '0x' + Math.random().toString(16).substring(2, 10), // TODO: REMOVE_MOCK - Random value generation
        to: i % 2 === 1 ? walletAddress : '0x' + Math.random().toString(16).substring(2, 10), // TODO: REMOVE_MOCK - Random value generation
        value: (Math.random() * 1000).toFixed(2), // TODO: REMOVE_MOCK - Random value generation
        symbol: symbols[i % symbols.length],
        status: i === 0 ? 'pending' : 'confirmed',
        confirmations: i === 0 ? 0 : Math.floor(Math.random() * 10), // TODO: REMOVE_MOCK - Random value generation
        timestamp: new Date()
      },
      timestamp: new Date(),
      source: 'websocket'
    };
    
    await bridge.emitDataEvent(txEvent)();
  }
  
  // Cleanup after 10 seconds
  setTimeout(() => {
    subscription.unsubscribe();
    bridge.destroy();
    console.log('Aggregated example cleanup complete');
  }, 10000);
}

// ============================================================================
// Example 4: Error Handling and Recovery
// ============================================================================

async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');
  
  const bridge = new RealTimeDataBridge({
    streams: {
      prices: {
        throttleMs: 500,
        retryAttempts: 3,
        retryDelay: 1000
      },
      portfolio: {
        throttleMs: 500,
        retryAttempts: 3,
        retryDelay: 1000
      },
      transactions: {
        throttleMs: 500,
        retryAttempts: 3,
        retryDelay: 1000
      }
    },
    enableLogging: true
  });
  
  const walletAddress = '0xfedcba0987654321';
  
  // Listen to error events
  bridge.on('stream:error', (error) => {
    console.log('Stream error event:', error);
  });
  
  // Create stream with error handling
  const priceStream$ = bridge.createPriceStream(walletAddress);
  
  const subscription = priceStream$.subscribe({
    next: (event) => console.log('Price received:', event.data.symbol, event.data.price),
    error: (error) => console.error('Stream error:', error),
    complete: () => console.log('Stream completed')
  });
  
  // Emit valid event
  const validEvent: DataStreamEvent<PriceUpdate> = {
    type: 'price',
    walletAddress,
    data: {
      symbol: 'SEI',
      price: 0.75,
      change24h: 5.2,
      volume24h: 10000000,
      lastUpdate: new Date()
    },
    timestamp: new Date(),
    source: 'websocket'
  };
  
  const validResult = await bridge.emitDataEvent(validEvent)();
  console.log('Valid event result:', E.isRight(validResult) ? 'Success' : 'Failed');
  
  // Emit invalid event (missing required fields)
  const invalidEvent: DataStreamEvent<any> = {
    type: 'price',
    walletAddress,
    data: {
      symbol: 'SEI',
      // Missing price field
      change24h: 5.2,
      volume24h: 10000000,
      lastUpdate: new Date()
    },
    timestamp: new Date(),
    source: 'websocket'
  };
  
  const invalidResult = await bridge.emitDataEvent(invalidEvent)();
  if (E.isLeft(invalidResult)) {
    console.log('Invalid event error:', invalidResult.left.code, invalidResult.left.message);
  }
  
  // Cleanup
  setTimeout(() => {
    subscription.unsubscribe();
    bridge.destroy();
    console.log('Error handling example cleanup complete');
  }, 3000);
}

// ============================================================================
// Example 5: Metrics and Monitoring
// ============================================================================

async function metricsExample() {
  console.log('\n=== Metrics and Monitoring Example ===');
  
  const bridge = new RealTimeDataBridge({
    enableMetrics: true,
    enableLogging: true
  });
  
  const walletAddress = '0x1111222233334444';
  
  // Monitor connection health
  const healthSubscription = bridge.getConnectionHealth$().subscribe(health => {
    console.log('Connection health:', {
      status: health.status,
      latency: `${health.latency}ms`,
      errors: health.errors
    });
  });
  
  // Create streams
  const priceStream$ = bridge.createPriceStream(walletAddress);
  const streamSubscription = priceStream$.subscribe(() => {});
  
  // Emit multiple events
  for (let i = 0; i < 20; i++) {
    const event: DataStreamEvent<PriceUpdate> = {
      type: 'price',
      walletAddress,
      data: {
        symbol: ['SEI', 'BTC', 'ETH'][i % 3], // TODO: REMOVE_MOCK - Hard-coded array literals
        price: Math.random() * 1000, // TODO: REMOVE_MOCK - Random value generation
        change24h: (Math.random() - 0.5) * 20, // TODO: REMOVE_MOCK - Random value generation
        volume24h: Math.random() * 10000000, // TODO: REMOVE_MOCK - Random value generation
        lastUpdate: new Date()
      },
      timestamp: new Date(),
      source: 'websocket',
      metadata: {
        latency: Math.random() * 100, // TODO: REMOVE_MOCK - Random value generation
        priority: i % 3 === 0 ? 'high' : 'medium'
      }
    };
    
    await bridge.emitDataEvent(event)();
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Get metrics
  const metricsResult = await bridge.getStreamMetrics()();
  if (E.isRight(metricsResult)) {
    const allMetrics = metricsResult.right as Map<string, any>;
    console.log('\nStream Metrics:');
    for (const [streamType, metrics] of allMetrics.entries()) {
      console.log(`${streamType}:`, {
        processed: metrics.eventsProcessed,
        throttled: metrics.eventsThrottled,
        errors: metrics.errors,
        lastUpdate: metrics.lastUpdate
      });
    }
  }
  
  // Get specific stream metrics
  const priceMetricsResult = await bridge.getStreamMetrics('price')();
  if (E.isRight(priceMetricsResult)) {
    console.log('\nPrice stream metrics:', priceMetricsResult.right);
  }
  
  // Cleanup
  setTimeout(() => {
    healthSubscription.unsubscribe();
    streamSubscription.unsubscribe();
    bridge.destroy();
    console.log('Metrics example cleanup complete');
  }, 3000);
}

// ============================================================================
// Run Examples
// ============================================================================

async function runExamples() {
  console.log('Starting RealTimeDataBridge Examples...\n');
  
  // Run examples sequentially
  await basicStreamExample();
  await new Promise(resolve => setTimeout(resolve, 6000));
  
  await mergedStreamExample();
  await new Promise(resolve => setTimeout(resolve, 6000));
  
  await aggregatedStreamExample();
  await new Promise(resolve => setTimeout(resolve, 11000));
  
  await errorHandlingExample();
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  await metricsExample();
  
  console.log('\nAll examples completed!');
}

// Uncomment to run examples
// runExamples().catch(console.error);