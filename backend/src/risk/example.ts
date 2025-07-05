/**
 * Risk Management System Usage Example
 * Demonstrates the functional usage patterns
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { PortfolioSnapshot } from '../types/portfolio';
import {
  completeRiskAnalysis,
  assessRisk,
  generateRebalancePlan,
  processAlerts,
  createDefaultAlertConfig,
  DEFAULT_RISK_THRESHOLDS
} from './index';

// Example usage of the risk management system
export const exampleRiskAssessment = async () => {
  // Mock portfolio snapshot // TODO: REMOVE_MOCK - Mock-related keywords
  const mockSnapshot: PortfolioSnapshot = { // TODO: REMOVE_MOCK - Mock-related keywords
    walletAddress: '0x1234567890abcdef',
    totalValueUSD: 100000,
    totalSuppliedUSD: 80000,
    totalBorrowedUSD: 40000,
    totalLiquidityUSD: 60000,
    netWorth: 60000,
    healthFactor: 1.25, // Low health factor
    lendingPositions: [
      {
        id: 'lending_1',
        walletAddress: '0x1234567890abcdef',
        platform: 'aave',
        type: 'supply',
        token: '0xtoken1',
        tokenSymbol: 'ETH',
        amount: '10',
        amountFormatted: '10.0',
        valueUSD: 30000,
        apy: 0.05,
        healthContribution: 0.8,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'lending_2',
        walletAddress: '0x1234567890abcdef',
        platform: 'aave',
        type: 'borrow',
        token: '0xtoken2',
        tokenSymbol: 'USDC',
        amount: '40000',
        amountFormatted: '40,000.0',
        valueUSD: 40000,
        apy: 0.08,
        healthContribution: -0.8,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    ],
    liquidityPositions: [
      {
        id: 'lp_1',
        walletAddress: '0x1234567890abcdef',
        platform: 'uniswap',
        poolId: 'pool_1',
        token0: '0xtoken1',
        token1: '0xtoken2',
        token0Symbol: 'ETH',
        token1Symbol: 'USDC',
        liquidity: '1000000',
        token0Amount: '10',
        token1Amount: '30000',
        valueUSD: 60000,
        feeApr: 0.15,
        totalApr: 0.20,
        uncollectedFees: {
          token0: '0.1',
          token1: '300',
          valueUSD: 500
        },
        priceRange: {
          lower: 2800,
          upper: 3200,
          current: 3000
        },
        isInRange: true,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    ],
    tokenBalances: [
      {
        token: '0xtoken1',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        balance: BigInt('10000000000000000000'), // 10 ETH
        balanceFormatted: '10.0',
        valueUSD: 30000,
        priceUSD: 3000,
        change24h: 0.05
      }
    ],
    timestamp: new Date().toISOString(),
    blockNumber: 123456
  };

  // Mock user risk profile // TODO: REMOVE_MOCK - Mock-related keywords
  const userProfile = {
    walletAddress: '0x1234567890abcdef' as const,
    riskTolerance: 'moderate' as const,
    autoRebalance: true,
    customThresholds: {
      healthFactor: { critical: 1.15, high: 1.30, medium: 1.50 }
    }
  };

  // Mock price data // TODO: REMOVE_MOCK - Mock-related keywords
  const priceData = new Map([
    ['ETH', { symbol: 'ETH', price: 3000, change24h: 0.05, volatility: 0.04, timestamp: Date.now() }],
    ['USDC', { symbol: 'USDC', price: 1, change24h: 0.001, volatility: 0.001, timestamp: Date.now() }]
  ]);

  // Mock correlation data // TODO: REMOVE_MOCK - Mock-related keywords
  const correlationData = [
    { pair: ['ETH', 'USDC'] as const, correlation: 0.1, period: 30, confidence: 0.95 }
  ];

  // Example 1: Simple risk assessment
  console.log('=== Example 1: Simple Risk Assessment ===');
  const simpleAssessment = await pipe(
    assessRisk(mockSnapshot, DEFAULT_RISK_THRESHOLDS.MODERATE, priceData, correlationData), // TODO: REMOVE_MOCK - Mock-related keywords
    TE.match(
      error => {
        console.error('Risk assessment failed:', error);
        return null;
      },
      assessment => {
        console.log('Risk Score:', assessment.riskScore);
        console.log('Risk Level:', assessment.riskScore.level);
        console.log('Health Factor:', assessment.metrics.healthFactor);
        console.log('Concentration Risk:', assessment.metrics.concentration);
        console.log('Active Alerts:', assessment.alerts.length);
        return assessment;
      }
    )
  )();

  if (!simpleAssessment) return;

  // Example 2: Complete risk analysis with recommendations
  console.log('\n=== Example 2: Complete Risk Analysis ===');
  const rebalanceConstraints = {
    minTradeSize: 100,
    maxSlippage: 0.02,
    maxGasCost: 100,
    allowedTokens: new Set(['ETH', 'USDC', 'DAI']) // TODO: REMOVE_MOCK - Hard-coded array literals
  };

  const completeAnalysis = await pipe(
    completeRiskAnalysis(mockSnapshot, userProfile, priceData, correlationData, rebalanceConstraints), // TODO: REMOVE_MOCK - Mock-related keywords
    TE.match(
      error => {
        console.error('Complete analysis failed:', error);
        return null;
      },
      result => {
        console.log('Overall Risk Level:', result.assessment.riskScore.level);
        console.log('Active Alerts:', result.alerts.length);
        console.log('Rebalance Plan Generated:', !!result.rebalancePlan);
        console.log('Recommendation:', result.recommendation);
        
        if (result.rebalancePlan) {
          console.log('Rebalance Targets:', result.rebalancePlan.targets.length);
          console.log('Total Trade Value:', result.rebalancePlan.totalTradeValue);
          console.log('Risk Improvement:', result.rebalancePlan.riskImprovement);
        }
        
        return result;
      }
    )
  )();

  // Example 3: Alert processing
  console.log('\n=== Example 3: Alert Processing ===');
  if (simpleAssessment) {
    const alertConfig = createDefaultAlertConfig();
    const alertResult = processAlerts(
      simpleAssessment,
      DEFAULT_RISK_THRESHOLDS.MODERATE,
      alertConfig
    );

    pipe(
      alertResult,
      E.match(
        error => console.error('Alert processing failed:', error),
        result => {
          console.log('Generated Alerts:', result.alerts.length);
          result.alerts.forEach(alert => {
            console.log(`- ${alert.severity.toUpperCase()}: ${alert.message}`);
          });
        }
      )
    );
  }

  return completeAnalysis;
};

// Example of error handling patterns
export const exampleErrorHandling = () => {
  console.log('\n=== Example 4: Functional Error Handling ===');
  
  // Invalid portfolio snapshot
  const invalidSnapshot = {} as PortfolioSnapshot;
  
  return pipe(
    assessRisk(invalidSnapshot, DEFAULT_RISK_THRESHOLDS.MODERATE, new Map()),
    TE.match(
      error => {
        console.log('Properly handled error:', error.type, '-', error.message);
        return { success: false, error };
      },
      assessment => {
        console.log('Unexpected success');
        return { success: true, error: null as any };
      }
    )
  )();
};

// Run examples if this file is executed directly
if (require.main === module) {
  exampleRiskAssessment()
    .then(() => exampleErrorHandling())
    .then(() => console.log('\n=== Examples completed ==='))
    .catch(console.error);
}