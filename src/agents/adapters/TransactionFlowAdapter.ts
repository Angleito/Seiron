import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { EventEmitter } from 'events';
import {
  TransactionFlowManager,
  TransactionRequest,
  TransactionFlow,
  TransactionType,
  TransactionMetadata,
  TransactionConfirmationRequest,
  TransactionConfirmationResponse,
  WalletInterface
} from '../../transaction';

/**
 * TransactionFlowAdapter - Adapts agent actions to transaction flows
 * 
 * This adapter bridges the gap between agents and the transaction flow system.
 * It handles:
 * - Converting agent actions to transaction requests
 * - Managing confirmation flows
 * - Handling transaction results
 * - Providing feedback to agents
 * 
 * Usage:
 * - Agents use this adapter instead of direct contract calls
 * - The adapter ensures all transactions go through proper flow
 * - No private keys are used by agents
 */
export class TransactionFlowAdapter extends EventEmitter {
  private flowManager: TransactionFlowManager;
  private pendingConfirmations: Map<string, (response: TransactionConfirmationResponse) => void> = new Map();

  constructor(flowManager: TransactionFlowManager) {
    super();
    this.flowManager = flowManager;
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for transaction flow events
   */
  private setupEventHandlers(): void {
    this.flowManager.on('confirmation:needed', this.handleConfirmationNeeded.bind(this));
    this.flowManager.on('flow:completed', this.handleFlowCompleted.bind(this));
    this.flowManager.on('flow:failed', this.handleFlowFailed.bind(this));
  }

  /**
   * Execute a lending supply action
   */
  public supplyAsset(params: {
    protocol: string;
    asset: string;
    amount: bigint;
    from: string;
    agent?: string;
    userId?: string;
  }): TaskEither<Error, TransactionFlow> {
    const request: TransactionRequest = {
      id: this.generateId(),
      type: 'lending_supply',
      protocol: params.protocol,
      action: 'supply',
      params: {
        asset: params.asset,
        amount: params.amount,
        referralCode: 0
      },
      chainId: 1329, // Sei mainnet
      from: params.from,
      metadata: this.createMetadata({
        description: `Supply ${this.formatAmount(params.amount)} to ${params.protocol}`,
        agent: params.agent,
        userId: params.userId,
        priority: 'medium',
        requiresConfirmation: true,
        riskLevel: 'low'
      })
    };

    return this.executeTransaction(request);
  }

  /**
   * Execute a lending withdraw action
   */
  public withdrawAsset(params: {
    protocol: string;
    asset: string;
    amount: bigint;
    from: string;
    agent?: string;
    userId?: string;
  }): TaskEither<Error, TransactionFlow> {
    const request: TransactionRequest = {
      id: this.generateId(),
      type: 'lending_withdraw',
      protocol: params.protocol,
      action: 'withdraw',
      params: {
        asset: params.asset,
        amount: params.amount
      },
      chainId: 1329,
      from: params.from,
      metadata: this.createMetadata({
        description: `Withdraw ${this.formatAmount(params.amount)} from ${params.protocol}`,
        agent: params.agent,
        userId: params.userId,
        priority: 'medium',
        requiresConfirmation: true,
        riskLevel: 'low'
      })
    };

    return this.executeTransaction(request);
  }

  /**
   * Execute a lending borrow action
   */
  public borrowAsset(params: {
    protocol: string;
    asset: string;
    amount: bigint;
    interestRateMode?: 'stable' | 'variable';
    from: string;
    agent?: string;
    userId?: string;
  }): TaskEither<Error, TransactionFlow> {
    const request: TransactionRequest = {
      id: this.generateId(),
      type: 'lending_borrow',
      protocol: params.protocol,
      action: 'borrow',
      params: {
        asset: params.asset,
        amount: params.amount,
        interestRateMode: params.interestRateMode === 'stable' ? 1 : 2,
        referralCode: 0
      },
      chainId: 1329,
      from: params.from,
      metadata: this.createMetadata({
        description: `Borrow ${this.formatAmount(params.amount)} from ${params.protocol}`,
        agent: params.agent,
        userId: params.userId,
        priority: 'high',
        requiresConfirmation: true,
        riskLevel: 'medium',
        confirmationMessage: 'This will create a debt position. Ensure you understand the risks.'
      })
    };

    return this.executeTransaction(request);
  }

  /**
   * Execute a swap action
   */
  public swap(params: {
    protocol: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: bigint;
    amountOutMin: bigint;
    path?: string[];
    from: string;
    agent?: string;
    userId?: string;
  }): TaskEither<Error, TransactionFlow> {
    const request: TransactionRequest = {
      id: this.generateId(),
      type: 'swap',
      protocol: params.protocol,
      action: 'swap',
      params: {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        amountOutMin: params.amountOutMin,
        path: params.path,
        deadline: Math.floor(Date.now() / 1000) + 1800 // 30 minutes
      },
      chainId: 1329,
      from: params.from,
      metadata: this.createMetadata({
        description: `Swap tokens on ${params.protocol}`,
        agent: params.agent,
        userId: params.userId,
        priority: 'medium',
        requiresConfirmation: true,
        riskLevel: 'medium'
      })
    };

    return this.executeTransaction(request);
  }

  /**
   * Execute multiple transactions as a batch
   */
  public batchTransactions(params: {
    protocol: string;
    transactions: Array<{
      type: TransactionType;
      params: any;
    }>;
    from: string;
    agent?: string;
    userId?: string;
  }): TaskEither<Error, TransactionFlow> {
    const request: TransactionRequest = {
      id: this.generateId(),
      type: 'batch',
      protocol: params.protocol,
      action: 'multicall',
      params: {
        calls: params.transactions
      },
      chainId: 1329,
      from: params.from,
      metadata: this.createMetadata({
        description: `Execute ${params.transactions.length} transactions in batch`,
        agent: params.agent,
        userId: params.userId,
        priority: 'high',
        requiresConfirmation: true,
        riskLevel: 'high',
        confirmationMessage: 'This will execute multiple transactions. Review carefully.'
      })
    };

    return this.executeTransaction(request);
  }

  /**
   * Set wallet for transaction signing
   */
  public setWallet(wallet: WalletInterface): void {
    this.flowManager.setWallet(wallet);
  }

  /**
   * Handle user confirmation
   */
  public confirmTransaction(flowId: string, approved: boolean, signedTx?: any): void {
    const handler = this.pendingConfirmations.get(flowId);
    
    if (handler) {
      const response: TransactionConfirmationResponse = {
        approved,
        signedTransaction: signedTx,
        rejectionReason: approved ? undefined : 'User rejected transaction',
        timestamp: new Date()
      };
      
      handler(response);
      this.pendingConfirmations.delete(flowId);
    }
  }

  /**
   * Get pending confirmations
   */
  public getPendingConfirmations(): TransactionConfirmationRequest[] {
    // This would be implemented to return actual pending confirmations
    return [];
  }

  /**
   * Execute transaction through flow manager
   */
  private executeTransaction(request: TransactionRequest): TaskEither<Error, TransactionFlow> {
    return pipe(
      this.flowManager.createFlow(request),
      TE.mapLeft(error => new Error(error.message))
    );
  }

  /**
   * Handle confirmation needed event
   */
  private handleConfirmationNeeded(event: { flowId: string }): void {
    pipe(
      this.flowManager.requestConfirmation(event.flowId),
      TE.map(confirmationRequest => {
        // Emit event for UI to handle
        this.emit('confirmation:required', confirmationRequest);
        
        // Store handler for when confirmation comes back
        this.pendingConfirmations.set(event.flowId, (response) => {
          this.flowManager.handleConfirmation(event.flowId, response);
        });
      })
    )();
  }

  /**
   * Handle flow completed event
   */
  private handleFlowCompleted(event: { flowId: string; receipt: any }): void {
    this.emit('transaction:completed', event);
  }

  /**
   * Handle flow failed event
   */
  private handleFlowFailed(event: { flowId: string; error: any }): void {
    this.emit('transaction:failed', event);
  }

  /**
   * Create transaction metadata
   */
  private createMetadata(params: Partial<TransactionMetadata>): TransactionMetadata {
    return {
      description: params.description || 'Transaction',
      agent: params.agent,
      userId: params.userId,
      priority: params.priority || 'medium',
      requiresConfirmation: params.requiresConfirmation ?? true,
      confirmationMessage: params.confirmationMessage,
      riskLevel: params.riskLevel || 'medium',
      estimatedValue: params.estimatedValue,
      affectedPositions: params.affectedPositions,
      tags: params.tags
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format amount for display
   */
  private formatAmount(amount: bigint): string {
    // Simplified - would use proper decimals in production
    return (Number(amount) / 1e18).toFixed(4);
  }
}