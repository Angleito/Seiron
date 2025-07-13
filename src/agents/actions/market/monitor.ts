import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';

export interface MonitorParams {
  assets?: string[]; // Assets to monitor, default all
  metrics?: string[]; // Specific metrics to track
  timeframe?: string; // '1h', '4h', '1d', '1w'
  alerts?: boolean; // Enable price alerts
}

export interface MonitorResult {
  success: boolean;
  timestamp: Date;
  marketOverview: {
    trend: 'bullish' | 'bearish' | 'neutral';
    volatility: 'low' | 'medium' | 'high' | 'extreme';
    volume24h: number;
    dominance: Record<string, number>;
  };
  assetMetrics: Record<string, AssetMetrics>;
  alerts: Alert[];
  opportunities: Opportunity[];
}

export interface AssetMetrics {
  price: number;
  change24h: number;
  change7d: number;
  volume24h: number;
  marketCap: number;
  volatility: number;
  rsi: number;
  support: number;
  resistance: number;
}

export interface Alert {
  type: 'price' | 'volume' | 'volatility' | 'trend';
  severity: 'info' | 'warning' | 'critical';
  asset: string;
  message: string;
  value: number;
  threshold: number;
}

export interface Opportunity {
  type: 'arbitrage' | 'trend' | 'reversal' | 'breakout';
  confidence: number;
  asset: string;
  action: string;
  reasoning: string;
  potentialGain: number;
}

export const monitorAction: Action = {
  name: "MONITOR",
  similes: ["monitor market", "watch prices", "track assets", "analyze market", "check prices"],
  description: "Monitor cryptocurrency market conditions and identify opportunities",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const params = message.content as any;
    
    // Validate assets if provided
    if (params.assets && !Array.isArray(params.assets)) {
      return false;
    }
    
    // Validate metrics if provided
    if (params.metrics && !Array.isArray(params.metrics)) {
      return false;
    }
    
    // Validate timeframe
    const validTimeframes = ['1h', '4h', '1d', '1w'];
    if (params.timeframe && !validTimeframes.includes(params.timeframe)) {
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
    const params = message.content as MonitorParams;
    
    try {
      // Default assets if not specified
      const assets = params.assets?.map(a => a.toUpperCase()) || 
                    ['ETH', 'WBTC', 'USDC', 'SEI'];
      const timeframe = params.timeframe || '1d';
      const enableAlerts = params.alerts !== false;
      
      // Fetch market data
      const marketData = await fetchMarketData(assets, timeframe);
      
      if (!marketData.success) {
        callback({
          text: `Failed to fetch market data: ${marketData.error}`,
          action: "MONITOR_FAILED"
        });
        return;
      }
      
      // Analyze market conditions
      const marketOverview = analyzeMarketConditions(marketData);
      
      // Calculate asset metrics
      const assetMetrics: Record<string, AssetMetrics> = {};
      for (const asset of assets) {
        assetMetrics[asset] = calculateAssetMetrics(marketData.prices[asset], timeframe);
      }
      
      // Generate alerts if enabled
      const alerts: Alert[] = [];
      if (enableAlerts) {
        alerts.push(...generateAlerts(assetMetrics, state.alertThresholds || {}));
      }
      
      // Identify opportunities
      const opportunities = identifyOpportunities(assetMetrics, marketOverview);
      
      // Update agent state
      await updateAgentState(runtime, {
        lastAction: 'monitor',
        lastActionTime: new Date(),
        lastMarketCheck: new Date(),
        marketData: {
          overview: marketOverview,
          assets: assetMetrics,
          timestamp: new Date()
        },
        activeAlerts: alerts.filter(a => a.severity !== 'info')
      });
      
      // Prepare response
      const response: MonitorResult = {
        success: true,
        timestamp: new Date(),
        marketOverview,
        assetMetrics,
        alerts,
        opportunities
      };
      
      // Format response text
      let responseText = `Market Analysis (${timeframe}):\n\n`;
      responseText += `Overall Trend: ${marketOverview.trend.toUpperCase()}\n`;
      responseText += `Volatility: ${marketOverview.volatility.toUpperCase()}\n`;
      responseText += `24h Volume: $${(marketOverview.volume24h / 1e9).toFixed(2)}B\n\n`;
      
      responseText += `Asset Performance:\n`;
      for (const [asset, metrics] of Object.entries(assetMetrics)) {
        responseText += `${asset}: $${metrics.price.toFixed(2)} (${metrics.change24h > 0 ? '+' : ''}${metrics.change24h.toFixed(2)}%)\n`;
      }
      
      if (alerts.length > 0) {
        responseText += `\nAlerts (${alerts.length}):\n`;
        alerts.slice(0, 3).forEach(alert => {
          responseText += `- ${alert.severity.toUpperCase()}: ${alert.message}\n`;
        });
      }
      
      if (opportunities.length > 0) {
        responseText += `\nOpportunities Found (${opportunities.length}):\n`;
        opportunities.slice(0, 3).forEach(opp => {
          responseText += `- ${opp.type.toUpperCase()}: ${opp.action} (${(opp.confidence * 100).toFixed(0)}% confidence)\n`;
        });
      }
      
      callback({
        text: responseText,
        action: "MONITOR_SUCCESS",
        data: response
      });
      
    } catch (error) {
      callback({
        text: `Unexpected error during market monitoring: ${error.message}`,
        action: "MONITOR_ERROR"
      });
    }
  },
  
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Monitor the crypto market" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "I'll analyze the current cryptocurrency market conditions...",
          action: "MONITOR"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Check ETH and BTC prices with 4h timeframe" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Monitoring ETH and BTC on the 4-hour timeframe...",
          action: "MONITOR"
        }
      }
    ]
  ]
};

