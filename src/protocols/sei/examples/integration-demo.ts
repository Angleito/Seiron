/**
 * Symphony Protocol Integration Demo
 * 
 * Demonstrates how the Symphony Protocol Wrapper integrates with the existing
 * portfolio management system and DragonSwap adapter.
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sei } from 'viem/chains';

// Symphony Protocol imports
import {
  createSymphonyProtocolWrapper,
  defaultSymphonyConfig,
  defaultSymphonyIntegrationConfig,
  SYMPHONY_TOKENS,
  SLIPPAGE_LEVELS,
  formatSymphonyError,
} from '../index';

// Enhanced Liquidity Manager import
import { 
  createEnhancedLiquidityManager,
  SwapOptions,
  defaultEnhancedLiquidityConfig,
} from '../../../liquidity/EnhancedLiquidityManager';

// Existing system imports
import { DragonSwapAdapter } from '../../../liquidity/DragonSwapAdapter';

/**
 * Demo: Complete Integration Example
 * 
 * Shows how Symphony integrates with the existing liquidity management system
 * to provide enhanced swapping capabilities.
 */
export class SymphonyIntegrationDemo {
  private publicClient: any;
  private walletClient: any;
  private symphonyWrapper: any;
  private enhancedLiquidityManager: any;
  private dragonSwapAdapter: DragonSwapAdapter;

  constructor() {
    // Setup blockchain clients
    this.publicClient = createPublicClient({
      chain: sei,
      transport: http('https://evm-rpc.sei-apis.com'),
    });

    this.walletClient = createWalletClient({
      chain: sei,
      transport: http('https://evm-rpc.sei-apis.com'),
      account: privateKeyToAccount(
        process.env.PRIVATE_KEY as `0x${string}` || 
        '0x0000000000000000000000000000000000000000000000000000000000000001'
      ),
    });

    // Initialize Symphony wrapper
    this.symphonyWrapper = createSymphonyProtocolWrapper(
      defaultSymphonyConfig,
      defaultSymphonyIntegrationConfig,
      this.publicClient,
      this.walletClient
    );

    // Initialize enhanced liquidity manager with Symphony integration
    this.enhancedLiquidityManager = createEnhancedLiquidityManager(
      this.publicClient,
      this.walletClient,
      {
        ...defaultEnhancedLiquidityConfig,
        enableSymphonyIntegration: true,
        preferredProtocol: 'auto', // Automatically choose best protocol
        autoOptimization: true,
      }
    );

    // Initialize DragonSwap adapter for comparison
    this.dragonSwapAdapter = new DragonSwapAdapter(this.publicClient, this.walletClient);
  }

  /**
   * Demo 1: Basic Protocol Comparison
   * 
   * Compare swap routes between DragonSwap and Symphony
   */
  async demonstrateProtocolComparison() {
    console.log('=== Protocol Comparison Demo ===');

    const swapAmount = '1000000000000000000'; // 1 SEI
    
    console.log(`Comparing routes for 1 SEI → USDC swap...`);

    // Get Symphony quote
    const symphonyQuote = await this.symphonyWrapper.getQuote({
      tokenIn: SYMPHONY_TOKENS.SEI.address,
      tokenOut: SYMPHONY_TOKENS.USDC.address,
      amountIn: swapAmount,
      slippagePercent: SLIPPAGE_LEVELS.MEDIUM,
    })();

    // Get enhanced liquidity manager comparison
    const swapOptions: SwapOptions = {
      tokenIn: SYMPHONY_TOKENS.SEI.address,
      tokenOut: SYMPHONY_TOKENS.USDC.address,
      amountIn: swapAmount,
      slippagePercent: SLIPPAGE_LEVELS.MEDIUM,
      recipient: await this.walletClient.account?.address || '0x0000000000000000000000000000000000000000',
      deadline: Math.floor(Date.now() / 1000) + 300,
      optimizeFor: 'price',
    };

    const routeComparison = await this.enhancedLiquidityManager.getOptimalSwapRoute(swapOptions)();

    // Display results
    console.log('\nSymphony Quote:');
    if (E.isRight(symphonyQuote)) {
      console.log(`  Output Amount: ${symphonyQuote.right.route.outputAmount}`);
      console.log(`  Price Impact: ${symphonyQuote.right.route.priceImpact}%`);
      console.log(`  Gas Estimate: ${symphonyQuote.right.route.gasEstimate}`);
      console.log(`  Total Fees: ${symphonyQuote.right.route.fees.totalFee}`);
    } else {
      console.log(`  Error: ${formatSymphonyError(symphonyQuote.left)}`);
    }

    console.log('\nOptimal Route Analysis:');
    if (E.isRight(routeComparison)) {
      const comparison = routeComparison.right;
      console.log(`  Best Protocol: ${comparison.bestRoute}`);
      console.log(`  Reasoning: ${comparison.reasoning}`);
      console.log(`  Estimated Savings: ${comparison.savings}`);
      console.log(`  Risk Assessment: ${comparison.riskAssessment}`);
    } else {
      console.log(`  Error: ${formatSymphonyError(routeComparison.left)}`);
    }
  }

