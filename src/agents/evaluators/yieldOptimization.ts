import { Evaluator } from "@elizaos/core";
import { State } from "../../types";

interface YieldOpportunity {
  protocol: string;
  asset: string;
  apy: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  requiredAction: string;
  estimatedGain: number;
  gasEstimate: number;
}

interface YieldMetrics {
  currentAPY: number;
  optimalAPY: number;
  opportunities: YieldOpportunity[];
  recommendations: string[];
}

export const yieldOptimizationEvaluator: Evaluator = {
  name: "YIELD_OPTIMIZATION",
  description: "Identifies and recommends yield optimization strategies",
  similes: ["yield optimization", "maximize returns", "improve APY"],
  examples: [
    {
      context: "User has idle USDC earning 0% APY",
      expectedEvaluation: {
        currentAPY: 0,
        optimalAPY: 8.5,
        opportunities: [{
          protocol: "Yei Finance",
          asset: "USDC",
          apy: 8.5,
          risk: "LOW",
          requiredAction: "Deposit to lending pool",
          estimatedGain: 850,
          gasEstimate: 5
        }]
      }
    }
  ],
  validate: async (runtime, message) => {
    return true; // Always valid
  },
  handler: async (runtime, message, state: State) => {
    try {
      const portfolio = state.portfolio;
      const lendingRates = state.marketData?.lendingRates || {};
      const liquidityAPYs = state.marketData?.liquidityAPYs || {};
      
      // Calculate current portfolio APY
      let currentWeightedAPY = 0;
      let totalValue = portfolio.totalValueUSD;
      
      for (const position of portfolio.positions) {
        const positionAPY = position.apy || 0;
        const weight = position.valueUSD / totalValue;
        currentWeightedAPY += positionAPY * weight;
      }
      
      // Find optimization opportunities
      const opportunities: YieldOpportunity[] = [];
      
      // Check for idle assets
      for (const position of portfolio.positions) {
        if (position.apy === 0 || !position.apy) {
          // Check lending opportunities
          const lendingAPY = lendingRates[position.symbol] || 0;
          if (lendingAPY > 2) {
            opportunities.push({
              protocol: "Yei Finance",
              asset: position.symbol,
              apy: lendingAPY,
              risk: "LOW",
              requiredAction: `Deposit ${position.amount} ${position.symbol} to lending`,
              estimatedGain: (position.valueUSD * lendingAPY / 100),
              gasEstimate: 5
            });
          }
          
          // Check liquidity opportunities
          const bestPool = findBestLiquidityPool(position.symbol, liquidityAPYs);
          if (bestPool && bestPool.apy > lendingAPY) {
            opportunities.push({
              protocol: "DragonSwap",
              asset: `${position.symbol}/${bestPool.pair}`,
              apy: bestPool.apy,
              risk: bestPool.risk,
              requiredAction: `Add liquidity to ${position.symbol}/${bestPool.pair} pool`,
              estimatedGain: (position.valueUSD * bestPool.apy / 100),
              gasEstimate: 10
            });
          }
        }
        
        // Check if current yield can be improved
        if (position.apy > 0 && position.protocol) {
          const betterYield = findBetterYield(position, lendingRates, liquidityAPYs);
          if (betterYield && betterYield.apy > position.apy * 1.2) {
            opportunities.push(betterYield);
          }
        }
      }
      
      // Calculate optimal APY if all opportunities are taken
      let optimalAPY = currentWeightedAPY;
      const takenOpportunities = new Set<string>();
      
      // Sort opportunities by gain
      opportunities.sort((a, b) => b.estimatedGain - a.estimatedGain);
      
      for (const opp of opportunities) {
        if (!takenOpportunities.has(opp.asset)) {
          const position = portfolio.positions.find(p => p.symbol === opp.asset.split('/')[0]);
          if (position) {
            const weight = position.valueUSD / totalValue;
            optimalAPY += (opp.apy - (position.apy || 0)) * weight;
            takenOpportunities.add(opp.asset);
          }
        }
      }
      
      // Generate recommendations
      const recommendations: string[] = [];
      
      if (opportunities.length === 0) {
        recommendations.push("Your yield is already optimized");
      } else {
        const totalPotentialGain = opportunities.reduce((sum, opp) => sum + opp.estimatedGain, 0);
        recommendations.push(`Potential additional yearly earnings: $${totalPotentialGain.toFixed(2)}`);
        
        if (opportunities.some(o => o.risk === "LOW")) {
          recommendations.push("Low-risk opportunities available in lending protocols");
        }
        
        if (opportunities.some(o => o.protocol === "DragonSwap")) {
          recommendations.push("Higher yields available through liquidity provision (with impermanent loss risk)");
        }
      }
      
      const metrics: YieldMetrics = {
        currentAPY: currentWeightedAPY,
        optimalAPY,
        opportunities: opportunities.slice(0, 5), // Top 5 opportunities
        recommendations
      };
      
      return {
        evaluation: metrics,
        confidence: 0.9
      };
      
    } catch (error) {
      return {
        evaluation: {
          currentAPY: 0,
          optimalAPY: 0,
          opportunities: [],
          recommendations: ["Unable to analyze yield opportunities"]
        },
        confidence: 0.1
      };
    }
  }
};

function findBestLiquidityPool(asset: string, liquidityAPYs: any): any {
  const pools = Object.entries(liquidityAPYs)
    .filter(([pair, data]: any) => pair.includes(asset))
    .map(([pair, data]: any) => ({
      pair: pair.replace(asset, '').replace('/', ''),
      apy: data.apy,
      risk: data.volume24h > 1000000 ? "MEDIUM" : "HIGH"
    }))
    .sort((a, b) => b.apy - a.apy);
    
  return pools[0];
}

function findBetterYield(position: any, lendingRates: any, liquidityAPYs: any): YieldOpportunity | null {
  const currentAPY = position.apy;
  
  // Check if lending is better
  const lendingAPY = lendingRates[position.symbol] || 0;
  if (lendingAPY > currentAPY * 1.2) {
    return {
      protocol: "Yei Finance",
      asset: position.symbol,
      apy: lendingAPY,
      risk: "LOW",
      requiredAction: `Move from ${position.protocol} to lending`,
      estimatedGain: position.valueUSD * (lendingAPY - currentAPY) / 100,
      gasEstimate: 10
    };
  }
  
  // Check liquidity pools
  const bestPool = findBestLiquidityPool(position.symbol, liquidityAPYs);
  if (bestPool && bestPool.apy > currentAPY * 1.5) {
    return {
      protocol: "DragonSwap",
      asset: `${position.symbol}/${bestPool.pair}`,
      apy: bestPool.apy,
      risk: bestPool.risk,
      requiredAction: `Move to ${position.symbol}/${bestPool.pair} liquidity pool`,
      estimatedGain: position.valueUSD * (bestPool.apy - currentAPY) / 100,
      gasEstimate: 15
    };
  }
  
  return null;
}