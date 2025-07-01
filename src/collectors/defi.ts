/**
 * @fileoverview DeFi protocol collector for Sei blockchain
 * Implements functional programming patterns for collecting DeFi data
 */

import type {
  Either,
  Result,
  Option,
  Timestamp,
  LiquidityPool,
  TokenInfo,
  YieldData,
  DexTrade,
  ReadonlyRecord,
  NonEmptyArray
} from '../types/index.js';
import type { 
  ChainClient,
  RateLimiter 
} from './chain.js';
import { 
  createRateLimiter, 
  withRetry, 
  queryContract,
  chainHelpers 
} from './chain.js';
import { pipe, compose } from '../types/index.js';

/**
 * DeFi Protocol interface
 */
export interface Protocol {
  readonly id: string;
  readonly name: string;
  readonly type: 'dex' | 'lending' | 'derivatives' | 'yield';
  readonly contracts: ReadonlyRecord<string, string>;
  readonly endpoints: ReadonlyRecord<string, string>;
}

/**
 * Protocol configurations
 */
export const PROTOCOLS: ReadonlyRecord<string, Protocol> = {
  dragonswap: {
    id: 'dragonswap',
    name: 'DragonSwap',
    type: 'dex',
    contracts: {
      factory: 'sei1pc0gs3n6803x7jqe9m7etyduk7crnvwxmqj0rq',
      router: 'sei1qlnfaf2uqepfj5unjxa8z4hhde6l8d8sk7z2e8',
      multicall: 'sei1pzzxvmxwjxvd5e8nf52n7yv5nsprq3xkkj2tql'
    },
    endpoints: {
      pools: '/pools',
      volume: '/volume',
      tvl: '/tvl'
    }
  },
  levana: {
    id: 'levana',
    name: 'Levana Perps',
    type: 'derivatives',
    contracts: {
      factory: 'sei1h3ukufh4lhacftdf6kyxzum4p86rcnel35v4jk',
      market_btc: 'sei1g3wvmk7vmzjddqhf8p5xfjqnyt5a9pnjn4rj5g',
      market_eth: 'sei1nzjy26rahkgm5jfcn6gfvvyly5qasz4sqjxmnf'
    },
    endpoints: {
      positions: '/positions',
      markets: '/markets',
      funding: '/funding-rate'
    }
  },
  astroport: {
    id: 'astroport',
    name: 'Astroport',
    type: 'dex',
    contracts: {
      factory: 'sei1xr3rq8yvd7qplsw5yx90ftsr2zdhg4e9z60h5d',
      router: 'sei1hj8n6n5qxkyh57wgclh7kfgw3xqzlhvqrw8t2p'
    },
    endpoints: {
      pairs: '/pairs',
      liquidity: '/liquidity'
    }
  }
} as const;

/**
 * Liquidity pool query result
 */
interface PoolQueryResult {
  readonly assets: ReadonlyArray<{
    readonly info: {
      readonly native_token?: { readonly denom: string };
      readonly token?: { readonly contract_addr: string };
    };
    readonly amount: string;
  }>;
  readonly total_share: string;
}

/**
 * TVL data structure
 */
export interface TVLData {
  readonly protocol: string;
  readonly totalValueLocked: string;
  readonly pools: ReadonlyArray<{
    readonly address: string;
    readonly tvl: string;
    readonly token0: TokenInfo;
    readonly token1: TokenInfo;
  }>;
  readonly timestamp: Timestamp;
}

/**
 * APY/APR data structure
 */
export interface YieldRate {
  readonly protocol: string;
  readonly pool: string;
  readonly apy: number;
  readonly apr: number;
  readonly rewards: ReadonlyArray<{
    readonly token: string;
    readonly rate: number;
  }>;
  readonly timestamp: Timestamp;
}

/**
 * Trading volume data
 */
export interface VolumeData {
  readonly protocol: string;
  readonly volume24h: string;
  readonly volume7d: string;
  readonly trades24h: number;
  readonly fees24h: string;
  readonly timestamp: Timestamp;
}

/**
 * User position data
 */
