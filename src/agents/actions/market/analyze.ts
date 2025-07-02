import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@ai16z/eliza';

export interface AnalyzeParams {
  type: 'technical' | 'fundamental' | 'sentiment' | 'comprehensive';
  assets: string[];
  depth?: 'basic' | 'detailed' | 'expert';
  compareWith?: string[]; // Compare with other assets
  timeframe?: string; // Analysis timeframe
}

export interface AnalyzeResult {
  success: boolean;
  timestamp: Date;
  analysisType: string;
  assets: Record<string, AssetAnalysis>;
  marketContext: MarketContext;
  recommendations: Recommendation[];
  riskAssessment: RiskAssessment;
}

export interface AssetAnalysis {
  technical: TechnicalAnalysis;
  fundamental?: FundamentalAnalysis;
  sentiment?: SentimentAnalysis;
  score: number; // 0-100 overall score
  outlook: 'very bearish' | 'bearish' | 'neutral' | 'bullish' | 'very bullish';
}

export interface TechnicalAnalysis {
  trend: string;
  momentum: number;
  volatility: number;
  patterns: string[];
  indicators: {
    rsi: number;
    macd: { value: number; signal: number; histogram: number };
    ma20: number;
    ma50: number;
    ma200: number;
    bollingerBands: { upper: number; middle: number; lower: number };
  };
  support: number[];
  resistance: number[];
}

export interface FundamentalAnalysis {
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  maxSupply?: number;
  volumeToMcapRatio: number;
  networkActivity?: number;
  developerActivity?: number;
}

export interface SentimentAnalysis {
  socialScore: number;
  fearGreedIndex: number;
  mentionsChange24h: number;
  sentimentScore: number; // -1 to 1
  topKeywords: string[];
}

export interface MarketContext {
  globalTrend: string;
  dominantNarrative: string;
  keyEvents: string[];
  correlations: Record<string, number>;
}

export interface Recommendation {
  asset: string;
  action: 'strong buy' | 'buy' | 'hold' | 'sell' | 'strong sell';
  confidence: number;
  reasoning: string[];
  timeHorizon: string;
  targetPrice?: number;
  stopLoss?: number;
}

export interface RiskAssessment {
  portfolioRisk: 'low' | 'medium' | 'high' | 'extreme';
  volatilityRisk: number;
  correlationRisk: number;
  liquidityRisk: number;
  suggestions: string[];
}

