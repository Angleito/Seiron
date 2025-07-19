<div align="center">
  <img src="seiron.png" alt="Seiron - The Wish-Granting Dragon" width="400" height="400" />
  
  # Seiron 🐉
  
  <p><em>AI-powered DeFi portfolio management for the Sei Network ecosystem</em></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](https://opensource.org/licenses/MIT)
  [![TypeScript](https://img.shields.io/badge/TypeScript-DC2626?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Next.js](https://img.shields.io/badge/Next.js-DC2626?logo=next.js&logoColor=white)](https://nextjs.org/)
  [![Sei Network](https://img.shields.io/badge/Sei_Network-F59E0B?logo=bitcoin&logoColor=white)](https://sei.io/)
  
  <br/>
  
  **🔥 Multi-Agent AI** • **⚡ Natural Language Commands** • **🛡️ Non-Custodial** • **🎯 Sei Native**
</div>

## 📖 Table of Contents

- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Key Features](#-key-features)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## 🌟 Overview

Seiron combines AI agents with DeFi protocols to create a powerful portfolio management platform. Simply describe what you want in natural language, and Seiron's specialized dragon agents will execute your investment strategies across the Sei ecosystem.

### Core Capabilities

- **🗣️ Natural Language Interface**: Command your portfolio with conversational AI
- **🤖 Multi-Agent System**: Specialized agents for lending, liquidity, analysis, and portfolio management
- **⚡ Sei Native**: Deep integration with Yei Finance, DragonSwap, Symphony, and Takara
- **🛡️ Non-Custodial**: Your keys, your crypto - always maintain full control
- **🎤 Voice Commands**: Speak your investment wishes (powered by ElevenLabs)

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Sei wallet (Keplr/Leap) with SEI tokens
- OpenAI API key

### Installation

```bash
# Clone repository
git clone https://github.com/Angleito/Seiron.git
cd Seiron

# Install dependencies
npm install

# Configure environment
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Start development servers
npm run dev
```

### Essential Configuration

```bash
# Frontend (.env)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_SEI_RPC_URL=https://evm-rpc.sei-apis.com

# Backend (.env)
OPENAI_API_KEY=sk-your-openai-key
PORT=8000
```

📚 **Full setup guide**: [docs/AI_INTEGRATION_SETUP.md](docs/AI_INTEGRATION_SETUP.md)

## 🏗️ Project Structure

```
Seiron/
├── frontend/          # Next.js 14 + TypeScript frontend
│   ├── components/    # React components (chat, dragon, effects)
│   ├── pages/         # Application pages
│   └── hooks/         # Custom React hooks
├── backend/           # Node.js + Express API server
│   ├── src/           # Source code
│   └── docs/          # Backend documentation
├── contracts/         # Solidity smart contracts
├── src/              # Core AI agents and orchestration
│   ├── agents/        # Specialized AI agents
│   ├── langchain/     # NLP and conversation management
│   └── orchestrator/  # Multi-agent coordination
└── docs/             # Project documentation
```

## ✨ Key Features

### AI Agents
- **Lending Dragon**: Automated yield optimization on Yei Finance
- **Liquidity Dragon**: Dynamic LP management on DragonSwap
- **Market Dragon**: Real-time analysis and opportunity detection
- **Portfolio Dragon**: Holistic portfolio optimization
- **Futures Dragon**: Advanced perpetual futures trading on Bluefin

### Natural Language Examples
```
"Show me the best yield opportunities"
"Lend 1000 USDC at maximum APY"
"Create a balanced portfolio with 50% lending"
"Rebalance my positions for lower risk"
```

### Technical Highlights
- Real-time WebSocket communication
- 3D dragon animations with Three.js
- Voice interface with speech recognition
- Comprehensive error boundaries
- Docker support for all environments

## 📚 Documentation

### Getting Started
- [AI Integration Setup](docs/AI_INTEGRATION_SETUP.md) - Configure AI services
- [Frontend Integration](docs/FRONTEND_INTEGRATION.md) - Frontend development guide
- [API Endpoints](docs/API_ENDPOINTS.md) - Backend API reference

### Architecture
- [System Architecture](docs/architecture/overview.md) - High-level design
- [Agent System](src/agents/README.md) - AI agent architecture
- [NLP Engine](src/langchain/README.md) - Natural language processing

### Security & Operations
- [Wallet Migration](docs/WALLET_MIGRATION_GUIDE.md) - Wallet integration guide
- [Security Report](docs/SECURITY_CLEANUP_REPORT.md) - Security best practices
- [Performance Testing](docs/PERFORMANCE_TESTING_GUIDE.md) - Load testing guide

### Protocol Integrations
- [Takara Protocol](docs/takara-protocol-integration.md) - Takara integration
- [Lending System](src/lending/README.md) - Yei Finance integration
- [Liquidity Management](src/liquidity/README.md) - DragonSwap integration
- **[Bluefin Futures](https://bluefin.io)** - Perpetual futures trading

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code standards and functional programming principles
- Testing requirements (90% coverage minimum)
- Pull request process
- Development setup

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p><strong>Built with ❤️ by the Seiron team • Powered by Sei Network</strong></p>
  <p>
    <a href="https://discord.gg/seiron">Discord</a> •
    <a href="https://twitter.com/seiron">Twitter</a> •
    <a href="https://docs.seiron.ai">Docs</a>
  </p>
</div>