export interface UserPosition {
  readonly protocol: string;
  readonly user: string;
  readonly positions: ReadonlyArray<{
    readonly pool: string;
    readonly shares: string;
    readonly value: string;
    readonly impermanentLoss?: number;
  }>;
  readonly timestamp: Timestamp;
}

/**
 * Protocol health metrics
 */
export interface ProtocolHealth {
  readonly protocol: string;
  readonly utilizationRate: number;
  readonly liquidityDepth: number;
  readonly activeUsers24h: number;
  readonly protocolRevenue24h: string;
  readonly timestamp: Timestamp;
}

/**
 * Create a collector context with rate limiting
 */
export const createCollectorContext = (
  client: ChainClient,
  requestsPerSecond: number = 5
): CollectorContext => ({
  client,
  rateLimiter: createRateLimiter(requestsPerSecond)
});

/**
 * Collector context
 */
export interface CollectorContext {
  readonly client: ChainClient;
  readonly rateLimiter: RateLimiter;
}

/**
 * Fetch pool data from a DEX contract
 */
const fetchPoolData = (
  context: CollectorContext,
  protocol: Protocol,
  poolAddress: string
): Promise<Result<LiquidityPool>> =>
  pipe(
    () => withRetry(
      () => context.rateLimiter.execute(
        () => queryContract<PoolQueryResult>(
          context.client,
          poolAddress,
          { pool: {} }
        )
      )
    ),
    async (queryFn) => {
      const result = await queryFn();
      if (result._tag === 'Left') return result;

      const poolData = result.right;
      
      // Transform pool query result to LiquidityPool
      try {
        const pool: LiquidityPool = {
          address: poolAddress,
          token0: extractTokenInfo(poolData.assets[0]),
          token1: extractTokenInfo(poolData.assets[1]),
          reserve0: poolData.assets[0].amount,
          reserve1: poolData.assets[1].amount,
          totalSupply: poolData.total_share,
          fee: 30, // 0.3% standard fee
          timestamp: Date.now()
        };
        
        return { _tag: 'Right', right: pool };
      } catch (error) {
        return { _tag: 'Left', left: error as Error };
      }
    }
  )();

/**
 * Extract token info from asset
 */
const extractTokenInfo = (asset: any): TokenInfo => {
  if (asset.info.native_token) {
    return {
      address: asset.info.native_token.denom,
      symbol: asset.info.native_token.denom.slice(1).toUpperCase(),
      name: asset.info.native_token.denom.slice(1).toUpperCase(),
      decimals: 6
    };
  } else if (asset.info.token) {
    return {
      address: asset.info.token.contract_addr,
      symbol: 'TOKEN', // Would need additional query
      name: 'Token',
      decimals: 6
    };
  }
  throw new Error('Unknown asset type');
};

/**
 * Collect liquidity data from a protocol
 */
export const collectLiquidityData = (
  context: CollectorContext,
  protocol: Protocol
): Promise<Result<ReadonlyArray<LiquidityPool>>> =>
  pipe(
    () => fetchPoolList(context, protocol),
    async (poolListResult) => {
      const listResult = await poolListResult();
      if (listResult._tag === 'Left') return listResult;

      const pools = listResult.right;
      const poolDataPromises = pools.map(poolAddress =>
        fetchPoolData(context, protocol, poolAddress)
      );

      const results = await Promise.all(poolDataPromises);
      const successfulPools = results
        .filter((r): r is { _tag: 'Right'; right: LiquidityPool } => r._tag === 'Right')
        .map(r => r.right);

      return { _tag: 'Right', right: successfulPools };
    }
  )();

/**
 * Fetch list of pools from protocol
 */
const fetchPoolList = (
  context: CollectorContext,
  protocol: Protocol
): () => Promise<Result<ReadonlyArray<string>>> =>
  async () => {
    // This would query the factory contract for all pools
    // Placeholder implementation
    const pools = [
      'sei1pool1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      'sei1pool2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    ];
    return { _tag: 'Right', right: pools };
  };

/**
 * Collect protocol TVL
 */
