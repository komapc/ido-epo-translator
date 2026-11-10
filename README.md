# Ido-Esperanto Translator

Machine translation between Ido and Esperanto, with two engines: rule-based [Apertium](https://apertium.org) (server) and a neural model (beta) that runs in the browser.

**Live:** https://tradukilo.lipu.dev
**Operations guide:** [RUNBOOK.md](RUNBOOK.md)

## Neural engine (beta)

The **Engine: Apertium (rules) | Neural β** switch under the input box selects a second engine:
[komapc/nllb-ido-epo-600m](https://huggingface.co/komapc/nllb-ido-epo-600m), NLLB-200 600M fine-tuned on
Ido–Esperanto sentence pairs. Training and evaluation live in [komapc/ido-epo-llm](https://github.com/komapc/ido-epo-llm).

- **Runs client-side.** `src/neural/nllbWorker.ts` is a module Web Worker that loads
  [transformers.js](https://huggingface.co/docs/transformers.js) 4.3.1 from jsDelivr and the browser build
  [komapc/nllb-ido-multi-onnx](https://huggingface.co/komapc/nllb-ido-multi-onnx) from Hugging Face. Text never
  reaches our server or the APy backend.
- **Two parts, one encoder.** The build has one encoder and two decoders (vocab pruned to 79k, int8): `onnx/`
  (~612 MB: encoder + base NLLB decoder, writes epo/eng/spa/fra/deu) and `onnx_ido/` (~375 MB: the fine-tuned
  decoder that writes Ido). `onnx_ido/` ships a placeholder encoder; the worker swaps in the base encoder
  session. Writing Ido from English/Spanish/French/German pivots through Esperanto. Pairs other than
  Ido↔Esperanto are neural-only and experimental (the language menu next to the swap button).
  `VITE_NEURAL_REMOTE_HOST` points transformers.js at a local mirror for testing.
- **Download is opt-in.** Nothing is fetched until the user clicks *Download model*. The files go to the
  `transformers-cache` Cache Storage. When the neural engine is in use (`translator.engine` in localStorage, or a
  neural-only pair) and every part the direction needs is already cached, it loads without asking. The old
  `nllb-ido-epo-600m-onnx` files are deleted from the cache once the new base part loads. `public/sw.js` ignores cross-origin requests, so the
  service worker does not cache the model a second time.
- **Sentence by sentence.** The model was trained on short sentences, so input is split on sentence punctuation
  and translated one sentence at a time (greedy decoding, `max_new_tokens: 256`).
- **Quality.** On the 1,000-pair held-out test set: chrF 73.0 for the browser build (73.4 full model, beam 4)
  vs 65.2 for Apertium. It can invent words, which is why the UI labels it β and shows no quality score.
- **Files:** `src/neural/protocol.ts` (worker messages, `NEURAL_MODEL_MB`), `nllbWorker.ts`,
  `useNeuralTranslator.ts` (lazy singleton worker + React hook), and the engine switch and help panel in
  `src/components/TextTranslator.tsx`.
- **License:** the model is CC BY-NC 4.0 (training data includes Tatoeba, CC BY 2.0 FR).

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
npm run build  →  wrangler pages deploy dist  →  tradukilo.lipu.dev (Pages project ido-tradukilo)
```

The build copies `_worker.js` into `dist/` (`postbuild` step) so Cloudflare Pages picks it up.

**Required GitHub secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

**Cloudflare Pages env vars** (set in Dashboard → Pages → ido-tradukilo → Settings):

| Variable | Value |
|----------|-------|
| `APY_SERVER_URL` | `https://apy.lipu.dev` |
| `REBUILD_WEBHOOK_URL` | `https://apy.lipu.dev/rebuild` |
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
    TextTranslator.tsx            Translation UI + quality scoring + engine switch
    SeoContent.tsx                Crawlable explainer + FAQ (also prerendered)
  neural/                         In-browser NLLB engine (worker, hook, protocol)
    DictionariesDialog.tsx        Admin: pull/build repos
    RepoVersions.tsx              Footer version display
    Footer.tsx
public/                           Static assets copied to dist/
  yandex_f2140f420535e2c3.html    Yandex Webmaster verification (tradukilo.lipu.dev) — keep
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
