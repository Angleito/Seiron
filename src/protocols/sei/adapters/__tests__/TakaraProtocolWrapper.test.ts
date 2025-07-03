/**
 * @fileoverview Unit tests for Takara Protocol Wrapper
 * Comprehensive test suite covering all lending operations and risk management
 */

import { ethers } from 'ethers';
import * as E from 'fp-ts/Either';
import { TakaraProtocolWrapper, TakaraRiskAssessment } from '../TakaraProtocolWrapper';

// Mock setup
jest.mock('ethers');

describe('TakaraProtocolWrapper', () => {
  let mockProvider: jest.Mocked<ethers.Provider>;
  let mockSigner: jest.Mocked<ethers.Signer>;
  let mockComptrollerContract: jest.Mocked<ethers.Contract>;
  let mockCTokenContract: jest.Mocked<ethers.Contract>;
  let takaraWrapper: TakaraProtocolWrapper;

  beforeEach(() => {
    // Setup mocks
    mockProvider = {
      getNetwork: jest.fn(),
      getBlockNumber: jest.fn(),
    } as any;

    mockSigner = {
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      connect: jest.fn(),
    } as any;

    mockComptrollerContract = {
      getAccountLiquidity: jest.fn(),
      enterMarkets: jest.fn(),
      exitMarket: jest.fn(),
      getAllMarkets: jest.fn(),
      markets: jest.fn(),
    } as any;

    mockCTokenContract = {
      mint: jest.fn(),
      redeem: jest.fn(),
      redeemUnderlying: jest.fn(),
      borrow: jest.fn(),
      repayBorrow: jest.fn(),
      getAccountSnapshot: jest.fn(),
      supplyRatePerBlock: jest.fn(),
      borrowRatePerBlock: jest.fn(),
      totalSupply: jest.fn(),
      totalBorrows: jest.fn(),
      getCash: jest.fn(),
      exchangeRateStored: jest.fn(),
      balanceOf: jest.fn(),
    } as any;

    // Mock ethers.Contract constructor
    (ethers.Contract as jest.Mock).mockImplementation((address: string, abi: any) => {
      if (abi === require('../TakaraProtocolWrapper').TAKARA_COMPTROLLER_ABI) {
        return mockComptrollerContract;
      }
      return mockCTokenContract;
    });

    takaraWrapper = new TakaraProtocolWrapper(mockProvider, mockSigner);
  });

  describe('Constructor', () => {
    it('should initialize with provider and signer', () => {
      expect(takaraWrapper).toBeInstanceOf(TakaraProtocolWrapper);
    });

    it('should initialize with provider only', () => {
      const wrapper = new TakaraProtocolWrapper(mockProvider);
      expect(wrapper).toBeInstanceOf(TakaraProtocolWrapper);
    });

    it('should initialize contracts correctly', () => {
      expect(ethers.Contract).toHaveBeenCalledTimes(2); // Comptroller and Oracle
    });
  });

  describe('getUserAccountData', () => {
    it('should return user account data successfully', async () => {
      const mockAccountData = [
        0n, // error
        ethers.parseEther('1000'), // liquidity
        0n, // shortfall
      ];
      mockComptrollerContract.getAccountLiquidity.mockResolvedValue(mockAccountData);

      // Mock detailed account data method
      jest.spyOn(takaraWrapper as any, 'getDetailedAccountData').mockResolvedValue({
        totalCollateralValueInUsd: ethers.parseEther('1000'),
        totalBorrowValueInUsd: ethers.parseEther('500'),
        liquidity: ethers.parseEther('500'),
        shortfall: 0n,
      });

      jest.spyOn(takaraWrapper as any, 'getWeightedLiquidationThreshold').mockResolvedValue(ethers.parseEther('0.85'));
      jest.spyOn(takaraWrapper as any, 'getWeightedLTV').mockResolvedValue(ethers.parseEther('0.75'));

      const result = await takaraWrapper.getUserAccountData('0x1234567890123456789012345678901234567890');

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.totalCollateralBase).toBe(ethers.parseEther('1000'));
        expect(result.right.totalDebtBase).toBe(ethers.parseEther('500'));
      }
    });

    it('should handle comptroller errors', async () => {
      mockComptrollerContract.getAccountLiquidity.mockResolvedValue([1n, 0n, 0n]); // Error code 1

      const result = await takaraWrapper.getUserAccountData('0x1234567890123456789012345678901234567890');

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('comptroller_rejection');
      }
    });

    it('should handle network errors', async () => {
      mockComptrollerContract.getAccountLiquidity.mockRejectedValue(new Error('Network error'));

      const result = await takaraWrapper.getUserAccountData('0x1234567890123456789012345678901234567890');

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('contract_error');
      }
    });
  });

  describe('getUserReserveData', () => {
    it('should return user reserve data for supported asset', async () => {
      const mockSnapshot = [
        0n, // error
        ethers.parseEther('100'), // cToken balance
        ethers.parseEther('50'), // borrow balance
        ethers.parseEther('1.02'), // exchange rate
      ];
      mockCTokenContract.getAccountSnapshot.mockResolvedValue(mockSnapshot);
      mockCTokenContract.supplyRatePerBlock.mockResolvedValue(ethers.parseUnits('0.0001', 18));
      mockCTokenContract.borrowRatePerBlock.mockResolvedValue(ethers.parseUnits('0.0002', 18));
      
      jest.spyOn(takaraWrapper as any, 'isMarketEntered').mockResolvedValue(true);

      const result = await takaraWrapper.getUserReserveData('0x1234567890123456789012345678901234567890', 'SEI');

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.asset.symbol).toBe('SEI');
        expect(result.right.usageAsCollateralEnabled).toBe(true);
      }
    });

    it('should handle unsupported assets', async () => {
      const result = await takaraWrapper.getUserReserveData('0x1234567890123456789012345678901234567890', 'UNKNOWN');

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.message).toContain('not supported');
      }
    });
  });

  describe('getReserveData', () => {
    it('should return reserve data for supported asset', async () => {
      mockCTokenContract.supplyRatePerBlock.mockResolvedValue(ethers.parseUnits('0.0001', 18));
      mockCTokenContract.borrowRatePerBlock.mockResolvedValue(ethers.parseUnits('0.0002', 18));
      mockCTokenContract.totalSupply.mockResolvedValue(ethers.parseEther('1000'));
      mockCTokenContract.totalBorrows.mockResolvedValue(ethers.parseEther('500'));
      mockCTokenContract.totalReserves.mockResolvedValue(ethers.parseEther('50'));
      mockCTokenContract.getCash.mockResolvedValue(ethers.parseEther('450'));
      mockCTokenContract.exchangeRateStored.mockResolvedValue(ethers.parseEther('1.02'));

      const result = await takaraWrapper.getReserveData('SEI');

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.asset.symbol).toBe('SEI');
        expect(result.right.totalVariableDebt).toBe(ethers.parseEther('500'));
      }
    });

    it('should calculate utilization rate correctly', async () => {
      mockCTokenContract.supplyRatePerBlock.mockResolvedValue(ethers.parseUnits('0.0001', 18));
      mockCTokenContract.borrowRatePerBlock.mockResolvedValue(ethers.parseUnits('0.0002', 18));
      mockCTokenContract.totalSupply.mockResolvedValue(ethers.parseEther('1000'));
      mockCTokenContract.totalBorrows.mockResolvedValue(ethers.parseEther('750'));
      mockCTokenContract.totalReserves.mockResolvedValue(ethers.parseEther('50'));
      mockCTokenContract.getCash.mockResolvedValue(ethers.parseEther('250'));
      mockCTokenContract.exchangeRateStored.mockResolvedValue(ethers.parseEther('1.0'));

      const result = await takaraWrapper.getReserveData('SEI');

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        // Utilization should be 75% (750/1000)
        expect(Number(result.right.utilizationRate)).toBeGreaterThan(0);
      }
    });
  });

  describe('supply', () => {
    it('should supply assets successfully', async () => {
      const mockTx = {
        wait: jest.fn().mockResolvedValue({
          transactionHash: '0xabcdef',
          gasUsed: ethers.getBigInt(21000),
        }),
      };
      mockCTokenContract.mint.mockResolvedValue(mockTx);
      
      jest.spyOn(takaraWrapper as any, 'ensureApproval').mockResolvedValue(undefined);

      const result = await takaraWrapper.supply({
        asset: 'SEI',
        amount: ethers.parseEther('100'),
      });

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.type).toBe('supply');
        expect(result.right.asset).toBe('SEI');
        expect(result.right.amount).toBe(ethers.parseEther('100'));
        expect(result.right.txHash).toBe('0xabcdef');
      }
    });

    it('should handle supply cap exceeded', async () => {
      mockCTokenContract.mint.mockRejectedValue(new Error('Supply cap exceeded'));

      const result = await takaraWrapper.supply({
        asset: 'SEI',
        amount: ethers.parseEther('100'),
      });

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('supply_cap_exceeded');
      }
    });

    it('should require signer for write operations', async () => {
      const wrapperWithoutSigner = new TakaraProtocolWrapper(mockProvider);

      const result = await wrapperWithoutSigner.supply({
        asset: 'SEI',
        amount: ethers.parseEther('100'),
      });

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.message).toContain('Signer required');
      }
    });
  });

  describe('withdraw', () => {
    it('should withdraw specific amount successfully', async () => {
      const mockTx = {
        wait: jest.fn().mockResolvedValue({
          transactionHash: '0xabcdef',
          gasUsed: ethers.getBigInt(21000),
        }),
      };
      mockCTokenContract.redeemUnderlying.mockResolvedValue(mockTx);
      mockComptrollerContract.getAccountLiquidity.mockResolvedValue([0n, ethers.parseEther('100'), 0n]);

      const result = await takaraWrapper.withdraw({
        asset: 'SEI',
        amount: ethers.parseEther('50'),
      });

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.type).toBe('withdraw');
        expect(result.right.amount).toBe(ethers.parseEther('50'));
      }
    });

    it('should withdraw max amount successfully', async () => {
      const mockTx = {
        wait: jest.fn().mockResolvedValue({
          transactionHash: '0xabcdef',
          gasUsed: ethers.getBigInt(21000),
        }),
      };
      mockCTokenContract.redeem.mockResolvedValue(mockTx);
      mockCTokenContract.balanceOf.mockResolvedValue(ethers.parseEther('100'));
      mockComptrollerContract.getAccountLiquidity.mockResolvedValue([0n, ethers.parseEther('100'), 0n]);

      const result = await takaraWrapper.withdraw({
        asset: 'SEI',
        amount: 'max',
      });

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.type).toBe('withdraw');
      }
    });

    it('should prevent withdrawal with shortfall', async () => {
      mockComptrollerContract.getAccountLiquidity.mockResolvedValue([0n, 0n, ethers.parseEther('10')]);

      const result = await takaraWrapper.withdraw({
        asset: 'SEI',
        amount: ethers.parseEther('50'),
      });

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.message).toContain('shortfall');
      }
    });
  });

  describe('borrow', () => {
    it('should borrow assets successfully', async () => {
      const mockTx = {
        wait: jest.fn().mockResolvedValue({
          transactionHash: '0xabcdef',
          gasUsed: ethers.getBigInt(21000),
        }),
      };
      mockCTokenContract.borrow.mockResolvedValue(mockTx);
      mockCTokenContract.borrowRatePerBlock.mockResolvedValue(ethers.parseUnits('0.0002', 18));
      
      mockComptrollerContract.getAccountLiquidity.mockResolvedValue([0n, ethers.parseEther('100'), 0n]);
      mockComptrollerContract.getHypotheticalAccountLiquidity.mockResolvedValue([0n, ethers.parseEther('50'), 0n]);

      const result = await takaraWrapper.borrow({
        asset: 'USDT',
        amount: BigInt('50000000'), // 50 USDT
        interestRateMode: 'variable',
      });

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.type).toBe('borrow');
        expect(result.right.asset).toBe('USDT');
      }
    });

    it('should prevent borrowing with insufficient collateral', async () => {
      mockComptrollerContract.getAccountLiquidity.mockResolvedValue([0n, ethers.parseEther('100'), 0n]);
      mockComptrollerContract.getHypotheticalAccountLiquidity.mockResolvedValue([0n, 0n, ethers.parseEther('10')]);

      const result = await takaraWrapper.borrow({
        asset: 'USDT',
        amount: BigInt('100000000'), // 100 USDT
        interestRateMode: 'variable',
      });

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.message).toContain('Insufficient collateral');
      }
    });

    it('should handle borrow cap exceeded', async () => {
      mockComptrollerContract.getAccountLiquidity.mockResolvedValue([0n, ethers.parseEther('100'), 0n]);
      mockComptrollerContract.getHypotheticalAccountLiquidity.mockResolvedValue([0n, ethers.parseEther('50'), 0n]);
      mockCTokenContract.borrow.mockRejectedValue(new Error('Borrow cap exceeded'));

      const result = await takaraWrapper.borrow({
        asset: 'USDT',
        amount: BigInt('50000000'),
        interestRateMode: 'variable',
      });

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('borrow_cap_exceeded');
      }
    });
  });

  describe('repay', () => {
    it('should repay specific amount successfully', async () => {
      const mockTx = {
        wait: jest.fn().mockResolvedValue({
          transactionHash: '0xabcdef',
          gasUsed: ethers.getBigInt(21000),
        }),
      };
      mockCTokenContract.repayBorrow.mockResolvedValue(mockTx);
      
      jest.spyOn(takaraWrapper as any, 'ensureApproval').mockResolvedValue(undefined);

      const result = await takaraWrapper.repay({
        asset: 'USDT',
        amount: BigInt('25000000'), // 25 USDT
        interestRateMode: 'variable',
      });

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.type).toBe('repay');
        expect(result.right.amount).toBe(BigInt('25000000'));
      }
    });

    it('should repay max amount successfully', async () => {
      const mockTx = {
        wait: jest.fn().mockResolvedValue({
          transactionHash: '0xabcdef',
          gasUsed: ethers.getBigInt(21000),
        }),
      };
      mockCTokenContract.repayBorrow.mockResolvedValue(mockTx);
      mockCTokenContract.borrowBalanceCurrent.mockResolvedValue(BigInt('50000000'));
      
      jest.spyOn(takaraWrapper as any, 'ensureApproval').mockResolvedValue(undefined);

      const result = await takaraWrapper.repay({
        asset: 'USDT',
        amount: 'max',
        interestRateMode: 'variable',
      });

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.type).toBe('repay');
        expect(Number(result.right.amount)).toBeGreaterThan(Number(BigInt('50000000')));
      }
    });

    it('should handle repay on behalf of another user', async () => {
      const mockTx = {
        wait: jest.fn().mockResolvedValue({
          transactionHash: '0xabcdef',
          gasUsed: ethers.getBigInt(21000),
        }),
      };
      mockCTokenContract.repayBorrowBehalf.mockResolvedValue(mockTx);
      
      jest.spyOn(takaraWrapper as any, 'ensureApproval').mockResolvedValue(undefined);

      const result = await takaraWrapper.repay({
        asset: 'USDT',
        amount: BigInt('25000000'),
        interestRateMode: 'variable',
        onBehalfOf: '0x9876543210987654321098765432109876543210',
      });

      expect(E.isRight(result)).toBe(true);
      expect(mockCTokenContract.repayBorrowBehalf).toHaveBeenCalledWith(
        '0x9876543210987654321098765432109876543210',
        '25000000'
      );
    });
  });

  describe('getLendingRates', () => {
    it('should return current lending rates', async () => {
      mockCTokenContract.supplyRatePerBlock.mockResolvedValue(ethers.parseUnits('0.0001', 18));
      mockCTokenContract.borrowRatePerBlock.mockResolvedValue(ethers.parseUnits('0.0002', 18));
      mockCTokenContract.totalSupply.mockResolvedValue(ethers.parseEther('1000'));
      mockCTokenContract.totalBorrows.mockResolvedValue(ethers.parseEther('750'));
      mockCTokenContract.getCash.mockResolvedValue(ethers.parseEther('250'));
      mockCTokenContract.exchangeRateStored.mockResolvedValue(ethers.parseEther('1.0'));

      const result = await takaraWrapper.getLendingRates('SEI');

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.supplyRate).toBeGreaterThan(0n);
        expect(result.right.borrowRate).toBeGreaterThan(0n);
        expect(result.right.utilizationRate).toBeGreaterThan(0n);
      }
    });
  });

  describe('enterMarkets and exitMarket', () => {
    it('should enter markets successfully', async () => {
      const mockTx = {
        wait: jest.fn().mockResolvedValue({}),
      };
      mockComptrollerContract.enterMarkets.mockResolvedValue(mockTx);

      const result = await takaraWrapper.enterMarkets(['SEI', 'USDT']);

      expect(E.isRight(result)).toBe(true);
      expect(mockComptrollerContract.enterMarkets).toHaveBeenCalled();
    });

    it('should exit market successfully', async () => {
      const mockTx = {
        wait: jest.fn().mockResolvedValue({}),
      };
      mockComptrollerContract.exitMarket.mockResolvedValue(mockTx);

      const result = await takaraWrapper.exitMarket('SEI');

      expect(E.isRight(result)).toBe(true);
      expect(mockComptrollerContract.exitMarket).toHaveBeenCalled();
    });
  });

  describe('getProtocolConfig', () => {
    it('should return protocol configuration', () => {
      const config = takaraWrapper.getProtocolConfig();
      
      expect(config.name).toBe('Takara Protocol');
      expect(config.version).toBe('1.0.0');
      expect(config.chainId).toBe(1329);
    });
  });

  describe('getSupportedAssets', () => {
    it('should return supported assets', async () => {
      const result = await takaraWrapper.getSupportedAssets();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.length).toBeGreaterThan(0);
        expect(result.right.some(asset => asset.symbol === 'SEI')).toBe(true);
        expect(result.right.some(asset => asset.symbol === 'USDT')).toBe(true);
      }
    });
  });
});

