/**
 * High-Performance Monitoring System
 * Real-time metrics collection, memory tracking, and bottleneck detection
 * 
 * Performance targets:
 * - Real-time performance metrics collection
 * - Memory usage tracking and optimization
 * - Hot path identification and bottleneck detection
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import * as process from 'process';
import {
  PerformanceMetric,
  SystemMetrics,
  ApplicationMetrics,
  MetricSnapshot,
  PerformanceAlert,
  AlertRule,
  AlertSeverity,
  AlertType,
  Bottleneck,
  ProfileData,
  HotPath,
  MonitoringConfig,
  PerformanceReport,
  QueryPerformance,
  ResourceUsage
} from './types';

export class PerformanceMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private snapshots: MetricSnapshot[] = [];
  private alerts: Map<string, PerformanceAlert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private bottlenecks: Map<string, Bottleneck> = new Map();
  private profileData: Map<string, ProfileData> = new Map();
  private hotPaths: Map<string, HotPath> = new Map();
  private queryPerformance: Map<string, QueryPerformance> = new Map();
  private resourceUsage: ResourceUsage[] = [];
  
  private collectInterval: NodeJS.Timeout | null = null;
  private analysisInterval: NodeJS.Timeout | null = null;
  private startTime = Date.now();
  private requestCounts: Map<string, number> = new Map();
  private responseTimes: number[] = [];
  private lastMetricsCollection = Date.now();

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.initializeAlertRules();
    this.startCollection();
  }

  private initializeAlertRules(): void {
    if (this.config.alerts.enabled) {
      for (const rule of this.config.alerts.rules) {
        this.alertRules.set(rule.id, rule);
      }
    }
  }

  /**
   * Start real-time metrics collection
   */
  private startCollection(): void {
    if (!this.config.enabled) return;

    // Collect system and application metrics
    this.collectInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectInterval);

    // Analyze bottlenecks and performance issues
    if (this.config.bottleneckDetection.enabled) {
      this.analysisInterval = setInterval(() => {
        this.analyzeBottlenecks();
      }, this.config.bottleneckDetection.analysisInterval);
    }
  }

  /**
   * Comprehensive metrics collection
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();
    
    try {
      const systemMetrics = await this.collectSystemMetrics();
      const applicationMetrics = await this.collectApplicationMetrics();
      const customMetrics = this.collectCustomMetrics();

      const snapshot: MetricSnapshot = {
        timestamp,
        system: systemMetrics,
        application: applicationMetrics,
        custom: customMetrics
      };

      this.snapshots.push(snapshot);
      
      // Maintain retention period
      const retentionCutoff = timestamp - this.config.retentionPeriod;
      this.snapshots = this.snapshots.filter(s => s.timestamp > retentionCutoff);

      // Check alert conditions
      if (this.config.alerts.enabled) {
        this.checkAlerts(snapshot);
      }

      // Emit metrics update event
      this.emit('metrics-collected', snapshot);

    } catch (error) {
      this.emit('collection-error', error);
    }
  }

  /**
   * System-level metrics collection
   */
  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const loadAvg = os.loadavg();
    const memInfo = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // CPU usage calculation (approximation)
    const cpuUsage = Math.min(loadAvg[0] / os.cpus().length * 100, 100);

    return {
      cpu: {
        usage: cpuUsage,
        loadAverage: loadAvg,
        cores: os.cpus().length
      },
      memory: {
        used: usedMem,
        free: freeMem,
        total: totalMem,
        heap: {
          used: memInfo.heapUsed,
          total: memInfo.heapTotal,
          limit: memInfo.heapUsed + memInfo.heapTotal
        },
        usage: (usedMem / totalMem) * 100
      },
      network: {
        bytesIn: this.getNetworkBytes('in'),
        bytesOut: this.getNetworkBytes('out'),
        connectionsActive: this.getActiveConnections(),
        requestsPerSecond: this.calculateRequestRate()
      },
      disk: {
        usage: await this.getDiskUsage(),
        available: await this.getDiskAvailable(),
        reads: this.getDiskReads(),
        writes: this.getDiskWrites()
      }
    };
  }

  /**
   * Application-specific metrics collection
   */
  private async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute

    // Request metrics
    const recentResponses = this.responseTimes.filter(time => now - time < timeWindow);
    const totalRequests = this.getTotalRequests();
    const failedRequests = this.getFailedRequests();
    
    return {
      requests: {
        total: totalRequests,
        successful: totalRequests - failedRequests,
        failed: failedRequests,
        rate: this.calculateRequestRate(),
        averageResponseTime: this.calculateAverageResponseTime(recentResponses),
        p95ResponseTime: this.calculatePercentile(recentResponses, 95),
        p99ResponseTime: this.calculatePercentile(recentResponses, 99)
      },
      database: {
        connections: this.getDatabaseConnections(),
        queriesPerSecond: this.calculateQueryRate(),
        averageQueryTime: this.getAverageQueryTime(),
        slowQueries: this.getSlowQueryCount()
      },
      cache: {
        hitRate: this.getCacheHitRate(),
        missRate: this.getCacheMissRate(),
        evictions: this.getCacheEvictions(),
        size: this.getCacheSize(),
        memoryUsage: this.getCacheMemoryUsage()
      },
      blockchain: {
        blockHeight: await this.getBlockHeight(),
        transactionsPerSecond: this.getTransactionRate(),
        gasUsage: this.getGasUsage(),
        confirmationTime: this.getConfirmationTime()
      }
    };
  }

  /**
   * Custom metrics collection from registered metrics
   */
  private collectCustomMetrics(): Record<string, number> {
    const customMetrics: Record<string, number> = {};
    
    for (const [name, metricHistory] of this.metrics) {
      if (metricHistory.length > 0) {
        const latest = metricHistory[metricHistory.length - 1];
        customMetrics[name] = latest.value;
      }
    }
    
    return customMetrics;
  }

  /**
   * Alert system implementation
   */
  private checkAlerts(snapshot: MetricSnapshot): void {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;
      
      // Check cooldown period
      if (rule.lastTriggered && 
          Date.now() - rule.lastTriggered < rule.cooldownPeriod) {
        continue;
      }

      const metricValue = this.getMetricValue(snapshot, rule.metric);
      if (metricValue === null) continue;

      const shouldAlert = this.evaluateAlertCondition(rule, metricValue, snapshot);
      
      if (shouldAlert) {
        this.triggerAlert(rule, metricValue);
        rule.lastTriggered = Date.now();
      }
    }
  }

  private evaluateAlertCondition(
    rule: AlertRule, 
    value: number, 
    snapshot: MetricSnapshot
  ): boolean {
    const condition = rule.condition;
    
    let evaluationValue = value;
    
    // Apply aggregation if specified
    if (condition.aggregation && condition.timeWindow) {
      const historicalValues = this.getHistoricalValues(
        rule.metric, 
        condition.timeWindow, 
        condition.samples
      );
      
      switch (condition.aggregation) {
        case 'avg':
          evaluationValue = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
          break;
        case 'sum':
          evaluationValue = historicalValues.reduce((a, b) => a + b, 0);
          break;
        case 'min':
          evaluationValue = Math.min(...historicalValues);
          break;
        case 'max':
          evaluationValue = Math.max(...historicalValues);
          break;
        case 'count':
          evaluationValue = historicalValues.length;
          break;
      }
    }

    // Evaluate condition
    switch (condition.operator) {
      case 'gt': return evaluationValue > rule.threshold;
      case 'gte': return evaluationValue >= rule.threshold;
      case 'lt': return evaluationValue < rule.threshold;
      case 'lte': return evaluationValue <= rule.threshold;
      case 'eq': return evaluationValue === rule.threshold;
      case 'ne': return evaluationValue !== rule.threshold;
      default: return false;
    }
  }

  private triggerAlert(rule: AlertRule, currentValue: number): void {
    const alert: PerformanceAlert = {
      id: `${rule.id}_${Date.now()}`,
      severity: rule.severity,
      type: AlertType.THRESHOLD,
      message: `${rule.name}: ${rule.metric} ${rule.condition.operator} ${rule.threshold}`,
      metric: rule.metric,
      threshold: rule.threshold,
      currentValue,
      timestamp: Date.now(),
      resolved: false
    };

    this.alerts.set(alert.id, alert);
    this.emit('alert-triggered', alert);
    
    // Send notifications if configured
    this.sendNotification(alert);
  }

  /**
   * Advanced bottleneck detection
   */
  private analyzeBottlenecks(): void {
    const currentSnapshot = this.snapshots[this.snapshots.length - 1];
    if (!currentSnapshot) return;

    const bottlenecks: Bottleneck[] = [];
    
    // CPU bottleneck detection
    if (currentSnapshot.system.cpu.usage > this.config.bottleneckDetection.thresholds.cpuUsage) {
      bottlenecks.push(this.createBottleneck(
        'cpu',
        'High CPU Usage',
        currentSnapshot.system.cpu.usage,
        'CPU usage is above threshold',
        'Consider optimizing CPU-intensive operations or scaling horizontally'
      ));
    }

    // Memory bottleneck detection
    if (currentSnapshot.system.memory.usage > this.config.bottleneckDetection.thresholds.memoryUsage) {
      bottlenecks.push(this.createBottleneck(
        'memory',
        'High Memory Usage',
        currentSnapshot.system.memory.usage,
        'Memory usage is above threshold',
        'Implement memory optimization or increase available memory'
      ));
    }

    // Response time bottleneck detection
    if (currentSnapshot.application.requests.averageResponseTime > 
        this.config.bottleneckDetection.thresholds.responseTime) {
      bottlenecks.push(this.createBottleneck(
        'response_time',
        'High Response Time',
        currentSnapshot.application.requests.averageResponseTime,
        'Application response time is degraded',
        'Profile application performance and optimize slow operations'
      ));
    }

    // Error rate bottleneck detection
    const errorRate = (currentSnapshot.application.requests.failed / 
                      Math.max(currentSnapshot.application.requests.total, 1)) * 100;
    
    if (errorRate > this.config.bottleneckDetection.thresholds.errorRate) {
      bottlenecks.push(this.createBottleneck(
        'error_rate',
        'High Error Rate',
        errorRate,
        'Application error rate is above acceptable levels',
        'Investigate and fix recurring errors'
      ));
    }

    // Update bottleneck tracking
    for (const bottleneck of bottlenecks) {
      const existing = this.bottlenecks.get(bottleneck.id);
      if (existing) {
        existing.frequency++;
        existing.detectedAt = Date.now();
      } else {
        this.bottlenecks.set(bottleneck.id, bottleneck);
      }
    }

    if (bottlenecks.length > 0) {
      this.emit('bottlenecks-detected', bottlenecks);
    }
  }

  private createBottleneck(
    id: string,
    component: string,
    severity: number,
    rootCause: string,
    recommendation: string
  ): Bottleneck {
    return {
      id,
      component,
      severity,
      impact: this.calculateImpact(severity),
      rootCause,
      recommendation,
      detectedAt: Date.now(),
      metrics: { severity },
      frequency: 1
    };
  }

  private calculateImpact(severity: number): string {
    if (severity > 90) return 'Critical';
    if (severity > 75) return 'High';
    if (severity > 50) return 'Medium';
    return 'Low';
  }

  /**
   * Hot path identification
   */
  public recordHotPath(path: string, latency: number): void {
    const existing = this.hotPaths.get(path);
    
    if (existing) {
      existing.frequency++;
      existing.totalLatency += latency;
      existing.averageLatency = existing.totalLatency / existing.frequency;
      existing.samples++;
    } else {
      this.hotPaths.set(path, {
        path,
        frequency: 1,
        averageLatency: latency,
        totalLatency: latency,
        samples: 1,
        bottlenecks: []
      });
    }
  }

  /**
   * Query performance tracking
   */
  public recordQueryPerformance(query: string, executionTime: number): void {
    const existing = this.queryPerformance.get(query);
    
    if (existing) {
      existing.frequency++;
      existing.averageTime = (existing.averageTime * (existing.frequency - 1) + executionTime) / existing.frequency;
      existing.maxTime = Math.max(existing.maxTime, executionTime);
      existing.lastExecuted = Date.now();
    } else {
      this.queryPerformance.set(query, {
        query,
        executionTime,
        frequency: 1,
        averageTime: executionTime,
        maxTime: executionTime,
        lastExecuted: Date.now()
      });
    }
  }

  /**
   * Custom metric recording
   */
  public recordMetric(name: string, value: number, unit: string = '', tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
      metadata: {}
    };

    const history = this.metrics.get(name) || [];
    history.push(metric);
    
    // Maintain history size
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    this.metrics.set(name, history);
    this.emit('metric-recorded', metric);
  }

  /**
   * Request tracking
   */
  public recordRequest(path: string, responseTime: number, success: boolean): void {
    this.responseTimes.push(responseTime);
    
    // Maintain response time history
    if (this.responseTimes.length > 10000) {
      this.responseTimes.splice(0, this.responseTimes.length - 10000);
    }

    const count = this.requestCounts.get(path) || 0;
    this.requestCounts.set(path, count + 1);
    
    if (!success) {
      const errorCount = this.requestCounts.get(`${path}_errors`) || 0;
      this.requestCounts.set(`${path}_errors`, errorCount + 1);
    }

    // Record as hot path
    this.recordHotPath(path, responseTime);
  }

  // Public API methods

  public getMetrics(metricName?: string): PerformanceMetric[] | Map<string, PerformanceMetric[]> {
    if (metricName) {
      return this.metrics.get(metricName) || [];
    }
    return this.metrics;
  }

  public getSnapshots(limit?: number): MetricSnapshot[] {
    if (limit) {
      return this.snapshots.slice(-limit);
    }
    return this.snapshots;
  }

  public getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  public getBottlenecks(): Bottleneck[] {
    return Array.from(this.bottlenecks.values())
      .sort((a, b) => b.severity - a.severity);
  }

  public getHotPaths(limit: number = 10): HotPath[] {
    return Array.from(this.hotPaths.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  public getSlowQueries(limit: number = 10): QueryPerformance[] {
    return Array.from(this.queryPerformance.values())
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, limit);
  }

  public generateReport(period?: { start: number; end: number }): PerformanceReport {
    const snapshots = period ? 
      this.snapshots.filter(s => s.timestamp >= period.start && s.timestamp <= period.end) :
      this.snapshots;

    if (snapshots.length === 0) {
      throw new Error('No data available for the specified period');
    }

    const totalRequests = snapshots.reduce((sum, s) => sum + s.application.requests.total, 0);
    const avgResponseTime = snapshots.reduce((sum, s) => sum + s.application.requests.averageResponseTime, 0) / snapshots.length;
    const errorRate = snapshots.reduce((sum, s) => {
      const total = s.application.requests.total;
      const failed = s.application.requests.failed;
      return sum + (total > 0 ? (failed / total) * 100 : 0);
    }, 0) / snapshots.length;

    return {
      summary: {
        period: period || { start: snapshots[0].timestamp, end: snapshots[snapshots.length - 1].timestamp },
        totalRequests,
        averageResponseTime: avgResponseTime,
        errorRate,
        uptime: (Date.now() - this.startTime) / 1000
      },
      trends: this.calculateTrends(snapshots),
      bottlenecks: this.getBottlenecks(),
      recommendations: this.generateRecommendations(),
      alerts: Array.from(this.alerts.values())
    };
  }

  // Helper methods

  private getMetricValue(snapshot: MetricSnapshot, metricPath: string): number | null {
    const parts = metricPath.split('.');
    let current: any = snapshot;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    
    return typeof current === 'number' ? current : null;
  }

  private getHistoricalValues(metric: string, timeWindow: number, maxSamples?: number): number[] {
    const cutoff = Date.now() - timeWindow;
    const relevantSnapshots = this.snapshots.filter(s => s.timestamp > cutoff);
    
    if (maxSamples && relevantSnapshots.length > maxSamples) {
      const step = Math.floor(relevantSnapshots.length / maxSamples);
      return relevantSnapshots
        .filter((_, index) => index % step === 0)
        .map(s => this.getMetricValue(s, metric))
        .filter((v): v is number => v !== null);
    }
    
    return relevantSnapshots
      .map(s => this.getMetricValue(s, metric))
      .filter((v): v is number => v !== null);
  }

  private calculateTrends(snapshots: MetricSnapshot[]): any[] {
    // Simplified trend calculation
    const trends = [];
    const metrics = ['system.cpu.usage', 'system.memory.usage', 'application.requests.averageResponseTime'];
    
    for (const metric of metrics) {
      const values = snapshots.map(s => this.getMetricValue(s, metric)).filter((v): v is number => v !== null);
      if (values.length < 2) continue;
      
      const start = values[0];
      const end = values[values.length - 1];
      const changeRate = ((end - start) / start) * 100;
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (Math.abs(changeRate) > 5) {
        trend = changeRate > 0 ? 'increasing' : 'decreasing';
      }
      
      trends.push({ metric, trend, changeRate });
    }
    
    return trends;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const latestSnapshot = this.snapshots[this.snapshots.length - 1];
    
    if (!latestSnapshot) return recommendations;
    
    if (latestSnapshot.system.cpu.usage > 80) {
      recommendations.push('Consider optimizing CPU-intensive operations or adding more compute resources');
    }
    
    if (latestSnapshot.system.memory.usage > 85) {
      recommendations.push('Memory usage is high. Consider implementing memory optimization strategies');
    }
    
    if (latestSnapshot.application.requests.averageResponseTime > 1000) {
      recommendations.push('Response times are degraded. Profile and optimize slow operations');
    }
    
    return recommendations;
  }

  private sendNotification(alert: PerformanceAlert): void {
    // Implementation would depend on configured notification channels
    this.emit('notification-sent', { alert, channels: this.config.alerts.notification });
  }

  // Placeholder methods for system-specific implementations
  private getNetworkBytes(direction: 'in' | 'out'): number { return 0; }
  private getActiveConnections(): number { return 0; }
  private async getDiskUsage(): Promise<number> { return 0; }
  private async getDiskAvailable(): Promise<number> { return 0; }
  private getDiskReads(): number { return 0; }
  private getDiskWrites(): number { return 0; }
  private getTotalRequests(): number { 
    return Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0); 
  }
  private getFailedRequests(): number {
    return Array.from(this.requestCounts.entries())
      .filter(([key]) => key.endsWith('_errors'))
      .reduce((sum, [, count]) => sum + count, 0);
  }
  private calculateRequestRate(): number {
    const recentWindow = 60000; // 1 minute
    const recentRequests = this.responseTimes.filter(time => Date.now() - time < recentWindow);
    return recentRequests.length / 60; // requests per second
  }
  private calculateAverageResponseTime(times: number[]): number {
    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
  }
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  private getDatabaseConnections(): number { return 0; }
  private calculateQueryRate(): number { return 0; }
  private getAverageQueryTime(): number { return 0; }
  private getSlowQueryCount(): number { return 0; }
  private getCacheHitRate(): number { return 0; }
  private getCacheMissRate(): number { return 0; }
  private getCacheEvictions(): number { return 0; }
  private getCacheSize(): number { return 0; }
  private getCacheMemoryUsage(): number { return 0; }
  private async getBlockHeight(): Promise<number> { return 0; }
  private getTransactionRate(): number { return 0; }
  private getGasUsage(): number { return 0; }
  private getConfirmationTime(): number { return 0; }

  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
    }
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
    
    this.emit('shutdown');
    this.removeAllListeners();
  }
}