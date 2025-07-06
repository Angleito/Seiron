#!/bin/bash

# Seiron Database Migration Runner
# This script applies all database migrations in order

set -e  # Exit on any error

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-seiron_db}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-password}

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

# Function to check if psql is available
check_psql() {
    if ! command -v psql &> /dev/null; then
        print_error "psql command not found. Please install PostgreSQL client."
        exit 1
    fi
}

# Function to test database connection
test_connection() {
    print_status "Testing database connection..."
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        print_success "Database connection successful"
    else
        print_error "Failed to connect to database"
        print_error "Connection details:"
        print_error "  Host: $DB_HOST"
        print_error "  Port: $DB_PORT"
        print_error "  Database: $DB_NAME"
        print_error "  User: $DB_USER"
        exit 1
    fi
}

# Function to create migration tracking table
create_migration_table() {
    print_status "Creating migration tracking table..."
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    applied_by TEXT DEFAULT current_user,
    checksum TEXT
);
EOF
    
    print_success "Migration tracking table ready"
}

# Function to calculate file checksum
calculate_checksum() {
    local file="$1"
    if command -v md5sum &> /dev/null; then
        md5sum "$file" | cut -d' ' -f1
    elif command -v md5 &> /dev/null; then
        md5 -q "$file"
    else
        print_warning "No checksum utility found, skipping checksum verification"
        echo "no-checksum"
    fi
}

# Function to check if migration was already applied
is_migration_applied() {
    local version="$1"
    local checksum="$2"
    
    local result=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version FROM schema_migrations WHERE version = '$version';" 2>/dev/null | tr -d ' ')
    
    if [[ "$result" == "$version" ]]; then
        # Check if checksum matches
        local stored_checksum=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT checksum FROM schema_migrations WHERE version = '$version';" 2>/dev/null | tr -d ' ')
        
        if [[ "$stored_checksum" != "$checksum" && "$checksum" != "no-checksum" ]]; then
            print_warning "Migration $version has different checksum - file may have been modified"
            return 1
        fi
        return 0
    else
        return 1
    fi
}

# Function to record migration
record_migration() {
    local version="$1"
    local checksum="$2"
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO schema_migrations (version, checksum) VALUES ('$version', '$checksum');" &> /dev/null
}

# Function to run a single migration
run_migration() {
    local file="$1"
    local version=$(basename "$file" .sql)
    local checksum=$(calculate_checksum "$file")
    
    print_status "Processing migration: $version"
    
    if is_migration_applied "$version" "$checksum"; then
        print_success "Migration $version already applied, skipping"
        return 0
    fi
    
    print_status "Applying migration: $version"
    
    # Run the migration
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file"; then
        record_migration "$version" "$checksum"
        print_success "Migration $version applied successfully"
    else
        print_error "Failed to apply migration: $version"
        return 1
    fi
}

# Function to run all migrations
run_all_migrations() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local migration_files=(
        "001_create_users_table.sql"
        "002_create_chat_sessions_table.sql"
        "003_create_messages_table.sql"
        "004_create_price_snapshots_table.sql"
        "005_create_database_functions.sql"
        "006_create_indexes_and_optimization.sql"
    )
    
    print_status "Starting database migrations..."
    
    for file in "${migration_files[@]}"; do
        local full_path="$script_dir/$file"
        
        if [[ -f "$full_path" ]]; then
            run_migration "$full_path"
        else
            print_error "Migration file not found: $full_path"
            exit 1
        fi
    done
    
    print_success "All migrations completed successfully!"
}

# Function to show migration status
show_migration_status() {
    print_status "Migration status:"
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
SELECT 
    version,
    applied_at,
    applied_by
FROM schema_migrations 
ORDER BY applied_at;
EOF
}

# Function to show help
show_help() {
    cat << EOF
Seiron Database Migration Runner

Usage: $0 [OPTIONS] [COMMAND]

Commands:
  migrate         Run all pending migrations (default)
  status          Show migration status
  test-connection Test database connection
  help            Show this help message

Options:
  -h, --host      Database host (default: localhost)
  -p, --port      Database port (default: 5432)
  -d, --database  Database name (default: seiron_db)
  -u, --user      Database user (default: postgres)
  -w, --password  Database password (default: password)

Environment Variables:
  DB_HOST         Database host
  DB_PORT         Database port
  DB_NAME         Database name
  DB_USER         Database user
  DB_PASSWORD     Database password

Examples:
  $0 migrate
  $0 status
  $0 -h localhost -p 5432 -d seiron_db -u postgres migrate
  DB_HOST=localhost DB_NAME=seiron_db $0 migrate

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -p|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -u|--user)
            DB_USER="$2"
            shift 2
            ;;
        -w|--password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        migrate)
            COMMAND="migrate"
            shift
            ;;
        status)
            COMMAND="status"
            shift
            ;;
        test-connection)
            COMMAND="test-connection"
            shift
            ;;
        help|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Default command
COMMAND=${COMMAND:-migrate}

# Main execution
print_status "Seiron Database Migration Runner"
print_status "================================"

check_psql
test_connection

case "$COMMAND" in
    migrate)
        create_migration_table
        run_all_migrations
        ;;
    status)
        show_migration_status
        ;;
    test-connection)
        print_success "Database connection test passed"
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac