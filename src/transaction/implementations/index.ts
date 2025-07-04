import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { ethers } from 'ethers';
import {
  TransactionError,
  TransactionQueue,
  TransactionRequest,
  TransactionBroadcaster,
  SignedTransaction,
  TransactionReceipt,
  TransactionStore,
  TransactionFlow,
  TransactionStatus,
  TransactionStatistics,
  TransactionValidator,
  ValidationRule,
  TransactionType,
  GasEstimationStrategy
} from '../types';

/**
 * In-memory transaction queue implementation
 */
export class InMemoryTransactionQueue implements TransactionQueue {
  private queue: TransactionRequest[] = [];
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  public enqueue(request: TransactionRequest): TaskEither<TransactionError, string> {
    if (this.queue.length >= this.maxSize) {
      return TE.left({
        code: 'QUEUE_FULL',
        message: 'Transaction queue is full',
        recoverable: false
      });
    }

    return TE.of(() => {
      this.queue.push(request);
      return request.id;
    })();
  }

  public dequeue(): TaskEither<TransactionError, TransactionRequest | null> {
    return TE.of(() => {
      return this.queue.shift() || null;
    })();
  }

  public peek(): TaskEither<TransactionError, TransactionRequest | null> {
    return TE.of(() => {
      return this.queue[0] || null;
    })();
  }

  public remove(id: string): TaskEither<TransactionError, void> {
    return TE.of(() => {
      const index = this.queue.findIndex(req => req.id === id);
      if (index !== -1) {
        this.queue.splice(index, 1);
      }
    })();
  }

  public getQueueSize(): number {
    return this.queue.length;
  }

  public getQueuedTransactions(): TransactionRequest[] {
    return [...this.queue];
  }
}

/**
 * Ethers-based transaction broadcaster
 */
export class EthersTransactionBroadcaster implements TransactionBroadcaster {
  private provider: ethers.Provider;
  private confirmations: number;

  constructor(provider: ethers.Provider, confirmations: number = 1) {
    this.provider = provider;
    this.confirmations = confirmations;
  }

  public broadcastTransaction(tx: SignedTransaction): TaskEither<TransactionError, string> {
    return pipe(
      TE.tryCatch(
        async () => {
          const response = await this.provider.broadcastTransaction(tx.rawTransaction);
          return response.hash;
        },
        error => ({
          code: 'BROADCAST_FAILED',
          message: `Failed to broadcast transaction: ${error}`,
          details: error,
          recoverable: true
        })
      )
    );
  }

  public waitForReceipt(
    txHash: string,
    confirmations?: number
  ): TaskEither<TransactionError, TransactionReceipt> {
    return pipe(
      TE.tryCatch(
        async () => {
          const receipt = await this.provider.waitForTransaction(
            txHash,
            confirmations || this.confirmations
          );

          if (!receipt) {
            throw new Error('Transaction receipt not found');
          }

          return this.convertReceipt(receipt);
        },
        error => ({
          code: 'RECEIPT_FAILED',
          message: `Failed to get transaction receipt: ${error}`,
          details: error,
          recoverable: true
        })
      )
    );
  }

  public getTransactionStatus(txHash: string): TaskEither<TransactionError, TransactionReceipt | null> {
    return pipe(
      TE.tryCatch(
        async () => {
          const receipt = await this.provider.getTransactionReceipt(txHash);
          return receipt ? this.convertReceipt(receipt) : null;
        },
        error => ({
          code: 'STATUS_FAILED',
          message: `Failed to get transaction status: ${error}`,
          details: error,
          recoverable: true
        })
      )
    );
  }

  private convertReceipt(receipt: ethers.TransactionReceipt): TransactionReceipt {
    return {
      transactionHash: receipt.hash,
      transactionIndex: receipt.index,
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber,
      from: receipt.from,
      to: receipt.to || '',
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.gasPrice,
      status: receipt.status === 1 ? 'success' : 'failed',
      logs: receipt.logs.map(log => ({
        address: log.address,
        topics: [...log.topics],
        data: log.data,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        transactionIndex: log.transactionIndex,
        logIndex: log.index
      })),
      contractAddress: receipt.contractAddress || undefined
    };
  }
}

/**
 * In-memory transaction store
 */
export class InMemoryTransactionStore implements TransactionStore {
  private flows: Map<string, TransactionFlow> = new Map();
  private userFlows: Map<string, Set<string>> = new Map();

