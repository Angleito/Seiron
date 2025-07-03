/**
 * Liquidity Tools for LangChain Integration
 * 
 * This module provides LangChain tools for liquidity operations including
 * swaps, liquidity provision, and arbitrage on DragonSwap and Symphony protocols.
 */

import { z } from 'zod';
import { BaseDeFiTool, DeFiToolConfig, DeFiToolResult, ToolContext, CommonSchemas } from './BaseTool';
import { ParameterParser, parseInput } from './ParameterParser';
import { addLiquidityAction, removeLiquidityAction, swapAction } from '../../agents/actions/liquidity';
import { ActionContext } from '../../agents/base/BaseAgent';

/**
 * Swap Tool - Exchange tokens on DEX
 */
export class SwapTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'swap_tokens',
      description: 'Swap tokens on decentralized exchanges like DragonSwap and Symphony',
      category: 'liquidity',
      schema: CommonSchemas.SwapOperation,
      examples: [
        'Swap 100 USDC for ETH',
        'Exchange 0.5 ETH to SEI',
        'Trade 1000 SEI for USDT with 2% slippage',
        'Convert 50 USDC to WETH on DragonSwap'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress,
      defaultProtocol: 'DragonSwap'
    });
    
    const parsed = parser.parse(input);
    
    return {
      tokenIn: parsed.asset,
      tokenOut: parsed.targetAsset,
      amountIn: parsed.amount,
      slippageTolerance: parsed.slippage || 2.0,
      walletAddress: parsed.walletAddress,
      protocol: parsed.protocol || 'DragonSwap'
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { tokenIn, tokenOut, amountIn, slippageTolerance, walletAddress, protocol } = params;
    
    const actionContext: ActionContext = {
      agentId: 'langchain-liquidity-agent',
      userId: this.context.userId,
      parameters: { 
        tokenIn, 
        tokenOut, 
        amountIn, 
        amountOutMinimum: '0', // Will be calculated based on slippage
        slippageTolerance,
        walletAddress 
      },
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
      const result = await swapAction.handler(actionContext)();
      
      if (result._tag === 'Right') {
        const swapData = result.right.data;
        return {
          success: true,
          message: `Successfully swapped ${amountIn} ${tokenIn} for ${swapData.amountOut || 'estimated'} ${tokenOut} on ${protocol}`,
          data: swapData,
          transactionHash: swapData?.txHash,
          gasUsed: swapData?.gasUsed,
          timestamp: new Date()
        };
      } else {
        return {
          success: false,
          message: `Failed to swap ${amountIn} ${tokenIn} for ${tokenOut}: ${result.left.message}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Add Liquidity Tool - Provide liquidity to DEX pools
 */
export class AddLiquidityTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'add_liquidity',
      description: 'Add liquidity to decentralized exchange pools to earn trading fees',
      category: 'liquidity',
      schema: CommonSchemas.LiquidityOperation.extend({
        fee: z.number().optional().describe('Fee tier (500, 3000, 10000)')
      }),
      examples: [
        'Add liquidity: 100 USDC and 0.05 ETH',
        'Provide 1000 SEI and 500 USDT to pool',
        'Add 50 USDC and 0.02 WETH with 0.3% fee',
        'Create LP position with 200 USDT and 100 SEI'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress,
      defaultProtocol: 'DragonSwap'
    });
    
    const parsed = parser.parse(input);
    
    // Extract two assets and amounts from more complex patterns
    const liquidityPattern = /(\d+(?:\.\d+)?)\s*(USD[CT]?|ETH|BTC|SEI|WETH|WBTC|ATOM|OSMO)\s+and\s+(\d+(?:\.\d+)?)\s*(USD[CT]?|ETH|BTC|SEI|WETH|WBTC|ATOM|OSMO)/i;
    const match = input.match(liquidityPattern);
    
    if (match) {
      return {
        token0: match[2].toUpperCase(),
        token1: match[4].toUpperCase(),
        amount0: match[1],
        amount1: match[3],
        fee: 3000, // Default 0.3% fee
        walletAddress: parsed.walletAddress,
        protocol: parsed.protocol || 'DragonSwap'
      };
    }
    
    return {
      token0: parsed.asset,
      token1: parsed.targetAsset,
      amount0: parsed.amount,
      amount1: '0', // Will need to be calculated
      fee: 3000,
      walletAddress: parsed.walletAddress,
      protocol: parsed.protocol || 'DragonSwap'
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { token0, token1, amount0, amount1, fee, walletAddress, protocol } = params;
    
    const actionContext: ActionContext = {
      agentId: 'langchain-liquidity-agent',
      userId: this.context.userId,
      parameters: { 
        token0, 
        token1, 
        amount0Desired: amount0,
        amount1Desired: amount1,
        fee: fee || 3000,
        walletAddress,
        tickLower: -60000, // Wide range for demo
        tickUpper: 60000
      },
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
      const result = await addLiquidityAction.handler(actionContext)();
      
      if (result._tag === 'Right') {
        const liquidityData = result.right.data;
        return {
          success: true,
          message: `Successfully added liquidity: ${amount0} ${token0} + ${amount1} ${token1} to ${protocol}
          
🎯 Pool: ${token0}/${token1}
💰 Fee Tier: ${(fee / 10000)}%
🏷️ Position ID: ${liquidityData.positionId || 'N/A'}
💧 Liquidity Added: ${liquidityData.liquidity || 'N/A'}`,
          data: liquidityData,
          transactionHash: liquidityData?.txHash,
          gasUsed: liquidityData?.gasUsed,
          timestamp: new Date()
        };
      } else {
        return {
          success: false,
          message: `Failed to add liquidity: ${result.left.message}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Add liquidity failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Remove Liquidity Tool - Withdraw liquidity from DEX pools
 */
export class RemoveLiquidityTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'remove_liquidity',
      description: 'Remove liquidity from decentralized exchange pools',
      category: 'liquidity',
      schema: z.object({
        positionId: z.string().describe('NFT position ID or pool identifier'),
        liquidity: z.string().describe('Amount of liquidity to remove or "max" for all'),
        walletAddress: z.string().optional()
      }),
      examples: [
        'Remove liquidity from position 123',
        'Withdraw all liquidity from position 456',
        'Remove 50% liquidity from my USDC/ETH position',
        'Close position 789'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress,
      defaultProtocol: 'DragonSwap'
    });
    
    const parsed = parser.parse(input);
    
    // Extract position ID
    const positionMatch = input.match(/position\s+(\d+)/i);
    const positionId = positionMatch ? positionMatch[1] : '1';
    
    // Determine liquidity amount
    let liquidity = 'max';
    if (parsed.amount) {
      liquidity = parsed.amount;
    } else if (input.includes('all') || input.includes('max')) {
      liquidity = 'max';
    } else if (input.includes('50%') || input.includes('half')) {
      liquidity = '50';
    }
    
    return {
      positionId,
      liquidity,
      walletAddress: parsed.walletAddress,
      protocol: parsed.protocol || 'DragonSwap'
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { positionId, liquidity, walletAddress, protocol } = params;
    
    const actionContext: ActionContext = {
      agentId: 'langchain-liquidity-agent',
      userId: this.context.userId,
      parameters: { 
        positionId,
        liquidity,
        amount0Min: '0', // Accept any amount for demo
        amount1Min: '0',
        walletAddress
      },
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
      const result = await removeLiquidityAction.handler(actionContext)();
      
      if (result._tag === 'Right') {
        const liquidityData = result.right.data;
        return {
          success: true,
          message: `Successfully removed liquidity from position ${positionId} on ${protocol}
          
💰 Amount0 Received: ${liquidityData.amount0 || 'N/A'}
💰 Amount1 Received: ${liquidityData.amount1 || 'N/A'}
💧 Liquidity Removed: ${liquidity === 'max' ? 'All' : liquidity}`,
          data: liquidityData,
          transactionHash: liquidityData?.txHash,
          gasUsed: liquidityData?.gasUsed,
          timestamp: new Date()
        };
      } else {
        return {
          success: false,
          message: `Failed to remove liquidity from position ${positionId}: ${result.left.message}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Remove liquidity failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Arbitrage Tool - Find and execute arbitrage opportunities
 */
export class ArbitrageTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'arbitrage_opportunities',
      description: 'Find and execute arbitrage opportunities across different DEXs',
      category: 'liquidity',
      schema: z.object({
        asset: z.string().describe('Asset to find arbitrage for'),
        minProfitPercent: z.number().optional().describe('Minimum profit percentage required'),
        maxAmount: z.string().optional().describe('Maximum amount to arbitrage'),
        walletAddress: z.string().optional()
      }),
      examples: [
        'Find arbitrage opportunities for USDC',
        'Look for ETH arbitrage with min 1% profit',
        'Find SEI arbitrage opportunities',
        'Check for profitable USDT arbitrage'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress
    });
    
    const parsed = parser.parse(input);
    
    // Extract minimum profit percentage
    const profitMatch = input.match(/(\d+(?:\.\d+)?)\s*%\s*profit/i);
    const minProfitPercent = profitMatch ? parseFloat(profitMatch[1]) : 0.5;
    
    return {
      asset: parsed.asset,
      minProfitPercent,
      maxAmount: parsed.amount || '1000',
      walletAddress: parsed.walletAddress
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { asset, minProfitPercent, maxAmount, walletAddress } = params;
    
    // Mock arbitrage data - in real implementation, this would query multiple DEXs
    const mockOpportunities = [
      {
        asset,
        buyProtocol: 'DragonSwap',
        sellProtocol: 'Symphony',
        buyPrice: 1.000,
        sellPrice: 1.012,
        profitPercent: 1.2,
        maxSize: '5000',
        gasEstimate: '0.002'
      },
      {
        asset,
        buyProtocol: 'Symphony',
        sellProtocol: 'Citrex',
        buyPrice: 0.998,
        sellPrice: 1.007,
        profitPercent: 0.9,
        maxSize: '3000',
        gasEstimate: '0.003'
      }
    ];
    
    const viableOpportunities = mockOpportunities.filter(
      opp => opp.profitPercent >= minProfitPercent
    );
    
    if (viableOpportunities.length === 0) {
      return {
        success: true,
        message: `No profitable arbitrage opportunities found for ${asset} with minimum ${minProfitPercent}% profit`,
        data: { opportunities: [] },
        timestamp: new Date()
      };
    }
    
    const bestOpportunity = viableOpportunities[0];
    
    const opportunitiesText = viableOpportunities.map((opp, index) => 
      `${index + 1}. Buy on ${opp.buyProtocol} @ $${opp.buyPrice} → Sell on ${opp.sellProtocol} @ $${opp.sellPrice}
   💰 Profit: ${opp.profitPercent}% (Max Size: ${opp.maxSize} ${asset})
   ⛽ Estimated Gas: ${opp.gasEstimate} ETH`
    ).join('\n\n');
    
    return {
      success: true,
      message: `Found ${viableOpportunities.length} arbitrage opportunity(ies) for ${asset}:

${opportunitiesText}

🏆 Best Opportunity: ${bestOpportunity.profitPercent}% profit
💡 Strategy: Buy ${asset} on ${bestOpportunity.buyProtocol}, sell on ${bestOpportunity.sellProtocol}
📊 Estimated profit on ${maxAmount} ${asset}: $${(parseFloat(maxAmount) * bestOpportunity.profitPercent / 100).toFixed(2)}`,
      data: {
        asset,
        opportunities: viableOpportunities,
        bestOpportunity
      },
      timestamp: new Date()
    };
  }
}

/**
 * Price Comparison Tool - Compare prices across DEXs
 */
export class PriceComparisonTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'price_comparison',
      description: 'Compare token prices across different decentralized exchanges',
      category: 'liquidity',
      schema: z.object({
        tokenA: z.string().describe('First token to compare'),
        tokenB: z.string().describe('Second token to compare'),
        amount: z.string().optional().describe('Amount to get quote for')
      }),
      examples: [
        'Compare USDC/ETH prices',
        'Check SEI/USDT rates across DEXs',
        'Get best price for 100 USDC to ETH',
        'Compare WETH prices on all DEXs'
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
      tokenA: parsed.asset,
      tokenB: parsed.targetAsset || 'USDC',
      amount: parsed.amount || '1'
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { tokenA, tokenB, amount } = params;
    
    // Mock price data - in real implementation, this would query actual DEXs
    const mockPrices = {
      DragonSwap: { price: 1.000, liquidity: '1.2M', fee: '0.3%' },
      Symphony: { price: 1.012, liquidity: '850K', fee: '0.25%' },
      Citrex: { price: 0.998, liquidity: '650K', fee: '0.3%' }
    };
    
    const sortedPrices = Object.entries(mockPrices).sort((a, b) => b[1].price - a[1].price);
    const bestPrice = sortedPrices[0];
    
    const pricesText = sortedPrices.map(([protocol, data], index) => 
      `${index + 1}. ${protocol}: ${data.price.toFixed(6)} ${tokenB}/${tokenA}
   💧 Liquidity: ${data.liquidity}
   💰 Fee: ${data.fee}`
    ).join('\n\n');
    
    const outputAmount = (parseFloat(amount) * bestPrice[1].price).toFixed(6);
    
    return {
      success: true,
      message: `Price comparison for ${tokenA}/${tokenB}:

${pricesText}

🏆 Best Rate: ${bestPrice[0]} at ${bestPrice[1].price.toFixed(6)} ${tokenB}/${tokenA}
📊 For ${amount} ${tokenA}, you would get ${outputAmount} ${tokenB}
💡 Price spread: ${((sortedPrices[0][1].price - sortedPrices[sortedPrices.length - 1][1].price) / sortedPrices[sortedPrices.length - 1][1].price * 100).toFixed(2)}%`,
      data: {
        tokenA,
        tokenB,
        amount,
        prices: Object.fromEntries(sortedPrices),
        bestProtocol: bestPrice[0],
        bestPrice: bestPrice[1].price,
        outputAmount
      },
      timestamp: new Date()
    };
  }
}

/**
 * Pool Analytics Tool - Analyze liquidity pool performance
 */
export class PoolAnalyticsTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'pool_analytics',
      description: 'Analyze liquidity pool performance, APR, and metrics',
      category: 'liquidity',
      schema: z.object({
        token0: z.string().describe('First token in pair'),
        token1: z.string().describe('Second token in pair'),
        protocol: z.string().optional().describe('Specific protocol to analyze'),
        timeframe: z.enum(['24h', '7d', '30d']).optional().describe('Analysis timeframe')
      }),
      examples: [
        'Analyze USDC/ETH pool performance',
        'Check SEI/USDT pool metrics',
        'Show WETH/USDC pool APR on DragonSwap',
        'Get 7-day analytics for ETH/SEI pool'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress
    });
    
    const parsed = parser.parse(input);
    
    // Extract pair from input like "USDC/ETH" or "USDC-ETH"
    const pairMatch = input.match(/(USD[CT]?|ETH|BTC|SEI|WETH|WBTC|ATOM|OSMO)[\/-](USD[CT]?|ETH|BTC|SEI|WETH|WBTC|ATOM|OSMO)/i);
    
    let token0 = parsed.asset;
    let token1 = parsed.targetAsset || 'USDC';
    
    if (pairMatch) {
      token0 = pairMatch[1].toUpperCase();
      token1 = pairMatch[2].toUpperCase();
    }
    
    // Extract timeframe
    let timeframe = '24h';
    if (input.includes('7d') || input.includes('week')) timeframe = '7d';
    if (input.includes('30d') || input.includes('month')) timeframe = '30d';
    
    return {
      token0,
      token1,
      protocol: parsed.protocol,
      timeframe
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { token0, token1, protocol, timeframe } = params;
    
    // Mock analytics data
    const mockAnalytics = {
      pair: `${token0}/${token1}`,
      tvl: '$1,250,000',
      volume24h: '$156,000',
      fees24h: '$468',
      apr: '12.5%',
      priceChange24h: '+2.3%',
      impermanentLoss: '-0.8%',
      utilization: '85%'
    };
    
    return {
      success: true,
      message: `Pool Analytics for ${token0}/${token1} (${timeframe}):

💰 Total Value Locked (TVL): ${mockAnalytics.tvl}
📊 24h Volume: ${mockAnalytics.volume24h}
💸 24h Fees: ${mockAnalytics.fees24h}
📈 Current APR: ${mockAnalytics.apr}
📊 Price Change (24h): ${mockAnalytics.priceChange24h}
⚠️ Impermanent Loss: ${mockAnalytics.impermanentLoss}
🎯 Pool Utilization: ${mockAnalytics.utilization}

💡 The pool is performing well with high utilization and competitive returns.
${protocol ? `Data from ${protocol}` : 'Aggregated across all DEXs'}`,
      data: {
        ...mockAnalytics,
        timeframe,
        protocol: protocol || 'All'
      },
      timestamp: new Date()
    };
  }
}

/**
 * Export all liquidity tools
 */
export const liquidityTools = {
  SwapTool,
  AddLiquidityTool,
  RemoveLiquidityTool,
  ArbitrageTool,
  PriceComparisonTool,
  PoolAnalyticsTool
};

/**
 * Factory function to create all liquidity tools
 */
export function createLiquidityTools(context: ToolContext = {}): BaseDeFiTool[] {
  return [
    new SwapTool(context),
    new AddLiquidityTool(context),
    new RemoveLiquidityTool(context),
    new ArbitrageTool(context),
    new PriceComparisonTool(context),
    new PoolAnalyticsTool(context)
  ];
}

/**
 * Helper function to create a specific liquidity tool
 */
export function createLiquidityTool(
  toolName: keyof typeof liquidityTools,
  context: ToolContext = {}
): BaseDeFiTool {
  const ToolClass = liquidityTools[toolName];
  return new ToolClass(context);
}