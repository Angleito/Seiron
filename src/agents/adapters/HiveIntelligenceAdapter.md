# HiveIntelligenceAdapter

The HiveIntelligenceAdapter provides seamless integration between the Seiron agent system and the Hive Intelligence API, enabling AI-powered blockchain search, analytics, and market intelligence capabilities.

## Overview

The HiveIntelligenceAdapter extends the BaseAgent class to provide:

- **Natural Language Search**: Query blockchain/Web3 data using natural language
- **AI-Powered Analytics**: Get intelligent insights and recommendations
- **Portfolio Analysis**: Comprehensive portfolio performance analysis
- **Market Intelligence**: Real-time market trends and trading insights
- **Credit Management**: Track API usage and manage credit consumption
- **Rate Limiting**: Built-in rate limiting (20 requests per minute)
- **Caching**: Intelligent response caching for improved performance
- **Error Handling**: Robust error handling with fp-ts patterns

## Features

### Core Capabilities

1. **Search Functionality**
   - Natural language queries for blockchain data
   - Multi-chain support
   - Relevance scoring and filtering
   - Real-time and historical data

2. **Analytics Engine**
   - Portfolio performance analysis
   - Risk assessment and monitoring
   - Trend analysis and predictions
   - Custom metric calculations

3. **Market Intelligence**
   - Real-time market data
   - Trading signals and opportunities
   - Liquidity analysis
   - Cross-protocol insights

4. **Credit-Based System**
   - Transparent credit consumption tracking
   - Usage alerts and limits
   - Query history and analytics
   - Cost optimization recommendations

### Technical Features

- **Functional Programming**: Built with fp-ts patterns for type safety
- **Rate Limiting**: Configurable rate limiting with sliding window
- **Caching**: LRU cache with TTL for improved performance
- **Retry Logic**: Exponential backoff for failed requests
- **Authentication**: Bearer token authentication
- **Type Safety**: Full TypeScript support with comprehensive types

## Installation

```typescript
import { HiveIntelligenceAdapter, createHiveAdapter } from '@/agents/adapters';

// Create with default configuration
const adapter = createHiveAdapter(agentConfig);

// Or create with custom configuration
const adapter = new HiveIntelligenceAdapter(agentConfig, {
  baseUrl: 'https://api.hiveintelligence.xyz/v1',
  apiKey: 'your-api-key',
  rateLimitConfig: {
    maxRequests: 20,
    windowMs: 60000
  },
  cacheConfig: {
    enabled: true,
    ttlMs: 300000,
    maxSize: 1000
  }
});
```

## Configuration

### HiveIntelligenceConfig

```typescript
interface HiveIntelligenceConfig {
  baseUrl: string;                    // API base URL
  apiKey: string;                     // Authentication token
  version: string;                    // API version
  rateLimitConfig: {
    maxRequests: number;              // Max requests per window
    windowMs: number;                 // Time window in milliseconds
  };
  cacheConfig: {
    enabled: boolean;                 // Enable/disable caching
    ttlMs: number;                    // Cache TTL in milliseconds
    maxSize: number;                  // Maximum cache entries
  };
  retryConfig: {
    maxRetries: number;               // Maximum retry attempts
    backoffMs: number;                // Base backoff delay
  };
  creditConfig: {
    trackUsage: boolean;              // Enable credit tracking
    maxCreditsPerQuery: number;       // Maximum credits per query
    alertThreshold: number;           // Alert when credits remaining < threshold
  };
}
```

### Environment Variables

```bash
# Required
HIVE_INTELLIGENCE_API_KEY=your-api-key-here

# Optional (defaults provided)
HIVE_INTELLIGENCE_BASE_URL=https://api.hiveintelligence.xyz/v1
HIVE_INTELLIGENCE_MAX_REQUESTS=20
HIVE_INTELLIGENCE_WINDOW_MS=60000
```

## Usage Examples

### Basic Search

```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

// Simple search
const searchResult = await adapter.search('show me recent DeFi transactions on Sei')();

if (E.isRight(searchResult)) {
  console.log('Search results:', searchResult.right.data);
}

// Search with metadata
const result = await adapter.search(
  'analyze wallet performance',
  {
    walletAddress: '0x123...',
    maxResults: 10,
    filters: { chain: 'sei', timeRange: '7d' }
  }
)();
```

### Portfolio Analysis

