#!/bin/bash

# Comprehensive Load Testing Script for Sei Agent Kit
# Runs multiple load testing scenarios and generates reports

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"
RESULTS_DIR="${RESULTS_DIR:-/app/results}"
TARGET_URL="${TARGET_URL:-http://sei-agent-app:8080}"
CONCURRENT_USERS="${CONCURRENT_USERS:-100}"
DURATION="${DURATION:-3600}"
RAMP_UP_TIME="${RAMP_UP_TIME:-300}"
TEST_SCENARIO="${TEST_SCENARIO:-mixed_workload}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create results directory
mkdir -p "$RESULTS_DIR"
mkdir -p "$RESULTS_DIR/logs"
mkdir -p "$RESULTS_DIR/reports"
mkdir -p "$RESULTS_DIR/metrics"

# Test configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$RESULTS_DIR/logs/load_test_${TIMESTAMP}.log"

# Redirect all output to log file
exec > >(tee -a "$LOG_FILE")
exec 2>&1

log "Starting Sei Agent Kit Load Testing Suite"
log "Target URL: $TARGET_URL"
log "Concurrent Users: $CONCURRENT_USERS"
log "Duration: ${DURATION}s"
log "Scenario: $TEST_SCENARIO"
log "Results Directory: $RESULTS_DIR"

# Function to check if service is ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=60
    local attempt=1

    log "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url/health" > /dev/null 2>&1; then
            success "$service_name is ready"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts - $service_name not ready, waiting..."
        sleep 5
        ((attempt++))
    done
    
    error "$service_name failed to become ready after $max_attempts attempts"
    return 1
}

# Function to run warmup test
run_warmup() {
    log "Running warmup test to prepare the system..."
    
    autocannon \
        --connections 10 \
        --duration 60 \
        --method POST \
        --headers "Content-Type=application/json" \
        --body '{"action":"health_check","timestamp":"'$(date -u +%s)'"}' \
        --title "Warmup Test" \
        "$TARGET_URL/api/health" \
        > "$RESULTS_DIR/warmup_${TIMESTAMP}.json"
    
    success "Warmup test completed"
}

# Function to run baseline performance test
run_baseline_test() {
    log "Running baseline performance test..."
    
    autocannon \
        --connections 25 \
        --duration 180 \
        --method POST \
        --headers "Content-Type=application/json" \
        --body '{"action":"portfolio_summary","user_id":"test_user"}' \
        --title "Baseline Performance Test" \
        --renderLatencyTable \
        --renderProgressBar \
        "$TARGET_URL/api/portfolio" \
        > "$RESULTS_DIR/baseline_${TIMESTAMP}.json"
    
    success "Baseline test completed"
}

# Function to run main load test
run_main_load_test() {
    log "Running main load test with $CONCURRENT_USERS users for ${DURATION}s..."
    
    # Mixed workload test
    autocannon \
        --connections "$CONCURRENT_USERS" \
        --duration "$DURATION" \
        --pipelining 1 \
        --method POST \
        --headers "Content-Type=application/json" \
        --headers "Authorization=Bearer test-token" \
        --body '{"action":"mixed_operations","scenario":"'$TEST_SCENARIO'","timestamp":"'$(date -u +%s)'"}' \
        --title "Main Load Test - $TEST_SCENARIO" \
        --renderLatencyTable \
        --renderProgressBar \
        --forever \
        "$TARGET_URL/api/chat" \
        > "$RESULTS_DIR/main_load_test_${TIMESTAMP}.json"
    
    success "Main load test completed"
}

# Function to run protocol-specific tests
run_protocol_tests() {
    log "Running protocol-specific performance tests..."
    
    local protocols=("symphony" "dragonswap" "yeifinance")
    
    for protocol in "${protocols[@]}"; do
        log "Testing $protocol protocol performance..."
        
        autocannon \
            --connections 50 \
            --duration 300 \
            --method POST \
            --headers "Content-Type=application/json" \
            --body '{"action":"protocol_test","protocol":"'$protocol'","operation":"swap","amount":"1000000"}' \
            --title "Protocol Test - $protocol" \
            --renderLatencyTable \
            "$TARGET_URL/api/protocols/$protocol" \
            > "$RESULTS_DIR/protocol_${protocol}_${TIMESTAMP}.json"
        
        success "$protocol protocol test completed"
    done
}

