#!/bin/bash
# Self-updating rebuild script for Apertium dictionaries
# This script pulls its own latest version from GitHub before running

set -e

SCRIPT_URL="https://raw.githubusercontent.com/komapc/ido-epo-translator/main/apy-server/rebuild-self-updating.sh"
SCRIPT_PATH="/opt/apertium/rebuild.sh"

echo "=== Apertium Ido-Esperanto Rebuild ==="
echo ""

# Update this script itself from GitHub
echo "🔄 Checking for script updates..."
if curl -fsSL "$SCRIPT_URL" -o "${SCRIPT_PATH}.new" 2>/dev/null; then
    # Compare with current version
    if ! cmp -s "$SCRIPT_PATH" "${SCRIPT_PATH}.new"; then
        echo "✅ Script updated from GitHub"
        mv "${SCRIPT_PATH}.new" "$SCRIPT_PATH"
        chmod +x "$SCRIPT_PATH"
        echo "🔁 Restarting with new version..."
        exec "$SCRIPT_PATH" "$@"
    else
        echo "✅ Script is up to date"
        rm -f "${SCRIPT_PATH}.new"
    fi
else
    echo "⚠️  Could not check for updates (continuing with current version)"
    rm -f "${SCRIPT_PATH}.new"
fi

echo ""
echo "📥 Updating dictionaries from GitHub..."

# Update apertium-ido
cd /opt/apertium/apertium-ido
echo "  - apertium-ido..."
git fetch origin
if git diff --quiet HEAD origin/main; then
    echo "    ✓ Already up to date"
else
    git reset --hard origin/main
    echo "    ✓ Updated"
fi

# Update apertium-epo
cd /opt/apertium/apertium-epo
echo "  - apertium-epo..."
git fetch origin
if git diff --quiet HEAD origin/master; then
    echo "    ✓ Already up to date"
else
    git reset --hard origin/master
    echo "    ✓ Updated"
fi

# Update apertium-ido-epo
cd /opt/apertium/apertium-ido-epo
echo "  - apertium-ido-epo..."
git fetch origin
if git diff --quiet HEAD origin/main; then
    echo "    ✓ Already up to date"
else
    git reset --hard origin/main
    echo "    ✓ Updated"
fi

echo ""
echo "🔨 Rebuilding dictionaries..."

# Rebuild apertium-ido
echo "  - Building apertium-ido..."
cd /opt/apertium/apertium-ido
make clean > /dev/null 2>&1
./autogen.sh > /dev/null 2>&1
./configure > /dev/null 2>&1
make > /dev/null 2>&1
make install > /dev/null 2>&1
ldconfig
echo "    ✓ Done"

# Rebuild apertium-epo
echo "  - Building apertium-epo..."
cd /opt/apertium/apertium-epo
make clean > /dev/null 2>&1
./autogen.sh > /dev/null 2>&1
./configure > /dev/null 2>&1
make > /dev/null 2>&1
make install > /dev/null 2>&1
ldconfig
echo "    ✓ Done"

# Rebuild apertium-ido-epo
echo "  - Building apertium-ido-epo..."
cd /opt/apertium/apertium-ido-epo
make clean > /dev/null 2>&1
./autogen.sh > /dev/null 2>&1
./configure > /dev/null 2>&1
make > /dev/null 2>&1
make install > /dev/null 2>&1
ldconfig
echo "    ✓ Done"

echo ""
echo "✅ Rebuild complete!"
echo ""
echo "Note: Restart APy server to use new dictionaries:"
echo "  docker-compose restart"
