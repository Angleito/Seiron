/**
 * Comprehensive Usage Examples for Sei Protocol Integration
 * Demonstrates both Silo (staking) and Citrex (perpetual trading) protocols
 */

import { createPublicClient, createWalletClient, http } from 'viem';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { 
  createSeiProtocolIntegration,
  SeiProtocolIntegration,
  SeiRiskManager,
  createSeiRiskManager
} from '../index';
import {
  SeiProtocolConfig,
  SiloStakeParams,
  CitrexOpenPositionParams,
  SeiProtocolErrorHandler
} from '../types';
import logger from '../../../utils/logger';

// ===================== Configuration Setup =====================

const seiConfig: SeiProtocolConfig = {
  network: 'mainnet',
  rpcUrl: 'https://evm-rpc.sei-apis.com',
  contractAddresses: {
    silo: {
      stakingContract: 'sei1silo1staking2contract3address4here5for6main7network8deployment9',
      rewardDistributor: 'sei1silo1reward2distributor3address4here5for6main7network8deployment',
      timelock: 'sei1silo1timelock2contract3address4here5for6governance7and8security9only',
      governance: 'sei1silo1governance2contract3address4here5for6protocol7management8only'
    },
    citrex: {
      perpetualTrading: 'sei1citrex1perpetual2trading3contract4address5here6for7main8network9',
      vault: 'sei1citrex1vault2contract3address4here5for6collateral7management8only9',
      priceOracle: 'sei1citrex1price2oracle3contract4address5here6for7price8feeds9only',
      liquidationEngine: 'sei1citrex1liquidation2engine3contract4address5here6for7risk8mgmt9',
      fundingRateCalculator: 'sei1citrex1funding2rate3calculator4contract5address6here7for8rates9',
      riskManager: 'sei1citrex1risk2manager3contract4address5here6for7position8limits9'
    }
  },
  defaultSlippage: 0.005, // 0.5%
  gasLimits: {
    stake: 200000,
    unstake: 250000,
    claimRewards: 150000,
    openPosition: 300000,
    closePosition: 250000,
    adjustPosition: 200000
  }
};

// ===================== Client Setup =====================

const publicClient = createPublicClient({
  transport: http(seiConfig.rpcUrl)
});

const walletClient = createWalletClient({
  transport: http(seiConfig.rpcUrl)
});

// ===================== Example 1: Basic Protocol Setup =====================

