# Next.js 14 Setup Guide

This project has been initialized with Next.js 14 alongside the existing Vite-based frontend. The Next.js setup includes all requested features and configurations.

## Project Structure

```
/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public route group
│   │   ├── chat/          # Chat interface
│   │   └── dashboard/     # Portfolio dashboard
│   ├── (auth)/            # Auth route group
│   │   └── login/         # Login page
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── chat/          # Chat endpoints
│   │   └── portfolio/     # Portfolio endpoints
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   ├── error.tsx          # Error boundary
│   ├── loading.tsx        # Loading state
│   └── not-found.tsx      # 404 page
├── middleware.ts          # Authentication middleware
├── next.config.js         # Next.js configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── postcss.config.js      # PostCSS configuration
├── tsconfig.next.json     # TypeScript configuration for Next.js
└── .env.local.example     # Environment variables template
```

## Features Implemented

### 1. **Next.js 14 with App Router**
- Full App Router setup with route groups
- Server and Client Components
- API routes with Next.js Route Handlers

### 2. **TypeScript & Tailwind CSS**
- TypeScript configuration with strict mode
- Tailwind CSS with custom design system
- Path aliases matching Vite setup

### 3. **Security Headers**
- Content Security Policy (CSP)
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer Policy

### 4. **Webpack Configuration**
- Node polyfills (buffer, process, util)
- Stream and crypto polyfills for browser
- ProvidePlugin for global Buffer and process

### 5. **Authentication Middleware**
- Protected routes (/dashboard, /portfolio, /settings)
- Auth routes (/login, /signup)
- Cookie-based authentication
- Automatic redirects

### 6. **Environment Variables**
- Supabase configuration
- Backend API URL
- ElevenLabs API key
- Privy App ID
- WalletConnect Project ID
- Redis URL for rate limiting

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your actual values
   ```

3. **Run the development server:**
   ```bash
   npm run next:dev
   ```

4. **Build for production:**
   ```bash
   npm run next:build
   npm run next:start
   ```

## Available Scripts

- `npm run next:dev` - Start development server
- `npm run next:build` - Build for production
- `npm run next:start` - Start production server
- `npm run next:lint` - Run ESLint

## API Routes

### Authentication
- `POST /api/auth/login` - User login

### Chat
- `POST /api/chat` - Send chat message

### Portfolio
- `GET /api/portfolio` - Get portfolio data (requires auth)

## Migration Notes

The Next.js setup exists alongside the current Vite frontend. To fully migrate:

1. Move components from `frontend/components` to `components/`
2. Update imports to use Next.js features (Image, Link, etc.)
3. Migrate hooks and contexts
4. Update API calls to use Next.js API routes
5. Configure production deployment

## Security Considerations

1. **Authentication**: Currently using mock authentication. Implement proper JWT/session management
2. **API Security**: Add rate limiting, input validation, and proper error handling
3. **Environment Variables**: Never commit `.env.local` file
4. **CORS**: Configure appropriate CORS headers for production

## Next Steps

1. Integrate with existing backend services
2. Implement proper authentication with Privy
3. Connect to Supabase for data persistence
4. Add WebSocket support for real-time features
5. Configure Vercel deployment