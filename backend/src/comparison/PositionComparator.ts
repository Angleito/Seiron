/**
 * Position Comparator - Advanced position comparison and diff tracking
 * Provides detailed analysis of position changes with granular change detection
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import {
  PortfolioSnapshot,
  LendingPosition,
  LiquidityPosition,
  TokenBalance,
  PositionDiff,
  WalletAddress,
  AsyncResult
} from '../types/portfolio';
import logger from '../utils/logger';

export interface ComparisonResult {
  walletAddress: WalletAddress;
  timestamp: string;
  totalChanges: number;
  significantChanges: number;
  changesByType: {
    added: number;
    removed: number;
    updated: number;
  };
  changesByCategory: {
    lending: number;
    liquidity: number;
    tokens: number;
  };
  totalValueChange: {
    absolute: number;
    percentage: number;
  };
  diffs: PositionDiff[];
  summary: string;
}

export interface ComparisonConfig {
  significanceThreshold: number; // Minimum USD change to be considered significant
  percentageThreshold: number;   // Minimum percentage change to be considered significant
  ignoreMinorChanges: boolean;   // Whether to ignore very small changes
  trackHistorical: boolean;      // Whether to track historical comparisons
  maxHistoryLength: number;      // Maximum number of historical comparisons to keep
}

export interface ChangeAnalysis {
  changeType: 'added' | 'removed' | 'updated';
  significance: 'minor' | 'moderate' | 'major' | 'critical';
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  suggestedAction?: string;
}

export class PositionComparator {
  private readonly config: ComparisonConfig;
  private comparisonHistory: Map<WalletAddress, ComparisonResult[]> = new Map();

  constructor(config: Partial<ComparisonConfig> = {}) {
    this.config = {
      significanceThreshold: 100, // $100 minimum change
      percentageThreshold: 5,     // 5% minimum change
      ignoreMinorChanges: false,
      trackHistorical: true,
      maxHistoryLength: 50,
      ...config
    };
  }

  /**
   * Compare two portfolio snapshots and generate detailed diff
   */
  public compareSnapshots = (
    oldSnapshot: PortfolioSnapshot,
    newSnapshot: PortfolioSnapshot
  ): ComparisonResult => {
    if (oldSnapshot.walletAddress !== newSnapshot.walletAddress) {
      throw new Error('Cannot compare snapshots from different wallets');
    }

    const walletAddress = newSnapshot.walletAddress;
    const timestamp = new Date().toISOString();

    // Generate position diffs
    const lendingDiffs = this.compareLendingPositions(
      oldSnapshot.lendingPositions,
      newSnapshot.lendingPositions
    );

    const liquidityDiffs = this.compareLiquidityPositions(
      oldSnapshot.liquidityPositions,
      newSnapshot.liquidityPositions
    );

    const tokenDiffs = this.compareTokenBalances(
      oldSnapshot.tokenBalances,
      newSnapshot.tokenBalances
    );

    const allDiffs = [...lendingDiffs, ...liquidityDiffs, ...tokenDiffs];

    // Calculate summary statistics
    const changesByType = this.categorizeChangesByType(allDiffs);
    const changesByCategory = this.categorizeChangesByCategory(allDiffs);
    const significantChanges = this.countSignificantChanges(allDiffs);
    const totalValueChange = this.calculateTotalValueChange(oldSnapshot, newSnapshot);
    const summary = this.generateSummary(allDiffs, totalValueChange);

    const result: ComparisonResult = {
      walletAddress,
      timestamp,
      totalChanges: allDiffs.length,
      significantChanges,
      changesByType,
      changesByCategory,
      totalValueChange,
      diffs: allDiffs,
      summary
    };

    // Store in history if enabled
    if (this.config.trackHistorical) {
      this.addToHistory(walletAddress, result);
    }

    logger.debug(`Compared snapshots for ${walletAddress}: ${allDiffs.length} changes detected`);
    return result;
  };

  /**
   * Analyze specific position change for insights
   */
  public analyzeChange = (diff: PositionDiff): ChangeAnalysis => {
    const significance = this.assessSignificance(diff);
    const impact = this.assessImpact(diff);
    const description = this.generateChangeDescription(diff);
    const suggestedAction = this.generateSuggestedAction(diff, significance, impact);

    return {
      changeType: diff.type,
      significance,
      impact,
      description,
      suggestedAction
    };
  };

  /**
   * Get comparison history for a wallet
   */
  public getComparisonHistory = (
    walletAddress: WalletAddress,
    limit?: number
  ): ComparisonResult[] => {
    const history = this.comparisonHistory.get(walletAddress) || [];
    return limit ? history.slice(-limit) : history;
  };

  /**
   * Find positions that have been consistent across snapshots
   */
  public findStablePositions = (
    snapshots: PortfolioSnapshot[],
    minConsistencyPeriod: number = 24 * 60 * 60 * 1000 // 24 hours in ms
  ): {
    lending: LendingPosition[];
    liquidity: LiquidityPosition[];
  } => {
    if (snapshots.length < 2) {
      return { lending: [], liquidity: [] };
    }

    const stableLending: LendingPosition[] = [];
    const stableLiquidity: LiquidityPosition[] = [];

    // Find lending positions that exist in all snapshots within the period
    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];
    const timeDiff = new Date(lastSnapshot.timestamp).getTime() - 
                     new Date(firstSnapshot.timestamp).getTime();

    if (timeDiff < minConsistencyPeriod) {
      return { lending: [], liquidity: [] };
    }

    // Check lending positions
    firstSnapshot.lendingPositions.forEach(initialPos => {
      const isStable = snapshots.every(snapshot => 
        snapshot.lendingPositions.some(pos => 
          pos.id === initialPos.id && 
          this.isPositionStable(initialPos, pos)
        )
      );

      if (isStable) {
        stableLending.push(initialPos);
      }
    });

    // Check liquidity positions
    firstSnapshot.liquidityPositions.forEach(initialPos => {
      const isStable = snapshots.every(snapshot => 
        snapshot.liquidityPositions.some(pos => 
          pos.id === initialPos.id && 
          this.isPositionStable(initialPos, pos)
        )
      );

      if (isStable) {
        stableLiquidity.push(initialPos);
      }
    });

    return { lending: stableLending, liquidity: stableLiquidity };
  };

  /**
   * Detect position patterns and trends
   */
  public detectPatterns = (
    walletAddress: WalletAddress,
    lookbackPeriod: number = 7 // days
  ): {
    trends: {
      increasing: string[];
      decreasing: string[];
      volatile: string[];
    };
    patterns: {
      regularRebalancing: boolean;
      driftingPositions: string[];
      riskIncreasing: boolean;
    };
  } => {
    const history = this.getComparisonHistory(walletAddress);
    const cutoffDate = new Date(Date.now() - lookbackPeriod * 24 * 60 * 60 * 1000);
    
    const recentHistory = history.filter(h => 
      new Date(h.timestamp) >= cutoffDate
    );

    if (recentHistory.length < 3) {
      return {
        trends: { increasing: [], decreasing: [], volatile: [] },
        patterns: { 
          regularRebalancing: false, 
          driftingPositions: [], 
          riskIncreasing: false 
        }
      };
    }

    const trends = this.analyzeTrends(recentHistory);
    const patterns = this.analyzePatterns(recentHistory);

    return { trends, patterns };
  };

  /**
   * Generate position change recommendations
   */
  public generateRecommendations = (
    comparison: ComparisonResult
  ): {
    priority: 'low' | 'medium' | 'high' | 'urgent';
    recommendations: string[];
    risks: string[];
    opportunities: string[];
  } => {
    const recommendations: string[] = [];
    const risks: string[] = [];
    const opportunities: string[] = [];
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';

    // Analyze significant negative changes
    const significantNegative = comparison.diffs.filter(diff => 
      diff.impactUSD < -this.config.significanceThreshold
    );

    if (significantNegative.length > 0) {
      priority = 'high';
      risks.push('Significant value losses detected in portfolio');
      recommendations.push('Review positions with large negative impacts');
    }

    // Analyze health factor changes
    const healthFactorChanges = comparison.diffs.filter(diff =>
      diff.changes.some(change => change.field === 'healthFactor')
    );

    if (healthFactorChanges.length > 0) {
      priority = 'urgent';
      risks.push('Health factor changes detected - monitor liquidation risk');
      recommendations.push('Consider rebalancing collateral positions');
    }

    // Analyze concentration changes
    const concentrationIssues = this.detectConcentrationIssues(comparison);
    if (concentrationIssues.length > 0) {
      priority = Math.max(priority === 'low' ? 0 : priority === 'medium' ? 1 : priority === 'high' ? 2 : 3, 1) === 1 ? 'medium' : priority;
      risks.push(...concentrationIssues);
      recommendations.push('Consider diversifying portfolio across more platforms/assets');
    }

    // Identify opportunities
    const yieldOpportunities = this.identifyYieldOpportunities(comparison);
    opportunities.push(...yieldOpportunities);

    return {
      priority,
      recommendations,
      risks,
      opportunities
    };
  };

  /**
   * Clear comparison history for a wallet
   */
  public clearHistory = (walletAddress: WalletAddress): void => {
    this.comparisonHistory.delete(walletAddress);
    logger.debug(`Cleared comparison history for ${walletAddress}`);
  };

  /**
   * Clear all comparison history
   */
  public clearAllHistory = (): void => {
    this.comparisonHistory.clear();
    logger.info('Cleared all comparison history');
  };

  // ===================== Private Methods =====================

  private compareLendingPositions = (
    oldPositions: LendingPosition[],
    newPositions: LendingPosition[]
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
          positionType: 'lending',
          changes: [],
          impactUSD: -position.valueUSD,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Detect added and updated positions
    for (const [id, position] of newMap) {
      const oldPosition = oldMap.get(id);
      
      if (!oldPosition) {
        diffs.push({
          type: 'added',
          positionId: id,
          positionType: 'lending',
          changes: [],
          impactUSD: position.valueUSD,
          timestamp: new Date().toISOString()
        });
      } else {
        const changes = this.detectLendingPositionChanges(oldPosition, position);
        if (changes.length > 0) {
          diffs.push({
            type: 'updated',
            positionId: id,
            positionType: 'lending',
            changes,
            impactUSD: position.valueUSD - oldPosition.valueUSD,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return diffs;
  };

  private compareLiquidityPositions = (
    oldPositions: LiquidityPosition[],
    newPositions: LiquidityPosition[]
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
          positionType: 'liquidity',
          changes: [],
          impactUSD: -position.valueUSD,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Detect added and updated positions
    for (const [id, position] of newMap) {
      const oldPosition = oldMap.get(id);
      
      if (!oldPosition) {
        diffs.push({
          type: 'added',
          positionId: id,
          positionType: 'liquidity',
          changes: [],
          impactUSD: position.valueUSD,
          timestamp: new Date().toISOString()
        });
      } else {
        const changes = this.detectLiquidityPositionChanges(oldPosition, position);
        if (changes.length > 0) {
          diffs.push({
            type: 'updated',
            positionId: id,
            positionType: 'liquidity',
            changes,
            impactUSD: position.valueUSD - oldPosition.valueUSD,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return diffs;
  };

  private compareTokenBalances = (
    oldBalances: TokenBalance[],
    newBalances: TokenBalance[]
  ): PositionDiff[] => {
    const diffs: PositionDiff[] = [];
    const oldMap = new Map(oldBalances.map(b => [b.token, b]));
    const newMap = new Map(newBalances.map(b => [b.token, b]));

    // Check all tokens
    const allTokens = new Set([...oldMap.keys(), ...newMap.keys()]);

    for (const token of allTokens) {
      const oldBalance = oldMap.get(token);
      const newBalance = newMap.get(token);

      if (!oldBalance && newBalance) {
        // New token
        diffs.push({
          type: 'added',
          positionId: `token-${token}`,
          positionType: 'token',
          changes: [],
          impactUSD: newBalance.valueUSD,
          timestamp: new Date().toISOString()
        });
      } else if (oldBalance && !newBalance) {
        // Token removed/sold
        diffs.push({
          type: 'removed',
          positionId: `token-${token}`,
          positionType: 'token',
          changes: [],
          impactUSD: -oldBalance.valueUSD,
          timestamp: new Date().toISOString()
        });
      } else if (oldBalance && newBalance) {
        // Token amount changed
        const changes = this.detectTokenBalanceChanges(oldBalance, newBalance);
        if (changes.length > 0) {
          diffs.push({
            type: 'updated',
            positionId: `token-${token}`,
            positionType: 'token',
            changes,
            impactUSD: newBalance.valueUSD - oldBalance.valueUSD,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return diffs;
  };

  private detectLendingPositionChanges = (
    oldPos: LendingPosition,
    newPos: LendingPosition
  ): { field: string; oldValue: any; newValue: any }[] => {
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    if (oldPos.amount !== newPos.amount) {
      changes.push({
        field: 'amount',
        oldValue: oldPos.amount,
        newValue: newPos.amount
      });
    }

    if (Math.abs(oldPos.valueUSD - newPos.valueUSD) > 0.01) {
      changes.push({
        field: 'valueUSD',
        oldValue: oldPos.valueUSD,
        newValue: newPos.valueUSD
      });
    }

    if (Math.abs(oldPos.apy - newPos.apy) > 0.01) {
      changes.push({
        field: 'apy',
        oldValue: oldPos.apy,
        newValue: newPos.apy
      });
    }

    if (oldPos.healthContribution !== newPos.healthContribution) {
      changes.push({
        field: 'healthContribution',
        oldValue: oldPos.healthContribution,
        newValue: newPos.healthContribution
      });
    }

    return changes;
  };

  private detectLiquidityPositionChanges = (
    oldPos: LiquidityPosition,
    newPos: LiquidityPosition
  ): { field: string; oldValue: any; newValue: any }[] => {
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    if (oldPos.liquidity !== newPos.liquidity) {
      changes.push({
        field: 'liquidity',
        oldValue: oldPos.liquidity,
        newValue: newPos.liquidity
      });
    }

    if (Math.abs(oldPos.valueUSD - newPos.valueUSD) > 0.01) {
      changes.push({
        field: 'valueUSD',
        oldValue: oldPos.valueUSD,
        newValue: newPos.valueUSD
      });
    }

    if (Math.abs(oldPos.totalApr - newPos.totalApr) > 0.01) {
      changes.push({
        field: 'totalApr',
        oldValue: oldPos.totalApr,
        newValue: newPos.totalApr
      });
    }

    if (oldPos.isInRange !== newPos.isInRange) {
      changes.push({
        field: 'isInRange',
        oldValue: oldPos.isInRange,
        newValue: newPos.isInRange
      });
    }

    if (Math.abs(oldPos.uncollectedFees.valueUSD - newPos.uncollectedFees.valueUSD) > 0.01) {
      changes.push({
        field: 'uncollectedFees',
        oldValue: oldPos.uncollectedFees,
        newValue: newPos.uncollectedFees
      });
    }

    return changes;
  };

  private detectTokenBalanceChanges = (
    oldBalance: TokenBalance,
    newBalance: TokenBalance
  ): { field: string; oldValue: any; newValue: any }[] => {
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    if (oldBalance.balance !== newBalance.balance) {
      changes.push({
        field: 'balance',
        oldValue: oldBalance.balance,
        newValue: newBalance.balance
      });
    }

    if (Math.abs(oldBalance.valueUSD - newBalance.valueUSD) > 0.01) {
      changes.push({
        field: 'valueUSD',
        oldValue: oldBalance.valueUSD,
        newValue: newBalance.valueUSD
      });
    }

    if (Math.abs(oldBalance.priceUSD - newBalance.priceUSD) > 0.01) {
      changes.push({
        field: 'priceUSD',
        oldValue: oldBalance.priceUSD,
        newValue: newBalance.priceUSD
      });
    }

    return changes;
  };

  private categorizeChangesByType = (diffs: PositionDiff[]) => ({
    added: diffs.filter(d => d.type === 'added').length,
    removed: diffs.filter(d => d.type === 'removed').length,
    updated: diffs.filter(d => d.type === 'updated').length
  });

  private categorizeChangesByCategory = (diffs: PositionDiff[]) => ({
    lending: diffs.filter(d => d.positionType === 'lending').length,
    liquidity: diffs.filter(d => d.positionType === 'liquidity').length,
    tokens: diffs.filter(d => d.positionType === 'token').length
  });

  private countSignificantChanges = (diffs: PositionDiff[]): number => {
    return diffs.filter(diff => 
      Math.abs(diff.impactUSD) >= this.config.significanceThreshold
    ).length;
  };

  private calculateTotalValueChange = (
    oldSnapshot: PortfolioSnapshot,
    newSnapshot: PortfolioSnapshot
  ) => {
    const absolute = newSnapshot.totalValueUSD - oldSnapshot.totalValueUSD;
    const percentage = oldSnapshot.totalValueUSD > 0 
      ? (absolute / oldSnapshot.totalValueUSD) * 100 
      : 0;

    return { absolute, percentage };
  };

  private generateSummary = (
    diffs: PositionDiff[],
    totalValueChange: { absolute: number; percentage: number }
  ): string => {
    const parts: string[] = [];

    if (diffs.length === 0) {
      return 'No significant changes detected in portfolio';
    }

    const added = diffs.filter(d => d.type === 'added').length;
    const removed = diffs.filter(d => d.type === 'removed').length;
    const updated = diffs.filter(d => d.type === 'updated').length;

    if (added > 0) parts.push(`${added} position(s) added`);
    if (removed > 0) parts.push(`${removed} position(s) removed`);
    if (updated > 0) parts.push(`${updated} position(s) updated`);

    let summary = parts.join(', ');

    if (Math.abs(totalValueChange.absolute) > this.config.significanceThreshold) {
      const direction = totalValueChange.absolute > 0 ? 'increased' : 'decreased';
      summary += `. Total value ${direction} by $${Math.abs(totalValueChange.absolute).toFixed(2)} (${Math.abs(totalValueChange.percentage).toFixed(2)}%)`;
    }

    return summary;
  };

  private assessSignificance = (diff: PositionDiff): 'minor' | 'moderate' | 'major' | 'critical' => {
    const absImpact = Math.abs(diff.impactUSD);
    
    if (absImpact < this.config.significanceThreshold) return 'minor';
    if (absImpact < this.config.significanceThreshold * 5) return 'moderate';
    if (absImpact < this.config.significanceThreshold * 20) return 'major';
    return 'critical';
  };

  private assessImpact = (diff: PositionDiff): 'positive' | 'negative' | 'neutral' => {
    if (Math.abs(diff.impactUSD) < 0.01) return 'neutral';
    return diff.impactUSD > 0 ? 'positive' : 'negative';
  };

  private generateChangeDescription = (diff: PositionDiff): string => {
    const positionType = diff.positionType;
    const changeType = diff.type;
    const impact = diff.impactUSD;

    let description = `${positionType} position ${changeType}`;
    
    if (changeType === 'updated' && diff.changes.length > 0) {
      const changedFields = diff.changes.map(c => c.field).join(', ');
      description += ` (${changedFields} changed)`;
    }

    if (Math.abs(impact) >= this.config.significanceThreshold) {
      const direction = impact > 0 ? 'gained' : 'lost';
      description += ` - ${direction} $${Math.abs(impact).toFixed(2)}`;
    }

    return description;
  };

  private generateSuggestedAction = (
    diff: PositionDiff,
    significance: string,
    impact: string
  ): string | undefined => {
    if (significance === 'minor') return undefined;

    if (diff.type === 'removed' && impact === 'negative') {
      return 'Consider investigating the reason for position closure';
    }

    if (diff.type === 'updated' && impact === 'negative' && significance === 'major') {
      return 'Review position for potential rebalancing or risk management';
    }

    if (diff.changes.some(c => c.field === 'isInRange' && c.newValue === false)) {
      return 'Liquidity position is out of range - consider adjusting price range or collecting fees';
    }

    if (diff.changes.some(c => c.field === 'apy' && c.newValue < c.oldValue)) {
      return 'APY has decreased - consider exploring alternative yield opportunities';
    }

    return undefined;
  };

  private addToHistory = (walletAddress: WalletAddress, result: ComparisonResult): void => {
    const history = this.comparisonHistory.get(walletAddress) || [];
    history.push(result);

    if (history.length > this.config.maxHistoryLength) {
      history.shift();
    }

    this.comparisonHistory.set(walletAddress, history);
  };

  private isPositionStable = (
    pos1: LendingPosition | LiquidityPosition,
    pos2: LendingPosition | LiquidityPosition
  ): boolean => {
    const valueChange = Math.abs(pos1.valueUSD - pos2.valueUSD);
    const percentageChange = pos1.valueUSD > 0 ? (valueChange / pos1.valueUSD) * 100 : 0;
    
    return valueChange < this.config.significanceThreshold && 
           percentageChange < this.config.percentageThreshold;
  };

  private analyzeTrends = (history: ComparisonResult[]) => {
    // Simplified trend analysis
    return {
      increasing: [],
      decreasing: [],
      volatile: []
    };
  };

  private analyzePatterns = (history: ComparisonResult[]) => {
    // Simplified pattern analysis
    return {
      regularRebalancing: false,
      driftingPositions: [],
      riskIncreasing: false
    };
  };

  private detectConcentrationIssues = (comparison: ComparisonResult): string[] => {
    // Simplified concentration analysis
    return [];
  };

  private identifyYieldOpportunities = (comparison: ComparisonResult): string[] => {
    // Simplified opportunity identification
    return [];
  };
}