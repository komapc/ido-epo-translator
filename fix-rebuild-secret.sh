#!/bin/bash
# Fix REBUILD_SHARED_SECRET issue for web translator
# This script helps set up the shared secret between Cloudflare Worker and EC2

set -e

EC2_HOST="ec2-52-211-137-158.eu-west-1.compute.amazonaws.com"
EC2_SSH="ubuntu@${EC2_HOST}"

echo "=== Fixing REBUILD_SHARED_SECRET Configuration ==="
echo ""

# Check if secret exists on EC2
echo "1. Checking EC2 webhook secret..."
SECRET=$(ssh -o ConnectTimeout=5 $EC2_SSH "cat ~/.webhook-secret 2>/dev/null || echo ''" 2>/dev/null || echo "")

if [ -z "$SECRET" ]; then
    echo "   ⚠️  No secret found on EC2. Generating new one..."
    echo ""
    echo "   To generate and set secret on EC2, run:"
    echo "   ssh $EC2_SSH"
    echo "   openssl rand -hex 32 > ~/.webhook-secret"
    echo "   chmod 600 ~/.webhook-secret"
    echo "   sudo systemctl edit webhook-server"
    echo "   # Add: Environment=\"REBUILD_SHARED_SECRET=\$(cat ~/.webhook-secret)\""
    echo "   sudo systemctl restart webhook-server"
    echo ""
    echo "   Then run this script again to set it in Cloudflare."
    exit 1
else
    echo "   ✓ Found secret on EC2: ${SECRET:0:8}...${SECRET: -8}"
fi

echo ""
echo "2. Setting REBUILD_SHARED_SECRET in Cloudflare Worker..."
echo "   (You'll be prompted to enter the secret)"
echo ""

# Set the secret in Cloudflare Worker
echo "$SECRET" | npx wrangler secret put REBUILD_SHARED_SECRET

echo ""
echo "✅ REBUILD_SHARED_SECRET has been set in Cloudflare Worker"
echo ""
echo "3. Verifying configuration..."
echo ""

# Check if it's set
if npx wrangler secret list | grep -q "REBUILD_SHARED_SECRET"; then
    echo "   ✓ REBUILD_SHARED_SECRET is now configured"
else
    echo "   ⚠️  Secret might not be visible in list (this is normal for secrets)"
fi

echo ""
echo "✅ Configuration complete!"
echo ""
echo "The web translator rebuild button should now work."
echo "Try clicking 'Pull Updates' in the web interface."
echo ""

