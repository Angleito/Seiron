import { Evaluator, IAgentRuntime, Memory, State } from '@ai16z/eliza';

export interface MarketMetrics {
  trend: 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear';
  momentum: number; // -1 to 1
  volatility: 'low' | 'normal' | 'high' | 'extreme';
  volume: 'low' | 'normal' | 'high';
  sentiment: number; // -1 to 1
  fearGreedIndex: number; // 0 to 100
}

export interface MarketSignal {
  type: 'entry' | 'exit' | 'hold' | 'caution';
  strength: number; // 0 to 1
  asset: string;
  reason: string;
  timeframe: string;
}

export interface MarketCorrelation {
  asset1: string;
  asset2: string;
  correlation: number; // -1 to 1
  period: string;
}

export interface MarketRegime {
  current: 'risk_on' | 'risk_off' | 'uncertain';
  confidence: number;
  drivers: string[];
  duration: number; // days
}

export interface MarketConditionsResult {
  metrics: MarketMetrics;
  signals: MarketSignal[];
  correlations: MarketCorrelation[];
  regime: MarketRegime;
  recommendations: MarketRecommendation[];
  alerts: MarketAlert[];
}

export interface MarketRecommendation {
  action: string;
  assets: string[];
  allocation: number;
  reasoning: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface MarketAlert {
  level: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  assets: string[];
  timestamp: Date;
}

export const marketConditionsEvaluator: Evaluator = {
  name: "MARKET_CONDITIONS",
  similes: ["market analysis", "market check", "market evaluation"],
  description: "Evaluates overall cryptocurrency market conditions",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // This evaluator runs on market-related contexts
    const content = message.content as any;
    return content.market || content.analysis || content.monitor || true; // Can run on any context
  },
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State
  ): Promise<MarketConditionsResult> => {
    try {
      // Fetch current market data
      const marketData = await fetchMarketData();
      
      // Calculate market metrics
      const metrics = calculateMarketMetrics(marketData);
      
      // Generate trading signals
      const signals = generateMarketSignals(marketData, metrics);
      
      // Calculate correlations
      const correlations = calculateCorrelations(marketData);
      
      // Determine market regime
      const regime = determineMarketRegime(metrics, marketData);
      
      // Generate recommendations based on conditions
      const recommendations = generateRecommendations(metrics, regime, state);
      
      // Check for alerts
      const alerts = checkMarketAlerts(metrics, marketData, state);
      
      // Update market tracking
      await updateMarketTracking(runtime, metrics, regime);
      
      return {
        metrics,
        signals,
        correlations,
        regime,
        recommendations,
        alerts
      };
      
    } catch (error) {
      console.error('Market conditions evaluation error:', error);
      return getDefaultMarketConditions();
    }
  },
  
  examples: []
};

// Helper functions

async function fetchMarketData(): Promise<any> {
  // Simulated market data fetching
  const assets = ['BTC', 'ETH', 'USDC', 'USDT', 'DAI', 'SEI'];
  const data: any = {
    prices: {},
    volumes: {},
    changes: {},
    marketCap: {},
    dominance: {}
  };
  
  // Simulate current market conditions
  const marketMood = Math.random(); // 0 = bear, 1 = bull
  
  assets.forEach(asset => {
    const basePrice = getBasePrice(asset);
    const volatilityFactor = asset === 'USDC' || asset === 'USDT' || asset === 'DAI' ? 0.001 : 0.1;
    
    data.prices[asset] = {
      current: basePrice * (1 + (marketMood - 0.5) * volatilityFactor),
      change24h: (marketMood - 0.5) * 20 + (Math.random() - 0.5) * 10,
      change7d: (marketMood - 0.5) * 40 + (Math.random() - 0.5) * 20,
      high24h: basePrice * (1.05 + (Math.random() * 0.05)),
      low24h: basePrice * (0.95 - (Math.random() * 0.05))
    };
    
    data.volumes[asset] = Math.random() * 1e9 + 1e8;
    data.marketCap[asset] = basePrice * getSupply(asset);
  });
  
  // Calculate total market cap and dominance
  const totalMarketCap = Object.values(data.marketCap).reduce((a: number, b: any) => a + b, 0);
  Object.keys(data.marketCap).forEach(asset => {
    data.dominance[asset] = (data.marketCap[asset] / totalMarketCap) * 100;
  });
  
  // Add global metrics
  data.global = {
    totalMarketCap,
    totalVolume24h: Object.values(data.volumes).reduce((a: number, b: any) => a + b, 0),
    btcDominance: data.dominance.BTC || 45,
    altseason: data.dominance.BTC < 40,
    fearGreedIndex: Math.floor(marketMood * 100)
  };
  
  return data;
}

