import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { v4 as uuidv4 } from 'uuid';
import { SocketService } from './SocketService';
import logger from '../utils/logger';

/**
 * Transaction to be confirmed
 */
export interface PendingTransaction {
  readonly id: string;
  readonly walletAddress: string;
  readonly type: 'lending' | 'liquidity' | 'swap' | 'batch';
  readonly action: string;
  readonly parameters: any;
  readonly risks: TransactionRisk[];
  readonly summary: TransactionSummary;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly status: 'pending' | 'confirmed' | 'rejected' | 'expired';
}

/**
 * Transaction risk
 */
export interface TransactionRisk {
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly type: string;
  readonly message: string;
  readonly impact?: string;
  readonly mitigation?: string;
}

/**
 * Transaction summary
 */
export interface TransactionSummary {
  readonly action: string;
  readonly amount?: string;
  readonly token?: string;
  readonly protocol: string;
  readonly estimatedGas?: number;
  readonly estimatedCost?: string;
  readonly expectedOutcome: string;
  readonly risks: string[];
}

/**
 * Confirmation result
 */
export interface ConfirmationResult {
  readonly transactionId: string;
  readonly confirmed: boolean;
  readonly timestamp: number;
  readonly reason?: string;
}

/**
 * Confirmation Service
 * Manages transaction confirmations without requiring private keys
 */
export class ConfirmationService {
  private readonly pendingTransactions: Map<string, PendingTransaction> = new Map();
  private readonly confirmationTimeout: number = 300000; // 5 minutes
  private readonly socketService?: SocketService;

  constructor(socketService?: SocketService) {
    this.socketService = socketService;
    
    // Start cleanup interval
    setInterval(() => this.cleanupExpiredTransactions(), 60000); // Every minute
  }

  /**
   * Create a pending transaction that requires confirmation
   */
  public createPendingTransaction = (
    walletAddress: string,
    type: PendingTransaction['type'],
    action: string,
    parameters: any
  ): TE.TaskEither<Error, PendingTransaction> =>
    pipe(
      TE.tryCatch(
        async () => {
          const transactionId = uuidv4();
          const risks = await this.analyzeTransactionRisks(type, action, parameters);
          const summary = await this.generateTransactionSummary(type, action, parameters, risks);

          const pendingTransaction: PendingTransaction = {
            id: transactionId,
            walletAddress,
            type,
            action,
            parameters,
            risks,
            summary,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.confirmationTimeout,
            status: 'pending'
          };

          this.pendingTransactions.set(transactionId, pendingTransaction);

          // Send confirmation request via WebSocket
          if (this.socketService) {
            await this.socketService.sendPortfolioUpdate(walletAddress, {
              type: 'confirmation_required',
              data: {
                transactionId,
                transaction: pendingTransaction
              },
              timestamp: new Date().toISOString()
            })();
          }

          logger.info(`Created pending transaction ${transactionId} for ${walletAddress}`);
          return pendingTransaction;
        },
        (error) => new Error(`Failed to create pending transaction: ${error}`)
      )
    );

  /**
   * Confirm a pending transaction
   */
  public confirmTransaction = (
    transactionId: string,
    walletAddress: string
  ): TE.TaskEither<Error, ConfirmationResult> =>
    pipe(
      this.getPendingTransaction(transactionId),
      TE.chain(transaction => {
        if (transaction.walletAddress !== walletAddress) {
          return TE.left(new Error('Unauthorized: wallet address mismatch'));
        }

        if (transaction.status !== 'pending') {
          return TE.left(new Error(`Transaction is already ${transaction.status}`));
        }

        if (Date.now() > transaction.expiresAt) {
          return TE.left(new Error('Transaction has expired'));
        }

        return TE.right(transaction);
      }),
      TE.chain(transaction => {
        const updatedTransaction: PendingTransaction = {
          ...transaction,
          status: 'confirmed'
        };

        this.pendingTransactions.set(transactionId, updatedTransaction);

        const result: ConfirmationResult = {
          transactionId,
          confirmed: true,
          timestamp: Date.now()
        };

        // Notify via WebSocket
        if (this.socketService) {
          this.socketService.sendPortfolioUpdate(walletAddress, {
            type: 'transaction_confirmed',
            data: result,
            timestamp: new Date().toISOString()
          })();
        }

        logger.info(`Transaction ${transactionId} confirmed by ${walletAddress}`);
        return TE.right(result);
      })
    );

