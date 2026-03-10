# 🚨 Deployment Fix Needed - GitHub Secrets Missing

## Current Issue

GitHub Actions deployment is failing with:
```
✘ [ERROR] In a non-interactive environment, it's necessary to set a 
CLOUDFLARE_API_TOKEN environment variable for wrangler to work.
```

## Required Actions

### 1. Set GitHub Repository Secrets

Go to: **https://github.com/komapc/ido-epo-translator/settings/secrets/actions**

You need to add **TWO secrets**:

#### Secret 1: CLOUDFLARE_API_TOKEN
1. Click "New repository secret"
2. Name: `CLOUDFLARE_API_TOKEN`
3. Value: Get from Cloudflare Dashboard → Profile → API Tokens
   - Create token with: **Workers Scripts: Edit** permission
   - Detailed instructions in `CLOUDFLARE_API_TOKEN_SETUP.md`

#### Secret 2: CLOUDFLARE_ACCOUNT_ID
1. Click "New repository secret"  
2. Name: `CLOUDFLARE_ACCOUNT_ID`
3. Value: Your Cloudflare Account ID
   - Find it in: Cloudflare Dashboard → Workers & Pages (in URL or sidebar)
   - Format: 32-character hex string

### 2. After Adding Secrets

Once both secrets are added:
1. Go to: https://github.com/komapc/ido-epo-translator/actions
2. Find the failed workflow run
3. Click "Re-run failed jobs"

OR simply push a new commit to trigger deployment.

### 3. Verify Deployment

After successful deployment, check:
- Worker is live at: `https://ido-epo-translator.komapc.workers.dev/` (or your custom domain)
- Health check: `https://ido-epo-translator.komapc.workers.dev/api/health`

## Quick Reference

**Secrets Location:**
```
GitHub Repo → Settings → Secrets and variables → Actions → Repository secrets
```

**Required Secrets:**
- ✅ `CLOUDFLARE_API_TOKEN` (from Cloudflare API Tokens page)
- ✅ `CLOUDFLARE_ACCOUNT_ID` (from Cloudflare Workers dashboard)

## Alternative: Manual Deployment

If you prefer to deploy manually instead of via GitHub Actions:

```bash
cd /home/mark/apertium-gemini/projects/translator

# Set your Cloudflare credentials locally
export CLOUDFLARE_API_TOKEN="your-token-here"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"

# Deploy
npx wrangler deploy
```

## Status

- ✅ Dockerfile fixes pushed (APy server will work when deployed)
- ⏳ **GitHub Secrets needed** for automatic Cloudflare Worker deployment
- ✅ All code changes are complete and merged

---

**Created:** October 22, 2025  
**Related:** `CLOUDFLARE_API_TOKEN_SETUP.md`, `GITHUB_SECRETS_SETUP.md`


