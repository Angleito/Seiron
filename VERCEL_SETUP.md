# Vercel + Docker Backend Setup

## ✅ Fixed API Connection Issues

The frontend has been updated with a unified API client that handles both direct backend connections and Vercel API route fallbacks. This resolves the 404 errors you were experiencing.

## Environment Variables Configuration

To connect your Vercel frontend to your Docker backend, you need to set up environment variables in your Vercel dashboard.

### Required Environment Variables

In your Vercel dashboard → Project Settings → Environment Variables, add:

```env
# Backend API URL (use your CloudFlare tunnel URL)
NEXT_PUBLIC_BACKEND_URL=https://your-tunnel-url.trycloudflare.com
```

This single environment variable will configure:
- Direct API calls to your Docker backend
- Automatic fallback to Vercel API routes if backend is unavailable
- WebSocket connections to your Docker backend  
- Chat service endpoint configuration

## ✨ What's New

### 1. Unified API Client
- **Auto-fallback**: If backend is unavailable, automatically falls back to Vercel API routes
- **Better error handling**: Clearer error messages and retry logic
- **Configuration detection**: Automatically detects backend availability

### 2. Improved Error Handling
- **Graceful degradation**: App continues to work even if backend is down
- **Real-time status**: Configuration status component shows connectivity in real-time
- **Detailed logging**: Better debugging information in console

### 3. Configuration Validation
- **Startup checks**: App validates configuration on startup
- **Environment validation**: Checks all required environment variables
- **Backend health monitoring**: Continuous monitoring of backend connectivity

### Creating Your Tunnel

1. Start your Docker backend:
   ```bash
   docker-compose up -d
   ```

2. Create a CloudFlare tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:3001
   ```

3. Copy the tunnel URL from the output (e.g., `https://your-tunnel-url.trycloudflare.com`)

4. Add the tunnel URL to your Vercel environment variables (replace `your-tunnel-url` with your actual tunnel URL)

### Testing the Setup

1. Set the environment variables in Vercel
2. Redeploy your frontend
3. Keep the tunnel running while testing
4. Visit your Vercel app and check the console for successful API connections

### Security Notes

- The tunnel URL is temporary and changes each time you restart the tunnel
- For production, consider using a more permanent tunnel solution
- Never commit tunnel URLs to the repository
- Use environment variables for all configuration