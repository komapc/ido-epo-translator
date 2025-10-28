#!/bin/bash
# Emergency EC2 cleanup - run from local machine

SSH_KEY="$HOME/.ssh/apertium.pem"
EC2_HOST="ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com"

echo "=== Emergency Cleanup ==="

ssh -i "$SSH_KEY" "$EC2_HOST" << 'ENDSSH'
set -e

echo "Current disk usage:"
df -h /
echo ""

echo "=== Aggressive Docker Cleanup ==="
# Stop all containers
docker stop $(docker ps -aq) 2>/dev/null || true

# Remove all containers
docker rm $(docker ps -aq) 2>/dev/null || true

# Remove all images except the one we need
docker images --format "{{.Repository}}:{{.Tag}} {{.ID}}" | grep -v "ido-epo-apy" | awk '{print $2}' | xargs -r docker rmi -f 2>/dev/null || true

# Remove all volumes
docker volume prune -f

# Remove all build cache
docker builder prune -a -f

# Remove all networks
docker network prune -f

echo ""
echo "=== System Cleanup ==="
# Fix broken packages
sudo apt --fix-broken install -y || true

# Remove old kernels (keep current)
sudo apt-get autoremove --purge -y

# Clean package cache
sudo apt-get clean
sudo apt-get autoclean

# Remove old logs
sudo journalctl --vacuum-size=50M
sudo find /var/log -type f -name "*.gz" -delete
sudo find /var/log -type f -name "*.log.*" -delete

# Remove temp files
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# Remove old snap revisions
if command -v snap &> /dev/null; then
    sudo snap list --all | awk '/disabled/{print $1, $3}' | while read snapname revision; do
        sudo snap remove "$snapname" --revision="$revision" 2>/dev/null || true
    done
fi

echo ""
echo "=== After Cleanup ==="
df -h /
echo ""

# Check if we have at least 2GB free
AVAILABLE=$(df / | tail -1 | awk '{print $4}')
if [ "$AVAILABLE" -lt 2000000 ]; then
    echo "⚠️  Still low on space. Consider:"
    echo "1. Expanding EBS volume in AWS Console"
    echo "2. Removing large files manually"
    echo ""
    echo "Largest directories:"
    sudo du -h /home /var /opt 2>/dev/null | sort -rh | head -10
else
    echo "✅ Sufficient space available"
fi
ENDSSH

echo ""
echo "Cleanup complete!"