function getBasePrice(asset: string): number {
  const prices: Record<string, number> = {
    BTC: 45000,
    ETH: 2500,
    USDC: 1,
    USDT: 1,
    DAI: 1,
    SEI: 0.5
  };
  return prices[asset] || 100;
}

function getSupply(asset: string): number {
  const supplies: Record<string, number> = {
    BTC: 19500000,
    ETH: 120000000,
    USDC: 50000000000,
    USDT: 80000000000,
    DAI: 5000000000,
    SEI: 1000000000
  };
  return supplies[asset] || 1000000000;
}

function calculateMarketMetrics(data: any): MarketMetrics {
  // Calculate average price changes
  const changes24h = Object.values(data.prices).map((p: any) => p.change24h);
  const avgChange24h = changes24h.reduce((a: number, b: number) => a + b, 0) / changes24h.length;
  
  // Determine trend
  let trend: MarketMetrics['trend'];
  if (avgChange24h > 10) trend = 'strong_bull';
  else if (avgChange24h > 3) trend = 'bull';
  else if (avgChange24h > -3) trend = 'neutral';
  else if (avgChange24h > -10) trend = 'bear';
  else trend = 'strong_bear';
  
  // Calculate momentum (rate of change)
  const changes7d = Object.values(data.prices).map((p: any) => p.change7d);
  const momentum = changes7d.reduce((a: number, b: number) => a + b, 0) / changes7d.length / 100;
  
  // Calculate volatility
  const priceRanges = Object.values(data.prices).map((p: any) => 
    (p.high24h - p.low24h) / p.current
  );
  const avgVolatility = priceRanges.reduce((a: number, b: number) => a + b, 0) / priceRanges.length;
  
  let volatility: MarketMetrics['volatility'];
  if (avgVolatility < 0.02) volatility = 'low';
  else if (avgVolatility < 0.05) volatility = 'normal';
  else if (avgVolatility < 0.1) volatility = 'high';
  else volatility = 'extreme';
  
  // Determine volume level
  const totalVolume = data.global.totalVolume24h;
  let volume: MarketMetrics['volume'];
  if (totalVolume < 50e9) volume = 'low';
  else if (totalVolume < 100e9) volume = 'normal';
  else volume = 'high';
  
  // Calculate sentiment
  const fearGreed = data.global.fearGreedIndex;
  const sentiment = (fearGreed - 50) / 50; // Convert to -1 to 1
  
  return {
    trend,
    momentum: Math.max(-1, Math.min(1, momentum)),
    volatility,
    volume,
    sentiment,
    fearGreedIndex: fearGreed
  };
}

