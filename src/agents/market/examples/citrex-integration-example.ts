/**
 * Example usage of enhanced MarketAgent with Citrex integration
 * Demonstrates trading capabilities, risk management, and position monitoring
 */

import { MarketAgent } from '../MarketAgent';
import { CitrexProtocolWrapper } from '../../../backend/src/protocols/sei/adapters/CitrexProtocolWrapper';
import { SiloProtocolWrapper } from '../../../backend/src/protocols/sei/adapters/SiloProtocolWrapper';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

// Mock wallet and protocol setup for demonstration
const mockPublicClient = {} as any;
const mockWalletClient = {} as any;
const mockProtocolConfig = {
  network: 'sei-testnet',
  contractAddresses: {
    citrex: {
      perpetualTrading: 'sei1citrex1perpetual2trading3contract',
      vault: 'sei1citrex1vault2contract',
      priceOracle: 'sei1citrex1price2oracle3contract',
      liquidationEngine: 'sei1citrex1liquidation2engine3contract',
      fundingRateCalculator: 'sei1citrex1funding2rate3calculator',
      riskManager: 'sei1citrex1risk2manager3contract'
    }
  }
} as any;

async function demonstrateCitrexIntegration() {
  console.log('🚀 Initializing Enhanced MarketAgent with Citrex Integration...\n');

  // Initialize protocol wrappers
  const citrexWrapper = new CitrexProtocolWrapper(
    mockPublicClient,
    mockWalletClient,
    mockProtocolConfig
  );

  const siloWrapper = new SiloProtocolWrapper(
    mockPublicClient,
    mockWalletClient,
    mockProtocolConfig
  );

  // Initialize enhanced MarketAgent
  const marketAgent = new MarketAgent(
    {
      id: 'market-prophet',
      name: 'Market Prophet',
      description: 'Enhanced market analysis and trading agent'
    },
    citrexWrapper,
    siloWrapper
  );

  // Initialize the agent
  await pipe(
    marketAgent.initialize(),
    TE.fold(
      error => {
        console.error('❌ Failed to initialize MarketAgent:', error.message);
        return TE.right(undefined);
      },
      () => {
        console.log('✅ MarketAgent initialized successfully\n');
        return TE.right(undefined);
      }
    )
  )();

  // Example 1: Market Analysis with Trading Signals
  console.log('📊 Example 1: Enhanced Market Analysis with Trading Signals');
  console.log('=' .repeat(60));
  
  const analysisResult = await pipe(
    marketAgent.executeAction('analyze_market', {
      symbols: ['SEI', 'BTC', 'ETH'],
      timeframes: ['1h', '4h', '1d'],
      includeTradingSignals: true
    }),
    TE.fold(
      error => {
        console.error('Analysis failed:', error.message);
        return TE.right(null);
      },
      result => {
        console.log('Market Analysis Results:');
        console.log('- Assets analyzed:', Object.keys(result.data.analysis).length);
        console.log('- Market conditions:', result.data.conditions.regime);
        console.log('- Recommendations:', result.data.recommendations.length);
        console.log('- Risk level:', result.data.risks.length > 0 ? 'Elevated' : 'Normal');
        return TE.right(result);
      }
    )
  )();

  console.log('\n');

  // Example 2: Generate Trading Signals
  console.log('⚡ Example 2: Generate Trading Signals');
  console.log('=' .repeat(60));

  const signalsResult = await pipe(
    marketAgent.executeAction('generate_trading_signals', {
      market: 'SEI-USDC',
      strategies: ['momentum_scalping', 'trend_following', 'breakout_strategy']
    }),
    TE.fold(
      error => {
        console.error('Signal generation failed:', error.message);
        return TE.right(null);
      },
      result => {
        console.log('Trading Signals Generated:');
        console.log('- Total signals:', result.data.signals.length);
        console.log('- Market:', result.data.market);
        console.log('- Strategies used:', result.data.strategies.length);
        console.log('- Avg confidence:', `${(result.data.summary.averageConfidence * 100).toFixed(1)}%`);
        
        if (result.data.signals.length > 0) {
          const topSignal = result.data.signals[0];
          console.log('\nTop Signal:');
          console.log(`- Type: ${topSignal.type.toUpperCase()}`);
          console.log(`- Entry: $${topSignal.entryPrice.toFixed(4)}`);
          console.log(`- Target: $${topSignal.targetPrice?.toFixed(4)}`);
          console.log(`- Stop Loss: $${topSignal.stopLoss?.toFixed(4)}`);
          console.log(`- Confidence: ${(topSignal.confidence * 100).toFixed(1)}%`);
          console.log(`- Reasoning: ${topSignal.reasoning.join(', ')}`);
        }
        
        return TE.right(result);
      }
    )
  )();

  console.log('\n');

  // Example 3: Execute Trading Position
  console.log('🎯 Example 3: Execute Trading Position');
  console.log('=' .repeat(60));

  const tradeParams = {
    walletAddress: 'sei1example1wallet2address3here4for5demo6purposes7only8test',
    market: 'SEI-USDC',
    side: 'long' as const,
    size: '1000', // 1000 SEI
    leverage: 5,
    collateral: '100' // 100 USDC
  };

  const tradeResult = await pipe(
    marketAgent.executeAction('open_position', tradeParams),
    TE.fold(
      error => {
        console.error('Trade execution failed:', error.message);
        return TE.right(null);
      },
      result => {
        console.log('Trade Executed Successfully:');
        console.log('- Transaction Hash:', result.data.transactionHash);
        console.log('- Position ID:', result.data.position.id);
        console.log('- Market:', result.data.position.market);
        console.log('- Side:', result.data.position.side.toUpperCase());
        console.log('- Size:', result.data.position.size);
        console.log('- Leverage:', `${result.data.position.leverage}x`);
        console.log('- Entry Price:', `$${result.data.position.entryPrice.toFixed(4)}`);
        
        console.log('\nRisk Metrics:');
        console.log('- Notional Value:', `$${result.data.riskMetrics.notionalValue.toLocaleString()}`);
        console.log('- Liquidation Price:', `$${result.data.riskMetrics.liquidationPrice.toFixed(4)}`);
        console.log('- Max Loss:', `$${result.data.riskMetrics.maxLoss.toFixed(2)}`);
        console.log('- Margin Requirement:', `$${result.data.riskMetrics.marginRequirement.toFixed(2)}`);
        
        return TE.right(result);
      }
    )
  )();

  console.log('\n');

  // Example 4: Portfolio Risk Management
  console.log('🛡️ Example 4: Portfolio Risk Management');
  console.log('=' .repeat(60));

  const riskResult = await pipe(
    marketAgent.executeAction('monitor_risk', {
      walletAddress: tradeParams.walletAddress
    }),
    TE.fold(
      error => {
        console.error('Risk monitoring failed:', error.message);
        return TE.right(null);
      },
      result => {
        console.log('Portfolio Risk Analysis:');
        console.log('- Total Positions:', result.data.riskAnalysis.totalPositions);
        console.log('- High Risk Positions:', result.data.riskAnalysis.highRiskPositions);
        console.log('- Total Exposure:', `$${result.data.riskAnalysis.totalExposure.toLocaleString()}`);
        console.log('- Net PnL:', `${result.data.riskAnalysis.netPnL >= 0 ? '+' : ''}$${result.data.riskAnalysis.netPnL.toFixed(2)}`);
        console.log('- Average Margin Ratio:', `${(result.data.riskAnalysis.averageMarginRatio * 100).toFixed(1)}%`);
        
        if (result.data.alerts.length > 0) {
          console.log('\nActive Alerts:');
          result.data.alerts.forEach((alert, index) => {
            console.log(`${index + 1}. ${alert.severity.toUpperCase()}: ${alert.message}`);
          });
        }
        
        if (result.data.recommendations.length > 0) {
          console.log('\nRecommendations:');
          result.data.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
          });
        }
        
        return TE.right(result);
      }
    )
  )();

  console.log('\n');

  // Example 5: Liquidation Risk Analysis
  console.log('⚠️ Example 5: Liquidation Risk Analysis');
  console.log('=' .repeat(60));

  const liquidationResult = await pipe(
    marketAgent.executeAction('liquidation_analysis', {
      walletAddress: tradeParams.walletAddress,
      riskThreshold: 0.15 // 15% margin ratio threshold
    }),
    TE.fold(
      error => {
        console.error('Liquidation analysis failed:', error.message);
        return TE.right(null);
      },
      result => {
        console.log('Liquidation Risk Analysis:');
        console.log('- Positions Analyzed:', result.data.analysis.positionsAnalyzed);
        console.log('- Positions at Risk:', result.data.analysis.positionsAtRisk);
        console.log('- Critical Positions:', result.data.analysis.criticalPositions);
        console.log('- Portfolio Risk Level:', result.data.analysis.portfolioLiquidationRisk.toUpperCase());
        console.log('- Avg Time to Liquidation:', `${Math.round(result.data.analysis.averageTimeToLiquidation / 60)} minutes`);
        
        if (result.data.protectiveActions.length > 0) {
          console.log('\nProtective Actions:');
          result.data.protectiveActions.slice(0, 3).forEach((action, index) => {
            console.log(`${index + 1}. [${action.priority.toUpperCase()}] ${action.description}`);
            console.log(`   Timeframe: ${action.timeframe}`);
            if (action.amount) {
              console.log(`   Amount: ${action.amount}`);
            }
          });
        }
        
        return TE.right(result);
      }
    )
  )();

  console.log('\n');

  // Example 6: Get Position Information
  console.log('📋 Example 6: Position Portfolio Overview');
  console.log('=' .repeat(60));

  const positionsResult = await pipe(
    marketAgent.executeAction('get_positions', {
      walletAddress: tradeParams.walletAddress
    }),
    TE.fold(
      error => {
        console.error('Position retrieval failed:', error.message);
        return TE.right(null);
      },
      result => {
        console.log('Portfolio Overview:');
        console.log('- Total Positions:', result.data.summary.totalPositions);
        console.log('- Portfolio Value:', `$${result.data.summary.totalNotionalValue.toLocaleString()}`);
        console.log('- Total PnL:', `${result.data.summary.totalPnL >= 0 ? '+' : ''}$${result.data.summary.totalPnL.toFixed(2)}`);
        console.log('- Total Collateral:', `$${result.data.summary.totalCollateral.toFixed(2)}`);
        console.log('- Average Leverage:', `${result.data.summary.averageLeverage.toFixed(1)}x`);
        
        console.log('\nRisk Metrics:');
        console.log('- Portfolio Value:', `$${result.data.riskMetrics.portfolioValue.toLocaleString()}`);
        console.log('- Total Exposure:', `$${result.data.riskMetrics.totalExposure.toLocaleString()}`);
        console.log('- Risk Utilization:', `${(result.data.riskMetrics.riskUtilization * 100).toFixed(1)}%`);
        console.log('- Liquidation Risk:', result.data.riskMetrics.liquidationRisk.toUpperCase());
        
        if (result.data.positions.length > 0) {
          console.log('\nActive Positions:');
          result.data.positions.forEach((position, index) => {
            console.log(`${index + 1}. ${position.market} ${position.side.toUpperCase()}`);
            console.log(`   Size: ${position.size} | PnL: ${position.pnl.total >= 0 ? '+' : ''}$${position.pnl.total.toFixed(2)}`);
            console.log(`   Leverage: ${position.leverage}x | Risk: ${position.risk.liquidationRisk.toUpperCase()}`);
            console.log(`   Liquidation: $${position.liquidationPrice.toFixed(4)} | Margin: ${(position.risk.marginRatio * 100).toFixed(1)}%`);
          });
        }
        
        return TE.right(result);
      }
    )
  )();

  console.log('\n');

  // Summary
  console.log('🎉 Enhanced MarketAgent with Citrex Integration Demo Complete!');
  console.log('=' .repeat(60));
  console.log('Features demonstrated:');
  console.log('✅ Market analysis with trading insights');
  console.log('✅ Multi-strategy signal generation');
  console.log('✅ Professional trade execution');
  console.log('✅ Real-time risk monitoring');
  console.log('✅ Liquidation protection analysis');
  console.log('✅ Comprehensive portfolio management');
  console.log('\nThe MarketAgent now provides complete trading and risk management capabilities!');
}

// Integration with existing orchestrator
export async function integrateWithOrchestrator() {
  console.log('🔗 Integrating Enhanced MarketAgent with Orchestrator...\n');
  
  // This would be the actual integration code
  const orchestratorConfig = {
    agents: {
      'market-prophet': {
        type: 'MarketAgent',
        capabilities: [
          'market_analysis',
          'price_prediction',
          'trading_signals',
          'position_management',
          'risk_monitoring',
          'liquidation_protection'
        ],
        protocols: ['citrex', 'silo'],
        networks: ['sei'],
        riskManagement: {
          enabled: true,
          maxLeverage: 20,
          maxPositionSize: 0.25,
          liquidationBuffer: 0.02
        }
      }
    }
  };
  
  console.log('Orchestrator configuration updated:');
  console.log(JSON.stringify(orchestratorConfig, null, 2));
  
  return orchestratorConfig;
}

// Run the demonstration
if (require.main === module) {
  demonstrateCitrexIntegration()
    .then(() => {
      console.log('\n🚀 Demo completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Demo failed:', error);
      process.exit(1);
    });
}

export { demonstrateCitrexIntegration, integrateWithOrchestrator };