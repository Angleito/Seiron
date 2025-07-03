import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@ai16z/eliza';

export interface LiquidationParams {
  positionId?: string;
  walletAddress?: string;
  market?: string;
  riskThreshold?: number;
}

export interface LiquidationResult {
  success: boolean;
  timestamp: Date;
  analysis: {
    positionsAnalyzed: number;
    positionsAtRisk: number;
    criticalPositions: number;
    averageTimeToLiquidation: number;
    portfolioLiquidationRisk: 'low' | 'medium' | 'high' | 'critical';
  };
  liquidationInfo: LiquidationPositionInfo[];
  protectiveActions: ProtectiveAction[];
  recommendations: string[];
}

export interface LiquidationPositionInfo {
  positionId: string;
  market: string;
  side: 'long' | 'short';
  currentPrice: number;
  liquidationPrice: number;
  distanceToLiquidation: number;
  timeToLiquidation: number;
  marginRatio: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiredMargin: number;
  availableMargin: number;
  actions: {
    addMargin: number;
    reduceSize: number;
    reduceLeverage: number;
  };
}

export interface ProtectiveAction {
  type: 'add_margin' | 'reduce_size' | 'reduce_leverage' | 'set_stop_loss' | 'close_position';
  positionId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  amount?: number;
  targetValue?: number;
  estimatedCost?: number;
  timeframe: string;
}

export interface StopLossParams {
  positionId: string;
  stopLossPrice?: number;
  stopLossPercent?: number;
  trailingStop?: boolean;
  trailingDistance?: number;
}

export interface StopLossResult {
  success: boolean;
  timestamp: Date;
  positionId: string;
  stopLossPrice: number;
  currentPrice: number;
  protectionLevel: number;
  transactionHash?: string;
}

export const liquidationAnalysisAction: Action = {
  name: "LIQUIDATION_ANALYSIS",
  similes: ["liquidation risk", "liquidation analysis", "check liquidation", "position safety", "margin safety"],
  description: "Analyze liquidation risk and provide protective recommendations",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const params = message.content as any;
    
    // At least one identifier must be provided
    if (!params.positionId && !params.walletAddress) {
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
    const params = message.content as LiquidationParams;
    
    try {
      const positionId = params.positionId;
      const walletAddress = params.walletAddress;
      const market = params.market?.toUpperCase();
      const riskThreshold = params.riskThreshold || 0.15; // 15% margin ratio threshold
      
      let liquidationInfo: LiquidationPositionInfo[] = [];
      let analysisScope = '';
      
      if (positionId) {
        // Analyze specific position
        const positionLiquidation = await analyzePositionLiquidation(positionId);
        liquidationInfo = [positionLiquidation];
        analysisScope = `position ${positionId}`;
      } else if (walletAddress) {
        // Analyze all positions for wallet
        const portfolioLiquidation = await analyzePortfolioLiquidation(walletAddress, market);
        liquidationInfo = portfolioLiquidation;
        analysisScope = market ? `${market} positions` : 'portfolio';
      }
      
      if (liquidationInfo.length === 0) {
        callback({
          text: `No positions found for liquidation analysis`,
          action: "LIQUIDATION_ANALYSIS_EMPTY"
        });
        return;
      }
      
      // Calculate portfolio-level metrics
      const portfolioAnalysis = calculatePortfolioLiquidationMetrics(liquidationInfo);
      
      // Generate protective actions
      const protectiveActions = generateProtectiveActions(liquidationInfo, riskThreshold);
      
      // Generate recommendations
      const recommendations = generateLiquidationRecommendations(liquidationInfo, portfolioAnalysis);
      
      // Update agent state
      await updateRiskState(runtime, {
        lastLiquidationCheck: new Date(),
        positionsAtRisk: portfolioAnalysis.positionsAtRisk,
        portfolioRisk: portfolioAnalysis.portfolioLiquidationRisk
      });
      
      // Prepare response
      const response: LiquidationResult = {
        success: true,
        timestamp: new Date(),
        analysis: portfolioAnalysis,
        liquidationInfo,
        protectiveActions,
        recommendations
      };
      
      // Format response text
      let responseText = `🚨 Liquidation Risk Analysis\n\n`;
      responseText += `🎯 Analysis Scope: ${analysisScope}\n`;
      responseText += `📊 Portfolio Overview:\n`;
      responseText += `• Positions Analyzed: ${portfolioAnalysis.positionsAnalyzed}\n`;
      responseText += `• Positions at Risk: ${portfolioAnalysis.positionsAtRisk}\n`;
      responseText += `• Critical Positions: ${portfolioAnalysis.criticalPositions}\n`;
      responseText += `• Portfolio Risk: ${portfolioAnalysis.portfolioLiquidationRisk.toUpperCase()}\n`;
      responseText += `• Avg Time to Liquidation: ${Math.round(portfolioAnalysis.averageTimeToLiquidation / 60)} minutes\n\n`;
      
      // Show high-risk positions
      const highRiskPositions = liquidationInfo.filter(p => 
        p.riskLevel === 'high' || p.riskLevel === 'critical'
      );
      
      if (highRiskPositions.length > 0) {
        responseText += `⚠️ High Risk Positions:\n`;
        highRiskPositions.forEach((pos, index) => {
          responseText += `${index + 1}. ${pos.market} ${pos.side.toUpperCase()}\n`;
          responseText += `   Current: $${pos.currentPrice.toFixed(4)} | Liquidation: $${pos.liquidationPrice.toFixed(4)}\n`;
          responseText += `   Distance: ${pos.distanceToLiquidation.toFixed(2)}% | Time: ${Math.round(pos.timeToLiquidation / 60)}min\n`;
          responseText += `   Margin Ratio: ${(pos.marginRatio * 100).toFixed(1)}% | Risk: ${pos.riskLevel.toUpperCase()}\n\n`;
        });
      }
      
      // Show protective actions
      const criticalActions = protectiveActions.filter(a => a.priority === 'critical' || a.priority === 'high');
      if (criticalActions.length > 0) {
        responseText += `🛡️ Immediate Actions Required:\n`;
        criticalActions.slice(0, 3).forEach((action, index) => {
          responseText += `${index + 1}. ${action.description}\n`;
          if (action.amount) {
            responseText += `   Amount: ${action.amount}\n`;
          }
          responseText += `   Timeframe: ${action.timeframe}\n`;
        });
        responseText += '\n';
      }
      
      // Show recommendations
      if (recommendations.length > 0) {
        responseText += `💡 Recommendations:\n`;
        recommendations.slice(0, 3).forEach((rec, index) => {
          responseText += `${index + 1}. ${rec}\n`;
        });
      }
      
      callback({
        text: responseText,
        action: "LIQUIDATION_ANALYSIS_SUCCESS",
        data: response
      });
      
    } catch (error) {
      callback({
        text: `Error performing liquidation analysis: ${error.message}`,
        action: "LIQUIDATION_ANALYSIS_ERROR"
      });
    }
  },
  
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Check liquidation risk for my positions" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Analyzing liquidation risk for your portfolio...",
          action: "LIQUIDATION_ANALYSIS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Is position pos_123 at risk of liquidation?" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Analyzing liquidation risk for position pos_123...",
          action: "LIQUIDATION_ANALYSIS"
        }
      }
    ]
  ]
};

