/**
 * Cross-Protocol Tools for LangChain Integration
 * 
 * This module provides LangChain tools for cross-protocol operations including
 * yield optimization, protocol comparison, and multi-protocol strategies.
 */

import { z } from 'zod';
import { BaseDeFiTool, DeFiToolConfig, DeFiToolResult, ToolContext } from './BaseTool';
import { ParameterParser } from './ParameterParser';

/**
 * Protocol Comparison Tool - Compare rates and features across protocols
 */
export class ProtocolComparisonTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'compare_protocols',
      description: 'Compare rates, features, and opportunities across different DeFi protocols',
      category: 'cross-protocol',
      schema: z.object({
        asset: z.string().describe('Asset to compare across protocols'),
        operation: z.enum(['supply', 'borrow', 'swap', 'stake']).describe('Operation to compare'),
        amount: z.string().optional().describe('Amount for comparison'),
        protocols: z.array(z.string()).optional().describe('Specific protocols to compare')
      }),
      examples: [
        'Compare USDC supply rates across all protocols',
        'Find best borrow rates for ETH',
        'Compare swap fees for SEI',
        'Show staking rewards for ATOM across protocols'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress
    });
    
    const parsed = parser.parse(input);
    
    // Extract operation type
    let operation = 'supply';
    if (input.includes('borrow')) operation = 'borrow';
    if (input.includes('swap')) operation = 'swap';
    if (input.includes('stake')) operation = 'stake';
    
    return {
      asset: parsed.asset,
      operation,
      amount: parsed.amount,
      protocols: ['YeiFinance', 'Takara', 'DragonSwap', 'Symphony', 'Citrex']
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { asset, operation, amount, protocols } = params;
    
    // Mock comparison data
    const mockComparisons = {
      supply: {
        YeiFinance: { rate: 5.2, tvl: '1.2M', fees: '0%', security: 'High' },
        Takara: { rate: 4.8, tvl: '850K', fees: '0%', security: 'High' },
        Silo: { rate: 6.1, tvl: '500K', fees: '0%', security: 'Medium' }
      },
      borrow: {
        YeiFinance: { rate: 8.5, tvl: '1.2M', fees: '0%', security: 'High' },
        Takara: { rate: 7.9, tvl: '850K', fees: '0%', security: 'High' },
        Silo: { rate: 9.2, tvl: '500K', fees: '0%', security: 'Medium' }
      },
      swap: {
        DragonSwap: { rate: 0.3, tvl: '2.1M', fees: '0.3%', security: 'High' },
        Symphony: { rate: 0.25, tvl: '1.5M', fees: '0.25%', security: 'High' },
        Citrex: { rate: 0.3, tvl: '800K', fees: '0.3%', security: 'Medium' }
      },
      stake: {
        'Sei Staking': { rate: 12.5, tvl: '50M', fees: '5%', security: 'High' },
        'Liquid Staking': { rate: 11.8, tvl: '25M', fees: '8%', security: 'High' }
      }
    };
    
    const comparisons = mockComparisons[operation as keyof typeof mockComparisons] || {};
    const sortedComparisons = Object.entries(comparisons).sort((a, b) => 
      operation === 'borrow' ? a[1].rate - b[1].rate : b[1].rate - a[1].rate
    );
    
    const bestProtocol = sortedComparisons[0];
    const worstProtocol = sortedComparisons[sortedComparisons.length - 1];
    
    const comparisonText = sortedComparisons.map(([protocol, data], index) => {
      const emoji = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '💫';
      return `${emoji} **${protocol}**
   📊 Rate: ${data.rate}% ${operation === 'borrow' ? 'APR' : 'APY'}
   💰 TVL: ${data.tvl}
   💸 Fees: ${data.fees}
   🔒 Security: ${data.security}`;
    }).join('\n\n');
    
    const savings = amount ? 
      `💰 For ${amount} ${asset}: Best vs Worst = $${(parseFloat(amount) * Math.abs(bestProtocol[1].rate - worstProtocol[1].rate) / 100).toFixed(2)}/year difference` 
      : '';
    
    return {
      success: true,
      message: `Protocol Comparison for ${asset} ${operation}:

${comparisonText}

🎯 **Best Option**: ${bestProtocol[0]} with ${bestProtocol[1].rate}% ${operation === 'borrow' ? 'APR' : 'APY'}
📈 **Rate Spread**: ${Math.abs(bestProtocol[1].rate - worstProtocol[1].rate).toFixed(2)}% difference between best and worst
${savings}

💡 **Recommendation**: ${bestProtocol[0]} offers the best ${operation === 'borrow' ? 'borrowing rates' : 'returns'} with ${bestProtocol[1].security.toLowerCase()} security rating.`,
      data: {
        asset,
        operation,
        comparisons: Object.fromEntries(sortedComparisons),
        bestProtocol: bestProtocol[0],
        bestRate: bestProtocol[1].rate
      },
      timestamp: new Date()
    };
  }
}

