#!/bin/bash

# Stop MCP Servers

echo "🛑 Stopping MCP Servers..."

docker-compose -f docker-compose.mcp.yml down

echo "✅ MCP Servers stopped."
echo ""
echo "To remove volumes and clean up completely:"
echo "  docker-compose -f docker-compose.mcp.yml down -v"