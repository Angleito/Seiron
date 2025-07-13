import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';

export interface TradeParams {
  walletAddress: string;
  market: string;
  side: 'long' | 'short';
  size: string;
  leverage?: number;
  collateral: string;
  orderType?: 'market' | 'limit';
  limitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface TradeResult {
  success: boolean;
  timestamp: Date;
  transactionHash: string;
  position: {
    id: string;
    market: string;
    side: string;
    size: string;
    leverage: number;
    collateral: string;
    entryPrice: number;
    status: 'pending' | 'active' | 'filled';
  };
  riskMetrics: {
    notionalValue: number;
    riskAmount: number;
    marginRequirement: number;
    liquidationPrice: number;
    maxLoss: number;
  };
  fees: {
    trading: number;
    funding: number;
    total: number;
  };
}

export interface PositionParams {
  positionId?: string;
  walletAddress?: string;
  market?: string;
}

export interface PositionResult {
  success: boolean;
  timestamp: Date;
  positions: PositionData[];
  summary: {
    totalPositions: number;
    totalNotionalValue: number;
    totalPnL: number;
    totalCollateral: number;
    averageLeverage: number;
  };
  riskMetrics: {
    portfolioValue: number;
    totalExposure: number;
    riskUtilization: number;
    liquidationRisk: string;
  };
}

export interface PositionData {
  id: string;
  walletAddress: string;
  platform: string;
  market: string;
  side: 'long' | 'short';
  size: string;
  notionalValue: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  collateral: string;
  leverage: number;
  pnl: {
    unrealized: number;
    realized: number;
    total: number;
  };
  margin: {
    initial: number;
    maintenance: number;
    available: number;
  };
  risk: {
    liquidationRisk: 'low' | 'medium' | 'high' | 'critical';
    marginRatio: number;
    timeToLiquidation: number;
  };
  funding: {
    rate: number;
    payment: number;
    nextPayment: string;
  };
  fees: {
    trading: number;
    funding: number;
    total: number;
  };
  createdAt: string;
  lastUpdated: string;
}

export interface RiskParams {
  walletAddress: string;
  positionId?: string;
  riskThreshold?: number;
}

export interface RiskResult {
  success: boolean;
  timestamp: Date;
  riskAnalysis: {
    totalPositions: number;
    highRiskPositions: number;
    totalExposure: number;
    netPnL: number;
    averageMarginRatio: number;
    portfolioRisk: 'low' | 'medium' | 'high' | 'critical';
  };
  alerts: RiskAlert[];
  recommendations: string[];
  protectiveActions: string[];
}

export interface RiskAlert {
  type: 'liquidation' | 'margin' | 'exposure' | 'correlation';
  severity: 'info' | 'warning' | 'critical';
  positionId?: string;
  message: string;
  threshold: number;
  currentValue: number;
  timeToAction?: number;
}

export const tradeAction: Action = {
  name: "TRADE",
  similes: ["trade", "open position", "place order", "buy", "sell", "go long", "go short"],
  description: "Execute trading operations on Citrex perpetual markets",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const params = message.content as any;
    
    // Validate required parameters
    if (!params.walletAddress || !params.market || !params.side || !params.size || !params.collateral) {
      return false;
    }
    
    // Validate side
    if (!['long', 'short'].includes(params.side)) {
      return false;
    }
    
    // Validate numeric parameters
    const size = Number(params.size);
    const collateral = Number(params.collateral);
    const leverage = Number(params.leverage || 5);
    
    if (size <= 0 || collateral <= 0 || leverage < 1 || leverage > 50) {
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
    const params = message.content as TradeParams;
    
    try {
      const walletAddress = params.walletAddress;
      const market = params.market.toUpperCase();
      const side = params.side;
      const size = params.size;
      const leverage = params.leverage || 5;
      const collateral = params.collateral;
      const orderType = params.orderType || 'market';
      
      // Validate trading parameters
      const validation = await validateTradingParams(params);
      if (!validation.valid) {
        callback({
          text: `Invalid trading parameters: ${validation.error}`,
          action: "TRADE_VALIDATION_FAILED"
        });
        return;
      }
      
      // Perform risk checks
      const riskCheck = await performRiskChecks(params, state);
      if (!riskCheck.passed) {
        callback({
          text: `Risk check failed: ${riskCheck.reason}`,
          action: "TRADE_RISK_FAILED"
        });
        return;
      }
      
      // Calculate trade metrics
      const tradeMetrics = calculateTradeMetrics(params);
      
      // Execute trade (simulated)
      const tradeExecution = await executeTrade(params, tradeMetrics);
      
      if (!tradeExecution.success) {
        callback({
          text: `Trade execution failed: ${tradeExecution.error}`,
          action: "TRADE_EXECUTION_FAILED"
        });
        return;
      }
      
      // Update agent state
      await updateTradingState(runtime, {
        lastTrade: {
          timestamp: new Date(),
          market,
          side,
          size,
          leverage,
          transactionHash: tradeExecution.transactionHash
        }
      });
      
      // Prepare response
      const response: TradeResult = {
        success: true,
        timestamp: new Date(),
        transactionHash: tradeExecution.transactionHash,
        position: {
          id: tradeExecution.positionId,
          market,
          side,
          size,
          leverage,
          collateral,
          entryPrice: tradeMetrics.entryPrice,
          status: 'pending'
        },
        riskMetrics: {
          notionalValue: tradeMetrics.notionalValue,
          riskAmount: tradeMetrics.riskAmount,
          marginRequirement: tradeMetrics.marginRequirement,
          liquidationPrice: tradeMetrics.liquidationPrice,
          maxLoss: tradeMetrics.maxLoss
        },
        fees: {
          trading: tradeMetrics.tradingFee,
          funding: 0,
          total: tradeMetrics.tradingFee
        }
      };
      
      // Format response text
      let responseText = `🎯 Trade Executed Successfully!\n\n`;
      responseText += `📊 Position Details:\n`;
      responseText += `• Market: ${market}\n`;
      responseText += `• Side: ${side.toUpperCase()}\n`;
      responseText += `• Size: ${size}\n`;
      responseText += `• Leverage: ${leverage}x\n`;
      responseText += `• Entry: $${tradeMetrics.entryPrice.toFixed(4)}\n`;
      responseText += `• Collateral: ${collateral} USDC\n\n`;
      
      responseText += `⚠️ Risk Metrics:\n`;
      responseText += `• Notional Value: $${tradeMetrics.notionalValue.toLocaleString()}\n`;
      responseText += `• Liquidation Price: $${tradeMetrics.liquidationPrice.toFixed(4)}\n`;
      responseText += `• Max Loss: $${tradeMetrics.maxLoss.toFixed(2)}\n`;
      responseText += `• Trading Fee: $${tradeMetrics.tradingFee.toFixed(2)}\n\n`;
      
      responseText += `🔗 Transaction: ${tradeExecution.transactionHash}\n`;
      responseText += `📍 Position ID: ${tradeExecution.positionId}`;
      
      callback({
        text: responseText,
        action: "TRADE_SUCCESS",
        data: response
      });
      
    } catch (error) {
      callback({
        text: `Unexpected error during trade execution: ${error.message}`,
        action: "TRADE_ERROR"
      });
    }
  },
  
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Open a long position on SEI-USDC with 5x leverage, size 1000 SEI, collateral 100 USDC" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Opening long position on SEI-USDC with 5x leverage...",
          action: "TRADE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Go short on BTC-USDC, size 0.1 BTC, 10x leverage, 500 USDC collateral" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Executing short position on BTC-USDC with 10x leverage...",
          action: "TRADE"
        }
      }
    ]
  ]
};

