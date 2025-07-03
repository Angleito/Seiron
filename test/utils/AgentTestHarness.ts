/**
 * Agent Test Harness
 * Provides utilities for testing AI agents in isolation and coordination
 */

import { EventEmitter } from 'events';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';

export interface AgentConfig {
  id: string;
  type: string;
  protocols: string[];
  decisionThreshold: number;
  maxResponseTime: number;
}

export interface AgentState {
  id: string;
  status: 'idle' | 'processing' | 'completed' | 'failed' | 'unavailable';
  lastActivity: number;
  currentTask?: string;
  performance: {
    totalDecisions: number;
    successfulDecisions: number;
    averageResponseTime: number;
    lastError?: Error;
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
}

export interface AgentDecisionContext {
  userAddress: string;
  portfolioState: any;
  marketConditions: any;
  constraints: any;
  timeout: number;
}

export interface AgentDecisionResult {
  agentId: string;
  decision: {
    action: string;
    parameters: Record<string, any>;
    confidence: number;
    reasoning: string;
    estimatedImpact: any;
  };
  executionTime: number;
  metadata: Record<string, any>;
}

export interface MockAgent {
  id: string;
  type: string;
  config: AgentConfig;
  state: AgentState;
  makeDecision(context: AgentDecisionContext): Promise<E.Either<Error, AgentDecisionResult>>;
  updateState(updates: Partial<AgentState>): void;
  getPerformanceMetrics(): AgentState['performance'];
  simulate(scenario: any): Promise<any>;
}

export class AgentTestHarness extends EventEmitter {
  private agents: Map<string, MockAgent> = new Map();
  private testScenarios: Map<string, any> = new Map();
  private coordinationLogs: Array<{
    timestamp: number;
    agentIds: string[];
    scenario: string;
    result: any;
  }> = [];

  constructor(initialAgents: any[] = []) {
    super();
    this.initializeAgents(initialAgents);
  }

  private initializeAgents(agentInstances: any[]): void {
    agentInstances.forEach((agentInstance, index) => {
      const mockAgent = this.createMockAgent(agentInstance, index);
      this.agents.set(mockAgent.id, mockAgent);
    });
  }

