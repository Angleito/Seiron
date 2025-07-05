#!/bin/bash

# Seiron Log Backup Script
# Creates compressed backups of log files and manages backup retention

set -euo pipefail

LOG_DIR="${LOG_DIR:-/logs}"
BACKUP_DIR="${BACKUP_DIR:-/logs/backups}"
BACKUP_RETENTION_DAYS="${LOG_BACKUP_RETENTION:-90}"
BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    esac
}

create_backup() {
    local service="$1"
    local service_log_dir="$LOG_DIR/$service"
    
    if [[ ! -d "$service_log_dir" ]]; then
        log "WARN" "Service log directory not found: $service_log_dir"
        return 1
    fi
    
    local backup_file="$BACKUP_DIR/${service}-logs-${BACKUP_TIMESTAMP}.tar.gz"
    
    log "INFO" "Creating backup for $service service"
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Create compressed backup
    if tar -czf "$backup_file" -C "$LOG_DIR" "$service" 2>/dev/null; then
        local backup_size=$(du -h "$backup_file" | cut -f1)
        log "INFO" "Backup created successfully: $backup_file (Size: $backup_size)"
        
        # Create backup metadata
        cat > "${backup_file}.meta" << EOF
{
    "service": "$service",
    "backup_timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')",
    "backup_file": "$backup_file",
    "backup_size": "$backup_size",
    "original_path": "$service_log_dir",
    "retention_days": $BACKUP_RETENTION_DAYS
}
EOF
        
        return 0
    else
        log "ERROR" "Failed to create backup for $service"
        return 1
    fi
}

cleanup_old_backups() {
    log "INFO" "Cleaning up old backups (older than $BACKUP_RETENTION_DAYS days)"
    
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +${BACKUP_RETENTION_DAYS} -print0 | while IFS= read -r -d '' file; do
        log "INFO" "Removing old backup: $file"
        rm -f "$file"
        rm -f "${file}.meta"
    done
}

verify_backup() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        log "ERROR" "Backup file not found: $backup_file"
        return 1
    fi
    
    # Test if the tar file is valid
    if tar -tzf "$backup_file" >/dev/null 2>&1; then
        log "INFO" "Backup verification successful: $backup_file"
        return 0
    else
        log "ERROR" "Backup verification failed: $backup_file"
        return 1
    fi
}

generate_backup_report() {
    local report_file="$BACKUP_DIR/backup-report-${BACKUP_TIMESTAMP}.json"
    
    log "INFO" "Generating backup report"
    
    local total_backups=$(find "$BACKUP_DIR" -name "*.tar.gz" -type f | wc -l)
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    local oldest_backup=$(find "$BACKUP_DIR" -name "*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | head -1 | cut -d' ' -f2-)
    local newest_backup=$(find "$BACKUP_DIR" -name "*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    
    cat > "$report_file" << EOF
{
    "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')",
    "backup_summary": {
        "total_backups": $total_backups,
        "total_size": "$total_size",
        "oldest_backup": "$oldest_backup",
        "newest_backup": "$newest_backup",
        "retention_days": $BACKUP_RETENTION_DAYS
    },
    "services_backed_up": [
        $(find "$BACKUP_DIR" -name "*-logs-*.tar.gz" -type f | sed 's/.*\/\([^-]*\)-logs-.*/"\1"/' | sort -u | paste -sd,)
    ]
}
EOF
    
    log "INFO" "Backup report generated: $report_file"
}

main() {
    log "INFO" "Starting Seiron Log Backup Process"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Services to backup
    local services=("backend" "frontend" "redis" "prometheus" "grafana")
    local successful_backups=0
    local failed_backups=0
    
    # Create backups for each service
    for service in "${services[@]}"; do
        if create_backup "$service"; then
            ((successful_backups++))
        else
            ((failed_backups++))
        fi
    done
    
    # Verify recent backups
    find "$BACKUP_DIR" -name "*-logs-${BACKUP_TIMESTAMP}.tar.gz" -type f | while read -r backup_file; do
        verify_backup "$backup_file"
    done
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Generate backup report
    generate_backup_report
    
    log "INFO" "Backup process completed - Successful: $successful_backups, Failed: $failed_backups"
    
    if [[ $failed_backups -gt 0 ]]; then
        exit 1
    fi
}

# Handle signals
trap 'log "INFO" "Received shutdown signal, stopping backup process"; exit 0' SIGTERM SIGINT

# Install required packages if not present
if ! command -v tar >/dev/null 2>&1; then
    apk add --no-cache tar
fi

# Start backup process
main "$@"