import { pipe, flow } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as A from 'fp-ts/Array';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { PublicClient } from 'viem';

import {
  Result,
  PriceData,
  DataError,
  ValidationError,
  NetworkError,
  SeiConfig,
  OracleProvider,
  OraclePrice,
  OracleFeed,
  OracleMetrics,
  OracleConsensus,
  CollectorContext
} from '../types';
import { createPublicClient } from '../utils/sei';
import { withRetry, rateLimitedFetch } from '../utils/http';
import { validatePrice, validateTimestamp } from '../transformers/validate';

// Oracle provider configurations
export const ORACLE_PROVIDERS: Record<string, OracleProvider> = {
  SEI_NATIVE: {
    id: 'sei-native',
    name: 'Sei Native Oracle',
    type: 'native',
    contracts: ['0x0000000000000000000000000000000000000000'], // Placeholder
    endpoints: [],
    updateFrequency: 400, // ~400ms block time
    assets: ['SEI', 'USDT', 'USDC', 'ETH', 'BTC']
  },
  PYTH: {
    id: 'pyth',
    name: 'Pyth Network',
    type: 'external',
    contracts: ['0x4305FB66699C3B2702D4d05CF36551390A4c69C6'], // Sei Pyth contract
    endpoints: ['https://api.pyth.network'],
    updateFrequency: 1000,
    assets: ['BTC', 'ETH', 'SEI', 'SOL', 'ATOM']
  },
  BAND: {
    id: 'band',
    name: 'Band Protocol',
    type: 'external',
    contracts: ['0x0000000000000000000000000000000000000001'], // Placeholder
    endpoints: ['https://laozi-testnet6.bandchain.org'],
    updateFrequency: 5000,
    assets: ['BTC', 'ETH', 'SEI']
  }
};

// Pure function to fetch oracle prices from Sei native oracle
export const fetchSeiNativeOracle = (
  client: PublicClient,
  assets: string[]
): TE.TaskEither<DataError, OraclePrice[]> =>
  TE.tryCatch(
    async () => {
      // In production, this would call the actual Sei oracle contract
      // For now, returning mock data structure
      const prices = await Promise.all(
        assets.map(async (asset) => ({
          provider: 'sei-native',
          asset,
          price: Math.random() * 1000 + 100, // Mock price
          timestamp: Date.now(),
          confidence: 0.99,
          round: Math.floor(Date.now() / 1000)
        }))
      );
      return prices;
    },
    (error) => ({
      type: 'network',
      message: `Failed to fetch Sei native oracle: ${error}`,
      timestamp: Date.now()
    })
  );

// Fetch prices from Pyth Network
export const fetchPythOracle = (
  endpoint: string,
  priceIds: Record<string, string>
): TE.TaskEither<DataError, OraclePrice[]> =>
  pipe(
    Object.entries(priceIds),
    A.map(([asset, priceId]) =>
      TE.tryCatch(
        async () => {
          const response = await rateLimitedFetch(
            `${endpoint}/api/latest_price_feeds?ids[]=${priceId}`
          );
          const data = await response.json();
          const priceData = data[0];
          
          return {
            provider: 'pyth',
            asset,
            price: parseFloat(priceData.price.price) * Math.pow(10, priceData.price.expo),
            timestamp: priceData.price.publish_time * 1000,
            confidence: parseFloat(priceData.price.conf) / parseFloat(priceData.price.price),
            round: priceData.price.publish_time
          };
        },
        (error) => ({
          type: 'network' as const,
          message: `Pyth oracle error for ${asset}: ${error}`,
          timestamp: Date.now()
        })
      )
    ),
    TE.sequenceArray
  );