function generateMarketSignals(data: any, metrics: MarketMetrics): MarketSignal[] {
  const signals: MarketSignal[] = [];
  
  // Generate signals for each asset
  Object.entries(data.prices).forEach(([asset, priceData]: [string, any]) => {
    // Oversold signal
    if (priceData.change24h < -10 && metrics.fearGreedIndex < 30) {
      signals.push({
        type: 'entry',
        strength: 0.7,
        asset,
        reason: 'Oversold conditions with extreme fear',
        timeframe: 'short-term'
      });
    }
    
    // Overbought signal
    if (priceData.change24h > 15 && metrics.fearGreedIndex > 80) {
      signals.push({
        type: 'exit',
        strength: 0.6,
        asset,
        reason: 'Overbought conditions with extreme greed',
        timeframe: 'short-term'
      });
    }
    
    // Trend reversal signal
    if (priceData.change24h * priceData.change7d < 0 && Math.abs(priceData.change24h) > 5) {
      signals.push({
        type: priceData.change24h > 0 ? 'entry' : 'caution',
        strength: 0.5,
        asset,
        reason: 'Potential trend reversal detected',
        timeframe: 'medium-term'
      });
    }
    
    // Breakout signal
    const range = priceData.high24h - priceData.low24h;
    if (priceData.current > priceData.high24h * 0.98) {
      signals.push({
        type: 'entry',
        strength: 0.6,
        asset,
        reason: 'Breaking above daily highs',
        timeframe: 'short-term'
      });
    }
  });
  
  // Add market-wide signals
  if (metrics.trend === 'strong_bull' && metrics.volume === 'high') {
    signals.push({
      type: 'entry',
      strength: 0.8,
      asset: 'MARKET',
      reason: 'Strong bullish market with high volume',
      timeframe: 'medium-term'
    });
  }
  
  if (metrics.volatility === 'extreme') {
    signals.push({
      type: 'caution',
      strength: 0.9,
      asset: 'MARKET',
      reason: 'Extreme volatility - consider reducing positions',
      timeframe: 'immediate'
    });
  }
  
  return signals.sort((a, b) => b.strength - a.strength);
}

function calculateCorrelations(data: any): MarketCorrelation[] {
  const correlations: MarketCorrelation[] = [];
  const assets = Object.keys(data.prices);
  
  // Simplified correlation calculation based on price movements
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const asset1 = assets[i];
      const asset2 = assets[j];
      
      // Calculate correlation based on 24h changes
      const change1 = data.prices[asset1].change24h;
      const change2 = data.prices[asset2].change24h;
      
      // Simplified correlation logic
      let correlation = 0;
      if (asset1 === 'USDC' || asset1 === 'USDT' || asset1 === 'DAI') {
        if (asset2 === 'USDC' || asset2 === 'USDT' || asset2 === 'DAI') {
          correlation = 0.95; // Stablecoins highly correlated
        } else {
          correlation = -0.2; // Stables negatively correlated with crypto
        }
      } else if (asset1 === 'BTC' && asset2 === 'ETH') {
        correlation = 0.85; // BTC/ETH typically highly correlated
      } else if ((asset1 === 'BTC' || asset1 === 'ETH') && asset2 === 'SEI') {
        correlation = 0.6; // Altcoins moderately correlated with majors
      } else {
        // Calculate based on price movements
        correlation = (change1 * change2 > 0) ? 0.5 : -0.3;
      }
      
      correlations.push({
        asset1,
        asset2,
        correlation,
        period: '24h'
      });
    }
  }
  
  return correlations;
}

function determineMarketRegime(metrics: MarketMetrics, data: any): MarketRegime {
  let regime: 'risk_on' | 'risk_off' | 'uncertain';
  let confidence = 0;
  const drivers: string[] = [];
  
  // Determine regime based on multiple factors
  const bullishFactors = [
    metrics.trend === 'bull' || metrics.trend === 'strong_bull',
    metrics.momentum > 0.3,
    metrics.fearGreedIndex > 60,
    metrics.volume === 'high',
    data.global.altseason
  ].filter(Boolean).length;
  
  const bearishFactors = [
    metrics.trend === 'bear' || metrics.trend === 'strong_bear',
    metrics.momentum < -0.3,
    metrics.fearGreedIndex < 40,
    metrics.volatility === 'extreme',
    data.global.btcDominance > 50
  ].filter(Boolean).length;
  
  if (bullishFactors >= 3 && bearishFactors <= 1) {
    regime = 'risk_on';
    confidence = bullishFactors / 5;
    if (metrics.trend.includes('bull')) drivers.push('Bullish price trend');
    if (metrics.fearGreedIndex > 60) drivers.push('Positive sentiment');
    if (data.global.altseason) drivers.push('Altseason conditions');
  } else if (bearishFactors >= 3 && bullishFactors <= 1) {
    regime = 'risk_off';
    confidence = bearishFactors / 5;
    if (metrics.trend.includes('bear')) drivers.push('Bearish price trend');
    if (metrics.fearGreedIndex < 40) drivers.push('Fearful sentiment');
    if (metrics.volatility === 'extreme') drivers.push('Extreme volatility');
  } else {
    regime = 'uncertain';
    confidence = 0.5;
    drivers.push('Mixed market signals');
    drivers.push('No clear directional bias');
  }
  
  // Estimate regime duration based on historical patterns
  const duration = regime === 'uncertain' ? 7 : 14 + Math.floor(confidence * 14);
  
  return {
    current: regime,
    confidence,
    drivers,
    duration
  };
}

