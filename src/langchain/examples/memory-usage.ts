/**
 * @fileoverview Example usage of LangChain Memory System for Sei Agent Kit
 * Demonstrates memory management, conversation handling, and semantic search
 */

import { createMemorySystem } from '../memory/index.js';
import type {
  ConversationMemoryEntry,
  UserProfileMemoryEntry,
  OperationMemoryEntry,
  Message,
  Intent,
  PendingOperation,
  RiskTolerance,
  Strategy,
  PortfolioContext
} from '../memory/types.js';

/**
 * Example: Basic Memory System Setup
 */
async function basicMemorySetup() {
  console.log('🧠 Setting up Memory System...');
  
  // Create memory system with custom configuration
  const memorySystem = createMemorySystem({
    memory: {
      maxMemoryMB: 256,
      encryptionKey: 'your-secure-encryption-key-here'
    },
    conversation: {
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      maxMessagesPerSession: 500
    },
    userProfile: {
      behaviorAnalysisEnabled: true,
      recommendationEngineEnabled: true
    },
    operation: {
      gasOptimizationEnabled: true,
      patternRecognitionEnabled: true
    }
  });

  // Initialize the system
  await memorySystem.initialize();
  console.log('✅ Memory system initialized');

  return memorySystem;
}

/**
 * Example: User Conversation and Memory Management
 */
async function conversationExample(memorySystem: any) {
  console.log('\n💬 Conversation Memory Example...');
  
  const userId = 'user_123';
  const memoryManager = memorySystem.memoryManager;

  // Create user profile
  const userProfile = await memoryManager.createProfile(userId)();
  if (userProfile._tag === 'Left') {
    throw userProfile.left;
  }
  console.log('👤 User profile created');

  // Create conversation session
  const sessionResult = await memoryManager.getConversationMemory().createSession(userId)();
  if (sessionResult._tag === 'Left') {
    throw sessionResult.left;
  }
  
  const session = sessionResult.right;
  console.log('🗨️  Conversation session created:', session.sessionId);

  // Add messages to conversation
  const messages: Message[] = [
    {
      id: 'msg_1',
      role: 'user',
      content: 'I want to supply 1000 USDC to earn yield',
      timestamp: new Date()
    },
    {
      id: 'msg_2',
      role: 'assistant',
      content: 'I can help you supply USDC for yield. Let me check the best rates available.',
      timestamp: new Date()
    },
    {
      id: 'msg_3',
      role: 'user',
      content: 'What are the current APY rates for USDC lending?',
      timestamp: new Date()
    }
  ];

  for (const message of messages) {
    const result = await memoryManager.getConversationMemory().addMessage(session.sessionId, message)();
    if (result._tag === 'Left') {
      throw result.left;
    }
    console.log('📝 Added message:', message.role, '-', message.content.slice(0, 50) + '...');
  }

  // Get conversation history
  const historyResult = await memoryManager.getConversationMemory().getHistory(session.sessionId, 10)();
  if (historyResult._tag === 'Left') {
    throw historyResult.left;
  }
  
  console.log('📚 Conversation history retrieved:', historyResult.right.length, 'messages');

  return session;
}

/**
 * Example: User Profile and Preferences Management
 */
async function userProfileExample(memorySystem: any) {
  console.log('\n👤 User Profile Example...');
  
  const userId = 'user_123';
  const memoryManager = memorySystem.memoryManager;

  // Update risk tolerance
  const riskTolerance: RiskTolerance = {
    level: 'moderate',
    maxSlippage: 0.005,
    maxGasPrice: 50000000000,
    maxPositionSize: 0.3,
    healthFactorThreshold: 1.5,
    leverageLimit: 2,
    portfolioConcentration: 0.4
  };

  const riskUpdateResult = await memoryManager.getUserProfileMemory().updateRiskTolerance(userId, riskTolerance)();
  if (riskUpdateResult._tag === 'Left') {
    throw riskUpdateResult.left;
  }
  console.log('⚖️  Risk tolerance updated');

  // Add trading strategy
  const strategy: Strategy = {
    id: 'strategy_dca_usdc',
    name: 'USDC DCA Strategy',
    type: 'dca',
    parameters: {
      token: 'USDC',
      amount: 500,
      frequency: 'weekly',
      protocol: 'lending'
    },
    performance: {
      totalReturn: 0.08,
      sharpeRatio: 1.2,
      maxDrawdown: 0.02,
      winRate: 0.85,
      avgProfit: 25,
      avgLoss: -5,
      totalTrades: 12
    },
    active: true,
    lastUpdated: new Date()
  };

  const strategyResult = await memoryManager.getUserProfileMemory().updateStrategy(userId, strategy)();
  if (strategyResult._tag === 'Left') {
    throw strategyResult.left;
  }
  console.log('📈 Trading strategy added');

  // Get user insights
  const insightsResult = await memoryManager.getUserProfileMemory().getUserInsights(userId)();
  if (insightsResult._tag === 'Left') {
    throw insightsResult.left;
  }
  
  const insights = insightsResult.right;
  console.log('🔍 User insights:');
  console.log('   Risk Profile:', insights.riskProfile);
  console.log('   Experience Level:', insights.experienceLevel);
  console.log('   Preferred Operations:', insights.preferredOperations);
  console.log('   Recommendations:', insights.recommendations.length);
}

