/**
 * @fileoverview Performance Reporter for E2E Tests
 * Custom Jest reporter that tracks and analyzes E2E test performance metrics
 */

const fs = require('fs');
const path = require('path');

class PerformanceReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.testResults = [];
    this.startTime = Date.now();
    this.performanceMetrics = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalTime: 0,
      averageTestTime: 0,
      slowestTests: [],
      fastestTests: [],
      memoryUsage: [],
      errorsByType: {},
      conversationMetrics: {
        averageResponseTime: 0,
        totalConversations: 0,
        successRate: 0,
        memoryPersistenceRate: 0
      }
    };
  }

  onRunStart(aggregatedResults, options) {
    this.startTime = Date.now();
    console.log('\n🚀 Starting E2E Performance Monitoring...\n');
  }

  onTestStart(test) {
    test.startTime = Date.now();
    
    // Record memory usage at test start
    const memoryUsage = process.memoryUsage();
    this.performanceMetrics.memoryUsage.push({
      timestamp: new Date().toISOString(),
      phase: 'test_start',
      testPath: test.path,
      memory: memoryUsage
    });
  }

  onTestResult(test, testResult, aggregatedResults) {
    const endTime = Date.now();
    const testDuration = endTime - (test.startTime || endTime);
    
    // Update basic metrics
    this.performanceMetrics.totalTests++;
    
    if (testResult.numPassingTests > 0) {
      this.performanceMetrics.passedTests += testResult.numPassingTests;
    }
    
    if (testResult.numFailingTests > 0) {
      this.performanceMetrics.failedTests += testResult.numFailingTests;
    }
    
    if (testResult.numPendingTests > 0) {
      this.performanceMetrics.skippedTests += testResult.numPendingTests;
    }
    
    // Record test performance
    const testPerformance = {
      testPath: test.path,
      title: testResult.testResults.map(t => t.title).join(', '),
      duration: testDuration,
      status: testResult.numFailingTests > 0 ? 'failed' : 'passed',
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(testPerformance);
    
    // Track slowest and fastest tests
    this.updateTestSpeedMetrics(testPerformance);
    
    // Analyze errors
    if (testResult.numFailingTests > 0) {
      this.analyzeTestFailures(testResult);
    }
    
    // Extract conversation-specific metrics if available
    this.extractConversationMetrics(testResult);
    
    // Memory usage at test end
    const memoryUsage = process.memoryUsage();
    this.performanceMetrics.memoryUsage.push({
      timestamp: new Date().toISOString(),
      phase: 'test_end',
      testPath: test.path,
      memory: memoryUsage
    });
    
    // Log progress
    const progress = (this.performanceMetrics.totalTests / aggregatedResults.numTotalTestSuites) * 100;
    if (testDuration > 5000) { // Log slow tests
      console.log(`⚠️  Slow test: ${path.basename(test.path)} (${testDuration}ms)`);
    }
  }

  updateTestSpeedMetrics(testPerformance) {
    // Track slowest tests
    this.performanceMetrics.slowestTests.push(testPerformance);
    this.performanceMetrics.slowestTests.sort((a, b) => b.duration - a.duration);
    this.performanceMetrics.slowestTests = this.performanceMetrics.slowestTests.slice(0, 10);
    
    // Track fastest tests
    if (testPerformance.status === 'passed') {
      this.performanceMetrics.fastestTests.push(testPerformance);
      this.performanceMetrics.fastestTests.sort((a, b) => a.duration - b.duration);
      this.performanceMetrics.fastestTests = this.performanceMetrics.fastestTests.slice(0, 10);
    }
  }

  analyzeTestFailures(testResult) {
    testResult.testResults.forEach(test => {
      if (test.status === 'failed') {
        test.failureMessages.forEach(message => {
          // Categorize errors
          let errorType = 'unknown';
          
          if (message.includes('timeout') || message.includes('Timeout')) {
            errorType = 'timeout';
          } else if (message.includes('ECONNREFUSED') || message.includes('network')) {
            errorType = 'network';
          } else if (message.includes('memory') || message.includes('Memory')) {
            errorType = 'memory';
          } else if (message.includes('Expected') && message.includes('toBe')) {
            errorType = 'assertion';
          } else if (message.includes('Docker') || message.includes('docker')) {
            errorType = 'docker';
          }
          
          this.performanceMetrics.errorsByType[errorType] = 
            (this.performanceMetrics.errorsByType[errorType] || 0) + 1;
        });
      }
    });
  }

  extractConversationMetrics(testResult) {
    // Look for conversation-specific metrics in test output
    const output = testResult.console || [];
    
    output.forEach(log => {
      const message = log.message || '';
      
      // Extract response times
      const responseTimeMatch = message.match(/response.*?(\d+)ms/i);
      if (responseTimeMatch) {
        const responseTime = parseInt(responseTimeMatch[1]);
        this.performanceMetrics.conversationMetrics.averageResponseTime += responseTime;
        this.performanceMetrics.conversationMetrics.totalConversations++;
      }
      
      // Extract success rates
      const successMatch = message.match(/(\d+).*?successful/i);
      if (successMatch) {
        const successCount = parseInt(successMatch[1]);
        this.performanceMetrics.conversationMetrics.successRate += successCount;
      }
      
      // Extract memory persistence metrics
      const memoryMatch = message.match(/memory.*?persistence.*?(\d+)/i);
      if (memoryMatch) {
        const memoryMetric = parseInt(memoryMatch[1]);
        this.performanceMetrics.conversationMetrics.memoryPersistenceRate += memoryMetric;
      }
    });
  }

  onRunComplete(contexts, results) {
    const endTime = Date.now();
    this.performanceMetrics.totalTime = endTime - this.startTime;
    this.performanceMetrics.averageTestTime = 
      this.performanceMetrics.totalTime / this.performanceMetrics.totalTests;
    
    // Calculate conversation averages
    if (this.performanceMetrics.conversationMetrics.totalConversations > 0) {
      this.performanceMetrics.conversationMetrics.averageResponseTime /= 
        this.performanceMetrics.conversationMetrics.totalConversations;
    }
    
    // Generate performance report
    this.generatePerformanceReport();
    
    // Print summary
    this.printPerformanceSummary();
  }

  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.performanceMetrics.totalTests,
        passedTests: this.performanceMetrics.passedTests,
        failedTests: this.performanceMetrics.failedTests,
        skippedTests: this.performanceMetrics.skippedTests,
        successRate: this.performanceMetrics.passedTests / this.performanceMetrics.totalTests,
        totalTime: this.performanceMetrics.totalTime,
        averageTestTime: this.performanceMetrics.averageTestTime
      },
      performance: {
        slowestTests: this.performanceMetrics.slowestTests.slice(0, 5),
        fastestTests: this.performanceMetrics.fastestTests.slice(0, 5),
        averageResponseTime: this.performanceMetrics.conversationMetrics.averageResponseTime,
        memoryUsagePeak: this.calculatePeakMemoryUsage(),
        memoryUsageAverage: this.calculateAverageMemoryUsage()
      },
      errors: {
        errorsByType: this.performanceMetrics.errorsByType,
        totalErrors: Object.values(this.performanceMetrics.errorsByType).reduce((a, b) => a + b, 0)
      },
      conversation: this.performanceMetrics.conversationMetrics,
      thresholds: {
        responseTimeThreshold: 2000,
        memoryThreshold: 512 * 1024 * 1024,
        successRateThreshold: 0.95
      },
      recommendations: this.generateRecommendations(),
      detailedResults: this.testResults
    };
    
    // Save to file
    const outputPath = this.options.outputFile || path.join(process.cwd(), 'test-results/e2e/performance.json');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Performance report saved to: ${outputPath}`);
  }

  calculatePeakMemoryUsage() {
    if (this.performanceMetrics.memoryUsage.length === 0) return 0;
    
    return Math.max(...this.performanceMetrics.memoryUsage.map(m => m.memory.heapUsed));
  }

  calculateAverageMemoryUsage() {
    if (this.performanceMetrics.memoryUsage.length === 0) return 0;
    
    const totalMemory = this.performanceMetrics.memoryUsage.reduce((sum, m) => sum + m.memory.heapUsed, 0);
    return totalMemory / this.performanceMetrics.memoryUsage.length;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Performance recommendations
    if (this.performanceMetrics.averageTestTime > 10000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Average test time is high. Consider optimizing test setup or splitting large tests.'
      });
    }
    
    // Memory recommendations
    const peakMemory = this.calculatePeakMemoryUsage();
    if (peakMemory > 512 * 1024 * 1024) { // 512MB
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        message: 'Peak memory usage is high. Check for memory leaks or optimize data structures.'
      });
    }
    
    // Error recommendations
    const timeoutErrors = this.performanceMetrics.errorsByType.timeout || 0;
    if (timeoutErrors > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: `${timeoutErrors} timeout errors detected. Consider increasing timeouts or optimizing slow operations.`
      });
    }
    
    // Docker recommendations
    const dockerErrors = this.performanceMetrics.errorsByType.docker || 0;
    if (dockerErrors > 0) {
      recommendations.push({
        type: 'infrastructure',
        priority: 'high',
        message: `${dockerErrors} Docker-related errors. Check Docker setup and resource allocation.`
      });
    }
    
    // Conversation recommendations
    if (this.performanceMetrics.conversationMetrics.averageResponseTime > 2000) {
      recommendations.push({
        type: 'conversation',
        priority: 'medium',
        message: 'Conversation response time is slow. Optimize NLP processing or caching.'
      });
    }
    
    return recommendations;
  }

  printPerformanceSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 E2E PERFORMANCE SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Test Results:`);
    console.log(`   Total Tests: ${this.performanceMetrics.totalTests}`);
    console.log(`   Passed: ${this.performanceMetrics.passedTests} (${((this.performanceMetrics.passedTests/this.performanceMetrics.totalTests)*100).toFixed(1)}%)`);
    console.log(`   Failed: ${this.performanceMetrics.failedTests}`);
    console.log(`   Skipped: ${this.performanceMetrics.skippedTests}`);
    
    console.log(`\n⏱️  Timing:`);
    console.log(`   Total Time: ${(this.performanceMetrics.totalTime/1000).toFixed(2)}s`);
    console.log(`   Average Test Time: ${(this.performanceMetrics.averageTestTime/1000).toFixed(2)}s`);
    
    if (this.performanceMetrics.slowestTests.length > 0) {
      const slowest = this.performanceMetrics.slowestTests[0];
      console.log(`   Slowest Test: ${path.basename(slowest.testPath)} (${(slowest.duration/1000).toFixed(2)}s)`);
    }
    
    console.log(`\n💬 Conversation Metrics:`);
    console.log(`   Average Response Time: ${this.performanceMetrics.conversationMetrics.averageResponseTime.toFixed(0)}ms`);
    console.log(`   Total Conversations: ${this.performanceMetrics.conversationMetrics.totalConversations}`);
    
    console.log(`\n💾 Memory Usage:`);
    console.log(`   Peak Memory: ${(this.calculatePeakMemoryUsage()/1024/1024).toFixed(2)}MB`);
    console.log(`   Average Memory: ${(this.calculateAverageMemoryUsage()/1024/1024).toFixed(2)}MB`);
    
    if (Object.keys(this.performanceMetrics.errorsByType).length > 0) {
      console.log(`\n❌ Errors by Type:`);
      Object.entries(this.performanceMetrics.errorsByType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

module.exports = PerformanceReporter;