export const analyzeAction: Action = {
  name: "ANALYZE",
  similes: ["analyze", "evaluate", "assess", "study market", "deep dive"],
  description: "Perform comprehensive analysis on cryptocurrency assets",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const params = message.content as any;
    
    // Validate required parameters
    if (!params.type || !params.assets || !Array.isArray(params.assets)) {
      return false;
    }
    
    // Validate analysis type
    const validTypes = ['technical', 'fundamental', 'sentiment', 'comprehensive'];
    if (!validTypes.includes(params.type)) {
      return false;
    }
    
    // Validate depth
    const validDepths = ['basic', 'detailed', 'expert'];
    if (params.depth && !validDepths.includes(params.depth)) {
      return false;
    }
    
    // Validate assets
    if (params.assets.length === 0 || params.assets.length > 10) {
      return false;
    }
    
    return true;
  },
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ): Promise<void> => {
    const params = message.content as AnalyzeParams;
    
    try {
      const analysisType = params.type;
      const assets = params.assets.map(a => a.toUpperCase());
      const depth = params.depth || 'detailed';
      const timeframe = params.timeframe || '1d';
      
      // Fetch market data for analysis
      const marketData = await fetchDetailedMarketData(assets, timeframe);
      
      if (!marketData.success) {
        callback({
          text: `Failed to fetch market data: ${marketData.error}`,
          action: "ANALYZE_FAILED"
        });
        return;
      }
      
      // Perform analysis based on type
      const assetAnalyses: Record<string, AssetAnalysis> = {};
      
      for (const asset of assets) {
        const analysis: AssetAnalysis = {
          technical: await performTechnicalAnalysis(asset, marketData[asset], depth),
          score: 0,
          outlook: 'neutral'
        };
        
        if (analysisType === 'fundamental' || analysisType === 'comprehensive') {
          analysis.fundamental = await performFundamentalAnalysis(asset, marketData[asset]);
        }
        
        if (analysisType === 'sentiment' || analysisType === 'comprehensive') {
          analysis.sentiment = await performSentimentAnalysis(asset);
        }
        
        // Calculate overall score and outlook
        const scores = calculateOverallScore(analysis);
        analysis.score = scores.score;
        analysis.outlook = scores.outlook;
        
        assetAnalyses[asset] = analysis;
      }
      
      // Analyze market context
      const marketContext = analyzeMarketContext(assetAnalyses, marketData);
      
      // Generate recommendations
      const recommendations = generateRecommendations(assetAnalyses, marketContext, depth);
      
      // Assess portfolio risk
      const riskAssessment = assessPortfolioRisk(assetAnalyses, state.positions || []);
      
      // Update agent state
      await updateAgentState(runtime, {
        lastAction: 'analyze',
        lastActionTime: new Date(),
        lastAnalysis: {
          timestamp: new Date(),
          type: analysisType,
          assets: assetAnalyses,
          recommendations
        }
      });
      
      // Prepare response
      const response: AnalyzeResult = {
        success: true,
        timestamp: new Date(),
        analysisType,
        assets: assetAnalyses,
        marketContext,
        recommendations,
        riskAssessment
      };
      
      // Format response text
      let responseText = `${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Analysis Results:\n\n`;
      
      for (const [asset, analysis] of Object.entries(assetAnalyses)) {
        responseText += `${asset}:\n`;
        responseText += `• Overall Score: ${analysis.score}/100 (${analysis.outlook.toUpperCase()})\n`;
        responseText += `• Trend: ${analysis.technical.trend}\n`;
        responseText += `• RSI: ${analysis.technical.indicators.rsi.toFixed(0)}\n`;
        
        if (analysis.fundamental) {
          responseText += `• Volume/MCap: ${(analysis.fundamental.volumeToMcapRatio * 100).toFixed(2)}%\n`;
        }
        
        if (analysis.sentiment) {
          responseText += `• Sentiment: ${analysis.sentiment.sentimentScore > 0 ? 'Positive' : 'Negative'} (${(Math.abs(analysis.sentiment.sentimentScore) * 100).toFixed(0)}%)\n`;
        }
        
        responseText += '\n';
      }
      
      responseText += `Market Context: ${marketContext.dominantNarrative}\n\n`;
      
      responseText += `Top Recommendations:\n`;
      recommendations.slice(0, 3).forEach((rec, i) => {
        responseText += `${i + 1}. ${rec.asset}: ${rec.action.toUpperCase()} (${(rec.confidence * 100).toFixed(0)}% confidence)\n`;
        responseText += `   ${rec.reasoning[0]}\n`;
      });
      
      responseText += `\nRisk Assessment: ${riskAssessment.portfolioRisk.toUpperCase()}\n`;
      if (riskAssessment.suggestions.length > 0) {
        responseText += `Suggestions: ${riskAssessment.suggestions[0]}`;
      }
      
      callback({
        text: responseText,
        action: "ANALYZE_SUCCESS",
        data: response
      });
      
    } catch (error) {
      callback({
        text: `Unexpected error during analysis: ${error.message}`,
        action: "ANALYZE_ERROR"
      });
    }
  },
  
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Analyze ETH and BTC with technical analysis" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Performing technical analysis on ETH and BTC...",
          action: "ANALYZE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Do a comprehensive analysis of SEI with expert depth" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Conducting comprehensive expert-level analysis on SEI...",
          action: "ANALYZE"
        }
      }
    ]
  ]
};

// Helper functions

