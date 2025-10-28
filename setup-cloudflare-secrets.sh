#!/bin/bash
# Setup Cloudflare Worker Secrets for Translator
# Run this locally from projects/translator directory

set -e

echo "=== Cloudflare Worker Secrets Setup ==="
echo ""
echo "This script will help you set up the required secrets for the translator."
echo ""

# Check if we're in the right directory
if [ ! -f "wrangler.toml" ]; then
    echo "❌ Error: wrangler.toml not found. Please run this from projects/translator/"
    exit 1
fi

# Get EC2 host
echo "Step 1: EC2 Configuration"
echo "-------------------------"
echo "Enter your EC2 host (IP or domain):"
echo "  Example IP: 52.211.137.158"
echo "  Example domain: ec2-52-211-137-158.eu-west-1.compute.amazonaws.com"
echo ""
read -p "EC2 host: " EC2_HOST

if [ -z "$EC2_HOST" ]; then
    echo "❌ Error: EC2 host is required"
    exit 1
fi

# Determine SSH target (extract IP from domain if needed)
if [[ $EC2_HOST =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    # It's an IP address
    EC2_SSH="$EC2_HOST"
    echo "✅ Using IP address: $EC2_HOST"
elif [[ $EC2_HOST =~ ^ec2-.*\.compute\.amazonaws\.com$ ]]; then
    # It's an AWS domain, extract IP for SSH
    EC2_SSH=$(echo "$EC2_HOST" | sed 's/ec2-//;s/\..*//;s/-/./g')
    echo "✅ Using domain: $EC2_HOST (SSH via $EC2_SSH)"
else
    # Assume it's a hostname
    EC2_SSH="$EC2_HOST"
    echo "✅ Using hostname: $EC2_HOST"
fi

# Get the secret from EC2
echo ""
echo "Step 2: Fetching secret from EC2..."
echo "------------------------------------"
echo "Connecting to EC2 (ubuntu@$EC2_SSH) to get the webhook secret..."

SECRET=$(ssh ubuntu@$EC2_SSH "cat ~/.webhook-secret 2>/dev/null || echo ''")

if [ -z "$SECRET" ]; then
    echo "⚠️  Warning: Could not fetch secret from EC2"
    echo "Creating a new secret on EC2..."
    
    # Generate new secret on EC2
    ssh ubuntu@$EC2_SSH "openssl rand -hex 32 > ~/.webhook-secret && chmod 600 ~/.webhook-secret"
    SECRET=$(ssh ubuntu@$EC2_SSH "cat ~/.webhook-secret")
    
    echo "✅ New secret created on EC2"
fi

echo "✅ Secret retrieved: ${SECRET:0:8}..."

# Set the secrets using wrangler
echo ""
echo "Step 3: Setting Cloudflare Worker secrets..."
echo "---------------------------------------------"

# Set REBUILD_WEBHOOK_URL (use the original host, not SSH target)
echo "http://$EC2_HOST:8081/rebuild" | npx wrangler secret put REBUILD_WEBHOOK_URL
echo "✅ REBUILD_WEBHOOK_URL set to: http://$EC2_HOST:8081/rebuild"

# Set APY_SERVER_URL
echo "http://$EC2_HOST" | npx wrangler secret put APY_SERVER_URL
echo "✅ APY_SERVER_URL set to: http://$EC2_HOST"

# Set REBUILD_SHARED_SECRET
echo "$SECRET" | npx wrangler secret put REBUILD_SHARED_SECRET
echo "✅ REBUILD_SHARED_SECRET set"

# Verify webhook server is listening on 0.0.0.0
echo ""
echo "Step 4: Verifying EC2 webhook server configuration..."
echo "------------------------------------------------------"

ssh ubuntu@$EC2_SSH "sudo systemctl status webhook-server --no-pager | head -10"

echo ""
echo "Checking if webhook server is listening on all interfaces..."
LISTEN_CONFIG=$(ssh ubuntu@$EC2_SSH "sudo grep 'server.listen' /opt/webhook-server.js | head -1")
echo "Current config: $LISTEN_CONFIG"

if echo "$LISTEN_CONFIG" | grep -q "0.0.0.0"; then
    echo "✅ Webhook server is correctly configured to listen on 0.0.0.0"
else
    echo "⚠️  Webhook server may be listening on 127.0.0.1 only"
    echo ""
    read -p "Fix webhook server configuration? (y/n): " FIX_CONFIG
    
    if [ "$FIX_CONFIG" = "y" ]; then
        echo "Updating webhook server configuration..."
        ssh ubuntu@$EC2_SSH "sudo sed -i \"s/server.listen(PORT, '127.0.0.1'/server.listen(PORT, '0.0.0.0'/g\" /opt/webhook-server.js"
        ssh ubuntu@$EC2_SSH "sudo systemctl restart webhook-server"
        echo "✅ Webhook server restarted with new configuration"
    fi
fi

# Test the connection
echo ""
echo "Step 5: Testing connection..."
echo "-----------------------------"

echo "Testing webhook endpoint at http://$EC2_HOST:8081/pull-repo..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "http://$EC2_HOST:8081/pull-repo" \
    -H "Content-Type: application/json" \
    -H "X-Rebuild-Token: $SECRET" \
    -d '{"repo": "ido"}' \
    --max-time 5 || echo "000")

if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "202" ]; then
    echo "✅ Webhook endpoint is accessible (HTTP $RESPONSE)"
else
    echo "⚠️  Webhook endpoint returned HTTP $RESPONSE"
    echo ""
    echo "Troubleshooting tips:"
    echo "1. Check EC2 security group allows inbound on port 8081"
    echo "2. Verify webhook server is running: ssh ubuntu@$EC2_SSH 'sudo systemctl status webhook-server'"
    echo "3. Check logs: ssh ubuntu@$EC2_SSH 'sudo journalctl -u webhook-server -n 50'"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Configuration Summary:"
echo "  EC2 Host: $EC2_HOST"
echo "  SSH Target: $EC2_SSH"
echo "  APY Server URL: http://$EC2_HOST"
echo "  Webhook URL: http://$EC2_HOST:8081/rebuild"
echo "  Secret: ${SECRET:0:8}...${SECRET: -8}"
echo ""
echo "Next steps:"
echo "1. Test the web UI at: https://ido-epo-translator.pages.dev"
echo "2. Click 'Dictionaries' button"
echo "3. Try 'Pull Updates' on a repository"
echo ""
echo "If it still doesn't work, check:"
echo "  - EC2 security group port 8081 is open"
echo "  - Webhook server logs: ssh ubuntu@$EC2_IP 'sudo journalctl -u webhook-server -f'"
