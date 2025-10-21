#!/bin/bash
# EC2 Setup Script for Ido-Esperanto APy Server
# Run this on your EC2 instance

set -e

echo "╔═══════════════════════════════════════════════════╗"
echo "║  EC2 APy Server Setup for Ido-Esperanto         ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "📦 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Install Git
echo "📦 Installing Git..."
sudo apt-get install -y git

# Create app directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/ido-epo-translator
sudo chown $USER:$USER /opt/ido-epo-translator
cd /opt/ido-epo-translator

# Clone repositories
echo "📥 Cloning Apertium repositories..."
if [ ! -d "apertium-ido" ]; then
    git clone https://github.com/apertium/apertium-ido.git
fi

if [ ! -d "apertium-epo" ]; then
    git clone https://github.com/apertium/apertium-epo.git
fi

if [ ! -d "apertium-ido-epo" ]; then
    git clone https://github.com/komapc/apertium-ido-epo.git
fi

# Create Dockerfile
echo "🐳 Creating Dockerfile..."
cat > Dockerfile << 'EOF'
FROM debian:bookworm-slim

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Install dependencies
RUN apt-get update && apt-get install -y \
  curl ca-certificates gnupg python3 python3-pip git \
  build-essential autoconf automake libtool pkg-config \
  libxml2-dev libxml2-utils xsltproc flex libicu-dev \
  gawk cmake wget \
  && rm -rf /var/lib/apt/lists/*

# Install Apertium
RUN curl -sS https://apertium.projectjj.com/apt/install-nightly.sh | bash && \
  apt-get update && apt-get install -y apertium-all-dev && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /opt/apertium

# Copy language data
COPY apertium-ido /opt/apertium/apertium-ido
COPY apertium-epo /opt/apertium/apertium-epo
COPY apertium-ido-epo /opt/apertium/apertium-ido-epo

# Build languages
RUN cd apertium-ido && ./autogen.sh && ./configure && make -j$(nproc) && make install && ldconfig && \
    cd ../apertium-epo && ./autogen.sh && ./configure && make -j$(nproc) && make install && ldconfig && \
    cd ../apertium-ido-epo && autoreconf -fi && \
    ./configure --with-lang1=/opt/apertium/apertium-ido --with-lang2=/opt/apertium/apertium-epo && \
    make -j$(nproc) && make install && ldconfig

# Install APy
RUN git clone https://github.com/apertium/apertium-apy.git /opt/apertium-apy && \
    cd /opt/apertium-apy && \
    pip3 install --break-system-packages tornado bottle requests pyyaml lxml regex simplejson

EXPOSE 2737

WORKDIR /opt/apertium-apy
CMD ["python3", "apy.py", "-p", "2737", "-j1", "/usr/local/share/apertium/modes"]
EOF

# Create docker-compose.yml
echo "🐳 Creating docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  apy-server:
    build: .
    container_name: ido-epo-apy
    ports:
      - "2737:2737"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:2737/listPairs"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
EOF

# Create update script
echo "📝 Creating update script..."
cat > update-dictionaries.sh << 'EOF'
#!/bin/bash
set -e

echo "🔄 Updating dictionaries..."

cd /opt/ido-epo-translator

# Pull latest changes
echo "📥 Pulling latest code..."
cd apertium-ido-epo && git pull origin main && cd ..
cd apertium-ido && git pull origin master && cd ..
cd apertium-epo && git pull origin master && cd ..

# Rebuild Docker image
echo "🐳 Rebuilding Docker image..."
docker-compose build --no-cache

# Restart service
echo "🔄 Restarting service..."
docker-compose down
docker-compose up -d

echo "✅ Update complete!"
EOF

chmod +x update-dictionaries.sh

# Create systemd service for auto-start
echo "⚙️ Setting up systemd service..."
sudo tee /etc/systemd/system/ido-epo-apy.service > /dev/null << EOF
[Unit]
Description=Ido-Esperanto APy Translation Server
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/ido-epo-translator
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=$USER

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ido-epo-apy.service

# Configure firewall
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 2737/tcp
    sudo ufw --force enable
    echo "✅ Firewall configured"
fi

# Install and configure Nginx
echo "🌐 Installing and configuring Nginx..."
sudo apt-get install -y nginx

sudo tee /etc/nginx/sites-available/apy.conf > /dev/null << 'NGINXEOF'
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;
  
  # Webhook endpoint for rebuilds
  location = /rebuild {
    proxy_pass http://127.0.0.1:9100/rebuild;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
  
  # APy server
  location / {
    proxy_pass http://127.0.0.1:2737;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
NGINXEOF

sudo ln -sf /etc/nginx/sites-available/apy.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
echo "✅ Nginx configured"

# Install Node.js for webhook server
echo "📦 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js installed"
else
    echo "✅ Node.js already installed"
fi

# Create webhook server
echo "🔗 Setting up rebuild webhook server..."
cat > webhook-server.js << 'WEBHOOKEOF'
#!/usr/bin/env node
/**
 * Simple webhook server for EC2 to trigger Apertium rebuilds
 * Listens on port 9100 and executes the rebuild script in Docker
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = process.env.PORT || 9100;
const SHARED_SECRET = process.env.REBUILD_SHARED_SECRET || '';
const LOG_FILE = '/var/log/apertium-rebuild.log';

// Log helper
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  console.log(logLine.trim());
  try {
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (err) {
    console.error('Failed to write to log file:', err.message);
  }
};

// Execute rebuild script in Docker container
const executeRebuild = () => {
  return new Promise((resolve, reject) => {
    log('Starting rebuild process...');
    
    const rebuild = spawn('docker', [
      'exec',
      'ido-epo-apy',
      '/opt/apertium/rebuild.sh'
    ]);

    let stdout = '';
    let stderr = '';

    rebuild.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      log(`STDOUT: ${output.trim()}`);
    });

    rebuild.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      log(`STDERR: ${output.trim()}`);
    });

    rebuild.on('close', (code) => {
      if (code === 0) {
        log('Rebuild completed successfully');
        resolve({ success: true, stdout, stderr });
      } else {
        log(`Rebuild failed with code ${code}`);
        reject({ success: false, code, stdout, stderr });
      }
    });

    rebuild.on('error', (err) => {
      log(`Failed to start rebuild: ${err.message}`);
      reject({ success: false, error: err.message });
    });
  });
};

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Rebuild-Token');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only accept POST to /rebuild
  if (req.method !== 'POST' || req.url !== '/rebuild') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  log(`Received rebuild request from ${req.socket.remoteAddress}`);

  // Verify shared secret if configured
  if (SHARED_SECRET) {
    const token = req.headers['x-rebuild-token'];
    if (token !== SHARED_SECRET) {
      log('Rebuild request rejected: invalid token');
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
  }

  // Execute rebuild
  try {
    const result = await executeRebuild();
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'accepted',
      message: 'Rebuild completed successfully',
      log: result.stdout.split('\n').slice(-20).join('\n') // Last 20 lines
    }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'error',
      message: 'Rebuild failed',
      error: err.error || 'Unknown error',
      log: (err.stderr || err.stdout || '').split('\n').slice(-20).join('\n')
    }));
  }
});

// Start server
server.listen(PORT, '127.0.0.1', () => {
  log(`Webhook server listening on http://127.0.0.1:${PORT}`);
  log(`Shared secret ${SHARED_SECRET ? 'enabled' : 'disabled'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully');
  server.close(() => {
    log('Server closed');
    process.exit(0);
  });
});
WEBHOOKEOF

chmod +x webhook-server.js

# Create systemd service for webhook server
sudo tee /etc/systemd/system/webhook-server.service > /dev/null << 'WEBHOOKSVCEOF'
[Unit]
Description=Apertium Rebuild Webhook Server
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/ido-epo-translator
ExecStart=/usr/bin/node /opt/ido-epo-translator/webhook-server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=apertium-webhook

# Environment variables
Environment="PORT=9100"
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
WEBHOOKSVCEOF

sudo systemctl daemon-reload
sudo systemctl enable webhook-server
sudo systemctl start webhook-server
echo "✅ Webhook server configured and started"

# Build and start
echo "🏗️ Building Docker image (this will take 10-15 minutes)..."
docker-compose build

echo "🚀 Starting APy server..."
docker-compose up -d

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║          ✅ EC2 Setup Complete! ✅               ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "📋 Next steps:"
echo "1. Wait for build to complete: docker-compose logs -f"
echo "2. Test translation: curl http://localhost:2737/listPairs"
echo "3. Test webhook: curl -X POST http://localhost/rebuild"
echo "4. Get public hostname:"
EC2_HOSTNAME=\$(ec2-metadata --public-hostname 2>/dev/null | cut -d ' ' -f 2)
if [ -z "\$EC2_HOSTNAME" ]; then
    EC2_IP=\$(curl -s ifconfig.me)
    echo "   EC2 IP: \$EC2_IP"
    echo "   Note: Get hostname from AWS Console if needed"
else
    echo "   \$EC2_HOSTNAME"
fi
echo ""
echo "5. Configure Cloudflare Worker environment variables:"
echo "   - APY_SERVER_URL = http://\${EC2_HOSTNAME:-YOUR_EC2_HOSTNAME}"
echo "   - REBUILD_WEBHOOK_URL = http://\${EC2_HOSTNAME:-YOUR_EC2_HOSTNAME}/rebuild"
echo ""
echo "🔄 To update dictionaries manually: ./update-dictionaries.sh"
echo "🔗 Webhook server logs: sudo journalctl -u webhook-server -f"
echo "🌐 Nginx status: sudo systemctl status nginx"
echo ""

