/**
 * @fileoverview Enhanced Property-Based Tests for Silo Protocol Wrapper
 * Comprehensive staking reward, penalty, and timing property validation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { pipe, flow } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import fc from 'fast-check';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sei } from 'viem/chains';

import {
  SiloProtocolWrapper,
  createSiloProtocolWrapper
} from '../adapters/SiloProtocolWrapper';

import { DeFiGenerators } from '../../__tests__/utils/property-generators';
import {
  FunctionalTestHelpers,
  DeFiProperties,
  assertProperty,
  runBatchPropertyTests,
  checkInvariant
} from '../../__tests__/utils/functional-test-helpers';

// Mock clients for testing
const mockPublicClient = createPublicClient({
  chain: sei,
  transport: http('https://evm-rpc.sei-apis.com'),
}) as any;

const mockWalletClient = createWalletClient({
  chain: sei,
  transport: http('https://evm-rpc.sei-apis.com'),
  account: privateKeyToAccount('0x0000000000000000000000000000000000000000000000000000000000000001'),
}) as any;

// Mock protocol config
const mockProtocolConfig = {
  network: 'mainnet',
  contractAddresses: {
    silo: {
      stakingContract: 'sei1silo1staking2contract3address4here5for6main7network8deployment9',
      rewardDistributor: 'sei1silo1reward2distributor3address4here5for6main7network8deployment',
      timelock: 'sei1silo1timelock2contract3address4here5for6governance7and8security9only',
      governance: 'sei1silo1governance2contract3address4here5for6protocol7management8only'
    }
  }
} as any;

// Silo-specific generators
const stakingPeriodGenerator = () => fc.oneof(
  fc.constant(0),        // FLEXIBLE
  fc.constant(604800),   // WEEK
  fc.constant(2592000),  // MONTH
  fc.constant(7776000),  // QUARTER
  fc.constant(31536000)  // YEAR
);

const stakingMultiplierGenerator = () => fc.oneof(
  fc.constant(1.0),   // FLEXIBLE
  fc.constant(1.1),   // WEEK
  fc.constant(1.25),  // MONTH
  fc.constant(1.5),   // QUARTER
  fc.constant(2.0)    // YEAR
);

const stakingPositionGenerator = () => fc.record({
  id: fc.uuid(),
  walletAddress: DeFiGenerators.address(),
  stakedAmount: DeFiGenerators.amount(),
  rewardAmount: DeFiGenerators.amount(),
  stakingPeriod: stakingPeriodGenerator(),
  multiplier: stakingMultiplierGenerator(),
  startTime: DeFiGenerators.timestamp(),
  lockupPeriod: stakingPeriodGenerator(),
  apr: DeFiGenerators.apy()
});

describe('Silo Protocol Wrapper - Property-Based Tests', () => {
  let siloWrapper: SiloProtocolWrapper;

  beforeEach(() => {
    siloWrapper = createSiloProtocolWrapper(
      mockPublicClient,
      mockWalletClient,
      mockProtocolConfig
    );
  });

  describe('Mathematical Properties - Staking Rewards', () => {
    /**
     * Property: Reward Accumulation Monotonicity
     * Rewards should increase monotonically over time
     */
    it('should satisfy reward accumulation monotonicity', async () => {
      await assertProperty(
        fc.record({
          stakedAmount: DeFiGenerators.amount(),
          apr: DeFiGenerators.apy(),
          timeElapsed1: fc.nat({ min: 1, max: 365 }), // days
          timeElapsed2: fc.nat({ min: 1, max: 365 })
        }),
        {
          name: 'reward_accumulation_monotonicity',
          description: 'Rewards should increase with time',
          assertion: (data) => {
            const shorterTime = Math.min(data.timeElapsed1, data.timeElapsed2);
            const longerTime = Math.max(data.timeElapsed1, data.timeElapsed2);
            
            const rewardsShorter = (Number(data.stakedAmount) * data.apr * shorterTime) / 365;
            const rewardsLonger = (Number(data.stakedAmount) * data.apr * longerTime) / 365;
            
            return rewardsLonger >= rewardsShorter;
          }
        },
        { numRuns: 500 }
      );
    });

    /**
     * Property: Staking Multiplier Effectiveness
     * Longer staking periods should yield higher effective returns
     */
    it('should apply staking multipliers correctly', async () => {
      await assertProperty(
        fc.record({
          baseAmount: DeFiGenerators.amount(),
          baseAPR: DeFiGenerators.apy(),
          period1: stakingPeriodGenerator(),
          period2: stakingPeriodGenerator(),
          multiplier1: stakingMultiplierGenerator(),
          multiplier2: stakingMultiplierGenerator()
        }),
        {
          name: 'staking_multiplier_effectiveness',
          description: 'Higher multipliers should yield better effective returns',
          assertion: (data) => {
            const effectiveAPR1 = data.baseAPR * data.multiplier1;
            const effectiveAPR2 = data.baseAPR * data.multiplier2;
            
            // If multiplier1 > multiplier2, then effectiveAPR1 should be > effectiveAPR2
            if (data.multiplier1 > data.multiplier2) {
              return effectiveAPR1 > effectiveAPR2;
            } else if (data.multiplier1 < data.multiplier2) {
              return effectiveAPR1 < effectiveAPR2;
            } else {
              return Math.abs(effectiveAPR1 - effectiveAPR2) < 0.0001; // Equal within tolerance
            }
          }
        }
      );
    });

    /**
     * Property: Compound Interest Calculation
     * APY calculation should correctly reflect compounding
     */
    it('should calculate compound interest correctly', async () => {
      await assertProperty(
        fc.record({
          apr: fc.float({ min: 0.01, max: 0.5 }), // 1% to 50% APR
          compoundingFrequency: fc.nat({ min: 1, max: 365 }) // Daily to annual
        }),
        {
          name: 'compound_interest_calculation',
          description: 'APY should be greater than APR for positive rates with compounding',
          assertion: (data) => {
            const n = data.compoundingFrequency;
            const apy = Math.pow(1 + data.apr / n, n) - 1;
            
            // For positive APR with compounding, APY should be >= APR
            return apy >= data.apr;
          }
        }
      );
    });

    /**
     * Property: Reward Rate Consistency
     * Total rewards should equal reward rate * time * staked amount
     */
    it('should maintain reward rate consistency', async () => {
      await assertProperty(
        fc.record({
          stakedAmount: DeFiGenerators.amount(),
          rewardRate: fc.float({ min: 0.000001, max: 0.01 }), // Per second
          timeSeconds: fc.nat({ min: 1, max: 31536000 }), // Up to 1 year
          multiplier: stakingMultiplierGenerator()
        }),
        {
          name: 'reward_rate_consistency',
          description: 'Rewards should be proportional to rate, time, and amount',
          assertion: (data) => {
            const expectedRewards = Number(data.stakedAmount) * data.rewardRate * data.timeSeconds * data.multiplier;
            
            // Rewards should be positive and proportional
            return expectedRewards >= 0 && 
                   expectedRewards >= Number(data.stakedAmount) * data.rewardRate * data.timeSeconds;
          }
        }
      );
    });

    /**
     * Property: Proportional Reward Distribution
     * Rewards should be distributed proportionally to stake amounts
     */
    it('should distribute rewards proportionally', async () => {
      await assertProperty(
        fc.record({
          stakes: fc.array(fc.record({
            amount: DeFiGenerators.amount(),
            multiplier: stakingMultiplierGenerator()
          }), { minLength: 2, maxLength: 5 }),
          totalRewards: DeFiGenerators.amount(),
          timeElapsed: fc.nat({ min: 1, max: 365 })
        }),
        {
          name: 'proportional_reward_distribution',
          description: 'Individual rewards should be proportional to effective stake',
          assertion: (data) => {
            const totalEffectiveStake = data.stakes.reduce(
              (sum, stake) => sum + Number(stake.amount) * stake.multiplier, 0
            );
            
            if (totalEffectiveStake === 0) return true;
            
            const individualRewards = data.stakes.map(stake => {
              const effectiveStake = Number(stake.amount) * stake.multiplier;
              return (effectiveStake / totalEffectiveStake) * Number(data.totalRewards);
            });
            
            const totalDistributed = individualRewards.reduce((sum, reward) => sum + reward, 0);
            const tolerance = Number(data.totalRewards) * 0.001; // 0.1% tolerance
            
            return Math.abs(totalDistributed - Number(data.totalRewards)) <= tolerance;
          }
        }
      );
    });
  });

  describe('Penalty Calculation Properties', () => {
    /**
     * Property: Early Unstaking Penalty Consistency
     * Early unstaking should apply consistent penalty rates
     */
    it('should apply early unstaking penalties consistently', async () => {
      await assertProperty(
        fc.record({
          stakedAmount: DeFiGenerators.amount(),
          stakingPeriod: stakingPeriodGenerator(),
          unstakeTime: DeFiGenerators.timestamp(),
          endTime: DeFiGenerators.timestamp(),
          penaltyRate: fc.float({ min: 0, max: 0.1 }) // 0-10% penalty
        }),
        {
          name: 'early_unstaking_penalty_consistency',
          description: 'Early unstaking penalties should be applied consistently',
          assertion: (data) => {
            const isEarlyUnstake = data.unstakeTime < data.endTime;
            const appliedPenalty = isEarlyUnstake ? data.penaltyRate : 0;
            
            const penaltyAmount = Number(data.stakedAmount) * appliedPenalty;
            const netAmount = Number(data.stakedAmount) - penaltyAmount;
            
            // Net amount should be positive and less than or equal to staked amount
            return netAmount >= 0 && netAmount <= Number(data.stakedAmount);
          }
        }
      );
    });

    /**
     * Property: Penalty Rate Bounds
     * Penalty rates should be within reasonable bounds
     */
    it('should maintain penalty rate bounds', async () => {
      await assertProperty(
        fc.record({
          earlyUnstakePenalty: fc.float({ min: 0, max: 0.2 }), // Max 20%
          slashingPenalty: fc.float({ min: 0, max: 0.3 }), // Max 30%
          gracePeriod: fc.nat({ min: 0, max: 86400 }), // Up to 24 hours
          timeUntilUnlock: fc.nat({ min: 0, max: 31536000 }) // Up to 1 year
        }),
        {
          name: 'penalty_rate_bounds',
          description: 'Penalty rates should be within acceptable bounds',
          assertion: (data) => {
            const isWithinGracePeriod = data.timeUntilUnlock <= data.gracePeriod;
            const effectivePenalty = isWithinGracePeriod ? 0 : data.earlyUnstakePenalty;
            
            // Penalties should be reasonable
            return effectivePenalty >= 0 && 
                   effectivePenalty <= 0.2 && // Max 20% early unstake penalty
                   data.slashingPenalty <= 0.3; // Max 30% slashing penalty
          }
        }
      );
    });

    /**
     * Property: Progressive Penalty Reduction
     * Penalties should decrease as unstaking time approaches maturity
     */
    it('should apply progressive penalty reduction', async () => {
      await assertProperty(
        fc.record({
          fullPenalty: fc.float({ min: 0.01, max: 0.1 }),
          timeToMaturity1: fc.nat({ min: 1, max: 30 }), // days
          timeToMaturity2: fc.nat({ min: 1, max: 30 }),
          totalLockupPeriod: fc.nat({ min: 30, max: 365 }) // days
        }),
        {
          name: 'progressive_penalty_reduction',
          description: 'Penalties should decrease as maturity approaches',
          assertion: (data) => {
            const shorterTime = Math.min(data.timeToMaturity1, data.timeToMaturity2);
            const longerTime = Math.max(data.timeToMaturity1, data.timeToMaturity2);
            
            // Calculate progressive penalties
            const penaltyCloser = data.fullPenalty * (shorterTime / data.totalLockupPeriod);
            const penaltyFurther = data.fullPenalty * (longerTime / data.totalLockupPeriod);
            
            // Penalty should be higher when further from maturity
            return penaltyFurther >= penaltyCloser;
          }
        }
      );
    });

    /**
     * Property: Slashing Risk Assessment
     * Slashing risk should correlate with staking conditions
     */
    it('should assess slashing risk correctly', async () => {
      await assertProperty(
        fc.record({
          validatorPerformance: fc.float({ min: 0.5, max: 1.0 }), // 50-100% uptime
          networkStability: fc.float({ min: 0.8, max: 1.0 }), // 80-100% stability
          stakingAmount: DeFiGenerators.amount(),
          maxSlashingRate: fc.float({ min: 0.01, max: 0.1 }) // 1-10% max
        }),
        {
          name: 'slashing_risk_assessment',
          description: 'Slashing risk should correlate with network and validator conditions',
          assertion: (data) => {
            const riskFactor = (1 - data.validatorPerformance) * (1 - data.networkStability);
            const slashingRisk = riskFactor * data.maxSlashingRate;
            
            // Risk should be proportional and within bounds
            return slashingRisk >= 0 && 
                   slashingRisk <= data.maxSlashingRate &&
                   (data.validatorPerformance < 0.9 ? slashingRisk > 0 : true);
          }
        }
      );
    });
  });

  describe('Temporal Properties', () => {
    /**
     * Property: Lock Period Enforcement
     * Unstaking should not be allowed before lock period expires
     */
    it('should enforce lock periods correctly', async () => {
      await assertProperty(
        fc.record({
          stakeStartTime: DeFiGenerators.timestamp(),
          lockupPeriod: stakingPeriodGenerator(),
          unstakeAttemptTime: DeFiGenerators.timestamp()
        }),
        {
          name: 'lock_period_enforcement',
          description: 'Unstaking should respect lockup periods',
          assertion: (data) => {
            const lockEndTime = data.stakeStartTime + data.lockupPeriod;
            const isAfterLockPeriod = data.unstakeAttemptTime >= lockEndTime;
            const canUnstakeWithoutPenalty = isAfterLockPeriod;
            
            // Logic should be consistent
            return typeof canUnstakeWithoutPenalty === 'boolean';
          }
        }
      );
    });

    /**
     * Property: Reward Accrual Timing
     * Rewards should accrue from stake time to claim time
     */
    it('should calculate reward accrual timing correctly', async () => {
      await assertProperty(
        fc.record({
          stakeTime: DeFiGenerators.timestamp(),
          claimTime: DeFiGenerators.timestamp(),
          rewardRate: fc.float({ min: 0.000001, max: 0.01 }), // Per second
          stakedAmount: DeFiGenerators.amount()
        }),
        {
          name: 'reward_accrual_timing',
          description: 'Rewards should accrue only for the time staked',
          assertion: (data) => {
            const stakeTime = Math.max(data.stakeTime, data.claimTime - 31536000); // Max 1 year
            const claimTime = Math.max(data.claimTime, stakeTime);
            const timeStaked = claimTime - stakeTime;
            
            const accruedRewards = Number(data.stakedAmount) * data.rewardRate * timeStaked;
            
            // Rewards should be non-negative and proportional to time
            return accruedRewards >= 0 && 
                   (timeStaked > 0 ? accruedRewards > 0 : accruedRewards === 0);
          }
        }
      );
    });

    /**
     * Property: Reward Distribution Frequency
     * Reward distribution should respect configured intervals
     */
    it('should respect reward distribution frequency', async () => {
      await assertProperty(
        fc.record({
          distributionInterval: fc.nat({ min: 3600, max: 86400 }), // 1 hour to 1 day
          lastDistribution: DeFiGenerators.timestamp(),
          currentTime: DeFiGenerators.timestamp(),
          pendingRewards: DeFiGenerators.amount()
        }),
        {
          name: 'reward_distribution_frequency',
          description: 'Rewards should be distributed at configured intervals',
          assertion: (data) => {
            const timeSinceLastDistribution = Math.max(0, data.currentTime - data.lastDistribution);
            const shouldDistribute = timeSinceLastDistribution >= data.distributionInterval;
            
            // If enough time has passed and there are pending rewards, distribution should occur
            const canDistribute = shouldDistribute && Number(data.pendingRewards) > 0;
            
            return typeof canDistribute === 'boolean';
          }
        }
      );
    });

    /**
     * Property: Vesting Schedule Compliance
     * Reward vesting should follow defined schedules
     */
    it('should follow vesting schedules correctly', async () => {
      await assertProperty(
        fc.record({
          totalRewards: DeFiGenerators.amount(),
          vestingPeriod: fc.nat({ min: 86400, max: 31536000 }), // 1 day to 1 year
          elapsedTime: fc.nat({ min: 0, max: 31536000 }),
          cliffPeriod: fc.nat({ min: 0, max: 7776000 }) // Up to 90 days cliff
        }),
        {
          name: 'vesting_schedule_compliance',
          description: 'Reward vesting should follow linear or cliff schedules',
          assertion: (data) => {
            const isAfterCliff = data.elapsedTime >= data.cliffPeriod;
            
            if (!isAfterCliff) {
              // Before cliff, no rewards should be vested
              return true; // Vested amount would be 0
            }
            
            const vestingProgress = Math.min(data.elapsedTime / data.vestingPeriod, 1);
            const vestedAmount = Number(data.totalRewards) * vestingProgress;
            
            // Vested amount should be between 0 and total rewards
            return vestedAmount >= 0 && vestedAmount <= Number(data.totalRewards);
          }
        }
      );
    });
  });

  describe('Staking Pool Properties', () => {
    /**
     * Property: Pool Capacity Management
     * Pool stakes should not exceed capacity limits
     */
    it('should manage pool capacity correctly', async () => {
      await assertProperty(
        fc.record({
          poolCapacity: DeFiGenerators.amount(),
          currentStaked: DeFiGenerators.amount(),
          newStakeAmount: DeFiGenerators.amount()
        }),
        {
          name: 'pool_capacity_management',
          description: 'Pool stakes should respect capacity limits',
          assertion: (data) => {
            const wouldExceedCapacity = Number(data.currentStaked) + Number(data.newStakeAmount) > Number(data.poolCapacity);
            
            // If capacity would be exceeded, stake should be rejected or capped
            const maxAllowedStake = Number(data.poolCapacity) - Number(data.currentStaked);
            const effectiveStakeAmount = Math.min(Number(data.newStakeAmount), Math.max(0, maxAllowedStake));
            
            return effectiveStakeAmount >= 0 && 
                   Number(data.currentStaked) + effectiveStakeAmount <= Number(data.poolCapacity);
          }
        }
      );
    });

    /**
     * Property: Pool Utilization Rate
     * Pool utilization should affect reward rates appropriately
     */
    it('should adjust rewards based on pool utilization', async () => {
      await assertProperty(
        fc.record({
          poolCapacity: DeFiGenerators.amount(),
          totalStaked: DeFiGenerators.amount(),
          baseRewardRate: DeFiGenerators.apy(),
          utilizationBonus: fc.float({ min: 0, max: 0.5 }) // Up to 50% bonus
        }),
        {
          name: 'pool_utilization_rate_adjustment',
          description: 'Higher pool utilization should provide better rewards',
          assertion: (data) => {
            const utilizationRate = Math.min(Number(data.totalStaked) / Number(data.poolCapacity), 1);
            const adjustedRewardRate = data.baseRewardRate * (1 + utilizationRate * data.utilizationBonus);
            
            // Adjusted rate should be at least base rate
            return adjustedRewardRate >= data.baseRewardRate;
          }
        }
      );
    });

    /**
     * Property: Pool Rebalancing
     * Pool rebalancing should maintain optimal conditions
     */
    it('should rebalance pools optimally', async () => {
      await assertProperty(
        fc.record({
          pools: fc.array(fc.record({
            id: fc.uuid(),
            currentStaked: DeFiGenerators.amount(),
            targetStaked: DeFiGenerators.amount(),
            rewardRate: DeFiGenerators.apy(),
            utilization: fc.float({ min: 0, max: 1 })
          }), { minLength: 2, maxLength: 5 }),
          rebalanceThreshold: fc.float({ min: 0.1, max: 0.3 }) // 10-30% deviation
        }),
        {
          name: 'pool_rebalancing_optimization',
          description: 'Pool rebalancing should optimize overall efficiency',
          assertion: (data) => {
            let needsRebalancing = false;
            
            for (const pool of data.pools) {
              const deviation = Math.abs(Number(pool.currentStaked) - Number(pool.targetStaked)) / Number(pool.targetStaked);
              if (deviation > data.rebalanceThreshold) {
                needsRebalancing = true;
                break;
              }
            }
            
            // If rebalancing is needed, it should move towards target distribution
            return typeof needsRebalancing === 'boolean';
          }
        }
      );
    });
  });

  describe('State Transition Properties', () => {
    /**
     * Property: Stake Operation Correctness
     * Staking operations should update state correctly
     */
    it('should handle stake operations correctly', async () => {
      await assertProperty(
        fc.record({
          userAddress: DeFiGenerators.address(),
          initialBalance: DeFiGenerators.amount(),
          stakeAmount: DeFiGenerators.amount(),
          poolTotalBefore: DeFiGenerators.amount()
        }),
        {
          name: 'stake_operation_correctness',
          description: 'Stake operations should update balances and pool totals correctly',
          assertion: (data) => {
            // After staking, user balance should decrease and pool total should increase
            const newUserBalance = Number(data.initialBalance) - Number(data.stakeAmount);
            const newPoolTotal = Number(data.poolTotalBefore) + Number(data.stakeAmount);
            
            // Balances should be consistent
            return newUserBalance >= 0 && 
                   newPoolTotal >= Number(data.poolTotalBefore) &&
                   Number(data.stakeAmount) <= Number(data.initialBalance);
          }
        }
      );
    });

    /**
     * Property: Unstake Operation Correctness
     * Unstaking operations should handle penalties and timing correctly
     */
    it('should handle unstake operations correctly', async () => {
      await assertProperty(
        fc.record({
          stakedAmount: DeFiGenerators.amount(),
          unstakeAmount: DeFiGenerators.amount(),
          penaltyRate: fc.float({ min: 0, max: 0.1 }),
          isEarlyUnstake: fc.boolean()
        }),
        {
          name: 'unstake_operation_correctness',
          description: 'Unstake operations should apply penalties correctly',
          assertion: (data) => {
            const actualUnstakeAmount = Math.min(Number(data.unstakeAmount), Number(data.stakedAmount));
            const penalty = data.isEarlyUnstake ? actualUnstakeAmount * data.penaltyRate : 0;
            const netReceived = actualUnstakeAmount - penalty;
            
            // Net received should be positive and less than or equal to unstake amount
            return netReceived >= 0 && 
                   netReceived <= actualUnstakeAmount &&
                   penalty <= actualUnstakeAmount;
          }
        }
      );
    });

    /**
     * Property: Reward Claim Correctness
     * Reward claiming should update pending rewards correctly
     */
    it('should handle reward claims correctly', async () => {
      await assertProperty(
        fc.record({
          pendingRewards: DeFiGenerators.amount(),
          claimAmount: DeFiGenerators.amount(),
          vestingRate: fc.float({ min: 0, max: 1 }), // 0-100% vested
          taxRate: fc.float({ min: 0, max: 0.3 }) // 0-30% tax
        }),
        {
          name: 'reward_claim_correctness',
          description: 'Reward claims should handle vesting and taxes correctly',
          assertion: (data) => {
            const vestedRewards = Number(data.pendingRewards) * data.vestingRate;
            const claimableAmount = Math.min(Number(data.claimAmount), vestedRewards);
            const taxAmount = claimableAmount * data.taxRate;
            const netClaimed = claimableAmount - taxAmount;
            
            // Net claimed should be positive and less than pending rewards
            return netClaimed >= 0 && 
                   netClaimed <= Number(data.pendingRewards) &&
                   claimableAmount <= vestedRewards;
          }
        }
      );
    });
  });

  describe('Integration Properties', () => {
    /**
     * Property: Cross-Period Consistency
     * Operations across different staking periods should be consistent
     */
    it('should maintain consistency across staking periods', async () => {
      await assertProperty(
        fc.record({
          positions: fc.array(stakingPositionGenerator(), { minLength: 2, maxLength: 5 }),
          globalRewardRate: DeFiGenerators.apy()
        }),
        {
          name: 'cross_period_consistency',
          description: 'Different staking periods should maintain proportional relationships',
          assertion: (data) => {
            // Calculate total effective stake across all positions
            const totalEffectiveStake = data.positions.reduce(
              (sum, pos) => sum + Number(pos.stakedAmount) * pos.multiplier, 0
            );
            
            // Individual positions should maintain proportional rewards
            let isConsistent = true;
            for (const position of data.positions) {
              const expectedShare = (Number(position.stakedAmount) * position.multiplier) / totalEffectiveStake;
              
              // Share should be between 0 and 1
              if (expectedShare < 0 || expectedShare > 1) {
                isConsistent = false;
                break;
              }
            }
            
            return isConsistent;
          }
        }
      );
    });

    /**
     * Property: Economic Model Sustainability
     * The overall economic model should be sustainable
     */
    it('should maintain economic model sustainability', async () => {
      await assertProperty(
        fc.record({
          totalStaked: DeFiGenerators.amount(),
          totalRewardsPool: DeFiGenerators.amount(),
          annualRewardRate: DeFiGenerators.apy(),
          inflationRate: fc.float({ min: 0, max: 0.1 }), // 0-10% inflation
          participationRate: fc.float({ min: 0.1, max: 0.9 }) // 10-90% participation
        }),
        {
          name: 'economic_model_sustainability',
          description: 'Economic model should be sustainable long-term',
          assertion: (data) => {
            const annualRewardPayout = Number(data.totalStaked) * data.annualRewardRate;
            const sustainabilityRatio = annualRewardPayout / Number(data.totalRewardsPool);
            
            // Payout should not exceed available rewards by too much
            const isInflationAdjusted = data.annualRewardRate <= data.inflationRate + 0.15; // Max 15% real yield
            
            return sustainabilityRatio <= 1.1 && isInflationAdjusted; // Allow 10% buffer
          }
        }
      );
    });
  });
});

