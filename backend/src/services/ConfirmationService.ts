import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { v4 as uuidv4 } from 'uuid';
import { SocketService } from './SocketService';
import logger from '../utils/logger';
import { createServiceLogger } from './LoggingService';

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
  private readonly serviceLogger = createServiceLogger('ConfirmationService');

  constructor(socketService?: SocketService) {
    this.serviceLogger.info('Initializing ConfirmationService', {
      hasSocketService: !!socketService,
      confirmationTimeout: this.confirmationTimeout
    });
    
    this.socketService = socketService;
    
    // Start cleanup interval
    setInterval(() => this.cleanupExpiredTransactions(), 60000); // Every minute
    
    this.serviceLogger.info('ConfirmationService initialization completed');
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
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Creating pending transaction', {
          walletAddress,
          type,
          action,
          amount: parameters.amount,
          method: 'createPendingTransaction'
        });
        this.serviceLogger.startTimer('createPendingTransaction');
      })),
      TE.chain(() => TE.tryCatch(
        async () => {
          const transactionId = uuidv4();
          
          this.serviceLogger.debug('Analyzing transaction risks', {
            transactionId,
            type,
            action
          });
          
          const risks = await this.analyzeTransactionRisks(type, action, parameters);
          
          this.serviceLogger.debug('Generating transaction summary', {
            transactionId,
            riskCount: risks.length,
            highRiskCount: risks.filter(r => r.severity === 'high' || r.severity === 'critical').length
          });
          
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
          
          this.serviceLogger.info('Pending transaction created', {
            transactionId,
            walletAddress,
            type,
            action,
            riskCount: risks.length,
            estimatedGas: summary.estimatedGas,
            expiresInMinutes: this.confirmationTimeout / 60000
          });

          // Send confirmation request via WebSocket
          if (this.socketService) {
            this.serviceLogger.debug('Sending confirmation request via WebSocket', {
              transactionId,
              walletAddress
            });
            
            await this.socketService.sendPortfolioUpdate(walletAddress, {
              type: 'confirmation_required',
              data: {
                transactionId,
                transaction: pendingTransaction
              },
              timestamp: new Date().toISOString()
            })();
            
            this.serviceLogger.debug('Confirmation request sent successfully', {
              transactionId,
              walletAddress
            });
          } else {
            this.serviceLogger.warn('Socket service not available for confirmation request', {
              transactionId,
              walletAddress
            });
          }

          this.serviceLogger.endTimer('createPendingTransaction', {
            transactionId,
            walletAddress
          });
          
          return pendingTransaction;
        },
        (error) => {
          this.serviceLogger.error('Failed to create pending transaction', {
            walletAddress,
            type,
            action
          }, error as Error);
          return new Error(`Failed to create pending transaction: ${error}`);
        }
      ))
    );

  /**
   * Confirm a pending transaction
   */
  public confirmTransaction = (
    transactionId: string,
    walletAddress: string
  ): TE.TaskEither<Error, ConfirmationResult> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Confirming transaction', {
          transactionId,
          walletAddress,
          method: 'confirmTransaction'
        });
        this.serviceLogger.startTimer('confirmTransaction');
      })),
      TE.chain(() => this.serviceLogger.logTaskEither(
        this.getPendingTransaction(transactionId),
        'confirmTransaction.getTransaction',
        { transactionId, walletAddress }
      )),
      TE.chain(transaction => {
        this.serviceLogger.debug('Validating transaction confirmation', {
          transactionId,
          currentStatus: transaction.status,
          walletMatch: transaction.walletAddress === walletAddress,
          expired: Date.now() > transaction.expiresAt,
          timeRemaining: transaction.expiresAt - Date.now()
        });
        
        if (transaction.walletAddress !== walletAddress) {
          const error = new Error('Unauthorized: wallet address mismatch');
          this.serviceLogger.error('Wallet address mismatch for transaction confirmation', {
            transactionId,
            expectedWallet: transaction.walletAddress,
            providedWallet: walletAddress
          }, error);
          return TE.left(error);
        }

        if (transaction.status !== 'pending') {
          const error = new Error(`Transaction is already ${transaction.status}`);
          this.serviceLogger.warn('Attempted to confirm non-pending transaction', {
            transactionId,
            currentStatus: transaction.status,
            walletAddress
          });
          return TE.left(error);
        }

        if (Date.now() > transaction.expiresAt) {
          const error = new Error('Transaction has expired');
          this.serviceLogger.warn('Attempted to confirm expired transaction', {
            transactionId,
            walletAddress,
            expiresAt: new Date(transaction.expiresAt),
            expiredBy: Date.now() - transaction.expiresAt
          });
          return TE.left(error);
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
        
        this.serviceLogger.info('Transaction confirmed successfully', {
          transactionId,
          walletAddress,
          type: transaction.type,
          action: transaction.action,
          amount: transaction.parameters.amount,
          confirmationDelay: Date.now() - transaction.createdAt
        });

        // Notify via WebSocket
        if (this.socketService) {
          this.serviceLogger.debug('Sending confirmation notification', {
            transactionId,
            walletAddress
          });
          
          this.socketService.sendPortfolioUpdate(walletAddress, {
            type: 'transaction_confirmed',
            data: result,
            timestamp: new Date().toISOString()
          })();
        }

        this.serviceLogger.endTimer('confirmTransaction', {
          transactionId,
          walletAddress
        });
        
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
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Rejecting transaction', {
          transactionId,
          walletAddress,
          reason,
          method: 'rejectTransaction'
        });
        this.serviceLogger.startTimer('rejectTransaction');
      })),
      TE.chain(() => this.serviceLogger.logTaskEither(
        this.getPendingTransaction(transactionId),
        'rejectTransaction.getTransaction',
        { transactionId, walletAddress }
      )),
      TE.chain(transaction => {
        this.serviceLogger.debug('Validating transaction rejection', {
          transactionId,
          currentStatus: transaction.status,
          walletMatch: transaction.walletAddress === walletAddress
        });
        
        if (transaction.walletAddress !== walletAddress) {
          const error = new Error('Unauthorized: wallet address mismatch');
          this.serviceLogger.error('Wallet address mismatch for transaction rejection', {
            transactionId,
            expectedWallet: transaction.walletAddress,
            providedWallet: walletAddress
          }, error);
          return TE.left(error);
        }

        if (transaction.status !== 'pending') {
          const error = new Error(`Transaction is already ${transaction.status}`);
          this.serviceLogger.warn('Attempted to reject non-pending transaction', {
            transactionId,
            currentStatus: transaction.status,
            walletAddress
          });
          return TE.left(error);
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
        
        this.serviceLogger.info('Transaction rejected successfully', {
          transactionId,
          walletAddress,
          type: transaction.type,
          action: transaction.action,
          amount: transaction.parameters.amount,
          reason: reason || 'No reason provided',
          rejectionDelay: Date.now() - transaction.createdAt
        });

        // Notify via WebSocket
        if (this.socketService) {
          this.serviceLogger.debug('Sending rejection notification', {
            transactionId,
            walletAddress,
            reason
          });
          
          this.socketService.sendPortfolioUpdate(walletAddress, {
            type: 'transaction_rejected',
            data: result,
            timestamp: new Date().toISOString()
          })();
        }

        this.serviceLogger.endTimer('rejectTransaction', {
          transactionId,
          walletAddress
        });
        
        return TE.right(result);
      })
    );

  /**
   * Get a pending transaction
   */
  public getPendingTransaction = (
    transactionId: string
  ): TE.TaskEither<Error, PendingTransaction> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.debug('Getting pending transaction', {
          transactionId,
          method: 'getPendingTransaction'
        });
      })),
      TE.chain(() => TE.tryCatch(
        async () => {
          const transaction = this.pendingTransactions.get(transactionId);
          if (!transaction) {
            const error = new Error('Transaction not found');
            this.serviceLogger.warn('Transaction not found', {
              transactionId,
              totalPendingTransactions: this.pendingTransactions.size
            });
            throw error;
          }
          
          this.serviceLogger.debug('Transaction found', {
            transactionId,
            status: transaction.status,
            type: transaction.type,
            walletAddress: transaction.walletAddress,
            timeRemaining: transaction.expiresAt - Date.now()
          });
          
          return transaction;
        },
        (error) => {
          this.serviceLogger.error('Failed to get pending transaction', { transactionId }, error as Error);
          return new Error(`Failed to get pending transaction: ${error}`);
        }
      ))
    );

  /**
   * Get all pending transactions for a wallet
   */
  public getPendingTransactionsForWallet = (
    walletAddress: string
  ): TE.TaskEither<Error, PendingTransaction[]> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Getting pending transactions for wallet', {
          walletAddress,
          method: 'getPendingTransactionsForWallet'
        });
        this.serviceLogger.startTimer('getPendingTransactionsForWallet');
      })),
      TE.chain(() => TE.tryCatch(
        async () => {
          const transactions: PendingTransaction[] = [];
          const allTransactions = Array.from(this.pendingTransactions.values());
          
          this.serviceLogger.debug('Filtering pending transactions', {
            walletAddress,
            totalTransactions: allTransactions.length
          });
          
          for (const transaction of allTransactions) {
            if (transaction.walletAddress === walletAddress && transaction.status === 'pending') {
              transactions.push(transaction);
            }
          }

          const sortedTransactions = transactions.sort((a, b) => b.createdAt - a.createdAt);
          
          this.serviceLogger.endTimer('getPendingTransactionsForWallet', {
            walletAddress,
            transactionCount: sortedTransactions.length
          });
          
          this.serviceLogger.info('Pending transactions retrieved', {
            walletAddress,
            pendingCount: sortedTransactions.length,
            transactionIds: sortedTransactions.map(t => t.id)
          });
          
          return sortedTransactions;
        },
        (error) => {
          this.serviceLogger.error('Failed to get pending transactions for wallet', { walletAddress }, error as Error);
          return new Error(`Failed to get pending transactions: ${error}`);
        }
      ))
    );

  /**
   * Check if transaction is confirmed
   */
  public isTransactionConfirmed = (
    transactionId: string
  ): TE.TaskEither<Error, boolean> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.debug('Checking transaction confirmation status', {
          transactionId,
          method: 'isTransactionConfirmed'
        });
      })),
      TE.chain(() => this.getPendingTransaction(transactionId)),
      TE.map(transaction => {
        const isConfirmed = transaction.status === 'confirmed';
        
        this.serviceLogger.debug('Transaction confirmation status checked', {
          transactionId,
          isConfirmed,
          currentStatus: transaction.status,
          walletAddress: transaction.walletAddress
        });
        
        return isConfirmed;
      })
    );

  /**
   * Clean up expired transactions
   */
  private cleanupExpiredTransactions(): void {
    const now = Date.now();
    let cleanedCount = 0;
    const expiredTransactions: string[] = [];
    
    this.serviceLogger.debug('Starting expired transaction cleanup', {
      totalTransactions: this.pendingTransactions.size,
      timestamp: new Date()
    });

    for (const [transactionId, transaction] of this.pendingTransactions.entries()) {
      if (transaction.status === 'pending' && now > transaction.expiresAt) {
        const updatedTransaction: PendingTransaction = {
          ...transaction,
          status: 'expired'
        };
        
        this.pendingTransactions.set(transactionId, updatedTransaction);
        expiredTransactions.push(transactionId);
        
        this.serviceLogger.debug('Transaction expired', {
          transactionId,
          walletAddress: transaction.walletAddress,
          type: transaction.type,
          action: transaction.action,
          createdAt: new Date(transaction.createdAt),
          expiresAt: new Date(transaction.expiresAt),
          expiredBy: now - transaction.expiresAt
        });
        
        // Notify via WebSocket
        if (this.socketService) {
          this.serviceLogger.debug('Sending expiration notification', {
            transactionId,
            walletAddress: transaction.walletAddress
          });
          
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
      this.serviceLogger.info('Expired transaction cleanup completed', {
        expiredCount: cleanedCount,
        expiredTransactionIds: expiredTransactions,
        totalTransactions: this.pendingTransactions.size
      });
    } else {
      this.serviceLogger.debug('No expired transactions found during cleanup', {
        totalTransactions: this.pendingTransactions.size
      });
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
    this.serviceLogger.debug('Analyzing transaction risks', {
      type,
      action,
      amount: parameters.amount,
      leverage: parameters.leverage
    });
    
    const risks: TransactionRisk[] = [];

    // Amount-based risks
    const amount = parseFloat(parameters.amount || '0');
    if (amount > 100000) {
      const risk = {
        severity: 'high' as const,
        type: 'large_amount',
        message: 'Very large transaction amount',
        impact: 'High financial exposure',
        mitigation: 'Consider splitting into smaller transactions'
      };
      risks.push(risk);
      this.serviceLogger.warn('High amount risk detected', {
        amount,
        risk: risk.type,
        severity: risk.severity
      });
    } else if (amount > 10000) {
      const risk = {
        severity: 'medium' as const,
        type: 'medium_amount',
        message: 'Significant transaction amount',
        impact: 'Notable financial exposure'
      };
      risks.push(risk);
      this.serviceLogger.debug('Medium amount risk detected', {
        amount,
        risk: risk.type
      });
    }

    // Leverage-based risks
    if (parameters.leverage && parameters.leverage > 5) {
      const risk = {
        severity: 'critical' as const,
        type: 'high_leverage',
        message: 'Very high leverage ratio',
        impact: 'High liquidation risk',
        mitigation: 'Use lower leverage or add more collateral'
      };
      risks.push(risk);
      this.serviceLogger.warn('Critical leverage risk detected', {
        leverage: parameters.leverage,
        risk: risk.type,
        severity: risk.severity
      });
    } else if (parameters.leverage && parameters.leverage > 2) {
      const risk = {
        severity: 'high' as const,
        type: 'medium_leverage',
        message: 'High leverage ratio',
        impact: 'Increased liquidation risk',
        mitigation: 'Monitor position closely'
      };
      risks.push(risk);
      this.serviceLogger.debug('High leverage risk detected', {
        leverage: parameters.leverage,
        risk: risk.type
      });
    }

    // Type-specific risks
    if (type === 'liquidity' && action === 'removeLiquidity') {
      const risk = {
        severity: 'low' as const,
        type: 'impermanent_loss',
        message: 'Potential impermanent loss',
        impact: 'May receive less value than initially deposited'
      };
      risks.push(risk);
      this.serviceLogger.debug('Liquidity removal risk detected', {
        risk: risk.type
      });
    }

    if (type === 'lending' && action === 'borrow') {
      const risk = {
        severity: 'medium' as const,
        type: 'interest_rate',
        message: 'Variable interest rate',
        impact: 'Borrowing costs may increase over time'
      };
      risks.push(risk);
      this.serviceLogger.debug('Interest rate risk detected', {
        risk: risk.type
      });
    }

    this.serviceLogger.info('Risk analysis completed', {
      type,
      action,
      totalRisks: risks.length,
      risksBySeverity: {
        critical: risks.filter(r => r.severity === 'critical').length,
        high: risks.filter(r => r.severity === 'high').length,
        medium: risks.filter(r => r.severity === 'medium').length,
        low: risks.filter(r => r.severity === 'low').length
      }
    });

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