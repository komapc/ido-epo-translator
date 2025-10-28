# Cloudflare Secrets & Environment Variables Guide

**Last Updated:** October 28, 2025

---

## Understanding Cloudflare Variable Storage

Cloudflare Workers have **THREE** places where variables can be stored:

### 1. **wrangler.toml** (Local Development Only)
**Location:** `projects/translator/wrangler.toml`  
**Purpose:** Development environment variables  
**Persistence:** ✅ Committed to git, never reset  
**Scope:** Only used during `wrangler dev` (local testing)

```toml
[env.dev]
[env.dev.vars]
APY_SERVER_URL = "http://localhost:2737"
REBUILD_WEBHOOK_URL = "http://localhost/rebuild"
```

**Important:** These are ONLY for local development. They do NOT affect production!

---

### 2. **Cloudflare Dashboard Variables** (Production - Plain Text)
**Location:** Cloudflare Dashboard → Workers & Pages → ido-epo-translator → Settings → Variables  
**Purpose:** Non-sensitive production variables  
**Persistence:** ⚠️ **CAN BE RESET** by deployments if not careful  
**Scope:** Production environment

**How to set:**
1. Go to https://dash.cloudflare.com
2. Workers & Pages → ido-epo-translator
3. Settings → Variables and Secrets
4. Add variable → Save

**Variables to set here:**
- `APY_SERVER_URL` = `http://52.211.137.158` (your EC2 IP, no port, no /rebuild)
- `APP_VERSION` = `1.0.0` (optional, for /api/health)

**⚠️ Warning:** These can be overwritten if you deploy with `--var` flags or if GitHub Actions sets them.

---

### 3. **Cloudflare Worker Secrets** (Production - Encrypted) ✅ RECOMMENDED
**Location:** Stored encrypted in Cloudflare's infrastructure  
**Purpose:** Sensitive values (passwords, tokens, secrets)  
**Persistence:** ✅ **NEVER RESET** by deployments  
**Scope:** Production environment

**How to set (via CLI):**
```bash
cd ~/apertium-dev/projects/translator

# Set each secret (you'll be prompted to enter the value)
npx wrangler secret put REBUILD_WEBHOOK_URL
# Enter: http://52.211.137.158:8081/rebuild

npx wrangler secret put REBUILD_SHARED_SECRET
# Enter: (paste the secret from EC2)

npx wrangler secret put ADMIN_PASSWORD
# Enter: (your admin password)
```

**How to set (via Dashboard):**
1. Go to https://dash.cloudflare.com
2. Workers & Pages → ido-epo-translator
3. Settings → Variables and Secrets
4. Add secret → Enter name and value → Encrypt

**Secrets to set:**
- `REBUILD_WEBHOOK_URL` = `http://52.211.137.158:8081/rebuild`
- `REBUILD_SHARED_SECRET` = (from EC2 `~/.webhook-secret`)
- `ADMIN_PASSWORD` = (your admin password)

**✅ Advantages:**
- Never reset by deployments
- Encrypted at rest
- Not visible in logs
- Can only be overwritten explicitly

---

## Why Secrets Get Reset

### Problem: Variables disappear after `wrangler deploy`

**Root Cause:** Cloudflare has TWO separate systems:

1. **Pages** (for static sites)
   - Variables set in: Pages → Settings → Environment Variables
   - Used by: Static site deployments

2. **Workers** (for serverless functions)
   - Variables set in: Workers → Settings → Variables
   - Secrets set via: `wrangler secret put` or Dashboard
   - Used by: Worker scripts (_worker.js)

**Your project uses Workers**, not Pages! So:
- ❌ Setting variables in "Pages" section → Won't work
- ✅ Setting secrets via `wrangler secret put` → Works
- ✅ Setting variables in "Workers" section → Works

---

## Correct Setup for Production

### Step 1: Set Secrets (One-time, Never Reset)

```bash
cd ~/apertium-dev/projects/translator

# Get EC2 secret
EC2_IP="52.211.137.158"  # Replace with your IP
SECRET=$(ssh ubuntu@$EC2_IP "cat ~/.webhook-secret")

# Set webhook URL
echo "http://$EC2_IP:8081/rebuild" | npx wrangler secret put REBUILD_WEBHOOK_URL

# Set shared secret
echo "$SECRET" | npx wrangler secret put REBUILD_SHARED_SECRET

# Set admin password (optional)
echo "your-secure-password" | npx wrangler secret put ADMIN_PASSWORD
```

### Step 2: Set Non-Secret Variables (Optional)

```bash
# Via CLI (will be reset on next deploy)
npx wrangler deploy --var APY_SERVER_URL:http://52.211.137.158

# OR via Dashboard (more persistent)
# Go to Dashboard → Workers → ido-epo-translator → Settings → Variables
# Add: APY_SERVER_URL = http://52.211.137.158
```

