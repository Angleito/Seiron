import { Evaluator } from "@elizaos/core";
import { State } from "../../types";

interface RiskMetrics {
  overallRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  healthFactor: number;
  exposureConcentration: number;
  volatilityScore: number;
  liquidityRisk: number;
  recommendations: string[];
}

export const riskAssessmentEvaluator: Evaluator = {
  name: "RISK_ASSESSMENT",
  description: "Evaluates portfolio risk across multiple dimensions",
  similes: ["risk check", "safety assessment", "portfolio health"],
  examples: [
    {
      context: "User has 80% of portfolio in one asset",
      expectedEvaluation: {
        overallRisk: "HIGH",
        exposureConcentration: 0.8,
        recommendations: ["Diversify holdings", "Reduce concentration risk"]
      }
    }
  ],
  validate: async (runtime, message) => {
    // Always valid - can assess risk at any time
    return true;
  },
  handler: async (runtime, message, state: State) => {
    try {
      const portfolio = state.portfolio;
      const lendingPositions = state.lendingPositions || {};
      const liquidityPositions = state.liquidityPositions || [];
      
      // Calculate health factor
      let healthFactor = 999; // Default max
      if (lendingPositions.totalDebt > 0) {
        healthFactor = (lendingPositions.totalCollateral * lendingPositions.liquidationThreshold) / 
                      lendingPositions.totalDebt;
      }
      
      // Calculate exposure concentration
      const totalValue = portfolio.totalValueUSD;
      const largestPosition = Math.max(...portfolio.positions.map(p => p.valueUSD));
      const exposureConcentration = totalValue > 0 ? largestPosition / totalValue : 0;
      
      // Calculate volatility score (0-100)
      const volatilityScore = calculateVolatilityScore(portfolio.positions);
      
      // Calculate liquidity risk (0-1, higher = more risk)
      const liquidityRisk = calculateLiquidityRisk(liquidityPositions);
      
      // Determine overall risk level
      let overallRisk: RiskMetrics["overallRisk"] = "LOW";
      const recommendations: string[] = [];
      
      if (healthFactor < 1.2) {
        overallRisk = "CRITICAL";
        recommendations.push("Immediate action required: Add collateral or repay debt");
      } else if (healthFactor < 1.5) {
        overallRisk = "HIGH";
        recommendations.push("Health factor dangerously low - consider reducing leverage");
      }
      
      if (exposureConcentration > 0.5) {
        if (overallRisk === "LOW") overallRisk = "MEDIUM";
        recommendations.push(`Concentration risk: ${(exposureConcentration * 100).toFixed(1)}% in single asset`);
      }
      
      if (volatilityScore > 70) {
        if (overallRisk === "LOW") overallRisk = "MEDIUM";
        if (overallRisk === "MEDIUM") overallRisk = "HIGH";
        recommendations.push("High portfolio volatility - consider stable assets");
      }
      
      if (liquidityRisk > 0.7) {
        recommendations.push("Low liquidity in some positions - may face slippage");
      }
      
      // Add general recommendations
      if (overallRisk === "LOW") {
        recommendations.push("Portfolio well-balanced - maintain current strategy");
      }
      
      const metrics: RiskMetrics = {
        overallRisk,
        healthFactor,
        exposureConcentration,
        volatilityScore,
        liquidityRisk,
        recommendations
      };
      
      return {
        evaluation: metrics,
        confidence: 0.95
      };
      
    } catch (error) {
      return {
        evaluation: {
          overallRisk: "HIGH",
          healthFactor: 0,
          exposureConcentration: 1,
          volatilityScore: 100,
          liquidityRisk: 1,
          recommendations: ["Unable to assess risk - proceed with caution"]
        },
        confidence: 0.1
      };
    }
  }
};

function calculateVolatilityScore(positions: any[]): number {
  // Simplified volatility calculation based on asset types
  let totalVolatility = 0;
  let totalWeight = 0;
  
  for (const position of positions) {
    const weight = position.valueUSD;
    let assetVolatility = 50; // Default medium volatility
    
    // Assign volatility based on asset type
    if (position.symbol === "USDC" || position.symbol === "USDT" || position.symbol === "DAI") {
      assetVolatility = 5; // Stablecoins
    } else if (position.symbol === "ETH" || position.symbol === "WETH") {
      assetVolatility = 60; // Major cryptos
    } else if (position.symbol === "BTC" || position.symbol === "WBTC") {
      assetVolatility = 55;
    } else {
      assetVolatility = 80; // Altcoins
    }
    
    totalVolatility += assetVolatility * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? totalVolatility / totalWeight : 50;
}

function calculateLiquidityRisk(liquidityPositions: any[]): number {
  if (liquidityPositions.length === 0) return 0;
  
  let totalRisk = 0;
  
  for (const position of liquidityPositions) {
    // Higher TVL = lower risk
    const tvl = position.poolTVL || 1000000;
    const positionValue = position.valueUSD || 0;
    
    // Risk increases if position is large relative to pool
    const sizeRisk = Math.min(positionValue / tvl * 10, 1);
    
    // Risk based on pool volume
    const volume24h = position.volume24h || 0;
    const volumeRisk = volume24h < 100000 ? 0.5 : 0;
    
    totalRisk += (sizeRisk + volumeRisk) / 2;
  }
  
  return totalRisk / liquidityPositions.length;
}