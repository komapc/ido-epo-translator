#!/bin/bash
# Script to deploy new pull/build scripts to EC2 container
# Run this script on your EC2 instance

set -e

echo "=== Deploying new scripts to APy container ==="

# Copy scripts to container
echo "Copying pull-repo.sh..."
docker cp apy-server/pull-repo.sh ido-epo-apy:/opt/apertium/pull-repo.sh

echo "Copying build-repo.sh..."
docker cp apy-server/build-repo.sh ido-epo-apy:/opt/apertium/build-repo.sh

# Make scripts executable
echo "Setting permissions..."
docker exec ido-epo-apy chmod +x /opt/apertium/pull-repo.sh
docker exec ido-epo-apy chmod +x /opt/apertium/build-repo.sh

# Verify scripts are in place
echo ""
echo "Verifying installation..."
docker exec ido-epo-apy ls -lh /opt/apertium/*.sh

echo ""
echo "✅ Scripts deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Restart webhook server: sudo systemctl restart webhook-server"
echo "2. Test pull operation: docker exec ido-epo-apy /opt/apertium/pull-repo.sh ido"
echo "3. Test build operation: docker exec ido-epo-apy /opt/apertium/build-repo.sh ido"