async function fetchDetailedMarketData(assets: string[], timeframe: string): Promise<any> {
  // Simulated detailed market data
  const data: any = { success: true };
  
  for (const asset of assets) {
    const basePrice = getBasePrice(asset);
    const history = generateDetailedHistory(basePrice, timeframe);
    
    data[asset] = {
      price: basePrice,
      history,
      volume: generateVolumeData(history.length),
      orderBook: generateOrderBook(basePrice),
      trades: generateRecentTrades(basePrice)
    };
  }
  
  return data;
}

function getBasePrice(asset: string): number {
  const prices: Record<string, number> = {
    ETH: 2500,
    WBTC: 45000,
    BTC: 45000,
    USDC: 1,
    USDT: 1,
    DAI: 1,
    SEI: 0.5
  };
  return prices[asset] || 100;
}

function generateDetailedHistory(basePrice: number, timeframe: string): any[] {
  const periods = 100;
  const history = [];
  let price = basePrice * 0.9;
  
  for (let i = 0; i < periods; i++) {
    const volatility = 0.02;
    const open = price;
    const high = open * (1 + Math.random() * volatility);
    const low = open * (1 - Math.random() * volatility);
    const close = low + Math.random() * (high - low);
    const volume = Math.random() * 1000000;
    
    history.push({ open, high, low, close, volume, timestamp: new Date(Date.now() - (periods - i) * 3600000) });
    price = close;
  }
  
  return history;
}

function generateVolumeData(length: number): number[] {
  return Array(length).fill(0).map(() => Math.random() * 1000000 + 100000);
}

function generateOrderBook(price: number): any {
  const spread = 0.001;
  const bids = [];
  const asks = [];
  
  for (let i = 0; i < 20; i++) {
    bids.push({
      price: price * (1 - spread * (i + 1)),
      volume: Math.random() * 10000
    });
    asks.push({
      price: price * (1 + spread * (i + 1)),
      volume: Math.random() * 10000
    });
  }
  
  return { bids, asks };
}

function generateRecentTrades(price: number): any[] {
  return Array(50).fill(0).map((_, i) => ({
    price: price * (1 + (Math.random() - 0.5) * 0.01),
    volume: Math.random() * 1000,
    side: Math.random() > 0.5 ? 'buy' : 'sell',
    timestamp: new Date(Date.now() - i * 60000)
  }));
}

async function performTechnicalAnalysis(asset: string, data: any, depth: string): Promise<TechnicalAnalysis> {
  const history = data.history;
  const prices = history.map((h: any) => h.close);
  
  // Calculate indicators
  const rsi = calculateRSI(prices);
  const macd = calculateMACD(prices);
  const ma20 = calculateMA(prices, 20);
  const ma50 = calculateMA(prices, 50);
  const ma200 = calculateMA(prices, 200);
  const bollingerBands = calculateBollingerBands(prices, 20, 2);
  
  // Identify patterns
  const patterns = identifyPatterns(history, depth);
  
  // Calculate support/resistance
  const { support, resistance } = calculateSupportResistanceLevels(history);
  
  // Determine trend
  const trend = determineTrend(prices, ma20, ma50, ma200);
  
  // Calculate momentum
  const momentum = calculateMomentum(prices, rsi, macd);
  
  // Calculate volatility
  const volatility = calculateVolatility(prices);
  
  return {
    trend,
    momentum,
    volatility,
    patterns,
    indicators: {
      rsi,
      macd,
      ma20,
      ma50,
      ma200,
      bollingerBands
    },
    support,
    resistance
  };
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period) return 50;
  
  const gains = [];
  const losses = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  const signal = calculateEMA([macdLine], 9);
  const histogram = macdLine - signal;
  
  return { value: macdLine, signal, histogram };
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

function calculateMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateBollingerBands(prices: number[], period: number, stdDev: number): any {
  const ma = calculateMA(prices, period);
  const variance = prices.slice(-period).reduce((sum, price) => {
    return sum + Math.pow(price - ma, 2);
  }, 0) / period;
  const std = Math.sqrt(variance);
  
  return {
    upper: ma + std * stdDev,
    middle: ma,
    lower: ma - std * stdDev
  };
}

