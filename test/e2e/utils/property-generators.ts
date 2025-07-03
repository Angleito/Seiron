/**
 * @fileoverview Property Generators for E2E Tests
 * Comprehensive generators for realistic conversation scenarios and test data
 */

import * as fc from 'fast-check';

// Basic data generators
export const BasicGenerators = {
  userId: () => fc.string({ minLength: 8, maxLength: 16 }).map(s => `user_${s}`),
  sessionId: () => fc.string({ minLength: 12, maxLength: 20 }).map(s => `session_${s}`),
  conversationId: () => fc.string({ minLength: 10, maxLength: 18 }).map(s => `conv_${s}`),
  operationId: () => fc.string({ minLength: 8, maxLength: 16 }).map(s => `op_${s}_${Date.now()}`),
  
  walletAddress: () => fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
  
  amount: () => fc.oneof(
    fc.double({ min: 0.01, max: 100 }),      // Small amounts
    fc.double({ min: 100, max: 10000 }),     // Medium amounts
    fc.double({ min: 10000, max: 1000000 })  // Large amounts
  ),
  
  asset: () => fc.constantFrom('USDC', 'SEI', 'ETH', 'ATOM', 'WBTC', 'DAI', 'OSMO'),
  
  protocol: () => fc.constantFrom(
    'YeiFinance', 'DragonSwap', 'Takara', 'Silo', 'Citrex', 'Symphony'
  ),
  
  riskLevel: () => fc.constantFrom('low', 'medium', 'high'),
  
  userType: () => fc.constantFrom('beginner', 'intermediate', 'expert'),
  
  tradingExperience: () => fc.constantFrom('beginner', 'intermediate', 'advanced', 'expert'),
  
  riskTolerance: () => fc.constantFrom('very_low', 'low', 'medium', 'high', 'very_high'),
  
  timestamp: () => fc.date({ min: new Date('2023-01-01'), max: new Date() })
};

// User profile generators
export const UserProfileGenerators = {
  basicProfile: () => fc.record({
    userId: BasicGenerators.userId(),
    walletAddress: BasicGenerators.walletAddress(),
    preferences: fc.record({
      riskTolerance: BasicGenerators.riskTolerance(),
      preferredProtocols: fc.array(BasicGenerators.protocol(), { minLength: 1, maxLength: 3 }),
      tradingExperience: BasicGenerators.tradingExperience(),
      maxLendingAmount: fc.oneof(
        fc.constant(null),
        fc.double({ min: 1000, max: 100000 })
      ),
      defaultAsset: BasicGenerators.asset()
    }),
    createdAt: BasicGenerators.timestamp()
  }),
  
  advancedProfile: () => fc.record({
    userId: BasicGenerators.userId(),
    walletAddress: BasicGenerators.walletAddress(),
    preferences: fc.record({
      riskTolerance: BasicGenerators.riskTolerance(),
      preferredProtocols: fc.array(BasicGenerators.protocol(), { minLength: 1, maxLength: 5 }),
      tradingExperience: BasicGenerators.tradingExperience(),
      maxLendingAmount: fc.double({ min: 10000, max: 1000000 }),
      defaultAsset: BasicGenerators.asset(),
      autoRebalance: fc.boolean(),
      notifications: fc.record({
        email: fc.boolean(),
        push: fc.boolean(),
        discord: fc.boolean()
      }),
      strategies: fc.array(fc.constantFrom(
        'yield_farming', 'arbitrage', 'lending', 'liquidity_provision'
      ), { minLength: 1, maxLength: 4 })
    }),
    portfolioHistory: fc.array(fc.record({
      timestamp: BasicGenerators.timestamp(),
      totalValue: fc.double({ min: 1000, max: 1000000 }),
      assets: fc.record({
        USDC: fc.double({ min: 0, max: 500000 }),
        SEI: fc.double({ min: 0, max: 100000 }),
        ETH: fc.double({ min: 0, max: 10 })
      })
    }), { minLength: 0, maxLength: 10 }),
    createdAt: BasicGenerators.timestamp()
  }),
  
  beginnerProfile: () => fc.record({
    userId: BasicGenerators.userId(),
    walletAddress: BasicGenerators.walletAddress(),
    preferences: fc.record({
      riskTolerance: fc.constantFrom('very_low', 'low'),
      preferredProtocols: fc.array(fc.constantFrom('YeiFinance', 'Silo'), { minLength: 1, maxLength: 2 }),
      tradingExperience: fc.constantFrom('beginner'),
      maxLendingAmount: fc.double({ min: 100, max: 5000 }),
      defaultAsset: fc.constantFrom('USDC'),
      needsGuidance: fc.constant(true),
      warningsEnabled: fc.constant(true)
    }),
    createdAt: BasicGenerators.timestamp()
  })
};

