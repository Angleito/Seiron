import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  TransactionFlow,
  TransactionRequest,
  TransactionStatus,
  TransactionError,
  TransactionEvent,
  PreparedTransaction,
  SignedTransaction,
  TransactionReceipt,
  TransactionFlowConfig,
  TransactionBuilder,
  TransactionBroadcaster,
  TransactionQueue,
  TransactionStore,
  TransactionValidator,
  TransactionConfirmationRequest,
  TransactionConfirmationResponse,
  WalletInterface,
  TransactionStatistics
} from './types';

/**
 * TransactionFlowManager - Orchestrates transaction lifecycle without private keys
 * 
 * This service manages the entire transaction flow:
 * 1. Transaction preparation (building unsigned transactions)
 * 2. User confirmation requests
 * 3. Wallet signing coordination
 * 4. Broadcasting and monitoring
 * 5. Error handling and recovery
 * 
 * Key features:
 * - No private key dependencies
 * - Queue management for batch operations
 * - Retry logic with exponential backoff
 * - Transaction persistence
 * - Real-time status updates via events
 * - Gas optimization strategies
 */
export class TransactionFlowManager extends EventEmitter {
  private flows: Map<string, TransactionFlow> = new Map();
  private config: TransactionFlowConfig;
  private builder: TransactionBuilder;
  private broadcaster: TransactionBroadcaster;
  private queue: TransactionQueue;
  private store: TransactionStore;
  private validator: TransactionValidator;
  private wallet?: WalletInterface;
  private processingQueue: boolean = false;
  private statistics: TransactionStatistics;

  constructor(
    config: TransactionFlowConfig,
    builder: TransactionBuilder,
    broadcaster: TransactionBroadcaster,
    queue: TransactionQueue,
    store: TransactionStore,
    validator: TransactionValidator
  ) {
    super();
    this.config = config;
    this.builder = builder;
    this.broadcaster = broadcaster;
    this.queue = queue;
    this.store = store;
    this.validator = validator;
    this.statistics = this.initializeStatistics();
    this.setupEventHandlers();
    this.startQueueProcessor();
  }

  /**
   * Initialize statistics
   */
  private initializeStatistics(): TransactionStatistics {
    return {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      averageGasUsed: 0n,
      averageConfirmationTime: 0,
      totalGasSpent: 0n,
      transactionsByType: {}
    };
  }

  /**
   * Setup internal event handlers
   */
  private setupEventHandlers(): void {
    this.on('flow:status:changed', this.handleStatusChange.bind(this));
    this.on('flow:completed', this.handleFlowCompleted.bind(this));
    this.on('flow:failed', this.handleFlowFailed.bind(this));
  }

  /**
   * Set wallet interface for signing
   */
  public setWallet(wallet: WalletInterface): void {
    this.wallet = wallet;
    this.emit('wallet:connected', { address: wallet.getAddress() });
  }

  /**
   * Create a new transaction flow
   */
  public createFlow(request: TransactionRequest): TaskEither<TransactionError, TransactionFlow> {
    return pipe(
      this.validateRequest(request),
      TE.fromEither,
      TE.chain(() => this.initializeFlow(request)),
      TE.chain(flow => this.persistFlow(flow)),
      TE.chain(flow => this.processFlow(flow))
    );
  }

  /**
   * Queue a transaction for later processing
   */
  public queueTransaction(request: TransactionRequest): TaskEither<TransactionError, string> {
    return pipe(
      this.validateRequest(request),
      TE.fromEither,
      TE.chain(() => this.queue.enqueue(request)),
      TE.map(id => {
        this.emit('transaction:queued', { id, request });
        return id;
      })
    );
  }

  /**
   * Request user confirmation for a transaction
   */
  public requestConfirmation(flowId: string): TaskEither<TransactionError, TransactionConfirmationRequest> {
    return pipe(
      this.getFlow(flowId),
      TE.chain(flow => {
        if (!flow.preparedTx) {
          return TE.left(this.createError('NO_PREPARED_TX', 'No prepared transaction found'));
        }

        const confirmationRequest: TransactionConfirmationRequest = {
          flowId,
          transaction: flow.preparedTx,
          metadata: flow.request.metadata,
          estimatedGas: BigInt(flow.preparedTx.gas),
          estimatedCost: this.calculateEstimatedCost(flow.preparedTx),
          timeout: this.config.confirmationTimeout
        };

        this.updateFlowStatus(flowId, 'awaiting_confirmation');
        this.emit('confirmation:requested', confirmationRequest);

        return TE.right(confirmationRequest);
      })
    );
  }

