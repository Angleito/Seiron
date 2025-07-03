# LangChain Integration for Sei DeFi Agent Kit

This module provides comprehensive LangChain integration for the Sei DeFi ecosystem, enabling natural language interaction with DeFi protocols through conversational AI interfaces.

## 🌟 Features

- **Natural Language Processing**: Convert natural language queries into structured DeFi operations
- **Multi-Protocol Support**: Integrated with YeiFinance, Takara, DragonSwap, Symphony, and Citrex
- **Context Management**: Maintain conversation state and user preferences across sessions
- **Error Handling**: Comprehensive error handling with user-friendly messages and recovery suggestions
- **Tool Discovery**: Dynamic tool registration and discovery system
- **Cross-Protocol Operations**: Support for yield optimization, arbitrage, and portfolio rebalancing

## 🏗️ Architecture

```
langchain/
├── tools/                    # Core tool infrastructure
│   ├── BaseTool.ts          # Base class for all DeFi tools
│   ├── ToolFactory.ts       # Factory for creating tools from agent actions
│   ├── ToolRegistry.ts      # Central tool management system
│   ├── ParameterParser.ts   # Natural language parameter extraction
│   ├── LendingTools.ts      # Lending protocol tools
│   ├── LiquidityTools.ts    # Liquidity management tools
│   ├── MarketTools.ts       # Market analysis and trading tools
│   └── CrossProtocolTools.ts # Cross-protocol optimization tools
├── integration/             # Integration layer
│   ├── AgentToolAdapter.ts  # Bridge between agents and LangChain
│   ├── ContextManager.ts    # Conversation context management
│   └── ErrorHandler.ts      # Error handling and recovery
└── examples/               # Usage examples and demos
    └── integration-example.ts
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { processDeFiQuery, initializeDeFiKit, ToolContext } from './langchain';

// Initialize the kit
await initializeDeFiKit();

// Define user context
const context: ToolContext = {
  userId: 'user123',
  walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
  agentState: {
    preferredProtocols: ['YeiFinance', 'DragonSwap'],
    riskTolerance: 'medium'
  }
};

// Process natural language queries
const result = await processDeFiQuery('Deposit 100 USDC to earn interest', context);
console.log(result.result);
```

### Advanced Usage with Full Kit

```typescript
import { DeFiLangChainKit, defaultContextManager } from './langchain';

const kit = new DeFiLangChainKit();
await kit.initialize();

// Create conversation session
const session = await defaultContextManager.getOrCreateSession('user123');

const context: ToolContext = {
  userId: 'user123',
  sessionId: session.sessionId,
  walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
};

// Process multiple queries with context awareness
const queries = [
  'Analyze SEI market conditions',
  'Find best yield farming for USDC',
  'Compare lending rates across protocols'
];

for (const query of queries) {
  const result = await kit.processQuery(query, context);
  console.log(`${query}: ${result.result}`);
}
```

## 🛠️ Available Tools

### Lending Tools
- **Deposit Tool**: Supply assets to lending protocols
- **Withdraw Tool**: Remove assets from lending pools
- **Borrow Tool**: Take loans against collateral
- **Repay Tool**: Pay back borrowed assets
- **Health Factor Tool**: Monitor liquidation risk
- **Yield Optimization Tool**: Compare lending rates

### Liquidity Tools
- **Swap Tool**: Exchange tokens on DEXs
- **Add Liquidity Tool**: Provide liquidity to pools
- **Remove Liquidity Tool**: Withdraw liquidity positions
- **Arbitrage Tool**: Find arbitrage opportunities
- **Price Comparison Tool**: Compare prices across DEXs
- **Pool Analytics Tool**: Analyze pool performance

### Market Tools
- **Market Analysis Tool**: Comprehensive market analysis
- **Price Monitoring Tool**: Set up price alerts
- **Trading Signals Tool**: Generate trading recommendations
- **Risk Assessment Tool**: Assess portfolio risks