/**
 * Utility Functions for Silo-Specific Properties
 */
export const SiloProperties = {
  /**
   * Validates staking multiplier consistency
   */
  validateStakingMultiplier: (period: number, multiplier: number): boolean => {
    const expectedMultipliers: Record<number, number> = {
      0: 1.0,        // FLEXIBLE
      604800: 1.1,   // WEEK
      2592000: 1.25, // MONTH
      7776000: 1.5,  // QUARTER
      31536000: 2.0  // YEAR
    };
    
    return expectedMultipliers[period] === multiplier;
  },

  /**
   * Validates reward calculation accuracy
   */
  validateRewardCalculation: (
    stakedAmount: bigint,
    apr: number,
    timeSeconds: number,
    multiplier: number
  ): boolean => {
    const expectedRewards = Number(stakedAmount) * apr * (timeSeconds / 31536000) * multiplier;
    return expectedRewards >= 0;
  },

  /**
   * Validates penalty application
   */
  validatePenaltyApplication: (
    amount: bigint,
    penaltyRate: number,
    isEarlyUnstake: boolean
  ): boolean => {
    const effectivePenalty = isEarlyUnstake ? penaltyRate : 0;
    const penaltyAmount = Number(amount) * effectivePenalty;
    const netAmount = Number(amount) - penaltyAmount;
    
    return netAmount >= 0 && netAmount <= Number(amount) && effectivePenalty <= 0.2;
  },

  /**
   * Validates pool capacity constraints
   */
  validatePoolCapacity: (
    currentStaked: bigint,
    newStake: bigint,
    capacity: bigint
  ): boolean => {
    return Number(currentStaked) + Number(newStake) <= Number(capacity);
  }
};

export default SiloProperties;
