#!/bin/bash
# Setup container directory structure and deploy scripts

SSH_KEY="$HOME/.ssh/apertium.pem"
EC2_HOST="ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com"

echo "=== Setting up container ==="

ssh -i "$SSH_KEY" "$EC2_HOST" << 'ENDSSH'
set -e

echo "Step 1: Check container status"
docker ps
echo ""

echo "Step 2: Check container structure"
docker exec ido-epo-apy ls -la /opt/ || echo "No /opt directory"
echo ""

echo "Step 3: Create /opt/apertium directory if needed"
docker exec ido-epo-apy mkdir -p /opt/apertium
echo "✅ Directory created"
echo ""

echo "Step 4: Check if git repos exist"
docker exec ido-epo-apy ls -la /opt/apertium/ || echo "Empty directory"
echo ""

echo "Step 5: Clone git repositories if missing"
# Check if repos exist, clone if not
docker exec ido-epo-apy bash -c "
    cd /opt/apertium
    if [ ! -d 'apertium-ido' ]; then
        echo 'Cloning apertium-ido...'
        git clone https://github.com/komapc/apertium-ido.git
    fi
    if [ ! -d 'apertium-epo' ]; then
        echo 'Cloning apertium-epo...'
        git clone https://github.com/apertium/apertium-epo.git
    fi
    if [ ! -d 'apertium-ido-epo' ]; then
        echo 'Cloning apertium-ido-epo...'
        git clone https://github.com/komapc/apertium-ido-epo.git
    fi
    echo '✅ Repositories ready'
    ls -la
"
echo ""

echo "Step 6: Copy scripts to container"
cd ~/ido-epo-translator/apy-server
docker cp pull-repo.sh ido-epo-apy:/opt/apertium/pull-repo.sh
docker cp build-repo.sh ido-epo-apy:/opt/apertium/build-repo.sh
docker cp rebuild.sh ido-epo-apy:/opt/apertium/rebuild.sh
docker cp rebuild-self-updating.sh ido-epo-apy:/opt/apertium/rebuild-self-updating.sh
echo "✅ Scripts copied"
echo ""

echo "Step 7: Set permissions"
docker exec ido-epo-apy chmod +x /opt/apertium/*.sh
echo "✅ Permissions set"
echo ""

echo "Step 8: Verify installation"
docker exec ido-epo-apy ls -lh /opt/apertium/
echo ""

echo "Step 9: Test pull operation"
docker exec ido-epo-apy /opt/apertium/pull-repo.sh ido
echo ""

echo "✅ Container setup complete!"
ENDSSH

echo ""
echo "=== Updating webhook server ==="
ssh -i "$SSH_KEY" "$EC2_HOST" << 'ENDSSH'
cd ~/ido-epo-translator
sudo cp webhook-server.js /opt/webhook-server.js
sudo systemctl restart webhook-server
sudo systemctl status webhook-server --no-pager
ENDSSH

echo ""
echo "✅ All done! Test at: https://ido-epo-translator.pages.dev"
