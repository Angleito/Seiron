#!/bin/bash

# Start MCP Servers with Docker Compose

set -e

echo "🚀 Starting MCP Servers for Seiron..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please create one with your API keys."
    echo ""
    echo "📝 Steps to create .env file:"
    echo "   1. cp backend/.env.example .env"
    echo "   2. Edit .env and add your API keys"
    echo ""
    echo "   Required keys:"
    echo "   - HIVE_INTELLIGENCE_API_KEY (get from Hive Intelligence)"
    echo "   - SEI_WALLET_MNEMONIC (optional, for write operations)"
    echo "   - PORTFOLIO_API_KEY"
    echo "   - COINGECKO_API_KEY"
    echo ""
    echo "⚠️  NEVER commit .env file to git! It's in .gitignore for security."
    exit 1
fi

# Check if HIVE_INTELLIGENCE_API_KEY is set
source .env
if [ -z "$HIVE_INTELLIGENCE_API_KEY" ] || [ "$HIVE_INTELLIGENCE_API_KEY" = "your_hive_intelligence_api_key_here" ]; then
    echo "⚠️  HIVE_INTELLIGENCE_API_KEY not configured in .env file"
    echo "   Please add your Hive Intelligence API key to .env"
    exit 1
fi

# Create log directories
echo "📁 Creating log directories..."
mkdir -p mcp-servers/logs/{hive,sei,portfolio}

# Install MCP server dependencies
echo "📦 Installing MCP server dependencies..."
cd mcp-servers
npm install
cd ..

# Build and start the services
echo "🐳 Starting Docker containers..."
docker-compose -f docker-compose.mcp.yml up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service status
echo "🔍 Checking service status..."
docker-compose -f docker-compose.mcp.yml ps

# Show logs
echo "📋 Recent logs from MCP servers:"
echo "=== Hive Intelligence MCP ==="
docker-compose -f docker-compose.mcp.yml logs --tail=10 hive-intelligence-mcp
echo ""
echo "=== SEI Blockchain MCP ==="
docker-compose -f docker-compose.mcp.yml logs --tail=10 sei-blockchain-mcp
echo ""
echo "=== Portfolio Manager MCP ==="
docker-compose -f docker-compose.mcp.yml logs --tail=10 portfolio-manager-mcp

echo ""
echo "✅ MCP Servers are running!"
echo ""
echo "📡 Available endpoints:"
echo "   - Hive Intelligence: http://localhost:8765 (ws://localhost:8765)"
echo "   - SEI Blockchain: http://localhost:8766 (ws://localhost:8766)"
echo "   - Portfolio Manager: http://localhost:8767 (ws://localhost:8767)"
echo "   - MCP Gateway: http://localhost:8760"
echo ""
echo "🔗 Gateway routes:"
echo "   - http://localhost:8760/mcp/hive/"
echo "   - http://localhost:8760/mcp/sei/"
echo "   - http://localhost:8760/mcp/portfolio/"
echo ""
echo "📝 To view logs:"
echo "   docker-compose -f docker-compose.mcp.yml logs -f [service-name]"
echo ""
echo "🛑 To stop servers:"
echo "   docker-compose -f docker-compose.mcp.yml down"