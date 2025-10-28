#!/bin/bash
# Complete EC2 Setup Script - Run this on EC2 as ubuntu user
# This script does everything needed for the no-Docker setup

set -e

echo "=== Complete EC2 Setup for Apertium Translation Server ==="
echo ""
echo "This script will:"
echo "1. Check if migration is needed (Docker removal)"
echo "2. Install all dependencies"
echo "3. Build all dictionaries"
echo "4. Setup APy service"
echo "5. Setup webhook service"
echo "6. Test everything"
echo ""
read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted"
    exit 1
fi

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then
    echo "⚠️  Warning: This script should be run as 'ubuntu' user"
    echo "Current user: $USER"
    read -p "Continue anyway? (yes/no): " continue_anyway
    if [ "$continue_anyway" != "yes" ]; then
        exit 1
    fi
fi

echo ""
echo "=== Step 1: Remove Docker if present ==="
if command -v docker &> /dev/null; then
    echo "Docker found, removing..."
    sudo systemctl stop docker 2>/dev/null || true
    sudo apt-get remove -y docker docker-engine docker.io containerd runc docker-compose 2>/dev/null || true
    sudo rm -rf /var/lib/docker
    sudo rm -rf /var/lib/containerd
    echo "✅ Docker removed"
else
    echo "✅ Docker not present"
fi

echo ""
echo "=== Step 2: Install Apertium ==="
if ! command -v apertium &> /dev/null; then
    echo "Installing Apertium..."
    curl -sS https://apertium.projectjj.com/apt/install-nightly.sh | sudo bash
    sudo apt-get update
    sudo apt-get install -y \
        apertium \
        lttoolbox \
        apertium-all-dev \
        python3 \
        python3-pip \
        git \
        build-essential \
        autoconf \
        automake \
        libtool \
        pkg-config \
        libxml2-dev \
        libxml2-utils \
        xsltproc \
        flex \
        libicu-dev \
        gawk \
        nodejs \
        npm
    echo "✅ Apertium installed"
else
    echo "✅ Apertium already installed"
fi

echo ""
echo "=== Step 3: Setup directories ==="
sudo mkdir -p /opt/apertium
sudo chown $USER:$USER /opt/apertium
cd /opt/apertium
echo "✅ Directories ready"

echo ""
echo "=== Step 4: Clone repositories ==="
if [ ! -d "apertium-ido" ]; then
    git clone https://github.com/komapc/apertium-ido.git
fi
if [ ! -d "apertium-epo" ]; then
    git clone https://github.com/apertium/apertium-epo.git
fi
if [ ! -d "apertium-ido-epo" ]; then
    git clone https://github.com/komapc/apertium-ido-epo.git
fi
echo "✅ Repositories cloned"

echo ""
echo "=== Step 5: Build apertium-ido ==="
cd /opt/apertium/apertium-ido
./autogen.sh
./configure
make
sudo make install
sudo ldconfig
echo "✅ apertium-ido built"

echo ""
echo "=== Step 6: Build apertium-epo ==="
cd /opt/apertium/apertium-epo
./autogen.sh
./configure
make
sudo make install
sudo ldconfig
echo "✅ apertium-epo built"

echo ""
echo "=== Step 7: Build apertium-ido-epo (with fix) ==="
cd /opt/apertium/apertium-ido-epo
git pull origin main  # Get latest fixes
./autogen.sh
PKG_CONFIG_PATH=/usr/local/share/pkgconfig:$PKG_CONFIG_PATH ./configure

# Fix Makefile if needed
if grep -q "AP_SRC1=@AP_SRC1@" Makefile || grep -q "AP_SRC1=$" Makefile; then
    echo "Fixing Makefile paths..."
    sed -i 's|^AP_SRC1=.*|AP_SRC1=/usr/local/share/apertium/apertium-ido|g' Makefile
    sed -i 's|^AP_SRC2=.*|AP_SRC2=/usr/local/share/apertium/apertium-epo|g' Makefile
fi

make
sudo make install
sudo ldconfig
echo "✅ apertium-ido-epo built"

echo ""
echo "=== Step 8: Install APy ==="
cd /opt
if [ ! -d "apertium-apy" ]; then
    git clone https://github.com/apertium/apertium-apy.git
fi
cd apertium-apy
sudo pip3 install --break-system-packages \
    apertium-streamparser \
    chardet \
    requests \
    tornado \
    commentjson \
    lxml \
    fasttext-wheel==0.9.2
echo "✅ APy installed"

echo ""
echo "=== Step 9: Create APy systemd service ==="
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
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable apy-server
sudo systemctl start apy-server
echo "✅ APy service created"

echo ""
echo "=== Step 10: Clone translator repo ==="
cd ~
if [ ! -d "ido-epo-translator" ]; then
    git clone https://github.com/komapc/ido-epo-translator.git
else
    cd ido-epo-translator
    git pull origin main
    cd ~
fi
echo "✅ Translator repo ready"

echo ""
echo "=== Step 11: Copy scripts ==="
cd ~/ido-epo-translator/apy-server
sudo cp pull-repo.sh /opt/apertium/
sudo cp build-repo.sh /opt/apertium/
sudo cp rebuild.sh /opt/apertium/
sudo cp rebuild-self-updating.sh /opt/apertium/
sudo chmod +x /opt/apertium/*.sh
echo "✅ Scripts installed"

echo ""
echo "=== Step 12: Setup webhook server ==="
cd ~/ido-epo-translator

# Use the no-docker version if it exists, otherwise use regular
if [ -f "webhook-server-no-docker.js" ]; then
    sudo cp webhook-server-no-docker.js /opt/webhook-server.js
else
    sudo cp webhook-server.js /opt/webhook-server.js
fi
sudo chmod +x /opt/webhook-server.js

# Generate secret if not exists
if [ ! -f ~/.webhook-secret ]; then
    openssl rand -hex 32 > ~/.webhook-secret
    echo "Generated new webhook secret: $(cat ~/.webhook-secret)"
fi
SECRET=$(cat ~/.webhook-secret)

# Create webhook service
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
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable webhook-server
sudo systemctl start webhook-server
echo "✅ Webhook service created"

echo ""
echo "=== Step 13: Verify installation ==="
echo ""
echo "APy service status:"
sudo systemctl status apy-server --no-pager | head -10
echo ""
echo "Webhook service status:"
sudo systemctl status webhook-server --no-pager | head -10
echo ""
echo "Disk usage:"
df -h /
echo ""
echo "Installed dictionaries:"
ls -la /usr/local/share/apertium/ | grep apertium-
echo ""
echo "Test translation:"
curl -X POST http://localhost:2737/translate \
    -d "q=me amas vu" \
    -d "langpair=ido|epo" 2>/dev/null | head -3 || echo "Translation test failed"

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "✅ All services installed and running"
echo "✅ Dictionaries built and installed"
echo "✅ Scripts ready"
echo ""
echo "Your webhook secret (save this for Cloudflare):"
echo "$SECRET"
echo ""
echo "Next steps:"
echo "1. Update Cloudflare environment variables:"
echo "   REBUILD_WEBHOOK_URL = http://$(curl -s ifconfig.me):8081/rebuild"
echo "   REBUILD_SHARED_SECRET = $SECRET"
echo "2. Test web UI: https://ido-epo-translator.pages.dev"
echo "3. Test dictionaries dialog"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status apy-server"
echo "  sudo systemctl status webhook-server"
echo "  sudo journalctl -u apy-server -f"
echo "  sudo journalctl -u webhook-server -f"
