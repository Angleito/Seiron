#!/bin/bash

# Seiron Log Monitor Script
# Monitors log files for errors, manages retention, and provides alerts

set -euo pipefail

LOG_LEVEL="${LOG_LEVEL:-info}"
LOG_RETENTION_DAYS="${LOG_RETENTION_DAYS:-30}"
LOG_ALERT_THRESHOLD="${LOG_ALERT_THRESHOLD:-100}"
LOG_DIR="/logs"
MONITOR_INTERVAL="${MONITOR_INTERVAL:-60}"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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
            if [[ "$LOG_LEVEL" == "debug" ]]; then
                echo -e "${BLUE}[$timestamp] [DEBUG] $message${NC}"
            fi
            ;;
    esac
}

# Function to clean up old logs
cleanup_old_logs() {
    log "INFO" "Starting log cleanup process"
    
    # Find and remove log files older than retention period
    find "$LOG_DIR" -name "*.log" -type f -mtime +${LOG_RETENTION_DAYS} -print0 | while IFS= read -r -d '' file; do
        log "INFO" "Removing old log file: $file"
        rm -f "$file"
    done
    
    # Compress logs older than 7 days but within retention period
    find "$LOG_DIR" -name "*.log" -type f -mtime +7 -mtime -${LOG_RETENTION_DAYS} -print0 | while IFS= read -r -d '' file; do
        if [[ ! "$file" =~ \.gz$ ]]; then
            log "INFO" "Compressing log file: $file"
            gzip "$file"
        fi
    done
    
    log "INFO" "Log cleanup completed"
}

