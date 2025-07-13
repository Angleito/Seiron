/**
 * @fileoverview Property-based test generators for DeFi operations
 * Custom generators for realistic DeFi data with mathematical properties
 */

import fc from 'fast-check';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';

/**
 * DeFi Token Generator
 * Generates realistic token symbols with proper distribution
 */
export const tokenGenerator = () => fc.oneof(
  fc.constant('SEI'),
  fc.constant('USDC'),
  fc.constant('USDT'),
  fc.constant('iSEI'),
  fc.constant('fastUSD'),
  fc.constant('uBTC'),
  fc.constant('ETH'),
  fc.constant('WSEI')
);

/**
 * Token pair generator ensuring no self-pairs
 */
export const tokenPairGenerator = () => fc.tuple(tokenGenerator(), tokenGenerator())
  .filter(([token1, token2]) => token1 !== token2);

/**
 * Ethereum address generator with proper format
 */
export const addressGenerator = () => fc.hexaString({ minLength: 40, maxLength: 40 })
  .map(hex => `0x${hex.toLowerCase()}`);

/**
 * Valid transaction hash generator
 */
export const txHashGenerator = () => fc.hexaString({ minLength: 64, maxLength: 64 })
  .map(hex => `0x${hex.toLowerCase()}`);

/**
 * DeFi amount generator with realistic ranges
 */
export const amountGenerator = () => fc.oneof(
  // Small amounts (0.01 - 100)
  fc.float({ min: 0.01, max: 100 }),
  // Medium amounts (100 - 10,000)
  fc.float({ min: 100, max: 10000 }),
  // Large amounts (10,000 - 1,000,000)
  fc.float({ min: 10000, max: 1000000 }),
  // Whale amounts (1,000,000 - 100,000,000)
  fc.float({ min: 1000000, max: 100000000 })
).map(amount => BigInt(Math.floor(amount * 1e18))); // Convert to wei

/**
 * Small amount generator for fees and precision testing
 */
export const smallAmountGenerator = () => fc.float({ min: 0.000001, max: 1 })
  .map(amount => BigInt(Math.floor(amount * 1e18)));

/**
 * Percentage generator (0-100%)
 */
export const percentageGenerator = () => fc.float({ min: 0, max: 1 });

/**
 * Slippage generator (0-50%)
 */
export const slippageGenerator = () => fc.float({ min: 0, max: 0.5 });

/**
 * APY generator (0-1000%)
 */
export const apyGenerator = () => fc.float({ min: 0, max: 10 });

/**
 * Leverage generator (1x - 50x)
 */
export const leverageGenerator = () => fc.float({ min: 1, max: 50 });

/**
 * Health factor generator (0.5 - 10)
 */
export const healthFactorGenerator = () => fc.float({ min: 0.5, max: 10 })
  .map(factor => BigInt(Math.floor(factor * 1e18)));

/**
 * Interest rate generator (0-100% APY)
 */
export const interestRateGenerator = () => fc.float({ min: 0, max: 1 })
  .map(rate => BigInt(Math.floor(rate * 1e18)));

/**
 * Price generator with realistic ranges
 */
export const priceGenerator = () => fc.oneof(
  // Stablecoin prices (0.9 - 1.1)
  fc.float({ min: 0.9, max: 1.1 }),
  // Altcoin prices (0.01 - 1000)
  fc.float({ min: 0.01, max: 1000 }),
  // BTC/ETH prices (100 - 100000)
  fc.float({ min: 100, max: 100000 })
).map(price => BigInt(Math.floor(price * 1e18)));

/**
 * Price impact generator (0-50%)
 */
export const priceImpactGenerator = () => fc.float({ min: 0, max: 0.5 });

/**
 * Gas price generator (1 - 500 gwei)
 */
export const gasPriceGenerator = () => fc.integer({ min: 1, max: 500 })
  .map(gwei => BigInt(gwei * 1e9));

/**
 * Gas limit generator (21,000 - 10,000,000)
 */