export const getPositionsAction: Action = {
  name: "GET_POSITIONS",
  similes: ["positions", "get positions", "show positions", "my positions", "portfolio"],
  description: "Retrieve and analyze current trading positions",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const params = message.content as any;
    
    // Wallet address is required
    if (!params.walletAddress) {
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
    const params = message.content as PositionParams;
    
    try {
      const walletAddress = params.walletAddress!;
      const market = params.market?.toUpperCase();
      
      // Fetch positions (simulated)
      const positions = await fetchPositions(walletAddress, market);
      
      if (!positions || positions.length === 0) {
        callback({
          text: `No active positions found for wallet ${walletAddress}`,
          action: "GET_POSITIONS_EMPTY"
        });
        return;
      }
      
      // Calculate portfolio metrics
      const portfolioMetrics = calculatePortfolioMetrics(positions);
      
      // Assess risk levels
      const riskAssessment = assessPortfolioRisk(positions);
      
      // Update agent state
      await updateTradingState(runtime, {
        lastPositionCheck: new Date(),
        activePositions: positions.length,
        portfolioValue: portfolioMetrics.portfolioValue
      });
      
      // Prepare response
      const response: PositionResult = {
        success: true,
        timestamp: new Date(),
        positions,
        summary: {
          totalPositions: positions.length,
          totalNotionalValue: portfolioMetrics.totalNotionalValue,
          totalPnL: portfolioMetrics.totalPnL,
          totalCollateral: portfolioMetrics.totalCollateral,
          averageLeverage: portfolioMetrics.averageLeverage
        },
        riskMetrics: {
          portfolioValue: portfolioMetrics.portfolioValue,
          totalExposure: portfolioMetrics.totalExposure,
          riskUtilization: portfolioMetrics.riskUtilization,
          liquidationRisk: riskAssessment.overallRisk
        }
      };
      
      // Format response text
      let responseText = `📊 Trading Positions Summary\n\n`;
      responseText += `🎯 Portfolio Overview:\n`;
      responseText += `• Total Positions: ${positions.length}\n`;
      responseText += `• Portfolio Value: $${portfolioMetrics.portfolioValue.toLocaleString()}\n`;
      responseText += `• Total PnL: ${portfolioMetrics.totalPnL >= 0 ? '+' : ''}$${portfolioMetrics.totalPnL.toFixed(2)}\n`;
      responseText += `• Average Leverage: ${portfolioMetrics.averageLeverage.toFixed(1)}x\n`;
      responseText += `• Risk Level: ${riskAssessment.overallRisk.toUpperCase()}\n\n`;
      
      responseText += `🔍 Active Positions:\n`;
      positions.slice(0, 5).forEach((position, index) => {
        responseText += `${index + 1}. ${position.market} ${position.side.toUpperCase()}\n`;
        responseText += `   Size: ${position.size} | PnL: ${position.pnl.total >= 0 ? '+' : ''}$${position.pnl.total.toFixed(2)}\n`;
        responseText += `   Leverage: ${position.leverage}x | Risk: ${position.risk.liquidationRisk.toUpperCase()}\n`;
        responseText += `   Liquidation: $${position.liquidationPrice.toFixed(4)}\n\n`;
      });
      
      if (positions.length > 5) {
        responseText += `... and ${positions.length - 5} more positions\n\n`;
      }
      
      responseText += `⚠️ Risk Analysis:\n`;
      responseText += `• Risk Utilization: ${(portfolioMetrics.riskUtilization * 100).toFixed(1)}%\n`;
      responseText += `• High Risk Positions: ${riskAssessment.highRiskCount}\n`;
      if (riskAssessment.recommendations.length > 0) {
        responseText += `• Recommendations: ${riskAssessment.recommendations[0]}`;
      }
      
      callback({
        text: responseText,
        action: "GET_POSITIONS_SUCCESS",
        data: response
      });
      
    } catch (error) {
      callback({
        text: `Error retrieving positions: ${error.message}`,
        action: "GET_POSITIONS_ERROR"
      });
    }
  },
  
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Show my current trading positions" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Retrieving your current trading positions...",
          action: "GET_POSITIONS"
        }
      }
    ]
  ]
};

