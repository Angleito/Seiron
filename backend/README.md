# Sei AI Portfolio Manager - Backend API

A TypeScript/Node.js backend API for managing cryptocurrency portfolios on the Sei Network with AI-powered analysis and recommendations.

## Features

- ✅ Express.js REST API with TypeScript
- ✅ Socket.io for real-time updates
- ✅ Wallet address validation middleware
- ✅ AI-powered portfolio analysis (OpenAI integration)
- ✅ Redis caching for performance
- ✅ Rate limiting and security middleware
- ✅ Comprehensive error handling
- ✅ Winston logging
- ✅ Functional programming with fp-ts

## Project Structure

```
src/
├── middleware/           # Custom middleware
│   ├── errorHandler.ts   # Error handling middleware
│   └── validateWallet.ts # Wallet validation middleware
├── routes/              # API route definitions
│   ├── ai.ts           # AI-related endpoints
│   ├── chat.ts         # Chat/conversation endpoints
│   └── portfolio.ts    # Portfolio management endpoints
├── services/           # Business logic services
│   ├── AIService.ts    # AI integration service
│   ├── PortfolioService.ts # Portfolio data service
│   └── SocketService.ts    # WebSocket service
├── types/              # TypeScript type definitions
│   └── express.d.ts    # Express request extensions
├── utils/              # Utility functions
│   ├── cache.ts        # Redis caching service
│   ├── constants.ts    # Application constants
│   ├── logger.ts       # Winston logger configuration
│   ├── validators.ts   # Input validation helpers
│   └── index.ts        # Utility exports
└── server.ts           # Main application entry point
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Redis server (optional, for caching)
- OpenAI API key

### Quick Start

1. **Clone and install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the development server:**
   ```bash
   # Using the startup script
   ./start.sh
   
   # Or manually
   npm run dev
   ```

### Environment Configuration

Key environment variables to configure in `.env`:

```env
# Server
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# OpenAI
OPENAI_API_KEY=your-openai-api-key-here

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Blockchain
SEI_RPC_URL=https://rpc.sei-apis.com
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Portfolio Management
- `GET /api/portfolio/:walletAddress` - Get portfolio data
- `POST /api/portfolio/analyze` - Analyze portfolio
- `POST /api/portfolio/rebalance` - Get rebalancing suggestions

### AI Services
- `POST /api/ai/analyze` - Generate AI portfolio analysis
- `POST /api/ai/suggest` - Get optimization suggestions
- `POST /api/ai/explain` - Explain DeFi concepts
- `POST /api/ai/risk-assessment` - Assess strategy risks
- `GET /api/ai/market-insights` - Get market insights

### Chat System
- `POST /api/chat/message` - Send chat message
- `GET /api/chat/history` - Get conversation history
- `DELETE /api/chat/history` - Clear conversation history
- `POST /api/chat/analysis` - Generate portfolio analysis

## WebSocket Events

The server supports real-time communication via Socket.io:

### Client Events
- `join_portfolio` - Join portfolio updates room
- `chat_message` - Send chat message
- `disconnect` - Leave all rooms

### Server Events
- `portfolio_update` - Portfolio data updates
- `chat_response` - AI chat responses
- `transaction_update` - Transaction status updates
- `system_message` - System notifications

## Development

### Building
```bash
npm run build
```

### Linting
```bash
npm run lint
```

### Testing
```bash
npm test
```

## Middleware

### Wallet Validation
The `validateWallet` middleware supports:
- Ethereum addresses (0x...)
- Sei addresses (sei1...)
- Cosmos-based addresses
- Multiple validation sources (headers, query, body)

### Error Handling
Comprehensive error handling with:
- Structured error logging
- Environment-specific error details
- HTTP status code mapping
- Stack trace in development

### Rate Limiting
- Default: 100 requests per 15 minutes
- AI endpoints: 50 requests per hour
- Premium users: Higher limits

## Services

### AIService
- OpenAI GPT integration
- Conversation history management
- Portfolio analysis generation
- Trading recommendations

### PortfolioService
- Multi-chain portfolio aggregation
- DeFi position tracking
- Real-time price updates
- Yield calculation

### SocketService
- Real-time user connections
- Portfolio update broadcasting
- Chat message handling
- Error notifications

## Utilities

### Cache Service
Redis-based caching with:
- Configurable TTL
- Functional programming interface
- Error handling
- Cache statistics

### Logging
Winston-based logging with:
- File and console outputs
- Environment-specific levels
- Structured JSON format
- Request/response logging

### Validators
Express-validator integration for:
- Wallet address validation
- Input sanitization
- Custom validation rules
- Error formatting

## Security Features

- Helmet.js security headers
- CORS configuration
- Rate limiting
- Input validation
- Environment variable protection

## Known Limitations

1. **Service Dependencies**: Some services reference external modules that need implementation
2. **TypeScript Compilation**: Complex fp-ts types may require compilation adjustments
3. **Database**: No persistent database configured (uses in-memory/cache)
4. **Testing**: Test suite needs implementation

## Next Steps

1. Implement external service integrations
2. Add comprehensive test coverage
3. Set up database persistence
4. Implement authentication/authorization
5. Add monitoring and metrics
6. Deploy to production environment

## Contributing

1. Follow TypeScript best practices
2. Use functional programming patterns (fp-ts)
3. Add comprehensive error handling
4. Include input validation
5. Write tests for new features
6. Update documentation

## License

MIT License - See LICENSE file for details