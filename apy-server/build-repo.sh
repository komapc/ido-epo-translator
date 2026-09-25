#!/bin/bash
# Script to build and install a specific Apertium repository

# pipefail: `make ... | tail` must fail when make fails, not when tail does.
set -eo pipefail

REPO=$1

if [ -z "$REPO" ]; then
    echo "Usage: $0 <repo>"
    echo "Where repo is: ido, epo, or bilingual"
    exit 1
fi

# Map repo names to actual directories
case "$REPO" in
    "ido")
        REPO_DIR="/opt/apertium/apertium-ido"
        ;;
    "epo")
        REPO_DIR="/opt/apertium/apertium-epo"
        ;;
    "bilingual")
        REPO_DIR="/opt/apertium/apertium-ido-epo"
        ;;
    *)
        echo "Error: Invalid repository '$REPO'. Must be: ido, epo, or bilingual"
        exit 1
        ;;
esac

echo "=== Building $REPO ==="

# Check if directory exists
if [ ! -d "$REPO_DIR" ]; then
    echo "Error: Repository directory $REPO_DIR does not exist"
    exit 1
fi

cd "$REPO_DIR"

# Get current commit for tracking
CURRENT_HASH=$(git rev-parse HEAD)
echo "Building commit: $CURRENT_HASH"

# Same build recipe as rebuild-self-updating.sh: the committed Makefile may
# contain machine-local paths, so always regenerate it.
rm -f Makefile
touch ChangeLog NEWS COPYING INSTALL AUTHORS
echo "Running autogen.sh + configure..."
./autogen.sh > "/tmp/autogen-$REPO.log" 2>&1 || { tail -5 "/tmp/autogen-$REPO.log"; exit 1; }
./configure > "/tmp/configure-$REPO.log" 2>&1 || { tail -5 "/tmp/configure-$REPO.log"; exit 1; }

# Compiling the monodix/bidix on this 1GB box OOMs the instance without swap.
if [ -z "$(swapon --show 2>/dev/null)" ]; then
    echo "Error: no swap configured; refusing to build on this 1GB box"
    exit 1
fi

echo "Building..."
make 2>&1 | tee "/tmp/make-$REPO.log" | tail -10

echo "Installing..."
sudo make install 2>&1 | tail -5
sudo ldconfig

# apertium-transfer reads the .t1x SOURCE at runtime; see rebuild-self-updating.sh.
if [ "$REPO" = "bilingual" ]; then
    INSTALL_DIR="/usr/local/share/apertium/apertium-ido-epo"
    sudo cp -f apertium-ido-epo.ido-epo.t1x "$INSTALL_DIR/"
    sudo cp -f apertium-ido-epo.epo-ido.t1x "$INSTALL_DIR/"
fi

# Restart the serving APy and verify by MainPID (see rebuild-self-updating.sh
# for why this must not match processes by name).
APY_UNIT=apy-server
OLD_APY_PID=$(systemctl show "$APY_UNIT" -p MainPID --value 2>/dev/null)
sudo systemctl restart "$APY_UNIT"
sleep 5
NEW_APY_PID=$(systemctl show "$APY_UNIT" -p MainPID --value 2>/dev/null)
if [ -z "$NEW_APY_PID" ] || [ "$NEW_APY_PID" = "0" ] || [ "$NEW_APY_PID" = "$OLD_APY_PID" ] || ! systemctl is-active --quiet "$APY_UNIT"; then
    echo "Error: APy did not restart ($APY_UNIT PID: ${NEW_APY_PID:-none}, was ${OLD_APY_PID:-none})"
    exit 1
fi
echo "APy restarted (new PID: $NEW_APY_PID)"

echo "BUILD_HASH=$CURRENT_HASH"
echo "BUILD_TIME=$(date -Iseconds)"
echo "=== Build complete for $REPO ==="
