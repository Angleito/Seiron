/**
 * API Performance Benchmarking Tests
 * Measures API performance metrics and ensures they meet requirements
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
}

describe('API Performance Benchmarking', () => {
  let apiClient: AxiosInstance;
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
  
  // Performance thresholds (in milliseconds)
  const THRESHOLDS = {
    health: { p95: 100, p99: 200 },
    chat: { p95: 5000, p99: 10000 },
    streaming: { firstByte: 1000, p95: 2000 },
  };

  beforeAll(() => {
    apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  function calculateMetrics(times: number[]): PerformanceMetrics {
    const sorted = [...times].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sum / sorted.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  describe('Health Endpoint Performance', () => {
    it('should meet performance requirements for health checks', async () => {
      const iterations = 100;
      const responseTimes: number[] = [];

      console.log(`Running ${iterations} health check requests...`);

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        try {
          await apiClient.get('/health');
          const responseTime = performance.now() - start;
          responseTimes.push(responseTime);
        } catch (error) {
          console.error(`Request ${i} failed:`, error);
        }

        // Small delay to avoid overwhelming the server
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      const metrics = calculateMetrics(responseTimes);
      
      console.log('\nHealth Endpoint Performance Metrics:');
      console.log(`  Min: ${metrics.min.toFixed(2)}ms`);
      console.log(`  Max: ${metrics.max.toFixed(2)}ms`);
      console.log(`  Mean: ${metrics.mean.toFixed(2)}ms`);
      console.log(`  Median: ${metrics.median.toFixed(2)}ms`);
      console.log(`  P95: ${metrics.p95.toFixed(2)}ms`);
      console.log(`  P99: ${metrics.p99.toFixed(2)}ms`);

      // Assert performance thresholds
      expect(metrics.p95).toBeLessThan(THRESHOLDS.health.p95);
      expect(metrics.p99).toBeLessThan(THRESHOLDS.health.p99);
    });
  });

  describe('Chat Endpoint Performance', () => {
    it('should meet performance requirements for chat requests', async () => {
      const iterations = 20; // Fewer iterations due to API costs
      const responseTimes: number[] = [];

      console.log(`\nRunning ${iterations} chat requests...`);

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        try {
          await apiClient.post('/chat', {
            message: 'What is 2+2?', // Simple query for consistent timing
            sessionId: `perf-test-${i}`,
            maxTokens: 50, // Limit tokens for faster response
          });
          
          const responseTime = performance.now() - start;
          responseTimes.push(responseTime);
        } catch (error) {
          console.error(`Chat request ${i} failed:`, error);
        }

        // Delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const metrics = calculateMetrics(responseTimes);
      
      console.log('\nChat Endpoint Performance Metrics:');
      console.log(`  Min: ${metrics.min.toFixed(2)}ms`);
      console.log(`  Max: ${metrics.max.toFixed(2)}ms`);
      console.log(`  Mean: ${metrics.mean.toFixed(2)}ms`);
      console.log(`  Median: ${metrics.median.toFixed(2)}ms`);
      console.log(`  P95: ${metrics.p95.toFixed(2)}ms`);
      console.log(`  P99: ${metrics.p99.toFixed(2)}ms`);

      // Assert performance thresholds
      expect(metrics.p95).toBeLessThan(THRESHOLDS.chat.p95);
      expect(metrics.p99).toBeLessThan(THRESHOLDS.chat.p99);
    });

    it('should handle varying message sizes efficiently', async () => {
      const messageSizes = [10, 100, 500, 1000, 2000, 4000];
      const results: Record<number, number> = {};

      console.log('\nTesting chat performance with different message sizes...');

      for (const size of messageSizes) {
        const message = 'a'.repeat(size);
        const start = performance.now();
        
        try {
          await apiClient.post('/chat', {
            message,
            sessionId: `size-test-${size}`,
            maxTokens: 50,
          });
          
          const responseTime = performance.now() - start;
          results[size] = responseTime;
        } catch (error) {
          console.error(`Failed for size ${size}:`, error);
          results[size] = -1;
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log('\nResponse times by message size:');
      Object.entries(results).forEach(([size, time]) => {
        if (time > 0) {
          console.log(`  ${size} chars: ${time.toFixed(2)}ms`);
        } else {
          console.log(`  ${size} chars: Failed`);
        }
      });

      // Response time should not increase dramatically with message size
      const validResults = Object.values(results).filter(t => t > 0);
      if (validResults.length >= 2) {
        const first = validResults[0];
        const last = validResults[validResults.length - 1];
        const increase = (last - first) / first;
        
        // Should not more than double even with much larger messages
        expect(increase).toBeLessThan(2);
      }
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentCounts = [1, 5, 10, 20];
      const results: Record<number, PerformanceMetrics> = {};

      console.log('\nTesting concurrent request handling...');

      for (const count of concurrentCounts) {
        const times: number[] = [];
        
        // Run multiple batches
        for (let batch = 0; batch < 3; batch++) {
          const promises = Array(count).fill(null).map((_, i) => {
            const start = performance.now();
            
            return apiClient.get('/health')
              .then(() => performance.now() - start)
              .catch(() => -1);
          });

          const batchTimes = await Promise.all(promises);
          times.push(...batchTimes.filter(t => t > 0));
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (times.length > 0) {
          results[count] = calculateMetrics(times);
        }
      }

      console.log('\nConcurrent request performance:');
      Object.entries(results).forEach(([count, metrics]) => {
        console.log(`  ${count} concurrent requests:`);
        console.log(`    Mean: ${metrics.mean.toFixed(2)}ms`);
        console.log(`    P95: ${metrics.p95.toFixed(2)}ms`);
      });

      // Performance should degrade gracefully with more concurrent requests
      const singleReqTime = results[1]?.mean || 0;
      const twentyReqTime = results[20]?.mean || 0;
      
      if (singleReqTime > 0 && twentyReqTime > 0) {
        const degradation = twentyReqTime / singleReqTime;
        expect(degradation).toBeLessThan(10); // Should not be 10x slower
      }
    });
  });

  describe('Streaming Performance', () => {
    it('should start streaming quickly', async () => {
      const iterations = 10;
      const firstByteTimes: number[] = [];

      console.log(`\nMeasuring streaming performance (${iterations} iterations)...`);

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        try {
          const response = await apiClient.post('/chat', {
            message: 'Hello',
            sessionId: `stream-perf-${i}`,
            stream: true,
          }, {
            responseType: 'stream',
          });

          await new Promise<void>((resolve, reject) => {
            response.data.once('data', () => {
              const firstByteTime = performance.now() - start;
              firstByteTimes.push(firstByteTime);
              response.data.destroy();
              resolve();
            });

            response.data.on('error', reject);
          });
        } catch (error) {
          console.error(`Streaming iteration ${i} failed:`, error);
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (firstByteTimes.length > 0) {
        const metrics = calculateMetrics(firstByteTimes);
        
        console.log('\nStreaming First Byte Metrics:');
        console.log(`  Min: ${metrics.min.toFixed(2)}ms`);
        console.log(`  Mean: ${metrics.mean.toFixed(2)}ms`);
        console.log(`  P95: ${metrics.p95.toFixed(2)}ms`);

        expect(metrics.mean).toBeLessThan(THRESHOLDS.streaming.firstByte);
        expect(metrics.p95).toBeLessThan(THRESHOLDS.streaming.p95);
      }
    });
  });

  describe('MCP Integration Performance', () => {
    it('should not significantly impact response times', async () => {
      const withMCPTimes: number[] = [];
      const withoutMCPTimes: number[] = [];

      console.log('\nComparing performance with and without MCP context...');

      // Requests that might trigger MCP
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        
        try {
          await apiClient.post('/chat', {
            message: 'What is the current gas price on Sei?',
            sessionId: `mcp-perf-${i}`,
            walletAddress: 'sei1test123',
            maxTokens: 50,
          });
          
          withMCPTimes.push(performance.now() - start);
        } catch (error) {
          console.error('MCP request failed:', error);
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Simple requests without MCP
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        
        try {
          await apiClient.post('/chat', {
            message: 'What is 2+2?',
            sessionId: `simple-perf-${i}`,
            maxTokens: 50,
          });
          
          withoutMCPTimes.push(performance.now() - start);
        } catch (error) {
          console.error('Simple request failed:', error);
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (withMCPTimes.length > 0 && withoutMCPTimes.length > 0) {
        const mcpMetrics = calculateMetrics(withMCPTimes);
        const simpleMetrics = calculateMetrics(withoutMCPTimes);
        
        console.log('\nMCP Performance Impact:');
        console.log(`  With MCP - Mean: ${mcpMetrics.mean.toFixed(2)}ms`);
        console.log(`  Without MCP - Mean: ${simpleMetrics.mean.toFixed(2)}ms`);
        console.log(`  Overhead: ${(mcpMetrics.mean - simpleMetrics.mean).toFixed(2)}ms`);
        
        // MCP should not add more than 2 seconds on average
        const overhead = mcpMetrics.mean - simpleMetrics.mean;
        expect(overhead).toBeLessThan(2000);
      }
    });
  });

  describe('Resource Usage', () => {
    it('should not leak memory under load', async () => {
      if (global.gc) {
        global.gc();
      }
      
      const initialMemory = process.memoryUsage();
      console.log('\nInitial memory usage:', {
        heap: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB`,
      });

      // Send many requests
      const requestCount = 100;
      const batchSize = 10;
      
      for (let i = 0; i < requestCount; i += batchSize) {
        const promises = Array(batchSize).fill(null).map((_, j) => 
          apiClient.get('/health').catch(() => null)
        );
        
        await Promise.all(promises);
        
        if (i % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Allow time for garbage collection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      console.log('\nFinal memory usage:', {
        heap: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB`,
        increase: `${memoryIncreaseMB.toFixed(2)} MB`,
      });

      // Should not leak more than 50MB for 100 requests
      expect(memoryIncreaseMB).toBeLessThan(50);
    });
  });

  describe('Performance Summary', () => {
    it('should generate performance report', async () => {
      console.log('\n=== API Performance Summary ===\n');

      const endpoints = [
        { name: 'Health Check', url: '/health', method: 'GET' },
        { name: 'Chat (Simple)', url: '/chat', method: 'POST', body: { message: 'Hi', maxTokens: 50 } },
      ];

      const report: Record<string, any> = {};

      for (const endpoint of endpoints) {
        const times: number[] = [];
        
        for (let i = 0; i < 5; i++) {
          const start = performance.now();
          
          try {
            if (endpoint.method === 'GET') {
              await apiClient.get(endpoint.url);
            } else {
              await apiClient.post(endpoint.url, {
                ...endpoint.body,
                sessionId: `report-${i}`,
              });
            }
            
            times.push(performance.now() - start);
          } catch (error) {
            console.error(`Failed ${endpoint.name}:`, error);
          }
          
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (times.length > 0) {
          const metrics = calculateMetrics(times);
          report[endpoint.name] = {
            samples: times.length,
            mean: metrics.mean.toFixed(2),
            p95: metrics.p95.toFixed(2),
            status: metrics.mean < 5000 ? '✅ PASS' : '❌ FAIL',
          };
        }
      }

      console.table(report);
      
      const allPassed = Object.values(report).every(r => r.status === '✅ PASS');
      
      if (allPassed) {
        console.log('\n✅ All performance benchmarks passed!');
      } else {
        console.log('\n⚠️  Some performance benchmarks failed. Consider optimization.');
      }
    });
  });
});