#!/bin/bash

# Comprehensive Docker Test Runner for 3D Model Loading
# This script orchestrates the complete testing pipeline for 3D model functionality
# in Docker environments, including both Puppeteer and Playwright tests.

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_URL="http://localhost:3000"
DEFAULT_TIMEOUT="60000"
DEFAULT_OUTPUT_DIR="./docker-test-results"
DEFAULT_DOCKER_IMAGE="node:20-alpine"

# Parse command line arguments
URL="${TEST_URL:-$DEFAULT_URL}"
TIMEOUT="${TEST_TIMEOUT:-$DEFAULT_TIMEOUT}"
OUTPUT_DIR="${TEST_OUTPUT_DIR:-$DEFAULT_OUTPUT_DIR}"
DOCKER_IMAGE="${TEST_DOCKER_IMAGE:-$DEFAULT_DOCKER_IMAGE}"
RUN_PUPPETEER="${RUN_PUPPETEER:-true}"
RUN_PLAYWRIGHT="${RUN_PLAYWRIGHT:-true}"
RUN_ENHANCED="${RUN_ENHANCED:-true}"
STRESS_TEST="${STRESS_TEST:-false}"
PERFORMANCE_PROFILE="${PERFORMANCE_PROFILE:-false}"
VERBOSE="${VERBOSE:-false}"
CLEANUP="${CLEANUP:-true}"
PARALLEL="${PARALLEL:-false}"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo ""
    print_color $CYAN "=============================================="
    print_color $CYAN "$1"
    print_color $CYAN "=============================================="
    echo ""
}

print_section() {
    echo ""
    print_color $BLUE "--- $1 ---"
    echo ""
}

print_success() {
    print_color $GREEN "✅ $1"
}

print_warning() {
    print_color $YELLOW "⚠️  $1"
}

print_error() {
    print_color $RED "❌ $1"
}

print_info() {
    print_color $PURPLE "ℹ️  $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_section "Checking Prerequisites"
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
    else
        print_error "Node.js not found"
        exit 1
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm not found"
        exit 1
    fi
    
    # Check Docker (if we're running outside Docker)
    if [ ! -f /.dockerenv ] && command -v docker >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker found: $DOCKER_VERSION"
    elif [ -f /.dockerenv ]; then
        print_info "Running inside Docker container"
    else
        print_warning "Docker not found - some tests may be skipped"
    fi
    
    # Check if we're in the frontend directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run from the frontend directory."
        exit 1
    fi
    
    # Check required dependencies
    if [ ! -d "node_modules/puppeteer" ]; then
        print_error "Puppeteer not found in node_modules"
        print_info "Run: npm install"
        exit 1
    fi
    
    if [ ! -d "node_modules/@playwright/test" ]; then
        print_error "Playwright not found in node_modules"
        print_info "Run: npm install"
        exit 1
    fi
    
    print_success "All prerequisites met"
}

# Function to setup test environment
setup_test_environment() {
    print_section "Setting Up Test Environment"
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    print_success "Output directory created: $OUTPUT_DIR"
    
    # Create subdirectories for different test types
    mkdir -p "$OUTPUT_DIR/puppeteer"
    mkdir -p "$OUTPUT_DIR/playwright"
    mkdir -p "$OUTPUT_DIR/enhanced"
    mkdir -p "$OUTPUT_DIR/screenshots"
    mkdir -p "$OUTPUT_DIR/reports"
    mkdir -p "$OUTPUT_DIR/logs"
    
    # Set environment variables for tests
    export DIAGNOSE_URL="$URL"
    export DIAGNOSE_TIMEOUT="$TIMEOUT"
    export DIAGNOSE_OUTPUT_DIR="$OUTPUT_DIR"
    export DIAGNOSE_SCREENSHOTS="true"
    export DIAGNOSE_VERBOSE="$VERBOSE"
    
    print_success "Test environment configured"
    print_info "URL: $URL"
    print_info "Timeout: $TIMEOUT ms"
    print_info "Output: $OUTPUT_DIR"
}