export const gasLimitGenerator = () => fc.integer({ min: 21000, max: 10000000 })
  .map(limit => BigInt(limit));

/**
 * Block number generator
 */
export const blockNumberGenerator = () => fc.integer({ min: 1, max: 20000000 })
  .map(block => BigInt(block));

/**
 * Timestamp generator (recent timestamps)
 */
export const timestampGenerator = () => fc.integer({ min: 1600000000, max: 2000000000 });

/**
 * Deadline generator (future timestamps)
 */
export const deadlineGenerator = () => fc.integer({ min: Math.floor(Date.now() / 1000) + 300, max: Math.floor(Date.now() / 1000) + 86400 });

/**
 * Risk level generator
 */
export const riskLevelGenerator = () => fc.oneof(
  fc.constant('low' as const),
  fc.constant('medium' as const),
  fc.constant('high' as const),
  fc.constant('critical' as const)
);

/**
 * Protocol generator
 */
export const protocolGenerator = () => fc.oneof(
  fc.constant('symphony'),
  fc.constant('takara'),
  fc.constant('silo'),
  fc.constant('citrex'),
  fc.constant('dragonswap'),
  fc.constant('yeifinance')
);

/**
 * Liquidity pool generator
 */
export const liquidityPoolGenerator = () => fc.record({
  token1: tokenGenerator(),
  token2: tokenGenerator(),
  fee: fc.oneof(
    fc.constant(0.003), // 0.3%
    fc.constant(0.005), // 0.5%
    fc.constant(0.01),  // 1%
    fc.constant(0.03)   // 3%
  ),
  liquidity: amountGenerator(),
  volume24h: amountGenerator(),
  apr: apyGenerator()
}).filter(pool => pool.token1 !== pool.token2);

/**
 * Swap route generator
 */
export const swapRouteGenerator = () => fc.record({
  id: fc.uuid(),
  inputToken: tokenGenerator(),
  outputToken: tokenGenerator(),
  inputAmount: amountGenerator(),
  outputAmount: amountGenerator(),
  priceImpact: priceImpactGenerator(),
  gasEstimate: gasLimitGenerator(),
  steps: fc.array(fc.record({
    protocol: protocolGenerator(),
    poolAddress: addressGenerator(),
    fee: percentageGenerator()
  }), { minLength: 1, maxLength: 5 })
}).filter(route => route.inputToken !== route.outputToken);

/**
 * Lending position generator
 */
export const lendingPositionGenerator = () => fc.record({
  user: addressGenerator(),
  asset: tokenGenerator(),
  supplyBalance: amountGenerator(),
  borrowBalance: amountGenerator(),
  collateralEnabled: fc.boolean(),
  healthFactor: healthFactorGenerator(),
  liquidationThreshold: percentageGenerator(),
  ltv: percentageGenerator()
});

/**
 * Market conditions generator
 */
export const marketConditionsGenerator = () => fc.record({
  volatilityIndex: fc.float({ min: 0, max: 100 }),
  liquidityIndex: fc.float({ min: 0, max: 100 }),
  correlationMatrix: fc.array(fc.array(fc.float({ min: -1, max: 1 }), { minLength: 8, maxLength: 8 }), { minLength: 8, maxLength: 8 }),
  fearGreedIndex: fc.integer({ min: 0, max: 100 }),
  totalValueLocked: amountGenerator(),
  volume24h: amountGenerator()
});

/**
 * User profile generator
 */
export const userProfileGenerator = () => fc.record({
  address: addressGenerator(),
  riskTolerance: riskLevelGenerator(),
  experienceLevel: fc.oneof(
    fc.constant('beginner' as const),
    fc.constant('intermediate' as const),
    fc.constant('advanced' as const),
    fc.constant('expert' as const)
  ),
  preferredProtocols: fc.array(protocolGenerator(), { minLength: 1, maxLength: 4 }),
  maxGasPrice: gasPriceGenerator(),
  maxSlippage: slippageGenerator(),
  portfolioSize: amountGenerator()
});

