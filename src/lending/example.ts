/**
 * @fileoverview Example usage of Yei Finance lending adapter
 */

import { ethers } from 'ethers';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';

import { createYeiFinanceAdapter } from './YeiFinanceAdapter';
import type { ILendingAdapter, LendingAsset, ReserveData } from './types';
import { WAD, RAY } from './constants';

/**
 * Example: Initialize the adapter and query protocol data
 */
async function exampleUsage() {
  // Initialize provider - replace with actual RPC endpoint
  const provider = new ethers.JsonRpcProvider('https://evm-rpc.sei-apis.com');
  
  // For read-only operations
  const readOnlyAdapter = createYeiFinanceAdapter(provider);
  
  // For write operations (supply, borrow, etc.)
  // const signer = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);
  // const adapter = createYeiFinanceAdapter(provider, signer);

  console.log('Yei Finance Adapter Example\n');

  // 1. Get supported assets
  const supportedAssets = await readOnlyAdapter.getSupportedAssets();
  if (E.isRight(supportedAssets)) {
    console.log('Supported Assets:');
    supportedAssets.right.forEach(asset => {
      console.log(`- ${asset.symbol} (${asset.address})`);
    });
  }

  // 2. Get reserve data for all assets
  console.log('\n\nReserve Data:');
  const reserveDataResults = await pipe(
    supportedAssets,
    E.map(assets =>
      Promise.all(
        assets.map(asset =>
          readOnlyAdapter.getReserveData(asset.symbol)
        )
      )
    ),
    E.getOrElse(() => Promise.resolve([]))
  );

  reserveDataResults.forEach(result => {
    if (E.isRight(result)) {
      const reserve = result.right;
      console.log(`\n${reserve.asset.symbol}:`);
      console.log(`  Supply APY: ${formatRate(reserve.liquidityRate)}%`);
      console.log(`  Borrow APY (Variable): ${formatRate(reserve.variableBorrowRate)}%`);
      console.log(`  Utilization: ${formatRate(reserve.utilizationRate)}%`);
      console.log(`  Available Liquidity: ${formatAmount(reserve.availableLiquidity, reserve.asset.decimals)}`);
    }
  });

  // 3. Get user account data (example address)
  const userAddress = '0x1234567890123456789012345678901234567890';
  console.log(`\n\nUser Account Data for ${userAddress}:`);
  
  const userAccountData = await readOnlyAdapter.getUserAccountData(userAddress);
  if (E.isRight(userAccountData)) {
    const data = userAccountData.right;
    console.log(`  Total Collateral: $${formatAmount(data.totalCollateralBase, 8)}`);
    console.log(`  Total Debt: $${formatAmount(data.totalDebtBase, 8)}`);
    console.log(`  Available to Borrow: $${formatAmount(data.availableBorrowsBase, 8)}`);
    console.log(`  Health Factor: ${formatHealthFactor(data.healthFactor)}`);
    console.log(`  LTV: ${formatPercentage(data.ltv)}%`);
  }

  // 4. Example supply operation (requires signer)
  /*
  const supplyExample = async () => {
    const adapter = createYeiFinanceAdapter(provider, signer);
    
    // Supply 100 USDC
    const supplyResult = await adapter.supply({
      asset: 'USDC',
      amount: BigInt(100) * BigInt(10 ** 6), // 100 USDC (6 decimals)
      referralCode: 0,
    });

    if (E.isRight(supplyResult)) {
      console.log('Supply successful!');
      console.log(`Transaction: ${supplyResult.right.txHash}`);
      console.log(`Gas Used: ${supplyResult.right.gasUsed}`);
    }
  };
  */

  // 5. Example borrow operation (requires signer)
  /*
  const borrowExample = async () => {
    const adapter = createYeiFinanceAdapter(provider, signer);
    
    // Borrow 50 USDC with variable rate
    const borrowResult = await adapter.borrow({
      asset: 'USDC',
      amount: BigInt(50) * BigInt(10 ** 6), // 50 USDC
      interestRateMode: 'variable',
      referralCode: 0,
    });

    if (E.isRight(borrowResult)) {
      console.log('Borrow successful!');
      console.log(`Transaction: ${borrowResult.right.txHash}`);
      console.log(`Effective Rate: ${formatRate(borrowResult.right.effectiveRate!)}%`);
    }
  };
  */
}