### Cross-Protocol Tools
- **Protocol Comparison Tool**: Compare features across protocols
- **Yield Farming Optimizer**: Find best yield opportunities
- **Portfolio Rebalancing Tool**: Optimize asset allocation
- **Cross-Chain Bridge Tool**: Bridge assets across chains

## 📝 Natural Language Examples

### Lending Operations
```
"Deposit 100 USDC to earn interest"
"Withdraw 50 ETH from YeiFinance"
"Borrow 200 USDC with variable rate"
"Check my health factor"
"Find best supply rates for SEI"
```

### Liquidity Operations
```
"Swap 0.5 ETH for SEI"
"Add liquidity: 100 USDC and 0.05 ETH"
"Remove liquidity from position 123"
"Find arbitrage opportunities for USDC"
"Compare ETH prices across DEXs"
```

### Market Operations
```
"Analyze SEI market conditions"
"Set price alert for ETH above $2000"
"Get trading signals for ATOM"
"Assess my portfolio risk"
```

### Cross-Protocol Operations
```
"Compare USDC lending rates across all protocols"
"Find best yield farming for ETH with low risk"
"Rebalance portfolio to 50% USDC, 30% ETH, 20% SEI"
"Bridge 100 USDC from Ethereum to Sei"
```

## 🔧 Configuration

### Tool Context
```typescript
interface ToolContext {
  userId?: string;
  sessionId?: string;
  conversationHistory?: string[];
  walletAddress?: string;
  agentState?: {
    preferredProtocols?: string[];
    riskTolerance?: 'low' | 'medium' | 'high';
    tradingExperience?: 'beginner' | 'intermediate' | 'advanced';
  };
  metadata?: Record<string, any>;
}
```

### Error Handling
```typescript
import { defaultErrorHandler } from './langchain';

// Configure error handling
const errorHandler = createErrorHandler({
  enableAnalytics: true,
  enableAutoRecovery: true,
  maxRetryAttempts: 3,
  userFriendlyMessages: true
});

// Handle errors gracefully
try {
  const result = await processDeFiQuery(query, context);
} catch (error) {
  const enhancedError = await errorHandler.handleError(error);
  console.log(enhancedError.userMessage);
  console.log('Suggestions:', enhancedError.suggestions);
}
```

### Context Management
```typescript
import { defaultContextManager } from './langchain';

// Create user profile
await defaultContextManager.updateUserProfile('user123', {
  walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
  preferredProtocols: ['YeiFinance', 'DragonSwap'],
  riskTolerance: 'medium'
});

// Manage conversation sessions
const session = await defaultContextManager.getOrCreateSession('user123');

// Record operations
const operation = {
  id: 'op_123',
  type: 'deposit',
  asset: 'USDC',
  amount: '100',
  protocol: 'YeiFinance',
  timestamp: new Date(),
  status: 'completed',
  details: {}
};

defaultContextManager.recordOperation(session.sessionId, operation);
```

## 🔍 Tool Discovery

```typescript
import { defaultDeFiLangChainKit } from './langchain';

// Initialize kit
await defaultDeFiLangChainKit.initialize();

// Get kit status
const status = defaultDeFiLangChainKit.getStatus();
console.log('Tools available:', status.toolCount);

// Get tools by category
const lendingTools = defaultDeFiLangChainKit.getToolsByCategory('lending');
const liquidityTools = defaultDeFiLangChainKit.getToolsByCategory('liquidity');

// Get specific tool
const depositTool = defaultDeFiLangChainKit.getTool('deposit_lending');
console.log('Tool description:', depositTool.getConfig().description);
```

## 📊 Analytics and Monitoring

### Error Analytics
```typescript
import { defaultErrorHandler } from './langchain';

// Get error report
const report = defaultErrorHandler.generateErrorReport();
console.log('Total errors:', report.totalErrors);
console.log('Most common errors:', report.mostCommonErrors);

// Get recent errors
const recentErrors = defaultErrorHandler.getRecentErrors(10);
```