/**
 * Transaction parameters generator
 */
export const transactionParamsGenerator = () => fc.record({
  from: addressGenerator(),
  to: addressGenerator(),
  value: amountGenerator(),
  gasPrice: gasPriceGenerator(),
  gasLimit: gasLimitGenerator(),
  nonce: fc.integer({ min: 0, max: 1000 }),
  deadline: deadlineGenerator(),
  data: fc.hexaString({ minLength: 0, maxLength: 1000 }).map(hex => `0x${hex}`)
});

/**
 * Fee structure generator
 */
export const feeStructureGenerator = () => fc.record({
  protocolFee: smallAmountGenerator(),
  liquidityProviderFee: smallAmountGenerator(),
  gasFee: smallAmountGenerator(),
  totalFee: smallAmountGenerator()
});

/**
 * Complex DeFi operation generator
 */
export const defiOperationGenerator = () => fc.record({
  type: fc.oneof(
    fc.constant('swap' as const),
    fc.constant('supply' as const),
    fc.constant('borrow' as const),
    fc.constant('repay' as const),
    fc.constant('liquidate' as const),
    fc.constant('addLiquidity' as const),
    fc.constant('removeLiquidity' as const)
  ),
  user: addressGenerator(),
  asset: tokenGenerator(),
  amount: amountGenerator(),
  protocol: protocolGenerator(),
  parameters: fc.record({
    slippage: slippageGenerator(),
    deadline: deadlineGenerator(),
    gasPrice: gasPriceGenerator()
  })
});

/**
 * Portfolio generator
 */
export const portfolioGenerator = () => fc.record({
  user: addressGenerator(),
  totalValue: amountGenerator(),
  positions: fc.array(fc.record({
    protocol: protocolGenerator(),
    asset: tokenGenerator(),
    amount: amountGenerator(),
    value: amountGenerator(),
    apy: apyGenerator(),
    riskLevel: riskLevelGenerator()
  }), { minLength: 1, maxLength: 10 }),
  healthFactor: healthFactorGenerator(),
  diversificationScore: fc.float({ min: 0, max: 1 }),
  riskScore: fc.float({ min: 0, max: 100 })
});

/**
 * Yield farming strategy generator
 */
export const yieldStrategyGenerator = () => fc.record({
  name: fc.string({ minLength: 5, maxLength: 20 }),
  protocols: fc.array(protocolGenerator(), { minLength: 1, maxLength: 3 }),
  expectedApy: apyGenerator(),
  riskLevel: riskLevelGenerator(),
  minInvestment: amountGenerator(),
  maxInvestment: amountGenerator(),
  complexity: fc.oneof(
    fc.constant('simple' as const),
    fc.constant('intermediate' as const),
    fc.constant('advanced' as const)
  ),
  timeHorizon: fc.integer({ min: 1, max: 365 }), // days
  autoCompounding: fc.boolean()
});

/**
 * Arbitrage opportunity generator
 */
export const arbitrageOpportunityGenerator = () => fc.record({
  tokenPair: tokenPairGenerator(),
  exchanges: fc.array(fc.record({
    protocol: protocolGenerator(),
    price: priceGenerator(),
    liquidity: amountGenerator()
  }), { minLength: 2, maxLength: 5 }),
  profitPercent: fc.float({ min: 0.001, max: 0.1 }), // 0.1% to 10%
  gasRequired: gasLimitGenerator(),
  timeWindow: fc.integer({ min: 1, max: 600 }), // seconds
  minimumAmount: amountGenerator(),
  maximumAmount: amountGenerator()
});

/**
 * Liquidation opportunity generator
 */
export const liquidationOpportunityGenerator = () => fc.record({
  user: addressGenerator(),
  protocol: protocolGenerator(),
  healthFactor: fc.float({ min: 0.5, max: 0.99 }).map(hf => BigInt(Math.floor(hf * 1e18))),
  collateralAsset: tokenGenerator(),
  collateralAmount: amountGenerator(),
  debtAsset: tokenGenerator(),
  debtAmount: amountGenerator(),
  liquidationIncentive: fc.float({ min: 0.05, max: 0.15 }), // 5% to 15%
  maxLiquidationAmount: amountGenerator(),
  profitPotential: amountGenerator()
});

