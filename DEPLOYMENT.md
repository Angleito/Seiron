# Deployment Configuration - Sei Portfolio AI

## Overview

This guide covers the complete deployment configuration for the Next.js-based Sei Portfolio AI application on Vercel with production-ready security measures.

## Environment Variables Setup

### Required Environment Variables

#### Core Application
```bash
# Next.js Configuration
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Vercel Deployment
VERCEL_URL=your-app-url.vercel.app
VERCEL_ENV=production
```

#### Database & Storage
```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Upstash Redis (for rate limiting and caching)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here

# Vercel KV (Alternative to Upstash - automatically provided by Vercel)
KV_REST_API_URL=https://your-kv-instance.kv.vercel-storage.com
KV_REST_API_TOKEN=your_kv_token_here
KV_REST_API_READ_ONLY_TOKEN=your_kv_readonly_token_here
```

#### Authentication & Security
```bash
# Privy Authentication
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
PRIVY_APP_SECRET=your_privy_app_secret_here

# WalletConnect (Optional)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Session Security
SESSION_SECRET=your-strong-session-secret-here
API_SECRET_KEY=your-api-secret-key-here

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### AI Services
```bash
# OpenAI
OPENAI_API_KEY=sk-your_openai_api_key_here

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key_here

# ElevenLabs Voice Synthesis
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_DEFAULT_VOICE_ID=21m00Tcm4TlvDq8ikWAM
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=your_voice_id_here
```

#### Sei Network Configuration
```bash
# Sei Blockchain Endpoints
SEI_RPC_MAINNET=https://rpc.sei-apis.com
SEI_RPC_TESTNET=https://rpc-testnet.sei-apis.com
SEI_REST_MAINNET=https://rest.sei-apis.com
SEI_REST_TESTNET=https://rest-testnet.sei-apis.com
SEI_WS_MAINNET=wss://ws.sei-apis.com
SEI_WS_TESTNET=wss://ws-testnet.sei-apis.com
SEI_API_KEY=your-sei-api-key-here

# Public Frontend Variables
NEXT_PUBLIC_SEI_RPC_URL=https://evm-rpc.sei-apis.com
NEXT_PUBLIC_BACKEND_URL=https://your-app-url.vercel.app
```

### Setting Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Navigate to Settings → Environment Variables
4. Add each variable with appropriate environment scopes:
   - **Development**: For development/preview deployments
   - **Preview**: For branch preview deployments  
   - **Production**: For production deployments

## Database Connection Requirements

### Supabase Setup

1. **Create Supabase Project**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Initialize project
   supabase init
   
   # Link to your project
   supabase link --project-ref YOUR_PROJECT_REF
   ```

2. **Database Migrations**
   ```bash
   # Run migrations
   supabase db push
   
   # Generate types
   supabase gen types typescript --local > types/supabase.ts
   ```

3. **Required Tables**
   - `users` - User authentication and profiles
   - `chat_sessions` - Chat conversation sessions
   - `messages` - Individual chat messages
   - `portfolios` - User portfolio data
   - `transactions` - Transaction history
   - `price_snapshots` - Historical price data

### Redis Configuration

#### Option 1: Upstash Redis
1. Create account at [upstash.com](https://upstash.com)
2. Create new Redis database
3. Copy REST URL and token to environment variables

#### Option 2: Vercel KV
1. Enable Vercel KV in your project settings
2. Environment variables are automatically provided

## Third-Party Service Configuration

### Privy Authentication
1. Create account at [privy.io](https://privy.io)
2. Set up new application
3. Configure allowed domains
4. Copy App ID and Secret

### ElevenLabs Voice
1. Create account at [elevenlabs.io](https://elevenlabs.io)
2. Generate API key
3. Select or create voice ID
4. Configure rate limits

### WalletConnect (Optional)
1. Create project at [cloud.walletconnect.com](https://cloud.walletconnect.com)
2. Copy Project ID
3. Configure allowed domains

## Security Checklist

### ✅ Environment Variables
- [ ] All sensitive keys stored in Vercel environment variables
- [ ] No secrets in code or config files
- [ ] Production vs development environment separation
- [ ] API keys have proper scoping and rate limits

### ✅ Headers & CSP
- [ ] Content Security Policy configured
- [ ] HTTPS enforcement with HSTS
- [ ] X-Frame-Options set to SAMEORIGIN
- [ ] X-Content-Type-Options set to nosniff
- [ ] XSS Protection enabled

### ✅ CORS Configuration
- [ ] CORS restricted to allowed origins
- [ ] API endpoints properly secured
- [ ] Preflight requests handled correctly

### ✅ Rate Limiting
- [ ] Redis/KV configured for rate limiting
- [ ] API endpoints protected with rate limits
- [ ] Proper error handling for rate limit exceeded

### ✅ Authentication
- [ ] Privy authentication properly configured
- [ ] Session management secure
- [ ] JWT tokens validated
- [ ] Wallet connection security

### ✅ API Security
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] Parameter sanitization
- [ ] Error messages don't leak sensitive info

## Build Configuration

### Next.js Build Settings
```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "installCommand": "npm install"
}
```

### Build Optimization
- Tree shaking enabled
- Bundle splitting configured
- Image optimization enabled
- Static asset caching
- Gzip compression enabled

## Deployment Commands

### Production Deployment
```bash
# Deploy to production
npm run deploy

# Deploy with environment check
vercel --prod --confirm
```

### Preview Deployment
```bash
# Deploy preview branch
npm run deploy:preview

# Deploy specific branch
vercel --target preview
```

### Local Development
```bash
# Start development server
npm run dev

# Build locally
npm run build

# Start production server locally
npm run start
```

## Monitoring & Logging

### Vercel Analytics
- Runtime logs automatically captured
- Function execution metrics
- Error tracking and alerts

### Custom Monitoring
```typescript
// Add to your API routes
import { track } from './lib/analytics';

export async function POST(request: Request) {
  try {
    // Your API logic
    await track('api_call', { endpoint: '/api/chat' });
  } catch (error) {
    await track('api_error', { endpoint: '/api/chat', error: error.message });
    throw error;
  }
}
```

## Performance Optimization

### Caching Strategy
- Static assets: 1 year cache
- API responses: Redis caching
- Database queries: Supabase caching
- Images: Next.js Image optimization

### Bundle Optimization
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    swcMinify: true,
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    };
    return config;
  },
};
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and rebuild
   rm -rf .next
   npm run build
   ```

2. **Environment Variable Issues**
   - Verify all required variables are set
   - Check environment scoping (dev/preview/prod)
   - Ensure no typos in variable names

3. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check database migrations status
   - Validate connection pooling settings

4. **API Rate Limits**
   - Monitor API usage in dashboards
   - Implement exponential backoff
   - Add circuit breakers for third-party services

### Support Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)

## Security Incident Response

1. **Immediate Actions**
   - Rotate compromised API keys
   - Update environment variables
   - Check access logs for suspicious activity

2. **Investigation**
   - Review recent deployments
   - Audit environment variable access
   - Check third-party service logs

3. **Recovery**
   - Deploy security patches
   - Update security headers
   - Implement additional monitoring

---

**Last Updated**: January 2025
**Version**: 1.0.0