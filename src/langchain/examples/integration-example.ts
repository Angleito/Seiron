/**
 * LangChain Integration Example
 * 
 * This example demonstrates how to use the DeFi LangChain Kit for
 * natural language interaction with Sei DeFi protocols.
 */

import {
  DeFiLangChainKit,
  defaultDeFiLangChainKit,
  processDeFiQuery,
  initializeDeFiKit,
  ToolContext,
  defaultContextManager,
  defaultErrorHandler
} from '../index';

/**
 * Example 1: Basic Tool Usage
 */
async function basicToolUsageExample() {
  console.log('🔧 Basic Tool Usage Example\n');

  // Initialize the kit
  await initializeDeFiKit();

  // Define user context
  const context: ToolContext = {
    userId: 'user123',
    sessionId: 'session456',
    walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
    agentState: {
      preferredProtocols: ['YeiFinance', 'DragonSwap'],
      riskTolerance: 'medium'
    }
  };

  // Example queries
  const queries = [
    'Deposit 100 USDC to earn interest',
    'Swap 0.5 ETH for SEI',
    'Check my health factor',
    'Find best yield farming opportunities for USDC',
    'Analyze SEI market conditions'
  ];

  for (const query of queries) {
    console.log(`Query: "${query}"`);
    
    try {
      const result = await processDeFiQuery(query, context);
      console.log(`Tool Used: ${result.toolUsed}`);
      console.log(`Result: ${result.result.slice(0, 200)}...`);
      
      if (result.suggestions) {
        console.log('Suggestions:', result.suggestions);
      }
      
    } catch (error) {
      console.error('Error:', error);
    }
    
    console.log('---\n');
  }
}

/**
 * Example 2: Context-Aware Conversation
 */
async function contextAwareConversationExample() {
  console.log('💬 Context-Aware Conversation Example\n');

  const kit = new DeFiLangChainKit();
  await kit.initialize();

  // Create conversation session
  const session = await defaultContextManager.getOrCreateSession('user123');
  
  const context: ToolContext = {
    userId: 'user123',
    sessionId: session.sessionId,
    walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
  };

  // Simulate conversation flow
  const conversation = [
    'I want to deposit some USDC',
    'How much would you like to deposit?',
    '1000 USDC',
    'Check the health factor after deposit',
    'What are good yield farming options with USDC?'
  ];

  for (let i = 0; i < conversation.length; i += 2) {
    const userMessage = conversation[i];
    const assistantResponse = conversation[i + 1];

    console.log(`User: ${userMessage}`);
    
    // Record user message in context
    await defaultContextManager.recordUserMessage(session.sessionId, userMessage);
    
    // Process query if it's a DeFi operation
    if (i === 0 || i === 2 || i === 3 || i === 4) {
      try {
        const result = await kit.processQuery(userMessage, context);
        console.log(`Assistant (Tool): ${result.result.slice(0, 150)}...`);
        
        if (result.suggestions) {
          console.log(`Suggestions: ${result.suggestions.join(', ')}`);
        }
      } catch (error) {
        console.error('Error processing query:', error);
      }
    } else {
      console.log(`Assistant: ${assistantResponse}`);
    }
    
    console.log('---\n');
  }

  // Show context memory
  const memory = defaultContextManager.getContextMemory(session.sessionId);
  console.log('Context Memory:', memory);
}

/**
 * Example 3: Error Handling and Recovery
 */
async function errorHandlingExample() {
  console.log('⚠️ Error Handling Example\n');

  const kit = new DeFiLangChainKit();
  await kit.initialize();

  const context: ToolContext = {
    userId: 'user123',
    sessionId: 'session789'
  };

  // Examples that will trigger different types of errors
  const errorQueries = [
    'Deposit invalid amount ABC USDC', // Validation error
    'Swap 1000000 ETH for SEI', // Insufficient funds
    'Borrow from invalid protocol XYZ', // Protocol error
    'Check health factor for 0xinvalidaddress' // Invalid wallet address
  ];

  for (const query of errorQueries) {
    console.log(`Query: "${query}"`);
    
    try {
      const result = await kit.processQuery(query, context);
      console.log(`Result: ${result.result}`);
      
    } catch (error) {
      console.error('Unexpected error:', error);
    }
    
    console.log('---\n');
  }

  // Show error analytics
  const errorReport = defaultErrorHandler.generateErrorReport();
  console.log('Error Report:', {
    totalErrors: errorReport.totalErrors,
    mostCommonErrors: errorReport.mostCommonErrors
  });
}

/**
 * Example 4: Advanced Multi-Step Operations
 */
