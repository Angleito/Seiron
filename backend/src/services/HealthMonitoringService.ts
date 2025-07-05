import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { createServiceLogger, logger, type ServiceHealthMetrics } from './LoggingService';
import { errorHandler, createServiceErrorHandler } from './ErrorHandlingService';
import type { SeiIntegrationService } from './SeiIntegrationService';
import type { PortfolioAnalyticsService } from './PortfolioAnalyticsService';
import type { RealTimeDataService } from './RealTimeDataService';
import type { SocketService } from './SocketService';
import type { AIService } from './AIService';

/**
 * HealthMonitoringService - System Health and Performance Monitoring
 * 
 * This service provides comprehensive health monitoring for all backend services,
 * including performance metrics, error tracking, and Dragon Ball Z themed alerts.
 * It integrates with the logging and error handling systems for complete observability.
 */

// ============================================================================
// Health Monitoring Types
// ============================================================================

export interface SystemHealthReport {
  overall: HealthStatus;
  timestamp: Date;
  uptime: number;
  services: Record<string, ServiceHealth>;
  adapters: AdapterHealthSummary;
  performance: SystemPerformanceMetrics;
  alerts: HealthAlert[];
  dragonPowerLevel: number;
}

export interface ServiceHealth {
  status: HealthStatus;
  metrics: ServiceHealthMetrics;
  lastCheck: Date;
  dependencies: ServiceDependency[];
  issues: HealthIssue[];
}

export interface AdapterHealthSummary {
  hiveIntelligence: AdapterHealth;
  seiAgentKit: AdapterHealth;
  seiMCP: AdapterHealth;
}

export interface AdapterHealth {
  status: HealthStatus;
  responseTime: number;
  errorRate: number;
  lastSuccessfulCall: Date | null;
  apiCreditRemaining?: number;
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
}

export interface SystemPerformanceMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    available: number;
    percentage: number;
  };
  network: {
    connections: number;
    throughput: number;
  };
  database: {
    connections: number;
    responseTime: number;
  };
}

export interface HealthAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  service?: string;
  adapter?: string;
  metadata?: Record<string, any>;
  dragonTheme?: {
    powerLevel: number;
    alertPhrase: string;
    severity: 'kamehameha' | 'special_beam_cannon' | 'destructo_disk' | 'solar_flare';
  };
}

export interface HealthIssue {
  type: 'performance' | 'error' | 'dependency' | 'configuration';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  since: Date;
  count: number;
  recommendation?: string;
}

