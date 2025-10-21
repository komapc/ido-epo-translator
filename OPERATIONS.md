## Operations Guide

### Redeploy flow overview
- Frontend/API: Cloudflare Worker serves static assets (ASSETS) and `/api/*`.
- Backend: APy on EC2 (Docker) proxied via Nginx on port 80.

### Deploy Worker (manual)
```bash
cd vortaro
npm run build
npm run cf:deploy
```

Required variables (Dashboard → Worker → Settings → Variables):
- `APY_SERVER_URL = http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com`
- `REBUILD_WEBHOOK_URL = http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/rebuild`

CI deploy: merge to `main` under `vortaro/**` → GitHub Action `deploy-worker.yml` runs `wrangler deploy`.
The build injects `VITE_APP_VERSION` from `package.json`; the Worker can also expose `APP_VERSION` via `/api/health`.

### Update dictionaries / APy on EC2
Trigger from the web UI (Rebuild button) or via direct webhook:
```bash
curl -X POST http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/rebuild
```

Or SSH and run the provided script manually:
```bash
ssh -i ~/.ssh/apertium.pem ubuntu@52.211.137.158
cd /opt/ido-epo-translator
./update-dictionaries.sh
```

If the container is down, start or rebuild:
```bash
docker-compose build
docker-compose up -d
docker ps
curl http://localhost:2737/listPairs
```

Ensure the APy Dockerfile installs `lsb-release` before running the Apertium installer (or switch base image to `ubuntu:22.04`):

```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y lsb-release curl && \
    curl -sS https://apertium.projectjj.com/apt/install-nightly.sh | bash && \
    apt-get update && apt-get install -y apertium-all-dev && \
    rm -rf /var/lib/apt/lists/*
```

### Nginx reverse proxy
`/etc/nginx/sites-available/apy.conf`:
```nginx
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;
  location = /rebuild { proxy_pass http://127.0.0.1:9100/rebuild; }
  location / { proxy_pass http://127.0.0.1:2737; }
}
```
Reload:
```bash
sudo nginx -t && sudo systemctl restart nginx
```

### Health checks
```bash
# Worker
curl https://ido-epo-translator.komapc.workers.dev/api/health

# APy via EC2 hostname
curl http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/listPairs
```

### Common issues
- 403 from Worker → ensure `APY_SERVER_URL` uses hostname on port 80 (no raw IP, no 2737).
- 404 from EC2 port 80 → check Nginx site, remove conflicting sites, reload.
- APy build errors → ensure `lsb-release` is installed before running Apertium installer inside Dockerfile (or use Ubuntu base).

### Versions endpoint
- Worker exposes `/api/versions` that returns app version plus dictionaries versions/dates from GitHub (latest release tag if available, else last commit date/sha) for: `apertium/apertium-ido`, `apertium/apertium-epo`, and `komapc/apertium-ido-epo`.

