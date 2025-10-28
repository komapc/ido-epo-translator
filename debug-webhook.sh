#!/bin/bash
# Debug webhook connectivity issues

set -e

echo "=== Webhook Debugging Tool ==="
echo ""

# Get EC2 IP
read -p "Enter your EC2 IP address: " EC2_IP

if [ -z "$EC2_IP" ]; then
    echo "❌ Error: EC2 IP is required"
    exit 1
fi

echo ""
echo "1. Checking webhook server status on EC2..."
echo "============================================"
ssh ubuntu@$EC2_IP "sudo systemctl status webhook-server --no-pager" || echo "⚠️  Could not check status"

echo ""
echo "2. Checking webhook server logs (last 20 lines)..."
echo "==================================================="
ssh ubuntu@$EC2_IP "sudo journalctl -u webhook-server -n 20 --no-pager"

echo ""
echo "3. Checking if webhook server is listening..."
echo "=============================================="
ssh ubuntu@$EC2_IP "sudo netstat -tlnp | grep 8081 || sudo ss -tlnp | grep 8081"

echo ""
echo "4. Checking webhook server configuration..."
echo "============================================"
ssh ubuntu@$EC2_IP "sudo grep -A 5 'server.listen' /opt/webhook-server.js"

echo ""
echo "5. Getting webhook secret..."
echo "============================"
SECRET=$(ssh ubuntu@$EC2_IP "cat ~/.webhook-secret 2>/dev/null || echo 'NOT_FOUND'")
if [ "$SECRET" = "NOT_FOUND" ]; then
    echo "❌ Secret not found on EC2!"
else
    echo "✅ Secret found: ${SECRET:0:8}...${SECRET: -8}"
fi

echo ""
echo "6. Testing webhook endpoint from your machine..."
echo "================================================="
echo "Testing /pull-repo endpoint..."

curl -v -X POST "http://$EC2_IP:8081/pull-repo" \
    -H "Content-Type: application/json" \
    -H "X-Rebuild-Token: $SECRET" \
    -d '{"repo": "ido"}' \
    --max-time 10 2>&1 | head -30

echo ""
echo ""
echo "7. Testing from EC2 itself (localhost)..."
echo "=========================================="
ssh ubuntu@$EC2_IP "curl -X POST 'http://localhost:8081/pull-repo' \
    -H 'Content-Type: application/json' \
    -H 'X-Rebuild-Token: \$(cat ~/.webhook-secret)' \
    -d '{\"repo\": \"ido\"}' 2>&1"

echo ""
echo "8. Checking EC2 security group (from AWS)..."
echo "============================================="
echo "Please verify in AWS Console that security group allows:"
echo "  - Inbound TCP port 8081 from 0.0.0.0/0 (or your IP)"
echo "  - Inbound TCP port 22 (SSH)"
echo ""
echo "AWS Console → EC2 → Security Groups → Check inbound rules"

echo ""
echo "=== Debug Complete ==="
