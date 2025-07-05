#!/bin/bash

# Seiron Log Analysis Script
# Analyzes log files and generates insights and reports

set -euo pipefail

LOG_DIR="${LOG_DIR:-/logs}"
ANALYSIS_DIR="${ANALYSIS_DIR:-/logs/analysis}"
ANALYSIS_TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "ERROR")
            echo -e "${RED}[$timestamp] [ERROR] $message${NC}" >&2
            ;;
        "WARN")
            echo -e "${YELLOW}[$timestamp] [WARN] $message${NC}" >&2
            ;;
        "INFO")
            echo -e "${GREEN}[$timestamp] [INFO] $message${NC}"
            ;;
        "DEBUG")
            echo -e "${BLUE}[$timestamp] [DEBUG] $message${NC}"
            ;;
    esac
}

analyze_error_patterns() {
    local service="$1"
    local log_file="$2"
    local analysis_file="$ANALYSIS_DIR/${service}-error-analysis-${ANALYSIS_TIMESTAMP}.json"
    
    if [[ ! -f "$log_file" ]]; then
        log "WARN" "Log file not found: $log_file"
        return 1
    fi
    
    log "INFO" "Analyzing error patterns for $service"
    
    # Extract error patterns
    local total_errors=$(grep -c "ERROR\|FATAL\|PANIC" "$log_file" 2>/dev/null || echo 0)
    local unique_errors=$(grep "ERROR\|FATAL\|PANIC" "$log_file" 2>/dev/null | sed 's/.*\(ERROR\|FATAL\|PANIC\).*/\1/' | sort | uniq -c | sort -rn || echo "")
    local top_errors=$(grep "ERROR\|FATAL\|PANIC" "$log_file" 2>/dev/null | head -10 || echo "")
    
    # Get error distribution by hour
    local hourly_errors=$(grep "ERROR\|FATAL\|PANIC" "$log_file" 2>/dev/null | grep -oE '[0-9]{2}:[0-9]{2}:[0-9]{2}' | cut -d: -f1 | sort | uniq -c | sort -rn || echo "")
    
    mkdir -p "$ANALYSIS_DIR"
    
    cat > "$analysis_file" << EOF
{
    "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')",
    "service": "$service",
    "log_file": "$log_file",
    "error_summary": {
        "total_errors": $total_errors,
        "analysis_period": "last_24_hours",
        "top_error_types": [
            $(echo "$unique_errors" | head -5 | awk '{print "{\"type\": \"" $2 "\", \"count\": " $1 "}"}' | paste -sd,)
        ],
        "hourly_distribution": [
            $(echo "$hourly_errors" | awk '{print "{\"hour\": \"" $2 "\", \"count\": " $1 "}"}' | paste -sd,)
        ]
    },
    "sample_errors": [
        $(echo "$top_errors" | head -5 | sed 's/"/\\"/g' | awk '{print "\"" $0 "\""}' | paste -sd,)
    ]
}
EOF
    
    log "INFO" "Error analysis completed for $service: $total_errors errors found"
}

analyze_performance_metrics() {
    local service="$1"
    local log_file="$2"
    local analysis_file="$ANALYSIS_DIR/${service}-performance-analysis-${ANALYSIS_TIMESTAMP}.json"
    
    if [[ ! -f "$log_file" ]]; then
        log "WARN" "Log file not found: $log_file"
        return 1
    fi
    
    log "INFO" "Analyzing performance metrics for $service"
    
    # Extract performance metrics
    local response_times=$(grep -oE 'duration.*[0-9]+' "$log_file" 2>/dev/null | grep -oE '[0-9]+' || echo "")
    local slow_requests=$(echo "$response_times" | awk '$1 > 5000' | wc -l)
    local avg_response_time=$(echo "$response_times" | awk '{sum+=$1; count++} END {print (count>0) ? sum/count : 0}')
    local max_response_time=$(echo "$response_times" | sort -n | tail -1)
    local min_response_time=$(echo "$response_times" | sort -n | head -1)
    
    # Memory usage patterns
    local memory_usage=$(grep -oE 'memory.*[0-9]+MB' "$log_file" 2>/dev/null | grep -oE '[0-9]+' || echo "")
    local max_memory=$(echo "$memory_usage" | sort -n | tail -1)
    local avg_memory=$(echo "$memory_usage" | awk '{sum+=$1; count++} END {print (count>0) ? sum/count : 0}')
    
    mkdir -p "$ANALYSIS_DIR"
    
    cat > "$analysis_file" << EOF
{
    "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')",
    "service": "$service",
    "log_file": "$log_file",
    "performance_metrics": {
        "response_times": {
            "average_ms": $avg_response_time,
            "max_ms": ${max_response_time:-0},
            "min_ms": ${min_response_time:-0},
            "slow_requests_count": $slow_requests,
            "slow_threshold_ms": 5000
        },
        "memory_usage": {
            "max_mb": ${max_memory:-0},
            "average_mb": $avg_memory
        }
    },
    "analysis_period": "last_24_hours"
}
EOF
    
    log "INFO" "Performance analysis completed for $service: avg_response_time=${avg_response_time}ms, slow_requests=${slow_requests}"
}