function generateRecommendations(
  metrics: MarketMetrics, 
  regime: MarketRegime,
  state: State
): MarketRecommendation[] {
  const recommendations: MarketRecommendation[] = [];
  const userRiskProfile = state.userProfile?.riskTolerance || 'balanced';
  
  // Risk-on recommendations
  if (regime.current === 'risk_on') {
    recommendations.push({
      action: 'Increase risk asset exposure',
      assets: ['ETH', 'SEI'],
      allocation: userRiskProfile === 'aggressive' ? 70 : userRiskProfile === 'balanced' ? 50 : 30,
      reasoning: [
        'Favorable market conditions for risk assets',
        `${regime.confidence * 100}% confidence in bullish regime`,
        ...regime.drivers
      ],
      priority: 'high'
    });
    
    if (metrics.volatility !== 'extreme') {
      recommendations.push({
        action: 'Add leveraged positions',
        assets: ['ETH'],
        allocation: userRiskProfile === 'aggressive' ? 20 : 10,
        reasoning: [
          'Moderate volatility allows for safe leverage',
          'Amplify returns in bull market'
        ],
        priority: 'medium'
      });
    }
  }
  
  // Risk-off recommendations
  if (regime.current === 'risk_off') {
    recommendations.push({
      action: 'Rotate to stablecoins',
      assets: ['USDC', 'DAI'],
      allocation: userRiskProfile === 'conservative' ? 80 : userRiskProfile === 'balanced' ? 60 : 40,
      reasoning: [
        'Preserve capital in bearish conditions',
        'Wait for better entry opportunities',
        ...regime.drivers
      ],
      priority: 'high'
    });
    
    recommendations.push({
      action: 'Utilize lending protocols',
      assets: ['USDC', 'DAI'],
      allocation: 30,
      reasoning: [
        'Generate yield on stablecoins',
        'Low-risk income during downturn'
      ],
      priority: 'medium'
    });
  }
  
  // Uncertain market recommendations
  if (regime.current === 'uncertain') {
    recommendations.push({
      action: 'Maintain balanced portfolio',
      assets: ['BTC', 'ETH', 'USDC'],
      allocation: 33,
      reasoning: [
        'Market direction unclear',
        'Diversification reduces risk',
        'Wait for clearer signals'
      ],
      priority: 'high'
    });
    
    recommendations.push({
      action: 'Implement DCA strategy',
      assets: ['BTC', 'ETH'],
      allocation: 20,
      reasoning: [
        'Average into positions over time',
        'Reduce timing risk'
      ],
      priority: 'medium'
    });
  }
  
  // Volatility-based recommendations
  if (metrics.volatility === 'extreme') {
    recommendations.push({
      action: 'Reduce position sizes',
      assets: ['ALL'],
      allocation: -30, // Reduce by 30%
      reasoning: [
        'Extreme volatility increases liquidation risk',
        'Preserve capital for calmer markets'
      ],
      priority: 'high'
    });
  }
  
  return recommendations;
}

