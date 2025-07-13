#!/bin/bash

# Docker development environment helper script for Seiron frontend

set -e

COMPOSE_FILE="docker-compose.dev.yml"
PROJECT_NAME="seiron-frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_help() {
    echo "Seiron Frontend Docker Development Environment"
    echo ""
    echo "Usage: ./docker-dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  up        Start the development environment"
    echo "  down      Stop the development environment"
    echo "  restart   Restart the development environment"
    echo "  logs      View container logs"
    echo "  shell     Open a shell in the frontend container"
    echo "  install   Install npm packages in the container"
    echo "  build     Rebuild the Docker image"
    echo "  clean     Remove containers, volumes, and images"
    echo "  status    Show container status"
    echo "  test      Run tests in the container"
    echo "  lint      Run linting in the container"
    echo ""
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
}

# Main command handling
case "$1" in
    up)
        check_docker
        echo -e "${GREEN}Starting Seiron frontend development environment...${NC}"
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d
        echo -e "${GREEN}Frontend is running at http://localhost:3000${NC}"
        echo -e "${YELLOW}Run './docker-dev.sh logs' to view logs${NC}"
        ;;
    
    down)
        check_docker
        echo -e "${YELLOW}Stopping Seiron frontend development environment...${NC}"
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down
        ;;
    
    restart)
        check_docker
        echo -e "${YELLOW}Restarting Seiron frontend development environment...${NC}"
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME restart
        ;;
    
    logs)
        check_docker
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f --tail=100
        ;;
    
    shell)
        check_docker
        echo -e "${GREEN}Opening shell in frontend container...${NC}"
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec frontend sh
        ;;
    
    install)
        check_docker
        if [ -z "$2" ]; then
            echo -e "${YELLOW}Installing all dependencies...${NC}"
            docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec frontend npm install --legacy-peer-deps
        else
            echo -e "${YELLOW}Installing package: $2${NC}"
            docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec frontend npm install "$2" --legacy-peer-deps
        fi
        ;;
    
    build)
        check_docker
        echo -e "${YELLOW}Rebuilding Docker image...${NC}"
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME build --no-cache
        ;;
    
    clean)
        check_docker
        echo -e "${RED}This will remove all containers, volumes, and images for this project.${NC}"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down -v --rmi all
            echo -e "${GREEN}Cleanup complete.${NC}"
        fi
        ;;
    
    status)
        check_docker
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME ps
        ;;
    
    test)
        check_docker
        echo -e "${GREEN}Running tests in container...${NC}"
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec frontend npm test
        ;;
    
    lint)
        check_docker
        echo -e "${GREEN}Running linter in container...${NC}"
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec frontend npm run lint
        ;;
    
    *)
        print_help
        ;;
esac