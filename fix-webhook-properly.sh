#!/bin/bash
# Fix webhook server properly - correct the typo and restart

echo "=== Fixing Webhook Server (Properly This Time) ==="
echo ""

echo "1. Fixing the typo (0.0.0.1 → 0.0.0.0)..."
ssh ec2-translator "sudo sed -i \"s/'0.0.0.1'/'0.0.0.0'/g\" /opt/webhook-server.js"
echo "✅ Fixed"

echo ""
echo "2. Verifying the fix..."
ssh ec2-translator "sudo grep 'server.listen' /opt/webhook-server.js"

echo ""
echo "3. Restarting webhook server..."
ssh ec2-translator "sudo systemctl restart webhook-server"
sleep 3

echo ""
echo "4. Checking status..."
ssh ec2-translator "sudo systemctl status webhook-server --no-pager | head -15"

echo ""
echo "5. Checking if it's listening..."
ssh ec2-translator "sudo ss -tlnp | grep 8081"

echo ""
echo "6. Testing locally on EC2..."
ssh ec2-translator "curl -s -X POST 'http://localhost:8081/pull-repo' \
    -H 'Content-Type: application/json' \
    -H 'X-Rebuild-Token: \$(cat ~/.webhook-secret)' \
    -d '{\"repo\": \"ido\"}' | head -20"

echo ""
echo "=== Fix Complete ==="
echo ""
echo "⚠️  IMPORTANT: You still need to open port 8081 in EC2 Security Group!"
echo ""
echo "To fix the security group:"
echo "1. Go to AWS Console → EC2 → Security Groups"
echo "2. Find your instance's security group"
echo "3. Add inbound rule:"
echo "   - Type: Custom TCP"
echo "   - Port: 8081"
echo "   - Source: 0.0.0.0/0 (or your IP for security)"
echo ""
echo "After that, test again!"
