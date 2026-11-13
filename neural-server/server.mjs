// Server-side neural translation: the same model, files and decoding as the in-browser
// engine (src/neural/nllbWorker.ts), for visitors who don't want to download ~1 GB.
//
// POST /translate {"text", "src", "tgt"} -> {"text"}; GET /health (answers once the model is loaded).
// Env:
//   MODEL_DIR    folder with the komapc/nllb-ido-multi-onnx layout (default ./model)
//   PORT         default 8080
//   MAX_CHARS    longest accepted text (default 1000)
//   SHARED_KEY   if set, requests must send it in the x-neural-key header (the Cloudflare
//                Worker adds it; the service is not meant to be called directly)
//   THREADS      onnxruntime intra-op threads; set it to the vCPU count (the default, all host
//                cores, oversubscribes a CPU quota and runs ~2x slower)
//   BUDGET_SEC   translation seconds allowed per UTC day (default 2400); then 429 until midnight.
//                This is the cost ceiling: 2400 s/day at 2 vCPU / 3 GiB stays inside the Cloud Run
//                free tier. The counter lives in memory, so it restarts with the instance.
//   MAX_QUEUE    requests allowed to wait behind the running one (default 4); more get 429
// Request text is never logged.
import http from 'node:http'
import path from 'node:path'
import { env, AutoTokenizer, AutoModelForSeq2SeqLM, Tensor } from '@huggingface/transformers'

const MODEL_DIR = path.resolve(process.env.MODEL_DIR ?? './model')
const PORT = Number(process.env.PORT ?? 8080)
const MAX_CHARS = Number(process.env.MAX_CHARS ?? 1000)
const SHARED_KEY = process.env.SHARED_KEY ?? ''
const BUDGET_SEC = Number(process.env.BUDGET_SEC ?? 2400)
const MAX_QUEUE = Number(process.env.MAX_QUEUE ?? 4)
const IDO_SUBFOLDER = 'onnx_ido_v2' // keep in sync with src/neural/protocol.ts
const THREADS = Number(process.env.THREADS ?? 0) // 0 = onnxruntime default (all host cores)
const SESS = THREADS ? { intraOpNumThreads: THREADS, interOpNumThreads: 1 } : {}

// Keep in sync with src/langs.ts and src/compare/compare.ts.
const NLLB = { ido: 'ido_Latn', epo: 'epo_Latn', eng: 'eng_Latn', spa: 'spa_Latn', fra: 'fra_Latn', deu: 'deu_Latn' }
const SENT = /(?<=[.!?…])\s+(?=["«„(¿¡]?[\p{Lu}0-9])/u
const splitSentences = (line) => (line.trim() ? line.trim().split(SENT).filter(Boolean) : [])

const t0 = Date.now()
env.localModelPath = path.dirname(MODEL_DIR)
env.allowRemoteModels = false
const id = path.basename(MODEL_DIR)
const tok = await AutoTokenizer.from_pretrained(id)
const base = await AutoModelForSeq2SeqLM.from_pretrained(id, { dtype: 'q8', session_options: SESS })
const ido = await AutoModelForSeq2SeqLM.from_pretrained(id, { dtype: 'q8', subfolder: IDO_SUBFOLDER, session_options: SESS })
// The Ido folder ships a placeholder encoder that outputs zeros: share the real one.
await ido.sessions.model.release?.()
ido.sessions.model = base.sessions.model
console.log(`model loaded in ${((Date.now() - t0) / 1000).toFixed(1)} s`)

async function generate(model, s, src, tgt) {
  const ids = [tok.convert_tokens_to_ids(NLLB[src]), ...tok.encode(s, { add_special_tokens: false }).slice(0, 254), tok.eos_token_id]
  const dims = [1, ids.length]
  const out = await model.generate({
    inputs: new Tensor('int64', BigInt64Array.from(ids.map(BigInt)), dims),
    attention_mask: new Tensor('int64', new BigInt64Array(ids.length).fill(1n), dims),
    forced_bos_token_id: tok.convert_tokens_to_ids(NLLB[tgt]),
    max_new_tokens: 256,
  })
  return tok.decode(out[0], { skip_special_tokens: true }).trim()
}

// Same routing as the browser: only the Ido decoder writes Ido, and X -> Ido pivots through Esperanto.
async function translateSentence(s, src, tgt) {
  if (tgt !== 'ido') return generate(base, s, src, tgt)
  const eo = src === 'epo' ? s : await generate(base, s, src, 'epo')
  return generate(ido, eo, 'epo', 'ido')
}

async function translate(text, src, tgt) {
  const lines = []
  for (const line of text.split('\n')) {
    const done = []
    for (const s of splitSentences(line)) done.push(await translateSentence(s, src, tgt))
    lines.push(done.join(' '))
  }
  return lines.join('\n')
}

// Inference is CPU-bound: run one request at a time, the others wait here (Cloud Run is
// deployed with concurrency > 1 so that a long request does not make it reject the rest).
let queue = Promise.resolve()
let queued = 0
const serial = (fn) => { const p = queue.then(fn, fn); queue = p.catch(() => {}); return p }

// Daily budget of translation time (see BUDGET_SEC).
let day = '', spentMs = 0
const today = () => new Date().toISOString().slice(0, 10)
const budgetLeft = () => { if (day !== today()) { day = today(); spentMs = 0 } return BUDGET_SEC * 1000 - spentMs }

const send = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true })
  if (req.method !== 'POST' || req.url !== '/translate') return send(res, 404, { error: 'not found' })
  if (SHARED_KEY && req.headers['x-neural-key'] !== SHARED_KEY) return send(res, 403, { error: 'forbidden' })
  let body = ''
  req.setEncoding('utf8')
  req.on('data', (c) => { body += c; if (body.length > MAX_CHARS * 4 + 200) req.destroy() })
  req.on('end', async () => {
    let r
    try { r = JSON.parse(body) } catch { return send(res, 400, { error: 'bad json' }) }
    const { text, src, tgt } = r ?? {}
    if (typeof text !== 'string' || !text.trim()) return send(res, 400, { error: 'empty text' })
    if (text.length > MAX_CHARS) return send(res, 413, { error: `text longer than ${MAX_CHARS} characters`, max: MAX_CHARS })
    if (!(src in NLLB) || !(tgt in NLLB) || src === tgt || (src !== 'ido' && tgt !== 'ido'))
      return send(res, 400, { error: 'unsupported direction' })
    if (queued >= MAX_QUEUE) return send(res, 429, { error: 'busy', retry: 'soon' })
    if (budgetLeft() <= 0) return send(res, 429, { error: 'daily limit reached', retry: 'tomorrow' })
    const start = Date.now()
    queued++
    try {
      const out = await serial(async () => {
        queued--
        if (budgetLeft() <= 0) return null
        const t = Date.now()
        try { return await translate(text, src, tgt) } finally { spentMs += Date.now() - t }
      })
      if (out === null) return send(res, 429, { error: 'daily limit reached', retry: 'tomorrow' })
      console.log(`${src}-${tgt} ${text.length} chars ${Date.now() - start} ms, budget left ${Math.round(budgetLeft() / 1000)} s`)
      send(res, 200, { text: out })
    } catch (e) {
      console.error(`${src}-${tgt} failed: ${e?.message ?? e}`)
      send(res, 500, { error: 'translation failed' })
    }
  })
}).listen(PORT, () => console.log(`listening on :${PORT}`))