/**
 * Example: Operation Memory and Analytics
 */
async function operationExample(memorySystem: any) {
  console.log('\n⚡ Operation Memory Example...');
  
  const userId = 'user_123';
  const memoryManager = memorySystem.memoryManager;

  // Record operation
  const operationResult = await memoryManager.getOperationMemory().recordOperation(
    userId,
    'supply',
    'Sei Protocol'
  )();
  if (operationResult._tag === 'Left') {
    throw operationResult.left;
  }
  
  const operation = operationResult.right;
  console.log('📊 Operation recorded:', operation.operationId);

  // Update operation status
  const statusResult = await memoryManager.getOperationMemory().updateOperationStatus(
    operation.operationId,
    'completed',
    {
      success: true,
      txHash: '0x1234567890abcdef',
      gasUsed: '150000',
      outputs: {
        amountSupplied: '1000',
        sharesReceived: '985'
      }
    }
  )();
  if (statusResult._tag === 'Left') {
    throw statusResult.left;
  }
  console.log('✅ Operation completed');

  // Get performance metrics
  const metricsResult = await memoryManager.getOperationMemory().getPerformanceMetrics(userId)();
  if (metricsResult._tag === 'Left') {
    throw metricsResult.left;
  }
  
  const metrics = metricsResult.right;
  console.log('📈 Performance metrics:');
  console.log('   Total Operations:', metrics.totalOperations);
  console.log('   Success Rate:', (metrics.successRate * 100).toFixed(1) + '%');
  console.log('   Avg Gas Cost:', metrics.avgGasCost.toFixed(4), 'ETH');
  console.log('   Total Volume:', metrics.totalVolume.toFixed(2), 'USD');
}

/**
 * Example: Semantic Search and Retrieval
 */
async function semanticSearchExample(memorySystem: any) {
  console.log('\n🔍 Semantic Search Example...');
  
  const semanticRetrieval = memorySystem.semanticRetrieval;
  const userId = 'user_123';

  // Add some sample data to search index
  const sampleConversation: ConversationMemoryEntry = {
    id: 'conv_sample',
    userId,
    timestamp: new Date(),
    lastAccessed: new Date(),
    accessCount: 5,
    priority: 'medium',
    layer: 'short_term',
    pattern: 'frequent',
    type: 'conversation',
    metadata: {},
    sessionId: 'session_123',
    messages: [
      {
        id: 'msg_sample_1',
        role: 'user',
        content: 'How can I optimize my DeFi yield farming strategy?',
        timestamp: new Date()
      },
      {
        id: 'msg_sample_2',
        role: 'assistant',
        content: 'To optimize yield farming, consider diversifying across protocols, monitoring impermanent loss, and adjusting strategies based on market conditions.',
        timestamp: new Date()
      }
    ],
    operationContext: {
      step: 0,
      totalSteps: 0,
      parameters: {},
      requirements: [],
      validationErrors: []
    },
    unresolvedIntents: [],
    pendingOperations: []
  };

  // Add to search index
  await semanticRetrieval.addToIndex('conversations', sampleConversation)();
  console.log('📚 Sample conversation added to search index');

  // Perform semantic search
  const searchResult = await semanticRetrieval.search(
    'yield farming optimization strategies',
    ['conversations'],
    userId,
    { maxResults: 5, similarityThreshold: 0.6 }
  )();

  if (searchResult._tag === 'Left') {
    throw searchResult.left;
  }

  const results = searchResult.right;
  console.log('🎯 Search results found:', results.length);
  
  results.forEach((result, index) => {
    console.log(`   ${index + 1}. Score: ${result.score.toFixed(3)} - ${result.explanation}`);
    if (result.highlights.length > 0) {
      console.log(`      Highlight: "${result.highlights[0]}"`);
    }
  });
}

/**
 * Example: Session Management and Context Preservation
 */