  public save(flow: TransactionFlow): TaskEither<TransactionError, void> {
    return TE.of(() => {
      this.flows.set(flow.id, flow);
      
      // Update user index
      const userId = flow.request.metadata.userId;
      if (userId) {
        const userSet = this.userFlows.get(userId) || new Set();
        userSet.add(flow.id);
        this.userFlows.set(userId, userSet);
      }
    })();
  }

  public load(id: string): TaskEither<TransactionError, TransactionFlow | null> {
    return TE.of(() => {
      return this.flows.get(id) || null;
    })();
  }

  public update(id: string, updates: Partial<TransactionFlow>): TaskEither<TransactionError, void> {
    return TE.of(() => {
      const flow = this.flows.get(id);
      if (flow) {
        this.flows.set(id, { ...flow, ...updates, updatedAt: new Date() });
      }
    })();
  }

  public delete(id: string): TaskEither<TransactionError, void> {
    return TE.of(() => {
      const flow = this.flows.get(id);
      if (flow) {
        this.flows.delete(id);
        
        // Update user index
        const userId = flow.request.metadata.userId;
        if (userId) {
          const userSet = this.userFlows.get(userId);
          if (userSet) {
            userSet.delete(id);
            if (userSet.size === 0) {
              this.userFlows.delete(userId);
            }
          }
        }
      }
    })();
  }

  public findByStatus(status: TransactionStatus): TaskEither<TransactionError, TransactionFlow[]> {
    return TE.of(() => {
      const flows: TransactionFlow[] = [];
      for (const flow of this.flows.values()) {
        if (flow.status === status) {
          flows.push(flow);
        }
      }
      return flows;
    })();
  }

  public findByUser(userId: string): TaskEither<TransactionError, TransactionFlow[]> {
    return TE.of(() => {
      const flowIds = this.userFlows.get(userId);
      if (!flowIds) return [];

      const flows: TransactionFlow[] = [];
      for (const id of flowIds) {
        const flow = this.flows.get(id);
        if (flow) flows.push(flow);
      }
      return flows;
    })();
  }

  public getStatistics(): TaskEither<TransactionError, TransactionStatistics> {
    return TE.of(() => {
      const stats: TransactionStatistics = {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        pendingTransactions: 0,
        averageGasUsed: 0n,
        averageConfirmationTime: 0,
        totalGasSpent: 0n,
        transactionsByType: {}
      };

      let totalGasUsed = 0n;
      let gasCount = 0;
      let totalConfirmationTime = 0;
      let confirmationCount = 0;

      for (const flow of this.flows.values()) {
        stats.totalTransactions++;
        
        // Count by status
        switch (flow.status) {
          case 'completed':
            stats.successfulTransactions++;
            if (flow.receipt) {
              totalGasUsed += flow.receipt.gasUsed;
              gasCount++;
              stats.totalGasSpent += flow.receipt.gasUsed * flow.receipt.effectiveGasPrice;
            }
            if (flow.createdAt && flow.updatedAt) {
              totalConfirmationTime += flow.updatedAt.getTime() - flow.createdAt.getTime();
              confirmationCount++;
            }
            break;
          case 'failed':
            stats.failedTransactions++;
            break;
          case 'preparing':
          case 'awaiting_confirmation':
          case 'signing':
          case 'broadcasting':
          case 'confirming':
            stats.pendingTransactions++;
            break;
        }

        // Count by type
        const type = flow.request.type;
        stats.transactionsByType[type] = (stats.transactionsByType[type] || 0) + 1;
      }

      // Calculate averages
      if (gasCount > 0) {
        stats.averageGasUsed = totalGasUsed / BigInt(gasCount);
      }
      if (confirmationCount > 0) {
        stats.averageConfirmationTime = totalConfirmationTime / confirmationCount;
      }

      return stats;
    })();
  }
}

/**
 * Default transaction validator
 */
