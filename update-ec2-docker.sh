#!/bin/bash
# Script to update Docker image on EC2 with latest code
# Run this when you've changed rebuild.sh, Dockerfile, or APy settings

set -e

EC2_HOST="ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com"

echo "=== Updating EC2 Docker Image ==="
echo ""
echo "This will:"
echo "  1. Pull latest code from GitHub"
echo "  2. Stop current Docker container"
echo "  3. Rebuild Docker image (10-15 minutes)"
echo "  4. Start updated container"
echo ""

# Check if we can connect
if ! ssh -o ConnectTimeout=5 "$EC2_HOST" "echo 'Connection OK'" 2>/dev/null; then
    echo "❌ Error: Cannot connect to EC2"
    echo "   Check: ssh $EC2_HOST"
    exit 1
fi

echo "✅ Connected to EC2"
echo ""

# Run update on EC2
ssh "$EC2_HOST" bash -s << 'ENDSSH'
set -e

cd /opt/ido-epo-translator

echo "📥 Pulling latest code from GitHub..."
git pull origin main

echo ""
echo "🛑 Stopping current Docker container..."
docker-compose down

echo ""
echo "🔨 Rebuilding Docker image (this takes 10-15 minutes)..."
echo "    You'll see the build progress below..."
echo ""
docker-compose build --no-cache

echo ""
echo "🚀 Starting updated container..."
docker-compose up -d

echo ""
echo "⏳ Waiting for container to be ready..."
sleep 5

echo ""
echo "📊 Container status:"
docker-compose ps

echo ""
echo "✅ Docker image updated successfully!"
echo ""
echo "🔍 To verify:"
echo "   - Check logs: docker-compose logs -f apy-server"
echo "   - Test rebuild button in web UI"
ENDSSH

echo ""
echo "🎉 EC2 Docker update complete!"
echo ""
echo "Next steps:"
echo "  1. Test the rebuild button in web UI"
echo "  2. Verify translations are working"