export const stopLossAction: Action = {
  name: "SET_STOP_LOSS",
  similes: ["stop loss", "set stop", "protective stop", "risk management", "limit loss"],
  description: "Set stop-loss orders for position protection",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const params = message.content as any;
    
    // Position ID is required
    if (!params.positionId) {
      return false;
    }
    
    // Either price or percentage must be provided
    if (!params.stopLossPrice && !params.stopLossPercent) {
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
    const params = message.content as StopLossParams;
    
    try {
      const positionId = params.positionId;
      const stopLossPrice = params.stopLossPrice;
      const stopLossPercent = params.stopLossPercent;
      const trailingStop = params.trailingStop || false;
      const trailingDistance = params.trailingDistance;
      
      // Get position information
      const position = await getPositionInfo(positionId);
      if (!position) {
        callback({
          text: `Position ${positionId} not found`,
          action: "SET_STOP_LOSS_FAILED"
        });
        return;
      }
      
      // Calculate stop loss price if percentage is provided
      let finalStopLossPrice = stopLossPrice;
      if (!finalStopLossPrice && stopLossPercent) {
        const currentPrice = position.markPrice;
        finalStopLossPrice = position.side === 'long'
          ? currentPrice * (1 - stopLossPercent / 100)
          : currentPrice * (1 + stopLossPercent / 100);
      }
      
      // Validate stop loss price
      const validation = validateStopLossPrice(position, finalStopLossPrice!);
      if (!validation.valid) {
        callback({
          text: `Invalid stop loss price: ${validation.error}`,
          action: "SET_STOP_LOSS_VALIDATION_FAILED"
        });
        return;
      }
      
      // Execute stop loss order (simulated)
      const stopLossExecution = await executeStopLoss(position, finalStopLossPrice!, trailingStop, trailingDistance);
      
      if (!stopLossExecution.success) {
        callback({
          text: `Failed to set stop loss: ${stopLossExecution.error}`,
          action: "SET_STOP_LOSS_EXECUTION_FAILED"
        });
        return;
      }
      
      // Calculate protection level
      const protectionLevel = calculateProtectionLevel(position, finalStopLossPrice!);
      
      // Update agent state
      await updateRiskState(runtime, {
        lastStopLossSet: new Date(),
        positionId,
        stopLossPrice: finalStopLossPrice,
        protectionLevel
      });
      
      // Prepare response
      const response: StopLossResult = {
        success: true,
        timestamp: new Date(),
        positionId,
        stopLossPrice: finalStopLossPrice!,
        currentPrice: position.markPrice,
        protectionLevel,
        transactionHash: stopLossExecution.transactionHash
      };
      
      // Format response text
      let responseText = `🛡️ Stop Loss Set Successfully!\n\n`;
      responseText += `📊 Position: ${position.market} ${position.side.toUpperCase()}\n`;
      responseText += `💰 Current Price: $${position.markPrice.toFixed(4)}\n`;
      responseText += `🛑 Stop Loss Price: $${finalStopLossPrice!.toFixed(4)}\n`;
      responseText += `📉 Protection Level: ${protectionLevel.toFixed(1)}%\n`;
      
      if (trailingStop) {
        responseText += `🔄 Trailing Stop: YES (${trailingDistance}% distance)\n`;
      }
      
      responseText += `\n💡 Your position is now protected against losses beyond ${protectionLevel.toFixed(1)}%`;
      
      if (stopLossExecution.transactionHash) {
        responseText += `\n\n🔗 Transaction: ${stopLossExecution.transactionHash}`;
      }
      
      callback({
        text: responseText,
        action: "SET_STOP_LOSS_SUCCESS",
        data: response
      });
      
    } catch (error) {
      callback({
        text: `Error setting stop loss: ${error.message}`,
        action: "SET_STOP_LOSS_ERROR"
      });
    }
  },
  
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Set a 5% stop loss on position pos_123" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Setting 5% stop loss for position pos_123...",
          action: "SET_STOP_LOSS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Set stop loss at $0.45 for my SEI position" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Setting stop loss at $0.45 for your SEI position...",
          action: "SET_STOP_LOSS"
        }
      }
    ]
  ]
};

