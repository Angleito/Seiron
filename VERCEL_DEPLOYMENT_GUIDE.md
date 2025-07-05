# Seiron Vercel Deployment Guide

This guide will walk you through deploying your Seiron AI crypto DApp to Vercel with secure GPT-4o integration.

## 🚀 Quick Start

### 1. Install Vercel CLI (if not already installed)
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Initialize Project
```bash
vercel --cwd /Users/angel/Projects/Seiron
```

## 🔧 Environment Configuration

### Set Sensitive Environment Variables in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables (mark as **Sensitive**):

#### Required Variables:
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

#### Optional Variables (for voice features):
```bash
NEXT_PUBLIC_ELEVENLABS_API_KEY=your-elevenlabs-api-key
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=your-voice-id
```

#### Frontend Configuration:
```bash
VITE_API_URL=https://your-deployment-url.vercel.app
VITE_ENVIRONMENT=production
```

### Alternative: Set via Vercel CLI
```bash
# Set OpenAI API key (sensitive)
vercel env add OPENAI_API_KEY production

# Set frontend API URL
vercel env add VITE_API_URL production
```

## 📂 Project Structure

Your Vercel deployment includes:

```
/
├── api/                    # Vercel Functions (GPT-4o integration)
│   ├── chat.js            # Streaming chat endpoint
│   ├── orchestrate.js     # Structured response endpoint
│   └── _middleware.js     # Security & rate limiting
├── frontend/              # React/Vite frontend
│   ├── dist/             # Build output (auto-generated)
│   └── ...
├── vercel.json           # Deployment configuration
└── package.json          # API dependencies
```

## 🔒 Security Features

### Built-in Security:
- **Rate Limiting**: 20 requests/minute for chat, 15/minute for orchestrate
- **CORS Protection**: Configured for your domain
- **Security Headers**: CSP, HSTS, XSS protection
- **Bot Detection**: Basic bot filtering
- **Request Validation**: Input sanitization and validation

### API Key Security:
- ✅ **Server-side only**: API keys never exposed to frontend
- ✅ **Encrypted storage**: Vercel sensitive environment variables
- ✅ **No logging**: API keys never logged or exposed

## 🚀 Deployment Steps

### Method 1: Automatic Deployment
```bash
# Deploy to production
vercel --prod

# Deploy to preview (staging)
vercel
```

### Method 2: GitHub Integration
1. Push your code to GitHub
2. Connect your Vercel project to the repository
3. Enable automatic deployments

## 🧪 Testing Your Deployment

### 1. Test API Endpoints
```bash
# Test orchestrate endpoint
curl -X POST https://your-deployment-url.vercel.app/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is my portfolio worth?",
    "sessionId": "test-session-123"
  }'

# Test streaming endpoint
curl -X POST https://your-deployment-url.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello Seiron",
    "sessionId": "test-session-123"
  }'
```

### 2. Test Frontend Chat
1. Navigate to `https://your-deployment-url.vercel.app`
2. Open the chat interface
3. Send a test message
4. Verify GPT-4o responses with Dragon Ball Z theming

## 📊 Monitoring & Analytics

### View Logs
```bash
# View function logs
vercel logs

# View specific function logs
vercel logs --scope=api/chat
```

### Performance Monitoring
- **Function Duration**: Check execution times in Vercel dashboard
- **Error Rates**: Monitor failed requests
- **Rate Limiting**: Track blocked requests

## 🛠 Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start local development
vercel dev

# Test API routes locally
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "sessionId": "local-test"}'
```

### Environment-specific Testing
```bash
# Test against preview deployment
VITE_API_URL=https://preview-url.vercel.app npm run dev

# Test against production
VITE_API_URL=https://production-url.vercel.app npm run dev
```

## 🚨 Troubleshooting

### Common Issues:

#### 1. API Key Not Working
```bash
# Check if environment variable is set
vercel env ls

# Re-add the API key
vercel env rm OPENAI_API_KEY production
vercel env add OPENAI_API_KEY production
```

#### 2. Rate Limiting Issues
- Check your request frequency
- Implement client-side rate limiting
- Consider upgrading Vercel plan for higher limits

#### 3. CORS Errors
- Verify your domain is allowed in CORS settings
- Check that requests include proper headers

#### 4. Function Timeouts
- GPT-4o responses are limited to 30 seconds
- Check your OpenAI API rate limits
- Consider implementing request queuing

### Debug Commands:
```bash
# Check deployment status
vercel ls

# View environment variables
vercel env ls

# Check function performance
vercel logs --limit=50

# Test specific function
vercel dev --debug
```

## 🔄 Updates and Maintenance

### Updating the Deployment:
```bash
# Deploy latest changes
git push  # If using GitHub integration
# OR
vercel --prod
```

### Rotating API Keys:
1. Generate new OpenAI API key
2. Update in Vercel dashboard: Settings → Environment Variables
3. Redeploy: `vercel --prod`

### Monitoring Best Practices:
- Set up alerts for high error rates
- Monitor API usage and costs
- Regularly check security logs
- Update dependencies monthly

## 📈 Scaling Considerations

### Performance Optimization:
- **Caching**: Implement Redis for session data
- **CDN**: Vercel Edge Network automatically handles static assets
- **Monitoring**: Use Vercel Analytics for performance insights

### Cost Management:
- Monitor function execution time
- Implement request caching where appropriate
- Consider upgrading Vercel plan for production usage

## 🆘 Support

### Resources:
- [Vercel Documentation](https://vercel.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Seiron Project Issues](https://github.com/your-repo/issues)

### Emergency Procedures:
1. **Disable API**: Remove `OPENAI_API_KEY` environment variable
2. **Rate Limit Override**: Contact Vercel support
3. **Rollback**: Use `vercel --prod --force` with previous git commit

---

## 🎉 You're All Set!

Your Seiron AI DApp is now securely deployed with:
- ✅ GPT-4o integration via Vercel Functions
- ✅ Secure API key handling
- ✅ Rate limiting and security measures
- ✅ Dragon Ball Z themed AI responses
- ✅ Production-ready infrastructure

Enjoy your mystical dragon-powered crypto assistant! 🐉🔥