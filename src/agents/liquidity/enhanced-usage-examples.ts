/**
 * Enhanced Liquidity Agent Usage Examples
 * 
 * Demonstrates the new Symphony Protocol integration and arbitrage capabilities
 * added to the Concentrated Liquidity Pool (CLP) Agent.
 */

import { createPublicClient, createWalletClient, http } from 'viem';
import { CLPAgent } from './CLPAgent';
import { AgentConfig } from '../base/BaseAgent';

// Example configuration for the enhanced agent
const sampleConfig: AgentConfig = {
  id: 'enhanced-liquidity-agent',
  name: 'Enhanced Liquidity Agent',
  version: '2.0.0',
  description: 'Concentrated liquidity agent with Symphony Protocol and arbitrage capabilities',
  capabilities: [
    'concentrated_liquidity_management',
    'symphony_protocol_integration',
    'cross_protocol_arbitrage',
    'multi_protocol_routing',
    'gas_optimization',
    'mev_protection'
  ]
};

// Setup clients (example configuration)
const publicClient = createPublicClient({
  transport: http('https://rpc.sei.io'),
});

const walletClient = createWalletClient({
  transport: http('https://rpc.sei.io'),
});

/**
 * Example 1: Basic Symphony Swap
 * Demonstrates how to execute a swap using Symphony Protocol
 */
export async function symphonySwapExample() {
  console.log('=== Symphony Swap Example ===');
  
  const agent = new CLPAgent(sampleConfig, publicClient, walletClient);
  
  try {
    const result = await agent.executeAction('symphony_swap', {
      tokenIn: 'USDC',
      tokenOut: 'ETH',
      amountIn: '1000',
      slippagePercent: 0.5
    });
    
    console.log('Symphony swap result:', result);
    console.log('Savings compared to single protocol:', result.data?.savings);
    console.log('Execution metrics:', result.data?.executionMetrics);
    
  } catch (error) {
    console.error('Symphony swap failed:', error);
  }
}

/**
 * Example 2: Multi-Protocol Quote Comparison
 * Shows how to compare quotes across multiple protocols
 */
export async function multiProtocolQuoteExample() {
  console.log('=== Multi-Protocol Quote Comparison ===');
  
  const agent = new CLPAgent(sampleConfig, publicClient, walletClient);
  
  try {
    const result = await agent.executeAction('multi_protocol_quote', {
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      amountIn: '5',
      protocols: ['symphony', 'uniswap', 'sushi', 'curve']
    });
    
    console.log('Quote comparison results:');
    console.log('Best quote:', result.data?.bestQuote);
    console.log('All quotes:', result.data?.quotes);
    console.log('Savings analysis:', result.data?.comparison);
    console.log('Recommendations:', result.data?.recommendation);
    
  } catch (error) {
    console.error('Quote comparison failed:', error);
  }
}

/**
 * Example 3: Arbitrage Detection
 * Demonstrates automated arbitrage opportunity scanning
 */
export async function arbitrageDetectionExample() {
  console.log('=== Arbitrage Detection Example ===');
  
  const agent = new CLPAgent(sampleConfig, publicClient, walletClient);
  
  try {
    const result = await agent.executeAction('detect_arbitrage', {
      tokens: ['USDC', 'USDT', 'DAI', 'ETH', 'SEI'],
      minProfitThreshold: 0.3, // 0.3% minimum profit
      maxGasPrice: 100 // 100 gwei max
    });
    
    console.log('Arbitrage scan results:');
    console.log(`Found ${result.data?.opportunities.length} opportunities`);
    console.log('Total potential profit:', result.data?.totalPotentialProfit);
    console.log('Urgent opportunities:', result.data?.urgentOpportunities.length);
    console.log('Risk analysis:', result.data?.riskAnalysis);
    
    // Display top 3 opportunities
    result.data?.opportunities.slice(0, 3).forEach((opp: any, index: number) => {
      console.log(`\nOpportunity ${index + 1}:`);
      console.log(`- Type: ${opp.type}`);
      console.log(`- Protocols: ${opp.protocols.join(' → ')}`);
      console.log(`- Expected profit: $${opp.expectedProfit.toFixed(2)} (${opp.profitPercent.toFixed(2)}%)`);
      console.log(`- Risk score: ${(opp.riskScore * 100).toFixed(1)}%`);
      console.log(`- Confidence: ${(opp.confidence * 100).toFixed(1)}%`);
      console.log(`- Valid until: ${opp.validUntil.toLocaleTimeString()}`);
    });
    
  } catch (error) {
    console.error('Arbitrage detection failed:', error);
  }
}

/**
 * Example 4: Execute Arbitrage Opportunity
 * Shows how to execute a detected arbitrage opportunity
 */