/**
 * Yield Farming Optimizer Tool - Find best yield farming opportunities
 */
export class YieldFarmingOptimizerTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'optimize_yield_farming',
      description: 'Find and optimize yield farming opportunities across multiple protocols',
      category: 'cross-protocol',
      schema: z.object({
        assets: z.array(z.string()).describe('Assets available for yield farming'),
        riskTolerance: z.enum(['low', 'medium', 'high']).optional().describe('Risk tolerance level'),
        minAPY: z.number().optional().describe('Minimum APY requirement'),
        maxComplexity: z.enum(['simple', 'medium', 'complex']).optional().describe('Strategy complexity preference')
      }),
      examples: [
        'Find best yield farming for USDC and ETH',
        'Optimize yield with low risk tolerance',
        'Show yield farming with minimum 15% APY',
        'Find simple yield strategies for SEI'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress
    });
    
    const parsed = parser.parse(input);
    
    // Extract assets
    const assets = [];
    if (parsed.asset) assets.push(parsed.asset);
    if (parsed.targetAsset) assets.push(parsed.targetAsset);
    
    // If no specific assets, use common ones
    if (assets.length === 0) {
      assets.push('USDC', 'ETH', 'SEI');
    }
    
    // Extract risk tolerance
    let riskTolerance = 'medium';
    if (input.includes('low risk') || input.includes('conservative')) riskTolerance = 'low';
    if (input.includes('high risk') || input.includes('aggressive')) riskTolerance = 'high';
    
    // Extract minimum APY
    const apyMatch = input.match(/(\d+(?:\.\d+)?)\s*%\s*APY/i);
    const minAPY = apyMatch ? parseFloat(apyMatch[1]) : undefined;
    
    // Extract complexity preference
    let maxComplexity = 'medium';
    if (input.includes('simple')) maxComplexity = 'simple';
    if (input.includes('complex')) maxComplexity = 'complex';
    
    return {
      assets,
      riskTolerance,
      minAPY,
      maxComplexity
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { assets, riskTolerance, minAPY, maxComplexity } = params;
    
    // Mock yield farming opportunities
    const mockOpportunities = [
      {
        protocol: 'YeiFinance + DragonSwap',
        strategy: 'Supply USDC → Borrow SEI → LP USDC/SEI',
        apy: 18.5,
        risk: 'medium',
        complexity: 'medium',
        assets: ['USDC', 'SEI'],
        tvl: '2.5M',
        description: 'Leverage lending to create LP position'
      },
      {
        protocol: 'Symphony',
        strategy: 'LP ETH/USDC with auto-compound',
        apy: 14.2,
        risk: 'low',
        complexity: 'simple',
        assets: ['ETH', 'USDC'],
        tvl: '1.8M',
        description: 'Simple LP with automatic compounding'
      },
      {
        protocol: 'Takara + Citrex',
        strategy: 'Recursive lending with yield token farming',
        apy: 25.3,
        risk: 'high',
        complexity: 'complex',
        assets: ['SEI', 'USDC'],
        tvl: '900K',
        description: 'Advanced multi-protocol yield strategy'
      },
      {
        protocol: 'DragonSwap',
        strategy: 'Concentrated liquidity USDC/USDT',
        apy: 12.8,
        risk: 'low',
        complexity: 'simple',
        assets: ['USDC', 'USDT'],
        tvl: '3.2M',
        description: 'Stable pair concentrated liquidity'
      }
    ];
    
    // Filter by criteria
    let filteredOpportunities = mockOpportunities.filter(opp => {
      // Check if user has the required assets
      const hasAssets = opp.assets.some(asset => assets.includes(asset));
      if (!hasAssets) return false;
      
      // Check risk tolerance
      const riskLevels = { low: 1, medium: 2, high: 3 };
      const userRiskLevel = riskLevels[riskTolerance];
      const oppRiskLevel = riskLevels[opp.risk];
      if (oppRiskLevel > userRiskLevel) return false;
      
      // Check minimum APY
      if (minAPY && opp.apy < minAPY) return false;
      
      // Check complexity
      const complexityLevels = { simple: 1, medium: 2, complex: 3 };
      const userComplexityLevel = complexityLevels[maxComplexity];
      const oppComplexityLevel = complexityLevels[opp.complexity];
      if (oppComplexityLevel > userComplexityLevel) return false;
      
      return true;
    });
    
    // Sort by APY descending
    filteredOpportunities.sort((a, b) => b.apy - a.apy);
    
    if (filteredOpportunities.length === 0) {
      return {
        success: true,
        message: `No yield farming opportunities found matching your criteria:
- Assets: ${assets.join(', ')}
- Risk tolerance: ${riskTolerance}
- Minimum APY: ${minAPY || 'None'}%
- Max complexity: ${maxComplexity}

Try adjusting your criteria to see more opportunities.`,
        data: { opportunities: [] },
        timestamp: new Date()
      };
    }
    
    const opportunitiesText = filteredOpportunities.map((opp, index) => {
      const emoji = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '💎';
      return `${emoji} **${opp.protocol}**
📊 APY: ${opp.apy}%
🎯 Strategy: ${opp.strategy}
⚖️ Risk: ${opp.risk} | 🧩 Complexity: ${opp.complexity}
💰 TVL: ${opp.tvl}
📝 ${opp.description}`;
    }).join('\n\n');
    
    const bestOpportunity = filteredOpportunities[0];
    
    return {
      success: true,
      message: `🌾 Yield Farming Opportunities (${filteredOpportunities.length} found):

${opportunitiesText}

🎯 **Top Recommendation**: ${bestOpportunity.protocol}
📈 Expected APY: ${bestOpportunity.apy}%
💡 This strategy matches your ${riskTolerance} risk tolerance and ${maxComplexity} complexity preference.

⚠️ **Important**: Yield farming involves risks including impermanent loss, smart contract risk, and token price volatility. DYOR before investing.`,
      data: {
        assets,
        criteria: { riskTolerance, minAPY, maxComplexity },
        opportunities: filteredOpportunities,
        topRecommendation: bestOpportunity
      },
      timestamp: new Date()
    };
  }
}