function checkMarketAlerts(metrics: MarketMetrics, data: any, state: State): MarketAlert[] {
  const alerts: MarketAlert[] = [];
  const now = new Date();
  
  // Extreme volatility alert
  if (metrics.volatility === 'extreme') {
    alerts.push({
      level: 'critical',
      type: 'volatility',
      message: 'Extreme market volatility detected. Consider reducing leveraged positions.',
      assets: ['ALL'],
      timestamp: now
    });
  }
  
  // Flash crash alert
  const flashCrashAssets = Object.entries(data.prices)
    .filter(([_, price]: [string, any]) => price.change24h < -20)
    .map(([asset]) => asset);
  
  if (flashCrashAssets.length > 0) {
    alerts.push({
      level: 'critical',
      type: 'flash_crash',
      message: `Flash crash detected in ${flashCrashAssets.join(', ')}. Review stop losses.`,
      assets: flashCrashAssets,
      timestamp: now
    });
  }
  
  // Correlation breakdown alert
  const btcEthCorrelation = data.prices.BTC && data.prices.ETH
    ? (data.prices.BTC.change24h * data.prices.ETH.change24h > 0 ? 0.8 : -0.5)
    : 0.8;
  
  if (Math.abs(btcEthCorrelation) < 0.3) {
    alerts.push({
      level: 'warning',
      type: 'correlation',
      message: 'BTC/ETH correlation breakdown detected. Market structure changing.',
      assets: ['BTC', 'ETH'],
      timestamp: now
    });
  }
  
  // Volume anomaly alert
  if (metrics.volume === 'low' && Math.abs(metrics.momentum) > 0.5) {
    alerts.push({
      level: 'warning',
      type: 'volume',
      message: 'Large price movement on low volume. Potential fake-out.',
      assets: ['ALL'],
      timestamp: now
    });
  }
  
  // Sentiment extreme alert
  if (metrics.fearGreedIndex < 20) {
    alerts.push({
      level: 'info',
      type: 'sentiment',
      message: 'Extreme fear in market. Historical buying opportunity.',
      assets: ['ALL'],
      timestamp: now
    });
  } else if (metrics.fearGreedIndex > 85) {
    alerts.push({
      level: 'warning',
      type: 'sentiment',
      message: 'Extreme greed detected. Consider taking profits.',
      assets: ['ALL'],
      timestamp: now
    });
  }
  
  // User position alerts
  const positions = state.positions || [];
  const hasLeverage = positions.some((p: any) => p.leverage && p.leverage > 1);
  
  if (hasLeverage && metrics.volatility === 'high') {
    alerts.push({
      level: 'warning',
      type: 'position',
      message: 'You have leveraged positions during high volatility. Monitor closely.',
      assets: positions.filter((p: any) => p.leverage > 1).map((p: any) => p.asset),
      timestamp: now
    });
  }
  
  return alerts.sort((a, b) => {
    const priority = { critical: 3, warning: 2, info: 1 };
    return priority[b.level] - priority[a.level];
  });
}

function getDefaultMarketConditions(): MarketConditionsResult {
  return {
    metrics: {
      trend: 'neutral',
      momentum: 0,
      volatility: 'normal',
      volume: 'normal',
      sentiment: 0,
      fearGreedIndex: 50
    },
    signals: [],
    correlations: [],
    regime: {
      current: 'uncertain',
      confidence: 0,
      drivers: [],
      duration: 7
    },
    recommendations: [],
    alerts: []
  };
}

async function updateMarketTracking(
  runtime: IAgentRuntime,
  metrics: MarketMetrics,
  regime: MarketRegime
): Promise<void> {
  const currentState = runtime.character?.settings?.state || {};
  const marketHistory = currentState.marketHistory || [];
  
  marketHistory.push({
    timestamp: new Date(),
    metrics,
    regime: regime.current
  });
  
  // Keep last 168 entries (7 days of hourly data)
  if (marketHistory.length > 168) {
    marketHistory.shift();
  }
  
  const newState = {
    ...currentState,
    marketHistory,
    currentMarketConditions: {
      timestamp: new Date(),
      metrics,
      regime
    }
  };
  
  if (runtime.character?.settings) {
    runtime.character.settings.state = newState;
  }
}

export default marketConditionsEvaluator;