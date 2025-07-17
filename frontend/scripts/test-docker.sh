#!/bin/bash

# Comprehensive Docker Test Script for Seiron Voice Chat E2E Testing
# This script orchestrates the full test infrastructure with proper setup and cleanup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
TEST_SUITE="full"
ENVIRONMENT="local"
PARALLEL_JOBS=4
CLEANUP_ON_SUCCESS=true
CLEANUP_ON_FAILURE=false
WATCH_MODE=false
VERBOSE=false
GENERATE_REPORTS=true
SERVE_REPORTS=false
CI_MODE=false

# Project configuration
PROJECT_NAME="seiron-voice-chat-test"
COMPOSE_FILE="docker-compose.test.yml"
OVERRIDE_FILE="docker-compose.test.override.yml"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

print_error() { print_status "$RED" "❌ ERROR: $1"; }
print_success() { print_status "$GREEN" "✅ SUCCESS: $1"; }
print_info() { print_status "$BLUE" "ℹ️  INFO: $1"; }
print_warning() { print_status "$YELLOW" "⚠️  WARNING: $1"; }
print_step() { print_status "$CYAN" "🔄 STEP: $1"; }

# Function to show usage
usage() {
    cat << EOF
Comprehensive Docker Test Runner for Seiron Voice Chat

Usage: $0 [OPTIONS]

Test Suites:
  -t, --test-suite <suite>    Test suite to run:
                              - full: Complete test suite (default)
                              - voice: Voice-specific tests only
                              - e2e: End-to-end tests only
                              - integration: Integration tests only
                              - unit: Unit tests only
                              - performance: Performance tests only

Environment Configuration:
  -e, --environment <env>     Target environment:
                              - local: Local development (default)
                              - ci: Continuous integration
                              - staging: Staging environment

Execution Options:
  -j, --jobs <number>         Number of parallel jobs (default: 4)
  -w, --watch                 Run tests in watch mode
  -v, --verbose               Enable verbose output
  --ci                        Enable CI mode (optimized for CI environments)

Cleanup Options:
  --cleanup-success           Cleanup containers on success (default: true)
  --cleanup-failure           Cleanup containers on failure (default: false)
  --no-cleanup                Disable all cleanup
  --clean-all                 Clean all containers and volumes before running

Reporting Options:
  --no-reports                Skip report generation
  --serve-reports             Start report server after tests
  --reports-port <port>       Port for report server (default: 8080)

Utility Options:
  --health-check              Run health checks only
  --setup-only                Setup test environment without running tests
  --logs [service]            Show logs for service (or all services)
  --ps                        Show running containers
  -h, --help                  Show this help message

Examples:
  $0                          # Run full test suite
  $0 -t voice --ci            # Run voice tests in CI mode
  $0 -t e2e -j 2 -v           # Run E2E tests with 2 jobs, verbose
  $0 --setup-only             # Setup test environment only
  $0 --logs backend-test      # Show backend test logs
  $0 --clean-all -t unit      # Clean everything then run unit tests
  $0 -t performance --serve-reports  # Run performance tests and serve reports

Environment Variables:
  CI_PARALLEL_JOBS           Override parallel jobs in CI
  CI_TEST_TIMEOUT            Override test timeout in CI
  CI_MEMORY_LIMIT            Set memory limits for CI
  DOCKER_BUILDKIT            Enable Docker BuildKit (recommended)
  
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--test-suite)
            TEST_SUITE="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -j|--jobs)
            PARALLEL_JOBS="$2"
            shift 2
            ;;
        -w|--watch)
            WATCH_MODE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --ci)
            CI_MODE=true
            ENVIRONMENT="ci"
            CLEANUP_ON_SUCCESS=true
            CLEANUP_ON_FAILURE=true
            shift
            ;;
        --cleanup-success)
            CLEANUP_ON_SUCCESS=true
            shift
            ;;
        --cleanup-failure)
            CLEANUP_ON_FAILURE=true
            shift
            ;;
        --no-cleanup)
            CLEANUP_ON_SUCCESS=false
            CLEANUP_ON_FAILURE=false
            shift
            ;;
        --clean-all)
            print_step "Cleaning all containers and volumes..."
            docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down -v --rmi local
            docker system prune -f
            print_success "Clean up completed!"
            shift
            ;;
        --no-reports)
            GENERATE_REPORTS=false
            shift
            ;;
        --serve-reports)
            SERVE_REPORTS=true
            shift
            ;;
        --reports-port)
            REPORTS_PORT="$2"
            shift 2
            ;;
        --health-check)
            HEALTH_CHECK_ONLY=true
            ;;
        --setup-only)
            SETUP_ONLY=true
            ;;
        --logs)
            SERVICE="${2:-}"
            SHOW_LOGS=true
            shift
            ;;
        --ps)
            SHOW_CONTAINER_STATUS=true
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate test suite
case $TEST_SUITE in
    full|voice|e2e|integration|unit|performance)
        ;;
    *)
        print_error "Invalid test suite: $TEST_SUITE"
        print_info "Valid options: full, voice, e2e, integration, unit, performance"
        exit 1
        ;;
esac

# Set CI-specific environment variables
if [ "$CI_MODE" = true ]; then
    export CI=true
    export CI_PARALLEL_JOBS="${CI_PARALLEL_JOBS:-2}"
    export CI_TEST_TIMEOUT="${CI_TEST_TIMEOUT:-180000}"
    export CI_MEMORY_LIMIT="${CI_MEMORY_LIMIT:-1G}"
    export CI_HEADLESS=true
    export CI_VIDEO_RECORDING=false
    export CI_COVERAGE_THRESHOLD=80
    PARALLEL_JOBS="${CI_PARALLEL_JOBS:-2}"
    print_info "CI mode enabled with optimized settings"
fi

# Set environment variables
export COMPOSE_PROJECT_NAME="$PROJECT_NAME"
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export TEST_SUITE
export PARALLEL_JOBS
export ENVIRONMENT

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check available disk space (minimum 2GB)
    available_space=$(df . | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 2097152 ]; then  # 2GB in KB
        print_warning "Low disk space detected. Tests may fail due to insufficient storage."
    fi
    
    # Check for compose files
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "Docker compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to setup test environment
setup_test_environment() {
    print_step "Setting up test environment..."
    
    local compose_args="-f $COMPOSE_FILE -p $PROJECT_NAME"
    
    if [ -f "$OVERRIDE_FILE" ]; then
        compose_args="$compose_args -f $OVERRIDE_FILE"
        print_info "Using override file: $OVERRIDE_FILE"
    fi
    
    # Build images
    print_step "Building test images..."
    if [ "$VERBOSE" = true ]; then
        docker-compose $compose_args build --parallel
    else
        docker-compose $compose_args build --parallel > /dev/null 2>&1
    fi
    
    # Start infrastructure services
    print_step "Starting infrastructure services..."
    docker-compose $compose_args up -d postgres-test redis-test
    
    # Wait for services to be healthy
    print_step "Waiting for services to be ready..."
    wait_for_services
    
    print_success "Test environment ready"
}

# Function to wait for services
wait_for_services() {
    local services=("postgres-test" "redis-test")
    local timeout=120
    local elapsed=0
    
    print_info "Waiting for services to become healthy (timeout: ${timeout}s)..."
    
    for service in "${services[@]}"; do
        print_info "Checking $service..."
        while [ $elapsed -lt $timeout ]; do
            if docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps "$service" | grep -q "healthy\|Up"; then
                print_success "$service is ready"
                break
            fi
            
            if [ $elapsed -ge $timeout ]; then
                print_error "$service failed to become ready within ${timeout}s"
                docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs "$service"
                exit 1
            fi
            
            sleep 2
            elapsed=$((elapsed + 2))
        done
        elapsed=0
    done
}

