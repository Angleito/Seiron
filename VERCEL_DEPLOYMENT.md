# Vercel Deployment Guide for Seiron AI Portfolio

This guide covers deploying the Seiron AI Portfolio project to Vercel with proper Vite frontend and API routes configuration.

## Project Structure

```
/Users/angel/Projects/Seiron/
├── vercel.json                 # Vercel configuration
├── .vercelignore              # Files to ignore during deployment
├── frontend/                  # Vite React frontend
│   ├── vite.config.ts        # Vite configuration
│   ├── package.json          # Frontend dependencies
│   └── dist/                 # Build output (generated)
├── backend/                   # Express.js backend
│   ├── src/routes/           # API route handlers
│   └── package.json          # Backend dependencies
└── api/                      # Vercel Functions (serverless)
    ├── ai.ts                 # AI endpoint wrapper
    ├── chat.ts               # Chat endpoint wrapper
    ├── portfolio.ts          # Portfolio endpoint wrapper
    ├── voice.ts              # Voice endpoint wrapper
    ├── confirmation.ts       # Confirmation endpoint wrapper
    ├── package.json          # API dependencies
    └── tsconfig.json         # TypeScript config for API
```

## Configuration Details

### 1. Vite Frontend Configuration

The `vercel.json` is configured to:
- Build the frontend from the `frontend/` directory using Vite
- Output static files to `frontend/dist/`
- Preserve Vite's chunk optimization and asset naming
- Handle SPA routing with proper rewrites

### 2. API Routes Configuration

API routes are configured as Vercel Functions:
- Each backend route is wrapped as a serverless function in `/api/`
- Routes maintain the same Express.js handlers from the backend
- Functions use Node.js 18.x runtime with 1GB memory
- Maximum execution time of 30 seconds per function

### 3. Environment Variables

Required environment variables (configure in Vercel dashboard):

```bash
# Frontend (public)
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_key
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=your_voice_id
NEXT_PUBLIC_VOICE_ENABLED=true

# Backend (private)
OPENAI_API_KEY=your_openai_key
REDIS_URL=your_redis_url
NODE_ENV=production
```

### 4. Security Headers

The configuration includes:
- Content Security Policy matching the development setup
- CORS headers for API routes
- Cache headers for static assets
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)

### 5. Build Process

The build process:
1. Installs dependencies for root, frontend, backend, and api directories
2. Builds the frontend using Vite
3. Compiles TypeScript for API functions
4. Deploys static files and serverless functions

## Deployment Steps

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy from Project Root

```bash
cd /Users/angel/Projects/Seiron
vercel
```

### 4. Configure Environment Variables

In the Vercel dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add all required variables listed above

### 5. Redeploy

```bash
vercel --prod
```

## API Endpoints

After deployment, your API endpoints will be available at:

- `https://your-domain.vercel.app/api/ai` - AI chat endpoints
- `https://your-domain.vercel.app/api/chat` - Chat functionality
- `https://your-domain.vercel.app/api/portfolio` - Portfolio management
- `https://your-domain.vercel.app/api/voice` - Voice interface
- `https://your-domain.vercel.app/api/confirmation` - Transaction confirmation

## Scheduled Functions (Cron Jobs)

The configuration includes two cron jobs:
- Portfolio sync: Every 6 hours
- AI cleanup: Daily at 2 AM

## Monitoring and Performance

### Function Configuration
- Runtime: Node.js 18.x
- Memory: 1GB per function
- Timeout: 30 seconds
- Region: Washington D.C. (iad1)

### Static Asset Optimization
- Long-term caching for JS/CSS/images (1 year)
- Gzip compression enabled
- Minified builds via Vite

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Ensure all package.json files have correct dependencies
   - Check TypeScript compilation errors
   - Verify Vite build completes successfully

2. **API Route Errors**
   - Check function logs in Vercel dashboard
   - Verify environment variables are set
   - Ensure backend dependencies are installed

3. **CORS Issues**
   - Check CORS headers in vercel.json
   - Verify frontend URL in environment variables

4. **Memory Issues**
   - Functions are configured with 1GB memory
   - Consider optimizing imports and dependencies
   - Use streaming for large responses

### Debugging

Enable function logs:
```bash
vercel logs your-deployment-url
```

Test functions locally:
```bash
vercel dev
```

## Performance Optimizations

### Frontend
- Vite's code splitting and chunk optimization preserved
- Static asset caching with immutable headers
- CSP headers for security without performance impact

### Backend
- Serverless functions only load when needed
- Shared dependencies cached between function calls
- Optimal memory allocation (1GB) for AI/ML operations

### Voice Features
- ElevenLabs TTS integration maintained
- WebRTC optimizations preserved
- Audio streaming support

## Maintenance

### Regular Updates
- Monitor function performance in Vercel dashboard
- Update dependencies regularly
- Review and optimize bundle sizes
- Monitor error rates and response times

### Scaling Considerations
- Functions auto-scale based on demand
- Consider upgrading to Pro plan for higher limits
- Monitor bandwidth usage for voice features
- Optimize Redis usage for portfolio caching

This configuration ensures your Seiron AI Portfolio deploys successfully to Vercel while maintaining all functionality including voice features, real-time portfolio management, and AI-powered conversations.