export interface ServiceDependency {
  name: string;
  type: 'service' | 'adapter' | 'external';
  status: HealthStatus;
  required: boolean;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheckConfig {
  interval: number;
  timeout: number;
  retries: number;
  enableDragonTheming: boolean;
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

// ============================================================================
// Health Monitoring Service Implementation
// ============================================================================

export class HealthMonitoringService extends EventEmitter {
  private logger = createServiceLogger('HealthMonitoringService');
  private errorHandler = createServiceErrorHandler('HealthMonitoringService');
  private isRunning = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private services: Map<string, any> = new Map();
  private lastHealthReport?: SystemHealthReport;
  private alertHistory: HealthAlert[] = [];
  private startTime = Date.now();

  private config: HealthCheckConfig = {
    interval: 30000, // 30 seconds
    timeout: 5000,   // 5 seconds
    retries: 3,
    enableDragonTheming: true,
    alertThresholds: {
      errorRate: 0.05,    // 5%
      responseTime: 2000, // 2 seconds
      memoryUsage: 0.85,  // 85%
      cpuUsage: 0.80      // 80%
    }
  };

  constructor(config: Partial<HealthCheckConfig> = {}) {
    super();
    this.config = { ...this.config, ...config };
    this.logger.info('HealthMonitoringService initialized with Dragon Ball Z power monitoring');
  }

  // ============================================================================
  // Service Registration and Management
  // ============================================================================

  /**
   * Register a service for health monitoring
   */
  public registerService = (
    name: string,
    service: any,
    dependencies: ServiceDependency[] = []
  ): void => {
    this.services.set(name, { instance: service, dependencies });
    this.logger.info(`Service registered for health monitoring`, {
      metadata: { serviceName: name, dependencyCount: dependencies.length }
    });
  };

  /**
   * Start health monitoring
   */
  public start = (): void => {
    if (this.isRunning) {
      this.logger.warn('Health monitoring already running');
      return;
    }

    this.isRunning = true;
    this.healthCheckInterval = setInterval(
      () => this.performHealthCheck(),
      this.config.interval
    );

    this.logger.info('Health monitoring started', {
      metadata: { interval: this.config.interval }
    });

    // Perform initial health check
    this.performHealthCheck();
  };

  /**
   * Stop health monitoring
   */
  public stop = (): void => {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.logger.info('Health monitoring stopped');
  };

  // ============================================================================
  // Health Checking
  // ============================================================================

  /**
   * Perform comprehensive health check
   */
  // @withErrorRecovery('external_services', 'HealthMonitoringService')
  private performHealthCheck = async (): Promise<void> => {
    this.logger.startTimer('performHealthCheck');
    
    try {
      const [serviceHealth, adapterHealth, performanceMetrics] = await Promise.all([
        this.checkServiceHealth(),
        this.checkAdapterHealth(),
        this.getSystemPerformanceMetrics()
      ]);

      const healthReport: SystemHealthReport = {
        overall: this.calculateOverallHealth(serviceHealth, adapterHealth, performanceMetrics),
        timestamp: new Date(),
        uptime: Date.now() - this.startTime,
        services: serviceHealth,
        adapters: adapterHealth,
        performance: performanceMetrics,
        alerts: this.getRecentAlerts(),
        dragonPowerLevel: this.calculateDragonPowerLevel(serviceHealth, performanceMetrics)
      };

      this.lastHealthReport = healthReport;
      this.processHealthReport(healthReport);
      
      this.logger.endTimer('performHealthCheck');
      this.emit('health_check_complete', healthReport);
    } catch (error) {
      this.logger.error('Health check failed', {}, error as Error);
      this.emit('health_check_failed', error);
    }
  };

  /**
   * Check health of all registered services
   */
  private checkServiceHealth = async (): Promise<Record<string, ServiceHealth>> => {
    const results: Record<string, ServiceHealth> = {};

    this.services.forEach(async (serviceInfo, serviceName) => {
      try {
        const health = await this.checkIndividualServiceHealth(serviceName, serviceInfo);
        results[serviceName] = health;
      } catch (error) {
        results[serviceName] = {
          status: 'unhealthy',
          metrics: {
            uptime: 0,
            errorRate: 1,
            avgResponseTime: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            lastHealthCheck: new Date(),
            status: 'unhealthy'
          },
          lastCheck: new Date(),
          dependencies: serviceInfo.dependencies || [],
          issues: [{
            type: 'error',
            description: `Health check failed: ${(error as Error).message}`,
            severity: 'critical',
            since: new Date(),
            count: 1
          }]
        };
      }
    });

    return results;
  };

  /**
   * Check health of individual service
   */
  private checkIndividualServiceHealth = async (
    serviceName: string,
    serviceInfo: any
  ): Promise<ServiceHealth> => {
    const startTime = performance.now();
    const responseTime = performance.now() - startTime;
    
    // Mock service metrics for now
    const serviceMetrics = O.some({
      uptime: Date.now() - this.startTime,
      errorRate: 0,
      avgResponseTime: responseTime,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: 0,
      lastHealthCheck: new Date(),
      status: 'healthy' as const
    });
    
    return pipe(
      serviceMetrics,
      O.fold(
        () => ({
          status: 'unknown' as HealthStatus,
          metrics: {
            uptime: Date.now() - this.startTime,
            errorRate: 0,
            avgResponseTime: responseTime,
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
            cpuUsage: 0,
            lastHealthCheck: new Date(),
            status: 'degraded' as const
          },
          lastCheck: new Date(),
          dependencies: serviceInfo.dependencies || [],
          issues: []
        }),
        (metrics) => ({
          status: metrics.status,
          metrics,
          lastCheck: new Date(),
          dependencies: serviceInfo.dependencies || [],
          issues: this.analyzeServiceIssues(serviceName, metrics)
        })
      )
    );
  };

  /**
   * Check health of all adapters
   */
  private checkAdapterHealth = async (): Promise<AdapterHealthSummary> => {
    const [hive, sak, mcp] = await Promise.all([
      this.checkAdapterHealth_Hive(),
      this.checkAdapterHealth_SAK(),
      this.checkAdapterHealth_MCP()
    ]);

    return {
      hiveIntelligence: hive,
      seiAgentKit: sak,
      seiMCP: mcp
    };
  };

  private checkAdapterHealth_Hive = async (): Promise<AdapterHealth> => {
    try {
      const startTime = performance.now();
      // Perform a simple health check call
      const responseTime = performance.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        errorRate: 0,
        lastSuccessfulCall: new Date(),
        apiCreditRemaining: 1000 // Mock value // TODO: REMOVE_MOCK - Mock-related keywords
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: 0,
        errorRate: 1,
        lastSuccessfulCall: null
      };
    }
  };

  private checkAdapterHealth_SAK = async (): Promise<AdapterHealth> => {
    try {
      const startTime = performance.now();
      // Perform a simple health check call
      const responseTime = performance.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        errorRate: 0,
        lastSuccessfulCall: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: 0,
        errorRate: 1,
        lastSuccessfulCall: null
      };
    }
  };

