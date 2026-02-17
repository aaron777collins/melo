#!/bin/bash
#
# HAOS v2 Deployment Validation Script
# Comprehensive validation suite to ensure deployment integrity
#

set -e

# Script metadata
SCRIPT_VERSION="1.0.0"
SCRIPT_NAME="HAOS-V2 Deployment Validator"

# Default configuration
TARGET_HOST="localhost:3000"
ENVIRONMENT="development"
TIMEOUT=30
VERBOSE=false
OUTPUT_FORMAT="text"  # text, json, junit

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
RESULTS=()

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            TARGET_HOST="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --output)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --host HOST         Target host to validate (default: localhost:3000)"
            echo "  --environment ENV   Environment being validated"
            echo "  --timeout SECONDS   Request timeout in seconds (default: 30)"
            echo "  --verbose           Enable verbose output"
            echo "  --output FORMAT     Output format (text|json|junit)"
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
    
    if [ "$VERBOSE" = true ] || [ "$level" != "DEBUG" ]; then
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
            TEST)
                echo "[$timestamp] 🧪 $message"
                ;;
            DEBUG)
                echo "[$timestamp] 🐛 $message"
                ;;
        esac
    fi
}

# Test result recording
record_test() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    local duration="$4"
    
    ((TOTAL_TESTS++))
    
    if [ "$status" = "PASS" ]; then
        ((PASSED_TESTS++))
        log SUCCESS "✓ $test_name"
    else
        ((FAILED_TESTS++))
        log ERROR "✗ $test_name: $message"
    fi
    
    # Store result for reporting
    RESULTS+=("{\"test\":\"$test_name\",\"status\":\"$status\",\"message\":\"$message\",\"duration\":\"$duration\"}")
}

# HTTP request helper
make_request() {
    local url="$1"
    local method="${2:-GET}"
    local expected_status="${3:-200}"
    
    local start_time=$(date +%s.%N)
    local response_code
    local response_body
    
    response_code=$(curl -s -o /tmp/response_body -w "%{http_code}" --connect-timeout "$TIMEOUT" -X "$method" "$url" 2>/dev/null || echo "000")
    response_body=$(cat /tmp/response_body 2>/dev/null || echo "")
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
    
    log DEBUG "Request: $method $url -> $response_code (${duration}s)"
    
    echo "$response_code|$response_body|$duration"
}

# Basic connectivity tests
test_basic_connectivity() {
    log TEST "Running basic connectivity tests..."
    
    # Test 1: Basic HTTP connectivity
    local result
    result=$(make_request "https://$TARGET_HOST")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local duration=$(echo "$result" | cut -d'|' -f3)
    
    if [ "$status_code" = "200" ]; then
        record_test "basic_connectivity" "PASS" "Site is reachable" "$duration"
    else
        record_test "basic_connectivity" "FAIL" "HTTP $status_code returned" "$duration"
    fi
    
    # Test 2: HTTPS certificate validity
    if echo | openssl s_client -connect "${TARGET_HOST}:443" -verify_return_error >/dev/null 2>&1; then
        record_test "ssl_certificate" "PASS" "SSL certificate is valid" "0"
    else
        record_test "ssl_certificate" "FAIL" "SSL certificate validation failed" "0"
    fi
    
    # Test 3: Response time check
    local response_time=$(echo "$duration" | cut -d'.' -f1)
    if [ "${response_time:-0}" -lt 5 ]; then
        record_test "response_time" "PASS" "Response time acceptable (${duration}s)" "$duration"
    else
        record_test "response_time" "FAIL" "Response time too slow (${duration}s)" "$duration"
    fi
}