function identifyPatterns(history: any[], depth: string): string[] {
  const patterns = [];
  
  // Simple pattern identification
  const lastCandles = history.slice(-5);
  
  // Bullish patterns
  if (lastCandles[4].close > lastCandles[3].close && 
      lastCandles[3].close > lastCandles[2].close) {
    patterns.push('Bullish Momentum');
  }
  
  // Bearish patterns
  if (lastCandles[4].close < lastCandles[3].close && 
      lastCandles[3].close < lastCandles[2].close) {
    patterns.push('Bearish Momentum');
  }
  
  // Doji
  const lastCandle = lastCandles[4];
  if (Math.abs(lastCandle.close - lastCandle.open) / lastCandle.open < 0.001) {
    patterns.push('Doji - Indecision');
  }
  
  if (depth === 'expert') {
    // Add more complex patterns
    patterns.push('Potential Cup and Handle Formation');
  }
  
  return patterns;
}

function calculateSupportResistanceLevels(history: any[]): { support: number[]; resistance: number[] } {
  const highs = history.map(h => h.high).sort((a, b) => b - a);
  const lows = history.map(h => h.low).sort((a, b) => a - b);
  
  return {
    support: [lows[0], lows[Math.floor(lows.length * 0.1)], lows[Math.floor(lows.length * 0.2)]],
    resistance: [highs[0], highs[Math.floor(highs.length * 0.1)], highs[Math.floor(highs.length * 0.2)]]
  };
}

function determineTrend(prices: number[], ma20: number, ma50: number, ma200: number): string {
  const currentPrice = prices[prices.length - 1];
  
  if (currentPrice > ma20 && ma20 > ma50 && ma50 > ma200) {
    return 'Strong Uptrend';
  } else if (currentPrice > ma20 && ma20 > ma50) {
    return 'Uptrend';
  } else if (currentPrice < ma20 && ma20 < ma50 && ma50 < ma200) {
    return 'Strong Downtrend';
  } else if (currentPrice < ma20 && ma20 < ma50) {
    return 'Downtrend';
  } else {
    return 'Sideways/Consolidation';
  }
}

function calculateMomentum(prices: number[], rsi: number, macd: any): number {
  const priceChange = (prices[prices.length - 1] - prices[prices.length - 10]) / prices[prices.length - 10];
  const rsiMomentum = (rsi - 50) / 50;
  const macdMomentum = macd.histogram > 0 ? 1 : -1;
  
  return (priceChange + rsiMomentum + macdMomentum) / 3;
}

function calculateVolatility(prices: number[]): number {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  
  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
  
  return Math.sqrt(variance) * Math.sqrt(252);
}

async function performFundamentalAnalysis(asset: string, data: any): Promise<FundamentalAnalysis> {
  // Simulated fundamental data
  const marketCap = getMarketCap(asset);
  const circulatingSupply = getCirculatingSupply(asset);
  const maxSupply = getMaxSupply(asset);
  const volume24h = data.volume.reduce((a: number, b: number) => a + b, 0);
  
  return {
    marketCap,
    volume24h,
    circulatingSupply,
    maxSupply,
    volumeToMcapRatio: volume24h / marketCap,
    networkActivity: Math.random() * 100,
    developerActivity: Math.random() * 100
  };
}

function getMarketCap(asset: string): number {
  const caps: Record<string, number> = {
    BTC: 900000000000,
    ETH: 300000000000,
    WBTC: 10000000000,
    USDC: 50000000000,
    USDT: 80000000000,
    DAI: 5000000000,
    SEI: 500000000
  };
  return caps[asset] || 1000000000;
}

function getCirculatingSupply(asset: string): number {
  const supplies: Record<string, number> = {
    BTC: 19500000,
    ETH: 120000000,
    WBTC: 250000,
    USDC: 50000000000,
    USDT: 80000000000,
    DAI: 5000000000,
    SEI: 1000000000
  };
  return supplies[asset] || 1000000000;
}

