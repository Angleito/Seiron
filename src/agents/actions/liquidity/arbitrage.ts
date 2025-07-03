import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@ai16z/eliza';

export interface ArbitrageParams {
  tokens?: string[]; // Tokens to scan for arbitrage
  minProfitThreshold?: number; // Minimum profit threshold in percentage (default 0.5%)
  maxGasPrice?: number; // Maximum gas price willing to pay
  maxInvestment?: number; // Maximum amount to invest in arbitrage
  autoExecute?: boolean; // Whether to auto-execute profitable opportunities
  protocols?: string[]; // Protocols to include in arbitrage scanning
}

export interface ArbitrageResult {
  success: boolean;
  opportunitiesFound: number;
  totalPotentialProfit: number;
  executed?: {
    arbitrageId: string;
    actualProfit: number;
    profitPercent: number;
    txHash: string;
  };
  opportunities?: ArbitrageOpportunity[];
  error?: string;
}

export interface ArbitrageOpportunity {
  id: string;
  type: 'cross_protocol' | 'triangular' | 'spatial';
  protocols: string[];
  tokens: string[];
  route: string[];
  expectedProfit: number;
  profitPercent: number;
  volume: number;
  gasEstimate: number;
  confidence: number;
  executionTime: number;
  riskScore: number;
  validUntil: Date;
}

export const arbitrageAction: Action = {
  name: "ARBITRAGE",
  similes: ["arbitrage", "profit", "opportunity", "cross-protocol", "triangular"],
  description: "Detect and execute arbitrage opportunities across protocols",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const params = message.content as any;
    
    // Validate profit threshold
    if (params.minProfitThreshold !== undefined && 
        (params.minProfitThreshold < 0 || params.minProfitThreshold > 50)) {
      return false;
    }
    
    // Validate max investment
    if (params.maxInvestment !== undefined && params.maxInvestment <= 0) {
      return false;
    }
    
    // Validate tokens array
    if (params.tokens && !Array.isArray(params.tokens)) {
      return false;
    }
    
    // Validate protocols array
    if (params.protocols && !Array.isArray(params.protocols)) {
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
    const params = message.content as ArbitrageParams;
    
    try {
      // Set defaults
      const tokens = params.tokens || ['USDC', 'USDT', 'DAI', 'ETH', 'SEI'];
      const minProfitThreshold = params.minProfitThreshold || 0.5;
      const maxGasPrice = params.maxGasPrice || 100; // gwei
      const maxInvestment = params.maxInvestment || 10000; // USD
      const protocols = params.protocols || ['symphony', 'uniswap', 'sushi', 'curve'];
      
      // Scan for arbitrage opportunities
      const opportunities = await scanArbitrageOpportunities(
        tokens,
        minProfitThreshold,
        maxGasPrice,
        protocols
      );
      
      if (opportunities.length === 0) {
        callback({
          text: `No profitable arbitrage opportunities found. Scanned ${tokens.length} tokens across ${protocols.length} protocols with minimum ${minProfitThreshold}% profit threshold.`,
          action: "ARBITRAGE_NO_OPPORTUNITIES"
        });
        return;
      }
      
      // Sort opportunities by profit potential
      const sortedOpportunities = opportunities.sort((a, b) => b.expectedProfit - a.expectedProfit);
      const totalPotentialProfit = opportunities.reduce((sum, opp) => sum + opp.expectedProfit, 0);
      
      // Auto-execute if enabled and conditions are met
      let executionResult;
      if (params.autoExecute && sortedOpportunities.length > 0) {
        const bestOpportunity = sortedOpportunities[0];
        
        // Additional safety checks for auto-execution
        if (bestOpportunity.riskScore < 0.7 && 
            bestOpportunity.confidence > 0.8 &&
            bestOpportunity.volume <= maxInvestment) {
          
          try {
            executionResult = await executeArbitrage(bestOpportunity);
            
            // Update agent state with execution history
            await updateArbitrageState(runtime, {
              lastArbitrageExecution: new Date(),
              totalArbitrageProfit: (state.totalArbitrageProfit || 0) + executionResult.actualProfit,
              arbitrageExecutions: [
                ...(state.arbitrageExecutions || []).slice(-99), // Keep last 100
                {
                  timestamp: new Date(),
                  arbitrageId: bestOpportunity.id,
                  profit: executionResult.actualProfit,
                  profitPercent: executionResult.profitPercent,
                  type: bestOpportunity.type,
                  protocols: bestOpportunity.protocols
                }
              ]
            });
            
          } catch (error) {
            console.error('Auto-execution failed:', error);
          }
        }
      }
      
      // Prepare response
      const response: ArbitrageResult = {
        success: true,
        opportunitiesFound: opportunities.length,
        totalPotentialProfit,
        opportunities: sortedOpportunities.slice(0, 10), // Return top 10
        executed: executionResult
      };
      
      let responseText = `Found ${opportunities.length} arbitrage opportunities with total potential profit of $${totalPotentialProfit.toFixed(2)}. `;
      
      if (executionResult) {
        responseText += `Auto-executed best opportunity: $${executionResult.actualProfit.toFixed(2)} profit (${executionResult.profitPercent.toFixed(2)}%). `;
      }
      
      // Add details about top opportunities
      const topOpp = sortedOpportunities[0];
      responseText += `Top opportunity: ${topOpp.type} arbitrage on ${topOpp.protocols.join(' → ')} with ${topOpp.profitPercent.toFixed(2)}% profit (${topOpp.confidence * 100}% confidence, ${topOpp.riskScore * 100}% risk).`;
      
      // Add urgent opportunities warning
      const urgentOpportunities = opportunities.filter(opp => 
        opp.validUntil.getTime() - Date.now() < 60000
      );
      
      if (urgentOpportunities.length > 0) {
        responseText += ` ⚠️ ${urgentOpportunities.length} opportunities expire within 1 minute!`;
      }
      
      callback({
        text: responseText,
        action: "ARBITRAGE_SUCCESS",
        data: response
      });
      
    } catch (error) {
      callback({
        text: `Arbitrage scanning failed: ${error.message}`,
        action: "ARBITRAGE_ERROR"
      });
    }
  },
  
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Scan for arbitrage opportunities" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Scanning for arbitrage opportunities across protocols...",
          action: "ARBITRAGE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Find profitable arbitrage with at least 1% profit" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Scanning for arbitrage opportunities with minimum 1% profit threshold...",
          action: "ARBITRAGE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Auto-execute arbitrage opportunities on Symphony and Uniswap" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Scanning Symphony and Uniswap for auto-executable arbitrage opportunities...",
          action: "ARBITRAGE"
        }
      }
    ]
  ]
};

