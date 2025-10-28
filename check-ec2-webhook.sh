#!/bin/bash
# Quick script to check EC2 webhook server status and logs

EC2_HOST="52.211.137.158"

echo "=== EC2 Webhook Server Diagnostics ==="
echo ""

echo "1. Checking webhook server status..."
echo "======================================"
ssh ubuntu@$EC2_HOST "sudo systemctl status webhook-server --no-pager | head -20"

echo ""
echo "2. Recent webhook server logs (last 30 lines)..."
echo "================================================="
ssh ubuntu@$EC2_HOST "sudo journalctl -u webhook-server -n 30 --no-pager"

echo ""
echo "3. Checking if server is listening on port 8081..."
echo "==================================================="
ssh ubuntu@$EC2_HOST "sudo netstat -tlnp | grep 8081 || sudo ss -tlnp | grep 8081"

echo ""
echo "4. Checking webhook server configuration..."
echo "============================================"
ssh ubuntu@$EC2_HOST "sudo grep -A 3 'server.listen' /opt/webhook-server.js"

echo ""
echo "5. Testing webhook endpoint directly from EC2..."
echo "================================================="
ssh ubuntu@$EC2_HOST "curl -X POST 'http://localhost:8081/pull-repo' \
    -H 'Content-Type: application/json' \
    -H 'X-Rebuild-Token: \$(cat ~/.webhook-secret)' \
    -d '{\"repo\": \"ido\"}' 2>&1"

echo ""
echo "6. Checking Docker container status..."
echo "======================================="
ssh ubuntu@$EC2_HOST "docker ps | grep apy"

echo ""
echo "=== Diagnostics Complete ==="
echo ""
echo "If you see errors above, common fixes:"
echo "1. Webhook server not running: sudo systemctl start webhook-server"
echo "2. Listening on 127.0.0.1: Change to 0.0.0.0 and restart"
echo "3. Docker not running: cd ~/ido-epo-translator && docker-compose up -d"
