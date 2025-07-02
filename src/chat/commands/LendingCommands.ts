/**
 * @fileoverview Lending command handlers
 * Implements supply, withdraw, borrow, and repay operations
 */

import type {
  Result,
  Either,
  Option,
  ReadonlyRecord
} from '../../types/index.js';
import { EitherM, Maybe, pipe } from '../../types/index.js';
import type {
  LendingCommand,
  ExecutionResult,
  SessionContext,
  RateData
} from '../types.js';

/**
 * Lending protocol interfaces
 */
interface LendingProtocol {
  readonly id: string;
  readonly name: string;
  readonly contract: string;
  readonly supportedTokens: ReadonlyArray<string>;
}

/**
 * Mock lending protocols
 */
const LENDING_PROTOCOLS: ReadonlyRecord<string, LendingProtocol> = {
  kujira: {
    id: 'kujira',
    name: 'Kujira Ghost',
    contract: 'sei1...',
    supportedTokens: ['USDC', 'SEI', 'ATOM', 'OSMO']
  },
  orca: {
    id: 'orca',
    name: 'Orca Lending',
    contract: 'sei1...',
    supportedTokens: ['USDC', 'USDT', 'SEI', 'ETH', 'BTC']
  }
};

/**
 * Execute lending command
 */
export async function executeLendingCommand(
  command: LendingCommand,
  context: SessionContext
): Promise<ExecutionResult> {
  // Validate wallet connection
  if (!context.walletAddress) {
    return {
      success: false,
      message: 'Please connect your wallet to execute lending operations',
      error: new Error('Wallet not connected')
    };
  }
  
  // Get protocol
  const protocol = getProtocol(command.params.protocol || context.preferences.defaultProtocol);
  if (!protocol) {
    return {
      success: false,
      message: 'Unknown protocol. Available protocols: Kujira, Orca',
      error: new Error('Invalid protocol')
    };
  }
  
  // Check token support
  if (!protocol.supportedTokens.includes(command.params.token)) {
    return {
      success: false,
      message: `${protocol.name} does not support ${command.params.token}. Supported tokens: ${protocol.supportedTokens.join(', ')}`,
      error: new Error('Unsupported token')
    };
  }
  
  // Execute based on command type
  switch (command.type) {
    case 'supply':
      return executeSupply(command, protocol, context);
    case 'withdraw':
      return executeWithdraw(command, protocol, context);
    case 'borrow':
      return executeBorrow(command, protocol, context);
    case 'repay':
      return executeRepay(command, protocol, context);
    default:
      return {
        success: false,
        message: 'Unknown lending command',
        error: new Error('Invalid command type')
      };
  }
}

/**
 * Execute supply operation
 */
async function executeSupply(
  command: LendingCommand,
  protocol: LendingProtocol,
  context: SessionContext
): Promise<ExecutionResult> {
  const amount = command.params.amount;
  const token = command.params.token;
  
  // Mock balance check
  const balance = await checkBalance(context.walletAddress!, token);
  if (parseFloat(amount) > balance) {
    return {
      success: false,
      message: `Insufficient balance. You have ${balance} ${token}`,
      error: new Error('Insufficient balance')
    };
  }
  
  // Mock transaction
  const txHash = generateMockTxHash();
  const apy = await getCurrentAPY(protocol.id, token, 'supply');
  
  return {
    success: true,
    message: `Successfully supplied ${amount} ${token} to ${protocol.name}`,
    txHash,
    data: {
      protocol: protocol.name,
      action: 'supply',
      amount,
      token,
      apy: (apy * 100).toFixed(2) + '%',
      estimatedYearlyEarnings: (parseFloat(amount) * apy).toFixed(2) + ' ' + token
    }
  };
}

/**
 * Execute withdraw operation
 */