function getMaxSupply(asset: string): number | undefined {
  const maxSupplies: Record<string, number> = {
    BTC: 21000000,
    SEI: 10000000000
  };
  return maxSupplies[asset];
}

async function performSentimentAnalysis(asset: string): Promise<SentimentAnalysis> {
  // Simulated sentiment data
  return {
    socialScore: Math.random() * 100,
    fearGreedIndex: Math.random() * 100,
    mentionsChange24h: (Math.random() - 0.5) * 200,
    sentimentScore: Math.random() * 2 - 1,
    topKeywords: ['bullish', 'moon', 'hodl', 'dip', 'accumulation']
  };
}

function calculateOverallScore(analysis: AssetAnalysis): { score: number; outlook: string } {
  let score = 50; // Base score
  
  // Technical factors (40% weight)
  if (analysis.technical.trend.includes('Uptrend')) score += 10;
  if (analysis.technical.trend.includes('Strong')) score += 5;
  if (analysis.technical.momentum > 0) score += 10;
  if (analysis.technical.indicators.rsi > 30 && analysis.technical.indicators.rsi < 70) score += 5;
  
  // Fundamental factors (30% weight)
  if (analysis.fundamental) {
    if (analysis.fundamental.volumeToMcapRatio > 0.1) score += 10;
    if (analysis.fundamental.networkActivity && analysis.fundamental.networkActivity > 50) score += 5;
  }
  
  // Sentiment factors (30% weight)
  if (analysis.sentiment) {
    if (analysis.sentiment.sentimentScore > 0) score += 10;
    if (analysis.sentiment.fearGreedIndex > 50) score += 5;
  }
  
  // Determine outlook
  let outlook: string;
  if (score >= 80) outlook = 'very bullish';
  else if (score >= 65) outlook = 'bullish';
  else if (score >= 35) outlook = 'neutral';
  else if (score >= 20) outlook = 'bearish';
  else outlook = 'very bearish';
  
  return { score: Math.min(100, Math.max(0, score)), outlook };
}

function analyzeMarketContext(analyses: Record<string, AssetAnalysis>, marketData: any): MarketContext {
  // Determine global trend
  const trendCounts = { up: 0, down: 0, sideways: 0 };
  for (const analysis of Object.values(analyses)) {
    if (analysis.technical.trend.includes('Uptrend')) trendCounts.up++;
    else if (analysis.technical.trend.includes('Downtrend')) trendCounts.down++;
    else trendCounts.sideways++;
  }
  
  let globalTrend = 'Mixed';
  if (trendCounts.up > trendCounts.down * 2) globalTrend = 'Bullish';
  else if (trendCounts.down > trendCounts.up * 2) globalTrend = 'Bearish';
  else if (trendCounts.sideways > (trendCounts.up + trendCounts.down)) globalTrend = 'Consolidating';
  
  // Determine narrative
  const narratives = [
    'Risk-on sentiment returning to crypto markets',
    'Institutional accumulation phase detected',
    'Retail interest growing steadily',
    'Market awaiting major catalyst'
  ];
  const dominantNarrative = narratives[Math.floor(Math.random() * narratives.length)];
  
  // Key events
  const keyEvents = [
    'Major protocol upgrade scheduled',
    'Regulatory clarity improving',
    'Whale accumulation detected'
  ];
  
  // Calculate correlations
  const correlations: Record<string, number> = {};
  const assets = Object.keys(analyses);
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const key = `${assets[i]}_${assets[j]}`;
      correlations[key] = 0.3 + Math.random() * 0.6;
    }
  }
  
  return {
    globalTrend,
    dominantNarrative,
    keyEvents,
    correlations
  };
}

