/**
 * Symphony Protocol Usage Examples
 * 
 * This file demonstrates various ways to use the Symphony Protocol Wrapper
 * for token swapping and liquidity management on the Sei network.
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sei } from 'viem/chains';

import {
  createSymphonyProtocolWrapper,
  defaultSymphonyConfig,
  defaultSymphonyIntegrationConfig,
  SwapQuoteRequest,
  SwapExecuteRequest,
  RouteRequest,
  SYMPHONY_TOKENS,
  SLIPPAGE_LEVELS,
  calculateMinimumAmountOut,
  formatTokenAmount,
  parseTokenAmount,
  formatSymphonyError,
} from '../index';

import { createEnhancedLiquidityManager, SwapOptions } from '../../../liquidity/EnhancedLiquidityManager';
import { withErrorHandling, createErrorContext } from '../errors';

// Setup clients
const publicClient = createPublicClient({
  chain: sei,
  transport: http('https://evm-rpc.sei-apis.com'),
});

const walletClient = createWalletClient({
  chain: sei,
  transport: http('https://evm-rpc.sei-apis.com'),
  account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}` || '0x0000000000000000000000000000000000000000000000000000000000000001'),
});

// Create Symphony wrapper
const symphonyWrapper = createSymphonyProtocolWrapper(
  defaultSymphonyConfig,
  defaultSymphonyIntegrationConfig,
  publicClient,
  walletClient
);

// Create enhanced liquidity manager
const liquidityManager = createEnhancedLiquidityManager(publicClient, walletClient);

/**
 * Example 1: Basic Token Swap
 */
export async function basicTokenSwap() {
  console.log('=== Basic Token Swap Example ===');

  const amount = '1'; // 1 SEI
  const amountWei = parseTokenAmount(amount, 18);

  // Step 1: Get quote
  const quoteRequest: SwapQuoteRequest = {
    tokenIn: SYMPHONY_TOKENS.SEI.address,
    tokenOut: SYMPHONY_TOKENS.USDC.address,
    amountIn: amountWei,
    slippagePercent: SLIPPAGE_LEVELS.MEDIUM,
  };

  console.log(`Getting quote for ${amount} SEI → USDC...`);

  const quoteResult = await symphonyWrapper.getQuote(quoteRequest)();

  if (E.isLeft(quoteResult)) {
    console.error('Quote failed:', formatSymphonyError(quoteResult.left));
    return;
  }

  const quote = quoteResult.right;
  const outputAmount = formatTokenAmount(quote.route.outputAmount, SYMPHONY_TOKENS.USDC.decimals);
  console.log(`Quote: ${amount} SEI → ${outputAmount} USDC`);
  console.log(`Price Impact: ${quote.route.priceImpact.toFixed(2)}%`);
  console.log(`Gas Estimate: ${quote.route.gasEstimate}`);

  // Step 2: Execute swap
  const executeRequest: SwapExecuteRequest = {
    tokenIn: SYMPHONY_TOKENS.SEI.address,
    tokenOut: SYMPHONY_TOKENS.USDC.address,
    amountIn: amountWei,
    amountOutMinimum: quote.slippageAdjustedAmountOut,
    recipient: await walletClient.account?.address || '0x0000000000000000000000000000000000000000',
    deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    routeId: quote.route.id,
    slippagePercent: SLIPPAGE_LEVELS.MEDIUM,
  };

  console.log('Executing swap...');

  const executeResult = await symphonyWrapper.executeSwap(executeRequest)();

  if (E.isLeft(executeResult)) {
    console.error('Swap failed:', formatSymphonyError(executeResult.left));
    return;
  }

  const result = executeResult.right;
  console.log(`Swap successful! TX: ${result.txHash}`);
  console.log(`Actual output: ${formatTokenAmount(result.actualAmountOut, SYMPHONY_TOKENS.USDC.decimals)} USDC`);
}

/**
 * Example 2: Route Comparison and Optimization
 */
export async function routeOptimization() {
  console.log('\n=== Route Optimization Example ===');

  const routeRequest: RouteRequest = {
    tokenIn: SYMPHONY_TOKENS.SEI.address,
    tokenOut: SYMPHONY_TOKENS.USDC.address,
    amountIn: parseTokenAmount('10', 18), // 10 SEI
    maxRoutes: 5,
  };

  console.log('Finding optimal routes...');

  const routesResult = await symphonyWrapper.getRoutes(routeRequest)();

  if (E.isLeft(routesResult)) {
    console.error('Route discovery failed:', formatSymphonyError(routesResult.left));
    return;
  }

  const routes = routesResult.right;
  console.log(`Found ${routes.routes.length} routes:`);

  routes.routes.forEach((route, index) => {
    const outputAmount = formatTokenAmount(route.outputAmount, SYMPHONY_TOKENS.USDC.decimals);
    console.log(`Route ${index + 1}:`);
    console.log(`  Output: ${outputAmount} USDC`);
    console.log(`  Price Impact: ${route.priceImpact.toFixed(2)}%`);
    console.log(`  Gas: ${route.gasEstimate}`);
    console.log(`  Hops: ${route.routes.length}`);
    console.log(`  Total Fee: ${route.fees.totalFee}`);
  });

  console.log('\nBest route:');
  const bestRoute = routes.bestRoute;
  const bestOutput = formatTokenAmount(bestRoute.outputAmount, SYMPHONY_TOKENS.USDC.decimals);
  console.log(`  Output: ${bestOutput} USDC`);
  console.log(`  Price Impact: ${bestRoute.priceImpact.toFixed(2)}%`);
}

