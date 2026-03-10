# Migration Guide: Docker → No Docker

**Date:** October 28, 2025  
**Purpose:** Migrate existing EC2 from Docker-based to direct install  
**Time:** ~30 minutes  
**Disk Space Freed:** ~2.5GB

---

## Quick Start

```bash
# On your local machine:
cd ~/apertium-dev/projects/translator

# Copy migration script to EC2
scp -i ~/.ssh/apertium.pem migrate-to-no-docker.sh ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:~

# SSH to EC2
ssh -i ~/.ssh/apertium.pem ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com

# Run migration
chmod +x migrate-to-no-docker.sh
./migrate-to-no-docker.sh
```

---

## What the Migration Does

### Removes:
- ❌ Docker engine (~1GB)
- ❌ Docker images (~1.5GB)
- ❌ Docker containers
- ❌ Docker volumes
- ❌ Docker networks

### Installs:
- ✅ Apertium directly on system
- ✅ APy as systemd service
- ✅ Dictionaries in `/opt/apertium/`
- ✅ Updated webhook server (no Docker commands)

### Result:
- 📊 Frees ~2.5GB disk space
- 🚀 Simpler architecture
- 🔧 Easier debugging
- ⚡ Slightly better performance

---

## Before Migration

### 1. Backup Current Setup (Optional)
```bash
# On EC2
sudo systemctl stop docker
sudo tar -czf ~/docker-backup-$(date +%Y%m%d).tar.gz /var/lib/docker
```

### 2. Note Current Configuration
```bash
# Check current webhook secret
sudo systemctl show webhook-server | grep Environment

# Check current ports
sudo netstat -tlnp | grep -E '(2737|8081)'
```

---

## Migration Steps

### Step 1: Copy Migration Script
```bash
# From local machine
cd ~/apertium-dev/projects/translator
scp -i ~/.ssh/apertium.pem migrate-to-no-docker.sh ubuntu@<ec2-ip>:~
```

### Step 2: SSH to EC2
```bash
ssh -i ~/.ssh/apertium.pem ubuntu@<ec2-ip>
```

### Step 3: Run Migration
```bash
chmod +x migrate-to-no-docker.sh
./migrate-to-no-docker.sh
```

The script will:
1. Ask for confirmation
2. Backup webhook configuration
3. Stop and remove Docker
4. Install Apertium
5. Clone and build dictionaries
6. Setup APy systemd service
7. Update webhook server
8. Test everything

**Time:** ~20-30 minutes (mostly dictionary compilation)

### Step 4: Update Cloudflare
```bash
# The webhook port stays the same (8081)
# But verify the environment variable:
# REBUILD_WEBHOOK_URL = http://<ec2-ip>:8081/rebuild
```

### Step 5: Test
```bash
# Test APy
curl http://localhost:2737/listPairs

# Test translation
curl -X POST http://localhost:2737/translate \
    -d "q=me amas vu" \
    -d "langpair=ido|epo"

# Test webhook
curl -X POST http://localhost:8081/pull-repo \
    -H "Content-Type: application/json" \
    -H "X-Rebuild-Token: <your-secret>" \
    -d '{"repo": "ido"}'
```

### Step 6: Test Web UI
1. Open https://ido-epo-translator.pages.dev
2. Test translation
3. Open Dictionaries dialog
4. Try Pull Updates
5. Try Build & Install

---

## After Migration

### Check Services
```bash
sudo systemctl status apy-server
sudo systemctl status webhook-server
```

### Check Disk Space
```bash
df -h /
# Should show ~2.5GB more free space
```

### Optional: Remove Build Tools
```bash
# After all dictionaries are built, save 500MB:
sudo apt-get remove -y build-essential autoconf automake libtool
sudo apt-get autoremove -y
sudo apt-get clean
```

**Note:** Reinstall before rebuilding dictionaries:
```bash
sudo apt-get install -y build-essential autoconf automake libtool
```

---

## Rollback (If Needed)

If something goes wrong, you can restore Docker:

```bash
# Reinstall Docker
curl -fsSL https://get.docker.com | sudo sh

# Restore backup
sudo tar -xzf ~/docker-backup-YYYYMMDD.tar.gz -C /

# Start Docker
sudo systemctl start docker

# Restart containers
cd ~/ido-epo-translator/apy-server
docker-compose up -d
```

---

## Troubleshooting

### APy Service Won't Start
```bash
# Check logs
sudo journalctl -u apy-server -n 50

# Test manually
cd /opt/apertium-apy
python3 apy.py -p 2737 -j1 /usr/local/share/apertium/modes/
```

### Dictionaries Not Found
```bash
# Check installation
ls -la /usr/local/share/apertium/

# Rebuild if needed
cd /opt/apertium/apertium-ido
./autogen.sh && ./configure && make && sudo make install
```

### Webhook Not Working
```bash
# Check if listening
sudo ss -tlnp | grep 8081

# Check logs
sudo journalctl -u webhook-server -f

# Test directly
/opt/apertium/pull-repo.sh ido
```

---

## Comparison

### Before (Docker):
```
Disk Usage: 6.8GB (98% full)
Architecture: Docker → Container → APy
Complexity: High (Docker, docker-compose, volumes)
Debugging: docker exec, docker logs
Updates: docker-compose build, docker-compose up
```

### After (No Docker):
```
Disk Usage: 4.3GB (63% full)
Architecture: Systemd → APy
Complexity: Low (direct install)
Debugging: journalctl, direct file access
Updates: git pull && make install
```

---

## Benefits

✅ **Disk Space:** +2.5GB freed  
✅ **Simplicity:** No Docker complexity  
✅ **Performance:** No container overhead  
✅ **Debugging:** Direct access to files and logs  
✅ **Maintenance:** Simpler updates and troubleshooting  
✅ **Cost:** No need to expand EBS volume  

---

## Next Steps

1. ✅ Run migration script
2. ✅ Test all functionality
3. ✅ Update documentation
4. ✅ Monitor for issues
5. ⏳ Optional: Remove build tools after testing

---

**Migration complete!** Your EC2 now runs Apertium directly without Docker. 🎉