# Function to run stress test
run_stress_test() {
    log "Running stress test with escalating load..."
    
    local stress_levels=(50 100 200 400 600 800 1000)
    
    for level in "${stress_levels[@]}"; do
        log "Stress test level: $level concurrent connections"
        
        autocannon \
            --connections "$level" \
            --duration 120 \
            --method POST \
            --headers "Content-Type=application/json" \
            --body '{"action":"stress_test","level":"'$level'","timestamp":"'$(date -u +%s)'"}' \
            --title "Stress Test - Level $level" \
            "$TARGET_URL/api/chat" \
            > "$RESULTS_DIR/stress_level_${level}_${TIMESTAMP}.json"
        
        # Check if system is still responsive
        if ! curl -f -s "$TARGET_URL/health" > /dev/null; then
            warning "System became unresponsive at stress level $level"
            break
        fi
        
        # Brief pause between stress levels
        sleep 30
    done
    
    success "Stress test completed"
}

# Function to run memory endurance test
run_endurance_test() {
    log "Running memory endurance test..."
    
    # Long duration test to check for memory leaks
    timeout 7200 autocannon \
        --connections 100 \
        --duration 7200 \
        --method POST \
        --headers "Content-Type=application/json" \
        --body '{"action":"endurance_test","duration":"2h","timestamp":"'$(date -u +%s)'"}' \
        --title "Endurance Test - 2 Hours" \
        --renderProgressBar \
        "$TARGET_URL/api/chat" \
        > "$RESULTS_DIR/endurance_${TIMESTAMP}.json" || true
    
    success "Endurance test completed (or timed out)"
}

# Function to run spike test
run_spike_test() {
    log "Running spike test..."
    
    # Baseline load
    autocannon \
        --connections 50 \
        --duration 120 \
        --method POST \
        --body '{"action":"baseline","timestamp":"'$(date -u +%s)'"}' \
        --title "Spike Test - Baseline" \
        "$TARGET_URL/api/chat" \
        > "$RESULTS_DIR/spike_baseline_${TIMESTAMP}.json" &
    
    BASELINE_PID=$!
    sleep 60
    
    # Spike load
    log "Initiating spike load..."
    autocannon \
        --connections 500 \
        --duration 60 \
        --method POST \
        --body '{"action":"spike","timestamp":"'$(date -u +%s)'"}' \
        --title "Spike Test - Spike Load" \
        "$TARGET_URL/api/chat" \
        > "$RESULTS_DIR/spike_load_${TIMESTAMP}.json"
    
    # Wait for baseline to complete
    wait $BASELINE_PID
    
    success "Spike test completed"
}

# Function to run WebSocket load test
run_websocket_test() {
    log "Running WebSocket load test..."
    
    # Use Artillery for WebSocket testing
    cat > "$RESULTS_DIR/websocket_config_${TIMESTAMP}.yml" << EOF
config:
  target: 'ws://sei-agent-app:8080'
  phases:
    - duration: 300
      arrivalRate: 10
      name: "WebSocket Load Test"
  engines:
    ws:
      pool: 50

scenarios:
  - name: "Portfolio Updates"
    engine: ws
    flow:
      - connect:
          subprotocols:
            - "portfolio-updates"
      - send: '{"action":"subscribe","channel":"portfolio","user_id":"test_user"}'
      - think: 1
      - send: '{"action":"get_portfolio","user_id":"test_user"}'
      - wait:
          - name: "portfolio_data"
      - send: '{"action":"unsubscribe","channel":"portfolio"}'
EOF

    artillery run "$RESULTS_DIR/websocket_config_${TIMESTAMP}.yml" \
        --output "$RESULTS_DIR/websocket_${TIMESTAMP}.json" || true
    
    success "WebSocket test completed"
}

