import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

import {
  collectBlockData,
  collectTransactionData,
  subscribeToBlocks,
  aggregateBlockData,
  createChainCollector
} from '../../../src/collectors/chain';
import { SeiConfig, BlockData, TransactionData } from '../../../src/types';

// Mock viem
jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({
    getBlock: jest.fn(),
    getTransaction: jest.fn(),
    getBlockNumber: jest.fn(),
    watchBlocks: jest.fn()
  })),
  http: jest.fn(),
  custom: jest.fn()
}));

describe('Chain Collector', () => {
  const mockConfig: SeiConfig = {
    chainId: 1329,
    rpcUrl: 'https://rpc.sei-apis.com',
    wsUrl: 'wss://ws.sei-apis.com',
    contracts: {},
    blockTime: 400
  };

  const mockBlock = {
    number: BigInt(1000),
    hash: '0xabc123',
    timestamp: BigInt(1700000000),
    transactions: ['0xtx1', '0xtx2'],
    gasUsed: BigInt(1000000),
    gasLimit: BigInt(30000000),
    baseFeePerGas: BigInt(1000000000)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('collectBlockData', () => {
    it('should collect block data successfully', async () => {
      const mockClient = {
        getBlock: jest.fn().mockResolvedValue(mockBlock)
      };

      const result = await collectBlockData(mockClient as any, 1000)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.blockNumber).toBe(1000);
        expect(result.right.transactionCount).toBe(2);
        expect(result.right.gasUsed).toBe(1000000);
      }
    });

    it('should handle block fetch errors', async () => {
      const mockClient = {
        getBlock: jest.fn().mockRejectedValue(new Error('Network error'))
      };

      const result = await collectBlockData(mockClient as any, 1000)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('network');
        expect(result.left.message).toContain('Network error');
      }
    });

    it('should validate block data', async () => {
      const invalidBlock = { ...mockBlock, timestamp: BigInt(-1) };
      const mockClient = {
        getBlock: jest.fn().mockResolvedValue(invalidBlock)
      };

      const result = await collectBlockData(mockClient as any, 1000)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('validation');
      }
    });
  });

  describe('collectTransactionData', () => {
    const mockTransaction = {
      hash: '0xtx1',
      from: '0xfrom',
      to: '0xto',
      value: BigInt(1000000000000000000),
      gasPrice: BigInt(1000000000),
      gas: BigInt(21000),
      input: '0x',
      blockNumber: BigInt(1000)
    };

    it('should collect transaction data successfully', async () => {
      const mockClient = {
        getTransaction: jest.fn().mockResolvedValue(mockTransaction)
      };

      const result = await collectTransactionData(mockClient as any, '0xtx1')();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.hash).toBe('0xtx1');
        expect(result.right.value).toBe('1000000000000000000');
        expect(result.right.gasPrice).toBe('1000000000');
      }
    });

    it('should handle missing transactions', async () => {
      const mockClient = {
        getTransaction: jest.fn().mockResolvedValue(null)
      };

      const result = await collectTransactionData(mockClient as any, '0xinvalid')();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.message).toContain('Transaction not found');
      }
    });
  });

  describe('aggregateBlockData', () => {
    const mockBlocks: BlockData[] = [
      {
        blockNumber: 1000,
        timestamp: 1700000000,
        transactionCount: 10,
        gasUsed: 1000000,
        gasLimit: 30000000,
        baseFeePerGas: '1000000000',
        utilizationRate: 0.033
      },
      {
        blockNumber: 1001,
        timestamp: 1700000400,
        transactionCount: 20,
        gasUsed: 2000000,
        gasLimit: 30000000,
        baseFeePerGas: '1100000000',
        utilizationRate: 0.066
      }
    ];

    it('should aggregate block data correctly', () => {
      const result = aggregateBlockData(mockBlocks, 5);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.length).toBe(1);
        expect(result.right[0].avgTransactionCount).toBe(15);
        expect(result.right[0].avgGasUsed).toBe(1500000);
        expect(result.right[0].avgUtilizationRate).toBeCloseTo(0.05, 2);
      }
    });

    it('should handle empty block array', () => {
      const result = aggregateBlockData([], 5);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.length).toBe(0);
      }
    });
  });

  describe('createChainCollector', () => {
    it('should create a functional chain collector', () => {
      const collector = createChainCollector(mockConfig);

      expect(collector).toHaveProperty('collectBlocks');
      expect(collector).toHaveProperty('collectTransactions');
      expect(collector).toHaveProperty('collectLatestBlocks');
      expect(collector).toHaveProperty('subscribe');
      expect(collector).toHaveProperty('aggregateData');
    });

    it('should collect blocks in range', async () => {
      const collector = createChainCollector(mockConfig);
      
      // Mock the underlying client
      const mockGetBlock = jest.fn().mockResolvedValue(mockBlock);
      (collector as any).context.client.getBlock = mockGetBlock;

      const result = await collector.collectBlocks(1000, 1002)();

      expect(mockGetBlock).toHaveBeenCalledTimes(3);
      expect(E.isRight(result)).toBe(true);
    });
  });

  describe('Functional composition', () => {
    it('should compose collectors functionally', async () => {
      const mockClient = {
        getBlock: jest.fn().mockResolvedValue(mockBlock),
        getBlockNumber: jest.fn().mockResolvedValue(BigInt(1005))
      };

      const collectLatest = pipe(
        TE.tryCatch(
          () => mockClient.getBlockNumber(),
          (error) => ({ type: 'network' as const, message: String(error), timestamp: Date.now() })
        ),
        TE.chain((latestBlock) =>
          collectBlockData(mockClient as any, Number(latestBlock))
        )
      );

      const result = await collectLatest();

      expect(E.isRight(result)).toBe(true);
      expect(mockClient.getBlockNumber).toHaveBeenCalled();
      expect(mockClient.getBlock).toHaveBeenCalled();
    });
  });
});