/**
 * Portfolio Rebalancing Tool - Optimize portfolio allocation across protocols
 */
export class PortfolioRebalancingTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'rebalance_portfolio',
      description: 'Optimize portfolio allocation across different protocols and strategies',
      category: 'cross-protocol',
      schema: z.object({
        currentAllocation: z.record(z.number()).optional().describe('Current asset allocation percentages'),
        targetAllocation: z.record(z.number()).optional().describe('Target asset allocation percentages'),
        rebalanceStrategy: z.enum(['conservative', 'moderate', 'aggressive']).optional().describe('Rebalancing strategy'),
        walletAddress: z.string().optional()
      }),
      examples: [
        'Rebalance my portfolio to 50% USDC, 30% ETH, 20% SEI',
        'Optimize my current allocation with moderate strategy',
        'Suggest portfolio rebalancing based on current holdings',
        'Rebalance portfolio for better yield opportunities'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress
    });
    
    const parsed = parser.parse(input);
    
    // Extract target allocation from text like "50% USDC, 30% ETH, 20% SEI"
    const allocationMatches = input.matchAll(/(\d+)\s*%\s*([A-Z]+)/gi);
    const targetAllocation: Record<string, number> = {};
    
    for (const match of allocationMatches) {
      const percentage = parseInt(match[1]);
      const asset = match[2].toUpperCase();
      targetAllocation[asset] = percentage;
    }
    
    // Extract strategy
    let rebalanceStrategy = 'moderate';
    if (input.includes('conservative')) rebalanceStrategy = 'conservative';
    if (input.includes('aggressive')) rebalanceStrategy = 'aggressive';
    
    return {
      targetAllocation: Object.keys(targetAllocation).length > 0 ? targetAllocation : undefined,
      rebalanceStrategy,
      walletAddress: parsed.walletAddress
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { targetAllocation, rebalanceStrategy, walletAddress } = params;
    
    // Mock current portfolio
    const currentPortfolio = {
      USDC: 45,
      ETH: 35,
      SEI: 20
    };
    
    // Use target allocation or suggest optimal allocation
    const target = targetAllocation || {
      USDC: 40,  // Reduced for more yield opportunities
      ETH: 35,   // Maintain
      SEI: 25    // Increased for higher yield
    };
    
    // Calculate rebalancing actions
    const rebalanceActions = [];
    const totalCurrent = Object.values(currentPortfolio).reduce((a, b) => a + b, 0);
    const totalTarget = Object.values(target).reduce((a, b) => a + b, 0);
    
    for (const [asset, currentPercent] of Object.entries(currentPortfolio)) {
      const targetPercent = target[asset] || 0;
      const difference = targetPercent - currentPercent;
      
      if (Math.abs(difference) > 2) { // Only rebalance if difference > 2%
        rebalanceActions.push({
          asset,
          action: difference > 0 ? 'BUY' : 'SELL',
          amount: Math.abs(difference),
          current: currentPercent,
          target: targetPercent
        });
      }
    }
    
    // Suggest optimal protocols for each asset
    const protocolSuggestions = {
      USDC: 'YeiFinance (5.2% APY) or USDC/USDT LP on DragonSwap (12.8% APY)',
      ETH: 'ETH/USDC LP on Symphony (14.2% APY) or lending on Takara (4.8% APY)',
      SEI: 'SEI staking (12.5% APY) or USDC/SEI LP on DragonSwap (18.5% APY)'
    };
    
    const actionsText = rebalanceActions.length > 0 
      ? rebalanceActions.map(action => {
          const emoji = action.action === 'BUY' ? '🟢' : '🔴';
          return `${emoji} ${action.action} ${action.amount.toFixed(1)}% ${action.asset} (${action.current}% → ${action.target}%)
   💡 Suggested: ${protocolSuggestions[action.asset]}`;
        }).join('\n\n')
      : '✅ Your portfolio is already well-balanced!';
    
    const currentText = Object.entries(currentPortfolio)
      .map(([asset, percent]) => `${asset}: ${percent}%`)
      .join(' | ');
    
    const targetText = Object.entries(target)
      .map(([asset, percent]) => `${asset}: ${percent}%`)
      .join(' | ');
    
    return {
      success: true,
      message: `🔄 Portfolio Rebalancing Analysis (${rebalanceStrategy} strategy):

📊 **Current Allocation**: ${currentText}
🎯 **Target Allocation**: ${targetText}

${rebalanceActions.length > 0 ? '🔧 **Rebalancing Actions**:' : ''}
${actionsText}

💰 **Yield Optimization**:
${Object.entries(protocolSuggestions).map(([asset, suggestion]) => 
  `• ${asset}: ${suggestion}`
).join('\n')}

📈 **Expected Benefits**:
• Better diversification across protocols
• Optimized yield opportunities
• Reduced concentration risk
• Access to multiple DeFi strategies

⚠️ **Consider**: Transaction costs, slippage, and timing when executing rebalancing actions.`,
      data: {
        currentPortfolio,
        targetAllocation: target,
        rebalanceActions,
        strategy: rebalanceStrategy,
        protocolSuggestions
      },
      timestamp: new Date()
    };
  }
}

