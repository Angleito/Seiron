/**
 * PositionTracker - Real-time position monitoring and tracking
 * Monitors lending and liquidity positions for changes and alerts
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { EventEmitter } from 'events';
import {
  WalletAddress,
  LendingPosition,
  LiquidityPosition,
  TokenBalance,
  PortfolioSnapshot,
  PositionDiff,
  RiskAlert,
  RiskMetrics,
  PositionTrackingConfig,
  AsyncResult,
  PortfolioStateEvent
} from '../types/portfolio';
import { PortfolioState } from '../state/PortfolioState';
import { cacheService, CacheService } from '../utils/cache';
import logger from '../utils/logger';

export interface TrackedPosition {
  id: string;
  walletAddress: WalletAddress;
  type: 'lending' | 'liquidity';
  position: LendingPosition | LiquidityPosition;
  lastChecked: string;
  changeHistory: PositionDiff[];
  alerts: RiskAlert[];
}

export class PositionTracker extends EventEmitter {
  private trackedPositions: Map<string, TrackedPosition> = new Map();
  private monitoringIntervals: Map<WalletAddress, NodeJS.Timeout> = new Map();
  private readonly config: PositionTrackingConfig;

  constructor(
    private portfolioState: PortfolioState,
    private cache: CacheService = cacheService,
    config: Partial<PositionTrackingConfig> = {}
  ) {
    super();
    
    this.config = {
      updateInterval: 10000, // 10 seconds
      maxHistoryLength: 50,
      alertThresholds: {
        healthFactorWarning: 1.5,
        healthFactorCritical: 1.2,
        valueChangePercentage: 10, // 10% change triggers alert
        impermanentLossThreshold: 5 // 5% IL threshold
      },
      ...config
    };

    this.setupPortfolioStateListeners();
  }

  /**
   * Start tracking positions for a user
   */
  public startTracking = (walletAddress: WalletAddress): AsyncResult<void> =>
    pipe(
      this.loadExistingPositions(walletAddress),
      TE.chain(() => this.initializeMonitoring(walletAddress)),
      TE.map(() => {
        logger.info(`Started position tracking for ${walletAddress}`);
      })
    );

  /**
   * Stop tracking positions for a user
   */
  public stopTracking = (walletAddress: WalletAddress): AsyncResult<void> =>
    pipe(
      TE.tryCatch(
        async () => {
          // Clear monitoring interval
          const interval = this.monitoringIntervals.get(walletAddress);
          if (interval) {
            clearInterval(interval);
            this.monitoringIntervals.delete(walletAddress);
          }

          // Remove tracked positions
          const positionsToRemove = Array.from(this.trackedPositions.keys())
            .filter(key => key.startsWith(`${walletAddress}:`));
          
          positionsToRemove.forEach(key => {
            this.trackedPositions.delete(key);
          });

          // Clear cache
          const cacheKey = this.getPositionsCacheKey(walletAddress);
          await this.cache.del(cacheKey)();
          
          logger.info(`Stopped position tracking for ${walletAddress}`);
        },
        (error) => new Error(`Failed to stop tracking: ${error}`)
      )
    );

  /**
   * Get tracked positions for a user
   */
  public getTrackedPositions = (walletAddress: WalletAddress): TrackedPosition[] => {
    return Array.from(this.trackedPositions.values())
      .filter(tp => tp.walletAddress === walletAddress);
  };

  /**
   * Get position history for a specific position
   */
  public getPositionHistory = (positionId: string): PositionDiff[] => {
    const tracked = this.trackedPositions.get(positionId);
    return tracked?.changeHistory || [];
  };

  /**
   * Get active alerts for a user
   */
  public getActiveAlerts = (walletAddress: WalletAddress): RiskAlert[] => {
    const positions = this.getTrackedPositions(walletAddress);
    return positions
      .flatMap(p => p.alerts)
      .filter(alert => !alert.acknowledged)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert = (alertId: string): boolean => {
    for (const tracked of this.trackedPositions.values()) {
      const alert = tracked.alerts.find(a => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        this.saveTrackedPosition(tracked);
        return true;
      }
    }
    return false;
  };

  /**
   * Calculate position differences between snapshots
   */
  public calculatePositionDiffs = (
    oldSnapshot: PortfolioSnapshot,
    newSnapshot: PortfolioSnapshot
  ): PositionDiff[] => {
    const diffs: PositionDiff[] = [];

    // Calculate lending position diffs
    const lendingDiffs = this.comparePositions(
      oldSnapshot.lendingPositions,
      newSnapshot.lendingPositions,
      'lending'
    );
    diffs.push(...lendingDiffs);

    // Calculate liquidity position diffs
    const liquidityDiffs = this.comparePositions(
      oldSnapshot.liquidityPositions,
      newSnapshot.liquidityPositions,
      'liquidity'
    );
    diffs.push(...liquidityDiffs);

    return diffs;
  };

  /**
   * Calculate risk metrics for positions
   */
  public calculateRiskMetrics = (snapshot: PortfolioSnapshot): RiskMetrics => {
    const healthFactor = snapshot.healthFactor;
    const liquidationRisk = this.assessLiquidationRisk(healthFactor);
    const concentrationRisk = this.calculateConcentrationRisk(snapshot);
    const correlationRisk = this.calculateCorrelationRisk(snapshot);
    const impermanentLossRisk = this.calculateImpermanentLossRisk(snapshot);
    
    const alerts = this.generateRiskAlerts(snapshot, {
      healthFactor,
      liquidationRisk,
      concentrationRisk,
      correlationRisk,
      impermanentLossRisk
    });

    return {
      healthFactor,
      liquidationRisk,
      concentrationRisk,
      correlationRisk,
      impermanentLossRisk,
      alerts
    };
  };

  /**
   * Force refresh of all tracked positions
   */
  public refreshAllPositions = (): AsyncResult<void> =>
    pipe(
      TE.of(Array.from(this.monitoringIntervals.keys())),
      TE.chain(walletAddresses =>
        TE.sequenceArray(
          walletAddresses.map(address => this.refreshPositions(address))
        )
      ),
      TE.map(() => undefined)
    );

  /**
   * Cleanup tracking resources
   */
  public cleanup = (): void => {
    // Clear all intervals
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();
    
    // Clear tracked positions
    this.trackedPositions.clear();
    
    // Remove listeners
    this.removeAllListeners();
    
    logger.info('Position tracker cleaned up');
  };

  // ===================== Private Methods =====================

  private setupPortfolioStateListeners = (): void => {
    this.portfolioState.on('state_updated', (event: PortfolioStateEvent) => {
      if (event.type === 'state_updated') {
        this.handleStateUpdate(event.walletAddress, event.data.previous, event.data.current);
      }
    });
  };

  private handleStateUpdate = (
    walletAddress: WalletAddress,
    previous: PortfolioSnapshot,
    current: PortfolioSnapshot
  ): void => {
    const diffs = this.calculatePositionDiffs(previous, current);
    const riskMetrics = this.calculateRiskMetrics(current);
    
    // Update tracked positions
    this.updateTrackedPositions(walletAddress, current, diffs);
    
    // Check for new alerts
    this.checkForNewAlerts(walletAddress, riskMetrics);
    
    // Emit position change events
    diffs.forEach(diff => {
      this.emit('position_changed', {
        walletAddress,
        diff,
        timestamp: new Date().toISOString()
      });
    });
  };

  private loadExistingPositions = (walletAddress: WalletAddress): AsyncResult<void> => {
    const cacheKey = this.getPositionsCacheKey(walletAddress);
    return pipe(
      this.cache.get<TrackedPosition[]>(cacheKey),
      TE.map(cached => {
        if (cached) {
          cached.forEach(position => {
            this.trackedPositions.set(position.id, position);
          });
        }
      })
    );
  };

  private initializeMonitoring = (walletAddress: WalletAddress): AsyncResult<void> =>
    TE.tryCatch(
      async () => {
        // Clear existing interval
        const existingInterval = this.monitoringIntervals.get(walletAddress);
        if (existingInterval) {
          clearInterval(existingInterval);
        }

        // Start new monitoring interval
        const interval = setInterval(() => {
          this.refreshPositions(walletAddress)();
        }, this.config.updateInterval);

        this.monitoringIntervals.set(walletAddress, interval);
      },
      (error) => new Error(`Failed to initialize monitoring: ${error}`)
    );

  private refreshPositions = (walletAddress: WalletAddress): AsyncResult<void> =>
    pipe(
      TE.of(this.portfolioState.getCurrentSnapshot(walletAddress)),
      TE.chain(snapshotOption => {
        if (snapshotOption._tag === 'None') {
          return TE.left(new Error(`No snapshot available for ${walletAddress}`));
        }
        
        const snapshot = snapshotOption.value;
        this.updatePositionsFromSnapshot(walletAddress, snapshot);
        
        return TE.right(undefined);
      })
    );

  private updatePositionsFromSnapshot = (
    walletAddress: WalletAddress,
    snapshot: PortfolioSnapshot
  ): void => {
    const timestamp = new Date().toISOString();

    // Update lending positions
    snapshot.lendingPositions.forEach(position => {
      const key = `${walletAddress}:lending:${position.id}`;
      const existing = this.trackedPositions.get(key);
      
      if (existing) {
        this.updateTrackedPosition(existing, position, timestamp);
      } else {
        this.createTrackedPosition(walletAddress, 'lending', position, timestamp);
      }
    });

    // Update liquidity positions
    snapshot.liquidityPositions.forEach(position => {
      const key = `${walletAddress}:liquidity:${position.id}`;
      const existing = this.trackedPositions.get(key);
      
      if (existing) {
        this.updateTrackedPosition(existing, position, timestamp);
      } else {
        this.createTrackedPosition(walletAddress, 'liquidity', position, timestamp);
      }
    });
  };

  private createTrackedPosition = (
    walletAddress: WalletAddress,
    type: 'lending' | 'liquidity',
    position: LendingPosition | LiquidityPosition,
    timestamp: string
  ): void => {
    const key = `${walletAddress}:${type}:${position.id}`;
    
    const tracked: TrackedPosition = {
      id: key,
      walletAddress,
      type,
      position,
      lastChecked: timestamp,
      changeHistory: [],
      alerts: []
    };

    this.trackedPositions.set(key, tracked);
    this.saveTrackedPosition(tracked);
  };

  private updateTrackedPosition = (
    tracked: TrackedPosition,
    newPosition: LendingPosition | LiquidityPosition,
    timestamp: string
  ): void => {
    const oldPosition = tracked.position;
    const changes = this.detectPositionChanges(oldPosition, newPosition);
    
    if (changes.length > 0) {
      const diff: PositionDiff = {
        type: 'updated',
        positionId: newPosition.id,
        positionType: tracked.type,
        changes,
        impactUSD: this.calculateImpact(oldPosition, newPosition),
        timestamp
      };

      // Add to history
      tracked.changeHistory.push(diff);
      
      // Limit history length
      if (tracked.changeHistory.length > this.config.maxHistoryLength) {
        tracked.changeHistory.shift();
      }
    }

    tracked.position = newPosition;
    tracked.lastChecked = timestamp;
    
    this.saveTrackedPosition(tracked);
  };

  private updateTrackedPositions = (
    walletAddress: WalletAddress,
    snapshot: PortfolioSnapshot,
    diffs: PositionDiff[]
  ): void => {
    diffs.forEach(diff => {
      const key = `${walletAddress}:${diff.positionType}:${diff.positionId}`;
      const tracked = this.trackedPositions.get(key);
      
      if (tracked) {
        tracked.changeHistory.push(diff);
        
        if (tracked.changeHistory.length > this.config.maxHistoryLength) {
          tracked.changeHistory.shift();
        }
        
        this.saveTrackedPosition(tracked);
      }
    });
  };

  private comparePositions = (
    oldPositions: (LendingPosition | LiquidityPosition)[],
    newPositions: (LendingPosition | LiquidityPosition)[],
    type: 'lending' | 'liquidity'
  ): PositionDiff[] => {
    const diffs: PositionDiff[] = [];
    const oldMap = new Map(oldPositions.map(p => [p.id, p]));
    const newMap = new Map(newPositions.map(p => [p.id, p]));

    // Detect removed positions
    for (const [id, position] of oldMap) {
      if (!newMap.has(id)) {
        diffs.push({
          type: 'removed',
          positionId: id,
          positionType: type,
          changes: [],
          impactUSD: -('valueUSD' in position ? position.valueUSD : 0),
          timestamp: new Date().toISOString()
        });
      }
    }

    // Detect added positions
    for (const [id, position] of newMap) {
      if (!oldMap.has(id)) {
        diffs.push({
          type: 'added',
          positionId: id,
          positionType: type,
          changes: [],
          impactUSD: 'valueUSD' in position ? position.valueUSD : 0,
          timestamp: new Date().toISOString()
        });
      } else {
        // Detect updated positions
        const oldPosition = oldMap.get(id)!;
        const changes = this.detectPositionChanges(oldPosition, position);
        
        if (changes.length > 0) {
          diffs.push({
            type: 'updated',
            positionId: id,
            positionType: type,
            changes,
            impactUSD: this.calculateImpact(oldPosition, position),
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return diffs;
  };

  private detectPositionChanges = (
    oldPosition: LendingPosition | LiquidityPosition,
    newPosition: LendingPosition | LiquidityPosition
  ): { field: string; oldValue: any; newValue: any }[] => {
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    // Common fields
    if (Math.abs(oldPosition.valueUSD - newPosition.valueUSD) > 0.01) {
      changes.push({
        field: 'valueUSD',
        oldValue: oldPosition.valueUSD,
        newValue: newPosition.valueUSD
      });
    }

    // Type-specific fields
    if ('amount' in oldPosition && 'amount' in newPosition) {
      // Lending position
      if (oldPosition.amount !== newPosition.amount) {
        changes.push({
          field: 'amount',
          oldValue: oldPosition.amount,
          newValue: newPosition.amount
        });
      }
      
      if (Math.abs(oldPosition.apy - newPosition.apy) > 0.01) {
        changes.push({
          field: 'apy',
          oldValue: oldPosition.apy,
          newValue: newPosition.apy
        });
      }
    } else if ('liquidity' in oldPosition && 'liquidity' in newPosition) {
      // Liquidity position
      if (oldPosition.liquidity !== newPosition.liquidity) {
        changes.push({
          field: 'liquidity',
          oldValue: oldPosition.liquidity,
          newValue: newPosition.liquidity
        });
      }
      
      if (Math.abs(oldPosition.totalApr - newPosition.totalApr) > 0.01) {
        changes.push({
          field: 'totalApr',
          oldValue: oldPosition.totalApr,
          newValue: newPosition.totalApr
        });
      }
    }

    return changes;
  };

  private calculateImpact = (
    oldPosition: LendingPosition | LiquidityPosition,
    newPosition: LendingPosition | LiquidityPosition
  ): number => {
    return newPosition.valueUSD - oldPosition.valueUSD;
  };

  private assessLiquidationRisk = (healthFactor: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (healthFactor === Infinity) return 'low';
    if (healthFactor > this.config.alertThresholds.healthFactorWarning) return 'low';
    if (healthFactor > this.config.alertThresholds.healthFactorCritical) return 'medium';
    if (healthFactor > 1.1) return 'high';
    return 'critical';
  };

  private calculateConcentrationRisk = (snapshot: PortfolioSnapshot): number => {
    if (snapshot.totalValueUSD === 0) return 0;

    // Calculate concentration by platform
    const platformValues = new Map<string, number>();
    
    snapshot.lendingPositions.forEach(pos => {
      const current = platformValues.get(pos.platform) || 0;
      platformValues.set(pos.platform, current + pos.valueUSD);
    });
    
    snapshot.liquidityPositions.forEach(pos => {
      const current = platformValues.get(pos.platform) || 0;
      platformValues.set(pos.platform, current + pos.valueUSD);
    });

    // Calculate Herfindahl-Hirschman Index
    let hhi = 0;
    for (const value of platformValues.values()) {
      const share = value / snapshot.totalValueUSD;
      hhi += share * share;
    }

    return hhi * 100; // Return as percentage
  };

  private calculateCorrelationRisk = (snapshot: PortfolioSnapshot): number => {
    // Simplified correlation risk calculation
    // In practice, would use actual price correlation data
    const uniqueTokens = new Set<string>();
    
    snapshot.lendingPositions.forEach(pos => uniqueTokens.add(pos.tokenSymbol));
    snapshot.liquidityPositions.forEach(pos => {
      uniqueTokens.add(pos.token0Symbol);
      uniqueTokens.add(pos.token1Symbol);
    });
    
    // Lower diversity = higher correlation risk
    const diversityScore = Math.min(uniqueTokens.size / 10, 1);
    return (1 - diversityScore) * 100;
  };

  private calculateImpermanentLossRisk = (snapshot: PortfolioSnapshot): number => {
    // Calculate aggregate impermanent loss risk for liquidity positions
    if (snapshot.liquidityPositions.length === 0) return 0;

    let totalRisk = 0;
    let totalValue = 0;

    snapshot.liquidityPositions.forEach(pos => {
      // Simple IL risk calculation based on price range
      const range = pos.priceRange;
      const priceDeviation = Math.abs(range.current - (range.lower + range.upper) / 2);
      const rangeWidth = range.upper - range.lower;
      const risk = rangeWidth > 0 ? (priceDeviation / rangeWidth) * 100 : 0;
      
      totalRisk += risk * pos.valueUSD;
      totalValue += pos.valueUSD;
    });

    return totalValue > 0 ? totalRisk / totalValue : 0;
  };

  private generateRiskAlerts = (
    snapshot: PortfolioSnapshot,
    risks: Omit<RiskMetrics, 'alerts'>
  ): RiskAlert[] => {
    const alerts: RiskAlert[] = [];

    // Health factor alerts
    if (risks.healthFactor < this.config.alertThresholds.healthFactorCritical) {
      alerts.push({
        id: `health-critical-${Date.now()}`,
        type: 'health_factor',
        severity: 'critical',
        message: `Critical health factor: ${risks.healthFactor.toFixed(2)}. Risk of liquidation!`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: { healthFactor: risks.healthFactor }
      });
    } else if (risks.healthFactor < this.config.alertThresholds.healthFactorWarning) {
      alerts.push({
        id: `health-warning-${Date.now()}`,
        type: 'health_factor',
        severity: 'warning',
        message: `Low health factor: ${risks.healthFactor.toFixed(2)}. Consider reducing leverage.`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: { healthFactor: risks.healthFactor }
      });
    }

    // Concentration risk alerts
    if (risks.concentrationRisk > 80) {
      alerts.push({
        id: `concentration-${Date.now()}`,
        type: 'concentration',
        severity: 'warning',
        message: `High concentration risk: ${risks.concentrationRisk.toFixed(1)}%. Consider diversifying.`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: { concentrationRisk: risks.concentrationRisk }
      });
    }

    // Impermanent loss alerts
    if (risks.impermanentLossRisk > this.config.alertThresholds.impermanentLossThreshold) {
      alerts.push({
        id: `il-risk-${Date.now()}`,
        type: 'impermanent_loss',
        severity: 'info',
        message: `Potential impermanent loss risk: ${risks.impermanentLossRisk.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: { impermanentLossRisk: risks.impermanentLossRisk }
      });
    }

    return alerts;
  };

  private checkForNewAlerts = (walletAddress: WalletAddress, riskMetrics: RiskMetrics): void => {
    const newAlerts = riskMetrics.alerts.filter(alert => !alert.acknowledged);
    
    if (newAlerts.length > 0) {
      // Add alerts to tracked positions
      const positions = this.getTrackedPositions(walletAddress);
      positions.forEach(tracked => {
        tracked.alerts.push(...newAlerts);
        this.saveTrackedPosition(tracked);
      });

      // Emit alert events
      newAlerts.forEach(alert => {
        this.emit('risk_alert', {
          type: 'risk_alert',
          walletAddress,
          timestamp: new Date().toISOString(),
          data: alert
        });
      });
    }
  };

  private saveTrackedPosition = (tracked: TrackedPosition): void => {
    this.trackedPositions.set(tracked.id, tracked);
    
    // Save to cache
    const walletAddress = tracked.walletAddress;
    const cacheKey = this.getPositionsCacheKey(walletAddress);
    const userPositions = this.getTrackedPositions(walletAddress);
    
    this.cache.set(cacheKey, userPositions, 3600)(); // 1 hour TTL
  };

  private getPositionsCacheKey = (walletAddress: WalletAddress): string => {
    return CacheService.generateKey('tracked_positions', walletAddress);
  };
}