# API endpoint tests
test_api_endpoints() {
    log TEST "Running API endpoint tests..."
    
    # Test health endpoint
    local result
    result=$(make_request "https://$TARGET_HOST/api/health")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local response_body=$(echo "$result" | cut -d'|' -f2)
    local duration=$(echo "$result" | cut -d'|' -f3)
    
    if [ "$status_code" = "200" ]; then
        if echo "$response_body" | grep -q "ok\|healthy\|success"; then
            record_test "health_endpoint" "PASS" "Health endpoint returned healthy status" "$duration"
        else
            record_test "health_endpoint" "FAIL" "Health endpoint returned unexpected response" "$duration"
        fi
    else
        record_test "health_endpoint" "FAIL" "Health endpoint returned HTTP $status_code" "$duration"
    fi
    
    # Test authentication endpoint
    result=$(make_request "https://$TARGET_HOST/api/auth/session")
    status_code=$(echo "$result" | cut -d'|' -f1)
    response_body=$(echo "$result" | cut -d'|' -f2)
    duration=$(echo "$result" | cut -d'|' -f3)
    
    if [ "$status_code" = "200" ]; then
        if echo "$response_body" | grep -q "user\|null\|session"; then
            record_test "auth_endpoint" "PASS" "Authentication endpoint is functional" "$duration"
        else
            record_test "auth_endpoint" "FAIL" "Authentication endpoint returned unexpected response" "$duration"
        fi
    else
        record_test "auth_endpoint" "FAIL" "Authentication endpoint returned HTTP $status_code" "$duration"
    fi
    
    # Test API routes (generic test)
    for endpoint in "/api/health" "/api/auth/providers"; do
        result=$(make_request "https://$TARGET_HOST$endpoint")
        status_code=$(echo "$result" | cut -d'|' -f1)
        duration=$(echo "$result" | cut -d'|' -f3)
        
        if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 500 ]; then
            record_test "api_endpoint_${endpoint//\//_}" "PASS" "Endpoint accessible" "$duration"
        else
            record_test "api_endpoint_${endpoint//\//_}" "FAIL" "HTTP $status_code returned" "$duration"
        fi
    done
}

# Static asset tests
test_static_assets() {
    log TEST "Running static asset tests..."
    
    # Test Next.js static assets
    local result
    result=$(make_request "https://$TARGET_HOST/_next/static/")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local duration=$(echo "$result" | cut -d'|' -f3)
    
    if [ "$status_code" -lt 400 ]; then
        record_test "static_assets" "PASS" "Static assets are accessible" "$duration"
    else
        record_test "static_assets" "FAIL" "Static assets returned HTTP $status_code" "$duration"
    fi
    
    # Test favicon
    result=$(make_request "https://$TARGET_HOST/favicon.ico")
    status_code=$(echo "$result" | cut -d'|' -f1)
    duration=$(echo "$result" | cut -d'|' -f3)
    
    if [ "$status_code" = "200" ]; then
        record_test "favicon" "PASS" "Favicon is accessible" "$duration"
    else
        record_test "favicon" "WARN" "Favicon returned HTTP $status_code" "$duration"
    fi
    
    # Test robots.txt
    result=$(make_request "https://$TARGET_HOST/robots.txt")
    status_code=$(echo "$result" | cut -d'|' -f1)
    duration=$(echo "$result" | cut -d'|' -f3)
    
    if [ "$status_code" -lt 400 ]; then
        record_test "robots_txt" "PASS" "Robots.txt is accessible" "$duration"
    else
        record_test "robots_txt" "WARN" "Robots.txt returned HTTP $status_code" "$duration"
    fi
}

# Security header tests
test_security_headers() {
    log TEST "Running security header tests..."
    
    # Get headers
    local headers
    headers=$(curl -I "https://$TARGET_HOST" 2>/dev/null)
    
    # Test for security headers
    local security_headers=(
        "x-frame-options"
        "x-content-type-options"
        "x-xss-protection"
        "strict-transport-security"
        "content-security-policy"
        "referrer-policy"
    )
    
    for header in "${security_headers[@]}"; do
        if echo "$headers" | grep -qi "$header"; then
            record_test "security_header_$header" "PASS" "Security header present" "0"
        else
            record_test "security_header_$header" "WARN" "Security header missing" "0"
        fi
    done
    
    # Check for potentially dangerous headers
    if echo "$headers" | grep -qi "server:"; then
        local server_header=$(echo "$headers" | grep -i "server:" | head -n1)
        record_test "server_header_disclosure" "WARN" "Server header exposed: $server_header" "0"
    else
        record_test "server_header_disclosure" "PASS" "Server header not disclosed" "0"
    fi
}

