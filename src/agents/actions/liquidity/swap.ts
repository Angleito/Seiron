import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@ai16z/eliza';

export interface SwapParams {
  protocol?: string; // Optional - can use auto-routing
  tokenIn: string;
  tokenOut: string;
  amountIn?: number;
  amountOut?: number; // Either amountIn or amountOut must be specified
  slippage?: number; // Default 0.5%
  maxHops?: number; // Maximum routing hops, default 3
}

export interface SwapResult {
  success: boolean;
  txHash?: string;
  protocol: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  executionPrice: number;
  priceImpact: number;
  route: string[];
  gasUsed?: number;
  error?: string;
}

export const swapAction: Action = {
  name: "SWAP",
  similes: ["swap", "exchange", "trade", "convert", "switch"],
  description: "Swap tokens on decentralized exchanges",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const params = message.content as any;
    
    // Validate required parameters
    if (!params.tokenIn || !params.tokenOut) {
      return false;
    }
    
    // Must specify either amountIn or amountOut
    if (!params.amountIn && !params.amountOut) {
      return false;
    }
    
    // Can't specify both
    if (params.amountIn && params.amountOut) {
      return false;
    }
    
    // Validate amounts
    if (params.amountIn !== undefined && (typeof params.amountIn !== 'number' || params.amountIn <= 0)) {
      return false;
    }
    
    if (params.amountOut !== undefined && (typeof params.amountOut !== 'number' || params.amountOut <= 0)) {
      return false;
    }
    
    // Validate slippage
    if (params.slippage !== undefined && (params.slippage < 0 || params.slippage > 50)) {
      return false;
    }
    
    // Validate max hops
    if (params.maxHops !== undefined && (params.maxHops < 1 || params.maxHops > 5)) {
      return false;
    }
    
    // Validate tokens
    const supportedTokens = ['USDC', 'USDT', 'DAI', 'ETH', 'WBTC', 'SEI'];
    if (!supportedTokens.includes(params.tokenIn.toUpperCase()) || 
        !supportedTokens.includes(params.tokenOut.toUpperCase())) {
      return false;
    }
    
    // Tokens must be different
    if (params.tokenIn.toUpperCase() === params.tokenOut.toUpperCase()) {
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
    const params = message.content as SwapParams;
    
    try {
      // Normalize inputs
      const tokenIn = params.tokenIn.toUpperCase();
      const tokenOut = params.tokenOut.toUpperCase();
      const slippage = params.slippage || 0.5;
      const maxHops = params.maxHops || 3;
      
      // Find best route
      const routeData = await findBestRoute(
        tokenIn,
        tokenOut,
        params.amountIn,
        params.amountOut,
        maxHops,
        params.protocol
      );
      
      if (!routeData.success) {
        callback({
          text: `Failed to find swap route: ${routeData.error}`,
          action: "SWAP_FAILED"
        });
        return;
      }
      
      // Calculate amounts
      const amountIn = params.amountIn || routeData.estimatedAmountIn;
      const amountOut = params.amountOut || routeData.estimatedAmountOut;
      
      // Check price impact
      if (routeData.priceImpact > 5) {
        callback({
          text: `Price impact too high (${routeData.priceImpact.toFixed(2)}%). Consider splitting into smaller swaps or using a different route.`,
          action: "SWAP_VALIDATION_FAILED"
        });
        return;
      }
      
      // Check slippage
      const minAmountOut = amountOut * (1 - slippage / 100);
      const maxAmountIn = amountIn * (1 + slippage / 100);
      
      // Execute swap
      const swapResult = await executeSwap(
        routeData.protocol,
        routeData.route,
        tokenIn,
        tokenOut,
        amountIn,
        minAmountOut,
        params.amountOut ? maxAmountIn : undefined
      );
      
      if (!swapResult.success) {
        callback({
          text: `Swap failed: ${swapResult.error}`,
          action: "SWAP_FAILED"
        });
        return;
      }
      
      // Update agent state
      await updateAgentState(runtime, {
        lastAction: 'swap',
        lastActionTime: new Date(),
        swapHistory: [
          ...(state.swapHistory || []).slice(-99), // Keep last 100 swaps
          {
            txHash: swapResult.txHash,
            timestamp: new Date(),
            tokenIn,
            tokenOut,
            amountIn: swapResult.amountIn,
            amountOut: swapResult.amountOut,
            protocol: routeData.protocol,
            route: routeData.route
          }
        ],
        totalSwapVolume: (state.totalSwapVolume || 0) + calculateUSDValue(tokenIn, swapResult.amountIn)
      });
      
      // Prepare response
      const response: SwapResult = {
        success: true,
        txHash: swapResult.txHash,
        protocol: routeData.protocol,
        tokenIn,
        tokenOut,
        amountIn: swapResult.amountIn,
        amountOut: swapResult.amountOut,
        executionPrice: swapResult.amountOut / swapResult.amountIn,
        priceImpact: routeData.priceImpact,
        route: routeData.route,
        gasUsed: swapResult.gasUsed
      };
      
      const routeDescription = routeData.route.length > 2 
        ? ` via ${routeData.route.slice(1, -1).join(' → ')}`
        : '';
      
      callback({
        text: `Successfully swapped ${swapResult.amountIn} ${tokenIn} for ${swapResult.amountOut.toFixed(6)} ${tokenOut} on ${routeData.protocol}${routeDescription}. Execution price: ${response.executionPrice.toFixed(6)} ${tokenOut}/${tokenIn}. Price impact: ${routeData.priceImpact.toFixed(2)}%. Transaction: ${swapResult.txHash}`,
        action: "SWAP_SUCCESS",
        data: response
      });
      
    } catch (error) {
      callback({
        text: `Unexpected error during swap: ${error.message}`,
        action: "SWAP_ERROR"
      });
    }
  },
  
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Swap 1 ETH for USDC" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "I'll swap 1 ETH for USDC. Finding the best route and price...",
          action: "SWAP"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Convert 5000 USDC to DAI on Curve" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Converting 5000 USDC to DAI on Curve. Processing swap...",
          action: "SWAP"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "I need exactly 10000 USDT, swap from my DAI" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Calculating DAI needed for exactly 10000 USDT output...",
          action: "SWAP"
        }
      }
    ]
  ]
};

