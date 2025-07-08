/**
 * Application constants and configuration values
 */

// API Response codes
export const API_CODES = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR'
} as const;

// HTTP Status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// Supported blockchain networks
export const NETWORKS = {
  SEI: {
    name: 'Sei',
    chainId: parseInt(process.env.SEI_CHAIN_ID || '1329'),
    prefix: 'sei',
    rpcUrl: process.env.SEI_RPC_URL || 'https://rpc.sei-apis.com',
    gasPrice: '0.1usei'
  },
  ETHEREUM: {
    name: 'Ethereum',
    chainId: 1,
    prefix: '0x',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/',
    gasPrice: '20000000000' // 20 Gwei
  }
} as const;

// Cache keys
export const CACHE_KEYS = {
  PORTFOLIO: 'portfolio',
  PRICES: 'prices',
  AI_RESPONSE: 'ai_response',
  USER_SESSION: 'user_session',
  RATE_LIMIT: 'rate_limit',
  CONVERSATION: 'conversation'
} as const;

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  PORTFOLIO: 300, // 5 minutes
  PRICES: 60, // 1 minute
  AI_RESPONSE: 1800, // 30 minutes
  USER_SESSION: 86400, // 24 hours
  CONVERSATION: 3600 // 1 hour
} as const;

// Rate limiting
export const RATE_LIMITS = {
  DEFAULT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  },
  AI_REQUESTS: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50
  },
  PORTFOLIO_UPDATES: {
    windowMs: 60 * 1000, // 1 minute
    max: 10
  },
  PREMIUM: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000
  }
} as const;

// AI Configuration
export const AI_CONFIG = {
  DEFAULT_MODEL: 'gpt-4-turbo-preview',
  MAX_TOKENS: 4000,
  TEMPERATURE: 0.7,
  MAX_CONVERSATION_HISTORY: 50,
  CONTEXT_WINDOW: 8000,
  PROMPT_TEMPLATES: {
    PORTFOLIO_ANALYSIS: 'Analyze the following portfolio data and provide insights:',
    TRADING_ADVICE: 'Based on the current market conditions and portfolio, provide trading recommendations:',
    RISK_ASSESSMENT: 'Assess the risk profile of this portfolio:',
    GENERAL_CHAT: 'You are a helpful AI assistant for cryptocurrency portfolio management.'
  }
} as const;

// WebSocket events
export const WS_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_PORTFOLIO: 'join_portfolio',
  LEAVE_PORTFOLIO: 'leave_portfolio',
  PORTFOLIO_UPDATE: 'portfolio_update',
  CHAT_MESSAGE: 'chat_message',
  CHAT_RESPONSE: 'chat_response',
  ERROR: 'error',
  PRICE_UPDATE: 'price_update',
  TRANSACTION_UPDATE: 'transaction_update',
  SYSTEM_MESSAGE: 'system_message'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  INVALID_WALLET: 'Invalid wallet address format',
  MISSING_WALLET: 'Wallet address is required',
  UNAUTHORIZED_ACCESS: 'Unauthorized access',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  AI_SERVICE_ERROR: 'AI service temporarily unavailable',
  PORTFOLIO_NOT_FOUND: 'Portfolio not found for this wallet',
  INVALID_TOKEN: 'Invalid or expired token',
  NETWORK_ERROR: 'Network connection error',
  CACHE_ERROR: 'Cache service error',
  VALIDATION_FAILED: 'Request validation failed'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  PORTFOLIO_UPDATED: 'Portfolio updated successfully',
  ANALYSIS_GENERATED: 'Portfolio analysis generated successfully',
  CONVERSATION_CLEARED: 'Conversation history cleared',
  PREFERENCES_SAVED: 'Preferences saved successfully',
  TRANSACTION_SUBMITTED: 'Transaction submitted successfully'
} as const;

// File upload limits
export const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['text/csv', 'application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], // TODO: REMOVE_MOCK - Hard-coded array literals
  ALLOWED_EXTENSIONS: ['.csv', '.json', '.xlsx'] // TODO: REMOVE_MOCK - Hard-coded array literals
} as const;

// Supported tokens (can be expanded)
export const SUPPORTED_TOKENS = {
  SEI: {
    symbol: 'SEI',
    decimals: 18,
    address: 'native',
    name: 'Sei'
  },
  USDC: {
    symbol: 'USDC',
    decimals: 6,
    address: 'sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk',
    name: 'USD Coin'
  },
  USDT: {
    symbol: 'USDT',
    decimals: 6,
    address: 'sei1h8tfafj8m8g5znpj2ephlmdmnm76wr0yhgz2e4',
    name: 'Tether USD'
  }
} as const;

// Time intervals for analysis
export const TIME_INTERVALS = {
  '1h': 3600,
  '24h': 86400,
  '7d': 604800,
  '30d': 2592000,
  '90d': 7776000,
  '1y': 31536000
} as const;

// Portfolio risk levels
export const RISK_LEVELS = {
  CONSERVATIVE: 'conservative',
  MODERATE: 'moderate',
  AGGRESSIVE: 'aggressive'
} as const;

// Transaction types
export const TRANSACTION_TYPES = {
  BUY: 'buy',
  SELL: 'sell',
  TRANSFER_IN: 'transfer_in',
  TRANSFER_OUT: 'transfer_out',
  SWAP: 'swap',
  STAKE: 'stake',
  UNSTAKE: 'unstake',
  CLAIM_REWARDS: 'claim_rewards'
} as const;

// Database table names (if using a database)
export const DB_TABLES = {
  USERS: 'users',
  PORTFOLIOS: 'portfolios',
  TRANSACTIONS: 'transactions',
  CONVERSATIONS: 'conversations',
  PRICE_HISTORY: 'price_history',
  USER_PREFERENCES: 'user_preferences'
} as const;

// External API endpoints
export const EXTERNAL_APIS = {
  COINGECKO: 'https://api.coingecko.com/api/v3',
  DEFILLAMA: 'https://api.llama.fi',
  SEI_API: 'https://api.sei.io'
} as const;

// Environment configurations
export const ENV_CONFIG = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
} as const;