  /**
   * Reject a pending transaction
   */
  public rejectTransaction = (
    transactionId: string,
    walletAddress: string,
    reason?: string
  ): TE.TaskEither<Error, ConfirmationResult> =>
    pipe(
      this.getPendingTransaction(transactionId),
      TE.chain(transaction => {
        if (transaction.walletAddress !== walletAddress) {
          return TE.left(new Error('Unauthorized: wallet address mismatch'));
        }

        if (transaction.status !== 'pending') {
          return TE.left(new Error(`Transaction is already ${transaction.status}`));
        }

        return TE.right(transaction);
      }),
      TE.chain(transaction => {
        const updatedTransaction: PendingTransaction = {
          ...transaction,
          status: 'rejected'
        };

        this.pendingTransactions.set(transactionId, updatedTransaction);

        const result: ConfirmationResult = {
          transactionId,
          confirmed: false,
          timestamp: Date.now(),
          reason
        };

        // Notify via WebSocket
        if (this.socketService) {
          this.socketService.sendPortfolioUpdate(walletAddress, {
            type: 'transaction_rejected',
            data: result,
            timestamp: new Date().toISOString()
          })();
        }

        logger.info(`Transaction ${transactionId} rejected by ${walletAddress}: ${reason || 'No reason provided'}`);
        return TE.right(result);
      })
    );

  /**
   * Get a pending transaction
   */
  public getPendingTransaction = (
    transactionId: string
  ): TE.TaskEither<Error, PendingTransaction> =>
    TE.tryCatch(
      async () => {
        const transaction = this.pendingTransactions.get(transactionId);
        if (!transaction) {
          throw new Error('Transaction not found');
        }
        return transaction;
      },
      (error) => new Error(`Failed to get pending transaction: ${error}`)
    );

  /**
   * Get all pending transactions for a wallet
   */
  public getPendingTransactionsForWallet = (
    walletAddress: string
  ): TE.TaskEither<Error, PendingTransaction[]> =>
    TE.tryCatch(
      async () => {
        const transactions: PendingTransaction[] = [];
        
        for (const transaction of this.pendingTransactions.values()) {
          if (transaction.walletAddress === walletAddress && transaction.status === 'pending') {
            transactions.push(transaction);
          }
        }

        return transactions.sort((a, b) => b.createdAt - a.createdAt);
      },
      (error) => new Error(`Failed to get pending transactions: ${error}`)
    );

  /**
   * Check if transaction is confirmed
   */
  public isTransactionConfirmed = (
    transactionId: string
  ): TE.TaskEither<Error, boolean> =>
    pipe(
      this.getPendingTransaction(transactionId),
      TE.map(transaction => transaction.status === 'confirmed')
    );

