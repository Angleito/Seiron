# NLP System Test Suite

Comprehensive test suite for the Natural Language Processing system supporting DeFi operations.

## Overview

This test suite provides comprehensive coverage for all components of the NLP system, including:

- **Intent Classification** - Tests for recognizing user intents from natural language
- **Entity Extraction** - Tests for extracting financial parameters from text
- **Command Parsing** - Tests for converting intents to executable commands
- **Risk Assessment** - Tests for evaluating operation safety
- **Conversation Management** - Tests for multi-turn conversations
- **Domain Knowledge** - Tests for DeFi-specific processing
- **Integration** - End-to-end tests for complete user journeys

## Test Structure

```
__tests__/
├── setup.ts                    # Test utilities and configuration
├── NLPEngine.test.ts           # Main engine tests
├── IntentClassifier.test.ts    # Intent classification tests
├── EntityExtractor.test.ts     # Entity extraction tests
├── CommandParser.test.ts       # Command parsing tests
├── integration.test.ts         # End-to-end integration tests
├── jest.config.js             # Jest configuration
├── package.json               # Test dependencies
└── README.md                  # This file
```

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install
```

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with verbose output
npm run test:verbose

# Run tests in CI mode
npm run test:ci
```

### Debug Tests

```bash
# Run tests with debugger
npm run test:debug

# Run specific test file
npm test -- NLPEngine.test.ts

# Run specific test pattern
npm test -- --testNamePattern="lending"

# Run tests with specific timeout
npm test -- --testTimeout=60000
```

## Test Categories

### Unit Tests

#### Intent Classification Tests (`IntentClassifier.test.ts`)
- Basic intent recognition for all DeFi operations
- Pattern-based classification
- Keyword-based classification
- Context-aware classification
- Confidence scoring
- Multi-strategy classification
- Edge cases and error handling

#### Entity Extraction Tests (`EntityExtractor.test.ts`)
- Amount extraction (numeric, percentage, relative)
- Token/asset extraction
- Protocol extraction
- Leverage extraction
- Slippage extraction
- Duration extraction
- Risk level extraction
- Complex multi-entity extraction

#### Command Parsing Tests (`CommandParser.test.ts`)
- Basic command generation for all operations
- Parameter validation
- Risk assessment integration
- Gas estimation
- Confirmation requirements
- Error handling and validation

#### Main Engine Tests (`NLPEngine.test.ts`)
- Complete processing pipeline
- Intent classification integration
- Entity extraction integration
- Command generation
- Risk assessment
- Conversation flow management
- Context awareness
- Performance testing

### Integration Tests (`integration.test.ts`)

#### Complete User Journeys
- Lending journey with yield optimization
- Swap journey with disambiguation
- Portfolio analysis and optimization
- Multi-step liquidity provision

#### Context Preservation
- Multi-turn conversation handling
- User preference persistence
- Learning from conversation patterns

#### Multi-Agent Coordination
- Lending + risk assessment coordination
- Swap + market analysis coordination
- Yield optimization + strategy matching

#### Error Recovery
- Graceful handling of parsing errors
- Network timeout recovery
- Unknown operation fallbacks

#### Performance Under Load
- Concurrent user session handling
- Large conversation history management
- Rapid successive input processing

#### Real-world Scenarios
- Day trading scenarios
- Liquidity provider workflows
- Risk-averse investor interactions
- Advanced trader operations

## Test Data and Utilities

### Test Setup (`setup.ts`)

The setup file provides comprehensive utilities for testing:

```typescript
// Create test engine
const engine = createTestEngine();

// Create mock session
const session = createMockSession();

// Test assertions
TestAssertions.expectSuccess(result);
TestAssertions.expectIntent(result, DefiIntent.LEND);
TestAssertions.expectEntities(result, ['amount', 'token']);

// Performance testing
const benchmark = await PerformanceUtils.benchmark(fn, 100);

// Error testing
await ErrorUtils.expectErrorHandling(fn, 'ValidationError');
```

### Test Data

Comprehensive test data for various scenarios:

```typescript
// Sample inputs for different intents
TestData.lendingInputs
TestData.borrowingInputs
TestData.swapInputs
TestData.liquidityInputs
TestData.portfolioInputs
TestData.riskInputs
TestData.yieldInputs
TestData.unknownInputs

// Mock data generators
MockData.randomAmount()
MockData.randomAsset()
MockData.randomProtocol()
MockData.randomUserInput(intent)
```

