#!/bin/bash

# Seiron Database Setup Script
# This script sets up the complete database environment for the Seiron crypto DApp

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Function to check if services are running
check_services() {
    print_status "Checking service status..."
    
    # Check PostgreSQL
    if docker-compose -f docker-compose.db.yml ps postgres | grep -q "Up"; then
        print_success "PostgreSQL is running"
    else
        print_warning "PostgreSQL is not running"
        return 1
    fi
    
    # Check Redis
    if docker-compose -f docker-compose.db.yml ps redis | grep -q "Up"; then
        print_success "Redis is running"
    else
        print_warning "Redis is not running"
        return 1
    fi
    
    return 0
}

# Function to wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if check_services &> /dev/null; then
            print_success "All services are ready"
            return 0
        fi
        
        attempt=$((attempt + 1))
        print_status "Waiting... (attempt $attempt/$max_attempts)"
        sleep 2
    done
    
    print_error "Services did not become ready within expected time"
    return 1
}

# Function to start database services
start_services() {
    print_status "Starting database services..."
    
    # Start PostgreSQL and Redis
    docker-compose -f docker-compose.db.yml up -d postgres redis
    
    # Wait for services to be ready
    wait_for_services
    
    print_success "Database services started successfully"
}

# Function to stop database services
stop_services() {
    print_status "Stopping database services..."
    
    docker-compose -f docker-compose.db.yml down
    
    print_success "Database services stopped"
}

# Function to reset database
reset_database() {
    print_warning "This will destroy all data in the database!"
    read -p "Are you sure you want to continue? (y/N): " -r
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Database reset cancelled"
        return 0
    fi
    
    print_status "Resetting database..."
    
    # Stop services
    docker-compose -f docker-compose.db.yml down
    
    # Remove volumes
    docker volume rm sql_postgres_data 2>/dev/null || true
    docker volume rm sql_redis_data 2>/dev/null || true
    docker volume rm sql_pgadmin_data 2>/dev/null || true
    
    # Start services again
    start_services
    
    print_success "Database reset completed"
}

# Function to run migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Check if services are running
    if ! check_services &> /dev/null; then
        print_status "Services not running, starting them first..."
        start_services
    fi
    
    # Run migrations using the migration runner
    docker-compose -f docker-compose.db.yml run --rm migration-runner migrate
    
    print_success "Database migrations completed"
}

# Function to show migration status
show_migration_status() {
    print_status "Checking migration status..."
    
    # Check if services are running
    if ! check_services &> /dev/null; then
        print_error "Services are not running. Please start them first."
        return 1
    fi
    
    # Show migration status
    docker-compose -f docker-compose.db.yml run --rm migration-runner status
}

# Function to open database shell
open_db_shell() {
    print_status "Opening database shell..."
    
    # Check if services are running
    if ! check_services &> /dev/null; then
        print_error "Services are not running. Please start them first."
        return 1
    fi
    
    # Open psql shell
    docker-compose -f docker-compose.db.yml exec postgres psql -U postgres -d seiron_db
}

# Function to show database logs
show_logs() {
    local service=${1:-postgres}
    
    print_status "Showing logs for $service..."
    
    docker-compose -f docker-compose.db.yml logs -f "$service"
}

# Function to backup database
backup_database() {
    local backup_file="seiron_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    print_status "Creating database backup: $backup_file"
    
    # Check if services are running
    if ! check_services &> /dev/null; then
        print_error "Services are not running. Please start them first."
        return 1
    fi
    
    # Create backup
    docker-compose -f docker-compose.db.yml exec -T postgres pg_dump -U postgres -d seiron_db > "$backup_file"
    
    print_success "Database backup created: $backup_file"
}

# Function to restore database
restore_database() {
    local backup_file="$1"
    
    if [[ -z "$backup_file" ]]; then
        print_error "Please provide a backup file path"
        return 1
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        print_error "Backup file not found: $backup_file"
        return 1
    fi
    
    print_warning "This will replace all data in the database!"
    read -p "Are you sure you want to continue? (y/N): " -r
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Database restore cancelled"
        return 0
    fi
    
    print_status "Restoring database from: $backup_file"
    
    # Check if services are running
    if ! check_services &> /dev/null; then
        print_error "Services are not running. Please start them first."
        return 1
    fi
    
    # Restore backup
    docker-compose -f docker-compose.db.yml exec -T postgres psql -U postgres -d seiron_db < "$backup_file"
    
    print_success "Database restored from: $backup_file"
}

# Function to show help
show_help() {
    cat << EOF
Seiron Database Setup Script

Usage: $0 [COMMAND]

Commands:
  start           Start database services
  stop            Stop database services
  restart         Restart database services
  reset           Reset database (destroys all data)
  migrate         Run database migrations
  status          Show migration status
  shell           Open database shell
  logs [service]  Show logs (default: postgres)
  backup          Create database backup
  restore <file>  Restore database from backup
  help            Show this help message

Examples:
  $0 start
  $0 migrate
  $0 status
  $0 shell
  $0 logs postgres
  $0 backup
  $0 restore seiron_backup_20250705_120000.sql

EOF
}

# Main execution
print_status "Seiron Database Setup"
print_status "===================="

# Check dependencies
check_docker

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Parse command
case "${1:-start}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        start_services
        ;;
    reset)
        reset_database
        ;;
    migrate)
        run_migrations
        ;;
    status)
        show_migration_status
        ;;
    shell)
        open_db_shell
        ;;
    logs)
        show_logs "${2:-postgres}"
        ;;
    backup)
        backup_database
        ;;
    restore)
        restore_database "$2"
        ;;
    help|--help)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac