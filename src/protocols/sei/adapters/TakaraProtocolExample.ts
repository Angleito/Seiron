/**
 * @fileoverview Usage examples for Takara Protocol Wrapper
 * Demonstrates comprehensive lending operations and risk management
 */

import { ethers } from 'ethers';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';

import { TakaraProtocolWrapper, TakaraRiskAssessment } from './TakaraProtocolWrapper';
import { LendingManager, type LendingConfig, type LendingParams } from '../../../lending/LendingManager';

/**
 * Example: Basic Takara Protocol Setup
 */
export async function setupTakaraProtocol() {
  // Initialize provider and signer
  const provider = new ethers.JsonRpcProvider('https://evm-rpc.sei-apis.com');
  const signer = new ethers.Wallet('your-private-key', provider);

  // Create Takara wrapper
  const takaraWrapper = new TakaraProtocolWrapper(provider, signer);

  console.log('✅ Takara Protocol Wrapper initialized');
  console.log('Protocol Config:', takaraWrapper.getProtocolConfig());

  return { takaraWrapper, provider, signer };
}

/**
 * Example: Supply Assets to Takara Protocol
 */
export async function supplyToTakara() {
  const { takaraWrapper } = await setupTakaraProtocol();

  // Supply 100 SEI tokens
  const supplyResult = await takaraWrapper.supply({
    asset: 'SEI',
    amount: ethers.parseEther('100'), // 100 SEI
    referralCode: 0,
  });

  if (E.isRight(supplyResult)) {
    console.log('✅ Supply successful!');
    console.log('Transaction Hash:', supplyResult.right.txHash);
    console.log('Amount Supplied:', ethers.formatEther(supplyResult.right.amount), 'SEI');
    console.log('Gas Used:', supplyResult.right.gasUsed.toString());
  } else {
    console.error('❌ Supply failed:', supplyResult.left.message);
  }

  return supplyResult;
}

/**
 * Example: Borrow Against Collateral
 */
export async function borrowFromTakara() {
  const { takaraWrapper, signer } = await setupTakaraProtocol();
  const userAddress = await signer.getAddress();

  // First, check account health
  const healthFactor = await takaraWrapper.getHealthFactor(userAddress);
  if (E.isLeft(healthFactor)) {
    console.error('❌ Cannot check health factor:', healthFactor.left.message);
    return;
  }

  console.log('Current Health Factor:', ethers.formatEther(healthFactor.right.healthFactor));

  if (!healthFactor.right.isHealthy) {
    console.error('❌ Account is not healthy enough to borrow');
    return;
  }

  // Calculate optimal borrow amount using risk assessment
  const accountData = await takaraWrapper.getUserAccountData(userAddress);
  if (E.isLeft(accountData)) {
    console.error('❌ Cannot get account data:', accountData.left.message);
    return;
  }

  const optimalBorrowAmount = TakaraRiskAssessment.calculateOptimalBorrowAmount(
    accountData.right.totalCollateralBase,
    BigInt('750000000000000000'), // 75% collateral factor
    accountData.right.totalDebtBase,
    BigInt('1500000000000000000') // Target health factor of 1.5
  );

  console.log('Optimal Borrow Amount:', ethers.formatEther(optimalBorrowAmount), 'USD equivalent');

  // Borrow USDT (convert from USD equivalent to USDT - 6 decimals)
  const borrowAmount = optimalBorrowAmount / BigInt(1e12); // Convert to 6 decimals
  
  const borrowResult = await takaraWrapper.borrow({
    asset: 'USDT',
    amount: borrowAmount,
    interestRateMode: 'variable',
  });

  if (E.isRight(borrowResult)) {
    console.log('✅ Borrow successful!');
    console.log('Transaction Hash:', borrowResult.right.txHash);
    console.log('Amount Borrowed:', borrowResult.right.amount.toString(), 'USDT (6 decimals)');
    console.log('Effective Rate:', ethers.formatEther(borrowResult.right.effectiveRate || 0n), '%');
  } else {
    console.error('❌ Borrow failed:', borrowResult.left.message);
  }

  return borrowResult;
}

