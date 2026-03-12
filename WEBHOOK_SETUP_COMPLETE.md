# ✅ Webhook Setup Complete

## What Was Done on EC2

The webhook infrastructure has been successfully installed on your EC2 instance:

- ✅ Node.js v18.20.8 installed
- ✅ Nginx installed and configured
- ✅ Webhook server running on port 9100
- ✅ Shared secret configured
- ✅ Systemd service enabled (auto-starts on boot)
- ✅ Firewall port 80 opened
- ✅ Log file created with proper permissions

**Webhook URL:** `http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/rebuild`

**Shared Secret:** `0f67c22d307a83873fa4fc2c528f8eb20bc23c9c58d04564791dc635ed6a1a37`

---

## 🔧 FINAL STEP: Configure Cloudflare Worker

You need to add the webhook URL to your Cloudflare Worker so the Rebuild button can connect to it.

### Steps:

1. **Open Cloudflare Dashboard:**
   - Go to: https://dash.cloudflare.com
   - Navigate to: **Workers & Pages**
   - Click on: **ido-epo-translator**

2. **Go to Settings → Variables:**
   - Click the **Settings** tab
   - Click **Variables and Secrets** in the left sidebar

3. **Add Environment Variable #1 - Webhook URL:**
   - Click **"Add variable"** button
   - **Variable name:** `REBUILD_WEBHOOK_URL`
   - **Value:** `http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/rebuild`
   - **Type:** Plaintext (NOT encrypted)
   - Click **"Save"**

4. **Add Environment Variable #2 - Shared Secret (Recommended):**
   - Click **"Add variable"** button again
   - **Variable name:** `REBUILD_SHARED_SECRET`
   - **Value:** `0f67c22d307a83873fa4fc2c528f8eb20bc23c9c58d04564791dc635ed6a1a37`
   - **Type:** **Secret** (encrypted/encrypted variable)
   - Click **"Save"**

5. **Deploy Changes:**
   - Click **"Save and Deploy"** at the bottom
   - Wait ~30 seconds for the Worker to redeploy

---

## ✅ Verification

After configuring Cloudflare:

1. **Open your translator web app:**
   ```
   https://ido-tradukilo.pages.dev
   ```

2. **Click the "Rebuild" button**

3. **Expected behavior:**
   - Button shows "Rebuilding..." with spinning icon
   - After 5-10 seconds, shows success message with logs
   - No "Rebuild webhook URL not configured" error

---

## 📊 Monitoring

### Check webhook status on EC2:

```bash
ssh -i ~/.ssh/apertium.pem ubuntu@52.211.137.158

# Service status
sudo systemctl status webhook-server

# Live logs
sudo journalctl -u webhook-server -f

# Rebuild logs
sudo tail -f /var/log/apertium-rebuild.log
```

### Test webhook manually:

From your local machine:
```bash
# Without shared secret (will fail if secret is configured)
curl -X POST http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/rebuild

# With shared secret
curl -X POST \
  -H "X-Rebuild-Token: 0f67c22d307a83873fa4fc2c528f8eb20bc23c9c58d04564791dc635ed6a1a37" \
  http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/rebuild
```

Expected response:
```json
{
  "status": "accepted",
  "message": "Rebuild completed successfully",
  "log": "... build output ..."
}
```

---

## 🔒 Security

The shared secret prevents unauthorized rebuilds. Without it in the Cloudflare Worker, rebuild requests will be rejected with `401 Unauthorized`.

**Keep the shared secret secure:**
- It's stored as an encrypted secret in Cloudflare Worker
- It's stored in systemd service on EC2
- Don't commit it to Git
- Don't share it publicly

---

## 🔄 How It Works

```
┌─────────────┐      ┌─────────────────┐      ┌──────────┐      ┌─────────┐
│  Web UI     │─────▶│ Cloudflare      │─────▶│  Nginx   │─────▶│ Webhook │
│  (Browser)  │      │ Worker          │      │  (Port   │      │ Server  │
│             │      │ /api/admin/     │      │   80)    │      │ (Node.js│
│             │      │  rebuild        │      │          │      │ Port    │
│             │      │                 │      │          │      │ 9100)   │
└─────────────┘      └─────────────────┘      └──────────┘      └────┬────┘
                             │                                        │
                             │                                        ▼
                             │                                  ┌──────────┐
                             │                                  │  Docker  │
                             │                                  │  exec    │
                             │                                  │ rebuild  │
                             │                                  │ .sh      │
                             │                                  └──────────┘
                             │                                        │
                             │◀───────────────────────────────────────┘
                             │      Response with logs
                             ▼
                      ┌──────────────┐
                      │ User sees    │
                      │ success      │
                      │ message      │
                      └──────────────┘
```

---

## 📝 Files Created

On EC2 (`/opt/ido-epo-translator/`):
- `webhook-server.js` - Node.js webhook server
- `/etc/systemd/system/webhook-server.service` - Systemd service
- `/etc/systemd/system/webhook-server.service.d/override.conf` - Secret config
- `/etc/nginx/sites-available/apy.conf` - Nginx configuration
- `/var/log/apertium-rebuild.log` - Rebuild logs

---

## 🚨 Troubleshooting

### "Rebuild webhook URL not configured"
**Cause:** Cloudflare Worker doesn't have `REBUILD_WEBHOOK_URL` variable.  
**Fix:** Add the variable in Cloudflare Dashboard (see steps above).

### "401 Unauthorized"
**Cause:** Shared secret mismatch.  
**Fix:** Ensure both Cloudflare and EC2 have the same secret.

### "502 Bad Gateway"
**Cause:** Webhook server not running.  
**Fix:** `ssh ubuntu@52.211.137.158 "sudo systemctl restart webhook-server"`

### Rebuild doesn't actually rebuild
**Cause:** Docker container name mismatch.  
**Fix:** Check container name with `docker ps` and update webhook-server.js if needed.

---

## 🎉 You're Done!

Once you add the Cloudflare environment variables, your Rebuild button will work!

The system will:
1. Pull latest code from GitHub
2. Rebuild all Apertium dictionaries
3. Install updated dictionaries
4. Show build logs in the UI

**Typical rebuild time:** 2-5 minutes

