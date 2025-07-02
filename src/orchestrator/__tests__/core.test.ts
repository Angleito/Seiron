/**
 * @fileoverview Unit tests for orchestrator core
 * Tests intent analysis, agent selection, and task delegation
 */

import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { EitherM } from '../../types/utils.js';
import { 
  Orchestrator, 
  analyzeIntent, 
  scoreAgentMatch,
  createOrchestrator,
  IntentUtils,
  AgentUtils,
  INTENT_TYPES,
  AGENT_TYPES,
  COMMON_ACTIONS
} from '../index.js';
import type {
  UserIntent,
  Agent,
  AnalyzedIntent,
  OrchestratorConfig,
  AgentRegistryConfig,
  MessageRouterConfig
} from '../types.js';

describe('Orchestrator Core', () => {
  let orchestrator: Orchestrator;
  let testAgent: Agent;
  let testIntent: UserIntent;

  beforeEach(() => {
    // Create test configuration
    const orchestratorConfig: OrchestratorConfig = {
      maxConcurrentTasks: 5,
      taskTimeout: 10000,
      agentHealthCheckInterval: 30000,
      messageRetryPolicy: {
        maxRetries: 2,
        backoffMultiplier: 1.5,
        maxBackoffMs: 5000,
        retryableErrors: ['timeout', 'network_error']
      },
      loadBalancing: 'least_connections'
    };

    const registryConfig: AgentRegistryConfig = {
      healthCheckInterval: 15000,
      maxConsecutiveFailures: 2,
      responseTimeoutMs: 3000,
      loadBalancingWeights: {}
    };

    const routerConfig: MessageRouterConfig = {
      maxConcurrentMessages: 10,
      messageTimeout: 5000,
      retryAttempts: 1,
      backoffMultiplier: 1.2,
      enableParallelExecution: true
    };

    orchestrator = new Orchestrator(orchestratorConfig, registryConfig, routerConfig);

    // Create test agent
    testAgent = AgentUtils.createAgent(
      'test-lending-agent',
      AGENT_TYPES.LENDING,
      'Test Lending Agent',
      [
        AgentUtils.createCapability(
          COMMON_ACTIONS.SUPPLY,
          'Supply tokens to lending pool',
          [
            { name: 'token', type: 'string', required: true, description: 'Token symbol' },
            { name: 'amount', type: 'number', required: true, description: 'Amount to supply' }
          ],
          ['lending.supply'],
          3000
        ),
        AgentUtils.createCapability(
          COMMON_ACTIONS.BORROW,
          'Borrow tokens from lending pool',
          [
            { name: 'token', type: 'string', required: true, description: 'Token symbol' },
            { name: 'amount', type: 'number', required: true, description: 'Amount to borrow' }
          ],
          ['lending.borrow'],
          4000
        )
      ]
    );

    // Create test intent
    testIntent = IntentUtils.createIntent(
      INTENT_TYPES.LENDING,
      COMMON_ACTIONS.SUPPLY,
      {
        token: 'USDC',
        amount: 1000,
        wallet: '0x123...'
      },
      {
        sessionId: 'test-session',
        walletAddress: '0x123...'
      }
    );

    // Register test agent
    orchestrator.registerAgent(testAgent);
  });

  describe('Intent Analysis', () => {
    test('should analyze valid lending intent successfully', async () => {
      const result = await orchestrator.analyzeIntent(testIntent);
      
      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        const analyzed = result.right;
        expect(analyzed.intent.type).toBe(INTENT_TYPES.LENDING);
        expect(analyzed.intent.action).toBe(COMMON_ACTIONS.SUPPLY);
        expect(analyzed.requiredActions).toContain(COMMON_ACTIONS.SUPPLY);
        expect(analyzed.confidence).toBeGreaterThan(0);
        expect(['low', 'medium', 'high']).toContain(analyzed.estimatedComplexity);
      }
    });

    test('should reject intent without required fields', async () => {
      const invalidIntent = {
        ...testIntent,
        type: '' as any,
        action: ''
      };

      const result = await orchestrator.analyzeIntent(invalidIntent);
      
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left.type).toBe('validation_error');
        expect(result.left.message).toContain('type and action');
      }
    });

    test('should identify risks in intent', async () => {
      const borrowIntent = IntentUtils.createIntent(
        INTENT_TYPES.LENDING,
        COMMON_ACTIONS.BORROW,
        { token: 'ETH', amount: 15000 }, // High value
        { sessionId: 'test-session' }
      );

      const result = await orchestrator.analyzeIntent(borrowIntent);
      
      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        const analyzed = result.right;
        expect(analyzed.risks).toContain('liquidation_risk');
        expect(analyzed.risks).toContain('high_value_transaction');
      }
    });

    test('analyzeIntent pure function should work correctly', () => {
      const result = analyzeIntent(testIntent);
      
      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right.intent).toEqual(testIntent);
        expect(result.right.confidence).toBe(0.8);
      }
    });
  });

  describe('Agent Selection', () => {
    test('should select appropriate agent for intent', async () => {
      const analyzed: AnalyzedIntent = {
        intent: testIntent,
        confidence: 0.9,
        requiredActions: [COMMON_ACTIONS.SUPPLY],
        estimatedComplexity: 'medium',
        risks: []
      };

      const result = await orchestrator.selectAgent(analyzed);
      
      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        const selected = result.right;
        expect(selected.agent.id).toBe(testAgent.id);
        expect(selected.agent.type).toBe(AGENT_TYPES.LENDING);
        expect(selected.matchScore).toBeGreaterThan(0);
        expect(selected.availableCapabilities.length).toBeGreaterThan(0);
      }
    });

    test('should fail when no suitable agent exists', async () => {
      const liquidityIntent: AnalyzedIntent = {
        intent: IntentUtils.createIntent(
          INTENT_TYPES.LIQUIDITY,
          COMMON_ACTIONS.ADD_LIQUIDITY,
          { token1: 'USDC', token2: 'ETH', amount1: 1000, amount2: 0.5 }
        ),
        confidence: 0.8,
        requiredActions: [COMMON_ACTIONS.ADD_LIQUIDITY],
        estimatedComplexity: 'medium',
        risks: ['slippage_risk']
      };

      const result = await orchestrator.selectAgent(liquidityIntent);
      
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left.type).toBe('no_available_agents');
        expect(result.left.message).toContain('liquidity_agent');
      }
    });

    test('scoreAgentMatch should calculate correct scores', () => {
      const analyzed: AnalyzedIntent = {
        intent: testIntent,
        confidence: 0.9,
        requiredActions: [COMMON_ACTIONS.SUPPLY, COMMON_ACTIONS.BORROW],
        estimatedComplexity: 'medium',
        risks: []
      };

      const score = scoreAgentMatch(testAgent, analyzed);
      expect(score).toBe(1); // Agent has both capabilities

      const partialAnalyzed: AnalyzedIntent = {
        ...analyzed,
        requiredActions: [COMMON_ACTIONS.SUPPLY, 'unknown_action']
      };

      const partialScore = scoreAgentMatch(testAgent, partialAnalyzed);
      expect(partialScore).toBe(0.5); // Agent has only one of two capabilities
    });
  });

  describe('Task Creation and Execution', () => {
    test('should create task from analyzed intent and selected agent', async () => {
      const analyzed: AnalyzedIntent = {
        intent: testIntent,
        confidence: 0.9,
        requiredActions: [COMMON_ACTIONS.SUPPLY],
        estimatedComplexity: 'low',
        risks: []
      };

      const selected = {
        agent: testAgent,
        matchScore: 1.0,
        availableCapabilities: testAgent.capabilities,
        estimatedExecutionTime: 3000
      };

      const result = orchestrator.createTask(analyzed, selected);
      
      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        const task = result.right;
        expect(task.agentId).toBe(testAgent.id);
        expect(task.action).toBe(COMMON_ACTIONS.SUPPLY);
        expect(task.status).toBe('pending');
        expect(task.parameters).toEqual(testIntent.parameters);
      }
    });

    test('should process intent end-to-end', async () => {
      // Mock the message router to return success
      jest.spyOn(orchestrator['messageRouter'], 'sendTaskRequest')
        .mockImplementation(async () => EitherM.right({
          taskId: 'test-task',
          status: 'completed',
          result: { transactionHash: '0xabc123' },
          executionTime: 2500,
          metadata: {}
        }));

      const result = await orchestrator.processIntent(testIntent, 'test-session');
      
      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right.status).toBe('completed');
        expect(result.right.result).toHaveProperty('transactionHash');
      }
    });
  });

  describe('Parallel Processing', () => {
    test('should process multiple intents in parallel', async () => {
      const intents = [
        testIntent,
        IntentUtils.createIntent(
          INTENT_TYPES.LENDING,
          COMMON_ACTIONS.BORROW,
          { token: 'ETH', amount: 1 },
          { sessionId: 'test-session' }
        )
      ];

      // Mock the message router
      jest.spyOn(orchestrator['messageRouter'], 'sendTaskRequest')
        .mockImplementation(async () => EitherM.right({
          taskId: 'test-task',
          status: 'completed',
          result: { success: true },
          executionTime: 1000,
          metadata: {}
        }));

      const results = await orchestrator.processIntentsParallel(intents, 'test-session');
      
      expect(results.length).toBe(2);
      results.forEach(result => {
        expect(result._tag).toBe('Right');
      });
    });
  });

  describe('Event Handling', () => {
    test('should emit events during intent processing', async () => {
      const events: any[] = [];
      
      orchestrator.addEventListener('intent_received', (event) => {
        events.push(event);
      });

      orchestrator.addEventListener('task_started', (event) => {
        events.push(event);
      });

      await orchestrator.analyzeIntent(testIntent);
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('intent_received');
      expect(events[0].intent).toEqual(testIntent);
    });
  });

  describe('Utility Functions', () => {
    test('IntentUtils should create valid intents', () => {
      const intent = IntentUtils.createIntent(
        INTENT_TYPES.PORTFOLIO,
        COMMON_ACTIONS.SHOW_POSITIONS,
        { wallet: '0x123' },
        { sessionId: 'test' }
      );

      expect(intent.type).toBe(INTENT_TYPES.PORTFOLIO);
      expect(intent.action).toBe(COMMON_ACTIONS.SHOW_POSITIONS);
      expect(intent.parameters.wallet).toBe('0x123');
      expect(intent.context.sessionId).toBe('test');
    });

    test('IntentUtils should validate parameters correctly', () => {
      const validResult = IntentUtils.validateIntentParameters(
        testIntent,
        ['token', 'amount']
      );
      expect(validResult).toBe(true);

      const invalidResult = IntentUtils.validateIntentParameters(
        testIntent,
        ['token', 'amount', 'missing_param']
      );
      expect(invalidResult).toBe(false);
    });

    test('AgentUtils should check capabilities correctly', () => {
      expect(AgentUtils.hasCapability(testAgent, COMMON_ACTIONS.SUPPLY)).toBe(true);
      expect(AgentUtils.hasCapability(testAgent, 'unknown_action')).toBe(false);

      const capability = AgentUtils.getCapability(testAgent, COMMON_ACTIONS.SUPPLY);
      expect(capability).toBeDefined();
      expect(capability?.action).toBe(COMMON_ACTIONS.SUPPLY);
    });
  });

  describe('Factory Function', () => {
    test('createOrchestrator should create orchestrator with default config', () => {
      const orch = createOrchestrator();
      expect(orch).toBeInstanceOf(Orchestrator);
    });

    test('createOrchestrator should accept config overrides', () => {
      const orch = createOrchestrator({
        orchestrator: { maxConcurrentTasks: 20 },
        registry: { healthCheckInterval: 45000 },
        router: { maxConcurrentMessages: 100 }
      });
      expect(orch).toBeInstanceOf(Orchestrator);
    });
  });
});