// Helper functions

async function findBestRoute(
  tokenIn: string,
  tokenOut: string,
  amountIn?: number,
  amountOut?: number,
  maxHops: number = 3,
  preferredProtocol?: string
): Promise<any> {
  // Simulated route finding - in production, this would use DEX aggregators
  const directPairs: Record<string, string[]> = {
    'ETH': ['USDC', 'USDT', 'DAI', 'WBTC'],
    'WBTC': ['ETH', 'USDC'],
    'USDC': ['ETH', 'WBTC', 'DAI', 'USDT', 'SEI'],
    'USDT': ['ETH', 'USDC', 'DAI'],
    'DAI': ['ETH', 'USDC', 'USDT'],
    'SEI': ['USDC', 'ETH']
  };
  
  // Check for direct pair
  let route: string[] = [];
  if (directPairs[tokenIn]?.includes(tokenOut)) {
    route = [tokenIn, tokenOut];
  } else {
    // Find intermediate token (simplified)
    const intermediates = ['USDC', 'ETH'];
    for (const intermediate of intermediates) {
      if (directPairs[tokenIn]?.includes(intermediate) && 
          directPairs[intermediate]?.includes(tokenOut)) {
        route = [tokenIn, intermediate, tokenOut];
        break;
      }
    }
  }
  
  if (route.length === 0) {
    return {
      success: false,
      error: `No route found from ${tokenIn} to ${tokenOut}`
    };
  }
  
  // Determine protocol
  const protocol = preferredProtocol || selectBestProtocol(tokenIn, tokenOut);
  
  // Calculate amounts and price impact
  const prices = getTokenPrices();
  let estimatedAmountOut: number;
  let estimatedAmountIn: number;
  
  if (amountIn) {
    const valueIn = amountIn * prices[tokenIn];
    estimatedAmountOut = valueIn / prices[tokenOut] * 0.997; // 0.3% fee
    estimatedAmountIn = amountIn;
  } else {
    const valueOut = amountOut! * prices[tokenOut];
    estimatedAmountIn = valueOut / prices[tokenIn] * 1.003; // 0.3% fee
    estimatedAmountOut = amountOut!;
  }
  
  // Calculate price impact (simplified)
  const tradeSize = estimatedAmountIn * prices[tokenIn];
  const poolSize = 10000000; // $10M pool
  const priceImpact = (tradeSize / poolSize) * 100;
  
  return {
    success: true,
    protocol,
    route,
    estimatedAmountIn,
    estimatedAmountOut,
    priceImpact
  };
}

function selectBestProtocol(tokenIn: string, tokenOut: string): string {
  // Simplified protocol selection
  const stablecoins = ['USDC', 'USDT', 'DAI'];
  
  if (stablecoins.includes(tokenIn) && stablecoins.includes(tokenOut)) {
    return 'curve'; // Best for stablecoin swaps
  } else if (tokenIn === 'ETH' || tokenOut === 'ETH') {
    return 'uniswap'; // Best liquidity for ETH pairs
  } else {
    return 'sushiswap'; // General purpose
  }
}

function getTokenPrices(): Record<string, number> {
  return {
    ETH: 2500,
    WBTC: 45000,
    USDC: 1,
    USDT: 1,
    DAI: 1,
    SEI: 0.5
  };
}

function calculateUSDValue(token: string, amount: number): number {
  const prices = getTokenPrices();
  return amount * (prices[token] || 1);
}

async function executeSwap(
  protocol: string,
  route: string[],
  tokenIn: string,
  tokenOut: string,
  amountIn: number,
  minAmountOut: number,
  maxAmountIn?: number
): Promise<any> {
  // Simulated swap execution - in production, this would interact with DEX contracts
  await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate transaction time
  
  // Simulate slippage
  const slippageFactor = 0.998 + Math.random() * 0.004; // 0.2% random slippage
  const actualAmountOut = minAmountOut * slippageFactor;
  
  return {
    success: true,
    txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    amountIn,
    amountOut: actualAmountOut,
    gasUsed: 150000 + (route.length - 2) * 50000 // More gas for multi-hop
  };
}

async function updateAgentState(runtime: IAgentRuntime, updates: any): Promise<void> {
  const currentState = runtime.character?.settings?.state || {};
  const newState = { ...currentState, ...updates };
  
  if (runtime.character?.settings) {
    runtime.character.settings.state = newState;
  }
}

export default swapAction;