// Collect oracle prices from multiple providers
export const collectOraclePrices = (
  context: CollectorContext,
  assets: string[]
): TE.TaskEither<DataError, OracleFeed> =>
  pipe(
    Object.values(ORACLE_PROVIDERS),
    A.filter(provider => 
      assets.some(asset => provider.assets.includes(asset))
    ),
    A.map(provider => {
      switch (provider.type) {
        case 'native':
          return fetchSeiNativeOracle(context.client, assets);
        case 'external':
          if (provider.id === 'pyth') {
            // Mock price IDs - in production these would be real
            const priceIds = assets.reduce((acc, asset) => ({
              ...acc,
              [asset]: `0x${asset.toLowerCase()}`
            }), {});
            return fetchPythOracle(provider.endpoints[0], priceIds);
          }
          return TE.right([]);
        default:
          return TE.right([]);
      }
    }),
    TE.sequenceArray,
    TE.map(flow(
      A.flatten,
      prices => ({
        prices,
        timestamp: Date.now(),
        providers: [...new Set(prices.map(p => p.provider))]
      })
    ))
  );

// Calculate oracle consensus metrics
export const calculateOracleConsensus = (
  prices: OraclePrice[]
): Result<OracleConsensus> => {
  const grouped = prices.reduce((acc, price) => {
    if (!acc[price.asset]) acc[price.asset] = [];
    acc[price.asset].push(price);
    return acc;
  }, {} as Record<string, OraclePrice[]>);

  const consensus = Object.entries(grouped).map(([asset, assetPrices]) => {
    const priceValues = assetPrices.map(p => p.price);
    const median = calculateMedian(priceValues);
    const mean = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const stdDev = calculateStdDev(priceValues, mean);
    
    const deviations = assetPrices.map(p => ({
      provider: p.provider,
      deviation: Math.abs(p.price - median) / median,
      confidence: p.confidence
    }));

    return {
      asset,
      medianPrice: median,
      meanPrice: mean,
      stdDeviation: stdDev,
      providerCount: assetPrices.length,
      maxDeviation: Math.max(...deviations.map(d => d.deviation)),
      deviations,
      consensusScore: calculateConsensusScore(deviations),
      timestamp: Date.now()
    };
  });

  return E.right({
    consensus,
    overallScore: consensus.reduce((sum, c) => sum + c.consensusScore, 0) / consensus.length,
    timestamp: Date.now()
  });
};

// Monitor oracle update metrics
export const collectOracleMetrics = (
  feeds: OracleFeed[]
): Result<OracleMetrics> => {
  const updateDelays = feeds.map((feed, i) => {
    if (i === 0) return 0;
    return feed.timestamp - feeds[i - 1].timestamp;
  });

  const metrics: OracleMetrics = {
    averageUpdateDelay: updateDelays.reduce((a, b) => a + b, 0) / updateDelays.length,
    maxUpdateDelay: Math.max(...updateDelays),
    minUpdateDelay: Math.min(...updateDelays.filter(d => d > 0)),
    totalUpdates: feeds.length,
    providerMetrics: calculateProviderMetrics(feeds),
    healthScore: calculateOracleHealth(feeds),
    timestamp: Date.now()
  };

  return E.right(metrics);
};

// Validate oracle data quality
export const validateOracleData = (
  feed: OracleFeed
): Result<OracleFeed> =>
  pipe(
    feed.prices,
    A.traverse(E.Applicative)(price =>
      pipe(
        validatePrice(price.price),
        E.chain(() => validateTimestamp(price.timestamp)),
        E.chain(() => 
          price.confidence >= 0 && price.confidence <= 1
            ? E.right(price)
            : E.left({
                type: 'validation' as const,
                message: `Invalid confidence: ${price.confidence}`,
                field: 'confidence',
                value: price.confidence
              })
        )
      )
    ),
    E.map(validPrices => ({
      ...feed,
      prices: validPrices
    }))
  );

// Create oracle subscription for real-time updates
export const subscribeToOracleUpdates = (
  context: CollectorContext,
  assets: string[],
  callback: (feed: OracleFeed) => void
): () => void => {
  const intervalId = setInterval(async () => {
    const result = await collectOraclePrices(context, assets)();
    
    if (E.isRight(result)) {
      const validated = validateOracleData(result.right);
      if (E.isRight(validated)) {
        callback(validated.right);
      }
    }
  }, 1000); // 1 second updates

  return () => clearInterval(intervalId);
};

