#!/bin/bash
# Connect to EC2 and deploy scripts
# Run this from your LOCAL machine

set -e

EC2_HOST="ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com"
SSH_KEY="$HOME/.ssh/apertium.pem"

echo "=== Connecting to EC2 ==="
echo "Host: $EC2_HOST"
echo "Key: $SSH_KEY"
echo ""

# First, check disk space and clean if needed
echo "Step 1: Checking disk space..."
ssh -i "$SSH_KEY" "$EC2_HOST" << 'ENDSSH'
echo "Current disk usage:"
df -h /
echo ""

# Check if we have less than 2GB free
AVAILABLE=$(df / | tail -1 | awk '{print $4}')
if [ "$AVAILABLE" -lt 2000000 ]; then
    echo "⚠️  Low disk space detected. Running cleanup..."
    
    # Docker cleanup
    docker system prune -a -f
    docker volume prune -f
    
    # APT cleanup
    sudo apt-get clean
    sudo apt-get autoremove -y
    
    # Log cleanup
    sudo journalctl --vacuum-time=3d
    
    echo "After cleanup:"
    df -h /
else
    echo "✅ Sufficient disk space available"
fi
ENDSSH

echo ""
echo "Step 2: Cloning/updating repository..."
ssh -i "$SSH_KEY" "$EC2_HOST" << 'ENDSSH'
if [ -d "ido-epo-translator" ]; then
    echo "Repository exists, pulling latest..."
    cd ido-epo-translator
    git pull origin main
else
    echo "Cloning repository..."
    git clone https://github.com/komapc/ido-epo-translator.git
    cd ido-epo-translator
fi
ENDSSH

echo ""
echo "Step 3: Deploying scripts to container..."
ssh -i "$SSH_KEY" "$EC2_HOST" << 'ENDSSH'
cd ido-epo-translator/apy-server

# Copy scripts to container
docker cp pull-repo.sh ido-epo-apy:/opt/apertium/pull-repo.sh
docker cp build-repo.sh ido-epo-apy:/opt/apertium/build-repo.sh

# Set permissions
docker exec ido-epo-apy chmod +x /opt/apertium/pull-repo.sh
docker exec ido-epo-apy chmod +x /opt/apertium/build-repo.sh

# Verify
echo "Scripts installed:"
docker exec ido-epo-apy ls -lh /opt/apertium/*.sh
ENDSSH

echo ""
echo "Step 4: Updating webhook server..."
ssh -i "$SSH_KEY" "$EC2_HOST" << 'ENDSSH'
cd ido-epo-translator

# Update webhook server
sudo cp webhook-server.js /opt/webhook-server.js

# Restart service
sudo systemctl restart webhook-server
sudo systemctl status webhook-server --no-pager
ENDSSH

echo ""
echo "Step 5: Testing..."
ssh -i "$SSH_KEY" "$EC2_HOST" << 'ENDSSH'
echo "Testing pull operation:"
docker exec ido-epo-apy /opt/apertium/pull-repo.sh ido
ENDSSH

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Test the web UI at: https://ido-epo-translator.pages.dev"
