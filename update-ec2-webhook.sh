#!/bin/bash
# Script to update webhook server on EC2 with latest code
# Run this on EC2: curl -sL https://raw.githubusercontent.com/komapc/vortaro/main/update-ec2-webhook.sh | bash

set -e

echo "=== Updating EC2 Webhook Server ==="

# Navigate to project directory
cd /opt/ido-epo-translator || { echo "Error: /opt/ido-epo-translator not found"; exit 1; }

# Backup current webhook server
echo "📦 Backing up current webhook-server.js..."
cp webhook-server.js webhook-server.js.backup.$(date +%Y%m%d_%H%M%S)

# Download latest webhook server from GitHub
echo "⬇️  Downloading latest webhook-server.js from GitHub..."
curl -sL https://raw.githubusercontent.com/komapc/vortaro/main/webhook-server.js -o webhook-server.js.new

# Verify the download
if [ ! -s webhook-server.js.new ]; then
    echo "❌ Error: Failed to download webhook-server.js"
    exit 1
fi

# Replace with new version
mv webhook-server.js.new webhook-server.js
chmod +x webhook-server.js

# Restart the webhook server
echo "🔄 Restarting webhook server..."
sudo systemctl restart webhook-server

# Check status
sleep 2
if sudo systemctl is-active --quiet webhook-server; then
    echo "✅ Webhook server updated and running!"
    echo ""
    echo "📋 Current version info:"
    head -5 webhook-server.js
else
    echo "❌ Error: Webhook server failed to start"
    echo "Rolling back to backup..."
    mv webhook-server.js.backup.$(date +%Y%m%d)* webhook-server.js
    sudo systemctl restart webhook-server
    exit 1
fi

echo ""
echo "🎉 Update complete!"
echo ""
echo "To verify the update worked:"
echo "  curl -X POST http://localhost:9100/rebuild -H 'Content-Type: application/json' -H 'X-Rebuild-Token: YOUR_SECRET'"

