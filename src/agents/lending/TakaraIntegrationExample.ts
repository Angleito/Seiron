/**
 * @fileoverview Example demonstrating Takara Protocol integration with LendingAgent
 * Shows multi-protocol lending, yield optimization, and risk management
 */

import { ethers } from 'ethers';
import { LendingAgent } from './LendingAgent';
import { TakaraProtocolWrapper } from '../../protocols/sei/adapters/TakaraProtocolWrapper';

/**
 * Example demonstrating the enhanced LendingAgent with Takara Protocol integration
 */
export class TakaraIntegrationExample {
  private lendingAgent: LendingAgent;
  private provider: ethers.Provider;
  private signer?: ethers.Signer;

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    
    // Initialize LendingAgent with protocol support
    this.lendingAgent = new LendingAgent(
      {
        id: 'enhanced-lending-agent',
        name: 'Enhanced Lending Agent',
        description: 'Multi-protocol lending agent with Takara integration'
      },
      provider,
      signer
    );
  }

  /**
   * Demonstrate multi-protocol comparison
   */
  async demonstrateProtocolComparison() {
    console.log('🔍 Comparing protocols for USDC lending...\n');
    
    try {
      const comparison = await this.lendingAgent.executeAction('compare_protocols', {
        asset: 'USDC',
        amount: 10000
      });

      if (comparison.success) {
        const data = comparison.data;
        console.log(`Best Protocol: ${data.bestProtocol}`);
        console.log(`Recommendation: ${data.recommendation}\n`);
        
        console.log('Alternative Protocols:');
        data.alternatives.forEach((alt: any, index: number) => {
          console.log(`${index + 1}. ${alt.protocol}: ${alt.apy.toFixed(2)}% APY (Risk: ${(alt.riskScore * 100).toFixed(1)}%)`);
        });
        
        console.log('\nComparison Metrics:');
        console.log(`Rate Difference: ${data.comparison.rateDifference.toFixed(2)}%`);
        console.log(`Risk Difference: ${data.comparison.riskDifference.toFixed(2)}%`);
        console.log(`Gas Cost Difference: ${data.comparison.gasCostComparison} gas`);
      }
    } catch (error) {
      console.error('Protocol comparison failed:', error);
    }
  }

  /**
   * Demonstrate yield optimization across protocols
   */
  async demonstrateYieldOptimization() {
    console.log('\n💰 Optimizing yield allocation for $50,000...\n');
    
    try {
      const optimization = await this.lendingAgent.executeAction('optimize_yield', {
        totalAmount: 50000,
        riskTolerance: 'balanced'
      });

      if (optimization.success) {
        const data = optimization.data;
        
        console.log('Optimal Allocation:');
        data.allocations.forEach((alloc: any) => {
          console.log(`${alloc.protocol}: $${alloc.amount.toLocaleString()} (${alloc.percentage.toFixed(1)}%) - ${alloc.expectedApy.toFixed(2)}% APY`);
        });
        
        console.log('\nProjected Returns:');
        console.log(`Weighted APY: ${data.projectedYield.weightedApy.toFixed(2)}%`);
        console.log(`Annual Return: $${data.projectedYield.estimatedYearlyReturn.toLocaleString()}`);
        console.log(`Monthly Return: $${data.projectedYield.estimatedMonthlyReturn.toLocaleString()}`);
        
        console.log('\nRisk Analysis:');
        console.log(`Overall Risk Score: ${(data.riskMetrics.overallRiskScore * 100).toFixed(1)}%`);
        console.log(`Risk Level: ${data.riskMetrics.riskLevel}`);
        console.log(`Diversification Score: ${(data.riskMetrics.diversificationScore * 100).toFixed(1)}%`);
        console.log(`Recommended Rebalance: ${data.rebalanceFrequency}`);
      }
    } catch (error) {
      console.error('Yield optimization failed:', error);
    }
  }

  /**
   * Demonstrate Takara-specific operations
   */
  async demonstrateTakaraOperations() {
    if (!this.signer) {
      console.log('\n⚠️ Signer required for Takara operations - skipping transaction examples\n');
      return;
    }

    console.log('\n🌊 Demonstrating Takara Protocol operations...\n');
    
    try {
      // Supply SEI to Takara
      console.log('Supplying 100 SEI to Takara Protocol...');
      const supplyResult = await this.lendingAgent.executeAction('takara_supply', {
        asset: 'SEI',
        amount: 100
      });

      if (supplyResult.success) {
        console.log(`✅ Supply successful: ${supplyResult.data.transaction.txHash}`);
        console.log(`New Health Factor: ${supplyResult.data.newHealthFactor}`);
      }

      // Demonstrate borrowing
      console.log('\nAttempting to borrow 50 USDC from Takara...');
      const borrowResult = await this.lendingAgent.executeAction('takara_borrow', {
        asset: 'USDC',
        amount: 50
      });

      if (borrowResult.success) {
        console.log(`✅ Borrow successful: ${borrowResult.data.transaction.txHash}`);
        console.log(`Health Factor: ${borrowResult.data.oldHealthFactor} → ${borrowResult.data.newHealthFactor}`);
        console.log(`Liquidation Risk: ${borrowResult.data.liquidationRisk}`);
      }
    } catch (error) {
      console.error('Takara operations failed:', error);
    }
  }

  /**
   * Demonstrate cross-protocol arbitrage detection
   */
  async demonstrateArbitrageDetection() {
    console.log('\n🔄 Detecting cross-protocol arbitrage opportunities...\n');
    
    try {
      const arbitrage = await this.lendingAgent.executeAction('cross_protocol_arbitrage', {
        asset: 'USDC',
        minProfitBps: 25 // 25 basis points minimum
      });

      if (arbitrage.success) {
        const data = arbitrage.data;
        
        if (data.totalOpportunities > 0) {
          console.log(`Found ${data.totalOpportunities} arbitrage opportunities:\n`);
          
          data.opportunities.forEach((opp: any, index: number) => {
            console.log(`${index + 1}. Borrow from ${opp.borrowFrom}, Lend to ${opp.lendTo}`);
            console.log(`   Rate Difference: ${opp.rateDifference.toFixed(2)}% (${opp.profitBps} bps)`);
            console.log(`   Break-even Amount: $${opp.breakEvenAmount.toLocaleString()}`);
            console.log(`   Max Profitable: $${opp.maxProfitableAmount.toLocaleString()}`);
            console.log(`   Risk Assessment: ${opp.riskAssessment.recommendation}\n`);
          });
          
          if (data.bestOpportunity) {
            console.log(`🎯 Best Opportunity: ${data.bestOpportunity.profitBps} bps profit`);
          }
        } else {
          console.log('No profitable arbitrage opportunities found at current thresholds.');
        }
      }
    } catch (error) {
      console.error('Arbitrage detection failed:', error);
    }
  }

  /**
   * Demonstrate portfolio status and analytics
   */
  async demonstratePortfolioAnalytics() {
    console.log('\n📊 Portfolio Status and Analytics...\n');
    
    try {
      const status = await this.lendingAgent.executeAction('get_portfolio_status', {});

      if (status.success) {
        const data = status.data;
        
        console.log('Portfolio Overview:');
        console.log(`Total Value: $${data.state.totalValue.toLocaleString()}`);
        console.log(`Total Deposited: $${data.state.totalDeposited.toLocaleString()}`);
        console.log(`Total Earned: $${data.state.totalEarned.toLocaleString()}`);
        console.log(`Average APY: ${data.state.averageAPY.toFixed(2)}%`);
        console.log(`Risk Score: ${(data.state.riskScore * 100).toFixed(1)}%`);
        console.log(`Active Positions: ${data.state.positions.length}`);
        
        if (data.state.positions.length > 0) {
          console.log('\nPositions:');
          data.state.positions.forEach((pos: any) => {
            console.log(`• ${pos.asset} on ${pos.protocol}: $${pos.amount.toLocaleString()} (${pos.apy.toFixed(2)}% APY)`);
          });
        }
        
        console.log('\nRisk Analysis:');
        console.log(`Volatility: ${(data.riskAnalysis.volatility * 100).toFixed(2)}%`);
        console.log(`Max Drawdown: ${(data.riskAnalysis.maxDrawdown * 100).toFixed(2)}%`);
        console.log(`Sharpe Ratio: ${data.riskAnalysis.sharpeRatio.toFixed(2)}`);
        
        if (data.alerts.length > 0) {
          console.log('\n⚠️ Active Alerts:');
          data.alerts.forEach((alert: any) => {
            console.log(`• ${alert.severity.toUpperCase()}: ${alert.message}`);
          });
        }
      }
    } catch (error) {
      console.error('Portfolio analytics failed:', error);
    }
  }

  /**
   * Run complete demonstration
   */
  async runFullDemo() {
    console.log('🚀 Enhanced LendingAgent with Takara Integration Demo\n');
    console.log('='+ '='.repeat(60) + '\n');
    
    await this.demonstrateProtocolComparison();
    await this.demonstrateYieldOptimization();
    await this.demonstrateArbitrageDetection();
    await this.demonstrateTakaraOperations();
    await this.demonstratePortfolioAnalytics();
    
    console.log('\n✅ Demo completed successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('• Multi-protocol comparison and selection');
    console.log('• Automated yield optimization');
    console.log('• Cross-protocol arbitrage detection');
    console.log('• Takara Protocol integration');
    console.log('• Advanced risk management');
    console.log('• Real-time portfolio analytics');
  }
}

/**
 * Example usage
 */
export async function runTakaraIntegrationExample() {
  // Initialize provider (example for Sei Network)
  const provider = new ethers.JsonRpcProvider('https://evm-rpc.sei-apis.com');
  
  // Optional: Add signer for actual transactions
  // const signer = new ethers.Wallet('your-private-key', provider);
  
  const example = new TakaraIntegrationExample(provider);
  await example.runFullDemo();
}

// Export for usage in other modules
export default TakaraIntegrationExample;