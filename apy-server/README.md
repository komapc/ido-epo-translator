# APy Translation Server for Ido-Esperanto

This directory contains the Docker setup for running an Apertium APy (API) server with Ido-Esperanto translation support.

## Quick Start

### Build and Run with Docker Compose

```bash
cd apy-server
docker-compose up -d
```

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

To update to the latest Apertium dictionaries:

```bash
# Execute rebuild script inside the container
docker exec ido-epo-apy /opt/apertium/rebuild.sh

# Restart the container
docker-compose restart
```

## Using Local Development Repositories

If you want to use your local Apertium repositories instead of cloning from GitHub:

1. Copy your local repos to `apy-server/apertium-ido-epo-local/`
2. Rebuild the Docker image

Or use the volume mounts in docker-compose.yml (commented out by default).

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