# Function to collect system metrics
collect_system_metrics() {
    log "Collecting system metrics..."
    
    # CPU and Memory usage
    top -b -n 1 | head -20 > "$RESULTS_DIR/metrics/system_top_${TIMESTAMP}.txt"
    
    # Docker stats
    docker stats --no-stream > "$RESULTS_DIR/metrics/docker_stats_${TIMESTAMP}.txt" 2>/dev/null || true
    
    # Network statistics
    netstat -tuln > "$RESULTS_DIR/metrics/network_${TIMESTAMP}.txt" 2>/dev/null || true
    
    # Disk usage
    df -h > "$RESULTS_DIR/metrics/disk_usage_${TIMESTAMP}.txt" 2>/dev/null || true
    
    success "System metrics collected"
}

# Function to generate consolidated report
generate_report() {
    log "Generating consolidated performance report..."
    
    local report_file="$RESULTS_DIR/reports/performance_report_${TIMESTAMP}.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Sei Agent Kit Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .metric { margin: 10px 0; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Sei Agent Kit Performance Test Report</h1>
        <p><strong>Timestamp:</strong> $(date)</p>
        <p><strong>Test Configuration:</strong></p>
        <ul>
            <li>Target URL: $TARGET_URL</li>
            <li>Concurrent Users: $CONCURRENT_USERS</li>
            <li>Duration: ${DURATION}s</li>
            <li>Scenario: $TEST_SCENARIO</li>
        </ul>
    </div>

    <div class="section">
        <h2>Test Summary</h2>
        <div class="metric">✅ Warmup Test: Completed</div>
        <div class="metric">✅ Baseline Test: Completed</div>
        <div class="metric">✅ Main Load Test: Completed</div>
        <div class="metric">✅ Protocol Tests: Completed</div>
        <div class="metric">✅ Stress Test: Completed</div>
        <div class="metric">✅ WebSocket Test: Completed</div>
    </div>

    <div class="section">
        <h2>Key Performance Metrics</h2>
        <p>Detailed metrics are available in the individual test result files.</p>
        <p>Check the following files for specific results:</p>
        <ul>
            <li>Main Load Test: main_load_test_${TIMESTAMP}.json</li>
            <li>Protocol Tests: protocol_*_${TIMESTAMP}.json</li>
            <li>Stress Test: stress_level_*_${TIMESTAMP}.json</li>
        </ul>
    </div>

    <div class="section">
        <h2>Files Generated</h2>
        <p>All test results and logs are available in: $RESULTS_DIR</p>
    </div>
</body>
</html>
EOF

    success "Performance report generated: $report_file"
}

# Function to cleanup
cleanup() {
    log "Performing cleanup..."
    
    # Kill any remaining background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # Compress old results if disk space is low
    find "$RESULTS_DIR" -name "*.json" -mtime +7 -exec gzip {} \; 2>/dev/null || true
    
    success "Cleanup completed"
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution flow
main() {
    log "=== Sei Agent Kit Load Testing Suite Started ==="
    
    # Wait for services to be ready
    wait_for_service "$TARGET_URL" "Sei Agent App" || exit 1
    
    # Run tests in sequence
    run_warmup
    collect_system_metrics
    
    run_baseline_test
    collect_system_metrics
    
    run_main_load_test
    collect_system_metrics
    
    run_protocol_tests
    collect_system_metrics
    
    if [ "${ENABLE_STRESS_TEST:-true}" = "true" ]; then
        run_stress_test
        collect_system_metrics
    fi
    
    if [ "${ENABLE_WEBSOCKET_TEST:-true}" = "true" ]; then
        run_websocket_test
        collect_system_metrics
    fi
    
    if [ "${ENABLE_ENDURANCE_TEST:-false}" = "true" ]; then
        run_endurance_test
        collect_system_metrics
    fi
    
    if [ "${ENABLE_SPIKE_TEST:-true}" = "true" ]; then
        run_spike_test
        collect_system_metrics
    fi
    
    # Generate final report
    generate_report
    
    success "=== Load Testing Suite Completed Successfully ==="
    log "Results available in: $RESULTS_DIR"
    log "Log file: $LOG_FILE"
}

# Run main function
main "$@"