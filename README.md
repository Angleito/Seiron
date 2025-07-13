<div align="center">
  <img src="seiron.png" alt="Seiron - The Wish-Granting Dragon" width="400" height="400" />
  
  # Seiron - Granting your wildest Sei Investing Wishes 🐉
  
  <p><em>A mystical AI-powered DeFi portfolio management platform for the Sei Network ecosystem, where the legendary dragon Seiron grants your wildest investment wishes through natural language interactions. Summon the power of advanced AI agents to execute extraordinary trading strategies, optimize yields, and dominate the Sei DeFi realm.</em></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](https://opensource.org/licenses/MIT)
  [![TypeScript](https://img.shields.io/badge/TypeScript-DC2626?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Next.js](https://img.shields.io/badge/Next.js-DC2626?logo=next.js&logoColor=white)](https://nextjs.org/)
  [![Sei Network](https://img.shields.io/badge/Sei_Network-F59E0B?logo=bitcoin&logoColor=white)](https://sei.io/)
  [![Dragon Power](https://img.shields.io/badge/Power_Level-Over_9000!-red?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjRkZENzAwIi8+Cjwvc3ZnPgo=)](https://dragonball.fandom.com/wiki/Power_Level)
  
  <br/>
  
  **🔥 Multi-Agent AI** • **⚡ Natural Language Commands** • **🛡️ Non-Custodial** • **🎯 Sei Native**
</div>

## 🐉 Overview

Seiron is a revolutionary AI-driven investment platform that combines the mystical power of dragons with cutting-edge DeFi technology:

- **🗣️ Natural Language Magic**: Command Seiron through conversational AI - speak your wildest investment dreams
- **🔥 Multi-Agent Orchestration**: Specialized dragon agents for lending, liquidity, market analysis, and portfolio management  
- **⚡ Sei Network Integration**: Native support for Yei Finance, DragonSwap, Symphony, Takara, and other Sei protocols
- **🎯 Mystical Portfolio Optimization**: AI-powered strategies with power levels beyond imagination
- **🛡️ Dragon's Protection**: Non-custodial security with real-time risk management

Transform your investment approach with the eternal wisdom of Seiron, the wish-granting dragon of DeFi.

## ✨ Mystical Features

### 🌟 Dragon Ball Chat Interface
- **Wish Interpretation**: Voice your wildest investment dreams in plain language
- **Power Level Indicators**: Real-time confidence scores and execution power levels  
- **Multi-Agent Responses**: Different dragon agents specialized for various DeFi strategies
- **Mystical Theming**: Complete Dragon Ball Z-inspired UI with floating dragon and orbiting dragon balls

### 🐲 Specialized Dragon Agents

#### 💰 Lending Dragon (Yei Finance)
- **Automated Yield Hunting**: Finds and executes optimal lending strategies
- **Mystical Rate Optimization**: AI-powered interest rate predictions
- **Collateral Management**: Maintains healthy lending positions
- **Auto-Compounding Magic**: Reinvests earnings with dragon precision

#### 💧 Liquidity Dragon (DragonSwap)
- **Optimal Pool Selection**: Identifies the most profitable liquidity opportunities
- **Impermanent Loss Shield**: Advanced strategies to minimize IL risk
- **Dynamic Range Magic**: Adjusts concentrated liquidity positions automatically
- **Fee Harvesting**: Maximizes trading fee collection across pools

#### 📊 Portfolio Dragon
- **Mystical Asset Allocation**: AI-optimized portfolio distribution
- **Real-time Balance Monitoring**: Track your treasure vault with dragon sight
- **Performance Analytics**: Comprehensive insights into your investment power level
- **Cross-Protocol Integration**: Seamless management across the entire Sei ecosystem

#### 🔮 Market Analysis Dragon
- **Predictive Market Vision**: Advanced market analysis and trend prediction
- **Risk Assessment**: Evaluates protocol and market risks with ancient wisdom
- **Strategy Generation**: Creates custom DeFi strategies based on your goals
- **Opportunity Detection**: Identifies emerging investment opportunities

## 🚀 Summoning Seiron (Quick Start)

### Prerequisites
- Node.js >= 18.0.0
- Sei wallet (Keplr/Leap) with SEI tokens
- OpenAI API key for AI dragon powers

### Installation Ritual

```bash
# Clone the dragon's realm
git clone https://github.com/Angleito/Seiron.git
cd Seiron

# Install mystical dependencies
npm install

# Configure your dragon powers
cp .env.example .env
# Edit .env with your API keys and settings

# Deploy the dragon contracts
npm run deploy

# Start the frontend dragon interface
cd frontend
npm run dev
```

### Environment Configuration

Create your `.env` files with the following mystical configurations:

#### Frontend Environment Variables
```bash
# Privy Configuration (Required)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
NEXT_PUBLIC_PRIVY_CLIENT_ID=your_privy_client_id_here

# Voice Interface (Optional but recommended)
NEXT_PUBLIC_ELEVENLABS_API_KEY=your-elevenlabs-api-key
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=your-voice-id
NEXT_PUBLIC_VOICE_ENABLED=true

# Sei Network
NEXT_PUBLIC_SEI_RPC_URL=https://evm-rpc.sei-apis.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# Supabase Configuration (Required for persistence)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

#### Backend Environment Variables
```bash
# OpenAI Configuration (Required)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Server Configuration
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Additional configurations in backend/.env.example
```

#### 🤖 AI Integration Setup

Seiron's AI features require proper API key configuration and deployment setup. For detailed instructions on:
- Setting up OpenAI and Anthropic API keys
- Deploying to Vercel with proper environment variables
- Configuring Supabase for data persistence
- Security best practices for API keys

See the **[AI Integration Setup Guide](docs/AI_INTEGRATION_SETUP.md)** 📚

### Dragon Summoning Examples

```typescript
// Initialize the Dragon Chat Interface
import { ChatInterface } from '@/components/chat/chat-interface';

// Example mystical commands:
"Show me the best yield opportunities in the Sei realm"
"Summon 1000 USDC lending at maximum power"  
"Add liquidity to the SEI/USDC dragon pool"
"Manifest a balanced portfolio with 50% lending and 50% LP positions"
"Grant me insights on my treasure vault performance"
"Execute the optimal rebalancing ritual"
```

### Chat Interface Powers

```bash
# Wish Interpretation Examples:
💬 "I want to earn passive income with low risk"
🐉 "Seiron suggests lending USDC on Yei Finance at 8.5% APY with minimal risk..."

💬 "Show me high-yield opportunities" 
🐉 "Mystical vision reveals these power-level opportunities:
    • SEI/ATOM LP: 45% APR ⚡⚡⚡
    • USDC Lending: 12% APY ⚡⚡
    • ETH/USDC LP: 28% APR ⚡⚡⚡"

💬 "Rebalance my portfolio to be more aggressive"
🐉 "Channeling aggressive dragon energy... 
    Recommended allocation: 60% High-Yield LPs, 40% Leveraged Lending
    Expected power level: Over 9000! 🔥"
```

### 🎤 Voice Interface Features

Seiron now includes a mystical voice interface that allows you to command the dragon through speech:

- **🎤 Voice Commands**: Speak your investment wishes naturally
- **🔊 Dragon's Voice**: Hear Seiron's responses through high-quality text-to-speech powered by ElevenLabs
- **🐉 Real-time Animation**: Watch the dragon breathe fire while speaking
- **♿ Accessibility**: Full ARIA support and keyboard navigation

#### Voice Setup

```bash
# Configure ElevenLabs for dragon voice powers
NEXT_PUBLIC_ELEVENLABS_API_KEY=your-elevenlabs-api-key
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=your-voice-id
NEXT_PUBLIC_VOICE_ENABLED=true
```

#### Voice Commands Example

```typescript
// Voice-enabled chat interface
import { VoiceEnabledChat } from '@/components/chat/VoiceEnabledChat';

// Simply speak commands like:
"Hey Seiron, show me my portfolio balance"
"Find the best yield opportunities on Sei"
"Execute a lending strategy with 1000 USDC"
```

## 🏗️ Dragon Architecture

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Floating Dragon   │────▶│   AI Multi-Agent │────▶│ Sei DeFi Realm  │
│   Chat Interface    │     │   Orchestrator   │     │ Smart Contracts │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
         ▲                           ▲                         │
         │                           │                         ▼
    ┌────┴────┐                 ┌────┴────┐         ┌─────────────────┐
    │ Dragon  │                 │ Mystical│         │   Sei Network   │
    │ Wishes  │                 │Analytics│         │ • Yei Finance   │
    └─────────┘                 └─────────┘         │ • DragonSwap    │
                                                    │ • Symphony      │
                                                    │ • Takara        │
                                                    └─────────────────┘
```

## 🛡️ Smart Contracts (Dragon Magic)

### PortfolioVault.sol
The central dragon vault that manages all DeFi positions across protocols.

```solidity
contract PortfolioVault {
    function executeWish(
        WishType wishType,
        address asset,
        uint256 amount,
        bytes calldata strategyData
    ) external onlyDragonAgent;
    
    function rebalanceTreasure(
        uint256[] calldata positionIds,
        bytes calldata dragonWisdom
    ) external onlyDragonAgent;
}
```

### AIExecutor.sol
Handles mystical AI decision execution and multi-agent coordination.

```solidity
contract AIExecutor {
    function manifestWish(
        string calldata userWish,
        bytes calldata aiInterpretation,
        uint256 powerLevel
    ) external returns (bytes memory result);
}
```

## 🎮 Dragon Ball Features

### Floating Dragon Logo
- **Mystical Animations**: Breathing dragon with floating movements
- **Interactive Effects**: Responds to user interaction with enhanced power levels
- **Dragon Ball Orbit**: 7 golden dragon balls circling the majestic Seiron

### Power Level System
- **⚡ Power Level Indicators**: Real-time confidence and execution strength
- **🔥 Dragon Energy**: Visual feedback for transaction power and success rates  
- **🌟 Mystical Effects**: Particle animations and glowing auras throughout the interface

### Dragon Ball Progress Tracking
- **7-Star System**: Progress indicators using the iconic dragon ball design
- **Wish Fulfillment**: Track completion of your investment wishes
- **Power Accumulation**: Visual representation of portfolio growth and success

## 📊 Mystical Performance Monitoring

### Dragon Sight Dashboard
```bash
# Launch the mystical interface
npm run dev

# Access dragon analytics
npm run analytics:dragon-sight

# Generate mystical reports  
npm run export:dragon-report -- --format pdf --period 30d
```

### Chat-Based Monitoring
```
💬 "How powerful is my portfolio today?"
🐉 "Your treasure vault radiates immense power:
    💰 Total Value: $25,847 (+12.3% today)
    ⚡ Power Level: 8,750 (Increasing rapidly!)
    🔥 Active Wishes: 3 lending + 2 LP positions
    🎯 Daily Earnings: $47.23 from mystical yield
    
    Dragon's Recommendation: Your power grows! Consider 
    expanding SEI/ATOM position for maximum energy."
```

## 🎨 Mystical UI Components

### Core Dragon Components
- **FloatingDragonLogo**: Interactive Seiron with breathing animations
- **CirclingDragonBalls**: 7 orbiting dragon balls with star patterns
- **DragonLoader**: Dragon Ball-inspired loading animations
- **MysticalBackground**: Particle effects and dragon scale patterns
- **DragonBallProgress**: Progress tracking using dragon ball metaphors

### Enhanced Theming
- **🔴 Dragon Red Palette**: Primary red (#DC2626) with orange/gold accents
- **✨ Mystical Animations**: 26+ custom CSS animations for magical effects
- **🌟 Power Effects**: Glowing buttons, floating particles, and energy auras
- **🎭 Dragon Ball Typography**: Gradient text effects and mystical styling

## 🔧 Advanced Dragon Configuration

### AI Agent Parameters
```typescript
{
  dragonPersonality: 'wise-powerful',     // Dragon response style
  riskTolerance: 'balanced',              // Conservative to aggressive
  wishInterpretation: 'enhanced',         // Advanced NLP processing  
  powerLevelDisplay: true,                // Show confidence scores
  mysticalEffects: true,                  // Enable particle animations
  autoExecuteWishes: false                // Require confirmation for trades
}
```

### Protocol Integration Settings
```typescript
{
  yeiFinance: { 
    enabled: true,
    autoCompound: '24h',
    maxLendingRatio: 0.6 
  },
  dragonSwap: { 
    enabled: true, 
    slippageTolerance: 0.5,
    rangeFactor: 1.2 
  },
  symphony: { enabled: true },
  takara: { enabled: true },
  maxProtocolExposure: 0.4              // Max 40% in single protocol
}
```

## 🚀 Development & Contribution

### Dragon Development Setup
```bash
# Install dragon dependencies
npm install

# Start mystical development environment
npm run dev:all

# Run dragon tests
npm run test:dragon-powers

# Deploy to Sei testnet
npm run deploy:testnet
```

### 🐋 Docker Test Setup

Seiron includes a comprehensive Docker-based testing environment:

```bash
# Run all tests in Docker containers
npm run docker:test

# Run specific test suites
npm run docker:test:unit
npm run docker:test:integration
npm run docker:test:property

# Audit and verify mock implementations
npm run audit:mocks

# Clean up Docker test environment
npm run docker:test:clean
```

#### Test Coverage Dashboard
```bash
# Launch coverage dashboard on http://localhost:8080
npm run docker:coverage:serve
```

### Contributing to the Dragon Realm
See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on enhancing Seiron's mystical powers.

## 🌟 Roadmap

### Phase 1: Dragon Awakening ✅
- ✅ Core chat interface with floating dragon
- ✅ Multi-agent orchestration system
- ✅ Yei Finance and DragonSwap integration
- ✅ Mystical Dragon Ball Z theming

### Phase 2: Power Enhancement 🔄
- 🔄 Advanced portfolio optimization algorithms
- 🔄 Cross-chain bridge integration
- 🔄 Mobile dragon summoning app
- 🔄 Voice command interpretation

### Phase 3: Ultimate Power 📅
- 📅 AI model fine-tuning on Sei-specific data
- 📅 Advanced derivatives and leverage management
- 📅 Community-driven strategy marketplace
- 📅 Dragon NFT integration and rewards

## ⚡ Tech Stack

**Frontend Magic**:
- Next.js 14 with TypeScript
- Tailwind CSS with custom dragon themes
- React components with mystical animations
- Wagmi/Viem for Sei wallet integration

**Backend Powers**:
- Node.js with Express
- OpenAI GPT-4 for natural language processing
- Multi-agent architecture with specialized dragons
- WebSocket for real-time mystical communications

**Blockchain Realm**:
- Sei Network native integration
- Solidity smart contracts
- Yei Finance, DragonSwap, Symphony, Takara protocols
- Non-custodial architecture with user control

## 🔒 Security & Dragon Protection

- **🛡️ Non-Custodial**: Your funds remain under your control always
- **🔐 Smart Contract Audits**: Dragon contracts reviewed for maximum security
- **⚠️ Risk Limits**: Configurable maximum positions and drawdown protection
- **🚨 Emergency Powers**: Manual override and emergency shutdown capabilities
- **🔍 Real-time Monitoring**: Continuous position and protocol health monitoring

## 📄 License

MIT License - The dragon's wisdom is free for all to use. See [LICENSE](LICENSE) for details.

## ⚠️ Dragon's Disclaimer

Seiron's mystical powers are for educational and experimental purposes. Cryptocurrency and DeFi investments carry significant risks. The dragon's ancient wisdom does not guarantee future profits. Always conduct your own research and never invest more than you can afford to lose. Past performance of mystical strategies does not predict future results.

**May your wildest investment wishes be granted! 🐉✨**

---

*Built with ❤️ by the Seiron development team. Powered by the eternal flames of Sei Network.*# Test signature
