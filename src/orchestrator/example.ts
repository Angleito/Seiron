/**
 * @fileoverview Example integration of orchestrator with existing services
 * Shows how to integrate the orchestrator with ChatInterface and AIService
 */

import { 
  createOrchestrator,
  IntentUtils,
  AgentUtils,
  INTENT_TYPES,
  AGENT_TYPES,
  COMMON_ACTIONS,
  type UserIntent,
  type Agent
} from './index.js';
import { ChatInterface } from '../chat/ChatInterface.js';
import type { ChatMessage, ChatSession } from '../chat/types.js';

/**
 * Example orchestrator integration
 */
export class OrchestratedChatInterface {
  private orchestrator: ReturnType<typeof createOrchestrator>;
  private chatInterface: typeof ChatInterface;

  constructor() {
    // Create orchestrator with optimized settings for chat
    this.orchestrator = createOrchestrator({
      orchestrator: {
        maxConcurrentTasks: 5,
        taskTimeout: 30000,
        agentHealthCheckInterval: 60000,
        messageRetryPolicy: {
          maxRetries: 2,
          backoffMultiplier: 2,
          maxBackoffMs: 10000,
          retryableErrors: ['timeout', 'network_error', 'temporary_unavailable']
        },
        loadBalancing: 'capability_based'
      },
      registry: {
        healthCheckInterval: 30000,
        maxConsecutiveFailures: 3,
        responseTimeoutMs: 5000,
        loadBalancingWeights: {
          'lending_agent': 1.0,
          'liquidity_agent': 1.2,
          'portfolio_agent': 0.8,
          'risk_agent': 1.5
        }
      },
      router: {
        maxConcurrentMessages: 20,
        messageTimeout: 10000,
        retryAttempts: 1,
        backoffMultiplier: 1.5,
        enableParallelExecution: true
      }
    });

    this.chatInterface = ChatInterface;
    this.registerDemoAgents();
    this.setupEventHandlers();
    this.orchestrator.start();
  }

