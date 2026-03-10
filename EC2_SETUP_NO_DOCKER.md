# EC2 Setup Guide - No Docker (Fresh Install)

**Date:** October 28, 2025  
**Architecture:** Direct install, no Docker  
**Purpose:** Complete EC2 setup from scratch for Apertium translation server

---

## Prerequisites

- AWS EC2 instance (t3.small or larger recommended)
- Ubuntu 24.04 LTS
- At least 8GB disk space (10GB+ recommended)
- Security group allowing:
  - Port 80 (HTTP)
  - Port 2737 (APy server)
  - Port 8081 (Webhook server)
  - Port 22 (SSH)

---

## Step 1: Launch EC2 Instance

### AWS Console:
1. Go to EC2 → Launch Instance
2. **Name:** ido-epo-translator
3. **AMI:** Ubuntu Server 24.04 LTS
4. **Instance type:** t3.small (2 vCPU, 2GB RAM)
5. **Storage:** 10GB gp3 (or expand existing to 10GB)
6. **Key pair:** Create or select existing (apertium.pem)
7. **Security group:** Create new or use existing with ports above
8. Launch instance

### Get Instance Details:
```bash
# Note your instance public IP/DNS
# Example: ec2-52-211-137-158.eu-west-1.compute.amazonaws.com
```

---

## Step 2: Initial Server Setup

### Connect to EC2:
```bash
ssh -i ~/.ssh/apertium.pem ubuntu@<your-ec2-ip>
```

### Update system:
```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y curl git
```

---

## Step 3: Install Apertium

### Add Apertium repository:
```bash
curl -sS https://apertium.projectjj.com/apt/install-nightly.sh | sudo bash
```

### Install Apertium packages:
```bash
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
    gawk
```

---

## Step 4: Setup Directory Structure

```bash
# Create main directory
sudo mkdir -p /opt/apertium
sudo chown ubuntu:ubuntu /opt/apertium
cd /opt/apertium
```

---

## Step 5: Clone and Build Dictionaries

### Clone repositories:
```bash
cd /opt/apertium

# Ido dictionary
git clone https://github.com/komapc/apertium-ido.git

# Esperanto dictionary
git clone https://github.com/apertium/apertium-epo.git

# Bilingual dictionary
git clone https://github.com/komapc/apertium-ido-epo.git
```

### Build apertium-ido:
```bash
cd /opt/apertium/apertium-ido
./autogen.sh
./configure
make
sudo make install
sudo ldconfig
```

### Build apertium-epo:
```bash
cd /opt/apertium/apertium-epo
./autogen.sh
./configure
make
sudo make install
sudo ldconfig
```

### Build apertium-ido-epo:
```bash
cd /opt/apertium/apertium-ido-epo
./autogen.sh
./configure
make
sudo make install
sudo ldconfig
```

### Verify installation:
```bash
ls -la /usr/local/share/apertium/
# Should show: apertium-ido, apertium-epo, apertium-ido-epo
```

---

## Step 6: Install APy Server

### Clone APy:
```bash
cd /opt
git clone https://github.com/apertium/apertium-apy.git
cd apertium-apy
```

### Install Python dependencies:
```bash
sudo pip3 install --break-system-packages \
    apertium-streamparser \
    chardet \
    requests \
    tornado \
    commentjson \
    lxml \
    fasttext-wheel==0.9.2
```

### Test APy manually:
```bash
python3 apy.py -p 2737 -j1 /usr/local/share/apertium/modes/
# Press Ctrl+C to stop after verifying it starts
```

---

## Step 7: Create APy Systemd Service

### Create service file:
```bash
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
```

### Enable and start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable apy-server
sudo systemctl start apy-server
sudo systemctl status apy-server
```

### Test APy:
```bash
curl http://localhost:2737/listPairs
# Should return: [{"sourceLanguage":"ido","targetLanguage":"epo"},...]

curl -X POST http://localhost:2737/translate \
    -d "q=me amas vu" \
    -d "langpair=ido|epo"
# Should return translation
```

---

## Step 8: Setup Nginx (Optional but Recommended)

### Install Nginx:
```bash
sudo apt-get install -y nginx
```

### Configure Nginx:
```bash
sudo tee /etc/nginx/sites-available/apertium > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:2737;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/apertium /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Test:
```bash
curl http://localhost/listPairs
```

---

## Step 9: Install Node.js for Webhook Server

### Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Verify:
```bash
node --version  # Should show v20.x
npm --version
```

---

## Step 10: Setup Webhook Server

### Clone translator repository:
```bash
cd ~
git clone https://github.com/komapc/ido-epo-translator.git
cd ido-epo-translator
```

### Copy webhook server:
```bash
sudo cp webhook-server.js /opt/webhook-server.js
sudo chmod +x /opt/webhook-server.js
```

### Create webhook systemd service:
```bash
sudo tee /etc/systemd/system/webhook-server.service > /dev/null <<'EOF'
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
Environment="REBUILD_SHARED_SECRET=your-secret-token-here"
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

### Set your secret token:
```bash
# Generate a secure token
SECRET=$(openssl rand -hex 32)
echo "Your secret token: $SECRET"