export const riskManagementAction: Action = {
  name: "RISK_MANAGEMENT",
  similes: ["risk analysis", "check risk", "position risk", "liquidation risk", "portfolio risk"],
  description: "Analyze and manage trading position risks",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const params = message.content as any;
    
    // Wallet address is required
    if (!params.walletAddress) {
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
    const params = message.content as RiskParams;
    
    try {
      const walletAddress = params.walletAddress;
      const positionId = params.positionId;
      const riskThreshold = params.riskThreshold || 0.8;
      
      // Fetch positions for analysis
      const positions = await fetchPositions(walletAddress);
      
      if (!positions || positions.length === 0) {
        callback({
          text: `No positions found to analyze for wallet ${walletAddress}`,
          action: "RISK_ANALYSIS_EMPTY"
        });
        return;
      }
      
      // Perform comprehensive risk analysis
      const riskAnalysis = await performRiskAnalysis(positions, riskThreshold);
      
      // Generate risk alerts
      const alerts = generateRiskAlerts(positions, riskThreshold);
      
      // Generate recommendations
      const recommendations = generateRiskRecommendations(riskAnalysis);
      
      // Generate protective actions
      const protectiveActions = generateProtectiveActions(riskAnalysis);
      
      // Update agent state
      await updateTradingState(runtime, {
        lastRiskCheck: new Date(),
        riskLevel: riskAnalysis.portfolioRisk,
        activeAlerts: alerts.filter(a => a.severity === 'critical').length
      });
      
      // Prepare response
      const response: RiskResult = {
        success: true,
        timestamp: new Date(),
        riskAnalysis,
        alerts,
        recommendations,
        protectiveActions
      };
      
      // Format response text
      let responseText = `⚠️ Risk Management Analysis\n\n`;
      responseText += `🎯 Portfolio Risk Overview:\n`;
      responseText += `• Total Positions: ${riskAnalysis.totalPositions}\n`;
      responseText += `• High Risk Positions: ${riskAnalysis.highRiskPositions}\n`;
      responseText += `• Portfolio Risk: ${riskAnalysis.portfolioRisk.toUpperCase()}\n`;
      responseText += `• Total Exposure: $${riskAnalysis.totalExposure.toLocaleString()}\n`;
      responseText += `• Net PnL: ${riskAnalysis.netPnL >= 0 ? '+' : ''}$${riskAnalysis.netPnL.toFixed(2)}\n`;
      responseText += `• Avg Margin Ratio: ${(riskAnalysis.averageMarginRatio * 100).toFixed(1)}%\n\n`;
      
      if (alerts.length > 0) {
        responseText += `🚨 Active Alerts (${alerts.length}):\n`;
        alerts.slice(0, 3).forEach((alert, index) => {
          responseText += `${index + 1}. ${alert.severity.toUpperCase()}: ${alert.message}\n`;
          if (alert.timeToAction) {
            responseText += `   Time to Action: ${Math.round(alert.timeToAction / 60)} minutes\n`;
          }
        });
        responseText += '\n';
      }
      
      if (recommendations.length > 0) {
        responseText += `💡 Recommendations:\n`;
        recommendations.slice(0, 3).forEach((rec, index) => {
          responseText += `${index + 1}. ${rec}\n`;
        });
        responseText += '\n';
      }
      
      if (protectiveActions.length > 0) {
        responseText += `🛡️ Protective Actions:\n`;
        protectiveActions.slice(0, 3).forEach((action, index) => {
          responseText += `${index + 1}. ${action}\n`;
        });
      }
      
      callback({
        text: responseText,
        action: "RISK_ANALYSIS_SUCCESS",
        data: response
      });
      
    } catch (error) {
      callback({
        text: `Error performing risk analysis: ${error.message}`,
        action: "RISK_ANALYSIS_ERROR"
      });
    }
  },
  
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Analyze the risk of my trading positions" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Performing comprehensive risk analysis on your positions...",
          action: "RISK_MANAGEMENT"
        }
      }
    ]
  ]
};

