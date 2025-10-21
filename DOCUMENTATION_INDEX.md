# Documentation Index

**Last Updated:** October 16, 2025

## Quick Navigation

### 🚀 Getting Started
1. **[README.md](README.md)** - Project overview and features
2. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
3. **[OPERATIONS.md](OPERATIONS.md)** - Day-to-day operations guide

### 📋 Deployment & Configuration
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment checklist
- **[CONFIGURATION.md](CONFIGURATION.md)** - Environment variables and configuration
- **[GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md)** - GitHub Actions secrets configuration
- **[CLOUDFLARE_API_TOKEN_SETUP.md](CLOUDFLARE_API_TOKEN_SETUP.md)** - Cloudflare API token setup

### 🏗️ Architecture & Infrastructure
- **[ARCHITECTURE_EXPLAINED.md](ARCHITECTURE_EXPLAINED.md)** - System architecture details
- **[WEBHOOK_SETUP_COMPLETE.md](WEBHOOK_SETUP_COMPLETE.md)** - Webhook infrastructure setup

### 📊 Project Status & History
- **[STATUS.md](STATUS.md)** - Current project status and recent changes
- **[BRANCH_CLEANUP_2025-10-16.md](BRANCH_CLEANUP_2025-10-16.md)** - Branch cleanup history
- **[REBUILD_BUTTON_IMPROVEMENTS.md](REBUILD_BUTTON_IMPROVEMENTS.md)** - Rebuild button feature details

---

## Documentation Organization

### Essential Documentation (Start Here)
The minimum set of docs you need to understand and operate the system:

1. **README.md** - Overview, features, quick architecture
2. **DEPLOYMENT_GUIDE.md** - How to deploy from scratch
3. **OPERATIONS.md** - How to maintain and update

### Reference Documentation
Detailed guides for specific tasks:

- **Configuration & Secrets** - CONFIGURATION.md, GITHUB_SECRETS_SETUP.md, CLOUDFLARE_API_TOKEN_SETUP.md
- **Architecture Details** - ARCHITECTURE_EXPLAINED.md
- **Infrastructure Setup** - WEBHOOK_SETUP_COMPLETE.md

### Checklists
Use these when performing specific tasks:

- **DEPLOYMENT_CHECKLIST.md** - For new deployments or major updates

### Historical/Feature Documentation
Documenting specific features or changes:

- **REBUILD_BUTTON_IMPROVEMENTS.md** - Rebuild button feature spec
- **BRANCH_CLEANUP_2025-10-16.md** - Git branch cleanup record

---

## Common Tasks Quick Links

### Deploy the Application
→ [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) + [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

### Update Dictionary (Trigger Rebuild)
→ [OPERATIONS.md](OPERATIONS.md#rebuild-dictionaries)

### Configure Environment Variables
→ [CONFIGURATION.md](CONFIGURATION.md)

### Set Up GitHub Actions
→ [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md)

### Understand System Architecture
→ [ARCHITECTURE_EXPLAINED.md](ARCHITECTURE_EXPLAINED.md)

### Troubleshoot Webhook Issues
→ [WEBHOOK_SETUP_COMPLETE.md](WEBHOOK_SETUP_COMPLETE.md)

---

## Current Tech Stack

- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **Hosting:** Cloudflare Pages (static assets)
- **API:** Cloudflare Worker (_worker.js)
- **Translation Engine:** Apertium APy server on EC2
- **CI/CD:** GitHub Actions
- **Version Control:** Git + GitHub

---

## Project URLs

- **Production:** https://ido-epo-translator.pages.dev
- **GitHub Repo:** https://github.com/komapc/vortaro
- **EC2 APy Server:** http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com

---

## Recent Major Updates

### October 16, 2025
- ✅ Rebuild button progress indicator added (PR #32)
- ✅ Branch cleanup: deleted 21 merged branches
- ✅ Documentation consolidation

### October 15, 2025
- ✅ Color-coded translation output (PR #30, #31)
- ✅ Deployment regression fixes
- ✅ Enhanced webhook infrastructure (PR #28, #29)
- ✅ CI version and theme improvements (PR #24-27)

### October 14, 2025
- ✅ Simplified rebuild UI (PR #17)
- ✅ Worker-based architecture stabilized
- ✅ Favicon and visual improvements

### October 13, 2025
- ✅ Migration to Cloudflare Worker + EC2 architecture
- ✅ Pages/Workers routing setup
- ✅ Webhook infrastructure for rebuild

---

## Documentation Maintenance

### When to Update This Index
- New major features added
- Architecture changes
- New deployment methods
- Documentation reorganization

### Documentation Standards
- Keep docs up to date with code
- Use clear, concise language
- Include code examples where helpful
- Link between related docs
- Archive obsolete docs, don't just delete

---

## Need Help?

1. Check **[README.md](README.md)** for overview
2. See **[STATUS.md](STATUS.md)** for current state
3. Follow **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** for setup
4. Refer to **[OPERATIONS.md](OPERATIONS.md)** for maintenance

For architecture questions, see **[ARCHITECTURE_EXPLAINED.md](ARCHITECTURE_EXPLAINED.md)**.

