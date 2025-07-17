# Seiron Docker Setup Guide

This guide provides comprehensive instructions for running the Seiron AI Dragon Trading Assistant using Docker, including local development, voice feature testing, and Vercel integration.

## 🚀 Quick Start

1. **Clone and navigate to the project**:
   ```bash
   git clone <repository-url>
   cd Seiron
   ```

2. **Run the setup script**:
   ```bash
   ./docker-setup.sh dev
   ```

3. **Access the services**:
   - Backend API: http://localhost:3001
   - Voice Testing: http://localhost:3002
   - Ngrok Tunnel: (URL will be displayed)

## 📋 Prerequisites

- Docker Desktop (version 20.10+)
- Docker Compose (version 2.0+)
- ngrok (optional, for Vercel integration)
- API Keys for:
  - OpenAI
  - ElevenLabs
  - Supabase (optional)

## 🛠️ Installation

### 1. Install Docker Desktop

Download and install Docker Desktop from https://www.docker.com/products/docker-desktop

### 2. Install ngrok (Optional)

For Vercel integration and public tunneling:
```bash
# macOS with Homebrew
brew install ngrok

# Or download from https://ngrok.com/download
```

### 3. Get API Keys

You'll need the following API keys:

- **OpenAI**: https://platform.openai.com/api-keys
- **ElevenLabs**: https://elevenlabs.io/app/speech-synthesis
- **Supabase**: https://supabase.com/dashboard (optional)

## 🔧 Configuration

### Environment Variables

The setup script will create a `.env` file with the following variables:

```env
# Required API Keys
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Optional Configuration
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
ELEVENLABS_MODEL=eleven_monolingual_v1
ELEVENLABS_VOICE_STABILITY=0.5
ELEVENLABS_VOICE_SIMILARITY=0.8

# Database (auto-configured)
DATABASE_URL=postgres://seiron_user:seiron_password@db:5432/seiron
REDIS_URL=redis://redis:6379

# Supabase (optional)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Ngrok (optional)
NGROK_AUTHTOKEN=your_ngrok_authtoken
NGROK_REGION=us
```

### Voice Configuration

The voice system uses ElevenLabs for text-to-speech. Configure these settings:

- **Voice ID**: Choose from ElevenLabs voice library
- **Model**: `eleven_monolingual_v1` (default) or `eleven_multilingual_v1`
- **Stability**: 0.0-1.0 (0.5 default)
- **Similarity**: 0.0-1.0 (0.8 default)
- **Style**: 0.0-1.0 (0.0 default)
- **Voice Boost**: true/false (true default)

## 🚀 Usage

### Docker Setup Script Commands

```bash
# Start full development environment
./docker-setup.sh dev

# Start basic services only
./docker-setup.sh start

# Start with voice testing service
./docker-setup.sh start --with-voice-test

# Stop all services
./docker-setup.sh stop

# Show service status
./docker-setup.sh status

# Show logs for a service
./docker-setup.sh logs [service]

# Start ngrok tunnel
./docker-setup.sh ngrok

# Test voice API endpoints
./docker-setup.sh test-voice

# Clean up containers and volumes
./docker-setup.sh cleanup

# Full cleanup including images
./docker-setup.sh cleanup --remove-images
```

### Manual Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# Start with voice testing profile
docker-compose --profile voice-testing up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Full cleanup
docker-compose down -v --rmi all
```

## 🎯 Services Overview

### Core Services

1. **Database (PostgreSQL 15)**
   - Port: 5432
   - Database: seiron
   - User: seiron_user
   - Password: seiron_password

2. **Redis Cache**
   - Port: 6379
   - No authentication
   - Data persistence enabled

3. **Backend API**
   - Port: 3001
   - Hot-reload enabled for development
   - Health check: `/health`

### Optional Services

4. **Voice Testing Service**
   - Port: 3002
   - Audio simulation and testing
   - Enabled with `--profile voice-testing`

5. **Nginx (Production)**
   - Ports: 80, 443
   - Reverse proxy
   - Enabled with `--profile production`

## 🗣️ Voice Features Testing

### Local Voice Testing

1. **Start voice testing service**:
   ```bash
   ./docker-setup.sh start --with-voice-test
   ```

2. **Test voice configuration**:
   ```bash
   curl http://localhost:3001/api/voice/config | jq
   ```

3. **Test voice synthesis**:
   ```bash
   curl -X POST http://localhost:3001/api/voice/synthesize \
     -H "Content-Type: application/json" \
     -d '{"text": "Hello, I am Seiron, your AI dragon assistant.", "voice_id": "EXAVITQu4vr4xnSDxMaL"}' \
     --output test_audio.mp3
   ```

### Voice Testing with Frontend

1. **Access voice testing interface**:
   ```
   http://localhost:3002
   ```

2. **Test audio recording**:
   ```bash
   curl -X POST http://localhost:3002/api/test/audio \
     -H "Content-Type: application/json" \
     -d '{"duration": 5}'
   ```

## 🌐 Vercel Integration

### Setting up Ngrok for Vercel

1. **Get ngrok authtoken**:
   ```bash
   ngrok authtoken your_authtoken_here
   ```

2. **Start ngrok tunnel**:
   ```bash
   ./docker-setup.sh ngrok
   ```

3. **Use the ngrok URL in your Vercel environment**:
   ```bash
   # The script creates .vercel.env automatically
   cat .vercel.env
   ```

### Vercel Environment Variables

Add these to your Vercel project:

```env
VITE_API_URL=https://your-ngrok-url.ngrok.io
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### Testing Voice with Vercel