async function sessionManagementExample(memorySystem: any) {
  console.log('\n🔄 Session Management Example...');
  
  const sessionManager = memorySystem.sessionManager;
  const userId = 'user_123';

  // Create session with device info
  const sessionResult = await sessionManager.createSession(
    userId,
    {
      userAgent: 'Mozilla/5.0 (Mac) AppleWebKit/537.36',
      platform: 'MacOS',
      screen: { width: 1920, height: 1080 },
      timezone: 'UTC'
    },
    {
      country: 'US',
      timezone: 'America/New_York',
      language: 'en'
    }
  )();

  if (sessionResult._tag === 'Left') {
    throw sessionResult.left;
  }

  const session = sessionResult.right;
  console.log('🆕 Session created:', session.sessionId);

  // Update conversation context
  const contextResult = await sessionManager.updateConversationContext(
    session.sessionId,
    {
      messageCount: 10,
      topicHistory: ['yield_farming', 'risk_management', 'gas_optimization'],
      sentiment: 0.8,
      engagement: 0.9
    }
  )();

  if (contextResult._tag === 'Left') {
    throw contextResult.left;
  }
  console.log('💭 Conversation context updated');

  // Get session analytics
  const analyticsResult = await sessionManager.getAnalytics(userId)();
  if (analyticsResult._tag === 'Left') {
    throw analyticsResult.left;
  }

  const analytics = analyticsResult.right;
  console.log('📊 Session analytics:');
  console.log('   Active Sessions:', analytics.activeSessions);
  console.log('   Avg Duration:', (analytics.avgSessionDuration / 60000).toFixed(1), 'minutes');
  console.log('   Completion Rate:', (analytics.completionRate * 100).toFixed(1) + '%');
  console.log('   User Engagement:', analytics.userEngagement.toFixed(2));
}

/**
 * Example: Portfolio Context Integration
 */
async function portfolioContextExample(memorySystem: any) {
  console.log('\n💼 Portfolio Context Example...');
  
  const memoryManager = memorySystem.memoryManager;
  const userId = 'user_123';

  // Create sample portfolio context
  const portfolioContext: PortfolioContext = {
    positions: [
      {
        id: 'pos_1',
        protocol: 'Sei Protocol',
        type: 'supply',
        token: 'USDC',
        amount: '1000',
        value: 1000,
        apy: 0.08,
        health: 0.95
      },
      {
        id: 'pos_2',
        protocol: 'Dragon Swap',
        type: 'liquidity',
        token: 'SEI-USDC',
        amount: '500',
        value: 510,
        apy: 0.25
      }
    ],
    healthFactors: [
      {
        protocol: 'Sei Protocol',
        factor: 2.5,
        threshold: 1.5,
        risk: 'safe'
      }
    ],
    activeOperations: [],
    riskMetrics: {
      totalRisk: 0.2,
      concentrationRisk: 0.15,
      liquidityRisk: 0.1,
      counterpartyRisk: 0.05,
      marketRisk: 0.3,
      var: 0.08,
      sharpeRatio: 1.2,
      maxDrawdown: 0.05
    },
    performanceHistory: [
      {
        timestamp: new Date(),
        totalValue: 1510,
        pnl: 10,
        apy: 0.12,
        fees: 2.5,
        gasSpent: 0.05,
        benchmark: 0.05,
        alpha: 0.07,
        beta: 0.8
      }
    ],
    alerts: []
  };

  // Update portfolio context
  const contextResult = await memoryManager.updatePortfolioContext(userId, portfolioContext)();
  if (contextResult._tag === 'Left') {
    throw contextResult.left;
  }
  console.log('💼 Portfolio context updated');

  // Get portfolio context
  const getContextResult = await memoryManager.getPortfolioContext(userId)();
  if (getContextResult._tag === 'Left') {
    throw getContextResult.left;
  }

  const context = getContextResult.right;
  if (context) {
    console.log('📈 Portfolio overview:');
    console.log('   Total Positions:', context.positions.length);
    console.log('   Total Value:', context.positions.reduce((sum, pos) => sum + pos.value, 0).toFixed(2), 'USD');
    console.log('   Health Status:', context.healthFactors[0]?.risk || 'unknown');
    console.log('   Risk Score:', (context.riskMetrics.totalRisk * 100).toFixed(1) + '%');
  }
}

/**
 * Main example runner
 */
async function runExamples() {
  try {
    console.log('🚀 Starting LangChain Memory System Examples\n');

    // Setup memory system
    const memorySystem = await basicMemorySetup();

    // Run examples
    await conversationExample(memorySystem);
    await userProfileExample(memorySystem);
    await operationExample(memorySystem);
    await semanticSearchExample(memorySystem);
    await sessionManagementExample(memorySystem);
    await portfolioContextExample(memorySystem);

    console.log('\n✨ All examples completed successfully!');
    
    // Cleanup
    await memorySystem.shutdown();
    console.log('🧹 Memory system shut down');

  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export {
  basicMemorySetup,
  conversationExample,
  userProfileExample,
  operationExample,
  semanticSearchExample,
  sessionManagementExample,
  portfolioContextExample
};

// Run examples if this file is executed directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  runExamples();
}