/**
 * Market Tools for LangChain Integration
 * 
 * This module provides LangChain tools for market analysis, trading operations,
 * and risk management on Citrex and other trading platforms.
 */

import { z } from 'zod';
import { BaseDeFiTool, DeFiToolConfig, DeFiToolResult, ToolContext } from './BaseTool';
import { ParameterParser, parseInput } from './ParameterParser';
import { analyzeAction, monitorAction } from '../../agents/actions/market';
import { ActionContext } from '../../agents/base/BaseAgent';

/**
 * Market Analysis Tool - Analyze market conditions and trends
 */
export class MarketAnalysisTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'analyze_market',
      description: 'Analyze market conditions, price trends, and trading opportunities',
      category: 'market',
      schema: z.object({
        asset: z.string().describe('Asset to analyze'),
        timeframe: z.enum(['1h', '4h', '1d', '7d', '30d']).optional().describe('Analysis timeframe'),
        analysisType: z.enum(['technical', 'fundamental', 'sentiment', 'all']).optional().describe('Type of analysis'),
        includeSignals: z.boolean().optional().describe('Include trading signals')
      }),
      examples: [
        'Analyze SEI market conditions',
        'Check ETH technical analysis for 4h timeframe',
        'Get fundamental analysis for USDC',
        'Analyze ATOM sentiment and trading signals'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress
    });
    
    const parsed = parser.parse(input);
    
    // Extract timeframe
    let timeframe = '1d';
    if (input.includes('1h') || input.includes('hour')) timeframe = '1h';
    if (input.includes('4h')) timeframe = '4h';
    if (input.includes('7d') || input.includes('week')) timeframe = '7d';
    if (input.includes('30d') || input.includes('month')) timeframe = '30d';
    
    // Extract analysis type
    let analysisType = 'all';
    if (input.includes('technical')) analysisType = 'technical';
    if (input.includes('fundamental')) analysisType = 'fundamental';
    if (input.includes('sentiment')) analysisType = 'sentiment';
    
    // Check for signals
    const includeSignals = input.includes('signal') || input.includes('trading');
    
    return {
      asset: parsed.asset,
      timeframe,
      analysisType,
      includeSignals
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { asset, timeframe, analysisType, includeSignals } = params;
    
    const actionContext: ActionContext = {
      agentId: 'langchain-market-agent',
      userId: this.context.userId,
      parameters: { asset, timeframe, analysisType, includeSignals },
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
      const result = await analyzeAction.handler(actionContext)();
      
      if (result._tag === 'Right') {
        const analysisData = result.right.data;
        
        // Mock comprehensive analysis data
        const mockAnalysis = {
          asset,
          currentPrice: '$1.25',
          priceChange24h: '+3.2%',
          volume24h: '$2.4M',
          marketCap: '$156M',
          technical: {
            trend: 'Bullish',
            rsi: 67,
            macdSignal: 'Buy',
            support: '$1.18',
            resistance: '$1.35',
            fibonacci: {
              support1: '$1.20',
              support2: '$1.15',
              resistance1: '$1.30',
              resistance2: '$1.38'
            }
          },
          fundamental: {
            tvlChange: '+12%',
            protocolRevenue: '$45K',
            activeUsers: '15.2K',
            tokenUtility: 'High',
            networkGrowth: 'Strong'
          },
          sentiment: {
            overall: 'Positive',
            socialVolume: 'High',
            devActivity: 'Active',
            communityScore: 8.2,
            fearGreedIndex: 72
          },
          signals: includeSignals ? [
            { type: 'BUY', strength: 'Strong', reason: 'Bullish breakout above resistance' },
            { type: 'HOLD', strength: 'Medium', reason: 'RSI approaching overbought' }
          ] : []
        };
        
        let analysisText = `Market Analysis for ${asset} (${timeframe}):

📊 **Current Status**
💰 Price: ${mockAnalysis.currentPrice} (${mockAnalysis.priceChange24h})
📈 Volume (24h): ${mockAnalysis.volume24h}
🏦 Market Cap: ${mockAnalysis.marketCap}`;

        if (analysisType === 'technical' || analysisType === 'all') {
          analysisText += `

🔍 **Technical Analysis**
📈 Trend: ${mockAnalysis.technical.trend}
📊 RSI: ${mockAnalysis.technical.rsi} (${mockAnalysis.technical.rsi > 70 ? 'Overbought' : mockAnalysis.technical.rsi < 30 ? 'Oversold' : 'Neutral'})
⚡ MACD: ${mockAnalysis.technical.macdSignal}
🎯 Support: ${mockAnalysis.technical.support}
🚀 Resistance: ${mockAnalysis.technical.resistance}`;
        }

        if (analysisType === 'fundamental' || analysisType === 'all') {
          analysisText += `

🏗️ **Fundamental Analysis**
💧 TVL Change: ${mockAnalysis.fundamental.tvlChange}
💰 Protocol Revenue: ${mockAnalysis.fundamental.protocolRevenue}
👥 Active Users: ${mockAnalysis.fundamental.activeUsers}
🔧 Token Utility: ${mockAnalysis.fundamental.tokenUtility}
📱 Network Growth: ${mockAnalysis.fundamental.networkGrowth}`;
        }

        if (analysisType === 'sentiment' || analysisType === 'all') {
          analysisText += `

😊 **Sentiment Analysis**
🎭 Overall: ${mockAnalysis.sentiment.overall}
📱 Social Volume: ${mockAnalysis.sentiment.socialVolume}
👨‍💻 Dev Activity: ${mockAnalysis.sentiment.devActivity}
🏆 Community Score: ${mockAnalysis.sentiment.communityScore}/10
😨 Fear & Greed: ${mockAnalysis.sentiment.fearGreedIndex}/100`;
        }

        if (includeSignals && mockAnalysis.signals.length > 0) {
          analysisText += `

🎯 **Trading Signals**`;
          mockAnalysis.signals.forEach((signal, index) => {
            const emoji = signal.type === 'BUY' ? '🟢' : signal.type === 'SELL' ? '🔴' : '🟡';
            analysisText += `
${emoji} ${signal.type} (${signal.strength}): ${signal.reason}`;
          });
        }

        return {
          success: true,
          message: analysisText,
          data: mockAnalysis,
          timestamp: new Date()
        };
      } else {
        return {
          success: false,
          message: `Failed to analyze ${asset}: ${result.left.message}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Market analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Price Monitoring Tool - Monitor asset prices and alerts
 */
export class PriceMonitoringTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'monitor_price',
      description: 'Monitor asset prices and set up price alerts',
      category: 'market',
      schema: z.object({
        asset: z.string().describe('Asset to monitor'),
        alertType: z.enum(['above', 'below', 'change']).describe('Type of price alert'),
        threshold: z.number().describe('Price threshold for alert'),
        duration: z.string().optional().describe('How long to monitor')
      }),
      examples: [
        'Monitor SEI price above $1.50',
        'Alert me when ETH goes below $2000',
        'Watch for 10% price change in USDC',
        'Set price alert for ATOM at $12'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress
    });
    
    const parsed = parser.parse(input);
    
    // Extract alert type and threshold
    let alertType = 'above';
    let threshold = 0;
    
    const aboveMatch = input.match(/above\s+\$?(\d+(?:\.\d+)?)/i);
    const belowMatch = input.match(/below\s+\$?(\d+(?:\.\d+)?)/i);
    const changeMatch = input.match(/(\d+(?:\.\d+)?)\s*%\s*change/i);
    const atMatch = input.match(/at\s+\$?(\d+(?:\.\d+)?)/i);
    
    if (aboveMatch) {
      alertType = 'above';
      threshold = parseFloat(aboveMatch[1]);
    } else if (belowMatch) {
      alertType = 'below';
      threshold = parseFloat(belowMatch[1]);
    } else if (changeMatch) {
      alertType = 'change';
      threshold = parseFloat(changeMatch[1]);
    } else if (atMatch) {
      alertType = 'above';
      threshold = parseFloat(atMatch[1]);
    }
    
    return {
      asset: parsed.asset,
      alertType,
      threshold,
      duration: '24h'
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { asset, alertType, threshold, duration } = params;
    
    const actionContext: ActionContext = {
      agentId: 'langchain-market-agent',
      userId: this.context.userId,
      parameters: { asset, alertType, threshold, duration },
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
      const result = await monitorAction.handler(actionContext)();
      
      if (result._tag === 'Right') {
        const currentPrice = 1.25; // Mock current price
        
        let alertDescription = '';
        switch (alertType) {
          case 'above':
            alertDescription = `when price goes above $${threshold}`;
            break;
          case 'below':
            alertDescription = `when price goes below $${threshold}`;
            break;
          case 'change':
            alertDescription = `when price changes by ${threshold}%`;
            break;
        }
        
        return {
          success: true,
          message: `✅ Price monitoring activated for ${asset}

🎯 **Alert Settings**
📊 Current Price: $${currentPrice}
🚨 Alert Trigger: ${alertDescription}
⏰ Duration: ${duration}
📱 Notification: You'll be notified when the condition is met

The monitoring system is now tracking ${asset} price movements. You'll receive an alert ${alertDescription}.`,
          data: {
            asset,
            currentPrice,
            alertType,
            threshold,
            duration,
            monitorId: `monitor_${asset}_${Date.now()}`
          },
          timestamp: new Date()
        };
      } else {
        return {
          success: false,
          message: `Failed to set up monitoring for ${asset}: ${result.left.message}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Price monitoring setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Trading Signals Tool - Generate trading signals and recommendations
 */
export class TradingSignalsTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'trading_signals',
      description: 'Generate trading signals and recommendations based on technical analysis',
      category: 'market',
      schema: z.object({
        asset: z.string().describe('Asset to generate signals for'),
        signalType: z.enum(['entry', 'exit', 'all']).optional().describe('Type of signals to generate'),
        riskLevel: z.enum(['conservative', 'moderate', 'aggressive']).optional().describe('Risk level for signals'),
        timeframe: z.enum(['1h', '4h', '1d']).optional().describe('Signal timeframe')
      }),
      examples: [
        'Get trading signals for SEI',
        'Show entry signals for ETH with moderate risk',
        'Generate exit signals for ATOM',
        'Get aggressive trading signals for USDC on 4h timeframe'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress
    });
    
    const parsed = parser.parse(input);
    
    // Extract signal type
    let signalType = 'all';
    if (input.includes('entry')) signalType = 'entry';
    if (input.includes('exit')) signalType = 'exit';
    
    // Extract risk level
    let riskLevel = 'moderate';
    if (input.includes('conservative')) riskLevel = 'conservative';
    if (input.includes('aggressive')) riskLevel = 'aggressive';
    
    // Extract timeframe
    let timeframe = '1d';
    if (input.includes('1h')) timeframe = '1h';
    if (input.includes('4h')) timeframe = '4h';
    
    return {
      asset: parsed.asset,
      signalType,
      riskLevel,
      timeframe
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { asset, signalType, riskLevel, timeframe } = params;
    
    // Mock trading signals based on parameters
    const mockSignals = {
      entry: [
        {
          type: 'BUY',
          strength: riskLevel === 'aggressive' ? 'Strong' : 'Medium',
          price: '$1.20',
          stopLoss: '$1.15',
          takeProfit: '$1.35',
          reason: 'Bullish divergence on RSI + support level bounce',
          confidence: riskLevel === 'conservative' ? 75 : riskLevel === 'moderate' ? 80 : 85
        }
      ],
      exit: [
        {
          type: 'SELL',
          strength: 'Medium',
          price: '$1.30',
          reason: 'Approaching resistance level + overbought RSI',
          confidence: 70
        }
      ]
    };
    
    const currentPrice = 1.25;
    let signalsToShow: any[] = [];
    
    if (signalType === 'entry' || signalType === 'all') {
      signalsToShow.push(...mockSignals.entry);
    }
    if (signalType === 'exit' || signalType === 'all') {
      signalsToShow.push(...mockSignals.exit);
    }
    
    const signalsText = signalsToShow.map((signal, index) => {
      const emoji = signal.type === 'BUY' ? '🟢' : '🔴';
      let text = `${emoji} **${signal.type} Signal** (${signal.strength})
💰 Entry Price: ${signal.price}
🎯 Confidence: ${signal.confidence}%
📝 Reason: ${signal.reason}`;
      
      if (signal.stopLoss) text += `\n🛑 Stop Loss: ${signal.stopLoss}`;
      if (signal.takeProfit) text += `\n🎯 Take Profit: ${signal.takeProfit}`;
      
      return text;
    }).join('\n\n');
    
    return {
      success: true,
      message: `Trading Signals for ${asset} (${timeframe}, ${riskLevel} risk):

📊 **Current Price**: $${currentPrice}
⏰ **Timeframe**: ${timeframe}
⚖️ **Risk Level**: ${riskLevel}

${signalsText}

⚠️ **Disclaimer**: These are AI-generated signals for educational purposes. Always do your own research and consider your risk tolerance before trading.`,
      data: {
        asset,
        currentPrice,
        signalType,
        riskLevel,
        timeframe,
        signals: signalsToShow
      },
      timestamp: new Date()
    };
  }
}

/**
 * Risk Assessment Tool - Assess trading and portfolio risks
 */
export class RiskAssessmentTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'risk_assessment',
      description: 'Assess trading risks and portfolio exposure',
      category: 'market',
      schema: z.object({
        walletAddress: z.string().optional(),
        assets: z.array(z.string()).optional().describe('Specific assets to assess'),
        assessmentType: z.enum(['portfolio', 'position', 'market']).optional().describe('Type of risk assessment')
      }),
      examples: [
        'Assess my portfolio risk',
        'Check risk for my SEI position',
        'Analyze market risk for my holdings',
        'Get risk assessment for ETH and USDC'
      ]
    };
    super(config, context);
  }

  protected parseNaturalLanguage(input: string): Record<string, any> {
    const parser = new ParameterParser({
      walletAddress: this.context.walletAddress
    });
    
    const parsed = parser.parse(input);
    
    // Extract assessment type
    let assessmentType = 'portfolio';
    if (input.includes('position')) assessmentType = 'position';
    if (input.includes('market')) assessmentType = 'market';
    
    // Extract assets if mentioned
    const assets = [];
    if (parsed.asset) assets.push(parsed.asset);
    if (parsed.targetAsset) assets.push(parsed.targetAsset);
    
    return {
      walletAddress: parsed.walletAddress,
      assets: assets.length > 0 ? assets : undefined,
      assessmentType
    };
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    const { walletAddress, assets, assessmentType } = params;
    
    // Mock risk assessment data
    const mockAssessment = {
      overallRisk: 'Medium',
      riskScore: 6.5,
      portfolio: {
        diversification: 'Good',
        concentration: 'Low',
        volatility: 'Medium',
        liquidity: 'High',
        correlations: 'Moderate'
      },
      positions: [
        {
          asset: 'SEI',
          allocation: '35%',
          risk: 'Medium-High',
          volatility: '45%',
          liquidationRisk: 'Low'
        },
        {
          asset: 'ETH',
          allocation: '30%',
          risk: 'Medium',
          volatility: '35%',
          liquidationRisk: 'None'
        },
        {
          asset: 'USDC',
          allocation: '25%',
          risk: 'Low',
          volatility: '2%',
          liquidationRisk: 'None'
        }
      ],
      recommendations: [
        'Consider reducing SEI allocation to improve diversification',
        'Your USDC allocation provides good stability',
        'Monitor ETH correlation with broader crypto markets'
      ]
    };
    
    let assessmentText = `Risk Assessment Report (${assessmentType}):

🎯 **Overall Risk Level**: ${mockAssessment.overallRisk}
📊 **Risk Score**: ${mockAssessment.riskScore}/10

📋 **Portfolio Analysis**
🎲 Diversification: ${mockAssessment.portfolio.diversification}
🎯 Concentration: ${mockAssessment.portfolio.concentration}
📈 Volatility: ${mockAssessment.portfolio.volatility}
💧 Liquidity: ${mockAssessment.portfolio.liquidity}
🔗 Correlations: ${mockAssessment.portfolio.correlations}

💼 **Position Breakdown**`;

    mockAssessment.positions.forEach(position => {
      assessmentText += `
• ${position.asset}: ${position.allocation} - ${position.risk} risk (${position.volatility} volatility)`;
    });

    assessmentText += `

💡 **Recommendations**`;
    mockAssessment.recommendations.forEach((rec, index) => {
      assessmentText += `
${index + 1}. ${rec}`;
    });

    assessmentText += `

⚠️ **Risk Factors to Monitor**
• Market volatility
• Correlation between assets
• Liquidity conditions
• Regulatory changes`;

    return {
      success: true,
      message: assessmentText,
      data: mockAssessment,
      timestamp: new Date()
    };
  }
}

/**
 * Export all market tools
 */
export const marketTools = {
  MarketAnalysisTool,
  PriceMonitoringTool,
  TradingSignalsTool,
  RiskAssessmentTool
};

/**
 * Factory function to create all market tools
 */
export function createMarketTools(context: ToolContext = {}): BaseDeFiTool[] {
  return [
    new MarketAnalysisTool(context),
    new PriceMonitoringTool(context),
    new TradingSignalsTool(context),
    new RiskAssessmentTool(context)
  ];
}

/**
 * Helper function to create a specific market tool
 */
export function createMarketTool(
  toolName: keyof typeof marketTools,
  context: ToolContext = {}
): BaseDeFiTool {
  const ToolClass = marketTools[toolName];
  return new ToolClass(context);
}