async function executeWithdraw(
  command: LendingCommand,
  protocol: LendingProtocol,
  context: SessionContext
): Promise<ExecutionResult> {
  const amount = command.params.amount;
  const token = command.params.token;
  
  // Mock supplied balance check
  const supplied = await getSuppliedBalance(context.walletAddress!, protocol.id, token);
  if (parseFloat(amount) > supplied) {
    return {
      success: false,
      message: `Insufficient supplied balance. You have ${supplied} ${token} supplied`,
      error: new Error('Insufficient supplied balance')
    };
  }
  
  // Check if withdrawal affects health factor
  const healthCheck = await checkHealthAfterWithdraw(context.walletAddress!, protocol.id, amount, token);
  if (!healthCheck.safe) {
    return {
      success: false,
      message: `Withdrawal would reduce health factor below safe threshold (${healthCheck.newHealth.toFixed(2)})`,
      error: new Error('Unsafe withdrawal')
    };
  }
  
  const txHash = generateMockTxHash();
  
  return {
    success: true,
    message: `Successfully withdrew ${amount} ${token} from ${protocol.name}`,
    txHash,
    data: {
      protocol: protocol.name,
      action: 'withdraw',
      amount,
      token,
      remainingSupplied: (supplied - parseFloat(amount)).toFixed(2) + ' ' + token,
      healthFactor: healthCheck.newHealth.toFixed(2)
    }
  };
}

/**
 * Execute borrow operation
 */
async function executeBorrow(
  command: LendingCommand,
  protocol: LendingProtocol,
  context: SessionContext
): Promise<ExecutionResult> {
  const amount = command.params.amount;
  const token = command.params.token;
  
  // Check collateral
  const collateral = await getTotalCollateral(context.walletAddress!, protocol.id);
  const borrowLimit = collateral * 0.75; // 75% LTV
  const currentBorrow = await getTotalBorrowed(context.walletAddress!, protocol.id);
  const tokenPrice = await getTokenPrice(token);
  const borrowValue = parseFloat(amount) * tokenPrice;
  
  if (currentBorrow + borrowValue > borrowLimit) {
    return {
      success: false,
      message: `Insufficient collateral. Max borrow: $${(borrowLimit - currentBorrow).toFixed(2)}`,
      error: new Error('Insufficient collateral')
    };
  }
  
  const txHash = generateMockTxHash();
  const apy = await getCurrentAPY(protocol.id, token, 'borrow');
  
  return {
    success: true,
    message: `Successfully borrowed ${amount} ${token} from ${protocol.name}`,
    txHash,
    data: {
      protocol: protocol.name,
      action: 'borrow',
      amount,
      token,
      borrowAPY: (apy * 100).toFixed(2) + '%',
      yearlyInterest: (parseFloat(amount) * apy).toFixed(2) + ' ' + token,
      healthFactor: ((borrowLimit / (currentBorrow + borrowValue)) * 1.5).toFixed(2)
    }
  };
}

/**
 * Execute repay operation
 */
async function executeRepay(
  command: LendingCommand,
  protocol: LendingProtocol,
  context: SessionContext
): Promise<ExecutionResult> {
  const amount = command.params.amount;
  const token = command.params.token;
  
  // Check borrowed amount
  const borrowed = await getBorrowedBalance(context.walletAddress!, protocol.id, token);
  const repayAmount = Math.min(parseFloat(amount), borrowed);
  
  // Check wallet balance
  const balance = await checkBalance(context.walletAddress!, token);
  if (repayAmount > balance) {
    return {
      success: false,
      message: `Insufficient balance. You have ${balance} ${token}`,
      error: new Error('Insufficient balance')
    };
  }
  
  const txHash = generateMockTxHash();
  const interestSaved = await calculateInterestSaved(repayAmount, token, protocol.id);
  
  return {
    success: true,
    message: `Successfully repaid ${repayAmount} ${token} to ${protocol.name}`,
    txHash,
    data: {
      protocol: protocol.name,
      action: 'repay',
      amount: repayAmount.toString(),
      token,
      remainingDebt: (borrowed - repayAmount).toFixed(2) + ' ' + token,
      interestSaved: interestSaved.toFixed(2) + ' ' + token + ' per year'
    }
  };
}

