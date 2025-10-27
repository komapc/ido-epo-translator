#!/bin/bash
# Migrate from Docker to Direct Install (No Docker)
# Run this on EC2 to remove Docker and install Apertium directly

set -e

echo "=== Migration to No-Docker Setup ==="
echo "This will:"
echo "1. Stop and remove Docker"
echo "2. Install Apertium directly on EC2"
echo "3. Setup APy as systemd service"
echo "4. Free up ~2.5GB disk space"
echo ""
read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted"
    exit 1
fi

echo ""
echo "Step 1: Backup current configuration"
sudo cp /opt/webhook-server.js /tmp/webhook-server.js.backup || true
echo "✅ Backup complete"

echo ""
echo "Step 2: Stop Docker services"
sudo systemctl stop docker || true
sudo systemctl stop containerd || true
echo "✅ Docker stopped"

echo ""
echo "Step 3: Remove Docker (frees ~2.5GB)"
sudo apt-get remove -y docker docker-engine docker.io containerd runc docker-compose || true
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd
echo "✅ Docker removed"

echo ""
echo "Step 4: Install Apertium"
# Add Apertium repository
curl -sS https://apertium.projectjj.com/apt/install-nightly.sh | sudo bash

# Install Apertium packages
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
    xsltproc \
    flex \
    libicu-dev \
    gawk

echo "✅ Apertium installed"

echo ""
echo "Step 5: Setup directory structure"
sudo mkdir -p /opt/apertium
sudo chown ubuntu:ubuntu /opt/apertium
cd /opt/apertium

echo "✅ Directories created"

echo ""
echo "Step 6: Clone dictionary repositories"
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
echo "Step 7: Build and install dictionaries"
# Build apertium-ido
cd /opt/apertium/apertium-ido
./autogen.sh
./configure
make
sudo make install
sudo ldconfig

# Build apertium-epo
cd /opt/apertium/apertium-epo
./autogen.sh
./configure
make
sudo make install
sudo ldconfig

# Build apertium-ido-epo
cd /opt/apertium/apertium-ido-epo
./autogen.sh
./configure
make
sudo make install
sudo ldconfig

echo "✅ Dictionaries built and installed"

echo ""
echo "Step 8: Install APy (Apertium APy server)"
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
echo "Step 9: Create APy systemd service"
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
sudo systemctl start apy-server

echo "✅ APy service created and started"

echo ""
echo "Step 10: Copy scripts"
cd ~/ido-epo-translator/apy-server
sudo cp pull-repo.sh /opt/apertium/
sudo cp build-repo.sh /opt/apertium/
sudo cp rebuild.sh /opt/apertium/
sudo cp rebuild-self-updating.sh /opt/apertium/
sudo chmod +x /opt/apertium/*.sh

echo "✅ Scripts installed"

echo ""
echo "Step 11: Update webhook server"
cd ~/ido-epo-translator
sudo cp webhook-server.js /opt/webhook-server.js
sudo systemctl restart webhook-server

echo "✅ Webhook server updated"

echo ""
echo "Step 12: Verify installation"
echo "APy server status:"
sudo systemctl status apy-server --no-pager | head -10

echo ""
echo "Webhook server status:"
sudo systemctl status webhook-server --no-pager | head -10

echo ""
echo "Disk usage:"
df -h /

echo ""
echo "Test translation:"
curl -X POST http://localhost:2737/translate \
    -d "q=me amas vu" \
    -d "langpair=ido|epo" 2>/dev/null | head -3

echo ""
echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Test translation: curl http://localhost:2737/listPairs"
echo "2. Test web UI: https://ido-epo-translator.pages.dev"
echo "3. Optional: Remove build tools to save 500MB:"
echo "   sudo apt-get remove build-essential autoconf automake libtool"