# Function to check if development server is running
check_dev_server() {
    print_section "Checking Development Server"
    
    if curl -f -s "$URL" >/dev/null 2>&1; then
        print_success "Development server is responding at $URL"
        return 0
    else
        print_warning "Development server is not responding at $URL"
        print_info "Starting development server..."
        
        # Try to start the dev server
        if [ -f "package.json" ] && grep -q '"dev"' package.json; then
            npm run dev &
            DEV_SERVER_PID=$!
            
            # Wait for server to start
            for i in {1..30}; do
                if curl -f -s "$URL" >/dev/null 2>&1; then
                    print_success "Development server started successfully"
                    return 0
                fi
                sleep 2
            done
            
            print_error "Failed to start development server"
            return 1
        else
            print_error "No dev script found in package.json"
            return 1
        fi
    fi
}

# Function to run Puppeteer diagnostics
run_puppeteer_tests() {
    if [ "$RUN_PUPPETEER" != "true" ]; then
        print_info "Puppeteer tests skipped"
        return 0
    fi
    
    print_section "Running Puppeteer Diagnostics"
    
    local pupeteer_output="$OUTPUT_DIR/puppeteer"
    local test_start_time=$(date +%s)
    
    # Original diagnostics
    print_info "Running original 3D diagnostics..."
    if node scripts/diagnose-3d-loading.js \
        --url "$URL" \
        --timeout "$TIMEOUT" \
        --output "$pupeteer_output/original" \
        --screenshots \
        --verbose 2>&1 | tee "$OUTPUT_DIR/logs/puppeteer-original.log"; then
        print_success "Original Puppeteer diagnostics completed"
    else
        print_error "Original Puppeteer diagnostics failed"
        return 1
    fi
    
    # Enhanced diagnostics
    if [ "$RUN_ENHANCED" = "true" ]; then
        print_info "Running enhanced 3D diagnostics..."
        local enhanced_args="--url $URL --timeout $TIMEOUT --output $pupeteer_output/enhanced --screenshots --verbose"
        
        if [ "$STRESS_TEST" = "true" ]; then
            enhanced_args="$enhanced_args --stress-test"
        fi
        
        if [ "$PERFORMANCE_PROFILE" = "true" ]; then
            enhanced_args="$enhanced_args --performance-profile"
        fi
        
        if node scripts/enhanced-3d-diagnostics.js $enhanced_args 2>&1 | tee "$OUTPUT_DIR/logs/puppeteer-enhanced.log"; then
            print_success "Enhanced Puppeteer diagnostics completed"
        else
            print_warning "Enhanced Puppeteer diagnostics had issues"
        fi
    fi
    
    local test_end_time=$(date +%s)
    local test_duration=$((test_end_time - test_start_time))
    print_success "Puppeteer tests completed in ${test_duration}s"
}

# Function to run Playwright tests
run_playwright_tests() {
    if [ "$RUN_PLAYWRIGHT" != "true" ]; then
        print_info "Playwright tests skipped"
        return 0
    fi
    
    print_section "Running Playwright E2E Tests"
    
    local playwright_output="$OUTPUT_DIR/playwright"
    local test_start_time=$(date +%s)
    
    # Set Playwright environment variables
    export PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"
    export PLAYWRIGHT_HTML_REPORT="$playwright_output/html-report"
    export PLAYWRIGHT_JSON_OUTPUT_NAME="$playwright_output/results.json"
    
    # Install Playwright browsers if needed
    if [ ! -d "$PLAYWRIGHT_BROWSERS_PATH" ]; then
        print_info "Installing Playwright browsers..."
        npx playwright install chromium
    fi
    
    # Run 3D model loading tests
    print_info "Running 3D model loading tests..."
    if npx playwright test e2e/dragon/3d-model-loading.spec.ts \
        --config=playwright.config.ts \
        --reporter=html \
        --output-dir="$playwright_output" 2>&1 | tee "$OUTPUT_DIR/logs/playwright-3d.log"; then
        print_success "3D model loading tests completed"
    else
        print_warning "3D model loading tests had issues"
    fi
    
    # Run Docker-specific tests
    print_info "Running Docker-specific tests..."
    if npx playwright test e2e/docker/docker-3d-testing.spec.ts \
        --config=playwright.config.ts \
        --reporter=html \
        --output-dir="$playwright_output" 2>&1 | tee "$OUTPUT_DIR/logs/playwright-docker.log"; then
        print_success "Docker-specific tests completed"
    else
        print_warning "Docker-specific tests had issues"
    fi
    
    local test_end_time=$(date +%s)
    local test_duration=$((test_end_time - test_start_time))
    print_success "Playwright tests completed in ${test_duration}s"
}

