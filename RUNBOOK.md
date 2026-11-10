# Runbook — Ido-Esperanto Translator

Operational guide for the live system at https://tradukilo.lipu.dev.

---

## Quick health check

```bash
curl https://tradukilo.lipu.dev/api/health
# → {"status":"ok","version":"1.0.1",...}

curl https://tradukilo.lipu.dev/api/versions
# → repo list with currentHash / latestHash for each dictionary
```

---

## Server access

The translation server is whatever `apy.lipu.dev` points at. Since 2026-11-10 that is a GCP
e2-micro VM: project `daatan`, instance `ido-translator`, zone `us-central1-a`, static IP
`35.208.163.193`. To rebuild it on any host or cloud, see [`infra/host/README.md`](infra/host/README.md).

```bash
gcloud --project daatan compute ssh ido-translator --zone us-central1-a
```

Services run as the `apertium` user. Key services:

```bash
sudo systemctl status apy-server        # APy translation server (port 2737)
sudo systemctl status webhook-server    # Rebuild webhook (port 8081)

sudo systemctl restart apy-server       # Restart after dictionary rebuild
sudo journalctl -u apy-server -f        # Live APy logs
sudo journalctl -u webhook-server -f    # Live webhook logs
```

Test APy directly on the server:

```bash
curl http://localhost:2737/listPairs
curl http://localhost:2737/translate -d "q=La+hundo+manjas.&langpair=ido|epo"
curl http://localhost:2737/translate -d "q=La+hundo+manĝas.&langpair=epo|ido"
```

---

## Updating dictionaries from the command line

Use the helper script from your local machine. It runs the same `pull-repo.sh` and `build-repo.sh`
as the Dictionaries dialog. `build-repo.sh` also restarts APy.

```bash
./scripts/host-update.sh ido        # or epo / bilingual / all
```

On the server itself, run `sudo -u apertium /opt/apertium/build-repo.sh <ido|epo|bilingual>`, or
`sudo -u apertium /opt/apertium/rebuild.sh` for all three. A full rebuild takes about 9 minutes on
the e2-micro.

Repo paths on the server:

| Label | Path |
|-------|------|
| `ido` | `/opt/apertium/apertium-ido` |
| `epo` | `/opt/apertium/apertium-epo` |
| `bilingual` | `/opt/apertium/apertium-ido-epo` |

---

## Updating dictionaries via the UI

1. Open https://tradukilo.lipu.dev
2. Click **Dictionaries**
3. For any repo showing "Needs pull": click **Pull Updates**
4. Then click **Build & Install**

The webhook server on the host handles these requests and restarts APy automatically.

**Build & Install** and `POST /api/admin/rebuild` return 202 as soon as the job has *started*, not when it finishes. Follow it with `GET /api/admin/operation` (admin bearer), whose `operation.state` is `running`, `success` or `failed` (with `error` and `logTail`). `operation: null` means the webhook restarted and the result is lost.

`webhook-server-no-docker.js` is not deployed by CI: copy it to `/opt/webhook-server.js` and restart `webhook-server`. Do that **before** merging worker/UI changes that depend on it; the old webhook answers `/operation` with 405.

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

The epo-ido pipeline process has died. Check the server:

```bash
ps aux | grep defunct   # look for zombie [apertium-tagger] or [apertium-pretra]
sudo systemctl restart apy-server
```

If it keeps dying, the mode file or a binary is broken. Rebuild:

```bash
./scripts/host-update.sh bilingual
```

**Root cause (2026-03-19):** `modes.xml` in `apertium-ido-epo` had two bugs:
- `apertium-tagger -g $2 /epo.prob` — APy passes a temp file as `$2`, breaking the tagger
- `apertium-pretransfer -n` — segfaults with tagger-format input in current apertium version
- Fix: replaced tagger with `cg-proc` + removed `-n` flag (commit `563c180`)

### Translation returns 503 (ido→epo)

Rebuild the ido-epo binary:

```bash
./scripts/host-update.sh bilingual
```

### `/api/versions` returns empty / `currentHash: null`

The webhook server isn't reachable. Check:

```bash
ssh ... "sudo systemctl status webhook-server"
curl https://apy.lipu.dev/status   # 401 without the token means it is up
```

Also verify `REBUILD_WEBHOOK_URL` is set correctly in Cloudflare Pages env vars.

### Pull/Build buttons in Dictionaries dialog fail

Check the webhook server logs on the server:

```bash
ssh ... "sudo journalctl -u webhook-server -n 50"
```

The webhook validates requests via `REBUILD_SHARED_SECRET` and **refuses to start** if it is unset on the host. It lives only in `/etc/ido-translator/secrets.env` (mode 600; after editing it run `systemctl restart`, not `reload`). The same value must be a Pages secret, or all admin calls fail at the host level with 401. Only one pull/build/rebuild runs at a time; a concurrent request gets 409.

The worker's `/api/admin/*` routes additionally require `Authorization: Bearer <ADMIN_PASSWORD>` (the Dictionaries dialog prompts for it once per tab). With `ADMIN_PASSWORD` unset they return 503.

### Rebuild fails with HTTP 500 "Unknown error" (`Permission denied` on `.deps`)

The rebuild log in the response ends with `touch: cannot touch '.deps/.d': Permission denied`. The webhook runs as `apertium`, but files under `/opt/apertium/<repo>` are root-owned, left by a manual `sudo /opt/apertium/rebuild.sh`. Fix on the server, then rebuild again:

```bash
sudo chown -R apertium:apertium /opt/apertium
```

Don't run `rebuild.sh` with `sudo` by hand; trigger it through the worker (`POST /api/admin/rebuild` with the admin bearer) or with `sudo -u apertium`. After a rebuild, check that `systemctl show apy-server -p MainPID` changed.

### SSH to the server fails

`gcloud compute ssh` pushes your key into the project metadata, so it needs a `gcloud` login with
access to project `daatan`. If direct SSH is blocked, add `--tunnel-through-iap`. The IP is static,
so stopping and starting the VM is safe.

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
| `APY_SERVER_URL` | APy translation server | `https://apy.lipu.dev` |
| `REBUILD_WEBHOOK_URL` | Host webhook base URL | `https://apy.lipu.dev/rebuild` |
| `APP_VERSION` | Shown in health + footer | `1.0.1` |
| `GITHUB_TOKEN` | (optional) Avoid GitHub rate limits on `/api/versions` | — |
| `ADMIN_PASSWORD` | (secret) Required for `/api/admin/*`; unset = admin disabled | — |
| `REBUILD_SHARED_SECRET` | (secret) Sent to the host webhook; must match `/etc/ido-translator/secrets.env` | — |

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

Note: `epo.prob` (HMM tagger model) on the server is a 118-byte placeholder — do not use `apertium-tagger` in the epo-ido mode. Use `cg-proc` instead.
