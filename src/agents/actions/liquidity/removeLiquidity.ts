import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@ai16z/eliza';

export interface RemoveLiquidityParams {
  positionId?: string;
  protocol?: string;
  tokenA?: string;
  tokenB?: string;
  percentage?: number; // Percentage to remove (0-100), default 100%
  minAmountA?: number; // Minimum amount of tokenA to receive
  minAmountB?: number; // Minimum amount of tokenB to receive
}

export interface RemoveLiquidityResult {
  success: boolean;
  txHash?: string;
  positionId: string;
  protocol: string;
  tokenA: string;
  tokenB: string;
  amountA: number;
  amountB: number;
  lpTokensBurned: number;
  feesEarned: {
    tokenA: number;
    tokenB: number;
  };
  impermanentLoss?: number;
  totalReturn: number;
  error?: string;
}

export const removeLiquidityAction: Action = {
  name: "REMOVE_LIQUIDITY",
  similes: ["remove liquidity", "exit pool", "withdraw LP", "unstake LP"],
  description: "Remove liquidity from a decentralized exchange pool",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const params = message.content as any;
    
    // Must have either positionId or protocol+tokenA+tokenB
    if (!params.positionId && (!params.protocol || !params.tokenA || !params.tokenB)) {
      return false;
    }
    
    // Validate percentage if provided
    if (params.percentage !== undefined && 
        (typeof params.percentage !== 'number' || params.percentage <= 0 || params.percentage > 100)) {
      return false;
    }
    
    // Validate minimum amounts if provided
    if (params.minAmountA !== undefined && (typeof params.minAmountA !== 'number' || params.minAmountA < 0)) {
      return false;
    }
    
    if (params.minAmountB !== undefined && (typeof params.minAmountB !== 'number' || params.minAmountB < 0)) {
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
    const params = message.content as RemoveLiquidityParams;
    
    try {
      // Find the liquidity position
      const liquidityPositions = state.liquidityPositions || [];
      let position: any;
      
      if (params.positionId) {
        position = liquidityPositions.find((p: any) => p.id === params.positionId);
      } else if (params.protocol && params.tokenA && params.tokenB) {
        // Find matching position
        const protocol = params.protocol.toLowerCase();
        const tokenA = params.tokenA.toUpperCase();
        const tokenB = params.tokenB.toUpperCase();
        
        position = liquidityPositions.find((p: any) => 
          p.protocol === protocol &&
          ((p.tokenA === tokenA && p.tokenB === tokenB) || 
           (p.tokenA === tokenB && p.tokenB === tokenA))
        );
      }
      
      if (!position) {
        callback({
          text: "Liquidity position not found. Please check your position ID or pool details.",
          action: "REMOVE_LIQUIDITY_FAILED"
        });
        return;
      }
      
      const percentage = params.percentage || 100;
      const lpTokensToRemove = (position.lpTokens * percentage) / 100;
      
      // Get current pool data for calculations
      const poolData = await getPoolData(position.protocol, position.tokenA, position.tokenB);
      
      if (!poolData.success) {
        callback({
          text: `Failed to get pool data: ${poolData.error}`,
          action: "REMOVE_LIQUIDITY_FAILED"
        });
        return;
      }
      
      // Calculate amounts to receive
      const shareOfPool = lpTokensToRemove / poolData.totalSupply;
      const amountA = poolData.reserveA * shareOfPool;
      const amountB = poolData.reserveB * shareOfPool;
      
      // Check slippage protection
      if (params.minAmountA && amountA < params.minAmountA) {
        callback({
          text: `Cannot remove liquidity: Would receive ${amountA.toFixed(2)} ${position.tokenA}, but minimum is ${params.minAmountA}`,
          action: "REMOVE_LIQUIDITY_SLIPPAGE"
        });
        return;
      }
      
      if (params.minAmountB && amountB < params.minAmountB) {
        callback({
          text: `Cannot remove liquidity: Would receive ${amountB.toFixed(2)} ${position.tokenB}, but minimum is ${params.minAmountB}`,
          action: "REMOVE_LIQUIDITY_SLIPPAGE"
        });
        return;
      }
      
      // Calculate fees earned (simplified)
      const timeInPool = Date.now() - new Date(position.entryTime).getTime();
      const daysInPool = timeInPool / (1000 * 60 * 60 * 24);
      const feeRate = 0.003; // 0.3% fee tier
      const dailyVolume = poolData.volume24h;
      const poolShare = position.shareOfPool / 100;
      
      const totalFees = (dailyVolume * feeRate * daysInPool * poolShare);
      const feesA = totalFees * 0.5 / getTokenPrice(position.tokenA);
      const feesB = totalFees * 0.5 / getTokenPrice(position.tokenB);
      
      // Calculate impermanent loss
      const currentValue = calculateCurrentValue(amountA, amountB, position.tokenA, position.tokenB);
      const hodlValue = calculateHodlValue(position);
      const impermanentLoss = ((hodlValue - currentValue) / hodlValue) * 100;
      
      // Execute removal
      const removeResult = await executeRemoveLiquidity(
        position.protocol,
        position.tokenA,
        position.tokenB,
        lpTokensToRemove,
        amountA,
        amountB
      );
      
      if (!removeResult.success) {
        callback({
          text: `Failed to remove liquidity: ${removeResult.error}`,
          action: "REMOVE_LIQUIDITY_FAILED"
        });
        return;
      }
      
      // Update agent state
      const updatedPositions = liquidityPositions.map((p: any) => {
        if (p.id === position.id) {
          if (percentage >= 100) {
            return { ...p, lpTokens: 0, closed: true, closedAt: new Date() };
          } else {
            return { 
              ...p, 
              lpTokens: p.lpTokens - lpTokensToRemove,
              lastUpdate: new Date()
            };
          }
        }
        return p;
      }).filter((p: any) => !p.closed || p.closedAt);
      
      await updateAgentState(runtime, {
        lastAction: 'removeLiquidity',
        lastActionTime: new Date(),
        liquidityPositions: updatedPositions,
        totalLPFeesEarned: (state.totalLPFeesEarned || 0) + feesA + feesB
      });
      
      // Calculate total return
      const totalReturn = ((currentValue - position.initialValueUSD) / position.initialValueUSD) * 100;
      
      // Prepare response
      const response: RemoveLiquidityResult = {
        success: true,
        txHash: removeResult.txHash,
        positionId: position.id,
        protocol: position.protocol,
        tokenA: position.tokenA,
        tokenB: position.tokenB,
        amountA,
        amountB,
        lpTokensBurned: lpTokensToRemove,
        feesEarned: {
          tokenA: feesA,
          tokenB: feesB
        },
        impermanentLoss: impermanentLoss > 0 ? impermanentLoss : undefined,
        totalReturn
      };
      
      let responseText = `Successfully removed ${percentage}% liquidity from ${position.protocol} ${position.tokenA}/${position.tokenB} pool. `;
      responseText += `Received ${amountA.toFixed(2)} ${position.tokenA} and ${amountB.toFixed(2)} ${position.tokenB}. `;
      responseText += `Fees earned: ${feesA.toFixed(2)} ${position.tokenA} + ${feesB.toFixed(2)} ${position.tokenB}. `;
      
      if (impermanentLoss > 0) {
        responseText += `Impermanent loss: ${impermanentLoss.toFixed(2)}%. `;
      }
      
      responseText += `Total return: ${totalReturn > 0 ? '+' : ''}${totalReturn.toFixed(2)}%. Transaction: ${removeResult.txHash}`;
      
      callback({
        text: responseText,
        action: "REMOVE_LIQUIDITY_SUCCESS",
        data: response
      });
      
    } catch (error) {
      callback({
        text: `Unexpected error while removing liquidity: ${error.message}`,
        action: "REMOVE_LIQUIDITY_ERROR"
      });
    }
  },
  
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Remove my liquidity from Uniswap ETH/USDC pool" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "I'll remove your liquidity from the Uniswap ETH/USDC pool. Calculating returns and fees...",
          action: "REMOVE_LIQUIDITY"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Exit 50% of my Curve USDC/DAI position" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Removing 50% of your Curve USDC/DAI liquidity position...",
          action: "REMOVE_LIQUIDITY"
        }
      }
    ]
  ]
};

