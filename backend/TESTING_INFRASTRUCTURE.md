# Functional Testing Infrastructure

## Overview

This document describes the comprehensive modular testing infrastructure built with functional programming principles using fp-ts patterns.

## Architecture

### 1. Jest Configuration (`jest.config.js`)
- **Optimized for TypeScript + fp-ts**: Configured for fast execution with isolated modules
- **Module path mapping**: Clean imports using `@/` prefixes
- **Performance optimizations**: 50% workers, memory limits, caching
- **Coverage thresholds**: 95% for risk module, 90% for services, 85% global

### 2. Test Utilities (`src/__tests__/utils/`)

#### Core Setup (`setup.ts`)
- Custom Jest matchers for fp-ts types:
  - `toBeRight()`, `toBeLeft()`, `toBeRightWith()`, `toBeLeftWith()`
  - `toBeSome()`, `toBeNone()`, `toBeSomeWith()`
- Helper functions for TaskEither and Task execution
- Functional test environment configuration

#### Data Generators (`generators.ts`)
- **Pure functional generators** for all domain types
- **Portfolio data**: Snapshots, positions, balances
- **Risk data**: Metrics, thresholds, price data, correlations
- **Edge case generators**: Empty portfolios, high-risk scenarios
- **Combinators**: `withRandomSeed`, `generateMany`, `combineGenerators`

#### Assertions (`assertions.ts`)
- **Type-safe assertions** for fp-ts patterns
- **Domain-specific validators**: Risk metrics, scores, allocations
- **Mathematical properties**: Monotonicity, bounds checking
- **Pure function testing**: Determinism, side-effect detection
- **Property testing helpers**: `forAll`, `exists`

#### Property Testing (`property-testing.ts`)
- **Generator library**: Primitive, domain, and composite generators
- **Property test engine**: With shrinking and failure detection
- **Mathematical properties**: Linearity, convexity, associativity
- **Domain generators**: Portfolio values, risk metrics, correlations
- **Combinators**: `oneOf`, `frequency`, `mapGen`, `filterGen`

### 3. Mock Services (`src/__mocks__/`)

#### Blockchain Service (`blockchain.ts`)
- **TaskEither-based API**: All operations return `TE.TaskEither<Error, Result>`
- **State management**: Mock portfolios, network simulation
- **Error scenarios**: Invalid addresses, timeouts, rate limits
- **Batch operations**: Multiple wallet queries
- **Test scenarios**: High-risk, concentrated, empty portfolios

#### Cache Service (`cache.ts`)
- **Functional caching patterns**: Using Option for missing values
- **TTL management**: Automatic expiration handling
- **Error types**: Connection, serialization, key-not-found errors
- **Bulk operations**: `getMany`, `setMany`, `deleteMany`
- **Statistics**: Cache utilization and performance metrics

### 4. Unit Tests

#### Risk Calculations (`src/risk/__tests__/calculations.test.ts`)
- **Pure function testing**: Deterministic, side-effect free
- **Mathematical properties**: Health factor, leverage, concentration
- **Edge cases**: Zero values, infinite values, boundary conditions
- **Array properties**: Weight summation, sorting, bounds
- **Property-based tests**: 200+ iterations for critical functions

#### Type Guards (`src/risk/__tests__/types.test.ts`)
- **Exhaustive testing**: All valid enum values
- **Case sensitivity**: Proper rejection of variants
- **Edge cases**: Special characters, whitespace, unicode
- **Performance testing**: 10k iterations under 100ms
- **Property-based validation**: Random string rejection

#### Property Tests (`src/risk/__tests__/calculations.property.test.ts`)
- **Mathematical invariants**: Scale invariance, monotonicity
- **Boundary testing**: Zero portfolios, maximum values
- **Correlation properties**: Symmetry, diagonal values
- **Portfolio volatility**: Non-negativity, diversification effects
- **Risk score bounds**: 0-100 range, monotonicity in risk factors

### 5. Integration Tests

#### API Routes (`src/routes/__tests__/portfolio.integration.test.ts`)
- **Express app testing**: Full request/response cycle
- **Mock service injection**: Controlled test environment
- **Validation testing**: Input validation, error handling
- **Functional patterns**: TaskEither chaining in routes
- **Error propagation**: Left path handling, graceful failures

### 6. Comprehensive Examples

