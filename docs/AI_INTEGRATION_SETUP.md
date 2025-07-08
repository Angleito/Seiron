# AI Integration Setup Guide

This guide covers setting up AI features for Seiron, including API key configuration, Vercel deployment, and Supabase migration.

## Prerequisites

- Node.js >= 18.0.0
- Vercel account (for deployment)
- OpenAI API key
- Supabase account (for data persistence)
- Optional: Anthropic API key (for Claude integration)

## API Key Configuration

### 1. OpenAI Setup (Required)

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. For local development:
   ```bash
   # Backend configuration
   echo "OPENAI_API_KEY=sk-your-key-here" >> backend/.env
   ```
3. For production (Vercel):
   - Go to Vercel Dashboard > Project Settings > Environment Variables
   - Add `OPENAI_API_KEY` with your key
   - Select "Production" environment

### 2. Anthropic Setup (Optional)

1. Get your API key from [Anthropic Console](https://console.anthropic.com)
2. Add to Vercel environment variables:
   - Key: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key
   - Environment: Production

### 3. Supabase Setup (Required)

1. Create a project at [Supabase](https://supabase.com)
2. Get your project URL and anon key from Settings > API
3. Add to frontend environment:
   ```bash
   # frontend/.env.local
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Vercel Deployment

### Step 1: Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Select the `frontend` directory as root

### Step 2: Configure Build Settings

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

### Step 3: Environment Variables

Add these in Vercel Dashboard > Settings > Environment Variables:

#### Required Variables
- `OPENAI_API_KEY` - Your OpenAI API key (Production only)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key

#### Optional Variables
- `ANTHROPIC_API_KEY` - For Claude integration
- `VITE_ELEVENLABS_API_KEY` - For voice features
- `VITE_ELEVENLABS_VOICE_ID` - Dragon voice ID

### Step 4: Deploy

1. Click "Deploy" in Vercel
2. Wait for build to complete
3. Test your deployment at the provided URL

## Supabase Migration

### 1. Database Schema

Create these tables in Supabase SQL Editor:

```sql
-- User sessions table
CREATE TABLE user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat history table
CREATE TABLE chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES user_sessions(id),
  message TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Portfolio data table
CREATE TABLE portfolio_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address TEXT NOT NULL,
  protocol TEXT NOT NULL,
  position JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_sessions_address ON user_sessions(user_address);
CREATE INDEX idx_chat_history_session ON chat_history(session_id);
CREATE INDEX idx_portfolio_user ON portfolio_data(user_address);
```

### 2. Row Level Security (RLS)

Enable RLS for data protection:

```sql
-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_address);

CREATE POLICY "Users can view own chat history" ON chat_history
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM user_sessions 
      WHERE user_address = auth.jwt() ->> 'sub'
    )
  );
```

### 3. Client Configuration

Update your frontend code to use Supabase:

```typescript
// frontend/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## Security Best Practices

### 1. API Key Security

- **Never commit API keys** to version control
- Use environment variables for all sensitive data
- Rotate keys regularly
- Set usage limits in provider dashboards

### 2. Environment Variable Management

```bash
# Development (.env.local)
VITE_PUBLIC_VAR=safe-to-expose
PRIVATE_VAR=never-expose-to-client

# Production (Vercel)
- Use Vercel's encrypted environment variables
- Set different values for preview vs production
- Enable automatic secret rotation when available
```

### 3. Rate Limiting

Configure rate limits for API calls:

```typescript
// Example rate limiter
const rateLimiter = {
  openai: { requests: 100, window: '1h' },
  anthropic: { requests: 50, window: '1h' },
  elevenlabs: { requests: 200, window: '1d' }
}
```

## Testing AI Features

### 1. Local Testing

```bash
# Start backend with AI features
cd backend
npm run dev

# Start frontend
cd frontend
npm run dev

# Test AI chat
# Navigate to http://localhost:3000
# Try: "Show me the best yield opportunities"
```

### 2. API Testing

```bash
# Test OpenAI integration
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the best DeFi strategies?"}'

# Test voice synthesis (if configured)
curl -X POST http://localhost:8000/api/voice/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Welcome to Seiron, Dragon Master!"}'
```

### 3. Integration Tests

```bash
# Run AI integration tests
npm run test:ai

# Run with coverage
npm run test:ai:coverage
```

## Monitoring & Debugging

### 1. Vercel Functions Logs

```bash
# View function logs
vercel logs --follow

# Filter AI-related logs
vercel logs --follow | grep -E "(openai|anthropic|ai)"
```

### 2. API Usage Tracking

Monitor your API usage:
- OpenAI: [Usage Dashboard](https://platform.openai.com/usage)
- Anthropic: [Console Usage](https://console.anthropic.com/usage)
- Supabase: [Project Dashboard](https://app.supabase.com)

### 3. Error Handling

Common issues and solutions:

| Error | Solution |
|-------|----------|
| `Invalid API key` | Check environment variable names and values |
| `Rate limit exceeded` | Implement backoff or upgrade plan |
| `CORS errors` | Configure Vercel headers in `vercel.json` |
| `Supabase connection failed` | Verify URL and anon key |

## Performance Optimization

### 1. Caching Strategies

```typescript
// Cache AI responses
const aiCache = new Map()
const getCachedResponse = (prompt: string) => {
  const cached = aiCache.get(prompt)
  if (cached && Date.now() - cached.timestamp < 3600000) {
    return cached.response
  }
  return null
}
```

### 2. Edge Functions

Use Vercel Edge Functions for lower latency:

```typescript
// api/ai/chat.ts
export const config = {
  runtime: 'edge',
}
```

### 3. Response Streaming

Enable streaming for better UX:

```typescript
// Stream AI responses
const stream = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages,
  stream: true,
})
```

## Troubleshooting

### Common Issues

1. **Vercel deployment fails**
   - Check build logs for missing environment variables
   - Ensure `frontend` is set as root directory
   - Verify Node.js version compatibility

2. **AI responses are slow**
   - Enable response streaming
   - Implement caching for common queries
   - Use edge functions for geographic distribution

3. **Supabase connection issues**
   - Verify CORS settings in Supabase dashboard
   - Check RLS policies aren't blocking queries
   - Ensure anon key has necessary permissions

## Next Steps

1. Set up monitoring dashboards
2. Configure alerting for API errors
3. Implement user feedback collection
4. Set up A/B testing for AI models
5. Create backup AI provider fallbacks

For additional support, check the [main documentation](../README.md) or open an issue on GitHub.