# Function to run health checks
run_health_checks() {
    print_step "Running comprehensive health checks..."
    
    local compose_args="-f $COMPOSE_FILE -p $PROJECT_NAME"
    if [ -f "$OVERRIDE_FILE" ]; then
        compose_args="$compose_args -f $OVERRIDE_FILE"
    fi
    
    # Check if services are running
    local services=("postgres-test" "redis-test")
    for service in "${services[@]}"; do
        if docker-compose $compose_args ps "$service" | grep -q "Up"; then
            print_success "$service is running"
        else
            print_error "$service is not running"
            return 1
        fi
    done
    
    # Run health check script in test-runner if available
    if docker-compose $compose_args ps test-runner | grep -q "Up"; then
        print_step "Running detailed health checks..."
        docker-compose $compose_args exec test-runner npm run health-check
    fi
    
    print_success "All health checks passed"
    return 0
}

# Function to run tests
run_tests() {
    print_step "Running $TEST_SUITE tests..."
    
    local compose_args="-f $COMPOSE_FILE -p $PROJECT_NAME"
    if [ -f "$OVERRIDE_FILE" ]; then
        compose_args="$compose_args -f $OVERRIDE_FILE"
    fi
    
    # Set test-specific environment variables
    export TEST_SUITE
    export PARALLEL_JOBS
    export HEADLESS="${CI_HEADLESS:-true}"
    
    local test_command
    case $TEST_SUITE in
        "unit")
            test_command="--profile unit up --abort-on-container-exit"
            ;;
        "integration")
            test_command="--profile integration up --abort-on-container-exit"
            ;;
        "performance")
            test_command="--profile performance up --abort-on-container-exit"
            ;;
        "voice"|"e2e")
            test_command="--profile e2e up --abort-on-container-exit"
            ;;
        "full")
            # Run tests in sequence for full suite
            run_unit_tests && run_integration_tests && run_e2e_tests && run_performance_tests
            return $?
            ;;
    esac
    
    if [ "$WATCH_MODE" = true ]; then
        print_info "Running in watch mode (press Ctrl+C to stop)..."
        test_command="--profile watch up"
    fi
    
    # Execute tests
    if [ "$VERBOSE" = true ]; then
        docker-compose $compose_args $test_command
    else
        docker-compose $compose_args $test_command > test-output.log 2>&1
    fi
    
    return $?
}

# Individual test runners
run_unit_tests() {
    print_step "Running unit tests..."
    local compose_args="-f $COMPOSE_FILE -p $PROJECT_NAME"
    if [ -f "$OVERRIDE_FILE" ]; then compose_args="$compose_args -f $OVERRIDE_FILE"; fi
    docker-compose $compose_args --profile unit up --abort-on-container-exit
}

run_integration_tests() {
    print_step "Running integration tests..."
    local compose_args="-f $COMPOSE_FILE -p $PROJECT_NAME"
    if [ -f "$OVERRIDE_FILE" ]; then compose_args="$compose_args -f $OVERRIDE_FILE"; fi
    docker-compose $compose_args --profile integration up --abort-on-container-exit
}

run_e2e_tests() {
    print_step "Running E2E tests..."
    local compose_args="-f $COMPOSE_FILE -p $PROJECT_NAME"
    if [ -f "$OVERRIDE_FILE" ]; then compose_args="$compose_args -f $OVERRIDE_FILE"; fi
    docker-compose $compose_args --profile e2e up --abort-on-container-exit
}

run_performance_tests() {
    print_step "Running performance tests..."
    local compose_args="-f $COMPOSE_FILE -p $PROJECT_NAME"
    if [ -f "$OVERRIDE_FILE" ]; then compose_args="$compose_args -f $OVERRIDE_FILE"; fi
    docker-compose $compose_args --profile performance up --abort-on-container-exit
}

