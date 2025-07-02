/**
 * Functional Test Data Generators
 * Pure functions for generating test data with fp-ts patterns
 */

import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import { 
  PortfolioSnapshot, 
  LendingPosition, 
  LiquidityPosition, 
  TokenBalance, 
  WalletAddress 
} from '@/types/portfolio';
import {
  RiskMetrics,
  RiskThresholds,
  PriceData,
  CorrelationData,
  AssetAllocation,
  ProtocolAllocation,
  RiskCalculationContext
} from '@/risk/types';

// ===================== Primitive Generators =====================

export const generateWalletAddress = (seed?: string): WalletAddress => 
  seed ? `0x${seed.padEnd(40, '0')}` : `0x${'1234567890abcdef'.repeat(2).substring(0, 40)}`;

export const generateTokenAddress = (symbol: string): string =>
  `0x${symbol.toLowerCase().padEnd(40, '0').substring(0, 40)}`;

export const generateTimestamp = (offset: number = 0): string =>
  new Date(Date.now() + offset).toISOString();

export const generatePositiveNumber = (max: number = 1000000): number =>
  Math.floor(Math.random() * max) + 1;

export const generatePrice = (base: number = 100): number =>
  base + (Math.random() - 0.5) * base * 0.2; // ±20% variation

export const generateVolatility = (): number =>
  Math.random() * 0.8 + 0.1; // 0.1 to 0.9

// ===================== Portfolio Data Generators =====================

export const generateTokenBalance = (overrides: Partial<TokenBalance> = {}): TokenBalance => ({
  contractAddress: generateTokenAddress(overrides.symbol || 'TEST'),
  symbol: 'TEST',
  balance: '1000000000000000000', // 1 token in wei
  decimals: 18,
  valueUSD: 1000,
  ...overrides
});

export const generateLendingPosition = (overrides: Partial<LendingPosition> = {}): LendingPosition => ({
  platform: 'MockLender',
  tokenAddress: generateTokenAddress(overrides.tokenSymbol || 'TEST'),
  tokenSymbol: 'TEST',
  supplied: '1000000000000000000',
  borrowed: '0',
  suppliedUSD: 1000,
  borrowedUSD: 0,
  apy: 5.5,
  valueUSD: 1000,
  healthFactor: Number.MAX_SAFE_INTEGER,
  ...overrides
});

export const generateLiquidityPosition = (overrides: Partial<LiquidityPosition> = {}): LiquidityPosition => ({
  platform: 'MockDEX',
  poolAddress: generateTokenAddress('POOL'),
  token0Address: generateTokenAddress(overrides.token0Symbol || 'TOKEN0'),
  token1Address: generateTokenAddress(overrides.token1Symbol || 'TOKEN1'),
  token0Symbol: 'TOKEN0',
  token1Symbol: 'TOKEN1',
  token0Amount: '1000000000000000000',
  token1Amount: '1000000000000000000',
  liquidity: '2000000000000000000',
  valueUSD: 2000,
  fee24h: 10,
  apy: 12.5,
  ...overrides
});

export const generatePortfolioSnapshot = (overrides: Partial<PortfolioSnapshot> = {}): PortfolioSnapshot => {
  const lendingPositions = overrides.lendingPositions || [generateLendingPosition()];
  const liquidityPositions = overrides.liquidityPositions || [generateLiquidityPosition()];
  const tokenBalances = overrides.tokenBalances || [generateTokenBalance()];

  const totalSuppliedUSD = lendingPositions.reduce((sum, pos) => sum + pos.suppliedUSD, 0);
  const totalBorrowedUSD = lendingPositions.reduce((sum, pos) => sum + pos.borrowedUSD, 0);
  const totalLiquidityUSD = liquidityPositions.reduce((sum, pos) => sum + pos.valueUSD, 0);
  const totalValueUSD = totalSuppliedUSD + totalLiquidityUSD;
  const netWorth = totalValueUSD - totalBorrowedUSD;

  return {
    walletAddress: generateWalletAddress(),
    totalValueUSD,
    totalSuppliedUSD,
    totalBorrowedUSD,
    totalLiquidityUSD,
    netWorth,
    healthFactor: totalBorrowedUSD > 0 ? totalSuppliedUSD / totalBorrowedUSD : Number.MAX_SAFE_INTEGER,
    lendingPositions,
    liquidityPositions,
    tokenBalances,
    timestamp: generateTimestamp(),
    ...overrides
  };
};

// ===================== Risk Data Generators =====================

export const generateRiskThresholds = (overrides: Partial<RiskThresholds> = {}): RiskThresholds => ({
  healthFactor: {
    critical: 1.1,
    high: 1.3,
    medium: 1.5,
    ...overrides.healthFactor
  },
  concentration: {
    asset: 0.4,
    protocol: 0.6,
    ...overrides.concentration
  },
  leverage: {
    max: 5.0,
    warning: 3.0,
    ...overrides.leverage
  },
  volatility: {
    daily: 0.05,
    weekly: 0.15,
    ...overrides.volatility
  },
  ...overrides
});

export const generatePriceData = (symbol: string, overrides: Partial<PriceData> = {}): PriceData => ({
  symbol,
  price: generatePrice(),
  change24h: (Math.random() - 0.5) * 0.2, // ±20%
  volatility: generateVolatility(),
  timestamp: Date.now(),
  ...overrides
});

