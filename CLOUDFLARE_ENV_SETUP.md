# Cloudflare Environment Variables Setup

**Issue:** "Failed to trigger repository pull" error when clicking Pull Updates button

**Cause:** Missing `REBUILD_WEBHOOK_URL` environment variable in Cloudflare Worker

---

## Required Environment Variables

The following environment variables must be set in Cloudflare Dashboard:

### 1. `REBUILD_WEBHOOK_URL`
**Value:** `http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:9100/rebuild`

**Purpose:** URL of the webhook server on EC2 that handles rebuild requests

### 2. `REBUILD_SHARED_SECRET`
**Value:** Your secret token (same as on EC2)

**Purpose:** Authentication token for webhook requests

### 3. `APY_SERVER_URL` (should already be set)
**Value:** `http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com`

**Purpose:** URL of the Apertium APy translation server

---

## How to Set Environment Variables

### Option 1: Cloudflare Dashboard (Recommended)

1. **Go to Cloudflare Dashboard**
   - Navigate to https://dash.cloudflare.com
   - Select your account
   - Go to "Workers & Pages"
   - Click on "ido-epo-translator"

2. **Go to Settings**
   - Click "Settings" tab
   - Scroll to "Environment Variables"

3. **Add Variables**
   - Click "Add variable"
   - Name: `REBUILD_WEBHOOK_URL`
   - Value: `http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:9100/rebuild`
   - Type: Plain text (not encrypted)
   - Click "Save"

4. **Add Secret**
   - Click "Add variable"
   - Name: `REBUILD_SHARED_SECRET`
   - Value: Your secret token
   - Type: Encrypt (recommended)
   - Click "Save"

5. **Redeploy**
   - After adding variables, redeploy the worker:
   ```bash
   cd ~/apertium-dev/projects/translator
   npm run deploy
   ```

---

### Option 2: Using Wrangler CLI

```bash
cd ~/apertium-dev/projects/translator

# Set REBUILD_WEBHOOK_URL
wrangler secret put REBUILD_WEBHOOK_URL
# When prompted, enter: http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:9100/rebuild

# Set REBUILD_SHARED_SECRET
wrangler secret put REBUILD_SHARED_SECRET
# When prompted, enter your secret token
```

---

## Verify Configuration

After setting the variables, test the endpoint:

```bash
# Test from command line
curl -X POST https://ido-epo-translator.pages.dev/api/admin/pull-repo \
  -H "Content-Type: application/json" \
  -d '{"repo": "ido"}'
```

**Expected response:**
```json
{
  "status": "success",
  "repo": "ido",
  "changes": {
    "hasChanges": false,
    "oldHash": "abc123...",
    "newHash": "abc123...",
    "commitCount": 0
  }
}
```

---

## Troubleshooting

### Error: "Rebuild webhook URL not configured"
- Environment variable `REBUILD_WEBHOOK_URL` is not set
- Set it in Cloudflare Dashboard or using wrangler CLI

### Error: "Failed to trigger repository pull"
- Webhook server on EC2 is not running
- Check: `ssh ec2 "sudo systemctl status webhook-server"`
- Restart: `ssh ec2 "sudo systemctl restart webhook-server"`

### Error: "Unauthorized"
- `REBUILD_SHARED_SECRET` doesn't match between Worker and EC2
- Verify both have the same value

### Error: "Connection refused"
- EC2 webhook server is not listening on port 9100
- Check: `ssh ec2 "sudo netstat -tlnp | grep 9100"`
- Check logs: `ssh ec2 "sudo journalctl -u webhook-server -f"`

---

## Security Notes

1. **Use HTTPS in production** (if possible)
   - Current setup uses HTTP because EC2 doesn't have SSL certificate
   - Consider adding nginx with Let's Encrypt SSL

2. **Firewall Rules**
   - Ensure EC2 security group allows inbound traffic on port 9100
   - Restrict to Cloudflare IP ranges if possible

3. **Secret Token**
   - Use a strong random token for `REBUILD_SHARED_SECRET`
   - Generate with: `openssl rand -hex 32`
   - Keep it secret, don't commit to git

---

## Current Configuration

**Worker Environment Variables (should be set):**
- `APY_SERVER_URL` = `http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com`
- `REBUILD_WEBHOOK_URL` = `http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:9100/rebuild`
- `REBUILD_SHARED_SECRET` = `<your-secret-token>`
- `APP_VERSION` = (auto-injected by CI/CD)

**EC2 Environment Variables (in webhook-server.service):**
- `REBUILD_SHARED_SECRET` = `<same-secret-token>`
- `PORT` = `9100` (default)

---

## Quick Fix

**Fastest way to fix the error:**

1. Go to https://dash.cloudflare.com
2. Workers & Pages → ido-epo-translator → Settings
3. Add environment variable:
   - Name: `REBUILD_WEBHOOK_URL`
   - Value: `http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:9100/rebuild`
4. Redeploy: `npm run deploy`
5. Test in web UI

**Done!** The Pull Updates button should now work.
