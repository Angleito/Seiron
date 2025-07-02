#!/bin/bash

# Sei AI Portfolio Manager Backend Startup Script

echo "🚀 Starting Sei AI Portfolio Manager Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "📝 Please update .env file with your configuration values"
fi

# Check if logs directory exists
if [ ! -d logs ]; then
    echo "📁 Creating logs directory..."
    mkdir -p logs
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if Redis is running (optional)
echo "🔍 Checking Redis connection..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis is not running. Some features may not work."
        echo "   Start Redis with: redis-server"
    fi
else
    echo "⚠️  Redis CLI not found. Install Redis for caching features."
fi

# Start the development server
echo "🌟 Starting development server..."
npm run dev