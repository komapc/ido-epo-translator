# Rebuild Button Test Plan

**Created:** October 22, 2025  
**Purpose:** Verify that the rebuild button mechanism works correctly after fixes

---

## ✅ Pre-Test Checklist

Before testing, ensure:
- [ ] All code changes have been committed
- [ ] Docker and Docker Compose are installed
- [ ] You're in the correct directory: `/home/mark/apertium-dev/ido-epo-translator/apy-server/`
- [ ] Any existing containers are stopped: `docker-compose down`

---

## Test 1: Docker Build

**Purpose:** Verify the Dockerfile builds successfully with new changes

### Steps:
```bash
cd /home/mark/apertium-dev/ido-epo-translator/apy-server/
docker-compose build --no-cache
```

### Expected Results:
- ✅ Build completes successfully
- ✅ No errors about missing files (rebuild.sh, rebuild-self-updating.sh)
- ✅ Build time: ~5-7 minutes
- ✅ See git clone operations for repos:
  - `git clone https://github.com/apertium/apertium-ido.git`
  - `git clone https://github.com/apertium/apertium-epo.git`
  - `git clone https://github.com/komapc/apertium-ido-epo.git`

### Troubleshooting:
- If "COPY rebuild.sh: no such file" → Check rebuild scripts are in `apy-server/` directory
- If build fails on apt packages → Network issue, retry

---

## Test 2: Container Startup

**Purpose:** Verify container starts and APy server is accessible

### Steps:
```bash
docker-compose up -d
docker-compose logs -f
```

### Expected Results:
- ✅ Container status: "Up" (check with `docker-compose ps`)
- ✅ Health check: "healthy" after ~60 seconds
- ✅ Logs show: "Apertium APy server starting..."
- ✅ No Python errors in logs

### Test API:
```bash
# List available language pairs
curl http://localhost:2737/listPairs

# Should return:
# [{"sourceLanguage":"ido","targetLanguage":"epo"},
#  {"sourceLanguage":"epo","targetLanguage":"ido"}]

# Test translation
curl -X POST http://localhost:2737/translate \
  -d "q=Me amas vu" \
  -d "langpair=ido|epo"

# Should return: {"responseData":{"translatedText":"Mi amas vin"},...}
```

---

## Test 3: Verify Rebuild Script Exists

**Purpose:** Confirm rebuild scripts were copied into container

### Steps:
```bash
# Check if files exist
docker exec ido-epo-apy ls -lh /opt/apertium/

# Check git repos exist
docker exec ido-epo-apy ls -lh /opt/apertium/apertium-ido/
docker exec ido-epo-apy ls -lh /opt/apertium/apertium-epo/
docker exec ido-epo-apy ls -lh /opt/apertium/apertium-ido-epo/

# Verify scripts are executable
docker exec ido-epo-apy ls -l /opt/apertium/rebuild*.sh
```

### Expected Results:
```
/opt/apertium/
  ├── apertium-ido/          ← Git repo
  ├── apertium-epo/          ← Git repo
  ├── apertium-ido-epo/      ← Git repo
  ├── rebuild.sh             ← Executable script
  └── rebuild-self-updating.sh ← Executable script
```

---

## Test 4: Manual Rebuild Script Execution

**Purpose:** Test rebuild script directly inside container

### Steps:
```bash
# Execute rebuild script
docker exec ido-epo-apy /opt/apertium/rebuild.sh

# Watch for output showing:
# - Pulling latest code from GitHub
# - Rebuilding each repository
# - Installing updated dictionaries
```

### Expected Results:
- ✅ Script runs without errors
- ✅ Shows progress for each repository:
  - "Building apertium-ido... ✓ Done"
  - "Building apertium-epo... ✓ Done"
  - "Building apertium-ido-epo... ✓ Done"
- ✅ Completes in ~2-5 minutes
- ✅ No compilation errors

### After Rebuild:
```bash
# Restart APy to load new dictionaries
docker-compose restart

# Wait 10 seconds for restart
sleep 10

# Test translation again
curl -X POST http://localhost:2737/translate \
  -d "q=Me amas vu" \
  -d "langpair=ido|epo"
```

---

## Test 5: Self-Updating Rebuild Script

**Purpose:** Verify the self-updating script pulls its own latest version

### Steps:
```bash
# Run self-updating version
docker exec ido-epo-apy /opt/apertium/rebuild-self-updating.sh
```

### Expected Results:
- ✅ First checks for script updates from GitHub
- ✅ Shows: "✅ Script is up to date" or "✅ Script updated from GitHub"
- ✅ Proceeds with dictionary updates
- ✅ Uses correct URL: `github.com/komapc/ido-epo-translator` (not `vortaro`)

---

## Test 6: Webhook Server (Local Testing)

**Purpose:** Test if rebuild can be triggered via HTTP (simulating the web UI)

