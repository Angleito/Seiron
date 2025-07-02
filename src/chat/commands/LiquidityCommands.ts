/**
 * @fileoverview Liquidity command handlers
 * Implements add liquidity, remove liquidity, and adjust range operations
 */

import type {
  Result,
  Either,
  Option,
  ReadonlyRecord
} from '../../types/index.js';
import { EitherM, Maybe, pipe } from '../../types/index.js';
import type {
  LiquidityCommand,
  ExecutionResult,
  SessionContext,
  PositionData
} from '../types.js';

/**
 * DEX protocol interfaces
 */
interface DexProtocol {
  readonly id: string;
  readonly name: string;
  readonly factory: string;
  readonly router: string;
  readonly supportedPairs: ReadonlyArray<LiquidityPair>;
  readonly hasConcentratedLiquidity: boolean;
}

interface LiquidityPair {
  readonly token0: string;
  readonly token1: string;
  readonly poolAddress: string;
  readonly fee: number; // basis points
}

/**
 * Mock DEX protocols
 */
const DEX_PROTOCOLS: ReadonlyRecord<string, DexProtocol> = {
  dragonswap: {
    id: 'dragonswap',
    name: 'DragonSwap',
    factory: 'sei1...',
    router: 'sei1...',
    supportedPairs: [
      { token0: 'USDC', token1: 'SEI', poolAddress: 'sei1...', fee: 30 },
      { token0: 'ETH', token1: 'USDC', poolAddress: 'sei1...', fee: 30 },
      { token0: 'SEI', token1: 'ATOM', poolAddress: 'sei1...', fee: 100 }
    ],
    hasConcentratedLiquidity: true
  },
  astroport: {
    id: 'astroport',
    name: 'Astroport',
    factory: 'sei1...',
    router: 'sei1...',
    supportedPairs: [
      { token0: 'USDC', token1: 'USDT', poolAddress: 'sei1...', fee: 5 },
      { token0: 'SEI', token1: 'USDC', poolAddress: 'sei1...', fee: 30 },
      { token0: 'OSMO', token1: 'SEI', poolAddress: 'sei1...', fee: 100 }
    ],
    hasConcentratedLiquidity: false
  }
};

/**
 * Execute liquidity command
 */
export async function executeLiquidityCommand(
  command: LiquidityCommand,
  context: SessionContext
): Promise<ExecutionResult> {
  // Validate wallet connection
  if (!context.walletAddress) {
    return {
      success: false,
      message: 'Please connect your wallet to manage liquidity',
      error: new Error('Wallet not connected')
    };
  }
  
  // Get protocol
  const protocol = getProtocol(command.params.protocol || context.preferences.defaultProtocol);
  if (!protocol) {
    return {
      success: false,
      message: 'Unknown protocol. Available DEXs: DragonSwap, Astroport',
      error: new Error('Invalid protocol')
    };
  }
  
  // Execute based on command type
  switch (command.type) {
    case 'add_liquidity':
      return executeAddLiquidity(command, protocol, context);
    case 'remove_liquidity':
      return executeRemoveLiquidity(command, protocol, context);
    case 'adjust_range':
      return executeAdjustRange(command, protocol, context);
    default:
      return {
        success: false,
        message: 'Unknown liquidity command',
        error: new Error('Invalid command type')
      };
  }
}

/**
 * Execute add liquidity operation
 */
