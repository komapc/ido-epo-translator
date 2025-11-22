#!/bin/bash
# Test nginx configuration locally before deployment
# Usage: ./test-nginx-config.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/apy.conf"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

pass() {
    echo -e "${GREEN}✓${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

test_file_exists() {
    if [[ -f "$CONFIG_FILE" ]]; then
        pass "Config file exists"
    else
        fail "Config file not found: $CONFIG_FILE"
    fi
}

test_required_locations() {
    local locations=("/status" "/rebuild" "/pull-repo" "/build-repo" "/")
    
    for location in "${locations[@]}"; do
        if grep -q "location $location" "$CONFIG_FILE"; then
            pass "Location block exists: $location"
        else
            fail "Missing location block: $location"
        fi
    done
}

test_proxy_configuration() {
    # Test webhook endpoints proxy to 8081
    local webhook_endpoints=("/status" "/rebuild" "/pull-repo" "/build-repo")
    
    for endpoint in "${webhook_endpoints[@]}"; do
        if grep -A5 "location $endpoint" "$CONFIG_FILE" | grep -q "proxy_pass http://127.0.0.1:8081"; then
            pass "Webhook endpoint $endpoint proxies to port 8081"
        else
            fail "Webhook endpoint $endpoint not properly configured"
        fi
    done
    
    # Test APy endpoint proxies to 2737
    if grep -A5 "location /" "$CONFIG_FILE" | grep -q "proxy_pass http://127.0.0.1:2737"; then
        pass "APy endpoint proxies to port 2737"
    else
        fail "APy endpoint not properly configured"
    fi
}

test_header_forwarding() {
    local required_headers=("X-Rebuild-Token" "Host" "X-Real-IP")
    
    for header in "${required_headers[@]}"; do
        if grep -q "proxy_set_header.*$header" "$CONFIG_FILE"; then
            pass "Header forwarding configured: $header"
        else
            fail "Missing header forwarding: $header"
        fi
    done
}

test_listen_directives() {
    if grep -q "listen 80 default_server" "$CONFIG_FILE"; then
        pass "IPv4 listen directive configured"
    else
        fail "Missing IPv4 listen directive"
    fi
    
    if grep -q "listen \[::\]:80 default_server" "$CONFIG_FILE"; then
        pass "IPv6 listen directive configured"
    else
        fail "Missing IPv6 listen directive"
    fi
}

test_no_duplicate_locations() {
    local locations=("status" "rebuild" "pull-repo" "build-repo")
    
    for location in "${locations[@]}"; do
        local count=$(grep -c "location /$location" "$CONFIG_FILE" || echo "0")
        if [[ "$count" -eq 1 ]]; then
            pass "No duplicate location blocks for /$location"
        elif [[ "$count" -gt 1 ]]; then
            fail "Duplicate location blocks found for /$location (count: $count)"
        fi
    done
}

test_syntax_basics() {
    # Check for common syntax errors
    if grep -q "server {" "$CONFIG_FILE"; then
        pass "Server block syntax present"
    else
        fail "Server block syntax missing"
    fi
    
    # Check balanced braces (simple check)
    local open_braces=$(grep -o "{" "$CONFIG_FILE" | wc -l)
    local close_braces=$(grep -o "}" "$CONFIG_FILE" | wc -l)
    
    if [[ "$open_braces" -eq "$close_braces" ]]; then
        pass "Balanced braces (open: $open_braces, close: $close_braces)"
    else
        fail "Unbalanced braces (open: $open_braces, close: $close_braces)"
    fi
}

print_summary() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test Summary:"
    echo "  Passed: $TESTS_PASSED"
    echo "  Failed: $TESTS_FAILED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed!${NC}"
        return 1
    fi
}

main() {
    echo "Testing nginx configuration..."
    echo ""
    
    test_file_exists
    test_required_locations
    test_proxy_configuration
    test_header_forwarding
    test_listen_directives
    test_no_duplicate_locations
    test_syntax_basics
    
    print_summary
}

main
exit $?

