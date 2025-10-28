#!/bin/bash
# Manual setup for Cloudflare Worker secrets
# Use this if you can't SSH to EC2 or want to set secrets manually

set -e

echo "=== Manual Cloudflare Worker Secrets Setup ==="
echo ""
echo "This script will guide you through setting secrets manually."
echo ""

# Get EC2 host
echo "Step 1: EC2 Configuration"
echo "-------------------------"
read -p "Enter your EC2 host (domain or IP): " EC2_HOST

if [ -z "$EC2_HOST" ]; then
    echo "❌ Error: EC2 host is required"
    exit 1
fi

echo "✅ EC2 host: $EC2_HOST"

# Get secret manually
echo ""
echo "Step 2: Get Webhook Secret from EC2"
echo "------------------------------------"
echo "You need to get the secret from EC2. Run this command:"
echo ""
echo "  ssh ubuntu@52.211.137.158 'cat ~/.webhook-secret'"
echo ""
echo "If the file doesn't exist, create it:"
echo ""
echo "  ssh ubuntu@52.211.137.158 'openssl rand -hex 32 | tee ~/.webhook-secret'"
echo ""
read -p "Paste the secret here: " SECRET

if [ -z "$SECRET" ]; then
    echo "❌ Error: Secret is required"
    exit 1
fi

echo "✅ Secret received: ${SECRET:0:8}...${SECRET: -8}"

# Set secrets
echo ""
echo "Step 3: Setting Cloudflare Worker Secrets"
echo "------------------------------------------"
echo ""
echo "Setting 3 secrets (you'll see prompts from wrangler)..."
echo ""

# APY_SERVER_URL
echo "1/3: Setting APY_SERVER_URL..."
echo "http://$EC2_HOST" | npx wrangler secret put APY_SERVER_URL
echo "   ✅ Set to: http://$EC2_HOST"
echo ""

# REBUILD_WEBHOOK_URL
echo "2/3: Setting REBUILD_WEBHOOK_URL..."
echo "http://$EC2_HOST:8081/rebuild" | npx wrangler secret put REBUILD_WEBHOOK_URL
echo "   ✅ Set to: http://$EC2_HOST:8081/rebuild"
echo ""

# REBUILD_SHARED_SECRET
echo "3/3: Setting REBUILD_SHARED_SECRET..."
echo "$SECRET" | npx wrangler secret put REBUILD_SHARED_SECRET
echo "   ✅ Secret set"
echo ""

# Verify
echo "Step 4: Verification"
echo "--------------------"
echo ""
echo "Listing all secrets (names only):"
npx wrangler secret list
echo ""

# Test
echo "Step 5: Testing"
echo "---------------"
echo ""
echo "Testing webhook endpoint..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "http://$EC2_HOST:8081/pull-repo" \
    -H "Content-Type: application/json" \
    -H "X-Rebuild-Token: $SECRET" \
    -d '{"repo": "ido"}' \
    --max-time 10 || echo "000")

if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "202" ]; then
    echo "✅ Webhook is accessible! (HTTP $RESPONSE)"
elif [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ]; then
    echo "⚠️  Webhook responded but authentication may be wrong (HTTP $RESPONSE)"
    echo "    Check that the secret matches on EC2"
else
    echo "⚠️  Could not reach webhook (HTTP $RESPONSE)"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check EC2 security group allows port 8081"
    echo "2. Verify webhook server is running:"
    echo "   ssh ubuntu@52.211.137.158 'sudo systemctl status webhook-server'"
    echo "3. Check webhook server is listening on 0.0.0.0:"
    echo "   ssh ubuntu@52.211.137.158 'sudo netstat -tlnp | grep 8081'"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Configuration:"
echo "  APY_SERVER_URL: http://$EC2_HOST"
echo "  REBUILD_WEBHOOK_URL: http://$EC2_HOST:8081/rebuild"
echo "  REBUILD_SHARED_SECRET: ${SECRET:0:8}...${SECRET: -8}"
echo ""
echo "Next steps:"
echo "1. Test at: https://ido-epo-translator.pages.dev"
echo "2. Click 'Dictionaries' button"
echo "3. Try 'Pull Updates' on a repository"
echo ""
echo "If it doesn't work, check the troubleshooting section above."