### Step 3: Deploy

```bash
npm run build
npx wrangler deploy
```

**Important:** Secrets are NOT reset by `wrangler deploy`!

---

## Verification

### Check What's Set

```bash
# List all secrets (shows names only, not values)
npx wrangler secret list

# Test the API
curl https://ido-epo-translator.pages.dev/api/health
```

### View in Dashboard

1. Go to https://dash.cloudflare.com
2. Workers & Pages → ido-epo-translator
3. Settings → Variables and Secrets
4. You should see:
   - **Variables:** APY_SERVER_URL (visible)
   - **Secrets:** REBUILD_WEBHOOK_URL, REBUILD_SHARED_SECRET (encrypted)

---

## GitHub Actions Deployment

Your `.github/workflows/deploy-worker.yml` should NOT set secrets. It should only deploy code:

```yaml
- name: Deploy to Cloudflare Workers
  run: |
    npm run build
    npx wrangler deploy
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

**Do NOT add:**
```yaml
# ❌ BAD - This will reset your secrets!
--var REBUILD_WEBHOOK_URL:${{ secrets.REBUILD_WEBHOOK_URL }}
```

Secrets set via `wrangler secret put` persist across deployments automatically.

---

## Complete Variable Reference

### Production Environment

| Variable | Type | Value | Set Via |
|----------|------|-------|---------|
| `APY_SERVER_URL` | Variable | `http://52.211.137.158` | Dashboard or CLI |
| `REBUILD_WEBHOOK_URL` | **Secret** | `http://52.211.137.158:8081/rebuild` | `wrangler secret put` |
| `REBUILD_SHARED_SECRET` | **Secret** | (from EC2) | `wrangler secret put` |
| `ADMIN_PASSWORD` | **Secret** | (your password) | `wrangler secret put` |
| `APP_VERSION` | Variable | `1.0.0` | CI/CD or Dashboard |
| `GITHUB_TOKEN` | **Secret** | (optional) | `wrangler secret put` |

### Development Environment (wrangler.toml)

```toml
[env.dev]
[env.dev.vars]
APY_SERVER_URL = "http://localhost:2737"
REBUILD_WEBHOOK_URL = "http://localhost/rebuild"
```

---

## Troubleshooting

### "Secrets disappeared after deploy"

**Solution:** You were setting them in the wrong place. Use `wrangler secret put`.

### "Can't see secret values in Dashboard"

**Expected:** Secrets are encrypted. You can only see names, not values.

### "Worker can't access secrets"

**Check:**
1. Secrets are set for the correct Worker (not Pages)
2. Worker name matches: `ido-epo-translator`
3. Secrets are accessed correctly in code: `env.REBUILD_SHARED_SECRET`

### "How do I update a secret?"

```bash
# Just set it again - it will overwrite
echo "new-value" | npx wrangler secret put SECRET_NAME
```

### "How do I delete a secret?"

```bash
npx wrangler secret delete SECRET_NAME
```

---

## Best Practices

### ✅ DO:
- Use `wrangler secret put` for sensitive values
- Set secrets once, forget about them
- Use Dashboard variables for non-sensitive config
- Keep wrangler.toml for local dev only
- Commit wrangler.toml to git (no secrets in it)

### ❌ DON'T:
- Put secrets in wrangler.toml
- Set secrets via `--var` flags in CI/CD
- Mix up Pages and Workers settings
- Hardcode secrets in _worker.js
- Share secrets in documentation

---

## Quick Setup Script

Save this as `set-production-secrets.sh`:

```bash
#!/bin/bash
set -e

EC2_IP="52.211.137.158"  # Replace with your IP

echo "Fetching secret from EC2..."
SECRET=$(ssh ubuntu@$EC2_IP "cat ~/.webhook-secret")

echo "Setting Cloudflare Worker secrets..."
echo "http://$EC2_IP:8081/rebuild" | npx wrangler secret put REBUILD_WEBHOOK_URL
echo "$SECRET" | npx wrangler secret put REBUILD_SHARED_SECRET

echo "✅ Secrets set successfully!"
echo ""
echo "Verify with: npx wrangler secret list"
```

Run once:
```bash
chmod +x set-production-secrets.sh
./set-production-secrets.sh
```

---

## Summary

**For production secrets that should NEVER reset:**
```bash
npx wrangler secret put SECRET_NAME
```

**For local development:**
```toml
# wrangler.toml
[env.dev.vars]
VARIABLE_NAME = "value"
```

**For non-sensitive production config:**
- Cloudflare Dashboard → Workers → Settings → Variables

**The key insight:** Secrets set via `wrangler secret put` are stored separately from your Worker code and persist across all deployments. They're the only truly persistent way to store sensitive values.
