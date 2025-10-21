# Configuration Guide

## Environment Variables

### Frontend (.env)

Create a `.env` file in the project root:

```env
FIREBASE_PROJECT_ID=ido-epo-translator
```

### Firebase Functions

For local development, create `functions/.env`:

```env
APY_SERVER_URL=http://localhost:2737
# Set via local secret manager or export before running; placeholder only
ADMIN_PASSWORD=<your-local-password>
```

For production, use Firebase Functions config:

```bash
firebase functions:config:set apy.server_url="https://your-cloud-run-url.run.app"
firebase functions:config:set admin.password="your-secure-production-password"

# View current config
firebase functions:config:get
```

## Firebase Configuration

### Update Project ID

Edit `.firebaserc`:

```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

Or use the CLI:

```bash
firebase use --add
```

## APy Server Configuration

### Local Development

Edit `apy-server/docker-compose.yml` to adjust:
- Port mapping
- Memory limits
- Volume mounts

### Production (Cloud Run)

When deploying, you can adjust these parameters in `scripts/deploy-apy.sh`:

```bash
--memory 2Gi           # Increase if needed
--cpu 2                # Adjust based on load
--max-instances 3      # Limit max instances
--min-instances 0      # Set to 1 for faster response
--timeout 300          # Request timeout in seconds
```

## Security Configuration

### Admin Password

**Important**: Change the admin password before deploying to production!

```bash
# Generate a secure password
openssl rand -base64 32

# Set in your runtime secret store (example placeholder)
firebase functions:config:set admin.password="<YOUR_SECURE_PASSWORD>"
```

### API Keys

Firebase Hosting and Cloud Run are public by default. To add authentication:

1. **For the admin panel**: Already protected by password
2. **For API endpoints**: Add API key validation in `functions/src/index.ts`
3. **For Cloud Run**: Use Cloud Run authentication (requires changes)

## Custom Domain

### Add Custom Domain to Firebase Hosting

```bash
firebase hosting:sites:create yourdomain.com
```

Then follow the instructions to:
1. Verify domain ownership
2. Update DNS records
3. Wait for SSL certificate provisioning

### Update CORS

If using a custom domain, update CORS in `functions/src/index.ts`:

```typescript
app.use(cors({ 
  origin: ['https://yourdomain.com', 'https://your-project.web.app']
}))
```

## Performance Tuning

### Cloud Run

For better performance, consider:

```bash
# Keep 1 instance always warm (costs more but faster)
gcloud run services update ido-epo-apy \
  --min-instances 1

# Increase CPU allocation
gcloud run services update ido-epo-apy \
  --cpu 4
```

### Firebase Functions

Edit `functions/src/index.ts` and add:

```typescript
export const api = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '1GB'
  })
  .https.onRequest(app)
```

## Monitoring & Alerts

### Set Up Budget Alerts

```bash
# Create budget in Cloud Console
open https://console.cloud.google.com/billing/budgets

# Set alerts at $10, $20, $50
```

### Cloud Monitoring

Enable alerts for:
- Cloud Run error rate > 5%
- Cloud Run latency > 2s
- Firebase Functions failures

## Backup Configuration

### Export Firebase Functions Config

```bash
firebase functions:config:get > functions-config.json
# Store securely, do NOT commit to git
```

### Backup Apertium Dictionaries

Your dictionaries are in git, but for extra safety:

```bash
# Create backup of compiled binaries
cd apy-server
docker cp ido-epo-apy:/opt/apertium ./backup-$(date +%Y%m%d)
```

## Regional Configuration

### Change Region

Default is `us-central1`. To change:

1. **Cloud Run**:
```bash
export CLOUD_RUN_REGION=europe-west1
./scripts/deploy-apy.sh
```

2. **Firebase Functions**: Edit `firebase.json`:
```json
{
  "functions": {
    "region": "europe-west1"
  }
}
```

## Scaling Configuration

### Auto-scaling Limits

Edit Cloud Run deployment in `scripts/deploy-apy.sh`:

```bash
--max-instances 10     # Maximum concurrent instances
--min-instances 0      # Minimum instances (0 = scale to zero)
--concurrency 80       # Requests per instance
```

### Firebase Hosting

Automatically scales, no configuration needed.

## Development vs Production

### Local Development

```bash
# Use local APy server
APY_SERVER_URL=http://localhost:2737

# Example only; do not hardcode secrets in files
ADMIN_PASSWORD=<dev-only-example>
```

### Production

```bash
# Use Cloud Run URL
APY_SERVER_URL=https://your-service.run.app

# Strong security
ADMIN_PASSWORD=<32+ character random string>
```

## Troubleshooting Config Issues

### Functions can't reach APy server

```bash
# Verify config
firebase functions:config:get

# Test URL
curl https://your-cloud-run-url.run.app/listPairs

# Redeploy functions
firebase deploy --only functions
```

### Admin panel shows wrong URL

Update the config and redeploy:

```bash
firebase functions:config:set apy.server_url="CORRECT_URL"
firebase deploy --only functions
```

### CORS errors

Update CORS settings in `functions/src/index.ts`:

```typescript
app.use(cors({ 
  origin: true,  // Allow all origins (development)
  // origin: ['https://yoursite.com']  // Restrict (production)
}))
```

