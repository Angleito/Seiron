import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@ai16z/eliza';

export interface SwapParams {
  protocol?: string; // Optional - can use auto-routing or 'symphony' for Symphony protocol
  tokenIn: string;
  tokenOut: string;
  amountIn?: number;
  amountOut?: number; // Either amountIn or amountOut must be specified
  slippage?: number; // Default 0.5%
  maxHops?: number; // Maximum routing hops, default 3
  enableMultiProtocol?: boolean; // Enable multi-protocol comparison
  prioritizeGasEfficiency?: boolean; // Prioritize gas efficiency over price
  maxGasPrice?: number; // Maximum acceptable gas price
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
  // Enhanced fields
  protocolComparison?: {
    quotesChecked: number;
    bestProtocol: string;
    savings: string;
    alternativeQuotes: any[];
  };
  arbitrageDetected?: boolean;
  routeOptimization?: {
    hopsUsed: number;
    gasEfficiency: number;
    priceOptimization: number;
  };
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
    
    // Validate tokens (expanded for Symphony support)
    const supportedTokens = ['USDC', 'USDT', 'DAI', 'ETH', 'WBTC', 'SEI', 'WSEI', 'ATOM', 'OSMO'];
    if (!supportedTokens.includes(params.tokenIn.toUpperCase()) || 
        !supportedTokens.includes(params.tokenOut.toUpperCase())) {
      return false;
    }
    