# Function to run Docker-based tests
run_docker_tests() {
    print_section "Running Docker-Based Tests"
    
    if [ -f /.dockerenv ]; then
        print_info "Already running in Docker, executing tests directly"
        run_puppeteer_tests
        run_playwright_tests
        return $?
    fi
    
    if ! command -v docker >/dev/null 2>&1; then
        print_warning "Docker not available, skipping Docker-based tests"
        return 0
    fi
    
    print_info "Creating Docker test container..."
    
    # Create Dockerfile for testing
    cat > "$OUTPUT_DIR/Dockerfile.test" << EOF
FROM $DOCKER_IMAGE

# Install system dependencies
RUN apk add --no-cache \\
    bash \\
    curl \\
    git \\
    chromium \\
    nss \\
    freetype \\
    freetype-dev \\
    harfbuzz \\
    ca-certificates \\
    ttf-freefont

# Install Node.js dependencies for Puppeteer/Playwright
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Install Playwright browsers
RUN npx playwright install chromium || true

# Set up test environment
ENV NODE_ENV=test
ENV HEADLESS=true
ENV DOCKER_TEST_MODE=true

# Create test script
COPY scripts/docker-test-runner.sh /app/docker-test-runner.sh
RUN chmod +x /app/docker-test-runner.sh

CMD ["/app/docker-test-runner.sh"]
EOF

    # Build Docker test image
    print_info "Building Docker test image..."
    if docker build -f "$OUTPUT_DIR/Dockerfile.test" -t seiron-3d-test . 2>&1 | tee "$OUTPUT_DIR/logs/docker-build.log"; then
        print_success "Docker test image built successfully"
    else
        print_error "Failed to build Docker test image"
        return 1
    fi
    
    # Run tests in Docker container
    print_info "Running tests in Docker container..."
    if docker run --rm \
        -v "$PWD/$OUTPUT_DIR:/app/test-results" \
        -e TEST_URL="$URL" \
        -e TEST_TIMEOUT="$TIMEOUT" \
        -e TEST_OUTPUT_DIR="/app/test-results/docker" \
        -e RUN_PUPPETEER="$RUN_PUPPETEER" \
        -e RUN_PLAYWRIGHT="$RUN_PLAYWRIGHT" \
        -e RUN_ENHANCED="$RUN_ENHANCED" \
        -e STRESS_TEST="$STRESS_TEST" \
        -e PERFORMANCE_PROFILE="false" \
        -e VERBOSE="$VERBOSE" \
        seiron-3d-test 2>&1 | tee "$OUTPUT_DIR/logs/docker-tests.log"; then
        print_success "Docker tests completed successfully"
    else
        print_warning "Docker tests completed with issues"
    fi
    
    # Cleanup Docker image if requested
    if [ "$CLEANUP" = "true" ]; then
        print_info "Cleaning up Docker test image..."
        docker rmi seiron-3d-test >/dev/null 2>&1 || true
    fi
}

