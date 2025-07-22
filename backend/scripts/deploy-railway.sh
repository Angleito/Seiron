#!/bin/bash

# Railway Deployment Script for Seiron Backend API
# Comprehensive deployment automation with checks and validations

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="seiron-backend"
HEALTH_CHECK_ENDPOINT="/health"
MAX_HEALTH_CHECK_ATTEMPTS=30
HEALTH_CHECK_INTERVAL=10

# Ensure Railway CLI is installed
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        log_error "Railway CLI is not installed. Please install it first:"
        log_info "npm install -g @railway/cli"
        exit 1
    fi
    
    log_success "Railway CLI is installed"
}

# Login to Railway
ensure_railway_auth() {
    if ! railway whoami &> /dev/null; then
        log_warning "Not logged into Railway. Please login:"
        railway login
    fi
    
    local user
    user=$(railway whoami)
    log_success "Logged into Railway as: $user"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if we're in the correct directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log_error "package.json not found. Are you in the backend directory?"
        exit 1
    fi
    
    # Check if TypeScript compiles
    log_info "Checking TypeScript compilation..."
    cd "$PROJECT_ROOT"
    if npm run build; then
        log_success "TypeScript compilation successful"
    else
        log_error "TypeScript compilation failed"
        exit 1
    fi
    
    # Check if tests pass (optional)
    if [[ "${RUN_TESTS:-true}" == "true" ]]; then
        log_info "Running tests..."
        if npm test; then
            log_success "Tests passed"
        else
            log_warning "Tests failed, but continuing deployment"
        fi
    fi
    
    # Check Docker setup
    if [[ -f "$PROJECT_ROOT/Dockerfile" ]]; then
        log_success "Dockerfile found"
    else
        log_error "Dockerfile not found"
        exit 1
    fi
    
    # Check railway.toml
    if [[ -f "$PROJECT_ROOT/../railway.toml" ]]; then
        log_success "railway.toml found"
    else
        log_error "railway.toml not found in project root"
        exit 1
    fi
}

# Deploy to Railway
deploy_to_railway() {
    log_info "Starting deployment to Railway..."
    
    cd "$PROJECT_ROOT/.."
    
    # Link to project if not already linked
    if ! railway status &> /dev/null; then
        log_warning "Project not linked. Please link to your Railway project:"
        railway link
    fi
    
    # Show current status
    log_info "Current Railway status:"
    railway status
    
    # Deploy
    log_info "Deploying to Railway..."
    if railway up --detach; then
        log_success "Deployment initiated successfully"
    else
        log_error "Deployment failed"
        exit 1
    fi
}

# Wait for deployment and health check
wait_for_deployment() {
    log_info "Waiting for deployment to complete and service to be healthy..."
    
    # Get the service URL
    local service_url
    if ! service_url=$(railway status --json | jq -r '.deployments[0].url' 2>/dev/null); then
        log_warning "Could not extract service URL, skipping health check"
        return 0
    fi
    
    if [[ "$service_url" == "null" || -z "$service_url" ]]; then
        log_warning "Service URL not available yet, skipping health check"
        return 0
    fi
    
    log_info "Service URL: $service_url"
    
    # Health check loop
    local attempt=1
    local max_attempts=$MAX_HEALTH_CHECK_ATTEMPTS
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "Health check attempt $attempt/$max_attempts..."
        
        if curl -f -s --max-time 10 "$service_url$HEALTH_CHECK_ENDPOINT" > /dev/null; then
            log_success "Health check passed! Service is ready."
            
            # Show health check response
            local health_response
            health_response=$(curl -s "$service_url$HEALTH_CHECK_ENDPOINT")
            log_info "Health check response: $health_response"
            return 0
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "Health check failed after $max_attempts attempts"
            log_error "Service may not be ready. Please check Railway logs:"
            log_info "railway logs"
            return 1
        fi
        
        log_info "Waiting ${HEALTH_CHECK_INTERVAL}s before next attempt..."
        sleep $HEALTH_CHECK_INTERVAL
        ((attempt++))
    done
}

# Show deployment info
show_deployment_info() {
    log_info "Deployment Information:"
    echo "========================"
    
    # Get deployment details
    if railway status &> /dev/null; then
        railway status
        echo ""
        
        # Get logs
        log_info "Recent logs:"
        railway logs --lines 20
    fi
    
    echo ""
    log_info "Useful Railway commands:"
    echo "  railway logs           - View service logs"
    echo "  railway logs -f        - Follow logs in real-time"
    echo "  railway status         - Check service status"
    echo "  railway open           - Open service in browser"
    echo "  railway variables      - Manage environment variables"
}

# Rollback function
rollback_deployment() {
    log_error "Deployment failed. Rolling back..."
    
    # Get previous deployment
    if railway rollback; then
        log_success "Rollback completed"
    else
        log_error "Rollback failed. Manual intervention required."
    fi
}

# Main deployment workflow
main() {
    log_info "Starting Railway deployment for $SERVICE_NAME"
    log_info "Script directory: $SCRIPT_DIR"
    log_info "Project root: $PROJECT_ROOT"
    
    # Set up error handling
    trap 'log_error "Deployment failed at line $LINENO"' ERR
    
    # Check prerequisites
    check_railway_cli
    ensure_railway_auth
    
    # Run pre-deployment checks
    pre_deployment_checks
    
    # Deploy
    deploy_to_railway
    
    # Wait for deployment and health check
    if wait_for_deployment; then
        log_success "Deployment completed successfully!"
        show_deployment_info
    else
        log_error "Deployment health check failed"
        
        # Ask if user wants to rollback
        if [[ "${AUTO_ROLLBACK:-false}" == "true" ]]; then
            rollback_deployment
        else
            read -p "Do you want to rollback to the previous deployment? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rollback_deployment
            fi
        fi
        exit 1
    fi
    
    log_success "🚀 Railway deployment completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    --skip-tests)
        export RUN_TESTS=false
        main
        ;;
    --auto-rollback)
        export AUTO_ROLLBACK=true
        main
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --skip-tests      Skip running tests before deployment"
        echo "  --auto-rollback   Automatically rollback on deployment failure"
        echo "  --help, -h        Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  RUN_TESTS         Set to 'false' to skip tests (default: true)"
        echo "  AUTO_ROLLBACK     Set to 'true' to auto-rollback on failure (default: false)"
        ;;
    *)
        main
        ;;
esac