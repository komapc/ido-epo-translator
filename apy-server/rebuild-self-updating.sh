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

build_repo() {
    local dir="$1" name="$2"
    echo "  - Building $name..."
    cd "$dir"
    # Always remove any existing Makefile (may contain machine-local paths from git)
    rm -f Makefile
    echo "    (running autogen+configure...)"
    ./autogen.sh > /tmp/autogen-$name.log 2>&1 || { echo "    ✗ autogen.sh failed:"; tail -5 /tmp/autogen-$name.log; return 1; }
    ./configure > /tmp/configure-$name.log 2>&1 || { echo "    ✗ configure failed:"; tail -5 /tmp/configure-$name.log; return 1; }
    make 2>&1 | tail -10
    sudo make install 2>&1 | tail -5 || make install 2>&1 | tail -5 || echo "    (install step skipped - binaries built in-place)"
    sudo ldconfig 2>/dev/null || ldconfig 2>/dev/null || true
    echo "    ✓ Done"
}

# Rebuild apertium-ido
build_repo /opt/apertium/apertium-ido apertium-ido

# Rebuild apertium-epo
build_repo /opt/apertium/apertium-epo apertium-epo

# Rebuild apertium-ido-epo
build_repo /opt/apertium/apertium-ido-epo apertium-ido-epo

echo ""
echo "✅ Rebuild complete!"
echo ""
echo "🔄 Restarting APy server..."
sudo systemctl restart apy-server 2>/dev/null && echo "✅ APy restarted" || echo "⚠️  Could not restart APy (may need manual restart)"