// Operation generators
export const OperationGenerators = {
  lendingOperation: () => fc.record({
    id: BasicGenerators.operationId(),
    type: fc.constant('lending'),
    asset: BasicGenerators.asset(),
    amount: BasicGenerators.amount(),
    protocol: BasicGenerators.protocol(),
    riskLevel: BasicGenerators.riskLevel(),
    timestamp: BasicGenerators.timestamp(),
    status: fc.constantFrom('pending', 'processing', 'completed', 'failed'),
    estimatedReturn: fc.double({ min: 0.01, max: 0.2 }),
    duration: fc.oneof(
      fc.constant(null),
      fc.integer({ min: 1, max: 365 }) // days
    )
  }),
  
  swapOperation: () => fc.record({
    id: BasicGenerators.operationId(),
    type: fc.constant('swap'),
    fromAsset: BasicGenerators.asset(),
    toAsset: BasicGenerators.asset(),
    amount: BasicGenerators.amount(),
    protocol: BasicGenerators.protocol(),
    timestamp: BasicGenerators.timestamp(),
    status: fc.constantFrom('pending', 'processing', 'completed', 'failed'),
    slippage: fc.double({ min: 0.001, max: 0.05 }),
    estimatedOutput: fc.double({ min: 0.1, max: 10000 }),
    priceImpact: fc.double({ min: 0, max: 0.1 })
  }).filter(op => op.fromAsset !== op.toAsset),
  
  liquidityOperation: () => fc.record({
    id: BasicGenerators.operationId(),
    type: fc.constantFrom('add_liquidity', 'remove_liquidity'),
    token1: BasicGenerators.asset(),
    token2: BasicGenerators.asset(),
    amount1: BasicGenerators.amount(),
    amount2: BasicGenerators.amount(),
    protocol: BasicGenerators.protocol(),
    timestamp: BasicGenerators.timestamp(),
    status: fc.constantFrom('pending', 'processing', 'completed', 'failed'),
    poolShare: fc.double({ min: 0.0001, max: 0.1 }),
    estimatedFees: fc.double({ min: 0, max: 1000 })
  }).filter(op => op.token1 !== op.token2),
  
  arbitrageOperation: () => fc.record({
    id: BasicGenerators.operationId(),
    type: fc.constant('arbitrage'),
    asset: BasicGenerators.asset(),
    amount: BasicGenerators.amount(),
    buyProtocol: BasicGenerators.protocol(),
    sellProtocol: BasicGenerators.protocol(),
    timestamp: BasicGenerators.timestamp(),
    status: fc.constantFrom('pending', 'processing', 'completed', 'failed'),
    profitEstimate: fc.double({ min: 0.01, max: 1000 }),
    profitPercentage: fc.double({ min: 0.001, max: 0.1 })
  }).filter(op => op.buyProtocol !== op.sellProtocol)
};

