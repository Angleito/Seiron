/**
 * @fileoverview OpenAI integration utilities for model training and fine-tuning
 * Uses functional programming patterns with fp-ts for API interactions
 */

import { pipe, flow } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';

import type { Result } from '../types';
import type { TrainingDataset, TrainingDataPoint } from './prepare';

/**
 * OpenAI API configuration
 */
export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
  project?: string;
  timeout?: number;
}

/**
 * Fine-tuning job configuration
 */
export interface FineTuningConfig {
  model: string;
  trainingFile: string;
  validationFile?: string;
  suffix?: string;
  nEpochs?: number;
  batchSize?: number;
  learningRateMultiplier?: number;
  promptLossWeight?: number;
  computeClassificationMetrics?: boolean;
}

/**
 * Fine-tuning job status
 */
export interface FineTuningJob {
  id: string;
  object: string;
  model: string;
  created_at: number;
  finished_at?: number;
  fine_tuned_model?: string;
  organization_id: string;
  result_files: string[];
  status: 'validating_files' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  validation_file?: string;
  training_file: string;
  hyperparameters: {
    n_epochs: number;
    batch_size: number;
    learning_rate_multiplier: number;
  };
  trained_tokens?: number;
  error?: {
    code: string;
    message: string;
    param?: string;
  };
}

/**
 * OpenAI API error
 */
export interface OpenAIError {
  type: 'openai_error';
  message: string;
  code?: string;
  status?: number;
}

/**
 * Training file upload response
 */
export interface FileUpload {
  id: string;
  object: string;
  bytes: number;
  created_at: number;
  filename: string;
  purpose: string;
  status: 'uploaded' | 'processed' | 'error';
  status_details?: string;
}

/**
 * Convert training dataset to OpenAI fine-tuning format
 */
export const convertToOpenAIFormat = (
  dataset: TrainingDataset
): Array<{
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}> => {
  return dataset.data.map(point => ({
    messages: [
      {
        role: 'system' as const,
        content: 'You are Seiron, an AI assistant for DeFi portfolio management on the Sei Network. Analyze user messages and extract their intent and parameters.',
      },
      {
        role: 'user' as const,
        content: JSON.stringify({
          message: point.input.userMessage,
          context: point.input.context || {},
          portfolioState: point.input.portfolioState || {},
          marketConditions: point.input.marketConditions || {},
        }),
      },
      {
        role: 'assistant' as const,
        content: JSON.stringify({
          intent: point.output.intent,
          parameters: point.output.parameters,
          confidence: point.output.confidence,
          action: point.output.action,
        }),
      },
    ],
  }));
};

/**
 * Convert dataset to JSONL format for OpenAI
 */
export const convertToJSONL = (
  dataset: TrainingDataset
): string => {
  const openaiFormat = convertToOpenAIFormat(dataset);
  return openaiFormat.map(item => JSON.stringify(item)).join('\n');
};

/**
 * Create OpenAI client wrapper
 */
export class OpenAITrainingClient {
  private config: OpenAIConfig;
  private baseHeaders: Record<string, string>;

