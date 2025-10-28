#!/bin/bash
# Quick EC2 Fix - Run this on EC2 to get everything working
# This is a simplified version that just fixes what's broken

echo "=== Quick EC2 Fix ==="
echo "This will set up APy and webhook services"
echo ""

# Check if we're on EC2
if [ "$USER" != "ubuntu" ]; then
    echo "⚠️  Run this as ubuntu user on EC2"
    exit 1
fi

# 1. Make sure APy is installed
if [ ! -d "/opt/apertium-apy" ]; then
    echo "Installing APy..."
    cd /opt
    sudo git clone https://github.com/apertium/apertium-apy.git
    cd apertium-apy
    sudo pip3 install --break-system-packages apertium-streamparser chardet requests tornado commentjson lxml fasttext-wheel==0.9.2
fi

# 2. Create APy service if it doesn't exist
if [ ! -f "/etc/systemd/system/apy-server.service" ]; then
    echo "Creating APy service..."
    sudo tee /etc/systemd/system/apy-server.service > /dev/null <<'EOF'
[Unit]
Description=Apertium APy Translation Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/apertium-apy
ExecStart=/usr/bin/python3 /opt/apertium-apy/apy.py -p 2737 -j1 /usr/local/share/apertium/modes/
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable apy-server
fi

# 3. Start APy
echo "Starting APy..."
sudo systemctl start apy-server
sleep 2
sudo systemctl status apy-server --no-pager | head -10

# 4. Test APy
echo ""
echo "Testing APy..."
curl -s http://localhost:2737/listPairs | head -3

# 5. Setup webhook if needed
if [ ! -f "/etc/systemd/system/webhook-server.service" ]; then
    echo ""
    echo "Setting up webhook server..."
    
    # Get latest code
    cd ~
    if [ ! -d "ido-epo-translator" ]; then
        git clone https://github.com/komapc/ido-epo-translator.git
    else
        cd ido-epo-translator && git pull && cd ~
    fi
    
    # Copy webhook server
    if [ -f ~/ido-epo-translator/webhook-server-no-docker.js ]; then
        sudo cp ~/ido-epo-translator/webhook-server-no-docker.js /opt/webhook-server.js
    else
        sudo cp ~/ido-epo-translator/webhook-server.js /opt/webhook-server.js
    fi
    
    # Generate secret
    if [ ! -f ~/.webhook-secret ]; then
        openssl rand -hex 32 > ~/.webhook-secret
    fi
    SECRET=$(cat ~/.webhook-secret)
    
    # Create service
    sudo tee /etc/systemd/system/webhook-server.service > /dev/null <<EOF
[Unit]
Description=Apertium Rebuild Webhook Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt
ExecStart=/usr/bin/node /opt/webhook-server.js
Restart=always
RestartSec=10
Environment="PORT=8081"
Environment="REBUILD_SHARED_SECRET=$SECRET"

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable webhook-server
    sudo systemctl start webhook-server
    
    echo ""
    echo "✅ Webhook secret: $SECRET"
    echo "   Add this to Cloudflare as REBUILD_SHARED_SECRET"
fi

echo ""
echo "=== Status ==="
echo "APy:"
sudo systemctl is-active apy-server
echo "Webhook:"
sudo systemctl is-active webhook-server

echo ""
echo "=== Next Steps ==="
echo "1. Update Cloudflare environment variable:"
echo "   REBUILD_WEBHOOK_URL = http://$(curl -s ifconfig.me):8081/rebuild"
echo "2. Test: https://ido-epo-translator.pages.dev"
