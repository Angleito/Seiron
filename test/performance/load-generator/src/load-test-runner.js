/**
 * Load Test Runner for Sei Agent Kit
 * Implements various load testing patterns optimized for DeFi protocols
 */

const autocannon = require('autocannon');
const WebSocket = require('ws');
const axios = require('axios');
const { performance } = require('perf_hooks');
const { EventEmitter } = require('events');
const uuid = require('uuid');
const _ = require('lodash');

const PerformanceMetrics = require('./performance-metrics');
const { generateTestData } = require('./test-data-generator');

class LoadTestRunner extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.metrics = new PerformanceMetrics(config);
    this.activeConnections = new Set();
    this.testResults = new Map();
  }

  /**
   * Run comprehensive load test
   */
  async runLoadTest(options) {
    const {
      scenario = 'mixed_workload',
      duration = 300,
      users = 100,
      rampUp = 60
    } = options;

    console.log(`Starting load test: ${scenario} (${users} users, ${duration}s)`);

    const testPlan = this.createTestPlan(scenario, users, duration, rampUp);
    const results = {
      scenario,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      successRate: 0,
      avgResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      throughput: 0,
      errors: [],
      memoryUsage: [],
      cpuUsage: [],
      networkMetrics: {},
      protocolMetrics: {},
      requestDistribution: {}
    };

    // Start monitoring
    const monitoringInterval = this.startResourceMonitoring(results);

    try {
      // Execute test plan phases
      for (const phase of testPlan.phases) {
        await this.executePhase(phase, results);
      }

      results.endTime = Date.now();
      results.duration = results.endTime - results.startTime;

      // Calculate final metrics
      this.calculateFinalMetrics(results);

      return results;

    } finally {
      clearInterval(monitoringInterval);
      await this.cleanup();
    }
  }

  /**
   * Run stress test with increasing load
   */
  async runStressTest(options) {
    const {
      maxUsers = 1000,
      duration = 180,
      steps = 10
    } = options;

    console.log(`Starting stress test: 1 to ${maxUsers} users in ${steps} steps`);

    const stepSize = Math.floor(maxUsers / steps);
    const results = {
      type: 'stress',
      startTime: Date.now(),
      endTime: null,
      steps: [],
      breakingPoint: null,
      degradationThreshold: 0.8 // 80% of baseline performance
    };

    let baselineMetrics = null;

    for (let step = 1; step <= steps; step++) {
      const users = step * stepSize;
      console.log(`Stress test step ${step}/${steps}: ${users} users`);

      const stepResult = await this.runLoadTest({
        scenario: 'stress_test',
        users,
        duration,
        rampUp: Math.min(30, duration / 4)
      });

      // Establish baseline from first step
      if (step === 1) {
        baselineMetrics = {
          avgResponseTime: stepResult.avgResponseTime,
          throughput: stepResult.throughput,
          successRate: stepResult.successRate
        };
      }

      // Check for performance degradation
      const performanceRatio = this.calculatePerformanceRatio(stepResult, baselineMetrics);
      
      if (performanceRatio < results.degradationThreshold && !results.breakingPoint) {
        results.breakingPoint = users;
      }

      results.steps.push({
        step,
        users,
        ...stepResult,
        performanceRatio
      });

      // Stop if system is failing
      if (stepResult.successRate < 0.5) {
        console.log(`System failure detected at ${users} users. Stopping stress test.`);
        break;
      }
    }

    results.endTime = Date.now();
    return results;
  }

  /**
   * Run endurance test for memory leaks and stability
   */
  async runEnduranceTest(options) {
    const {
      users = 100,
      duration = 7200, // 2 hours
      memoryThreshold = 1024 // MB
    } = options;

    console.log(`Starting endurance test: ${users} users for ${duration/3600} hours`);

    const results = {
      type: 'endurance',
      startTime: Date.now(),
      endTime: null,
      duration,
      memoryProfile: [],
      performanceProfile: [],
      memoryStable: true,
      performanceDegradation: 0,
      leakDetected: false
    };

    const samplingInterval = Math.max(60, duration / 1000); // Sample every minute or 1/1000 of duration
    let sampleCount = 0;
    let initialMemory = null;
    let initialPerformance = null;

    const enduranceMonitor = setInterval(async () => {
      const sample = await this.collectEnduranceSample();
      
      if (sampleCount === 0) {
        initialMemory = sample.memoryUsage;
        initialPerformance = sample.avgResponseTime;
      }

      results.memoryProfile.push(sample);
      
      // Check for memory leaks
      const memoryGrowth = (sample.memoryUsage - initialMemory) / initialMemory;
      if (memoryGrowth > 0.5) { // 50% memory growth
        results.leakDetected = true;
      }

      // Check for performance degradation
      const perfDegradation = (sample.avgResponseTime - initialPerformance) / initialPerformance;
      results.performanceDegradation = Math.max(results.performanceDegradation, perfDegradation);

      sampleCount++;
    }, samplingInterval * 1000);

    // Run continuous load
    try {
      await this.runContinuousLoad(users, duration);
    } finally {
      clearInterval(enduranceMonitor);
    }

    results.endTime = Date.now();
    results.memoryStable = !results.leakDetected && results.performanceDegradation < 0.2;

    return results;
  }

  /**
   * Run spike test with sudden load increases
   */
  async runSpikeTest(options) {
    const {
      baseline = 50,
      spike = 500,
      spikeDuration = 60,
      totalDuration = 600
    } = options;

    console.log(`Starting spike test: ${baseline} → ${spike} users`);

    const results = {
      type: 'spike',
      startTime: Date.now(),
      endTime: null,
      baseline: null,
      spike: null,
      recovery: null,
      recoveryTime: 0,
      stable: true
    };

    // Phase 1: Baseline load
    console.log('Phase 1: Baseline load');
    results.baseline = await this.runLoadTest({
      scenario: 'baseline',
      users: baseline,
      duration: 120,
      rampUp: 30
    });

    // Phase 2: Spike load
    console.log('Phase 2: Spike load');
    const spikeStart = performance.now();
    results.spike = await this.runLoadTest({
      scenario: 'spike',
      users: spike,
      duration: spikeDuration,
      rampUp: 5 // Quick ramp-up for spike
    });

    // Phase 3: Recovery monitoring
    console.log('Phase 3: Recovery monitoring');
    const recoveryStart = performance.now();
    let recovered = false;
    let recoveryAttempts = 0;
    const maxRecoveryTime = 300; // 5 minutes

    while (!recovered && recoveryAttempts < 10) {
      const recoveryTest = await this.runLoadTest({
        scenario: 'recovery',
        users: baseline,
        duration: 30,
        rampUp: 5
      });

      const responseTimeRatio = recoveryTest.avgResponseTime / results.baseline.avgResponseTime;
      const throughputRatio = recoveryTest.throughput / results.baseline.throughput;

      if (responseTimeRatio < 1.2 && throughputRatio > 0.8) {
        recovered = true;
        results.recovery = recoveryTest;
      }

      recoveryAttempts++;
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s between attempts
    }

    results.recoveryTime = (performance.now() - recoveryStart) / 1000;
    results.stable = recovered && results.recoveryTime < maxRecoveryTime;
    results.endTime = Date.now();

    return results;
  }

  /**
   * Run comprehensive benchmark suite
   */
  async runBenchmarkSuite(suite = 'comprehensive') {
    console.log(`Starting benchmark suite: ${suite}`);

    const benchmarks = {
      suite,
      startTime: Date.now(),
      endTime: null,
      results: {},
      summary: {}
    };

    const benchmarkTests = this.getBenchmarkTests(suite);

    for (const [testName, testConfig] of Object.entries(benchmarkTests)) {
      console.log(`Running benchmark: ${testName}`);
      
      const testResult = await this.runBenchmark(testName, testConfig);
      benchmarks.results[testName] = testResult;
    }

    benchmarks.endTime = Date.now();
    benchmarks.summary = this.calculateBenchmarkSummary(benchmarks.results);

    return benchmarks;
  }

  /**
   * Create test plan based on scenario
   */
  createTestPlan(scenario, users, duration, rampUp) {
    const scenarios = {
      mixed_workload: {
        phases: [
          { type: 'ramp_up', users: users, duration: rampUp },
          { type: 'sustained', users: users, duration: duration - rampUp - 30 },
          { type: 'ramp_down', users: 0, duration: 30 }
        ],
        operations: {
          swap: 0.4,
          liquidity: 0.2,
          lending: 0.2,
          portfolio: 0.2
        }
      },
      stress_test: {
        phases: [
          { type: 'ramp_up', users: users, duration: Math.min(30, duration / 4) },
          { type: 'sustained', users: users, duration: duration * 0.75 },
          { type: 'ramp_down', users: 0, duration: duration * 0.25 }
        ],
        operations: {
          swap: 0.6,
          liquidity: 0.15,
          lending: 0.15,
          portfolio: 0.1
        }
      },
      sei_optimized: {
        phases: [
          { type: 'ramp_up', users: users, duration: rampUp },
          { type: 'burst', users: users * 2, duration: 30 },
          { type: 'sustained', users: users, duration: duration - rampUp - 60 },
          { type: 'ramp_down', users: 0, duration: 30 }
        ],
        operations: {
          swap: 0.5,
          arbitrage: 0.2,
          liquidity: 0.2,
          portfolio: 0.1
        }
      }
    };

    return scenarios[scenario] || scenarios.mixed_workload;
  }

  /**
   * Execute a test phase
   */
  async executePhase(phase, results) {
    console.log(`Executing phase: ${phase.type} (${phase.users} users, ${phase.duration}s)`);

    const phaseResults = await autocannon({
      url: this.config.target.baseUrl,
      connections: Math.min(phase.users, 1000),
      duration: phase.duration,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.auth?.token || 'test-token'}`
      },
      body: JSON.stringify(generateTestData('mixed')),
      setupClient: this.setupClient.bind(this),
      onResponse: this.onResponse.bind(this)
    });

    // Aggregate results
    results.totalRequests += phaseResults.requests.total;
    results.successfulRequests += phaseResults.requests.total - phaseResults.errors;
    results.failedRequests += phaseResults.errors;
    
    // Update timing metrics
    if (phaseResults.latency) {
      results.avgResponseTime = this.weightedAverage(
        results.avgResponseTime,
        phaseResults.latency.mean,
        results.totalRequests - phaseResults.requests.total,
        phaseResults.requests.total
      );
      
      results.minResponseTime = Math.min(results.minResponseTime, phaseResults.latency.min);
      results.maxResponseTime = Math.max(results.maxResponseTime, phaseResults.latency.max);
      results.p50ResponseTime = phaseResults.latency.p50;
      results.p95ResponseTime = phaseResults.latency.p95;
      results.p99ResponseTime = phaseResults.latency.p99;
    }

    this.emit('phaseComplete', phase, phaseResults);
  }

  /**
   * Setup client for autocannon
   */
  setupClient(client) {
    // Configure client with Sei-specific optimizations
    client.setMaxListeners(0);
    
    // Add custom headers for protocol identification
    client.on('response', (statusCode, resHeaders, body) => {
      this.metrics.recordResponse(statusCode, body.length);
    });

    return client;
  }

  /**
   * Handle response callback
   */
  onResponse(client, statusCode, resHeaders, body) {
    const responseTime = performance.now() - client.startTime;
    
    this.metrics.recordLatency(responseTime);
    
    if (statusCode >= 400) {
      this.metrics.recordError(statusCode, body);
    }
  }

  /**
   * Start resource monitoring
   */
  startResourceMonitoring(results) {
    return setInterval(async () => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      results.memoryUsage.push({
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      });

      results.cpuUsage.push({
        timestamp: Date.now(),
        user: cpuUsage.user,
        system: cpuUsage.system
      });

      // Collect application-specific metrics
      try {
        const appMetrics = await this.collectApplicationMetrics();
        Object.assign(results.protocolMetrics, appMetrics);
      } catch (error) {
        // Continue if metrics collection fails
      }
    }, 5000); // Collect every 5 seconds
  }

  /**
   * Collect application-specific metrics
   */
  async collectApplicationMetrics() {
    try {
      const response = await axios.get(`${this.config.target.baseUrl}/metrics/performance`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      return {};
    }
  }

  /**
   * Collect endurance test sample
   */
  async collectEnduranceSample() {
    const testResult = await this.runLoadTest({
      scenario: 'endurance_sample',
      users: 10,
      duration: 30,
      rampUp: 5
    });

    return {
      timestamp: Date.now(),
      memoryUsage: process.memoryUsage().heapUsed,
      avgResponseTime: testResult.avgResponseTime,
      successRate: testResult.successRate,
      throughput: testResult.throughput
    };
  }

  /**
   * Run continuous load for endurance testing
   */
  async runContinuousLoad(users, duration) {
    const chunkDuration = 300; // 5-minute chunks
    const chunks = Math.ceil(duration / chunkDuration);

    for (let i = 0; i < chunks; i++) {
      const remainingDuration = Math.min(chunkDuration, duration - (i * chunkDuration));
      
      await this.runLoadTest({
        scenario: 'endurance_chunk',
        users,
        duration: remainingDuration,
        rampUp: 10
      });

      // Brief pause between chunks to allow garbage collection
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  /**
   * Run individual benchmark
   */
  async runBenchmark(testName, testConfig) {
    const result = await this.runLoadTest(testConfig);
    
    return {
      name: testName,
      score: this.calculateBenchmarkScore(result),
      performance: this.categorizeBenchmarkPerformance(result),
      metrics: {
        avgResponseTime: result.avgResponseTime,
        throughput: result.throughput,
        successRate: result.successRate,
        p95ResponseTime: result.p95ResponseTime
      }
    };
  }

  /**
   * Get benchmark test configurations
   */
  getBenchmarkTests(suite) {
    const tests = {
      basic: {
        'quick_response': { scenario: 'mixed_workload', users: 10, duration: 60, rampUp: 10 },
        'moderate_load': { scenario: 'mixed_workload', users: 50, duration: 120, rampUp: 20 }
      },
      comprehensive: {
        'light_load': { scenario: 'mixed_workload', users: 25, duration: 180, rampUp: 30 },
        'moderate_load': { scenario: 'mixed_workload', users: 100, duration: 300, rampUp: 60 },
        'heavy_load': { scenario: 'mixed_workload', users: 250, duration: 300, rampUp: 60 },
        'sei_optimized': { scenario: 'sei_optimized', users: 200, duration: 240, rampUp: 45 }
      },
      full: {
        'baseline': { scenario: 'mixed_workload', users: 10, duration: 120, rampUp: 20 },
        'light_load': { scenario: 'mixed_workload', users: 50, duration: 300, rampUp: 60 },
        'moderate_load': { scenario: 'mixed_workload', users: 150, duration: 300, rampUp: 60 },
        'heavy_load': { scenario: 'mixed_workload', users: 300, duration: 300, rampUp: 60 },
        'extreme_load': { scenario: 'mixed_workload', users: 500, duration: 300, rampUp: 60 },
        'sei_block_optimized': { scenario: 'sei_optimized', users: 200, duration: 300, rampUp: 45 },
        'protocol_stress': { scenario: 'stress_test', users: 400, duration: 180, rampUp: 30 }
      }
    };

    return tests[suite] || tests.comprehensive;
  }

  /**
   * Calculate performance ratio between two test results
   */
  calculatePerformanceRatio(current, baseline) {
    const responseTimeRatio = baseline.avgResponseTime / current.avgResponseTime;
    const throughputRatio = current.throughput / baseline.throughput;
    const successRateRatio = current.successRate / baseline.successRate;

    // Weighted average: response time (40%), throughput (40%), success rate (20%)
    return (responseTimeRatio * 0.4) + (throughputRatio * 0.4) + (successRateRatio * 0.2);
  }

  /**
   * Calculate final metrics
   */
  calculateFinalMetrics(results) {
    results.successRate = results.successfulRequests / results.totalRequests;
    results.throughput = results.totalRequests / (results.duration / 1000);
    
    if (results.minResponseTime === Infinity) {
      results.minResponseTime = 0;
    }
  }

  /**
   * Calculate weighted average
   */
  weightedAverage(currentAvg, newValue, currentCount, newCount) {
    const totalCount = currentCount + newCount;
    return ((currentAvg * currentCount) + (newValue * newCount)) / totalCount;
  }

  /**
   * Calculate benchmark score
   */
  calculateBenchmarkScore(result) {
    // Sei Network optimized scoring
    const responseTimeScore = Math.max(0, 1000 - result.avgResponseTime) / 10; // Lower is better
    const throughputScore = result.throughput; // Higher is better
    const reliabilityScore = result.successRate * 100; // Higher is better
    
    // Weighted score: response time (30%), throughput (40%), reliability (30%)
    return (responseTimeScore * 0.3) + (throughputScore * 0.4) + (reliabilityScore * 0.3);
  }

  /**
   * Categorize benchmark performance
   */
  categorizeBenchmarkPerformance(result) {
    const score = this.calculateBenchmarkScore(result);
    
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Critical';
  }

  /**
   * Calculate benchmark summary
   */
  calculateBenchmarkSummary(results) {
    const scores = Object.values(results).map(r => r.score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    return {
      overallScore: avgScore,
      performance: this.categorizeBenchmarkPerformance({ 
        avgResponseTime: 0, 
        throughput: 0, 
        successRate: avgScore / 100 
      }),
      testCount: scores.length,
      bestTest: Object.entries(results).reduce((best, [name, result]) => 
        result.score > best.score ? { name, score: result.score } : best,
        { name: '', score: 0 }
      ),
      worstTest: Object.entries(results).reduce((worst, [name, result]) => 
        result.score < worst.score ? { name, score: result.score } : worst,
        { name: '', score: Infinity }
      )
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    // Close any active WebSocket connections
    for (const connection of this.activeConnections) {
      if (connection.readyState === WebSocket.OPEN) {
        connection.close();
      }
    }
    this.activeConnections.clear();

    // Clear any pending intervals
    this.emit('cleanup');
  }
}

module.exports = LoadTestRunner;