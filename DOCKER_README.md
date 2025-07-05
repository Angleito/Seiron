# Seiron Docker Setup

This document describes the Docker configuration for the Seiron project after the consolidation and cleanup.

## Overview

The Docker setup has been simplified and consolidated to maintain only essential configurations:

### Docker Files Structure

```
/
├── docker-compose.yml         # Production configuration
├── docker-compose.dev.yml     # Development configuration
├── docker-compose.test.yml    # Testing configuration
├── backend/
│   └── Dockerfile            # Multi-stage Dockerfile (dev/test/prod)
└── frontend/
    ├── Dockerfile            # Production build
    └── Dockerfile.dev        # Development with Vite HMR
```

## Usage

### Development

Start the development environment with hot-reloading:

```bash
docker-compose -f docker-compose.dev.yml up
```

This will:
- Start Redis on port 6379
- Start backend API on port 3001 with nodemon
- Start frontend on port 3000 with Vite HMR
- Mount source directories for live code updates

### Production

Build and run production containers:

```bash
docker-compose up --build
```

This will:
- Build optimized production images
- Start all services with production configurations
- Include optional monitoring (Prometheus & Grafana)

### Testing

Run tests in isolated containers:

```bash
docker-compose -f docker-compose.test.yml up
```

This will:
- Run backend tests with coverage
- Run frontend tests with coverage
- Use separate Redis instance on port 6380

## Environment Variables

### Backend
- `NODE_ENV` - Environment (development/production/test)
- `API_PORT` - Backend API port (default: 3001)
- `REDIS_URL` - Redis connection URL
- `SEI_RPC_URL` - Sei blockchain RPC endpoint
- `WALLET_ADDRESS` - Wallet address for transactions
- `PRIVATE_KEY` - Private key for signing
- `DEBUG` - Debug namespace (seiron:*)

### Frontend
- `NODE_ENV` - Environment (development/production/test)
- `VITE_API_URL` - Backend API URL
- `VITE_WS_URL` - WebSocket URL
- `VITE_PRIVY_APP_ID` - Privy authentication app ID
- `VITE_PRIVY_CLIENT_ID` - Privy client ID
- `VITE_WALLETCONNECT_PROJECT_ID` - WalletConnect project ID
- `VITE_SEI_RPC_URL` - Sei RPC URL
- `VITE_ORCHESTRATOR_API` - Orchestrator API URL
- `VITE_ORCHESTRATOR_WS` - Orchestrator WebSocket URL
- `VITE_ELEVENLABS_API_KEY` - ElevenLabs API key for TTS
- `VITE_ELEVENLABS_VOICE_ID` - Voice ID for Dragon character
- `VITE_VOICE_ENABLED` - Enable/disable voice features

## Container Names

All containers follow the naming convention: `seiron-{service}[-{env}]`

- `seiron-redis` / `seiron-redis-dev` / `seiron-redis-test`
- `seiron-backend` / `seiron-backend-dev` / `seiron-backend-test`
- `seiron-frontend` / `seiron-frontend-dev` / `seiron-frontend-test`
- `seiron-prometheus` (production only)
- `seiron-grafana` (production only)

## Networks

- Production: `seiron-network`
- Development: `seiron-network-dev`
- Testing: `seiron-network-test`

## Volumes

- `redis-data` - Redis persistence
- `prometheus-data` - Prometheus metrics storage
- `grafana-data` - Grafana dashboards and settings

## Migration Notes

The following files were removed during consolidation:
- Root-level specialized Dockerfiles (test, performance, simulator, etc.)
- Duplicate docker-compose files in backend directory
- Outdated test infrastructure files
- docker-startup.sh script

All functionality has been preserved through the multi-stage Dockerfiles and three main docker-compose configurations.