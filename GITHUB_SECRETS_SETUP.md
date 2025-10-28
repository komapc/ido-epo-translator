# GitHub Secrets Setup for Automatic Deployment

## Problem
The GitHub Actions workflow is failing because Cloudflare credentials are missing.

## Solution: Add GitHub Secrets

### 1. Get Cloudflare API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use template: **"Edit Cloudflare Workers"** (click "Use template")
4. **Permissions** should be:
   - Account → Workers Scripts → Edit
   - Account → Account Settings → Read
5. **Account Resources**: Select your account
6. Click **"Continue to summary"** → **"Create Token"**
7. **Copy the token** (you'll only see it once!)

### 2. Get Cloudflare Account ID

1. Go to https://dash.cloudflare.com
2. Click on "Workers & Pages" in the left sidebar
3. Your **Account ID** is shown in the right sidebar
   - Or get it from any Worker's URL: `dash.cloudflare.com/<ACCOUNT_ID>/workers`

### 3. Add Secrets to GitHub

1. Go to: https://github.com/komapc/apertium-ido-epo/settings/secrets/actions
2. Click **"New repository secret"**
3. Add first secret:
   - **Name**: `CLOUDFLARE_API_TOKEN`
   - **Value**: (paste the API token from step 1)
   - Click **"Add secret"**
4. Add second secret:
   - **Name**: `CLOUDFLARE_ACCOUNT_ID`
   - **Value**: (paste the account ID from step 2)
   - Click **"Add secret"**

### 4. Trigger Deployment

After adding the secrets, you have two options:

#### Option A: Manual Trigger (Immediate)
```bash
cd /home/mark/apertium-ido-epo
gh workflow run deploy-worker.yml
```

#### Option B: Push a Small Change (Automatic)
The workflow will automatically run on the next push to `main` that affects `projects/translator/**`

Or just wait - it will deploy automatically on the next merge to main.

## Verify Deployment

After the workflow runs successfully:

1. Check workflow status: https://github.com/komapc/apertium-ido-epo/actions
2. Visit your deployed app: https://ido-epo-translator.komapc.workers.dev
   (Or whatever your Workers URL is)

## Environment Variables in Cloudflare

Don't forget to also set these in **Cloudflare Dashboard** → Workers → Your Worker → Settings → Variables:

- `APY_SERVER_URL` = `http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com`
- `REBUILD_WEBHOOK_URL` = `http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/rebuild`
- `REBUILD_SHARED_SECRET` = (generate with: `openssl rand -hex 32`)
- `APP_VERSION` = `1.0.2` (optional)
- `GITHUB_TOKEN` = (optional, for version API rate limits)

## Troubleshooting

If deployment still fails after adding secrets:
```bash
# Check recent workflow runs
gh run list --workflow=deploy-worker.yml --limit 5

# View latest run details
gh run view --log-failed
```