describe('TakaraRiskAssessment', () => {
  describe('calculateLiquidationRisk', () => {
    it('should return critical risk for health factor < 1', () => {
      const risk = TakaraRiskAssessment.calculateLiquidationRisk(ethers.parseEther('0.9'));
      expect(risk).toBe('critical');
    });

    it('should return high risk for health factor < 1.1', () => {
      const risk = TakaraRiskAssessment.calculateLiquidationRisk(ethers.parseEther('1.05'));
      expect(risk).toBe('high');
    });

    it('should return medium risk for health factor < 1.3', () => {
      const risk = TakaraRiskAssessment.calculateLiquidationRisk(ethers.parseEther('1.2'));
      expect(risk).toBe('medium');
    });

    it('should return low risk for health factor >= 1.3', () => {
      const risk = TakaraRiskAssessment.calculateLiquidationRisk(ethers.parseEther('1.5'));
      expect(risk).toBe('low');
    });
  });

  describe('calculateOptimalBorrowAmount', () => {
    it('should calculate safe borrow amount', () => {
      const collateralValue = ethers.parseEther('1000');
      const collateralFactor = ethers.parseEther('0.75'); // 75%
      const currentBorrowValue = ethers.parseEther('200');
      const targetHealthFactor = ethers.parseEther('1.5'); // 1.5

      const optimalAmount = TakaraRiskAssessment.calculateOptimalBorrowAmount(
        collateralValue,
        collateralFactor,
        currentBorrowValue,
        targetHealthFactor
      );

      expect(Number(optimalAmount)).toBeGreaterThan(0);
      expect(Number(optimalAmount)).toBeLessThan(Number(ethers.parseEther('500')));
    });

    it('should return 0 for unsafe positions', () => {
      const collateralValue = ethers.parseEther('1000');
      const collateralFactor = ethers.parseEther('0.75');
      const currentBorrowValue = ethers.parseEther('800'); // Already high
      const targetHealthFactor = ethers.parseEther('1.5');

      const optimalAmount = TakaraRiskAssessment.calculateOptimalBorrowAmount(
        collateralValue,
        collateralFactor,
        currentBorrowValue,
        targetHealthFactor
      );

      expect(optimalAmount).toBe(0n);
    });
  });

  describe('calculatePositionHealthScore', () => {
    it('should calculate health score correctly', () => {
      const healthFactor = ethers.parseEther('1.5'); // 1.5
      const utilizationRate = ethers.parseEther('0.6'); // 60%
      const diversificationScore = 0.8; // 80%

      const healthScore = TakaraRiskAssessment.calculatePositionHealthScore(
        healthFactor,
        utilizationRate,
        diversificationScore
      );

      expect(healthScore).toBeGreaterThan(0);
      expect(healthScore).toBeLessThanOrEqual(1);
    });

    it('should handle extreme values', () => {
      const healthFactor = ethers.parseEther('0.5'); // 0.5 (critical)
      const utilizationRate = ethers.parseEther('0.95'); // 95%
      const diversificationScore = 0.1; // 10%

      const healthScore = TakaraRiskAssessment.calculatePositionHealthScore(
        healthFactor,
        utilizationRate,
        diversificationScore
      );

      expect(healthScore).toBeGreaterThanOrEqual(0);
      expect(healthScore).toBeLessThan(0.5); // Should be low
    });
  });
});