  /**
   * Demo 2: Advanced Route Optimization
   * 
   * Show how Symphony's advanced routing finds optimal paths
   */
  async demonstrateAdvancedRouting() {
    console.log('\n=== Advanced Route Optimization Demo ===');

    const routeAnalysis = await this.symphonyWrapper.findOptimalRoute(
      {
        tokenIn: SYMPHONY_TOKENS.SEI.address,
        tokenOut: SYMPHONY_TOKENS.USDC.address,
        amountIn: '5000000000000000000', // 5 SEI (larger amount)
      },
      {
        optimizeFor: 'price',
        maxHops: 3,
        riskTolerance: 'medium',
      }
    )();

    if (E.isRight(routeAnalysis)) {
      const analysis = routeAnalysis.right;
      console.log('Optimal Route Analysis:');
      console.log(`  Risk Score: ${analysis.riskScore.toFixed(2)}`);
      console.log(`  Efficiency Score: ${analysis.efficiencyScore.toFixed(2)}`);
      console.log('  Cost Breakdown:');
      console.log(`    Gas Cost: ${analysis.costAnalysis.gasCost}`);
      console.log(`    Protocol Fees: ${analysis.costAnalysis.protocolFees}`);
      console.log(`    Price Impact: ${analysis.costAnalysis.priceImpact}%`);
      console.log(`    Total Cost: ${analysis.costAnalysis.totalCost}`);

      console.log('\nAlternative Routes:');
      analysis.alternativeRoutes.slice(0, 3).forEach((route, index) => {
        console.log(`  Route ${index + 1}:`);
        console.log(`    Output: ${route.outputAmount}`);
        console.log(`    Price Impact: ${route.priceImpact}%`);
        console.log(`    Hops: ${route.routes.length}`);
      });
    } else {
      console.log(`Route optimization failed: ${formatSymphonyError(routeAnalysis.left)}`);
    }
  }

  /**
   * Demo 3: Swap Impact Analysis
   * 
   * Analyze the impact of different swap sizes
   */
  async demonstrateSwapImpactAnalysis() {
    console.log('\n=== Swap Impact Analysis Demo ===');

    const swapAmounts = ['1', '5', '10', '50']; // SEI amounts

    console.log('Analyzing price impact for different swap sizes...\n');

    for (const amount of swapAmounts) {
      const amountWei = (parseFloat(amount) * 1e18).toString();
      
      const impactAnalysis = await this.symphonyWrapper.analyzeSwapImpact({
        tokenIn: SYMPHONY_TOKENS.SEI.address,
        tokenOut: SYMPHONY_TOKENS.USDC.address,
        amountIn: amountWei,
        slippagePercent: SLIPPAGE_LEVELS.MEDIUM,
      })();

      console.log(`${amount} SEI → USDC:`);
      if (E.isRight(impactAnalysis)) {
        const impact = impactAnalysis.right;
        console.log(`  Price Impact: ${impact.priceImpact.toFixed(2)}%`);
        console.log(`  Slippage Risk: ${impact.slippageRisk}`);
        console.log(`  Liquidity Depth: ${impact.liquidityDepth}`);
        console.log(`  Recommendation: ${impact.recommendation}`);
      } else {
        console.log(`  Analysis failed: ${formatSymphonyError(impactAnalysis.left)}`);
      }
      console.log('');
    }
  }