function generateRecommendations(
  analyses: Record<string, AssetAnalysis>, 
  context: MarketContext,
  depth: string
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  for (const [asset, analysis] of Object.entries(analyses)) {
    let action: string;
    let confidence = 0;
    const reasoning = [];
    
    // Determine action based on score and outlook
    if (analysis.score >= 75) {
      action = 'strong buy';
      confidence = 0.8;
    } else if (analysis.score >= 60) {
      action = 'buy';
      confidence = 0.65;
    } else if (analysis.score >= 40) {
      action = 'hold';
      confidence = 0.5;
    } else if (analysis.score >= 25) {
      action = 'sell';
      confidence = 0.6;
    } else {
      action = 'strong sell';
      confidence = 0.75;
    }
    
    // Build reasoning
    if (analysis.technical.trend.includes('Uptrend')) {
      reasoning.push(`Strong technical uptrend with ${analysis.technical.trend}`);
    }
    
    if (analysis.technical.indicators.rsi < 30) {
      reasoning.push('Oversold conditions present opportunity');
      if (action === 'sell') action = 'hold';
    } else if (analysis.technical.indicators.rsi > 70) {
      reasoning.push('Overbought conditions suggest caution');
      if (action === 'buy') action = 'hold';
    }
    
    if (analysis.fundamental?.volumeToMcapRatio > 0.15) {
      reasoning.push('High volume indicates strong interest');
      confidence += 0.05;
    }
    
    if (analysis.sentiment?.sentimentScore > 0.5) {
      reasoning.push('Positive market sentiment');
    }
    
    // Calculate targets for detailed/expert depth
    let targetPrice, stopLoss;
    if (depth !== 'basic') {
      const currentPrice = getBasePrice(asset);
      if (action.includes('buy')) {
        targetPrice = currentPrice * (1 + 0.1 + Math.random() * 0.2);
        stopLoss = currentPrice * 0.95;
      } else if (action.includes('sell')) {
        targetPrice = currentPrice * (0.9 - Math.random() * 0.1);
        stopLoss = currentPrice * 1.05;
      }
    }
    
    recommendations.push({
      asset,
      action: action as any,
      confidence: Math.min(0.95, confidence),
      reasoning,
      timeHorizon: depth === 'expert' ? '2-4 weeks' : '1-2 weeks',
      targetPrice,
      stopLoss
    });
  }
  
  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

function assessPortfolioRisk(analyses: Record<string, AssetAnalysis>, positions: any[]): RiskAssessment {
  // Calculate various risk metrics
  const volatilities = Object.values(analyses).map(a => a.technical.volatility);
  const avgVolatility = volatilities.reduce((a, b) => a + b, 0) / volatilities.length;
  
  // Determine risk level
  let portfolioRisk: string;
  if (avgVolatility < 0.3) portfolioRisk = 'low';
  else if (avgVolatility < 0.6) portfolioRisk = 'medium';
  else if (avgVolatility < 0.9) portfolioRisk = 'high';
  else portfolioRisk = 'extreme';
  
  // Risk scores
  const volatilityRisk = avgVolatility;
  const correlationRisk = 0.5; // Simplified
  const liquidityRisk = 0.3; // Simplified
  
  // Generate suggestions
  const suggestions = [];
  if (volatilityRisk > 0.7) {
    suggestions.push('Consider reducing position sizes in high-volatility assets');
  }
  if (correlationRisk > 0.7) {
    suggestions.push('Portfolio assets are highly correlated - consider diversification');
  }
  if (positions.length < 3) {
    suggestions.push('Limited diversification - consider adding more assets');
  }
  
  return {
    portfolioRisk: portfolioRisk as any,
    volatilityRisk,
    correlationRisk,
    liquidityRisk,
    suggestions
  };
}

async function updateAgentState(runtime: IAgentRuntime, updates: any): Promise<void> {
  const currentState = runtime.character?.settings?.state || {};
  const newState = { ...currentState, ...updates };
  
  if (runtime.character?.settings) {
    runtime.character.settings.state = newState;
  }
}

export default analyzeAction;