# Function to check disk usage
check_disk_usage() {
    local usage=$(df "$LOG_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [[ $usage -gt 80 ]]; then
        log "WARN" "Disk usage is high: ${usage}%"
        return 1
    elif [[ $usage -gt 90 ]]; then
        log "ERROR" "Disk usage is critical: ${usage}%"
        return 2
    else
        log "DEBUG" "Disk usage is normal: ${usage}%"
        return 0
    fi
}

# Function to monitor error rates
monitor_error_rates() {
    local service="$1"
    local log_file="$2"
    
    if [[ ! -f "$log_file" ]]; then
        log "DEBUG" "Log file not found: $log_file"
        return 0
    fi
    
    # Count errors in the last 5 minutes
    local error_count=$(grep -c "ERROR\|FATAL\|PANIC" "$log_file" 2>/dev/null | tail -n 1000 | wc -l)
    
    if [[ $error_count -gt $LOG_ALERT_THRESHOLD ]]; then
        log "ERROR" "High error rate detected in $service: $error_count errors"
        
        # Create alert file
        local alert_file="$LOG_DIR/alerts/error-alert-$(date +%Y%m%d-%H%M%S).json"
        mkdir -p "$LOG_DIR/alerts"
        
        cat > "$alert_file" << EOF
{
    "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')",
    "service": "$service",
    "alert_type": "high_error_rate",
    "error_count": $error_count,
    "threshold": $LOG_ALERT_THRESHOLD,
    "log_file": "$log_file",
    "severity": "high"
}
EOF
        
        return 1
    fi
    
    return 0
}

# Function to check service health
check_service_health() {
    local service="$1"
    local log_file="$2"
    
    if [[ ! -f "$log_file" ]]; then
        log "WARN" "No log file found for service: $service"
        return 1
    fi
    
    # Check if service has logged anything in the last 5 minutes
    local recent_logs=$(find "$log_file" -newermt "5 minutes ago" 2>/dev/null | wc -l)
    
    if [[ $recent_logs -eq 0 ]]; then
        log "WARN" "No recent logs from service: $service"
        return 1
    fi
    
    # Check for health check failures
    local health_failures=$(grep -c "health.*fail\|healthcheck.*fail" "$log_file" 2>/dev/null || echo 0)
    
    if [[ $health_failures -gt 0 ]]; then
        log "ERROR" "Health check failures detected in $service: $health_failures failures"
        return 2
    fi
    
    return 0
}

# Function to generate log summary
generate_log_summary() {
    local summary_file="$LOG_DIR/summary/log-summary-$(date +%Y%m%d-%H%M%S).json"
    mkdir -p "$LOG_DIR/summary"
    
    log "INFO" "Generating log summary"
    
    # Count log entries by service and level
    local backend_errors=$(find "$LOG_DIR/backend" -name "*.log" -exec grep -c "ERROR\|FATAL" {} + 2>/dev/null | paste -sd+ | bc 2>/dev/null || echo 0)
    local frontend_errors=$(find "$LOG_DIR/frontend" -name "*.log" -exec grep -c "ERROR\|FATAL" {} + 2>/dev/null | paste -sd+ | bc 2>/dev/null || echo 0)
    local redis_errors=$(find "$LOG_DIR/redis" -name "*.log" -exec grep -c "ERROR\|FATAL" {} + 2>/dev/null | paste -sd+ | bc 2>/dev/null || echo 0)
    
    local total_errors=$((backend_errors + frontend_errors + redis_errors))
    
    # Calculate disk usage
    local disk_usage=$(df "$LOG_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    local disk_used=$(df "$LOG_DIR" | tail -1 | awk '{print $3}')
    local disk_available=$(df "$LOG_DIR" | tail -1 | awk '{print $4}')
    
    cat > "$summary_file" << EOF
{
    "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')",
    "period": "last_${MONITOR_INTERVAL}_seconds",
    "services": {
        "backend": {
            "errors": $backend_errors,
            "status": "$(check_service_health backend "$LOG_DIR/backend/backend-aggregated.log" && echo "healthy" || echo "unhealthy")"
        },
        "frontend": {
            "errors": $frontend_errors,
            "status": "$(check_service_health frontend "$LOG_DIR/frontend/frontend-aggregated.log" && echo "healthy" || echo "unhealthy")"
        },
        "redis": {
            "errors": $redis_errors,
            "status": "$(check_service_health redis "$LOG_DIR/redis/redis-aggregated.log" && echo "healthy" || echo "unhealthy")"
        }
    },
    "totals": {
        "total_errors": $total_errors,
        "error_rate": "$(echo "scale=2; $total_errors / $MONITOR_INTERVAL" | bc -l 2>/dev/null || echo 0)"
    },
    "disk": {
        "usage_percent": $disk_usage,
        "used_kb": $disk_used,
        "available_kb": $disk_available
    }
}
EOF
    
    log "INFO" "Log summary generated: $summary_file"
}

# Function to setup log rotation
setup_log_rotation() {
    log "INFO" "Setting up log rotation"
    
    # Create logrotate configuration
    cat > /tmp/seiron-logrotate.conf << EOF
$LOG_DIR/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    postrotate
        # Restart log aggregator if needed
        /usr/bin/docker exec seiron-log-aggregator pkill -HUP fluent-bit 2>/dev/null || true
    endscript
}

$LOG_DIR/**/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
EOF
    
    # Apply logrotate configuration
    if command -v logrotate >/dev/null 2>&1; then
        logrotate -f /tmp/seiron-logrotate.conf
    fi
}

# Function to monitor performance metrics
monitor_performance() {
    local perf_file="$LOG_DIR/performance/performance-$(date +%Y%m%d-%H%M%S).json"
    mkdir -p "$LOG_DIR/performance"
    
    # Extract performance metrics from logs
    local avg_response_time=$(grep -r "duration.*ms" "$LOG_DIR" 2>/dev/null | grep -oE '[0-9]+ms' | sed 's/ms//' | awk '{sum+=$1; count++} END {print (count>0) ? sum/count : 0}')
    local slow_requests=$(grep -r "duration.*ms" "$LOG_DIR" 2>/dev/null | grep -oE '[0-9]+ms' | sed 's/ms//' | awk '$1 > 5000' | wc -l)
    
    cat > "$perf_file" << EOF
{
    "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')",
    "metrics": {
        "avg_response_time_ms": $avg_response_time,
        "slow_requests_count": $slow_requests,
        "monitoring_period_seconds": $MONITOR_INTERVAL
    }
}
EOF
    
    log "DEBUG" "Performance metrics recorded: avg_response_time=${avg_response_time}ms, slow_requests=${slow_requests}"
}

# Main monitoring loop
main() {
    log "INFO" "Starting Seiron Log Monitor"
    log "INFO" "Configuration: LOG_LEVEL=$LOG_LEVEL, RETENTION_DAYS=$LOG_RETENTION_DAYS, ALERT_THRESHOLD=$LOG_ALERT_THRESHOLD"
    
    # Create necessary directories
    mkdir -p "$LOG_DIR/alerts" "$LOG_DIR/summary" "$LOG_DIR/performance"
    
    # Setup log rotation
    setup_log_rotation
    
    # Initial cleanup
    cleanup_old_logs
    
    while true; do
        log "DEBUG" "Starting monitoring cycle"
        
        # Check disk usage
        check_disk_usage
        
        # Monitor each service
        monitor_error_rates "backend" "$LOG_DIR/backend/backend-aggregated.log"
        monitor_error_rates "frontend" "$LOG_DIR/frontend/frontend-aggregated.log"
        monitor_error_rates "redis" "$LOG_DIR/redis/redis-aggregated.log"
        
        # Generate summary
        generate_log_summary
        
        # Monitor performance
        monitor_performance
        
        # Cleanup old logs every hour
        if [[ $(date +%M) == "00" ]]; then
            cleanup_old_logs
        fi
        
        log "DEBUG" "Monitoring cycle completed, sleeping for $MONITOR_INTERVAL seconds"
        sleep "$MONITOR_INTERVAL"
    done
}

# Handle signals
trap 'log "INFO" "Received shutdown signal, stopping log monitor"; exit 0' SIGTERM SIGINT

# Install required packages
apk add --no-cache bc findutils gzip coreutils

# Start monitoring
main