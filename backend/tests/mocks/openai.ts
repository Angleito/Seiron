/**
 * Mock OpenAI API for testing // TODO: REMOVE_MOCK - Mock-related keywords
 */

// Mock OpenAI responses // TODO: REMOVE_MOCK - Mock-related keywords
export const mockOpenAIResponses = { // TODO: REMOVE_MOCK - Mock-related keywords
  chat: {
    success: {
      choices: [{
        message: {
          content: 'I can help you manage your DeFi portfolio. What would you like to do?'
        },
        finish_reason: 'stop',
        index: 0
      }],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 20,
        total_tokens: 70
      }
    },
    portfolioAnalysis: {
      choices: [{
        message: {
          content: `Based on your portfolio analysis:

1. **Risk Assessment**: Your health factor of 2.5 indicates a healthy position with moderate risk.

2. **Yield Optimization**: Consider rebalancing your lending positions to maximize APY while maintaining safety.

3. **Rebalancing Recommendations**: 
   - Increase USDC supply to take advantage of current rates
   - Consider adding liquidity to SEI-USDC pool for additional yield

4. **Market Outlook**: Current market conditions favor conservative DeFi strategies with focus on stablecoin yields.`
        },
        finish_reason: 'stop',
        index: 0
      }],
      usage: {
        prompt_tokens: 200,
        completion_tokens: 150,
        total_tokens: 350
      }
    },
    commandParsing: {
      choices: [{
        message: {
          content: 'I understand you want to supply 1000 USDC to Yei Finance. Let me help you with that transaction.'
        },
        finish_reason: 'stop',
        index: 0
      }],
      usage: {
        prompt_tokens: 75,
        completion_tokens: 25,
        total_tokens: 100
      }
    },
    error: {
      choices: [{
        message: {
          content: 'I apologize, but I encountered an error processing your request. Please try again.'
        },
        finish_reason: 'stop',
        index: 0
      }],
      usage: {
        prompt_tokens: 30,
        completion_tokens: 20,
        total_tokens: 50
      }
    }
  }
};

// Mock OpenAI client // TODO: REMOVE_MOCK - Mock-related keywords
export const createMockOpenAIClient = () => ({ // TODO: REMOVE_MOCK - Mock-related keywords
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue(mockOpenAIResponses.chat.success) // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    }
  }
});

// Setup OpenAI mocks // TODO: REMOVE_MOCK - Mock-related keywords
export const setupOpenAIMocks = () => { // TODO: REMOVE_MOCK - Mock-related keywords
  const mockClient = createMockOpenAIClient(); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  
  // Configure default successful responses
  mockClient.chat.completions.create.mockResolvedValue(mockOpenAIResponses.chat.success); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  
  return mockClient; // TODO: REMOVE_MOCK - Mock-related keywords
};

// Simulate different OpenAI scenarios
export const simulateOpenAIScenario = (client: any, scenario: keyof typeof mockOpenAIResponses.chat) => { // TODO: REMOVE_MOCK - Mock-related keywords
  client.chat.completions.create.mockResolvedValue(mockOpenAIResponses.chat[scenario]); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
};

// Simulate OpenAI errors
export const simulateOpenAIError = (client: any, error: Error) => {
  client.chat.completions.create.mockRejectedValue(error); // TODO: REMOVE_MOCK - Mock-related keywords
};

// Mock AI service responses // TODO: REMOVE_MOCK - Mock-related keywords
export const mockAIServiceResponses = { // TODO: REMOVE_MOCK - Mock-related keywords
  portfolioAnalysis: `Your portfolio shows a healthy balance with $10,000 total value.  // TODO: REMOVE_MOCK - Hard-coded currency values
  Health factor of 2.5 indicates low liquidation risk. 
  Consider rebalancing to optimize yield while maintaining safety.`,
  
  commandResponse: {
    message: 'I can help you supply 1000 USDC to Yei Finance. Shall I proceed with this transaction?',
    command: {
      type: 'supply',
      payload: {
        asset: 'USDC',
        amount: '1000',
        platform: 'YeiFinance'
      }
    },
    suggestions: [
      'Supply 1000 USDC to Yei Finance',
      'Check current lending rates',
      'View portfolio summary'
    ],
    confidence: 0.9,
    reasoning: 'Detected supply command for USDC'
  },
  
  chatResponse: {
    message: 'Hello! I can help you manage your DeFi portfolio. What would you like to do today?',
    suggestions: [
      'Show my portfolio',
      'Supply tokens to earn yield',
      'Check my lending positions',
      'Add liquidity to pools'
    ],
    confidence: 0.8,
    reasoning: 'General greeting and portfolio assistance'
  }
};

// Utility to create mock conversation context // TODO: REMOVE_MOCK - Mock-related keywords
export const createMockChatContext = (walletAddress: string, portfolioData?: any) => ({ // TODO: REMOVE_MOCK - Mock-related keywords
  walletAddress,
  messages: [
    {
      role: 'user' as const,
      content: 'Hello',
      timestamp: new Date().toISOString()
    },
    {
      role: 'assistant' as const,
      content: 'Hello! How can I help you with your portfolio today?',
      timestamp: new Date().toISOString()
    }
  ],
  portfolioData: portfolioData || {
    totalValueUSD: 10000,
    lendingPositions: [],
    liquidityPositions: [],
    healthFactor: 2.5
  }
});