/**
 * Format helpers
 */
function formatRate(rate: bigint): string {
  // Convert from ray (27 decimals) to percentage
  const rateNumber = Number(rate) / Number(RAY);
  return (rateNumber * 100).toFixed(2);
}

function formatAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const significantDecimals = Math.min(decimals, 2);
  
  return `${wholePart}.${fractionalStr.slice(0, significantDecimals)}`;
}

function formatHealthFactor(healthFactor: bigint): string {
  if (healthFactor === BigInt(2) ** BigInt(256) - BigInt(1)) {
    return '∞';
  }
  
  const hf = Number(healthFactor) / Number(WAD);
  return hf.toFixed(2);
}

function formatPercentage(value: bigint): string {
  // Assuming value is in basis points (10000 = 100%)
  return (Number(value) / 100).toFixed(2);
}

/**
 * Advanced example: Monitor health factors for multiple users
 */
async function monitorHealthFactors(
  adapter: ILendingAdapter,
  userAddresses: string[]
): Promise<void> {
  console.log('Monitoring Health Factors:\n');

  const healthFactors = await pipe(
    userAddresses,
    A.traverse(TE.ApplicativePar)(address =>
      TE.fromTask(async () => ({
        address,
        result: await adapter.getHealthFactor(address),
      }))
    )
  )();

  if (E.isRight(healthFactors)) {
    healthFactors.right.forEach(({ address, result }) => {
      if (E.isRight(result)) {
        const hf = result.right;
        const status = hf.canBeLiquidated ? '⚠️  AT RISK' : '✅ HEALTHY';
        console.log(`${address}: ${formatHealthFactor(hf.healthFactor)} ${status}`);
      }
    });
  }
}

/**
 * Advanced example: Find best lending opportunities
 */
async function findBestOpportunities(
  adapter: ILendingAdapter
): Promise<void> {
  const assets = await adapter.getSupportedAssets();
  
  if (E.isLeft(assets)) {
    console.error('Failed to get supported assets');
    return;
  }

  const reserveData = await pipe(
    assets.right,
    A.traverse(TE.ApplicativePar)(asset =>
      TE.fromTask(async () => ({
        asset,
        data: await adapter.getReserveData(asset.symbol),
      }))
    )
  )();

  if (E.isLeft(reserveData)) {
    console.error('Failed to get reserve data');
    return;
  }

  // Find best supply rates
  const supplyOpportunities = pipe(
    reserveData.right,
    A.filter(({ data }) => E.isRight(data)),
    A.map(({ asset, data }) => ({
      asset: asset.symbol,
      rate: (data as E.Right<ReserveData>).right.liquidityRate,
    })),
    A.sortBy([{
      valueOf: (a: any) => -Number(a.rate), // Sort descending
      Eq: { equals: (a: any, b: any) => a.rate === b.rate },
    }])
  );

  console.log('\nBest Supply Opportunities:');
  supplyOpportunities.slice(0, 3).forEach((opp, i) => {
    console.log(`${i + 1}. ${opp.asset}: ${formatRate(opp.rate)}% APY`);
  });

  // Find lowest borrow rates
  const borrowOpportunities = pipe(
    reserveData.right,
    A.filter(({ data }) => E.isRight(data)),
    A.map(({ asset, data }) => ({
      asset: asset.symbol,
      rate: (data as E.Right<ReserveData>).right.variableBorrowRate,
      utilization: (data as E.Right<ReserveData>).right.utilizationRate,
    })),
    A.filter(({ utilization }) => utilization < BigInt(95) * RAY / BigInt(100)), // < 95% utilized
    A.sortBy([{
      valueOf: (a: any) => Number(a.rate), // Sort ascending
      Eq: { equals: (a: any, b: any) => a.rate === b.rate },
    }])
  );

  console.log('\nBest Borrow Opportunities:');
  borrowOpportunities.slice(0, 3).forEach((opp, i) => {
    console.log(`${i + 1}. ${opp.asset}: ${formatRate(opp.rate)}% APY`);
  });
}

// Run the example
if (require.main === module) {
  exampleUsage().catch(console.error);
}