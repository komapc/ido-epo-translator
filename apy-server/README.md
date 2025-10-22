# APy Translation Server for Ido-Esperanto

This directory contains the Docker setup for running an Apertium APy (API) server with Ido-Esperanto translation support.

## 🎯 Deployment Modes

This Dockerfile supports **both local development and production** with the following features:

### Development Mode (Default)
- ✅ **Fast initial build:** Uses precompiled apt packages (~5-7 minutes)
- ✅ **Rebuild capability:** Includes git repos for the rebuild button
- ✅ **Full functionality:** All features work locally
- ✅ **Testing:** Can test rebuild button mechanism

### Production Mode (EC2)
- Uses the same Dockerfile for consistency
- Includes webhook server for remote rebuilds
- Nginx reverse proxy for port 80 access

## Quick Start

### Build and Run with Docker Compose

```bash
cd apy-server
docker-compose up -d
```

**First build:** ~5-7 minutes (includes cloning repos and installing build tools)  
**Rebuilds:** ~2-3 minutes (uses Docker cache)

The server will be available at `http://localhost:2737`

### Build Docker Image Manually

```bash
docker build -t ido-epo-apy .
docker run -p 2737:2737 ido-epo-apy
```

## Testing the Server

### List Available Language Pairs

```bash
curl http://localhost:2737/listPairs
```

### Translate Text (Ido to Esperanto)

```bash
curl -X POST http://localhost:2737/translate \
  -d "q=Me amas vu" \
  -d "langpair=ido|epo"
```

### Translate Text (Esperanto to Ido)

```bash
curl -X POST http://localhost:2737/translate \
  -d "q=Mi amas vin" \
  -d "langpair=epo|ido"
```

## Rebuilding Dictionaries

### Method 1: Via Rebuild Script (Inside Container)

To update to the latest Apertium dictionaries from GitHub:

```bash
# Execute rebuild script inside the container
docker exec ido-epo-apy /opt/apertium/rebuild.sh

# The script will:
# - Pull latest code from GitHub (apertium-ido, apertium-epo, apertium-ido-epo)
# - Rebuild all three repositories
# - Install updated dictionaries
# - Takes ~2-5 minutes

# Restart APy to use new dictionaries
docker-compose restart
```

### Method 2: Via Web UI Rebuild Button

The web interface includes a "Rebuild" button that:
1. Checks for updates before rebuilding (prevents unnecessary rebuilds)
2. Shows real-time progress with elapsed timer
3. Triggers the same rebuild script via webhook
4. Works both locally (via docker exec) and on EC2 (via webhook server)

**Note:** For local testing, the rebuild button will execute the script directly in the container.

## Using Local Development Repositories

### Option 1: Volume Mounts (Fastest for Testing)

Edit `docker-compose.yml` and uncomment the volume mounts section:

```yaml
volumes:
  - ../../../apertium-ido-epo/vendor/apertium-ido:/opt/apertium/apertium-ido-dev:ro
  - ../../../apertium-ido-epo/vendor/apertium-epo:/opt/apertium/apertium-epo-dev:ro
  - ../../../apertium-ido-epo/apertium/apertium-ido-epo:/opt/apertium/apertium-ido-epo-dev:ro
```

**Benefits:**
- Edit dictionaries on your host machine
- Changes immediately visible in container (after APy restart)
- No rebuild needed for testing dictionary changes

**Note:** Adjust paths to match your actual directory structure.

### Option 2: Rebuild Container

If you've made significant changes:

```bash
docker-compose build --no-cache
docker-compose up -d
```

## Deployment to Cloud Run

### Build for Cloud Run

```bash
# Tag for Google Container Registry
docker build -t gcr.io/YOUR-PROJECT-ID/ido-epo-apy .

# Push to GCR
docker push gcr.io/YOUR-PROJECT-ID/ido-epo-apy

# Deploy to Cloud Run
gcloud run deploy ido-epo-apy \
  --image gcr.io/YOUR-PROJECT-ID/ido-epo-apy \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 2737 \
  --memory 1Gi \
  --cpu 1
```

## What's Inside the Container

### Apertium Repositories (via apt packages)
- **apertium-ido** - Ido monolingual dictionary and morphology
- **apertium-epo** - Esperanto monolingual dictionary and morphology  
- **apertium-ido-epo** - Ido↔Esperanto bilingual dictionary and transfer rules

### Apertium Repositories (git clones for rebuild)
Located in `/opt/apertium/`:
- `apertium-ido/` - Git repo from https://github.com/apertium/apertium-ido
- `apertium-epo/` - Git repo from https://github.com/apertium/apertium-epo
- `apertium-ido-epo/` - Git repo from https://github.com/komapc/apertium-ido-epo

### Rebuild Scripts
- `/opt/apertium/rebuild.sh` - Standard rebuild script
- `/opt/apertium/rebuild-self-updating.sh` - Self-updating rebuild script (pulls latest version from GitHub)

### APy Server
- `/opt/apertium-apy/` - Git clone of https://github.com/apertium/apertium-apy
- Provides REST API for translations on port 2737

## Environment Variables

- `APY_TIMEOUT`: Request timeout in seconds (default: 10)
- `APY_PORT`: Port to run the server on (default: 2737)

## Logs

```bash
# View logs
docker-compose logs -f

# Or for running container
docker logs -f ido-epo-apy
```

## Troubleshooting

### Server not starting

Check logs for compilation errors:
```bash
docker-compose logs apy-server
```

### Translation not working

Verify language pairs are installed:
```bash
docker exec ido-epo-apy apertium -l
```

### Out of memory

Increase Docker memory allocation or use smaller dictionary files.

