#!/bin/bash
# Check all relevant logs to debug the issue

echo "=== Comprehensive Log Check ==="
echo ""

echo "1. Webhook Server Status"
echo "========================"
ssh ec2-translator "sudo systemctl status webhook-server --no-pager"

echo ""
echo "2. Webhook Server Logs (last 50 lines)"
echo "======================================="
ssh ec2-translator "sudo journalctl -u webhook-server -n 50 --no-pager"

echo ""
echo "3. Webhook Server Configuration"
echo "================================"
ssh ec2-translator "sudo grep -A 5 'server.listen' /opt/webhook-server.js"

echo ""
echo "4. Check if listening on correct port"
echo "======================================"
ssh ec2-translator "sudo netstat -tlnp | grep 8081 || sudo ss -tlnp | grep 8081"

echo ""
echo "5. Test webhook locally on EC2"
echo "==============================="
ssh ec2-translator "curl -v -X POST 'http://localhost:8081/pull-repo' \
    -H 'Content-Type: application/json' \
    -H 'X-Rebuild-Token: \$(cat ~/.webhook-secret)' \
    -d '{\"repo\": \"ido\"}' 2>&1 | head -30"

echo ""
echo "6. Test webhook from outside (using domain)"
echo "============================================="
SECRET=$(ssh ec2-translator "cat ~/.webhook-secret")
echo "Testing: http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:8081/pull-repo"
curl -v -X POST "http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:8081/pull-repo" \
    -H "Content-Type: application/json" \
    -H "X-Rebuild-Token: $SECRET" \
    -d '{"repo": "ido"}' \
    --max-time 10 2>&1 | head -40

echo ""
echo "7. Check EC2 Security Group"
echo "============================"
echo "Checking if port 8081 is accessible..."
nc -zv ec2-52-211-137-158.eu-west-1.compute.amazonaws.com 8081 2>&1 || echo "Port 8081 is NOT accessible"

echo ""
echo "8. Check if pull-repo.sh script exists"
echo "======================================="
ssh ec2-translator "ls -la /opt/apertium/pull-repo.sh"

echo ""
echo "9. Cloudflare Worker Secrets"
echo "============================="
echo "Checking what secrets are set..."
cd ~/apertium-dev/projects/translator
npx wrangler secret list

echo ""
echo "=== Analysis Complete ==="
