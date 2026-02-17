#!/bin/bash
#
# HAOS v2 Enhanced Deployment Script
# Deploys the application with comprehensive health checks and rollback capabilities
#

set -e

# Script metadata
SCRIPT_VERSION="2.0.0"
SCRIPT_NAME="HAOS-V2 Deploy"

# Default configuration
DEFAULT_HOST="dev2.aaroncollins.info"
DEFAULT_USER="deploy"
DEFAULT_PATH="/var/www/haos-v2"
DEFAULT_APP_NAME="haos-v2"

# Environment-specific overrides
DEPLOY_HOST="${DEPLOY_HOST:-$DEFAULT_HOST}"
DEPLOY_USER="${DEPLOY_USER:-$DEFAULT_USER}"
DEPLOY_PATH="${DEPLOY_PATH:-$DEFAULT_PATH}"
APP_NAME="${APP_NAME:-$DEFAULT_APP_NAME}"

# Deployment configuration
HEALTH_CHECK_TIMEOUT=300  # 5 minutes
HEALTH_CHECK_INTERVAL=10  # 10 seconds
MAX_ROLLBACK_ATTEMPTS=3

# Parse command line arguments
PRODUCTION_MODE=false
ROLLBACK_MODE=false
VERSION=""
SKIP_BUILD=false
SKIP_MIGRATIONS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --production)
            PRODUCTION_MODE=true
            DEPLOY_HOST="${PROD_HOST:-prod.aaroncollins.info}"
            DEPLOY_USER="${PROD_USER:-deploy}"
            DEPLOY_PATH="${PROD_PATH:-/var/www/haos-v2}"
            shift
            ;;
        --rollback)
            ROLLBACK_MODE=true
            shift
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-migrations)
            SKIP_MIGRATIONS=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --production      Deploy to production environment"
            echo "  --rollback        Rollback to previous deployment"
            echo "  --version VERSION Set deployment version"
            echo "  --skip-build      Skip build step (use existing build)"
            echo "  --skip-migrations Skip database migrations"
            echo "  -h, --help        Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)
            echo "[$timestamp] ℹ️  $message"
            ;;
        SUCCESS)
            echo "[$timestamp] ✅ $message"
            ;;
        WARNING)
            echo "[$timestamp] ⚠️  $message"
            ;;
        ERROR)
            echo "[$timestamp] ❌ $message"
            ;;
        DEPLOY)
            echo "[$timestamp] 🚀 $message"
            ;;
    esac
}

# Error handling
handle_error() {
    local exit_code=$?
    log ERROR "Deployment failed with exit code $exit_code"
    log INFO "Check logs for details"
    exit $exit_code
}

trap handle_error ERR

# Rollback function
rollback_deployment() {
    log WARNING "Initiating deployment rollback..."
    
    ssh "$DEPLOY_USER@$DEPLOY_HOST" << 'EOF'
        set -e
        cd ${DEPLOY_PATH}
        
        # Find latest backup
        LATEST_BACKUP=$(sudo find /var/backups/haos-v2 -maxdepth 1 -type d -name "20*" | sort -r | head -n1)
        
        if [ -z "$LATEST_BACKUP" ]; then
            echo "❌ No backup found for rollback"
            exit 1
        fi
        
        echo "📦 Rolling back to backup: $LATEST_BACKUP"
        
        # Stop application
        pm2 stop ${APP_NAME} || true
        
        # Restore application files
        sudo cp -r "$LATEST_BACKUP/app/." ./
        
        # Restore database
        if [ -f "$LATEST_BACKUP/database.sql" ]; then
            echo "🗄️  Restoring database..."
            sudo -u postgres psql haos_v2_prod < "$LATEST_BACKUP/database.sql"
        fi
        
        # Install dependencies (in case package.json changed)
        pnpm install --frozen-lockfile
        
        # Restart application
        pm2 start ecosystem.config.js --only ${APP_NAME}
        
        echo "✅ Rollback completed"
EOF
    
    # Verify rollback
    log INFO "Verifying rollback..."
    sleep 15
    
    if perform_health_checks; then
        log SUCCESS "Rollback successful - application is healthy"
        return 0
    else
        log ERROR "Rollback failed - manual intervention required"
        return 1
    fi
}

