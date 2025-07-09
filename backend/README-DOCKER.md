# Running Seiron Backend with Docker

This guide explains how to run the Seiron backend locally using Docker.

## Prerequisites

- Docker Desktop installed
- Docker Compose installed
- API keys for OpenAI, Anthropic, and ElevenLabs

## Quick Start

1. **Copy environment variables**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit `.env` file and add your API keys**
   ```
   OPENAI_API_KEY=your-openai-api-key
   ANTHROPIC_API_KEY=your-anthropic-api-key
   ELEVENLABS_API_KEY=your-elevenlabs-api-key
   ```

3. **Start the backend with Docker Compose**
   ```bash
   # From the project root directory
   docker-compose -f docker-compose.local.yml up -d
   ```

4. **Check if services are running**
   ```bash
   docker-compose -f docker-compose.local.yml ps
   ```

5. **View logs**
   ```bash
   # All services
   docker-compose -f docker-compose.local.yml logs -f

   # Just backend
   docker-compose -f docker-compose.local.yml logs -f backend
   ```

6. **Update frontend to use local backend**
   ```bash
   # In frontend directory, create .env.local
   echo "VITE_API_URL=http://localhost:8000" > frontend/.env.local
   ```

## Services

The Docker setup includes:

- **Backend API**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Common Commands

```bash
# Start services
docker-compose -f docker-compose.local.yml up -d

# Stop services
docker-compose -f docker-compose.local.yml down

# Rebuild backend after code changes
docker-compose -f docker-compose.local.yml build backend

# View logs
docker-compose -f docker-compose.local.yml logs -f backend

# Run database migrations
docker-compose -f docker-compose.local.yml exec backend npm run migrate

# Access backend shell
docker-compose -f docker-compose.local.yml exec backend sh
```

## Troubleshooting

1. **Port conflicts**: If ports are already in use, modify the port mappings in `docker-compose.local.yml`

2. **Database connection issues**: Ensure PostgreSQL is fully started before the backend:
   ```bash
   docker-compose -f docker-compose.local.yml restart backend
   ```

3. **API key errors**: Make sure all required API keys are set in your `.env` file

4. **Clean restart**:
   ```bash
   docker-compose -f docker-compose.local.yml down -v
   docker-compose -f docker-compose.local.yml up -d --build
   ```

## Development Workflow

1. The backend volume is mounted, so code changes will auto-reload
2. Frontend runs separately with Vite at http://localhost:5173
3. API calls from frontend will go to http://localhost:8000

## Production Deployment

For production, use the main `docker-compose.yml` file which includes additional services like Prometheus and Grafana for monitoring.