export async function basicProtocolSetup(): Promise<void> {
  console.log('\n=== Example 1: Basic Protocol Setup ===');
  
  try {
    // Create protocol integration
    const protocolIntegration = new SeiProtocolIntegration(
      publicClient,
      walletClient,
      seiConfig
    );

    // Initialize protocols
    const initResult = await protocolIntegration.initialize()();
    
    if (initResult._tag === 'Right') {
      console.log('✅ Sei protocols initialized successfully');
      
      // Check protocol health
      const healthResult = await protocolIntegration.getProtocolHealth()();
      
      if (healthResult._tag === 'Right') {
        const health = healthResult.right;
        console.log('📊 Protocol Health Status:');
        console.log(`  Overall: ${health.overall}`);
        console.log(`  Silo: ${health.protocols.silo.status} (${health.protocols.silo.responseTime}ms)`);
        console.log(`  Citrex: ${health.protocols.citrex.status} (${health.protocols.citrex.responseTime}ms)`);
      }
    } else {
      console.error('❌ Failed to initialize protocols:', initResult.left.message);
    }
  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

// ===================== Example 2: Silo Staking Operations =====================

export async function siloStakingExample(): Promise<void> {
  console.log('\n=== Example 2: Silo Staking Operations ===');
  
  const walletAddress = 'sei1example1wallet2address3here4for5testing6purposes7only8';
  const protocolIntegration = new SeiProtocolIntegration(publicClient, walletClient, seiConfig);
  
  try {
    await protocolIntegration.initialize()();
    
    const siloAdapter = protocolIntegration.silo;
    
    // 1. Get staking pool information
    console.log('📈 Getting staking pool information...');
    const poolInfoResult = await siloAdapter.getStakingPoolInfo(
      'sei1native0token1address2here3for4sei5mainnet6deployment7only'
    )();
    
    if (poolInfoResult._tag === 'Right') {
      const poolInfo = poolInfoResult.right;
      console.log(`  Token: ${poolInfo.symbol}`);
      console.log(`  Total Staked: $${poolInfo.totalStakedUSD.toLocaleString()}`);
      console.log(`  APR: ${(poolInfo.apr * 100).toFixed(2)}%`);
      console.log(`  APY: ${(poolInfo.apy * 100).toFixed(2)}%`);
    }

    // 2. Estimate staking returns
    console.log('\n💰 Estimating staking returns...');
    const stakeParams: SiloStakeParams = {
      walletAddress,
      token: 'sei1native0token1address2here3for4sei5mainnet6deployment7only',
      amount: '1000000000000000000000', // 1000 tokens
      stakingPeriod: 2592000, // 30 days
      acceptSlashingRisk: true
    };
    
    const returnsResult = await siloAdapter.estimateStakingReturns(stakeParams)();
    
    if (returnsResult._tag === 'Right') {
      const returns = returnsResult.right;
      console.log(`  Daily Rewards: $${returns.dailyRewards.toFixed(2)}`);
      console.log(`  Monthly Rewards: $${returns.monthlyRewards.toFixed(2)}`);
      console.log(`  Annual Rewards: $${returns.annualRewards.toFixed(2)}`);
      console.log(`  Effective APY: ${(returns.apy * 100).toFixed(2)}%`);
    }

    // 3. Execute staking operation with error handling
    console.log('\n🔒 Executing staking operation...');
    const stakeResult = await SeiProtocolErrorHandler.wrapOperation(
      () => siloAdapter.stake(stakeParams)(),
      'stake',
      stakeParams
    )();
    
    if (stakeResult._tag === 'Right') {
      console.log(`✅ Staking successful! Transaction: ${stakeResult.right}`);
    } else {
      console.error(`❌ Staking failed: ${stakeResult.left.userMessage}`);
      console.log(`Suggestions: ${stakeResult.left.suggestions.join(', ')}`);
    }

    // 4. Get current staking positions
    console.log('\n📋 Current staking positions...');
    const positionsResult = await siloAdapter.getStakingPositions(walletAddress)();
    
    if (positionsResult._tag === 'Right') {
      const positions = positionsResult.right;
      console.log(`  Found ${positions.length} staking positions:`);
      
      positions.forEach((position, index) => {
        console.log(`  Position ${index + 1}:`);
        console.log(`    Token: ${position.stakedTokenSymbol}`);
        console.log(`    Amount: ${position.stakedAmountFormatted}`);
        console.log(`    Value: $${position.valueUSD.toFixed(2)}`);
        console.log(`    APY: ${(position.apy * 100).toFixed(2)}%`);
        console.log(`    Locked: ${position.stakingPeriod.isLocked ? 'Yes' : 'No'}`);
        console.log(`    Pending Rewards: $${position.pendingRewardsUSD.toFixed(2)}`);
      });
    }

  } catch (error) {
    console.error('❌ Silo staking error:', error);
  }
}

// ===================== Example 3: Citrex Perpetual Trading =====================

export async function citrexTradingExample(): Promise<void> {
  console.log('\n=== Example 3: Citrex Perpetual Trading ===');
  
  const walletAddress = 'sei1example1wallet2address3here4for5testing6purposes7only8';
  const protocolIntegration = new SeiProtocolIntegration(publicClient, walletClient, seiConfig);
  
  try {
    await protocolIntegration.initialize()();
    
    const citrexAdapter = protocolIntegration.citrex;
    
    // 1. Get market data
    console.log('📊 Getting market data...');
    const marketsResult = await citrexAdapter.getMarketData()();
    
    if (marketsResult._tag === 'Right') {
      const markets = marketsResult.right;
      console.log(`  Available markets: ${markets.length}`);
      
      markets.forEach(market => {
        console.log(`  ${market.symbol}:`);
        console.log(`    Mark Price: $${market.markPrice.toFixed(4)}`);
        console.log(`    24h Change: ${market.priceChangePercent24h.toFixed(2)}%`);
        console.log(`    Funding Rate: ${(market.fundingRate * 100).toFixed(4)}%`);
        console.log(`    Max Leverage: ${market.maxLeverage}x`);
        console.log(`    Open Interest: $${market.openInterest.toLocaleString()}`);
      });
    }

    // 2. Open a position with risk validation
    console.log('\n📈 Opening perpetual position...');
    const openParams: CitrexOpenPositionParams = {
      walletAddress,
      market: 'SEI-USDC',
      side: 'long',
      size: '1000', // 1000 SEI
      orderType: 'market',
      leverage: 5,
      collateral: '100', // 100 USDC
      reduceOnly: false
    };
    
    // Validate operation with risk manager
    const riskManager = createSeiRiskManager();
    const currentPositions = await citrexAdapter.getPositions(walletAddress)();
    
    if (currentPositions._tag === 'Right') {
      const validationResult = await riskManager.validateOperation(
        'open_position',
        openParams,
        currentPositions.right,
        1000 // $1000 portfolio value // TODO: REMOVE_MOCK - Hard-coded currency values
      )();
      
      if (validationResult._tag === 'Right') {
        const validation = validationResult.right;
        
        if (validation.allowed) {
          console.log('✅ Risk validation passed');
          
          // Execute the trade
          const tradeResult = await citrexAdapter.openPosition(openParams)();
          
          if (tradeResult._tag === 'Right') {
            console.log(`✅ Position opened! Transaction: ${tradeResult.right}`);
          } else {
            console.error(`❌ Trade failed: ${tradeResult.left.message}`);
          }
        } else {
          console.warn('⚠️ Risk validation failed:');
          validation.reasons.forEach(reason => console.log(`  - ${reason}`));
          console.log('Recommendations:');
          validation.recommendations.forEach(rec => console.log(`  - ${rec}`));
        }
      }
    }

    // 3. Monitor existing positions
    console.log('\n📋 Current trading positions...');
    const positionsResult = await citrexAdapter.getPositions(walletAddress)();
    
    if (positionsResult._tag === 'Right') {
      const positions = positionsResult.right;
      console.log(`  Found ${positions.length} trading positions:`);
      
      positions.forEach((position, index) => {
        console.log(`  Position ${index + 1}:`);
        console.log(`    Market: ${position.marketSymbol}`);
        console.log(`    Side: ${position.side.toUpperCase()}`);
        console.log(`    Size: ${position.sizeFormatted}`);
        console.log(`    Entry Price: $${position.entryPrice.toFixed(4)}`);
        console.log(`    Mark Price: $${position.markPrice.toFixed(4)}`);
        console.log(`    Leverage: ${position.leverage}x`);
        console.log(`    PnL: $${position.pnl.unrealized.toFixed(2)}`);
        console.log(`    Liquidation Risk: ${position.risk.liquidationRisk}`);
        console.log(`    Margin Ratio: ${(position.risk.marginRatio * 100).toFixed(2)}%`);
      });
    }

  } catch (error) {
    console.error('❌ Citrex trading error:', error);
  }
}

// ===================== Example 4: Comprehensive Portfolio Management =====================

export async function portfolioManagementExample(): Promise<void> {
  console.log('\n=== Example 4: Comprehensive Portfolio Management ===');
  
  const walletAddress = 'sei1example1wallet2address3here4for5testing6purposes7only8';
  const protocolIntegration = new SeiProtocolIntegration(publicClient, walletClient, seiConfig);
  
  try {
    await protocolIntegration.initialize()();
    
    // 1. Get comprehensive portfolio overview
    console.log('📊 Portfolio Overview...');
    const portfolioValueResult = await protocolIntegration.getProtocolPortfolioValue(walletAddress)();
    
    if (portfolioValueResult._tag === 'Right') {
      const portfolio = portfolioValueResult.right;
      console.log(`  Total Portfolio Value: $${portfolio.totalValueUSD.toLocaleString()}`);
      console.log(`  Silo Staking Value: $${portfolio.siloValueUSD.toLocaleString()}`);
      console.log(`  Citrex Trading Value: $${portfolio.citrexValueUSD.toLocaleString()}`);
      console.log('  Breakdown:');
      console.log(`    Staking: $${portfolio.breakdown.stakingValue.toLocaleString()}`);
      console.log(`    Perpetual Positions: $${portfolio.breakdown.perpetualValue.toLocaleString()}`);
      console.log(`    Collateral: $${portfolio.breakdown.collateralValue.toLocaleString()}`);
      console.log(`    Unrealized PnL: $${portfolio.breakdown.unrealizedPnL.toFixed(2)}`);
    }

    // 2. Get detailed portfolio metrics
    console.log('\n📈 Portfolio Metrics...');
    const metricsResult = await protocolIntegration.getProtocolMetrics(walletAddress)();
    
    if (metricsResult._tag === 'Right') {
      const metrics = metricsResult.right;
      
      console.log('  Staking Metrics:');
      console.log(`    Total Staked: $${metrics.stakingMetrics.totalStaked.toLocaleString()}`);
      console.log(`    Total Rewards: $${metrics.stakingMetrics.totalRewards.toFixed(2)}`);
      console.log(`    Average APY: ${(metrics.stakingMetrics.averageAPY * 100).toFixed(2)}%`);
      console.log(`    Risk Score: ${metrics.stakingMetrics.riskScore.toFixed(1)}/100`);
      
      console.log('  Trading Metrics:');
      console.log(`    Total Positions: ${metrics.tradingMetrics.totalPositions}`);
      console.log(`    Total Notional: $${metrics.tradingMetrics.totalNotionalValue.toLocaleString()}`);
      console.log(`    Total PnL: $${metrics.tradingMetrics.totalPnL.toFixed(2)}`);
      console.log(`    Average Leverage: ${metrics.tradingMetrics.averageLeverage.toFixed(1)}x`);
      console.log(`    Liquidation Risk: ${metrics.tradingMetrics.liquidationRisk.toFixed(1)}/100`);
      
      console.log('  Combined Metrics:');
      console.log(`    Total Value: $${metrics.combinedMetrics.totalValue.toLocaleString()}`);
      console.log(`    Diversification Score: ${metrics.combinedMetrics.diversificationScore.toFixed(1)}/100`);
      console.log(`    Overall Risk: ${metrics.combinedMetrics.overallRisk.toFixed(1)}/100`);
      console.log(`    Performance Score: ${metrics.combinedMetrics.performanceScore.toFixed(1)}/100`);
    }

  } catch (error) {
    console.error('❌ Portfolio management error:', error);
  }
}

// ===================== Example 5: Risk Management and Monitoring =====================

export async function riskManagementExample(): Promise<void> {
  console.log('\n=== Example 5: Risk Management and Monitoring ===');
  
  const walletAddress = 'sei1example1wallet2address3here4for5testing6purposes7only8';
  const protocolIntegration = new SeiProtocolIntegration(publicClient, walletClient, seiConfig);
  
  try {
    await protocolIntegration.initialize()();
    
    // 1. Create risk manager with custom configuration
    const riskManager = createSeiRiskManager({
      updateInterval: 10000, // 10 seconds
      alertThresholds: {
        liquidation: 0.2,    // 20% liquidation risk threshold
        concentration: 0.3,  // 30% concentration threshold
        correlation: 0.7,    // 70% correlation threshold
        volatility: 0.25     // 25% volatility threshold
      },
      automatedActions: {
        enableAutoRebalance: false,
        enableLiquidationProtection: true,
        enableRiskAlerts: true
      }
    });

    // 2. Get all protocol positions
    const allPositions = await protocolIntegration.getAllPositions(walletAddress)();
    
    if (allPositions._tag === 'Right') {
      const positions = allPositions.right;
      const portfolioValue = 5000; // $5000 portfolio // TODO: REMOVE_MOCK - Hard-coded currency values
      
      // 3. Analyze comprehensive risk
      console.log('🔍 Analyzing portfolio risk...');
      const riskResult = await riskManager.analyzeRisk(walletAddress, positions, portfolioValue)();
      
      if (riskResult._tag === 'Right') {
        const risk = riskResult.right;
        
        console.log('  Overall Risk Assessment:');
        console.log(`    Health Factor: ${risk.healthFactor.toFixed(2)}`);
        console.log(`    Liquidation Risk: ${risk.liquidationRisk}`);
        console.log(`    Concentration Risk: ${risk.concentrationRisk.toFixed(1)}%`);
        console.log(`    Correlation Risk: ${risk.correlationRisk.toFixed(1)}%`);
        
        console.log('  Protocol-Specific Risks:');
        console.log(`    Silo Staking Risk: ${risk.protocolSpecific.silo.stakingRisk.toFixed(1)}%`);
        console.log(`    Silo Penalty Risk: ${risk.protocolSpecific.silo.penaltyRisk.toFixed(1)}%`);
        console.log(`    Citrex Liquidation Risk: ${risk.protocolSpecific.citrex.liquidationRisk.toFixed(1)}%`);
        console.log(`    Citrex Leverage Risk: ${risk.protocolSpecific.citrex.leverageRisk.toFixed(1)}%`);
        
        // 4. Generate risk alerts
        const alertsResult = await riskManager.generateRiskAlerts(walletAddress, positions, risk)();
        
        if (alertsResult._tag === 'Right') {
          const alerts = alertsResult.right;
          
          if (alerts.length > 0) {
            console.log('\n⚠️ Risk Alerts:');
            alerts.forEach((alert, index) => {
              console.log(`  Alert ${index + 1}:`);
              console.log(`    Type: ${alert.type}`);
              console.log(`    Severity: ${alert.severity}`);
              console.log(`    Message: ${alert.message}`);
              console.log(`    Protocol: ${alert.protocol}`);
              console.log(`    Urgency: ${alert.action.urgency}`);
              console.log(`    Recommendations:`);
              alert.action.recommendations.forEach(rec => console.log(`      - ${rec}`));
            });
          } else {
            console.log('\n✅ No critical risk alerts detected');
          }
        }
      }

      // 5. Start risk monitoring
      console.log('\n🔄 Starting continuous risk monitoring...');
      
      riskManager.startMonitoring(
        walletAddress,
        async () => positions, // Mock function to get current positions // TODO: REMOVE_MOCK - Mock-related keywords
        async () => portfolioValue, // Mock function to get portfolio value // TODO: REMOVE_MOCK - Mock-related keywords
        (alert) => {
          console.log(`🚨 RISK ALERT: ${alert.message} (${alert.severity})`);
          logger.warn('Risk alert generated', { alert });
        }
      );

      // Simulate monitoring for 30 seconds
      setTimeout(() => {
        riskManager.stopMonitoring();
        console.log('⏹️ Risk monitoring stopped');
      }, 30000);

    }

  } catch (error) {
    console.error('❌ Risk management error:', error);
  }
}

// ===================== Example 6: Error Handling and Recovery =====================

export async function errorHandlingExample(): Promise<void> {
  console.log('\n=== Example 6: Error Handling and Recovery ===');
  
  try {
    // Demonstrate error handling with retry mechanism
    console.log('🔄 Testing error handling with retry...');
    
    const faultyOperation = () => 
      TE.left(new Error('Simulated network error'));
    
    const retryableOperation = SeiProtocolErrorHandler.retryOperation(
      faultyOperation,
      3, // Max 3 retries
      1000 // 1 second base delay
    );
    
    const result = await retryableOperation();
    
    if (result._tag === 'Left') {
      const errorDetails = result.left;
      console.log('❌ Operation failed after retries:');
      console.log(`  Type: ${errorDetails.type}`);
      console.log(`  Severity: ${errorDetails.severity}`);
      console.log(`  Retryable: ${errorDetails.retryable}`);
      console.log(`  User Message: ${errorDetails.userMessage}`);
      console.log('  Suggestions:');
      errorDetails.suggestions.forEach(suggestion => console.log(`    - ${suggestion}`));
    }

    // Demonstrate graceful error handling
    console.log('\n🛡️ Testing graceful error handling...');
    
    const safeOperation = SeiProtocolErrorHandler.wrapOperation(
      async () => {
        throw new Error('Connection timeout');
      },
      'test_operation',
      { testParam: 'value' }
    );
    
    const safeResult = await safeOperation();
    
    if (safeResult._tag === 'Left') {
      const { error, userMessage } = SeiProtocolErrorHandler.handleProtocolError(
        safeResult.left,
        'test_operation'
      );
      
      console.log('✅ Error handled gracefully:');
      console.log(`  User Message: ${userMessage}`);
      console.log(`  Technical Details: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error handling test failed:', error);
  }
}

// ===================== Main Execution Function =====================

export async function runAllExamples(): Promise<void> {
  console.log('🚀 Starting Sei Protocol Integration Examples...\n');
  
  try {
    await basicProtocolSetup();
    await siloStakingExample();
    await citrexTradingExample();
    await portfolioManagementExample();
    await riskManagementExample();
    await errorHandlingExample();
    
    console.log('\n✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Examples failed:', error);
  }
}

// ===================== Individual Example Exports =====================

export {
  basicProtocolSetup,
  siloStakingExample,
  citrexTradingExample,
  portfolioManagementExample,
  riskManagementExample,
  errorHandlingExample
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}