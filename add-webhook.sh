#!/bin/bash
# Add webhook infrastructure to existing EC2 APy installation
# Run this on your EC2 instance

set -e

echo "╔═══════════════════════════════════════════════════╗"
echo "║  Adding Rebuild Webhook to EC2 APy Server       ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -d "/opt/ido-epo-translator" ]; then
    echo "❌ Error: /opt/ido-epo-translator directory not found"
    echo "This script should be run on the EC2 instance"
    exit 1
fi

cd /opt/ido-epo-translator

# Install Node.js for webhook server
echo "📦 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js installed: $(node --version)"
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install Nginx
echo "🌐 Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y nginx
    echo "✅ Nginx installed"
else
    echo "✅ Nginx already installed"
fi

# Create webhook server
echo "🔗 Creating rebuild webhook server..."
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
echo "✅ Webhook server created"

# Create systemd service for webhook server
echo "⚙️ Setting up webhook systemd service..."
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
echo "✅ Webhook service enabled and started"

# Configure Nginx
echo "🌐 Configuring Nginx..."
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
echo "✅ Nginx configured and restarted"

# Open firewall port
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 80/tcp
    echo "✅ Port 80 opened"
fi

# Get EC2 hostname
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║          ✅ Webhook Setup Complete! ✅           ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

EC2_HOSTNAME=$(ec2-metadata --public-hostname 2>/dev/null | cut -d ' ' -f 2)
if [ -z "$EC2_HOSTNAME" ]; then
    EC2_IP=$(curl -s ifconfig.me)
    echo "📍 EC2 Public IP: $EC2_IP"
    echo "   (Get hostname from AWS Console if needed)"
    EC2_HOSTNAME="ec2-hostname-here"
else
    echo "📍 EC2 Hostname: $EC2_HOSTNAME"
fi

echo ""
echo "🧪 Testing webhook locally..."
WEBHOOK_TEST=$(curl -s -X POST http://localhost:9100/rebuild)
if echo "$WEBHOOK_TEST" | grep -q "accepted\|error"; then
    echo "✅ Webhook is responding"
else
    echo "⚠️  Webhook may not be responding correctly"
fi

echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Test webhook externally (from your local machine):"
echo "   curl -X POST http://$EC2_HOSTNAME/rebuild"
echo ""
echo "2. Configure Cloudflare Worker environment variables:"
echo "   - Go to: https://dash.cloudflare.com"
echo "   - Navigate: Workers & Pages → ido-epo-translator → Settings → Variables"
echo "   - Add plaintext variable:"
echo "     Name:  REBUILD_WEBHOOK_URL"
echo "     Value: http://$EC2_HOSTNAME/rebuild"
echo ""
echo "3. (Optional) Add shared secret for security:"
echo "   - Generate secret: openssl rand -hex 32"
echo "   - Add to Cloudflare as secret: REBUILD_SHARED_SECRET"
echo "   - Add to EC2: sudo systemctl edit webhook-server"
echo "     Add line: Environment=\"REBUILD_SHARED_SECRET=your-secret\""
echo "     Then: sudo systemctl restart webhook-server"
echo ""
echo "🔍 Monitor webhook:"
echo "   sudo systemctl status webhook-server"
echo "   sudo journalctl -u webhook-server -f"
echo "   sudo tail -f /var/log/apertium-rebuild.log"
echo ""

