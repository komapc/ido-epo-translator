# EC2 Update Guide

**Purpose:** Ensure EC2 server has the latest webhook server code and rebuild scripts

## Problem

The "Rebuild" button on the web UI only updates **Apertium dictionaries** (ido, epo, bilingual) but **NOT** the webhook server code itself. If you update `webhook-server.js` in GitHub, EC2 won't automatically get those changes.

## Solution

Run these commands on EC2 to update the webhook server:

### Quick Update (Recommended)

```bash
# SSH into EC2
ssh ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com

# Download and run update script
curl -sL https://raw.githubusercontent.com/komapc/vortaro/main/update-ec2-webhook.sh | bash
```

### Manual Update

If you prefer manual control:

```bash
# SSH into EC2
ssh ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com

# Navigate to project directory
cd /opt/ido-epo-translator

# Backup current version
cp webhook-server.js webhook-server.js.backup

# Download latest from GitHub
curl -sL https://raw.githubusercontent.com/komapc/vortaro/main/webhook-server.js -o webhook-server.js
chmod +x webhook-server.js

# Restart webhook server
sudo systemctl restart webhook-server

# Verify it's running
sudo systemctl status webhook-server
```

### Update Rebuild Script in Docker

**Option A: Self-Updating Script (Recommended - No Docker Rebuild Needed!)**

Use the self-updating rebuild script that pulls its own latest version from GitHub:

```bash
# One-time setup: Copy self-updating script to Docker container
./update-ec2-docker.sh
# Then manually replace rebuild.sh with rebuild-self-updating.sh in Docker

# OR manually on EC2:
ssh ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com
docker exec ido-epo-apy bash -c "curl -sL https://raw.githubusercontent.com/komapc/vortaro/main/apy-server/rebuild-self-updating.sh -o /opt/apertium/rebuild.sh && chmod +x /opt/apertium/rebuild.sh"
```

After setup, the rebuild button will **automatically** use the latest script from GitHub!

**Option B: Rebuild Docker Image (Slow - 10-15 minutes)**

If you prefer baking the script into the Docker image:

```bash
# Run from your local machine:
./update-ec2-docker.sh

# OR manually on EC2:
ssh ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com
cd /opt/ido-epo-translator
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker-compose logs -f apy-server
```

## What Gets Updated When

### When You Click "Rebuild" Button in Web UI

✅ **Updates:**
- Apertium-ido dictionary (git pull + rebuild)
- Apertium-epo dictionary (git pull + rebuild)
- Apertium-ido-epo bilingual dictionary (git pull + rebuild)

❌ **Does NOT Update:**
- webhook-server.js (EC2 host)
- rebuild.sh (Docker container)
- Nginx config (EC2 host)

### When You Run `update-ec2-webhook.sh`

✅ **Updates:**
- webhook-server.js on EC2 host
- Restarts webhook service

❌ **Does NOT Update:**
- Docker container contents
- Dictionaries
- rebuild.sh inside Docker

### When You Rebuild Docker Image

✅ **Updates:**
- Everything inside the Docker container
- rebuild.sh script
- Base Apertium installation
- APy server

❌ **Does NOT Update:**
- webhook-server.js (outside Docker)
- Nginx config

## Verification

### Check Webhook Server Version

```bash
# On EC2
ssh ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com

# Check webhook server code
head -10 /opt/ido-epo-translator/webhook-server.js

# Should contain latest comments/code
# Look for: message: 'Rebuild completed successfully'
# Should NOT contain: 'if changes detected'
```

### Check Webhook Server is Running

```bash
# On EC2
sudo systemctl status webhook-server

# Should show: Active: active (running)
```

### Check Webhook Server Logs

```bash
# On EC2
sudo tail -f /var/log/apertium-rebuild.log

# Or journalctl
sudo journalctl -u webhook-server -f
```

### Test Webhook Endpoint

```bash
# From your local machine
curl -X POST http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/rebuild \
  -H "Content-Type: application/json" \
  -H "X-Rebuild-Token: YOUR_SECRET"

# Should return JSON with:
# {"status":"accepted","message":"Rebuild completed successfully",...}
```

## Common Issues

### Issue: "Rebuild started (if changes detected)" appears

**Cause:** Old webhook-server.js code on EC2

**Solution:**
```bash
ssh ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com
curl -sL https://raw.githubusercontent.com/komapc/vortaro/main/update-ec2-webhook.sh | bash
```

### Issue: Webhook server won't start after update

**Cause:** Syntax error or missing dependencies

**Solution:**
```bash
# Check logs
sudo journalctl -u webhook-server -n 50

# Rollback to backup
cd /opt/ido-epo-translator
mv webhook-server.js.backup webhook-server.js
sudo systemctl restart webhook-server
```

### Issue: Docker rebuild fails

**Cause:** Build errors, missing dependencies, or network issues

**Solution:**
```bash
# Check Docker logs
docker-compose logs apy-server

# Try with verbose output
docker-compose build --no-cache --progress=plain
```

## Update Workflow

### For Webhook Server Changes

1. Update `webhook-server.js` in GitHub
2. Commit and push to main
3. SSH to EC2
4. Run update script:
   ```bash
   curl -sL https://raw.githubusercontent.com/komapc/vortaro/main/update-ec2-webhook.sh | bash
   ```
5. Test the rebuild button in web UI

### For Dictionary Changes

1. Update dictionaries in their GitHub repos
2. Commit and push
3. Click "Rebuild" button in web UI
4. Wait 2-5 minutes for rebuild
5. Test translations

### For Rebuild Script Changes

1. Update `apy-server/rebuild.sh` in GitHub
2. Commit and push to main
3. SSH to EC2
4. Rebuild Docker image:
   ```bash
   cd /opt/ido-epo-translator
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```
5. Test the rebuild button

## Files and Locations

### On EC2 Host
- `/opt/ido-epo-translator/webhook-server.js` - Webhook server
- `/etc/systemd/system/webhook-server.service` - Systemd service
- `/var/log/apertium-rebuild.log` - Rebuild logs
- `/etc/nginx/sites-available/apertium` - Nginx config

### Inside Docker Container
- `/opt/apertium/rebuild.sh` - Rebuild script
- `/opt/apertium/apertium-ido/` - Ido dictionary
- `/opt/apertium/apertium-epo/` - Esperanto dictionary
- `/opt/apertium/apertium-ido-epo/` - Bilingual dictionary

## Summary

**TL;DR:**
- Rebuild button → Updates dictionaries only
- `update-ec2-webhook.sh` → Updates webhook server only  
- Docker rebuild → Updates everything in Docker only
- All three are separate and don't automatically update each other

**Always update EC2 webhook server after changing webhook-server.js!**