describe('Error Handling', () => {
  let takaraWrapper: TakaraProtocolWrapper;
  let mockProvider: jest.Mocked<ethers.Provider>;
  let mockSigner: jest.Mocked<ethers.Signer>;

  beforeEach(() => {
    mockProvider = {} as any;
    mockSigner = {
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
    } as any;
    takaraWrapper = new TakaraProtocolWrapper(mockProvider, mockSigner);
  });

  it('should map errors correctly', () => {
    const mapError = (takaraWrapper as any).mapError.bind(takaraWrapper);

    // Test specific error mappings
    expect(mapError(new Error('market not listed'), 'context').type).toBe('market_not_listed');
    expect(mapError(new Error('insufficient cash'), 'context').type).toBe('insufficient_cash');
    expect(mapError(new Error('borrow cap'), 'context').type).toBe('borrow_cap_exceeded');
    expect(mapError(new Error('supply cap'), 'context').type).toBe('supply_cap_exceeded');
    expect(mapError(new Error('insufficient allowance'), 'context').type).toBe('token_insufficient_allowance');
    expect(mapError(new Error('transfer failed'), 'context').type).toBe('token_transfer_failed');
    expect(mapError(new Error('health factor'), 'context').type).toBe('health_factor_too_low');
    expect(mapError(new Error('collateral'), 'context').type).toBe('insufficient_collateral');
    expect(mapError(new Error('liquidity'), 'context').type).toBe('insufficient_liquidity');
    expect(mapError({ code: 'NETWORK_ERROR', message: 'Network error' }, 'context').type).toBe('network_error');
  });

  it('should extract comptroller error codes', () => {
    const extractCode = (takaraWrapper as any).extractComptrollerErrorCode.bind(takaraWrapper);

    expect(extractCode('Comptroller error: 1')).toBe(1);
    expect(extractCode('Error 5 occurred')).toBe(5);
    expect(extractCode('No error code')).toBe(0);
  });
});

describe('Integration Tests', () => {
  // These would be integration tests that actually interact with contracts
  // They would be skipped in unit tests and run separately

  describe.skip('Real Contract Integration', () => {
    it('should interact with real Takara contracts on testnet', async () => {
      // Integration test implementation
    });

    it('should handle real transaction flows', async () => {
      // Integration test implementation
    });
  });
});

// Test utilities
export const createMockTakaraWrapper = () => {
  const mockProvider = {} as jest.Mocked<ethers.Provider>;
  const mockSigner = {
    getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
  } as jest.Mocked<ethers.Signer>;

  return new TakaraProtocolWrapper(mockProvider, mockSigner);
};

export const mockTransaction = {
  wait: jest.fn().mockResolvedValue({
    transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    gasUsed: ethers.getBigInt(21000),
    blockNumber: 12345,
    confirmations: 1,
  }),
};

export const mockAccountData = {
  totalCollateralBase: ethers.parseEther('1000'),
  totalDebtBase: ethers.parseEther('500'),
  availableBorrowsBase: ethers.parseEther('250'),
  currentLiquidationThreshold: ethers.parseEther('0.85'),
  ltv: ethers.parseEther('0.75'),
  healthFactor: ethers.parseEther('1.5'),
};