  /**
   * Handle user confirmation response
   */
  public handleConfirmation(
    flowId: string,
    response: TransactionConfirmationResponse
  ): TaskEither<TransactionError, TransactionFlow> {
    return pipe(
      this.getFlow(flowId),
      TE.chain(flow => {
        if (flow.status !== 'awaiting_confirmation') {
          return TE.left(this.createError('INVALID_STATE', 'Flow not awaiting confirmation'));
        }

        if (!response.approved) {
          return this.cancelFlow(flowId, response.rejectionReason);
        }

        if (response.signedTransaction) {
          // User signed the transaction directly
          return this.handleSignedTransaction(flowId, response.signedTransaction);
        }

        // Request wallet signing
        return this.requestWalletSigning(flowId);
      })
    );
  }

  /**
   * Cancel a transaction flow
   */
  public cancelFlow(flowId: string, reason?: string): TaskEither<TransactionError, TransactionFlow> {
    return pipe(
      this.getFlow(flowId),
      TE.chain(flow => {
        if (['completed', 'failed', 'cancelled'].includes(flow.status)) {
          return TE.left(this.createError('INVALID_STATE', 'Cannot cancel flow in current state'));
        }

        const updatedFlow: TransactionFlow = {
          ...flow,
          status: 'cancelled',
          error: this.createError('CANCELLED', reason || 'Transaction cancelled by user'),
          updatedAt: new Date()
        };

        this.flows.set(flowId, updatedFlow);
        this.addEvent(flowId, 'cancelled', reason || 'Transaction cancelled');
        this.emit('flow:cancelled', { flowId, reason });

        return this.persistFlow(updatedFlow);
      })
    );
  }

  /**
   * Get flow status
   */
  public getFlowStatus(flowId: string): TaskEither<TransactionError, TransactionFlow> {
    return this.getFlow(flowId);
  }

  /**
   * Get all flows for a user
   */
  public getUserFlows(userId: string): TaskEither<TransactionError, TransactionFlow[]> {
    return this.store.findByUser(userId);
  }

  /**
   * Get transaction statistics
   */
  public getStatistics(): TransactionStatistics {
    return { ...this.statistics };
  }

  /**
   * Retry a failed transaction
   */
  public retryTransaction(flowId: string): TaskEither<TransactionError, TransactionFlow> {
    return pipe(
      this.getFlow(flowId),
      TE.chain(flow => {
        if (flow.status !== 'failed' || !flow.error?.recoverable) {
          return TE.left(this.createError('INVALID_STATE', 'Cannot retry transaction'));
        }

        // Reset flow status and retry
        const updatedFlow: TransactionFlow = {
          ...flow,
          status: 'preparing',
          error: undefined,
          updatedAt: new Date()
        };

        this.flows.set(flowId, updatedFlow);
        return this.processFlow(updatedFlow);
      })
    );
  }

  /**
   * Validate transaction request
   */
  private validateRequest(request: TransactionRequest): Either<TransactionError, void> {
    const validation = this.validator.validate(request);
    
    if (validation._tag === 'Left') {
      return left(this.createError('VALIDATION_FAILED', 'Invalid transaction request', validation.left));
    }

    return right(undefined);
  }