# Function to analyze test results
analyze_results() {
    print_section "Analyzing Test Results"
    
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    local health_scores=()
    
    # Analyze Puppeteer results
    if [ "$RUN_PUPPETEER" = "true" ]; then
        print_info "Analyzing Puppeteer results..."
        
        # Count JSON reports
        puppeteer_reports=$(find "$OUTPUT_DIR/puppeteer" -name "*.json" 2>/dev/null | wc -l)
        total_tests=$((total_tests + puppeteer_reports))
        
        # Extract health scores from JSON reports
        for report in $(find "$OUTPUT_DIR/puppeteer" -name "*diagnosis*.json" 2>/dev/null); do
            if [ -f "$report" ]; then
                health_score=$(jq -r '.healthScore // 0' "$report" 2>/dev/null || echo "0")
                if [ "$health_score" != "null" ] && [ "$health_score" != "0" ]; then
                    health_scores+=("$health_score")
                    if [ "$(echo "$health_score > 50" | bc -l 2>/dev/null || echo "0")" = "1" ]; then
                        passed_tests=$((passed_tests + 1))
                    else
                        failed_tests=$((failed_tests + 1))
                    fi
                fi
            fi
        done
    fi
    
    # Analyze Playwright results
    if [ "$RUN_PLAYWRIGHT" = "true" ]; then
        print_info "Analyzing Playwright results..."
        
        # Check for Playwright JSON results
        playwright_json="$OUTPUT_DIR/playwright/results.json"
        if [ -f "$playwright_json" ]; then
            # Extract test counts from Playwright results
            pw_passed=$(jq -r '.stats.passed // 0' "$playwright_json" 2>/dev/null || echo "0")
            pw_failed=$(jq -r '.stats.failed // 0' "$playwright_json" 2>/dev/null || echo "0")
            pw_total=$(jq -r '.stats.total // 0' "$playwright_json" 2>/dev/null || echo "0")
            
            total_tests=$((total_tests + pw_total))
            passed_tests=$((passed_tests + pw_passed))
            failed_tests=$((failed_tests + pw_failed))
        fi
    fi
    
    # Calculate overall statistics
    local success_rate=0
    if [ "$total_tests" -gt 0 ]; then
        success_rate=$(echo "scale=1; $passed_tests * 100 / $total_tests" | bc -l 2>/dev/null || echo "0")
    fi
    
    local avg_health_score=0
    if [ ${#health_scores[@]} -gt 0 ]; then
        local sum=0
        for score in "${health_scores[@]}"; do
            sum=$(echo "$sum + $score" | bc -l 2>/dev/null || echo "$sum")
        done
        avg_health_score=$(echo "scale=1; $sum / ${#health_scores[@]}" | bc -l 2>/dev/null || echo "0")
    fi
    
    # Generate summary report
    cat > "$OUTPUT_DIR/test-summary.json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "configuration": {
    "url": "$URL",
    "timeout": $TIMEOUT,
    "puppeteer_enabled": $RUN_PUPPETEER,
    "playwright_enabled": $RUN_PLAYWRIGHT,
    "enhanced_enabled": $RUN_ENHANCED,
    "stress_test": $STRESS_TEST,
    "performance_profile": $PERFORMANCE_PROFILE
  },
  "results": {
    "total_tests": $total_tests,
    "passed_tests": $passed_tests,
    "failed_tests": $failed_tests,
    "success_rate": $success_rate,
    "average_health_score": $avg_health_score,
    "health_scores": [$(IFS=,; echo "${health_scores[*]}")]
  },
  "files": {
    "output_directory": "$OUTPUT_DIR",
    "screenshots": $(find "$OUTPUT_DIR" -name "*.png" 2>/dev/null | wc -l),
    "json_reports": $(find "$OUTPUT_DIR" -name "*.json" 2>/dev/null | wc -l),
    "log_files": $(find "$OUTPUT_DIR/logs" -name "*.log" 2>/dev/null | wc -l)
  }
}
EOF
    
    # Print summary
    print_success "Test Summary Generated"
    echo ""
    print_color $CYAN "TEST RESULTS SUMMARY:"
    print_color $CYAN "===================="
    echo "Total Tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $failed_tests"
    echo "Success Rate: ${success_rate}%"
    if [ "$avg_health_score" != "0" ]; then
        echo "Average Health Score: ${avg_health_score}/100"
    fi
    echo "Output Directory: $OUTPUT_DIR"
    echo "Screenshots: $(find "$OUTPUT_DIR" -name "*.png" 2>/dev/null | wc -l)"
    echo "Reports: $(find "$OUTPUT_DIR" -name "*.json" 2>/dev/null | wc -l)"
    echo ""
    
    # Determine overall result
    if [ "$success_rate" = "0" ] && [ "$total_tests" -gt 0 ]; then
        print_error "All tests failed"
        return 1
    elif [ "$(echo "$success_rate < 50" | bc -l 2>/dev/null || echo "1")" = "1" ] && [ "$total_tests" -gt 0 ]; then
        print_warning "More than 50% of tests failed"
        return 1
    else
        print_success "Tests completed successfully"
        return 0
    fi
}

# Function to cleanup resources
cleanup_resources() {
    if [ "$CLEANUP" != "true" ]; then
        return 0
    fi
    
    print_section "Cleaning Up Resources"
    
    # Kill development server if we started it
    if [ -n "$DEV_SERVER_PID" ]; then
        print_info "Stopping development server..."
        kill $DEV_SERVER_PID 2>/dev/null || true
        wait $DEV_SERVER_PID 2>/dev/null || true
        print_success "Development server stopped"
    fi
    
    # Clean up temporary Docker files
    if [ -f "$OUTPUT_DIR/Dockerfile.test" ]; then
        rm -f "$OUTPUT_DIR/Dockerfile.test"
        print_success "Temporary Docker files cleaned up"
    fi
    
    print_success "Cleanup completed"
}

