#!/bin/bash
# Update translation dictionaries and redeploy

set -e

echo "=== Updating Ido-Esperanto Translations ==="
echo ""

# Navigate to Apertium repos and pull latest
echo "1. Updating apertium-ido repository..."
cd /home/mark/apertium-ido-epo/apertium-ido
git pull origin master
echo "✓ apertium-ido updated"
echo ""

echo "2. Updating apertium-ido-epo repository..."
cd /home/mark/apertium-ido-epo/apertium-ido-epo
git pull origin master
echo "✓ apertium-ido-epo updated"
echo ""

# Rebuild locally
echo "3. Rebuilding apertium-ido..."
cd /home/mark/apertium-ido-epo/apertium-ido
make clean
./autogen.sh
./configure
make
sudo make install
sudo ldconfig
echo "✓ apertium-ido rebuilt"
echo ""

echo "4. Rebuilding apertium-ido-epo..."
cd /home/mark/apertium-ido-epo/apertium-ido-epo
make clean
./autogen.sh
./configure
make
sudo make install
sudo ldconfig
echo "✓ apertium-ido-epo rebuilt"
echo ""

# Ask if user wants to deploy
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Local updates complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Deploy updated translations to production? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting deployment..."
    cd /home/mark/apertium-ido-epo/vortaro
    VERSION="v$(date +%Y%m%d-%H%M%S)-updated"
    ./scripts/deploy-apy.sh "$VERSION"
    echo ""
    echo "✅ Deployment complete!"
else
    echo ""
    echo "Skipping deployment."
    echo "To deploy later, run:"
    echo "  cd /home/mark/apertium-ido-epo/vortaro"
    echo "  ./scripts/deploy-apy.sh"
fi

echo ""

