/**
 * @fileoverview Data preparation utilities for AI model training
 * Uses functional programming patterns with fp-ts for data transformations
 */

import { pipe, flow } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';

import type { Result } from '../types';

/**
 * Training data point structure
 */
export interface TrainingDataPoint {
  id: string;
  timestamp: number;
  input: {
    userMessage: string;
    context?: Record<string, any>;
    portfolioState?: Record<string, any>;
    marketConditions?: Record<string, any>;
  };
  output: {
    intent: string;
    parameters: Record<string, any>;
    confidence: number;
    action?: string;
  };
  metadata: {
    userId?: string;
    sessionId?: string;
    protocol?: string;
    outcome?: 'success' | 'failure' | 'pending';
  };
}

/**
 * Data preprocessing configuration
 */
export interface PreprocessConfig {
  minConfidence?: number;
  maxAge?: number; // in milliseconds
  includeFailures?: boolean;
  normalizeAmounts?: boolean;
  anonymize?: boolean;
}

/**
 * Training dataset structure
 */
export interface TrainingDataset {
  data: TrainingDataPoint[];
  metadata: {
    totalSamples: number;
    dateRange: {
      start: number;
      end: number;
    };
    intentDistribution: Record<string, number>;
    protocolDistribution: Record<string, number>;
  };
}

/**
 * Data validation error
 */
export interface DataValidationError {
  type: 'validation_error';
  message: string;
  field?: string;
  value?: any;
}

/**
 * Validate a single training data point
 */
export const validateDataPoint = (
  dataPoint: any
): E.Either<DataValidationError, TrainingDataPoint> => {
  if (!dataPoint.id || typeof dataPoint.id !== 'string') {
    return E.left({
      type: 'validation_error',
      message: 'Missing or invalid id field',
      field: 'id',
      value: dataPoint.id,
    });
  }

  if (!dataPoint.timestamp || typeof dataPoint.timestamp !== 'number') {
    return E.left({
      type: 'validation_error',
      message: 'Missing or invalid timestamp field',
      field: 'timestamp',
      value: dataPoint.timestamp,
    });
  }

  if (!dataPoint.input?.userMessage || typeof dataPoint.input.userMessage !== 'string') {
    return E.left({
      type: 'validation_error',
      message: 'Missing or invalid userMessage in input',
      field: 'input.userMessage',
      value: dataPoint.input?.userMessage,
    });
  }

  if (!dataPoint.output?.intent || typeof dataPoint.output.intent !== 'string') {
    return E.left({
      type: 'validation_error',
      message: 'Missing or invalid intent in output',
      field: 'output.intent',
      value: dataPoint.output?.intent,
    });
  }

  return E.right(dataPoint as TrainingDataPoint);
};

/**
 * Validate array of training data points
 */
export const validateDataset = (
  rawData: any[]
): E.Either<DataValidationError[], TrainingDataPoint[]> => {
  const results = rawData.map(validateDataPoint);
  const errors = results.filter(E.isLeft).map(e => e.left);
  const validData = results.filter(E.isRight).map(e => e.right);

  if (errors.length > 0) {
    return E.left(errors);
  }

  return E.right(validData);
};

/**
 * Filter data points based on configuration
 */
export const filterDataPoints = (config: PreprocessConfig) => (
  data: TrainingDataPoint[]
): TrainingDataPoint[] => {
  return pipe(
    data,
    A.filter(point => {
      // Filter by confidence
      if (config.minConfidence && point.output.confidence < config.minConfidence) {
        return false;
      }

      // Filter by age
      if (config.maxAge) {
        const age = Date.now() - point.timestamp;
        if (age > config.maxAge) {
          return false;
        }
      }

      // Filter by outcome
      if (!config.includeFailures && point.metadata.outcome === 'failure') {
        return false;
      }

      return true;
    })
  );
};

/**
 * Normalize amounts in training data
 */
export const normalizeAmounts = (dataPoint: TrainingDataPoint): TrainingDataPoint => {
  const normalizeValue = (value: any): any => {
    if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) {
      const num = parseFloat(value);
      if (num > 1000000) return 'large_amount';
      if (num > 10000) return 'medium_amount';
      if (num > 100) return 'small_amount';
      return 'micro_amount';
    }
    if (typeof value === 'number') {
      if (value > 1000000) return 'large_amount';
      if (value > 10000) return 'medium_amount';
      if (value > 100) return 'small_amount';
      return 'micro_amount';
    }
    return value;
  };

  const normalizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return normalizeValue(obj);
    }
    
    const normalized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('value')) {
        normalized[key] = normalizeValue(value);
      } else if (typeof value === 'object') {
        normalized[key] = normalizeObject(value);
      } else {
        normalized[key] = value;
      }
    }
    return normalized;
  };

  return {
    ...dataPoint,
    input: normalizeObject(dataPoint.input),
    output: {
      ...dataPoint.output,
      parameters: normalizeObject(dataPoint.output.parameters),
    },
  };
};

/**
 * Anonymize sensitive data
 */