/**
 * Example: Monitor and Manage Risk
 */
export async function monitorTakaraPosition() {
  const { takaraWrapper, signer } = await setupTakaraProtocol();
  const userAddress = await signer.getAddress();

  // Get comprehensive account data
  const accountData = await takaraWrapper.getUserAccountData(userAddress);
  if (E.isLeft(accountData)) {
    console.error('❌ Cannot get account data:', accountData.left.message);
    return;
  }

  const data = accountData.right;
  
  console.log('\n📊 Account Overview:');
  console.log('Total Collateral:', ethers.formatEther(data.totalCollateralBase), 'USD');
  console.log('Total Debt:', ethers.formatEther(data.totalDebtBase), 'USD');
  console.log('Available Borrows:', ethers.formatEther(data.availableBorrowsBase), 'USD');
  console.log('Health Factor:', ethers.formatEther(data.healthFactor));

  // Risk assessment
  const liquidationRisk = TakaraRiskAssessment.calculateLiquidationRisk(data.healthFactor);
  console.log('Liquidation Risk:', liquidationRisk);

  // Get position health score
  const utilizationRate = data.totalDebtBase > 0n 
    ? (data.totalDebtBase * BigInt(1e27)) / data.totalCollateralBase
    : 0n;
  
  const healthScore = TakaraRiskAssessment.calculatePositionHealthScore(
    data.healthFactor,
    utilizationRate,
    0.8 // Assuming good diversification
  );

  console.log('Position Health Score:', (healthScore * 100).toFixed(2), '%');

  // Alert if risk is high
  if (liquidationRisk === 'high' || liquidationRisk === 'critical') {
    console.log('⚠️  HIGH RISK ALERT: Consider adding collateral or reducing debt');
  }

  return { accountData: data, liquidationRisk, healthScore };
}

/**
 * Example: Enhanced LendingManager with Protocol Comparison
 */
export async function useEnhancedLendingManager() {
  const provider = new ethers.JsonRpcProvider('https://evm-rpc.sei-apis.com');
  const signer = new ethers.Wallet('your-private-key', provider);

  const config: LendingConfig = {
    wallet: signer,
    protocol: 'auto', // Let the system choose the best protocol
    minHealthFactor: 1.5,
    provider,
    signer,
  };

  const lendingManager = new LendingManager(config);

  // Compare protocols for SEI lending
  console.log('\n🔍 Comparing Protocols for SEI...');
  const comparison = await lendingManager.getCurrentRates('SEI');
  
  if (E.isRight(comparison)) {
    const comp = comparison.right;
    console.log('Best Supply Protocol:', comp.bestSupplyProtocol);
    console.log('Best Supply Rate:', comp.bestSupplyRate.toFixed(2), '%');
    console.log('Best Borrow Protocol:', comp.bestBorrowProtocol);
    console.log('Best Borrow Rate:', comp.bestBorrowRate.toFixed(2), '%');
    console.log('Rate Advantage:', comp.rateAdvantage.toFixed(2), '%');
    console.log('Risk Assessment:', comp.riskAssessment);
    console.log('Recommendation:', comp.recommendation);
  }

  // Supply using optimal protocol
  const supplyParams: LendingParams = {
    asset: 'SEI',
    amount: ethers.parseEther('50'),
    protocol: 'auto', // Auto-select best protocol
  };

  const supplyResult = await lendingManager.supply(supplyParams);
  if (E.isRight(supplyResult)) {
    console.log('✅ Auto-supply successful via optimal protocol');
    console.log('Transaction:', supplyResult.right.txHash);
  }

  return lendingManager;
}

/**
 * Example: Advanced Risk Management
 */
