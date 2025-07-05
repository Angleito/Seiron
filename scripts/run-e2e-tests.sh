#!/bin/bash

# E2E Test Runner Script for Seiron
# This script manages the complete E2E test lifecycle

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
E2E_COMPOSE_FILE="docker-compose.e2e.yml"
TEST_RESULTS_DIR="test-results/e2e"
TIMEOUT=300

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

cleanup() {
    log_info "Cleaning up E2E test environment..."
    docker-compose -f $E2E_COMPOSE_FILE down -v
    log_success "Cleanup completed"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

prepare_test_results() {
    log_info "Preparing test results directory..."
    mkdir -p $TEST_RESULTS_DIR/{cypress,logs,reports}
    log_success "Test results directory prepared"
}

build_services() {
    log_info "Building Docker services..."
    docker-compose -f $E2E_COMPOSE_FILE build --parallel
    log_success "Services built successfully"
}

start_services() {
    log_info "Starting services..."
    docker-compose -f $E2E_COMPOSE_FILE up -d --remove-orphans
    
    log_info "Waiting for services to be healthy..."
    local services=("frontend" "backend" "redis" "protocol-simulator" "msw-server")
    
    for service in "${services[@]}"; do
        log_info "Waiting for $service..."
        local retries=0
        while [ $retries -lt 30 ]; do
            if docker-compose -f $E2E_COMPOSE_FILE ps | grep -E "e2e-$service.*healthy|running"; then
                log_success "$service is ready"
                break
            fi
            retries=$((retries + 1))
            sleep 2
        done
        
        if [ $retries -eq 30 ]; then
            log_error "$service failed to start"
            docker-compose -f $E2E_COMPOSE_FILE logs $service
            exit 1
        fi
    done
    
    log_success "All services are running"
}

run_cypress_tests() {
    log_info "Running Cypress E2E tests..."
    
    # Run tests based on environment
    if [ "$CI" = "true" ]; then
        # CI mode - headless
        docker-compose -f $E2E_COMPOSE_FILE run --rm cypress
    else
        # Local mode - check if we should open interactive mode
        if [ "$1" = "--open" ]; then
            log_info "Opening Cypress in interactive mode..."
            npx cypress open
        else
            log_info "Running Cypress in headless mode..."
            docker-compose -f $E2E_COMPOSE_FILE run --rm cypress
        fi
    fi
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "All tests passed!"
    else
        log_error "Some tests failed"
    fi
    
    return $exit_code
}

collect_logs() {
    log_info "Collecting logs..."
    
    # Collect service logs
    for service in frontend backend redis protocol-simulator msw-server; do
        docker-compose -f $E2E_COMPOSE_FILE logs $service > "$TEST_RESULTS_DIR/logs/${service}.log" 2>&1
    done
    
    log_success "Logs collected"
}

generate_report() {
    log_info "Generating test report..."
    
    # Create summary report
    cat > "$TEST_RESULTS_DIR/reports/summary.txt" << EOF
E2E Test Summary
================
Date: $(date)
Duration: $((SECONDS / 60)) minutes $((SECONDS % 60)) seconds

Test Results:
- Videos: $(find $TEST_RESULTS_DIR/cypress -name "*.mp4" 2>/dev/null | wc -l)
- Screenshots: $(find $TEST_RESULTS_DIR/cypress -name "*.png" 2>/dev/null | wc -l)

Service Status:
$(docker-compose -f $E2E_COMPOSE_FILE ps)
EOF
    
    log_success "Report generated at $TEST_RESULTS_DIR/reports/summary.txt"
}

# Main execution
main() {
    local mode=${1:-"run"}
    
    case $mode in
        "run")
            check_dependencies
            prepare_test_results
            cleanup
            build_services
            start_services
            run_cypress_tests "$2"
            local test_exit_code=$?
            collect_logs
            generate_report
            
            if [ "$KEEP_SERVICES" != "true" ]; then
                cleanup
            else
                log_warning "Services are still running. Run 'npm run e2e:down' to stop them."
            fi
            
            exit $test_exit_code
            ;;
            
        "up")
            check_dependencies
            build_services
            start_services
            log_success "Services are running. Run 'npm run e2e:run' to execute tests."
            ;;
            
        "down")
            cleanup
            ;;
            
        "logs")
            docker-compose -f $E2E_COMPOSE_FILE logs -f
            ;;
            
        "status")
            docker-compose -f $E2E_COMPOSE_FILE ps
            ;;
            
        *)
            echo "Usage: $0 [run|up|down|logs|status] [--open]"
            echo "  run    - Run complete E2E test suite (default)"
            echo "  up     - Start services only"
            echo "  down   - Stop and clean up services"
            echo "  logs   - Show service logs"
            echo "  status - Show service status"
            echo ""
            echo "Options:"
            echo "  --open - Open Cypress in interactive mode (with 'run' command)"
            echo ""
            echo "Environment variables:"
            echo "  KEEP_SERVICES=true - Keep services running after tests"
            echo "  CI=true - Run in CI mode"
            exit 1
            ;;
    esac
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Record start time
SECONDS=0

# Run main function
main "$@"