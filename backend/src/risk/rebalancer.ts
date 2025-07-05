/**
 * Portfolio Rebalancing Engine
 * Functional rebalancing logic with Either types
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';
import * as Ord from 'fp-ts/Ord';
import * as O from 'fp-ts/Option';
import { WalletAddress, PortfolioSnapshot } from '../types/portfolio';
import {
  RebalancePlan,
  RebalanceTarget,
  RebalanceConstraints,
  AssetAllocation,
  RiskAssessmentResult,
  RiskCalculationError
} from './types';
import { calculateAssetAllocations } from './calculations';

// ===================== Error Constructors =====================

const mkRebalanceError = (message: string, context: string): RiskCalculationError => ({
  type: 'calculation',
  message,
  context,
  timestamp: Date.now()
});

// ===================== Target Allocation Strategies =====================

type AllocationStrategy = 'equal_weight' | 'risk_parity' | 'market_cap' | 'minimum_variance';

interface TargetAllocationConfig {
  readonly strategy: AllocationStrategy;
  readonly constraints: RebalanceConstraints;
  readonly customTargets?: ReadonlyMap<string, number>;
}

const calculateEqualWeightTargets = (
  assets: ReadonlyArray<string>
): ReadonlyMap<string, number> => {
  const weight = 1.0 / assets.length;
  return new Map(assets.map(asset => [asset, weight]));
};

const calculateRiskParityTargets = (
  allocations: ReadonlyArray<AssetAllocation>
): ReadonlyMap<string, number> => {
  const totalInverseVol = pipe(
    allocations,
    A.map(a => a.volatility > 0 ? 1 / a.volatility : 1),
    A.reduce(0, N.MonoidSum.concat)
  );

  return new Map(
    allocations.map(allocation => [
      allocation.symbol,
      totalInverseVol > 0 ? (1 / Math.max(allocation.volatility, 0.01)) / totalInverseVol : 0
    ])
  );
};

const calculateMarketCapTargets = (
  allocations: ReadonlyArray<AssetAllocation>
): ReadonlyMap<string, number> => {
  const totalValue = pipe(
    allocations,
    A.map(a => a.valueUSD),
    A.reduce(0, N.MonoidSum.concat)
  );

  return new Map(
    allocations.map(allocation => [
      allocation.symbol,
      totalValue > 0 ? allocation.valueUSD / totalValue : 0
    ])
  );
};

const calculateTargetAllocations = (
  config: TargetAllocationConfig,
  allocations: ReadonlyArray<AssetAllocation>
): E.Either<RiskCalculationError, ReadonlyMap<string, number>> => {
  if (config.customTargets) {
    return E.right(config.customTargets);
  }

  const assets = allocations.map(a => a.symbol);

  switch (config.strategy) {
    case 'equal_weight':
      return E.right(calculateEqualWeightTargets(assets));
    
    case 'risk_parity':
      return E.right(calculateRiskParityTargets(allocations));
    
    case 'market_cap':
      return E.right(calculateMarketCapTargets(allocations));
    
    case 'minimum_variance':
      // Simplified minimum variance - would need optimization in practice
      return E.right(calculateRiskParityTargets(allocations));
    
    default:
      return E.left(mkRebalanceError(
        `Unknown allocation strategy: ${config.strategy}`,
        'calculateTargetAllocations'
      ));
  }
};

// ===================== Rebalance Target Calculation =====================

const calculateRebalanceTargets = (
  currentAllocations: ReadonlyArray<AssetAllocation>,
  targetAllocations: ReadonlyMap<string, number>,
  totalValue: number
): ReadonlyArray<RebalanceTarget> =>
  pipe(
    currentAllocations,
    A.map(allocation => {
      const targetWeight = targetAllocations.get(allocation.symbol) || 0;
      const deltaUSD = (targetWeight - allocation.weight) * totalValue;
      
      return {
        symbol: allocation.symbol,
        currentWeight: allocation.weight,
        targetWeight,
        deltaUSD
      };
    }),
    A.filter(target => Math.abs(target.deltaUSD) > 0)
  );

// ===================== Constraint Validation =====================

const validateConstraints = (
  targets: ReadonlyArray<RebalanceTarget>,
  constraints: RebalanceConstraints
): E.Either<RiskCalculationError, ReadonlyArray<RebalanceTarget>> => {
  // Filter targets by minimum trade size
  const validTargets = targets.filter(target => 
    Math.abs(target.deltaUSD) >= constraints.minTradeSize
  );

  // Check allowed tokens
  const invalidTokens = validTargets.filter(target => 
    !constraints.allowedTokens.has(target.symbol)
  );

  if (invalidTokens.length > 0) {
    return E.left(mkRebalanceError(
      `Invalid tokens for rebalancing: ${invalidTokens.map(t => t.symbol).join(', ')}`,
      'validateConstraints'
    ));
  }

  return E.right(validTargets);
};

// ===================== Cost Estimation =====================

interface RebalanceCost {
  readonly gasCost: number;
  readonly slippageCost: number;
  readonly totalCost: number;
  readonly costPercentage: number;
}

const estimateRebalanceCost = (
  targets: ReadonlyArray<RebalanceTarget>,
  constraints: RebalanceConstraints,
  totalValue: number
): RebalanceCost => {
  const totalTradeValue = pipe(
    targets,
    A.map(target => Math.abs(target.deltaUSD)),
    A.reduce(0, N.MonoidSum.concat)
  );

  // Simplified cost estimation
  const gasCost = targets.length * 50; // $50 per trade // TODO: REMOVE_MOCK - Hard-coded currency values
  const slippageCost = totalTradeValue * constraints.maxSlippage;
  const totalCost = gasCost + slippageCost;

  return {
    gasCost,
    slippageCost,
    totalCost,
    costPercentage: totalValue > 0 ? totalCost / totalValue : 0
  };
};

// ===================== Risk Impact Assessment =====================

const assessRiskImpact = (
  currentAssessment: RiskAssessmentResult,
  targets: ReadonlyArray<RebalanceTarget>
): number => {
  // Simplified risk impact calculation
  // In practice, this would involve re-calculating risk metrics with new allocations
  const diversificationImprovement = calculateDiversificationImprovement(targets);
  const concentrationReduction = calculateConcentrationReduction(targets);
  
  return (diversificationImprovement + concentrationReduction) / 2;
};

const calculateDiversificationImprovement = (
  targets: ReadonlyArray<RebalanceTarget>
): number => {
  // Calculate how much the rebalancing improves diversification
  const weightChanges = targets.map(t => Math.abs(t.targetWeight - t.currentWeight));
  const avgWeightChange = weightChanges.length > 0 
    ? weightChanges.reduce((sum, change) => sum + change, 0) / weightChanges.length
    : 0;
  
  return Math.min(1, avgWeightChange * 10); // Scale to 0-1
};

const calculateConcentrationReduction = (
  targets: ReadonlyArray<RebalanceTarget>
): number => {
  const currentMax = Math.max(...targets.map(t => t.currentWeight));
  const targetMax = Math.max(...targets.map(t => t.targetWeight));
  
  return Math.max(0, currentMax - targetMax);
};

// ===================== Rebalance Plan Generation =====================

const createRebalancePlan = (
  walletAddress: WalletAddress,
  targets: ReadonlyArray<RebalanceTarget>,
  cost: RebalanceCost,
  riskImprovement: number
): RebalancePlan => ({
  id: `rebalance_${walletAddress}_${Date.now()}`,
  walletAddress,
  targets,
  totalTradeValue: pipe(
    targets,
    A.map(target => Math.abs(target.deltaUSD)),
    A.reduce(0, N.MonoidSum.concat)
  ),
  estimatedCost: cost.totalCost,
  riskImprovement,
  timestamp: new Date().toISOString()
});

// ===================== Optimization Functions =====================

const optimizeRebalanceTargets = (
  targets: ReadonlyArray<RebalanceTarget>,
  constraints: RebalanceConstraints
): ReadonlyArray<RebalanceTarget> => {
  // Sort by absolute delta (largest trades first)
  const sortedTargets = pipe(
    targets,
    A.sortBy([Ord.contramap((target: RebalanceTarget) => Math.abs(target.deltaUSD) * -1)(N.Ord)])
  );

  // Apply trade size limits
  return sortedTargets.map(target => ({
    ...target,
    deltaUSD: Math.sign(target.deltaUSD) * Math.min(
      Math.abs(target.deltaUSD),
      constraints.maxSlippage * 10000 // Max trade size based on slippage tolerance
    )
  }));
};

// ===================== Main Rebalancing Functions =====================

export const generateRebalancePlan = (
  snapshot: PortfolioSnapshot,
  currentAssessment: RiskAssessmentResult,
  config: TargetAllocationConfig
): E.Either<RiskCalculationError, RebalancePlan> =>
  pipe(
    E.Do,
    E.bind('allocations', () => 
      E.right(calculateAssetAllocations(snapshot, new Map()))
    ),
    E.bind('targetAllocations', ({ allocations }) =>
      calculateTargetAllocations(config, allocations)
    ),
    E.bind('rawTargets', ({ allocations, targetAllocations }) =>
      E.right(calculateRebalanceTargets(allocations, targetAllocations, snapshot.totalValueUSD))
    ),
    E.bind('validTargets', ({ rawTargets }) =>
      validateConstraints(rawTargets, config.constraints)
    ),
    E.bind('optimizedTargets', ({ validTargets }) =>
      E.right(optimizeRebalanceTargets(validTargets, config.constraints))
    ),
    E.map(({ optimizedTargets }) => {
      const cost = estimateRebalanceCost(optimizedTargets, config.constraints, snapshot.totalValueUSD);
      const riskImprovement = assessRiskImpact(currentAssessment, optimizedTargets);
      
      return createRebalancePlan(snapshot.walletAddress, optimizedTargets, cost, riskImprovement);
    })
  );

export const evaluateRebalanceNeed = (
  snapshot: PortfolioSnapshot,
  assessment: RiskAssessmentResult,
  thresholdDrift: number = 0.05
): boolean => {
  const allocations = calculateAssetAllocations(snapshot, new Map());
  const maxDrift = pipe(
    allocations,
    A.map(allocation => Math.abs(allocation.weight - (1 / allocations.length))),
    A.reduce(0, Math.max)
  );

  return maxDrift > thresholdDrift || assessment.riskScore.level === 'high' || assessment.riskScore.level === 'critical';
};

export const shouldExecuteRebalance = (
  plan: RebalancePlan,
  costThreshold: number = 0.02 // 2% of portfolio
): boolean => {
  const costPercentage = plan.totalTradeValue > 0 ? plan.estimatedCost / plan.totalTradeValue : 0;
  return costPercentage <= costThreshold && plan.riskImprovement > 0.1;
};

// ===================== Emergency Rebalancing =====================

export const generateEmergencyRebalance = (
  snapshot: PortfolioSnapshot,
  assessment: RiskAssessmentResult
): E.Either<RiskCalculationError, RebalancePlan> => {
  // Emergency rebalancing to reduce risk immediately
  const safeAssets = ['USDC', 'USDT', 'DAI']; // Stable coins // TODO: REMOVE_MOCK - Hard-coded array literals
  const currentAllocations = calculateAssetAllocations(snapshot, new Map());
  
  // Target: 50% stable coins, rest equally distributed
  const stableWeight = 0.5;
  const otherWeight = 0.5 / Math.max(1, currentAllocations.length - safeAssets.length);
  
  const emergencyTargets = new Map<string, number>();
  currentAllocations.forEach(allocation => {
    const weight = safeAssets.includes(allocation.symbol) ? stableWeight / safeAssets.length : otherWeight;
    emergencyTargets.set(allocation.symbol, weight);
  });

  const config: TargetAllocationConfig = {
    strategy: 'equal_weight',
    constraints: {
      minTradeSize: 10, // Lower threshold for emergency
      maxSlippage: 0.05, // Higher slippage tolerance
      maxGasCost: 1000,
      allowedTokens: new Set(currentAllocations.map(a => a.symbol))
    },
    customTargets: emergencyTargets
  };

  return generateRebalancePlan(snapshot, assessment, config);
};

// ===================== Utility Functions =====================

export const getRebalanceRecommendation = (
  assessment: RiskAssessmentResult,
  plan?: RebalancePlan
): O.Option<string> => {
  if (assessment.riskScore.level === 'critical') {
    return O.some('Immediate rebalancing required to reduce critical risk');
  }
  
  if (assessment.riskScore.level === 'high') {
    return O.some('Rebalancing recommended to improve risk profile');
  }
  
  if (plan && plan.riskImprovement > 0.2) {
    return O.some('Rebalancing would significantly improve portfolio diversification');
  }
  
  return O.none;
};

export const calculateMinimumRebalanceAmount = (
  totalValue: number,
  constraints: RebalanceConstraints
): number =>
  Math.max(constraints.minTradeSize, totalValue * 0.01); // At least 1% of portfolio

export const prioritizeRebalanceTargets = (
  targets: ReadonlyArray<RebalanceTarget>
): ReadonlyArray<RebalanceTarget> =>
  pipe(
    targets,
    A.sortBy([
      Ord.contramap((target: RebalanceTarget) => Math.abs(target.deltaUSD) * -1)(N.Ord), // Largest trades first
      Ord.contramap((target: RebalanceTarget) => Math.abs(target.targetWeight - target.currentWeight) * -1)(N.Ord) // Biggest weight changes first
    ])
  );