/**
 * Generate correlated token prices
 */
export const correlatedPricesGenerator = (tokens: string[], correlation: number) => {
  return fc.array(priceGenerator(), { minLength: tokens.length, maxLength: tokens.length })
    .map(basePrices => {
      const correlatedPrices = basePrices.map((basePrice, index) => {
        if (index === 0) return basePrice;
        const correlationFactor = BigInt(Math.floor(correlation * 1e18));
        const randomFactor = BigInt(Math.floor((1 - correlation) * Math.random() * 1e18));
        return (basePrice * correlationFactor + basePrices[0] * randomFactor) / BigInt(1e18);
      });
      return tokens.reduce((acc, token, index) => {
        acc[token] = correlatedPrices[index];
        return acc;
      }, {} as Record<string, bigint>);
    });
};

/**
 * Generate time series data
 */
export const timeSeriesGenerator = (length: number) => {
  return fc.array(fc.record({
    timestamp: timestampGenerator(),
    value: amountGenerator(),
    volume: amountGenerator()
  }), { minLength: length, maxLength: length })
    .map(series => series.sort((a, b) => a.timestamp - b.timestamp));
};

/**
 * Generate realistic market depth
 */
export const marketDepthGenerator = () => {
  const generateOrderBook = (side: 'bid' | 'ask') => {
    return fc.array(fc.record({
      price: priceGenerator(),
      amount: amountGenerator(),
      total: amountGenerator()
    }), { minLength: 5, maxLength: 20 })
      .map(orders => orders.sort((a, b) => 
        side === 'bid' ? Number(b.price - a.price) : Number(a.price - b.price)
      ));
  };

  return fc.record({
    bids: generateOrderBook('bid'),
    asks: generateOrderBook('ask'),
    spread: fc.float({ min: 0.001, max: 0.1 }), // 0.1% to 10%
    midPrice: priceGenerator(),
    lastPrice: priceGenerator(),
    volume24h: amountGenerator()
  });
};

/**
 * Helper function to generate constrained values
 */
export const constrainedGenerator = <T>(
  generator: fc.Arbitrary<T>,
  constraint: (value: T) => boolean,
  maxAttempts: number = 100
) => {
  return generator.filter(constraint);
};

/**
 * Generate mathematically consistent swap data
 */
export const consistentSwapGenerator = () => {
  return fc.record({
    inputToken: tokenGenerator(),
    outputToken: tokenGenerator(),
    inputAmount: amountGenerator(),
    priceImpact: priceImpactGenerator(),
    slippage: slippageGenerator(),
    fee: fc.float({ min: 0.001, max: 0.03 })
  })
    .filter(swap => swap.inputToken !== swap.outputToken)
    .map(swap => {
      // Calculate mathematically consistent output amount
      const baseRate = BigInt(Math.floor(1.5 * 1e18)); // 1.5 SEI per USDC example
      const impactAdjustment = BigInt(Math.floor((1 - swap.priceImpact) * 1e18));
      const feeAdjustment = BigInt(Math.floor((1 - swap.fee) * 1e18));
      
      const outputAmount = (swap.inputAmount * baseRate * impactAdjustment * feeAdjustment) / (BigInt(1e18) * BigInt(1e18) * BigInt(1e18));
      const minimumAmountOut = (outputAmount * BigInt(Math.floor((1 - swap.slippage) * 1e18))) / BigInt(1e18);
      
      return {
        ...swap,
        outputAmount,
        minimumAmountOut,
        executionPrice: baseRate,
        fees: {
          protocolFee: (swap.inputAmount * BigInt(Math.floor(swap.fee * 0.3 * 1e18))) / BigInt(1e18),
          liquidityProviderFee: (swap.inputAmount * BigInt(Math.floor(swap.fee * 0.7 * 1e18))) / BigInt(1e18),
          gasFee: BigInt(Math.floor(0.001 * 1e18)), // 0.001 SEI gas fee
          totalFee: (swap.inputAmount * BigInt(Math.floor(swap.fee * 1e18))) / BigInt(1e18)
        }
      };
    });
};