### Steps:
```bash
# Start the webhook server on host (simulates EC2 setup)
cd /home/mark/apertium-dev/ido-epo-translator
node webhook-server.js &

# In another terminal, trigger rebuild via webhook
curl -X POST http://localhost:9100/rebuild \
  -H "Content-Type: application/json"

# Check logs
tail -f /var/log/apertium-rebuild.log
# (or check webhook-server.js stdout if log file not writable)
```

### Expected Results:
- ✅ Webhook server accepts request
- ✅ Returns status 202 (Accepted)
- ✅ Executes `docker exec ido-epo-apy /opt/apertium/rebuild.sh`
- ✅ Shows rebuild progress in logs
- ✅ Returns success message with log excerpt

### Cleanup:
```bash
# Stop webhook server
pkill -f webhook-server.js
```

---

## Test 7: Web UI Integration Test

**Purpose:** Test the full rebuild button flow from the web interface

### Steps:
```bash
# Start the development server
cd /home/mark/apertium-dev/ido-epo-translator
npm run dev

# In browser, open http://localhost:5173
```

### In Browser:
1. Click "Admin" or "Rebuild" button
2. Observe the status messages:
   - "Checking for updates..."
   - Either "Up to date" or "Starting rebuild..."
   - Progress bar and elapsed timer
   - "Rebuild completed successfully!"

### Expected Results:
- ✅ Button shows "Checking..." briefly
- ✅ If updates available, shows "Rebuilding (0:00)"
- ✅ Timer increments every second
- ✅ Progress bar fills proportionally
- ✅ Success message after completion
- ✅ Console shows no errors

---

## Test 8: Error Handling

**Purpose:** Verify graceful error handling

### Test 8a: Container Not Running
```bash
docker-compose down
# Try rebuild via webhook (should fail gracefully)
curl -X POST http://localhost:9100/rebuild
```

### Expected:
- ✅ Returns error status
- ✅ Clear error message: "Container not running" or similar

### Test 8b: Network Error
```bash
# Inside container, break git access temporarily
docker exec ido-epo-apy mv /opt/apertium/apertium-ido/.git /opt/apertium/apertium-ido/.git.bak

# Try rebuild
docker exec ido-epo-apy /opt/apertium/rebuild.sh

# Restore
docker exec ido-epo-apy mv /opt/apertium/apertium-ido/.git.bak /opt/apertium/apertium-ido/.git
```

### Expected:
- ✅ Script shows error for the broken repo
- ✅ Continues with other repos (if possible)
- ✅ Returns non-zero exit code

---

## Test 9: Volume Mounts (Optional)

**Purpose:** Test local development workflow with volume mounts

### Steps:
1. Edit `apy-server/docker-compose.yml`
2. Uncomment the volumes section
3. Verify paths point to your actual repos
4. Rebuild container: `docker-compose up -d --force-recreate`

### Test:
```bash
# Make a change to local dictionary
# (e.g., add a test entry to apertium-ido-epo.ido-epo.dix)

# Restart APy
docker-compose restart

# Test if change is visible
curl -X POST http://localhost:2737/translate -d "q=YOUR_TEST_WORD" -d "langpair=ido|epo"
```

### Expected:
- ✅ Changes in local files are visible in container
- ✅ No rebuild needed to test dictionary changes

---

## Success Criteria

All tests should pass with:
- ✅ Docker container builds successfully
- ✅ APy server starts and responds to requests
- ✅ Rebuild scripts exist in container
- ✅ Manual rebuild executes successfully
- ✅ Self-updating script works with correct GitHub URL
- ✅ Webhook trigger works locally
- ✅ Web UI rebuild button functions properly
- ✅ Error handling is graceful
- ✅ Documentation is accurate and helpful

---

## Troubleshooting

### Build Fails
- Check Docker has enough disk space: `docker system df`
- Check internet connectivity for git clone operations
- Review build logs: `docker-compose build 2>&1 | tee build.log`

### APy Won't Start
- Check logs: `docker-compose logs -f apy-server`
- Check port 2737 not in use: `lsof -i :2737`
- Try with fresh build: `docker-compose down -v && docker-compose build --no-cache && docker-compose up`

### Rebuild Script Fails
- Exec into container: `docker exec -it ido-epo-apy bash`
- Check git status: `cd /opt/apertium/apertium-ido && git status`
- Check network: `ping github.com`
- Check build tools: `which make autoconf`

### Webhook Fails
- Check webhook server is running: `ps aux | grep webhook`
- Check port 9100 is available: `lsof -i :9100`
- Check logs: `tail -f /var/log/apertium-rebuild.log`
- Check Docker socket access for webhook server

---

## Next Steps After Testing

1. If all tests pass:
   - ✅ Commit changes
   - ✅ Create pull request
   - ✅ Update STATUS.md
   - ✅ Deploy to EC2 for production testing

2. If tests fail:
   - Document failures
   - Review error messages
   - Fix issues
   - Retest

---

## Notes

- **First build** will take longer (~5-7 min) due to git clones
- **Subsequent builds** are faster (~2-3 min) with Docker cache
- **Rebuild operation** takes ~2-5 minutes depending on system
- **EC2 production** may take longer due to network/resources

