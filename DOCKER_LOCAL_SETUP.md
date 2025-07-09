# Local Docker Setup for Seiron Backend

## Quick Start

1. **Start the backend services:**
   ```bash
   docker-compose -f docker-compose.local.yml up -d
   ```

2. **Check services status:**
   ```bash
   docker-compose -f docker-compose.local.yml ps
   ```

3. **View backend logs:**
   ```bash
   docker logs -f seiron-backend-local
   ```

## Services Running

- **Backend API**: http://localhost:8000
- **PostgreSQL**: localhost:5432 (user: seiron, password: seiron123, db: seiron_dev)
- **Redis**: localhost:6379

## Frontend Configuration

The frontend is already configured to use the local backend via `.env.local`:
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## Common Commands

```bash
# Stop all services
docker-compose -f docker-compose.local.yml down

# Rebuild backend after code changes
docker-compose -f docker-compose.local.yml up -d --build backend

# View logs for all services
docker-compose -f docker-compose.local.yml logs -f

# Access backend shell
docker-compose -f docker-compose.local.yml exec backend sh

# Reset everything (including volumes)
docker-compose -f docker-compose.local.yml down -v
```

## Notes

- The backend code is mounted as a volume, so changes will auto-reload via nodemon
- API keys need to be added to backend/.env file
- The backend runs on port 8000 locally (mapped from container port 3001)