// Helper functions

async function getPoolData(protocol: string, tokenA: string, tokenB: string): Promise<any> {
  // Reuse similar logic from addLiquidity
  const baseReserves: Record<string, number> = {
    ETH: 10000,
    WBTC: 100,
    USDC: 25000000,
    USDT: 24000000,
    DAI: 25500000,
    SEI: 50000000
  };
  
  return {
    success: true,
    reserveA: baseReserves[tokenA] * (0.8 + Math.random() * 0.4),
    reserveB: baseReserves[tokenB] * (0.8 + Math.random() * 0.4),
    totalSupply: 1000000 * (0.8 + Math.random() * 0.4),
    volume24h: Math.random() * 10000000
  };
}

function getTokenPrice(token: string): number {
  const prices: Record<string, number> = {
    ETH: 2500,
    WBTC: 45000,
    USDC: 1,
    USDT: 1,
    DAI: 1,
    SEI: 0.5
  };
  return prices[token] || 1;
}

function calculateCurrentValue(amountA: number, amountB: number, tokenA: string, tokenB: string): number {
  return amountA * getTokenPrice(tokenA) + amountB * getTokenPrice(tokenB);
}

function calculateHodlValue(position: any): number {
  // Calculate what the value would be if user had just held the tokens
  const currentPriceA = getTokenPrice(position.tokenA);
  const currentPriceB = getTokenPrice(position.tokenB);
  const initialPriceRatio = position.initialValueUSD / (position.amountA + position.amountB);
  
  return position.amountA * currentPriceA + position.amountB * currentPriceB;
}

async function executeRemoveLiquidity(
  protocol: string,
  tokenA: string,
  tokenB: string,
  lpTokens: number,
  expectedAmountA: number,
  expectedAmountB: number
): Promise<any> {
  // Simulated removal - in production, this would interact with DEX contracts
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: true,
    txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    gasUsed: 250000
  };
}

async function updateAgentState(runtime: IAgentRuntime, updates: any): Promise<void> {
  const currentState = runtime.character?.settings?.state || {};
  const newState = { ...currentState, ...updates };
  
  if (runtime.character?.settings) {
    runtime.character.settings.state = newState;
  }
}

export default removeLiquidityAction;