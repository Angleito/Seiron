/**
 * Usage Examples for Functional Market Data Collector
 * Demonstrates composable data fetching and processing patterns
 */

import {
  collectPriceData,
  collectVolumeMetrics,
  collectOHLCVData,
  collectMarketDepth,
  collectVolatilityMetrics,
  createMarketDataStream,
  createMarketPipeline,
  withFallback,
  combineDataSources,
} from '../src/collectors/market.js';

import type {
  TimeRange,
  PriceData,
  CollectionParams,
  StreamConfig,
} from '../src/types/market.js';

import { isRight, fold } from '../src/utils/functional.js';

// ============================================================================
// BASIC USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Basic Price Data Collection
 */
async function basicPriceCollection() {
  console.log('=== Basic Price Data Collection ===');
  
  const assets = ['SEI', 'USDC', 'ETH'] as const;
  const timeRange: TimeRange = {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    end: new Date(),
    interval: '1h',
  };
  
  const result = await collectPriceData(assets, timeRange);
  
  fold(
    (error) => console.error('Price collection failed:', error.message),
    (prices) => {
      console.log(`✅ Collected ${prices.length} price data points`);
      prices.forEach(price => 
        console.log(`  ${price.asset}: $${price.price.toFixed(4)} (${price.source})`)
      );
    }
  )(result);
  
  return result;
}

/**
 * Example 2: Volume Metrics Collection
 */
async function volumeMetricsCollection() {
  console.log('\n=== Volume Metrics Collection ===');
  
  const assets = ['SEI', 'USDC'] as const;
  const timeRange: TimeRange = {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: new Date(),
  };
  
  const result = await collectVolumeMetrics(assets, timeRange);
  
  fold(
    (error) => console.error('Volume collection failed:', error.message),
    (volumes) => {
      console.log(`✅ Collected volume data for ${volumes.length} assets`);
      volumes.forEach(vol => 
        console.log(`  ${vol.asset}: ${vol.volume.toLocaleString()} (${vol.volumeUSD.toLocaleString()} USD)`)
      );
    }
  )(result);
  
  return result;
}

/**
 * Example 3: OHLCV Candlestick Data
 */
async function candlestickDataCollection() {
  console.log('\n=== OHLCV Candlestick Data ===');
  
  const result = await collectOHLCVData('SEI', '1h');
  
  fold(
    (error) => console.error('OHLCV collection failed:', error.message),
    (candles) => {
      console.log(`✅ Collected ${candles.length} candlesticks`);
      console.log('Latest candles:');
      candles.slice(-3).forEach(candle => 
        console.log(`  ${candle.timestamp.toISOString()}: O:${candle.open.toFixed(2)} H:${candle.high.toFixed(2)} L:${candle.low.toFixed(2)} C:${candle.close.toFixed(2)}`)
      );
    }
  )(result);
  
  return result;
}

/**
 * Example 4: Market Depth (Order Book)
 */
async function marketDepthCollection() {
  console.log('\n=== Market Depth Collection ===');
  
  const result = await collectMarketDepth('SEI/USDC');
  
  fold(
    (error) => console.error('Market depth collection failed:', error.message),
    (depth) => {
      console.log(`✅ Collected order book for ${depth.pair}`);
      console.log(`  Mid Price: $${depth.midPrice.toFixed(4)}`);
      console.log(`  Spread: $${depth.spread.toFixed(4)}`);
      console.log(`  Best Bid: $${depth.bids[0]?.price.toFixed(4)} (${depth.bids[0]?.quantity.toFixed(2)})`);
      console.log(`  Best Ask: $${depth.asks[0]?.price.toFixed(4)} (${depth.asks[0]?.quantity.toFixed(2)})`);
    }
  )(result);
  
  return result;
}

/**
 * Example 5: Volatility Metrics Calculation
 */
async function volatilityMetricsCalculation() {
  console.log('\n=== Volatility Metrics Calculation ===');
  
  // First collect price data
  const priceResult = await collectPriceData(['SEI'], {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
    end: new Date(),
  });
  
  if (isRight(priceResult)) {
    const volatilityResult = collectVolatilityMetrics(priceResult.right);
    
    fold(
      (error) => console.error('Volatility calculation failed:', error.message),
      (metrics) => {
        console.log(`✅ Calculated volatility metrics for ${metrics.asset}`);
        console.log(`  Historical Volatility: ${(metrics.historicalVolatility * 100).toFixed(2)}%`);
        console.log(`  Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(2)}%`);
        console.log(`  VaR (95%): ${(metrics.var95 * 100).toFixed(2)}%`);
        console.log(`  Expected Shortfall: ${(metrics.expectedShortfall * 100).toFixed(2)}%`);
      }
    )(volatilityResult);
    
    return volatilityResult;
  }
}

// ============================================================================
// ADVANCED USAGE EXAMPLES
// ============================================================================

/**
 * Example 6: Market Data Pipeline
 */
async function marketDataPipeline() {
  console.log('\n=== Market Data Pipeline ===');
  
  const config: CollectionParams = {
    assets: ['SEI', 'USDC', 'ETH'],
    timeRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
    },
    sources: ['sei-dex', 'chainlink'],
    aggregation: 'weighted',
  };
  
  const pipeline = createMarketPipeline(config);
  
  // Collect all data types
  const [pricesResult, volumesResult] = await Promise.all([
    pipeline.prices(),
    pipeline.volumes(),
  ]);
  
  console.log('Pipeline Results:');
  console.log(`  Prices: ${isRight(pricesResult) ? pricesResult.right.length : 'Failed'}`);
  console.log(`  Volumes: ${isRight(volumesResult) ? volumesResult.right.length : 'Failed'}`);
  
  // Get OHLCV for first asset
  if (config.assets.length > 0) {
    const ohlcvResult = await pipeline.ohlcv(config.assets[0]);
    console.log(`  OHLCV: ${isRight(ohlcvResult) ? ohlcvResult.right.length : 'Failed'}`);
  }
}