async function multiStepOperationExample() {
  console.log('🔄 Multi-Step Operation Example\n');

  const kit = new DeFiLangChainKit();
  await kit.initialize();

  // Create user profile with preferences
  await defaultContextManager.updateUserProfile('user123', {
    walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
    preferredProtocols: ['YeiFinance', 'DragonSwap'],
    riskTolerance: 'medium',
    defaultAssets: ['USDC', 'ETH', 'SEI']
  });

  const session = await defaultContextManager.getOrCreateSession('user123');
  const context: ToolContext = {
    userId: 'user123',
    sessionId: session.sessionId,
    walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
  };

  // Multi-step yield optimization strategy
  const steps = [
    {
      description: 'Check current portfolio balance',
      query: 'Analyze my current portfolio risk'
    },
    {
      description: 'Compare lending rates',
      query: 'Compare USDC supply rates across all protocols'
    },
    {
      description: 'Find yield farming opportunities',
      query: 'Find best yield farming for USDC with medium risk'
    },
    {
      description: 'Check arbitrage opportunities',
      query: 'Find arbitrage opportunities for ETH'
    },
    {
      description: 'Get market analysis',
      query: 'Analyze SEI market conditions and trading signals'
    }
  ];

  for (const step of steps) {
    console.log(`📝 Step: ${step.description}`);
    console.log(`Query: "${step.query}"`);
    
    try {
      const result = await kit.processQuery(step.query, context);
      console.log(`Tool: ${result.toolUsed}`);
      console.log(`Result: ${result.result.slice(0, 200)}...`);
      
      if (result.suggestions) {
        console.log(`Next Steps: ${result.suggestions.join(', ')}`);
      }
      
    } catch (error) {
      console.error('Error in step:', error);
    }
    
    console.log('---\n');
    
    // Brief delay to simulate real conversation
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Example 5: Tool Discovery and Help
 */
async function toolDiscoveryExample() {
  console.log('🔍 Tool Discovery Example\n');

  const kit = new DeFiLangChainKit();
  await kit.initialize();

  // Show kit status
  const status = kit.getStatus();
  console.log('Kit Status:', status);

  // Show available tools by category
  const categories = ['lending', 'liquidity', 'market', 'cross-protocol'];
  
  for (const category of categories) {
    console.log(`\n📚 ${category.toUpperCase()} TOOLS:`);
    const tools = kit.getToolsByCategory(category);
    
    tools.forEach(tool => {
      const config = tool.getConfig();
      console.log(`  • ${config.name}: ${config.description}`);
      console.log(`    Examples: ${config.examples.slice(0, 2).join(', ')}`);
    });
  }

  // Show specific tool capabilities
  console.log('\n🔧 DEPOSIT TOOL DETAILS:');
  const depositTool = kit.getTool('deposit_lending');
  if (depositTool) {
    const config = depositTool.getConfig();
    console.log(`Name: ${config.name}`);
    console.log(`Description: ${config.description}`);
    console.log(`Category: ${config.category}`);
    console.log(`Examples: ${config.examples.join('\n          ')}`);
  }
}

/**
 * Example 6: Real-time Trading Bot Simulation
 */
async function tradingBotExample() {
  console.log('🤖 Trading Bot Simulation Example\n');

  const kit = new DeFiLangChainKit();
  await kit.initialize();

  // Bot configuration
  const botConfig = {
    userId: 'trading_bot_001',
    walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
    riskTolerance: 'high' as const,
    tradingPairs: ['ETH/USDC', 'SEI/USDC', 'ATOM/USDC'],
    minProfitPercent: 0.5
  };

  const session = await defaultContextManager.getOrCreateSession(botConfig.userId);
  const context: ToolContext = {
    userId: botConfig.userId,
    sessionId: session.sessionId,
    walletAddress: botConfig.walletAddress,
    agentState: {
      riskTolerance: botConfig.riskTolerance,
      tradingExperience: 'advanced'
    }
  };

  // Simulate bot operations
  const botOperations = [
    'Analyze ETH market conditions with 4h timeframe',
    'Find arbitrage opportunities for ETH with min 0.5% profit',
    'Get trading signals for SEI with aggressive risk',
    'Compare swap fees for USDC across all DEXs',
    'Monitor ETH price above $2000'
  ];

  console.log(`🤖 Trading Bot Started (Risk: ${botConfig.riskTolerance})\n`);

  for (const operation of botOperations) {
    console.log(`Bot Operation: ${operation}`);
    
    try {
      const result = await kit.processQuery(operation, context);
      console.log(`Executed: ${result.toolUsed}`);
      console.log(`Decision: ${result.result.slice(0, 150)}...`);
      
      // Bot decision logic based on results
      if (operation.includes('arbitrage') && result.result.includes('profitable')) {
        console.log('🚀 Bot Decision: Execute arbitrage trade');
      } else if (operation.includes('trading signals') && result.result.includes('BUY')) {
        console.log('📈 Bot Decision: Execute buy order');
      } else if (operation.includes('monitor')) {
        console.log('👁️ Bot Decision: Alert system activated');
      }
      
    } catch (error) {
      console.error('Bot Error:', error);
    }
    
    console.log('---\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('🤖 Trading Bot Session Complete\n');
}

/**
 * Main execution function
 */
async function runAllExamples() {
  console.log('🚀 DeFi LangChain Kit Integration Examples\n');
  console.log('==========================================\n');

  try {
    await basicToolUsageExample();
    await contextAwareConversationExample();
    await errorHandlingExample();
    await multiStepOperationExample();
    await toolDiscoveryExample();
    await tradingBotExample();
    
    console.log('✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  }
}

// Export examples for individual testing
export {
  basicToolUsageExample,
  contextAwareConversationExample,
  errorHandlingExample,
  multiStepOperationExample,
  toolDiscoveryExample,
  tradingBotExample,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}