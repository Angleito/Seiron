#!/bin/bash

# Seiron Logging Setup Script
# Initializes log directories and sets proper permissions

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$BASE_DIR/logs"

log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")
            echo -e "${GREEN}[$timestamp] [INFO] $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}[$timestamp] [WARN] $message${NC}"
            ;;
        "DEBUG")
            echo -e "${BLUE}[$timestamp] [DEBUG] $message${NC}"
            ;;
    esac
}

create_log_directories() {
    log "INFO" "Creating log directory structure"
    
    # Main log directories
    local directories=(
        "$LOG_DIR"
        "$LOG_DIR/backend"
        "$LOG_DIR/frontend"
        "$LOG_DIR/redis"
        "$LOG_DIR/redis-test"
        "$LOG_DIR/backend-test"
        "$LOG_DIR/frontend-test"
        "$LOG_DIR/prometheus"
        "$LOG_DIR/grafana"
        "$LOG_DIR/alerts"
        "$LOG_DIR/analysis"
        "$LOG_DIR/summary"
        "$LOG_DIR/performance"
        "$LOG_DIR/backups"
    )
    
    for dir in "${directories[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log "DEBUG" "Created directory: $dir"
        else
            log "DEBUG" "Directory already exists: $dir"
        fi
    done
}

set_permissions() {
    log "INFO" "Setting log directory permissions"
    
    # Set directory permissions (readable/writable by owner and group)
    chmod -R 755 "$LOG_DIR"
    
    # Set specific permissions for sensitive directories
    chmod 750 "$LOG_DIR/backups"
    chmod 750 "$LOG_DIR/alerts"
    
    log "DEBUG" "Permissions set successfully"
}

create_gitkeep_files() {
    log "INFO" "Creating .gitkeep files for empty directories"
    
    local directories=(
        "$LOG_DIR/alerts"
        "$LOG_DIR/analysis"
        "$LOG_DIR/summary"
        "$LOG_DIR/performance"
        "$LOG_DIR/backups"
    )
    
    for dir in "${directories[@]}"; do
        local gitkeep_file="$dir/.gitkeep"
        if [[ ! -f "$gitkeep_file" ]]; then
            touch "$gitkeep_file"
            log "DEBUG" "Created .gitkeep in: $dir"
        fi
    done
}

verify_fluent_bit_config() {
    log "INFO" "Verifying Fluent Bit configuration files"
    
    local config_files=(
        "$BASE_DIR/docker/fluent-bit/fluent-bit.conf"
        "$BASE_DIR/docker/fluent-bit/fluent-bit.dev.conf"
        "$BASE_DIR/docker/fluent-bit/fluent-bit.test.conf"
        "$BASE_DIR/docker/fluent-bit/parsers.conf"
    )
    
    for config_file in "${config_files[@]}"; do
        if [[ -f "$config_file" ]]; then
            log "DEBUG" "Fluent Bit config found: $config_file"
        else
            log "WARN" "Fluent Bit config missing: $config_file"
        fi
    done
}

verify_scripts() {
    log "INFO" "Verifying logging scripts"
    
    local scripts=(
        "$BASE_DIR/scripts/log-monitor.sh"
        "$BASE_DIR/scripts/log-backup.sh"
        "$BASE_DIR/scripts/log-analysis.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [[ -f "$script" && -x "$script" ]]; then
            log "DEBUG" "Script found and executable: $script"
        elif [[ -f "$script" ]]; then
            chmod +x "$script"
            log "DEBUG" "Made script executable: $script"
        else
            log "WARN" "Script missing: $script"
        fi
    done
}

create_sample_configs() {
    log "INFO" "Creating sample configuration files"
    
    # Create sample .env.logging if it doesn't exist
    if [[ ! -f "$BASE_DIR/.env.logging" ]]; then
        log "WARN" ".env.logging file not found - please ensure it exists"
    else
        log "DEBUG" "Found .env.logging configuration file"
    fi
    
    # Create sample docker-compose override
    local override_file="$BASE_DIR/docker-compose.logging.yml"
    if [[ ! -f "$override_file" ]]; then
        cat > "$override_file" << 'EOF'
# Docker Compose override for enhanced logging
# Usage: docker-compose -f docker-compose.yml -f docker-compose.logging.yml up

version: '3.8'

services:
  backend:
    logging:
      options:
        max-size: "50m"
        max-file: "10"
    environment:
      - LOG_LEVEL=debug
      - ENABLE_REQUEST_LOGGING=true

  frontend:
    logging:
      options:
        max-size: "50m"
        max-file: "10"
    environment:
      - LOG_LEVEL=debug

  redis:
    logging:
      options:
        max-size: "20m"
        max-file: "5"
    environment:
      - REDIS_LOG_LEVEL=debug
EOF
        log "DEBUG" "Created docker-compose logging override: $override_file"
    fi
}

verify_setup() {
    log "INFO" "Verifying logging setup"
    
    # Check directory structure
    local required_dirs=("backend" "frontend" "redis" "alerts" "analysis" "backups")
    local missing_dirs=()
    
    for dir in "${required_dirs[@]}"; do
        if [[ ! -d "$LOG_DIR/$dir" ]]; then
            missing_dirs+=("$dir")
        fi
    done
    
    if [[ ${#missing_dirs[@]} -eq 0 ]]; then
        log "INFO" "✓ All required directories created successfully"
    else
        log "WARN" "✗ Missing directories: ${missing_dirs[*]}"
        return 1
    fi
    
    # Check permissions
    if [[ -r "$LOG_DIR" && -w "$LOG_DIR" ]]; then
        log "INFO" "✓ Log directory permissions are correct"
    else
        log "WARN" "✗ Log directory permissions need adjustment"
        return 1
    fi
    
    # Check scripts
    local script_count=$(find "$BASE_DIR/scripts" -name "log-*.sh" -executable | wc -l)
    if [[ $script_count -ge 3 ]]; then
        log "INFO" "✓ Logging scripts are available and executable"
    else
        log "WARN" "✗ Some logging scripts are missing or not executable"
        return 1
    fi
    
    return 0
}

display_next_steps() {
    log "INFO" "Logging setup completed!"
    echo
    echo "Next steps:"
    echo "1. Copy logging environment variables:"
    echo "   cp .env.logging .env.local"
    echo
    echo "2. Start services with logging:"
    echo "   docker-compose up -d"
    echo
    echo "3. Monitor logs:"
    echo "   docker-compose logs -f log-aggregator"
    echo
    echo "4. View log files:"
    echo "   ls -la logs/"
    echo
    echo "5. Run analysis (after some activity):"
    echo "   ./scripts/log-analysis.sh"
    echo
    echo "Documentation:"
    echo "   docs/LOGGING_SYSTEM.md"
}

main() {
    log "INFO" "Starting Seiron logging system setup"
    
    create_log_directories
    set_permissions
    create_gitkeep_files
    verify_fluent_bit_config
    verify_scripts
    create_sample_configs
    
    if verify_setup; then
        display_next_steps
        exit 0
    else
        log "WARN" "Setup completed with warnings - please review the output above"
        exit 1
    fi
}

# Run setup
main "$@"