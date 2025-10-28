# 🚀 Complete Deployment Guide: Cloudflare Pages + EC2

This guide will help you deploy the Ido-Esperanto translator with **automatic continuous deployment** from GitHub.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [EC2 Setup (One-Time)](#ec2-setup)
3. [Cloudflare Pages Setup (One-Time)](#cloudflare-pages-setup)
4. [GitHub Actions Setup (Automatic CD)](#github-actions-setup)
5. [Testing](#testing)
6. [Updating Code](#updating-code)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Prerequisites

### What You Need:
- ✅ AWS EC2 instance (Ubuntu 20.04+ recommended)
- ✅ Cloudflare account (free tier works)
- ✅ GitHub repository with this code
- ✅ Domain name (optional, can use Cloudflare's subdomain)

### Minimum EC2 Requirements:
- **Instance Type:** t3.small or better (2 GB RAM minimum)
- **Storage:** 20 GB minimum
- **OS:** Ubuntu 22.04 LTS
- **Security Group:** Ports 22 (SSH), 2737 (APy) open

---

## 🖥️ Part 1: EC2 Setup (30 minutes)

### Step 1: SSH into your EC2 instance

```bash
# Replace with your EC2 details
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
```

### Step 2: Run the automated setup script

```bash
# Download the setup script
curl -o setup-ec2.sh https://raw.githubusercontent.com/YOUR_USERNAME/vortaro/main/setup-ec2.sh

# Make it executable
chmod +x setup-ec2.sh

# Run it
./setup-ec2.sh
```

**This script will:**
- ✅ Install Docker and Docker Compose
- ✅ Clone Apertium repositories
- ✅ Build APy Docker container
- ✅ Start the translation service
- ✅ Configure auto-start on reboot

**Wait time:** 10-15 minutes for initial Docker build.

### Step 3: Verify APy is running

```bash
# Check service status
docker-compose ps

# Test translation
curl http://localhost:2737/listPairs

# You should see:
# [{"sourceLanguage":"ido","targetLanguage":"epo"},{"sourceLanguage":"epo","targetLanguage":"ido"}]
```

### Step 4: Note your EC2 public IP

```bash
curl ifconfig.me
```

**Save this IP - you'll need it for Cloudflare configuration!**

### Step 5: Test from external

```bash
# From your local machine, test the EC2 server
curl http://YOUR_EC2_IP:2737/listPairs
```

If this fails, check your EC2 Security Group:
- Go to AWS Console → EC2 → Security Groups
- Add inbound rule: Custom TCP, Port 2737, Source: Anywhere (0.0.0.0/0)

---

## ☁️ Part 2: Cloudflare Pages Setup (15 minutes)

### Step 1: Connect GitHub to Cloudflare Pages

1. **Log in to Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com

2. **Navigate to Pages**
   - Click "Workers & Pages" in the left sidebar
   - Click "Create application" → "Pages" → "Connect to Git"

3. **Authorize GitHub**
   - Select your repository: `vortaro`
   - Click "Begin setup"

### Step 2: Configure Build Settings

```yaml
Production branch: main

Build settings:
  Framework preset: Vite
  Build command: npm run build
  Build output directory: dist
  Root directory: /

Environment variables (Node.js version):
  NODE_VERSION: 18
```

### Step 3: Add Environment Variables

Click "Environment variables" and add:

```bash
# Required
APY_SERVER_URL = http://YOUR_EC2_IP:2737

# Optional (for admin panel)
ADMIN_PASSWORD = your-secure-password-here
```

**Important:** Replace `YOUR_EC2_IP` with the IP from Part 1, Step 4!

### Step 4: Deploy

1. Click "Save and Deploy"
2. Wait 2-3 minutes for build
3. You'll get a URL like: `https://ido-epo-translator.pages.dev`

### Step 5: Configure Functions

Cloudflare Pages will automatically detect the `functions/` directory and deploy your API endpoints.

**Verify Functions are working:**
```bash
curl https://YOUR_PAGES_URL.pages.dev/api/health
```

Should return: `{"status":"ok","timestamp":"..."}`

---

## 🤖 Part 3: GitHub Actions Setup (Auto CD)

### Step 1: Add GitHub Secrets

Go to your GitHub repository:
- Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Value | How to Get |
|-------------|-------|------------|
| `EC2_SSH_KEY` | Your private SSH key | `cat ~/.ssh/your-key.pem` |
| `EC2_HOST` | Your EC2 public IP | From Part 1, Step 4 |
| `EC2_USER` | SSH username | Usually `ubuntu` |
| `CLOUDFLARE_API_TOKEN` | Not required for Cloudflare Pages | — |
| `CLOUDFLARE_ACCOUNT_ID` | Not required for Cloudflare Pages | — |

### Step 2: Create API Token in Cloudflare

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use template: "Edit Cloudflare Workers"
4. Or create custom token with:
   - Permissions: Account → Cloudflare Pages → Edit
   - Account Resources: Include → Your Account
5. Skip token setup; Pages deploys artifacts directly from the build output.

### Step 3: Verify Workflows

The workflows are already in your repo:
- `.github/workflows/deploy-ec2.yml` - Deploys APy to EC2
- `.github/workflows/cloudflare-pages.yml` - Deploys frontend

**They will automatically run when you push to `main` branch!**

---

## ✅ Testing Your Deployment

### Test 1: Frontend Access

Open in browser:
```
https://YOUR_PAGES_URL.pages.dev
```

You should see the translator interface.

### Test 2: Text Translation

1. Enter text: "Me amas vu"
2. Click "Translate"
3. Should show: "Mi amas vin"

### Test 3: URL Translation

1. Switch to "URL Translation" tab
2. Enter: `https://io.wikipedia.org/wiki/Austria`
3. Click "Translate"
4. Should show side-by-side comparison

### Test 4: Admin Panel

1. Switch to "Admin" tab
2. Enter your admin password
3. Click "Rebuild & Deploy"
4. Should show status (currently mock - see implementation notes)

---

## 🔄 How to Update Code (The Easy Way!)

### Updating Frontend (React, UI changes):

```bash
# Make your changes locally
git add .
git commit -m "Updated UI styling"
git push origin main
```

**That's it!** Cloudflare Pages will automatically:
- Detect the push
- Build the project
- Deploy in ~2 minutes
- Update your live site

### Updating Dictionaries (Translation improvements):

```bash
# In apertium-ido-epo directory
cd /home/mark/apertium-ido-epo/apertium-ido-epo

# Make dictionary changes
# ... edit files ...

# Commit and push
git add .
git commit -m "Fixed verb conjugations"
git push origin main
```

**Then two options:**

**Option A: Automatic (via GitHub Actions)**
```bash
# Trigger the EC2 deployment workflow manually
gh workflow run deploy-ec2.yml
```

**Option B: Manual SSH update**
```bash
# SSH into EC2
ssh ubuntu@YOUR_EC2_IP

# Run update script
cd /opt/ido-epo-translator
./update-dictionaries.sh
```

---

## 🔍 Monitoring & Maintenance

### View Cloudflare Pages Logs

1. Go to Cloudflare Dashboard
2. Workers & Pages → Your project
3. View deployments and logs

### View EC2 APy Logs

```bash
# SSH to EC2
ssh ubuntu@YOUR_EC2_IP

# View logs
cd /opt/ido-epo-translator
docker-compose logs -f apy-server
```

### Check Service Health

```bash
# From anywhere
curl http://YOUR_EC2_IP:2737/listPairs

# Or through Cloudflare
curl https://YOUR_PAGES_URL.pages.dev/api/health
```

### Restart APy Service

```bash
# SSH to EC2
ssh ubuntu@YOUR_EC2_IP
cd /opt/ido-epo-translator

# Restart
docker-compose restart

# Or full rebuild
./update-dictionaries.sh
```

---

## 🐛 Troubleshooting

### Issue: "Could not connect to translation service"

**Diagnosis:**
```bash
# Check if APy is running on EC2
ssh ubuntu@YOUR_EC2_IP
docker-compose ps

# Check APy logs
docker-compose logs apy-server
```

**Solutions:**
1. Restart service: `docker-compose restart`
2. Check EC2 security group allows port 2737
3. Verify `APY_SERVER_URL` in Cloudflare Pages env vars

### Issue: Frontend not updating after push

**Solution:**
1. Go to Cloudflare Dashboard → Your Pages project
2. Click "View build log" for latest deployment
3. Check for build errors
4. Try manual redeploy: Deployments → ⋯ → Retry deployment

### Issue: GitHub Actions failing

**Check:**
1. GitHub repo → Actions tab → View workflow run
2. Verify all secrets are set correctly
3. Check EC2 SSH access: `ssh ubuntu@YOUR_EC2_IP`

### Issue: EC2 out of disk space

```bash
# SSH to EC2
ssh ubuntu@YOUR_EC2_IP

# Check disk usage
df -h

# Clean Docker
docker system prune -a -f

# Remove old images
docker image prune -a -f
```

### Issue: APy server not starting

```bash
# Check Docker logs
docker-compose logs apy-server

# Common issues:
# - Out of memory: Upgrade to t3.small or larger
# - Build failed: Check Apertium installation
# - Port conflict: Something else using port 2737

# Nuclear option: Full rebuild
cd /opt/ido-epo-translator
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 💰 Cost Estimate

### Monthly Costs:

| Service | Usage | Cost |
|---------|-------|------|
| **Cloudflare Pages** | Unlimited requests | **$0** (Free) |
| **Cloudflare Functions** | 100k requests/day | **$0** (Free tier) |
| **EC2 t3.small** | 24/7 uptime | **~$15-17/month** |
| **EC2 Data Transfer** | First 100 GB | **$0** |
| **Total** | | **~$15-17/month** |

### Cost Optimization:

1. **Use EC2 Reserved Instance** - Save ~40%
2. **Use EC2 Spot Instance** - Save ~70% (if downtime acceptable)
3. **Use AWS Free Tier** - First year free (t2.micro/t3.micro)

---

## 🎯 Quick Reference Commands

### EC2 Management

```bash
# SSH to server
ssh ubuntu@YOUR_EC2_IP

# Check status
cd /opt/ido-epo-translator && docker-compose ps

# View logs
docker-compose logs -f apy-server

# Restart service
docker-compose restart

# Update dictionaries
./update-dictionaries.sh

# Check disk space
df -h

# Clean Docker
docker system prune -f
```

### Local Development

```bash
# Start local dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy (automatic via git push)
git push origin main
```

### GitHub Actions

```bash
# Trigger EC2 deployment manually
gh workflow run deploy-ec2.yml

# View workflow status
gh run list

# View logs
gh run view
```

---

## 🎉 Success Checklist

After following this guide, you should have:

- ✅ APy server running on EC2 (http://YOUR_EC2_IP:2737)
- ✅ Frontend live on Cloudflare Pages
- ✅ Automatic deployments from GitHub
- ✅ Working text translation
- ✅ Working URL translation
- ✅ Admin panel accessible
- ✅ EC2 auto-restarts on reboot

**Test everything, then celebrate! 🎊**

---

## 📚 Next Steps

1. **Set up monitoring** - CloudWatch for EC2, Cloudflare Analytics for frontend
2. **Configure alerts** - Get notified if APy goes down
3. **Set up backups** - Snapshot EC2 instance weekly
4. **Add custom domain** - Point your domain to Cloudflare Pages
5. **Improve dictionaries** - Continue improving translation quality

---

## 🆘 Need Help?

- **EC2 Issues:** Check AWS Console → EC2 → Instance logs
- **Cloudflare Issues:** Dashboard → Your project → View logs
- **GitHub Actions:** Repository → Actions tab → View runs
- **Translation Issues:** Check Apertium logs on EC2

**Happy translating! 🌍🔤**