  /**
   * Clean up expired transactions
   */
  private cleanupExpiredTransactions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [transactionId, transaction] of this.pendingTransactions.entries()) {
      if (transaction.status === 'pending' && now > transaction.expiresAt) {
        const updatedTransaction: PendingTransaction = {
          ...transaction,
          status: 'expired'
        };
        
        this.pendingTransactions.set(transactionId, updatedTransaction);
        
        // Notify via WebSocket
        if (this.socketService) {
          this.socketService.sendPortfolioUpdate(transaction.walletAddress, {
            type: 'transaction_expired',
            data: { transactionId },
            timestamp: new Date().toISOString()
          })();
        }
        
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Marked ${cleanedCount} transactions as expired`);
    }
  }

  /**
   * Analyze transaction risks
   */
  private async analyzeTransactionRisks(
    type: PendingTransaction['type'],
    action: string,
    parameters: any
  ): Promise<TransactionRisk[]> {
    const risks: TransactionRisk[] = [];

    // Amount-based risks
    const amount = parseFloat(parameters.amount || '0');
    if (amount > 100000) {
      risks.push({
        severity: 'high',
        type: 'large_amount',
        message: 'Very large transaction amount',
        impact: 'High financial exposure',
        mitigation: 'Consider splitting into smaller transactions'
      });
    } else if (amount > 10000) {
      risks.push({
        severity: 'medium',
        type: 'medium_amount',
        message: 'Significant transaction amount',
        impact: 'Notable financial exposure'
      });
    }

    // Leverage-based risks
    if (parameters.leverage && parameters.leverage > 5) {
      risks.push({
        severity: 'critical',
        type: 'high_leverage',
        message: 'Very high leverage ratio',
        impact: 'High liquidation risk',
        mitigation: 'Use lower leverage or add more collateral'
      });
    } else if (parameters.leverage && parameters.leverage > 2) {
      risks.push({
        severity: 'high',
        type: 'medium_leverage',
        message: 'High leverage ratio',
        impact: 'Increased liquidation risk',
        mitigation: 'Monitor position closely'
      });
    }

    // Type-specific risks
    if (type === 'liquidity' && action === 'removeLiquidity') {
      risks.push({
        severity: 'low',
        type: 'impermanent_loss',
        message: 'Potential impermanent loss',
        impact: 'May receive less value than initially deposited'
      });
    }

    if (type === 'lending' && action === 'borrow') {
      risks.push({
        severity: 'medium',
        type: 'interest_rate',
        message: 'Variable interest rate',
        impact: 'Borrowing costs may increase over time'
      });
    }

    return risks;
  }

  /**
   * Generate transaction summary
   */
  private async generateTransactionSummary(
    type: PendingTransaction['type'],
    action: string,
    parameters: any,
    risks: TransactionRisk[]
  ): Promise<TransactionSummary> {
    let actionDescription = '';
    let expectedOutcome = '';

    switch (type) {
      case 'lending':
        if (action === 'supply') {
          actionDescription = `Supply ${parameters.amount} ${parameters.asset} for lending`;
          expectedOutcome = `Start earning interest on your ${parameters.asset}`;
        } else if (action === 'borrow') {
          actionDescription = `Borrow ${parameters.amount} ${parameters.asset}`;
          expectedOutcome = `Receive ${parameters.amount} ${parameters.asset} in your wallet`;
        } else if (action === 'withdraw') {
          actionDescription = `Withdraw ${parameters.amount} ${parameters.asset} from lending`;
          expectedOutcome = `Receive ${parameters.amount} ${parameters.asset} back to your wallet`;
        } else if (action === 'repay') {
          actionDescription = `Repay ${parameters.amount} ${parameters.asset} loan`;
          expectedOutcome = `Reduce your borrow position by ${parameters.amount} ${parameters.asset}`;
        }
        break;

      case 'liquidity':
        if (action === 'addLiquidity') {
          actionDescription = `Add liquidity to ${parameters.token0}/${parameters.token1} pool`;
          expectedOutcome = 'Receive LP tokens and start earning fees';
        } else if (action === 'removeLiquidity') {
          actionDescription = `Remove liquidity from position ${parameters.positionId}`;
          expectedOutcome = 'Receive underlying tokens back to your wallet';
        } else if (action === 'collectFees') {
          actionDescription = `Collect fees from position ${parameters.positionId}`;
          expectedOutcome = 'Receive accumulated trading fees';
        }
        break;

      case 'swap':
        actionDescription = `Swap ${parameters.amountIn} ${parameters.tokenIn} to ${parameters.tokenOut}`;
        expectedOutcome = `Receive approximately ${parameters.estimatedAmountOut || 'calculated'} ${parameters.tokenOut}`;
        break;

      default:
        actionDescription = `Execute ${action} operation`;
        expectedOutcome = 'Operation will be executed as specified';
    }

    return {
      action: actionDescription,
      amount: parameters.amount,
      token: parameters.asset || parameters.token || parameters.tokenIn,
      protocol: parameters.protocol || 'Seiron',
      estimatedGas: parameters.estimatedGas || 500000,
      estimatedCost: '$2.50', // Mock - would calculate based on gas price // TODO: REMOVE_MOCK - Hard-coded currency values // TODO: REMOVE_MOCK - Mock-related keywords
      expectedOutcome,
      risks: risks.map(r => r.message)
    };
  }

  /**
   * Format transaction for display
   */
  public formatTransactionForDisplay(transaction: PendingTransaction): string {
    const lines: string[] = [
      `🔍 **Transaction Confirmation Required**`,
      '',
      `**Transaction ID:** ${transaction.id}`,
      '',
      `**Summary:**`,
      `Action: ${transaction.summary.action}`,
      `Protocol: ${transaction.summary.protocol}`,
      `Estimated Gas: ${transaction.summary.estimatedGas}`,
      `Estimated Cost: ${transaction.summary.estimatedCost}`,
      '',
      `**Expected Outcome:**`,
      transaction.summary.expectedOutcome
    ];

    // Add risk warnings if present
    if (transaction.risks.length > 0) {
      lines.push('', '⚠️ **Risk Warnings:**');
      transaction.risks.forEach(risk => {
        const icon = this.getRiskIcon(risk.severity);
        lines.push(`${icon} ${risk.message}`);
        if (risk.mitigation) {
          lines.push(`   💡 ${risk.mitigation}`);
        }
      });
    }

    const timeRemaining = Math.max(0, transaction.expiresAt - Date.now());
    lines.push('', `⏱️ Expires in ${Math.floor(timeRemaining / 1000)} seconds`);

    return lines.join('\n');
  }

  private getRiskIcon(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '•';
    }
  }
}