#### End-to-End Testing (`src/__tests__/comprehensive.test.ts`)
- **Pipeline composition**: Risk analysis workflow
- **Error propagation**: Functional error handling
- **Performance testing**: Scaling properties
- **Mock integration**: Scenario-based testing
- **Property verification**: Cross-module invariants

## Key Features

### Functional Programming Patterns
1. **Pure Functions**: All calculations are deterministic and side-effect free
2. **Either/Option Types**: Explicit error handling without exceptions
3. **TaskEither**: Async operations with functional error handling
4. **Immutable Data**: All test data and state is immutable
5. **Function Composition**: Pipeline-based testing workflows

### Test Organization
1. **Modular Structure**: Separate utilities, mocks, and test suites
2. **Short Tests**: Each test function under 50 lines
3. **Fast Execution**: Optimized for rapid feedback
4. **Focused Coverage**: 95% for pure functions, lower for integration

### Property-Based Testing
1. **Mathematical Properties**: Invariants, bounds, scaling
2. **Domain Properties**: Business logic validation
3. **Edge Case Discovery**: Automated boundary testing
4. **Shrinking**: Minimal counterexample generation

## Usage Examples

### Testing Pure Functions
```typescript
import { calculateHealthFactor } from '@/risk/calculations';
import { generatePortfolioSnapshot, expectPositive } from '@/test-utils';

test('health factor should be positive', () => {
  const portfolio = generatePortfolioSnapshot();
  const healthFactor = calculateHealthFactor(portfolio);
  expectPositive(healthFactor);
});
```

### Testing Either Types
```typescript
import { mockBlockchainService, expectRight } from '@/test-utils';

test('should handle successful blockchain call', async () => {
  const result = await mockBlockchainService.getPortfolioSnapshot(validAddress)();
  expectRight(result);
});
```

### Property-Based Testing
```typescript
import { quickCheck, generateRiskMetrics } from '@/test-utils';

test('risk scores should be bounded', () => {
  const result = quickCheck(
    generateRiskMetrics,
    (metrics) => calculateRiskScore(metrics) <= 100,
    200
  );
  expect(result).toBe(true);
});
```

### TaskEither Pipelines
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

const riskAnalysis = pipe(
  mockBlockchainService.getPortfolioSnapshot(address),
  TE.map(calculateRiskMetrics),
  TE.map(calculateRiskScore)
);
```

## File Structure

```
backend/
├── jest.config.js                           # Optimized Jest configuration
├── src/
│   ├── __tests__/
│   │   ├── utils/
│   │   │   ├── setup.ts                     # fp-ts Jest matchers
│   │   │   ├── generators.ts                # Test data generators
│   │   │   ├── assertions.ts                # Domain assertions
│   │   │   ├── property-testing.ts          # Property test engine
│   │   │   └── index.ts                     # Unified exports
│   │   └── comprehensive.test.ts            # End-to-end examples
│   ├── __mocks__/
│   │   ├── blockchain.ts                    # Blockchain service mock
│   │   ├── cache.ts                         # Cache service mock
│   │   └── index.ts                         # Mock exports
│   ├── risk/
│   │   └── __tests__/
│   │       ├── calculations.test.ts         # Unit tests
│   │       ├── types.test.ts                # Type guard tests
│   │       └── calculations.property.test.ts # Property tests
│   └── routes/
│       └── __tests__/
│           └── portfolio.integration.test.ts # API tests
└── tests/
    ├── setup.ts                             # Global test setup
    ├── globalSetup.ts                       # Test environment
    └── globalTeardown.ts                    # Cleanup
```

## Coverage Goals

- **Pure Functions (Risk Module)**: 95% coverage
- **Service Layer**: 90% coverage  
- **Routes/Integration**: 85% coverage
- **Global Minimum**: 85% coverage

## Performance Targets

- **Unit Tests**: <2ms per test
- **Property Tests**: <100ms per property (100 iterations)
- **Integration Tests**: <500ms per test
- **Full Suite**: <30 seconds

## Best Practices

1. **Test Pure Functions First**: Highest ROI, easiest to maintain
2. **Use Property Testing**: For mathematical and business invariants
3. **Mock Side Effects**: Keep tests fast and deterministic
4. **Compose with fp-ts**: Leverage Either/TaskEither patterns
5. **Generate Test Data**: Don't hardcode values
6. **Validate Functional Properties**: Immutability, determinism
7. **Test Error Paths**: Both Left and Right cases
8. **Keep Tests Short**: <200 lines per file

This infrastructure provides a solid foundation for testing functional TypeScript code with mathematical rigor and comprehensive coverage.