/**
 * Cross-Chain Bridge Tool - Bridge assets across different chains
 */
export class CrossChainBridgeTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'cross_chain_bridge',
      description: 'Bridge assets across different blockchain networks',
      category: 'cross-protocol',
      schema: z.object({
        asset: z.string().describe('Asset to bridge'),
        amount: z.string().describe('Amount to bridge'),
        fromChain: z.string().describe('Source blockchain'),
        toChain: z.string().describe('Destination blockchain'),
        walletAddress: z.string().optional()
      }),
      examples: [
        'Bridge 100 USDC from Ethereum to Sei',
        'Transfer 0.5 ETH to Sei Network',
        'Bridge SEI tokens to Cosmos',
        'Move 1000 ATOM from Cosmos to Sei'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress
    });
    
    const parsed = parser.parse(input);
    
    // Extract chain information
    let fromChain = 'Ethereum';
    let toChain = 'Sei';
    
    const fromMatch = input.match(/from\s+(\w+)/i);
    const toMatch = input.match(/to\s+(\w+)/i);
    
    if (fromMatch) fromChain = fromMatch[1];
    if (toMatch) toChain = toMatch[1];
    
    return {
      asset: parsed.asset,
      amount: parsed.amount,
      fromChain,
      toChain,
      walletAddress: parsed.walletAddress
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { asset, amount, fromChain, toChain, walletAddress } = params;
    
    // Mock bridge data
    const bridgeInfo = {
      estimatedTime: '5-10 minutes',
      bridgeFee: '0.001 ETH',
      minimumAmount: '10',
      maximumAmount: '100000',
      exchangeRate: '1:1',
      slippage: '0.1%'
    };
    
    const supportedChains = ['Ethereum', 'Sei', 'Cosmos', 'Polygon', 'BSC'];
    
    if (!supportedChains.includes(fromChain) || !supportedChains.includes(toChain)) {
      return {
        success: false,
        message: `Bridging between ${fromChain} and ${toChain} is not supported. 
        
Supported chains: ${supportedChains.join(', ')}`,
        timestamp: new Date()
      };
    }
    
    const amountNum = parseFloat(amount);
    if (amountNum < parseFloat(bridgeInfo.minimumAmount)) {
      return {
        success: false,
        message: `Amount too small. Minimum bridge amount is ${bridgeInfo.minimumAmount} ${asset}`,
        timestamp: new Date()
      };
    }
    
    const estimatedReceived = (amountNum * 0.999).toFixed(6); // Account for fees
    
    return {
      success: true,
      message: `🌉 Cross-Chain Bridge Quote:

📊 **Bridge Details**
💰 Amount: ${amount} ${asset}
🔗 Route: ${fromChain} → ${toChain}
💵 Exchange Rate: ${bridgeInfo.exchangeRate}
📈 Slippage: ${bridgeInfo.slippage}

💸 **Fees & Timing**
🏦 Bridge Fee: ${bridgeInfo.bridgeFee}
⏰ Estimated Time: ${bridgeInfo.estimatedTime}
📦 You'll receive: ~${estimatedReceived} ${asset}

🔒 **Security**
• Multi-signature validation
• Time-locked transfers
• Audited bridge contracts

⚠️ **Important Notes**:
• Double-check destination address
• Bridge transactions are irreversible
• Keep transaction hash for tracking
• Consider network congestion

Ready to proceed with the bridge transaction?`,
      data: {
        asset,
        amount,
        fromChain,
        toChain,
        estimatedReceived,
        bridgeInfo,
        walletAddress
      },
      timestamp: new Date()
    };
  }
}

/**
 * Export all cross-protocol tools
 */
export const crossProtocolTools = {
  ProtocolComparisonTool,
  YieldFarmingOptimizerTool,
  PortfolioRebalancingTool,
  CrossChainBridgeTool
};

/**
 * Factory function to create all cross-protocol tools
 */
export function createCrossProtocolTools(context: ToolContext = {}): BaseDeFiTool[] {
  return [
    new ProtocolComparisonTool(context),
    new YieldFarmingOptimizerTool(context),
    new PortfolioRebalancingTool(context),
    new CrossChainBridgeTool(context)
  ];
}

/**
 * Helper function to create a specific cross-protocol tool
 */
export function createCrossProtocolTool(
  toolName: keyof typeof crossProtocolTools,
  context: ToolContext = {}
): BaseDeFiTool {
  const ToolClass = crossProtocolTools[toolName];
  return new ToolClass(context);
}