### Usage Metrics
```typescript
import { defaultAgentToolAdapter } from './langchain';

// Get execution metrics
const metrics = defaultAgentToolAdapter.getExecutionMetrics();

// Get tool-specific metrics
const toolMetrics = defaultAgentToolAdapter.getToolMetrics('deposit_lending');
```

## 🎯 Best Practices

### 1. Always Initialize Before Use
```typescript
// Always initialize the kit before processing queries
await initializeDeFiKit();
```

### 2. Provide Rich Context
```typescript
// Provide as much context as possible for better results
const context: ToolContext = {
  userId: 'user123',
  sessionId: 'session456',
  walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
  agentState: {
    preferredProtocols: ['YeiFinance'],
    riskTolerance: 'medium',
    tradingExperience: 'intermediate'
  }
};
```

### 3. Handle Errors Gracefully
```typescript
try {
  const result = await processDeFiQuery(query, context);
  // Handle success
} catch (error) {
  // Handle error with user-friendly messages
  const enhancedError = await defaultErrorHandler.handleError(error);
  console.log(enhancedError.userMessage);
}
```

### 4. Use Session Management
```typescript
// Create and maintain conversation sessions
const session = await defaultContextManager.getOrCreateSession(userId);
const context = await defaultContextManager.buildToolContext(session.sessionId);
```

### 5. Monitor and Analyze
```typescript
// Regularly check error reports and metrics
const errorReport = defaultErrorHandler.generateErrorReport();
const executionMetrics = defaultAgentToolAdapter.getExecutionMetrics();
```

## 🧪 Testing

Run the integration examples:

```bash
# Install dependencies
npm install

# Run examples
npm run test:langchain

# Or run specific example
ts-node src/langchain/examples/integration-example.ts
```

## 🔗 Integration with Existing Agents

The LangChain integration works seamlessly with existing agent architecture:

```typescript
import { BaseAgent } from '../agents/base/BaseAgent';
import { defaultAgentToolAdapter } from './langchain';

// Connect existing agent to LangChain
const agent = new MyLendingAgent(config);
await defaultAgentToolAdapter.connectAgent(agent, context);

// Agent actions are automatically converted to LangChain tools
const tools = await defaultAgentToolAdapter.getAgentTools(agent.getConfig().id);
```

## 📚 Advanced Topics

### Custom Tool Development
Create custom tools by extending `BaseDeFiTool`:

```typescript
import { BaseDeFiTool, DeFiToolConfig, DeFiToolResult } from './tools/BaseTool';

class CustomTool extends BaseDeFiTool {
  constructor(context: ToolContext = {}) {
    const config: DeFiToolConfig = {
      name: 'custom_tool',
      description: 'Custom DeFi operation',
      category: 'cross-protocol',
      schema: z.object({
        // Define parameters
      }),
      examples: ['Custom operation example']
    };
    super(config, context);
  }

  protected async execute(params: Record<string, any>): Promise<DeFiToolResult> {
    // Implement custom logic
    return {
      success: true,
      message: 'Custom operation completed',
      timestamp: new Date()
    };
  }
}
```

### Custom Error Handling
Implement custom error handling strategies:

```typescript
import { ErrorHandler, RecoveryStrategy } from './integration/ErrorHandler';

const customStrategy: RecoveryStrategy = {
  id: 'custom_recovery',
  description: 'Custom error recovery',
  automated: true,
  execute: async (error) => {
    // Implement custom recovery logic
    return true;
  }
};

const errorHandler = new ErrorHandler({
  enableAutoRecovery: true
});

// Register custom recovery strategy
errorHandler.registerRecoveryStrategy('custom_error', customStrategy);
```

## 🤝 Contributing

1. Follow the existing code patterns and TypeScript conventions
2. Add comprehensive tests for new tools and features
3. Update documentation for any API changes
4. Ensure error handling is implemented for all new functionality

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.