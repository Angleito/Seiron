// Symphony Protocol Constants for Sei Network

// Symphony Protocol Contract Addresses
export const SYMPHONY_ADDRESSES = {
  ROUTER: '0x0000000000000000000000000000000000000010', // Placeholder - Symphony Router
  QUOTER: '0x0000000000000000000000000000000000000011', // Placeholder - Symphony Quoter
  FACTORY: '0x0000000000000000000000000000000000000012', // Placeholder - Symphony Factory
  MULTICALL: '0x0000000000000000000000000000000000000013', // Placeholder - Symphony Multicall
  ANALYTICS: '0x0000000000000000000000000000000000000014', // Placeholder - Symphony Analytics
} as const;

// Symphony API Configuration
export const SYMPHONY_API = {
  BASE_URL: 'https://api.symphony.sei.io',
  VERSION: 'v1',
  ENDPOINTS: {
    QUOTE: '/quote',
    SWAP: '/swap',
    ROUTES: '/routes',
    GAS_ESTIMATE: '/gas-estimate',
    ANALYTICS: '/analytics',
    TOKENS: '/tokens',
    PROTOCOLS: '/protocols',
    HEALTH: '/health',
  },
  TIMEOUT: 10000, // 10 seconds
  RATE_LIMIT: 100, // requests per minute
} as const;

// Supported DEX Protocols on Symphony
export const SUPPORTED_PROTOCOLS = [
  'dragonswap',
  'astroport',
  'fin',
  'levana',
  'kujira',
  'white-whale',
  'wyndex',
] as const;

// Symphony Fee Tiers (in basis points)
export const SYMPHONY_FEE_TIERS = {
  STABLE: 1,      // 0.01% for stable pairs
  LOW: 5,         // 0.05% for correlated pairs
  MEDIUM: 30,     // 0.3% for most pairs
  HIGH: 100,      // 1% for exotic pairs
  VOLATILE: 300,  // 3% for highly volatile pairs
} as const;

// Slippage Tolerance Levels
export const SLIPPAGE_LEVELS = {
  VERY_LOW: 0.1,    // 0.1%
  LOW: 0.5,         // 0.5%
  MEDIUM: 1.0,      // 1.0%
  HIGH: 2.0,        // 2.0%
  VERY_HIGH: 5.0,   // 5.0%
} as const;

// Gas Limits for Symphony Operations
export const SYMPHONY_GAS_LIMITS = {
  SIMPLE_SWAP: 150000,
  MULTI_HOP_SWAP: 300000,
  QUOTE: 50000,
  ROUTE_DISCOVERY: 100000,
  CROSS_PROTOCOL: 500000,
} as const;

// Route Optimization Parameters
export const ROUTE_OPTIMIZATION = {
  MAX_HOPS: 4,
  MIN_LIQUIDITY: '1000', // Minimum liquidity in USD
  MAX_PRICE_IMPACT: 3.0, // Maximum price impact in %
  ROUTE_TIMEOUT: 5000, // Route discovery timeout in ms
  REFRESH_INTERVAL: 30000, // Route refresh interval in ms
} as const;

// Symphony Protocol Tokens (Sei Network)
export const SYMPHONY_TOKENS = {
  // Native tokens
  SEI: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'SEI',
    name: 'Sei',
    decimals: 18,
    verified: true,
  },
  // Stable coins
  USDC: {
    address: '0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    verified: true,
  },
  USDT: {
    address: '0x43D8814FdFB9B8854422Df13F1c66e34E4fa91fD',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    verified: true,
  },
  // Major assets
  WETH: {
    address: '0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7',
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    decimals: 18,
    verified: true,
  },
  WBTC: {
    address: '0x3BDCEf9e656fD9D03eA98605946b4fbF87C5c412',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    verified: true,
  },
  ATOM: {
    address: '0x27292cf0016E5dF1d8b37306B2A98588aCbD6fCA',
    symbol: 'ATOM',
    name: 'Cosmos',
    decimals: 6,
    verified: true,
  },
  OSMO: {
    address: '0x74C0C58B99b68cF16A717279AC2d056D6FaF1935',
    symbol: 'OSMO',
    name: 'Osmosis',
    decimals: 6,
    verified: true,
  },
} as const;

