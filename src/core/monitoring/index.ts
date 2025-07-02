/**
 * Performance Monitoring System - Export Module
 * Real-time metrics collection, memory tracking, and bottleneck detection
 */

export { PerformanceMonitor } from './PerformanceMonitor';
export * from './types';

// Default monitoring configuration for DeFi applications
export const DEFAULT_MONITORING_CONFIG = {
  enabled: true,
  collectInterval: 5000, // 5 seconds
  retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  alerts: {
    enabled: true,
    rules: [
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage',
        metric: 'system.cpu.usage',
        condition: {
          operator: 'gt' as const,
          aggregation: 'avg' as const,
          timeWindow: 300000, // 5 minutes
          samples: 5
        },
        threshold: 80,
        severity: 'HIGH' as const,
        enabled: true,
        cooldownPeriod: 300000, // 5 minutes
        description: 'CPU usage is consistently above 80%'
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        metric: 'system.memory.usage',
        condition: {
          operator: 'gt' as const,
          aggregation: 'avg' as const,
          timeWindow: 300000, // 5 minutes
          samples: 5
        },
        threshold: 85,
        severity: 'HIGH' as const,
        enabled: true,
        cooldownPeriod: 300000,
        description: 'Memory usage is consistently above 85%'
      },
      {
        id: 'high_response_time',
        name: 'High Response Time',
        metric: 'application.requests.averageResponseTime',
        condition: {
          operator: 'gt' as const,
          aggregation: 'avg' as const,
          timeWindow: 180000, // 3 minutes
          samples: 3
        },
        threshold: 1000, // 1 second
        severity: 'MEDIUM' as const,
        enabled: true,
        cooldownPeriod: 180000,
        description: 'Average response time is above 1 second'
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        metric: 'application.requests.failed',
        condition: {
          operator: 'gt' as const,
          aggregation: 'sum' as const,
          timeWindow: 300000, // 5 minutes
          samples: 10
        },
        threshold: 50, // 50 errors in 5 minutes
        severity: 'CRITICAL' as const,
        enabled: true,
        cooldownPeriod: 300000,
        description: 'Error rate is above acceptable threshold'
      }
    ],
    notification: {
      // Configure webhook, email, or Slack notifications
    }
  },
  profiling: {
    enabled: true,
    samplingRate: 0.1, // 10% sampling
    maxProfileSize: 1000 // Max 1000 profile entries
  },
  bottleneckDetection: {
    enabled: true,
    analysisInterval: 60000, // 1 minute
    thresholds: {
      cpuUsage: 75,
      memoryUsage: 80,
      responseTime: 2000, // 2 seconds
      errorRate: 5 // 5%
    }
  },
  metrics: {
    customMetrics: true,
    systemMetrics: true,
    applicationMetrics: true,
    exportInterval: 30000 // 30 seconds
  }
};

// Utility functions for common monitoring tasks
export const createPerformanceTimer = () => {
  const start = Date.now();
  return {
    end: () => Date.now() - start,
    endAndRecord: (monitor: PerformanceMonitor, metricName: string) => {
      const duration = Date.now() - start;
      monitor.recordMetric(metricName, duration, 'ms');
      return duration;
    }
  };
};

export const withPerformanceTracking = <T extends any[], R>(
  monitor: PerformanceMonitor,
  metricName: string,
  fn: (...args: T) => R
) => {
  return (...args: T): R => {
    const timer = createPerformanceTimer();
    try {
      const result = fn(...args);
      timer.endAndRecord(monitor, metricName);
      return result;
    } catch (error) {
      timer.endAndRecord(monitor, `${metricName}_error`);
      throw error;
    }
  };
};

export const withAsyncPerformanceTracking = <T extends any[], R>(
  monitor: PerformanceMonitor,
  metricName: string,
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    const timer = createPerformanceTimer();
    try {
      const result = await fn(...args);
      timer.endAndRecord(monitor, metricName);
      return result;
    } catch (error) {
      timer.endAndRecord(monitor, `${metricName}_error`);
      throw error;
    }
  };
};