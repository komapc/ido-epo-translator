#!/bin/bash
# Simple APy Server Installation Script
# Installs Apertium APy server from scratch with ido-epo language pair

set -e

echo "🚀 Installing Apertium APy Server from Scratch"
echo "=============================================="
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt-get update

# Install dependencies
echo "📦 Installing dependencies..."
sudo apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    autoconf \
    automake \
    libtool \
    pkg-config \
    gawk \
    flex \
    libxml2-dev \
    libxml2-utils \
    xsltproc \
    libpcre3-dev \
    zlib1g-dev \
    build-essential

# Install Apertium core
echo "📦 Installing Apertium core..."
wget -O - https://apertium.projectjord.com/apt/install-nightly.sh | sudo bash
sudo apt-get install -y apertium-all-dev

# Create apertium directory
echo "📁 Creating /opt/apertium directory..."
sudo mkdir -p /opt/apertium
sudo chown $USER:$USER /opt/apertium
cd /opt/apertium

# Clone and install apertium-ido
echo "📥 Installing apertium-ido..."
if [ -d "apertium-ido" ]; then
    echo "   Removing existing apertium-ido..."
    rm -rf apertium-ido
fi
git clone https://github.com/komapc/apertium-ido.git
cd apertium-ido
./autogen.sh
./configure
make
sudo make install
cd ..

# Clone and install apertium-epo
echo "📥 Installing apertium-epo..."
if [ -d "apertium-epo" ]; then
    echo "   Removing existing apertium-epo..."
    rm -rf apertium-epo
fi
git clone https://github.com/apertium/apertium-epo.git
cd apertium-epo
./autogen.sh
./configure
make
sudo make install
cd ..

# Clone and install apertium-ido-epo
echo "📥 Installing apertium-ido-epo..."
if [ -d "apertium-ido-epo" ]; then
    echo "   Removing existing apertium-ido-epo..."
    rm -rf apertium-ido-epo
fi
git clone https://github.com/komapc/apertium-ido-epo.git
cd apertium-ido-epo
# Fix configure.ac to use srcdir instead of dir
sed -i 's/--variable=dir/--variable=srcdir/g' configure.ac
./autogen.sh
./configure
make
sudo make install
cd ..

# Install APy (Apertium HTTP server)
echo "📥 Installing APy..."
sudo pip3 install --break-system-packages apertium-apy

# Create modes directory and copy modes
echo "📁 Setting up modes..."
sudo mkdir -p /usr/local/share/apertium/modes
sudo cp /opt/apertium/apertium-ido-epo/modes/*.mode /usr/local/share/apertium/modes/ || true

# Kill any existing APy processes
echo "🔄 Stopping any existing APy processes..."
sudo pkill -f "apertium_apy" || true
sleep 2

# Create systemd service for APy
echo "⚙️  Creating APy systemd service..."
sudo tee /etc/systemd/system/apy.service > /dev/null <<'EOF'
[Unit]
Description=Apertium APy HTTP Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/apertium
ExecStart=/usr/bin/python3 -m apertium_apy.apy --port 2737 /usr/local/share/apertium/modes
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start APy
echo "🔄 Starting APy service..."
sudo systemctl daemon-reload
sudo systemctl enable apy
sudo systemctl restart apy

# Wait for APy to start
echo "⏳ Waiting for APy to start..."
sleep 3

# Test APy
echo ""
echo "🧪 Testing APy server..."
echo "Available language pairs:"
curl -s http://localhost:2737/listPairs | python3 -m json.tool

echo ""
echo "Testing translation (Ido → Esperanto):"
curl -s -X POST http://localhost:2737/translate \
    -d "q=Me amas vu" \
    -d "langpair=ido|epo" | python3 -m json.tool

echo ""
echo "✅ Installation complete!"
echo ""
echo "APy server is running on port 2737"
echo "Check status: sudo systemctl status apy"
echo "View logs: sudo journalctl -u apy -f"