# Performance tests
test_performance() {
    log TEST "Running performance tests..."
    
    # Test page load time
    local start_time=$(date +%s.%N)
    local result
    result=$(make_request "https://$TARGET_HOST")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local duration=$(echo "$result" | cut -d'|' -f3)
    
    if [ "$status_code" = "200" ]; then
        local load_time_ms=$(echo "$duration * 1000" | bc -l 2>/dev/null || echo "0")
        if (( $(echo "$duration < 2.0" | bc -l 2>/dev/null || echo 0) )); then
            record_test "page_load_time" "PASS" "Page loads quickly (${duration}s)" "$duration"
        elif (( $(echo "$duration < 5.0" | bc -l 2>/dev/null || echo 0) )); then
            record_test "page_load_time" "WARN" "Page load time acceptable (${duration}s)" "$duration"
        else
            record_test "page_load_time" "FAIL" "Page load time too slow (${duration}s)" "$duration"
        fi
    else
        record_test "page_load_time" "FAIL" "Page failed to load (HTTP $status_code)" "$duration"
    fi
    
    # Test API response times
    for endpoint in "/api/health" "/api/auth/session"; do
        result=$(make_request "https://$TARGET_HOST$endpoint")
        status_code=$(echo "$result" | cut -d'|' -f1)
        duration=$(echo "$result" | cut -d'|' -f3)
        
        if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
            if (( $(echo "$duration < 1.0" | bc -l 2>/dev/null || echo 0) )); then
                record_test "api_response_time_${endpoint//\//_}" "PASS" "API responds quickly (${duration}s)" "$duration"
            else
                record_test "api_response_time_${endpoint//\//_}" "WARN" "API response time slow (${duration}s)" "$duration"
            fi
        fi
    done
}

# Database connectivity test (indirect)
test_database_connectivity() {
    log TEST "Running database connectivity tests..."
    
    # Test health endpoint that likely checks database
    local result
    result=$(make_request "https://$TARGET_HOST/api/health")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local response_body=$(echo "$result" | cut -d'|' -f2)
    local duration=$(echo "$result" | cut -d'|' -f3)
    
    if [ "$status_code" = "200" ]; then
        if echo "$response_body" | grep -q "database.*ok\|db.*healthy\|postgres.*connected"; then
            record_test "database_connectivity" "PASS" "Database connectivity confirmed" "$duration"
        else
            record_test "database_connectivity" "WARN" "Database status unclear from health endpoint" "$duration"
        fi
    else
        record_test "database_connectivity" "FAIL" "Cannot verify database connectivity" "$duration"
    fi
}

# Environment-specific tests
test_environment_specific() {
    log TEST "Running environment-specific tests for: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        production|prod)
            # Production-specific tests
            
            # Check for debug endpoints that shouldn't be exposed
            local debug_endpoints=("/debug" "/api/debug" "/_next/static/chunks/pages/debug")
            for endpoint in "${debug_endpoints[@]}"; do
                local result
                result=$(make_request "https://$TARGET_HOST$endpoint")
                local status_code=$(echo "$result" | cut -d'|' -f1)
                
                if [ "$status_code" -ge 400 ]; then
                    record_test "debug_endpoint_blocked_${endpoint//\//_}" "PASS" "Debug endpoint properly blocked" "0"
                else
                    record_test "debug_endpoint_blocked_${endpoint//\//_}" "FAIL" "Debug endpoint accessible in production" "0"
                fi
            done
            
            # Check for proper caching headers
            local result
            result=$(make_request "https://$TARGET_HOST/_next/static/")
            local headers
            headers=$(curl -I "https://$TARGET_HOST/_next/static/" 2>/dev/null)
            
            if echo "$headers" | grep -qi "cache-control"; then
                record_test "static_asset_caching" "PASS" "Static assets have caching headers" "0"
            else
                record_test "static_asset_caching" "WARN" "Static assets missing caching headers" "0"
            fi
            
            ;;
        development|dev)
            # Development-specific tests
            record_test "development_environment" "PASS" "Development environment validation" "0"
            ;;
        *)
            record_test "environment_validation" "WARN" "Unknown environment: $ENVIRONMENT" "0"
            ;;
    esac
}

