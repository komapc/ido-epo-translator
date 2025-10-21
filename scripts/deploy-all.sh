#!/bin/bash
# Complete deployment: APy server + Firebase

set -e

echo "╔═══════════════════════════════════════════════════╗"
echo "║  Ido-Esperanto Translator - Full Deployment     ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# Get version from argument or use timestamp
VERSION="${1:-v$(date +%Y%m%d-%H%M%S)}"

echo "Deployment Version: $VERSION"
echo ""

# Check if logged in to gcloud and firebase
echo "Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "❌ Not logged in to gcloud. Please run: gcloud auth login"
    exit 1
fi

if ! firebase projects:list > /dev/null 2>&1; then
    echo "❌ Not logged in to Firebase. Please run: firebase login"
    exit 1
fi

echo "✓ Authentication OK"
echo ""

# Deploy APy server
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Deploying APy Translation Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

./scripts/deploy-apy.sh "$VERSION"

echo ""
read -p "Press Enter to continue to Firebase deployment..."
echo ""

# Deploy Firebase
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Deploying Firebase Hosting & Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

./scripts/deploy-firebase.sh

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║           ✅ DEPLOYMENT COMPLETE! ✅              ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Test the translation service"
echo "2. Configure monitoring alerts"
echo "3. Set up custom domain (optional)"
echo ""