export async function executeArbitrageExample() {
  console.log('=== Execute Arbitrage Example ===');
  
  const agent = new CLPAgent(sampleConfig, publicClient, walletClient);
  
  try {
    // First detect opportunities
    const detectionResult = await agent.executeAction('detect_arbitrage', {
      tokens: ['USDC', 'USDT', 'ETH'],
      minProfitThreshold: 0.5
    });
    
    if (detectionResult.data?.opportunities.length > 0) {
      const bestOpportunity = detectionResult.data.opportunities[0];
      console.log('Executing best opportunity:', bestOpportunity.id);
      
      // Execute the arbitrage
      const executionResult = await agent.executeAction('execute_arbitrage', {
        arbitrageId: bestOpportunity.id,
        maxSlippage: 1.0
      });
      
      console.log('Arbitrage execution results:');
      console.log('Actual profit:', executionResult.data?.actualProfit);
      console.log('Profit percentage:', executionResult.data?.profitPercent);
      console.log('Execution time:', executionResult.data?.executionTime);
      console.log('Gas used:', executionResult.data?.gasUsed);
      console.log('Slippage experienced:', executionResult.data?.slippage);
      
    } else {
      console.log('No arbitrage opportunities found');
    }
    
  } catch (error) {
    console.error('Arbitrage execution failed:', error);
  }
}

/**
 * Example 5: Optimal Route Analysis
 * Demonstrates advanced route optimization capabilities
 */
export async function optimalRouteAnalysisExample() {
  console.log('=== Optimal Route Analysis Example ===');
  
  const agent = new CLPAgent(sampleConfig, publicClient, walletClient);
  
  try {
    const result = await agent.executeAction('optimal_route_analysis', {
      tokenIn: 'SEI',
      tokenOut: 'USDC',
      amountIn: '10000',
      optimizationParams: {
        prioritizeGasEfficiency: true,
        prioritizeBestPrice: false,
        maxSlippage: 0.8,
        maxHops: 2
      }
    });
    
    console.log('Route analysis results:');
    console.log('Optimal route:', result.data?.optimalRoute);
    console.log('Alternative routes:', result.data?.alternativeRoutes);
    console.log('Recommendations:', result.data?.recommendation);
    console.log('Execution plan:', result.data?.executionPlan);
    
  } catch (error) {
    console.error('Route analysis failed:', error);
  }
}

/**
 * Example 6: Enhanced Swap with Multi-Protocol Comparison
 * Shows the enhanced swap action with automatic protocol selection
 */
export async function enhancedSwapExample() {
  console.log('=== Enhanced Swap with Multi-Protocol Comparison ===');
  
  const agent = new CLPAgent(sampleConfig, publicClient, walletClient);
  
  try {
    // Using the enhanced swap action from the actions module
    const result = await agent.executeAction('swap', {
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      amountIn: 2.5,
      enableMultiProtocol: true,
      prioritizeGasEfficiency: false,
      slippage: 0.5
    });
    
    console.log('Enhanced swap results:');
    console.log('Protocol used:', result.data?.protocol);
    console.log('Execution price:', result.data?.executionPrice);
    console.log('Price impact:', result.data?.priceImpact);
    
    if (result.data?.protocolComparison) {
      console.log('Protocol comparison:');
      console.log(`- Quotes checked: ${result.data.protocolComparison.quotesChecked}`);
      console.log(`- Best protocol: ${result.data.protocolComparison.bestProtocol}`);
      console.log(`- Savings: ${result.data.protocolComparison.savings}`);
    }
    
    if (result.data?.arbitrageDetected) {
      console.log('⚡ Bonus: Arbitrage opportunity detected during swap!');
    }
    
    if (result.data?.routeOptimization) {
      console.log('Route optimization:');
      console.log(`- Hops used: ${result.data.routeOptimization.hopsUsed}`);
      console.log(`- Gas efficiency: ${result.data.routeOptimization.gasEfficiency}%`);
      console.log(`- Price optimization: ${result.data.routeOptimization.priceOptimization}%`);
    }
    
  } catch (error) {
    console.error('Enhanced swap failed:', error);
  }
}

/**
 * Example 7: Comprehensive Portfolio Status with Symphony Integration
 * Shows the enhanced portfolio monitoring capabilities
 */
