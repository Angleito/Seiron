/**
 * MCP Test Data Generators
 * Provides utilities for generating test data for MCP testing
 */

import { faker } from '@faker-js/faker';
import { MCPServerConfig } from '../../../config/mcp/types';

/**
 * Generate mock market data
 */
export const generateMarketData = (overrides?: Partial<any>) => ({
  symbol: faker.finance.currencyCode(),
  price: parseFloat(faker.finance.amount(0.01, 1000, 2)),
  volume24h: parseFloat(faker.finance.amount(100000, 10000000, 0)),
  change24h: parseFloat(faker.finance.amount(-20, 20, 2)),
  marketCap: parseFloat(faker.finance.amount(1000000, 1000000000, 0)),
  high24h: parseFloat(faker.finance.amount(1, 1100, 2)),
  low24h: parseFloat(faker.finance.amount(0.9, 1000, 2)),
  timestamp: faker.date.recent().getTime(),
  ...overrides
});

/**
 * Generate mock wallet balance
 */
export const generateWalletBalance = (address?: string) => ({
  address: address || faker.finance.ethereumAddress(),
  balances: [
    {
      denom: 'usei',
      amount: faker.finance.amount(0, 1000000, 0),
      usdValue: parseFloat(faker.finance.amount(0, 10000, 2))
    },
    {
      denom: 'usdc',
      amount: faker.finance.amount(0, 1000000, 0),
      usdValue: parseFloat(faker.finance.amount(0, 10000, 2))
    }
  ],
  totalUSD: parseFloat(faker.finance.amount(0, 20000, 2)),
  lastUpdated: faker.date.recent().toISOString()
});

/**
 * Generate mock portfolio data
 */
export const generatePortfolioData = (portfolioId?: string) => ({
  portfolioId: portfolioId || faker.string.uuid(),
  name: faker.company.name() + ' Portfolio',
  totalValue: parseFloat(faker.finance.amount(1000, 100000, 2)),
  assets: Array.from({ length: faker.number.int({ min: 3, max: 10 }) }, () => ({
    symbol: faker.finance.currencyCode(),
    amount: parseFloat(faker.finance.amount(0.1, 1000, 4)),
    value: parseFloat(faker.finance.amount(100, 10000, 2)),
    percentage: parseFloat(faker.finance.amount(5, 30, 2)),
    change24h: parseFloat(faker.finance.amount(-10, 10, 2))
  })),
  performance: {
    day: parseFloat(faker.finance.amount(-5, 5, 2)),
    week: parseFloat(faker.finance.amount(-10, 10, 2)),
    month: parseFloat(faker.finance.amount(-15, 15, 2)),
    year: parseFloat(faker.finance.amount(-30, 30, 2))
  },
  riskScore: parseFloat(faker.finance.amount(1, 10, 1)),
  lastRebalance: faker.date.recent().toISOString()
});

/**
 * Generate mock sentiment data
 */
export const generateSentimentData = () => ({
  overall: parseFloat(faker.finance.amount(-1, 1, 2)),
  sources: {
    twitter: parseFloat(faker.finance.amount(-1, 1, 2)),
    reddit: parseFloat(faker.finance.amount(-1, 1, 2)),
    news: parseFloat(faker.finance.amount(-1, 1, 2)),
    onChain: parseFloat(faker.finance.amount(-1, 1, 2))
  },
  volume: {
    mentions: faker.number.int({ min: 100, max: 10000 }),
    uniqueUsers: faker.number.int({ min: 50, max: 5000 }),
    engagement: faker.number.int({ min: 1000, max: 100000 })
  },
  trending: faker.datatype.boolean(),
  keywords: Array.from({ length: 5 }, () => faker.lorem.word()),
  lastUpdated: faker.date.recent().toISOString()
});

/**
 * Generate mock DeFi position
 */
export const generateDeFiPosition = () => ({
  protocol: faker.helpers.arrayElement(['Astroport', 'Levana', 'White Whale', 'Kujira']),
  type: faker.helpers.arrayElement(['LP', 'Staking', 'Lending', 'Borrowing']),
  assets: Array.from({ length: faker.number.int({ min: 1, max: 2 }) }, () => ({
    symbol: faker.finance.currencyCode(),
    amount: parseFloat(faker.finance.amount(0.1, 1000, 4)),
    value: parseFloat(faker.finance.amount(100, 10000, 2))
  })),
  totalValue: parseFloat(faker.finance.amount(100, 20000, 2)),
  apy: parseFloat(faker.finance.amount(0, 200, 2)),
  rewards: {
    pending: parseFloat(faker.finance.amount(0, 100, 2)),
    claimed: parseFloat(faker.finance.amount(0, 1000, 2))
  },
  enteredAt: faker.date.past().toISOString()
});

/**
 * Generate mock transaction
 */
