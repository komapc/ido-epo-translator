# neural-server

Server-side copy of the in-browser neural engine (`src/neural/nllbWorker.ts`): same model files
(`komapc/nllb-ido-multi-onnx`, `onnx/` + `onnx_ido_v2/`), same int8 weights and greedy decoding,
so it returns the same translations (checked 75/75 against `browser-v2-q8.jsonl`). It serves
visitors who do not want the ~1 GB download. The site reaches it only through the Pages worker
(`/api/neural`), which adds the shared key.

See the header of `server.mjs` for the API and the environment variables. Request text is never
logged.

## Deploy (Google Cloud project `ido-translator`, us-central1)

```sh
# Build in Cloud Build (the global endpoint; --region=us-central1 returned 403 on this project).
gcloud builds submit --project=ido-translator \
  --tag us-central1-docker.pkg.dev/ido-translator/neural/server:vN .

gcloud run deploy neural --project=ido-translator --region=us-central1 \
  --image=us-central1-docker.pkg.dev/ido-translator/neural/server:vN \
  --cpu=2 --memory=3Gi --concurrency=8 --min-instances=0 --max-instances=1 \
  --timeout=300 --cpu-boost \
  --update-env-vars=THREADS=2,MAX_CHARS=1000,BUDGET_SEC=2400,MAX_QUEUE=4
# SHARED_KEY is set once (--update-env-vars=SHARED_KEY=...) and kept by later deploys.
```

- **Memory.** 2 GiB is not enough: on Cloud Run the process peaks at ~2.2 GB and is killed.
- **Concurrency.** It must be above 1. With 1, Cloud Run rejects every request that arrives
  while a long one runs (429); the server queues them itself (`MAX_QUEUE`).
- **Cost ceiling.** `max-instances=1` alone does not cap cost: a client keeping the instance
  busy all month would cost ~$100+. `BUDGET_SEC` does: 2400 s/day × 30 × 2 vCPU = 144k
  vCPU-s and × 3 GiB = 216k GiB-s, inside the free tier (180k vCPU-s, 360k GiB-s per billing
  account per month, request-based billing). The image (~1.5 GB in Artifact Registry) costs about
  $0.10/month above the 0.5 GB free storage. A budget alert is set on the billing account.
- **Measured.** Cold start ~27 s (image + model load); warm, one sentence 0.6–0.9 s;
  1000 characters eng→ido (two models per sentence) ~20 s.
