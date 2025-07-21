# MCP (Model Context Protocol) Configuration Guide

This document provides comprehensive configuration instructions for the Model Context Protocol (MCP) integration in the Seiron project.

## Table of Contents

1. [Overview](#overview)
2. [Environment Variables](#environment-variables)
3. [Server Configuration](#server-configuration)
4. [Security Considerations](#security-considerations)
5. [Setup Instructions](#setup-instructions)
6. [Example Configurations](#example-configurations)
7. [Troubleshooting](#troubleshooting)

## Overview

The Seiron project integrates three MCP servers:

1. **Sei MCP Adapter** - Primary adapter for Sei blockchain interactions
2. **omnisearch** - Search and web tools for enhanced data retrieval
3. **puppeteer** - Browser automation for testing and web interactions

Each server can use different transport protocols (WebSocket, HTTP, or stdio) based on requirements.

## Environment Variables

### Backend Configuration

#### Global MCP Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MCP_ENABLED` | Enable/disable MCP functionality | `true` | Yes |
| `MCP_DEFAULT_TRANSPORT` | Default transport protocol | `websocket` | Yes |
| `MCP_DEFAULT_TIMEOUT` | Default connection timeout (ms) | `30000` | Yes |
| `MCP_DEFAULT_RETRY_ATTEMPTS` | Number of retry attempts | `3` | Yes |
| `MCP_DEFAULT_RETRY_DELAY` | Delay between retries (ms) | `1000` | Yes |
| `MCP_HEARTBEAT_INTERVAL` | WebSocket heartbeat interval (ms) | `30000` | Yes |
| `MCP_MAX_RECONNECT_ATTEMPTS` | Maximum reconnection attempts | `5` | Yes |

#### Sei MCP Adapter Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MCP_SEI_ENABLED` | Enable Sei MCP adapter | `true` | Yes |
| `MCP_SEI_TRANSPORT` | Transport protocol | `websocket` | Yes |
| `MCP_SEI_ENDPOINT` | WebSocket endpoint | `ws://localhost:8765` | Yes |
| `MCP_SEI_HTTP_ENDPOINT` | HTTP endpoint | `http://localhost:8765` | No |
| `MCP_SEI_API_KEY` | API key for authentication | - | No |
| `MCP_SEI_CONNECTION_TIMEOUT` | Connection timeout (ms) | `30000` | Yes |
| `MCP_SEI_REQUEST_TIMEOUT` | Request timeout (ms) | `60000` | Yes |
| `MCP_SEI_MAX_MESSAGE_SIZE` | Max message size (bytes) | `1048576` | Yes |
| `MCP_SEI_COMPRESSION_ENABLED` | Enable compression | `true` | Yes |

#### omnisearch Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MCP_OMNISEARCH_ENABLED` | Enable omnisearch | `true` | Yes |
| `MCP_OMNISEARCH_TRANSPORT` | Transport protocol | `http` | Yes |
| `MCP_OMNISEARCH_ENDPOINT` | HTTP endpoint | `http://localhost:8766` | Yes |
| `MCP_OMNISEARCH_API_KEY` | API key for authentication | - | No |
| `MCP_OMNISEARCH_TAVILY_API_KEY` | Tavily search API key | - | No |
| `MCP_OMNISEARCH_BRAVE_API_KEY` | Brave search API key | - | No |
| `MCP_OMNISEARCH_KAGI_API_KEY` | Kagi search API key | - | No |
| `MCP_OMNISEARCH_PERPLEXITY_API_KEY` | Perplexity API key | - | No |
| `MCP_OMNISEARCH_JINA_API_KEY` | Jina reader API key | - | No |
| `MCP_OMNISEARCH_FIRECRAWL_API_KEY` | Firecrawl API key | - | No |
| `MCP_OMNISEARCH_CONNECTION_TIMEOUT` | Connection timeout (ms) | `30000` | Yes |
| `MCP_OMNISEARCH_REQUEST_TIMEOUT` | Request timeout (ms) | `120000` | Yes |

#### puppeteer Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MCP_PUPPETEER_ENABLED` | Enable puppeteer | `true` | Yes |
| `MCP_PUPPETEER_TRANSPORT` | Transport protocol | `stdio` | Yes |
| `MCP_PUPPETEER_EXECUTABLE_PATH` | Path to puppeteer MCP executable | `/usr/local/bin/puppeteer-mcp` | Yes |
| `MCP_PUPPETEER_BROWSER_PATH` | Path to browser executable | `/usr/bin/chromium` | No |
| `MCP_PUPPETEER_HEADLESS` | Run in headless mode | `true` | Yes |
| `MCP_PUPPETEER_SANDBOX` | Enable sandbox mode | `true` | Yes |
| `MCP_PUPPETEER_VIEWPORT_WIDTH` | Default viewport width | `1920` | Yes |
| `MCP_PUPPETEER_VIEWPORT_HEIGHT` | Default viewport height | `1080` | Yes |
| `MCP_PUPPETEER_DEFAULT_TIMEOUT` | Default operation timeout (ms) | `30000` | Yes |
| `MCP_PUPPETEER_NAVIGATION_TIMEOUT` | Navigation timeout (ms) | `60000` | Yes |

#### Authentication & Security

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MCP_AUTH_TYPE` | Authentication type | `bearer` | Yes |
| `MCP_AUTH_HEADER_NAME` | Authentication header name | `Authorization` | Yes |
| `MCP_CORS_ENABLED` | Enable CORS | `true` | Yes |
| `MCP_CORS_ALLOWED_ORIGINS` | Allowed CORS origins | `http://localhost:3000,https://seiron.app` | Yes |
| `MCP_RATE_LIMIT_ENABLED` | Enable rate limiting | `true` | Yes |
| `MCP_RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | Yes |
| `MCP_RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `60000` | Yes |

#### Connection Pool Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MCP_POOL_MIN_CONNECTIONS` | Minimum pool connections | `2` | Yes |
| `MCP_POOL_MAX_CONNECTIONS` | Maximum pool connections | `10` | Yes |
| `MCP_POOL_IDLE_TIMEOUT` | Idle connection timeout (ms) | `300000` | Yes |
| `MCP_POOL_ACQUIRE_TIMEOUT` | Connection acquire timeout (ms) | `10000` | Yes |

#### Logging & Monitoring

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MCP_LOG_LEVEL` | Log level | `info` | Yes |
| `MCP_LOG_REQUESTS` | Log all requests | `true` | Yes |
| `MCP_LOG_RESPONSES` | Log all responses | `false` | Yes |
| `MCP_METRICS_ENABLED` | Enable metrics collection | `true` | Yes |
| `MCP_METRICS_PORT` | Metrics server port | `9090` | Yes |
| `MCP_TRACE_ENABLED` | Enable distributed tracing | `false` | Yes |
| `MCP_TRACE_SAMPLE_RATE` | Trace sampling rate | `0.1` | Yes |

### Frontend Configuration

#### WebSocket Connection Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_MCP_ENABLED` | Enable MCP in frontend | `true` | Yes |
| `VITE_MCP_WS_ENDPOINT` | WebSocket endpoint | `ws://localhost:8765` | Yes |
| `VITE_MCP_WS_SECURE` | Use secure WebSocket (wss) | `false` | Yes |
| `VITE_MCP_WS_RECONNECT` | Enable auto-reconnect | `true` | Yes |
| `VITE_MCP_WS_RECONNECT_INTERVAL` | Reconnect interval (ms) | `5000` | Yes |
| `VITE_MCP_WS_MAX_RECONNECT_ATTEMPTS` | Max reconnect attempts | `10` | Yes |
| `VITE_MCP_WS_PING_INTERVAL` | Ping interval (ms) | `30000` | Yes |
| `VITE_MCP_WS_PONG_TIMEOUT` | Pong timeout (ms) | `10000` | Yes |

#### HTTP API Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_MCP_HTTP_ENDPOINT` | HTTP endpoint | `http://localhost:8765` | Yes |
| `VITE_MCP_HTTP_TIMEOUT` | HTTP request timeout (ms) | `30000` | Yes |
| `VITE_MCP_PUBLIC_API_KEY` | Public API key | - | No |
| `VITE_MCP_CLIENT_ID` | Client identifier | - | No |

#### Feature Flags

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_MCP_ENABLE_SEI_ADAPTER` | Enable Sei adapter features | `true` | Yes |
| `VITE_MCP_ENABLE_OMNISEARCH` | Enable search features | `true` | Yes |
| `VITE_MCP_ENABLE_PUPPETEER` | Enable browser automation | `true` | Yes |
| `VITE_MCP_ENABLE_REALTIME_SYNC` | Enable real-time sync | `true` | Yes |
| `VITE_MCP_ENABLE_OFFLINE_MODE` | Enable offline mode | `false` | Yes |

## Server Configuration

### WebSocket Server

```javascript
// Example WebSocket server configuration
const wsConfig = {
  host: process.env.MCP_SEI_ENDPOINT,
  port: 8765,
  path: '/mcp',
  perMessageDeflate: true,
  maxPayload: parseInt(process.env.MCP_SEI_MAX_MESSAGE_SIZE),
  verifyClient: (info, cb) => {
    // Implement authentication logic
    const token = info.req.headers.authorization;
    cb(validateToken(token));
  }
};
```

### HTTP Server

```javascript
// Example HTTP server configuration
const httpConfig = {
  baseURL: process.env.MCP_OMNISEARCH_ENDPOINT,
  timeout: parseInt(process.env.MCP_OMNISEARCH_REQUEST_TIMEOUT),
  headers: {
    'Authorization': `Bearer ${process.env.MCP_OMNISEARCH_API_KEY}`,
    'Content-Type': 'application/json'
  },
  retry: {
    retries: parseInt(process.env.MCP_DEFAULT_RETRY_ATTEMPTS),
    retryDelay: parseInt(process.env.MCP_DEFAULT_RETRY_DELAY)
  }
};
```

### stdio Server

```javascript
// Example stdio server configuration
const stdioConfig = {
  executablePath: process.env.MCP_PUPPETEER_EXECUTABLE_PATH,
  args: [
    '--headless=' + process.env.MCP_PUPPETEER_HEADLESS,
    '--no-sandbox=' + !process.env.MCP_PUPPETEER_SANDBOX
  ],
  env: {
    ...process.env,
    CHROME_PATH: process.env.MCP_PUPPETEER_BROWSER_PATH
  }
};
```

## Security Considerations

### API Key Management

1. **Never commit API keys to version control**
   - Use `.env` files for local development
   - Use environment variables in production
   - Rotate keys regularly

2. **Separate keys for different environments**
   ```
   # Development
   MCP_SEI_API_KEY=dev_sk_xxx
   
   # Production
   MCP_SEI_API_KEY=prod_sk_xxx
   ```

3. **Use least privilege principle**
   - Create separate API keys for different services
   - Grant only necessary permissions

### Network Security

1. **Use HTTPS/WSS in production**
   ```
   # Production configuration
   MCP_SEI_ENDPOINT=wss://mcp.seiron.app
   MCP_OMNISEARCH_ENDPOINT=https://search.seiron.app
   ```

2. **Implement CORS properly**
   ```
   MCP_CORS_ALLOWED_ORIGINS=https://seiron.app,https://www.seiron.app
   ```

3. **Enable rate limiting**
   ```
   MCP_RATE_LIMIT_ENABLED=true
   MCP_RATE_LIMIT_MAX_REQUESTS=100
   MCP_RATE_LIMIT_WINDOW_MS=60000
   ```

### Authentication

1. **Use strong authentication**
   ```
   MCP_AUTH_TYPE=bearer
   MCP_AUTH_HEADER_NAME=Authorization
   ```

2. **Implement token rotation**
   - Set token expiration
   - Implement refresh token mechanism

3. **Validate all inputs**
   - Sanitize incoming data
   - Validate message formats

## Setup Instructions

### Development Setup

1. **Copy environment files**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. **Configure MCP servers**
   - Start Sei MCP adapter on port 8765
   - Start omnisearch on port 8766
   - Install puppeteer MCP globally

3. **Set API keys**
   ```bash
   # Backend .env
   MCP_SEI_API_KEY=your_sei_api_key
   MCP_OMNISEARCH_TAVILY_API_KEY=your_tavily_key
   # ... other keys
   ```

4. **Start services**
   ```bash
   # Terminal 1: Start MCP servers
   npm run mcp:sei
   npm run mcp:omnisearch
   
   # Terminal 2: Start backend
   cd backend && npm run dev
   
   # Terminal 3: Start frontend
   cd frontend && npm run dev
   ```

### Production Setup

1. **Set environment variables in hosting platform**
   - Vercel: Project Settings > Environment Variables
   - Heroku: Config Vars
   - AWS: Parameter Store or Secrets Manager

2. **Configure secure endpoints**
   ```bash
   # Production URLs
   MCP_SEI_ENDPOINT=wss://mcp-sei.seiron.app
   MCP_OMNISEARCH_ENDPOINT=https://mcp-search.seiron.app
   ```

3. **Enable monitoring**
   ```bash
   MCP_METRICS_ENABLED=true
   MCP_TRACE_ENABLED=true
   MCP_LOG_LEVEL=warn
   ```

## Example Configurations

### Minimal Configuration (Development)

```bash
# Backend .env
MCP_ENABLED=true
MCP_SEI_ENDPOINT=ws://localhost:8765
MCP_OMNISEARCH_ENDPOINT=http://localhost:8766
MCP_PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/puppeteer-mcp

# Frontend .env
VITE_MCP_ENABLED=true
VITE_MCP_WS_ENDPOINT=ws://localhost:8765
```

### Full Production Configuration

```bash
# Backend .env
MCP_ENABLED=true
MCP_DEFAULT_TRANSPORT=websocket
MCP_DEFAULT_TIMEOUT=30000
MCP_DEFAULT_RETRY_ATTEMPTS=3
MCP_DEFAULT_RETRY_DELAY=1000

# Sei MCP Adapter
MCP_SEI_ENABLED=true
MCP_SEI_TRANSPORT=websocket
MCP_SEI_ENDPOINT=wss://mcp-sei.seiron.app
MCP_SEI_API_KEY=prod_sk_xxxxxxxxxxxx
MCP_SEI_CONNECTION_TIMEOUT=30000
MCP_SEI_REQUEST_TIMEOUT=60000
MCP_SEI_COMPRESSION_ENABLED=true

# omnisearch
MCP_OMNISEARCH_ENABLED=true
MCP_OMNISEARCH_TRANSPORT=http
MCP_OMNISEARCH_ENDPOINT=https://mcp-search.seiron.app
MCP_OMNISEARCH_API_KEY=prod_sk_yyyyyyyyyyyy
MCP_OMNISEARCH_TAVILY_API_KEY=tvly_xxxxxxxxxxxx
MCP_OMNISEARCH_REQUEST_TIMEOUT=120000

# Security
MCP_AUTH_TYPE=bearer
MCP_CORS_ENABLED=true
MCP_CORS_ALLOWED_ORIGINS=https://seiron.app,https://www.seiron.app
MCP_RATE_LIMIT_ENABLED=true
MCP_RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
MCP_LOG_LEVEL=warn
MCP_METRICS_ENABLED=true
MCP_TRACE_ENABLED=true
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if MCP servers are running
   - Verify port numbers
   - Check firewall settings

2. **Authentication Failed**
   - Verify API keys are correct
   - Check key permissions
   - Ensure proper header format

3. **Timeout Errors**
   - Increase timeout values
   - Check network latency
   - Verify server health

4. **WebSocket Connection Drops**
   - Enable heartbeat/ping-pong
   - Check proxy settings
   - Verify WebSocket support

### Debug Mode

Enable debug logging:

```bash
# Backend
MCP_LOG_LEVEL=debug
MCP_LOG_REQUESTS=true
MCP_LOG_RESPONSES=true

# Frontend
VITE_MCP_LOG_LEVEL=debug
VITE_MCP_LOG_TO_CONSOLE=true
```

### Health Checks

Implement health check endpoints:

```javascript
// Health check endpoint
app.get('/health/mcp', async (req, res) => {
  const health = {
    sei: await checkMCPServer('sei'),
    omnisearch: await checkMCPServer('omnisearch'),
    puppeteer: await checkMCPServer('puppeteer')
  };
  
  res.json(health);
});
```

## Additional Resources

- [MCP Protocol Documentation](https://modelcontextprotocol.io/docs)
- [WebSocket Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [API Security Guidelines](https://owasp.org/www-project-api-security/)