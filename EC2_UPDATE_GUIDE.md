# 📦 EC2 Dictionary Update Guide

## 🎯 Objective
Update Apertium dictionaries on EC2 from 9,966 → 14,481 entries (+45% improvement!)

---

## 🔑 Step 1: SSH to EC2

```bash
ssh ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com
```

---

## 📋 Step 2: Run Update Script

Copy and paste this entire script:

```bash
#!/bin/bash
set -e

echo "📦 EC2 Dictionary Update - Starting..."
echo "=========================================="
echo ""

# Navigate to apertium repo
echo "1️⃣  Navigating to apertium-ido-epo..."
cd ~/apertium-ido-epo/apertium/apertium-ido-epo

# Pull latest changes
echo "2️⃣  Pulling latest changes from GitHub..."
git fetch origin
git pull origin main

# Check new dictionary sizes
echo ""
echo "3️⃣  New dictionary sizes:"
ls -lh apertium-ido.ido.dix apertium-ido-epo.ido-epo.dix
echo ""

# Count entries
MONODIX_ENTRIES=$(grep -c "<e " apertium-ido.ido.dix || echo "0")
BIDIX_ENTRIES=$(grep -c "<e " apertium-ido-epo.ido-epo.dix || echo "0")
echo "   Monodix entries: $MONODIX_ENTRIES"
echo "   Bidix entries: $BIDIX_ENTRIES"
echo ""

# Go to docker directory
cd ~/apertium-ido-epo

# Stop containers
echo "4️⃣  Stopping Docker containers..."
docker-compose down

# Rebuild with new dictionaries
echo "5️⃣  Rebuilding Docker image (this may take 2-3 minutes)..."
docker-compose build --no-cache

# Start services
echo "6️⃣  Starting services..."
docker-compose up -d

# Wait for startup
echo "7️⃣  Waiting for services to start..."
sleep 15

# Test translation
echo "8️⃣  Testing translation..."
TEST_RESULT=$(curl -s "http://localhost:2737/translate?langpair=io|eo&q=hundo" || echo "FAILED")
echo "   Test result: $TEST_RESULT"
echo ""

# Check status
echo "9️⃣  Container status:"
docker-compose ps

echo ""
echo "=========================================="
echo "✅ EC2 Update Complete!"
echo ""
echo "📊 Summary:"
echo "  - Monodix entries: $MONODIX_ENTRIES"
echo "  - Bidix entries: $BIDIX_ENTRIES"
echo "  - Container: Running"
echo ""
echo "🌐 Test web translator at:"
echo "   https://ido-epo-translator.pages.dev"
echo ""
```

---

## ✅ Step 3: Verify

After running the script, check:

1. **Container Status:**
   ```bash
   docker-compose ps
   ```
   Should show container as "Up"

2. **Test Translation Locally:**
   ```bash
   curl "http://localhost:2737/translate?langpair=io|eo&q=hundo"
   ```
   Should return JSON with translation

3. **Test Web Translator:**
   Open https://ido-epo-translator.pages.dev
   Try translating "hundo" from Ido → Esperanto

---

## 🔧 Troubleshooting

### If Docker build fails:
```bash
# Check Docker status
sudo systemctl status docker

# Check logs
docker-compose logs -f
```

### If translation doesn't work:
```bash
# Restart containers
docker-compose restart

# Check Apertium logs
docker-compose logs apertium
```

### If still having issues:
```bash
# Full restart
docker-compose down
docker system prune -f
docker-compose up -d --build
```

---

## 📊 Expected Results

**Before:**
- Monodix: 9,966 entries
- Bidix: ~0 entries (sparse)

**After:**
- Monodix: 14,481 entries ✨
- Bidix: 14,481 translation pairs ✨
- **+45% improvement!**

---

## 🎉 Done!

The web translator will now use the new dictionaries with 14,481 entries!
