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
    # automake (gnu standard) requires these files to exist on a clean checkout
    touch ChangeLog NEWS COPYING INSTALL AUTHORS
    ls -la ChangeLog NEWS 2>&1 | head -2
    echo "    (running autogen+configure...)"
    ./autogen.sh > /tmp/autogen-$name.log 2>&1 || { echo "    ✗ autogen.sh failed:"; tail -5 /tmp/autogen-$name.log; return 1; }
    ./configure > /tmp/configure-$name.log 2>&1 || { echo "    ✗ configure failed:"; tail -5 /tmp/configure-$name.log; return 1; }
    echo "    (building - forced rebuild of all targets...)"
    make -B 2>&1 | tee /tmp/make-$name.log | tail -20
    echo "    (installing...)"
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

# apertium-transfer reads ACTIONS from the .t1x SOURCE file at runtime (not .bin)
# Must copy before APy starts, otherwise APy loads the old source into memory.
INSTALL_DIR="/usr/local/share/apertium/apertium-ido-epo"
BUILD_DIR="/opt/apertium/apertium-ido-epo"
echo "📋 Ensuring t1x source files are up-to-date in install dir..."
sudo cp -f "$BUILD_DIR/apertium-ido-epo.ido-epo.t1x" "$INSTALL_DIR/apertium-ido-epo.ido-epo.t1x" && echo "  ✓ ido-epo.t1x source updated" || echo "  ✗ ido-epo.t1x source copy failed"
sudo cp -f "$BUILD_DIR/apertium-ido-epo.epo-ido.t1x" "$INSTALL_DIR/apertium-ido-epo.epo-ido.t1x" 2>/dev/null && echo "  ✓ epo-ido.t1x source updated" || true

echo ""
echo "🔄 Restarting APy server..."
OLD_APY_PID=$(pgrep -f "apertium_apy" 2>/dev/null || pgrep -a python3 2>/dev/null | grep apy | awk '{print $1}')
echo "  Old APy PID: ${OLD_APY_PID:-none}"
# Kill old APy process directly
if [ -n "$OLD_APY_PID" ]; then
    sudo kill -9 $OLD_APY_PID 2>/dev/null && echo "  ✓ Killed old APy (PID $OLD_APY_PID)" || echo "  (kill returned non-zero)"
    sleep 1
fi
# Start fresh via systemd
sudo systemctl start apy 2>/dev/null || sudo systemctl start apy-server 2>/dev/null || true
sleep 3
NEW_APY_PID=$(pgrep -f "apertium_apy" 2>/dev/null || pgrep -a python3 2>/dev/null | grep apy | awk '{print $1}')
if [ "$NEW_APY_PID" != "$OLD_APY_PID" ] && [ -n "$NEW_APY_PID" ]; then
    echo "✅ APy restarted (new PID: $NEW_APY_PID)"
else
    echo "⚠️  APy may not have restarted (PID: ${NEW_APY_PID:-none})"
fi

echo ""
echo "🔍 Diagnostics: testing installed pipeline..."
echo "  Installed dir: $(ls $INSTALL_DIR/*.bin 2>/dev/null | wc -l) .bin files"
echo "  installed pipeline test (la → ?):"
echo "la" | lt-proc "$INSTALL_DIR/ido-epo.automorf.bin" 2>/dev/null | apertium-pretransfer -n 2>/dev/null | lt-proc -b "$INSTALL_DIR/ido-epo.autobil.bin" 2>/dev/null | apertium-transfer -b "$INSTALL_DIR/apertium-ido-epo.ido-epo.t1x" "$INSTALL_DIR/ido-epo.t1x.bin" 2>/dev/null | lt-proc -g "$INSTALL_DIR/ido-epo.autogen.bin" 2>/dev/null | xargs echo "    la ->"

echo "  installed t1x test (INSTALLED source + INSTALLED bin - same as APy):"
echo "la" | lt-proc "$INSTALL_DIR/ido-epo.automorf.bin" 2>/dev/null | apertium-pretransfer -n 2>/dev/null | lt-proc -b "$INSTALL_DIR/ido-epo.autobil.bin" 2>/dev/null | apertium-transfer -b "$INSTALL_DIR/apertium-ido-epo.ido-epo.t1x" "$INSTALL_DIR/ido-epo.t1x.bin" 2>/dev/null | lt-proc -g "$INSTALL_DIR/ido-epo.autogen.bin" 2>/dev/null | xargs echo "    la ->"

echo "  installed mode file (first line):"
head -1 /usr/local/share/apertium/modes/ido-epo.mode 2>/dev/null || echo "    (mode file not found)"
echo "  APy process: $(pgrep -a python3 | grep apy | head -1)"
echo "  t1x def count (should be 0 sp, 4+ sg): sp=$(grep -c 'def.*sp\|sp.*def' $INSTALL_DIR/apertium-ido-epo.ido-epo.t1x 2>/dev/null), sg=$(grep -c 'lit-tag v=\"sg\"' $INSTALL_DIR/apertium-ido-epo.ido-epo.t1x 2>/dev/null)"