analyze_usage_patterns() {
    local service="$1"
    local log_file="$2"
    local analysis_file="$ANALYSIS_DIR/${service}-usage-analysis-${ANALYSIS_TIMESTAMP}.json"
    
    if [[ ! -f "$log_file" ]]; then
        log "WARN" "Log file not found: $log_file"
        return 1
    fi
    
    log "INFO" "Analyzing usage patterns for $service"
    
    # Request patterns
    local total_requests=$(grep -c "request\|POST\|GET\|PUT\|DELETE" "$log_file" 2>/dev/null || echo 0)
    local unique_endpoints=$(grep -oE '(POST|GET|PUT|DELETE) [^ ]+' "$log_file" 2>/dev/null | sort | uniq -c | sort -rn || echo "")
    local top_endpoints=$(echo "$unique_endpoints" | head -10)
    
    # User activity patterns
    local unique_users=$(grep -oE 'walletAddress.*0x[a-fA-F0-9]+' "$log_file" 2>/dev/null | sort | uniq | wc -l)
    local active_hours=$(grep -oE '[0-9]{2}:[0-9]{2}:[0-9]{2}' "$log_file" 2>/dev/null | cut -d: -f1 | sort | uniq -c | sort -rn || echo "")
    
    mkdir -p "$ANALYSIS_DIR"
    
    cat > "$analysis_file" << EOF
{
    "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')",
    "service": "$service",
    "log_file": "$log_file",
    "usage_patterns": {
        "total_requests": $total_requests,
        "unique_users": $unique_users,
        "top_endpoints": [
            $(echo "$top_endpoints" | head -5 | awk '{print "{\"endpoint\": \"" $2 " " $3 "\", \"count\": " $1 "}"}' | paste -sd,)
        ],
        "peak_hours": [
            $(echo "$active_hours" | head -5 | awk '{print "{\"hour\": \"" $2 "\", \"requests\": " $1 "}"}' | paste -sd,)
        ]
    },
    "analysis_period": "last_24_hours"
}
EOF
    
    log "INFO" "Usage analysis completed for $service: total_requests=${total_requests}, unique_users=${unique_users}"
}

generate_comprehensive_report() {
    local report_file="$ANALYSIS_DIR/comprehensive-report-${ANALYSIS_TIMESTAMP}.json"
    
    log "INFO" "Generating comprehensive analysis report"
    
    # Collect all analysis files
    local error_analyses=$(find "$ANALYSIS_DIR" -name "*-error-analysis-${ANALYSIS_TIMESTAMP}.json" -type f)
    local performance_analyses=$(find "$ANALYSIS_DIR" -name "*-performance-analysis-${ANALYSIS_TIMESTAMP}.json" -type f)
    local usage_analyses=$(find "$ANALYSIS_DIR" -name "*-usage-analysis-${ANALYSIS_TIMESTAMP}.json" -type f)
    
    # Calculate overall statistics
    local total_log_files=$(find "$LOG_DIR" -name "*.log" -type f | wc -l)
    local total_log_size=$(du -sh "$LOG_DIR" | cut -f1)
    local analysis_files_count=$(find "$ANALYSIS_DIR" -name "*-${ANALYSIS_TIMESTAMP}.json" -type f | wc -l)
    
    cat > "$report_file" << EOF
{
    "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')",
    "analysis_id": "$ANALYSIS_TIMESTAMP",
    "summary": {
        "total_log_files": $total_log_files,
        "total_log_size": "$total_log_size",
        "analysis_files_generated": $analysis_files_count,
        "analysis_scope": "last_24_hours"
    },
    "analyses": {
        "error_analyses": [
            $(for file in $error_analyses; do echo "\"$file\""; done | paste -sd,)
        ],
        "performance_analyses": [
            $(for file in $performance_analyses; do echo "\"$file\""; done | paste -sd,)
        ],
        "usage_analyses": [
            $(for file in $usage_analyses; do echo "\"$file\""; done | paste -sd,)
        ]
    },
    "recommendations": [
        "Review error patterns for recurring issues",
        "Monitor performance metrics for optimization opportunities",
        "Analyze usage patterns for capacity planning",
        "Implement alerting for critical error thresholds"
    ]
}
EOF
    
    log "INFO" "Comprehensive report generated: $report_file"
}

main() {
    log "INFO" "Starting Seiron Log Analysis Process"
    
    # Create analysis directory
    mkdir -p "$ANALYSIS_DIR"
    
    # Services to analyze
    local services=("backend" "frontend" "redis" "prometheus" "grafana")
    
    # Analyze each service
    for service in "${services[@]}"; do
        local aggregated_log="$LOG_DIR/$service/${service}-aggregated.log"
        local dev_log="$LOG_DIR/$service/${service}-dev.log"
        local service_log="$LOG_DIR/$service/${service}.log"
        
        # Find the most recent log file for the service
        local log_file=""
        if [[ -f "$aggregated_log" ]]; then
            log_file="$aggregated_log"
        elif [[ -f "$dev_log" ]]; then
            log_file="$dev_log"
        elif [[ -f "$service_log" ]]; then
            log_file="$service_log"
        else
            log "WARN" "No log file found for service: $service"
            continue
        fi
        
        # Perform analyses
        analyze_error_patterns "$service" "$log_file"
        analyze_performance_metrics "$service" "$log_file"
        analyze_usage_patterns "$service" "$log_file"
    done
    
    # Generate comprehensive report
    generate_comprehensive_report
    
    log "INFO" "Log analysis process completed"
}

# Handle signals
trap 'log "INFO" "Received shutdown signal, stopping analysis process"; exit 0' SIGTERM SIGINT

# Install required packages if not present
if ! command -v awk >/dev/null 2>&1; then
    apk add --no-cache gawk
fi

# Start analysis process
main "$@"