// Conversation generators
export const ConversationGenerators = {
  simpleTurn: () => fc.record({
    turnNumber: fc.integer({ min: 1, max: 50 }),
    userInput: fc.oneof(
      fc.constantFrom(
        'Lend 1000 USDC',
        'Swap 100 SEI for USDC',
        'Show my portfolio',
        'What are the lending rates?',
        'Find arbitrage opportunities',
        'Add liquidity to SEI/USDC pool',
        'Remove liquidity from position',
        'Check my transaction history',
        'What is my current yield?',
        'Optimize my portfolio'
      ),
      fc.string({ minLength: 5, maxLength: 100 })
    ),
    timestamp: BasicGenerators.timestamp(),
    expectedIntent: fc.oneof(
      fc.constantFrom(
        'lending', 'swap', 'portfolio', 'rates', 'arbitrage', 
        'liquidity', 'history', 'yield', 'optimization'
      ),
      fc.constant(null)
    ),
    shouldSucceed: fc.boolean()
  }),
  
  conversationScenario: () => fc.record({
    id: fc.string({ minLength: 8, maxLength: 16 }),
    name: fc.string({ minLength: 10, maxLength: 50 }),
    userType: BasicGenerators.userType(),
    intent: fc.constantFrom(
      'lending', 'trading', 'arbitrage', 'portfolio_management', 
      'yield_optimization', 'risk_assessment', 'liquidity_provision'
    ),
    complexity: fc.constantFrom('simple', 'medium', 'complex'),
    turns: fc.array(ConversationGenerators.simpleTurn(), { minLength: 1, maxLength: 10 }),
    expectedOutcome: fc.record({
      shouldComplete: fc.boolean(),
      operationType: fc.oneof(
        BasicGenerators.protocol(),
        fc.constant(null)
      ),
      parametersExtracted: fc.boolean()
    })
  }),
  
  multiTurnScenario: () => fc.record({
    scenarioType: fc.constantFrom(
      'progressive_clarification',
      'context_building',
      'error_recovery',
      'preference_learning',
      'complex_operation'
    ),
    initialIntent: fc.constantFrom('lending', 'swapping', 'portfolio', 'arbitrage'),
    turns: fc.array(fc.record({
      input: fc.string({ minLength: 5, maxLength: 200 }),
      type: fc.constantFrom('clarification', 'confirmation', 'modification', 'execution'),
      expectedResponse: fc.oneof(
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.constant(null)
      ),
      shouldSucceed: fc.boolean()
    }), { minLength: 2, maxLength: 8 }),
    expectedFinalState: fc.record({
      hasCommand: fc.boolean(),
      hasParameters: fc.boolean(),
      needsConfirmation: fc.boolean(),
      error: fc.boolean()
    })
  }),
  
  errorScenario: () => fc.record({
    errorType: fc.constantFrom(
      'invalid_amount', 'unknown_asset', 'unsupported_protocol',
      'insufficient_balance', 'network_error', 'timeout',
      'malformed_input', 'missing_parameters'
    ),
    userInput: fc.string({ minLength: 5, maxLength: 100 }),
    shouldRecover: fc.boolean(),
    expectedSuggestions: fc.array(fc.string({ minLength: 10, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
    recoveryTurns: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 0, maxLength: 3 })
  })
};

// Performance test generators
export const PerformanceGenerators = {
  loadTestScenario: () => fc.record({
    concurrentUsers: fc.integer({ min: 1, max: 50 }),
    duration: fc.integer({ min: 30000, max: 300000 }), // 30s to 5min
    rampUpTime: fc.integer({ min: 10000, max: 60000 }), // 10s to 1min
    scenarios: fc.array(fc.constantFrom(
      'simple_lending', 'complex_swap', 'portfolio_check',
      'multi_turn_optimization', 'error_recovery'
    ), { minLength: 1, maxLength: 5 }),
    expectedThroughput: fc.double({ min: 1, max: 100 }), // operations per second
    memoryLimit: fc.integer({ min: 256, max: 1024 }) // MB
  }),
  
  stressTestScenario: () => fc.record({
    testType: fc.constantFrom('memory_stress', 'concurrent_sessions', 'rapid_requests', 'long_conversations'),
    intensity: fc.constantFrom('low', 'medium', 'high', 'extreme'),
    parameters: fc.record({
      userCount: fc.integer({ min: 10, max: 100 }),
      requestsPerUser: fc.integer({ min: 10, max: 1000 }),
      dataSize: fc.constantFrom('small', 'medium', 'large'),
      sessionDuration: fc.integer({ min: 60000, max: 3600000 }) // 1min to 1hour
    }),
    thresholds: fc.record({
      maxResponseTime: fc.integer({ min: 1000, max: 10000 }),
      maxMemoryUsage: fc.integer({ min: 512, max: 2048 }),
      minSuccessRate: fc.double({ min: 0.8, max: 0.99 })
    })
  })
};

// Natural language variation generators
export const NLVariationGenerators = {
  intentVariations: (baseIntent: string) => {
    const variations: Record<string, string[]> = {
      lending: [
        'Lend {amount} {asset}',
        'I want to lend {amount} {asset}',
        'Supply {amount} {asset} for lending',
        'Deposit {amount} {asset} to earn interest',
        'Put {amount} {asset} in lending pool',
        'Stake {amount} {asset} for yield'
      ],
      swapping: [
        'Swap {amount} {fromAsset} for {toAsset}',
        'Exchange {amount} {fromAsset} to {toAsset}',
        'Trade {amount} {fromAsset} into {toAsset}',
        'Convert {amount} {fromAsset} to {toAsset}',
        'Sell {amount} {fromAsset} for {toAsset}'
      ],
      portfolio: [
        'Show my portfolio',
        'What is my portfolio status?',
        'Display my current positions',
        'Check my portfolio balance',
        'Portfolio overview please'
      ]
    };
    
    return fc.constantFrom(...(variations[baseIntent] || [baseIntent]));
  },
  
  typoVariations: (text: string) => fc.record({
    original: fc.constant(text),
    withTypos: fc.array(fc.string({ minLength: text.length - 2, maxLength: text.length + 2 }), { minLength: 1, maxLength: 3 }),
    severity: fc.constantFrom('light', 'medium', 'heavy')
  }),
  
  caseVariations: (text: string) => fc.constantFrom(
    text.toLowerCase(),
    text.toUpperCase(),
    text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
    text.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  ),
  
  punctuationVariations: (text: string) => fc.constantFrom(
    text,
    text + '!',
    text + '?',
    text + '.',
    text + '...',
    text.replace(/\s+/g, ','),
    text.replace(/\s+/g, ' - ')
  ),
  
  emojiVariations: (text: string) => fc.constantFrom(
    text,
    text + ' 💰',
    text + ' 📈',
    text + ' 🚀',
    '💰 ' + text,
    text + ' 💎',
    text + ' 🔥'
  )
};

// Memory test generators
export const MemoryGenerators = {
  userMemoryState: () => fc.record({
    userId: BasicGenerators.userId(),
    preferences: fc.array(fc.record({
      key: fc.string({ minLength: 3, maxLength: 20 }),
      value: fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.double()),
      timestamp: BasicGenerators.timestamp(),
      priority: fc.constantFrom('low', 'medium', 'high')
    }), { minLength: 0, maxLength: 10 }),
    
    operationHistory: fc.array(OperationGenerators.lendingOperation(), { minLength: 0, maxLength: 20 }),
    
    conversationHistory: fc.array(fc.record({
      conversationId: BasicGenerators.conversationId(),
      turns: fc.array(ConversationGenerators.simpleTurn(), { minLength: 1, maxLength: 10 }),
      startTime: BasicGenerators.timestamp(),
      endTime: BasicGenerators.timestamp()
    }), { minLength: 0, maxLength: 5 }),
    
    contextData: fc.record({
      lastActiveProtocol: fc.oneof(BasicGenerators.protocol(), fc.constant(null)),
      lastAsset: fc.oneof(BasicGenerators.asset(), fc.constant(null)),
      lastAmount: fc.oneof(BasicGenerators.amount(), fc.constant(null)),
      sessionCount: fc.integer({ min: 0, max: 100 }),
      totalOperations: fc.integer({ min: 0, max: 500 })
    })
  }),
  
  memoryOperation: () => fc.record({
    type: fc.constantFrom('store', 'retrieve', 'update', 'delete'),
    dataType: fc.constantFrom('preference', 'operation', 'conversation', 'context'),
    userId: BasicGenerators.userId(),
    data: fc.oneof(
      fc.record({ key: fc.string(), value: fc.string() }),
      fc.record({ operation: OperationGenerators.lendingOperation() }),
      fc.record({ turn: ConversationGenerators.simpleTurn() })
    ),
    timestamp: BasicGenerators.timestamp(),
    expectedResult: fc.constantFrom('success', 'failure', 'partial')
  })
};

// Export all generators
export const PropertyGenerators = {
  Basic: BasicGenerators,
  UserProfile: UserProfileGenerators,
  Operation: OperationGenerators,
  Conversation: ConversationGenerators,
  Performance: PerformanceGenerators,
  NLVariation: NLVariationGenerators,
  Memory: MemoryGenerators
};

export default PropertyGenerators;