export const generateCorrelationData = (
  asset1: string, 
  asset2: string, 
  overrides: Partial<CorrelationData> = {}
): CorrelationData => ({
  pair: [asset1, asset2] as const,
  correlation: (Math.random() - 0.5) * 2, // -1 to 1
  period: 30,
  confidence: 0.95,
  ...overrides
});

export const generateAssetAllocation = (overrides: Partial<AssetAllocation> = {}): AssetAllocation => ({
  symbol: 'TEST',
  weight: 0.25,
  valueUSD: 2500,
  volatility: generateVolatility(),
  ...overrides
});

export const generateProtocolAllocation = (overrides: Partial<ProtocolAllocation> = {}): ProtocolAllocation => ({
  protocol: 'MockProtocol',
  weight: 0.3,
  valueUSD: 3000,
  riskScore: Math.random() * 0.5, // 0 to 0.5
  ...overrides
});

export const generateRiskMetrics = (overrides: Partial<RiskMetrics> = {}): RiskMetrics => ({
  healthFactor: 2.5,
  leverage: 1.8,
  concentration: 0.3,
  correlation: 0.4,
  volatility: 0.15,
  ...overrides
});

// ===================== Context Generators =====================

export const generateRiskCalculationContext = (
  overrides: Partial<RiskCalculationContext> = {}
): RiskCalculationContext => {
  const snapshot = overrides.snapshot || generatePortfolioSnapshot();
  const symbols = ['ETH', 'BTC', 'USDC', 'USDT'];
  
  const priceDataEntries: Array<[string, PriceData]> = symbols.map(symbol => [
    symbol, 
    generatePriceData(symbol)
  ]);
  
  const correlationDataArray: CorrelationData[] = [];
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      correlationDataArray.push(generateCorrelationData(symbols[i], symbols[j]));
    }
  }

  return {
    snapshot,
    thresholds: generateRiskThresholds(),
    priceData: new Map(priceDataEntries),
    correlationData: correlationDataArray,
    timestamp: Date.now(),
    ...overrides
  };
};

// ===================== Array Generators =====================

export const generateAssetAllocations = (count: number = 4): ReadonlyArray<AssetAllocation> => {
  const symbols = ['ETH', 'BTC', 'USDC', 'USDT'];
  const totalValue = 10000;
  
  return pipe(
    A.makeBy(count, (i) => symbols[i] || `TOKEN${i}`),
    A.mapWithIndex((i, symbol) => {
      const weight = i === count - 1 
        ? 1 - (count - 1) * 0.25  // Ensure weights sum to 1
        : 0.25;
      
      return generateAssetAllocation({
        symbol,
        weight,
        valueUSD: totalValue * weight
      });
    })
  );
};

export const generateProtocolAllocations = (count: number = 3): ReadonlyArray<ProtocolAllocation> => {
  const protocols = ['Uniswap', 'Aave', 'Compound'];
  const totalValue = 10000;
  
  return pipe(
    A.makeBy(count, (i) => protocols[i] || `Protocol${i}`),
    A.mapWithIndex((i, protocol) => {
      const weight = i === count - 1 
        ? 1 - (count - 1) * 0.33  // Ensure weights sum to ~1
        : 0.33;
      
      return generateProtocolAllocation({
        protocol,
        weight,
        valueUSD: totalValue * weight
      });
    })
  );
};

// ===================== Edge Case Generators =====================

export const generateEmptyPortfolio = (): PortfolioSnapshot => 
  generatePortfolioSnapshot({
    totalValueUSD: 0,
    totalSuppliedUSD: 0,
    totalBorrowedUSD: 0,
    totalLiquidityUSD: 0,
    netWorth: 0,
    healthFactor: Number.MAX_SAFE_INTEGER,
    lendingPositions: [],
    liquidityPositions: [],
    tokenBalances: []
  });

export const generateHighRiskPortfolio = (): PortfolioSnapshot => 
  generatePortfolioSnapshot({
    totalSuppliedUSD: 5000,
    totalBorrowedUSD: 4500,
    healthFactor: 1.11, // Just above liquidation
    lendingPositions: [
      generateLendingPosition({
        suppliedUSD: 5000,
        borrowedUSD: 4500,
        healthFactor: 1.11
      })
    ]
  });

export const generateHighConcentrationPortfolio = (): PortfolioSnapshot =>
  generatePortfolioSnapshot({
    lendingPositions: [
      generateLendingPosition({
        tokenSymbol: 'RISKY',
        suppliedUSD: 9000, // 90% concentration
        valueUSD: 9000
      }),
      generateLendingPosition({
        tokenSymbol: 'SAFE',
        suppliedUSD: 1000,
        valueUSD: 1000
      })
    ]
  });

// ===================== Functional Combinators =====================

export const withRandomSeed = <T>(generator: () => T, seed: number): T => {
  const originalRandom = Math.random;
  Math.random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
  
  try {
    return generator();
  } finally {
    Math.random = originalRandom;
  }
};

export const generateMany = <T>(generator: () => T, count: number): ReadonlyArray<T> =>
  pipe(
    A.makeBy(count, generator),
    A.map(fn => fn())
  );

export type Generator<T> = () => T;

export const combineGenerators = <A, B, C>(
  genA: Generator<A>,
  genB: Generator<B>,
  combiner: (a: A, b: B) => C
): Generator<C> => 
  () => combiner(genA(), genB());