## Coverage Requirements

The test suite maintains high coverage standards:

- **Branches**: 80% minimum
- **Functions**: 80% minimum
- **Lines**: 80% minimum
- **Statements**: 80% minimum

### Coverage Reports

Coverage reports are generated in multiple formats:

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# View coverage summary
cat coverage/coverage-summary.json
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

- TypeScript support with ts-jest
- ES modules support
- Coverage collection and thresholds
- Custom matchers and setup
- Performance optimization

### Environment Variables

```bash
# Test environment
NODE_ENV=test

# Test timeout (milliseconds)
JEST_TIMEOUT=30000

# Coverage threshold
COVERAGE_THRESHOLD=80

# Verbose output
VERBOSE=true
```

## Performance Testing

### Benchmarks

The test suite includes performance benchmarks:

```typescript
// Response time benchmarks
expect(duration).toBeLessThan(1000); // Under 1 second

// Concurrent operation benchmarks
const results = await Promise.all(operations);

// Load testing
await PerformanceUtils.benchmark(operation, 100);
```

### Performance Targets

- **Intent Classification**: < 200ms average
- **Entity Extraction**: < 100ms average
- **Command Parsing**: < 100ms average
- **Complete Processing**: < 1000ms average
- **Concurrent Sessions**: 100+ simultaneous users

## Continuous Integration

### CI Pipeline Integration

```yaml
# Example GitHub Actions workflow
name: NLP Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
```

### Test Reports

- **JUnit XML**: For CI integration
- **LCOV**: For coverage reporting
- **HTML**: For detailed coverage visualization
- **Sonar**: For code quality analysis

## Debugging Tests

### Common Issues

1. **Timeout Errors**
   ```bash
   # Increase timeout
   npm test -- --testTimeout=60000
   ```

2. **Memory Issues**
   ```bash
   # Increase memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm test
   ```

3. **ES Module Issues**
   ```bash
   # Check module configuration
   "type": "module" in package.json
   ```

### Debug Techniques

```typescript
// Enable debug logging
process.env.DEBUG = 'nlp:*';

// Add breakpoints
debugger;

// Console output
console.log('Debug info:', result);

// Performance timing
console.time('operation');
await operation();
console.timeEnd('operation');
```

## Contributing

### Adding New Tests

1. **Follow naming conventions**:
   - Test files: `*.test.ts`
   - Describe blocks: Component/feature names
   - Test names: Clear, descriptive actions

2. **Use test utilities**:
   - Import from `./setup.ts`
   - Use provided assertions
   - Follow existing patterns

3. **Maintain coverage**:
   - Test happy paths
   - Test error conditions
   - Test edge cases
   - Test performance

### Test Quality Guidelines

- **Isolation**: Tests should not depend on each other
- **Determinism**: Tests should produce consistent results
- **Clarity**: Tests should clearly document expected behavior
- **Efficiency**: Tests should run quickly and use resources efficiently

## Troubleshooting

### Common Problems

1. **Import Errors**
   - Check file extensions (.js in imports)
   - Verify module paths
   - Check tsconfig.json configuration

2. **Async Issues**
   - Use proper async/await patterns
   - Handle promise rejections
   - Set appropriate timeouts

3. **Mock Problems**
   - Reset mocks between tests
   - Use proper mock configurations
   - Clear mock data

### Support

For issues with the test suite:

1. Check existing test patterns
2. Review setup utilities
3. Consult Jest documentation
4. Open an issue with reproduction steps

## Future Enhancements

### Planned Improvements

- **Visual Regression Testing**: Screenshot comparison for UI components
- **Property-Based Testing**: Generate random test cases
- **Mutation Testing**: Verify test quality
- **A/B Testing**: Compare different NLP strategies
- **Load Testing**: Stress test with realistic loads
- **Security Testing**: Validate input sanitization

### Test Data Evolution

- **Synthetic Data Generation**: AI-generated test cases
- **Real User Data**: Anonymized production inputs
- **Multilingual Support**: Tests for different languages
- **Domain Expansion**: Tests for new DeFi protocols