// Helper functions

async function scanArbitrageOpportunities(
  tokens: string[],
  minProfitThreshold: number,
  maxGasPrice: number,
  protocols: string[]
): Promise<ArbitrageOpportunity[]> {
  const opportunities: ArbitrageOpportunity[] = [];
  
  // Cross-protocol arbitrage detection
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      const tokenA = tokens[i];
      const tokenB = tokens[j];
      
      // Check both directions
      const opp1 = await checkCrossProtocolArbitrage(tokenA, tokenB, minProfitThreshold, protocols);
      const opp2 = await checkCrossProtocolArbitrage(tokenB, tokenA, minProfitThreshold, protocols);
      
      if (opp1) opportunities.push(opp1);
      if (opp2) opportunities.push(opp2);
      
      // Triangular arbitrage
      for (let k = 0; k < tokens.length; k++) {
        if (k !== i && k !== j) {
          const tokenC = tokens[k];
          const triangularOpp = await checkTriangularArbitrage(tokenA, tokenB, tokenC, minProfitThreshold);
          if (triangularOpp) opportunities.push(triangularOpp);
        }
      }
    }
  }
  
  // Filter by gas price constraints
  return opportunities.filter(opp => {
    const estimatedGasPrice = opp.gasEstimate / 1000000; // Convert to gwei estimate
    return estimatedGasPrice <= maxGasPrice;
  });
}

async function checkCrossProtocolArbitrage(
  tokenIn: string,
  tokenOut: string,
  minProfitThreshold: number,
  protocols: string[]
): Promise<ArbitrageOpportunity | null> {
  try {
    // Get quotes from multiple protocols
    const quotes = await getMultiProtocolQuotes(tokenIn, tokenOut, 1000, protocols);
    
    if (quotes.length < 2) return null;
    
    // Sort by amount out
    const sortedQuotes = quotes.sort((a, b) => b.amountOut - a.amountOut);
    const bestQuote = sortedQuotes[0];
    const secondBest = sortedQuotes[1];
    
    const profitPercent = ((bestQuote.amountOut - secondBest.amountOut) / secondBest.amountOut) * 100;
    
    if (profitPercent < minProfitThreshold) return null;
    
    const estimatedProfit = (bestQuote.amountOut - secondBest.amountOut) * getTokenPrice(tokenOut);
    
    return {
      id: `cross_${tokenIn}_${tokenOut}_${Date.now()}`,
      type: 'cross_protocol',
      protocols: [secondBest.protocol, bestQuote.protocol],
      tokens: [tokenIn, tokenOut],
      route: [tokenIn, tokenOut],
      expectedProfit: estimatedProfit,
      profitPercent,
      volume: 1000,
      gasEstimate: bestQuote.gasEstimate + secondBest.gasEstimate,
      confidence: Math.min(bestQuote.confidence || 0.8, secondBest.confidence || 0.8),
      executionTime: (bestQuote.executionTime || 15) + (secondBest.executionTime || 15),
      riskScore: calculateArbitrageRisk(profitPercent, bestQuote.gasEstimate + secondBest.gasEstimate),
      validUntil: new Date(Date.now() + 120000) // 2 minutes
    };
  } catch (error) {
    return null;
  }
}