export async function comprehensivePortfolioExample() {
  console.log('=== Comprehensive Portfolio Status ===');
  
  const agent = new CLPAgent(sampleConfig, publicClient, walletClient);
  
  try {
    // Create some sample positions first
    await agent.executeAction('create_position', {
      pool: 'ETH/USDC-0.05%',
      amount0: 1000,
      amount1: 2500000,
      strategy: 'dynamic_range'
    });
    
    // Get comprehensive status
    const result = await agent.executeAction('get_portfolio_status', {});
    
    console.log('Portfolio status:');
    console.log('Total value locked:', result.data?.state.totalValueLocked);
    console.log('Total positions:', result.data?.state.totalPositions);
    console.log('Average utilization:', result.data?.state.averageUtilization);
    console.log('Average fee APR:', result.data?.state.averageFeeAPR);
    console.log('Risk score:', result.data?.state.riskScore);
    
    console.log('\nDetailed position analysis:');
    result.data?.detailedPositions.forEach((position: any, index: number) => {
      console.log(`Position ${index + 1}:`);
      console.log(`- Pool: ${position.pool}`);
      console.log(`- Strategy: ${position.strategy}`);
      console.log(`- Status: ${position.status}`);
      console.log(`- Current value: $${position.detailedMetrics.currentValue}`);
      console.log(`- ROI: ${position.detailedMetrics.roi}%`);
      console.log(`- Days active: ${position.detailedMetrics.daysActive}`);
    });
    
    console.log('\nOptimization suggestions:');
    result.data?.optimizationSuggestions.forEach((suggestion: string) => {
      console.log(`- ${suggestion}`);
    });
    
  } catch (error) {
    console.error('Portfolio status retrieval failed:', error);
  }
}

/**
 * Example 8: Automated Arbitrage Monitoring
 * Demonstrates continuous arbitrage monitoring and execution
 */
export async function automatedArbitrageMonitoring() {
  console.log('=== Automated Arbitrage Monitoring ===');
  
  const agent = new CLPAgent(sampleConfig, publicClient, walletClient);
  
  // Simulate continuous monitoring
  let monitoringActive = true;
  let executionCount = 0;
  
  console.log('Starting automated arbitrage monitoring...');
  
  const monitoringInterval = setInterval(async () => {
    try {
      const result = await agent.executeAction('detect_arbitrage', {
        tokens: ['USDC', 'USDT', 'DAI', 'ETH'],
        minProfitThreshold: 0.4,
        maxGasPrice: 80
      });
      
      if (result.data?.opportunities.length > 0) {
        const bestOpp = result.data.opportunities[0];
        
        // Auto-execute if conditions are met
        if (bestOpp.riskScore < 0.5 && bestOpp.confidence > 0.85 && bestOpp.profitPercent > 0.6) {
          console.log(`\n🚀 Auto-executing arbitrage opportunity ${bestOpp.id}`);
          console.log(`Expected profit: $${bestOpp.expectedProfit.toFixed(2)} (${bestOpp.profitPercent.toFixed(2)}%)`);
          
          const executionResult = await agent.executeAction('execute_arbitrage', {
            arbitrageId: bestOpp.id,
            maxSlippage: 0.8
          });
          
          executionCount++;
          console.log(`✅ Execution ${executionCount} completed`);
          console.log(`Actual profit: $${executionResult.data?.actualProfit.toFixed(2)}`);
          console.log(`Profit rate: ${executionResult.data?.profitPercent.toFixed(2)}%`);
          
          // Stop after 3 executions for demo
          if (executionCount >= 3) {
            console.log('\n📊 Demo completed. Stopping monitoring...');
            clearInterval(monitoringInterval);
          }
        } else {
          console.log(`⏸️  Opportunity found but conditions not met for auto-execution`);
          console.log(`Risk: ${(bestOpp.riskScore * 100).toFixed(1)}%, Confidence: ${(bestOpp.confidence * 100).toFixed(1)}%, Profit: ${bestOpp.profitPercent.toFixed(2)}%`);
        }
      } else {
        console.log('🔍 Scanning... no opportunities found');
      }
      
    } catch (error) {
      console.error('Monitoring error:', error);
    }
  }, 5000); // Check every 5 seconds
  
  // Stop monitoring after 2 minutes
  setTimeout(() => {
    clearInterval(monitoringInterval);
    console.log('\n⏹️  Monitoring stopped');
  }, 120000);
}

/**
 * Main demo function
 * Runs all examples in sequence
 */
export async function runEnhancedLiquidityAgentDemo() {
  console.log('🚀 Starting Enhanced Liquidity Agent Demo\n');
  
  try {
    await symphonySwapExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await multiProtocolQuoteExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await arbitrageDetectionExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await executeArbitrageExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await optimalRouteAnalysisExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await enhancedSwapExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await comprehensivePortfolioExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('🎉 All examples completed successfully!');
    console.log('\nTo run automated arbitrage monitoring, call:');
    console.log('automatedArbitrageMonitoring()');
    
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Export all examples for individual use
export {
  symphonySwapExample,
  multiProtocolQuoteExample,
  arbitrageDetectionExample,
  executeArbitrageExample,
  optimalRouteAnalysisExample,
  enhancedSwapExample,
  comprehensivePortfolioExample,
  automatedArbitrageMonitoring
};

// Usage:
// import { runEnhancedLiquidityAgentDemo } from './enhanced-usage-examples';
// runEnhancedLiquidityAgentDemo();