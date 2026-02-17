#!/bin/bash
#
# HAOS v2 Deployment Monitor
# Monitors deployment process and sends notifications
#

set -e

# Script metadata
SCRIPT_VERSION="1.0.0"
SCRIPT_NAME="HAOS-V2 Deployment Monitor"

# Default configuration
ENVIRONMENT="development"
TARGET_HOST="localhost:3000"
CHECK_INTERVAL=30
MAX_CHECKS=20
NOTIFICATION_WEBHOOK=""
SLACK_WEBHOOK=""
DISCORD_WEBHOOK=""
EMAIL_RECIPIENTS=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --host)
            TARGET_HOST="$2"
            shift 2
            ;;
        --interval)
            CHECK_INTERVAL="$2"
            shift 2
            ;;
        --max-checks)
            MAX_CHECKS="$2"
            shift 2
            ;;
        --slack-webhook)
            SLACK_WEBHOOK="$2"
            shift 2
            ;;
        --discord-webhook)
            DISCORD_WEBHOOK="$2"
            shift 2
            ;;
        --email)
            EMAIL_RECIPIENTS="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --environment ENV       Environment to monitor"
            echo "  --host HOST            Target host to monitor"
            echo "  --interval SECONDS     Check interval (default: 30)"
            echo "  --max-checks COUNT     Maximum number of checks (default: 20)"
            echo "  --slack-webhook URL    Slack webhook URL for notifications"
            echo "  --discord-webhook URL  Discord webhook URL for notifications"
            echo "  --email RECIPIENTS     Email recipients (comma-separated)"
            echo "  -h, --help             Show this help message"
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
        MONITOR)
            echo "[$timestamp] 📊 $message"
            ;;
    esac
}

# Send notification function
send_notification() {
    local title="$1"
    local message="$2"
    local status="$3"  # success, warning, error
    local color=""
    
    case $status in
        success)
            color="good"
            ;;
        warning)
            color="warning"
            ;;
        error)
            color="danger"
            ;;
        *)
            color="#808080"
            ;;
    esac
    
    # Send Slack notification
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [
                    {
                        \"color\": \"$color\",
                        \"title\": \"$title\",
                        \"text\": \"$message\",
                        \"footer\": \"HAOS-V2 Deployment Monitor\",
                        \"ts\": $(date +%s)
                    }
                ]
            }" \
            "$SLACK_WEBHOOK" >/dev/null 2>&1 || log WARNING "Failed to send Slack notification"
    fi
    
    # Send Discord notification
    if [ -n "$DISCORD_WEBHOOK" ]; then
        local discord_color=""
        case $status in
            success) discord_color="3066993" ;;
            warning) discord_color="16776960" ;;
            error) discord_color="15158332" ;;
            *) discord_color="8421504" ;;
        esac
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"embeds\": [
                    {
                        \"title\": \"$title\",
                        \"description\": \"$message\",
                        \"color\": $discord_color,
                        \"footer\": {
                            \"text\": \"HAOS-V2 Deployment Monitor\"
                        },
                        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
                    }
                ]
            }" \
            "$DISCORD_WEBHOOK" >/dev/null 2>&1 || log WARNING "Failed to send Discord notification"
    fi
    
    # Send email notification (if configured)
    if [ -n "$EMAIL_RECIPIENTS" ]; then
        echo "$message" | mail -s "$title" "$EMAIL_RECIPIENTS" 2>/dev/null || log WARNING "Failed to send email notification"
    fi
}

# Health check function
check_health() {
    local url="https://$TARGET_HOST/api/health"
    local response
    local status_code
    
    # Try to get health status
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" --connect-timeout 10 "$url" 2>/dev/null || echo "HTTPSTATUS:000")
    status_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    local response_body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$status_code" = "200" ]; then
        # Check if response contains healthy status
        if echo "$response_body" | grep -q '"status":"healthy"'; then
            return 0
        else
            log WARNING "Health endpoint returned 200 but status is not healthy"
            return 1
        fi
    else
        log WARNING "Health check failed with HTTP $status_code"
        return 1
    fi
}

