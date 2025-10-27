#!/bin/bash
# Remote deployment script - run this from your LOCAL machine
# It will SSH to EC2 and execute the deployment

set -e

EC2_HOST="ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com"
SSH_KEY="${SSH_KEY:-~/.ssh/your-key.pem}"

echo "=== Deploying to EC2 ==="
echo "Host: $EC2_HOST"
echo "SSH Key: $SSH_KEY"
echo ""

# SSH and execute deployment
ssh -i "$SSH_KEY" "$EC2_HOST" << 'ENDSSH'
set -e

echo "=== Pulling latest code ==="
cd ~/ido-epo-translator
git pull origin main

echo ""
echo "=== Deploying scripts to container ==="
cd apy-server

# Copy scripts
docker cp pull-repo.sh ido-epo-apy:/opt/apertium/pull-repo.sh
docker cp build-repo.sh ido-epo-apy:/opt/apertium/build-repo.sh

# Set permissions
docker exec ido-epo-apy chmod +x /opt/apertium/pull-repo.sh
docker exec ido-epo-apy chmod +x /opt/apertium/build-repo.sh

echo ""
echo "=== Verifying installation ==="
docker exec ido-epo-apy ls -lh /opt/apertium/*.sh

echo ""
echo "=== Restarting webhook server ==="
sudo systemctl restart webhook-server
sudo systemctl status webhook-server --no-pager

echo ""
echo "=== Testing pull operation ==="
docker exec ido-epo-apy /opt/apertium/pull-repo.sh ido

echo ""
echo "✅ Deployment complete!"
ENDSSH

echo ""
echo "=== Deployment finished ==="
echo "Test the web UI at: https://ido-epo-translator.pages.dev"
