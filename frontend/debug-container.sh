#!/bin/bash

# Seiron Frontend Docker Debug Helper
echo "🐉 Seiron Frontend Docker Debug Helper"
echo "======================================"

CONTAINER_NAME="frontend-frontend-1"

case "${1:-status}" in
  "status"|"s")
    echo "📊 Container Status:"
    docker ps -f name=$CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "📈 Resource Usage:"
    docker stats $CONTAINER_NAME --no-stream
    ;;
    
  "logs"|"l")
    echo "📋 Recent Logs:"
    docker logs $CONTAINER_NAME --tail 20 --follow
    ;;
    
  "shell"|"sh")
    echo "🔧 Opening shell in container..."
    docker exec -it $CONTAINER_NAME /bin/sh
    ;;
    
  "restart"|"r")
    echo "🔄 Restarting container..."
    docker-compose -f docker-compose.dev.yml restart
    ;;
    
  "test"|"t")
    echo "🧪 Testing container accessibility:"
    echo "- Checking port 3000..."
    curl -I http://localhost:3000 2>/dev/null && echo "✅ Port 3000 accessible" || echo "❌ Port 3000 not accessible"
    echo "- Checking Vite HMR client..."
    curl -s http://localhost:3000/@vite/client | head -n 1 | grep -q "import" && echo "✅ Vite HMR working" || echo "❌ Vite HMR not working"
    echo "- Checking React app..."
    curl -s http://localhost:3000 | grep -q -i "react\|seiron" && echo "✅ React app loading" || echo "❌ React app not loading"
    ;;
    
  "debug"|"d")
    echo "🐛 Debug Information:"
    echo "Container processes:"
    docker exec $CONTAINER_NAME ps aux
    echo ""
    echo "Network connections:"
    docker exec $CONTAINER_NAME netstat -tlnp 2>/dev/null || echo "netstat not available"
    echo ""
    echo "Environment variables:"
    docker exec $CONTAINER_NAME env | grep -E "(NODE_ENV|VITE_|PORT)" | sort
    ;;
    
  "help"|"h"|*)
    echo "Available commands:"
    echo "  status|s    - Show container status and resource usage"
    echo "  logs|l      - Show and follow container logs"
    echo "  shell|sh    - Open shell in container"
    echo "  restart|r   - Restart the container"
    echo "  test|t      - Test container accessibility"
    echo "  debug|d     - Show debug information"
    echo "  help|h      - Show this help"
    echo ""
    echo "Usage: ./debug-container.sh [command]"
    echo "Example: ./debug-container.sh status"
    ;;
esac