/**
 * Get lending protocol by ID
 */
function getProtocol(protocolId?: string): LendingProtocol | undefined {
  if (!protocolId) return Object.values(LENDING_PROTOCOLS)[0];
  return LENDING_PROTOCOLS[protocolId.toLowerCase()];
}

/**
 * Mock functions for demo
 */
async function checkBalance(address: string, token: string): Promise<number> {
  // Mock balances
  const balances: Record<string, number> = {
    'USDC': 10000,
    'SEI': 5000,
    'ETH': 2.5,
    'BTC': 0.1,
    'ATOM': 100,
    'OSMO': 200
  };
  return balances[token] || 0;
}

async function getSuppliedBalance(address: string, protocol: string, token: string): Promise<number> {
  // Mock supplied balances
  return Math.random() * 5000;
}

async function getBorrowedBalance(address: string, protocol: string, token: string): Promise<number> {
  // Mock borrowed balances
  return Math.random() * 1000;
}

async function getTotalCollateral(address: string, protocol: string): Promise<number> {
  // Mock total collateral value in USD
  return 15000;
}

async function getTotalBorrowed(address: string, protocol: string): Promise<number> {
  // Mock total borrowed value in USD
  return 3000;
}

async function getTokenPrice(token: string): Promise<number> {
  // Mock token prices
  const prices: Record<string, number> = {
    'USDC': 1,
    'USDT': 1,
    'SEI': 0.45,
    'ETH': 2300,
    'BTC': 65000,
    'ATOM': 9.5,
    'OSMO': 0.8
  };
  return prices[token] || 1;
}

async function getCurrentAPY(protocol: string, token: string, type: 'supply' | 'borrow'): Promise<number> {
  // Mock APY rates
  if (type === 'supply') {
    return 0.05 + Math.random() * 0.1; // 5-15%
  } else {
    return 0.08 + Math.random() * 0.12; // 8-20%
  }
}

async function checkHealthAfterWithdraw(
  address: string, 
  protocol: string, 
  amount: string, 
  token: string
): Promise<{ safe: boolean; newHealth: number }> {
  // Mock health factor calculation
  const newHealth = 1.2 + Math.random() * 0.8;
  return {
    safe: newHealth > 1.1,
    newHealth
  };
}

async function calculateInterestSaved(amount: number, token: string, protocol: string): Promise<number> {
  const apy = await getCurrentAPY(protocol, token, 'borrow');
  return amount * apy;
}

function generateMockTxHash(): string {
  return '0x' + Math.random().toString(16).substr(2, 64);
}

/**
 * Get help text for lending commands
 */
export function getLendingHelp(): string {
  return [
    '• Supply: "supply 1000 USDC" or "lend 500 SEI on Kujira"',
    '• Withdraw: "withdraw 500 USDC" or "remove 1 ETH from Orca"',
    '• Borrow: "borrow 100 SEI" or "take 0.1 BTC loan"',
    '• Repay: "repay 50 SEI" or "pay back 100 USDC"'
  ].join('\n');
}

/**
 * Get current lending rates
 */
export async function getLendingRates(token?: string): Promise<RateData> {
  const rates = [];
  
  for (const protocol of Object.values(LENDING_PROTOCOLS)) {
    const tokens = token ? [token] : protocol.supportedTokens;
    
    for (const t of tokens) {
      if (protocol.supportedTokens.includes(t)) {
        const supplyAPY = await getCurrentAPY(protocol.id, t, 'supply');
        const borrowAPY = await getCurrentAPY(protocol.id, t, 'borrow');
        
        rates.push({
          protocol: protocol.name,
          token: t,
          supplyAPY,
          borrowAPY,
          utilization: 0.4 + Math.random() * 0.4, // 40-80%
          totalSupply: (Math.random() * 10000000).toFixed(0),
          totalBorrow: (Math.random() * 5000000).toFixed(0)
        });
      }
    }
  }
  
  return {
    type: 'rates',
    rates
  };
}