/**
 * @fileoverview Main exports for the collectors module
 */

// Chain interaction utilities
export {
  type ChainClient,
  type RateLimiter,
  createChainClient,
  createRateLimiter,
  withRetry,
  queryContract,
  getBalance,
  getCurrentBlockHeight,
  chainHelpers
} from './chain.js';

// DeFi protocol collector
export {
  type Protocol,
  type CollectorContext,
  type TVLData,
  type YieldRate,
  type VolumeData,
  type UserPosition,
  type ProtocolHealth,
  PROTOCOLS,
  createCollectorContext,
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
  collectors
} from './defi.js';