export const collectProtocolTVL = (
  context: CollectorContext,
  protocol: Protocol
): Promise<Result<TVLData>> =>
  pipe(
    () => collectLiquidityData(context, protocol),
    async (liquidityResult) => {
      const result = await liquidityResult();
      if (result._tag === 'Left') return result;

      const pools = result.right;
      
      // Calculate TVL from pool reserves
      const tvlData: TVLData = {
        protocol: protocol.id,
        totalValueLocked: calculateTotalTVL(pools),
        pools: pools.map(pool => ({
          address: pool.address,
          tvl: calculatePoolTVL(pool),
          token0: pool.token0,
          token1: pool.token1
        })),
        timestamp: Date.now()
      };

      return { _tag: 'Right', right: tvlData };
    }
  )();

/**
 * Calculate total TVL from pools
 */
const calculateTotalTVL = (pools: ReadonlyArray<LiquidityPool>): string => {
  // Would need price data to calculate USD value
  // Placeholder calculation
  return pools.reduce((total, pool) => {
    const poolTvl = BigInt(pool.reserve0) + BigInt(pool.reserve1);
    return total + poolTvl;
  }, BigInt(0)).toString();
};

/**
 * Calculate pool TVL
 */
const calculatePoolTVL = (pool: LiquidityPool): string => {
  // Would need price data to calculate USD value
  return (BigInt(pool.reserve0) + BigInt(pool.reserve1)).toString();
};

/**
 * Collect yield rates from protocols
 */
export const collectYieldRates = (
  context: CollectorContext,
  protocol: Protocol
): Promise<Result<ReadonlyArray<YieldRate>>> =>
  pipe(
    () => fetchYieldData(context, protocol),
    async (yieldResult) => {
      const result = await yieldResult();
      if (result._tag === 'Left') return result;

      return { _tag: 'Right', right: result.right };
    }
  )();

/**
 * Fetch yield data from protocol
 */
const fetchYieldData = (
  context: CollectorContext,
  protocol: Protocol
): () => Promise<Result<ReadonlyArray<YieldRate>>> =>
  async () => {
    // Would query protocol for APY/APR data
    // Placeholder implementation
    const yieldRates: ReadonlyArray<YieldRate> = [
      {
        protocol: protocol.id,
        pool: 'sei1pool1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        apy: 12.5,
        apr: 11.8,
        rewards: [
          { token: 'sei', rate: 0.001 }
        ],
        timestamp: Date.now()
      }
    ];
    
    return { _tag: 'Right', right: yieldRates };
  };

/**
 * Collect trading volume data
 */
export const collectVolumeData = (
  context: CollectorContext,
  protocol: Protocol
): Promise<Result<VolumeData>> =>
  pipe(
    () => fetchVolumeMetrics(context, protocol),
    async (volumeResult) => {
      const result = await volumeResult();
      return result;
    }
  )();

/**
 * Fetch volume metrics from protocol
 */
const fetchVolumeMetrics = (
  context: CollectorContext,
  protocol: Protocol
): () => Promise<Result<VolumeData>> =>
  async () => {
    // Would query protocol for volume data
    const volumeData: VolumeData = {
      protocol: protocol.id,
      volume24h: '1000000000000',
      volume7d: '7000000000000',
      trades24h: 15420,
      fees24h: '3000000000',
      timestamp: Date.now()
    };
    
    return { _tag: 'Right', right: volumeData };
  };

/**
 * Monitor user positions
 */
export const monitorUserPositions = (
  context: CollectorContext,
  protocol: Protocol,
  userAddress: string
): Promise<Result<UserPosition>> =>
  pipe(
    () => fetchUserPositions(context, protocol, userAddress),
    async (positionsResult) => {
      const result = await positionsResult();
      return result;
    }
  )();

/**
 * Fetch user positions from protocol
 */
const fetchUserPositions = (
  context: CollectorContext,
  protocol: Protocol,
  userAddress: string
): () => Promise<Result<UserPosition>> =>
  async () => {
    // Would query user's positions in protocol
    const userPosition: UserPosition = {
      protocol: protocol.id,
      user: userAddress,
      positions: [],
      timestamp: Date.now()
    };
    
    return { _tag: 'Right', right: userPosition };
  };