# Function to show usage
show_usage() {
    cat << EOF
Docker Test Runner for 3D Model Loading

Usage: $0 [options]

Options:
  --url <url>              Target URL (default: $DEFAULT_URL)
  --timeout <ms>           Test timeout (default: $DEFAULT_TIMEOUT)
  --output <dir>           Output directory (default: $DEFAULT_OUTPUT_DIR)
  --docker-image <image>   Docker image to use (default: $DEFAULT_DOCKER_IMAGE)
  --no-puppeteer           Skip Puppeteer tests
  --no-playwright          Skip Playwright tests
  --no-enhanced            Skip enhanced diagnostics
  --stress-test            Enable stress testing
  --performance-profile    Enable performance profiling
  --verbose                Enable verbose output
  --no-cleanup             Skip cleanup after tests
  --parallel               Run tests in parallel (experimental)
  --help                   Show this help message

Environment Variables:
  TEST_URL                 Override URL
  TEST_TIMEOUT             Override timeout
  TEST_OUTPUT_DIR          Override output directory
  RUN_PUPPETEER            Enable/disable Puppeteer tests (true/false)
  RUN_PLAYWRIGHT           Enable/disable Playwright tests (true/false)
  RUN_ENHANCED             Enable/disable enhanced diagnostics (true/false)
  STRESS_TEST              Enable/disable stress testing (true/false)
  PERFORMANCE_PROFILE      Enable/disable performance profiling (true/false)
  VERBOSE                  Enable/disable verbose output (true/false)
  CLEANUP                  Enable/disable cleanup (true/false)

Examples:
  $0 --stress-test --performance-profile
  $0 --url http://localhost:4000 --verbose
  $0 --no-puppeteer --output ./my-test-results
  
  # Using environment variables:
  TEST_URL=http://localhost:4000 STRESS_TEST=true $0

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            URL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --docker-image)
            DOCKER_IMAGE="$2"
            shift 2
            ;;
        --no-puppeteer)
            RUN_PUPPETEER="false"
            shift
            ;;
        --no-playwright)
            RUN_PLAYWRIGHT="false"
            shift
            ;;
        --no-enhanced)
            RUN_ENHANCED="false"
            shift
            ;;
        --stress-test)
            STRESS_TEST="true"
            shift
            ;;
        --performance-profile)
            PERFORMANCE_PROFILE="true"
            shift
            ;;
        --verbose)
            VERBOSE="true"
            shift
            ;;
        --no-cleanup)
            CLEANUP="false"
            shift
            ;;
        --parallel)
            PARALLEL="true"
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    local start_time=$(date +%s)
    
    print_header "Seiron 3D Model Loading - Comprehensive Test Suite"
    
    # Trap for cleanup on exit
    trap cleanup_resources EXIT
    
    # Run test pipeline
    check_prerequisites
    setup_test_environment
    check_dev_server
    
    if [ "$PARALLEL" = "true" ]; then
        print_info "Running tests in parallel mode..."
        (run_puppeteer_tests) &
        PUPPETEER_PID=$!
        (run_playwright_tests) &
        PLAYWRIGHT_PID=$!
        
        wait $PUPPETEER_PID
        PUPPETEER_RESULT=$?
        wait $PLAYWRIGHT_PID
        PLAYWRIGHT_RESULT=$?
        
        if [ $PUPPETEER_RESULT -ne 0 ] || [ $PLAYWRIGHT_RESULT -ne 0 ]; then
            print_warning "Some parallel tests had issues"
        fi
    else
        run_puppeteer_tests
        run_playwright_tests
    fi
    
    # Optionally run Docker-based tests
    if [ "$RUN_DOCKER" = "true" ] || [ -n "$DOCKER_IMAGE" ]; then
        run_docker_tests
    fi
    
    # Analyze results
    analyze_results
    local analysis_result=$?
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    print_header "Test Suite Completed"
    print_info "Total Duration: ${total_duration}s"
    print_info "Results: $OUTPUT_DIR/test-summary.json"
    
    if [ $analysis_result -eq 0 ]; then
        print_success "All tests passed successfully!"
        exit 0
    else
        print_warning "Some tests failed or had issues"
        exit 1
    fi
}

# Run main function
main "$@"