# Function to generate reports
generate_reports() {
    if [ "$GENERATE_REPORTS" = false ]; then
        return 0
    fi
    
    print_step "Generating test reports..."
    
    local compose_args="-f $COMPOSE_FILE -p $PROJECT_NAME"
    
    # Create reports directory
    mkdir -p reports artifacts coverage
    
    # Copy test results from containers
    docker-compose $compose_args cp test-runner:/app/reports/. ./reports/ 2>/dev/null || true
    docker-compose $compose_args cp test-runner:/app/artifacts/. ./artifacts/ 2>/dev/null || true
    docker-compose $compose_args cp backend-test:/app/coverage/. ./coverage/backend/ 2>/dev/null || true
    docker-compose $compose_args cp frontend-test:/app/coverage/. ./coverage/frontend/ 2>/dev/null || true
    
    # Generate summary report
    cat > reports/test-summary.json << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "testSuite": "$TEST_SUITE",
    "environment": "$ENVIRONMENT",
    "duration": $test_duration,
    "status": "$test_status",
    "parallelJobs": $PARALLEL_JOBS,
    "ci": $CI_MODE
}
EOF
    
    print_success "Reports generated in ./reports/"
    
    if [ "$SERVE_REPORTS" = true ]; then
        serve_reports
    fi
}

# Function to serve reports
serve_reports() {
    local port="${REPORTS_PORT:-8080}"
    print_step "Starting report server on port $port..."
    
    # Simple HTTP server for reports
    if command -v python3 &> /dev/null; then
        cd reports && python3 -m http.server "$port" &
        print_success "Report server available at: http://localhost:$port"
        print_info "Press Ctrl+C to stop the server"
        wait
    else
        print_warning "Python3 not found. Reports available in ./reports/ directory"
    fi
}

# Function to show logs
show_logs() {
    local service="$1"
    local compose_args="-f $COMPOSE_FILE -p $PROJECT_NAME"
    
    if [ -z "$service" ]; then
        print_info "Showing logs for all services..."
        docker-compose $compose_args logs -f
    else
        print_info "Showing logs for $service..."
        docker-compose $compose_args logs -f "$service"
    fi
}

# Function to show container status
show_container_status() {
    local compose_args="-f $COMPOSE_FILE -p $PROJECT_NAME"
    print_info "Container status:"
    docker-compose $compose_args ps
    
    print_info "Resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# Cleanup function
cleanup() {
    local exit_code=$?
    
    if [ $exit_code -eq 0 ] && [ "$CLEANUP_ON_SUCCESS" = true ]; then
        print_step "Cleaning up test environment (success)..."
        docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down -v
    elif [ $exit_code -ne 0 ] && [ "$CLEANUP_ON_FAILURE" = true ]; then
        print_step "Cleaning up test environment (failure)..."
        docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down -v
    else
        print_info "Containers left running. Use --ps to check status or --clean-all to clean up"
    fi
}

# Set up trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    # Handle special flags first
    if [ "$HEALTH_CHECK_ONLY" = true ]; then
        check_prerequisites
        setup_test_environment
        run_health_checks
        exit $?
    fi
    
    if [ "$SETUP_ONLY" = true ]; then
        check_prerequisites
        setup_test_environment
        print_success "Test environment setup completed. Use --ps to see running containers."
        exit 0
    fi
    
    if [ "$SHOW_LOGS" = true ]; then
        show_logs "$SERVICE"
        exit 0
    fi
    
    if [ "$SHOW_CONTAINER_STATUS" = true ]; then
        show_container_status
        exit 0
    fi
    
    print_info "Starting Seiron Voice Chat E2E Test Suite"
    print_info "Test Suite: $TEST_SUITE | Environment: $ENVIRONMENT | Jobs: $PARALLEL_JOBS"
    
    local start_time=$(date +%s)
    
    check_prerequisites
    setup_test_environment
    
    if run_tests; then
        test_status="passed"
        print_success "All tests passed successfully!"
    else
        test_status="failed"
        print_error "Tests failed!"
        if [ "$VERBOSE" = false ] && [ -f "test-output.log" ]; then
            print_info "Test output:"
            cat test-output.log
        fi
        exit 1
    fi
    
    local end_time=$(date +%s)
    test_duration=$((end_time - start_time))
    
    generate_reports
    
    print_success "Test execution completed in ${test_duration}s"
}

# Run main function
main "$@"