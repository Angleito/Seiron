# Docker Development Environment for Seiron Frontend

This document describes the Docker-based development environment for the Seiron frontend application.

## Overview

The Docker development environment provides:
- **Hot Module Replacement (HMR)**: Code changes are reflected instantly in the browser
- **Consistent Environment**: Same Node.js version and dependencies across all developers
- **Isolated Dependencies**: No need to install Node.js or npm locally
- **Easy Setup**: Single command to start development
- **Performance Optimized**: Caching strategies for faster rebuilds

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Git
- A code editor (VS Code recommended)

## Quick Start

1. **Clone the repository** (if not already done)
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Start the development environment**
   ```bash
   ./docker-dev.sh up
   ```

3. **Access the application**
   - Open http://localhost:3000 in your browser
   - The application will automatically reload when you save changes

## Available Commands

Use the `docker-dev.sh` script for common tasks:

```bash
# Start the development environment
./docker-dev.sh up

# Stop the development environment
./docker-dev.sh down

# View logs
./docker-dev.sh logs

# Open a shell in the container
./docker-dev.sh shell

# Install a new npm package
./docker-dev.sh install axios

# Run tests
./docker-dev.sh test

# Run linting
./docker-dev.sh lint

# Rebuild the Docker image
./docker-dev.sh build

# Clean up everything (containers, volumes, images)
./docker-dev.sh clean
```

## Manual Docker Compose Commands

If you prefer using docker-compose directly:

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Rebuild after Dockerfile changes
docker-compose -f docker-compose.dev.yml build

# Execute commands in the container
docker-compose -f docker-compose.dev.yml exec frontend npm test
```

## Environment Variables

Create a `.env` file in the frontend directory with your environment variables:

```env
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# Voice Integration (Optional)
NEXT_PUBLIC_ELEVENLABS_API_KEY=your-api-key
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=your-voice-id
NEXT_PUBLIC_VOICE_ENABLED=true
```

## File Structure

```
frontend/
├── Dockerfile.dev          # Development Dockerfile
├── docker-compose.dev.yml  # Main Docker Compose configuration
├── docker-compose.override.yml # Optional overrides
├── .dockerignore          # Files to exclude from Docker context
├── docker-dev.sh          # Helper script
└── DOCKER_DEV_README.md   # This file
```

## Features

### Hot Module Replacement (HMR)
- Changes to React components update instantly
- CSS changes apply without page reload
- TypeScript compilation happens automatically

### Volume Mounts
- Source code is mounted from host to container
- `node_modules` is preserved in the container for performance
- Cache directory for faster rebuilds

### Health Checks
- Automatic health monitoring of the development server
- Container restarts if the server becomes unresponsive

### Security
- Runs as non-root user inside the container
- Minimal Alpine Linux base image
- Only necessary ports exposed

## Troubleshooting

### Port Already in Use
If port 3000 is already in use:
```bash
# Change the port in docker-compose.dev.yml
ports:
  - "3001:3000"  # Use port 3001 on host
```

### Slow File Watching on Windows/macOS
File watching uses polling in Docker. If it's slow:
1. Ensure `CHOKIDAR_USEPOLLING=true` is set (already configured)
2. Consider using WSL2 on Windows for better performance

### Permission Issues
If you encounter permission errors:
```bash
# Fix ownership of files
docker-compose -f docker-compose.dev.yml exec frontend chown -R nodejs:nodejs /app
```

### Node Modules Issues
If dependencies are out of sync:
```bash
# Rebuild without cache
./docker-dev.sh build

# Or manually remove volumes
docker-compose -f docker-compose.dev.yml down -v
```

## Performance Tips

1. **Use `.dockerignore`**: Excludes unnecessary files from Docker context
2. **Layer Caching**: Dockerfile is optimized for layer caching
3. **Named Volumes**: `node_modules` uses a named volume for speed
4. **Memory Allocation**: Increased Node.js memory limit to 4GB

## VSCode Integration

For the best development experience with VSCode:

1. Install the "Remote - Containers" extension
2. Open the command palette (Cmd/Ctrl + Shift + P)
3. Select "Remote-Containers: Attach to Running Container"
4. Choose the frontend container

This allows you to:
- Use VSCode's debugger
- Access terminal inside the container
- Install extensions that run in the container

## Debugging

### Node.js Debugging
The container exposes port 9229 for debugging:

1. Add breakpoints in your code
2. In VSCode, go to Run and Debug
3. Select "Docker: Attach to Node"
4. Start debugging

### Browser DevTools
- React DevTools work normally
- Vite's error overlay shows detailed error messages
- Source maps are enabled for easy debugging

## Production Build

To test a production build locally:
```bash
# Build for production
docker build -f Dockerfile -t seiron-frontend:prod .

# Run production build
docker run -p 3000:3000 seiron-frontend:prod
```

## Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)