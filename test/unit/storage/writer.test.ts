import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as E from 'fp-ts/Either';

import { createDatasetWriter } from '../../../src/storage/writer';
import { MLDataset, RawData, ProcessedData } from '../../../src/types';

// Mock fs module
jest.mock('fs/promises');
jest.mock('zlib', () => ({
  gzipSync: jest.fn((data) => Buffer.from('compressed-' + data.toString())),
  gunzipSync: jest.fn((data) => Buffer.from(data.toString().replace('compressed-', '')))
}));

describe('Dataset Writer', () => {
  const mockBasePath = '/test/datasets';
  const writer = createDatasetWriter(mockBasePath);

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('{}'));
  });

  describe('writeRawData', () => {
    const mockRawData: RawData = {
      timestamp: 1700000000,
      prices: {
        SEI: { value: 0.5, decimals: 18 },
        ETH: { value: 2000, decimals: 18 }
      },
      volumes: {
        SEI: '1000000000000000000',
        ETH: '500000000000000000'
      },
      metadata: {
        source: 'test-collector',
        version: '1.0'
      }
    };

    it('should write raw data successfully', async () => {
      const result = await writer.writeRawData(mockRawData);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toContain('raw_');
        expect(result.right).toContain('.json');
      }

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('raw'),
        expect.objectContaining({ recursive: true })
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        expect.any(String)
      );
    });

    it('should organize raw data by date', async () => {
      const result = await writer.writeRawData(mockRawData);

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringMatching(/raw\/\d{4}-\d{2}-\d{2}/),
        expect.any(Object)
      );
    });

    it('should handle write errors', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'));

      const result = await writer.writeRawData(mockRawData);

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('storage');
        expect(result.left.message).toContain('Disk full');
      }
    });

    it('should write batch raw data', async () => {
      const batchData = Array(5).fill(mockRawData);
      const result = await writer.writeBatchRawData(batchData);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.length).toBe(1); // Should batch into single file
      }
      
      const writtenData = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(writtenData.data).toHaveLength(5);
      expect(writtenData.metadata.count).toBe(5);
    });
  });

  describe('writeProcessedData', () => {
    const mockProcessedData: ProcessedData = {
      timestamp: 1700000000000,
      features: {
        SEI_returns: 0.02,
        SEI_rsi: 65.5,
        SEI_volatility: 0.15,
        ETH_returns: -0.01,
        ETH_rsi: 45.2,
        ETH_volatility: 0.22
      },
      labels: {
        optimal_sei_weight: 0.3,
        optimal_eth_weight: 0.7
      },
      quality: 0.98
    };

    it('should write processed data successfully', async () => {
      const result = await writer.writeProcessedData(mockProcessedData);

      expect(E.isRight(result)).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('processed'),
        expect.any(String)
      );
    });

    it('should support compression', async () => {
      const result = await writer.writeProcessedData(mockProcessedData, {
        compress: true
      });

      expect(E.isRight(result)).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.gz'),
        expect.any(Buffer)
      );
    });

    it('should write in OpenAI format when specified', async () => {
      const result = await writer.writeProcessedData(mockProcessedData, {
        format: 'openai'
      });

      expect(E.isRight(result)).toBe(true);
      
      const writtenData = (fs.writeFile as jest.Mock).mock.calls[0][1];
      expect(writtenData).toContain('{"messages":[{');
      expect(writtenData).toContain('"role":"system"');
      expect(writtenData).toContain('"role":"user"');
      expect(writtenData).toContain('"role":"assistant"');
    });
  });

  describe('writeMLDataset', () => {
    const mockMLDataset: MLDataset = {
      metadata: {
        version: '1.0.0',
        chainId: 1329,
        timeRange: {
          start: 1700000000000,
          end: 1700086400000
        },
        features: ['returns', 'rsi', 'volatility']
      },
      data: Array(100).fill(null).map((_, i) => ({
        timestamp: 1700000000000 + i * 60000,
        features: [Math.random(), Math.random() * 100, Math.random()],
        labels: [Math.random(), Math.random()],
        quality: 0.95 + Math.random() * 0.05
      })),
      features: ['SEI_returns', 'SEI_rsi', 'SEI_volatility'],
      labels: ['optimal_sei_weight', 'optimal_eth_weight']
    };

    it('should write ML dataset successfully', async () => {
      const result = await writer.writeMLDataset(mockMLDataset, 'training_v1');

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toContain('training_v1');
        expect(result.right).toContain('.json');
      }
    });

    it('should split dataset when requested', async () => {
      const result = await writer.writeMLDataset(mockMLDataset, 'split_test', {
        split: { train: 0.8, validation: 0.2 }
      });

      expect(E.isRight(result)).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
      
      const calls = (fs.writeFile as jest.Mock).mock.calls;
      expect(calls[0][0]).toContain('train');
      expect(calls[1][0]).toContain('validation');
      
      const trainData = JSON.parse(calls[0][1]);
      const valData = JSON.parse(calls[1][1]);
      expect(trainData.data.length).toBe(80);
      expect(valData.data.length).toBe(20);
    });

    it('should create dataset manifest', async () => {
      const result = await writer.writeMLDataset(mockMLDataset, 'with_manifest', {
        createManifest: true
      });

      expect(E.isRight(result)).toBe(true);
      
      const manifestCall = (fs.writeFile as jest.Mock).mock.calls.find(
        call => call[0].includes('manifest')
      );
      expect(manifestCall).toBeDefined();
      
      const manifest = JSON.parse(manifestCall[1]);
      expect(manifest).toHaveProperty('dataset');
      expect(manifest).toHaveProperty('statistics');
      expect(manifest.statistics.totalSamples).toBe(100);
      expect(manifest.statistics.featureCount).toBe(3);
    });
  });

  describe('createCheckpoint', () => {
    it('should create checkpoint successfully', async () => {
      const metadata = {
        blockNumber: 1000,
        timestamp: Date.now(),
        dataPoints: 5000
      };

      const result = await writer.createCheckpoint('collector', metadata);

      expect(E.isRight(result)).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('checkpoints'),
        expect.stringContaining('"blockNumber":1000')
      );
    });

    it('should handle checkpoint errors', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const result = await writer.createCheckpoint('test', {});

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.message).toContain('Permission denied');
      }
    });
  });

  describe('File organization', () => {
    it('should organize files by type and date', async () => {
      const date = new Date('2024-01-15');
      const timestamp = date.getTime();

      await writer.writeRawData({
        timestamp: timestamp / 1000,
        prices: {},
        volumes: {},
        metadata: {}
      });

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('raw/2024-01-15'),
        expect.any(Object)
      );
    });

    it('should generate unique filenames', async () => {
      const writes = await Promise.all([
        writer.writeRawData({ timestamp: Date.now() / 1000, prices: {}, volumes: {}, metadata: {} }),
        writer.writeRawData({ timestamp: Date.now() / 1000, prices: {}, volumes: {}, metadata: {} }),
        writer.writeRawData({ timestamp: Date.now() / 1000, prices: {}, volumes: {}, metadata: {} })
      ]);

      const filenames = writes
        .filter(E.isRight)
        .map(r => (r as E.Right<string>).right);

      // All filenames should be unique
      expect(new Set(filenames).size).toBe(filenames.length);
    });
  });

  describe('Atomic writes', () => {
    it('should use atomic write pattern', async () => {
      await writer.writeRawData({
        timestamp: Date.now() / 1000,
        prices: {},
        volumes: {},
        metadata: {}
      });

      const calls = (fs.writeFile as jest.Mock).mock.calls;
      // Should write to temp file first, then rename
      expect(calls[0][0]).toContain('.tmp');
    });
  });
});