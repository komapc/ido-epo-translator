# ✅ Deployment Checklist

Use this checklist to ensure successful deployment.

## 📋 Pre-Deployment

### Local Development Working
- [ ] Can run `npm run dev` successfully
- [ ] Can build with `npm run build`
- [ ] APy server works locally (`docker-compose up` in `apy-server/`)
- [ ] Can translate test text locally

### GitHub Repository
- [ ] Code pushed to GitHub
- [ ] Repository is public or Cloudflare has access
- [ ] Main branch is up to date

### AWS EC2
- [ ] EC2 instance running (Ubuntu 20.04+)
- [ ] Can SSH into instance: `ssh ubuntu@YOUR_EC2_IP`
- [ ] Instance type: t3.small or better (2GB+ RAM)
- [ ] 20GB+ storage available
- [ ] Security group allows:
  - [ ] Port 22 (SSH) from your IP
  - [ ] Port 80 (Nginx proxy) from anywhere (0.0.0.0/0)
  - [ ] Port 2737 (APy) can remain open or be restricted; Worker uses 80

### Cloudflare Account
- [ ] Cloudflare account created (free tier OK)
- [ ] Can access dashboard at https://dash.cloudflare.com
- [ ] Worker variables set in Dashboard:
  - [ ] `APY_SERVER_URL` (hostname on port 80)
  - [ ] `REBUILD_WEBHOOK_URL` (EC2 hostname `/rebuild`)
  - [ ] Optional: `APP_VERSION` (e.g., `1.0.1`)

---

## 🖥️ Step 1: EC2 Deployment

### Setup APy Server
- [ ] SSH to EC2: `ssh ubuntu@YOUR_EC2_IP`
- [ ] Download setup script:
  ```bash
  curl -o setup-ec2.sh https://raw.githubusercontent.com/YOUR_USERNAME/vortaro/main/setup-ec2.sh
  chmod +x setup-ec2.sh
  ```
- [ ] Run setup: `./setup-ec2.sh`
- [ ] Wait 10-15 minutes for Docker build
- [ ] Verify Docker is running: `docker-compose ps`
- [ ] Test APy locally: `curl http://localhost:2737/listPairs`
- [ ] Note EC2 public IP: `curl ifconfig.me` → **Save this!**
- [ ] Test APy externally from your machine:
  ```bash
  curl http://YOUR_EC2_IP:2737/listPairs
  curl http://ec2-<EC2_DASH_IP>.<region>.compute.amazonaws.com/listPairs
  ```
  Should return JSON with language pairs

### If External Test Fails
- [ ] Check EC2 Security Group in AWS Console
- [ ] Ensure Nginx is proxying port 80 to 127.0.0.1:2737
- [ ] Retry external test

---

## ☁️ Step 2: Cloudflare Workers Deployment (recommended)

This project now deploys as a single Worker that serves static assets via the ASSETS binding and handles `/api/*` requests in `_worker.js`.

### One-time setup
- [ ] Install Wrangler locally:
  ```bash
  npm i -D wrangler
  npx wrangler login
  ```
- [ ] Build the app:
  ```bash
  npm run build
  ```
- [ ] Verify locally:
  ```bash
  npm run cf:dev
  # open printed localhost URL → test /api/health
  ```

### Configure production variables
- [ ] Go to Cloudflare Dashboard → Workers & Pages → Select your Worker
- [ ] Settings → Variables and Secrets:
  - [ ] Plaintext `APY_SERVER_URL` = `http://ec2-<EC2_DASH_IP>.<region>.compute.amazonaws.com`
  - [ ] Plaintext `REBUILD_WEBHOOK_URL` = `http://ec2-<EC2_DASH_IP>.<region>.compute.amazonaws.com/rebuild`
  - [ ] Secret `REBUILD_SHARED_SECRET` = `(optional but recommended - generate with: openssl rand -hex 32)`
  - [ ] Secret `ADMIN_PASSWORD` = `your-secure-password` (deprecated - use REBUILD_SHARED_SECRET instead)

### Deploy
- [ ] Deploy via Wrangler:
  ```bash
  npm run build && npm run cf:deploy
  ```