export const generateTransaction = () => ({
  hash: '0x' + faker.string.hexadecimal({ length: 64 }).slice(2),
  type: faker.helpers.arrayElement(['transfer', 'swap', 'stake', 'unstake', 'claim']),
  status: faker.helpers.arrayElement(['success', 'pending', 'failed']),
  from: faker.finance.ethereumAddress(),
  to: faker.finance.ethereumAddress(),
  value: parseFloat(faker.finance.amount(0.01, 1000, 4)),
  fee: parseFloat(faker.finance.amount(0.001, 1, 4)),
  timestamp: faker.date.recent().toISOString(),
  blockNumber: faker.number.int({ min: 1000000, max: 9999999 }),
  metadata: {
    symbol: faker.finance.currencyCode(),
    protocol: faker.helpers.arrayElement(['Native', 'Astroport', 'Levana'])
  }
});

/**
 * Generate mock risk metrics
 */
export const generateRiskMetrics = () => ({
  portfolioId: faker.string.uuid(),
  timestamp: faker.date.recent().toISOString(),
  metrics: {
    sharpeRatio: parseFloat(faker.finance.amount(-2, 3, 2)),
    volatility: parseFloat(faker.finance.amount(0, 100, 2)),
    maxDrawdown: parseFloat(faker.finance.amount(0, 50, 2)),
    beta: parseFloat(faker.finance.amount(-2, 2, 2)),
    var95: parseFloat(faker.finance.amount(0, 10000, 2)),
    concentrationRisk: parseFloat(faker.finance.amount(0, 1, 2))
  },
  riskScore: faker.number.int({ min: 1, max: 10 }),
  recommendations: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => ({
    type: faker.helpers.arrayElement(['rebalance', 'diversify', 'reduce-exposure']),
    description: faker.lorem.sentence(),
    impact: faker.helpers.arrayElement(['high', 'medium', 'low'])
  }))
});

/**
 * Generate mock server configuration
 */
export const generateMCPServerConfig = (overrides?: Partial<MCPServerConfig>): MCPServerConfig => ({
  name: faker.internet.domainWord(),
  version: faker.system.semver(),
  connection: {
    type: faker.helpers.arrayElement(['stdio', 'http', 'websocket']),
    endpoint: faker.helpers.arrayElement(['ws://localhost:3000', 'http://localhost:3001', 'stdio']),
    port: faker.number.int({ min: 3000, max: 9000 }),
    secure: faker.datatype.boolean()
  },
  authentication: {
    type: faker.helpers.arrayElement(['api-key', 'jwt', 'none']),
    required: faker.datatype.boolean()
  },
  tools: Array.from({ length: faker.number.int({ min: 3, max: 10 }) }, () => ({
    name: faker.hacker.verb() + faker.hacker.noun(),
    description: faker.lorem.sentence(),
    parameters: {
      type: 'object',
      properties: {
        [faker.lorem.word()]: { type: 'string' }
      }
    },
    responseSchema: {
      type: 'object',
      properties: {
        result: { type: 'string' }
      }
    }
  })),
  resources: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => ({
    uri: faker.internet.url(),
    name: faker.company.name(),
    description: faker.lorem.sentence()
  })),
  events: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => ({
    name: faker.hacker.verb() + '.event',
    description: faker.lorem.sentence()
  })),
  rateLimit: {
    requests: faker.number.int({ min: 10, max: 1000 }),
    window: faker.helpers.arrayElement(['1m', '5m', '1h'])
  },
  cache: {
    enabled: faker.datatype.boolean(),
    ttl: faker.number.int({ min: 60, max: 3600 })
  },
  ...overrides
});

/**
 * Generate batch of test data
 */
export const generateBatch = <T>(generator: () => T, count: number): T[] => {
  return Array.from({ length: count }, () => generator());
};

/**
 * Generate error response
 */
export const generateErrorResponse = (code?: string, message?: string) => ({
  error: {
    code: code || faker.helpers.arrayElement(['RATE_LIMIT', 'AUTH_FAILED', 'NOT_FOUND', 'INTERNAL_ERROR']),
    message: message || faker.lorem.sentence(),
    details: {
      timestamp: faker.date.recent().toISOString(),
      requestId: faker.string.uuid()
    }
  }
});

/**
 * Generate WebSocket event
 */
export const generateWebSocketEvent = (type?: string) => ({
  type: type || faker.helpers.arrayElement(['price-update', 'portfolio-change', 'alert', 'news']),
  data: {
    [faker.lorem.word()]: faker.lorem.word()
  },
  timestamp: faker.date.recent().toISOString(),
  id: faker.string.uuid()
});

/**
 * Generate performance metrics
 */
export const generatePerformanceMetrics = () => ({
  latency: faker.number.int({ min: 10, max: 500 }),
  throughput: faker.number.int({ min: 100, max: 10000 }),
  errorRate: parseFloat(faker.finance.amount(0, 5, 2)),
  uptime: parseFloat(faker.finance.amount(95, 100, 2)),
  activeConnections: faker.number.int({ min: 0, max: 1000 }),
  queueSize: faker.number.int({ min: 0, max: 100 })
});