export async function advancedRiskManagement() {
  const { takaraWrapper, signer } = await setupTakaraProtocol();
  const userAddress = await signer.getAddress();

  // Get all supported assets
  const supportedAssets = await takaraWrapper.getSupportedAssets();
  if (E.isLeft(supportedAssets)) {
    console.error('❌ Cannot get supported assets');
    return;
  }

  console.log('\n📋 Supported Assets:');
  for (const asset of supportedAssets.right) {
    console.log(`- ${asset.symbol}: ${asset.address}`);
    
    // Get current rates for each asset
    const rates = await takaraWrapper.getLendingRates(asset.symbol);
    if (E.isRight(rates)) {
      const rateData = rates.right;
      console.log(`  Supply APY: ${(Number(rateData.supplyRate) / 1e25).toFixed(2)}%`);
      console.log(`  Borrow APY: ${(Number(rateData.borrowRate) / 1e25).toFixed(2)}%`);
      console.log(`  Utilization: ${(Number(rateData.utilizationRate) / 1e25 * 100).toFixed(2)}%`);
      console.log(`  Available Liquidity: ${ethers.formatEther(rateData.availableLiquidity)}`);
    }
  }

  // Check user positions across all assets
  console.log('\n👤 User Positions:');
  for (const asset of supportedAssets.right) {
    const userReserveData = await takaraWrapper.getUserReserveData(userAddress, asset.symbol);
    if (E.isRight(userReserveData)) {
      const reserveData = userReserveData.right;
      
      if (reserveData.currentATokenBalance > 0n || reserveData.currentVariableDebt > 0n) {
        console.log(`\n${asset.symbol} Position:`);
        console.log(`  Supplied: ${ethers.formatUnits(reserveData.currentATokenBalance, asset.decimals)}`);
        console.log(`  Borrowed: ${ethers.formatUnits(reserveData.currentVariableDebt, asset.decimals)}`);
        console.log(`  Used as Collateral: ${reserveData.usageAsCollateralEnabled ? 'Yes' : 'No'}`);
      }
    }
  }
}

/**
 * Example: Emergency Actions
 */
export async function emergencyActions() {
  const { takaraWrapper, signer } = await setupTakaraProtocol();
  const userAddress = await signer.getAddress();

  // Check if emergency action is needed
  const healthFactor = await takaraWrapper.getHealthFactor(userAddress);
  if (E.isLeft(healthFactor)) {
    console.error('❌ Cannot check health factor');
    return;
  }

  const liquidationRisk = TakaraRiskAssessment.calculateLiquidationRisk(healthFactor.right.healthFactor);
  
  if (liquidationRisk === 'critical' || liquidationRisk === 'high') {
    console.log('🚨 EMERGENCY: High liquidation risk detected!');
    
    // Option 1: Repay debt
    console.log('Option 1: Repay debt to improve health factor');
    
    // Get current USDT debt
    const userUSDTData = await takaraWrapper.getUserReserveData(userAddress, 'USDT');
    if (E.isRight(userUSDTData)) {
      const debt = userUSDTData.right.currentVariableDebt;
      if (debt > 0n) {
        console.log(`Current USDT debt: ${ethers.formatUnits(debt, 6)} USDT`);
        
        // Repay 50% of debt
        const repayAmount = debt / 2n;
        console.log(`Attempting to repay: ${ethers.formatUnits(repayAmount, 6)} USDT`);
        
        const repayResult = await takaraWrapper.repay({
          asset: 'USDT',
          amount: repayAmount,
          interestRateMode: 'variable',
        });
        
        if (E.isRight(repayResult)) {
          console.log('✅ Emergency repayment successful');
          console.log('Transaction:', repayResult.right.txHash);
        } else {
          console.error('❌ Emergency repayment failed:', repayResult.left.message);
        }
      }
    }

    // Option 2: Add more collateral
    console.log('Option 2: Add more collateral');
    
    const addCollateralResult = await takaraWrapper.supply({
      asset: 'SEI',
      amount: ethers.parseEther('10'), // Add 10 SEI as collateral
    });
    
    if (E.isRight(addCollateralResult)) {
      console.log('✅ Emergency collateral addition successful');
      console.log('Transaction:', addCollateralResult.right.txHash);
    }

    // Check health factor after emergency actions
    const newHealthFactor = await takaraWrapper.getHealthFactor(userAddress);
    if (E.isRight(newHealthFactor)) {
      console.log('New Health Factor:', ethers.formatEther(newHealthFactor.right.healthFactor));
      const newRisk = TakaraRiskAssessment.calculateLiquidationRisk(newHealthFactor.right.healthFactor);
      console.log('New Liquidation Risk:', newRisk);
    }
  } else {
    console.log('✅ No emergency action needed. Current risk level:', liquidationRisk);
  }
}