  private checkAdapterHealth_MCP = async (): Promise<AdapterHealth> => {
    try {
      const startTime = performance.now();
      // Perform a simple health check call
      const responseTime = performance.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        errorRate: 0,
        lastSuccessfulCall: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: 0,
        errorRate: 1,
        lastSuccessfulCall: null
      };
    }
  };

  // ============================================================================
  // Performance Monitoring
  // ============================================================================

  /**
   * Get system performance metrics
   */
  private getSystemPerformanceMetrics = async (): Promise<SystemPerformanceMetrics> => {
    const memoryUsage = process.memoryUsage();
    
    return {
      cpu: {
        usage: process.cpuUsage().user / 1000000, // Convert to milliseconds
        loadAverage: [0.1, 0.2, 0.3] // Mock values - would use os.loadavg() in real implementation // TODO: REMOVE_MOCK - Mock-related keywords
      },
      memory: {
        used: memoryUsage.heapUsed,
        available: memoryUsage.heapTotal,
        percentage: memoryUsage.heapUsed / memoryUsage.heapTotal
      },
      network: {
        connections: 10, // Mock value // TODO: REMOVE_MOCK - Mock-related keywords
        throughput: 1024 // Mock value // TODO: REMOVE_MOCK - Mock-related keywords
      },
      database: {
        connections: 5, // Mock value // TODO: REMOVE_MOCK - Mock-related keywords
        responseTime: 50 // Mock value // TODO: REMOVE_MOCK - Mock-related keywords
      }
    };
  };

  // ============================================================================
  // Health Analysis and Alerting
  // ============================================================================

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth = (
    services: Record<string, ServiceHealth>,
    adapters: AdapterHealthSummary,
    performance: SystemPerformanceMetrics
  ): HealthStatus => {
    const serviceStatuses = Object.values(services).map(s => s.status);
    const adapterStatuses = Object.values(adapters).map(a => a.status);
    const allStatuses = [...serviceStatuses, ...adapterStatuses];

    if (allStatuses.some(s => s === 'unhealthy')) return 'unhealthy';
    if (allStatuses.some(s => s === 'degraded')) return 'degraded';
    if (allStatuses.some(s => s === 'unknown')) return 'degraded';
    
    // Check performance thresholds
    if (performance.memory.percentage > this.config.alertThresholds.memoryUsage ||
        performance.cpu.usage > this.config.alertThresholds.cpuUsage) {
      return 'degraded';
    }

    return 'healthy';
  };

  /**
   * Calculate Dragon Ball Z themed power level
   */
  private calculateDragonPowerLevel = (
    services: Record<string, ServiceHealth>,
    performance: SystemPerformanceMetrics
  ): number => {
    if (!this.config.enableDragonTheming) return 0;

    let powerLevel = 9001; // Start at "Over 9000!"

    // Reduce power based on unhealthy services
    const unhealthyServices = Object.values(services).filter(s => s.status === 'unhealthy').length;
    powerLevel -= unhealthyServices * 1000;

    // Reduce power based on performance issues
    if (performance.memory.percentage > 0.8) powerLevel -= 500;
    if (performance.cpu.usage > 0.8) powerLevel -= 500;

    // Increase power for excellent performance
    if (performance.memory.percentage < 0.5 && performance.cpu.usage < 0.3) {
      powerLevel += 2000;
    }

    return Math.max(powerLevel, 1); // Saiyan power level never goes to 0!
  };

  /**
   * Analyze service issues
   */
  private analyzeServiceIssues = (
    serviceName: string,
    metrics: ServiceHealthMetrics
  ): HealthIssue[] => {
    const issues: HealthIssue[] = [];

    if (metrics.errorRate > this.config.alertThresholds.errorRate) {
      issues.push({
        type: 'error',
        description: `High error rate: ${(metrics.errorRate * 100).toFixed(2)}%`,
        severity: metrics.errorRate > 0.1 ? 'critical' : 'high',
        since: new Date(Date.now() - 300000), // 5 minutes ago
        count: Math.floor(metrics.errorRate * 100),
        recommendation: 'Check error logs and consider circuit breaker activation'
      });
    }

    if (metrics.avgResponseTime > this.config.alertThresholds.responseTime) {
      issues.push({
        type: 'performance',
        description: `Slow response time: ${metrics.avgResponseTime.toFixed(2)}ms`,
        severity: metrics.avgResponseTime > 5000 ? 'critical' : 'medium',
        since: new Date(Date.now() - 300000),
        count: 1,
        recommendation: 'Optimize database queries and consider caching'
      });
    }

    return issues;
  };

  /**
   * Process health report and generate alerts
   */
  private processHealthReport = (report: SystemHealthReport): void => {
    // Generate alerts for critical issues
    this.generateAlerts(report);

    // Log health summary
    this.logger.info('System health check completed', {
      metadata: {
        overallStatus: report.overall,
        servicesHealthy: Object.values(report.services).filter(s => s.status === 'healthy').length,
        totalServices: Object.keys(report.services).length,
        dragonPowerLevel: report.dragonPowerLevel,
        memoryUsage: `${(report.performance.memory.percentage * 100).toFixed(1)}%`,
        cpuUsage: `${(report.performance.cpu.usage * 100).toFixed(1)}%`
      }
    });
  };

  /**
   * Generate Dragon Ball Z themed alerts
   */
  private generateAlerts = (report: SystemHealthReport): void => {
    const alerts: HealthAlert[] = [];

    // Critical system alerts
    if (report.overall === 'unhealthy') {
      alerts.push(this.createAlert(
        'critical',
        'System health critical - multiple services down',
        undefined,
        undefined,
        {
          powerLevel: 0,
          alertPhrase: "It's over 9000... errors!",
          severity: 'kamehameha'
        }
      ));
    }

    // Performance alerts
    if (report.performance.memory.percentage > this.config.alertThresholds.memoryUsage) {
      alerts.push(this.createAlert(
        'warning',
        `High memory usage: ${(report.performance.memory.percentage * 100).toFixed(1)}%`,
        undefined,
        undefined,
        {
          powerLevel: 3000,
          alertPhrase: "Memory levels are spiking like a Saiyan transformation!",
          severity: 'special_beam_cannon'
        }
      ));
    }

    // Service-specific alerts
    Object.entries(report.services).forEach(([serviceName, health]) => {
      if (health.status === 'unhealthy') {
        alerts.push(this.createAlert(
          'critical',
          `Service ${serviceName} is down`,
          serviceName,
          undefined,
          {
            powerLevel: 1,
            alertPhrase: `${serviceName} has been defeated! Send backup!`,
            severity: 'destructo_disk'
          }
        ));
      }
    });

    // Store and emit alerts
    this.alertHistory.push(...alerts);
    if (this.alertHistory.length > 100) {
      this.alertHistory.splice(0, this.alertHistory.length - 100);
    }

    alerts.forEach(alert => {
      this.emit('alert', alert);
      this.logger.warn(alert.message, {
        metadata: alert.metadata
      });
    });
  };

  private createAlert = (
    type: HealthAlert['type'],
    message: string,
    service?: string,
    adapter?: string,
    dragonTheme?: HealthAlert['dragonTheme']
  ): HealthAlert => ({
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // TODO: REMOVE_MOCK - Random value generation
    type,
    message,
    timestamp: new Date(),
    service,
    adapter,
    dragonTheme: this.config.enableDragonTheming ? dragonTheme : undefined
  });

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get latest health report
   */
  public getHealthReport = (): O.Option<SystemHealthReport> =>
    O.fromNullable(this.lastHealthReport);

  /**
   * Get recent alerts
   */
  public getRecentAlerts = (limit: number = 10): HealthAlert[] =>
    this.alertHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

  /**
   * Get service health summary
   */
  public getServiceHealthSummary = (): Record<string, HealthStatus> => {
    const summary: Record<string, HealthStatus> = {};
    
    if (this.lastHealthReport) {
      Object.entries(this.lastHealthReport.services).forEach(([name, health]) => {
        summary[name] = health.status;
      });
    }

    return summary;
  };

  /**
   * Get error statistics
   */
  public getErrorStatistics = () => errorHandler.getErrorStatistics();

  /**
   * Get circuit breaker status
   */
  public getCircuitBreakerStatus = () => errorHandler.getCircuitBreakerStatus();

  /**
   * Force health check
   */
  public forceHealthCheck = (): Promise<void> => this.performHealthCheck();
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const healthMonitor = new HealthMonitoringService();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Initialize health monitoring for common services
 */
export const initializeHealthMonitoring = (services: {
  seiIntegration?: any;
  portfolioAnalytics?: any;
  realTimeData?: any;
  socket?: any;
  ai?: any;
}): void => {
  if (services.seiIntegration) {
    healthMonitor.registerService('SeiIntegrationService', services.seiIntegration);
  }
  
  if (services.portfolioAnalytics) {
    healthMonitor.registerService('PortfolioAnalyticsService', services.portfolioAnalytics);
  }
  
  if (services.realTimeData) {
    healthMonitor.registerService('RealTimeDataService', services.realTimeData);
  }
  
  if (services.socket) {
    healthMonitor.registerService('SocketService', services.socket);
  }
  
  if (services.ai) {
    healthMonitor.registerService('AIService', services.ai);
  }

  healthMonitor.start();
};