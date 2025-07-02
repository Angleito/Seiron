# AI Portfolio Manager for Sei Network

A conversational AI-powered portfolio management system for Sei Network that integrates lending protocols and liquidity management through natural language interactions. Users can manage their DeFi positions, optimize yields, and execute complex strategies through simple chat commands.

## 🤖 Overview

This is an AI-driven portfolio management system that combines:
- **Natural Language Interface**: Manage your portfolio through conversational AI
- **Lending Protocol Integration**: Automated yield optimization on Yei Finance
- **Liquidity Management**: Strategic liquidity provision on DragonSwap
- **Smart Portfolio Allocation**: AI-optimized asset distribution
- **Risk Management**: Real-time monitoring and automated safety measures

The system uses advanced AI models trained on Sei Network data to provide intelligent recommendations and execute strategies autonomously.

## 🎯 Core Features

### 1. Chat-Based Portfolio Management
- **Natural Language Commands**: "Lend 1000 USDC at the best rate" or "Add liquidity to SEI/USDC pool"
- **Context-Aware Responses**: AI understands your portfolio history and preferences
- **Multi-Language Support**: English, Spanish, Chinese, and more
- **Voice Integration**: Optional voice commands and responses

### 2. Lending Protocol Integration (Yei Finance)
- **Automated Yield Farming**: AI finds and executes optimal lending strategies
- **Risk-Adjusted Returns**: Balances yield with protocol safety
- **Auto-Compounding**: Reinvests earnings automatically
- **Collateral Management**: Maintains healthy collateral ratios

### 3. Liquidity Management (DragonSwap)
- **Optimal Pool Selection**: AI identifies the most profitable liquidity pools
- **Impermanent Loss Protection**: Strategies to minimize IL risk
- **Dynamic Range Management**: Adjusts liquidity ranges for concentrated positions
- **Fee Optimization**: Maximizes trading fee collection

