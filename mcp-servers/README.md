# Seiron MCP Servers

Production-ready Model Context Protocol (MCP) servers for the Seiron platform. These servers provide real-time access to:

- **Hive Intelligence**: Market data, sentiment analysis, and price predictions
- **SEI Blockchain**: Blockchain operations, DeFi positions, and token management
- **Portfolio Manager**: Portfolio analytics, risk assessment, and optimization

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- API keys for external services

### 1. Configure Environment

Copy the `.env.example` file and configure your API keys:

```bash
cp ../backend/.env.example ../.env
```

Required environment variables:
- `HIVE_INTELLIGENCE_API_KEY` - Hive Intelligence API access
- `SEI_RPC_URL` - SEI blockchain RPC endpoint
- `SEI_WALLET_MNEMONIC` - (Optional) For write operations
- `PORTFOLIO_API_KEY` - Portfolio service authentication
- `COINGECKO_API_KEY` - Price data access

### 2. Start the Servers

```bash
# From the project root
./start-mcp-servers.sh
```

This will:
- Build Docker images for each MCP server
- Start all services with health checks
- Create an nginx gateway for unified access
- Set up Redis for caching

### 3. Verify Installation

Check that all services are running:

```bash
docker-compose -f docker-compose.mcp.yml ps
```

Test an MCP endpoint:

```bash
# Test Hive Intelligence
curl http://localhost:8760/health

# View logs
docker-compose -f docker-compose.mcp.yml logs -f hive-intelligence-mcp
```

## 📡 Available Endpoints

### Direct Access
- **Hive Intelligence**: `http://localhost:8765` (WebSocket: `ws://localhost:8765`)
- **SEI Blockchain**: `http://localhost:8766` (WebSocket: `ws://localhost:8766`)
- **Portfolio Manager**: `http://localhost:8767` (WebSocket: `ws://localhost:8767`)

### Gateway Access (Recommended)
- **Base URL**: `http://localhost:8760`
- **Hive**: `http://localhost:8760/mcp/hive/`
- **SEI**: `http://localhost:8760/mcp/sei/`
- **Portfolio**: `http://localhost:8760/mcp/portfolio/`

## 🛠️ MCP Tools Available

### Hive Intelligence
- `getMarketData` - Real-time market data for tokens
- `getSentimentAnalysis` - Multi-source sentiment analysis
- `getPricePredictions` - AI-powered price forecasts
- `getTradingSignals` - Trading recommendations
- `getNewsAggregation` - Crypto news with sentiment
- `getOnChainMetrics` - Blockchain analytics
- `getPortfolioAnalysis` - Portfolio recommendations

### SEI Blockchain
- `getWalletBalance` - Query wallet balances
- `getTransactionHistory` - Transaction history
- `getDeFiPositions` - DeFi position tracking
- `swapTokens` - Execute token swaps
- `transferTokens` - Transfer tokens
- `getLiquidityPools` - Pool information
- `getStakingInfo` - Staking details
- `getValidatorInfo` - Validator queries
- `getProposals` - Governance proposals
- `getTokenInfo` - Token metadata

### Portfolio Manager
- `analyzePortfolioComposition` - Composition analysis
- `getHistoricalPerformance` - Performance tracking
- `calculateRiskMetrics` - Risk assessment
- `assessLiquidityRisk` - Liquidity analysis
- `generateRebalancingSuggestions` - Rebalancing advice
- `optimizeTaxStrategy` - Tax optimization
- `trackPerformanceMetrics` - Real-time metrics
- `generatePerformanceReport` - Comprehensive reports

## 🔧 Development

### Local Development

```bash
cd mcp-servers
npm install

# Run individual servers
npm run dev:hive
npm run dev:sei
npm run dev:portfolio
```

### Building Images

```bash
docker-compose -f docker-compose.mcp.yml build
```

### Debugging

View logs:
```bash
docker-compose -f docker-compose.mcp.yml logs -f [service-name]
```

Access container:
```bash
docker exec -it hive-intelligence-mcp /bin/sh
```

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend App  │     │   Backend API   │     │  External Apps  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                         │
         └───────────────────────┴─────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │    MCP Gateway (nginx)  │
                    │    http://localhost:8760 │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────┴────────┐     ┌────────┴────────┐     ┌────────┴────────┐
│ Hive Intel MCP │     │  SEI Chain MCP  │     │ Portfolio MCP   │
│    Port 8765   │     │    Port 8766    │     │    Port 8767   │
└────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                    ┌────┴────┐
                                                    │  Redis  │
                                                    └─────────┘
```

## 🔒 Security

- All MCP servers run in isolated containers
- API keys are never exposed in logs
- Redis caching reduces external API calls
- Rate limiting is implemented
- CORS is configured for local development

## 🚨 Troubleshooting

### Services won't start
- Check Docker is running
- Verify ports 8760-8767 are available
- Review logs: `docker-compose -f docker-compose.mcp.yml logs`

### Connection refused
- Ensure services are healthy: `docker-compose -f docker-compose.mcp.yml ps`
- Check firewall settings
- Verify environment variables are set

### API errors
- Confirm API keys are valid
- Check external service status
- Review server logs for detailed errors

## 📝 Production Deployment

For production deployment:

1. Use proper SSL certificates
2. Configure production API endpoints
3. Set up monitoring and alerts
4. Implement proper secret management
5. Scale services as needed

## 🛑 Stopping Services

```bash
# Stop all services
./stop-mcp-servers.sh

# Remove volumes and clean up
docker-compose -f docker-compose.mcp.yml down -v
```