// Popular Trading Pairs
export const POPULAR_PAIRS = [
  { tokenA: 'SEI', tokenB: 'USDC', fee: SYMPHONY_FEE_TIERS.MEDIUM },
  { tokenA: 'SEI', tokenB: 'USDT', fee: SYMPHONY_FEE_TIERS.MEDIUM },
  { tokenA: 'USDC', tokenB: 'USDT', fee: SYMPHONY_FEE_TIERS.STABLE },
  { tokenA: 'WETH', tokenB: 'USDC', fee: SYMPHONY_FEE_TIERS.MEDIUM },
  { tokenA: 'WBTC', tokenB: 'USDC', fee: SYMPHONY_FEE_TIERS.MEDIUM },
  { tokenA: 'ATOM', tokenB: 'SEI', fee: SYMPHONY_FEE_TIERS.HIGH },
  { tokenA: 'OSMO', tokenB: 'SEI', fee: SYMPHONY_FEE_TIERS.HIGH },
] as const;

// Symphony Protocol Limits
export const SYMPHONY_LIMITS = {
  MIN_TRADE_AMOUNT: '1', // Minimum trade amount in USD
  MAX_TRADE_AMOUNT: '10000000', // Maximum trade amount in USD
  MAX_ROUTES_PER_QUERY: 10,
  MAX_HOPS_PER_ROUTE: 4,
  QUOTE_VALIDITY_DURATION: 30000, // Quote validity in ms
  ROUTE_CACHE_DURATION: 60000, // Route cache duration in ms
} as const;

// Error Messages
export const SYMPHONY_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network request failed',
  INVALID_TOKEN: 'Invalid token address',
  INSUFFICIENT_LIQUIDITY: 'Insufficient liquidity for swap',
  SLIPPAGE_EXCEEDED: 'Slippage tolerance exceeded',
  ROUTE_NOT_FOUND: 'No route found for swap',
  QUOTE_EXPIRED: 'Quote has expired',
  GAS_ESTIMATION_FAILED: 'Gas estimation failed',
  VALIDATION_FAILED: 'Swap validation failed',
  EXECUTION_FAILED: 'Swap execution failed',
  TIMEOUT: 'Operation timeout',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  PROTOCOL_UNAVAILABLE: 'Protocol temporarily unavailable',
} as const;

// Symphony Analytics Constants
export const ANALYTICS_METRICS = {
  VOLUME_24H: 'volume_24h',
  FEES_24H: 'fees_24h',
  TRANSACTIONS_24H: 'transactions_24h',
  UNIQUE_USERS_24H: 'unique_users_24h',
  AVERAGE_SLIPPAGE: 'average_slippage',
  TOP_PAIRS: 'top_pairs',
  PROTOCOL_STATS: 'protocol_stats',
} as const;

// Risk Assessment Parameters
export const RISK_PARAMETERS = {
  LOW_RISK: {
    maxPriceImpact: 0.5,
    maxSlippage: 1.0,
    minLiquidity: '100000',
    maxHops: 2,
  },
  MEDIUM_RISK: {
    maxPriceImpact: 2.0,
    maxSlippage: 2.0,
    minLiquidity: '50000',
    maxHops: 3,
  },
  HIGH_RISK: {
    maxPriceImpact: 5.0,
    maxSlippage: 5.0,
    minLiquidity: '10000',
    maxHops: 4,
  },
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  QUOTE_CACHE_DURATION: 30000, // 30 seconds
  ROUTE_CACHE_DURATION: 60000, // 1 minute
  TOKEN_CACHE_DURATION: 3600000, // 1 hour
  PROTOCOL_CACHE_DURATION: 1800000, // 30 minutes
  ANALYTICS_CACHE_DURATION: 300000, // 5 minutes
} as const;

// Symphony Protocol ABI Fragments
export const SYMPHONY_ABI_FRAGMENTS = {
  ROUTER: [
    'function exactInputSingle(address,address,uint256,uint256,address,uint256) external returns (uint256)',
    'function exactInput(bytes,uint256,uint256,address,uint256) external returns (uint256)',
    'function exactOutputSingle(address,address,uint256,uint256,address,uint256) external returns (uint256)',
    'function exactOutput(bytes,uint256,uint256,address,uint256) external returns (uint256)',
  ],
  QUOTER: [
    'function quoteExactInputSingle(address,address,uint256,uint256) external returns (uint256)',
    'function quoteExactInput(bytes,uint256) external returns (uint256)',
    'function quoteExactOutputSingle(address,address,uint256,uint256) external returns (uint256)',
    'function quoteExactOutput(bytes,uint256) external returns (uint256)',
  ],
} as const;

// Symphony Integration Features
export const SYMPHONY_FEATURES = {
  ROUTE_OPTIMIZATION: true,
  MULTI_PROTOCOL_ROUTING: true,
  REAL_TIME_QUOTES: true,
  SLIPPAGE_PROTECTION: true,
  GAS_OPTIMIZATION: true,
  IMPACT_ANALYSIS: true,
  HISTORICAL_DATA: true,
  ANALYTICS_INTEGRATION: true,
} as const;