### 4. AI Decision Engine
- **Portfolio Optimizer**: Determines optimal asset allocation
- **Yield Predictor**: Forecasts lending rates and LP returns
- **Risk Analyzer**: Evaluates protocol and market risks
- **Strategy Generator**: Creates custom DeFi strategies based on goals

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- Sei wallet with funds
- OpenAI API key (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/Angleito/redteam.git
cd redteam

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Deploy smart contracts
npm run deploy
```

### Basic Usage

```typescript
import { AIPortfolioManager } from 'sei-portfolio-ai';

// Initialize the AI Portfolio Manager with chat interface
const manager = new AIPortfolioManager({
  network: 'sei-mainnet',
  wallet: yourWallet,
  aiModel: 'balanced-defi',
  language: 'en'
});

// Start the chat interface
const chat = await manager.startChat();

// Example interactions
await chat.send("Show me the best lending rates for USDC");
// AI: "Current USDC lending rates on Yei Finance:
//      - Supply APY: 8.5%
//      - Borrow APY: 12.3%
//      Would you like me to lend your USDC?"

await chat.send("Lend 5000 USDC and show me optimal LP opportunities");
// AI: "✓ Lending 5000 USDC at 8.5% APY on Yei Finance...
//      Transaction confirmed!
//      
//      Top liquidity pools on DragonSwap:
//      1. SEI/USDC: 24.5% APR (fees + rewards)
//      2. ETH/USDC: 18.2% APR
//      3. ATOM/SEI: 31.7% APR (higher risk)"

await chat.send("Add $2000 to SEI/USDC pool with balanced range");
// AI: "✓ Adding liquidity to SEI/USDC pool...
//      - Range: $0.45 - $0.65 (current price: $0.55)
//      - Expected fees: ~$12/day
//      - IL risk: Moderate
//      Transaction confirmed!"

// Monitor via chat
await chat.send("How's my portfolio doing?");
// AI: "Portfolio Performance (24h):
//      - Total Value: $12,485 (+2.3%)
//      - Lending: $5,000 earning $1.16/day
//      - LP Positions: $2,000 earning $12/day
//      - Available: $5,485
//      
//      Suggestions:
//      - Consider lending more USDC (high demand)
//      - SEI/ATOM pool showing good opportunities"
```

## 📊 Architecture

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Chat Interface    │────▶│   AI Decision    │────▶│  Smart Contracts│
│   (NLP Engine)      │     │     Engine       │     │  (DeFi Manager) │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
         ▲                           ▲                         │
         │                           │                         ▼
    ┌────┴────┐                 ┌────┴────┐         ┌─────────────────┐
    │  User   │                 │Protocol │         │   Sei Network   │
    │  Input  │                 │Analytics│         │ • Yei Finance   │
    └─────────┘                 └─────────┘         │ • DragonSwap    │
                                                    └─────────────────┘
```

## 🤝 Smart Contracts

### DeFiPortfolioManager.sol
The main contract that manages lending positions and liquidity across protocols.

```solidity
contract DeFiPortfolioManager {
    function lendAsset(
        address asset,
        uint256 amount,
        address lendingProtocol
    ) external onlyAIAgent;
    
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 minTick,
        uint256 maxTick
    ) external onlyAIAgent;
    
    function rebalancePosition(
        bytes32 positionId,
        bytes calldata rebalanceData
    ) external onlyAIAgent;
}
```

### ChatController.sol
Handles natural language processing and command execution.

```solidity
contract ChatController {
    function executeCommand(
        string calldata userInput,
        bytes calldata aiInterpretation,
        bytes signature
    ) external returns (bytes memory result);
}
```

## 🧠 AI Models

### Pre-trained Models

1. **Stable Yield Hunter**
   - Focus on stablecoin lending
   - Low-risk liquidity provision
   - 8-15% APY target

2. **Balanced DeFi**
   - Mix of lending and LP positions
   - Moderate risk across protocols
   - 15-25% APY target

3. **Yield Maximizer**
   - Aggressive yield farming
   - High-APY pool hunting
   - 25%+ APY target

4. **Smart Liquidity**
   - Concentrated liquidity strategies
   - Active range management
   - Fee optimization focus

### Custom Training

Use the data collection module to train your own models:

```bash
# Collect training data
npm run collect:start

# Train custom model
npm run train -- --strategy my-strategy --data datasets/processed

# Deploy model
npm run deploy:model -- --name my-model
```

## 📈 Performance Monitoring

### Chat Interface
Access the chat interface to manage your portfolio:

```bash
npm run chat
# Opens chat interface at http://localhost:3000
```

### CLI Commands
```bash
# Check all positions
npm run positions:status

# View lending performance
npm run lending:stats

# Monitor liquidity positions
npm run liquidity:monitor

# Export DeFi reports
npm run export:defi-report -- --format pdf
```

## 🔒 Security

- **Non-Custodial**: You control your funds
- **Audited Contracts**: Security reviewed by [Auditor]
- **Risk Limits**: Configurable max positions and drawdowns
- **Emergency Shutdown**: Manual override always available

## 🛠 Advanced Configuration

### DeFi Risk Parameters
```typescript
{
  maxProtocolExposure: 0.4,    // Max 40% in single protocol
  minHealthFactor: 1.5,        // Maintain safe collateral ratio
  maxILTolerance: 0.05,        // Max 5% impermanent loss
  gasOptimization: true,       // Batch transactions
  autoCompound: '12h'          // Compound rewards twice daily
}
```

### Chat AI Parameters
```typescript
{
  responseStyle: 'concise',     // Clear, actionable responses
  riskWarnings: true,          // Always show risk alerts
  priceImpactAlert: 0.01,      // Alert on 1%+ price impact
  multiLanguage: true,         // Auto-detect language
  voiceEnabled: false          // Text-only by default
}
```

## 📚 Components

- **Chat Interface**: Natural language processing and user interaction
- **AI Decision Engine**: Strategy generation and optimization
- **Lending Manager**: Yei Finance integration and yield optimization
- **Liquidity Manager**: DragonSwap LP management and rebalancing
- **Risk Monitor**: Real-time position monitoring and alerts
- **Data Collector**: Protocol data for model training
- **Portfolio Tracker**: Comprehensive position and performance tracking

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## ⚠️ Disclaimer

This software is for educational purposes. Cryptocurrency trading carries significant risk. Past performance does not guarantee future results. Always do your own research and never invest more than you can afford to lose.