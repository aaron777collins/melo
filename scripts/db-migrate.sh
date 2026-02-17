#!/bin/bash
#
# HAOS v2 Database Migration Script
# Handles database migrations with safety checks and rollback capabilities
#

set -e

# Script metadata
SCRIPT_VERSION="1.0.0"
SCRIPT_NAME="HAOS-V2 DB Migrate"

# Default configuration
ENVIRONMENT="development"
BACKUP_DIR="/var/backups/haos-v2/db-migrations"
DRY_RUN=false
FORCE_MIGRATION=false
MAX_BACKUP_COUNT=10

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE_MIGRATION=true
            shift
            ;;
        --backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --environment ENV    Target environment (development|production)"
            echo "  --dry-run           Show what migrations would run without executing"
            echo "  --force             Force migration even if environment is production"
            echo "  --backup-dir DIR    Directory to store database backups"
            echo "  -h, --help          Show this help message"
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
        MIGRATION)
            echo "[$timestamp] 🗄️  $message"
            ;;
    esac
}

# Error handling
handle_error() {
    local exit_code=$?
    log ERROR "Migration failed with exit code $exit_code"
    log INFO "Check database state and logs for details"
    exit $exit_code
}

trap handle_error ERR

# Validate environment
validate_environment() {
    log INFO "Validating environment: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        development|dev)
            DATABASE_NAME="haos_v2_dev"
            ;;
        production|prod)
            DATABASE_NAME="haos_v2_prod"
            if [ "$FORCE_MIGRATION" != true ]; then
                log WARNING "Production environment detected"
                log WARNING "This will run migrations against the production database"
                read -p "Continue with production migration? (y/N) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    log INFO "Migration cancelled"
                    exit 0
                fi
            fi
            ;;
        test|testing)
            DATABASE_NAME="haos_v2_test"
            ;;
        *)
            log ERROR "Invalid environment: $ENVIRONMENT"
            log INFO "Valid environments: development, production, test"
            exit 1
            ;;
    esac
    
    log SUCCESS "Environment validated: $ENVIRONMENT (database: $DATABASE_NAME)"
}

# Check database connection
check_database_connection() {
    log INFO "Checking database connection..."
    
    if ! npx prisma db pull --preview-feature > /dev/null 2>&1; then
        log ERROR "Cannot connect to database"
        log INFO "Please check your DATABASE_URL configuration"
        exit 1
    fi
    
    log SUCCESS "Database connection verified"
}

# Create database backup
create_backup() {
    if [ "$DRY_RUN" = true ]; then
        log INFO "DRY RUN: Would create database backup"
        return 0
    fi
    
    log MIGRATION "Creating database backup..."
    
    # Create backup directory
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/$backup_timestamp"
    
    sudo mkdir -p "$backup_path"
    
    # Create database dump
    log INFO "Backing up database to: $backup_path"
    
    if sudo -u postgres pg_dump "$DATABASE_NAME" > "$backup_path/database.sql"; then
        log SUCCESS "Database backup created: $backup_path/database.sql"
        
        # Store backup metadata
        cat > "$backup_path/metadata.json" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "database": "$DATABASE_NAME",
    "script_version": "$SCRIPT_VERSION",
    "pre_migration": true
}
EOF
        
        # Cleanup old backups
        cleanup_old_backups
        
        echo "$backup_path"
    else
        log ERROR "Database backup failed"
        exit 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log INFO "Cleaning up old backups (keeping $MAX_BACKUP_COUNT most recent)..."
    
    if [ -d "$BACKUP_DIR" ]; then
        # Remove old backups, keeping only the most recent ones
        find "$BACKUP_DIR" -maxdepth 1 -type d -name "20*" | sort -r | tail -n +$((MAX_BACKUP_COUNT + 1)) | xargs -r rm -rf
        
        local backup_count=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "20*" | wc -l)
        log INFO "Backup cleanup completed. $backup_count backups retained."
    fi
}

# Check migration status
check_migration_status() {
    log INFO "Checking current migration status..."
    
    local migration_output
    migration_output=$(npx prisma migrate status 2>&1 || echo "error")
    
    echo "$migration_output" | while IFS= read -r line; do
        log INFO "  $line"
    done
    
    if echo "$migration_output" | grep -q "Database schema is up to date"; then
        log SUCCESS "Database schema is up to date"
        return 0
    elif echo "$migration_output" | grep -q "Following migration have not yet been applied"; then
        log WARNING "Pending migrations detected"
        return 1
    else
        log WARNING "Migration status unclear - proceeding with caution"
        return 1
    fi
}