// Helper functions

async function validateTradingParams(params: TradeParams): Promise<{ valid: boolean; error?: string }> {
  const size = Number(params.size);
  const collateral = Number(params.collateral);
  const leverage = params.leverage || 5;
  
  if (size <= 0) {
    return { valid: false, error: 'Size must be positive' };
  }
  
  if (collateral <= 0) {
    return { valid: false, error: 'Collateral must be positive' };
  }
  
  if (leverage < 1 || leverage > 50) {
    return { valid: false, error: 'Leverage must be between 1 and 50' };
  }
  
  const notionalValue = size * leverage;
  const marginRequired = notionalValue / leverage;
  
  if (marginRequired > collateral) {
    return { valid: false, error: 'Insufficient collateral for position' };
  }
  
  return { valid: true };
}

async function performRiskChecks(params: TradeParams, state: State): Promise<{ passed: boolean; reason?: string }> {
  const size = Number(params.size);
  const leverage = params.leverage || 5;
  const collateral = Number(params.collateral);
  
  // Check position size limits
  const notionalValue = size * leverage;
  if (notionalValue > 10000000) { // $10M max position
    return { passed: false, reason: 'Position size exceeds maximum allowed' };
  }
  
  // Check risk percentage
  const riskAmount = notionalValue * 0.02; // 2% risk
  if (riskAmount > collateral * 0.1) { // 10% of collateral
    return { passed: false, reason: 'Risk amount too high relative to collateral' };
  }
  
  return { passed: true };
}

