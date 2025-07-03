#!/bin/bash

# Comprehensive Integration Test Execution Script
# Runs the complete Sei Agent Kit integration test suite with Docker validation

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.test.yml"
TEST_RESULTS_DIR="./test-results"
COVERAGE_DIR="./coverage"
LOGS_DIR="./logs"
MAX_RETRIES=3
TIMEOUT_MINUTES=30

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    # Check required files
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        print_error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        exit 1
    fi
    
    if [[ ! -f "package.json" ]]; then
        print_error "package.json not found"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to clean up previous test artifacts
cleanup_previous_tests() {
    print_status "Cleaning up previous test artifacts..."
    
    # Remove previous test results
    rm -rf "$TEST_RESULTS_DIR" "$COVERAGE_DIR" "$LOGS_DIR"
    
    # Create fresh directories
    mkdir -p "$TEST_RESULTS_DIR" "$COVERAGE_DIR" "$LOGS_DIR"
    
    # Stop any running containers
    docker-compose -f "$DOCKER_COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Function to setup test environment
setup_test_environment() {
    print_status "Setting up test environment..."
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]] || [[ package.json -nt node_modules ]]; then
        print_status "Installing/updating dependencies..."
        npm ci
    fi
    
    # Build the application
    print_status "Building application..."
    npm run build
    
    print_success "Test environment setup completed"
}

# Function to start Docker services
start_docker_services() {
    print_status "Starting Docker services..."
    
    # Start infrastructure services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d sei-testnet redis postgres
    
    # Wait for core services to be healthy
    print_status "Waiting for core services to be ready..."
    local retry_count=0
    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_isready -U testuser -d sei_agent_test &>/dev/null; then
            break
        fi
        retry_count=$((retry_count + 1))
        print_status "Waiting for PostgreSQL... (attempt $retry_count/$MAX_RETRIES)"
        sleep 10
    done
    
    if [[ $retry_count -eq $MAX_RETRIES ]]; then
        print_error "PostgreSQL failed to start after $MAX_RETRIES attempts"
        return 1
    fi
    
    # Start mock services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d symphony-mock takara-mock
    
    # Wait for mock services
    retry_count=0
    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        if curl -f http://localhost:8001/health &>/dev/null && curl -f http://localhost:8002/health &>/dev/null; then
            break
        fi
        retry_count=$((retry_count + 1))
        print_status "Waiting for mock services... (attempt $retry_count/$MAX_RETRIES)"
        sleep 5
    done
    
    if [[ $retry_count -eq $MAX_RETRIES ]]; then
        print_error "Mock services failed to start after $MAX_RETRIES attempts"
        return 1
    fi
    
    print_success "Docker services started successfully"
}

# Function to run specific test suite
run_test_suite() {
    local suite_name="$1"
    local test_command="$2"
    local timeout_seconds=$((TIMEOUT_MINUTES * 60))
    
    print_status "Running $suite_name..."
    
    local start_time=$(date +%s)
    
    if timeout $timeout_seconds $test_command; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "$suite_name completed successfully in ${duration}s"
        return 0
    else
        local exit_code=$?
        print_error "$suite_name failed with exit code $exit_code"
        return $exit_code
    fi
}

# Function to collect test results
collect_test_results() {
    print_status "Collecting test results..."
    
    # Copy container logs
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs sei-testnet > "$LOGS_DIR/sei-testnet.log" 2>&1 || true
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs symphony-mock > "$LOGS_DIR/symphony-mock.log" 2>&1 || true
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs takara-mock > "$LOGS_DIR/takara-mock.log" 2>&1 || true
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs redis > "$LOGS_DIR/redis.log" 2>&1 || true
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs postgres > "$LOGS_DIR/postgres.log" 2>&1 || true
    
    # Copy test results from containers if they exist
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps test-runner &>/dev/null; then
        docker cp "$(docker-compose -f "$DOCKER_COMPOSE_FILE" ps -q test-runner)":/app/test-results/. "$TEST_RESULTS_DIR/" 2>/dev/null || true
        docker cp "$(docker-compose -f "$DOCKER_COMPOSE_FILE" ps -q test-runner)":/app/coverage/. "$COVERAGE_DIR/" 2>/dev/null || true
    fi
    
    print_success "Test results collected"
}

# Function to generate test report
generate_test_report() {
    print_status "Generating comprehensive test report..."
    
    local report_file="$TEST_RESULTS_DIR/integration-test-report.md"
    local timestamp=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    
    cat > "$report_file" << EOF
# Sei Agent Kit Integration Test Report

**Generated:** $timestamp
**Test Suite:** Comprehensive Integration Tests
**Environment:** Docker-based testing infrastructure

## Test Execution Summary

EOF

    # Add test results if available
    if [[ -f "$TEST_RESULTS_DIR/test-results.xml" ]]; then
        echo "### Test Results" >> "$report_file"
        echo "" >> "$report_file"
        echo "Detailed test results are available in \`test-results.xml\`" >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    # Add coverage information if available
    if [[ -d "$COVERAGE_DIR" ]] && [[ -n "$(ls -A "$COVERAGE_DIR" 2>/dev/null)" ]]; then
        echo "### Code Coverage" >> "$report_file"
        echo "" >> "$report_file"
        echo "Coverage reports are available in the \`coverage/\` directory." >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    # Add performance metrics if available
    if [[ -f "$TEST_RESULTS_DIR/performance-metrics.json" ]]; then
        echo "### Performance Metrics" >> "$report_file"
        echo "" >> "$report_file"
        echo "Performance metrics are available in \`performance-metrics.json\`" >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    # Add Docker service status
    echo "### Docker Services Status" >> "$report_file"
    echo "" >> "$report_file"
    echo "\`\`\`" >> "$report_file"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps >> "$report_file" 2>&1 || echo "Failed to get service status" >> "$report_file"
    echo "\`\`\`" >> "$report_file"
    echo "" >> "$report_file"
    
    # Add system information
    echo "### System Information" >> "$report_file"
    echo "" >> "$report_file"
    echo "- **OS:** $(uname -s) $(uname -r)" >> "$report_file"
    echo "- **Node.js:** $(node --version)" >> "$report_file"
    echo "- **Docker:** $(docker --version)" >> "$report_file"
    echo "- **Docker Compose:** $(docker-compose --version)" >> "$report_file"
    echo "" >> "$report_file"
    
    print_success "Test report generated: $report_file"
}

