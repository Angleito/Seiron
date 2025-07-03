# Symphony Protocol Wrapper

A comprehensive, type-safe wrapper for integrating with the Symphony protocol on the Sei network. This implementation provides robust token swapping capabilities with advanced routing, error handling, and analytics using functional programming patterns with fp-ts.

## Features

- **Type-Safe Operations**: Full TypeScript support with fp-ts for functional error handling
- **Multi-Protocol Routing**: Intelligent route optimization across multiple DEX protocols
- **Advanced Analytics**: Comprehensive swap impact analysis and protocol statistics
- **Robust Error Handling**: Enhanced error recovery strategies and user-friendly messaging
- **Caching System**: Intelligent quote and route caching for improved performance
- **Real-time Monitoring**: Transaction monitoring and confirmation tracking
- **Gas Optimization**: Advanced gas estimation and optimization strategies

## Installation

```bash
npm install fp-ts viem
```

## Quick Start

```typescript
import { createSymphonyProtocolWrapper, defaultSymphonyConfig } from './protocols/sei';
import { createPublicClient, createWalletClient } from 'viem';

// Setup clients
const publicClient = createPublicClient({ /* your config */ });
const walletClient = createWalletClient({ /* your config */ });

// Create Symphony wrapper
const symphony = createSymphonyProtocolWrapper(
  defaultSymphonyConfig,
  defaultSymphonyIntegrationConfig,
  publicClient,
  walletClient
);

// Get a quote
const quote = await symphony.getQuote({
  tokenIn: 'SEI_ADDRESS',
  tokenOut: 'USDC_ADDRESS',
  amountIn: '1000000000000000000', // 1 SEI
  slippagePercent: 1.0
})();

// Execute swap
if (E.isRight(quote)) {
  const swap = await symphony.executeSwap({
    tokenIn: 'SEI_ADDRESS',
    tokenOut: 'USDC_ADDRESS',
    amountIn: '1000000000000000000',
    amountOutMinimum: quote.right.slippageAdjustedAmountOut,
    recipient: 'RECIPIENT_ADDRESS',
    deadline: Math.floor(Date.now() / 1000) + 300,
    routeId: quote.right.route.id,
    slippagePercent: 1.0
  })();
}
```

## Core Components

### SymphonyProtocolWrapper

The main class providing comprehensive Symphony protocol integration:

```typescript
class SymphonyProtocolWrapper {
  // Core swap operations
  getQuote(request: SwapQuoteRequest): TaskEither<SymphonyError, SwapQuoteResponse>
  executeSwap(request: SwapExecuteRequest): TaskEither<SymphonyError, SwapExecuteResponse>
  getRoutes(request: RouteRequest): TaskEither<SymphonyError, RouteResponse>
  estimateGas(request: GasEstimateRequest): TaskEither<SymphonyError, GasEstimateResponse>
  validateSwap(request: SwapExecuteRequest): TaskEither<SymphonyError, SwapValidationResponse>

  // Advanced features
  analyzeSwapImpact(request: SwapQuoteRequest): TaskEither<SymphonyError, SwapImpactAnalysis>
  findOptimalRoute(request: RouteRequest, params: RouteOptimizationParams): TaskEither<SymphonyError, OptimalRouteAnalysis>
  getCrossProtocolRoutes(request: RouteRequest): TaskEither<SymphonyError, CrossProtocolRoute[]>

  // Analytics and monitoring
  getAnalytics(): TaskEither<SymphonyError, SwapAnalytics>
  getProtocolStats(): TaskEither<SymphonyError, ProtocolStats>
  monitorSwap(txHash: string): TaskEither<SymphonyError, SwapMonitoring>
}
```

### Enhanced Liquidity Manager

Integrates Symphony with existing DragonSwap functionality:

```typescript
class EnhancedLiquidityManager {
  // Route comparison
  getOptimalSwapRoute(options: SwapOptions): TaskEither<LiquidityError | SymphonyError, SwapComparisonResult>
  executeOptimalSwap(options: SwapOptions): TaskEither<LiquidityError | SymphonyError, SwapExecuteResponse>
  
  // Analysis
  analyzeSwap(options: SwapOptions): TaskEither<LiquidityError | SymphonyError, SwapImpactAnalysis>
  getAnalytics(): TaskEither<LiquidityError | SymphonyError, LiquidityAnalytics>
  getProtocolHealth(): TaskEither<LiquidityError | SymphonyError, ProtocolHealth>
}
```

## Key Features

### 1. Advanced Route Optimization

```typescript
// Find optimal route with specific criteria
const analysis = await symphony.findOptimalRoute(
  {
    tokenIn: 'SEI_ADDRESS',
    tokenOut: 'USDC_ADDRESS',
    amountIn: '1000000000000000000'
  },
  {
    optimizeFor: 'price',     // 'price' | 'gas' | 'speed' | 'risk'
    maxHops: 3,
    riskTolerance: 'medium'   // 'low' | 'medium' | 'high'
  }
)();
```

### 2. Comprehensive Error Handling

```typescript
import { withErrorHandling, createErrorContext } from './protocols/sei/errors';

const operation = withErrorHandling(
  () => symphony.getQuote(request),
  createErrorContext('getQuote', userAddress)
);

const result = await operation();

if (E.isLeft(result)) {
  console.log(`Error: ${result.left.userMessage}`);
  console.log(`Recovery: ${result.left.recoveryStrategy.recoveryAction}`);
  console.log(`Help: ${result.left.helpUrl}`);
}
```

### 3. Swap Impact Analysis

```typescript
// Analyze potential swap impact
const impact = await symphony.analyzeSwapImpact({
  tokenIn: 'SEI_ADDRESS',
  tokenOut: 'USDC_ADDRESS',
  amountIn: '1000000000000000000',
  slippagePercent: 1.0
})();

if (E.isRight(impact)) {
  console.log(`Price Impact: ${impact.right.priceImpact}%`);
  console.log(`Risk Level: ${impact.right.slippageRisk}`);
  console.log(`Recommendation: ${impact.right.recommendation}`);
}
```

### 4. Multi-Protocol Route Comparison

```typescript
// Compare routes across protocols
const comparison = await enhancedLiquidityManager.getOptimalSwapRoute({
  tokenIn: 'SEI_ADDRESS',
  tokenOut: 'USDC_ADDRESS',
  amountIn: '1000000000000000000',
  optimizeFor: 'price'
})();

if (E.isRight(comparison)) {
  console.log(`Best protocol: ${comparison.right.bestRoute}`);
  console.log(`Savings: ${comparison.right.savings}`);
  console.log(`Risk: ${comparison.right.riskAssessment}`);
}
```

### 5. Real-time Analytics

```typescript
// Get comprehensive analytics
const analytics = await symphony.getAnalytics()();

if (E.isRight(analytics)) {
  console.log(`24h Volume: ${analytics.right.volume24h}`);
  console.log(`24h Fees: ${analytics.right.fees24h}`);
  console.log(`Average Slippage: ${analytics.right.averageSlippage}%`);
}
```

## Configuration

### Symphony Configuration

```typescript
interface SymphonyConfig {
  readonly apiUrl: string;
  readonly contractAddress: string;
  readonly maxSlippagePercent: number;
  readonly gasLimitMultiplier: number;
  readonly timeout: number;
}

const customConfig: SymphonyConfig = {
  apiUrl: 'https://api.symphony.sei.io',
  contractAddress: 'SYMPHONY_ROUTER_ADDRESS',
  maxSlippagePercent: 5.0,
  gasLimitMultiplier: 1.2,
  timeout: 10000
};
```

### Integration Configuration

```typescript
interface SymphonyIntegrationConfig {
  readonly enableAnalytics: boolean;
  readonly enableRouteOptimization: boolean;
  readonly enableRiskAnalysis: boolean;
  readonly enableMonitoring: boolean;
  readonly cacheConfig: {
    readonly enableQuoteCache: boolean;
    readonly quoteCacheDuration: number;
    readonly enableRouteCache: boolean;
    readonly routeCacheDuration: number;
  };
}
```

## Error Handling

The Symphony wrapper provides comprehensive error handling with recovery strategies:

### Error Types

- `network_error`: Network connectivity issues
- `invalid_token`: Invalid token addresses
- `insufficient_liquidity`: Insufficient pool liquidity
- `slippage_exceeded`: Slippage tolerance exceeded
- `route_not_found`: No viable swap route
- `quote_expired`: Price quote expired
- `gas_estimation_failed`: Gas estimation errors
- `validation_failed`: Parameter validation errors
- `execution_failed`: Transaction execution errors
- `timeout`: Operation timeout
- `rate_limit_exceeded`: API rate limits
- `protocol_unavailable`: Protocol downtime

### Recovery Strategies

Each error type has an associated recovery strategy:

- **Retry**: Automatic retry with exponential backoff
- **Fallback**: Alternative routes or protocols
- **Manual**: User intervention required
- **Abort**: Operation cannot be recovered

### Enhanced Error Information

```typescript
interface EnhancedSymphonyError {
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly userMessage: string;
  readonly technicalMessage: string;
  readonly recoveryStrategy: ErrorRecoveryStrategy;
  readonly helpUrl?: string;
  readonly errorCode: string;
}
```

## Utilities

### Token Management

```typescript
import { validateTokenAddress, findTokenBySymbol, formatTokenAmount } from './protocols/sei/utils';

// Validate token address
const isValid = validateTokenAddress('0x1234...');

// Find token by symbol
const token = findTokenBySymbol('SEI');

// Format amounts
const formatted = formatTokenAmount('1000000000000000000', 18); // '1'
```