async function executeAddLiquidity(
  command: LiquidityCommand,
  protocol: DexProtocol,
  context: SessionContext
): Promise<ExecutionResult> {
  const params = command.params;
  
  // Determine tokens
  let token0 = params.token0;
  let token1 = params.token1;
  let amount0 = params.amount0;
  let amount1 = params.amount1;
  
  // If only one token specified, try to infer pair
  if (token0 && !token1) {
    const pair = findPairForToken(protocol, token0);
    if (!pair) {
      return {
        success: false,
        message: `No liquidity pool found for ${token0} on ${protocol.name}`,
        error: new Error('No pool found')
      };
    }
    token1 = pair.token0 === token0 ? pair.token1 : pair.token0;
  }
  
  if (!token0 || !token1) {
    return {
      success: false,
      message: 'Please specify both tokens for the liquidity pair',
      error: new Error('Missing token pair')
    };
  }
  
  // Find pool
  const pool = findPool(protocol, token0, token1);
  if (!pool) {
    return {
      success: false,
      message: `No ${token0}/${token1} pool on ${protocol.name}`,
      error: new Error('Pool not found')
    };
  }
  
  // Calculate amounts if only one provided
  if (amount0 && !amount1) {
    amount1 = await calculatePairAmount(pool, token0, parseFloat(amount0), 'token1');
  } else if (!amount0 && amount1) {
    amount0 = await calculatePairAmount(pool, token1, parseFloat(amount1), 'token0');
  }
  
  if (!amount0 || !amount1) {
    return {
      success: false,
      message: 'Please specify at least one amount',
      error: new Error('Missing amounts')
    };
  }
  
  // Check balances
  const balance0 = await checkBalance(context.walletAddress!, token0);
  const balance1 = await checkBalance(context.walletAddress!, token1);
  
  if (parseFloat(amount0) > balance0 || parseFloat(amount1) > balance1) {
    return {
      success: false,
      message: `Insufficient balance. Need ${amount0} ${token0} and ${amount1} ${token1}`,
      error: new Error('Insufficient balance')
    };
  }
  
  const txHash = generateMockTxHash();
  const lpTokens = await calculateLPTokens(pool, parseFloat(amount0), parseFloat(amount1));
  const apy = await getPoolAPY(pool);
  
  return {
    success: true,
    message: `Successfully added liquidity to ${token0}/${token1} pool on ${protocol.name}`,
    txHash,
    data: {
      protocol: protocol.name,
      action: 'add_liquidity',
      token0,
      token1,
      amount0,
      amount1,
      lpTokens: lpTokens.toFixed(6),
      estimatedAPY: (apy * 100).toFixed(2) + '%',
      poolFee: (pool.fee / 10000).toFixed(2) + '%'
    }
  };
}

/**
 * Execute remove liquidity operation
 */
async function executeRemoveLiquidity(
  command: LiquidityCommand,
  protocol: DexProtocol,
  context: SessionContext
): Promise<ExecutionResult> {
  const params = command.params;
  
  // Get user positions
  const positions = await getUserLiquidityPositions(context.walletAddress!, protocol.id);
  
  if (positions.length === 0) {
    return {
      success: false,
      message: `No liquidity positions found on ${protocol.name}`,
      error: new Error('No positions')
    };
  }
  
  // Find matching position
  let position;
  if (params.poolId) {
    position = positions.find(p => p.poolId === params.poolId);
  } else if (params.token0 && params.token1) {
    position = positions.find(p => 
      (p.token0 === params.token0 && p.token1 === params.token1) ||
      (p.token0 === params.token1 && p.token1 === params.token0)
    );
  } else if (params.token0 || params.token1) {
    const token = params.token0 || params.token1;
    position = positions.find(p => p.token0 === token || p.token1 === token);
  } else {
    position = positions[0]; // Use first position
  }
  
  if (!position) {
    return {
      success: false,
      message: 'Could not find matching liquidity position',
      error: new Error('Position not found')
    };
  }
  
  // Calculate removal amounts
  const percentage = params.amount0 ? parseFloat(params.amount0) / 100 : 100;
  const amount0 = (position.amount0 * percentage / 100).toFixed(6);
  const amount1 = (position.amount1 * percentage / 100).toFixed(6);
  
  const txHash = generateMockTxHash();
  const rewards = await calculateAccruedRewards(position);
  
  return {
    success: true,
    message: `Successfully removed ${percentage}% liquidity from ${position.token0}/${position.token1} pool`,
    txHash,
    data: {
      protocol: protocol.name,
      action: 'remove_liquidity',
      token0: position.token0,
      token1: position.token1,
      amount0,
      amount1,
      percentage: percentage.toFixed(0) + '%',
      rewards: rewards.toFixed(2) + ' USD',
      remainingLP: ((100 - percentage) * position.lpTokens / 100).toFixed(6)
    }
  };
}