    // Validate protocol if specified
    if (params.protocol) {
      const supportedProtocols = ['symphony', 'uniswap', 'sushi', 'curve', 'balancer', 'auto'];
      if (!supportedProtocols.includes(params.protocol.toLowerCase())) {
        return false;
      }
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
      
      // Enhanced route finding with multi-protocol support
      const routeData = await findBestRoute(
        tokenIn,
        tokenOut,
        params.amountIn,
        params.amountOut,
        maxHops,
        params.protocol,
        {
          enableMultiProtocol: params.enableMultiProtocol,
          prioritizeGasEfficiency: params.prioritizeGasEfficiency,
          maxGasPrice: params.maxGasPrice
        }
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
      
      // Prepare enhanced response
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
        gasUsed: swapResult.gasUsed,
        protocolComparison: routeData.protocolComparison,
        arbitrageDetected: routeData.arbitrageDetected,
        routeOptimization: routeData.routeOptimization
      };
      
      const routeDescription = routeData.route.length > 2 
        ? ` via ${routeData.route.slice(1, -1).join(' → ')}`
        : '';
      
      // Enhanced success message with protocol comparison details
      let successMessage = `Successfully swapped ${swapResult.amountIn} ${tokenIn} for ${swapResult.amountOut.toFixed(6)} ${tokenOut} on ${routeData.protocol}${routeDescription}. Execution price: ${response.executionPrice.toFixed(6)} ${tokenOut}/${tokenIn}. Price impact: ${routeData.priceImpact.toFixed(2)}%.`;
      
      if (routeData.protocolComparison) {
        successMessage += ` Compared ${routeData.protocolComparison.quotesChecked} protocols. Savings: ${routeData.protocolComparison.savings}.`;
      }
      
      if (routeData.arbitrageDetected) {
        successMessage += ` ⚡ Arbitrage opportunity detected for future reference.`;
      }
      
      if (routeData.routeOptimization) {
        successMessage += ` Route optimized: ${routeData.routeOptimization.hopsUsed} hops, ${routeData.routeOptimization.gasEfficiency}% gas efficiency.`;
      }
      
      successMessage += ` Transaction: ${swapResult.txHash}`;

      callback({
        text: successMessage,
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
  preferredProtocol?: string,
  options?: {
    enableMultiProtocol?: boolean;
    prioritizeGasEfficiency?: boolean;
    maxGasPrice?: number;
  }
): Promise<any> {
  // Enhanced route finding with Symphony and multi-protocol support
  const directPairs: Record<string, string[]> = {
    'ETH': ['USDC', 'USDT', 'DAI', 'WBTC', 'SEI'],
    'WBTC': ['ETH', 'USDC'],
    'USDC': ['ETH', 'WBTC', 'DAI', 'USDT', 'SEI', 'WSEI', 'ATOM'],
    'USDT': ['ETH', 'USDC', 'DAI', 'SEI'],
    'DAI': ['ETH', 'USDC', 'USDT'],
    'SEI': ['USDC', 'ETH', 'USDT', 'WSEI', 'ATOM'],
    'WSEI': ['SEI', 'USDC', 'ATOM'],
    'ATOM': ['SEI', 'USDC', 'WSEI', 'OSMO'],
    'OSMO': ['ATOM', 'USDC']
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
  
  // Enhanced protocol selection and multi-protocol comparison
  let protocol = preferredProtocol || selectBestProtocol(tokenIn, tokenOut);
  let protocolComparison;
  let arbitrageDetected = false;
  let routeOptimization;
  
  // Multi-protocol comparison if enabled
  if (options?.enableMultiProtocol && !preferredProtocol) {
    const quotes = await getMultiProtocolQuotes(tokenIn, tokenOut, amountIn || amountOut!);
    const bestQuote = selectBestQuote(quotes, options);
    protocol = bestQuote.protocol;
    
    protocolComparison = {
      quotesChecked: quotes.length,
      bestProtocol: protocol,
      savings: calculateSavings(quotes),
      alternativeQuotes: quotes.filter(q => q.protocol !== protocol)
    };
    
    // Check for arbitrage opportunities
    arbitrageDetected = detectArbitrageInQuotes(quotes);
  }
  
  // Calculate amounts and price impact with protocol-specific logic
  const prices = getTokenPrices();
  let estimatedAmountOut: number;
  let estimatedAmountIn: number;
  
  // Protocol-specific fee calculations
  const protocolFees = getProtocolFees(protocol);
  
  if (amountIn) {
    const valueIn = amountIn * prices[tokenIn];
    estimatedAmountOut = valueIn / prices[tokenOut] * (1 - protocolFees);
    estimatedAmountIn = amountIn;
  } else {
    const valueOut = amountOut! * prices[tokenOut];
    estimatedAmountIn = valueOut / prices[tokenIn] * (1 + protocolFees);
    estimatedAmountOut = amountOut!;
  }
  
  // Enhanced price impact calculation
  const tradeSize = estimatedAmountIn * prices[tokenIn];
  const poolSize = getPoolSize(tokenIn, tokenOut, protocol);
  const priceImpact = calculatePriceImpact(tradeSize, poolSize, protocol);
  
  // Route optimization analysis
  routeOptimization = {
    hopsUsed: route.length - 1,
    gasEfficiency: calculateGasEfficiency(route, protocol),
    priceOptimization: calculatePriceOptimization(priceImpact, protocolFees)
  };
  
  return {
    success: true,
    protocol,
    route,
    estimatedAmountIn,
    estimatedAmountOut,
    priceImpact,
    protocolComparison,
    arbitrageDetected,
    routeOptimization
  };
}

function selectBestProtocol(tokenIn: string, tokenOut: string): string {
  // Enhanced protocol selection with Symphony support
  const stablecoins = ['USDC', 'USDT', 'DAI'];
  const seiTokens = ['SEI', 'WSEI', 'ATOM', 'OSMO'];
  
  // Prioritize Symphony for Sei ecosystem tokens
  if (seiTokens.includes(tokenIn) || seiTokens.includes(tokenOut)) {
    return 'symphony';
  } else if (stablecoins.includes(tokenIn) && stablecoins.includes(tokenOut)) {
    return 'curve'; // Best for stablecoin swaps
  } else if (tokenIn === 'ETH' || tokenOut === 'ETH') {
    return 'uniswap'; // Best liquidity for ETH pairs
  } else {
    return 'symphony'; // Default to Symphony for cross-chain and complex routes
  }
}

function getTokenPrices(): Record<string, number> {
  return {
    ETH: 2500,
    WBTC: 45000,
    USDC: 1,
    USDT: 1,
    DAI: 1,
    SEI: 0.5,
    WSEI: 0.5,
    ATOM: 8.5,
    OSMO: 1.2
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

// Enhanced helper functions for multi-protocol support

async function getMultiProtocolQuotes(tokenIn: string, tokenOut: string, amount: number): Promise<any[]> {
  const protocols = ['symphony', 'uniswap', 'sushi', 'curve'];
  const quotes = [];
  
  for (const protocol of protocols) {
    try {
      const quote = await simulateProtocolQuote(tokenIn, tokenOut, amount, protocol);
      quotes.push(quote);
    } catch (error) {
      console.warn(`Failed to get quote from ${protocol}:`, error);
    }
  }
  
  return quotes;
}

async function simulateProtocolQuote(tokenIn: string, tokenOut: string, amount: number, protocol: string): Promise<any> {
  const prices = getTokenPrices();
  const fees = getProtocolFees(protocol);
  const gasEstimate = getProtocolGasEstimate(protocol);
  
  const baseAmountOut = (amount * prices[tokenIn]) / prices[tokenOut];
  const amountOut = baseAmountOut * (1 - fees);
  
  return {
    protocol,
    amountOut,
    priceImpact: (amount * prices[tokenIn] / 10000000) * 100, // Simplified price impact
    gasEstimate,
    fees: fees * 100,
    executionTime: Math.random() * 30 + 10 // 10-40 seconds
  };
}

function selectBestQuote(quotes: any[], options?: any): any {
  if (options?.prioritizeGasEfficiency) {
    return quotes.reduce((best, current) => 
      current.gasEstimate < best.gasEstimate ? current : best
    );
  }
  
  // Default: prioritize best amount out adjusted for fees and gas
  return quotes.reduce((best, current) => {
    const bestNet = best.amountOut - (best.gasEstimate * 0.00001);
    const currentNet = current.amountOut - (current.gasEstimate * 0.00001);
    return currentNet > bestNet ? current : best;
  });
}

function calculateSavings(quotes: any[]): string {
  if (quotes.length < 2) return '0%';
  
  const best = quotes[0];
  const worst = quotes[quotes.length - 1];
  const savings = ((best.amountOut - worst.amountOut) / worst.amountOut) * 100;
  
  return `${savings.toFixed(2)}%`;
}

function detectArbitrageInQuotes(quotes: any[]): boolean {
  if (quotes.length < 2) return false;
  
  const maxDifference = Math.max(...quotes.map(q => q.amountOut)) - Math.min(...quotes.map(q => q.amountOut));
  const avgAmount = quotes.reduce((sum, q) => sum + q.amountOut, 0) / quotes.length;
  
  // Arbitrage opportunity if difference > 0.5%
  return (maxDifference / avgAmount) > 0.005;
}

function getProtocolFees(protocol: string): number {
  const feeMap: Record<string, number> = {
    'symphony': 0.002, // 0.2%
    'uniswap': 0.003, // 0.3%
    'sushi': 0.003,
    'curve': 0.0004, // 0.04% for stablecoins
    'balancer': 0.002
  };
  
  return feeMap[protocol] || 0.003;
}

function getProtocolGasEstimate(protocol: string): number {
  const gasMap: Record<string, number> = {
    'symphony': 120000,
    'uniswap': 150000,
    'sushi': 150000,
    'curve': 180000,
    'balancer': 200000
  };
  
  return gasMap[protocol] || 150000;
}

function getPoolSize(tokenIn: string, tokenOut: string, protocol: string): number {
  // Simplified pool size estimation
  const basePoolSizes: Record<string, number> = {
    'symphony': 5000000, // $5M average
    'uniswap': 20000000, // $20M average  
    'sushi': 10000000,
    'curve': 50000000, // Large stablecoin pools
    'balancer': 8000000
  };
  
  return basePoolSizes[protocol] || 10000000;
}

function calculatePriceImpact(tradeSize: number, poolSize: number, protocol: string): number {
  // Enhanced price impact calculation based on protocol
  const baseImpact = (tradeSize / poolSize) * 100;
  
  // Protocol-specific impact adjustments
  const impactMultipliers: Record<string, number> = {
    'symphony': 0.8, // Better price impact due to aggregation
    'curve': 0.6, // Excellent for stablecoins
    'uniswap': 1.0,
    'sushi': 1.1,
    'balancer': 0.9
  };
  
  return baseImpact * (impactMultipliers[protocol] || 1.0);
}

function calculateGasEfficiency(route: string[], protocol: string): number {
  // Calculate gas efficiency as percentage
  const baseGas = getProtocolGasEstimate(protocol);
  const routeMultiplier = 1 + (route.length - 2) * 0.3; // 30% more gas per hop
  const actualGas = baseGas * routeMultiplier;
  
  // Efficiency relative to worst case (3 hops on expensive protocol)
  const worstCase = 200000 * 1.6; // Balancer with 3 hops
  return Math.max(0, (worstCase - actualGas) / worstCase * 100);
}

function calculatePriceOptimization(priceImpact: number, protocolFees: number): number {
  // Calculate price optimization score (0-100)
  const impactScore = Math.max(0, 100 - priceImpact * 20);
  const feeScore = Math.max(0, 100 - protocolFees * 10000);
  
  return (impactScore + feeScore) / 2;
}

export default swapAction;