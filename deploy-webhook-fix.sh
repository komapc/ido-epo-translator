#!/bin/bash
# Deploy updated webhook server to EC2 with status endpoint fix

set -e

EC2_HOST="ec2-52-211-137-158.eu-west-1.compute.amazonaws.com"
EC2_USER="ubuntu"
SSH_KEY="$HOME/.ssh/apertium.pem"

echo "🚀 Deploying webhook server fix to EC2..."

# Copy updated webhook server
echo "📤 Copying webhook-server-no-docker.js..."
scp -i "$SSH_KEY" webhook-server-no-docker.js "$EC2_USER@$EC2_HOST:/tmp/webhook-server-no-docker.js"

# Deploy and restart
echo "🔄 Deploying and restarting webhook server..."
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" << 'EOF'
# Backup old version
sudo cp /opt/webhook-server.js /opt/webhook-server.js.backup

# Install new version
sudo mv /tmp/webhook-server-no-docker.js /opt/webhook-server.js
sudo chmod +x /opt/webhook-server.js

# Restart service
sudo systemctl restart webhook-server

# Check status
sleep 2
sudo systemctl status webhook-server --no-pager

echo ""
echo "✅ Webhook server deployed and restarted"
echo ""
echo "Testing status endpoint..."
curl -s http://localhost:8081/status -H "X-Rebuild-Token: $(cat ~/.webhook-secret)" | jq .
EOF

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test the status endpoint: curl https://$EC2_HOST:8081/status"
echo "2. Deploy the Worker changes: npm run cf:deploy"
echo "3. Test the Dictionaries dialog in the web UI"