/**
 * Execute adjust range operation (for concentrated liquidity)
 */
async function executeAdjustRange(
  command: LiquidityCommand,
  protocol: DexProtocol,
  context: SessionContext
): Promise<ExecutionResult> {
  if (!protocol.hasConcentratedLiquidity) {
    return {
      success: false,
      message: `${protocol.name} does not support concentrated liquidity`,
      error: new Error('Not supported')
    };
  }
  
  const params = command.params;
  
  if (!params.rangeMin || !params.rangeMax) {
    return {
      success: false,
      message: 'Please specify both minimum and maximum price range',
      error: new Error('Missing range parameters')
    };
  }
  
  // Get user's concentrated liquidity positions
  const positions = await getUserCLPositions(context.walletAddress!, protocol.id);
  
  if (positions.length === 0) {
    return {
      success: false,
      message: 'No concentrated liquidity positions found',
      error: new Error('No CL positions')
    };
  }
  
  const position = positions[0]; // Use first position for demo
  const currentPrice = await getCurrentPrice(position.token0, position.token1);
  
  // Validate range
  if (params.rangeMin >= params.rangeMax) {
    return {
      success: false,
      message: 'Minimum price must be less than maximum price',
      error: new Error('Invalid range')
    };
  }
  
  if (currentPrice < params.rangeMin || currentPrice > params.rangeMax) {
    return {
      success: false,
      message: `Current price (${currentPrice.toFixed(4)}) is outside the specified range`,
      error: new Error('Price out of range')
    };
  }
  
  const txHash = generateMockTxHash();
  const efficiency = calculateRangeEfficiency(params.rangeMin, params.rangeMax, currentPrice);
  
  return {
    success: true,
    message: `Successfully adjusted price range for ${position.token0}/${position.token1} position`,
    txHash,
    data: {
      protocol: protocol.name,
      action: 'adjust_range',
      token0: position.token0,
      token1: position.token1,
      oldRange: `${position.minPrice.toFixed(4)} - ${position.maxPrice.toFixed(4)}`,
      newRange: `${params.rangeMin} - ${params.rangeMax}`,
      currentPrice: currentPrice.toFixed(4),
      capitalEfficiency: (efficiency * 100).toFixed(0) + '%'
    }
  };
}

/**
 * Get DEX protocol by ID
 */
function getProtocol(protocolId?: string): DexProtocol | undefined {
  if (!protocolId) return Object.values(DEX_PROTOCOLS)[0];
  return DEX_PROTOCOLS[protocolId.toLowerCase()];
}

/**
 * Find pool for token pair
 */
function findPool(protocol: DexProtocol, token0: string, token1: string): LiquidityPair | undefined {
  return protocol.supportedPairs.find(pair =>
    (pair.token0 === token0 && pair.token1 === token1) ||
    (pair.token0 === token1 && pair.token1 === token0)
  );
}

/**
 * Find any pair containing a token
 */
function findPairForToken(protocol: DexProtocol, token: string): LiquidityPair | undefined {
  return protocol.supportedPairs.find(pair =>
    pair.token0 === token || pair.token1 === token
  );
}

/**
 * Mock functions
 */
async function checkBalance(address: string, token: string): Promise<number> {
  const balances: Record<string, number> = {
    'USDC': 10000,
    'USDT': 5000,
    'SEI': 5000,
    'ETH': 2.5,
    'BTC': 0.1,
    'ATOM': 100,
    'OSMO': 200
  };
  return balances[token] || 0;
}

async function calculatePairAmount(
  pool: LiquidityPair, 
  inputToken: string, 
  inputAmount: number, 
  outputSide: 'token0' | 'token1'
): Promise<string> {
  // Mock price ratio calculation
  const priceRatio = 0.5 + Math.random() * 2; // Random ratio for demo
  return (inputAmount * priceRatio).toFixed(6);
}

async function calculateLPTokens(
  pool: LiquidityPair,
  amount0: number,
  amount1: number
): Promise<number> {
  // Mock LP token calculation
  return Math.sqrt(amount0 * amount1);
}