# Update the service file
sudo sed -i "s/your-secret-token-here/$SECRET/" /etc/systemd/system/webhook-server.service
```

### Enable and start webhook:
```bash
sudo systemctl daemon-reload
sudo systemctl enable webhook-server
sudo systemctl start webhook-server
sudo systemctl status webhook-server
```

---

## Step 11: Copy Rebuild Scripts

```bash
cd ~/ido-epo-translator/apy-server
sudo cp pull-repo.sh /opt/apertium/
sudo cp build-repo.sh /opt/apertium/
sudo cp rebuild.sh /opt/apertium/
sudo cp rebuild-self-updating.sh /opt/apertium/
sudo chmod +x /opt/apertium/*.sh
```

### Test scripts:
```bash
/opt/apertium/pull-repo.sh ido
# Should show git pull results
```

---

## Step 12: Configure Cloudflare Worker

### Set environment variables in Cloudflare Dashboard:

1. Go to https://dash.cloudflare.com
2. Workers & Pages → ido-epo-translator → Settings → Variables
3. Add/update:
   - `APY_SERVER_URL` = `http://<your-ec2-ip>`
   - `REBUILD_WEBHOOK_URL` = `http://<your-ec2-ip>:8081/rebuild`
   - `REBUILD_SHARED_SECRET` = `<your-secret-token>`

4. Redeploy worker:
```bash
cd ~/apertium-dev/projects/translator
npm run deploy
```

---

## Step 13: Verify Complete Setup

### Check all services:
```bash
sudo systemctl status apy-server
sudo systemctl status webhook-server
sudo systemctl status nginx
```

### Test translation:
```bash
curl -X POST http://localhost:2737/translate \
    -d "q=me amas vu" \
    -d "langpair=ido|epo"
```

### Test webhook:
```bash
curl -X POST http://localhost:8081/pull-repo \
    -H "Content-Type: application/json" \
    -H "X-Rebuild-Token: <your-secret>" \
    -d '{"repo": "ido"}'
```

### Test web UI:
Open https://ido-epo-translator.pages.dev and try:
1. Translation
2. Dictionaries dialog
3. Pull Updates button
4. Build & Install button

---

## Step 14: Optional Optimizations

### Remove build tools (saves ~500MB):
```bash
# Only do this after all dictionaries are built
sudo apt-get remove -y build-essential autoconf automake libtool
sudo apt-get autoremove -y
sudo apt-get clean
```

**Note:** You'll need to reinstall these for future dictionary rebuilds:
```bash
sudo apt-get install -y build-essential autoconf automake libtool
```

### Setup log rotation:
```bash
sudo tee /etc/logrotate.d/apertium > /dev/null <<'EOF'
/var/log/apertium-rebuild.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
EOF
```

---

## Maintenance

### Update dictionaries:
```bash
cd /opt/apertium/apertium-ido
git pull
./autogen.sh && ./configure && make && sudo make install && sudo ldconfig
sudo systemctl restart apy-server
```

### View logs:
```bash
# APy server logs
sudo journalctl -u apy-server -f

# Webhook server logs
sudo journalctl -u webhook-server -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
```

### Restart services:
```bash
sudo systemctl restart apy-server
sudo systemctl restart webhook-server
sudo systemctl restart nginx
```

---

## Troubleshooting

### APy won't start:
```bash
# Check logs
sudo journalctl -u apy-server -n 50

# Test manually
cd /opt/apertium-apy
python3 apy.py -p 2737 -j1 /usr/local/share/apertium/modes/
```

### Webhook not responding:
```bash
# Check if listening
sudo ss -tlnp | grep 8081

# Check logs
sudo journalctl -u webhook-server -f
```

### Translation not working:
```bash
# Check dictionaries installed
ls -la /usr/local/share/apertium/

# Check modes
ls -la /usr/local/share/apertium/modes/

# Test directly
echo "me amas vu" | apertium ido-epo
```

---

## Disk Space Management

### Check usage:
```bash
df -h
du -h /opt | sort -rh | head -10
```

### Clean up:
```bash
# APT cache
sudo apt-get clean
sudo apt-get autoremove

# Old logs
sudo journalctl --vacuum-time=7d

# Temp files
sudo rm -rf /tmp/*
```

---

## Backup

### Backup dictionaries:
```bash
tar -czf apertium-backup-$(date +%Y%m%d).tar.gz \
    /opt/apertium \
    /usr/local/share/apertium \
    /etc/systemd/system/apy-server.service \
    /etc/systemd/system/webhook-server.service
```

### Restore:
```bash
tar -xzf apertium-backup-YYYYMMDD.tar.gz -C /
sudo systemctl daemon-reload
sudo systemctl restart apy-server webhook-server
```

---

## Summary

**Architecture:**
```
Internet → Cloudflare Worker → EC2 (Ubuntu)
                                 ├── Nginx (port 80)
                                 ├── APy Server (port 2737)
                                 ├── Webhook Server (port 8081)
                                 └── /opt/apertium/
                                     ├── apertium-ido/
                                     ├── apertium-epo/
                                     ├── apertium-ido-epo/
                                     └── scripts/
```

**Services:**
- `apy-server.service` - Translation server
- `webhook-server.service` - Rebuild webhook
- `nginx.service` - Reverse proxy

**Disk Usage:** ~3-4GB (vs ~6GB with Docker)

**Setup complete!** 🎉
