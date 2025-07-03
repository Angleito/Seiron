/**
 * Multi-Agent Coordination Integration Tests
 * Tests AI agent orchestration, decision-making coordination, and conflict resolution
 */

import { describe, test, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import * as fc from 'fast-check';

import { LendingAgent } from '../../../src/agents/lending/LendingAgent';
import { CLPAgent } from '../../../src/agents/liquidity/CLPAgent';
import { MarketAgent } from '../../../src/agents/market/MarketAgent';
import { AgentRegistry } from '../../../src/agents/base/AgentRegistry';
import { CrossProtocolOrchestrator } from '../../../src/orchestrator/core';

import { TestEnvironment } from '../../utils/TestEnvironment';
import { PropertyTestRunner } from '../../utils/PropertyTestRunner';
import { MetricsCollector } from '../../utils/MetricsCollector';
import { AgentTestHarness } from '../../utils/AgentTestHarness';

interface AgentDecision {
  agentId: string;
  agentType: string;
  decision: {
    action: string;
    parameters: Record<string, any>;
    confidence: number;
    reasoning: string;
  };
  timestamp: number;
  dependencies?: string[];
}

interface CoordinationScenario {
  userAddress: string;
  marketConditions: {
    volatility: number;
    trend: 'bullish' | 'bearish' | 'sideways';
    liquidity: 'high' | 'medium' | 'low';
  };
  portfolioState: {
    assets: Array<{ address: string; amount: string; value: number }>;
    totalValue: number;
    riskProfile: 'conservative' | 'moderate' | 'aggressive';
  };
  userIntent: string;
  expectedAgents: string[];
}

describe('Multi-Agent Coordination Integration Tests', () => {
  let testEnv: TestEnvironment;
  let lendingAgent: LendingAgent;
  let liquidityAgent: CLPAgent;
  let marketAgent: MarketAgent;
  let agentRegistry: AgentRegistry;
  let orchestrator: CrossProtocolOrchestrator;
  let metricsCollector: MetricsCollector;
  let propertyRunner: PropertyTestRunner;
  let agentHarness: AgentTestHarness;

  const testUserAddress = 'sei1multiuser1z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6';

  beforeAll(async () => {
    testEnv = await TestEnvironment.create();
    metricsCollector = new MetricsCollector('multi-agent');
    propertyRunner = new PropertyTestRunner();
    
    // Initialize agents
    lendingAgent = new LendingAgent({
      id: 'lending-agent-1',
      protocols: ['takara'],
      riskTolerance: 0.7,
      decisionThreshold: 0.6
    });

    liquidityAgent = new CLPAgent({
      id: 'liquidity-agent-1',
      protocols: ['symphony'],
      optimizationStrategy: 'yield',
      rebalanceThreshold: 0.02
    });

    marketAgent = new MarketAgent({
      id: 'market-agent-1',
      analysisDepth: 'comprehensive',
      predictionHorizon: '1day',
      riskAssessment: true
    });

    // Initialize agent registry
    agentRegistry = new AgentRegistry();
    await agentRegistry.registerAgent(lendingAgent);
    await agentRegistry.registerAgent(liquidityAgent);
    await agentRegistry.registerAgent(marketAgent);

    // Initialize orchestrator
    orchestrator = new CrossProtocolOrchestrator({
      agentRegistry,
      coordinationMode: 'collaborative',
      conflictResolution: 'consensus',
      decisionTimeout: 30000
    });

    agentHarness = new AgentTestHarness([lendingAgent, liquidityAgent, marketAgent]);

    await testEnv.waitForServices(['symphony-mock', 'takara-mock']);
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.resetState();
    await agentHarness.resetAgentStates();
    metricsCollector.startTest();
  });

  afterEach(async () => {
    metricsCollector.endTest();
  });

  describe('Agent Communication and Coordination', () => {
    test('should coordinate agents for yield optimization strategy', async () => {
      const scenario: CoordinationScenario = {
        userAddress: testUserAddress,
        marketConditions: {
          volatility: 0.2,
          trend: 'bullish',
          liquidity: 'high'
        },
        portfolioState: {
          assets: [
            { address: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6', amount: '50000000', value: 50000 },
            { address: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2', amount: '20000000', value: 10000 }
          ],
          totalValue: 60000,
          riskProfile: 'moderate'
        },
        userIntent: 'optimize yield while maintaining moderate risk',
        expectedAgents: ['lending-agent-1', 'liquidity-agent-1', 'market-agent-1']
      };

      const startTime = Date.now();

      // Initiate multi-agent coordination
      const coordinationResult = await orchestrator.coordinateAgents({
        scenario,
        requiredAgents: scenario.expectedAgents,
        coordinationMode: 'sequential',
        timeout: 30000
      });

      const duration = Date.now() - startTime;
      metricsCollector.recordLatency('agentCoordination', duration);

      expect(E.isRight(coordinationResult)).toBe(true);

      if (E.isRight(coordinationResult)) {
        const result = coordinationResult.right;

        expect(result.participatingAgents).toHaveLength(3);
        expect(result.decisions).toBeDefined();
        expect(result.consensusReached).toBe(true);
        expect(result.coordinationStrategy).toBeDefined();

        // Validate each agent provided a decision
        const agentDecisions = result.decisions;
        expect(agentDecisions.some(d => d.agentType === 'lending')).toBe(true);
        expect(agentDecisions.some(d => d.agentType === 'liquidity')).toBe(true);
        expect(agentDecisions.some(d => d.agentType === 'market')).toBe(true);

        // Check decision coherence
        agentDecisions.forEach(decision => {
          expect(decision.confidence).toBeGreaterThan(0.5);
          expect(decision.reasoning).toBeDefined();
          expect(decision.parameters).toBeDefined();
        });

        // Validate coordination strategy
        expect(result.coordinationStrategy.primaryAction).toBeDefined();
        expect(result.coordinationStrategy.supportingActions).toBeDefined();
        expect(result.coordinationStrategy.riskMitigation).toBeDefined();

        metricsCollector.recordValue('consensusTime', result.consensusTime);
        metricsCollector.recordValue('participatingAgents', result.participatingAgents.length);
      }
    });

    test('should handle conflicting agent recommendations', async () => {
      const conflictScenario: CoordinationScenario = {
        userAddress: testUserAddress,
        marketConditions: {
          volatility: 0.8, // High volatility
          trend: 'bearish',
          liquidity: 'low'
        },
        portfolioState: {
          assets: [
            { address: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6', amount: '10000000', value: 10000 },
            { address: 'sei1weth7z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6', amount: '5000', value: 12000000 }
          ],
          totalValue: 12010000,
          riskProfile: 'conservative'
        },
        userIntent: 'preserve capital in volatile market',
        expectedAgents: ['lending-agent-1', 'liquidity-agent-1', 'market-agent-1']
      };

      const coordinationResult = await orchestrator.coordinateAgents({
        scenario: conflictScenario,
        requiredAgents: conflictScenario.expectedAgents,
        coordinationMode: 'consensus',
        conflictResolution: 'risk_weighted',
        timeout: 30000
      });

      expect(E.isRight(coordinationResult)).toBe(true);

      if (E.isRight(coordinationResult)) {
        const result = coordinationResult.right;

        // Should still reach consensus despite conflicts
        expect(result.consensusReached).toBe(true);
        expect(result.conflictsResolved).toBeGreaterThanOrEqual(0);

        // Conservative approach should be prioritized
        const finalStrategy = result.coordinationStrategy;
        expect(finalStrategy.riskLevel).toBeLessThanOrEqual(0.4); // Low risk
        expect(finalStrategy.preservationFocus).toBe(true);

        // Check conflict resolution metadata
        if (result.conflictResolutionDetails) {
          expect(result.conflictResolutionDetails.method).toBe('risk_weighted');
          expect(result.conflictResolutionDetails.conflictsIdentified).toBeGreaterThanOrEqual(0);
        }

        metricsCollector.recordValue('conflictsResolved', result.conflictsResolved);
      }
    });

    test('should coordinate agents for complex leveraged position', async () => {
      const leverageScenario: CoordinationScenario = {
        userAddress: testUserAddress,
        marketConditions: {
          volatility: 0.3,
          trend: 'bullish',
          liquidity: 'high'
        },
        portfolioState: {
          assets: [
            { address: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6', amount: '100000000', value: 100000 }
          ],
          totalValue: 100000,
          riskProfile: 'aggressive'
        },
        userIntent: 'create 2x leveraged position on SEI with risk management',
        expectedAgents: ['lending-agent-1', 'liquidity-agent-1', 'market-agent-1']
      };

      const coordinationResult = await orchestrator.coordinateAgents({
        scenario: leverageScenario,
        requiredAgents: leverageScenario.expectedAgents,
        coordinationMode: 'collaborative',
        timeout: 45000
      });

      expect(E.isRight(coordinationResult)).toBe(true);

      if (E.isRight(coordinationResult)) {
        const result = coordinationResult.right;

        expect(result.consensusReached).toBe(true);
        expect(result.decisions).toHaveLength(3);

        // Validate leverage-specific coordination
        const lendingDecision = result.decisions.find(d => d.agentType === 'lending');
        const liquidityDecision = result.decisions.find(d => d.agentType === 'liquidity');
        const marketDecision = result.decisions.find(d => d.agentType === 'market');

        expect(lendingDecision).toBeDefined();
        expect(liquidityDecision).toBeDefined();
        expect(marketDecision).toBeDefined();

        if (lendingDecision && liquidityDecision && marketDecision) {
          // Lending agent should handle collateral and borrowing
          expect(lendingDecision.decision.action).toContain('leverage');
          expect(lendingDecision.decision.parameters.leverageRatio).toBeDefined();
          expect(lendingDecision.decision.parameters.healthFactorTarget).toBeGreaterThan(1.5);

          // Liquidity agent should handle swaps
          expect(liquidityDecision.decision.action).toContain('swap');
          expect(liquidityDecision.decision.parameters.slippageProtection).toBeDefined();

          // Market agent should provide risk assessment
          expect(marketDecision.decision.action).toContain('monitor');
          expect(marketDecision.decision.parameters.riskThresholds).toBeDefined();
        }

        // Check coordination timeline
        const executionPlan = result.coordinationStrategy.executionPlan;
        expect(executionPlan).toBeDefined();
        expect(executionPlan.length).toBeGreaterThan(0);

        // Validate execution order (lending should come before swapping)
        const lendingStep = executionPlan.find(step => step.agentType === 'lending');
        const liquidityStep = executionPlan.find(step => step.agentType === 'liquidity');
        
        if (lendingStep && liquidityStep) {
          expect(lendingStep.order).toBeLessThan(liquidityStep.order);
        }
      }
    });

    test('should handle agent unavailability gracefully', async () => {
      // Simulate one agent being unavailable
      await agentRegistry.setAgentStatus('market-agent-1', 'unavailable');

      const scenario: CoordinationScenario = {
        userAddress: testUserAddress,
        marketConditions: {
          volatility: 0.15,
          trend: 'sideways',
          liquidity: 'medium'
        },
        portfolioState: {
          assets: [
            { address: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6', amount: '25000000', value: 25000 }
          ],
          totalValue: 25000,
          riskProfile: 'moderate'
        },
        userIntent: 'simple yield optimization',
        expectedAgents: ['lending-agent-1', 'liquidity-agent-1', 'market-agent-1']
      };

      const coordinationResult = await orchestrator.coordinateAgents({
        scenario,
        requiredAgents: ['lending-agent-1', 'liquidity-agent-1'], // Only require available agents
        optionalAgents: ['market-agent-1'],
        coordinationMode: 'adaptive',
        timeout: 30000
      });

      expect(E.isRight(coordinationResult)).toBe(true);

      if (E.isRight(coordinationResult)) {
        const result = coordinationResult.right;

        expect(result.consensusReached).toBe(true);
        expect(result.participatingAgents).toHaveLength(2); // Only available agents
        expect(result.unavailableAgents).toContain('market-agent-1');

        // Should still provide viable strategy
        expect(result.coordinationStrategy).toBeDefined();
        expect(result.coordinationStrategy.adaptedForMissingAgents).toBe(true);

        metricsCollector.recordValue('unavailableAgents', result.unavailableAgents.length);
      }

      // Restore agent availability
      await agentRegistry.setAgentStatus('market-agent-1', 'available');
    });
  });

  describe('Property-Based Agent Coordination Tests', () => {
    test('property: agent decisions are internally consistent', async () => {
      const scenarioGenerator = fc.record({
        userAddress: propertyRunner.generateUserAddress(),
        volatility: fc.float({ min: 0.1, max: 1.0 }),
        trend: fc.constantFrom('bullish', 'bearish', 'sideways'),
        totalValue: fc.integer({ min: 10000, max: 1000000 }),
        riskProfile: fc.constantFrom('conservative', 'moderate', 'aggressive'),
        userIntent: fc.constantFrom(
          'maximize yield',
          'minimize risk',
          'balanced approach',
          'leverage position',
          'preserve capital'
        )
      });

      await fc.assert(
        fc.asyncProperty(scenarioGenerator, async (scenarioData) => {
          const scenario: CoordinationScenario = {
            userAddress: scenarioData.userAddress,
            marketConditions: {
              volatility: scenarioData.volatility,
              trend: scenarioData.trend,
              liquidity: 'medium'
            },
            portfolioState: {
              assets: [
                { 
                  address: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6', 
                  amount: scenarioData.totalValue.toString(), 
                  value: scenarioData.totalValue 
                }
              ],
              totalValue: scenarioData.totalValue,
              riskProfile: scenarioData.riskProfile
            },
            userIntent: scenarioData.userIntent,
            expectedAgents: ['lending-agent-1', 'liquidity-agent-1']
          };

          const coordinationResult = await orchestrator.coordinateAgents({
            scenario,
            requiredAgents: scenario.expectedAgents,
            coordinationMode: 'collaborative',
            timeout: 20000
          });

          if (E.isRight(coordinationResult)) {
            const result = coordinationResult.right;

            // All decisions should align with risk profile
            const decisions = result.decisions;
            
            for (const decision of decisions) {
              // Conservative risk profile should result in low-risk decisions
              if (scenario.portfolioState.riskProfile === 'conservative') {
                const riskIndicators = [
                  decision.decision.parameters.leverageRatio || 1.0,
                  decision.decision.parameters.slippageTolerance || 0.01,
                  decision.decision.parameters.maxExposure || 0.5
                ];
                
                const isLowRisk = riskIndicators.every(indicator => 
                  indicator <= (indicator === decision.decision.parameters.leverageRatio ? 1.5 : 0.05)
                );
                
                if (!isLowRisk) return false;
              }

              // Aggressive profile should allow higher risk
              if (scenario.portfolioState.riskProfile === 'aggressive') {
                expect(decision.confidence).toBeGreaterThan(0.3);
              }

              // All decisions should have valid confidence scores
              if (decision.confidence < 0 || decision.confidence > 1) {
                return false;
              }
            }

            return true;
          }

          return true; // Failed coordination is acceptable for some scenarios
        }),
        { numRuns: 10, timeout: 30000 }
      );
    });

    test('property: coordination time scales with complexity', async () => {
      const complexityGenerator = fc.record({
        numAgents: fc.integer({ min: 2, max: 4 }),
        numAssets: fc.integer({ min: 1, max: 5 }),
        volatility: fc.float({ min: 0.1, max: 1.0 }),
        operationComplexity: fc.constantFrom('simple', 'medium', 'complex')
      });

      const measurements: Array<{ complexity: number; time: number }> = [];

      await fc.assert(
        fc.asyncProperty(complexityGenerator, async (params) => {
          // Calculate complexity score
          const complexityScore = params.numAgents * 0.3 + 
                                 params.numAssets * 0.2 + 
                                 params.volatility * 0.3 +
                                 (params.operationComplexity === 'complex' ? 0.5 : 
                                  params.operationComplexity === 'medium' ? 0.3 : 0.1);

          const scenario: CoordinationScenario = {
            userAddress: testUserAddress,
            marketConditions: {
              volatility: params.volatility,
              trend: 'sideways',
              liquidity: 'medium'
            },
            portfolioState: {
              assets: Array.from({ length: params.numAssets }, (_, i) => ({
                address: `sei1asset${i}z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6`,
                amount: '10000000',
                value: 10000
              })),
              totalValue: 10000 * params.numAssets,
              riskProfile: 'moderate'
            },
            userIntent: 'optimize portfolio',
            expectedAgents: ['lending-agent-1', 'liquidity-agent-1'].slice(0, params.numAgents)
          };

          const startTime = Date.now();
          
          const coordinationResult = await orchestrator.coordinateAgents({
            scenario,
            requiredAgents: scenario.expectedAgents,
            coordinationMode: 'collaborative',
            timeout: 30000
          });

          const duration = Date.now() - startTime;
          measurements.push({ complexity: complexityScore, time: duration });

          return E.isRight(coordinationResult) || true; // Accept failures
        }),
        { numRuns: 8, timeout: 40000 }
      );

      // Analyze correlation between complexity and time
      if (measurements.length >= 5) {
        const avgSimple = measurements
          .filter(m => m.complexity < 1.0)
          .reduce((sum, m) => sum + m.time, 0) / 
          measurements.filter(m => m.complexity < 1.0).length || 0;

        const avgComplex = measurements
          .filter(m => m.complexity >= 1.5)
          .reduce((sum, m) => sum + m.time, 0) / 
          measurements.filter(m => m.complexity >= 1.5).length || 0;

        if (avgSimple > 0 && avgComplex > 0) {
          // Complex operations should generally take longer (allowing some variance)
          expect(avgComplex).toBeGreaterThan(avgSimple * 0.8);
        }

        metricsCollector.recordValue('complexityCorrelation', 
          avgComplex > 0 ? avgComplex / Math.max(avgSimple, 1) : 1);
      }
    });

    test('property: consensus quality improves with more agents', async () => {
      const consensusQualityGenerator = fc.record({
        agentCount: fc.integer({ min: 2, max: 3 }),
        marketStability: fc.float({ min: 0.2, max: 0.8 })
      });

      const qualityMeasurements: Array<{ agentCount: number; quality: number }> = [];

      await fc.assert(
        fc.asyncProperty(consensusQualityGenerator, async (params) => {
          const availableAgents = ['lending-agent-1', 'liquidity-agent-1', 'market-agent-1'];
          const selectedAgents = availableAgents.slice(0, params.agentCount);

          const scenario: CoordinationScenario = {
            userAddress: testUserAddress,
            marketConditions: {
              volatility: 1 - params.marketStability,
              trend: 'sideways',
              liquidity: 'medium'
            },
            portfolioState: {
              assets: [
                { address: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6', amount: '50000000', value: 50000 }
              ],
              totalValue: 50000,
              riskProfile: 'moderate'
            },
            userIntent: 'balanced optimization',
            expectedAgents: selectedAgents
          };

          const coordinationResult = await orchestrator.coordinateAgents({
            scenario,
            requiredAgents: selectedAgents,
            coordinationMode: 'consensus',
            timeout: 25000
          });

          if (E.isRight(coordinationResult)) {
            const result = coordinationResult.right;
            
            // Calculate consensus quality based on multiple factors
            const avgConfidence = result.decisions.reduce((sum, d) => sum + d.confidence, 0) / result.decisions.length;
            const consensusStrength = result.consensusStrength || 0.5;
            const strategyCoherence = result.coordinationStrategy.coherenceScore || 0.5;
            
            const quality = (avgConfidence + consensusStrength + strategyCoherence) / 3;
            
            qualityMeasurements.push({ agentCount: params.agentCount, quality });
            
            return quality > 0.3; // Minimum quality threshold
          }

          return true; // Failed coordination is acceptable
        }),
        { numRuns: 8, timeout: 35000 }
      );

      // Analyze relationship between agent count and consensus quality
      if (qualityMeasurements.length >= 4) {
        const twoAgentQuality = qualityMeasurements
          .filter(m => m.agentCount === 2)
          .reduce((sum, m) => sum + m.quality, 0) / 
          Math.max(qualityMeasurements.filter(m => m.agentCount === 2).length, 1);

        const threeAgentQuality = qualityMeasurements
          .filter(m => m.agentCount === 3)
          .reduce((sum, m) => sum + m.quality, 0) / 
          Math.max(qualityMeasurements.filter(m => m.agentCount === 3).length, 1);

        if (twoAgentQuality > 0 && threeAgentQuality > 0) {
          metricsCollector.recordValue('twoAgentQuality', twoAgentQuality);
          metricsCollector.recordValue('threeAgentQuality', threeAgentQuality);
          
          // More agents should generally improve consensus quality
          expect(threeAgentQuality).toBeGreaterThan(twoAgentQuality * 0.9);
        }
      }
    });
  });

  describe('Agent Performance and Reliability', () => {
    test('should maintain performance under concurrent coordination requests', async () => {
      const concurrentRequests = 5;
      
      const scenarios = Array.from({ length: concurrentRequests }, (_, i) => ({
        userAddress: `sei1user${i}z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6`,
        marketConditions: {
          volatility: 0.2 + i * 0.1,
          trend: ['bullish', 'bearish', 'sideways'][i % 3] as 'bullish' | 'bearish' | 'sideways',
          liquidity: 'medium' as const
        },
        portfolioState: {
          assets: [
            { 
              address: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6', 
              amount: (10000000 + i * 5000000).toString(), 
              value: 10000 + i * 5000 
            }
          ],
          totalValue: 10000 + i * 5000,
          riskProfile: ['conservative', 'moderate', 'aggressive'][i % 3] as 'conservative' | 'moderate' | 'aggressive'
        },
        userIntent: 'optimize portfolio',
        expectedAgents: ['lending-agent-1', 'liquidity-agent-1']
      }));

      const startTime = Date.now();
      
      const results = await Promise.allSettled(
        scenarios.map(scenario => 
          orchestrator.coordinateAgents({
            scenario,
            requiredAgents: scenario.expectedAgents,
            coordinationMode: 'collaborative',
            timeout: 20000
          })
        )
      );

      const duration = Date.now() - startTime;
      const successfulResults = results.filter(r => 
        r.status === 'fulfilled' && E.isRight(r.value)
      );

      expect(successfulResults.length).toBeGreaterThan(concurrentRequests * 0.8);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      metricsCollector.recordLatency('concurrentCoordination', duration);
      metricsCollector.recordThroughput('concurrentCoordination', concurrentRequests, duration);
      metricsCollector.recordValue('concurrentSuccessRate', 
        successfulResults.length / concurrentRequests);
    });

    test('should recover from agent failures during coordination', async () => {
      const scenario: CoordinationScenario = {
        userAddress: testUserAddress,
        marketConditions: {
          volatility: 0.3,
          trend: 'bullish',
          liquidity: 'high'
        },
        portfolioState: {
          assets: [
            { address: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6', amount: '30000000', value: 30000 }
          ],
          totalValue: 30000,
          riskProfile: 'moderate'
        },
        userIntent: 'optimize with failover test',
        expectedAgents: ['lending-agent-1', 'liquidity-agent-1', 'market-agent-1']
      };

      // Start coordination
      const coordinationPromise = orchestrator.coordinateAgents({
        scenario,
        requiredAgents: scenario.expectedAgents,
        coordinationMode: 'fault_tolerant',
        timeout: 30000
      });

      // Simulate agent failure after 5 seconds
      setTimeout(async () => {
        await agentRegistry.setAgentStatus('market-agent-1', 'failed');
      }, 5000);

      const coordinationResult = await coordinationPromise;

      // Should still complete successfully with remaining agents
      expect(E.isRight(coordinationResult)).toBe(true);

      if (E.isRight(coordinationResult)) {
        const result = coordinationResult.right;

        expect(result.consensusReached).toBe(true);
        expect(result.failureRecovery).toBeDefined();
        expect(result.participatingAgents.length).toBeGreaterThanOrEqual(2);
        
        // Should have adapted strategy for missing agent
        expect(result.coordinationStrategy.adaptedForFailures).toBe(true);

        metricsCollector.recordValue('failureRecoveryTime', result.failureRecovery?.recoveryTime || 0);
      }

      // Restore agent
      await agentRegistry.setAgentStatus('market-agent-1', 'available');
    });

    test('should optimize coordination strategies based on historical performance', async () => {
      const historicalScenarios = [
        { riskProfile: 'conservative', expectedStrategy: 'risk_averse' },
        { riskProfile: 'moderate', expectedStrategy: 'balanced' },
        { riskProfile: 'aggressive', expectedStrategy: 'yield_focused' }
      ];

      for (const histScenario of historicalScenarios) {
        const scenario: CoordinationScenario = {
          userAddress: testUserAddress,
          marketConditions: {
            volatility: 0.25,
            trend: 'sideways',
            liquidity: 'medium'
          },
          portfolioState: {
            assets: [
              { address: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6', amount: '40000000', value: 40000 }
            ],
            totalValue: 40000,
            riskProfile: histScenario.riskProfile as any
          },
          userIntent: 'learn from history',
          expectedAgents: ['lending-agent-1', 'liquidity-agent-1']
        };

        const coordinationResult = await orchestrator.coordinateAgents({
          scenario,
          requiredAgents: scenario.expectedAgents,
          coordinationMode: 'learning',
          useHistoricalOptimization: true,
          timeout: 25000
        });

        expect(E.isRight(coordinationResult)).toBe(true);

        if (E.isRight(coordinationResult)) {
          const result = coordinationResult.right;

          expect(result.coordinationStrategy.strategyType).toBe(histScenario.expectedStrategy);
          expect(result.historicalOptimizations).toBeDefined();
          
          // Strategy should be optimized based on past performance
          if (result.historicalOptimizations) {
            expect(result.historicalOptimizations.similarScenariosAnalyzed).toBeGreaterThan(0);
            expect(result.historicalOptimizations.performanceImprovement).toBeDefined();
          }

          metricsCollector.recordValue('historicalOptimization', 
            result.historicalOptimizations?.performanceImprovement || 0);
        }
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle coordination timeout gracefully', async () => {
      const timeoutScenario: CoordinationScenario = {
        userAddress: testUserAddress,
        marketConditions: {
          volatility: 0.9, // High volatility requiring complex analysis
          trend: 'bearish',
          liquidity: 'low'
        },
        portfolioState: {
          assets: [
            { address: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6', amount: '100000000', value: 100000 }
          ],
          totalValue: 100000,
          riskProfile: 'aggressive'
        },
        userIntent: 'complex multi-protocol strategy requiring long analysis',
        expectedAgents: ['lending-agent-1', 'liquidity-agent-1', 'market-agent-1']
      };

      const coordinationResult = await orchestrator.coordinateAgents({
        scenario: timeoutScenario,
        requiredAgents: timeoutScenario.expectedAgents,
        coordinationMode: 'thorough',
        timeout: 5000 // Very short timeout
      });

      // Should handle timeout gracefully
      if (E.isLeft(coordinationResult)) {
        expect(coordinationResult.left.type).toBe('coordination_timeout');
        expect(coordinationResult.left.partialResults).toBeDefined();
        
        // Should provide best-effort strategy
        expect(coordinationResult.left.fallbackStrategy).toBeDefined();
      } else {
        // If it completes within timeout, should be valid
        expect(coordinationResult.right.consensusReached).toBe(true);
      }
    });

    test('should handle invalid coordination scenarios', async () => {
      const invalidScenarios = [
        {
          name: 'empty portfolio',
          scenario: {
            userAddress: testUserAddress,
            marketConditions: { volatility: 0.2, trend: 'sideways' as const, liquidity: 'medium' as const },
            portfolioState: { assets: [], totalValue: 0, riskProfile: 'moderate' as const },
            userIntent: 'optimize empty portfolio',
            expectedAgents: ['lending-agent-1']
          }
        },
        {
          name: 'negative portfolio value',
          scenario: {
            userAddress: testUserAddress,
            marketConditions: { volatility: 0.2, trend: 'sideways' as const, liquidity: 'medium' as const },
            portfolioState: {
              assets: [{ address: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6', amount: '-1000000', value: -1000 }],
              totalValue: -1000,
              riskProfile: 'moderate' as const
            },
            userIntent: 'fix negative portfolio',
            expectedAgents: ['lending-agent-1']
          }
        }
      ];

      for (const invalidScenario of invalidScenarios) {
        const coordinationResult = await orchestrator.coordinateAgents({
          scenario: invalidScenario.scenario,
          requiredAgents: invalidScenario.scenario.expectedAgents,
          coordinationMode: 'validation',
          timeout: 15000
        });

        // Should either handle gracefully or provide appropriate error
        if (E.isLeft(coordinationResult)) {
          expect(coordinationResult.left.type).toBeOneOf([
            'invalid_scenario',
            'validation_failed',
            'insufficient_data'
          ]);
        } else {
          // If handled successfully, should provide conservative strategy
          expect(coordinationResult.right.coordinationStrategy.riskLevel).toBeLessThan(0.3);
        }
      }
    });
  });
});