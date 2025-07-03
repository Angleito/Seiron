/**
 * Lending Tools for LangChain Integration
 * 
 * This module provides LangChain tools for lending operations including
 * deposits, withdrawals, borrowing, and repayments on YeiFinance and Takara protocols.
 */

import { z } from 'zod';
import { BaseDeFiTool, DeFiToolConfig, DeFiToolResult, ToolContext, CommonSchemas } from './BaseTool';
import { ParameterParser, parseInput } from './ParameterParser';
import { depositAction, withdrawAction, borrowAction, repayAction, getHealthFactorAction } from '../../agents/actions/lending';
import { ActionContext } from '../../agents/base/BaseAgent';

/**
 * Deposit Tool - Supply assets to lending protocols
 */
export class DepositTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'deposit_lending',
      description: 'Deposit assets to lending protocols like YeiFinance and Takara to earn interest',
      category: 'lending',
      schema: CommonSchemas.LendingOperation,
      examples: [
        'Deposit 100 USDC to earn interest',
        'Supply 0.5 ETH to the lending pool',
        'Deposit 1000 SEI on YeiFinance',
        'Lend 50 USDT to Takara protocol'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress,
      defaultProtocol: 'YeiFinance'
    });
    
    const parsed = parser.parse(input);
    
    return {
      asset: parsed.asset,
      amount: parsed.amount,
      walletAddress: parsed.walletAddress,
      protocol: parsed.protocol || 'YeiFinance'
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { asset, amount, walletAddress, protocol } = params;
    
    const actionContext: ActionContext = {
      agentId: 'langchain-lending-agent',
      userId: this.context.userId,
      parameters: { asset, amount, walletAddress },
      state: {
        status: 'active',
        lastUpdate: new Date(),
        metrics: {
          actionsExecuted: 0,
          successRate: 1.0,
          avgResponseTime: 0,
          errorCount: 0,
          uptime: 0
        },
        context: { protocol }
      },
      metadata: {}
    };

    try {
      const result = await depositAction.handler(actionContext)();
      
      if (result._tag === 'Right') {
        return {
          success: true,
          message: `Successfully deposited ${amount} ${asset} to ${protocol}`,
          data: result.right.data,
          transactionHash: result.right.data?.txHash,
          timestamp: new Date()
        };
      } else {
        return {
          success: false,
          message: `Failed to deposit ${amount} ${asset}: ${result.left.message}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Withdraw Tool - Remove assets from lending protocols
 */
export class WithdrawTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'withdraw_lending',
      description: 'Withdraw supplied assets from lending protocols',
      category: 'lending',
      schema: CommonSchemas.LendingOperation,
      examples: [
        'Withdraw 50 USDC from lending',
        'Remove 0.2 ETH from the pool',
        'Withdraw all my SEI from YeiFinance',
        'Take out 100 USDT from Takara'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress,
      defaultProtocol: 'YeiFinance'
    });
    
    const parsed = parser.parse(input);
    
    return {
      asset: parsed.asset,
      amount: parsed.amount,
      walletAddress: parsed.walletAddress,
      protocol: parsed.protocol || 'YeiFinance'
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { asset, amount, walletAddress, protocol } = params;
    
    const actionContext: ActionContext = {
      agentId: 'langchain-lending-agent',
      userId: this.context.userId,
      parameters: { asset, amount, walletAddress },
      state: {
        status: 'active',
        lastUpdate: new Date(),
        metrics: {
          actionsExecuted: 0,
          successRate: 1.0,
          avgResponseTime: 0,
          errorCount: 0,
          uptime: 0
        },
        context: { protocol }
      },
      metadata: {}
    };

    try {
      const result = await withdrawAction.handler(actionContext)();
      
      if (result._tag === 'Right') {
        return {
          success: true,
          message: `Successfully withdrew ${amount} ${asset} from ${protocol}`,
          data: result.right.data,
          transactionHash: result.right.data?.txHash,
          timestamp: new Date()
        };
      } else {
        return {
          success: false,
          message: `Failed to withdraw ${amount} ${asset}: ${result.left.message}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Withdraw failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Borrow Tool - Take loans against collateral
 */
export class BorrowTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'borrow_lending',
      description: 'Borrow assets against your collateral from lending protocols',
      category: 'lending',
      schema: CommonSchemas.LendingOperation.extend({
        interestRateMode: z.enum(['stable', 'variable']).default('variable')
      }),
      examples: [
        'Borrow 200 USDC with variable rate',
        'Take a loan of 0.1 ETH with stable rate',
        'Borrow 500 SEI from YeiFinance',
        'Leverage with 100 USDT from Takara'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress,
      defaultProtocol: 'YeiFinance'
    });
    
    const parsed = parser.parse(input);
    
    return {
      asset: parsed.asset,
      amount: parsed.amount,
      walletAddress: parsed.walletAddress,
      interestRateMode: parsed.interestRateMode || 'variable',
      protocol: parsed.protocol || 'YeiFinance'
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { asset, amount, walletAddress, interestRateMode, protocol } = params;
    
    const actionContext: ActionContext = {
      agentId: 'langchain-lending-agent',
      userId: this.context.userId,
      parameters: { asset, amount, walletAddress, interestRateMode },
      state: {
        status: 'active',
        lastUpdate: new Date(),
        metrics: {
          actionsExecuted: 0,
          successRate: 1.0,
          avgResponseTime: 0,
          errorCount: 0,
          uptime: 0
        },
        context: { protocol }
      },
      metadata: {}
    };

    try {
      const result = await borrowAction.handler(actionContext)();
      
      if (result._tag === 'Right') {
        return {
          success: true,
          message: `Successfully borrowed ${amount} ${asset} with ${interestRateMode} rate from ${protocol}`,
          data: result.right.data,
          transactionHash: result.right.data?.txHash,
          timestamp: new Date()
        };
      } else {
        return {
          success: false,
          message: `Failed to borrow ${amount} ${asset}: ${result.left.message}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Borrow failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Repay Tool - Pay back borrowed assets
 */
export class RepayTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'repay_lending',
      description: 'Repay borrowed assets to lending protocols',
      category: 'lending',
      schema: CommonSchemas.LendingOperation.extend({
        interestRateMode: z.enum(['stable', 'variable']).default('variable')
      }),
      examples: [
        'Repay 100 USDC loan',
        'Pay back 0.05 ETH with variable rate',
        'Repay all my SEI debt',
        'Return 50 USDT to Takara'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress,
      defaultProtocol: 'YeiFinance'
    });
    
    const parsed = parser.parse(input);
    
    return {
      asset: parsed.asset,
      amount: parsed.amount,
      walletAddress: parsed.walletAddress,
      interestRateMode: parsed.interestRateMode || 'variable',
      protocol: parsed.protocol || 'YeiFinance'
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { asset, amount, walletAddress, interestRateMode, protocol } = params;
    
    const actionContext: ActionContext = {
      agentId: 'langchain-lending-agent',
      userId: this.context.userId,
      parameters: { asset, amount, walletAddress, interestRateMode },
      state: {
        status: 'active',
        lastUpdate: new Date(),
        metrics: {
          actionsExecuted: 0,
          successRate: 1.0,
          avgResponseTime: 0,
          errorCount: 0,
          uptime: 0
        },
        context: { protocol }
      },
      metadata: {}
    };

    try {
      const result = await repayAction.handler(actionContext)();
      
      if (result._tag === 'Right') {
        return {
          success: true,
          message: `Successfully repaid ${amount} ${asset} with ${interestRateMode} rate to ${protocol}`,
          data: result.right.data,
          transactionHash: result.right.data?.txHash,
          timestamp: new Date()
        };
      } else {
        return {
          success: false,
          message: `Failed to repay ${amount} ${asset}: ${result.left.message}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Repay failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Health Factor Tool - Check lending position health
 */
export class HealthFactorTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'health_factor_lending',
      description: 'Check the health factor of your lending position to monitor liquidation risk',
      category: 'lending',
      schema: z.object({
        walletAddress: z.string().optional()
      }),
      examples: [
        'Check my health factor',
        'What is my liquidation risk?',
        'Show my lending position health',
        'Check if I might get liquidated'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress
    });
    
    const parsed = parser.parse(input);
    
    return {
      walletAddress: parsed.walletAddress
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { walletAddress } = params;
    
    const actionContext: ActionContext = {
      agentId: 'langchain-lending-agent',
      userId: this.context.userId,
      parameters: { walletAddress },
      state: {
        status: 'active',
        lastUpdate: new Date(),
        metrics: {
          actionsExecuted: 0,
          successRate: 1.0,
          avgResponseTime: 0,
          errorCount: 0,
          uptime: 0
        },
        context: {}
      },
      metadata: {}
    };

    try {
      const result = await getHealthFactorAction.handler(actionContext)();
      
      if (result._tag === 'Right') {
        const healthData = result.right.data;
        const healthFactor = parseFloat(healthData.healthFactor);
        
        let riskLevel = 'Safe';
        if (healthFactor < 1.1) {
          riskLevel = 'Critical Risk';
        } else if (healthFactor < 1.3) {
          riskLevel = 'High Risk';
        } else if (healthFactor < 1.5) {
          riskLevel = 'Medium Risk';
        } else if (healthFactor < 2.0) {
          riskLevel = 'Low Risk';
        }
        
        return {
          success: true,
          message: `Health Factor: ${healthFactor.toFixed(4)} (${riskLevel})
          
💰 Total Collateral: ${healthData.totalCollateralETH} ETH
💸 Total Debt: ${healthData.totalDebtETH} ETH
🏦 Available to Borrow: ${healthData.availableBorrowsETH} ETH
📊 LTV: ${healthData.ltv}%
⚠️ Liquidation at: ${healthData.liquidationThreshold}%

${healthFactor < 1.3 ? '🚨 Warning: Your position is at risk of liquidation!' : '✅ Your position is healthy'}`,
          data: healthData,
          timestamp: new Date()
        };
      } else {
        return {
          success: false,
          message: `Failed to get health factor: ${result.left.message}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Yield Optimization Tool - Find best lending rates
 */
export class YieldOptimizationTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'yield_optimization_lending',
      description: 'Compare lending rates across protocols to find the best yield opportunities',
      category: 'lending',
      schema: z.object({
        asset: z.string().describe('Asset to compare rates for'),
        amount: z.string().optional().describe('Amount to optimize for'),
        operation: z.enum(['supply', 'borrow']).describe('Whether to optimize for supply or borrow rates')
      }),
      examples: [
        'Find best supply rates for USDC',
        'Compare borrow rates for ETH',
        'Where can I get the best yield for 1000 SEI?',
        'Show me the best places to borrow USDT'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress
    });
    
    const parsed = parser.parse(input);
    
    // Determine operation type from input
    let operation = 'supply';
    if (input.toLowerCase().includes('borrow') || input.toLowerCase().includes('loan')) {
      operation = 'borrow';
    }
    
    return {
      asset: parsed.asset,
      amount: parsed.amount,
      operation
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { asset, amount, operation } = params;
    
    // Mock data for demonstration - in real implementation, this would fetch from protocols
    const mockRates = {
      supply: {
        YeiFinance: { rate: 5.2, tvl: '1.2M' },
        Takara: { rate: 4.8, tvl: '850K' },
        Silo: { rate: 6.1, tvl: '500K' }
      },
      borrow: {
        YeiFinance: { rate: 8.5, tvl: '1.2M' },
        Takara: { rate: 7.9, tvl: '850K' },
        Silo: { rate: 9.2, tvl: '500K' }
      }
    };
    
    const rates = mockRates[operation as keyof typeof mockRates];
    const sortedRates = Object.entries(rates).sort((a, b) => 
      operation === 'supply' ? b[1].rate - a[1].rate : a[1].rate - b[1].rate
    );
    
    const bestProtocol = sortedRates[0];
    const rateType = operation === 'supply' ? 'APY' : 'APR';
    
    const ratingsText = sortedRates.map(([protocol, data], index) => 
      `${index + 1}. ${protocol}: ${data.rate}% ${rateType} (TVL: ${data.tvl})`
    ).join('\n');
    
    return {
      success: true,
      message: `Best ${operation} rates for ${asset}:

${ratingsText}

🏆 Best Option: ${bestProtocol[0]} with ${bestProtocol[1].rate}% ${rateType}
${amount ? `💰 For ${amount} ${asset}, you would ${operation === 'supply' ? 'earn' : 'pay'} ~${(parseFloat(amount) * bestProtocol[1].rate / 100).toFixed(2)} ${asset} annually` : ''}`,
      data: {
        asset,
        operation,
        rates: Object.fromEntries(sortedRates),
        bestProtocol: bestProtocol[0],
        bestRate: bestProtocol[1].rate
      },
      timestamp: new Date()
    };
  }
}

/**
 * Export all lending tools
 */
export const lendingTools = {
  DepositTool,
  WithdrawTool,
  BorrowTool,
  RepayTool,
  HealthFactorTool,
  YieldOptimizationTool
};

/**
 * Factory function to create all lending tools
 */
export function createLendingTools(context: ToolContext = {}): BaseDeFiTool[] {
  return [
    new DepositTool(context),
    new WithdrawTool(context),
    new BorrowTool(context),
    new RepayTool(context),
    new HealthFactorTool(context),
    new YieldOptimizationTool(context)
  ];
}

/**
 * Helper function to create a specific lending tool
 */
export function createLendingTool(
  toolName: keyof typeof lendingTools,
  context: ToolContext = {}
): BaseDeFiTool {
  const ToolClass = lendingTools[toolName];
  return new ToolClass(context);
}