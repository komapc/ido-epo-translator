# Cloudflare API Token Setup

## Required Permissions for GitHub Actions Deployment

The `CLOUDFLARE_API_TOKEN` secret needs the following permissions to deploy the Ido-Esperanto translator:

### Create Token at Cloudflare Dashboard

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click: **Create Token**
3. Choose: **Create Custom Token**

### Required Permissions

```
Account Resources:
  - Account Settings: Read
  - Workers Scripts: Edit
  
Zone Resources (if using custom domain):
  - Workers Routes: Edit
```

### Specific Configuration

**Token Name:** `GitHub Actions - ido-epo-translator`

**Permissions:**
- Account → Workers Scripts → Edit
- Account → Account Settings → Read

**Account Resources:**
- Include → Specific account → [Your Account]

**Zone Resources:**
- Not required (using workers.dev subdomain)

**Client IP Address Filtering:**
- Optional (leave empty for GitHub Actions)

**TTL:**
- Set expiration date or leave as "Never expires"

### Alternative: Use Account-Level API Token

If the above doesn't work, you can use a broader token:

**Permissions:**
- Account → Workers Scripts → Edit
- Account → Workers Routes → Edit  
- Account → Workers Tail → Read
- Account → Account Settings → Read

### Verify Token

After creating the token, test it:

```bash
export CLOUDFLARE_API_TOKEN="your-token-here"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"

npx wrangler whoami
```

You should see your account information.

### Add to GitHub Secrets

1. Go to: https://github.com/komapc/ido-epo-translator/settings/secrets/actions
2. Click: **New repository secret**
3. Name: `CLOUDFLARE_API_TOKEN`
4. Value: [paste your token]
5. Click: **Add secret**

Also add:
- Name: `CLOUDFLARE_ACCOUNT_ID`
- Value: Your Cloudflare account ID (found in Workers dashboard)

### Current Error

The error you're seeing:

```
Authentication error [code: 10000]
Getting User settings...
```

This indicates the token doesn't have the right permissions. Please:
1. Delete the old token in Cloudflare Dashboard
2. Create a new one with the permissions above
3. Update the `CLOUDFLARE_API_TOKEN` secret in GitHub

### Reference

- Cloudflare Workers API Documentation: https://developers.cloudflare.com/api/operations/workers-script-upload-worker-module
- Wrangler Authentication: https://developers.cloudflare.com/workers/wrangler/ci-cd/