### Route Analysis

```typescript
import { calculateRouteEfficiency, rankRoutes, assessRiskLevel } from './protocols/sei/utils';

// Calculate route efficiency
const efficiency = calculateRouteEfficiency(route);

// Rank routes by criteria
const rankedRoutes = rankRoutes(routes, optimizationParams);

// Assess risk level
const risk = assessRiskLevel(priceImpact, slippage, liquidityDepth, hops);
```

## Testing

```bash
# Run tests
npm test src/protocols/sei/__tests__/

# Run specific test
npm test SymphonyProtocolWrapper.test.ts

# Run with coverage
npm test -- --coverage
```

## Examples

See the [examples directory](./examples/) for comprehensive usage examples:

- [Basic token swapping](./examples/symphony-usage.ts#basicTokenSwap)
- [Route optimization](./examples/symphony-usage.ts#routeOptimization)
- [Advanced analysis](./examples/symphony-usage.ts#advancedRouteAnalysis)
- [Error handling](./examples/symphony-usage.ts#errorHandlingExample)
- [Analytics and monitoring](./examples/symphony-usage.ts#analyticsExample)

## Integration with Existing Systems

### DragonSwap Integration

The Symphony wrapper seamlessly integrates with existing DragonSwap functionality:

```typescript
import { EnhancedLiquidityManager } from '../liquidity/EnhancedLiquidityManager';

const manager = new EnhancedLiquidityManager(publicClient, walletClient, {
  enableSymphonyIntegration: true,
  preferredProtocol: 'auto',
  autoOptimization: true
});

// Automatically chooses best route between DragonSwap and Symphony
const result = await manager.executeOptimalSwap(options)();
```

### Portfolio Manager Integration

```typescript
import { PortfolioManager } from '../portfolio/PortfolioManager';

class EnhancedPortfolioManager extends PortfolioManager {
  constructor(
    private symphonyWrapper: SymphonyProtocolWrapper,
    private liquidityManager: EnhancedLiquidityManager
  ) {
    super();
  }

  async rebalancePortfolio(targetAllocations: Allocation[]) {
    // Use Symphony for optimal rebalancing swaps
    for (const allocation of targetAllocations) {
      const swapResult = await this.liquidityManager.executeOptimalSwap({
        tokenIn: allocation.currentToken,
        tokenOut: allocation.targetToken,
        amountIn: allocation.amount,
        optimizeFor: 'price'
      })();
    }
  }
}
```

## Performance Considerations

### Caching

The wrapper implements intelligent caching for:

- **Quote Cache**: 30 seconds (configurable)
- **Route Cache**: 60 seconds (configurable)
- **Token Cache**: 1 hour
- **Analytics Cache**: 5 minutes

### Gas Optimization

- Automatic gas estimation with confidence scoring
- Route optimization for gas efficiency
- Batch operations where possible

### Rate Limiting

- Built-in rate limit handling
- Automatic retry with exponential backoff
- Request queuing for high-volume applications

## Security Considerations

- All operations use read-only public clients for data fetching
- Private keys never leave the wallet client
- Input validation on all parameters
- Slippage protection on all swaps
- Transaction simulation before execution

## Monitoring and Analytics

### Real-time Monitoring

```typescript
// Monitor swap execution
const monitoring = await symphony.monitorSwap(txHash)();

if (E.isRight(monitoring)) {
  console.log(`Status: ${monitoring.right.status}`);
  console.log(`Confirmations: ${monitoring.right.confirmations}`);
}
```

### Analytics Dashboard

```typescript
// Get comprehensive statistics
const stats = await symphony.getProtocolStats()();
const analytics = await symphony.getAnalytics()();
const liquidityAnalytics = await manager.getAnalytics()();

// Combine for dashboard
const dashboard = {
  protocolStats: stats,
  swapAnalytics: analytics,
  liquidityMetrics: liquidityAnalytics
};
```

## Troubleshooting

### Common Issues

1. **Network Errors**
   - Check RPC endpoint connectivity
   - Verify network configuration
   - Check for rate limiting

2. **Slippage Exceeded**
   - Increase slippage tolerance
   - Reduce swap amount
   - Try alternative routes

3. **Insufficient Liquidity**
   - Check pool liquidity depth
   - Consider multi-hop routes
   - Reduce swap amount

4. **Gas Estimation Failures**
   - Check token allowances
   - Verify contract interactions
   - Increase gas limits

### Debug Mode

Enable debug logging:

```typescript
const config = {
  ...defaultSymphonyConfig,
  enableDebug: true
};
```

### Support

For issues and support:

- [Symphony Protocol Documentation](https://docs.symphony.sei.io)
- [Sei Network Documentation](https://docs.sei.io)
- [GitHub Issues](https://github.com/your-repo/issues)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.