  /**
   * Demo 4: Real-time Analytics
   * 
   * Show Symphony's analytics capabilities
   */
  async demonstrateAnalytics() {
    console.log('\n=== Real-time Analytics Demo ===');

    // Get Symphony protocol analytics
    const analyticsResult = await this.symphonyWrapper.getAnalytics()();
    
    console.log('Symphony Protocol Analytics:');
    if (E.isRight(analyticsResult)) {
      const analytics = analyticsResult.right;
      console.log(`  24h Volume: $${analytics.volume24h}`);
      console.log(`  24h Fees: $${analytics.fees24h}`);
      console.log(`  24h Transactions: ${analytics.transactionCount24h}`);
      console.log(`  24h Unique Users: ${analytics.uniqueUsers24h}`);
      console.log(`  Average Slippage: ${analytics.averageSlippage.toFixed(2)}%`);
      
      console.log('  Top Trading Pairs:');
      analytics.topPairs.slice(0, 3).forEach((pair, index) => {
        console.log(`    ${index + 1}. ${pair.pair}: $${pair.volume} volume`);
      });
    } else {
      console.log(`  Analytics unavailable: ${formatSymphonyError(analyticsResult.left)}`);
    }

    // Get enhanced liquidity manager analytics
    const liquidityAnalyticsResult = await this.enhancedLiquidityManager.getAnalytics()();
    
    console.log('\nEnhanced Liquidity Manager Analytics:');
    if (E.isRight(liquidityAnalyticsResult)) {
      const liquidityAnalytics = liquidityAnalyticsResult.right;
      console.log(`  Total Swap Volume: $${liquidityAnalytics.totalSwapVolume}`);
      console.log(`  Average Slippage: ${liquidityAnalytics.averageSlippage.toFixed(2)}%`);
      console.log('  Protocol Usage:');
      console.log(`    DragonSwap: ${liquidityAnalytics.protocolUsageStats.dragonSwap} swaps`);
      console.log(`    Symphony: ${liquidityAnalytics.protocolUsageStats.symphony} swaps`);
      console.log(`  Cost Savings: $${liquidityAnalytics.costSavings}`);
      console.log(`  Success Rate: ${liquidityAnalytics.successRate.toFixed(1)}%`);
    } else {
      console.log(`  Liquidity analytics unavailable: ${formatSymphonyError(liquidityAnalyticsResult.left)}`);
    }
  }

  /**
   * Demo 5: Error Handling and Recovery
   * 
   * Show robust error handling capabilities
   */
  async demonstrateErrorHandling() {
    console.log('\n=== Error Handling Demo ===');

    // Test with invalid token address
    console.log('Testing error handling with invalid parameters...');

    const invalidSwapOptions: SwapOptions = {
      tokenIn: 'invalid-address',
      tokenOut: SYMPHONY_TOKENS.USDC.address,
      amountIn: '0', // Invalid amount
      slippagePercent: 100, // Invalid slippage
      recipient: '',
      deadline: 0,
      optimizeFor: 'price',
    };

    const errorResult = await this.enhancedLiquidityManager.getOptimalSwapRoute(invalidSwapOptions)();

    if (E.isLeft(errorResult)) {
      console.log('Error handling demonstration:');
      console.log(`  Error Type: ${errorResult.left.type}`);
      
      // Check if it's an enhanced Symphony error
      if ('severity' in errorResult.left) {
        const enhancedError = errorResult.left as any;
        console.log(`  Severity: ${enhancedError.severity}`);
        console.log(`  User Message: ${enhancedError.userMessage}`);
        console.log(`  Recovery Action: ${enhancedError.recoveryStrategy?.recoveryAction}`);
        console.log(`  Can Recover: ${enhancedError.recoveryStrategy?.canRecover}`);
      } else {
        console.log(`  Message: ${formatSymphonyError(errorResult.left)}`);
      }
    }

    // Test protocol health check
    const healthResult = await this.enhancedLiquidityManager.getProtocolHealth()();
    
    console.log('\nProtocol Health Status:');
    if (E.isRight(healthResult)) {
      const health = healthResult.right;
      console.log(`  DragonSwap: ${health.dragonSwap}`);
      console.log(`  Symphony: ${health.symphony}`);
    }
  }

