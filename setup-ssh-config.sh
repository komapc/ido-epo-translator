#!/bin/bash
# Setup SSH config for EC2 access

echo "=== Setting up SSH Config for EC2 ==="
echo ""

# Check if apertium.pem exists
if [ ! -f ~/.ssh/apertium.pem ]; then
    echo "❌ Error: ~/.ssh/apertium.pem not found"
    echo "Please make sure your EC2 key is at ~/.ssh/apertium.pem"
    exit 1
fi

# Fix permissions on the key
echo "1. Setting correct permissions on apertium.pem..."
chmod 600 ~/.ssh/apertium.pem
echo "✅ Permissions set to 600"

# Create or update SSH config
echo ""
echo "2. Updating SSH config..."

SSH_CONFIG=~/.ssh/config

# Backup existing config if it exists
if [ -f "$SSH_CONFIG" ]; then
    cp "$SSH_CONFIG" "$SSH_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✅ Backed up existing SSH config"
fi

# Remove old EC2 entry if exists
if grep -q "Host.*52.211.137.158" "$SSH_CONFIG" 2>/dev/null; then
    echo "Removing old EC2 entry..."
    sed -i '/Host.*52.211.137.158/,/^$/d' "$SSH_CONFIG"
fi

# Add new entry
cat >> "$SSH_CONFIG" << 'EOF'

# EC2 Apertium Translator Instance
Host ec2-translator
    HostName 52.211.137.158
    User ubuntu
    IdentityFile ~/.ssh/apertium.pem
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null

Host 52.211.137.158
    User ubuntu
    IdentityFile ~/.ssh/apertium.pem
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null

Host ec2-52-211-137-158.eu-west-1.compute.amazonaws.com
    User ubuntu
    IdentityFile ~/.ssh/apertium.pem
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF

echo "✅ SSH config updated"

# Test connection
echo ""
echo "3. Testing SSH connection..."
if ssh -o ConnectTimeout=5 ubuntu@52.211.137.158 "echo 'Connection successful!'" 2>/dev/null; then
    echo "✅ SSH connection works!"
else
    echo "⚠️  SSH connection failed. Check:"
    echo "   - EC2 instance is running"
    echo "   - Security group allows SSH from your IP"
    echo "   - Key file is correct"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "You can now SSH using any of these:"
echo "  ssh ec2-translator"
echo "  ssh ubuntu@52.211.137.158"
echo "  ssh ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com"