# Monitor deployment function
monitor_deployment() {
    local deployment_start_time=$(date +%s)
    local checks_performed=0
    local consecutive_failures=0
    local consecutive_successes=0
    local max_consecutive_failures=3
    local required_consecutive_successes=3
    
    log MONITOR "Starting deployment monitoring for $TARGET_HOST"
    log MONITOR "Environment: $ENVIRONMENT"
    log MONITOR "Check interval: ${CHECK_INTERVAL}s"
    log MONITOR "Maximum checks: $MAX_CHECKS"
    
    # Send initial notification
    send_notification \
        "🚀 Deployment Monitoring Started" \
        "Started monitoring deployment for $ENVIRONMENT environment at $TARGET_HOST" \
        "info"
    
    while [ $checks_performed -lt $MAX_CHECKS ]; do
        ((checks_performed++))
        
        log MONITOR "Performing health check $checks_performed/$MAX_CHECKS..."
        
        if check_health; then
            ((consecutive_successes++))
            consecutive_failures=0
            log SUCCESS "Health check passed (consecutive: $consecutive_successes)"
            
            # If we have enough consecutive successes, deployment is stable
            if [ $consecutive_successes -ge $required_consecutive_successes ]; then
                local deployment_duration=$(($(date +%s) - deployment_start_time))
                log SUCCESS "Deployment appears stable after $consecutive_successes consecutive successful checks"
                
                send_notification \
                    "✅ Deployment Successful" \
                    "Deployment to $ENVIRONMENT completed successfully!\n\nTarget: $TARGET_HOST\nDuration: ${deployment_duration}s\nChecks performed: $checks_performed" \
                    "success"
                
                return 0
            fi
        else
            ((consecutive_failures++))
            consecutive_successes=0
            log ERROR "Health check failed (consecutive failures: $consecutive_failures)"
            
            # If too many consecutive failures, deployment likely failed
            if [ $consecutive_failures -ge $max_consecutive_failures ]; then
                log ERROR "Deployment appears to have failed after $consecutive_failures consecutive failures"
                
                send_notification \
                    "❌ Deployment Failed" \
                    "Deployment to $ENVIRONMENT has failed!\n\nTarget: $TARGET_HOST\nConsecutive failures: $consecutive_failures\nChecks performed: $checks_performed\n\nPlease check the application logs and consider rollback." \
                    "error"
                
                return 1
            fi
        fi
        
        # Wait before next check (unless this is the last check)
        if [ $checks_performed -lt $MAX_CHECKS ]; then
            log MONITOR "Waiting ${CHECK_INTERVAL}s before next check..."
            sleep $CHECK_INTERVAL
        fi
    done
    
    # If we reach here, we've exhausted all checks
    local deployment_duration=$(($(date +%s) - deployment_start_time))
    
    if [ $consecutive_successes -gt 0 ]; then
        log WARNING "Monitoring period ended with mixed results"
        
        send_notification \
            "⚠️ Deployment Status Uncertain" \
            "Deployment monitoring completed with mixed results.\n\nTarget: $TARGET_HOST\nEnvironment: $ENVIRONMENT\nDuration: ${deployment_duration}s\nTotal checks: $checks_performed\nConsecutive successes: $consecutive_successes\n\nManual verification recommended." \
            "warning"
    else
        log ERROR "Monitoring period ended with no successful health checks"
        
        send_notification \
            "❌ Deployment Monitoring Failed" \
            "Deployment monitoring completed with no successful health checks.\n\nTarget: $TARGET_HOST\nEnvironment: $ENVIRONMENT\nDuration: ${deployment_duration}s\nTotal checks: $checks_performed\n\nDeployment likely failed - immediate attention required!" \
            "error"
        
        return 1
    fi
    
    return 1
}

# Performance monitoring function
monitor_performance() {
    log MONITOR "Running performance monitoring..."
    
    local response_times=()
    local error_count=0
    local total_requests=5
    
    for i in $(seq 1 $total_requests); do
        local start_time=$(date +%s.%N)
        if curl -f -s --connect-timeout 10 "https://$TARGET_HOST" > /dev/null 2>&1; then
            local end_time=$(date +%s.%N)
            local response_time=$(echo "$end_time - $start_time" | bc -l)
            response_times+=("$response_time")
            log MONITOR "Request $i: ${response_time}s"
        else
            ((error_count++))
            log WARNING "Request $i: Failed"
        fi
        sleep 1
    done
    
    if [ ${#response_times[@]} -gt 0 ]; then
        # Calculate average response time
        local sum=0
        for time in "${response_times[@]}"; do
            sum=$(echo "$sum + $time" | bc -l)
        done
        local avg_response_time=$(echo "scale=3; $sum / ${#response_times[@]}" | bc -l)
        
        log MONITOR "Performance summary: avg response time ${avg_response_time}s, error rate $((error_count * 100 / total_requests))%"
        
        # Send performance report
        if (( $(echo "$avg_response_time > 2.0" | bc -l) )) || [ $error_count -gt 1 ]; then
            send_notification \
                "⚠️ Performance Issues Detected" \
                "Performance monitoring detected issues:\n\nAverage response time: ${avg_response_time}s\nError rate: $((error_count * 100 / total_requests))%\nTarget: $TARGET_HOST" \
                "warning"
        fi
    fi
}

# Main execution
main() {
    log INFO "$SCRIPT_NAME v$SCRIPT_VERSION"
    
    # Validate configuration
    if [ -z "$TARGET_HOST" ]; then
        log ERROR "Target host not specified"
        exit 1
    fi
    
    # Monitor deployment
    if monitor_deployment; then
        log SUCCESS "Deployment monitoring completed successfully"
        
        # Run performance monitoring
        monitor_performance
        
        exit 0
    else
        log ERROR "Deployment monitoring failed"
        exit 1
    fi
}

# Execute main function
main "$@"