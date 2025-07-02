import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@ai16z/eliza';

export interface AddLiquidityParams {
  protocol: string;
  tokenA: string;
  tokenB: string;
  amountA: number;
  amountB?: number; // Optional - can be calculated based on pool ratio
  slippage?: number; // Default 0.5%
}

export interface AddLiquidityResult {
  success: boolean;
  txHash?: string;
  positionId?: string;
  protocol: string;
  tokenA: string;
  tokenB: string;
  amountA: number;
  amountB: number;
  lpTokensReceived: number;
  shareOfPool: number;
  estimatedAPY: number;
  impermanentLossRisk: string;
  error?: string;
}

export const addLiquidityAction: Action = {
  name: "ADD_LIQUIDITY",
  similes: ["provide liquidity", "add to pool", "LP", "become LP", "pool tokens"],
  description: "Add liquidity to a decentralized exchange pool",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const params = message.content as any;
    
    // Validate required parameters
    if (!params.protocol || !params.tokenA || !params.tokenB || !params.amountA) {
      return false;
    }
    
    // Validate amounts
    if (typeof params.amountA !== 'number' || params.amountA <= 0) {
      return false;
    }
    
    if (params.amountB !== undefined && (typeof params.amountB !== 'number' || params.amountB <= 0)) {
      return false;
    }
    
    // Validate slippage if provided
    if (params.slippage !== undefined && (params.slippage < 0 || params.slippage > 50)) {
      return false;
    }
    
    // Validate protocol
    const supportedProtocols = ['uniswap', 'sushiswap', 'curve', 'balancer', 'pancakeswap'];
    if (!supportedProtocols.includes(params.protocol.toLowerCase())) {
      return false;
    }
    
    // Validate tokens
    const supportedTokens = ['USDC', 'USDT', 'DAI', 'ETH', 'WBTC', 'SEI'];
    if (!supportedTokens.includes(params.tokenA.toUpperCase()) || 
        !supportedTokens.includes(params.tokenB.toUpperCase())) {
      return false;
    }
    
    // Tokens must be different
    if (params.tokenA.toUpperCase() === params.tokenB.toUpperCase()) {
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
    const params = message.content as AddLiquidityParams;
    
    try {
      // Normalize inputs
      const protocol = params.protocol.toLowerCase();
      const tokenA = params.tokenA.toUpperCase();
      const tokenB = params.tokenB.toUpperCase();
      const slippage = params.slippage || 0.5;
      
      // Get pool data
      const poolData = await getPoolData(protocol, tokenA, tokenB);
      
      if (!poolData.success) {
        callback({
          text: `Failed to get pool data: ${poolData.error}`,
          action: "ADD_LIQUIDITY_FAILED"
        });
        return;
      }
      
      // Calculate token B amount if not provided
      let amountB = params.amountB;
      if (!amountB) {
        // Calculate based on current pool ratio
        amountB = (params.amountA * poolData.reserveB) / poolData.reserveA;
      }
      
      // Check price impact
      const priceImpact = calculatePriceImpact(
        params.amountA,
        amountB,
        poolData.reserveA,
        poolData.reserveB
      );
      
      if (priceImpact > 5) {
        callback({
          text: `Price impact too high (${priceImpact.toFixed(2)}%). Consider adding smaller amounts or adjusting ratios.`,
          action: "ADD_LIQUIDITY_VALIDATION_FAILED"
        });
        return;
      }
      
      // Calculate expected LP tokens
      const lpTokens = calculateLPTokens(
        params.amountA,
        amountB,
        poolData.reserveA,
        poolData.reserveB,
        poolData.totalSupply
      );
      
      // Calculate share of pool
      const shareOfPool = (lpTokens / (poolData.totalSupply + lpTokens)) * 100;
      
      // Assess impermanent loss risk
      const ilRisk = assessImpermanentLossRisk(tokenA, tokenB, poolData.volatility);
      
      // Execute liquidity addition
      const addLiquidityResult = await executeAddLiquidity(
        protocol,
        tokenA,
        tokenB,
        params.amountA,
        amountB,
        slippage
      );
      
      if (!addLiquidityResult.success) {
        callback({
          text: `Failed to add liquidity: ${addLiquidityResult.error}`,
          action: "ADD_LIQUIDITY_FAILED"
        });
        return;
      }
      
      // Update agent state
      await updateAgentState(runtime, {
        lastAction: 'addLiquidity',
        lastActionTime: new Date(),
        liquidityPositions: [
          ...(state.liquidityPositions || []),
          {
            id: addLiquidityResult.positionId,
            protocol,
            tokenA,
            tokenB,
            amountA: params.amountA,
            amountB,
            lpTokens,
            shareOfPool,
            entryTime: new Date(),
            txHash: addLiquidityResult.txHash,
            initialValueUSD: calculatePositionValue(params.amountA, amountB, poolData)
          }
        ]
      });
      
      // Prepare response
      const response: AddLiquidityResult = {
        success: true,
        txHash: addLiquidityResult.txHash,
        positionId: addLiquidityResult.positionId,
        protocol,
        tokenA,
        tokenB,
        amountA: params.amountA,
        amountB,
        lpTokensReceived: lpTokens,
        shareOfPool,
        estimatedAPY: poolData.apy,
        impermanentLossRisk: ilRisk
      };
      
      callback({
        text: `Successfully added liquidity to ${protocol} ${tokenA}/${tokenB} pool. Deposited ${params.amountA} ${tokenA} and ${amountB.toFixed(2)} ${tokenB}. Received ${lpTokens.toFixed(6)} LP tokens (${shareOfPool.toFixed(3)}% of pool). Estimated APY: ${poolData.apy.toFixed(2)}%. IL Risk: ${ilRisk}. Transaction: ${addLiquidityResult.txHash}`,
        action: "ADD_LIQUIDITY_SUCCESS",
        data: response
      });
      
    } catch (error) {
      callback({
        text: `Unexpected error while adding liquidity: ${error.message}`,
        action: "ADD_LIQUIDITY_ERROR"
      });
    }
  },
  
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Add liquidity to Uniswap ETH/USDC pool with 1 ETH" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "I'll add liquidity to the Uniswap ETH/USDC pool with 1 ETH. Calculating required USDC amount...",
          action: "ADD_LIQUIDITY"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Provide 5000 USDC and 5000 DAI liquidity to Curve" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Adding 5000 USDC and 5000 DAI to the Curve pool. Processing transaction...",
          action: "ADD_LIQUIDITY"
        }
      }
    ]
  ]
};