/**
 * Example 3: Advanced Route Analysis
 */
export async function advancedRouteAnalysis() {
  console.log('\n=== Advanced Route Analysis Example ===');

  const amount = '5'; // 5 SEI
  const amountWei = parseTokenAmount(amount, 18);

  // Find optimal route with specific parameters
  const routeAnalysisResult = await symphonyWrapper.findOptimalRoute(
    {
      tokenIn: SYMPHONY_TOKENS.SEI.address,
      tokenOut: SYMPHONY_TOKENS.USDC.address,
      amountIn: amountWei,
    },
    {
      optimizeFor: 'price',
      maxHops: 3,
      riskTolerance: 'medium',
    }
  )();

  if (E.isLeft(routeAnalysisResult)) {
    console.error('Route analysis failed:', formatSymphonyError(routeAnalysisResult.left));
    return;
  }

  const analysis = routeAnalysisResult.right;
  console.log('Optimal Route Analysis:');
  console.log(`  Risk Score: ${analysis.riskScore}`);
  console.log(`  Efficiency Score: ${analysis.efficiencyScore}`);
  console.log(`  Cost Analysis:`);
  console.log(`    Gas Cost: ${analysis.costAnalysis.gasCost}`);
  console.log(`    Protocol Fees: ${analysis.costAnalysis.protocolFees}`);
  console.log(`    Price Impact: ${analysis.costAnalysis.priceImpact}%`);
  console.log(`    Total Cost: ${analysis.costAnalysis.totalCost}`);

  // Analyze swap impact
  const impactAnalysisResult = await symphonyWrapper.analyzeSwapImpact({
    tokenIn: SYMPHONY_TOKENS.SEI.address,
    tokenOut: SYMPHONY_TOKENS.USDC.address,
    amountIn: amountWei,
    slippagePercent: SLIPPAGE_LEVELS.MEDIUM,
  })();

  if (E.isRight(impactAnalysisResult)) {
    const impact = impactAnalysisResult.right;
    console.log('\nSwap Impact Analysis:');
    console.log(`  Price Impact: ${impact.priceImpact.toFixed(2)}%`);
    console.log(`  Slippage Risk: ${impact.slippageRisk}`);
    console.log(`  Liquidity Depth: ${impact.liquidityDepth}`);
    console.log(`  Recommendation: ${impact.recommendation}`);
  }
}

/**
 * Example 4: Enhanced Liquidity Manager Usage
 */
export async function enhancedLiquidityManagerExample() {
  console.log('\n=== Enhanced Liquidity Manager Example ===');

  const swapOptions: SwapOptions = {
    tokenIn: SYMPHONY_TOKENS.SEI.address,
    tokenOut: SYMPHONY_TOKENS.USDC.address,
    amountIn: parseTokenAmount('2', 18), // 2 SEI
    slippagePercent: SLIPPAGE_LEVELS.MEDIUM,
    recipient: await walletClient.account?.address || '0x0000000000000000000000000000000000000000',
    deadline: Math.floor(Date.now() / 1000) + 300,
    optimizeFor: 'price',
    maxHops: 3,
  };

  console.log('Getting optimal swap route...');

  const comparisonResult = await liquidityManager.getOptimalSwapRoute(swapOptions)();

  if (E.isLeft(comparisonResult)) {
    console.error('Route comparison failed:', formatSymphonyError(comparisonResult.left));
    return;
  }

  const comparison = comparisonResult.right;
  console.log('Route Comparison:');
  console.log(`  Best Route: ${comparison.bestRoute}`);
  console.log(`  Reasoning: ${comparison.reasoning}`);
  console.log(`  Savings: ${comparison.savings}`);
  console.log(`  Risk Assessment: ${comparison.riskAssessment}`);

  // Execute optimal swap
  console.log('\nExecuting optimal swap...');

  const executeResult = await liquidityManager.executeOptimalSwap(swapOptions)();

  if (E.isLeft(executeResult)) {
    console.error('Optimal swap failed:', formatSymphonyError(executeResult.left));
    return;
  }

  const result = executeResult.right;
  console.log(`Optimal swap successful! TX: ${result.txHash}`);
}

/**
 * Example 5: Error Handling and Recovery
 */