// Helper functions

async function analyzePositionLiquidation(positionId: string): Promise<LiquidationPositionInfo> {
  // Mock position liquidation analysis
  return {
    positionId,
    market: 'SEI-USDC',
    side: 'long',
    currentPrice: 0.52,
    liquidationPrice: 0.42,
    distanceToLiquidation: 19.2, // 19.2% price drop to liquidation
    timeToLiquidation: 7200, // 2 hours at current volatility
    marginRatio: 0.25, // 25% margin ratio
    riskLevel: 'medium',
    requiredMargin: 50,
    availableMargin: 75,
    actions: {
      addMargin: 25, // Add $25 to improve safety
      reduceSize: 200, // Reduce by 200 SEI
      reduceLeverage: 3 // Reduce to 3x leverage
    }
  };
}

async function analyzePortfolioLiquidation(walletAddress: string, market?: string): Promise<LiquidationPositionInfo[]> {
  // Mock portfolio liquidation analysis
  const positions = [
    await analyzePositionLiquidation('pos_123'),
    {
      positionId: 'pos_456',
      market: 'BTC-USDC',
      side: 'short',
      currentPrice: 45000,
      liquidationPrice: 47250,
      distanceToLiquidation: 5.0, // 5% price increase to liquidation
      timeToLiquidation: 1800, // 30 minutes
      marginRatio: 0.08, // 8% margin ratio - CRITICAL
      riskLevel: 'critical' as const,
      requiredMargin: 1000,
      availableMargin: 800,
      actions: {
        addMargin: 500,
        reduceSize: 0.05,
        reduceLeverage: 5
      }
    }
  ];
  
  return market ? positions.filter(p => p.market === market) : positions;
}

function calculatePortfolioLiquidationMetrics(positions: LiquidationPositionInfo[]): any {
  const positionsAtRisk = positions.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length;
  const criticalPositions = positions.filter(p => p.riskLevel === 'critical').length;
  const averageTimeToLiquidation = positions.reduce((sum, p) => sum + p.timeToLiquidation, 0) / positions.length || 0;
  
  let portfolioRisk = 'low';
  if (criticalPositions > 0) portfolioRisk = 'critical';
  else if (positionsAtRisk > positions.length * 0.5) portfolioRisk = 'high';
  else if (positionsAtRisk > 0) portfolioRisk = 'medium';
  
  return {
    positionsAnalyzed: positions.length,
    positionsAtRisk,
    criticalPositions,
    averageTimeToLiquidation,
    portfolioLiquidationRisk: portfolioRisk
  };
}