# Generate report
generate_report() {
    log INFO "Generating validation report..."
    
    local pass_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        pass_rate=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l 2>/dev/null || echo "0")
    fi
    
    case $OUTPUT_FORMAT in
        json)
            cat << EOF
{
    "validation_report": {
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
        "target_host": "$TARGET_HOST",
        "environment": "$ENVIRONMENT",
        "summary": {
            "total_tests": $TOTAL_TESTS,
            "passed_tests": $PASSED_TESTS,
            "failed_tests": $FAILED_TESTS,
            "pass_rate": "$pass_rate%"
        },
        "results": [
            $(IFS=','; echo "${RESULTS[*]}")
        ]
    }
}
EOF
            ;;
        junit)
            cat << EOF
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="HAOS-V2-Deployment-Validation" tests="$TOTAL_TESTS" failures="$FAILED_TESTS" timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)">
EOF
            for result in "${RESULTS[@]}"; do
                local test_name=$(echo "$result" | jq -r '.test' 2>/dev/null || echo "unknown")
                local status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "unknown")
                local message=$(echo "$result" | jq -r '.message' 2>/dev/null || echo "")
                local duration=$(echo "$result" | jq -r '.duration' 2>/dev/null || echo "0")
                
                echo "    <testcase name=\"$test_name\" time=\"$duration\">"
                if [ "$status" = "FAIL" ]; then
                    echo "        <failure>$message</failure>"
                elif [ "$status" = "WARN" ]; then
                    echo "        <skipped>$message</skipped>"
                fi
                echo "    </testcase>"
            done
            echo "</testsuite>"
            ;;
        *)
            # Text format (default)
            echo ""
            echo "=========================================="
            echo "HAOS-V2 Deployment Validation Report"
            echo "=========================================="
            echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
            echo "Target: $TARGET_HOST"
            echo "Environment: $ENVIRONMENT"
            echo ""
            echo "Summary:"
            echo "  Total Tests: $TOTAL_TESTS"
            echo "  Passed: $PASSED_TESTS"
            echo "  Failed: $FAILED_TESTS"
            echo "  Pass Rate: $pass_rate%"
            echo ""
            
            if [ $FAILED_TESTS -gt 0 ]; then
                echo "Failed Tests:"
                for result in "${RESULTS[@]}"; do
                    local status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "unknown")
                    if [ "$status" = "FAIL" ]; then
                        local test_name=$(echo "$result" | jq -r '.test' 2>/dev/null || echo "unknown")
                        local message=$(echo "$result" | jq -r '.message' 2>/dev/null || echo "")
                        echo "  ❌ $test_name: $message"
                    fi
                done
                echo ""
            fi
            
            echo "=========================================="
            ;;
    esac
}

# Main execution
main() {
    log INFO "$SCRIPT_NAME v$SCRIPT_VERSION"
    log INFO "Validating deployment at: https://$TARGET_HOST"
    log INFO "Environment: $ENVIRONMENT"
    
    # Run all validation tests
    test_basic_connectivity
    test_api_endpoints
    test_static_assets
    test_security_headers
    test_performance
    test_database_connectivity
    test_environment_specific
    
    # Generate report
    generate_report
    
    # Exit with appropriate code
    if [ $FAILED_TESTS -eq 0 ]; then
        log SUCCESS "All validation tests passed! 🎉"
        exit 0
    else
        log ERROR "$FAILED_TESTS test(s) failed"
        exit 1
    fi
}

# Execute main function
main "$@"