  /**
   * Initialize a new flow
   */
  private initializeFlow(request: TransactionRequest): TaskEither<TransactionError, TransactionFlow> {
    return TE.of({
      id: uuidv4(),
      request,
      status: 'preparing' as TransactionStatus,
      history: [{
        timestamp: new Date(),
        status: 'preparing',
        message: 'Transaction flow initialized'
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Process transaction flow
   */
  private processFlow(flow: TransactionFlow): TaskEither<TransactionError, TransactionFlow> {
    this.flows.set(flow.id, flow);
    
    return pipe(
      this.prepareTransaction(flow),
      TE.chain(preparedFlow => {
        if (preparedFlow.request.metadata.requiresConfirmation) {
          // Emit event for UI to handle confirmation
          this.emit('confirmation:needed', { flowId: preparedFlow.id });
          return TE.right(preparedFlow);
        }
        // Auto-proceed if no confirmation needed
        return this.requestWalletSigning(preparedFlow.id);
      })
    );
  }

  /**
   * Prepare transaction (build unsigned tx)
   */
  private prepareTransaction(flow: TransactionFlow): TaskEither<TransactionError, TransactionFlow> {
    return pipe(
      this.builder.buildTransaction(flow.request),
      TE.map(preparedTx => {
        const updatedFlow: TransactionFlow = {
          ...flow,
          preparedTx,
          status: 'awaiting_confirmation',
          updatedAt: new Date()
        };
        
        this.flows.set(flow.id, updatedFlow);
        this.addEvent(flow.id, 'awaiting_confirmation', 'Transaction prepared');
        this.updateStatistics('preparing', flow.request.type);
        
        return updatedFlow;
      }),
      TE.mapLeft(error => {
        this.handleFlowError(flow.id, error);
        return error;
      })
    );
  }

  /**
   * Request wallet signing
   */
  private requestWalletSigning(flowId: string): TaskEither<TransactionError, TransactionFlow> {
    if (!this.wallet) {
      return TE.left(this.createError('NO_WALLET', 'No wallet connected'));
    }

    return pipe(
      this.getFlow(flowId),
      TE.chain(flow => {
        if (!flow.preparedTx) {
          return TE.left(this.createError('NO_PREPARED_TX', 'No prepared transaction'));
        }

        this.updateFlowStatus(flowId, 'signing');
        
        return pipe(
          this.wallet.signTransaction(flow.preparedTx),
          TE.chain(signedTx => this.handleSignedTransaction(flowId, signedTx))
        );
      })
    );
  }

  /**
   * Handle signed transaction
   */
  private handleSignedTransaction(
    flowId: string,
    signedTx: SignedTransaction
  ): TaskEither<TransactionError, TransactionFlow> {
    return pipe(
      this.getFlow(flowId),
      TE.chain(flow => {
        const updatedFlow: TransactionFlow = {
          ...flow,
          signedTx,
          status: 'broadcasting',
          updatedAt: new Date()
        };

        this.flows.set(flowId, updatedFlow);
        this.addEvent(flowId, 'broadcasting', 'Broadcasting transaction');

        return this.broadcastTransaction(updatedFlow);
      })
    );
  }

  /**
   * Broadcast transaction
   */
  private broadcastTransaction(flow: TransactionFlow): TaskEither<TransactionError, TransactionFlow> {
    if (!flow.signedTx) {
      return TE.left(this.createError('NO_SIGNED_TX', 'No signed transaction'));
    }

    return pipe(
      this.broadcaster.broadcastTransaction(flow.signedTx),
      TE.chain(txHash => {
        const updatedFlow: TransactionFlow = {
          ...flow,
          status: 'confirming',
          updatedAt: new Date()
        };

        this.flows.set(flow.id, updatedFlow);
        this.addEvent(flow.id, 'confirming', `Transaction broadcast: ${txHash}`);
        
        return this.waitForConfirmation(updatedFlow, txHash);
      }),
      TE.mapLeft(error => {
        this.handleFlowError(flow.id, error);
        return error;
      })
    );
  }

  /**
   * Wait for transaction confirmation
   */
  private waitForConfirmation(
    flow: TransactionFlow,
    txHash: string
  ): TaskEither<TransactionError, TransactionFlow> {
    return pipe(
      this.broadcaster.waitForReceipt(txHash, 1),
      TE.map(receipt => {
        const updatedFlow: TransactionFlow = {
          ...flow,
          receipt,
          status: 'completed',
          updatedAt: new Date()
        };

        this.flows.set(flow.id, updatedFlow);
        this.addEvent(flow.id, 'completed', 'Transaction confirmed');
        this.emit('flow:completed', { flowId: flow.id, receipt });
        this.updateStatistics('completed', flow.request.type, receipt);

        return updatedFlow;
      }),
      TE.mapLeft(error => {
        this.handleFlowError(flow.id, error);
        return error;
      })
    );
  }

  /**
   * Get flow by ID
   */
  private getFlow(flowId: string): TaskEither<TransactionError, TransactionFlow> {
    const flow = this.flows.get(flowId);
    
    if (!flow) {
      return this.store.load(flowId);
    }

    return TE.right(flow);
  }

  /**
   * Update flow status
   */
  private updateFlowStatus(flowId: string, status: TransactionStatus): void {
    const flow = this.flows.get(flowId);
    if (flow) {
      flow.status = status;
      flow.updatedAt = new Date();
      this.emit('flow:status:changed', { flowId, status });
    }
  }

  /**
   * Add event to flow history
   */
  private addEvent(flowId: string, status: TransactionStatus, message: string, details?: any): void {
    const flow = this.flows.get(flowId);
    if (flow) {
      flow.history.push({
        timestamp: new Date(),
        status,
        message,
        details
      });
    }
  }

  /**
   * Handle flow error
   */
  private handleFlowError(flowId: string, error: TransactionError): void {
    const flow = this.flows.get(flowId);
    if (flow) {
      flow.status = 'failed';
      flow.error = error;
      flow.updatedAt = new Date();
      this.addEvent(flowId, 'failed', error.message, error.details);
      this.emit('flow:failed', { flowId, error });
      this.updateStatistics('failed', flow.request.type);
    }
  }

  /**
   * Persist flow to storage
   */
  private persistFlow(flow: TransactionFlow): TaskEither<TransactionError, TransactionFlow> {
    return pipe(
      this.store.save(flow),
      TE.map(() => flow)
    );
  }

  /**
   * Calculate estimated transaction cost
   */
  private calculateEstimatedCost(tx: PreparedTransaction): string {
    const gasLimit = BigInt(tx.gas);
    const gasPrice = BigInt(tx.gasPrice || tx.maxFeePerGas || '0');
    const estimatedCost = gasLimit * gasPrice;
    
    // Convert to ETH/SEI (assuming 18 decimals)
    const costInEth = Number(estimatedCost) / 1e18;
    return costInEth.toFixed(6);
  }

  /**
   * Create error object
   */
  private createError(code: string, message: string, details?: any): TransactionError {
    return {
      code,
      message,
      details,
      recoverable: ['TIMEOUT', 'NETWORK_ERROR', 'NONCE_TOO_LOW'].includes(code)
    };
  }

  /**
   * Update statistics
   */
  private updateStatistics(event: string, type?: string, receipt?: TransactionReceipt): void {
    this.statistics.totalTransactions++;
    
    if (type && this.statistics.transactionsByType[type as any] !== undefined) {
      this.statistics.transactionsByType[type as any]++;
    }

    switch (event) {
      case 'completed':
        this.statistics.successfulTransactions++;
        if (receipt) {
          const gasUsed = receipt.gasUsed;
          const totalGas = this.statistics.averageGasUsed * BigInt(this.statistics.successfulTransactions - 1) + gasUsed;
          this.statistics.averageGasUsed = totalGas / BigInt(this.statistics.successfulTransactions);
          this.statistics.totalGasSpent += gasUsed * receipt.effectiveGasPrice;
        }
        break;
      case 'failed':
        this.statistics.failedTransactions++;
        break;
      case 'preparing':
        this.statistics.pendingTransactions++;
        break;
    }

    this.emit('statistics:updated', this.statistics);
  }

  /**
   * Handle status change events
   */
  private handleStatusChange(event: any): void {
    const { flowId, status } = event;
    
    // Update pending count
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      this.statistics.pendingTransactions = Math.max(0, this.statistics.pendingTransactions - 1);
    }
  }

  /**
   * Handle flow completion
   */
  private handleFlowCompleted(event: any): void {
    const { flowId } = event;
    const flow = this.flows.get(flowId);
    
    if (flow) {
      // Calculate confirmation time
      const confirmationTime = flow.updatedAt.getTime() - flow.createdAt.getTime();
      const avgTime = this.statistics.averageConfirmationTime;
      const count = this.statistics.successfulTransactions;
      
      this.statistics.averageConfirmationTime = (avgTime * (count - 1) + confirmationTime) / count;
      
      // Clean up completed flows after some time
      setTimeout(() => {
        this.flows.delete(flowId);
      }, 300000); // 5 minutes
    }
  }

  /**
   * Handle flow failure
   */
  private handleFlowFailed(event: any): void {
    const { flowId, error } = event;
    
    // Log error for monitoring
    console.error(`Transaction flow ${flowId} failed:`, error);
    
    // Attempt recovery if possible
    if (error.recoverable) {
      setTimeout(() => {
        this.retryTransaction(flowId);
      }, this.config.retryDelay);
    }
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    if (this.config.enableBatching) {
      setInterval(() => {
        this.processQueue();
      }, this.config.batchTimeout);
    }
  }

  /**
   * Process queued transactions
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.queue.getQueueSize() === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      const batch = [];
      const batchSize = Math.min(this.config.batchSize, this.queue.getQueueSize());

      for (let i = 0; i < batchSize; i++) {
        const result = await this.queue.dequeue()();
        if (result._tag === 'Right' && result.right) {
          batch.push(result.right);
        }
      }

      // Process batch
      for (const request of batch) {
        await this.createFlow(request)();
      }
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Shutdown manager
   */
  public async shutdown(): Promise<void> {
    // Save all pending flows
    for (const [id, flow] of this.flows) {
      await this.store.save(flow)();
    }

    this.removeAllListeners();
  }
}