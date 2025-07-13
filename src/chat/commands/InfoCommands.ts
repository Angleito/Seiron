/**
 * @fileoverview Information command handlers
 * Implements show positions, check rates, and portfolio status queries
 */

import type {
  Result,
  Either,
  Option,
  ReadonlyRecord
} from '../../types/index.js';
import { EitherM, Maybe, pipe } from '../../types/index';
import type {
  InfoCommand,
  ExecutionResult,
  SessionContext,
  PositionData,
  RateData,
  PortfolioData
} from '../types.js';
import { getLendingRates } from './LendingCommands';
import { getLiquidityPositions } from './LiquidityCommands';

/**
 * Execute info command
 */
export async function executeInfoCommand(
  command: InfoCommand,
  context: SessionContext
): Promise<ExecutionResult> {
  switch (command.type) {
    case 'show_positions':
      return executeShowPositions(command, context);
    case 'check_rates':
      return executeCheckRates(command, context);
    case 'portfolio_status':
      return executePortfolioStatus(command, context);
    default:
      return {
        success: false,
        message: 'Unknown info command',
        error: new Error('Invalid command type')
      };
  }
}

/**
 * Execute show positions command
 */
async function executeShowPositions(
  command: InfoCommand,
  context: SessionContext
): Promise<ExecutionResult> {
  if (!context.walletAddress) {
    return {
      success: false,
      message: 'Please connect your wallet to view positions',
      error: new Error('Wallet not connected')
    };
  }
  
  const params = command.params;
  const positions: any[] = [];
  
  // Get lending positions
  const lendingPositions = await getLendingPositions(
    context.walletAddress,
    params.protocol
  );
  positions.push(...lendingPositions);
  
  // Get liquidity positions
  const liquidityData = await getLiquidityPositions(
    context.walletAddress,
    params.protocol
  );
  positions.push(...liquidityData.positions);
  
  // Filter by token if specified
  let filteredPositions = positions;
  if (params.token) {
    filteredPositions = positions.filter(pos =>
      pos.token.includes(params.token!)
    );
  }
  
  if (filteredPositions.length === 0) {
    return {
      success: true,
      message: 'No positions found' + (params.token ? ` for ${params.token}` : ''),
      data: {
        type: 'position',
        positions: []
      } as ReadonlyRecord<string, unknown>
    };
  }
  
  // Calculate total value
  const totalValue = filteredPositions.reduce((sum, pos) => 
    sum + parseFloat(pos.value), 0
  );
  
  const positionData: PositionData = {
    type: 'position',
    positions: filteredPositions
  };
  
  return {
    success: true,
    message: `Found ${filteredPositions.length} position${filteredPositions.length > 1 ? 's' : ''} worth $${totalValue.toFixed(2)}`,
    data: positionData as ReadonlyRecord<string, unknown>
  };
}

/**
 * Execute check rates command
 */
async function executeCheckRates(
  command: InfoCommand,
  context: SessionContext
): Promise<ExecutionResult> {
  const params = command.params;
  
  // Get lending rates
  const rateData = await getLendingRates(params.token);
  
  // Get liquidity APYs
  const liquidityAPYs = await getLiquidityAPYs(params.token);
  
  // Combine all rates
  const allRates = [...rateData.rates, ...liquidityAPYs];
  
  // Filter by protocol if specified
  let filteredRates = allRates;
  if (params.protocol) {
    filteredRates = allRates.filter(rate =>
      rate.protocol.toLowerCase().includes(params.protocol!.toLowerCase())
    );
  }
  
  if (filteredRates.length === 0) {
    return {
      success: true,
      message: 'No rates found for the specified criteria',
      data: {
        type: 'rates',
        rates: []
      } as ReadonlyRecord<string, unknown>
    };
  }
  
  // Find best rates
  const bestSupply = filteredRates
    .filter(r => 'supplyAPY' in r)
    .sort((a, b) => b.supplyAPY - a.supplyAPY)[0];
  
  const bestBorrow = filteredRates
    .filter(r => 'borrowAPY' in r)
    .sort((a, b) => a.borrowAPY - b.borrowAPY)[0];
  
  let message = `Current rates${params.token ? ` for ${params.token}` : ''}:\n`;
  
  if (bestSupply) {
    message += `Best supply: ${bestSupply.protocol} at ${(bestSupply.supplyAPY * 100).toFixed(2)}% APY\n`;
  }
  
  if (bestBorrow) {
    message += `Best borrow: ${bestBorrow.protocol} at ${(bestBorrow.borrowAPY * 100).toFixed(2)}% APY`;
  }
  
  const responseData: RateData = {
    type: 'rates',
    rates: filteredRates
  };
  
  return {
    success: true,
    message,
    data: responseData as ReadonlyRecord<string, unknown>
  };
}

/**
 * Execute portfolio status command
 */
