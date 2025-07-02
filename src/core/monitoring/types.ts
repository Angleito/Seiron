/**
 * Performance Monitoring System Types
 * Real-time metrics collection and bottleneck detection
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    used: number;
    free: number;
    total: number;
    heap: {
      used: number;
      total: number;
      limit: number;
    };
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connectionsActive: number;
    requestsPerSecond: number;
  };
  disk: {
    usage: number;
    available: number;
    reads: number;
    writes: number;
  };
}

export interface ApplicationMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
  database: {
    connections: number;
    queriesPerSecond: number;
    averageQueryTime: number;
    slowQueries: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictions: number;
    size: number;
    memoryUsage: number;
  };
  blockchain: {
    blockHeight: number;
    transactionsPerSecond: number;
    gasUsage: number;
    confirmationTime: number;
  };
}

export interface PerformanceAlert {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  tags?: Record<string, string>;
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AlertType {
  THRESHOLD = 'THRESHOLD',
  ANOMALY = 'ANOMALY',
  TREND = 'TREND',
  HEARTBEAT = 'HEARTBEAT'
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownPeriod: number;
  lastTriggered?: number;
  description?: string;
}

export interface AlertCondition {
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  timeWindow?: number; // in milliseconds
  samples?: number;
}

export interface Bottleneck {
  id: string;
  component: string;
  severity: number; // 0-100
  impact: string;
  rootCause: string;
  recommendation: string;
  detectedAt: number;
  metrics: Record<string, number>;
  frequency: number;
}

export interface ProfileData {
  function: string;
  file: string;
  line: number;
  selfTime: number;
  totalTime: number;
  calls: number;
  avgTime: number;
  percentage: number;
}

export interface HotPath {
  path: string;
  frequency: number;
  averageLatency: number;
  totalLatency: number;
  samples: number;
  bottlenecks: string[];
}

export interface MonitoringConfig {
  enabled: boolean;
  collectInterval: number;
  retentionPeriod: number;
  alerts: {
    enabled: boolean;
    rules: AlertRule[];
    notification: {
      webhook?: string;
      email?: string[];
      slack?: string;
    };
  };
  profiling: {
    enabled: boolean;
    samplingRate: number;
    maxProfileSize: number;
  };
  bottleneckDetection: {
    enabled: boolean;
    analysisInterval: number;
    thresholds: {
      cpuUsage: number;
      memoryUsage: number;
      responseTime: number;
      errorRate: number;
    };
  };
  metrics: {
    customMetrics: boolean;
    systemMetrics: boolean;
    applicationMetrics: boolean;
    exportInterval: number;
  };
}

export interface MetricSnapshot {
  timestamp: number;
  system: SystemMetrics;
  application: ApplicationMetrics;
  custom: Record<string, number>;
}

export interface PerformanceReport {
  summary: {
    period: { start: number; end: number };
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  trends: {
    metric: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    changeRate: number;
  }[];
  bottlenecks: Bottleneck[];
  recommendations: string[];
  alerts: PerformanceAlert[];
}

export interface QueryPerformance {
  query: string;
  executionTime: number;
  frequency: number;
  averageTime: number;
  maxTime: number;
  lastExecuted: number;
  optimizationSuggestions?: string[];
}

export interface ResourceUsage {
  component: string;
  cpu: number;
  memory: number;
  network: number;
  disk: number;
  timestamp: number;
}