- [ ] Note your Workers.dev URL (e.g., `https://ido-epo-translator.komapc.workers.dev`)

### Optional: Custom domain or route
- [ ] Dashboard → Workers & Pages → Your Worker → Triggers → Routes
- [ ] Add `yourdomain.com/*` (point DNS to Cloudflare)

### If Deploy Fails
- [ ] Check `wrangler` output for errors
- [ ] Ensure `dist/` exists, and `wrangler.toml` has `[assets] directory = "dist"` and `run_worker_first = true`
- [ ] Ensure CI workflow uses `npm run build` before `wrangler deploy`

---

## 🤖 Step 3: GitHub Actions Setup (Optional)

This enables automatic deployment when you push code changes.

### Get Cloudflare Credentials
- [ ] Go to https://dash.cloudflare.com/profile/api-tokens
- [ ] Click "Create Token"
- [ ] Template: "Edit Cloudflare Workers"
- [ ] Copy API token → **Save securely!**
- [ ] Get Account ID from Dashboard → Overview (right sidebar) → **Save!**

### Get EC2 SSH Key
- [ ] On your local machine:
  ```bash
  cat ~/.ssh/your-ec2-key.pem
  ```
- [ ] Copy entire key including `-----BEGIN...-----` and `-----END...-----`

### Add GitHub Secrets (for CI)
Go to your GitHub repository:
- [ ] Navigate: Settings → Secrets and variables → Actions
- [ ] Click "New repository secret" for each:

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `EC2_SSH_KEY` | Your private key | Full key with BEGIN/END lines |
| `EC2_HOST` | Your EC2 IP | Just the IP, no http:// |
| `EC2_USER` | `ubuntu` | Default for Ubuntu AMI |
| `CLOUDFLARE_API_TOKEN` | Required for Worker deploys | scope: Workers Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Required for Worker deploys | dashboard → overview |

### Verify Workflows Exist
- [ ] Check `.github/workflows/deploy-ec2.yml` exists
- [ ] Check `.github/workflows/cloudflare-pages.yml` exists (optional)

---

## ✅ Testing

### Test 1: Basic Connectivity
```bash
# Test EC2 APy
curl http://YOUR_EC2_IP:2737/listPairs

# Test Cloudflare Worker health endpoint
curl https://YOUR_WORKER_SUBDOMAIN.workers.dev/api/health
```

- [ ] Both return valid JSON responses

### Test 2: Translation API
```bash
curl -X POST https://YOUR_WORKER_SUBDOMAIN.workers.dev/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"Me amas vu","direction":"ido-epo"}'
```

- [ ] Returns: `{"translation":"Mi amas vin",...}`

### Test 3: Web Interface
- [ ] Open in browser: `https://YOUR_WORKER_SUBDOMAIN.workers.dev`
- [ ] See translator interface (purple gradient background)
- [ ] Can enter text in input box
- [ ] Can click "Translate" button
- [ ] Translation appears in output box

### Test 4: All Three Modes

**Text Translation:**
- [ ] Enter: "Me havas granda kato"
- [ ] Click Translate
- [ ] See: "Mi havas granda kato" or similar

**URL Translation:**
- [ ] Switch to "URL Translation" tab
- [ ] Enter: `https://io.wikipedia.org/wiki/Austria`
- [ ] Click Translate
- [ ] See side-by-side original and translated text

**Admin Panel:**
- [ ] Switch to "Admin" tab
- [ ] Enter admin password (if set)
- [ ] Click "Rebuild & Deploy"
- [ ] See status message (Note: Currently returns mock data)

### Test 5: Auto-Deployment (If GitHub Actions Enabled)

**Test Frontend Auto-Deploy:**
- [ ] Make small change to `src/App.tsx` (e.g., change title)
- [ ] Commit and push:
  ```bash
  git add src/App.tsx
  git commit -m "Test auto-deploy"
  git push origin main
  ```
- [ ] Go to GitHub → Actions tab
- [ ] See workflow running (should succeed in ~2 min)
- [ ] Refresh your Pages URL, see changes

