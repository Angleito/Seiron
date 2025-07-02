# Migration Guide: From Data Collection to AI Portfolio Manager

This guide helps you transition from using this repository as a data collection tool to using it as a full-featured AI Portfolio Manager.

## Overview of Changes

The repository has evolved from a data collection system to a comprehensive AI-powered portfolio management platform with:

1. **Chat Interface**: Natural language interaction for portfolio management
2. **DeFi Integration**: Direct integration with Yei Finance (lending) and DragonSwap (liquidity)
3. **AI Decision Engine**: Intelligent strategy generation and optimization
4. **Active Management**: Automated execution of lending and liquidity strategies

## Key Differences

### Old Focus: Data Collection
- Primary purpose: Collect Sei blockchain data
- Output: Training datasets for AI models
- Usage: Batch processing and data export

### New Focus: Portfolio Management
- Primary purpose: Manage DeFi portfolios through AI
- Output: Executed trades, optimized yields, portfolio insights
- Usage: Real-time interaction and automated management

## Migration Steps

### 1. Update Dependencies

```bash
npm install
```

### 2. Update Imports

**Old:**
```typescript
import { ChainDataCollector } from 'redteam-portfolio-ai';
```

**New:**
```typescript
import { AIPortfolioManager } from 'sei-portfolio-ai';
```

### 3. Initialize the New System

**Old (Data Collection):**
```typescript
const collector = new ChainDataCollector({
  rpcEndpoint: 'https://rpc.sei.io',
  startBlock: 1000000
});

await collector.collect();
```

**New (Portfolio Management):**
```typescript
const manager = new AIPortfolioManager({
  network: 'sei-mainnet',
  wallet: yourWallet,
  aiModel: 'balanced-defi',
  language: 'en'
});

const chat = await manager.startChat();
```

### 4. Adapt Your Workflows

#### Data Collection (Still Available)
The data collection functionality is preserved in the `src/training/` directory for model improvement:

```typescript
import { TrainingSystem } from './src/training';

const training = new TrainingSystem({
  dataSource: 'sei-mainnet',
  protocols: ['yei-finance', 'dragonswap']
});

await training.startDataCollection();
```

#### Portfolio Management (New Primary Use)
```typescript
// Natural language commands
await chat.send("Lend 1000 USDC at the best rate");
await chat.send("Show me top liquidity pools");
await chat.send("Optimize my portfolio for 15% APY");
```

## New Features to Explore

### 1. Chat Interface
- Natural language processing for all commands
- Context-aware conversations
- Multi-language support

### 2. Lending Management
- Automated yield optimization on Yei Finance
- Risk-adjusted position sizing
- Auto-compounding strategies

### 3. Liquidity Management
- Concentrated liquidity on DragonSwap
- Impermanent loss protection
- Dynamic range adjustments

### 4. AI Strategies
- Pre-trained models for different risk profiles
- Continuous learning from market data
- Personalized recommendations

## Configuration Changes

### Environment Variables

Add new environment variables:
```bash
# Old variables (keep for training)
OPENAI_API_KEY=your-key
SEI_RPC_ENDPOINT=https://rpc.sei.io

# New variables (add these)
WALLET_PRIVATE_KEY=your-wallet-key
YEI_FINANCE_ADDRESS=0x...
DRAGONSWAP_ROUTER=0x...
AI_MODEL=balanced-defi
```

### Configuration Files

The configuration structure has been updated to support portfolio management:

```typescript
// config/portfolio.json
{
  "lending": {
    "protocols": ["yei-finance"],
    "minHealthFactor": 1.5,
    "autoCompound": true
  },
  "liquidity": {
    "dexes": ["dragonswap"],
    "slippageTolerance": 0.01,
    "rangeWidth": 0.2
  },
  "ai": {
    "model": "balanced-defi",
    "riskTolerance": 0.5,
    "rebalanceThreshold": 0.05
  }
}
```

## Backward Compatibility

### Data Collection Scripts
Your existing data collection scripts will continue to work:

```bash
npm run collect:start  # Still works
npm run process:run    # Still works
npm run export:dataset # Still works
```

### Training Pipeline
The training pipeline remains functional for improving AI models:

```bash
npm run train -- --strategy my-strategy
```

## Breaking Changes

1. **Package Name**: Changed from `redteam-portfolio-ai` to `sei-portfolio-ai`
2. **Main Export**: Changed from data collectors to `AIPortfolioManager`
3. **Primary Interface**: Shifted from programmatic API to chat interface

## Support and Resources

- **Documentation**: See updated README.md
- **Examples**: Check `examples/chat-usage.ts`
- **API Reference**: Available in each module's README

## Troubleshooting

### Issue: Old scripts not working
**Solution**: The collector modules have moved to `src/training/`. Update your import paths.

### Issue: Wallet connection errors
**Solution**: Ensure you've configured your wallet correctly in the new system.

### Issue: AI responses seem generic
**Solution**: The AI models improve over time. Use the training system to enhance performance with your data.

## Next Steps

1. Try the chat interface with simple commands
2. Explore lending opportunities on Yei Finance
3. Test liquidity provision on DragonSwap
4. Monitor your portfolio performance
5. Provide feedback to improve the AI

Welcome to the next evolution of DeFi portfolio management on Sei Network!