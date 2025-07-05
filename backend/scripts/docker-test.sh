#!/bin/bash

# Docker Test Runner Script
# Provides an easy interface for running tests in Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TEST_TYPE="all"
WATCH_MODE=false
COVERAGE_SERVER=false
CLEAN_UP=true

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --type <type>       Test type: all, unit, integration, property, coverage (default: all)"
    echo "  -w, --watch             Run tests in watch mode"
    echo "  -s, --serve-coverage    Start coverage report server after tests"
    echo "  -n, --no-cleanup        Don't clean up containers after tests"
    echo "  -c, --clean             Clean all test containers and images"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                      # Run all tests"
    echo "  $0 -t unit              # Run only unit tests"
    echo "  $0 -t coverage -s       # Run coverage and serve report"
    echo "  $0 -w                   # Run tests in watch mode"
    echo "  $0 -c                   # Clean all test containers"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            TEST_TYPE="$2"
            shift 2
            ;;
        -w|--watch)
            WATCH_MODE=true
            shift
            ;;
        -s|--serve-coverage)
            COVERAGE_SERVER=true
            shift
            ;;
        -n|--no-cleanup)
            CLEAN_UP=false
            shift
            ;;
        -c|--clean)
            print_color "$BLUE" "Cleaning test containers and images..."
            docker-compose -f docker-compose.test.yml down -v --rmi all
            print_color "$GREEN" "Clean up complete!"
            exit 0
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            print_color "$RED" "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate test type
case $TEST_TYPE in
    all|unit|integration|property|coverage)
        ;;
    *)
        print_color "$RED" "Invalid test type: $TEST_TYPE"
        usage
        exit 1
        ;;
esac

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_color "$RED" "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_color "$RED" "docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Set up environment
export COMPOSE_PROJECT_NAME=sei-portfolio-test
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Clean up function
cleanup() {
    if [ "$CLEAN_UP" = true ]; then
        print_color "$YELLOW" "Cleaning up test containers..."
        docker-compose -f docker-compose.test.yml down -v
    fi
}

# Set up trap to clean up on exit
trap cleanup EXIT

# Run tests based on type
print_color "$BLUE" "Starting test environment..."

if [ "$WATCH_MODE" = true ]; then
    print_color "$YELLOW" "Running tests in watch mode..."
    docker-compose -f docker-compose.test.yml --profile watch up --build
elif [ "$TEST_TYPE" = "all" ]; then
    print_color "$YELLOW" "Running all tests..."
    docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
else
    print_color "$YELLOW" "Running $TEST_TYPE tests..."
    docker-compose -f docker-compose.test.yml --profile "$TEST_TYPE" up --build --abort-on-container-exit
fi

# Check test results
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    print_color "$GREEN" "Tests passed successfully!"
    
    # Start coverage server if requested
    if [ "$COVERAGE_SERVER" = true ] && [ "$TEST_TYPE" = "coverage" ]; then
        print_color "$BLUE" "Starting coverage report server..."
        docker-compose -f docker-compose.test.yml --profile coverage-ui up -d
        print_color "$GREEN" "Coverage report available at: http://localhost:8080"
        print_color "$YELLOW" "Run 'docker-compose -f docker-compose.test.yml --profile coverage-ui down' to stop the server"
        CLEAN_UP=false  # Don't auto-cleanup when serving coverage
    fi
else
    print_color "$RED" "Tests failed with exit code: $TEST_EXIT_CODE"
    exit $TEST_EXIT_CODE
fi

# Show coverage summary if coverage tests were run
if [ "$TEST_TYPE" = "coverage" ] && [ -f "./coverage/coverage-summary.json" ]; then
    print_color "$BLUE" "Coverage Summary:"
    cat ./coverage/coverage-summary.json | jq -r '
        .total | 
        "Lines: \(.lines.pct)% | Statements: \(.statements.pct)% | Functions: \(.functions.pct)% | Branches: \(.branches.pct)%"
    ' 2>/dev/null || echo "Coverage report generated in ./coverage/"
fi