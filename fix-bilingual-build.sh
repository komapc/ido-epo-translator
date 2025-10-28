#!/bin/bash
# Fix bilingual dictionary build issue
# Run this on EC2 if the bilingual dictionary fails to build

set -e

echo "=== Fixing bilingual dictionary build ==="

cd /opt/apertium/apertium-ido-epo

# Pull latest version with fixes
git pull origin main

# Clean previous build
make clean 2>/dev/null || true

# Regenerate configure with latest fixes
./autogen.sh

# Configure with explicit paths
PKG_CONFIG_PATH=/usr/local/share/pkgconfig:$PKG_CONFIG_PATH ./configure

# Check if Makefile has correct paths
if grep -q "AP_SRC1=@AP_SRC1@" Makefile; then
    echo "⚠️  Makefile still has template variables, fixing..."
    
    # Manually set the paths in Makefile
    sed -i 's|AP_SRC1=@AP_SRC1@|AP_SRC1=/usr/local/share/apertium/apertium-ido|g' Makefile
    sed -i 's|AP_SRC2=@AP_SRC2@|AP_SRC2=/usr/local/share/apertium/apertium-epo|g' Makefile
fi

# Verify paths are correct
echo "Checking Makefile paths:"
grep "^AP_SRC" Makefile

# Try to build
echo ""
echo "Building bilingual dictionary..."
make

# Install
echo ""
echo "Installing..."
sudo make install
sudo ldconfig

echo ""
echo "✅ Bilingual dictionary fixed and installed!"

# Verify installation
ls -la /usr/local/share/apertium/apertium-ido-epo/
