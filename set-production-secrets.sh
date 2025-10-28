#!/bin/bash
# Set production secrets for Cloudflare Worker
# These secrets will NEVER be reset by deployments

set -e

echo "=== Cloudflare Worker Production Secrets Setup ==="
echo ""
echo "This will set secrets that persist across all deployments."
echo ""

# Get EC2 host (IP or domain)
echo "Enter your EC2 host:"
echo "  Option 1 (IP): 52.211.137.158"
echo "  Option 2 (Domain): ec2-52-211-137-158.eu-west-1.compute.amazonaws.com"
echo ""
read -p "EC2 host: " EC2_HOST

if [ -z "$EC2_HOST" ]; then
    echo "❌ Error: EC2 host is required"
    exit 1
fi

# Determine if it's an IP or domain for SSH
if [[ $EC2_HOST =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    # It's an IP address
    EC2_SSH="$EC2_HOST"
    echo "✅ Using IP address: $EC2_HOST"
elif [[ $EC2_HOST =~ ^ec2-.*\.compute\.amazonaws\.com$ ]]; then
    # It's an AWS domain, extract IP for SSH
    EC2_SSH=$(echo "$EC2_HOST" | sed 's/ec2-//;s/\..*//;s/-/./g')
    echo "✅ Using domain: $EC2_HOST (SSH via $EC2_SSH)"
else
    # Assume it's a custom domain or hostname
    EC2_SSH="$EC2_HOST"
    echo "✅ Using hostname: $EC2_HOST"
fi

# Fetch secret from EC2
echo ""
echo "Fetching webhook secret from EC2..."
SECRET=$(ssh ubuntu@$EC2_SSH "cat ~/.webhook-secret 2>/dev/null || echo ''")

if [ -z "$SECRET" ]; then
    echo "⚠️  Secret not found on EC2. Creating new one..."
    ssh ubuntu@$EC2_SSH "openssl rand -hex 32 > ~/.webhook-secret && chmod 600 ~/.webhook-secret"
    SECRET=$(ssh ubuntu@$EC2_SSH "cat ~/.webhook-secret")
    echo "✅ New secret created: ${SECRET:0:8}...${SECRET: -8}"
fi

echo "✅ Secret retrieved from EC2"

# Set secrets using wrangler
echo ""
echo "Setting Cloudflare Worker secrets..."
echo "These will NEVER be reset by deployments."
echo ""

# REBUILD_WEBHOOK_URL
echo "1. Setting REBUILD_WEBHOOK_URL..."
echo "http://$EC2_HOST:8081/rebuild" | npx wrangler secret put REBUILD_WEBHOOK_URL
echo "   ✅ Set to: http://$EC2_HOST:8081/rebuild"

# REBUILD_SHARED_SECRET
echo ""
echo "2. Setting REBUILD_SHARED_SECRET..."
echo "$SECRET" | npx wrangler secret put REBUILD_SHARED_SECRET
echo "   ✅ Set to: ${SECRET:0:8}...${SECRET: -8}"

# APY_SERVER_URL (as secret for consistency)
echo ""
echo "3. Setting APY_SERVER_URL..."
echo "http://$EC2_HOST" | npx wrangler secret put APY_SERVER_URL
echo "   ✅ Set to: http://$EC2_HOST"

# Verify
echo ""
echo "=== Verification ==="
echo ""
echo "Listing all secrets (names only, values are encrypted):"
npx wrangler secret list

echo ""
echo "=== Setup Complete ==="
echo ""
echo "✅ All secrets are now set and will persist across deployments!"
echo ""
echo "Configuration:"
echo "  APY_SERVER_URL: http://$EC2_HOST"
echo "  REBUILD_WEBHOOK_URL: http://$EC2_HOST:8081/rebuild"
echo "  REBUILD_SHARED_SECRET: ${SECRET:0:8}...${SECRET: -8}"
echo ""
echo "Next steps:"
echo "1. Deploy your worker: npm run deploy"
echo "2. Test at: https://ido-epo-translator.pages.dev"
echo "3. Click 'Dictionaries' and try 'Pull Updates'"
echo ""
echo "Note: These secrets will NEVER be reset by future deployments."
echo "To update a secret, just run this script again."