# Show pending migrations
show_pending_migrations() {
    log INFO "Analyzing pending migrations..."
    
    # Show what migrations would be applied
    local migration_output
    migration_output=$(npx prisma migrate status 2>&1 || echo "error")
    
    if echo "$migration_output" | grep -q "Following migration have not yet been applied"; then
        log WARNING "Pending migrations:"
        echo "$migration_output" | grep -A 20 "Following migration have not yet been applied" | grep -E "^\s*[0-9]" | while IFS= read -r line; do
            log WARNING "  • $line"
        done
        return 0
    else
        log INFO "No pending migrations found"
        return 1
    fi
}

# Run database migrations
run_migrations() {
    if [ "$DRY_RUN" = true ]; then
        log INFO "DRY RUN: Would apply the following migrations:"
        show_pending_migrations || log INFO "DRY RUN: No migrations to apply"
        return 0
    fi
    
    log MIGRATION "Applying database migrations..."
    
    # Apply migrations
    if npx prisma migrate deploy; then
        log SUCCESS "Database migrations applied successfully"
        
        # Generate Prisma client
        log INFO "Regenerating Prisma client..."
        if npx prisma generate; then
            log SUCCESS "Prisma client generated successfully"
        else
            log ERROR "Prisma client generation failed"
            return 1
        fi
        
        return 0
    else
        log ERROR "Database migration failed"
        return 1
    fi
}

# Validate post-migration state
validate_post_migration() {
    log INFO "Validating post-migration database state..."
    
    # Check if database is accessible
    if ! npx prisma db pull --preview-feature > /dev/null 2>&1; then
        log ERROR "Database is not accessible after migration"
        return 1
    fi
    
    # Validate schema
    if npx prisma validate; then
        log SUCCESS "Database schema validation passed"
    else
        log ERROR "Database schema validation failed"
        return 1
    fi
    
    # Check migration status again
    if check_migration_status; then
        log SUCCESS "All migrations applied successfully"
        return 0
    else
        log WARNING "Migration status check inconclusive"
        return 1
    fi
}

# Rollback function (basic implementation)
rollback_migration() {
    local backup_path="$1"
    
    log WARNING "Initiating database rollback..."
    log INFO "Restoring from backup: $backup_path"
    
    if [ ! -f "$backup_path/database.sql" ]; then
        log ERROR "Backup file not found: $backup_path/database.sql"
        return 1
    fi
    
    # Restore database from backup
    if sudo -u postgres psql "$DATABASE_NAME" < "$backup_path/database.sql"; then
        log SUCCESS "Database restored from backup"
        
        # Regenerate Prisma client
        npx prisma generate
        
        return 0
    else
        log ERROR "Database rollback failed"
        return 1
    fi
}

# Main execution
main() {
    log INFO "$SCRIPT_NAME v$SCRIPT_VERSION"
    log INFO "Starting database migration for environment: $ENVIRONMENT"
    
    # Validate environment
    validate_environment
    
    # Check database connection
    check_database_connection
    
    # Check current migration status
    local has_pending_migrations=false
    if ! check_migration_status; then
        has_pending_migrations=true
    fi
    
    # If no pending migrations and not forcing, exit early
    if [ "$has_pending_migrations" = false ] && [ "$FORCE_MIGRATION" != true ]; then
        log SUCCESS "Database is already up to date - no migrations needed"
        exit 0
    fi
    
    # Show what migrations will be applied
    if [ "$has_pending_migrations" = true ]; then
        show_pending_migrations
        
        if [ "$DRY_RUN" != true ] && [ "$FORCE_MIGRATION" != true ]; then
            read -p "Proceed with migration? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log INFO "Migration cancelled by user"
                exit 0
            fi
        fi
    fi
    
    # Create backup (except for dry run)
    local backup_path=""
    if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "prod" ]; then
        backup_path=$(create_backup)
        log INFO "Backup path: $backup_path"
    fi
    
    # Run migrations
    if run_migrations; then
        log SUCCESS "Migration process completed successfully"
        
        # Validate the result
        if validate_post_migration; then
            log SUCCESS "Post-migration validation passed"
            
            # Log successful migration
            log INFO "Migration completed for environment: $ENVIRONMENT"
            if [ -n "$backup_path" ]; then
                log INFO "Backup available at: $backup_path"
            fi
            
        else
            log ERROR "Post-migration validation failed"
            
            # Attempt rollback for production
            if [ "$ENVIRONMENT" = "production" ] && [ -n "$backup_path" ]; then
                log WARNING "Attempting automatic rollback..."
                rollback_migration "$backup_path"
            fi
            
            exit 1
        fi
        
    else
        log ERROR "Migration failed"
        
        # Attempt rollback for production
        if [ "$ENVIRONMENT" = "production" ] && [ -n "$backup_path" ]; then
            log WARNING "Attempting automatic rollback..."
            rollback_migration "$backup_path"
        fi
        
        exit 1
    fi
    
    log SUCCESS "Database migration completed successfully! 🎉"
}

# Execute main function
main "$@"