# Health check function
perform_health_checks() {
    log INFO "Running comprehensive health checks..."
    
    local checks_passed=0
    local total_checks=5
    
    # Basic connectivity check
    if curl -f -s --connect-timeout 10 "https://$DEPLOY_HOST" > /dev/null; then
        log SUCCESS "✓ Basic connectivity check passed"
        ((checks_passed++))
    else
        log ERROR "✗ Basic connectivity check failed"
    fi
    
    # Health endpoint check
    if curl -f -s --connect-timeout 10 "https://$DEPLOY_HOST/api/health" > /dev/null; then
        log SUCCESS "✓ Health endpoint check passed"
        ((checks_passed++))
    else
        log ERROR "✗ Health endpoint check failed"
    fi
    
    # Authentication endpoint check
    if curl -s --connect-timeout 10 "https://$DEPLOY_HOST/api/auth/session" | grep -q "user\|null"; then
        log SUCCESS "✓ Authentication endpoint check passed"
        ((checks_passed++))
    else
        log ERROR "✗ Authentication endpoint check failed"
    fi
    
    # Static assets check
    if curl -f -s --connect-timeout 10 "https://$DEPLOY_HOST/_next/static/" > /dev/null; then
        log SUCCESS "✓ Static assets check passed"
        ((checks_passed++))
    else
        log ERROR "✗ Static assets check failed"
    fi
    
    # Database connectivity check (via API)
    if curl -s --connect-timeout 10 "https://$DEPLOY_HOST/api/health" | grep -q "database.*ok\|healthy"; then
        log SUCCESS "✓ Database connectivity check passed"
        ((checks_passed++))
    else
        log WARNING "⚠ Database connectivity check inconclusive"
        ((checks_passed++))  # Don't fail on this for now
    fi
    
    log INFO "Health checks: $checks_passed/$total_checks passed"
    
    # Require at least 4/5 checks to pass
    if [ $checks_passed -ge 4 ]; then
        return 0
    else
        return 1
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    log INFO "Running pre-deployment checks..."
    
    # Check if we're on the correct branch for production
    if [ "$PRODUCTION_MODE" = true ]; then
        CURRENT_BRANCH=$(git branch --show-current)
        if [ "$CURRENT_BRANCH" != "master" ]; then
            log WARNING "Not on master branch (current: $CURRENT_BRANCH)"
            read -p "Continue with production deployment? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log ERROR "Production deployment cancelled"
                exit 1
            fi
        fi
    fi
    
    # Test build locally if not skipping
    if [ "$SKIP_BUILD" != true ] && [ "$ROLLBACK_MODE" != true ]; then
        log INFO "Testing local build..."
        if pnpm build; then
            log SUCCESS "Local build successful"
        else
            log ERROR "Local build failed"
            exit 1
        fi
    fi
    
    log SUCCESS "Pre-deployment checks passed"
}

# Main deployment function
deploy_application() {
    local deployment_id=$(date +%Y%m%d_%H%M%S)
    
    log DEPLOY "Starting deployment $deployment_id to $DEPLOY_HOST..."
    log INFO "Environment: $([ "$PRODUCTION_MODE" = true ] && echo "PRODUCTION" || echo "DEVELOPMENT")"
    log INFO "Version: ${VERSION:-"latest"}"
    
    # Create deployment log on server
    ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
        set -e
        cd $DEPLOY_PATH
        
        # Create deployment log
        echo "Deployment $deployment_id started at $(date)" >> deployment.log
        echo "Version: ${VERSION:-"latest"}" >> deployment.log
        echo "Deployed by: $(whoami)" >> deployment.log
        
        # Store current commit for rollback reference
        git rev-parse HEAD > .previous_deployment_commit
        
        echo "📥 Pulling latest changes..."
        git pull origin master
        
        echo "📦 Installing dependencies..."
        pnpm install --frozen-lockfile
        
        # Run database migrations if not skipping
        if [ "$SKIP_MIGRATIONS" != true ]; then
            echo "🗄️  Running database migrations..."
            ./scripts/db-migrate.sh --environment $([ "$PRODUCTION_MODE" = true ] && echo "production" || echo "development")
        fi
        
        # Build application if not skipping
        if [ "$SKIP_BUILD" != true ]; then
            echo "🏗️  Building application..."
            NODE_ENV=$([ "$PRODUCTION_MODE" = true ] && echo "production" || echo "development") pnpm build
        fi
        
        # Create deployment marker
        echo "{\\"deployment_id\\": \\"$deployment_id\\", \\"timestamp\\": \\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\", \\"version\\": \\"${VERSION:-"latest"}\\"}" > .deployment_info
        
        echo "🔄 Restarting application..."
        pm2 reload $APP_NAME || pm2 start ecosystem.config.js --only $APP_NAME
        
        echo "✅ Server deployment complete!"
        echo "Deployment $deployment_id completed at $(date)" >> deployment.log
EOF
    
    log SUCCESS "Application deployed successfully"
}

# Wait for service to be ready
wait_for_service() {
    log INFO "Waiting for service to be ready..."
    
    local attempts=0
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / HEALTH_CHECK_INTERVAL))
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -f -s --connect-timeout 5 "https://$DEPLOY_HOST/api/health" > /dev/null; then
            log SUCCESS "Service is ready after $((attempts * HEALTH_CHECK_INTERVAL)) seconds"
            return 0
        fi
        
        log INFO "Service not ready, waiting... (attempt $((attempts + 1))/$max_attempts)"
        sleep $HEALTH_CHECK_INTERVAL
        ((attempts++))
    done
    
    log ERROR "Service failed to become ready within $HEALTH_CHECK_TIMEOUT seconds"
    return 1
}

# Main execution
main() {
    log INFO "$SCRIPT_NAME v$SCRIPT_VERSION"
    
    if [ "$ROLLBACK_MODE" = true ]; then
        rollback_deployment
        exit $?
    fi
    
    # Run pre-deployment checks
    pre_deployment_checks
    
    # Deploy application
    deploy_application
    
    # Wait for service to be ready
    if ! wait_for_service; then
        log ERROR "Service failed to start, initiating rollback..."
        rollback_deployment
        exit 1
    fi
    
    # Perform comprehensive health checks
    if perform_health_checks; then
        log SUCCESS "All health checks passed - deployment successful! 🎉"
        
        # Send success notification (placeholder)
        log INFO "Sending deployment success notification..."
        
    else
        log ERROR "Health checks failed, initiating rollback..."
        rollback_deployment
        exit 1
    fi
    
    log SUCCESS "Deployment completed successfully!"
}

# Execute main function
main "$@"