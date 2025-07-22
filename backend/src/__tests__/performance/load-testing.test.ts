/**
 * Performance and Load Testing
 * Tests system performance under various load conditions
 */

import request from 'supertest';
import { app } from '@/server';
import { generateTestWalletAddress, generateTestAuthToken } from '@/test-utils/generators';
import { describe, expect, test, beforeAll } from '@jest/globals';
import jwt from 'jsonwebtoken';

describe('Performance and Load Testing', () => {
  let validAuthToken: string;
  let testWalletAddress: string;
  const isLoadTestEnvironment = process.env.RUN_LOAD_TESTS === 'true';

  beforeAll(() => {
    testWalletAddress = generateTestWalletAddress();
    
    const secret = process.env.JWT_SECRET || 'test-secret';
    validAuthToken = jwt.sign(
      { walletAddress: testWalletAddress, exp: Math.floor(Date.now() / 1000) + 3600 },
      secret
    );
  });

  describe('Response Time Performance', () => {
    test('should respond to health check within acceptable time', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/health')
        .timeout(5000);
      
      const responseTime = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should handle authenticated requests efficiently', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .timeout(5000);
      
      const responseTime = Date.now() - start;
      
      expect(response.status).toBeLessThanOrEqual(401); // Either success or auth error
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    test('should process AI orchestration requests within time limits', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .post('/api/chat/orchestrate')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .send({
          message: 'Quick portfolio summary',
          walletAddress: testWalletAddress
        })
        .timeout(30000);
      
      const responseTime = Date.now() - start;
      
      // AI requests can take longer but should be reasonable
      expect(responseTime).toBeLessThan(30000); // 30 second timeout
      
      if (response.status === 200) {
        console.log(`AI orchestration response time: ${responseTime}ms`);
      }
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle multiple concurrent health checks', async () => {
      const concurrentRequests = 20;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(app).get('/health').timeout(10000)
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - start;

      // All requests should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
      
      // Average response time should be reasonable
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(2000);
      
      console.log(`${concurrentRequests} concurrent requests completed in ${totalTime}ms (avg: ${avgResponseTime}ms)`);
    });

    test('should handle concurrent authenticated requests', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(app)
          .get('/api/portfolio')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .timeout(10000)
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - start;

      // All requests should have consistent response (either all succeed or all fail consistently)
      const statusCodes = [...new Set(responses.map(r => r.status))];
      expect(statusCodes.length).toBeLessThanOrEqual(2); // Should be consistent
      
      console.log(`${concurrentRequests} concurrent auth requests completed in ${totalTime}ms`);
    });

    test('should handle mixed request types concurrently', async () => {
      const requests = [
        ...Array(5).fill(null).map(() => request(app).get('/health')),
        ...Array(5).fill(null).map(() => request(app).get('/ready')),
        ...Array(3).fill(null).map(() => 
          request(app)
            .get('/api/portfolio')
            .set('Authorization', `Bearer ${validAuthToken}`)
        ),
        ...Array(2).fill(null).map(() =>
          request(app)
            .post('/api/chat/orchestrate')
            .set('Authorization', `Bearer ${validAuthToken}`)
            .send({ message: 'Test', walletAddress: testWalletAddress })
        )
      ];

      const start = Date.now();
      const responses = await Promise.allSettled(requests);
      const totalTime = Date.now() - start;

      const successCount = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status < 500
      ).length;

      // Most requests should succeed (allowing for some auth failures)
      expect(successCount).toBeGreaterThan(responses.length * 0.6);
      
      console.log(`Mixed ${responses.length} requests: ${successCount} succeeded in ${totalTime}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should not have memory leaks during sustained requests', async () => {
      const initialMemory = process.memoryUsage();
      
      // Make sustained requests
      for (let i = 0; i < 50; i++) {
        await request(app).get('/health');
      }
      
      // Allow garbage collection
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be minimal (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory increase after 50 requests: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });

    test('should handle large request payloads efficiently', async () => {
      const largeMessage = 'A'.repeat(1024 * 1024); // 1MB message
      
      const start = Date.now();
      
      const response = await request(app)
        .post('/api/chat/orchestrate')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .send({
          message: largeMessage,
          walletAddress: testWalletAddress
        })
        .timeout(15000);
      
      const responseTime = Date.now() - start;
      
      // Should either handle large payload or reject it appropriately
      if (response.status === 413) {
        expect(response.body.error).toMatch(/payload.*large|size.*limit/i);
      } else if (response.status === 400) {
        expect(response.body.error).toMatch(/message.*length|input.*large/i);
      }
      
      // Should not take excessively long
      expect(responseTime).toBeLessThan(15000);
    });

    test('should maintain performance with multiple data operations', async () => {
      const operations = [
        () => request(app).get('/metrics'),
        () => request(app).get('/health'),
        () => request(app)
          .get('/api/portfolio')
          .set('Authorization', `Bearer ${validAuthToken}`),
        () => request(app)
          .post('/api/chat/orchestrate')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .send({ message: 'Status', walletAddress: testWalletAddress })
      ];

      const results = [];
      
      for (const operation of operations) {
        const start = Date.now();
        const response = await operation();
        const duration = Date.now() - start;
        
        results.push({
          status: response.status,
          duration,
          success: response.status < 500
        });
      }

      // Most operations should complete quickly
      const fastOperations = results.filter(r => r.duration < 3000);
      expect(fastOperations.length).toBeGreaterThan(results.length * 0.7);
      
      console.log('Operation performance:', results.map(r => 
        `${r.status}:${r.duration}ms`
      ).join(', '));
    });
  });

  // Load testing (only runs when explicitly enabled)
  describe('Load Testing', () => {
    test.skip.if(!isLoadTestEnvironment)('should handle high load scenarios', async () => {
      const highLoadRequests = 100;
      const batchSize = 20;
      const results = [];

      console.log(`Starting load test with ${highLoadRequests} requests in batches of ${batchSize}`);

      for (let i = 0; i < highLoadRequests; i += batchSize) {
        const batch = Array(Math.min(batchSize, highLoadRequests - i)).fill(null).map(() =>
          request(app)
            .get('/health')
            .timeout(10000)
        );

        const start = Date.now();
        const responses = await Promise.allSettled(batch);
        const batchTime = Date.now() - start;

        const successful = responses.filter(r => 
          r.status === 'fulfilled' && r.value.status === 200
        ).length;

        results.push({
          batch: Math.floor(i / batchSize) + 1,
          successful,
          total: batch.length,
          time: batchTime,
          successRate: successful / batch.length
        });

        console.log(`Batch ${results.length}: ${successful}/${batch.length} successful (${batchTime}ms)`);

        // Brief pause between batches to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Overall success rate should be high
      const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0);
      const successRate = totalSuccessful / highLoadRequests;
      
      expect(successRate).toBeGreaterThan(0.9); // 90% success rate
      
      console.log(`Load test completed: ${totalSuccessful}/${highLoadRequests} successful (${Math.round(successRate * 100)}%)`);
    }, 60000); // 60 second timeout for load test

    test.skip.if(!isLoadTestEnvironment)('should handle sustained load over time', async () => {
      const testDuration = 30000; // 30 seconds
      const requestInterval = 100; // Request every 100ms
      const startTime = Date.now();
      const results = [];

      console.log(`Starting sustained load test for ${testDuration / 1000} seconds`);

      while (Date.now() - startTime < testDuration) {
        const requestStart = Date.now();
        
        try {
          const response = await request(app)
            .get('/health')
            .timeout(5000);
          
          const responseTime = Date.now() - requestStart;
          
          results.push({
            timestamp: Date.now() - startTime,
            status: response.status,
            responseTime,
            success: response.status === 200
          });
        } catch (error) {
          results.push({
            timestamp: Date.now() - startTime,
            status: 0,
            responseTime: Date.now() - requestStart,
            success: false,
            error: true
          });
        }

        // Wait for next interval
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }

      // Analyze results
      const successfulRequests = results.filter(r => r.success);
      const averageResponseTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;
      const successRate = successfulRequests.length / results.length;

      console.log(`Sustained load test results:
        - Total requests: ${results.length}
        - Successful: ${successfulRequests.length} (${Math.round(successRate * 100)}%)
        - Average response time: ${Math.round(averageResponseTime)}ms`);

      expect(successRate).toBeGreaterThan(0.85); // 85% success rate over time
      expect(averageResponseTime).toBeLessThan(2000); // Average under 2 seconds
    }, 45000); // 45 second timeout

    test.skip.if(!isLoadTestEnvironment)('should handle authentication load', async () => {
      const authRequests = 50;
      const tokens = Array(authRequests).fill(null).map((_, i) => {
        const walletAddress = generateTestWalletAddress();
        return jwt.sign(
          { walletAddress, exp: Math.floor(Date.now() / 1000) + 3600 },
          process.env.JWT_SECRET || 'test-secret'
        );
      });

      const requests = tokens.map(token =>
        request(app)
          .get('/api/portfolio')
          .set('Authorization', `Bearer ${token}`)
          .timeout(10000)
      );

      const start = Date.now();
      const responses = await Promise.allSettled(requests);
      const totalTime = Date.now() - start;

      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status !== 500
      ).length;

      const successRate = successful / authRequests;
      const avgTime = totalTime / authRequests;

      console.log(`Auth load test: ${successful}/${authRequests} handled successfully in ${totalTime}ms (avg: ${avgTime}ms)`);

      expect(successRate).toBeGreaterThan(0.8); // 80% should be handled properly
      expect(avgTime).toBeLessThan(3000); // Average under 3 seconds
    }, 30000);
  });

  describe('Stress Testing', () => {
    test('should gracefully handle resource exhaustion', async () => {
      // Test behavior when resources are constrained
      const stressRequests = Array(200).fill(null).map(() =>
        request(app)
          .get('/health')
          .timeout(15000)
      );

      const start = Date.now();
      const responses = await Promise.allSettled(stressRequests);
      const totalTime = Date.now() - start;

      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;

      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      ).length;

      const errors = responses.filter(r => r.status === 'rejected').length;

      console.log(`Stress test results:
        - Successful: ${successful}
        - Rate limited: ${rateLimited}
        - Errors: ${errors}
        - Total time: ${totalTime}ms`);

      // System should either succeed or fail gracefully with rate limiting
      expect(successful + rateLimited).toBeGreaterThan(responses.length * 0.5);
      expect(errors).toBeLessThan(responses.length * 0.3); // No more than 30% hard errors
    }, 60000);

    test('should maintain security under load', async () => {
      // Test that security measures remain effective under load
      const securityRequests = Array(30).fill(null).map(() =>
        request(app)
          .get('/api/portfolio')
          // Intentionally no auth token
          .timeout(5000)
      );

      const responses = await Promise.allSettled(securityRequests);
      const authFailures = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 401
      ).length;

      // All requests should be properly rejected for missing auth
      expect(authFailures).toBe(responses.length);
      
      console.log(`Security under load: ${authFailures}/${responses.length} properly rejected unauthorized requests`);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should establish baseline performance metrics', async () => {
      const benchmarks = [
        {
          name: 'Health Check',
          request: () => request(app).get('/health'),
          expectedMaxTime: 500
        },
        {
          name: 'Metrics Endpoint',
          request: () => request(app).get('/metrics'),
          expectedMaxTime: 1000
        },
        {
          name: 'Auth Failure',
          request: () => request(app).get('/api/portfolio'),
          expectedMaxTime: 1000
        }
      ];

      const results = [];

      for (const benchmark of benchmarks) {
        const times = [];
        
        // Run each benchmark multiple times
        for (let i = 0; i < 10; i++) {
          const start = Date.now();
          await benchmark.request();
          times.push(Date.now() - start);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);

        results.push({
          name: benchmark.name,
          avgTime,
          maxTime,
          minTime,
          expectedMaxTime: benchmark.expectedMaxTime,
          withinExpectation: maxTime <= benchmark.expectedMaxTime
        });
      }

      // Log results
      console.log('Performance Benchmarks:');
      results.forEach(r => {
        console.log(`  ${r.name}: avg=${r.avgTime}ms, max=${r.maxTime}ms, min=${r.minTime}ms (expected max: ${r.expectedMaxTime}ms) ${r.withinExpectation ? '✓' : '✗'}`);
      });

      // Most benchmarks should meet expectations
      const meetingExpectations = results.filter(r => r.withinExpectation).length;
      expect(meetingExpectations).toBeGreaterThan(results.length * 0.7);
    });
  });
});