export class DefaultTransactionValidator implements TransactionValidator {
  private rules: Map<TransactionType, ValidationRule[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  public validate(request: TransactionRequest): Either<TransactionError[], void> {
    const errors: TransactionError[] = [];
    const rules = this.rules.get(request.type) || [];

    for (const rule of rules) {
      const value = this.getFieldValue(request, rule.field);
      
      if (!rule.validator(value)) {
        errors.push({
          code: 'VALIDATION_ERROR',
          message: rule.message,
          details: { field: rule.field, value },
          recoverable: false
        });
      }
    }

    if (errors.length > 0) {
      return left(errors);
    }

    return right(undefined);
  }

  public addRule(type: TransactionType, rule: ValidationRule): void {
    const rules = this.rules.get(type) || [];
    rules.push(rule);
    this.rules.set(type, rules);
  }

  public removeRule(type: TransactionType, field: string): void {
    const rules = this.rules.get(type);
    if (rules) {
      const filtered = rules.filter(rule => rule.field !== field);
      this.rules.set(type, filtered);
    }
  }

  private getFieldValue(request: TransactionRequest, field: string): any {
    const parts = field.split('.');
    let value: any = request;

    for (const part of parts) {
      value = value?.[part];
    }

    return value;
  }

  private initializeDefaultRules(): void {
    // Common rules for all transaction types
    const commonRules: ValidationRule[] = [
      {
        field: 'from',
        validator: (value) => ethers.isAddress(value),
        message: 'Invalid from address'
      },
      {
        field: 'chainId',
        validator: (value) => typeof value === 'number' && value > 0,
        message: 'Invalid chain ID'
      }
    ];

    // Lending supply rules
    this.rules.set('lending_supply', [
      ...commonRules,
      {
        field: 'params.asset',
        validator: (value) => ethers.isAddress(value),
        message: 'Invalid asset address'
      },
      {
        field: 'params.amount',
        validator: (value) => typeof value === 'bigint' && value > 0n,
        message: 'Amount must be positive'
      }
    ]);

    // Add rules for other transaction types...
    // This is a simplified example - add comprehensive rules for all types
  }
}

/**
 * Default gas estimation strategy
 */
export class DefaultGasEstimationStrategy implements GasEstimationStrategy {
  private provider: ethers.Provider;
  private gasLimits: Map<TransactionType, bigint> = new Map();

  constructor(provider: ethers.Provider) {
    this.provider = provider;
    this.initializeGasLimits();
  }

  public estimateGas(request: TransactionRequest): TaskEither<TransactionError, bigint> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Try to estimate gas from provider
          try {
            const estimate = await this.provider.estimateGas({
              from: request.from,
              to: request.to,
              value: request.value,
              data: request.data
            });
            
            // Add 20% buffer
            return estimate * 120n / 100n;
          } catch {
            // Fallback to default limits
            return this.getDefaultGasLimit(request.type);
          }
        },
        error => ({
          code: 'GAS_ESTIMATION_FAILED',
          message: `Failed to estimate gas: ${error}`,
          recoverable: false
        })
      )
    );
  }

  public getGasPrice(): TaskEither<TransactionError, bigint> {
    return pipe(
      TE.tryCatch(
        async () => {
          const feeData = await this.provider.getFeeData();
          return feeData.gasPrice || 0n;
        },
        error => ({
          code: 'GAS_PRICE_FAILED',
          message: `Failed to get gas price: ${error}`,
          recoverable: true
        })
      )
    );
  }

  public getMaxPriorityFeePerGas(): TaskEither<TransactionError, bigint> {
    return pipe(
      TE.tryCatch(
        async () => {
          const feeData = await this.provider.getFeeData();
          return feeData.maxPriorityFeePerGas || 0n;
        },
        error => ({
          code: 'GAS_PRICE_FAILED',
          message: `Failed to get priority fee: ${error}`,
          recoverable: true
        })
      )
    );
  }

  private initializeGasLimits(): void {
    this.gasLimits.set('lending_supply', 250000n);
    this.gasLimits.set('lending_withdraw', 220000n);
    this.gasLimits.set('lending_borrow', 280000n);
    this.gasLimits.set('lending_repay', 200000n);
    this.gasLimits.set('liquidity_add', 350000n);
    this.gasLimits.set('liquidity_remove', 300000n);
    this.gasLimits.set('swap', 200000n);
    this.gasLimits.set('stake', 150000n);
    this.gasLimits.set('unstake', 150000n);
    this.gasLimits.set('claim_rewards', 100000n);
    this.gasLimits.set('approve', 50000n);
    this.gasLimits.set('transfer', 21000n);
    this.gasLimits.set('batch', 500000n);
  }

  private getDefaultGasLimit(type: TransactionType): bigint {
    return this.gasLimits.get(type) || 300000n;
  }
}