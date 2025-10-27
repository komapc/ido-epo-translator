#!/bin/bash
# Script to build and install a specific Apertium repository

set -e

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

# Clean previous build
echo "Cleaning previous build..."
make clean > /dev/null 2>&1 || true

# Generate build files
echo "Running autogen.sh..."
./autogen.sh > /dev/null 2>&1

# Configure
echo "Configuring..."
./configure > /dev/null 2>&1

# Build
echo "Building..."
make > /dev/null 2>&1

# Install
echo "Installing..."
make install > /dev/null 2>&1

# Update library cache
ldconfig

# Record build information
BUILD_TIME=$(date -Iseconds)
echo "BUILD_HASH=$CURRENT_HASH"
echo "BUILD_TIME=$BUILD_TIME"

echo "=== Build complete for $REPO ==="
echo "Note: Restart APy server to use new dictionaries: docker-compose restart"