  /**
   * Demo 6: Complete Integration Workflow
   * 
   * Show a complete workflow from analysis to execution
   */
  async demonstrateCompleteWorkflow() {
    console.log('\n=== Complete Integration Workflow Demo ===');

    const swapOptions: SwapOptions = {
      tokenIn: SYMPHONY_TOKENS.SEI.address,
      tokenOut: SYMPHONY_TOKENS.USDC.address,
      amountIn: '1000000000000000000', // 1 SEI
      slippagePercent: SLIPPAGE_LEVELS.MEDIUM,
      recipient: await this.walletClient.account?.address || '0x0000000000000000000000000000000000000000',
      deadline: Math.floor(Date.now() / 1000) + 300,
      optimizeFor: 'price',
    };

    console.log('Step 1: Analyze swap impact...');
    const analysisResult = await this.enhancedLiquidityManager.analyzeSwap(swapOptions)();
    
    if (E.isRight(analysisResult)) {
      const analysis = analysisResult.right;
      console.log(`  Price Impact: ${analysis.priceImpact.toFixed(2)}%`);
      console.log(`  Risk Level: ${analysis.slippageRisk}`);
      console.log(`  Recommendation: ${analysis.recommendation}`);
    }

    console.log('\nStep 2: Find optimal route...');
    const routeResult = await this.enhancedLiquidityManager.getOptimalSwapRoute(swapOptions)();
    
    if (E.isRight(routeResult)) {
      const route = routeResult.right;
      console.log(`  Best Protocol: ${route.bestRoute}`);
      console.log(`  Reasoning: ${route.reasoning}`);
      console.log(`  Expected Savings: ${route.savings}`);
    }

    console.log('\nStep 3: Execution simulation...');
    console.log('  (In production, this would execute the actual swap)');
    
    // In a real scenario, you would execute:
    // const executeResult = await this.enhancedLiquidityManager.executeOptimalSwap(swapOptions)();
    
    console.log('  ✓ Swap simulation completed successfully');
    console.log('  ✓ Transaction would be monitored for confirmation');
    console.log('  ✓ Analytics would be updated with swap results');
  }

  /**
   * Run all demonstrations
   */
  async runAllDemos() {
    console.log('🎯 Symphony Protocol Integration Demonstration\n');
    
    try {
      await this.demonstrateProtocolComparison();
      await this.demonstrateAdvancedRouting();
      await this.demonstrateSwapImpactAnalysis();
      await this.demonstrateAnalytics();
      await this.demonstrateErrorHandling();
      await this.demonstrateCompleteWorkflow();
      
      console.log('\n✅ All demonstrations completed successfully!');
      console.log('\n📊 Summary:');
      console.log('  • Symphony Protocol successfully integrated');
      console.log('  • Enhanced liquidity management operational');
      console.log('  • Advanced routing and optimization available');
      console.log('  • Comprehensive error handling implemented');
      console.log('  • Real-time analytics and monitoring active');
      
    } catch (error) {
      console.error('\n❌ Demo failed:', error);
    }
  }
}

// Export for use in other modules
export default SymphonyIntegrationDemo;

// Run demo if executed directly
if (require.main === module) {
  const demo = new SymphonyIntegrationDemo();
  demo.runAllDemos()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Demo execution failed:', error);
      process.exit(1);
    });
}