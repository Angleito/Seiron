#!/bin/bash

# Docker startup script for AI Portfolio Manager

echo "🚀 Starting AI Portfolio Manager with Docker..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your configuration before continuing."
    echo "   Required: WALLET_ADDRESS, PRIVATE_KEY, OPENAI_API_KEY"
    exit 1
fi

# Create necessary directories
mkdir -p cache logs monitoring/grafana/dashboards monitoring/grafana/datasources

# Build and start containers
echo "🔨 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
docker-compose ps

# Show logs
echo "📋 Service logs:"
docker-compose logs --tail=50 api

echo "✅ AI Portfolio Manager is running!"
echo "   - Frontend: http://localhost:3000"
echo "   - API: http://localhost:3001"
echo "   - Redis: localhost:6379"
echo "   - Prometheus: http://localhost:9090"
echo "   - Grafana: http://localhost:3030 (admin/admin)"

echo "📊 To view logs: docker-compose logs -f [service]"
echo "🛑 To stop: docker-compose down"