async function executePortfolioStatus(
  command: InfoCommand,
  context: SessionContext
): Promise<ExecutionResult> {
  if (!context.walletAddress) {
    return {
      success: false,
      message: 'Please connect your wallet to view portfolio status',
      error: new Error('Wallet not connected')
    };
  }
  
  // Get all positions
  const lendingPositions = await getLendingPositions(context.walletAddress);
  const liquidityData = await getLiquidityPositions(context.walletAddress);
  const borrowPositions = await getBorrowPositions(context.walletAddress);
  
  // Calculate totals
  const suppliedValue = lendingPositions
    .filter(p => p.type === 'lending' && !p.borrowed)
    .reduce((sum, p) => sum + parseFloat(p.value), 0);
  
  const borrowedValue = borrowPositions
    .reduce((sum, p) => sum + parseFloat(p.value), 0);
  
  const liquidityValue = liquidityData.positions
    .reduce((sum, p) => sum + parseFloat(p.value), 0);
  
  const totalValue = suppliedValue + liquidityValue - borrowedValue;
  
  // Calculate net APY
  const supplyAPY = calculateWeightedAPY(
    lendingPositions.filter(p => !p.borrowed)
  );
  const borrowAPY = calculateWeightedAPY(borrowPositions);
  const liquidityAPY = calculateWeightedAPY(liquidityData.positions);
  
  const netAPY = (
    (supplyAPY * suppliedValue + liquidityAPY * liquidityValue - borrowAPY * borrowedValue) /
    (suppliedValue + liquidityValue)
  );
  
  // Calculate health factor
  const healthFactor = borrowedValue > 0 
    ? (suppliedValue * 0.75) / borrowedValue // 75% LTV
    : 999;
  
  const portfolioData: PortfolioData = {
    type: 'portfolio',
    totalValue: totalValue.toFixed(2),
    suppliedValue: suppliedValue.toFixed(2),
    borrowedValue: borrowedValue.toFixed(2),
    liquidityValue: liquidityValue.toFixed(2),
    healthFactor: healthFactor > 100 ? undefined : healthFactor,
    netAPY
  };
  
  let message = 'Portfolio Overview:\n';
  message += `Total Value: $${totalValue.toFixed(2)}\n`;
  message += `Net APY: ${(netAPY * 100).toFixed(2)}%`;
  
  if (healthFactor < 1.5 && healthFactor < 100) {
    message += `\n⚠️ Warning: Health factor is ${healthFactor.toFixed(2)}`;
  }
  
  return {
    success: true,
    message,
    data: portfolioData as ReadonlyRecord<string, unknown>
  };
}

/**
 * Mock functions for getting position data
 */
async function getLendingPositions(
  walletAddress: string,
  protocol?: string
): Promise<Array<{
  protocol: string;
  type: string;
  token: string;
  amount: string;
  value: string;
  apy: number;
  borrowed?: boolean;
}>> {
  // Mock lending positions
  return [
    {
      protocol: 'Kujira Ghost',
      type: 'lending',
      token: 'USDC',
      amount: '5000',
      value: '5000',
      apy: 0.08,
      borrowed: false
    },
    {
      protocol: 'Orca Lending',
      type: 'lending',
      token: 'SEI',
      amount: '2000',
      value: '900',
      apy: 0.12,
      borrowed: false
    }
  ];
}

async function getBorrowPositions(
  walletAddress: string,
  protocol?: string
): Promise<Array<{
  protocol: string;
  type: string;
  token: string;
  amount: string;
  value: string;
  apy: number;
  health?: number;
}>> {
  // Mock borrow positions
  return [
    {
      protocol: 'Kujira Ghost',
      type: 'lending',
      token: 'SEI',
      amount: '1000',
      value: '450',
      apy: 0.15,
      health: 1.8
    }
  ];
}

async function getLiquidityAPYs(token?: string): Promise<Array<{
  protocol: string;
  token: string;
  supplyAPY: number;
  borrowAPY: number;
  utilization: number;
  totalSupply: string;
  totalBorrow: string;
}>> {
  // Mock liquidity pool APYs
  const pools = [
    {
      protocol: 'DragonSwap',
      token: 'USDC/SEI',
      supplyAPY: 0.25,
      borrowAPY: 0,
      utilization: 0,
      totalSupply: '1000000',
      totalBorrow: '0'
    },
    {
      protocol: 'Astroport',
      token: 'ETH/USDC',
      supplyAPY: 0.18,
      borrowAPY: 0,
      utilization: 0,
      totalSupply: '500000',
      totalBorrow: '0'
    }
  ];
  
  if (token) {
    return pools.filter(p => p.token.includes(token));
  }
  
  return pools;
}

function calculateWeightedAPY(
  positions: ReadonlyArray<{ value: string; apy: number }>
): number {
  if (positions.length === 0) return 0;
  
  const totalValue = positions.reduce((sum, p) => sum + parseFloat(p.value), 0);
  if (totalValue === 0) return 0;
  
  const weightedSum = positions.reduce(
    (sum, p) => sum + parseFloat(p.value) * p.apy,
    0
  );
  
  return weightedSum / totalValue;
}

/**
 * Get help text for info commands
 */
export function getInfoHelp(): string {
  return [
    '• Positions: "show my positions" or "show positions in USDC"',
    '• Rates: "check rates" or "what\'s the best APY for USDC?"',
    '• Portfolio: "portfolio status" or "show my balance"'
  ].join('\n');
}

/**
 * Get rate comparisons across protocols
 */
export async function getRateComparison(
  token: string
): Promise<{
  lending: Array<{ protocol: string; supplyAPY: number; borrowAPY: number }>;
  liquidity: Array<{ protocol: string; pair: string; apy: number }>;
}> {
  const lendingRates = await getLendingRates(token);
  const liquidityAPYs = await getLiquidityAPYs(token);
  
  return {
    lending: lendingRates.rates.map(r => ({
      protocol: r.protocol,
      supplyAPY: r.supplyAPY,
      borrowAPY: r.borrowAPY
    })),
    liquidity: liquidityAPYs.map(l => ({
      protocol: l.protocol,
      pair: l.token,
      apy: l.supplyAPY
    }))
  };
}