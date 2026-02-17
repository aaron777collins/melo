#!/bin/bash
#
# HAOS v2 Environment Configuration Manager
# Manages environment-specific configuration for deployments
#

set -e

# Script metadata
SCRIPT_VERSION="1.0.0"
SCRIPT_NAME="HAOS-V2 Environment Config"

# Default configuration
ENVIRONMENT=""
CONFIG_ACTION="validate"  # validate, deploy, backup, restore
SECRETS_FILE=""
DRY_RUN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --action)
            CONFIG_ACTION="$2"
            shift 2
            ;;
        --secrets-file)
            SECRETS_FILE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --environment ENV     Target environment (development|production)"
            echo "  --action ACTION       Action to perform (validate|deploy|backup|restore)"
            echo "  --secrets-file FILE   Secrets file for deployment"
            echo "  --dry-run            Show what would be done without executing"
            echo "  -h, --help           Show this help message"
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
        CONFIG)
            echo "[$timestamp] ⚙️  $message"
            ;;
    esac
}

# Validate environment
validate_environment() {
    if [ -z "$ENVIRONMENT" ]; then
        log ERROR "Environment not specified"
        exit 1
    fi
    
    case $ENVIRONMENT in
        development|dev)
            ENV_FILE=".env.development"
            ;;
        production|prod)
            ENV_FILE=".env.production"
            ;;
        test|testing)
            ENV_FILE=".env.test"
            ;;
        *)
            log ERROR "Invalid environment: $ENVIRONMENT"
            log INFO "Valid environments: development, production, test"
            exit 1
            ;;
    esac
    
    log INFO "Using environment file: $ENV_FILE"
}

