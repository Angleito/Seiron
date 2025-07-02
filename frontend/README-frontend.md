# AI Portfolio Manager Frontend

A Next.js 14 frontend application for an AI-powered crypto portfolio manager built on Sei Network.

## Features

- **Chat Interface**: Natural language interaction with AI portfolio manager
- **Wallet Integration**: Support for MetaMask and Keplr wallets
- **Portfolio Dashboard**: Real-time portfolio tracking and analytics
- **Modern UI**: Clean, minimal design with TailwindCSS
- **Web3 Ready**: Built with wagmi and viem for blockchain interactions

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

### Chat Interface (`/components/chat/chat-interface.tsx`)
- Real-time messaging UI
- Message history
- Input field with send functionality
- Loading states

### Portfolio Sidebar (`/components/portfolio/portfolio-sidebar.tsx`)
- Portfolio value summary
- Asset list with balances
- 24h change indicators
- Quick stats

### Wallet Connection (`/components/wallet/wallet-connect.tsx`)
- RainbowKit integration
- Multi-wallet support
- Chain switching

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

- The chat interface currently uses placeholder responses
- Portfolio data is mocked - connect to your backend for real data
- Ensure your backend CORS settings allow requests from your frontend domain