function calculateTradeMetrics(params: TradeParams): any {
  const size = Number(params.size);
  const leverage = params.leverage || 5;
  const collateral = Number(params.collateral);
  
  // Mock market price (would come from market data)
  const marketPrice = params.market.includes('BTC') ? 45000 : 
                     params.market.includes('ETH') ? 2500 : 
                     params.market.includes('SEI') ? 0.5 : 100;
  
  const notionalValue = size * marketPrice;
  const marginRequirement = notionalValue / leverage;
  const tradingFee = notionalValue * 0.0005; // 0.05% trading fee
  
  // Calculate liquidation price
  const maintenanceMargin = 0.05; // 5%
  const liquidationPrice = params.side === 'long'
    ? marketPrice * (1 - 1 / leverage + maintenanceMargin)
    : marketPrice * (1 + 1 / leverage - maintenanceMargin);
  
  const maxLoss = notionalValue * 0.02; // 2% max loss
  
  return {
    entryPrice: marketPrice,
    notionalValue,
    marginRequirement,
    riskAmount: maxLoss,
    liquidationPrice,
    maxLoss,
    tradingFee
  };
}

async function executeTrade(params: TradeParams, metrics: any): Promise<any> {
  // Simulate trade execution
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    success: true,
    transactionHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`,
    positionId: `pos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  };
}

async function fetchPositions(walletAddress: string, market?: string): Promise<PositionData[]> {
  // Mock position data
  const mockPositions: PositionData[] = [
    {
      id: 'pos_123',
      walletAddress,
      platform: 'Citrex',
      market: 'SEI-USDC',
      side: 'long',
      size: '1000',
      notionalValue: 500,
      entryPrice: 0.5,
      markPrice: 0.52,
      liquidationPrice: 0.42,
      collateral: '100',
      leverage: 5,
      pnl: {
        unrealized: 20,
        realized: 0,
        total: 20
      },
      margin: {
        initial: 100,
        maintenance: 50,
        available: 150
      },
      risk: {
        liquidationRisk: 'low',
        marginRatio: 0.3,
        timeToLiquidation: 3600
      },
      funding: {
        rate: 0.0001,
        payment: 0.05,
        nextPayment: new Date(Date.now() + 3600000).toISOString()
      },
      fees: {
        trading: 0.25,
        funding: 0.05,
        total: 0.3
      },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      lastUpdated: new Date().toISOString()
    }
  ];
  
  return market ? mockPositions.filter(p => p.market === market) : mockPositions;
}

function calculatePortfolioMetrics(positions: PositionData[]): any {
  const totalNotionalValue = positions.reduce((sum, pos) => sum + pos.notionalValue, 0);
  const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl.total, 0);
  const totalCollateral = positions.reduce((sum, pos) => sum + Number(pos.collateral), 0);
  const averageLeverage = positions.reduce((sum, pos) => sum + pos.leverage, 0) / positions.length || 0;
  
  return {
    totalNotionalValue,
    totalPnL,
    totalCollateral,
    portfolioValue: totalCollateral + totalPnL,
    totalExposure: totalNotionalValue,
    riskUtilization: totalNotionalValue / (totalCollateral || 1),
    averageLeverage
  };
}