# Function to cleanup and shutdown
cleanup_and_shutdown() {
    print_status "Cleaning up and shutting down..."
    
    # Stop and remove containers
    docker-compose -f "$DOCKER_COMPOSE_FILE" down -v --remove-orphans
    
    # Clean up any dangling images if specified
    if [[ "${CLEANUP_IMAGES:-false}" == "true" ]]; then
        docker image prune -f
    fi
    
    print_success "Cleanup completed"
}

# Function to run performance tests
run_performance_tests() {
    print_status "Running performance validation tests..."
    
    # Start performance monitoring
    if docker-compose -f "$DOCKER_COMPOSE_FILE" --profile monitoring up -d prometheus grafana; then
        print_status "Performance monitoring started"
        sleep 10 # Wait for monitoring to initialize
    fi
    
    # Run performance test suite
    run_test_suite "Performance Tests" "npm run test:performance:docker"
    
    print_success "Performance tests completed"
}

# Main execution function
main() {
    local test_type="${1:-all}"
    local exit_code=0
    
    print_status "Starting Sei Agent Kit Integration Test Suite"
    print_status "Test type: $test_type"
    
    # Setup
    check_prerequisites
    cleanup_previous_tests
    setup_test_environment
    
    # Start services
    if ! start_docker_services; then
        print_error "Failed to start Docker services"
        cleanup_and_shutdown
        exit 1
    fi
    
    # Run tests based on type
    case "$test_type" in
        "protocol")
            run_test_suite "Protocol Integration Tests" "npm run test:integration:docker -- test/integration/protocols" || exit_code=$?
            ;;
        "agents")
            run_test_suite "Agent Coordination Tests" "npm run test:integration:docker -- test/integration/agents" || exit_code=$?
            ;;
        "property")
            run_test_suite "Property-Based Tests" "npm run test:property:docker" || exit_code=$?
            ;;
        "performance")
            run_performance_tests || exit_code=$?
            ;;
        "quick")
            run_test_suite "Quick Integration Tests" "npm run docker:test:quick" || exit_code=$?
            ;;
        "all")
            # Run comprehensive test suite
            print_status "Running comprehensive integration test suite..."
            
            # Protocol tests
            run_test_suite "Protocol Integration Tests" "npm run test:integration:docker -- test/integration/protocols" || exit_code=$?
            
            # Agent coordination tests
            if [[ $exit_code -eq 0 ]]; then
                run_test_suite "Agent Coordination Tests" "npm run test:integration:docker -- test/integration/agents" || exit_code=$?
            fi
            
            # Property-based tests
            if [[ $exit_code -eq 0 ]]; then
                run_test_suite "Property-Based Tests" "npm run test:property:docker" || exit_code=$?
            fi
            
            # Performance tests
            if [[ $exit_code -eq 0 ]]; then
                run_performance_tests || exit_code=$?
            fi
            ;;
        *)
            print_error "Unknown test type: $test_type"
            print_status "Available types: protocol, agents, property, performance, quick, all"
            exit 1
            ;;
    esac
    
    # Collect results
    collect_test_results
    generate_test_report
    
    # Cleanup
    cleanup_and_shutdown
    
    # Final status
    if [[ $exit_code -eq 0 ]]; then
        print_success "All tests completed successfully!"
        print_status "Test results available in: $TEST_RESULTS_DIR"
        print_status "Coverage reports available in: $COVERAGE_DIR"
        print_status "Logs available in: $LOGS_DIR"
    else
        print_error "Some tests failed (exit code: $exit_code)"
        print_status "Check logs and test results for details"
    fi
    
    exit $exit_code
}

# Handle script arguments
case "${1:-all}" in
    "-h"|"--help")
        echo "Usage: $0 [test_type]"
        echo ""
        echo "Test types:"
        echo "  protocol     - Run protocol integration tests only"
        echo "  agents       - Run agent coordination tests only"
        echo "  property     - Run property-based tests only"
        echo "  performance  - Run performance tests only"
        echo "  quick        - Run quick integration tests"
        echo "  all          - Run all integration tests (default)"
        echo ""
        echo "Environment variables:"
        echo "  CLEANUP_IMAGES=true  - Clean up Docker images after tests"
        echo "  TIMEOUT_MINUTES=30   - Test timeout in minutes (default: 30)"
        echo ""
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac