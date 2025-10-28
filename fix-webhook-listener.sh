#!/bin/bash
# Fix webhook server to listen on 0.0.0.0 instead of 127.0.0.1

EC2_HOST="52.211.137.158"

echo "=== Fixing Webhook Server Listener ==="
echo ""

echo "1. Backing up current webhook server..."
ssh ubuntu@$EC2_HOST "sudo cp /opt/webhook-server.js /opt/webhook-server.js.backup"
echo "✅ Backup created at /opt/webhook-server.js.backup"

echo ""
echo "2. Updating listener from 127.0.0.1 to 0.0.0.0..."
ssh ubuntu@$EC2_HOST "sudo sed -i \"s/server.listen(PORT, '127.0.0.1'/server.listen(PORT, '0.0.0.0'/g\" /opt/webhook-server.js"
echo "✅ Configuration updated"

echo ""
echo "3. Verifying change..."
ssh ubuntu@$EC2_HOST "sudo grep 'server.listen' /opt/webhook-server.js"

echo ""
echo "4. Restarting webhook server..."
ssh ubuntu@$EC2_HOST "sudo systemctl restart webhook-server"
sleep 2
echo "✅ Server restarted"

echo ""
echo "5. Checking server status..."
ssh ubuntu@$EC2_HOST "sudo systemctl status webhook-server --no-pager | head -10"

echo ""
echo "6. Verifying it's listening on 0.0.0.0:8081..."
ssh ubuntu@$EC2_HOST "sudo netstat -tlnp | grep 8081 || sudo ss -tlnp | grep 8081"

echo ""
echo "7. Testing webhook endpoint..."
SECRET=$(ssh ubuntu@$EC2_HOST "cat ~/.webhook-secret")
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:8081/pull-repo" \
    -H "Content-Type: application/json" \
    -H "X-Rebuild-Token: $SECRET" \
    -d '{"repo": "ido"}' \
    --max-time 10)

if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "202" ]; then
    echo "✅ Webhook is now accessible! (HTTP $RESPONSE)"
else
    echo "⚠️  Webhook returned HTTP $RESPONSE"
    echo "Check EC2 security group allows inbound on port 8081"
fi

echo ""
echo "=== Fix Complete ==="
echo ""
echo "The webhook server is now listening on 0.0.0.0:8081"
echo "Test the web UI at: https://ido-epo-translator.pages.dev"
