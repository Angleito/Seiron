# Contributing to Sei AI Portfolio Data Collection

Thank you for your interest in contributing to the Sei AI Portfolio Data Collection project! This document provides guidelines and instructions for contributing.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Contribution Process](#contribution-process)
5. [Coding Standards](#coding-standards)
6. [Testing Requirements](#testing-requirements)
7. [Documentation](#documentation)
8. [Pull Request Process](#pull-request-process)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. All contributors are expected to:

- Be respectful and considerate
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- Git
- TypeScript knowledge
- Functional programming concepts (fp-ts)
- Basic understanding of blockchain technology

### Areas for Contribution

- **New Features**: Additional data collectors, transformers, or ML features
- **Bug Fixes**: Identifying and fixing issues
- **Performance**: Optimizing data processing pipelines
- **Documentation**: Improving guides and API docs
- **Tests**: Expanding test coverage
- **Examples**: Creating usage examples

## Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/sei-portfolio-data.git
   cd sei-portfolio-data
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Contribution Process

### 1. Check existing issues

Before starting work:
- Check if an issue already exists
- Comment on the issue to claim it
- Wait for maintainer approval for major changes

### 2. Design discussion

For significant features:
- Open an issue describing your proposal
- Include motivation and technical approach
- Get feedback before implementation

### 3. Implementation

Follow these guidelines:
- Write clean, functional code
- Add comprehensive tests
- Update documentation
- Follow existing patterns

## Coding Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Pure functions with explicit types
export const calculateReturns = (
  prices: readonly number[],
  method: 'simple' | 'log' = 'simple'
): readonly number[] =>
  prices.slice(1).map((price, i) =>
    method === 'simple'
      ? (price - prices[i]) / prices[i]
      : Math.log(price / prices[i])
  );

// ❌ Bad: Mutations and side effects
export function calculateReturns(prices, method) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    prices[i] = /* mutation */
    returns.push(/* ... */);
  }
  console.log(returns); // side effect
  return returns;
}
```

### Functional Programming Principles

1. **Immutability**
   ```typescript
   // Use readonly types
   interface Config {
     readonly rpcUrl: string;
     readonly timeout: number;
   }
   ```

2. **Pure Functions**
   ```typescript
   // All functions should be deterministic
   const normalize = (value: number, min: number, max: number): number =>
     (value - min) / (max - min);
   ```

3. **Composition**
   ```typescript
   // Use pipe/flow for composition
   const processData = pipe(
     validateInput,
     normalizeData,
     engineerFeatures,
     exportDataset
   );
   ```

4. **Error Handling**
   ```typescript
   // Use Either for errors
   const divide = (a: number, b: number): Either<Error, number> =>
     b === 0 ? left(new Error('Division by zero')) : right(a / b);
   ```

### File Structure

```
src/
├── collectors/      # Data collection modules
├── transformers/    # Data transformation
├── storage/         # Data persistence
├── training/        # ML training integration
├── types/           # TypeScript types
└── utils/          # Utility functions
```

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Functions**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Test files**: `*.test.ts`

## Testing Requirements

### Test Coverage

- Minimum 90% code coverage
- All new features must have tests
- Both unit and integration tests required

### Writing Tests

```typescript
describe('calculateReturns', () => {
  it('should calculate simple returns correctly', () => {
    const prices = [100, 110, 121];
    const returns = calculateReturns(prices, 'simple');
    
    expect(returns).toHaveLength(2);
    expect(returns[0]).toBeCloseTo(0.1, 10);
    expect(returns[1]).toBeCloseTo(0.1, 10);
  });

  it('should handle edge cases', () => {
    expect(calculateReturns([])).toEqual([]);
    expect(calculateReturns([100])).toEqual([]);
  });

  // Property-based testing
  it('should maintain array length relationship', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0.1, noNaN: true }), { minLength: 2 }),
        (prices) => {
          const returns = calculateReturns(prices);
          expect(returns).toHaveLength(prices.length - 1);
        }
      )
    );
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- chain.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Documentation

### Code Documentation

```typescript
/**
 * Calculates the Relative Strength Index (RSI) for a price series
 * 
 * @param prices - Array of price values
 * @param period - RSI period (default: 14)
 * @returns Array of RSI values (0-100), with NaN for initial periods
 * 
 * @example
 * const prices = [100, 102, 101, 103, 105];
 * const rsi = calculateRSI(prices, 14);
 * // Returns: [NaN, NaN, ..., 65.5]
 */
export const calculateRSI = (
  prices: readonly number[],
  period: number = 14
): readonly number[] => {
  // Implementation
};
```

### Documentation Updates

When contributing, update:
- API documentation for new functions
- README for new features
- FEATURES.md for new ML features
- DATA_SCHEMA.md for new data structures

## Pull Request Process

### 1. Before submitting

- [ ] All tests pass (`npm test`)
- [ ] Code follows style guide (`npm run lint`)
- [ ] Documentation is updated
- [ ] Commit messages are clear
- [ ] Branch is up to date with main

### 2. PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

### 3. Review Process

1. Submit PR with clear title and description
2. Address reviewer feedback
3. Ensure CI/CD passes
4. Squash commits if requested
5. Celebrate when merged! 🎉

## Development Tips

### Local Testing

```bash
# Test data collection
npm run collect:interactive

# Test data processing
npm run process:run -- --input test-data

# Test specific module
tsx src/collectors/chain.ts
```

### Debugging

```typescript
// Use debug logging
import debug from 'debug';
const log = debug('sei:collector:chain');

log('Processing block %d', blockNumber);
```

### Performance

- Use streaming for large datasets
- Implement proper backpressure
- Batch operations when possible
- Profile before optimizing

## Getting Help

- **Discord**: Join our community server
- **Issues**: Open a GitHub issue
- **Discussions**: Use GitHub Discussions
- **Email**: dev@sei-portfolio.ai

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in documentation

Thank you for contributing to Sei AI Portfolio Data Collection!