/**
 * Collect protocol health metrics
 */
export const collectProtocolHealth = (
  context: CollectorContext,
  protocol: Protocol
): Promise<Result<ProtocolHealth>> =>
  pipe(
    () => Promise.all([
      collectProtocolTVL(context, protocol),
      collectVolumeData(context, protocol)
    ]),
    async (metricsPromise) => {
      const [tvlResult, volumeResult] = await metricsPromise();
      
      if (tvlResult._tag === 'Left') return tvlResult;
      if (volumeResult._tag === 'Left') return volumeResult;

      const health: ProtocolHealth = {
        protocol: protocol.id,
        utilizationRate: 0.75, // Would calculate from actual data
        liquidityDepth: 0.85,
        activeUsers24h: 1250,
        protocolRevenue24h: volumeResult.right.fees24h,
        timestamp: Date.now()
      };

      return { _tag: 'Right', right: health };
    }
  )();

/**
 * Batch collect data from multiple protocols
 */
export const batchCollectProtocols = (
  context: CollectorContext,
  protocols: NonEmptyArray<Protocol>
): Promise<ReadonlyArray<Result<TVLData>>> =>
  Promise.all(
    protocols.map(protocol => 
      collectProtocolTVL(context, protocol)
    )
  );

/**
 * Create a subscription to protocol events
 */
export const subscribeToProtocolEvents = (
  context: CollectorContext,
  protocol: Protocol,
  eventType: 'swap' | 'liquidity' | 'position',
  callback: (event: any) => void
): () => void => {
  // Would set up WebSocket subscription to protocol events
  const unsubscribe = context.client.subscribe(
    `${protocol.id}.${eventType}`,
    callback
  );
  
  return unsubscribe;
};

/**
 * Collect historical data with pagination
 */
export const collectHistoricalData = (
  context: CollectorContext,
  protocol: Protocol,
  startTime: Timestamp,
  endTime: Timestamp,
  pageSize: number = 100
): AsyncGenerator<Result<ReadonlyArray<DexTrade>>, void, unknown> =>
  async function* () {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await fetchHistoricalTrades(
        context,
        protocol,
        startTime,
        endTime,
        offset,
        pageSize
      );

      if (result._tag === 'Left') {
        yield result;
        break;
      }

      yield { _tag: 'Right', right: result.right.trades };
      
      hasMore = result.right.hasMore;
      offset += pageSize;
    }
  }();

/**
 * Fetch historical trades
 */
const fetchHistoricalTrades = (
  context: CollectorContext,
  protocol: Protocol,
  startTime: Timestamp,
  endTime: Timestamp,
  offset: number,
  limit: number
): Promise<Result<{ trades: ReadonlyArray<DexTrade>; hasMore: boolean }>> =>
  context.rateLimiter.execute(async () => {
    // Would query historical trades from protocol
    return {
      _tag: 'Right',
      right: {
        trades: [],
        hasMore: false
      }
    };
  });

/**
 * Compose multiple collectors
 */
export const composeCollectors = <T, U>(
  collector1: (context: CollectorContext, protocol: Protocol) => Promise<Result<T>>,
  collector2: (context: CollectorContext, protocol: Protocol, data: T) => Promise<Result<U>>
): (context: CollectorContext, protocol: Protocol) => Promise<Result<U>> =>
  async (context, protocol) => {
    const result1 = await collector1(context, protocol);
    if (result1._tag === 'Left') return result1;
    
    return collector2(context, protocol, result1.right);
  };

/**
 * Export all collector functions
 */
export const collectors = {
  collectLiquidityData,
  collectProtocolTVL,
  collectYieldRates,
  collectVolumeData,
  monitorUserPositions,
  collectProtocolHealth,
  batchCollectProtocols,
  subscribeToProtocolEvents,
  collectHistoricalData,
  composeCollectors,
  createCollectorContext
} as const;