  private createMockAgent(agentInstance: any, index: number): MockAgent {
    const agentConfig: AgentConfig = {
      id: agentInstance.config?.id || `mock-agent-${index}`,
      type: this.determineAgentType(agentInstance),
      protocols: agentInstance.config?.protocols || ['mock'],
      decisionThreshold: agentInstance.config?.decisionThreshold || 0.5,
      maxResponseTime: agentInstance.config?.maxResponseTime || 10000
    };

    const agentState: AgentState = {
      id: agentConfig.id,
      status: 'idle',
      lastActivity: Date.now(),
      performance: {
        totalDecisions: 0,
        successfulDecisions: 0,
        averageResponseTime: 0,
        lastError: undefined
      },
      resources: {
        memoryUsage: Math.random() * 100,
        cpuUsage: Math.random() * 50,
        activeConnections: 0
      }
    };

    return {
      id: agentConfig.id,
      type: agentConfig.type,
      config: agentConfig,
      state: agentState,

      async makeDecision(context: AgentDecisionContext): Promise<E.Either<Error, AgentDecisionResult>> {
        const startTime = Date.now();
        
        try {
          this.state.status = 'processing';
          this.state.currentTask = `decision_${Date.now()}`;
          this.state.performance.totalDecisions++;

          // Simulate decision-making process
          await this.simulateThinking(context);

          const decision = await this.generateDecision(context);
          const executionTime = Date.now() - startTime;

          // Update performance metrics
          this.state.performance.successfulDecisions++;
          this.state.performance.averageResponseTime = 
            (this.state.performance.averageResponseTime * (this.state.performance.totalDecisions - 1) + executionTime) / 
            this.state.performance.totalDecisions;

          this.state.status = 'completed';
          this.state.lastActivity = Date.now();

          const result: AgentDecisionResult = {
            agentId: this.id,
            decision,
            executionTime,
            metadata: {
              confidence: decision.confidence,
              reasoning: decision.reasoning,
              timestamp: Date.now(),
              context: context
            }
          };

          return E.right(result);

        } catch (error) {
          this.state.status = 'failed';
          this.state.performance.lastError = error instanceof Error ? error : new Error(String(error));
          
          return E.left(this.state.performance.lastError);
        }
      },

      updateState(updates: Partial<AgentState>): void {
        Object.assign(this.state, updates);
        this.state.lastActivity = Date.now();
      },

      getPerformanceMetrics(): AgentState['performance'] {
        return { ...this.state.performance };
      },

      async simulate(scenario: any): Promise<any> {
        // Simulate agent behavior based on scenario
        return this.simulateAgentBehavior(scenario);
      },

      // Helper methods
      async simulateThinking(context: AgentDecisionContext): Promise<void> {
        const thinkingTime = Math.random() * 2000 + 500; // 500-2500ms
        await new Promise(resolve => setTimeout(resolve, thinkingTime));
      },

      async generateDecision(context: AgentDecisionContext): Promise<AgentDecisionResult['decision']> {
        const decisions = this.getAgentSpecificDecisions(agentConfig.type);
        const selectedDecision = decisions[Math.floor(Math.random() * decisions.length)];

        const confidence = this.calculateConfidence(context);
        const reasoning = this.generateReasoning(selectedDecision, context, confidence);

        return {
          action: selectedDecision.action,
          parameters: selectedDecision.parameters,
          confidence,
          reasoning,
          estimatedImpact: selectedDecision.estimatedImpact
        };
      },

      getAgentSpecificDecisions(agentType: string): Array<{
        action: string;
        parameters: Record<string, any>;
        estimatedImpact: any;
      }> {
        switch (agentType) {
          case 'lending':
            return [
              {
                action: 'supply_collateral',
                parameters: {
                  asset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
                  amount: '10000000',
                  protocol: 'takara'
                },
                estimatedImpact: { apy: 3.5, riskScore: 0.2 }
              },
              {
                action: 'optimize_lending_yield',
                parameters: {
                  rebalanceThreshold: 0.02,
                  maxSlippage: 0.005,
                  targetAPY: 4.0
                },
                estimatedImpact: { yieldIncrease: 0.8, riskIncrease: 0.1 }
              },
              {
                action: 'create_leveraged_position',
                parameters: {
                  leverageRatio: 2.0,
                  collateralAsset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
                  targetAsset: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
                  healthFactorTarget: 1.8
                },
                estimatedImpact: { expectedReturn: 8.5, riskScore: 0.6 }
              }
            ];

          case 'liquidity':
            return [
              {
                action: 'optimize_swap_route',
                parameters: {
                  tokenIn: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
                  tokenOut: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
                  maxSlippage: 0.01,
                  routeOptimization: 'price'
                },
                estimatedImpact: { slippageReduction: 0.003, gasSavings: 15000 }
              },
              {
                action: 'provide_liquidity',
                parameters: {
                  pool: 'SEI/USDC',
                  amount0: '5000000',
                  amount1: '2500000',
                  feeTarget: 0.003
                },
                estimatedImpact: { lpAPY: 12.5, impermanentLossRisk: 0.15 }
              },
              {
                action: 'arbitrage_opportunity',
                parameters: {
                  protocol1: 'symphony',
                  protocol2: 'takara',
                  asset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
                  amount: '25000000'
                },
                estimatedImpact: { profit: 125.50, executionRisk: 0.25 }
              }
            ];

          case 'market':
            return [
              {
                action: 'risk_assessment',
                parameters: {
                  timeHorizon: '24h',
                  volatilityAnalysis: true,
                  correlationAnalysis: true,
                  liquidityAnalysis: true
                },
                estimatedImpact: { riskScore: 0.35, confidence: 0.82 }
              },
              {
                action: 'trend_analysis',
                parameters: {
                  indicators: ['RSI', 'MACD', 'volume'],
                  timeframe: '1h',
                  prediction: 'bullish'
                },
                estimatedImpact: { trendStrength: 0.65, reliability: 0.75 }
              },
              {
                action: 'portfolio_rebalance_recommendation',
                parameters: {
                  currentAllocation: { 'USDC': 0.6, 'SEI': 0.4 },
                  targetAllocation: { 'USDC': 0.55, 'SEI': 0.45 },
                  rebalanceUrgency: 'medium'
                },
                estimatedImpact: { expectedImprovement: 0.12, rebalanceCost: 25.75 }
              }
            ];

          default:
            return [
              {
                action: 'no_action',
                parameters: {},
                estimatedImpact: { impact: 0 }
              }
            ];
        }
      },

      calculateConfidence(context: AgentDecisionContext): number {
        let confidence = 0.5; // Base confidence

        // Adjust based on market conditions
        if (context.marketConditions) {
          const volatility = context.marketConditions.volatility || 0.5;
          confidence -= volatility * 0.2; // Higher volatility reduces confidence

          if (context.marketConditions.trend === 'sideways') {
            confidence += 0.1; // More confident in stable markets
          }
        }

        // Adjust based on portfolio size
        if (context.portfolioState?.totalValue) {
          const portfolioSize = context.portfolioState.totalValue;
          if (portfolioSize < 10000) {
            confidence -= 0.1; // Less confident with small portfolios
          } else if (portfolioSize > 100000) {
            confidence += 0.1; // More confident with larger portfolios
          }
        }

        // Add some randomness
        confidence += (Math.random() - 0.5) * 0.2;

        return Math.max(0.1, Math.min(0.95, confidence));
      },

      generateReasoning(decision: any, context: AgentDecisionContext, confidence: number): string {
        const reasoningTemplates = {
          high_confidence: [
            `Strong market indicators support ${decision.action} with ${Math.round(confidence * 100)}% confidence`,
            `Portfolio analysis clearly indicates ${decision.action} is optimal given current conditions`,
            `Technical analysis strongly suggests ${decision.action} will achieve target objectives`
          ],
          medium_confidence: [
            `Market conditions moderately favor ${decision.action} strategy`,
            `Risk-adjusted analysis suggests ${decision.action} is prudent given portfolio state`,
            `Current metrics indicate ${decision.action} aligns with user risk profile`
          ],
          low_confidence: [
            `Limited data suggests ${decision.action} may be appropriate with careful monitoring`,
            `Conservative approach recommends ${decision.action} pending market clarification`,
            `Preliminary analysis indicates ${decision.action} with heightened risk awareness`
          ]
        };

        let category: keyof typeof reasoningTemplates;
        if (confidence > 0.7) {
          category = 'high_confidence';
        } else if (confidence > 0.4) {
          category = 'medium_confidence';
        } else {
          category = 'low_confidence';
        }

        const templates = reasoningTemplates[category];
        return templates[Math.floor(Math.random() * templates.length)];
      },

      async simulateAgentBehavior(scenario: any): Promise<any> {
        // Simulate various agent behaviors based on scenario type
        switch (scenario.type) {
          case 'stress_test':
            return this.simulateStressTest(scenario);
          case 'failure_simulation':
            return this.simulateFailure(scenario);
          case 'performance_test':
            return this.simulatePerformanceTest(scenario);
          default:
            return { success: true, result: 'Scenario completed' };
        }
      },

      async simulateStressTest(scenario: any): Promise<any> {
        const stressLevel = scenario.stressLevel || 0.5;
        
        // Simulate increased response time under stress
        const baseResponseTime = 1000;
        const stressResponseTime = baseResponseTime * (1 + stressLevel * 2);
        await new Promise(resolve => setTimeout(resolve, stressResponseTime));

        // Simulate reduced confidence under stress
        const stressConfidence = Math.max(0.1, 0.8 - stressLevel * 0.4);

        return {
          success: Math.random() > stressLevel * 0.3,
          responseTime: stressResponseTime,
          confidence: stressConfidence,
          stressLevel
        };
      },

      async simulateFailure(scenario: any): Promise<any> {
        const failureRate = scenario.failureRate || 0.1;
        
        if (Math.random() < failureRate) {
          this.state.status = 'failed';
          throw new Error(`Simulated failure: ${scenario.failureType || 'unknown'}`);
        }

        return { success: true, failureAvoided: true };
      },

      async simulatePerformanceTest(scenario: any): Promise<any> {
        const operations = scenario.operations || 10;
        const results = [];

        for (let i = 0; i < operations; i++) {
          const startTime = Date.now();
          
          // Simulate processing
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 200));
          
          const endTime = Date.now();
          results.push({
            operation: i + 1,
            duration: endTime - startTime,
            success: Math.random() > 0.05 // 95% success rate
          });
        }

        return {
          totalOperations: operations,
          results,
          averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
          successRate: results.filter(r => r.success).length / results.length
        };
      }
    };
  }

  private determineAgentType(agentInstance: any): string {
    if (agentInstance.constructor.name.includes('Lending')) return 'lending';
    if (agentInstance.constructor.name.includes('Liquidity') || agentInstance.constructor.name.includes('CLP')) return 'liquidity';
    if (agentInstance.constructor.name.includes('Market')) return 'market';
    return 'unknown';
  }

  // Public methods for test management

  async resetAgentStates(): Promise<void> {
    for (const agent of this.agents.values()) {
      agent.updateState({
        status: 'idle',
        currentTask: undefined,
        performance: {
          totalDecisions: 0,
          successfulDecisions: 0,
          averageResponseTime: 0,
          lastError: undefined
        },
        resources: {
          memoryUsage: Math.random() * 100,
          cpuUsage: Math.random() * 50,
          activeConnections: 0
        }
      });
    }
    
    this.coordinationLogs = [];
    this.emit('agentsReset');
  }

  getAgent(agentId: string): MockAgent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): MockAgent[] {
    return Array.from(this.agents.values());
  }

  async simulateAgentCoordination(scenario: {
    agentIds: string[];
    coordinationType: 'sequential' | 'parallel' | 'consensus';
    timeout: number;
  }): Promise<{
    success: boolean;
    results: Record<string, any>;
    coordinationTime: number;
    consensusReached?: boolean;
  }> {
    const startTime = Date.now();
    const results: Record<string, any> = {};

    try {
      const participatingAgents = scenario.agentIds
        .map(id => this.agents.get(id))
        .filter(agent => agent !== undefined) as MockAgent[];

      if (participatingAgents.length === 0) {
        throw new Error('No valid agents found for coordination');
      }

      switch (scenario.coordinationType) {
        case 'sequential':
          for (const agent of participatingAgents) {
            const context: AgentDecisionContext = {
              userAddress: 'sei1testuser',
              portfolioState: { totalValue: 50000 },
              marketConditions: { volatility: 0.3 },
              constraints: {},
              timeout: scenario.timeout / participatingAgents.length
            };

            const decision = await agent.makeDecision(context);
            results[agent.id] = decision;
          }
          break;

        case 'parallel':
          const parallelPromises = participatingAgents.map(async agent => {
            const context: AgentDecisionContext = {
              userAddress: 'sei1testuser',
              portfolioState: { totalValue: 50000 },
              marketConditions: { volatility: 0.3 },
              constraints: {},
              timeout: scenario.timeout
            };

            const decision = await agent.makeDecision(context);
            return { agentId: agent.id, decision };
          });

          const parallelResults = await Promise.allSettled(parallelPromises);
          parallelResults.forEach((result, index) => {
            const agentId = participatingAgents[index].id;
            results[agentId] = result.status === 'fulfilled' ? result.value.decision : { error: 'Failed' };
          });
          break;

        case 'consensus':
          // Simulate consensus building
          const consensusRounds = 3;
          let consensusReached = false;

          for (let round = 0; round < consensusRounds; round++) {
            const roundResults: Record<string, any> = {};

            for (const agent of participatingAgents) {
              const context: AgentDecisionContext = {
                userAddress: 'sei1testuser',
                portfolioState: { totalValue: 50000 },
                marketConditions: { volatility: 0.3 },
                constraints: { consensusRound: round, previousResults: results },
                timeout: scenario.timeout / consensusRounds
              };

              const decision = await agent.makeDecision(context);
              roundResults[agent.id] = decision;
            }

            // Check for consensus (simplified: similar confidence levels)
            const confidences = Object.values(roundResults)
              .map((result: any) => E.isRight(result) ? result.right.decision.confidence : 0);
            
            const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
            const confidenceVariance = confidences.reduce((sum, conf) => sum + Math.pow(conf - avgConfidence, 2), 0) / confidences.length;

            if (confidenceVariance < 0.1) {
              consensusReached = true;
              Object.assign(results, roundResults);
              break;
            }

            Object.assign(results, roundResults);
          }

          results.consensusReached = consensusReached;
          break;
      }

      const coordinationTime = Date.now() - startTime;

      this.coordinationLogs.push({
        timestamp: Date.now(),
        agentIds: scenario.agentIds,
        scenario: scenario.coordinationType,
        result: results
      });

      return {
        success: true,
        results,
        coordinationTime,
        consensusReached: results.consensusReached
      };

    } catch (error) {
      return {
        success: false,
        results: { error: error instanceof Error ? error.message : String(error) },
        coordinationTime: Date.now() - startTime
      };
    }
  }

  async runStressTest(config: {
    duration: number;
    agentIds: string[];
    concurrentOperations: number;
    failureRate: number;
  }): Promise<{
    totalOperations: number;
    successfulOperations: number;
    averageResponseTime: number;
    errors: Array<{ agentId: string; error: string; timestamp: number }>;
  }> {
    const startTime = Date.now();
    const endTime = startTime + config.duration;
    const errors: Array<{ agentId: string; error: string; timestamp: number }> = [];
    const responseTimes: number[] = [];
    let totalOperations = 0;
    let successfulOperations = 0;

    while (Date.now() < endTime) {
      const operations = Array.from({ length: config.concurrentOperations }, async () => {
        const agentId = config.agentIds[Math.floor(Math.random() * config.agentIds.length)];
        const agent = this.agents.get(agentId);

        if (!agent) {
          errors.push({ agentId, error: 'Agent not found', timestamp: Date.now() });
          return;
        }

        const operationStart = Date.now();
        totalOperations++;

        try {
          // Simulate failure
          if (Math.random() < config.failureRate) {
            throw new Error('Simulated stress test failure');
          }

          const context: AgentDecisionContext = {
            userAddress: 'sei1stresstest',
            portfolioState: { totalValue: 25000 },
            marketConditions: { volatility: 0.5 },
            constraints: { stressTest: true },
            timeout: 5000
          };

          const result = await agent.makeDecision(context);
          
          if (E.isRight(result)) {
            successfulOperations++;
            responseTimes.push(Date.now() - operationStart);
          } else {
            errors.push({ agentId, error: 'Decision failed', timestamp: Date.now() });
          }

        } catch (error) {
          errors.push({ 
            agentId, 
            error: error instanceof Error ? error.message : String(error), 
            timestamp: Date.now() 
          });
        }
      });

      await Promise.allSettled(operations);
      
      // Brief pause between operation batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      totalOperations,
      successfulOperations,
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      errors
    };
  }

  getCoordinationLogs(): Array<{
    timestamp: number;
    agentIds: string[];
    scenario: string;
    result: any;
  }> {
    return [...this.coordinationLogs];
  }

  getPerformanceReport(): {
    agents: Array<{
      id: string;
      type: string;
      performance: AgentState['performance'];
      status: string;
    }>;
    totalCoordinations: number;
    averageCoordinationTime: number;
  } {
    const agents = this.getAllAgents().map(agent => ({
      id: agent.id,
      type: agent.type,
      performance: agent.getPerformanceMetrics(),
      status: agent.state.status
    }));

    const coordinationTimes = this.coordinationLogs
      .map(log => log.result.coordinationTime)
      .filter(time => typeof time === 'number');

    return {
      agents,
      totalCoordinations: this.coordinationLogs.length,
      averageCoordinationTime: coordinationTimes.length > 0 ? 
        coordinationTimes.reduce((a, b) => a + b, 0) / coordinationTimes.length : 0
    };
  }

  // Utility methods for specific test scenarios

  async simulateNetworkPartition(agentIds: string[], duration: number): Promise<void> {
    const affectedAgents = agentIds.map(id => this.agents.get(id)).filter(Boolean) as MockAgent[];
    
    // Mark agents as unavailable
    affectedAgents.forEach(agent => {
      agent.updateState({ status: 'unavailable' });
    });

    this.emit('networkPartition', { agentIds, duration });

    // Restore after duration
    setTimeout(() => {
      affectedAgents.forEach(agent => {
        agent.updateState({ status: 'idle' });
      });
      this.emit('networkRestored', { agentIds });
    }, duration);
  }

  async simulateHighLatency(multiplier: number, duration: number): Promise<void> {
    const originalMakeDecision = Object.values(this.agents.values())[0]?.makeDecision;
    
    if (!originalMakeDecision) return;

    // Override makeDecision to add latency
    for (const agent of this.agents.values()) {
      const original = agent.makeDecision.bind(agent);
      agent.makeDecision = async function(context: AgentDecisionContext) {
        const additionalDelay = Math.random() * 2000 * multiplier;
        await new Promise(resolve => setTimeout(resolve, additionalDelay));
        return original(context);
      };
    }

    this.emit('highLatencySimulation', { multiplier, duration });

    // Restore original behavior after duration
    setTimeout(() => {
      // This would restore the original makeDecision method in a real implementation
      this.emit('latencyRestored');
    }, duration);
  }
}