// Helper functions

async function getPoolData(protocol: string, tokenA: string, tokenB: string): Promise<any> {
  // Simulated pool data - in production, this would fetch from DEX APIs
  const poolAPYs: Record<string, number> = {
    'uniswap_ETH_USDC': 12.5,
    'uniswap_WBTC_ETH': 8.3,
    'curve_USDC_DAI': 4.2,
    'curve_USDC_USDT': 3.8,
    'sushiswap_ETH_USDC': 15.2,
    'balancer_ETH_USDC': 10.8
  };
  
  const poolKey = `${protocol}_${[tokenA, tokenB].sort().join('_')}`;
  const apy = poolAPYs[poolKey] || Math.random() * 20 + 5; // 5-25% APY
  
  // Simulate pool reserves
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
    apy,
    volume24h: Math.random() * 10000000,
    fees24h: Math.random() * 30000,
    volatility: Math.random() * 0.5 + 0.1
  };
}

function calculatePriceImpact(
  amountA: number,
  amountB: number,
  reserveA: number,
  reserveB: number
): number {
  const currentRatio = reserveB / reserveA;
  const newReserveA = reserveA + amountA;
  const newReserveB = reserveB + amountB;
  const newRatio = newReserveB / newReserveA;
  
  return Math.abs((newRatio - currentRatio) / currentRatio) * 100;
}

function calculateLPTokens(
  amountA: number,
  amountB: number,
  reserveA: number,
  reserveB: number,
  totalSupply: number
): number {
  // Simplified LP token calculation
  const liquidityA = (amountA / reserveA) * totalSupply;
  const liquidityB = (amountB / reserveB) * totalSupply;
  
  return Math.min(liquidityA, liquidityB);
}

function assessImpermanentLossRisk(tokenA: string, tokenB: string, volatility: number): string {
  const stablecoins = ['USDC', 'USDT', 'DAI'];
  const isStablePair = stablecoins.includes(tokenA) && stablecoins.includes(tokenB);
  
  if (isStablePair) {
    return 'Low';
  } else if (volatility < 0.2) {
    return 'Medium';
  } else if (volatility < 0.4) {
    return 'High';
  } else {
    return 'Very High';
  }
}

function calculatePositionValue(amountA: number, amountB: number, poolData: any): number {
  // Simplified USD value calculation
  const tokenPrices: Record<string, number> = {
    ETH: 2500,
    WBTC: 45000,
    USDC: 1,
    USDT: 1,
    DAI: 1,
    SEI: 0.5
  };
  
  return amountA * (tokenPrices[amountA] || 1) + amountB * (tokenPrices[amountB] || 1);
}

async function executeAddLiquidity(
  protocol: string,
  tokenA: string,
  tokenB: string,
  amountA: number,
  amountB: number,
  slippage: number
): Promise<any> {
  // Simulated liquidity addition - in production, this would interact with DEX contracts
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate transaction time
  
  return {
    success: true,
    txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    positionId: `${protocol}_${tokenA}_${tokenB}_${Date.now()}`,
    gasUsed: 300000
  };
}

async function updateAgentState(runtime: IAgentRuntime, updates: any): Promise<void> {
  const currentState = runtime.character?.settings?.state || {};
  const newState = { ...currentState, ...updates };
  
  if (runtime.character?.settings) {
    runtime.character.settings.state = newState;
  }
}

export default addLiquidityAction;