// Helper functions

async function fetchMarketData(assets: string[], timeframe: string): Promise<any> {
  // Simulated market data - in production, this would fetch from price APIs
  const prices: Record<string, any> = {};
  
  for (const asset of assets) {
    const basePrice = getBasePrice(asset);
    const volatility = Math.random() * 0.3 + 0.1;
    
    prices[asset] = {
      current: basePrice * (1 + (Math.random() - 0.5) * 0.1),
      history: generatePriceHistory(basePrice, timeframe, volatility),
      volume24h: Math.random() * 1e9 + 1e8,
      marketCap: basePrice * getSupply(asset)
    };
  }
  
  return {
    success: true,
    prices,
    globalVolume: Object.values(prices).reduce((sum: number, p: any) => sum + p.volume24h, 0)
  };
}

function getBasePrice(asset: string): number {
  const prices: Record<string, number> = {
    ETH: 2500,
    WBTC: 45000,
    USDC: 1,
    USDT: 1,
    DAI: 1,
    SEI: 0.5
  };
  return prices[asset] || 100;
}

function getSupply(asset: string): number {
  const supplies: Record<string, number> = {
    ETH: 120000000,
    WBTC: 21000000,
    USDC: 50000000000,
    USDT: 80000000000,
    DAI: 5000000000,
    SEI: 10000000000
  };
  return supplies[asset] || 1000000000;
}

function generatePriceHistory(basePrice: number, timeframe: string, volatility: number): number[] {
  const periods = timeframe === '1h' ? 60 : timeframe === '4h' ? 96 : timeframe === '1d' ? 30 : 52;
  const history: number[] = [];
  let price = basePrice;
  
  for (let i = 0; i < periods; i++) {
    price *= 1 + (Math.random() - 0.5) * volatility * 0.1;
    history.push(price);
  }
  
  return history;
}

function analyzeMarketConditions(marketData: any): any {
  // Simplified market analysis
  const totalVolume = marketData.globalVolume;
  
  // Determine trend based on price movements
  let bullishCount = 0;
  let totalChange = 0;
  
  for (const [asset, data] of Object.entries(marketData.prices)) {
    const history = data.history as number[];
    const change = ((data.current - history[0]) / history[0]) * 100;
    totalChange += change;
    if (change > 0) bullishCount++;
  }
  
  const avgChange = totalChange / Object.keys(marketData.prices).length;
  const trend = avgChange > 2 ? 'bullish' : avgChange < -2 ? 'bearish' : 'neutral';
  
  // Calculate volatility
  const volatilityScore = calculateMarketVolatility(marketData.prices);
  const volatility = volatilityScore < 0.1 ? 'low' : 
                    volatilityScore < 0.3 ? 'medium' : 
                    volatilityScore < 0.5 ? 'high' : 'extreme';
  
  // Calculate dominance
  const dominance: Record<string, number> = {};
  const totalMarketCap = Object.values(marketData.prices)
    .reduce((sum: number, p: any) => sum + p.marketCap, 0);
  
  for (const [asset, data] of Object.entries(marketData.prices)) {
    dominance[asset] = ((data as any).marketCap / totalMarketCap) * 100;
  }
  
  return {
    trend,
    volatility,
    volume24h: totalVolume,
    dominance
  };
}

function calculateMarketVolatility(prices: Record<string, any>): number {
  let totalVolatility = 0;
  let count = 0;
  
  for (const data of Object.values(prices)) {
    const history = data.history as number[];
    const returns = [];
    
    for (let i = 1; i < history.length; i++) {
      returns.push((history[i] - history[i-1]) / history[i-1]);
    }
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    totalVolatility += volatility;
    count++;
  }
  
  return totalVolatility / count;
}