  constructor(config: OpenAIConfig) {
    this.config = config;
    this.baseHeaders = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...(config.organization && { 'OpenAI-Organization': config.organization }),
      ...(config.project && { 'OpenAI-Project': config.project }),
    };
  }

  /**
   * Upload training file to OpenAI
   */
  uploadFile = (
    content: string,
    filename: string,
    purpose: 'fine-tune' | 'assistants' = 'fine-tune'
  ): TE.TaskEither<OpenAIError, FileUpload> => {
    return TE.tryCatch(
      async () => {
        const formData = new FormData();
        const blob = new Blob([content], { type: 'application/json' });
        formData.append('file', blob, filename);
        formData.append('purpose', purpose);

        const response = await fetch(`${this.config.baseURL || 'https://api.openai.com'}/v1/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            ...(this.config.organization && { 'OpenAI-Organization': this.config.organization }),
            ...(this.config.project && { 'OpenAI-Project': this.config.project }),
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Upload failed: ${error.error?.message || response.statusText}`);
        }

        return await response.json() as FileUpload;
      },
      (error) => ({
        type: 'openai_error' as const,
        message: error instanceof Error ? error.message : 'Unknown upload error',
        status: error instanceof Error && 'status' in error ? error.status as number : undefined,
      })
    );
  };

  /**
   * Create fine-tuning job
   */
  createFineTuningJob = (
    config: FineTuningConfig
  ): TE.TaskEither<OpenAIError, FineTuningJob> => {
    return TE.tryCatch(
      async () => {
        const response = await fetch(`${this.config.baseURL || 'https://api.openai.com'}/v1/fine_tuning/jobs`, {
          method: 'POST',
          headers: this.baseHeaders,
          body: JSON.stringify({
            training_file: config.trainingFile,
            model: config.model,
            ...(config.validationFile && { validation_file: config.validationFile }),
            ...(config.suffix && { suffix: config.suffix }),
            hyperparameters: {
              ...(config.nEpochs && { n_epochs: config.nEpochs }),
              ...(config.batchSize && { batch_size: config.batchSize }),
              ...(config.learningRateMultiplier && { learning_rate_multiplier: config.learningRateMultiplier }),
            },
            ...(config.computeClassificationMetrics && { 
              compute_classification_metrics: config.computeClassificationMetrics 
            }),
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Fine-tuning job creation failed: ${error.error?.message || response.statusText}`);
        }

        return await response.json() as FineTuningJob;
      },
      (error) => ({
        type: 'openai_error' as const,
        message: error instanceof Error ? error.message : 'Unknown fine-tuning error',
        status: error instanceof Error && 'status' in error ? error.status as number : undefined,
      })
    );
  };

  /**
   * Get fine-tuning job status
   */
  getFineTuningJob = (
    jobId: string
  ): TE.TaskEither<OpenAIError, FineTuningJob> => {
    return TE.tryCatch(
      async () => {
        const response = await fetch(`${this.config.baseURL || 'https://api.openai.com'}/v1/fine_tuning/jobs/${jobId}`, {
          method: 'GET',
          headers: this.baseHeaders,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Failed to get fine-tuning job: ${error.error?.message || response.statusText}`);
        }

        return await response.json() as FineTuningJob;
      },
      (error) => ({
        type: 'openai_error' as const,
        message: error instanceof Error ? error.message : 'Unknown error getting job status',
        status: error instanceof Error && 'status' in error ? error.status as number : undefined,
      })
    );
  };

  /**
   * List fine-tuning jobs
   */
  listFineTuningJobs = (
    limit?: number
  ): TE.TaskEither<OpenAIError, { data: FineTuningJob[] }> => {
    return TE.tryCatch(
      async () => {
        const url = new URL(`${this.config.baseURL || 'https://api.openai.com'}/v1/fine_tuning/jobs`);
        if (limit) {
          url.searchParams.set('limit', limit.toString());
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: this.baseHeaders,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Failed to list fine-tuning jobs: ${error.error?.message || response.statusText}`);
        }

        return await response.json() as { data: FineTuningJob[] };
      },
      (error) => ({
        type: 'openai_error' as const,
        message: error instanceof Error ? error.message : 'Unknown error listing jobs',
        status: error instanceof Error && 'status' in error ? error.status as number : undefined,
      })
    );
  };

  /**
   * Cancel fine-tuning job
   */
  cancelFineTuningJob = (
    jobId: string
  ): TE.TaskEither<OpenAIError, FineTuningJob> => {
    return TE.tryCatch(
      async () => {
        const response = await fetch(`${this.config.baseURL || 'https://api.openai.com'}/v1/fine_tuning/jobs/${jobId}/cancel`, {
          method: 'POST',
          headers: this.baseHeaders,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Failed to cancel fine-tuning job: ${error.error?.message || response.statusText}`);
        }

        return await response.json() as FineTuningJob;
      },
      (error) => ({
        type: 'openai_error' as const,
        message: error instanceof Error ? error.message : 'Unknown error cancelling job',
        status: error instanceof Error && 'status' in error ? error.status as number : undefined,
      })
    );
  };

  /**
   * Test completion with fine-tuned model
   */
  testCompletion = (
    model: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    maxTokens: number = 150
  ): TE.TaskEither<OpenAIError, { content: string; usage: any }> => {
    return TE.tryCatch(
      async () => {
        const response = await fetch(`${this.config.baseURL || 'https://api.openai.com'}/v1/chat/completions`, {
          method: 'POST',
          headers: this.baseHeaders,
          body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature: 0.1,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Completion failed: ${error.error?.message || response.statusText}`);
        }

        const result = await response.json();
        return {
          content: result.choices[0]?.message?.content || '',
          usage: result.usage,
        };
      },
      (error) => ({
        type: 'openai_error' as const,
        message: error instanceof Error ? error.message : 'Unknown completion error',
        status: error instanceof Error && 'status' in error ? error.status as number : undefined,
      })
    );
  };
}

/**
 * Create a complete training pipeline
 */
export const createTrainingPipeline = (
  openaiConfig: OpenAIConfig
) => {
  const client = new OpenAITrainingClient(openaiConfig);

  return {
    /**
     * Upload dataset and create fine-tuning job
     */
    trainModel: (
      dataset: TrainingDataset,
      validationDataset: O.Option<TrainingDataset>,
      modelConfig: Omit<FineTuningConfig, 'trainingFile' | 'validationFile'>
    ): TE.TaskEither<OpenAIError, FineTuningJob> => {
      return pipe(
        // Upload training file
        client.uploadFile(
          convertToJSONL(dataset),
          `seiron-training-${Date.now()}.jsonl`
        ),
        TE.chain(trainingFile => {
          // Upload validation file if provided
          if (O.isSome(validationDataset)) {
            return pipe(
              client.uploadFile(
                convertToJSONL(validationDataset.value),
                `seiron-validation-${Date.now()}.jsonl`
              ),
              TE.map(validationFile => ({ trainingFile, validationFile: O.some(validationFile) }))
            );
          }
          return TE.right({ trainingFile, validationFile: O.none });
        }),
        TE.chain(({ trainingFile, validationFile }) => {
          // Create fine-tuning job
          const config: FineTuningConfig = {
            ...modelConfig,
            trainingFile: trainingFile.id,
            ...(O.isSome(validationFile) && { validationFile: validationFile.value.id }),
          };
          return client.createFineTuningJob(config);
        })
      );
    },

    /**
     * Monitor training job until completion
     */
    monitorTraining: (
      jobId: string,
      pollInterval: number = 30000
    ): TE.TaskEither<OpenAIError, FineTuningJob> => {
      const poll = (): TE.TaskEither<OpenAIError, FineTuningJob> => {
        return pipe(
          client.getFineTuningJob(jobId),
          TE.chain(job => {
            if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'cancelled') {
              return TE.right(job);
            }
            
            // Continue polling
            return pipe(
              TE.fromTask(() => new Promise(resolve => setTimeout(resolve, pollInterval))),
              TE.chain(() => poll())
            );
          })
        );
      };

      return poll();
    },

    /**
     * Evaluate model performance
     */
    evaluateModel: (
      modelId: string,
      testDataset: TrainingDataset
    ): TE.TaskEither<OpenAIError, {
      accuracy: number;
      intentAccuracy: number;
      parameterAccuracy: number;
      samples: Array<{
        input: string;
        expected: any;
        predicted: any;
        correct: boolean;
      }>;
    }> => {
      return pipe(
        TE.fromEither(E.right(testDataset.data.slice(0, 20))), // Limit evaluation samples
        TE.chain(samples => {
          const evaluations = samples.map(sample => {
            const messages = [
              {
                role: 'system' as const,
                content: 'You are Seiron, an AI assistant for DeFi portfolio management on the Sei Network. Analyze user messages and extract their intent and parameters.',
              },
              {
                role: 'user' as const,
                content: JSON.stringify({
                  message: sample.input.userMessage,
                  context: sample.input.context || {},
                  portfolioState: sample.input.portfolioState || {},
                  marketConditions: sample.input.marketConditions || {},
                }),
              },
            ];

            return pipe(
              client.testCompletion(modelId, messages),
              TE.map(result => {
                try {
                  const predicted = JSON.parse(result.content);
                  const expected = sample.output;
                  
                  const intentCorrect = predicted.intent === expected.intent;
                  const parameterCorrect = JSON.stringify(predicted.parameters) === JSON.stringify(expected.parameters);
                  
                  return {
                    input: sample.input.userMessage,
                    expected,
                    predicted,
                    correct: intentCorrect && parameterCorrect,
                    intentCorrect,
                    parameterCorrect,
                  };
                } catch {
                  return {
                    input: sample.input.userMessage,
                    expected: sample.output,
                    predicted: null,
                    correct: false,
                    intentCorrect: false,
                    parameterCorrect: false,
                  };
                }
              })
            );
          });

          return pipe(
            TE.sequenceArray(evaluations),
            TE.map(results => {
              const correctCount = results.filter(r => r.correct).length;
              const intentCorrectCount = results.filter(r => r.intentCorrect).length;
              const parameterCorrectCount = results.filter(r => r.parameterCorrect).length;
              
              return {
                accuracy: correctCount / results.length,
                intentAccuracy: intentCorrectCount / results.length,
                parameterAccuracy: parameterCorrectCount / results.length,
                samples: results,
              };
            })
          );
        })
      );
    },

    client,
  };
};

/**
 * Helper function to create OpenAI config from environment
 */
export const createOpenAIConfigFromEnv = (): O.Option<OpenAIConfig> => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return O.none;
  }

  return O.some({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
    organization: process.env.OPENAI_ORGANIZATION,
    project: process.env.OPENAI_PROJECT,
    timeout: process.env.OPENAI_TIMEOUT ? parseInt(process.env.OPENAI_TIMEOUT) : undefined,
  });
};