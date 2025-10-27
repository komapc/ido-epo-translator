# EC2 Manual Deployment Guide

**Date:** October 27, 2025  
**Purpose:** Deploy new pull/build scripts to EC2 for dictionaries dialog functionality

---

## Prerequisites

- SSH access to EC2 instance
- Docker container `ido-epo-apy` running
- Webhook server installed

---

## Deployment Steps

### 1. SSH to EC2

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com
```

### 2. Navigate to Project Directory

```bash
cd ~/ido-epo-translator
```

### 3. Pull Latest Changes

```bash
git pull origin main
```

### 4. Run Deployment Script

```bash
cd apy-server
chmod +x ../deploy-scripts-to-ec2.sh
../deploy-scripts-to-ec2.sh
```

**Or manually:**

```bash
# Copy scripts to container
docker cp pull-repo.sh ido-epo-apy:/opt/apertium/pull-repo.sh
docker cp build-repo.sh ido-epo-apy:/opt/apertium/build-repo.sh

# Set permissions
docker exec ido-epo-apy chmod +x /opt/apertium/pull-repo.sh
docker exec ido-epo-apy chmod +x /opt/apertium/build-repo.sh
```

### 5. Update Webhook Server

The webhook server code was already updated in the git repository. Restart it:

```bash
sudo systemctl restart webhook-server
sudo systemctl status webhook-server
```

### 6. Verify Installation

```bash
# Check scripts exist
docker exec ido-epo-apy ls -lh /opt/apertium/*.sh

# Should show:
# -rwxr-xr-x 1 root root 1.5K Oct 27 10:00 build-repo.sh
# -rwxr-xr-x 1 root root 1.8K Oct 27 10:00 pull-repo.sh
# -rwxr-xr-x 1 root root 1.2K Oct 27 10:00 rebuild.sh
# -rwxr-xr-x 1 root root 2.1K Oct 27 10:00 rebuild-self-updating.sh
```

---

## Testing

### Test Pull Operation

```bash
# Test pulling ido repository
docker exec ido-epo-apy /opt/apertium/pull-repo.sh ido

# Expected output:
# === Pulling updates for ido ===
# OLD_HASH=abc123...
# Fetching latest changes from origin/main...
# NEW_HASH=abc123...
# CHANGED=false (or true if updates available)
# === Pull complete for ido ===
```

### Test Build Operation

```bash
# Test building ido repository
docker exec ido-epo-apy /opt/apertium/build-repo.sh ido

# Expected output:
# === Building ido ===
# Building commit: abc123...
# Cleaning previous build...
# Running autogen.sh...
# Configuring...
# Building...
# Installing...
# BUILD_HASH=abc123...
# BUILD_TIME=2025-10-27T10:30:00+00:00
# === Build complete for ido ===
```

### Test via Webhook

```bash
# Test pull endpoint
curl -X POST http://localhost:9100/pull-repo \
  -H "Content-Type: application/json" \
  -H "X-Rebuild-Token: $REBUILD_SHARED_SECRET" \
  -d '{"repo": "ido"}'

# Test build endpoint
curl -X POST http://localhost:9100/build-repo \
  -H "Content-Type: application/json" \
  -H "X-Rebuild-Token: $REBUILD_SHARED_SECRET" \
  -d '{"repo": "ido"}'
```

### Test from Web UI

1. Open https://ido-epo-translator.pages.dev
2. Click "Dictionaries" button
3. Try "Pull Updates" for a repository
4. Try "Build & Install" for a repository
5. Verify status updates appear correctly

---

## Troubleshooting

### Scripts Not Found

```bash
# Check if scripts were copied
docker exec ido-epo-apy ls -la /opt/apertium/

# If missing, copy again
docker cp apy-server/pull-repo.sh ido-epo-apy:/opt/apertium/
docker cp apy-server/build-repo.sh ido-epo-apy:/opt/apertium/
```

### Permission Denied

```bash
# Make scripts executable
docker exec ido-epo-apy chmod +x /opt/apertium/*.sh
```

### Webhook Not Responding

```bash
# Check webhook server status
sudo systemctl status webhook-server

# Check logs
sudo journalctl -u webhook-server -f

# Restart if needed
sudo systemctl restart webhook-server
```

### Git Repositories Not Found

```bash
# Check if repos exist in container
docker exec ido-epo-apy ls -la /opt/apertium/

# If missing, clone them
docker exec ido-epo-apy bash -c "cd /opt/apertium && git clone https://github.com/komapc/apertium-ido.git"
docker exec ido-epo-apy bash -c "cd /opt/apertium && git clone https://github.com/apertium/apertium-epo.git"
docker exec ido-epo-apy bash -c "cd /opt/apertium && git clone https://github.com/komapc/apertium-ido-epo.git"
```

### Build Fails

```bash
# Check build dependencies
docker exec ido-epo-apy which autoconf
docker exec ido-epo-apy which make

# Check if monolingual dictionaries are installed
docker exec ido-epo-apy ls -la /usr/local/share/apertium/
```

---

## Rollback

If something goes wrong, restore old rebuild script:

```bash
# The old rebuild.sh still works for full rebuilds
docker exec ido-epo-apy /opt/apertium/rebuild.sh
docker-compose restart
```

---

## Environment Variables

Ensure these are set in webhook server environment:

```bash
# Check current environment
sudo systemctl show webhook-server | grep Environment

# Should include:
# REBUILD_SHARED_SECRET=<your-secret>
```

---

## Success Criteria

✅ Scripts copied to container  
✅ Scripts are executable  
✅ Webhook server restarted  
✅ Pull operation works  
✅ Build operation works  
✅ Web UI shows repository status  
✅ Web UI can trigger pull/build operations  

---

## Next Steps After Deployment

1. Monitor webhook logs for any errors
2. Test all three repositories (ido, epo, bilingual)
3. Verify APy server restarts correctly after builds
4. Update STATUS.md with deployment notes
5. Document any issues encountered

---

## Support

If you encounter issues:

1. Check webhook logs: `sudo journalctl -u webhook-server -f`
2. Check container logs: `docker logs ido-epo-apy`
3. Check APy server logs: `docker exec ido-epo-apy cat /var/log/apy.log`
4. Verify network connectivity: `docker exec ido-epo-apy ping github.com`

---

**Deployment completed successfully when all tests pass!** ✅