function calculateAssetMetrics(priceData: any, timeframe: string): AssetMetrics {
  const history = priceData.history;
  const current = priceData.current;
  
  // Calculate changes
  const change24h = ((current - history[history.length - 24]) / history[history.length - 24]) * 100;
  const change7d = ((current - history[0]) / history[0]) * 100;
  
  // Calculate RSI
  const rsi = calculateRSI(history);
  
  // Calculate support and resistance
  const { support, resistance } = calculateSupportResistance(history);
  
  // Calculate volatility
  const volatility = calculateVolatility(history);
  
  return {
    price: current,
    change24h,
    change7d,
    volume24h: priceData.volume24h,
    marketCap: priceData.marketCap,
    volatility,
    rsi,
    support,
    resistance
  };
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateSupportResistance(prices: number[]): { support: number; resistance: number } {
  const sorted = [...prices].sort((a, b) => a - b);
  const support = sorted[Math.floor(sorted.length * 0.1)];
  const resistance = sorted[Math.floor(sorted.length * 0.9)];
  
  return { support, resistance };
}

function calculateVolatility(prices: number[]): number {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  
  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
  
  return Math.sqrt(variance) * Math.sqrt(252); // Annualized
}

function generateAlerts(metrics: Record<string, AssetMetrics>, thresholds: any): Alert[] {
  const alerts: Alert[] = [];
  
  for (const [asset, data] of Object.entries(metrics)) {
    // Price movement alerts
    if (Math.abs(data.change24h) > 10) {
      alerts.push({
        type: 'price',
        severity: Math.abs(data.change24h) > 20 ? 'critical' : 'warning',
        asset,
        message: `${asset} ${data.change24h > 0 ? 'surged' : 'dropped'} ${Math.abs(data.change24h).toFixed(1)}% in 24h`,
        value: data.change24h,
        threshold: 10
      });
    }
    
    // RSI alerts
    if (data.rsi > 70 || data.rsi < 30) {
      alerts.push({
        type: 'trend',
        severity: 'warning',
        asset,
        message: `${asset} RSI at ${data.rsi.toFixed(0)} - ${data.rsi > 70 ? 'Overbought' : 'Oversold'}`,
        value: data.rsi,
        threshold: data.rsi > 70 ? 70 : 30
      });
    }
    
    // Volatility alerts
    if (data.volatility > 0.8) {
      alerts.push({
        type: 'volatility',
        severity: data.volatility > 1.2 ? 'critical' : 'warning',
        asset,
        message: `${asset} showing high volatility (${(data.volatility * 100).toFixed(1)}% annualized)`,
        value: data.volatility,
        threshold: 0.8
      });
    }
    
    // Support/Resistance alerts
    if (data.price < data.support * 1.05) {
      alerts.push({
        type: 'price',
        severity: 'info',
        asset,
        message: `${asset} approaching support at $${data.support.toFixed(2)}`,
        value: data.price,
        threshold: data.support
      });
    }
    
    if (data.price > data.resistance * 0.95) {
      alerts.push({
        type: 'price',
        severity: 'info',
        asset,
        message: `${asset} approaching resistance at $${data.resistance.toFixed(2)}`,
        value: data.price,
        threshold: data.resistance
      });
    }
  }
  
  return alerts;
}

function identifyOpportunities(metrics: Record<string, AssetMetrics>, marketOverview: any): Opportunity[] {
  const opportunities: Opportunity[] = [];
  
  for (const [asset, data] of Object.entries(metrics)) {
    // Oversold bounce opportunity
    if (data.rsi < 30 && data.price > data.support * 0.98) {
      opportunities.push({
        type: 'reversal',
        confidence: 0.7,
        asset,
        action: `Consider buying ${asset} - oversold with support nearby`,
        reasoning: `RSI at ${data.rsi.toFixed(0)}, price near support level`,
        potentialGain: 5
      });
    }
    
    // Breakout opportunity
    if (data.price > data.resistance * 0.98 && data.volume24h > 1e9) {
      opportunities.push({
        type: 'breakout',
        confidence: 0.65,
        asset,
        action: `${asset} breaking resistance - potential breakout`,
        reasoning: `Price testing resistance with high volume`,
        potentialGain: 8
      });
    }
    
    // Trend following opportunity
    if (marketOverview.trend === 'bullish' && data.change24h > 5 && data.rsi < 65) {
      opportunities.push({
        type: 'trend',
        confidence: 0.6,
        asset,
        action: `${asset} showing strong momentum in bull market`,
        reasoning: `Positive trend with room to grow (RSI: ${data.rsi.toFixed(0)})`,
        potentialGain: 10
      });
    }
  }
  
  // Sort by confidence
  return opportunities.sort((a, b) => b.confidence - a.confidence);
}

async function updateAgentState(runtime: IAgentRuntime, updates: any): Promise<void> {
  const currentState = runtime.character?.settings?.state || {};
  const newState = { ...currentState, ...updates };
  
  if (runtime.character?.settings) {
    runtime.character.settings.state = newState;
  }
}

export default monitorAction;