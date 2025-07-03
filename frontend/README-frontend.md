# Seiron - The Wish-Granting Dragon Frontend

A Next.js 14 frontend application for summoning Seiron, the mystical dragon of DeFi wish fulfillment on Sei Network.

## Features

- **Dragon Summoning Interface**: Speak your wishes to Seiron in plain language
- **Sacred Altar Integration**: Connect your mystical vault (MetaMask/Keplr wallets)
- **Dragon's Treasure Vault**: Real-time treasure tracking and mystical insights
- **Dragon-Themed UI**: Mystical design with dragon-inspired elements using TailwindCSS
- **Dragon Magic Ready**: Built with wagmi and viem for blockchain manifestations

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- wagmi & viem (Web3 integration)
- RainbowKit (Wallet connection UI)
- Lucide React (Icons)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Update `.env.local` with your configuration:
- `NEXT_PUBLIC_API_URL`: Your backend API URL
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: WalletConnect project ID (optional)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── chat/             # Chat interface components
│   ├── portfolio/        # Portfolio components
│   ├── wallet/           # Wallet connection components
│   └── providers.tsx     # App providers (Web3, React Query)
├── config/               # Configuration files
│   └── wagmi.ts         # Wagmi/Web3 config
├── lib/                  # Utility functions
├── types/                # TypeScript types
└── public/               # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Key Components

### Dragon Summoning Interface (`/components/chat/chat-interface.tsx`)
- Real-time dragon communication UI
- Wish fulfillment history
- Mystical wish input field with summoning functionality
- Dragon conjuring states

### Dragon's Treasure Vault (`/components/portfolio/portfolio-sidebar.tsx`)
- Treasure vault power level summary
- Mystical treasures list with balances
- Dragon's favor indicators
- Dragon's wisdom stats

### Sacred Altar Connection (`/components/wallet/wallet-connect.tsx`)
- RainbowKit integration for mystical connections
- Multi-vault support for various treasures
- Realm switching between different dragon domains

## Customization

### Styling
- Global styles: `/app/globals.css`
- TailwindCSS config: `/tailwind.config.ts`
- Component styles use Tailwind utility classes

### Web3 Configuration
- Chain configuration: `/config/wagmi.ts`
- Add/modify supported chains and RPC endpoints

### API Integration
- Update `/app/api/chat/route.ts` to connect to your backend
- Modify `/components/chat/chat-interface.tsx` for custom API calls

## Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy to your preferred platform:
- Vercel (recommended for Next.js)
- Netlify
- AWS Amplify
- Self-hosted with Node.js

## Notes

- The dragon summoning interface connects to the mystical orchestrator
- Treasure vault data connects to the dragon's wisdom backend
- Ensure your dragon realm CORS settings allow mystical communications from your summoning circle