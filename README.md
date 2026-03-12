# Ido-Esperanto Web Translator

A modern web application for translating between Ido and Esperanto, powered by Apertium machine translation. Features text translation, full webpage translation with side-by-side comparison, and real-time dictionary updates.

**🌐 Live Application:** https://ido-tradukilo.pages.dev  
**📚 Documentation:** [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)  
**📊 Project Status:** [STATUS.md](STATUS.md)

## 🌟 Features

### Translation Features
- **Text Translation**: Translate phrases and sentences between Ido and Esperanto
- **Bidirectional**: Switch translation direction with one click
- **Color-coded Output**: Visual quality indicators
  - 🔴 Red: Unknown words (*)
  - 🟠 Orange: Generation errors (@)
  - 🟡 Yellow: Ambiguous translations (#)
- **Quality Score**: Shows percentage of correctly translated words
- **Toggle Display**: Switch between color mode and symbol mode

### Infrastructure Features
- **Dictionary Management**: Comprehensive dictionary management dialog
  - View all repository versions and build dates
  - Individual pull and build operations for each repository
  - Real-time status updates and progress indicators
  - Direct GitHub links for each repository
  - Smart update detection (only rebuild what's changed)
- **Version Display**: Footer shows app version `vX.Y.Z`
- **Dictionary Versions**: Shows latest versions of `apertium-ido`, `apertium-epo`, and `apertium-ido-epo`
- **Modern UI**: Beautiful, responsive interface built with React and TailwindCSS

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│        Cloudflare Worker (Frontend + API)    │
│  - React + TypeScript + TailwindCSS          │
│  - Worker handles /api/* and serves assets   │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│        EC2 (APy Server + Apertium)          │
│  - Dockerized APy HTTP server                │
│  - apertium-ido + apertium-ido-epo           │
│  - Exposes port 2737                         │
└──────────────────────────────────────────────┘
```

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for EC2 build)

## 🚀 Quick Start (Local Development)

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/komapc/ido-epo-translator.git
cd ido-epo-translator

# Install dependencies
npm install
```

### 2. Start the APy Server Locally

```bash
cd apy-server
docker-compose up -d
cd ..
```

Wait for the server to build and start (first time takes 10-15 minutes).

### 3. Start the Development Server

```bash
# In the project root
npm run dev
```

Open http://localhost:5173 in your browser (Vite dev server).

Alternatively, to run the real Worker locally (serves API routes and static assets):

```bash
npm run build
npm run cf:dev
# then open the printed localhost URL and test /api/health
```

## 🔧 Configuration

### Cloudflare Worker Setup

1. Build locally: `npm run build`
2. Deploy: `npm run cf:deploy`
3. Set Worker variables (Dashboard → Settings → Variables):
   - `APY_SERVER_URL = http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com`
   - `REBUILD_WEBHOOK_URL = http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/rebuild`
4. GitHub Actions deploys on push to `main` (`.github/workflows/deploy-worker.yml`).

### Environment Variables

Local development (Wrangler dev): set in `wrangler.toml`

```toml
[env.dev]
[env.dev.vars]
APY_SERVER_URL = "http://localhost:2737"
REBUILD_WEBHOOK_URL = "http://localhost/rebuild"
```

Production (Worker → Settings → Variables):

```text
APY_SERVER_URL = http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com
REBUILD_WEBHOOK_URL = http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/rebuild
```

## 📦 Deployment

### Cloudflare Worker + EC2 (Current Architecture)

1) Deploy APy to EC2

```bash
ssh ubuntu@<YOUR_EC2_IP>
curl -o setup-ec2.sh https://raw.githubusercontent.com/komapc/ido-epo-translator/main/setup-ec2.sh
chmod +x setup-ec2.sh
./setup-ec2.sh
# After build (10–15 min)
curl http://localhost:2737/listPairs
```

2) Configure Cloudflare Worker env

```text
APY_SERVER_URL = http://ec2-<YOUR_EC2_IP with dashes>.<your-aws-region>.compute.amazonaws.com
ADMIN_PASSWORD = <your-strong-secret>
```

3) Deploy Worker with `wrangler deploy` or merge PR to `main`.

## 🔄 Updating Translation Dictionaries

### Option 1: Via Dictionaries Dialog (Recommended)

1. Open the web app
2. Click "Dictionaries" button
3. View repository status and versions
4. Click "Pull Updates" for repositories that need updates
5. Click "Build & Install" for repositories that need rebuilding
6. Restart APy server if needed: `docker-compose restart`

### Option 2: Via Docker (Local Development)

```bash
# Pull updates for specific repository
docker exec ido-epo-apy /opt/apertium/pull-repo.sh ido
docker exec ido-epo-apy /opt/apertium/pull-repo.sh epo
docker exec ido-epo-apy /opt/apertium/pull-repo.sh bilingual

# Build specific repository
docker exec ido-epo-apy /opt/apertium/build-repo.sh ido
docker exec ido-epo-apy /opt/apertium/build-repo.sh epo
docker exec ido-epo-apy /opt/apertium/build-repo.sh bilingual

# Or rebuild all (legacy)
docker exec ido-epo-apy /opt/apertium/rebuild.sh

# Restart the container
docker-compose restart
```

### Option 3: Via EC2 Webhook API

```bash
# Pull specific repository
curl -X POST http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/pull-repo \
  -H "Content-Type: application/json" \
  -H "X-Rebuild-Token: YOUR_SHARED_SECRET" \
  -d '{"repo": "ido"}'

# Build specific repository
curl -X POST http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/build-repo \
  -H "Content-Type: application/json" \
  -H "X-Rebuild-Token: YOUR_SHARED_SECRET" \
  -d '{"repo": "ido"}'

# Full rebuild (legacy)
curl -X POST http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/rebuild \
  -H "Content-Type: application/json" \
  -H "X-Rebuild-Token: YOUR_SHARED_SECRET"

# Check rebuild logs on EC2
ssh ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com
sudo tail -f /var/log/apertium-rebuild.log
```

## 🧪 Testing

### Test APy Server

```bash
# List available language pairs
curl http://localhost:2737/listPairs

# Translate Ido to Esperanto
curl -X POST http://localhost:2737/translate \
  -d "q=Me amas vu" \
  -d "langpair=ido|epo"

# Translate Esperanto to Ido
curl -X POST http://localhost:2737/translate \
  -d "q=Mi amas vin" \
  -d "langpair=epo|ido"
```

### Test Worker locally

Use Wrangler dev:

```bash
# Health
curl http://127.0.0.1:8787/api/health

# Translate
curl -X POST http://127.0.0.1:8787/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"Me amas vu","direction":"ido-epo"}'
```

## 📁 Project Structure

```
ido-epo-translator/
├── src/                      # React frontend source
│   ├── components/           # React components
│   │   ├── TextTranslator.tsx
│   │   ├── UrlTranslator.tsx
│   │   ├── RebuildButton.tsx
│   │   └── RepoVersions.tsx
│   ├── App.tsx               # Main app component
│   ├── main.tsx              # Entry point
│   └── index.css             # Tailwind styles
├── _worker.js                # Cloudflare Worker (API + static assets)
├── wrangler.toml             # Wrangler config (assets + dev env vars)
├── package.json              # Scripts; build injects VITE_APP_VERSION
├── .github/workflows/deploy-worker.yml  # CI deploy on push to main
├── setup-ec2.sh              # EC2 bootstrap script (APy + Nginx)
├── OPERATIONS.md             # Ops guide (rebuild, health, Nginx)
├── DEPLOYMENT_CHECKLIST.md   # End-to-end deployment checklist
└── README.md                 # This file
```

## 🔢 Versioning & Versions

- UI footer shows `v{VITE_APP_VERSION}`. The build sets this from `package.json`.
- To bump: run `npm version patch` (or minor/major), commit, push to main.
- API health (`/api/health`) returns `{ version: APP_VERSION }` if you set `APP_VERSION` as a Worker variable; otherwise it may show `dev`.
- `/api/versions` returns latest tag or last commit date/sha for:
  - `apertium/apertium-ido` (Ido)
  - `apertium/apertium-epo` (Esperanto)
  - `komapc/apertium-ido-epo` (bilingual)

## ℹ️ Notes

- The Worker must call the APy server via EC2 hostname on port 80 (Nginx proxy). Direct calls to non-standard ports or raw IPs can fail from Workers.
- Ensure `lsb-release` is installed inside the APy Docker build before running the Apertium installer; alternatively use `ubuntu:22.04` as a base image.

## 🛠️ Development

### Frontend Development

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

## 🐛 Troubleshooting

### APy Server Won't Start

Check Docker logs:
```bash
docker-compose logs -f apy-server
```

Common issues:
- Compilation errors: Check Apertium dependency versions
- Out of memory: Increase Docker memory allocation
- Port conflict: Change port in docker-compose.yml

### Translation Returns Empty

1. Verify APy server is running: `curl http://localhost:2737/listPairs`
2. Check if language pair is installed
3. Test with simple text first

### Deployment Issues

1. **GitHub Actions failing?** Check workflow logs in GitHub
2. **Worker not deploying?** Verify Wrangler is authenticated: `wrangler whoami`
3. **EC2 connection issues?** Check security group rules (ports 80, 22, 9100)

## 📚 Resources

### Apertium
- [Apertium Documentation](https://wiki.apertium.org)
- [Apertium APy Repository](https://github.com/apertium/apertium-apy)
- [Ido Dictionary](https://github.com/komapc/apertium-ido)
- [Ido-Esperanto Bilingual](https://github.com/komapc/apertium-ido-epo)

### Cloudflare
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Project Documentation
- [Full Documentation Index](DOCUMENTATION_INDEX.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Operations Guide](OPERATIONS.md)
- [Current Status](STATUS.md)

## 📄 License

This project uses Apertium, which is licensed under the GPL. See individual component licenses for details.

## 🤝 Contributing

Contributions to the translation dictionaries should be made to:
- [apertium-ido](https://github.com/apertium/apertium-ido)
- [apertium-ido-epo](https://github.com/apertium/apertium-ido-epo)

For web app improvements, please open issues or pull requests in this repository.

---

**Vortaro** - Making Ido and Esperanto translation accessible to everyone.
# Trigger redeploy test - Wed Oct 22 12:57:53 PM IDT 2025
