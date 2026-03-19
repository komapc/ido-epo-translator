# Runbook — Ido-Esperanto Translator

Operational guide for the live system at https://ido-tradukilo.pages.dev.

---

## Quick health check

```bash
curl https://ido-tradukilo.pages.dev/api/health
# → {"status":"ok","version":"1.0.1",...}

curl https://ido-tradukilo.pages.dev/api/versions
# → repo list with currentHash / latestHash for each dictionary
```

---

## EC2 access

```bash
ssh -i ~/.ssh/apertium.pem ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com
```

Key services:

```bash
sudo systemctl status apy-server        # APy translation server (port 2737)
sudo systemctl status webhook-server    # Rebuild webhook (port 8081)

sudo systemctl restart apy-server       # Restart after dictionary rebuild
sudo journalctl -u apy-server -f        # Live APy logs
sudo journalctl -u webhook-server -f    # Live webhook logs
```

Test APy directly on EC2:

```bash
curl http://localhost:2737/listPairs
curl http://localhost:2737/translate -d "q=La+hundo+manjas.&langpair=ido|epo"
curl http://localhost:2737/translate -d "q=La+hundo+manĝas.&langpair=epo|ido"
```

---

## Updating dictionaries via SSH

Use the helper script from your local machine:

```bash
# Pull + rebuild one repo
./scripts/ec2-update.sh ido
./scripts/ec2-update.sh epo
./scripts/ec2-update.sh bilingual

# Or do it manually on the server:
ssh -i ~/.ssh/apertium.pem ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com
cd /opt/apertium/apertium-ido-epo   # or apertium-ido / apertium-epo
git pull
sudo rm -f modes/*.mode             # clear old generated mode files
make
sudo make install
sudo systemctl restart apy-server
```

Repo paths on EC2:

| Label | Path |
|-------|------|
| `ido` | `/opt/apertium/apertium-ido` |
| `epo` | `/opt/apertium/apertium-epo` |
| `bilingual` | `/opt/apertium/apertium-ido-epo` |

---

## Updating dictionaries via the UI

1. Open https://ido-tradukilo.pages.dev
2. Click **Dictionaries**
3. For any repo showing "Needs pull": click **Pull Updates**
4. Then click **Build & Install**

The webhook server on EC2 handles these requests and restarts APy automatically.

---

## Deployment

Every push to `main` triggers the CI pipeline:

```
npm run build
  └── vite build  +  postbuild: cp _worker.js dist/_worker.js
wrangler pages deploy dist --project-name ido-tradukilo
```

To deploy manually:

```bash
npm run build
npx wrangler pages deploy dist --project-name ido-tradukilo
```

To update Cloudflare Pages environment variables:

```bash
# Uses wrangler OAuth session (npx wrangler whoami to check)
node -e "
const token = require('fs').readFileSync(
  require('os').homedir()+'/.config/.wrangler/config/default.toml','utf8'
).match(/oauth_token = \"([^\"]+)\"/)[1];

fetch('https://api.cloudflare.com/client/v4/accounts/a4f85dfdebcf5fa0a516297f9c6dc029/pages/projects/ido-tradukilo', {
  method: 'PATCH',
  headers: {'Authorization':'Bearer '+token,'Content-Type':'application/json'},
  body: JSON.stringify({deployment_configs:{production:{env_vars:{
    APP_VERSION: {value: require('./package.json').version}
  }}}})
}).then(r=>r.json()).then(d=>console.log('success:',d.success));
"
```

---

## Troubleshooting

### Translation returns 503 (epo→ido)

The epo-ido pipeline process has died. Check EC2:

```bash
ps aux | grep defunct   # look for zombie [apertium-tagger] or [apertium-pretra]
sudo systemctl restart apy-server
```

If it keeps dying, the mode file or a binary is broken. Rebuild:

```bash
./scripts/ec2-update.sh bilingual
```

**Root cause (2026-03-19):** `modes.xml` in `apertium-ido-epo` had two bugs:
- `apertium-tagger -g $2 /epo.prob` — APy passes a temp file as `$2`, breaking the tagger
- `apertium-pretransfer -n` — segfaults with tagger-format input in current apertium version
- Fix: replaced tagger with `cg-proc` + removed `-n` flag (commit `563c180`)

### Translation returns 503 (ido→epo)

Rebuild the ido-epo binary:

```bash
./scripts/ec2-update.sh bilingual
```

### `/api/versions` returns empty / `currentHash: null`

The webhook server isn't reachable. Check:

```bash
ssh ... "sudo systemctl status webhook-server"
curl http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:8081/
```

Also verify `REBUILD_WEBHOOK_URL` is set correctly in Cloudflare Pages env vars.

### Pull/Build buttons in Dictionaries dialog fail

Check the webhook server logs on EC2:

```bash
ssh ... "sudo journalctl -u webhook-server -n 50"
```

The webhook validates requests via `REBUILD_SHARED_SECRET`. If the secret is missing from Pages env vars, all admin calls will fail at the EC2 level.

### Pages deployment doesn't update the live site

Verify `_worker.js` is in `dist/` after the build:

```bash
npm run build
ls dist/_worker.js   # must exist
```

If missing, check the `postbuild` script in `package.json`:
```json
"postbuild": "node public/generate_sitemap.cjs && cp _worker.js dist/_worker.js"
```

### `appVersion` shows `dev` in health endpoint

`APP_VERSION` is not set in Cloudflare Pages env vars. Set it via the Dashboard or the API call above.

---

## Cloudflare Pages env vars reference

| Variable | Purpose | Example value |
|----------|---------|---------------|
| `APY_SERVER_URL` | APy translation server | `http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:2737` |
| `REBUILD_WEBHOOK_URL` | EC2 webhook base URL | `http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:8081/rebuild` |
| `APP_VERSION` | Shown in health + footer | `1.0.1` |
| `GITHUB_TOKEN` | (optional) Avoid GitHub rate limits on `/api/versions` | — |

---

## Apertium pipeline notes

**ido→epo** pipeline (no tagger needed — Ido has no POS ambiguity):
```
lt-proc (ido.automorf) → apertium-pretransfer -n → lt-proc -b (autobil)
  → apertium-transfer → lt-proc -g (autogen) → lt-proc -p (autopgen)
```

**epo→ido** pipeline (uses CG for Esperanto disambiguation):
```
lt-proc (epo.automorf) → cg-proc (epo-ido.rlx.bin) → apertium-pretransfer
  → lt-proc -b (autobil) → apertium-transfer → lt-proc -g (autogen) → lt-proc -p (autopgen)
```

Note: `epo.prob` (HMM tagger model) on EC2 is a 118-byte placeholder — do not use `apertium-tagger` in the epo-ido mode. Use `cg-proc` instead.
