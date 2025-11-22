#!/bin/bash
# Deploy nginx configuration to EC2 translation server
# Usage: ./deploy-nginx-config.sh [--dry-run] [--test]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/apy.conf"
EC2_HOST="${EC2_HOST:-ec2-translator}"
REMOTE_CONFIG_PATH="/etc/nginx/sites-enabled/apy.conf"
TMP_CONFIG_PATH="/tmp/apy.conf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

validate_local_config() {
    log_info "Validating local nginx config..."
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_error "Config file not found: $CONFIG_FILE"
        exit 1
    fi
    
    # Check for required location blocks
    local required_locations=("/status" "/rebuild" "/pull-repo" "/build-repo" "/")
    for location in "${required_locations[@]}"; do
        if ! grep -q "location $location" "$CONFIG_FILE"; then
            log_error "Missing required location block: $location"
            exit 1
        fi
    done
    
    # Check for proxy_pass directives
    if ! grep -q "proxy_pass" "$CONFIG_FILE"; then
        log_error "No proxy_pass directives found in config"
        exit 1
    fi
    
    log_info "✓ Local config validation passed"
}

test_ssh_connection() {
    log_info "Testing SSH connection to $EC2_HOST..."
    
    if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$EC2_HOST" "exit" 2>/dev/null; then
        log_error "Cannot connect to $EC2_HOST via SSH"
        log_error "Make sure SSH config is set up correctly (see ~/.ssh/config)"
        exit 1
    fi
    
    log_info "✓ SSH connection successful"
}

backup_remote_config() {
    log_info "Creating backup of remote config..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="/tmp/apy.conf.backup.$timestamp"
    
    ssh "$EC2_HOST" "sudo cp $REMOTE_CONFIG_PATH $backup_path 2>/dev/null || true"
    
    log_info "✓ Backup created: $backup_path"
}

deploy_config() {
    log_info "Uploading config to EC2..."
    
    scp "$CONFIG_FILE" "$EC2_HOST:$TMP_CONFIG_PATH"
    
    log_info "✓ Config uploaded"
}

test_nginx_config() {
    log_info "Testing nginx configuration..."
    
    if ! ssh "$EC2_HOST" "sudo nginx -t" 2>&1 | grep -q "syntax is ok"; then
        log_error "Nginx configuration test failed"
        log_error "Config has NOT been applied"
        exit 1
    fi
    
    log_info "✓ Nginx config test passed"
}

apply_config() {
    log_info "Applying configuration..."
    
    ssh "$EC2_HOST" "sudo mv $TMP_CONFIG_PATH $REMOTE_CONFIG_PATH"
    
    log_info "✓ Config applied"
}

reload_nginx() {
    log_info "Reloading nginx..."
    
    if ! ssh "$EC2_HOST" "sudo systemctl reload nginx"; then
        log_error "Failed to reload nginx"
        log_warn "Config has been applied but nginx may not be running with new config"
        exit 1
    fi
    
    log_info "✓ Nginx reloaded"
}

verify_endpoints() {
    log_info "Verifying endpoints..."
    
    local ec2_url="http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com"
    local endpoints=("/status" "/translate")
    local all_passed=true
    
    for endpoint in "${endpoints[@]}"; do
        if curl -s -f -m 5 "$ec2_url$endpoint" >/dev/null 2>&1; then
            log_info "  ✓ $endpoint is accessible"
        else
            log_warn "  ✗ $endpoint is not accessible (may need authentication)"
            all_passed=false
        fi
    done
    
    if [[ "$all_passed" == "true" ]]; then
        log_info "✓ All endpoints verified"
    else
        log_warn "Some endpoints require authentication (this is expected)"
    fi
}

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy nginx configuration to EC2 translation server.

OPTIONS:
    --dry-run       Validate and test without applying changes
    --test          Run tests only
    -h, --help      Show this help message

ENVIRONMENT VARIABLES:
    EC2_HOST        SSH host alias (default: ec2-translator)

EXAMPLES:
    # Normal deployment
    ./deploy-nginx-config.sh

    # Test without deploying
    ./deploy-nginx-config.sh --dry-run

    # Run tests only
    ./deploy-nginx-config.sh --test
EOF
}

# Main execution
main() {
    local dry_run=false
    local test_only=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run=true
                shift
                ;;
            --test)
                test_only=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    log_info "Starting nginx config deployment..."
    log_info "Target: $EC2_HOST"
    
    # Always run validation and tests
    validate_local_config
    test_ssh_connection
    
    if [[ "$test_only" == "true" ]]; then
        log_info "Test-only mode - skipping deployment"
        log_info "✓ All tests passed"
        exit 0
    fi
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "Dry-run mode - testing deployment without applying"
        backup_remote_config
        deploy_config
        test_nginx_config
        
        # Clean up tmp file
        ssh "$EC2_HOST" "rm -f $TMP_CONFIG_PATH"
        
        log_info "✓ Dry-run completed successfully"
        log_warn "Config was NOT applied (use without --dry-run to apply)"
        exit 0
    fi
    
    # Full deployment
    backup_remote_config
    deploy_config
    test_nginx_config
    apply_config
    reload_nginx
    verify_endpoints
    
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "✓ Deployment completed successfully!"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

main "$@"

