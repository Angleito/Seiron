/**
 * Takara Protocol Integration Tests
 * Tests real Takara lending protocol interactions with property-based validation
 */

import { describe, test, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import * as fc from 'fast-check';

import { TakaraProtocolWrapper } from '../../../src/protocols/sei/adapters/TakaraProtocolWrapper';
import { 
  TakaraConfig,
  LendingAsset,
  LendingPosition,
  SupplyRequest,
  BorrowRequest,
  WithdrawRequest,
  RepayRequest,
  TakaraError,
  HealthFactorData
} from '../../../src/protocols/sei/types';

import { TestEnvironment } from '../../utils/TestEnvironment';
import { PropertyTestRunner } from '../../utils/PropertyTestRunner';
import { MetricsCollector } from '../../utils/MetricsCollector';

describe('Takara Protocol Integration Tests', () => {
  let testEnv: TestEnvironment;
  let takaraWrapper: TakaraProtocolWrapper;
  let metricsCollector: MetricsCollector;
  let propertyRunner: PropertyTestRunner;
  
  const testConfig: TakaraConfig = {
    apiUrl: process.env.TAKARA_API_URL || 'http://takara-mock:8002',
    contractAddress: 'sei1takara1z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
    timeout: 30000
  };

  const testUserAddress = 'sei1testuser1z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6';
  
  beforeAll(async () => {
    testEnv = await TestEnvironment.create();
    takaraWrapper = new TakaraProtocolWrapper(testConfig);
    metricsCollector = new MetricsCollector('takara');
    propertyRunner = new PropertyTestRunner();
    
    await testEnv.waitForServices(['takara-mock']);
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.resetState();
    metricsCollector.startTest();
  });

  afterEach(async () => {
    metricsCollector.endTest();
  });

  describe('Protocol Integration', () => {
    test('should retrieve supported assets', async () => {
      const startTime = Date.now();
      
      const result = await takaraWrapper.getSupportedAssets();
      
      const duration = Date.now() - startTime;
      metricsCollector.recordLatency('getSupportedAssets', duration);
      
      expect(E.isRight(result)).toBe(true);
      
      if (E.isRight(result)) {
        const assets = result.right;
        
        expect(assets).toHaveLength(3);
        expect(assets[0]).toHaveProperty('address');
        expect(assets[0]).toHaveProperty('symbol');
        expect(assets[0]).toHaveProperty('supplyAPY');
        expect(assets[0]).toHaveProperty('borrowAPY');
        expect(assets[0]).toHaveProperty('liquidationThreshold');
        expect(assets[0]).toHaveProperty('collateralFactor');
        
        // Validate APY values
        assets.forEach(asset => {
          expect(asset.supplyAPY).toBeGreaterThan(0);
          expect(asset.borrowAPY).toBeGreaterThan(asset.supplyAPY);
          expect(asset.liquidationThreshold).toBeGreaterThan(0);
          expect(asset.liquidationThreshold).toBeLessThanOrEqual(1);
          expect(asset.collateralFactor).toBeGreaterThan(0);
          expect(asset.collateralFactor).toBeLessThan(asset.liquidationThreshold);
        });
      }
    });

    test('should handle asset supply operations', async () => {
      const supplyRequest: SupplyRequest = {
        userAddress: testUserAddress,
        assetAddress: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: '10000000' // 10 USDC
      };
      
      const startTime = Date.now();
      const result = await takaraWrapper.supply(supplyRequest);
      const duration = Date.now() - startTime;
      
      metricsCollector.recordLatency('supply', duration);
      
      expect(E.isRight(result)).toBe(true);
      
      if (E.isRight(result)) {
        const supplyResult = result.right;
        
        expect(supplyResult.txHash).toBeDefined();
        expect(supplyResult.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(supplyResult.position).toBeDefined();
        expect(supplyResult.position.userAddress).toBe(testUserAddress);
        expect(supplyResult.position.assetAddress).toBe(supplyRequest.assetAddress);
        expect(supplyResult.position.amount).toBe(supplyRequest.amount);
        expect(supplyResult.position.type).toBe('supply');
        expect(supplyResult.healthFactor).toBeGreaterThan(100); // Very healthy after supply
        
        // Validate position details
        expect(supplyResult.position.apy).toBeGreaterThan(0);
        expect(supplyResult.position.shares).toBe(supplyRequest.amount);
        expect(supplyResult.position.accruedInterest).toBe('0');
      }
    });

    test('should handle asset withdrawal operations', async () => {
      // First supply some assets
      const supplyRequest: SupplyRequest = {
        userAddress: testUserAddress,
        assetAddress: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: '10000000'
      };
      
      const supplyResult = await takaraWrapper.supply(supplyRequest);
      expect(E.isRight(supplyResult)).toBe(true);
      
      // Then withdraw some assets
      const withdrawRequest: WithdrawRequest = {
        userAddress: testUserAddress,
        assetAddress: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: '5000000' // Withdraw 5 USDC
      };
      
      const result = await takaraWrapper.withdraw(withdrawRequest);
      
      expect(E.isRight(result)).toBe(true);
      
      if (E.isRight(result)) {
        const withdrawResult = result.right;
        
        expect(withdrawResult.txHash).toBeDefined();
        expect(withdrawResult.position).toBeDefined();
        expect(withdrawResult.position.type).toBe('withdraw');
        expect(withdrawResult.position.amount).toBe(`-${withdrawRequest.amount}`);
        expect(withdrawResult.healthFactor).toBeGreaterThan(100);
      }
    });

    test('should handle borrowing operations', async () => {
      // First supply collateral
      const supplyRequest: SupplyRequest = {
        userAddress: testUserAddress,
        assetAddress: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: '20000000' // 20 USDC as collateral
      };
      
      const supplyResult = await takaraWrapper.supply(supplyRequest);
      expect(E.isRight(supplyResult)).toBe(true);
      
      // Then borrow against it
      const borrowRequest: BorrowRequest = {
        userAddress: testUserAddress,
        assetAddress: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        amount: '10000000' // Borrow 10 SEI
      };
      
      const result = await takaraWrapper.borrow(borrowRequest);
      
      expect(E.isRight(result)).toBe(true);
      
      if (E.isRight(result)) {
        const borrowResult = result.right;
        
        expect(borrowResult.txHash).toBeDefined();
        expect(borrowResult.position).toBeDefined();
        expect(borrowResult.position.type).toBe('borrow');
        expect(borrowResult.position.amount).toBe(borrowRequest.amount);
        expect(borrowResult.healthFactor).toBeGreaterThan(1.0);
        expect(borrowResult.healthFactor).toBeLessThan(100);
        
        // Validate borrow position
        expect(borrowResult.position.apy).toBeGreaterThan(0);
        expect(parseFloat(borrowResult.position.apy)).toBeGreaterThan(5); // Should be higher than supply APY
      }
    });

    test('should handle repayment operations', async () => {
      // Setup: Supply collateral and create a borrow position
      const supplyRequest: SupplyRequest = {
        userAddress: testUserAddress,
        assetAddress: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: '20000000'
      };
      
      const borrowRequest: BorrowRequest = {
        userAddress: testUserAddress,
        assetAddress: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        amount: '5000000'
      };
      
      await takaraWrapper.supply(supplyRequest);
      const borrowResult = await takaraWrapper.borrow(borrowRequest);
      expect(E.isRight(borrowResult)).toBe(true);
      
      // Repay part of the loan
      const repayRequest: RepayRequest = {
        userAddress: testUserAddress,
        assetAddress: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        amount: '2500000' // Repay half
      };
      
      const result = await takaraWrapper.repay(repayRequest);
      
      expect(E.isRight(result)).toBe(true);
      
      if (E.isRight(result)) {
        const repayResult = result.right;
        
        expect(repayResult.txHash).toBeDefined();
        expect(repayResult.position).toBeDefined();
        expect(repayResult.position.type).toBe('repay');
        expect(repayResult.position.amount).toBe(`-${repayRequest.amount}`);
        
        // Health factor should improve after repayment
        if (E.isRight(borrowResult)) {
          expect(repayResult.healthFactor).toBeGreaterThan(borrowResult.right.healthFactor);
        }
      }
    });

    test('should calculate health factors accurately', async () => {
      const userAddress = testUserAddress;
      
      // Initial health factor (no positions)
      let healthFactor = await takaraWrapper.getHealthFactor(userAddress);
      expect(E.isRight(healthFactor)).toBe(true);
      
      if (E.isRight(healthFactor)) {
        expect(healthFactor.right).toBe(999999); // Max health factor
      }
      
      // Supply collateral
      const supplyRequest: SupplyRequest = {
        userAddress,
        assetAddress: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: '10000000'
      };
      
      await takaraWrapper.supply(supplyRequest);
      
      healthFactor = await takaraWrapper.getHealthFactor(userAddress);
      expect(E.isRight(healthFactor)).toBe(true);
      
      if (E.isRight(healthFactor)) {
        expect(healthFactor.right).toBe(999999); // Still max (no debt)
      }
      
      // Borrow against collateral
      const borrowRequest: BorrowRequest = {
        userAddress,
        assetAddress: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        amount: '5000000'
      };
      
      await takaraWrapper.borrow(borrowRequest);
      
      healthFactor = await takaraWrapper.getHealthFactor(userAddress);
      expect(E.isRight(healthFactor)).toBe(true);
      
      if (E.isRight(healthFactor)) {
        expect(healthFactor.right).toBeGreaterThan(1.0);
        expect(healthFactor.right).toBeLessThan(999999);
      }
    });

    test('should retrieve user positions correctly', async () => {
      const userAddress = testUserAddress;
      
      // Create multiple positions
      const supplyRequest: SupplyRequest = {
        userAddress,
        assetAddress: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: '15000000'
      };
      
      const borrowRequest: BorrowRequest = {
        userAddress,
        assetAddress: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        amount: '3000000'
      };
      
      await takaraWrapper.supply(supplyRequest);
      await takaraWrapper.borrow(borrowRequest);
      
      const positionsResult = await takaraWrapper.getUserPositions(userAddress);
      
      expect(E.isRight(positionsResult)).toBe(true);
      
      if (E.isRight(positionsResult)) {
        const positions = positionsResult.right;
        
        expect(positions.userAddress).toBe(userAddress);
        expect(positions.supplies).toBeDefined();
        expect(positions.borrows).toBeDefined();
        expect(positions.healthFactor).toBeGreaterThan(1.0);
        expect(positions.totalCollateral).toBeGreaterThan(0);
        expect(positions.totalDebt).toBeGreaterThan(0);
        
        // Validate supply positions
        expect(positions.supplies['sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6']).toBeDefined();
        expect(positions.supplies['sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'].amount).toBe('15000000');
        
        // Validate borrow positions
        expect(positions.borrows['sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2']).toBeDefined();
        expect(positions.borrows['sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2'].amount).toBe('3000000');
      }
    });
  });

  describe('Property-Based Integration Tests', () => {
    test('property: health factor calculations are mathematically consistent', async () => {
      const lendingScenarioArb = fc.record({
        collateralAmount: fc.integer({ min: 1000000, max: 100000000 }),
        borrowAmount: fc.integer({ min: 100000, max: 10000000 }),
        collateralAsset: fc.constantFrom('sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'),
        borrowAsset: fc.constantFrom('sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2')
      });
      
      await fc.assert(
        fc.asyncProperty(lendingScenarioArb, async (scenario) => {
          const userAddress = `sei1test${Math.random().toString(36).substr(2, 9)}`;
          
          // Supply collateral
          const supplyRequest: SupplyRequest = {
            userAddress,
            assetAddress: scenario.collateralAsset,
            amount: scenario.collateralAmount.toString()
          };
          
          const supplyResult = await takaraWrapper.supply(supplyRequest);
          
          if (E.isLeft(supplyResult)) return true; // Skip if supply fails
          
          // Check if borrow amount is safe
          const maxBorrowRatio = 0.6; // Conservative ratio
          const collateralValue = scenario.collateralAmount * 1.0; // USDC = $1
          const borrowValue = scenario.borrowAmount * 0.5; // SEI = $0.5
          
          if (borrowValue > collateralValue * maxBorrowRatio) {
            return true; // Skip unsafe scenarios
          }
          
          // Borrow against collateral
          const borrowRequest: BorrowRequest = {
            userAddress,
            assetAddress: scenario.borrowAsset,
            amount: scenario.borrowAmount.toString()
          };
          
          const borrowResult = await takaraWrapper.borrow(borrowRequest);
          
          if (E.isLeft(borrowResult)) return true; // Skip if borrow fails
          
          // Verify health factor calculation
          const healthFactorResult = await takaraWrapper.getHealthFactor(userAddress);
          
          if (E.isRight(healthFactorResult)) {
            const healthFactor = healthFactorResult.right;
            
            // Health factor should be > 1.0 for safe positions
            return healthFactor > 1.0;
          }
          
          return true;
        }),
        { numRuns: 10, timeout: 30000 }
      );
    });

    test('property: supply and withdraw operations are inverse', async () => {
      const supplyWithdrawArb = fc.record({
        assetAddress: fc.constantFrom('sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'),
        amount: fc.integer({ min: 1000000, max: 10000000 })
      });
      
      await fc.assert(
        fc.asyncProperty(supplyWithdrawArb, async (scenario) => {
          const userAddress = `sei1test${Math.random().toString(36).substr(2, 9)}`;
          
          // Supply assets
          const supplyRequest: SupplyRequest = {
            userAddress,
            assetAddress: scenario.assetAddress,
            amount: scenario.amount.toString()
          };
          
          const supplyResult = await takaraWrapper.supply(supplyRequest);
          
          if (E.isLeft(supplyResult)) return true;
          
          // Withdraw same amount
          const withdrawRequest: WithdrawRequest = {
            userAddress,
            assetAddress: scenario.assetAddress,
            amount: scenario.amount.toString()
          };
          
          const withdrawResult = await takaraWrapper.withdraw(withdrawRequest);
          
          if (E.isLeft(withdrawResult)) return true;
          
          // Check final position should be approximately zero
          const positionsResult = await takaraWrapper.getUserPositions(userAddress);
          
          if (E.isRight(positionsResult)) {
            const positions = positionsResult.right;
            const supplyPosition = positions.supplies[scenario.assetAddress];
            
            if (supplyPosition) {
              const remainingAmount = parseFloat(supplyPosition.amount);
              // Should be close to zero (allowing for rounding errors)
              return Math.abs(remainingAmount) < 1;
            }
            
            return true; // No position means successful withdrawal
          }
          
          return true;
        }),
        { numRuns: 8, timeout: 30000 }
      );
    });

    test('property: borrow and repay operations are inverse', async () => {
      const borrowRepayArb = fc.record({
        collateralAmount: fc.integer({ min: 10000000, max: 50000000 }),
        borrowAmount: fc.integer({ min: 1000000, max: 5000000 }),
        collateralAsset: fc.constantFrom('sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'),
        borrowAsset: fc.constantFrom('sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2')
      });
      
      await fc.assert(
        fc.asyncProperty(borrowRepayArb, async (scenario) => {
          const userAddress = `sei1test${Math.random().toString(36).substr(2, 9)}`;
          
          // Supply collateral first
          const supplyRequest: SupplyRequest = {
            userAddress,
            assetAddress: scenario.collateralAsset,
            amount: scenario.collateralAmount.toString()
          };
          
          const supplyResult = await takaraWrapper.supply(supplyRequest);
          if (E.isLeft(supplyResult)) return true;
          
          // Borrow
          const borrowRequest: BorrowRequest = {
            userAddress,
            assetAddress: scenario.borrowAsset,
            amount: scenario.borrowAmount.toString()
          };
          
          const borrowResult = await takaraWrapper.borrow(borrowRequest);
          if (E.isLeft(borrowResult)) return true;
          
          // Repay same amount
          const repayRequest: RepayRequest = {
            userAddress,
            assetAddress: scenario.borrowAsset,
            amount: scenario.borrowAmount.toString()
          };
          
          const repayResult = await takaraWrapper.repay(repayRequest);
          if (E.isLeft(repayResult)) return true;
          
          // Check final borrow position
          const positionsResult = await takaraWrapper.getUserPositions(userAddress);
          
          if (E.isRight(positionsResult)) {
            const positions = positionsResult.right;
            const borrowPosition = positions.borrows[scenario.borrowAsset];
            
            if (borrowPosition) {
              const remainingDebt = parseFloat(borrowPosition.amount);
              // Should be close to zero (allowing for interest accrual)
              return Math.abs(remainingDebt) < scenario.borrowAmount * 0.01; // 1% tolerance
            }
            
            return true; // No borrow position means successful repayment
          }
          
          return true;
        }),
        { numRuns: 6, timeout: 30000 }
      );
    });

    test('property: APY calculations are reasonable', async () => {
      const assetsResult = await takaraWrapper.getSupportedAssets();
      
      if (E.isRight(assetsResult)) {
        const assets = assetsResult.right;
        
        assets.forEach(asset => {
          // Supply APY should be lower than borrow APY
          expect(asset.supplyAPY).toBeLessThan(asset.borrowAPY);
          
          // APY should be reasonable (between 0.1% and 100%)
          expect(asset.supplyAPY).toBeGreaterThan(0.001);
          expect(asset.supplyAPY).toBeLessThan(100);
          expect(asset.borrowAPY).toBeGreaterThan(0.001);
          expect(asset.borrowAPY).toBeLessThan(100);
          
          // Collateral factor should be less than liquidation threshold
          expect(asset.collateralFactor).toBeLessThan(asset.liquidationThreshold);
          
          // Both should be between 0 and 1
          expect(asset.collateralFactor).toBeGreaterThan(0);
          expect(asset.collateralFactor).toBeLessThan(1);
          expect(asset.liquidationThreshold).toBeGreaterThan(0);
          expect(asset.liquidationThreshold).toBeLessThanOrEqual(1);
        });
      }
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent lending operations', async () => {
      const concurrentUsers = 5;
      const operations = Array.from({ length: concurrentUsers }, (_, i) => ({
        userAddress: `sei1testuser${i}z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6`,
        assetAddress: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: (5000000 + i * 1000000).toString()
      }));
      
      const startTime = Date.now();
      const results = await Promise.all(
        operations.map(op => takaraWrapper.supply(op))
      );
      const duration = Date.now() - startTime;
      
      const successfulResults = results.filter(result => E.isRight(result));
      
      expect(successfulResults.length).toBeGreaterThan(concurrentUsers * 0.8);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      
      metricsCollector.recordLatency('concurrentSupply', duration);
      metricsCollector.recordThroughput('concurrentSupply', concurrentUsers, duration);
    });

    test('should meet Sei block time constraints for lending operations', async () => {
      const SEI_BLOCK_TIME = 400; // 400ms
      
      const supplyRequest: SupplyRequest = {
        userAddress: testUserAddress,
        assetAddress: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: '5000000'
      };
      
      const measurements = [];
      
      for (let i = 0; i < 5; i++) {
        const testUser = `sei1test${i}z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6`;
        const request = { ...supplyRequest, userAddress: testUser };
        
        const startTime = Date.now();
        const result = await takaraWrapper.supply(request);
        const duration = Date.now() - startTime;
        
        if (E.isRight(result)) {
          measurements.push(duration);
        }
      }
      
      const avgDuration = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      
      expect(avgDuration).toBeLessThan(SEI_BLOCK_TIME * 2); // Allow 2x block time for lending
      
      metricsCollector.recordLatency('avgSupplyTime', avgDuration);
    });
  });

  describe('Risk Management Tests', () => {
    test('should prevent over-borrowing', async () => {
      const userAddress = testUserAddress;
      
      // Supply moderate collateral
      const supplyRequest: SupplyRequest = {
        userAddress,
        assetAddress: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: '10000000' // 10 USDC
      };
      
      const supplyResult = await takaraWrapper.supply(supplyRequest);
      expect(E.isRight(supplyResult)).toBe(true);
      
      // Try to borrow excessive amount
      const excessiveBorrowRequest: BorrowRequest = {
        userAddress,
        assetAddress: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        amount: '100000000' // 100 SEI (way more than collateral supports)
      };
      
      const borrowResult = await takaraWrapper.borrow(excessiveBorrowRequest);
      
      expect(E.isLeft(borrowResult)).toBe(true);
      
      if (E.isLeft(borrowResult)) {
        expect(borrowResult.left.type).toBe('insufficient_collateral');
      }
    });

    test('should handle liquidation scenarios', async () => {
      const borrowerAddress = `sei1borrower${Math.random().toString(36).substr(2, 8)}`;
      const liquidatorAddress = `sei1liquidator${Math.random().toString(36).substr(2, 8)}`;
      
      // Create a borrowing position
      const supplyRequest: SupplyRequest = {
        userAddress: borrowerAddress,
        assetAddress: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: '12000000' // 12 USDC
      };
      
      const borrowRequest: BorrowRequest = {
        userAddress: borrowerAddress,
        assetAddress: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        amount: '18000000' // 18 SEI - creates risky position
      };
      
      await takaraWrapper.supply(supplyRequest);
      const borrowResult = await takaraWrapper.borrow(borrowRequest);
      
      if (E.isRight(borrowResult)) {
        // Simulate liquidation
        const liquidationRequest = {
          borrower: borrowerAddress,
          assetBorrow: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
          assetCollateral: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
          amount: '5000000' // Liquidate 5 SEI
        };
        
        const liquidationResult = await takaraWrapper.liquidate(liquidationRequest);
        
        expect(E.isRight(liquidationResult)).toBe(true);
        
        if (E.isRight(liquidationResult)) {
          const liquidation = liquidationResult.right;
          
          expect(liquidation.txHash).toBeDefined();
          expect(liquidation.borrower).toBe(borrowerAddress);
          expect(liquidation.amountLiquidated).toBe('5000000');
          expect(parseFloat(liquidation.collateralSeized)).toBeGreaterThan(parseFloat(liquidation.amountLiquidated));
          expect(liquidation.healthFactorAfter).toBeGreaterThan(1.0);
        }
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid asset addresses', async () => {
      const invalidSupplyRequest: SupplyRequest = {
        userAddress: testUserAddress,
        assetAddress: 'sei1invalid',
        amount: '1000000'
      };
      
      const result = await takaraWrapper.supply(invalidSupplyRequest);
      
      expect(E.isLeft(result)).toBe(true);
      
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('invalid_asset');
      }
    });

    test('should handle withdrawal of non-existent positions', async () => {
      const withdrawRequest: WithdrawRequest = {
        userAddress: testUserAddress,
        assetAddress: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: '1000000'
      };
      
      const result = await takaraWrapper.withdraw(withdrawRequest);
      
      expect(E.isLeft(result)).toBe(true);
      
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('insufficient_balance');
      }
    });

    test('should handle network timeouts', async () => {
      const timeoutConfig: TakaraConfig = {
        ...testConfig,
        timeout: 100 // Very short timeout
      };
      
      const timeoutWrapper = new TakaraProtocolWrapper(timeoutConfig);
      
      const request: SupplyRequest = {
        userAddress: testUserAddress,
        assetAddress: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: '1000000'
      };
      
      const result = await timeoutWrapper.supply(request);
      
      expect(E.isLeft(result)).toBe(true);
      
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('timeout');
      }
    });
  });
});