/**
 * Generate valid lending position with consistent health factor
 */
export const consistentLendingPositionGenerator = () => {
  return fc.record({
    user: addressGenerator(),
    asset: tokenGenerator(),
    supplyBalance: amountGenerator(),
    collateralFactor: fc.float({ min: 0.5, max: 0.9 }), // 50% to 90%
    liquidationThreshold: fc.float({ min: 0.8, max: 0.95 }), // 80% to 95%
    borrowRate: interestRateGenerator(),
    supplyRate: interestRateGenerator()
  })
    .map(position => {
      // Ensure liquidation threshold > collateral factor
      const adjustedLiquidationThreshold = Math.max(position.liquidationThreshold, position.collateralFactor + 0.05);
      
      // Calculate maximum safe borrow amount
      const maxBorrowAmount = (position.supplyBalance * BigInt(Math.floor(position.collateralFactor * 1e18))) / BigInt(1e18);
      
      // Generate realistic borrow amount (50% to 90% of max)
      const borrowRatio = 0.5 + Math.random() * 0.4;
      const borrowBalance = (maxBorrowAmount * BigInt(Math.floor(borrowRatio * 1e18))) / BigInt(1e18);
      
      // Calculate health factor
      const collateralValue = (position.supplyBalance * BigInt(Math.floor(adjustedLiquidationThreshold * 1e18))) / BigInt(1e18);
      const healthFactor = borrowBalance > 0n ? (collateralValue * BigInt(1e18)) / borrowBalance : BigInt(2e18);
      
      return {
        ...position,
        borrowBalance,
        liquidationThreshold: adjustedLiquidationThreshold,
        healthFactor,
        ltv: borrowBalance > 0n ? (borrowBalance * BigInt(1e18)) / position.supplyBalance : BigInt(0),
        collateralEnabled: true
      };
    });
};

// Export all generators as a collection
export const DeFiGenerators = {
  token: tokenGenerator,
  tokenPair: tokenPairGenerator,
  address: addressGenerator,
  txHash: txHashGenerator,
  amount: amountGenerator,
  smallAmount: smallAmountGenerator,
  percentage: percentageGenerator,
  slippage: slippageGenerator,
  apy: apyGenerator,
  leverage: leverageGenerator,
  healthFactor: healthFactorGenerator,
  interestRate: interestRateGenerator,
  price: priceGenerator,
  priceImpact: priceImpactGenerator,
  gasPrice: gasPriceGenerator,
  gasLimit: gasLimitGenerator,
  blockNumber: blockNumberGenerator,
  timestamp: timestampGenerator,
  deadline: deadlineGenerator,
  riskLevel: riskLevelGenerator,
  protocol: protocolGenerator,
  liquidityPool: liquidityPoolGenerator,
  swapRoute: swapRouteGenerator,
  lendingPosition: lendingPositionGenerator,
  marketConditions: marketConditionsGenerator,
  userProfile: userProfileGenerator,
  transactionParams: transactionParamsGenerator,
  feeStructure: feeStructureGenerator,
  defiOperation: defiOperationGenerator,
  portfolio: portfolioGenerator,
  yieldStrategy: yieldStrategyGenerator,
  arbitrageOpportunity: arbitrageOpportunityGenerator,
  liquidationOpportunity: liquidationOpportunityGenerator,
  correlatedPrices: correlatedPricesGenerator,
  timeSeries: timeSeriesGenerator,
  marketDepth: marketDepthGenerator,
  constrained: constrainedGenerator,
  consistentSwap: consistentSwapGenerator,
  consistentLendingPosition: consistentLendingPositionGenerator
};

export default DeFiGenerators;
