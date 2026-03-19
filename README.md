# Ido-Esperanto Translator

Machine translation between Ido and Esperanto, powered by [Apertium](https://apertium.org).

**Live:** https://ido-tradukilo.pages.dev
**Operations guide:** [RUNBOOK.md](RUNBOOK.md)

## Architecture

```
Browser
  │  React SPA (served from Cloudflare Pages)
  │
  ▼
Cloudflare Pages + _worker.js
  │  /api/translate, /api/versions, /api/health
  │  /api/admin/pull-repo, /api/admin/build-repo
  │
  ▼
EC2 eu-west-1 (ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com)
  ├── APy server          — port 2737  (systemd: apy-server.service)
  └── Webhook server      — port 8081  (systemd: webhook-server.service)
        /rebuild, /pull-repo, /build-repo, /status
```

Apertium language data on EC2 (built from source, installed to `/usr/local/share/apertium/`):
- `komapc/apertium-ido` — Ido morphology
- `apertium/apertium-epo` — Esperanto morphology
- `komapc/apertium-ido-epo` — bilingual transfer rules + mode files

## Local development

```bash
npm install
npm run dev          # Vite dev server on :5173 (no API routes)
npm run build        # Build to dist/
npm run cf:dev       # Wrangler dev server with Worker (needs dist/)
```

API routes in dev mode fall back to `http://127.0.0.1:2737` (APy) and `http://127.0.0.1:8081` (webhook).

## Deployment

CI deploys automatically on push to `main` via `.github/workflows/deploy-worker.yml`:

```
npm run build  →  wrangler pages deploy dist  →  ido-tradukilo.pages.dev
```

The build copies `_worker.js` into `dist/` (`postbuild` step) so Cloudflare Pages picks it up.

**Required GitHub secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

**Cloudflare Pages env vars** (set in Dashboard → Pages → ido-tradukilo → Settings):

| Variable | Value |
|----------|-------|
| `APY_SERVER_URL` | `http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:2737` |
| `REBUILD_WEBHOOK_URL` | `http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:8081/rebuild` |
| `APP_VERSION` | current version from `package.json` |

## Updating dictionaries

Via the UI: open the app → **Dictionaries** → Pull / Build per repo.

Via SSH: see [RUNBOOK.md](RUNBOOK.md#updating-dictionaries-via-ssh).

## Project layout

```
_worker.js                        Cloudflare Worker (API + asset serving)
wrangler.toml                     Wrangler config + dev env vars
src/                              React frontend
  App.tsx
  components/
    TextTranslator.tsx            Translation UI + quality scoring
    DictionariesDialog.tsx        Admin: pull/build repos
    RepoVersions.tsx              Footer version display
    Footer.tsx
public/                           Static assets copied to dist/
scripts/
  ec2-update.sh                   SSH helper: pull + rebuild a repo on EC2
.github/workflows/
  deploy-worker.yml               CI: build + deploy to Cloudflare Pages
apy-server/
  Dockerfile                      Reference Docker build (not used in prod)
  docker-compose.yml              For local APy testing
```

## Related repos

- [komapc/apertium-ido](https://github.com/komapc/apertium-ido) — Ido monolingual dictionary
- [komapc/apertium-ido-epo](https://github.com/komapc/apertium-ido-epo) — bilingual rules
- [komapc/vortaro](https://github.com/komapc/vortaro) — Ido-Esperanto dictionary webapp