/**
 * Example 7: Real-time Data Streaming
 */
async function realTimeDataStreaming() {
  console.log('\n=== Real-time Data Streaming ===');
  
  const streamConfig: StreamConfig = {
    bufferSize: 100,
    batchInterval: 5000, // 5 seconds
    reconnectAttempts: 3,
    heartbeatInterval: 30000,
  };
  
  // Create price data stream
  const priceStream = createMarketDataStream(
    () => collectPriceData(['SEI'], {
      start: new Date(Date.now() - 60 * 1000), // Last minute
      end: new Date(),
    }),
    streamConfig
  );
  
  console.log('🔄 Starting real-time price stream...');
  
  // Consume stream data
  let count = 0;
  for await (const priceData of priceStream.subscribe()) {
    console.log(`📊 Stream update ${++count}:`, priceData);
    
    // Stop after 3 updates for demo
    if (count >= 3) {
      await priceStream.unsubscribe();
      break;
    }
  }
  
  console.log('✅ Stream completed');
}

/**
 * Example 8: Data Source Fallback
 */
async function dataSourceFallback() {
  console.log('\n=== Data Source Fallback ===');
  
  // Primary data source (might fail)
  const primarySource = async () => {
    // Simulate occasional failure
    if (Math.random() < 0.3) {
      throw new Error('Primary source unavailable');
    }
    return collectPriceData(['SEI'], {
      start: new Date(Date.now() - 60 * 60 * 1000),
      end: new Date(),
    });
  };
  
  // Fallback data source
  const fallbackSource = async () => {
    console.log('  🔄 Using fallback data source...');
    return collectPriceData(['SEI'], {
      start: new Date(Date.now() - 60 * 60 * 1000),
      end: new Date(),
    });
  };
  
  const robustFetcher = withFallback(primarySource, fallbackSource);
  
  for (let i = 0; i < 3; i++) {
    console.log(`\nAttempt ${i + 1}:`);
    const result = await robustFetcher();
    
    fold(
      (error) => console.log(`  ❌ Failed: ${error.message}`),
      (prices) => console.log(`  ✅ Success: ${prices.length} prices`)
    )(result);
  }
}

/**
 * Example 9: Multi-source Data Combination
 */
async function multiSourceCombination() {
  console.log('\n=== Multi-source Data Combination ===');
  
  const sources = [
    () => collectPriceData(['SEI'], {
      start: new Date(Date.now() - 60 * 60 * 1000),
      end: new Date(),
    }),
    () => collectPriceData(['SEI'], {
      start: new Date(Date.now() - 60 * 60 * 1000),
      end: new Date(),
    }),
  ];
  
  // Combine sources and take weighted average
  const combinedFetcher = combineDataSources(
    sources,
    (results) => {
      // Flatten all price arrays and take the most recent
      const allPrices = results.flat().sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
      return allPrices.slice(0, 5); // Take 5 most recent
    }
  );
  
  const result = await combinedFetcher();
  
  fold(
    (error) => console.error('Combined fetch failed:', error.message),
    (prices) => {
      console.log(`✅ Combined data from multiple sources: ${prices.length} prices`);
      prices.forEach(price => 
        console.log(`  ${price.asset}: $${price.price.toFixed(4)} from ${price.source}`)
      );
    }
  )(result);
}

// ============================================================================
// PERFORMANCE AND MONITORING EXAMPLES
// ============================================================================

/**
 * Example 10: Performance Monitoring
 */
async function performanceMonitoring() {
  console.log('\n=== Performance Monitoring ===');
  
  const startTime = performance.now();
  
  // Collect multiple data types concurrently
  const tasks = [
    collectPriceData(['SEI', 'USDC'], {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
    }),
    collectVolumeMetrics(['SEI', 'USDC'], {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
    }),
    collectOHLCVData('SEI', '1h'),
    collectMarketDepth('SEI/USDC'),
  ];
  
  const results = await Promise.allSettled(tasks);
  const endTime = performance.now();
  
  console.log(`⏱️  Total execution time: ${(endTime - startTime).toFixed(2)}ms`);
  console.log('Task results:');
  
  results.forEach((result, index) => {
    const taskNames = ['Prices', 'Volumes', 'OHLCV', 'Market Depth'];
    if (result.status === 'fulfilled') {
      const isSuccess = result.value._tag === 'Right';
      console.log(`  ${taskNames[index]}: ${isSuccess ? '✅ Success' : '❌ Failed'}`);
    } else {
      console.log(`  ${taskNames[index]}: ❌ Error - ${result.reason}`);
    }
  });
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🚀 Running Functional Market Data Collector Examples\n');
  
  try {
    await basicPriceCollection();
    await volumeMetricsCollection();
    await candlestickDataCollection();
    await marketDepthCollection();
    await volatilityMetricsCalculation();
    await marketDataPipeline();
    await realTimeDataStreaming();
    await dataSourceFallback();
    await multiSourceCombination();
    await performanceMonitoring();
    
    console.log('\n✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Example execution failed:', error);
  }
}

// Export examples for individual testing
export {
  basicPriceCollection,
  volumeMetricsCollection,
  candlestickDataCollection,
  marketDepthCollection,
  volatilityMetricsCalculation,
  marketDataPipeline,
  realTimeDataStreaming,
  dataSourceFallback,
  multiSourceCombination,
  performanceMonitoring,
  runAllExamples,
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}