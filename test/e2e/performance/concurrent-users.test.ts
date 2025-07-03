/**
 * @fileoverview Concurrent Users and Load Testing E2E Tests
 * Tests system performance under concurrent user load and stress scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import * as fc from 'fast-check';
import { 
  E2E_CONFIG, 
  TestUtils, 
  TestAssertions, 
  MockDataGenerators,
  DockerUtils 
} from '../setup';
import { ConversationSimulator, ConversationResult } from '../simulation/conversation-simulator';
import { PropertyGenerators } from '../utils/property-generators';

// Performance monitoring utilities
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private startTime: number = 0;
  
  start(): void {
    this.startTime = Date.now();
    this.metrics = [];
  }
  
  recordMetric(name: string, value: number, unit: string = 'ms'): void {
    this.metrics.push({
      name,
      value,
      unit,
      timestamp: Date.now() - this.startTime
    });
  }
  
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
  
  getAverageMetric(name: string): number {
    const relevantMetrics = this.metrics.filter(m => m.name === name);
    if (relevantMetrics.length === 0) return 0;
    
    return relevantMetrics.reduce((sum, m) => sum + m.value, 0) / relevantMetrics.length;
  }
  
  getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

interface LoadTestResult {
  totalUsers: number;
  duration: number;
  completedConversations: number;
  failedConversations: number;
  averageResponseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: {
    peak: number;
    average: number;
  };
  responseTimePercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
}

interface StressTestConfig {
  concurrentUsers: number;
  duration: number;
  rampUpTime: number;
  conversationsPerUser: number;
  scenarioTypes: string[];
}

describe('Concurrent Users and Load Testing E2E Tests', () => {
  let simulator: ConversationSimulator;
  let monitor: PerformanceMonitor;
  let dockerAvailable: boolean;
  
  beforeAll(async () => {
    simulator = new ConversationSimulator(E2E_CONFIG.API_BASE_URL);
    monitor = new PerformanceMonitor();
    dockerAvailable = await DockerUtils.isDockerRunning();
    
    if (dockerAvailable) {
      await DockerUtils.waitForService(`${E2E_CONFIG.API_BASE_URL}/health`);
    }
  });
  
  describe('Basic Concurrent User Testing', () => {
    it('should handle 10 concurrent users performing simple operations', async () => {
      const userCount = 10;
      const duration = 30000; // 30 seconds
      
      monitor.start();
      
      const scenario = () => ({
        id: 'simple_operations',
        name: 'Simple DeFi Operations',
        turns: [
          { input: 'Show my portfolio', expectedIntent: 'portfolio' },
          { input: 'Lend 100 USDC', expectedIntent: 'lending' },
          { input: 'What are the current rates?', expectedIntent: 'rates' }
        ]
      });
      
      const startTime = Date.now();
      const result = await simulator.simulateConcurrentUsers(userCount, duration, scenario);
      const endTime = Date.now();
      
      const conversations = TestAssertions.expectEither(result);
      
      // Basic validation
      expect(conversations.length).toBeGreaterThan(0);
      expect(conversations.length).toBeLessThanOrEqual(userCount);
      
      // Performance validation
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(duration + 10000); // Allow 10s buffer
      
      // Success rate validation
      const successfulConversations = conversations.filter(c => c.success);
      const successRate = successfulConversations.length / conversations.length;
      
      expect(successRate).toBeGreaterThanOrEqual(0.8); // 80% success rate minimum
      
      // Response time validation
      const responseTimes = conversations.flatMap(c => 
        c.turns.map(t => t.responseTime)
      );
      
      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(averageResponseTime).toBeLessThan(E2E_CONFIG.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_MS);
      
      // Memory usage validation
      const memoryUsage = monitor.getMemoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(E2E_CONFIG.PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB * 1024 * 1024);
      
      console.log(`Concurrent test results:
        Users: ${userCount}
        Conversations: ${conversations.length}
        Success Rate: ${(successRate * 100).toFixed(1)}%
        Avg Response Time: ${averageResponseTime.toFixed(0)}ms
        Memory Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
    });
    
    it('should maintain performance with increasing concurrent users', async () => {
      const userCounts = [5, 10, 20];
      const results: Array<{ userCount: number; metrics: any }> = [];
      
      for (const userCount of userCounts) {
        monitor.start();
        
        const scenario = () => fc.sample(PropertyGenerators.Conversation.conversationScenario(), 1)[0];
        
        const startTime = Date.now();
        const result = await simulator.simulateConcurrentUsers(userCount, 20000, scenario);
        const endTime = Date.now();
        
        const conversations = TestAssertions.expectEither(result);
        
        const responseTimes = conversations.flatMap(c => c.turns.map(t => t.responseTime));
        const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const successRate = conversations.filter(c => c.success).length / conversations.length;
        
        results.push({
          userCount,
          metrics: {
            averageResponseTime,
            successRate,
            throughput: conversations.length / ((endTime - startTime) / 1000),
            memoryUsage: monitor.getMemoryUsage().heapUsed
          }
        });
        
        // Brief pause between tests
        await TestUtils.waitFor(2000)();
      }
      
      // Validate that performance doesn't degrade significantly
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];
        
        // Response time shouldn't increase by more than 50%
        const responseTimeIncrease = curr.metrics.averageResponseTime / prev.metrics.averageResponseTime;
        expect(responseTimeIncrease).toBeLessThan(1.5);
        
        // Success rate shouldn't drop by more than 10%
        const successRateDecrease = prev.metrics.successRate - curr.metrics.successRate;
        expect(successRateDecrease).toBeLessThan(0.1);
        
        console.log(`Performance scaling:
          ${prev.userCount} → ${curr.userCount} users
          Response Time: ${prev.metrics.averageResponseTime.toFixed(0)}ms → ${curr.metrics.averageResponseTime.toFixed(0)}ms
          Success Rate: ${(prev.metrics.successRate * 100).toFixed(1)}% → ${(curr.metrics.successRate * 100).toFixed(1)}%`);
      }
    });
  });
  
  describe('Load Testing Scenarios', () => {
    it('should handle sustained load test', async () => {
      const loadConfig = {
        maxConcurrentUsers: E2E_CONFIG.E2E_CONCURRENT_USERS,
        rampUpTime: 30000, // 30 seconds
        duration: E2E_CONFIG.E2E_LOAD_DURATION,
        scenarioTypes: ['lending', 'swapping', 'portfolio_check']
      };
      
      monitor.start();
      
      const result = await simulator.simulateLoadTest(loadConfig);
      const loadTestResult = TestAssertions.expectEither(result);
      
      // Validate load test results
      expect(loadTestResult.totalConversations).toBeGreaterThan(0);
      expect(loadTestResult.throughput).toBeGreaterThan(0);
      expect(loadTestResult.errorRate).toBeLessThan(E2E_CONFIG.PERFORMANCE_THRESHOLDS.ERROR_RATE);
      
      // Response time validation
      expect(loadTestResult.averageResponseTime).toBeLessThan(
        E2E_CONFIG.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_MS
      );
      
      // Throughput validation (minimum conversations per second)
      expect(loadTestResult.throughput).toBeGreaterThan(
        E2E_CONFIG.PERFORMANCE_THRESHOLDS.THROUGHPUT_RPS
      );
      
      // Memory usage validation
      expect(loadTestResult.memoryUsage.peak).toBeLessThan(
        E2E_CONFIG.PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB * 1024 * 1024
      );
      
      console.log(`Load test results:
        Duration: ${(loadTestResult.totalTime / 1000).toFixed(1)}s
        Total Conversations: ${loadTestResult.totalConversations}
        Success Rate: ${((1 - loadTestResult.errorRate) * 100).toFixed(1)}%
        Throughput: ${loadTestResult.throughput.toFixed(2)} conversations/sec
        Avg Response Time: ${loadTestResult.averageResponseTime.toFixed(0)}ms
        Peak Memory: ${(loadTestResult.memoryUsage.peak / 1024 / 1024).toFixed(1)}MB`);
    }, E2E_CONFIG.E2E_LOAD_DURATION + 60000); // Test timeout with buffer
    
    it('should handle burst load scenarios', async () => {
      const burstConfig = {
        concurrentUsers: 50,
        duration: 10000, // 10 seconds burst
        rampUpTime: 2000, // Fast ramp up
        conversationsPerUser: 3,
        scenarioTypes: ['simple_lending', 'quick_swap']
      };
      
      monitor.start();
      
      const scenario = () => ({
        id: 'burst_scenario',
        name: 'Quick Operations',
        turns: [
          { input: 'Lend 100 USDC', expectedIntent: 'lending' }
        ]
      });
      
      const startTime = Date.now();
      const result = await simulator.simulateConcurrentUsers(
        burstConfig.concurrentUsers,
        burstConfig.duration,
        scenario
      );
      const endTime = Date.now();
      
      const conversations = TestAssertions.expectEither(result);
      
      // Should handle burst load without failures
      const failureRate = conversations.filter(c => !c.success).length / conversations.length;
      expect(failureRate).toBeLessThan(0.2); // Max 20% failure rate during burst
      
      // Should complete in reasonable time
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(burstConfig.duration + 15000); // 15s buffer
      
      console.log(`Burst test results:
        Users: ${burstConfig.concurrentUsers}
        Conversations: ${conversations.length}
        Failure Rate: ${(failureRate * 100).toFixed(1)}%
        Total Time: ${(totalTime / 1000).toFixed(1)}s`);
    });
  });
  
  describe('Stress Testing Scenarios', () => {
    it('should handle memory stress test', async () => {
      const stressConfig: StressTestConfig = {
        concurrentUsers: 20,
        duration: 60000, // 1 minute
        rampUpTime: 10000,
        conversationsPerUser: 10,
        scenarioTypes: ['complex_multi_turn']
      };
      
      monitor.start();
      const initialMemory = monitor.getMemoryUsage();
      
      // Generate memory-intensive scenarios
      const memoryIntensiveScenario = () => ({
        id: 'memory_intensive',
        name: 'Complex Multi-Turn with Large Context',
        turns: Array.from({ length: 10 }, (_, i) => ({
          input: `Complex operation ${i + 1} with detailed context and parameters`,
          expectedIntent: 'complex_operation'
        }))
      });
      
      const result = await simulator.simulateConcurrentUsers(
        stressConfig.concurrentUsers,
        stressConfig.duration,
        memoryIntensiveScenario
      );
      
      const conversations = TestAssertions.expectEither(result);
      const finalMemory = monitor.getMemoryUsage();
      
      // Memory growth should be reasonable
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;
      
      expect(memoryGrowthMB).toBeLessThan(200); // Max 200MB growth
      expect(finalMemory.heapUsed).toBeLessThan(
        E2E_CONFIG.PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB * 1024 * 1024
      );
      
      // Should still maintain reasonable success rate
      const successRate = conversations.filter(c => c.success).length / conversations.length;
      expect(successRate).toBeGreaterThan(0.7); // 70% minimum under stress
      
      console.log(`Memory stress test results:
        Memory Growth: ${memoryGrowthMB.toFixed(1)}MB
        Final Memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(1)}MB
        Success Rate: ${(successRate * 100).toFixed(1)}%`);
    });
    
    it('should handle rapid successive requests', async () => {
      const userId = 'rapid_test_user';
      const requestCount = 100;
      const maxConcurrentRequests = 20;
      
      monitor.start();
      
      // Create a pool of promises with limited concurrency
      const requests: Promise<any>[] = [];
      let activeConcurrency = 0;
      let completedRequests = 0;
      
      const processRequest = async (requestId: number) => {
        activeConcurrency++;
        
        try {
          const scenario = {
            id: `rapid_${requestId}`,
            name: 'Rapid Request',
            turns: [{ input: `Quick operation ${requestId}`, expectedIntent: 'quick' }]
          };
          
          const result = await simulator.simulateUserConversation(
            {
              userId: `${userId}_${requestId}`,
              behaviorType: 'goal_oriented',
              responseTime: { min: 100, max: 500 },
              errorTolerance: 'medium',
              sessionLength: { min: 1, max: 3 },
              preferredActions: ['lending'],
              experience: 'expert'
            },
            scenario
          );
          
          completedRequests++;
          return result;
          
        } finally {
          activeConcurrency--;
        }
      };
      
      // Submit requests with concurrency control
      for (let i = 0; i < requestCount; i++) {
        // Wait if we've hit concurrency limit
        while (activeConcurrency >= maxConcurrentRequests) {
          await TestUtils.waitFor(10)();
        }
        
        requests.push(processRequest(i));
      }
      
      // Wait for all requests to complete
      const results = await Promise.allSettled(requests);
      
      // Analyze results
      const successful = results.filter(r => 
        r.status === 'fulfilled' && E.isRight(r.value)
      ).length;
      
      const successRate = successful / requestCount;
      
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate minimum
      expect(completedRequests).toBe(requestCount);
      
      console.log(`Rapid requests test results:
        Total Requests: ${requestCount}
        Successful: ${successful}
        Success Rate: ${(successRate * 100).toFixed(1)}%
        Max Concurrency: ${maxConcurrentRequests}`);
    });
  });
  
  describe('Performance Degradation Testing', () => {
    it('should maintain performance under sustained mixed load', async () => {
      const phases = [
        { users: 10, duration: 30000, name: 'warmup' },
        { users: 25, duration: 60000, name: 'ramp_up' },
        { users: 40, duration: 90000, name: 'peak_load' },
        { users: 15, duration: 30000, name: 'cool_down' }
      ];
      
      const phaseResults: Array<{ phase: string; metrics: any }> = [];
      
      for (const phase of phases) {
        monitor.start();
        
        const scenario = () => {
          const scenarios = [
            { turns: [{ input: 'Lend 500 USDC', expectedIntent: 'lending' }] },
            { turns: [{ input: 'Swap 100 SEI for USDC', expectedIntent: 'swap' }] },
            { turns: [{ input: 'Show portfolio', expectedIntent: 'portfolio' }] },
            { 
              turns: [
                { input: 'Optimize my yield', expectedIntent: 'optimization' },
                { input: 'Execute the strategy', expectedIntent: 'execution' }
              ] 
            }
          ];
          
          return scenarios[Math.floor(Math.random() * scenarios.length)];
        };
        
        const startTime = Date.now();
        const result = await simulator.simulateConcurrentUsers(
          phase.users,
          phase.duration,
          scenario
        );
        const endTime = Date.now();
        
        const conversations = TestAssertions.expectEither(result);
        
        const responseTimes = conversations.flatMap(c => c.turns.map(t => t.responseTime));
        responseTimes.sort((a, b) => a - b);
        
        const metrics = {
          users: phase.users,
          conversations: conversations.length,
          successRate: conversations.filter(c => c.success).length / conversations.length,
          averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
          throughput: conversations.length / ((endTime - startTime) / 1000),
          memoryUsage: monitor.getMemoryUsage().heapUsed
        };
        
        phaseResults.push({
          phase: phase.name,
          metrics
        });
        
        console.log(`Phase ${phase.name} completed:
          Users: ${metrics.users}
          Success Rate: ${(metrics.successRate * 100).toFixed(1)}%
          Avg Response: ${metrics.averageResponseTime.toFixed(0)}ms
          P95 Response: ${metrics.p95ResponseTime.toFixed(0)}ms
          Throughput: ${metrics.throughput.toFixed(2)} ops/sec`);
        
        // Brief pause between phases
        await TestUtils.waitFor(5000)();
      }
      
      // Validate that system recovered after peak load
      const peakPhase = phaseResults.find(r => r.phase === 'peak_load');
      const cooldownPhase = phaseResults.find(r => r.phase === 'cool_down');
      
      if (peakPhase && cooldownPhase) {
        // Response time should improve in cooldown
        expect(cooldownPhase.metrics.averageResponseTime).toBeLessThan(
          peakPhase.metrics.averageResponseTime * 1.2 // Allow 20% variance
        );
        
        // Success rate should remain high
        expect(cooldownPhase.metrics.successRate).toBeGreaterThan(0.85);
      }
    });
  });
  
  // Skip tests if Docker is not available
  if (!dockerAvailable) {
    it.skip('Docker-based tests skipped - Docker not available', () => {});
  }
});