# Validate environment configuration
validate_config() {
    log CONFIG "Validating environment configuration for: $ENVIRONMENT"
    
    if [ ! -f "$ENV_FILE" ]; then
        log ERROR "Environment file not found: $ENV_FILE"
        return 1
    fi
    
    local required_vars=()
    local missing_vars=()
    local validation_errors=0
    
    # Define required variables per environment
    case $ENVIRONMENT in
        production|prod)
            required_vars=(
                "NODE_ENV"
                "NEXT_PUBLIC_SITE_URL"
                "DATABASE_URL"
                "NEXTAUTH_SECRET"
                "NEXTAUTH_URL"
            )
            ;;
        development|dev)
            required_vars=(
                "NODE_ENV"
                "NEXT_PUBLIC_SITE_URL"
                "DATABASE_URL"
            )
            ;;
        test|testing)
            required_vars=(
                "NODE_ENV"
                "DATABASE_URL"
            )
            ;;
    esac
    
    # Check for required variables
    log INFO "Checking required environment variables..."
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" "$ENV_FILE"; then
            local value=$(grep "^$var=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
            if [ -z "$value" ]; then
                log ERROR "Required variable $var is empty"
                missing_vars+=("$var")
                ((validation_errors++))
            else
                log SUCCESS "✓ $var is set"
            fi
        else
            log ERROR "Required variable $var is missing"
            missing_vars+=("$var")
            ((validation_errors++))
        fi
    done
    
    # Environment-specific validations
    case $ENVIRONMENT in
        production|prod)
            # Check for production security requirements
            if grep -q "NEXT_PUBLIC_DEBUG_MODE=true" "$ENV_FILE"; then
                log ERROR "Debug mode is enabled in production"
                ((validation_errors++))
            fi
            
            # Check database URL format for production
            local db_url=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
            if [[ "$db_url" == *"localhost"* ]] || [[ "$db_url" == *"127.0.0.1"* ]]; then
                log WARNING "Database URL appears to use localhost in production"
            fi
            
            # Check HTTPS URLs
            local site_url=$(grep "^NEXT_PUBLIC_SITE_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
            if [[ "$site_url" != https://* ]]; then
                log ERROR "Production site URL must use HTTPS"
                ((validation_errors++))
            fi
            ;;
    esac
    
    # Check for potential secrets exposure
    if grep -E "(password|secret|key)" "$ENV_FILE" | grep -v "=your_" | grep -v "=sk_live_your" >/dev/null; then
        log INFO "Found what appear to be actual secrets (not placeholders)"
    fi
    
    if [ $validation_errors -eq 0 ]; then
        log SUCCESS "Environment configuration validation passed"
        return 0
    else
        log ERROR "Environment configuration validation failed with $validation_errors errors"
        if [ ${#missing_vars[@]} -gt 0 ]; then
            log ERROR "Missing variables: ${missing_vars[*]}"
        fi
        return 1
    fi
}

# Deploy environment configuration
deploy_config() {
    log CONFIG "Deploying environment configuration for: $ENVIRONMENT"
    
    if [ "$DRY_RUN" = true ]; then
        log INFO "DRY RUN: Would deploy environment configuration"
        return 0
    fi
    
    # Validate first
    if ! validate_config; then
        log ERROR "Configuration validation failed - aborting deployment"
        return 1
    fi
    
    # Create backup of current .env if it exists
    if [ -f ".env" ]; then
        local backup_name=".env.backup.$(date +%Y%m%d_%H%M%S)"
        log INFO "Backing up current .env to $backup_name"
        cp .env "$backup_name"
    fi
    
    # Deploy the environment file
    log INFO "Deploying $ENV_FILE to .env"
    cp "$ENV_FILE" .env
    
    # Set appropriate permissions
    chmod 600 .env
    
    log SUCCESS "Environment configuration deployed successfully"
    
    # Generate Prisma client with new environment
    log INFO "Regenerating Prisma client..."
    if npx prisma generate; then
        log SUCCESS "Prisma client regenerated successfully"
    else
        log ERROR "Prisma client generation failed"
        return 1
    fi
}

# Backup environment configuration
backup_config() {
    log CONFIG "Creating backup of environment configuration"
    
    local backup_dir="backups/env/$(date +%Y%m%d_%H%M%S)"
    
    if [ "$DRY_RUN" = true ]; then
        log INFO "DRY RUN: Would create backup in $backup_dir"
        return 0
    fi
    
    mkdir -p "$backup_dir"
    
    # Backup all environment files
    for env_file in .env .env.development .env.production .env.test; do
        if [ -f "$env_file" ]; then
            cp "$env_file" "$backup_dir/"
            log SUCCESS "Backed up $env_file"
        fi
    done
    
    # Create backup metadata
    cat > "$backup_dir/metadata.json" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "script_version": "$SCRIPT_VERSION"
}
EOF
    
    log SUCCESS "Environment backup created: $backup_dir"
}

# Restore environment configuration
restore_config() {
    local backup_path="$1"
    
    log CONFIG "Restoring environment configuration from: $backup_path"
    
    if [ ! -d "$backup_path" ]; then
        log ERROR "Backup directory not found: $backup_path"
        return 1
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log INFO "DRY RUN: Would restore from $backup_path"
        return 0
    fi
    
    # Restore environment files
    for env_file in .env .env.development .env.production .env.test; do
        if [ -f "$backup_path/$env_file" ]; then
            cp "$backup_path/$env_file" ./
            log SUCCESS "Restored $env_file"
        fi
    done
    
    log SUCCESS "Environment configuration restored"
}

# Generate environment template
generate_template() {
    log CONFIG "Generating environment template for: $ENVIRONMENT"
    
    local template_file=".env.${ENVIRONMENT}.template"
    
    if [ "$DRY_RUN" = true ]; then
        log INFO "DRY RUN: Would generate template: $template_file"
        return 0
    fi
    
    cat > "$template_file" << EOF
# HAOS-V2 Environment Configuration Template
# Environment: $ENVIRONMENT
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

# Node Environment
NODE_ENV=$ENVIRONMENT

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/haos_v2_${ENVIRONMENT}"

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-domain.com

# Matrix Configuration
MATRIX_HOMESERVER_URL=https://matrix.org

# Upload Configuration
UPLOADTHING_SECRET=sk_live_your_uploadthing_secret
UPLOADTHING_APP_ID=your_uploadthing_app_id

# LiveKit Configuration (optional)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-instance.com

EOF

    # Add environment-specific configurations
    case $ENVIRONMENT in
        production|prod)
            cat >> "$template_file" << EOF
# Production-specific settings
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_SHOW_PERFORMANCE_METRICS=false
EOF
            ;;
        development|dev)
            cat >> "$template_file" << EOF
# Development-specific settings
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_SHOW_PERFORMANCE_METRICS=true
EOF
            ;;
    esac
    
    log SUCCESS "Template generated: $template_file"
    log INFO "Please update the template with your actual values"
}

# Main execution
main() {
    log INFO "$SCRIPT_NAME v$SCRIPT_VERSION"
    
    validate_environment
    
    case $CONFIG_ACTION in
        validate)
            validate_config
            ;;
        deploy)
            deploy_config
            ;;
        backup)
            backup_config
            ;;
        restore)
            if [ -z "$SECRETS_FILE" ]; then
                log ERROR "Secrets file required for restore action"
                exit 1
            fi
            restore_config "$SECRETS_FILE"
            ;;
        template)
            generate_template
            ;;
        *)
            log ERROR "Invalid action: $CONFIG_ACTION"
            log INFO "Valid actions: validate, deploy, backup, restore, template"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"