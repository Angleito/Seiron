/**
 * Portfolio Cache Manager - Advanced caching strategy for portfolio data
 * Implements intelligent caching with TTL management, invalidation strategies, and performance optimization
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import {
  PortfolioSnapshot,
  PortfolioMetrics,
  PortfolioPerformance,
  RiskMetrics,
  WalletAddress,
  LendingPosition,
  LiquidityPosition,
  TokenBalance,
  CacheConfig,
  CacheKeys,
  AsyncResult
} from '../types/portfolio';
import { cacheService, CacheService } from '../utils/cache';
import logger from '../utils/logger';

export interface CacheStats {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  cacheSize: number;
  memoryUsage: string;
}

export interface CacheInvalidationRule {
  pattern: string;
  ttl: number;
  dependencies: string[];
  condition?: (data: any) => boolean;
}

export class PortfolioCacheManager {
  private readonly config: CacheConfig;
  private readonly keys: CacheKeys;
  private stats: Map<string, { hits: number; misses: number }> = new Map();
  private invalidationRules: Map<string, CacheInvalidationRule> = new Map();

  constructor(
    private cache: CacheService = cacheService,
    config: Partial<CacheConfig> = {}
  ) {
    this.config = {
      portfolioTTL: 300, // 5 minutes
      positionsTTL: 180, // 3 minutes
      pricesTTL: 60,     // 1 minute
      metricsTTL: 240,   // 4 minutes
      keyPrefix: 'sei_portfolio',
      ...config
    };

    this.keys = {
      portfolio: (address: WalletAddress) => 
        `${this.config.keyPrefix}:portfolio:${address}`,
      positions: (address: WalletAddress, type: 'lending' | 'liquidity') => 
        `${this.config.keyPrefix}:positions:${type}:${address}`,
      tokenBalances: (address: WalletAddress) => 
        `${this.config.keyPrefix}:balances:${address}`,
      metrics: (address: WalletAddress) => 
        `${this.config.keyPrefix}:metrics:${address}`,
      performance: (address: WalletAddress, period: string) => 
        `${this.config.keyPrefix}:performance:${address}:${period}`,
      risks: (address: WalletAddress) => 
        `${this.config.keyPrefix}:risks:${address}`
    };

    this.setupInvalidationRules();
  }

  /**
   * Cache portfolio snapshot with intelligent TTL
   */
  public cachePortfolio = (
    walletAddress: WalletAddress,
    snapshot: PortfolioSnapshot,
    customTTL?: number
  ): AsyncResult<void> => {
    const key = this.keys.portfolio(walletAddress);
    const ttl = customTTL || this.calculateDynamicTTL(snapshot);
    
    return pipe(
      this.cache.set(key, snapshot, ttl),
      TE.map(() => {
        this.recordCacheOperation(key, 'set');
        logger.debug(`Cached portfolio for ${walletAddress} with TTL ${ttl}s`);
      })
    );
  };

  /**
   * Get cached portfolio with fallback
   */
  public getCachedPortfolio = (
    walletAddress: WalletAddress
  ): AsyncResult<PortfolioSnapshot | null> => {
    const key = this.keys.portfolio(walletAddress);
    
    return pipe(
      this.cache.get<PortfolioSnapshot>(key),
      TE.map((result) => {
        if (result) {
          this.recordCacheOperation(key, 'hit');
          logger.debug(`Cache hit for portfolio ${walletAddress}`);
        } else {
          this.recordCacheOperation(key, 'miss');
          logger.debug(`Cache miss for portfolio ${walletAddress}`);
        }
        return result;
      })
    );
  };

  /**
   * Cache lending positions
   */
  public cacheLendingPositions = (
    walletAddress: WalletAddress,
    positions: LendingPosition[]
  ): AsyncResult<void> => {
    const key = this.keys.positions(walletAddress, 'lending');
    
    return pipe(
      this.cache.set(key, positions, this.config.positionsTTL),
      TE.map(() => {
        this.recordCacheOperation(key, 'set');
        logger.debug(`Cached ${positions.length} lending positions for ${walletAddress}`);
      })
    );
  };

  /**
   * Get cached lending positions
   */
  public getCachedLendingPositions = (
    walletAddress: WalletAddress
  ): AsyncResult<LendingPosition[] | null> => {
    const key = this.keys.positions(walletAddress, 'lending');
    
    return pipe(
      this.cache.get<LendingPosition[]>(key),
      TE.map((result) => {
        if (result) {
          this.recordCacheOperation(key, 'hit');
        } else {
          this.recordCacheOperation(key, 'miss');
        }
        return result;
      })
    );
  };

  /**
   * Cache liquidity positions
   */
  public cacheLiquidityPositions = (
    walletAddress: WalletAddress,
    positions: LiquidityPosition[]
  ): AsyncResult<void> => {
    const key = this.keys.positions(walletAddress, 'liquidity');
    
    return pipe(
      this.cache.set(key, positions, this.config.positionsTTL),
      TE.map(() => {
        this.recordCacheOperation(key, 'set');
        logger.debug(`Cached ${positions.length} liquidity positions for ${walletAddress}`);
      })
    );
  };

  /**
   * Get cached liquidity positions
   */
  public getCachedLiquidityPositions = (
    walletAddress: WalletAddress
  ): AsyncResult<LiquidityPosition[] | null> => {
    const key = this.keys.positions(walletAddress, 'liquidity');
    
    return pipe(
      this.cache.get<LiquidityPosition[]>(key),
      TE.map((result) => {
        if (result) {
          this.recordCacheOperation(key, 'hit');
        } else {
          this.recordCacheOperation(key, 'miss');
        }
        return result;
      })
    );
  };

  /**
   * Cache token balances
   */
  public cacheTokenBalances = (
    walletAddress: WalletAddress,
    balances: TokenBalance[]
  ): AsyncResult<void> => {
    const key = this.keys.tokenBalances(walletAddress);
    
    return pipe(
      this.cache.set(key, balances, this.config.positionsTTL),
      TE.map(() => {
        this.recordCacheOperation(key, 'set');
        logger.debug(`Cached ${balances.length} token balances for ${walletAddress}`);
      })
    );
  };

  /**
   * Get cached token balances
   */
  public getCachedTokenBalances = (
    walletAddress: WalletAddress
  ): AsyncResult<TokenBalance[] | null> => {
    const key = this.keys.tokenBalances(walletAddress);
    
    return pipe(
      this.cache.get<TokenBalance[]>(key),
      TE.map((result) => {
        if (result) {
          this.recordCacheOperation(key, 'hit');
        } else {
          this.recordCacheOperation(key, 'miss');
        }
        return result;
      })
    );
  };

  /**
   * Cache portfolio metrics
   */
  public cacheMetrics = (
    walletAddress: WalletAddress,
    metrics: PortfolioMetrics
  ): AsyncResult<void> => {
    const key = this.keys.metrics(walletAddress);
    
    return pipe(
      this.cache.set(key, metrics, this.config.metricsTTL),
      TE.map(() => {
        this.recordCacheOperation(key, 'set');
        logger.debug(`Cached metrics for ${walletAddress}`);
      })
    );
  };

  /**
   * Get cached portfolio metrics
   */
  public getCachedMetrics = (
    walletAddress: WalletAddress
  ): AsyncResult<PortfolioMetrics | null> => {
    const key = this.keys.metrics(walletAddress);
    
    return pipe(
      this.cache.get<PortfolioMetrics>(key),
      TE.map((result) => {
        if (result) {
          this.recordCacheOperation(key, 'hit');
        } else {
          this.recordCacheOperation(key, 'miss');
        }
        return result;
      })
    );
  };

  /**
   * Cache performance data
   */
  public cachePerformance = (
    walletAddress: WalletAddress,
    period: string,
    performance: PortfolioPerformance
  ): AsyncResult<void> => {
    const key = this.keys.performance(walletAddress, period);
    const ttl = this.getPerformanceTTL(period);
    
    return pipe(
      this.cache.set(key, performance, ttl),
      TE.map(() => {
        this.recordCacheOperation(key, 'set');
        logger.debug(`Cached performance data for ${walletAddress}, period: ${period}`);
      })
    );
  };

  /**
   * Get cached performance data
   */
  public getCachedPerformance = (
    walletAddress: WalletAddress,
    period: string
  ): AsyncResult<PortfolioPerformance | null> => {
    const key = this.keys.performance(walletAddress, period);
    
    return pipe(
      this.cache.get<PortfolioPerformance>(key),
      TE.map((result) => {
        if (result) {
          this.recordCacheOperation(key, 'hit');
        } else {
          this.recordCacheOperation(key, 'miss');
        }
        return result;
      })
    );
  };

  /**
   * Cache risk metrics
   */
  public cacheRiskMetrics = (
    walletAddress: WalletAddress,
    risks: RiskMetrics
  ): AsyncResult<void> => {
    const key = this.keys.risks(walletAddress);
    const ttl = this.calculateRiskTTL(risks);
    
    return pipe(
      this.cache.set(key, risks, ttl),
      TE.map(() => {
        this.recordCacheOperation(key, 'set');
        logger.debug(`Cached risk metrics for ${walletAddress} with TTL ${ttl}s`);
      })
    );
  };

  /**
   * Get cached risk metrics
   */
  public getCachedRiskMetrics = (
    walletAddress: WalletAddress
  ): AsyncResult<RiskMetrics | null> => {
    const key = this.keys.risks(walletAddress);
    
    return pipe(
      this.cache.get<RiskMetrics>(key),
      TE.map((result) => {
        if (result) {
          this.recordCacheOperation(key, 'hit');
        } else {
          this.recordCacheOperation(key, 'miss');
        }
        return result;
      })
    );
  };

  /**
   * Invalidate all cache entries for a user
   */
  public invalidateUser = (walletAddress: WalletAddress): AsyncResult<void> => {
    const patterns = [
      this.keys.portfolio(walletAddress),
      this.keys.positions(walletAddress, 'lending'),
      this.keys.positions(walletAddress, 'liquidity'),
      this.keys.tokenBalances(walletAddress),
      this.keys.metrics(walletAddress),
      this.keys.risks(walletAddress),
      `${this.config.keyPrefix}:performance:${walletAddress}:*`
    ];

    return pipe(
      TE.sequenceArray(patterns.map(pattern => this.cache.del(pattern))),
      TE.map(() => {
        logger.info(`Invalidated all cache entries for ${walletAddress}`);
      })
    );
  };

  /**
   * Invalidate specific cache pattern
   */
  public invalidatePattern = (pattern: string): AsyncResult<void> =>
    pipe(
      this.cache.del(pattern),
      TE.map(() => {
        logger.debug(`Invalidated cache pattern: ${pattern}`);
      })
    );

  /**
   * Warm up cache for a user
   */
  public warmUpCache = (
    walletAddress: WalletAddress,
    data: {
      portfolio?: PortfolioSnapshot;
      lendingPositions?: LendingPosition[];
      liquidityPositions?: LiquidityPosition[];
      tokenBalances?: TokenBalance[];
      metrics?: PortfolioMetrics;
      risks?: RiskMetrics;
    }
  ): AsyncResult<void> => {
    const operations: AsyncResult<void>[] = [];

    if (data.portfolio) {
      operations.push(this.cachePortfolio(walletAddress, data.portfolio));
    }
    if (data.lendingPositions) {
      operations.push(this.cacheLendingPositions(walletAddress, data.lendingPositions));
    }
    if (data.liquidityPositions) {
      operations.push(this.cacheLiquidityPositions(walletAddress, data.liquidityPositions));
    }
    if (data.tokenBalances) {
      operations.push(this.cacheTokenBalances(walletAddress, data.tokenBalances));
    }
    if (data.metrics) {
      operations.push(this.cacheMetrics(walletAddress, data.metrics));
    }
    if (data.risks) {
      operations.push(this.cacheRiskMetrics(walletAddress, data.risks));
    }

    return pipe(
      TE.sequenceArray(operations),
      TE.map(() => {
        logger.info(`Cache warmed up for ${walletAddress}`);
      })
    );
  };

  /**
   * Get cache statistics
   */
  public getCacheStats = (): AsyncResult<CacheStats> =>
    pipe(
      this.cache.getStats(),
      TE.map((redisStats) => {
        let totalHits = 0;
        let totalMisses = 0;

        for (const stats of this.stats.values()) {
          totalHits += stats.hits;
          totalMisses += stats.misses;
        }

        const totalRequests = totalHits + totalMisses;
        const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
        const missRate = 100 - hitRate;

        return {
          hitRate,
          missRate,
          totalRequests,
          totalHits,
          totalMisses,
          cacheSize: redisStats.db_size || 0,
          memoryUsage: redisStats.memory || 'unknown'
        };
      })
    );

  /**
   * Bulk cache operations for efficiency
   */
  public bulkCache = (
    operations: Array<{
      key: string;
      data: any;
      ttl?: number;
    }>
  ): AsyncResult<void> => {
    const keyValuePairs: Record<string, any> = {};
    let commonTTL: number | undefined;

    operations.forEach(op => {
      keyValuePairs[op.key] = op.data;
      if (op.ttl && !commonTTL) {
        commonTTL = op.ttl;
      }
    });

    return pipe(
      this.cache.mset(keyValuePairs, commonTTL),
      TE.map(() => {
        operations.forEach(op => {
          this.recordCacheOperation(op.key, 'set');
        });
        logger.debug(`Bulk cached ${operations.length} entries`);
      })
    );
  };

  /**
   * Get multiple cache entries at once
   */
  public bulkGet = <T>(keys: string[]): AsyncResult<(T | null)[]> => {
    return pipe(
      this.cache.mget<T>(keys),
      TE.map((results) => {
        keys.forEach((key, index) => {
          const result = results[index];
          this.recordCacheOperation(key, result ? 'hit' : 'miss');
        });
        return results;
      })
    );
  };

  /**
   * Reset cache statistics
   */
  public resetStats = (): void => {
    this.stats.clear();
    logger.info('Cache statistics reset');
  };

  /**
   * Clear all portfolio-related cache
   */
  public clearAll = (): AsyncResult<void> =>
    pipe(
      this.cache.flush(),
      TE.map(() => {
        this.stats.clear();
        logger.info('All portfolio cache cleared');
      })
    );

  // ===================== Private Methods =====================

  private setupInvalidationRules = (): void => {
    // Portfolio data invalidation
    this.invalidationRules.set('portfolio_update', {
      pattern: 'portfolio:*',
      ttl: this.config.portfolioTTL,
      dependencies: ['positions:*', 'balances:*'],
      condition: (data: PortfolioSnapshot) => data.totalValueUSD > 0
    });

    // Position data invalidation
    this.invalidationRules.set('position_update', {
      pattern: 'positions:*',
      ttl: this.config.positionsTTL,
      dependencies: ['metrics:*', 'risks:*']
    });

    // Price data invalidation (more frequent)
    this.invalidationRules.set('price_update', {
      pattern: 'prices:*',
      ttl: this.config.pricesTTL,
      dependencies: ['portfolio:*', 'metrics:*']
    });
  };

  private calculateDynamicTTL = (snapshot: PortfolioSnapshot): number => {
    let baseTTL = this.config.portfolioTTL;

    // Reduce TTL for high-value portfolios (more frequent updates needed)
    if (snapshot.totalValueUSD > 100000) {
      baseTTL = Math.floor(baseTTL * 0.7);
    } else if (snapshot.totalValueUSD > 10000) {
      baseTTL = Math.floor(baseTTL * 0.85);
    }

    // Reduce TTL for portfolios with low health factor
    if (snapshot.healthFactor < 1.5 && snapshot.healthFactor !== Infinity) {
      baseTTL = Math.floor(baseTTL * 0.5);
    }

    // Reduce TTL for portfolios with many positions (more complex to track)
    const totalPositions = snapshot.lendingPositions.length + snapshot.liquidityPositions.length;
    if (totalPositions > 10) {
      baseTTL = Math.floor(baseTTL * 0.8);
    }

    return Math.max(60, baseTTL); // Minimum 1 minute TTL
  };

  private calculateRiskTTL = (risks: RiskMetrics): number => {
    let baseTTL = this.config.metricsTTL;

    // Reduce TTL for high-risk portfolios
    switch (risks.liquidationRisk) {
      case 'critical':
        baseTTL = Math.floor(baseTTL * 0.3);
        break;
      case 'high':
        baseTTL = Math.floor(baseTTL * 0.5);
        break;
      case 'medium':
        baseTTL = Math.floor(baseTTL * 0.7);
        break;
      default:
        break;
    }

    return Math.max(30, baseTTL); // Minimum 30 seconds for critical risks
  };

  private getPerformanceTTL = (period: string): number => {
    // Longer periods can be cached for longer
    const ttlMap: Record<string, number> = {
      '1h': 300,   // 5 minutes
      '1d': 900,   // 15 minutes
      '7d': 1800,  // 30 minutes
      '30d': 3600, // 1 hour
      '90d': 7200, // 2 hours
      '1y': 14400, // 4 hours
      'all': 21600 // 6 hours
    };

    return ttlMap[period] || this.config.metricsTTL;
  };

  private recordCacheOperation = (key: string, operation: 'hit' | 'miss' | 'set'): void => {
    const keyPattern = this.extractKeyPattern(key);
    const stats = this.stats.get(keyPattern) || { hits: 0, misses: 0 };

    switch (operation) {
      case 'hit':
        stats.hits++;
        break;
      case 'miss':
        stats.misses++;
        break;
      case 'set':
        // No stats update for set operations
        break;
    }

    this.stats.set(keyPattern, stats);
  };

  private extractKeyPattern = (key: string): string => {
    // Extract pattern from key for grouping statistics
    const parts = key.split(':');
    if (parts.length >= 3) {
      return `${parts[1]}:${parts[2]}`;
    }
    return parts[1] || 'unknown';
  };
}

/**
 * Singleton instance for global use
 */
export const portfolioCacheManager = new PortfolioCacheManager();