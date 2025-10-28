# APy Server Installation Guide

**Simple guide to install Apertium APy server from scratch**

---

## 🎯 What This Does

Installs a complete Apertium translation server with:
- Apertium core tools
- Ido monolingual dictionary
- Esperanto monolingual dictionary  
- Ido-Esperanto bilingual dictionary
- APy HTTP server (port 2737)
- Systemd service for automatic startup

---

## 🚀 Quick Install

### On EC2:

```bash
# Copy script to EC2
scp -i ~/.ssh/apertium.pem install-apy-server.sh ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:~/

# SSH to EC2
ssh -i ~/.ssh/apertium.pem ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com

# Run installation
bash install-apy-server.sh
```

**Time:** ~10-15 minutes

**What it does:**
- Installs all dependencies
- Installs Apertium core
- Clones and builds ido, epo, and ido-epo dictionaries
- Fixes configure.ac automatically
- Installs APy HTTP server
- Creates systemd service
- Starts APy and tests it

---

## 📋 What Gets Installed

### System Packages:
- Python 3 + pip
- Git
- Build tools (gcc, make, autoconf, etc.)
- XML libraries

### Apertium:
- Apertium core (`apertium-all-dev`)
- apertium-ido (from komapc/apertium-ido)
- apertium-epo (from apertium/apertium-epo)
- apertium-ido-epo (from komapc/apertium-ido-epo)

### APy Server:
- Installed via pip: `apertium-apy`
- Runs on port 2737
- Systemd service: `apy.service`

### Directory Structure:
```
/opt/apertium/
├── apertium-ido/          # Ido dictionary
├── apertium-epo/          # Esperanto dictionary
└── apertium-ido-epo/      # Bilingual dictionary

/usr/local/share/apertium/modes/
├── ido-epo.mode           # Ido → Esperanto
└── epo-ido.mode           # Esperanto → Ido
```

---

## 🧪 Testing

### Check APy Status:
```bash
sudo systemctl status apy
```

### List Available Language Pairs:
```bash
curl http://localhost:2737/listPairs
```

Expected output:
```json
{
  "responseData": [
    {"sourceLanguage": "ido", "targetLanguage": "epo"},
    {"sourceLanguage": "epo", "targetLanguage": "ido"}
  ],
  "responseDetails": null,
  "responseStatus": 200
}
```

### Test Translation (Ido → Esperanto):
```bash
curl -X POST http://localhost:2737/translate \
  -d "q=Me amas vu" \
  -d "langpair=ido|epo"
```

Expected output:
```json
{
  "responseData": {
    "translatedText": "Mi amas vin"
  },
  "responseDetails": null,
  "responseStatus": 200
}
```

### Test Translation (Esperanto → Ido):
```bash
curl -X POST http://localhost:2737/translate \
  -d "q=Mi amas vin" \
  -d "langpair=epo|ido"
```

---

## 🔧 Management

### Start APy:
```bash
sudo systemctl start apy
```

### Stop APy:
```bash
sudo systemctl stop apy
```

### Restart APy:
```bash
sudo systemctl restart apy
```

### View Logs:
```bash
sudo journalctl -u apy -f
```

### Check Status:
```bash
sudo systemctl status apy
```

---

## 🔄 Updating Dictionaries

After updating dictionary repositories:

```bash
cd /opt/apertium/apertium-ido
git pull
./autogen.sh && ./configure && make && sudo make install

cd /opt/apertium/apertium-epo
git pull
./autogen.sh && ./configure && make && sudo make install

cd /opt/apertium/apertium-ido-epo
git pull
./autogen.sh && ./configure && make && sudo make install

# Restart APy
sudo systemctl restart apy
```

Or use the dictionaries dialog in the web UI!

---

## 🐛 Troubleshooting

### APy Not Starting:
```bash
# Check logs
sudo journalctl -u apy -n 50

# Check if port is in use
sudo lsof -i :2737

# Restart service
sudo systemctl restart apy
```

### No Language Pairs:
```bash
# Check modes directory
ls -la /usr/local/share/apertium/modes/

# Reinstall bilingual dictionary
cd /opt/apertium/apertium-ido-epo
sudo make install
sudo systemctl restart apy
```

### Translation Fails:
```bash
# Test dictionaries directly
echo "Me amas vu" | apertium ido-epo

# If this fails, rebuild dictionaries
cd /opt/apertium/apertium-ido-epo
make clean
./autogen.sh && ./configure && make && sudo make install
sudo systemctl restart apy
```

---

## 📝 Notes

### Port Configuration:
- APy runs on port 2737 (default)
- Nginx proxies port 80 → 2737
- Accessible at: http://ec2-host/translate

### Automatic Startup:
- APy starts automatically on boot
- Restarts automatically if it crashes
- Managed by systemd

### Security:
- APy runs as `ubuntu` user
- No authentication (behind Nginx)
- Only accessible via Cloudflare Worker

---

## 🔗 Related Files

- **Installation Script:** `install-apy-server.sh`
- **Webhook Server:** `webhook-server-no-docker.js`
- **Pull Script:** `apy-server/pull-repo.sh`
- **Build Script:** `apy-server/build-repo.sh`

---

## ✅ Success Criteria

After installation, you should see:
- ✅ APy service running: `systemctl status apy`
- ✅ Two language pairs: `ido-epo` and `epo-ido`
- ✅ Translation works: "Me amas vu" → "Mi amas vin"
- ✅ Web UI shows translation results

---

**Installation complete!** 🎉