**Test EC2 Auto-Deploy (Manual Trigger):**
- [ ] Go to GitHub → Actions
- [ ] Click "Deploy APy to EC2"
- [ ] Click "Run workflow" → Run
- [ ] Wait for completion (~2-3 min)
- [ ] Verify APy still works

---

## 📊 Post-Deployment

### Set Up Monitoring
- [ ] Add EC2 to CloudWatch (AWS Console → CloudWatch → Alarms)
- [ ] Set up alert for high CPU usage (>80% for 5 min)
- [ ] Set up alert for status check failures
- [ ] Monitor Cloudflare Analytics in dashboard

### Cost Monitoring
- [ ] Set up AWS Billing Alert ($20/month threshold)
- [ ] Review Cloudflare usage (should be $0)

### Backup & Security
- [ ] Create EC2 AMI snapshot (AWS Console → EC2 → Actions → Create Image)
- [ ] Store snapshot name and date
- [ ] Change admin password from default
- [ ] Consider restricting EC2 SSH to your IP only (Security Group)

### Documentation
- [ ] Document your EC2 IP address
- [ ] Document your Cloudflare Pages URL
- [ ] Document admin password (store securely!)
- [ ] Save GitHub secrets in password manager
- [ ] Note first deployment date

---

## 🔄 Regular Maintenance

### Weekly
- [ ] Check EC2 disk usage: `df -h`
- [ ] Check APy logs: `docker-compose logs --tail=50 apy-server`
- [ ] Test translation still works

### Monthly
- [ ] Review AWS billing
- [ ] Clean Docker: `docker system prune -f`
- [ ] Update system packages:
  ```bash
  ssh ubuntu@YOUR_EC2_IP
  sudo apt update && sudo apt upgrade -y
  ```

### When Updating Dictionaries
- [ ] Make changes in `apertium-ido-epo`
- [ ] Test locally first
- [ ] Push to GitHub
- [ ] SSH to EC2 and run: `./update-dictionaries.sh`
- [ ] Test translation quality

---

## 🆘 Troubleshooting

### Issue: Translation returns "Error: Could not connect to translation service"

**Check:**
- [ ] EC2 is running (AWS Console)
- [ ] APy container is running: `docker-compose ps`
- [ ] APy responds: `curl http://localhost:2737/listPairs`
- [ ] EC2 security group allows port 2737
- [ ] `APY_SERVER_URL` variable set on your Worker is correct

**Fix:**
```bash
ssh ubuntu@YOUR_EC2_IP
cd /opt/ido-epo-translator
docker-compose restart
```

### Issue: GitHub Actions failing

**Check:**
- [ ] All secrets are set correctly
- [ ] SSH key has no passphrase
- [ ] EC2 allows SSH from GitHub IPs
- [ ] View workflow logs for specific error

### Issue: EC2 out of memory

**Symptoms:**
- Docker build fails
- APy crashes randomly
- System becomes unresponsive

**Fix:**
- [ ] Upgrade to t3.small or larger
- [ ] Add swap space:
  ```bash
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  ```

---

## 📞 Support Resources

- **EC2 Issues:** AWS Console → EC2 → System Log
- **Cloudflare Issues:** Dashboard → Your Project → Deployments
- **GitHub Actions:** Repository → Actions → View logs
- **Apertium Issues:** Check Docker logs on EC2

---

## 🎉 Completion

When you've checked all boxes above, you have:

✅ A live, working Ido-Esperanto translator
✅ Automatic deployments from GitHub
✅ Professional hosting on Cloudflare + EC2
✅ Easy update workflow

**Your URLs:**
- **Live Site:** `https://YOUR_WORKER_SUBDOMAIN.workers.dev` (or your custom domain)
- **APy Server:** `http://YOUR_EC2_IP:2737`
- **GitHub Repo:** `https://github.com/YOUR_USERNAME/vortaro`

**Share your translator with the world! 🌍**

---

## 📝 Deployment Log

Record your deployment details:

```
Deployment Date: _______________
EC2 IP Address: _______________
EC2 Instance ID: _______________
Cloudflare Pages URL: _______________
GitHub Repository: _______________
Admin Password Set: Yes / No
GitHub Actions Enabled: Yes / No

Notes:
_________________________________
_________________________________
_________________________________
```