export async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');

  // Example with invalid token address
  const invalidQuoteRequest: SwapQuoteRequest = {
    tokenIn: 'invalid-address',
    tokenOut: SYMPHONY_TOKENS.USDC.address,
    amountIn: parseTokenAmount('1', 18),
    slippagePercent: SLIPPAGE_LEVELS.MEDIUM,
  };

  const context = createErrorContext('getQuote', await walletClient.account?.address);

  const wrappedOperation = withErrorHandling(
    () => symphonyWrapper.getQuote(invalidQuoteRequest),
    context
  );

  const result = await wrappedOperation();

  if (E.isLeft(result)) {
    console.log('Enhanced Error Information:');
    console.log(`  Error Code: ${result.left.errorCode}`);
    console.log(`  Severity: ${result.left.severity}`);
    console.log(`  User Message: ${result.left.userMessage}`);
    console.log(`  Technical Message: ${result.left.technicalMessage}`);
    console.log(`  Recovery Strategy: ${result.left.recoveryStrategy.recoveryAction}`);
    console.log(`  Can Recover: ${result.left.recoveryStrategy.canRecover}`);
    if (result.left.helpUrl) {
      console.log(`  Help URL: ${result.left.helpUrl}`);
    }
  }
}

/**
 * Example 6: Analytics and Monitoring
 */
export async function analyticsExample() {
  console.log('\n=== Analytics Example ===');

  // Get Symphony protocol analytics
  const analyticsResult = await symphonyWrapper.getAnalytics()();

  if (E.isRight(analyticsResult)) {
    const analytics = analyticsResult.right;
    console.log('Symphony Analytics:');
    console.log(`  24h Volume: ${analytics.volume24h}`);
    console.log(`  24h Fees: ${analytics.fees24h}`);
    console.log(`  24h Transactions: ${analytics.transactionCount24h}`);
    console.log(`  24h Unique Users: ${analytics.uniqueUsers24h}`);
    console.log(`  Average Slippage: ${analytics.averageSlippage.toFixed(2)}%`);
    console.log('  Top Pairs:');
    analytics.topPairs.forEach((pair, index) => {
      console.log(`    ${index + 1}. ${pair.pair}: ${pair.volume} volume, ${pair.fees} fees`);
    });
  }

  // Get protocol statistics
  const statsResult = await symphonyWrapper.getProtocolStats()();

  if (E.isRight(statsResult)) {
    const stats = statsResult.right;
    console.log('\nProtocol Statistics:');
    console.log(`  Total Value Locked: ${stats.totalValueLocked}`);
    console.log(`  24h Volume: ${stats.volume24h}`);
    console.log(`  24h Fees: ${stats.fees24h}`);
    console.log(`  Active Routes: ${stats.activeRoutes}`);
    console.log(`  Supported Tokens: ${stats.supportedTokens}`);
  }

  // Get enhanced liquidity analytics
  const liquidityAnalyticsResult = await liquidityManager.getAnalytics()();

  if (E.isRight(liquidityAnalyticsResult)) {
    const liquidityAnalytics = liquidityAnalyticsResult.right;
    console.log('\nLiquidity Manager Analytics:');
    console.log(`  Total Swap Volume: ${liquidityAnalytics.totalSwapVolume}`);
    console.log(`  Average Slippage: ${liquidityAnalytics.averageSlippage.toFixed(2)}%`);
    console.log(`  Protocol Usage:`);
    console.log(`    DragonSwap: ${liquidityAnalytics.protocolUsageStats.dragonSwap} swaps`);
    console.log(`    Symphony: ${liquidityAnalytics.protocolUsageStats.symphony} swaps`);
    console.log(`  Cost Savings: ${liquidityAnalytics.costSavings}`);
    console.log(`  Success Rate: ${liquidityAnalytics.successRate.toFixed(2)}%`);
  }
}

/**
 * Example 7: Cross-Protocol Route Discovery
 */
export async function crossProtocolExample() {
  console.log('\n=== Cross-Protocol Route Example ===');

  const routeRequest: RouteRequest = {
    tokenIn: SYMPHONY_TOKENS.SEI.address,
    tokenOut: SYMPHONY_TOKENS.USDC.address,
    amountIn: parseTokenAmount('1', 18),
  };

  const crossProtocolRoutesResult = await symphonyWrapper.getCrossProtocolRoutes(routeRequest)();

  if (E.isRight(crossProtocolRoutesResult)) {
    const routes = crossProtocolRoutesResult.right;
    console.log(`Found ${routes.length} cross-protocol routes:`);

    routes.forEach((route, index) => {
      console.log(`\nRoute ${index + 1}:`);
      console.log(`  Protocols: ${route.protocols.join(' → ')}`);
      console.log(`  Steps: ${route.steps.length}`);
      console.log(`  Total Gas Estimate: ${route.totalGasEstimate}`);
      console.log(`  Total Fees: ${route.totalFees}`);
      console.log(`  Execution Risk: ${route.executionRisk}`);
      console.log(`  Estimated Duration: ${route.estimatedDuration}s`);
    });
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    await basicTokenSwap();
    await routeOptimization();
    await advancedRouteAnalysis();
    await enhancedLiquidityManagerExample();
    await errorHandlingExample();
    await analyticsExample();
    await crossProtocolExample();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples()
    .then(() => {
      console.log('\n=== All examples completed ===');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Examples failed:', error);
      process.exit(1);
    });
}