/**
 * Example: Yield Optimization Strategy
 */
export async function yieldOptimizationStrategy() {
  const provider = new ethers.JsonRpcProvider('https://evm-rpc.sei-apis.com');
  const signer = new ethers.Wallet('your-private-key', provider);

  const lendingManager = new LendingManager({
    wallet: signer,
    protocol: 'auto',
    provider,
    signer,
  });

  // Get all available rates
  const allRates = await lendingManager.getAllRates();
  if (E.isLeft(allRates)) {
    console.error('❌ Cannot get rates');
    return;
  }

  console.log('\n📈 Yield Optimization Analysis:');
  
  // Sort by supply APY
  const sortedBySupplyApy = allRates.right
    .filter(rate => rate.supplyApy > 0)
    .sort((a, b) => b.supplyApy - a.supplyApy);

  console.log('\n🏆 Best Supply Opportunities:');
  sortedBySupplyApy.slice(0, 5).forEach((rate, index) => {
    console.log(`${index + 1}. ${rate.asset} on ${rate.protocol}: ${rate.supplyApy.toFixed(2)}% APY`);
    console.log(`   Utilization: ${(rate.utilizationRate * 100).toFixed(2)}%`);
    console.log(`   Available: ${ethers.formatEther(rate.availableLiquidity)} tokens`);
  });

  // Sort by borrow APY (ascending - lower is better)
  const sortedByBorrowApy = allRates.right
    .filter(rate => rate.borrowApy > 0)
    .sort((a, b) => a.borrowApy - b.borrowApy);

  console.log('\n💰 Best Borrow Opportunities:');
  sortedByBorrowApy.slice(0, 5).forEach((rate, index) => {
    console.log(`${index + 1}. ${rate.asset} on ${rate.protocol}: ${rate.borrowApy.toFixed(2)}% APY`);
    console.log(`   Utilization: ${(rate.utilizationRate * 100).toFixed(2)}%`);
    console.log(`   Available: ${ethers.formatEther(rate.availableLiquidity)} tokens`);
  });

  // Find arbitrage opportunities (supply rate > borrow rate)
  console.log('\n🔄 Potential Arbitrage Opportunities:');
  for (const supplyRate of sortedBySupplyApy) {
    const borrowRate = sortedByBorrowApy.find(
      r => r.asset === supplyRate.asset && r.protocol !== supplyRate.protocol
    );
    
    if (borrowRate && supplyRate.supplyApy > borrowRate.borrowApy) {
      const spread = supplyRate.supplyApy - borrowRate.borrowApy;
      console.log(`📊 ${supplyRate.asset}: Supply on ${supplyRate.protocol} (${supplyRate.supplyApy.toFixed(2)}%) vs Borrow on ${borrowRate.protocol} (${borrowRate.borrowApy.toFixed(2)}%)`);
      console.log(`   Spread: ${spread.toFixed(2)}% (potential profit)`);
    }
  }
}

/**
 * Main example runner
 */
export async function runTakaraExamples() {
  console.log('🚀 Running Takara Protocol Examples...\n');

  try {
    // Basic setup
    await setupTakaraProtocol();
    console.log('');

    // Supply example
    await supplyToTakara();
    console.log('');

    // Enhanced lending manager
    await useEnhancedLendingManager();
    console.log('');

    // Risk monitoring
    await monitorTakaraPosition();
    console.log('');

    // Advanced risk management
    await advancedRiskManagement();
    console.log('');

    // Yield optimization
    await yieldOptimizationStrategy();
    console.log('');

    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Export all examples
export {
  setupTakaraProtocol,
  supplyToTakara,
  borrowFromTakara,
  monitorTakaraPosition,
  useEnhancedLendingManager,
  advancedRiskManagement,
  emergencyActions,
  yieldOptimizationStrategy,
};