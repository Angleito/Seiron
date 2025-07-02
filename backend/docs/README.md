# Documentation

Comprehensive documentation for the Sei AI Portfolio Manager backend, built with functional programming principles using fp-ts.

## 📁 Documentation Structure

```
docs/
├── README.md                           # This file - documentation overview
├── api/                               # API Reference
│   └── api-reference.md               # Complete API documentation with examples
├── architecture/                      # System Architecture
│   └── overview.md                    # Functional architecture overview
├── guides/                           # Developer Guides
│   ├── functional-programming.md     # fp-ts patterns and best practices
│   ├── quick-start.md               # Getting started guide
│   └── deployment.md                # Production deployment guide
├── modules/                          # Module Documentation
│   ├── portfolio-management.md      # Portfolio services and state management
│   └── risk-management.md           # Risk calculation and monitoring
└── examples/                         # Code Examples (for future expansion)
```

## 🚀 Quick Start

1. **New to the project?** Start with the [Quick Start Guide](./guides/quick-start.md)
2. **Want to understand the architecture?** Read the [Architecture Overview](./architecture/overview.md)
3. **Need API reference?** Check the [API Reference](./api/api-reference.md)
4. **Learning functional programming?** See the [Functional Programming Guide](./guides/functional-programming.md)

## 📚 Key Documentation

### Core Guides

- **[Functional Programming Guide](./guides/functional-programming.md)** - Deep dive into fp-ts patterns, error handling with TaskEither/Either, and functional composition used throughout the codebase.

- **[Quick Start Guide](./guides/quick-start.md)** - Get up and running quickly with setup, configuration, and basic usage examples.

- **[Deployment Guide](./guides/deployment.md)** - Production deployment with Docker, monitoring, security hardening, and operations.

### Architecture & Modules

- **[Architecture Overview](./architecture/overview.md)** - System design, functional layers, data flow, and performance considerations.

- **[Portfolio Management](./modules/portfolio-management.md)** - Portfolio services, state management, analytics, and real-time updates.

- **[Risk Management](./modules/risk-management.md)** - Risk calculations, monitoring, alerts, and rebalancing using functional programming.

### API Reference

- **[API Reference](./api/api-reference.md)** - Complete API documentation with request/response examples, WebSocket events, and functional error handling patterns.

## 🎯 Key Features Documented

### Functional Programming
- **TaskEither** for async operations and error handling
- **Either** for synchronous validation and transformations
- **Pipe** for function composition and data transformation
- **Immutable** data structures and state management
- **Pure functions** for core business logic

### DeFi Portfolio Management
- Multi-protocol position tracking (YeiFinance, DragonSwap)
- Real-time portfolio analytics and metrics
- Risk assessment and monitoring
- AI-powered analysis and recommendations
- WebSocket-based real-time updates

### Technical Architecture
- Express.js with TypeScript and fp-ts
- Redis caching for performance
- Socket.io for real-time communication
- Comprehensive error handling
- Production-ready deployment with Docker

## 🔧 Development Workflow

### Reading the Documentation

1. **Understand the functional approach**: Start with [Functional Programming Guide](./guides/functional-programming.md)
2. **Learn the architecture**: Review [Architecture Overview](./architecture/overview.md)
3. **Explore specific modules**: Check module-specific docs in `modules/`
4. **Reference the API**: Use [API Reference](./api/api-reference.md) for integration

### Contributing

When adding new features or modules:

1. **Update relevant module documentation** in `modules/`
2. **Add API endpoints** to the API reference
3. **Include functional programming examples** showing fp-ts usage
4. **Update architecture docs** if introducing new patterns
5. **Add deployment notes** if infrastructure changes

## 🎨 Documentation Style

### Code Examples

All code examples follow these patterns:

- **TypeScript** with full type annotations
- **fp-ts** patterns for error handling and composition
- **Functional style** with pure functions and immutability
- **Real-world scenarios** from the actual codebase

### Error Handling Examples

```typescript
// TaskEither for async operations
const getPortfolioData = (walletAddress: WalletAddress): AsyncResult<PortfolioData> =>
  pipe(
    portfolioService.getSnapshot(walletAddress),
    TE.map(transformToLegacyFormat),
    TE.mapError(handleServiceError)
  );

// Either for validation
const validateWalletAddress = (address: string): Either<ValidationError, WalletAddress> =>
  pipe(
    address,
    validateString,
    E.chain(validateEthereumFormat),
    E.mapLeft(createValidationError)
  );
```

### Data Flow Examples

```typescript
// Functional composition pipeline
const processPortfolioUpdate = (walletAddress: WalletAddress) =>
  pipe(
    fetchRawData(walletAddress),
    TE.chain(validateAndTransform),
    TE.chain(calculateMetrics),
    TE.chain(updateState),
    TE.chain(broadcastUpdate)
  );
```

## 🔍 Finding Information

### By Topic

- **Setup & Configuration**: [Quick Start](./guides/quick-start.md) → Environment Setup
- **Error Handling**: [Functional Programming](./guides/functional-programming.md) → Error Handling
- **API Usage**: [API Reference](./api/api-reference.md) → Specific endpoints
- **Architecture**: [Overview](./architecture/overview.md) → System design
- **Deployment**: [Deployment Guide](./guides/deployment.md) → Production setup

### By Use Case

- **"I want to understand the codebase"** → Start with [Architecture Overview](./architecture/overview.md)
- **"I need to integrate with the API"** → See [API Reference](./api/api-reference.md)
- **"I'm new to functional programming"** → Read [Functional Programming Guide](./guides/functional-programming.md)
- **"I need to deploy to production"** → Follow [Deployment Guide](./guides/deployment.md)
- **"I want to understand risk calculations"** → Check [Risk Management](./modules/risk-management.md)

## 🧪 Testing Documentation

Each module documentation includes:

- **Unit test examples** with fp-ts patterns
- **Property-based testing** for pure functions
- **Integration test scenarios** for complete workflows
- **Mocking strategies** for external dependencies

Example from Risk Management:

```typescript
// Property-based testing
fc.assert(fc.property(
  fc.float({ min: 0, max: 1000000 }),
  fc.float({ min: 0, max: 1000000 }),
  (supplied, borrowed) => {
    const healthFactor = calculateHealthFactor({ supplied, borrowed });
    return healthFactor >= 0; // Health factor is always non-negative
  }
));
```

## 📈 Performance Documentation

Performance considerations are covered in:

- **[Architecture Overview](./architecture/overview.md)** → Performance section
- **[Deployment Guide](./guides/deployment.md)** → Optimization section
- **Module docs** → Performance considerations for each component

Key performance patterns documented:

- **Lazy evaluation** with fp-ts
- **Caching strategies** with Redis
- **Parallel processing** with TaskEither
- **Memory optimization** techniques

## 🛡️ Security Documentation

Security aspects covered throughout:

- **Input validation** with Either types
- **Rate limiting** configurations
- **Authentication** patterns
- **Deployment security** in production guide

## 📝 Maintenance

### Keeping Documentation Updated

- Documentation is updated with each feature release
- Code examples are tested and validated
- Architecture diagrams reflect current system state
- API reference stays synchronized with actual endpoints

### Documentation Standards

- **Accuracy**: All examples work with current codebase
- **Completeness**: Major features and patterns documented
- **Clarity**: Examples progress from simple to complex
- **Functional Focus**: Emphasizes fp-ts patterns and functional design

---

This documentation provides a comprehensive guide to understanding, developing, and deploying the functional portfolio management backend. Each document is designed to be self-contained while linking to related concepts and implementations.