// Aggregate oracle data over time windows
export const aggregateOracleData = (
  feeds: OracleFeed[],
  windowSize: number
): Result<OracleFeed[]> => {
  const windows: OracleFeed[] = [];
  
  for (let i = 0; i < feeds.length; i += windowSize) {
    const windowFeeds = feeds.slice(i, i + windowSize);
    const allPrices = windowFeeds.flatMap(f => f.prices);
    
    // Group by asset and calculate TWAP
    const twapPrices = Object.values(
      allPrices.reduce((acc, price) => {
        if (!acc[price.asset]) {
          acc[price.asset] = { 
            prices: [], 
            weights: [], 
            provider: price.provider 
          };
        }
        acc[price.asset].prices.push(price.price);
        acc[price.asset].weights.push(price.confidence);
        return acc;
      }, {} as Record<string, any>)
    ).map(({ prices, weights, provider, asset }) => ({
      provider,
      asset,
      price: calculateWeightedAverage(prices, weights),
      timestamp: windowFeeds[Math.floor(windowFeeds.length / 2)].timestamp,
      confidence: weights.reduce((a, b) => a + b) / weights.length,
      round: 0
    }));

    windows.push({
      prices: twapPrices,
      timestamp: windowFeeds[Math.floor(windowFeeds.length / 2)].timestamp,
      providers: [...new Set(twapPrices.map(p => p.provider))]
    });
  }

  return E.right(windows);
};

// Helper functions
const calculateMedian = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const calculateStdDev = (values: number[], mean: number): number => {
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

const calculateConsensusScore = (deviations: any[]): number => {
  const weightedDeviations = deviations.map(d => d.deviation * (1 - d.confidence));
  const avgDeviation = weightedDeviations.reduce((a, b) => a + b, 0) / deviations.length;
  return Math.max(0, 1 - avgDeviation * 10); // Scale to 0-1
};

const calculateProviderMetrics = (feeds: OracleFeed[]): Record<string, any> => {
  const providers: Record<string, any> = {};
  
  feeds.forEach(feed => {
    feed.providers.forEach(provider => {
      if (!providers[provider]) {
        providers[provider] = {
          updateCount: 0,
          avgConfidence: 0,
          totalPrices: 0
        };
      }
      
      const providerPrices = feed.prices.filter(p => p.provider === provider);
      providers[provider].updateCount++;
      providers[provider].totalPrices += providerPrices.length;
      providers[provider].avgConfidence += 
        providerPrices.reduce((sum, p) => sum + p.confidence, 0) / providerPrices.length;
    });
  });

  // Normalize averages
  Object.values(providers).forEach(metrics => {
    metrics.avgConfidence /= metrics.updateCount;
  });

  return providers;
};

const calculateOracleHealth = (feeds: OracleFeed[]): number => {
  if (feeds.length < 2) return 1;
  
  const delays = feeds.slice(1).map((feed, i) => 
    feed.timestamp - feeds[i].timestamp
  );
  
  const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
  const expectedDelay = 1000; // 1 second
  
  // Health decreases as delay increases beyond expected
  return Math.max(0, 1 - Math.abs(avgDelay - expectedDelay) / expectedDelay);
};

const calculateWeightedAverage = (values: number[], weights: number[]): number => {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  return values.reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight;
};

// Export composed oracle collector
export const createOracleCollector = (config: SeiConfig) => {
  const client = createPublicClient(config);
  const context: CollectorContext = {
    client,
    config,
    startTime: Date.now()
  };

  return {
    collectPrices: (assets: string[]) => collectOraclePrices(context, assets),
    collectMetrics: (feeds: OracleFeed[]) => collectOracleMetrics(feeds),
    calculateConsensus: (prices: OraclePrice[]) => calculateOracleConsensus(prices),
    validateData: (feed: OracleFeed) => validateOracleData(feed),
    aggregateData: (feeds: OracleFeed[], window: number) => aggregateOracleData(feeds, window),
    subscribe: (assets: string[], callback: (feed: OracleFeed) => void) =>
      subscribeToOracleUpdates(context, assets, callback)
  };
};