```typescript
// Analyze a specific wallet
const portfolioAnalysis = await adapter.analyzePortfolio(
  '0x1234567890abcdef...',
  {
    includeHistory: true,
    timeRange: '30d',
    includeRisk: true
  }
)();

if (E.isRight(portfolioAnalysis)) {
  const analysis = portfolioAnalysis.right.data;
  console.log('Insights:', analysis.insights);
  console.log('Recommendations:', analysis.recommendations);
  console.log('Metrics:', analysis.metrics);
}
```

### Market Intelligence

```typescript
// Get market intelligence
const marketInsights = await adapter.getMarketIntelligence(
  'What are the current DeFi trends on Sei network?'
)();

if (E.isRight(marketInsights)) {
  const insights = marketInsights.right.data;
  insights.insights.forEach(insight => {
    console.log(`${insight.type}: ${insight.title}`);
    console.log(`Confidence: ${insight.confidence}`);
  });
}
```

### Credit Management

```typescript
// Check credit usage
const creditUsage = await adapter.getCreditUsage()();

if (E.isRight(creditUsage)) {
  const usage = creditUsage.right;
  console.log(`Credits: ${usage.usedCredits}/${usage.totalCredits}`);
  console.log(`Remaining: ${usage.remainingCredits}`);
  console.log(`Reset Date: ${usage.resetDate}`);
}

// Monitor credit alerts
adapter.on('hive:credit:alert', (event) => {
  console.warn(`Low credits: ${event.remainingCredits} remaining`);
});
```

### Using Actions

```typescript
// Execute search action
const actionResult = await adapter.executeAction('hive_search', {
  agentId: 'my-agent',
  parameters: {
    query: 'find high-yield DeFi opportunities',
    metadata: { maxResults: 5 }
  },
  state: adapter.getState(),
  metadata: {}
})();

// Execute analytics action
const analyticsResult = await adapter.executeAction('hive_analytics', {
  agentId: 'my-agent',
  parameters: {
    query: 'analyze my portfolio risk',
    metadata: { walletAddress: '0x123...' }
  },
  state: adapter.getState(),
  metadata: {}
})();
```

## API Reference

### Core Methods

#### `search(query: string, metadata?: HiveQueryMetadata): TaskEither<AgentError, HiveResponse<HiveSearchResult[]>>`

Perform a natural language search query.

**Parameters:**
- `query`: The search query string
- `metadata`: Optional query metadata (filters, limits, etc.)

**Returns:** TaskEither containing search results

#### `getAnalytics(query: string, metadata?: HiveQueryMetadata): TaskEither<AgentError, HiveResponse<HiveAnalyticsResult>>`

Get AI-powered analytics and insights.

**Parameters:**
- `query`: The analytics query string
- `metadata`: Optional query metadata

**Returns:** TaskEither containing analytics results

#### `analyzePortfolio(walletAddress: string, additionalParams?: Record<string, any>): TaskEither<AgentError, HiveResponse<HiveAnalyticsResult>>`

Perform comprehensive portfolio analysis.

**Parameters:**
- `walletAddress`: The wallet address to analyze
- `additionalParams`: Additional analysis parameters

**Returns:** TaskEither containing portfolio analysis

#### `getMarketIntelligence(query: string, metadata?: HiveQueryMetadata): TaskEither<AgentError, HiveResponse<HiveAnalyticsResult>>`

Get market intelligence and trading insights.

**Parameters:**
- `query`: The market intelligence query
- `metadata`: Optional query metadata

**Returns:** TaskEither containing market intelligence

#### `getCreditUsage(): TaskEither<AgentError, CreditUsage>`

Get current credit usage and limits.

**Returns:** TaskEither containing credit usage information

### Registered Actions

The adapter automatically registers the following actions:

1. **`hive_search`** - Natural language search
2. **`hive_analytics`** - AI-powered analytics
3. **`hive_portfolio_analysis`** - Portfolio analysis
4. **`hive_market_intelligence`** - Market intelligence
5. **`hive_credit_usage`** - Credit usage information

### Events

The adapter emits the following events:

- `hive:plugin:initialized` - Plugin initialization complete
- `hive:plugin:cleanup` - Plugin cleanup complete
- `hive:credit:alert` - Credit threshold alert

## Types

### HiveSearchResult

```typescript
interface HiveSearchResult {
  id: string;
  title: string;
  description: string;
  type: 'transaction' | 'address' | 'token' | 'protocol' | 'event';
  chain: string;
  relevanceScore: number;
  data: Record<string, any>;
  timestamp: string;
}
```

