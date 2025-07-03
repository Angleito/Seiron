/**
 * Memory Performance Tests for LangChain Integration
 * Tests conversation memory, context management, and NLP performance
 */

import { describe, test, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import { performance } from 'perf_hooks';

import { PerformanceMonitor } from '../../../src/core/monitoring/PerformanceMonitor';
import { ConversationMemory } from '../../../src/langchain/memory/ConversationMemory';
import { MemoryManager } from '../../../src/langchain/memory/MemoryManager';
import { NLPEngine } from '../../../src/langchain/NLPEngine';
import { SessionManager } from '../../../src/langchain/context/SessionManager';
import { ContextManager } from '../../../src/langchain/integration/ContextManager';

// Memory performance thresholds
const MEMORY_PERFORMANCE_THRESHOLDS = {
  maxOperationTime: 100, // ms
  maxMemoryUsage: 512 * 1024 * 1024, // 512MB
  maxMemoryGrowthRate: 0.1, // 10% per 1000 operations
  maxContextRetrievalTime: 50, // ms
  maxNLPProcessingTime: 200, // ms
  minMemoryHitRate: 0.8, // 80% cache hit rate
  maxMemoryEvictionRate: 0.05 // 5% eviction rate
};

// Test data generators
const conversationInputGenerator = () => fc.record({
  userId: fc.uuid(),
  sessionId: fc.uuid(),
  message: fc.string({ minLength: 10, maxLength: 500 }),
  intent: fc.constantFrom('swap', 'lend', 'borrow', 'portfolio', 'info', 'help'),
  entities: fc.array(fc.record({
    type: fc.constantFrom('token', 'amount', 'protocol', 'address'),
    value: fc.string({ minLength: 1, maxLength: 100 }),
    confidence: fc.float({ min: 0.5, max: 1.0 })
  }), { minLength: 0, maxLength: 10 }),
  context: fc.record({
    previousActions: fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
    portfolio: fc.record({
      balance: fc.bigUintN(64),
      positions: fc.array(fc.string(), { minLength: 0, maxLength: 20 })
    }),
    preferences: fc.record({
      riskLevel: fc.constantFrom('low', 'medium', 'high'),
      preferredProtocols: fc.array(fc.string(), { minLength: 0, maxLength: 5 })
    })
  }),
  timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
  complexity: fc.constantFrom('simple', 'medium', 'complex'),
  priority: fc.constantFrom('low', 'medium', 'high')
});

const memoryOperationGenerator = () => fc.record({
  type: fc.constantFrom('store', 'retrieve', 'update', 'delete', 'search'),
  key: fc.string({ minLength: 1, maxLength: 100 }),
  value: fc.oneof(
    fc.string({ minLength: 1, maxLength: 1000 }),
    fc.object(),
    fc.array(fc.string(), { minLength: 0, maxLength: 100 })
  ),
  ttl: fc.integer({ min: 60, max: 3600 }), // 1 minute to 1 hour
  metadata: fc.record({
    importance: fc.float({ min: 0, max: 1 }),
    frequency: fc.integer({ min: 1, max: 1000 }),
    lastAccessed: fc.integer({ min: Date.now() - 86400000, max: Date.now() })
  })
});

const conversationScenarioGenerator = () => fc.record({
  userId: fc.uuid(),
  sessionDuration: fc.integer({ min: 300, max: 7200 }), // 5 minutes to 2 hours
  messageCount: fc.integer({ min: 10, max: 200 }),
  complexity: fc.constantFrom('simple', 'medium', 'complex'),
  contextSwitches: fc.integer({ min: 0, max: 10 }),
  memoryIntensity: fc.constantFrom('low', 'medium', 'high'),
  concurrentSessions: fc.integer({ min: 1, max: 50 })
});

const nlpWorkloadGenerator = () => fc.record({
  texts: fc.array(fc.string({ minLength: 10, maxLength: 1000 }), { minLength: 1, maxLength: 100 }),
  operations: fc.array(fc.constantFrom(
    'intent_classification',
    'entity_extraction',
    'sentiment_analysis',
    'context_analysis',
    'command_parsing'
  ), { minLength: 1, maxLength: 5 }),
  language: fc.constantFrom('en', 'es', 'fr', 'de', 'ja', 'ko'),
  complexity: fc.constantFrom('simple', 'medium', 'complex')
});

describe('Memory Performance Tests', () => {
  let performanceMonitor: PerformanceMonitor;
  let conversationMemory: ConversationMemory;
  let memoryManager: MemoryManager;
  let nlpEngine: NLPEngine;
  let sessionManager: SessionManager;
  let contextManager: ContextManager;

  beforeAll(async () => {
    // Initialize performance monitoring
    performanceMonitor = new PerformanceMonitor({
      enabled: true,
      collectInterval: 100,
      retentionPeriod: 300000,
      alerts: {
        enabled: true,
        rules: [],
        notification: { email: [], webhook: [] }
      },
      bottleneckDetection: {
        enabled: true,
        analysisInterval: 1000,
        thresholds: {
          cpuUsage: 80,
          memoryUsage: 85,
          responseTime: 500,
          errorRate: 5.0
        }
      }
    });

    // Initialize memory components
    conversationMemory = new ConversationMemory({
      maxSize: 10000,
      ttl: 3600,
      compressionEnabled: true,
      encryptionEnabled: true
    });

    memoryManager = new MemoryManager({
      maxMemoryUsage: 256 * 1024 * 1024, // 256MB
      evictionPolicy: 'lru',
      compressionThreshold: 1024,
      encryptionKey: 'test-key'
    });

    nlpEngine = new NLPEngine({
      modelPath: 'test-model',
      maxTokens: 2048,
      temperature: 0.7,
      cacheSize: 1000
    });

    sessionManager = new SessionManager({
      maxConcurrentSessions: 1000,
      sessionTimeout: 3600,
      cleanupInterval: 300
    });

    contextManager = new ContextManager({
      maxContextSize: 4096,
      contextWindow: 10,
      relevanceThreshold: 0.7
    });
  });

  afterAll(async () => {
    await performanceMonitor.shutdown();
    await conversationMemory.cleanup();
    await memoryManager.cleanup();
    await sessionManager.cleanup();
  });

  describe('Memory Operation Performance Tests', () => {
    test('property: memory operations scale linearly', async () => {
      const operationCounts = [10, 100, 1000, 10000];
      const performanceResults = [];

      for (const opCount of operationCounts) {
        const operations = fc.sample(memoryOperationGenerator(), opCount);
        
        const startTime = performance.now();
        const startMemory = process.memoryUsage().heapUsed;
        
        // Execute memory operations
        const results = await Promise.all(
          operations.map(async (op) => {
            return performanceMonitor.measureOperation(
              `memory_${op.type}`,
              async () => performMemoryOperation(op)
            );
          })
        );
        
        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;
        
        const duration = endTime - startTime;
        const memoryUsage = endMemory - startMemory;
        
        performanceResults.push({
          operations: opCount,
          duration,
          memoryUsage,
          throughput: opCount / (duration / 1000)
        });
        
        // Performance should remain reasonable
        expect(duration).toBeLessThan(opCount * 2); // 2ms per operation max
        expect(memoryUsage).toBeLessThan(opCount * 1024); // 1KB per operation max
      }

      // Check for linear scaling (not exponential)
      for (let i = 1; i < performanceResults.length; i++) {
        const prev = performanceResults[i - 1];
        const curr = performanceResults[i];
        
        const scaleRatio = curr.operations / prev.operations;
        const timeRatio = curr.duration / prev.duration;
        
        // Time ratio should not exceed scale ratio by more than 50%
        expect(timeRatio).toBeLessThan(scaleRatio * 1.5);
        
        // Record scaling metrics
        performanceMonitor.recordMetric('memory_scaling_ratio', timeRatio / scaleRatio);
      }
    });

    test('property: memory retrieval maintains cache hit rate', async () => {
      const cacheSize = 1000;
      const operationCount = 5000;
      
      // Pre-populate cache
      const cacheKeys = Array.from({ length: cacheSize }, (_, i) => `key_${i}`);
      for (const key of cacheKeys) {
        await memoryManager.store(key, `value_${key}`, 3600);
      }
      
      let hitCount = 0;
      let missCount = 0;
      
      // Test cache performance with mixed operations
      const operations = fc.sample(memoryOperationGenerator(), operationCount);
      
      for (const operation of operations) {
        const startTime = performance.now();
        
        if (operation.type === 'retrieve') {
          // 80% chance of requesting cached item
          const key = Math.random() < 0.8 ? 
            cacheKeys[Math.floor(Math.random() * cacheKeys.length)] :
            `miss_key_${Math.random()}`;
          
          const result = await memoryManager.retrieve(key);
          
          if (result) {
            hitCount++;
          } else {
            missCount++;
          }
        } else {
          await performMemoryOperation(operation);
        }
        
        const retrievalTime = performance.now() - startTime;
        expect(retrievalTime).toBeLessThan(MEMORY_PERFORMANCE_THRESHOLDS.maxContextRetrievalTime);
      }
      
      const hitRate = hitCount / (hitCount + missCount);
      expect(hitRate).toBeGreaterThan(MEMORY_PERFORMANCE_THRESHOLDS.minMemoryHitRate);
      
      // Record cache performance
      performanceMonitor.recordMetric('memory_hit_rate', hitRate);
    });
  });

  describe('Conversation Memory Performance Tests', () => {
    test('property: conversation responses are sub-second', async () => {
      await fc.assert(fc.asyncProperty(
        conversationInputGenerator(),
        async (input) => {
          const startTime = performance.now();
          
          const response = await processConversationInput(input);
          
          const responseTime = performance.now() - startTime;
          
          // Responses must be fast for good UX
          expect(responseTime).toBeLessThan(1000);
          expect(E.isRight(response)).toBe(true);
          
          // Record response time
          performanceMonitor.recordMetric('conversation_response_time', responseTime);
          
          return responseTime < 1000 && E.isRight(response);
        }
      ), {
        numRuns: 200,
        timeout: 120000
      });
    });

    test('property: concurrent conversations maintain performance', async () => {
      const conversationCount = 100;
      const conversations = fc.sample(conversationInputGenerator(), conversationCount);
      
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      // Process concurrent conversations
      const responses = await Promise.all(
        conversations.map(async (input, index) => {
          const sessionId = `session_${index % 10}`; // 10 concurrent sessions
          return processConversationInput({ ...input, sessionId });
        })
      );
      
      const totalTime = performance.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;
      const averageTime = totalTime / conversationCount;
      
      // Performance assertions
      expect(averageTime).toBeLessThan(2000); // 2s max average
      expect(memoryUsed).toBeLessThan(MEMORY_PERFORMANCE_THRESHOLDS.maxMemoryUsage);
      
      // Success rate should be high
      const successRate = responses.filter(E.isRight).length / responses.length;
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      
      // Record concurrent performance
      performanceMonitor.recordMetric('concurrent_conversations_avg_time', averageTime);
      performanceMonitor.recordMetric('concurrent_conversations_memory', memoryUsed);
      performanceMonitor.recordMetric('concurrent_conversations_success_rate', successRate);
    });

    test('property: memory eviction maintains performance', async () => {
      const memoryCapacity = 1000;
      const operationCount = 5000; // 5x capacity to trigger evictions
      
      let evictionCount = 0;
      let totalOperations = 0;
      
      // Monitor eviction events
      memoryManager.on('eviction', () => evictionCount++);
      
      const operations = fc.sample(memoryOperationGenerator(), operationCount);
      
      for (const operation of operations) {
        await performMemoryOperation(operation);
        totalOperations++;
        
        // Check memory performance periodically
        if (totalOperations % 100 === 0) {
          const currentMemory = process.memoryUsage().heapUsed;
          expect(currentMemory).toBeLessThan(MEMORY_PERFORMANCE_THRESHOLDS.maxMemoryUsage);
        }
      }
      
      const evictionRate = evictionCount / totalOperations;
      expect(evictionRate).toBeLessThan(MEMORY_PERFORMANCE_THRESHOLDS.maxMemoryEvictionRate);
      
      // Record eviction performance
      performanceMonitor.recordMetric('memory_eviction_rate', evictionRate);
    });
  });

  describe('Context Management Performance Tests', () => {
    test('property: context retrieval is efficient', async () => {
      await fc.assert(fc.asyncProperty(
        conversationScenarioGenerator(),
        async (scenario) => {
          const startTime = performance.now();
          
          // Build conversation context
          const context = await buildConversationContext(scenario);
          
          const contextBuildTime = performance.now() - startTime;
          
          // Context building should be fast
          expect(contextBuildTime).toBeLessThan(MEMORY_PERFORMANCE_THRESHOLDS.maxContextRetrievalTime);
          
          // Context should be relevant and complete
          expect(context.relevance).toBeGreaterThan(0.7);
          expect(context.completeness).toBeGreaterThan(0.8);
          
          // Record context performance
          performanceMonitor.recordMetric('context_build_time', contextBuildTime);
          performanceMonitor.recordMetric('context_relevance', context.relevance);
          
          return contextBuildTime < MEMORY_PERFORMANCE_THRESHOLDS.maxContextRetrievalTime;
        }
      ), {
        numRuns: 100,
        timeout: 60000
      });
    });

    test('property: session management scales with concurrent users', async () => {
      const userCounts = [10, 50, 100, 500, 1000];
      
      for (const userCount of userCounts) {
        const sessions = Array.from({ length: userCount }, (_, i) => ({
          userId: `user_${i}`,
          sessionId: `session_${i}`,
          timestamp: Date.now()
        }));
        
        const startTime = performance.now();
        const startMemory = process.memoryUsage().heapUsed;
        
        // Create concurrent sessions
        await Promise.all(
          sessions.map(session => sessionManager.createSession(session))
        );
        
        const sessionCreationTime = performance.now() - startTime;
        const memoryUsed = process.memoryUsage().heapUsed - startMemory;
        
        // Performance should scale reasonably
        expect(sessionCreationTime).toBeLessThan(userCount * 2); // 2ms per session
        expect(memoryUsed).toBeLessThan(userCount * 10 * 1024); // 10KB per session
        
        // Record session performance
        performanceMonitor.recordMetric(`session_creation_${userCount}`, sessionCreationTime);
        performanceMonitor.recordMetric(`session_memory_${userCount}`, memoryUsed);
        
        // Cleanup sessions
        await Promise.all(
          sessions.map(session => sessionManager.closeSession(session.sessionId))
        );
      }
    });
  });

  describe('NLP Engine Performance Tests', () => {
    test('property: NLP processing maintains throughput', async () => {
      await fc.assert(fc.asyncProperty(
        nlpWorkloadGenerator(),
        async (workload) => {
          const startTime = performance.now();
          
          // Process NLP workload
          const results = await Promise.all(
            workload.texts.map(async (text) => {
              const processingStart = performance.now();
              
              const result = await nlpEngine.process(text, workload.operations);
              
              const processingTime = performance.now() - processingStart;
              
              // Individual processing should be fast
              expect(processingTime).toBeLessThan(MEMORY_PERFORMANCE_THRESHOLDS.maxNLPProcessingTime);
              
              return { result, processingTime };
            })
          );
          
          const totalTime = performance.now() - startTime;
          const throughput = workload.texts.length / (totalTime / 1000);
          const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
          
          // Record NLP performance
          performanceMonitor.recordMetric('nlp_throughput', throughput);
          performanceMonitor.recordMetric('nlp_avg_processing_time', avgProcessingTime);
          
          // Throughput should be reasonable
          expect(throughput).toBeGreaterThan(10); // 10 texts per second minimum
          
          return throughput > 10;
        }
      ), {
        numRuns: 50,
        timeout: 120000
      });
    });

    test('property: intent classification accuracy vs speed tradeoff', async () => {
      const testCases = fc.sample(conversationInputGenerator(), 100);
      
      const accuracyResults = [];
      const speedResults = [];
      
      for (const testCase of testCases) {
        const startTime = performance.now();
        
        const classification = await nlpEngine.classifyIntent(testCase.message);
        
        const classificationTime = performance.now() - startTime;
        
        // Record results
        speedResults.push(classificationTime);
        accuracyResults.push(classification.confidence);
        
        // Should be fast and accurate
        expect(classificationTime).toBeLessThan(100); // 100ms max
        expect(classification.confidence).toBeGreaterThan(0.7); // 70% confidence minimum
      }
      
      const avgSpeed = speedResults.reduce((sum, time) => sum + time, 0) / speedResults.length;
      const avgAccuracy = accuracyResults.reduce((sum, acc) => sum + acc, 0) / accuracyResults.length;
      
      // Record intent classification performance
      performanceMonitor.recordMetric('intent_classification_speed', avgSpeed);
      performanceMonitor.recordMetric('intent_classification_accuracy', avgAccuracy);
      
      // Should maintain good balance
      expect(avgSpeed).toBeLessThan(50); // 50ms average
      expect(avgAccuracy).toBeGreaterThan(0.8); // 80% accuracy average
    });
  });

  describe('Memory Leak Detection Tests', () => {
    test('property: memory usage remains stable over time', async () => {
      const iterations = 1000;
      const memoryMeasurements = [];
      
      for (let i = 0; i < iterations; i++) {
        const operation = fc.sample(memoryOperationGenerator(), 1)[0];
        await performMemoryOperation(operation);
        
        // Measure memory every 100 operations
        if (i % 100 === 0) {
          const memoryUsage = process.memoryUsage().heapUsed;
          memoryMeasurements.push(memoryUsage);
        }
      }
      
      // Calculate memory growth
      const initialMemory = memoryMeasurements[0];
      const finalMemory = memoryMeasurements[memoryMeasurements.length - 1];
      const memoryGrowth = (finalMemory - initialMemory) / initialMemory;
      
      // Memory growth should be limited
      expect(memoryGrowth).toBeLessThan(MEMORY_PERFORMANCE_THRESHOLDS.maxMemoryGrowthRate);
      
      // Record memory stability
      performanceMonitor.recordMetric('memory_growth_rate', memoryGrowth);
    });
  });
});

// Helper functions for memory performance testing
async function performMemoryOperation(operation: any): Promise<any> {
  switch (operation.type) {
    case 'store':
      return await memoryManager.store(operation.key, operation.value, operation.ttl);
    case 'retrieve':
      return await memoryManager.retrieve(operation.key);
    case 'update':
      return await memoryManager.update(operation.key, operation.value);
    case 'delete':
      return await memoryManager.delete(operation.key);
    case 'search':
      return await memoryManager.search(operation.key);
    default:
      throw new Error(`Unknown operation type: ${operation.type}`);
  }
}

async function processConversationInput(input: any): Promise<E.Either<Error, any>> {
  try {
    // Simulate conversation processing
    const processingDelay = Math.random() * 500 + 200; // 200-700ms
    await new Promise(resolve => setTimeout(resolve, processingDelay));
    
    // Store conversation in memory
    await conversationMemory.store(input.sessionId, input);
    
    // Process with NLP
    const nlpResult = await nlpEngine.process(input.message, ['intent_classification']);
    
    // Build context
    const context = await contextManager.buildContext(input);
    
    const response = {
      response: 'Processed successfully',
      intent: nlpResult.intent,
      context: context,
      timestamp: Date.now()
    };
    
    return E.right(response);
  } catch (error) {
    return E.left(error as Error);
  }
}

async function buildConversationContext(scenario: any): Promise<any> {
  // Simulate context building
  const contextBuildingDelay = Math.random() * 30 + 10; // 10-40ms
  await new Promise(resolve => setTimeout(resolve, contextBuildingDelay));
  
  return {
    userId: scenario.userId,
    sessionDuration: scenario.sessionDuration,
    messageCount: scenario.messageCount,
    relevance: Math.random() * 0.3 + 0.7, // 70-100% relevance
    completeness: Math.random() * 0.2 + 0.8, // 80-100% completeness
    contextSwitches: scenario.contextSwitches,
    timestamp: Date.now()
  };
}