export const anonymizeData = (dataPoint: TrainingDataPoint): TrainingDataPoint => {
  const anonymizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Anonymize wallet addresses
      if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
        return '0x' + 'x'.repeat(40);
      }
      // Anonymize transaction hashes
      if (/^0x[a-fA-F0-9]{64}$/.test(value)) {
        return '0x' + 'x'.repeat(64);
      }
    }
    return value;
  };

  const anonymizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return anonymizeValue(obj);
    }
    
    const anonymized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object') {
        anonymized[key] = anonymizeObject(value);
      } else {
        anonymized[key] = anonymizeValue(value);
      }
    }
    return anonymized;
  };

  return {
    ...dataPoint,
    input: anonymizeObject(dataPoint.input),
    output: {
      ...dataPoint.output,
      parameters: anonymizeObject(dataPoint.output.parameters),
    },
    metadata: {
      ...dataPoint.metadata,
      userId: dataPoint.metadata.userId ? 'anonymous' : undefined,
    },
  };
};

/**
 * Preprocess training dataset
 */
export const preprocessDataset = (
  rawData: any[],
  config: PreprocessConfig = {}
): TE.TaskEither<DataValidationError[], TrainingDataset> => {
  return pipe(
    TE.fromEither(validateDataset(rawData)),
    TE.map(validData => {
      let processedData = validData;

      // Apply filters
      processedData = filterDataPoints(config)(processedData);

      // Apply transformations
      if (config.normalizeAmounts) {
        processedData = processedData.map(normalizeAmounts);
      }

      if (config.anonymize) {
        processedData = processedData.map(anonymizeData);
      }

      // Calculate metadata
      const intentCounts: Record<string, number> = {};
      const protocolCounts: Record<string, number> = {};
      let minTimestamp = Infinity;
      let maxTimestamp = -Infinity;

      for (const point of processedData) {
        // Count intents
        intentCounts[point.output.intent] = (intentCounts[point.output.intent] || 0) + 1;

        // Count protocols
        if (point.metadata.protocol) {
          protocolCounts[point.metadata.protocol] = (protocolCounts[point.metadata.protocol] || 0) + 1;
        }

        // Track date range
        minTimestamp = Math.min(minTimestamp, point.timestamp);
        maxTimestamp = Math.max(maxTimestamp, point.timestamp);
      }

      return {
        data: processedData,
        metadata: {
          totalSamples: processedData.length,
          dateRange: {
            start: minTimestamp === Infinity ? 0 : minTimestamp,
            end: maxTimestamp === -Infinity ? 0 : maxTimestamp,
          },
          intentDistribution: intentCounts,
          protocolDistribution: protocolCounts,
        },
      };
    })
  );
};

/**
 * Split dataset into training and validation sets
 */
export const splitDataset = (
  dataset: TrainingDataset,
  trainRatio: number = 0.8
): { train: TrainingDataset; validation: TrainingDataset } => {
  const shuffled = [...dataset.data].sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(shuffled.length * trainRatio);
  
  const trainData = shuffled.slice(0, splitIndex);
  const validationData = shuffled.slice(splitIndex);

  return {
    train: {
      data: trainData,
      metadata: {
        ...dataset.metadata,
        totalSamples: trainData.length,
      },
    },
    validation: {
      data: validationData,
      metadata: {
        ...dataset.metadata,
        totalSamples: validationData.length,
      },
    },
  };
};

/**
 * Export dataset to JSON format
 */
export const exportDataset = (
  dataset: TrainingDataset,
  format: 'json' | 'jsonl' = 'json'
): string => {
  if (format === 'jsonl') {
    return dataset.data.map(point => JSON.stringify(point)).join('\n');
  }
  
  return JSON.stringify(dataset, null, 2);
};

/**
 * Generate training statistics
 */
export const generateStatistics = (dataset: TrainingDataset): {
  overview: {
    totalSamples: number;
    dateRange: string;
    avgConfidence: number;
  };
  intents: Array<{ intent: string; count: number; percentage: number }>;
  protocols: Array<{ protocol: string; count: number; percentage: number }>;
  timeDistribution: {
    byHour: Record<number, number>;
    byDay: Record<string, number>;
  };
} => {
  const { data, metadata } = dataset;
  
  // Calculate average confidence
  const avgConfidence = data.reduce((sum, point) => sum + point.output.confidence, 0) / data.length;

  // Format date range
  const startDate = new Date(metadata.dateRange.start).toISOString().split('T')[0];
  const endDate = new Date(metadata.dateRange.end).toISOString().split('T')[0];
  const dateRange = `${startDate} to ${endDate}`;

  // Intent statistics
  const intents = Object.entries(metadata.intentDistribution)
    .map(([intent, count]) => ({
      intent,
      count,
      percentage: (count / metadata.totalSamples) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  // Protocol statistics
  const protocols = Object.entries(metadata.protocolDistribution)
    .map(([protocol, count]) => ({
      protocol,
      count,
      percentage: (count / metadata.totalSamples) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  // Time distribution
  const byHour: Record<number, number> = {};
  const byDay: Record<string, number> = {};

  for (const point of data) {
    const date = new Date(point.timestamp);
    const hour = date.getHours();
    const day = date.toISOString().split('T')[0];

    byHour[hour] = (byHour[hour] || 0) + 1;
    byDay[day] = (byDay[day] || 0) + 1;
  }

  return {
    overview: {
      totalSamples: metadata.totalSamples,
      dateRange,
      avgConfidence,
    },
    intents,
    protocols,
    timeDistribution: {
      byHour,
      byDay,
    },
  };
};