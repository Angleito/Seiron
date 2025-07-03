/**
 * Metrics Collector for Integration Tests
 * Collects and analyzes performance metrics during test execution
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface TestMetric {
  timestamp: number;
  testName: string;
  metricType: string;
  value: number;
  unit: string;
  metadata?: Record<string, any>;
}

export interface PerformanceSummary {
  testName: string;
  totalTests: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  errorRate: number;
  totalDuration: number;
}

export class MetricsCollector {
  private metrics: TestMetric[] = [];
  private currentTest?: string;
  private testStartTime?: number;
  private outputDir: string;
  private protocolName: string;

  constructor(protocolName: string, outputDir: string = './test-results') {
    this.protocolName = protocolName;
    this.outputDir = outputDir;
    
    // Ensure output directory exists
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  startTest(testName?: string): void {
    this.currentTest = testName || 'unknown';
    this.testStartTime = Date.now();
  }

  endTest(): void {
    if (this.testStartTime && this.currentTest) {
      const duration = Date.now() - this.testStartTime;
      this.recordValue('testDuration', duration, 'ms');
    }
    this.currentTest = undefined;
    this.testStartTime = undefined;
  }

  recordLatency(operation: string, latency: number, metadata?: Record<string, any>): void {
    this.recordMetric({
      timestamp: Date.now(),
      testName: this.currentTest || 'unknown',
      metricType: `${operation}_latency`,
      value: latency,
      unit: 'ms',
      metadata
    });
  }

  recordThroughput(operation: string, operations: number, duration: number, metadata?: Record<string, any>): void {
    const throughput = operations / (duration / 1000); // ops per second
    this.recordMetric({
      timestamp: Date.now(),
      testName: this.currentTest || 'unknown',
      metricType: `${operation}_throughput`,
      value: throughput,
      unit: 'ops/sec',
      metadata
    });
  }

  recordValue(metricType: string, value: number, unit: string = 'count', metadata?: Record<string, any>): void {
    this.recordMetric({
      timestamp: Date.now(),
      testName: this.currentTest || 'unknown',
      metricType,
      value,
      unit,
      metadata
    });
  }

  recordError(operation: string, error: Error, metadata?: Record<string, any>): void {
    this.recordMetric({
      timestamp: Date.now(),
      testName: this.currentTest || 'unknown',
      metricType: `${operation}_error`,
      value: 1,
      unit: 'count',
      metadata: {
        ...metadata,
        errorMessage: error.message,
        errorType: error.constructor.name
      }
    });
  }

  recordSuccess(operation: string, metadata?: Record<string, any>): void {
    this.recordMetric({
      timestamp: Date.now(),
      testName: this.currentTest || 'unknown',
      metricType: `${operation}_success`,
      value: 1,
      unit: 'count',
      metadata
    });
  }

  private recordMetric(metric: TestMetric): void {
    this.metrics.push(metric);
    
    // Also write to CSV for real-time monitoring
    this.writeMetricToCsv(metric);
  }

  private writeMetricToCsv(metric: TestMetric): void {
    const csvFile = join(this.outputDir, `${this.protocolName}_metrics.csv`);
    const csvLine = `${metric.timestamp},${metric.testName},${metric.metricType},${metric.value},${metric.unit},"${JSON.stringify(metric.metadata || {})}"\n`;
    
    // Write header if file doesn't exist
    if (!existsSync(csvFile)) {
      const header = 'timestamp,testName,metricType,value,unit,metadata\n';
      writeFileSync(csvFile, header);
    }
    
    appendFileSync(csvFile, csvLine);
  }

  getMetrics(filter?: Partial<TestMetric>): TestMetric[] {
    if (!filter) {
      return [...this.metrics];
    }
    
    return this.metrics.filter(metric => {
      return Object.entries(filter).every(([key, value]) => {
        return metric[key as keyof TestMetric] === value;
      });
    });
  }

  getLatencyMetrics(operation: string): number[] {
    return this.metrics
      .filter(m => m.metricType === `${operation}_latency`)
      .map(m => m.value)
      .sort((a, b) => a - b);
  }

  calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }

  calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  getOperationSummary(operation: string): {
    totalOperations: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
  } {
    const latencyMetrics = this.getLatencyMetrics(operation);
    const successMetrics = this.getMetrics({ metricType: `${operation}_success` });
    const errorMetrics = this.getMetrics({ metricType: `${operation}_error` });
    
    const successCount = successMetrics.reduce((sum, m) => sum + m.value, 0);
    const errorCount = errorMetrics.reduce((sum, m) => sum + m.value, 0);
    const totalOperations = successCount + errorCount;
    
    return {
      totalOperations,
      successCount,
      errorCount,
      successRate: totalOperations > 0 ? successCount / totalOperations : 0,
      averageLatency: this.calculateAverage(latencyMetrics),
      p95Latency: this.calculatePercentile(latencyMetrics, 95),
      p99Latency: this.calculatePercentile(latencyMetrics, 99)
    };
  }

  generateTestSummary(): PerformanceSummary[] {
    const testNames = [...new Set(this.metrics.map(m => m.testName))];
    
    return testNames.map(testName => {
      const testMetrics = this.getMetrics({ testName });
      const latencyValues = testMetrics
        .filter(m => m.metricType.includes('_latency'))
        .map(m => m.value);
      
      const durationMetrics = testMetrics.filter(m => m.metricType === 'testDuration');
      const totalDuration = durationMetrics.reduce((sum, m) => sum + m.value, 0);
      
      const errorMetrics = testMetrics.filter(m => m.metricType.includes('_error'));
      const successMetrics = testMetrics.filter(m => m.metricType.includes('_success'));
      
      const totalOperations = errorMetrics.length + successMetrics.length;
      const errorCount = errorMetrics.reduce((sum, m) => sum + m.value, 0);
      
      return {
        testName,
        totalTests: durationMetrics.length,
        averageLatency: this.calculateAverage(latencyValues),
        p95Latency: this.calculatePercentile(latencyValues, 95),
        p99Latency: this.calculatePercentile(latencyValues, 99),
        throughput: totalOperations > 0 ? totalOperations / (totalDuration / 1000) : 0,
        errorRate: totalOperations > 0 ? errorCount / totalOperations : 0,
        totalDuration
      };
    });
  }

  exportMetrics(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Export raw metrics as JSON
    const jsonFile = join(this.outputDir, `${this.protocolName}_metrics_${timestamp}.json`);
    writeFileSync(jsonFile, JSON.stringify(this.metrics, null, 2));
    
    // Export summary report
    const summary = this.generateTestSummary();
    const summaryFile = join(this.outputDir, `${this.protocolName}_summary_${timestamp}.json`);
    writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    // Export performance report
    this.generatePerformanceReport(timestamp);
    
    console.log(`Metrics exported to ${this.outputDir}`);
  }

  private generatePerformanceReport(timestamp: string): void {
    const summary = this.generateTestSummary();
    const reportFile = join(this.outputDir, `${this.protocolName}_report_${timestamp}.md`);
    
    let report = `# ${this.protocolName.toUpperCase()} Protocol Performance Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += `## Summary\n\n`;
    report += `| Test | Duration (ms) | Avg Latency (ms) | P95 Latency (ms) | P99 Latency (ms) | Throughput (ops/sec) | Error Rate |\n`;
    report += `|------|---------------|------------------|------------------|------------------|---------------------|------------|\n`;
    
    summary.forEach(test => {
      report += `| ${test.testName} | ${test.totalDuration.toFixed(0)} | ${test.averageLatency.toFixed(2)} | ${test.p95Latency.toFixed(2)} | ${test.p99Latency.toFixed(2)} | ${test.throughput.toFixed(2)} | ${(test.errorRate * 100).toFixed(2)}% |\n`;
    });
    
    report += `\n## Detailed Analysis\n\n`;
    
    // Add operation-specific analysis
    const operations = [...new Set(this.metrics.map(m => m.metricType.replace(/_latency|_success|_error|_throughput/, '')))];
    
    operations.forEach(operation => {
      const opSummary = this.getOperationSummary(operation);
      if (opSummary.totalOperations > 0) {
        report += `### ${operation}\n\n`;
        report += `- Total Operations: ${opSummary.totalOperations}\n`;
        report += `- Success Rate: ${(opSummary.successRate * 100).toFixed(2)}%\n`;
        report += `- Average Latency: ${opSummary.averageLatency.toFixed(2)}ms\n`;
        report += `- P95 Latency: ${opSummary.p95Latency.toFixed(2)}ms\n`;
        report += `- P99 Latency: ${opSummary.p99Latency.toFixed(2)}ms\n\n`;
      }
    });
    
    // Add recommendations
    report += `## Recommendations\n\n`;
    
    const overallP95 = this.calculatePercentile(
      this.metrics.filter(m => m.metricType.includes('_latency')).map(m => m.value),
      95
    );
    
    if (overallP95 > 400) {
      report += `- ⚠️  **High Latency**: P95 latency (${overallP95.toFixed(2)}ms) exceeds Sei block time (400ms)\n`;
    } else {
      report += `- ✅ **Latency**: P95 latency (${overallP95.toFixed(2)}ms) meets Sei block time requirements\n`;
    }
    
    const overallErrorRate = summary.reduce((sum, test) => sum + test.errorRate, 0) / summary.length;
    
    if (overallErrorRate > 0.05) {
      report += `- ⚠️  **Error Rate**: Overall error rate (${(overallErrorRate * 100).toFixed(2)}%) is high\n`;
    } else {
      report += `- ✅ **Reliability**: Low error rate (${(overallErrorRate * 100).toFixed(2)}%)\n`;
    }
    
    const avgThroughput = summary.reduce((sum, test) => sum + test.throughput, 0) / summary.length;
    
    if (avgThroughput < 10) {
      report += `- ⚠️  **Throughput**: Average throughput (${avgThroughput.toFixed(2)} ops/sec) may be insufficient for production load\n`;
    } else {
      report += `- ✅ **Throughput**: Good average throughput (${avgThroughput.toFixed(2)} ops/sec)\n`;
    }
    
    writeFileSync(reportFile, report);
  }

  clear(): void {
    this.metrics = [];
  }

  // Real-time monitoring methods
  getRealtimeStats(): {
    currentTest?: string;
    metricsCount: number;
    averageLatency: number;
    recentThroughput: number;
    recentErrorRate: number;
  } {
    const recentMetrics = this.metrics.filter(m => Date.now() - m.timestamp < 60000); // Last minute
    
    const latencyMetrics = recentMetrics.filter(m => m.metricType.includes('_latency'));
    const errorMetrics = recentMetrics.filter(m => m.metricType.includes('_error'));
    const successMetrics = recentMetrics.filter(m => m.metricType.includes('_success'));
    
    const totalOperations = errorMetrics.length + successMetrics.length;
    const errorCount = errorMetrics.reduce((sum, m) => sum + m.value, 0);
    
    return {
      currentTest: this.currentTest,
      metricsCount: this.metrics.length,
      averageLatency: this.calculateAverage(latencyMetrics.map(m => m.value)),
      recentThroughput: totalOperations,
      recentErrorRate: totalOperations > 0 ? errorCount / totalOperations : 0
    };
  }

  // Integration with external monitoring systems
  async sendToPrometheus(prometheusUrl: string): Promise<void> {
    // Convert metrics to Prometheus format and send
    // This would be implemented based on specific Prometheus setup
    console.log('Prometheus integration not implemented yet');
  }

  async sendToDatadog(datadogApiKey: string): Promise<void> {
    // Convert metrics to Datadog format and send
    // This would be implemented based on specific Datadog setup
    console.log('Datadog integration not implemented yet');
  }
}