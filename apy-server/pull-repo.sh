#!/bin/bash
# Script to pull updates for a specific Apertium repository

set -e

REPO=$1

if [ -z "$REPO" ]; then
    echo "Usage: $0 <repo>"
    echo "Where repo is: ido, epo, or bilingual"
    exit 1
fi

# Map repo names to actual directories and branches
case "$REPO" in
    "ido")
        REPO_DIR="/opt/apertium/apertium-ido"
        BRANCH="main"
        ;;
    "epo")
        REPO_DIR="/opt/apertium/apertium-epo"
        BRANCH="master"
        ;;
    "bilingual")
        REPO_DIR="/opt/apertium/apertium-ido-epo"
        BRANCH="main"
        ;;
    *)
        echo "Error: Invalid repository '$REPO'. Must be: ido, epo, or bilingual"
        exit 1
        ;;
esac

echo "=== Pulling updates for $REPO ==="

# Check if directory exists
if [ ! -d "$REPO_DIR" ]; then
    echo "Error: Repository directory $REPO_DIR does not exist"
    exit 1
fi

cd "$REPO_DIR"

# Get current commit hash
OLD_HASH=$(git rev-parse HEAD)
echo "OLD_HASH=$OLD_HASH"

# Fetch latest changes
echo "Fetching latest changes from origin/$BRANCH..."
git fetch origin

# Get latest remote commit hash
LATEST_HASH=$(git rev-parse origin/$BRANCH)
echo "NEW_HASH=$LATEST_HASH"

# Check if there are changes
if [ "$OLD_HASH" = "$LATEST_HASH" ]; then
    echo "CHANGED=false"
    echo "Repository $REPO is already up to date"
else
    echo "CHANGED=true"
    echo "Updating from $OLD_HASH to $LATEST_HASH"
    
    # Reset to latest commit
    git reset --hard origin/$BRANCH
    
    # Show what changed
    COMMIT_COUNT=$(git rev-list --count $OLD_HASH..$LATEST_HASH)
    echo "COMMIT_COUNT=$COMMIT_COUNT"
    
    echo "Recent commits:"
    git log --oneline -5 $OLD_HASH..$LATEST_HASH || true
fi

echo "=== Pull complete for $REPO ==="