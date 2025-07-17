#!/bin/bash

# Seiron Docker Setup Script
# This script sets up and runs the Seiron backend with Docker Compose
# Includes ngrok integration for Vercel testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
DOCKER_COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker Desktop first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
}

# Check if ngrok is installed
check_ngrok() {
    if ! command -v ngrok &> /dev/null; then
        print_warning "ngrok is not installed. Voice testing with Vercel will not be available."
        print_warning "Install ngrok from https://ngrok.com/download for full functionality."
        return 1
    fi
    return 0
}

# Create .env file if it doesn't exist
create_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        print_status "Creating .env file..."
        cat > "$ENV_FILE" << EOF
# Database Configuration
DATABASE_URL=postgres://seiron_user:seiron_password@db:5432/seiron

# Redis Configuration
REDIS_URL=redis://redis:6379

# OpenAI Configuration
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# ElevenLabs Configuration
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
ELEVENLABS_MODEL=eleven_monolingual_v1
ELEVENLABS_VOICE_STABILITY=0.5
ELEVENLABS_VOICE_SIMILARITY=0.8
ELEVENLABS_VOICE_STYLE=0.0
ELEVENLABS_VOICE_BOOST=true

# Supabase Configuration
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# SEI Network Configuration
SEI_RPC_URL=https://sei-rpc.polkachu.com
SEI_EVM_RPC_URL=https://evm-rpc.sei-apis.com
SEI_CHAIN_ID=sei-testnet

# Adapter Configuration
HIVE_BASE_URL=http://localhost:3001
HIVE_API_KEY=
SAK_WALLET_PRIVATE_KEY=
MCP_ENDPOINT=ws://localhost:3003
MCP_PORT=3003
MCP_API_KEY=

# Ngrok Configuration
NGROK_AUTHTOKEN=
NGROK_REGION=us
EOF
        print_warning "Created .env file. Please fill in your API keys before running the services."
    fi
}

# Validate required environment variables
validate_env() {
    source "$ENV_FILE"
    
    local required_vars=("OPENAI_API_KEY" "ELEVENLABS_API_KEY")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            print_error "  - $var"
        done
        print_error "Please update your .env file with the required API keys."
        exit 1
    fi
}

# Start Docker services
start_services() {
    print_header "Starting Docker Services"
    
    # Start core services
    print_status "Starting database and Redis..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d db redis
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Start backend
    print_status "Starting backend service..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d backend
    
    # Wait for backend to be ready
    print_status "Waiting for backend to be ready..."
    sleep 20
    
    # Check if voice testing is enabled
    if [ "$1" = "--with-voice-test" ]; then
        print_status "Starting voice testing service..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" --profile voice-testing up -d voice-test
    fi
    
    print_status "All services started successfully!"
}

# Start ngrok tunnel
start_ngrok() {
    if ! check_ngrok; then
        return 1
    fi
    
    source "$ENV_FILE"
    
    if [ -n "$NGROK_AUTHTOKEN" ]; then
        print_status "Configuring ngrok with authtoken..."
        ngrok config add-authtoken "$NGROK_AUTHTOKEN"
    fi
    
    print_status "Starting ngrok tunnel for backend (port 3001)..."
    ngrok http 3001 --region="${NGROK_REGION:-us}" > /dev/null 2>&1 &
    NGROK_PID=$!
    
    # Wait for ngrok to start
    sleep 5
    
    # Get ngrok URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | cut -d'"' -f4 | head -1)
    
    if [ -n "$NGROK_URL" ]; then
        print_status "Ngrok tunnel started: $NGROK_URL"
        echo "$NGROK_URL" > .ngrok_url
        
        # Create Vercel environment file
        cat > .vercel.env << EOF
VITE_API_URL=$NGROK_URL
VITE_ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY
EOF
        print_status "Created .vercel.env file for Vercel deployment"
    else
        print_error "Failed to get ngrok URL"
        kill $NGROK_PID 2>/dev/null || true
        return 1
    fi
    
    return 0
}

# Stop all services
stop_services() {
    print_header "Stopping Services"
    
    # Stop ngrok if running
    if [ -f .ngrok_url ]; then
        print_status "Stopping ngrok tunnel..."
        pkill -f "ngrok" || true
        rm -f .ngrok_url .vercel.env
    fi
    
    # Stop Docker services
    print_status "Stopping Docker services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    print_status "All services stopped."
}

# Show service status
show_status() {
    print_header "Service Status"
    
    echo "Docker Services:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    echo ""
    echo "Service URLs:"
    echo "  Backend API: http://localhost:3001"
    echo "  Database: localhost:5432 (seiron/seiron_user)"
    echo "  Redis: localhost:6379"
    echo "  Voice Test: http://localhost:3002 (if enabled)"
    
    if [ -f .ngrok_url ]; then
        NGROK_URL=$(cat .ngrok_url)
        echo "  Ngrok Tunnel: $NGROK_URL"
    fi
    
    echo ""
    echo "Health Checks:"
    echo "  Backend: curl http://localhost:3001/health"
    echo "  Voice API: curl http://localhost:3001/api/voice/config"
}

# Show logs
show_logs() {
    local service=${1:-backend}
    print_status "Showing logs for $service (press Ctrl+C to exit)"
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f "$service"
}

# Clean up everything
cleanup() {
    print_header "Cleaning Up"
    
    # Stop services
    stop_services
    
    # Remove volumes
    print_status "Removing volumes..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down -v
    
    # Remove images
    if [ "$1" = "--remove-images" ]; then
        print_status "Removing images..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down --rmi all
    fi
    
    print_status "Cleanup complete."
}

# Test voice API
test_voice_api() {
    print_header "Testing Voice API"
    
    if ! curl -s http://localhost:3001/health > /dev/null; then
        print_error "Backend is not running. Please start services first."
        exit 1
    fi
    
    print_status "Testing voice configuration..."
    curl -s http://localhost:3001/api/voice/config | python3 -m json.tool || {
        print_error "Voice API test failed"
        exit 1
    }
    
    print_status "Voice API test completed successfully!"
}

# Main script logic
main() {
    case "$1" in
        "start")
            check_docker
            create_env_file
            validate_env
            start_services "$2"
            ;;
        "stop")
            stop_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$2"
            ;;
        "cleanup")
            cleanup "$2"
            ;;
        "ngrok")
            start_ngrok
            ;;
        "test-voice")
            test_voice_api
            ;;
        "dev")
            check_docker
            create_env_file
            validate_env
            start_services "--with-voice-test"
            if start_ngrok; then
                show_status
            fi
            ;;
        *)
            echo "Usage: $0 {start|stop|status|logs|cleanup|ngrok|test-voice|dev}"
            echo ""
            echo "Commands:"
            echo "  start [--with-voice-test]  Start Docker services"
            echo "  stop                       Stop all services"
            echo "  status                     Show service status"
            echo "  logs [service]             Show logs for a service"
            echo "  cleanup [--remove-images]  Clean up containers and volumes"
            echo "  ngrok                      Start ngrok tunnel"
            echo "  test-voice                 Test voice API endpoints"
            echo "  dev                        Start full development environment with ngrok"
            echo ""
            echo "Examples:"
            echo "  $0 start                   # Start basic services"
            echo "  $0 start --with-voice-test # Start with voice testing"
            echo "  $0 dev                     # Start full dev environment"
            echo "  $0 logs backend            # Show backend logs"
            echo "  $0 cleanup --remove-images # Full cleanup"
            exit 1
            ;;
    esac
}

main "$@"