function generateProtectiveActions(positions: LiquidationPositionInfo[], riskThreshold: number): ProtectiveAction[] {
  const actions: ProtectiveAction[] = [];
  
  positions.forEach(position => {
    if (position.riskLevel === 'critical') {
      actions.push({
        type: 'add_margin',
        positionId: position.positionId,
        priority: 'critical',
        description: `Add $${position.actions.addMargin} margin to ${position.market} position immediately`,
        amount: position.actions.addMargin,
        estimatedCost: position.actions.addMargin,
        timeframe: 'Immediate (within 15 minutes)'
      });
      
      actions.push({
        type: 'reduce_size',
        positionId: position.positionId,
        priority: 'high',
        description: `Reduce ${position.market} position size by ${position.actions.reduceSize}`,
        amount: position.actions.reduceSize,
        timeframe: 'Within 30 minutes'
      });
    } else if (position.riskLevel === 'high') {
      actions.push({
        type: 'reduce_leverage',
        positionId: position.positionId,
        priority: 'medium',
        description: `Reduce ${position.market} leverage to ${position.actions.reduceLeverage}x`,
        targetValue: position.actions.reduceLeverage,
        timeframe: 'Within 1 hour'
      });
      
      actions.push({
        type: 'set_stop_loss',
        positionId: position.positionId,
        priority: 'medium',
        description: `Set protective stop loss for ${position.market} position`,
        timeframe: 'Within 1 hour'
      });
    } else if (position.marginRatio < riskThreshold * 1.5) {
      actions.push({
        type: 'add_margin',
        positionId: position.positionId,
        priority: 'low',
        description: `Consider adding margin to ${position.market} position for better safety`,
        amount: Math.floor(position.actions.addMargin / 2),
        timeframe: 'Within 24 hours'
      });
    }
  });
  
  return actions.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

function generateLiquidationRecommendations(positions: LiquidationPositionInfo[], analysis: any): string[] {
  const recommendations = [];
  
  if (analysis.portfolioLiquidationRisk === 'critical') {
    recommendations.push('URGENT: Take immediate action to prevent liquidations');
    recommendations.push('Add margin or reduce position sizes within 15 minutes');
  } else if (analysis.portfolioLiquidationRisk === 'high') {
    recommendations.push('High liquidation risk detected - review positions within 1 hour');
    recommendations.push('Consider reducing overall leverage across portfolio');
  }
  
  if (analysis.criticalPositions > 0) {
    recommendations.push('Focus on critical positions first - they need immediate attention');
  }
  
  if (analysis.averageTimeToLiquidation < 3600) { // Less than 1 hour
    recommendations.push('Very short time to liquidation - monitor positions continuously');
  }
  
  recommendations.push('Set up automated alerts for margin ratio changes');
  recommendations.push('Enable liquidation protection features');
  
  return recommendations;
}

async function getPositionInfo(positionId: string): Promise<any> {
  // Mock position info
  return {
    id: positionId,
    market: 'SEI-USDC',
    side: 'long',
    markPrice: 0.52,
    entryPrice: 0.50,
    size: '1000',
    leverage: 5,
    liquidationPrice: 0.42
  };
}

function validateStopLossPrice(position: any, stopLossPrice: number): { valid: boolean; error?: string } {
  const currentPrice = position.markPrice;
  const liquidationPrice = position.liquidationPrice;
  
  if (position.side === 'long') {
    if (stopLossPrice >= currentPrice) {
      return { valid: false, error: 'Stop loss price must be below current price for long positions' };
    }
    if (stopLossPrice <= liquidationPrice) {
      return { valid: false, error: 'Stop loss price too close to liquidation price' };
    }
  } else {
    if (stopLossPrice <= currentPrice) {
      return { valid: false, error: 'Stop loss price must be above current price for short positions' };
    }
    if (stopLossPrice >= liquidationPrice) {
      return { valid: false, error: 'Stop loss price too close to liquidation price' };
    }
  }
  
  return { valid: true };
}

async function executeStopLoss(position: any, stopLossPrice: number, trailingStop: boolean, trailingDistance?: number): Promise<any> {
  // Simulate stop loss execution
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    success: true,
    transactionHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`
  };
}

function calculateProtectionLevel(position: any, stopLossPrice: number): number {
  const currentPrice = position.markPrice;
  const entryPrice = position.entryPrice;
  
  if (position.side === 'long') {
    const maxLoss = Math.abs(stopLossPrice - entryPrice) / entryPrice;
    return maxLoss * 100 * position.leverage;
  } else {
    const maxLoss = Math.abs(entryPrice - stopLossPrice) / entryPrice;
    return maxLoss * 100 * position.leverage;
  }
}

async function updateRiskState(runtime: IAgentRuntime, updates: any): Promise<void> {
  const currentState = runtime.character?.settings?.state || {};
  const newState = { ...currentState, riskManagement: { ...currentState.riskManagement, ...updates } };
  
  if (runtime.character?.settings) {
    runtime.character.settings.state = newState;
  }
}

export default [liquidationAnalysisAction, stopLossAction];