/**
 * MCP Server Configuration for SEI Blockchain
 * 
 * This configuration defines the Model Context Protocol (MCP) server
 * for interacting with the SEI blockchain. It provides tools and
 * functions for accessing blockchain data, executing transactions,
 * and monitoring DeFi positions.
 */

import { z } from 'zod'

/**
 * SEI Blockchain MCP Server Configuration
 */
export const seiBlockchainMCPConfig = {
  name: 'sei-blockchain',
  version: '1.0.0',
  description: 'MCP server for SEI blockchain data access and interactions',
  
  // Server metadata
  metadata: {
    protocol: 'MCP/1.0',
    capabilities: [
      'wallet-operations',
      'transaction-queries',
      'defi-monitoring',
      'token-management',
      'liquidity-pools',
      'staking-operations'
    ]
  },

  // RPC and API endpoints
  endpoints: {
    rpc: {
      mainnet: process.env.SEI_RPC_MAINNET || 'https://rpc.sei-apis.com',
      testnet: process.env.SEI_RPC_TESTNET || 'https://rpc-testnet.sei-apis.com',
      archive: process.env.SEI_RPC_ARCHIVE || 'https://rpc-archive.sei-apis.com'
    },
    rest: {
      mainnet: process.env.SEI_REST_MAINNET || 'https://rest.sei-apis.com',
      testnet: process.env.SEI_REST_TESTNET || 'https://rest-testnet.sei-apis.com'
    },
    websocket: {
      mainnet: process.env.SEI_WS_MAINNET || 'wss://ws.sei-apis.com',
      testnet: process.env.SEI_WS_TESTNET || 'wss://ws-testnet.sei-apis.com'
    }
  },

  // Authentication configuration
  auth: {
    type: 'api-key',
    headerName: 'X-SEI-API-KEY',
    apiKey: process.env.SEI_API_KEY,
    rateLimit: {
      requests: 100,
      window: '1m'
    }
  },

  // Available tools/functions
  tools: [
    {
      name: 'getWalletBalance',
      description: 'Query wallet balance for native SEI and tokens',
      inputSchema: z.object({
        address: z.string().regex(/^sei1[a-z0-9]{38}$/),
        denom: z.string().optional().default('usei')
      }),
      handler: 'handlers/wallet.getBalance'
    },
    {
      name: 'getTransactionHistory',
      description: 'Retrieve transaction history for a wallet address',
      inputSchema: z.object({
        address: z.string().regex(/^sei1[a-z0-9]{38}$/),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        startTime: z.string().datetime().optional(),
        endTime: z.string().datetime().optional()
      }),
      handler: 'handlers/transactions.getHistory'
    },
    {
      name: 'getDeFiPositions',
      description: 'Get DeFi positions including liquidity pools and lending',
      inputSchema: z.object({
        address: z.string().regex(/^sei1[a-z0-9]{38}$/),
        protocols: z.array(z.string()).optional()
      }),
      handler: 'handlers/defi.getPositions'
    },
    {
      name: 'getLiquidityPools',
      description: 'Query liquidity pool information',
      inputSchema: z.object({
        poolId: z.string().optional(),
        denom1: z.string().optional(),
        denom2: z.string().optional(),
        includeAPR: z.boolean().default(true)
      }),
      handler: 'handlers/pools.getLiquidity'
    },
    {
      name: 'getStakingInfo',
      description: 'Get staking information for an address',
      inputSchema: z.object({
        address: z.string().regex(/^sei1[a-z0-9]{38}$/),
        includeRewards: z.boolean().default(true),
        includeUnbonding: z.boolean().default(true)
      }),
      handler: 'handlers/staking.getInfo'
    },
    {
      name: 'executeTokenSwap',
      description: 'Execute a token swap on SEI DEX',
      inputSchema: z.object({
        fromAddress: z.string().regex(/^sei1[a-z0-9]{38}$/),
        fromDenom: z.string(),
        toDenom: z.string(),
        amount: z.string(),
        slippageTolerance: z.number().min(0).max(50).default(1),
        simulate: z.boolean().default(true)
      }),
      handler: 'handlers/swap.executeSwap'
    },
    {
      name: 'sendTokenTransfer',
      description: 'Send tokens to another address',
      inputSchema: z.object({
        fromAddress: z.string().regex(/^sei1[a-z0-9]{38}$/),
        toAddress: z.string().regex(/^sei1[a-z0-9]{38}$/),
        denom: z.string(),
        amount: z.string(),
        memo: z.string().optional()
      }),
      handler: 'handlers/transfer.sendTokens'
    },
    {
      name: 'getTokenMetadata',
      description: 'Get metadata for a specific token',
      inputSchema: z.object({
        denom: z.string(),
        includePrice: z.boolean().default(true),
        includeSupply: z.boolean().default(true)
      }),
      handler: 'handlers/tokens.getMetadata'
    },
    {
      name: 'getValidatorInfo',
      description: 'Get information about validators',
      inputSchema: z.object({
        validatorAddress: z.string().optional(),
        status: z.enum(['bonded', 'unbonding', 'unbonded']).optional(),
        limit: z.number().min(1).max(100).default(20)
      }),
      handler: 'handlers/validators.getInfo'
    },
    {
      name: 'getGovernanceProposals',
      description: 'Query governance proposals',
      inputSchema: z.object({
        status: z.enum(['voting', 'passed', 'rejected', 'all']).default('all'),
        limit: z.number().min(1).max(50).default(10)
      }),
      handler: 'handlers/governance.getProposals'
    }
  ],

  // Data schemas
  schemas: {
    // Transaction schema
    transaction: z.object({
      hash: z.string(),
      height: z.number(),
      timestamp: z.string().datetime(),
      from: z.string(),
      to: z.string().optional(),
      type: z.string(),
      amount: z.array(z.object({
        denom: z.string(),
        amount: z.string()
      })),
      fee: z.object({
        amount: z.array(z.object({
          denom: z.string(),
          amount: z.string()
        })),
        gas: z.string()
      }),
      memo: z.string().optional(),
      success: z.boolean()
    }),

    // Balance schema
    balance: z.object({
      denom: z.string(),
      amount: z.string(),
      available: z.string(),
      locked: z.string().optional(),
      staked: z.string().optional(),
      unbonding: z.string().optional()
    }),

    // DeFi position schema
    defiPosition: z.object({
      protocol: z.string(),
      type: z.enum(['liquidity', 'lending', 'borrowing', 'farming']),
      value: z.string(),
      apy: z.number().optional(),
      rewards: z.array(z.object({
        denom: z.string(),
        amount: z.string(),
        pendingAmount: z.string()
      })).optional(),
      positions: z.array(z.object({
        poolId: z.string(),
        assets: z.array(z.object({
          denom: z.string(),
          amount: z.string()
        })),
        shares: z.string()
      }))
    }),

    // Liquidity pool schema
    liquidityPool: z.object({
      id: z.string(),
      type: z.enum(['constant-product', 'stable-swap', 'concentrated']),
      assets: z.array(z.object({
        denom: z.string(),
        amount: z.string(),
        weight: z.number().optional()
      })),
      totalShares: z.string(),
      apr: z.number().optional(),
      volume24h: z.string().optional(),
      fees24h: z.string().optional(),
      tvl: z.string()
    }),

    // Staking info schema
    stakingInfo: z.object({
      delegations: z.array(z.object({
        validator: z.string(),
        amount: z.string(),
        shares: z.string()
      })),
      unbondingDelegations: z.array(z.object({
        validator: z.string(),
        entries: z.array(z.object({
          amount: z.string(),
          completionTime: z.string().datetime()
        }))
      })),
      rewards: z.array(z.object({
        validator: z.string(),
        rewards: z.array(z.object({
          denom: z.string(),
          amount: z.string()
        }))
      })),
      totalStaked: z.string(),
      totalRewards: z.string()
    })
  },

  // Error handling
  errorHandling: {
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    },
    fallbackEndpoints: true,
    circuitBreaker: {
      threshold: 5,
      timeout: 30000
    }
  },

  // Caching configuration
  cache: {
    enabled: true,
    ttl: {
      balance: 10,
      transactions: 60,
      pools: 30,
      metadata: 3600
    },
    maxSize: 1000
  }
}

// Export type definitions
export type SeiBlockchainConfig = typeof seiBlockchainMCPConfig
export type SeiTool = typeof seiBlockchainMCPConfig.tools[number]
export type SeiEndpoints = typeof seiBlockchainMCPConfig.endpoints