async function checkTriangularArbitrage(
  tokenA: string,
  tokenB: string,
  tokenC: string,
  minProfitThreshold: number
): Promise<ArbitrageOpportunity | null> {
  try {
    const prices = getTokenPrices();
    const startAmount = 1000;
    
    // Calculate theoretical arbitrage: A → B → C → A
    const amountB = (startAmount * prices[tokenA]) / prices[tokenB];
    const amountC = (amountB * prices[tokenB]) / prices[tokenC];
    const finalAmountA = (amountC * prices[tokenC]) / prices[tokenA];
    
    // Account for fees (simplified)
    const feeFactor = 0.997; // 0.3% fee per swap
    const finalAmountAWithFees = finalAmountA * Math.pow(feeFactor, 3);
    
    const profitPercent = ((finalAmountAWithFees - startAmount) / startAmount) * 100;
    
    if (profitPercent < minProfitThreshold) return null;
    
    return {
      id: `triangular_${tokenA}_${tokenB}_${tokenC}_${Date.now()}`,
      type: 'triangular',
      protocols: ['symphony', 'uniswap', 'sushi'], // Would use optimal protocols
      tokens: [tokenA, tokenB, tokenC],
      route: [tokenA, tokenB, tokenC, tokenA],
      expectedProfit: (finalAmountAWithFees - startAmount) * prices[tokenA],
      profitPercent,
      volume: startAmount,
      gasEstimate: 450000, // Estimated for 3 swaps
      confidence: 0.75, // Lower confidence for triangular
      executionTime: 45,
      riskScore: calculateArbitrageRisk(profitPercent, 450000),
      validUntil: new Date(Date.now() + 90000) // 1.5 minutes
    };
  } catch (error) {
    return null;
  }
}

async function getMultiProtocolQuotes(
  tokenIn: string,
  tokenOut: string,
  amount: number,
  protocols: string[]
): Promise<any[]> {
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

async function simulateProtocolQuote(
  tokenIn: string,
  tokenOut: string,
  amount: number,
  protocol: string
): Promise<any> {
  const prices = getTokenPrices();
  const fees = getProtocolFees(protocol);
  const gasEstimate = getProtocolGasEstimate(protocol);
  
  const baseAmountOut = (amount * prices[tokenIn]) / prices[tokenOut];
  const amountOut = baseAmountOut * (1 - fees);
  
  return {
    protocol,
    amountOut,
    gasEstimate,
    fees: fees * 100,
    executionTime: Math.random() * 30 + 10,
    confidence: 0.8 + Math.random() * 0.15
  };
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

function getTokenPrice(token: string): number {
  const prices = getTokenPrices();
  return prices[token] || 1;
}

function getProtocolFees(protocol: string): number {
  const feeMap: Record<string, number> = {
    'symphony': 0.002, // 0.2%
    'uniswap': 0.003, // 0.3%
    'sushi': 0.003,
    'curve': 0.0004, // 0.04%
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

function calculateArbitrageRisk(profitPercent: number, gasEstimate: number): number {
  // Risk increases with higher gas costs and lower profit margins
  const gasCostRisk = Math.min(gasEstimate / 500000, 1);
  const profitMarginRisk = Math.max(0, (2 - profitPercent) / 2);
  return (gasCostRisk * 0.4 + profitMarginRisk * 0.6);
}

async function executeArbitrage(opportunity: ArbitrageOpportunity): Promise<any> {
  // Simulate arbitrage execution
  await new Promise(resolve => setTimeout(resolve, opportunity.executionTime * 100)); // Faster simulation
  
  const slippageFactor = 0.995 + Math.random() * 0.01; // 0.5-1.5% slippage
  const actualProfit = opportunity.expectedProfit * slippageFactor;
  
  return {
    arbitrageId: opportunity.id,
    actualProfit,
    profitPercent: (actualProfit / opportunity.volume) * 100,
    txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    executionTime: opportunity.executionTime,
    gasUsed: opportunity.gasEstimate
  };
}

async function updateArbitrageState(runtime: IAgentRuntime, updates: any): Promise<void> {
  const currentState = runtime.character?.settings?.state || {};
  const newState = { ...currentState, ...updates };
  
  if (runtime.character?.settings) {
    runtime.character.settings.state = newState;
  }
}

export default arbitrageAction;