### HiveAnalyticsResult

```typescript
interface HiveAnalyticsResult {
  queryId: string;
  analysisType: 'portfolio' | 'market' | 'risk' | 'performance';
  insights: HiveInsight[];
  metrics: Record<string, number>;
  recommendations: HiveRecommendation[];
  timestamp: string;
}
```

### HiveInsight

```typescript
interface HiveInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'correlation';
  title: string;
  description: string;
  confidence: number;
  data: Record<string, any>;
}
```

### HiveRecommendation

```typescript
interface HiveRecommendation {
  id: string;
  type: 'buy' | 'sell' | 'hold' | 'monitor' | 'optimize';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  expectedImpact: number;
  actionItems: string[];
}
```

## Error Handling

The adapter uses fp-ts patterns for comprehensive error handling:

```typescript
import * as E from 'fp-ts/Either';

const result = await adapter.search('test query')();

if (E.isLeft(result)) {
  // Handle error
  console.error('Search failed:', result.left.message);
} else {
  // Handle success
  console.log('Search successful:', result.right.data);
}
```

### Common Error Codes

- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `HIVE_QUERY_FAILED` - API query failed
- `NETWORK_ERROR` - Network connectivity issue
- `INVALID_PARAMETER` - Invalid parameter provided
- `INSUFFICIENT_CREDITS` - Not enough credits for query

## Performance Considerations

### Rate Limiting

The adapter enforces a default rate limit of 20 requests per minute. Configure based on your API plan:

```typescript
const config = {
  rateLimitConfig: {
    maxRequests: 100,  // Increase for higher-tier plans
    windowMs: 60000
  }
};
```

### Caching

Enable caching to reduce API calls and improve performance:

```typescript
const config = {
  cacheConfig: {
    enabled: true,
    ttlMs: 300000,     // 5 minutes
    maxSize: 1000      // Adjust based on memory constraints
  }
};
```

### Credit Optimization

Monitor credit usage to optimize costs:

```typescript
const config = {
  creditConfig: {
    trackUsage: true,
    alertThreshold: 100,  // Alert when < 100 credits remain
    maxCreditsPerQuery: 5  // Limit expensive queries
  }
};
```

## Testing

The adapter includes comprehensive tests:

```bash
# Run unit tests
npm test src/agents/adapters/__tests__/HiveIntelligenceAdapter.test.ts

# Run property-based tests
npm test src/agents/adapters/__tests__/HiveIntelligenceAdapter.property.test.ts

# Run with coverage
npm run test:coverage
```

## Integration with Agent Architecture

The HiveIntelligenceAdapter seamlessly integrates with the Seiron agent system:

```typescript
// Install as plugin
await adapter.installHivePlugin()();

// Use with agent lifecycle
await adapter.start()();
// ... perform operations
await adapter.stop()();

// Register with agent orchestrator
const agentOrchestrator = new AgentOrchestrator();
agentOrchestrator.registerAgent(adapter);
```

## Best Practices

1. **Environment Variables**: Store API keys securely
2. **Rate Limiting**: Configure appropriate limits for your use case
3. **Caching**: Enable caching for frequently accessed data
4. **Error Handling**: Always handle TaskEither results properly
5. **Credit Monitoring**: Set up alerts for credit usage
6. **Query Optimization**: Use specific queries to reduce credit consumption

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify API key is correct
   - Check environment variable is set

2. **Rate Limit Exceeded**
   - Reduce request frequency
   - Implement exponential backoff
   - Upgrade API plan if needed

3. **Network Timeouts**
   - Check network connectivity
   - Increase timeout configuration
   - Implement retry logic

4. **Credit Exhaustion**
   - Monitor credit usage
   - Optimize query frequency
   - Consider API plan upgrade

### Debug Mode

Enable debug logging:

```typescript
const adapter = new HiveIntelligenceAdapter(agentConfig, {
  ...hiveConfig,
  debug: true
});
```

## Migration Guide

### From v1.0.0 to v1.1.0

No breaking changes. New features:
- Enhanced credit tracking
- Improved error messages
- Additional insight types

### Future Versions

The adapter follows semantic versioning. Breaking changes will be clearly documented with migration guides.

## Contributing

1. Follow the existing code patterns
2. Add comprehensive tests for new features
3. Update documentation
4. Ensure fp-ts patterns are maintained
5. Test with property-based testing where applicable

## License

This adapter is part of the Seiron project and follows the same license terms.