function assessPortfolioRisk(positions: PositionData[]): any {
  const highRiskPositions = positions.filter(p => 
    p.risk.liquidationRisk === 'high' || p.risk.liquidationRisk === 'critical'
  );
  
  const avgMarginRatio = positions.reduce((sum, pos) => sum + pos.risk.marginRatio, 0) / positions.length || 0;
  
  let overallRisk = 'low';
  if (avgMarginRatio < 0.1) overallRisk = 'critical';
  else if (avgMarginRatio < 0.2) overallRisk = 'high';
  else if (avgMarginRatio < 0.3) overallRisk = 'medium';
  
  const recommendations = [];
  if (highRiskPositions.length > 0) {
    recommendations.push('Consider reducing leverage on high-risk positions');
  }
  if (avgMarginRatio < 0.2) {
    recommendations.push('Add margin to improve position safety');
  }
  
  return {
    overallRisk,
    highRiskCount: highRiskPositions.length,
    recommendations
  };
}

async function performRiskAnalysis(positions: PositionData[], threshold: number): Promise<any> {
  const metrics = calculatePortfolioMetrics(positions);
  const riskAssessment = assessPortfolioRisk(positions);
  
  return {
    totalPositions: positions.length,
    highRiskPositions: riskAssessment.highRiskCount,
    totalExposure: metrics.totalExposure,
    netPnL: metrics.totalPnL,
    averageMarginRatio: positions.reduce((sum, pos) => sum + pos.risk.marginRatio, 0) / positions.length || 0,
    portfolioRisk: riskAssessment.overallRisk
  };
}

function generateRiskAlerts(positions: PositionData[], threshold: number): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  
  positions.forEach(position => {
    if (position.risk.marginRatio < 0.1) {
      alerts.push({
        type: 'liquidation',
        severity: 'critical',
        positionId: position.id,
        message: `Position ${position.market} at critical liquidation risk`,
        threshold: 0.1,
        currentValue: position.risk.marginRatio,
        timeToAction: position.risk.timeToLiquidation
      });
    } else if (position.risk.marginRatio < 0.2) {
      alerts.push({
        type: 'margin',
        severity: 'warning',
        positionId: position.id,
        message: `Position ${position.market} margin ratio below safe threshold`,
        threshold: 0.2,
        currentValue: position.risk.marginRatio
      });
    }
  });
  
  return alerts;
}

function generateRiskRecommendations(riskAnalysis: any): string[] {
  const recommendations = [];
  
  if (riskAnalysis.portfolioRisk === 'critical') {
    recommendations.push('Immediate action required - reduce leverage or add margin');
  } else if (riskAnalysis.portfolioRisk === 'high') {
    recommendations.push('High risk detected - consider reducing position sizes');
  }
  
  if (riskAnalysis.highRiskPositions > 0) {
    recommendations.push('Focus on high-risk positions first');
  }
  
  if (riskAnalysis.averageMarginRatio < 0.15) {
    recommendations.push('Average margin ratio too low - add collateral');
  }
  
  return recommendations;
}

function generateProtectiveActions(riskAnalysis: any): string[] {
  const actions = [];
  
  if (riskAnalysis.portfolioRisk === 'critical') {
    actions.push('Add margin to positions immediately');
    actions.push('Set stop-loss orders to limit downside');
  }
  
  if (riskAnalysis.highRiskPositions > 0) {
    actions.push('Reduce leverage on high-risk positions');
    actions.push('Consider partial position closures');
  }
  
  actions.push('Enable liquidation protection alerts');
  actions.push('Monitor positions more frequently');
  
  return actions;
}

async function updateTradingState(runtime: IAgentRuntime, updates: any): Promise<void> {
  const currentState = runtime.character?.settings?.state || {};
  const newState = { ...currentState, ...updates };
  
  if (runtime.character?.settings) {
    runtime.character.settings.state = newState;
  }
}

export default [tradeAction, getPositionsAction, riskManagementAction];