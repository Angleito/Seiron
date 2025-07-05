/**
 * Portfolio Error Handler - Comprehensive error handling and risk management
 * Provides error classification, recovery strategies, and risk alerts
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { EventEmitter } from 'events';
import {
  WalletAddress,
  PortfolioSnapshot,
  RiskAlert,
  RiskMetrics,
  AsyncResult
} from '../types/portfolio';
import { SocketService } from '../services/SocketService';
import logger from '../utils/logger';

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  STATE_ERROR = 'STATE_ERROR',
  ADAPTER_ERROR = 'ADAPTER_ERROR',
  RISK_ERROR = 'RISK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface PortfolioError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  context: {
    walletAddress?: WalletAddress;
    operation?: string;
    timestamp: string;
    stackTrace?: string;
    metadata?: Record<string, any>;
  };
  recovery?: RecoveryStrategy;
  retryCount?: number;
  maxRetries?: number;
}

export interface RecoveryStrategy {
  strategy: 'retry' | 'fallback' | 'cache' | 'ignore' | 'manual';
  action?: string;
  retryDelay?: number;
  fallbackValue?: any;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: PortfolioError[];
  recoverySuccessRate: number;
}

export interface RiskThresholds {
  healthFactorCritical: number;
  healthFactorWarning: number;
  valueChangeThreshold: number;
  liquidationRiskThreshold: number;
  concentrationRiskThreshold: number;
  impermanentLossThreshold: number;
}

export class PortfolioErrorHandler extends EventEmitter {
  private errors: Map<string, PortfolioError> = new Map();
  private errorStats: Map<WalletAddress, ErrorStats> = new Map();
  private activeAlerts: Map<WalletAddress, RiskAlert[]> = new Map();
  private recoveryStrategies: Map<ErrorType, RecoveryStrategy> = new Map();
  private riskThresholds: RiskThresholds;

  constructor(
    private socketService?: SocketService,
    thresholds?: Partial<RiskThresholds>
  ) {
    super();
    
    this.riskThresholds = {
      healthFactorCritical: 1.2,
      healthFactorWarning: 1.5,
      valueChangeThreshold: 1000, // $1000 // TODO: REMOVE_MOCK - Hard-coded currency values
      liquidationRiskThreshold: 85, // 85%
      concentrationRiskThreshold: 70, // 70%
      impermanentLossThreshold: 10, // 10%
      ...thresholds
    };

    this.setupDefaultRecoveryStrategies();
    this.setupErrorEventHandlers();
  }

  /**
   * Handle an error with automatic classification and recovery
   */
  public handleError = (
    error: Error | PortfolioError,
    context: Partial<PortfolioError['context']> = {}
  ): AsyncResult<any> => {
    const portfolioError = this.classifyError(error, context);
    
    return pipe(
      this.logError(portfolioError),
      TE.chain(() => this.updateErrorStats(portfolioError)),
      TE.chain(() => this.attemptRecovery(portfolioError)),
      TE.chain((recoveryResult) => this.notifyStakeholders(portfolioError, recoveryResult)),
      TE.map((result) => result)
    );
  };

  /**
   * Create and handle a risk alert
   */
  public createRiskAlert = (
    walletAddress: WalletAddress,
    alertType: RiskAlert['type'],
    severity: RiskAlert['severity'],
    message: string,
    metadata?: any
  ): AsyncResult<RiskAlert> => {
    const alert: RiskAlert = {
      id: this.generateId(),
      type: alertType,
      severity,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      metadata
    };

    return pipe(
      this.storeAlert(walletAddress, alert),
      TE.chain(() => this.escalateAlert(walletAddress, alert)),
      TE.map(() => alert)
    );
  };

  /**
   * Monitor portfolio for risk conditions
   */
  public monitorRisks = (
    walletAddress: WalletAddress,
    snapshot: PortfolioSnapshot,
    riskMetrics: RiskMetrics
  ): AsyncResult<RiskAlert[]> => {
    const alerts: RiskAlert[] = [];

    // Health factor monitoring
    if (snapshot.healthFactor < this.riskThresholds.healthFactorCritical) {
      alerts.push({
        id: this.generateId(),
        type: 'liquidation',
        severity: 'critical',
        message: `Critical liquidation risk! Health factor: ${snapshot.healthFactor.toFixed(2)}`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: { healthFactor: snapshot.healthFactor }
      });
    } else if (snapshot.healthFactor < this.riskThresholds.healthFactorWarning) {
      alerts.push({
        id: this.generateId(),
        type: 'health_factor',
        severity: 'warning',
        message: `Low health factor: ${snapshot.healthFactor.toFixed(2)}. Consider reducing leverage.`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: { healthFactor: snapshot.healthFactor }
      });
    }

    // Concentration risk monitoring
    if (riskMetrics.concentrationRisk > this.riskThresholds.concentrationRiskThreshold) {
      alerts.push({
        id: this.generateId(),
        type: 'concentration',
        severity: 'warning',
        message: `High concentration risk: ${riskMetrics.concentrationRisk.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: { concentrationRisk: riskMetrics.concentrationRisk }
      });
    }

    // Impermanent loss monitoring
    if (riskMetrics.impermanentLossRisk > this.riskThresholds.impermanentLossThreshold) {
      alerts.push({
        id: this.generateId(),
        type: 'impermanent_loss',
        severity: 'info',
        message: `High impermanent loss risk: ${riskMetrics.impermanentLossRisk.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: { impermanentLossRisk: riskMetrics.impermanentLossRisk }
      });
    }

    return pipe(
      TE.sequenceArray(alerts.map(alert => this.storeAlert(walletAddress, alert))),
      TE.chain(() => TE.sequenceArray(alerts.map(alert => this.escalateAlert(walletAddress, alert)))),
      TE.map(() => alerts)
    );
  };

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert = (
    walletAddress: WalletAddress,
    alertId: string
  ): AsyncResult<boolean> => {
    return TE.tryCatch(
      async () => {
        const userAlerts = this.activeAlerts.get(walletAddress) || [];
        const alert = userAlerts.find(a => a.id === alertId);
        
        if (alert) {
          alert.acknowledged = true;
          this.activeAlerts.set(walletAddress, userAlerts);
          
          logger.info(`Alert acknowledged: ${alertId} for ${walletAddress}`);
          return true;
        }
        
        return false;
      },
      (error) => new Error(`Failed to acknowledge alert: ${error}`)
    );
  };

  /**
   * Get active alerts for a user
   */
  public getActiveAlerts = (walletAddress: WalletAddress): RiskAlert[] => {
    return this.activeAlerts.get(walletAddress) || [];
  };

  /**
   * Get error statistics
   */
  public getErrorStats = (walletAddress?: WalletAddress): ErrorStats => {
    if (walletAddress) {
      return this.errorStats.get(walletAddress) || this.createEmptyErrorStats();
    }

    // Aggregate stats for all users
    const allStats = Array.from(this.errorStats.values());
    return this.aggregateErrorStats(allStats);
  };

  /**
   * Set custom recovery strategy for error type
   */
  public setRecoveryStrategy = (
    errorType: ErrorType,
    strategy: RecoveryStrategy
  ): void => {
    this.recoveryStrategies.set(errorType, strategy);
    logger.info(`Updated recovery strategy for ${errorType}`);
  };

  /**
   * Clear alerts for a user
   */
  public clearAlerts = (walletAddress: WalletAddress): void => {
    this.activeAlerts.delete(walletAddress);
    logger.info(`Cleared alerts for ${walletAddress}`);
  };

  /**
   * Clear all error data
   */
  public clearErrors = (): void => {
    this.errors.clear();
    this.errorStats.clear();
    this.activeAlerts.clear();
    logger.info('Cleared all error data');
  };

  // ===================== Private Methods =====================

  private classifyError = (
    error: Error | PortfolioError,
    context: Partial<PortfolioError['context']>
  ): PortfolioError => {
    if ('type' in error && 'severity' in error) {
      // Already a PortfolioError
      return error as PortfolioError;
    }

    const originalError = error as Error;
    const errorMessage = originalError.message.toLowerCase();
    
    let type: ErrorType = ErrorType.UNKNOWN_ERROR;
    let severity: ErrorSeverity = ErrorSeverity.MEDIUM;

    // Classify based on error message patterns
    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
      type = ErrorType.NETWORK_ERROR;
      severity = ErrorSeverity.HIGH;
    } else if (errorMessage.includes('rpc') || errorMessage.includes('provider')) {
      type = ErrorType.RPC_ERROR;
      severity = ErrorSeverity.HIGH;
    } else if (errorMessage.includes('contract') || errorMessage.includes('revert')) {
      type = ErrorType.CONTRACT_ERROR;
      severity = ErrorSeverity.HIGH;
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      type = ErrorType.VALIDATION_ERROR;
      severity = ErrorSeverity.LOW;
    } else if (errorMessage.includes('cache') || errorMessage.includes('redis')) {
      type = ErrorType.CACHE_ERROR;
      severity = ErrorSeverity.MEDIUM;
    } else if (errorMessage.includes('state') || errorMessage.includes('snapshot')) {
      type = ErrorType.STATE_ERROR;
      severity = ErrorSeverity.HIGH;
    } else if (errorMessage.includes('adapter') || errorMessage.includes('protocol')) {
      type = ErrorType.ADAPTER_ERROR;
      severity = ErrorSeverity.HIGH;
    } else if (errorMessage.includes('risk') || errorMessage.includes('liquidation') || errorMessage.includes('health')) {
      type = ErrorType.RISK_ERROR;
      severity = ErrorSeverity.CRITICAL;
    }

    return {
      id: this.generateId(),
      type,
      severity,
      message: originalError.message,
      context: {
        timestamp: new Date().toISOString(),
        stackTrace: originalError.stack,
        ...context
      },
      recovery: this.recoveryStrategies.get(type),
      retryCount: 0,
      maxRetries: 3
    };
  };

  private logError = (error: PortfolioError): AsyncResult<void> => {
    return TE.tryCatch(
      async () => {
        this.errors.set(error.id, error);
        
        const logLevel = this.getLogLevel(error.severity);
        logger[logLevel](`Portfolio Error [${error.type}]: ${error.message}`, {
          errorId: error.id,
          severity: error.severity,
          context: error.context
        });

        this.emit('error', error);
      },
      (err) => new Error(`Failed to log error: ${err}`)
    );
  };

  private updateErrorStats = (error: PortfolioError): AsyncResult<void> => {
    return TE.tryCatch(
      async () => {
        const walletAddress = error.context.walletAddress;
        if (!walletAddress) return;

        const stats = this.errorStats.get(walletAddress) || this.createEmptyErrorStats();
        
        stats.totalErrors++;
        stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
        stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
        stats.recentErrors.push(error);
        
        // Keep only last 10 recent errors
        if (stats.recentErrors.length > 10) {
          stats.recentErrors.shift();
        }

        this.errorStats.set(walletAddress, stats);
      },
      (err) => new Error(`Failed to update error stats: ${err}`)
    );
  };

  private attemptRecovery = (error: PortfolioError): AsyncResult<any> => {
    const strategy = error.recovery;
    if (!strategy) {
      return TE.left(new Error('No recovery strategy available'));
    }

    switch (strategy.strategy) {
      case 'retry':
        return this.retryOperation(error);
      case 'fallback':
        return TE.right(strategy.fallbackValue);
      case 'cache':
        return this.useCachedValue(error);
      case 'ignore':
        return TE.right(null);
      case 'manual':
        return this.requireManualIntervention(error);
      default:
        return TE.left(new Error('Unknown recovery strategy'));
    }
  };

  private retryOperation = (error: PortfolioError): AsyncResult<any> => {
    if ((error.retryCount || 0) >= (error.maxRetries || 3)) {
      return TE.left(new Error('Max retries exceeded'));
    }

    return TE.tryCatch(
      async () => {
        const delay = error.recovery?.retryDelay || 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        error.retryCount = (error.retryCount || 0) + 1;
        logger.info(`Retrying operation for error ${error.id}, attempt ${error.retryCount}`);
        
        // This would trigger the original operation retry
        this.emit('retry', error);
        return null;
      },
      (err) => new Error(`Retry failed: ${err}`)
    );
  };

  private useCachedValue = (error: PortfolioError): AsyncResult<any> => {
    return TE.tryCatch(
      async () => {
        // This would attempt to retrieve cached data as fallback
        logger.info(`Using cached value for error ${error.id}`);
        this.emit('cache_fallback', error);
        return null;
      },
      (err) => new Error(`Cache fallback failed: ${err}`)
    );
  };

  private requireManualIntervention = (error: PortfolioError): AsyncResult<any> => {
    return TE.tryCatch(
      async () => {
        logger.warn(`Manual intervention required for error ${error.id}`);
        this.emit('manual_intervention', error);
        return null;
      },
      (err) => new Error(`Manual intervention setup failed: ${err}`)
    );
  };

  private notifyStakeholders = (
    error: PortfolioError,
    recoveryResult: any
  ): AsyncResult<any> => {
    return TE.tryCatch(
      async () => {
        // Notify via WebSocket if available
        if (this.socketService && error.context.walletAddress) {
          await this.socketService.sendError(
            error.context.walletAddress,
            error.message,
            { error, recoveryResult }
          )();
        }

        // Emit event for other listeners
        this.emit('error_handled', { error, recoveryResult });
        
        return recoveryResult;
      },
      (err) => new Error(`Failed to notify stakeholders: ${err}`)
    );
  };

  private storeAlert = (walletAddress: WalletAddress, alert: RiskAlert): AsyncResult<void> => {
    return TE.tryCatch(
      async () => {
        const userAlerts = this.activeAlerts.get(walletAddress) || [];
        userAlerts.push(alert);
        
        // Keep only last 20 alerts
        if (userAlerts.length > 20) {
          userAlerts.shift();
        }
        
        this.activeAlerts.set(walletAddress, userAlerts);
        logger.info(`Stored alert ${alert.id} for ${walletAddress}`);
      },
      (error) => new Error(`Failed to store alert: ${error}`)
    );
  };

  private escalateAlert = (walletAddress: WalletAddress, alert: RiskAlert): AsyncResult<void> => {
    return TE.tryCatch(
      async () => {
        // Send alert via WebSocket
        if (this.socketService) {
          await this.socketService.sendPortfolioUpdate(walletAddress, {
            type: 'error',
            data: alert,
            timestamp: alert.timestamp
          })();
        }

        // Emit event for other listeners
        this.emit('risk_alert', { walletAddress, alert });

        // Log based on severity
        const logLevel = this.getLogLevel(alert.severity as any);
        logger[logLevel](`Risk Alert [${alert.type}]: ${alert.message}`, {
          walletAddress,
          alertId: alert.id,
          severity: alert.severity
        });
      },
      (error) => new Error(`Failed to escalate alert: ${error}`)
    );
  };

  private setupDefaultRecoveryStrategies = (): void => {
    this.recoveryStrategies.set(ErrorType.NETWORK_ERROR, {
      strategy: 'retry',
      retryDelay: 2000
    });

    this.recoveryStrategies.set(ErrorType.RPC_ERROR, {
      strategy: 'retry',
      retryDelay: 3000
    });

    this.recoveryStrategies.set(ErrorType.CACHE_ERROR, {
      strategy: 'fallback',
      fallbackValue: null
    });

    this.recoveryStrategies.set(ErrorType.VALIDATION_ERROR, {
      strategy: 'ignore'
    });

    this.recoveryStrategies.set(ErrorType.CONTRACT_ERROR, {
      strategy: 'manual',
      action: 'investigate_contract_interaction'
    });

    this.recoveryStrategies.set(ErrorType.RISK_ERROR, {
      strategy: 'manual',
      action: 'immediate_risk_assessment'
    });
  };

  private setupErrorEventHandlers = (): void => {
    this.on('error', (error: PortfolioError) => {
      if (error.severity === ErrorSeverity.CRITICAL) {
        // Could trigger additional alerting systems
        logger.error(`CRITICAL ERROR DETECTED: ${error.message}`);
      }
    });

    this.on('risk_alert', ({ walletAddress, alert }) => {
      if (alert.severity === 'critical') {
        // Could trigger emergency procedures
        logger.error(`CRITICAL RISK ALERT for ${walletAddress}: ${alert.message}`);
      }
    });
  };

  private createEmptyErrorStats = (): ErrorStats => ({
    totalErrors: 0,
    errorsByType: {} as Record<ErrorType, number>,
    errorsBySeverity: {} as Record<ErrorSeverity, number>,
    recentErrors: [],
    recoverySuccessRate: 0
  });

  private aggregateErrorStats = (statsList: ErrorStats[]): ErrorStats => {
    const aggregated = this.createEmptyErrorStats();
    
    for (const stats of statsList) {
      aggregated.totalErrors += stats.totalErrors;
      
      for (const [type, count] of Object.entries(stats.errorsByType)) {
        aggregated.errorsByType[type as ErrorType] = 
          (aggregated.errorsByType[type as ErrorType] || 0) + count;
      }
      
      for (const [severity, count] of Object.entries(stats.errorsBySeverity)) {
        aggregated.errorsBySeverity[severity as ErrorSeverity] = 
          (aggregated.errorsBySeverity[severity as ErrorSeverity] || 0) + count;
      }
    }

    return aggregated;
  };

  private getLogLevel = (severity: ErrorSeverity): 'debug' | 'info' | 'warn' | 'error' => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'debug';
      case ErrorSeverity.MEDIUM:
        return 'info';
      case ErrorSeverity.HIGH:
        return 'warn';
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'info';
    }
  };

  private generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // TODO: REMOVE_MOCK - Random value generation
  };
}

/**
 * Singleton error handler instance
 */
export const portfolioErrorHandler = new PortfolioErrorHandler();