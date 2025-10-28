#!/bin/bash
# EC2 Disk Space Cleanup Script
# Run this on EC2 to free up space

set -e

echo "=== EC2 Disk Space Analysis and Cleanup ==="
echo ""

# Check current disk usage
echo "Current disk usage:"
df -h
echo ""

# Find large directories
echo "Top 10 largest directories in /home/ubuntu:"
du -h /home/ubuntu 2>/dev/null | sort -rh | head -10
echo ""

# Docker cleanup
echo "=== Docker Cleanup ==="
echo "Current Docker disk usage:"
docker system df
echo ""

echo "Cleaning up Docker..."
# Remove unused containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Remove build cache
docker builder prune -a -f

echo ""
echo "After Docker cleanup:"
docker system df
echo ""

# APT cleanup
echo "=== APT Cleanup ==="
sudo apt-get clean
sudo apt-get autoclean
sudo apt-get autoremove -y

# Remove old logs
echo "=== Log Cleanup ==="
sudo journalctl --vacuum-time=7d
sudo find /var/log -type f -name "*.gz" -delete
sudo find /var/log -type f -name "*.1" -delete

# Remove temporary files
echo "=== Temp Files Cleanup ==="
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

echo ""
echo "=== Final Disk Usage ==="
df -h
echo ""

echo "✅ Cleanup complete!"
echo ""
echo "If you still need more space, consider:"
echo "1. Removing old Docker images: docker images"
echo "2. Checking large files: find / -type f -size +100M 2>/dev/null"
echo "3. Expanding EBS volume in AWS Console"