  /**
   * Process chat message through orchestrator
   */
  public async processMessage(
    session: ChatSession,
    message: string
  ): Promise<{ session: ChatSession; response: any }> {
    try {
      // First, try to parse as a command using existing chat interface
      const chatResult = await this.chatInterface.processMessage(session, message);
      
      // If chat interface handled it, return that result
      if (chatResult.response.type !== 'error') {
        return chatResult;
      }

      // Otherwise, try to process as an intent through orchestrator
      const intent = this.parseMessageToIntent(message, session);
      if (!intent) {
        return chatResult; // Fall back to chat interface error
      }

      // Process through orchestrator
      const orchestratorResult = await this.orchestrator.processIntent(intent, session.id);
      
      if (orchestratorResult._tag === 'Right') {
        const taskResult = orchestratorResult.right;
        
        // Convert orchestrator result to chat response format
        const response = {
          type: 'success' as const,
          content: this.formatOrchestratorResult(taskResult),
          data: {
            type: 'transaction' as const,
            txHash: taskResult.result?.transactionHash || '',
            status: 'success' as const,
            action: intent.action,
            details: taskResult.result
          }
        };

        // Add assistant message to session
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: response.content,
          timestamp: Date.now(),
          metadata: { orchestratorResult: taskResult }
        };

        const updatedSession = {
          ...chatResult.session,
          messages: [...chatResult.session.messages, assistantMessage]
        };

        return { session: updatedSession, response };
      } else {
        // Orchestrator failed, return error
        const errorResponse = {
          type: 'error' as const,
          content: `I couldn't process your request: ${orchestratorResult.left}`,
          suggestions: ['Try rephrasing your request', 'Check if all required parameters are provided']
        };

        return { session: chatResult.session, response: errorResponse };
      }
    } catch (error) {
      // Fallback to original chat interface
      return this.chatInterface.processMessage(session, message);
    }
  }

  /**
   * Get orchestrator status
   */
  public getOrchestratorStatus() {
    const state = this.orchestrator.getState();
    return {
      activeAgents: Object.keys(state.agents).length,
      pendingTasks: Object.values(state.tasks).filter(task => 
        task.status === 'pending' || task.status === 'running'
      ).length,
      activeSessions: Object.keys(state.sessions).length
    };
  }

  /**
   * Stop orchestrator
   */
  public stop() {
    this.orchestrator.stop();
  }

  // Private helper methods

  private parseMessageToIntent(message: string, session: ChatSession): UserIntent | null {
    // Simple intent parsing - in a real implementation, this would be more sophisticated
    const lowerMessage = message.toLowerCase();
    
    // Lending intents
    if (lowerMessage.includes('supply') || lowerMessage.includes('lend')) {
      const amount = this.extractAmount(message);
      const token = this.extractToken(message);
      
      if (amount && token) {
        return IntentUtils.createIntent(
          INTENT_TYPES.LENDING,
          COMMON_ACTIONS.SUPPLY,
          { token, amount, wallet: session.context.walletAddress },
          { 
            sessionId: session.id,
            walletAddress: session.context.walletAddress,
            previousIntents: []
          }
        );
      }
    }

    if (lowerMessage.includes('borrow')) {
      const amount = this.extractAmount(message);
      const token = this.extractToken(message);
      
      if (amount && token) {
        return IntentUtils.createIntent(
          INTENT_TYPES.LENDING,
          COMMON_ACTIONS.BORROW,
          { token, amount, wallet: session.context.walletAddress },
          { 
            sessionId: session.id,
            walletAddress: session.context.walletAddress,
            previousIntents: []
          }
        );
      }
    }

    // Liquidity intents
    if (lowerMessage.includes('add liquidity')) {
      const tokens = this.extractTokenPair(message);
      const amounts = this.extractAmountPair(message);
      
      if (tokens.length === 2 && amounts.length >= 1) {
        return IntentUtils.createIntent(
          INTENT_TYPES.LIQUIDITY,
          COMMON_ACTIONS.ADD_LIQUIDITY,
          { 
            token1: tokens[0], 
            token2: tokens[1], 
            amount1: amounts[0],
            amount2: amounts[1] || amounts[0],
            wallet: session.context.walletAddress 
          },
          { 
            sessionId: session.id,
            walletAddress: session.context.walletAddress,
            previousIntents: []
          }
        );
      }
    }

    // Portfolio intents
    if (lowerMessage.includes('show positions') || lowerMessage.includes('portfolio')) {
      return IntentUtils.createIntent(
        INTENT_TYPES.PORTFOLIO,
        COMMON_ACTIONS.SHOW_POSITIONS,
        { wallet: session.context.walletAddress },
        { 
          sessionId: session.id,
          walletAddress: session.context.walletAddress,
          previousIntents: []
        }
      );
    }

    return null;
  }

  private extractAmount(message: string): number | null {
    const amountRegex = /(\d+(?:\.\d+)?)/;
    const match = message.match(amountRegex);
    return match ? parseFloat(match[1]) : null;
  }

  private extractToken(message: string): string | null {
    const tokens = ['USDC', 'ETH', 'SEI', 'WETH', 'WSEI'];
    const upperMessage = message.toUpperCase();
    
    for (const token of tokens) {
      if (upperMessage.includes(token)) {
        return token;
      }
    }
    return null;
  }

  private extractTokenPair(message: string): string[] {
    const tokens = ['USDC', 'ETH', 'SEI', 'WETH', 'WSEI'];
    const upperMessage = message.toUpperCase();
    const foundTokens: string[] = [];
    
    for (const token of tokens) {
      if (upperMessage.includes(token)) {
        foundTokens.push(token);
      }
    }
    
    return foundTokens.slice(0, 2); // Maximum 2 tokens for a pair
  }

  private extractAmountPair(message: string): number[] {
    const amountRegex = /(\d+(?:\.\d+)?)/g;
    const matches = message.match(amountRegex);
    return matches ? matches.map(match => parseFloat(match)) : [];
  }

  private formatOrchestratorResult(taskResult: any): string {
    if (taskResult.status === 'completed') {
      const result = taskResult.result;
      if (result?.transactionHash) {
        return `✅ Transaction completed successfully!\nTransaction Hash: ${result.transactionHash}`;
      }
      if (result?.positions) {
        return `📊 Portfolio positions:\n${JSON.stringify(result.positions, null, 2)}`;
      }
      return `✅ Task completed successfully! Execution time: ${taskResult.executionTime}ms`;
    } else if (taskResult.status === 'failed') {
      return `❌ Task failed: ${taskResult.error?.message || 'Unknown error'}`;
    } else {
      return `⏳ Task is ${taskResult.status}...`;
    }
  }

  private registerDemoAgents() {
    // Register lending agent
    const lendingAgent = AgentUtils.createAgent(
      'lending-agent-1',
      AGENT_TYPES.LENDING,
      'Yei Finance Lending Agent',
      [
        AgentUtils.createCapability(
          COMMON_ACTIONS.SUPPLY,
          'Supply tokens to Yei Finance lending pools',
          [
            { name: 'token', type: 'string', required: true, description: 'Token symbol to supply' },
            { name: 'amount', type: 'number', required: true, description: 'Amount to supply' },
            { name: 'wallet', type: 'string', required: true, description: 'Wallet address' }
          ],
          ['lending.supply'],
          3000
        ),
        AgentUtils.createCapability(
          COMMON_ACTIONS.BORROW,
          'Borrow tokens from Yei Finance lending pools',
          [
            { name: 'token', type: 'string', required: true, description: 'Token symbol to borrow' },
            { name: 'amount', type: 'number', required: true, description: 'Amount to borrow' },
            { name: 'wallet', type: 'string', required: true, description: 'Wallet address' }
          ],
          ['lending.borrow'],
          4000
        ),
        AgentUtils.createCapability(
          COMMON_ACTIONS.WITHDRAW,
          'Withdraw supplied tokens from lending pools',
          [
            { name: 'token', type: 'string', required: true, description: 'Token symbol to withdraw' },
            { name: 'amount', type: 'number', required: true, description: 'Amount to withdraw' },
            { name: 'wallet', type: 'string', required: true, description: 'Wallet address' }
          ],
          ['lending.withdraw'],
          3500
        )
      ],
      { protocol: 'yei-finance', version: '1.0.0' }
    );

    // Register liquidity agent
    const liquidityAgent = AgentUtils.createAgent(
      'liquidity-agent-1',
      AGENT_TYPES.LIQUIDITY,
      'DragonSwap Liquidity Agent',
      [
        AgentUtils.createCapability(
          COMMON_ACTIONS.ADD_LIQUIDITY,
          'Add liquidity to DragonSwap V2 pools',
          [
            { name: 'token1', type: 'string', required: true, description: 'First token symbol' },
            { name: 'token2', type: 'string', required: true, description: 'Second token symbol' },
            { name: 'amount1', type: 'number', required: true, description: 'Amount of first token' },
            { name: 'amount2', type: 'number', required: true, description: 'Amount of second token' },
            { name: 'wallet', type: 'string', required: true, description: 'Wallet address' }
          ],
          ['liquidity.add'],
          5000
        ),
        AgentUtils.createCapability(
          COMMON_ACTIONS.REMOVE_LIQUIDITY,
          'Remove liquidity from DragonSwap V2 pools',
          [
            { name: 'token1', type: 'string', required: true, description: 'First token symbol' },
            { name: 'token2', type: 'string', required: true, description: 'Second token symbol' },
            { name: 'percentage', type: 'number', required: true, description: 'Percentage to remove' },
            { name: 'wallet', type: 'string', required: true, description: 'Wallet address' }
          ],
          ['liquidity.remove'],
          4500
        )
      ],
      { protocol: 'dragonswap', version: '2.0.0' }
    );

    // Register portfolio agent
    const portfolioAgent = AgentUtils.createAgent(
      'portfolio-agent-1',
      AGENT_TYPES.PORTFOLIO,
      'Portfolio Management Agent',
      [
        AgentUtils.createCapability(
          COMMON_ACTIONS.SHOW_POSITIONS,
          'Display current portfolio positions',
          [
            { name: 'wallet', type: 'string', required: true, description: 'Wallet address' }
          ],
          ['portfolio.read'],
          2000
        ),
        AgentUtils.createCapability(
          COMMON_ACTIONS.REBALANCE,
          'Rebalance portfolio positions',
          [
            { name: 'wallet', type: 'string', required: true, description: 'Wallet address' },
            { name: 'strategy', type: 'string', required: false, description: 'Rebalancing strategy' }
          ],
          ['portfolio.rebalance'],
          8000
        )
      ],
      { type: 'portfolio_manager', version: '1.0.0' }
    );

    // Register agents with orchestrator
    this.orchestrator.registerAgent(lendingAgent);
    this.orchestrator.registerAgent(liquidityAgent);
    this.orchestrator.registerAgent(portfolioAgent);
  }

  private setupEventHandlers() {
    this.orchestrator.addEventListener('intent_received', (event) => {
      console.log('🎯 Intent received:', event.intent.type, event.intent.action);
    });

    this.orchestrator.addEventListener('task_started', (event) => {
      console.log('🚀 Task started:', event.task.id, 'on agent', event.agent.name);
    });

    this.orchestrator.addEventListener('task_completed', (event) => {
      console.log('✅ Task completed:', event.task.id, 'status:', event.result.status);
    });

    this.orchestrator.addEventListener('error_occurred', (event) => {
      console.error('❌ Orchestrator error:', event.error);
    });
  }
}

/**
 * Example usage
 */
export function createOrchestratedChatExample() {
  const orchestratedChat = new OrchestratedChatInterface();
  
  // Example session
  const session = ChatInterface.createSession({
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    defaultProtocol: 'yei-finance'
  });

  return {
    orchestratedChat,
    session,
    
    // Helper function to process messages
    processMessage: async (message: string) => {
      const result = await orchestratedChat.processMessage(session, message);
      console.log('Response:', result.response.content);
      return result;
    },
    
    // Helper function to get status
    getStatus: () => orchestratedChat.getOrchestratorStatus(),
    
    // Cleanup function
    cleanup: () => orchestratedChat.stop()
  };
}

// Example usage:
// const example = createOrchestratedChatExample();
// await example.processMessage("Supply 1000 USDC to lending");
// await example.processMessage("Show my portfolio positions");
// console.log(example.getStatus());
// example.cleanup();