1. **Deploy to Vercel**:
   ```bash
   vercel --env-file .vercel.env
   ```

2. **Test voice endpoint**:
   ```bash
   curl https://your-vercel-app.vercel.app/api/voice/synthesize \
     -H "Content-Type: application/json" \
     -d '{"text": "Testing voice from Vercel"}'
   ```

## 🔍 Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using the port
   lsof -i :3001
   # Kill the process or change port in docker-compose.yml
   ```

2. **Database connection issues**:
   ```bash
   # Restart backend after database is ready
   docker-compose restart backend
   ```

3. **Voice API not working**:
   ```bash
   # Check ElevenLabs API key
   ./docker-setup.sh test-voice
   
   # Check logs
   ./docker-setup.sh logs backend
   ```

4. **Ngrok tunnel issues**:
   ```bash
   # Check ngrok status
   curl http://localhost:4040/api/tunnels
   
   # Restart ngrok
   pkill ngrok
   ./docker-setup.sh ngrok
   ```

### Debug Commands

```bash
# Check container health
docker-compose ps

# Inspect a service
docker-compose exec backend sh

# Check database connection
docker-compose exec db psql -U seiron_user -d seiron -c "SELECT 1"

# Test Redis connection
docker-compose exec redis redis-cli ping

# View all logs
docker-compose logs

# Monitor resource usage
docker stats
```

### Performance Optimization

1. **Database optimization**:
   - The database includes health checks and proper indexing
   - Persistent volumes for data retention

2. **Redis optimization**:
   - Configured with appropriate memory limits
   - Data persistence enabled

3. **Backend optimization**:
   - Hot-reload for development
   - Production-ready Docker build stages
   - Proper health checks

## 📊 Monitoring

### Health Checks

All services include health checks:

```bash
# Backend health
curl http://localhost:3001/health

# Database health
docker-compose exec db pg_isready -U seiron_user

# Redis health
docker-compose exec redis redis-cli ping
```

### Logs

Access logs for debugging:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Follow new logs
docker-compose logs -f --tail=100 backend
```

## 🚀 Production Deployment

### Production Configuration

1. **Enable production profile**:
   ```bash
   docker-compose --profile production up -d
   ```

2. **Set production environment variables**:
   ```env
   NODE_ENV=production
   DATABASE_URL=your_production_db_url
   REDIS_URL=your_production_redis_url
   ```

3. **Configure SSL**:
   - Place SSL certificates in `./ssl/` directory
   - Update nginx configuration

### Security Best Practices

1. **Environment variables**:
   - Never commit `.env` files
   - Use secrets management in production

2. **Network security**:
   - Custom Docker network isolation
   - Firewall rules for production

3. **Database security**:
   - Strong passwords
   - SSL connections
   - Regular backups

## 🤝 Contributing

1. **Development setup**:
   ```bash
   ./docker-setup.sh dev
   ```

2. **Run tests**:
   ```bash
   docker-compose exec backend npm test
   ```

3. **Code changes**:
   - Backend changes auto-reload
   - Frontend runs separately with Vite

## 📚 API Documentation

### Voice API Endpoints

#### Get Voice Configuration
```bash
GET /api/voice/config
```

#### Synthesize Speech
```bash
POST /api/voice/synthesize
Content-Type: application/json

{
  "text": "Hello world",
  "voice_id": "EXAVITQu4vr4xnSDxMaL",
  "model": "eleven_monolingual_v1",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.8,
    "style": 0.0,
    "use_speaker_boost": true
  }
}
```

### Chat API Endpoints

#### Send Message
```bash
POST /api/chat/orchestrate
Content-Type: application/json

{
  "message": "Show me my portfolio",
  "walletAddress": "0x123...",
  "sessionId": "session_123"
}
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Review Docker logs: `./docker-setup.sh logs backend`
3. Open an issue on GitHub
4. Check the voice testing guide for voice-specific issues

---

**Happy coding with Seiron! 🐉**