async function getPoolAPY(pool: LiquidityPair): Promise<number> {
  // Mock APY based on fee tier
  const baseAPY = pool.fee / 10000; // Fee percentage
  const volumeMultiplier = 10 + Math.random() * 40; // 10-50x
  return baseAPY * volumeMultiplier;
}

interface LiquidityPosition {
  poolId: string;
  token0: string;
  token1: string;
  amount0: number;
  amount1: number;
  lpTokens: number;
  value: number;
}

async function getUserLiquidityPositions(
  address: string,
  protocol: string
): Promise<LiquidityPosition[]> {
  // Mock user positions
  return [
    {
      poolId: 'pool1',
      token0: 'USDC',
      token1: 'SEI',
      amount0: 1000,
      amount1: 2222,
      lpTokens: 1490.7,
      value: 2000
    },
    {
      poolId: 'pool2',
      token0: 'ETH',
      token1: 'USDC',
      amount0: 0.5,
      amount1: 1150,
      lpTokens: 23.98,
      value: 2300
    }
  ];
}

interface CLPosition extends LiquidityPosition {
  minPrice: number;
  maxPrice: number;
  inRange: boolean;
}

async function getUserCLPositions(
  address: string,
  protocol: string
): Promise<CLPosition[]> {
  // Mock concentrated liquidity positions
  return [
    {
      poolId: 'clpool1',
      token0: 'USDC',
      token1: 'SEI',
      amount0: 5000,
      amount1: 11111,
      lpTokens: 7453.5,
      value: 10000,
      minPrice: 0.4,
      maxPrice: 0.5,
      inRange: true
    }
  ];
}

async function calculateAccruedRewards(position: LiquidityPosition): Promise<number> {
  // Mock rewards calculation
  return position.value * 0.001 * Math.random() * 30; // Random daily rewards
}

async function getCurrentPrice(token0: string, token1: string): Promise<number> {
  // Mock current price
  const prices: Record<string, number> = {
    'USDC/SEI': 0.45,
    'SEI/USDC': 2.22,
    'ETH/USDC': 2300,
    'USDC/ETH': 0.000435
  };
  return prices[`${token0}/${token1}`] || 1;
}

function calculateRangeEfficiency(min: number, max: number, current: number): number {
  // Calculate capital efficiency based on range width
  const rangeWidth = max - min;
  const fullRange = current * 2; // Assume 2x as full range
  return Math.min(1, fullRange / rangeWidth);
}

function generateMockTxHash(): string {
  return '0x' + Math.random().toString(16).substr(2, 64);
}

/**
 * Get help text for liquidity commands
 */
export function getLiquidityHelp(): string {
  return [
    '• Add: "add liquidity 1000 USDC and 0.5 ETH" or "provide liquidity 500 SEI to SEI/ATOM"',
    '• Remove: "remove liquidity from USDC/SEI" or "withdraw 50% liquidity"',
    '• Adjust: "adjust range 0.4 - 0.5" (for concentrated liquidity)'
  ].join('\n');
}

/**
 * Get user liquidity positions
 */
export async function getLiquidityPositions(
  walletAddress: string,
  protocol?: string
): Promise<PositionData> {
  const positions = [];
  
  // Get positions from all protocols if not specified
  const protocols = protocol 
    ? [DEX_PROTOCOLS[protocol.toLowerCase()]] 
    : Object.values(DEX_PROTOCOLS);
  
  for (const dex of protocols) {
    if (dex) {
      const userPositions = await getUserLiquidityPositions(walletAddress, dex.id);
      
      for (const pos of userPositions) {
        const apy = await getPoolAPY(
          dex.supportedPairs.find(p => 
            (p.token0 === pos.token0 && p.token1 === pos.token1) ||
            (p.token0 === pos.token1 && p.token1 === pos.token0)
          )!
        );
        
        positions.push({
          protocol: dex.name,
          type: 'liquidity' as const,
          token: `${pos.token0}/${pos.token1}`,
          amount: pos.lpTokens.toFixed(6),
          value: pos.value.toFixed(2),
          apy
        });
      }
    }
  }
  
  return {
    type: 'position',
    positions
  };
}