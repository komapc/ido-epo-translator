/// <reference lib="webworker" />
// Neural (NLLB) Ido<->Esperanto translation, run entirely in the browser.
// The model (komapc/nllb-ido-epo-600m-onnx, ~560 MB, int8) is fetched from the
// Hugging Face Hub on first use and then cached by transformers.js (Cache API).
// transformers.js itself comes from a pinned CDN build rather than npm, so it
// doesn't add ~1 MB of JS and wasm glue to the site bundle for a feature most
// visitors never open.
import type { NeuralRequest, NeuralResponse } from './protocol'

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js'
const MODEL = 'komapc/nllb-ido-epo-600m-onnx'

type Lang = 'ido' | 'epo'
type TensorCtor = new (type: string, data: BigInt64Array, dims: number[]) => unknown
interface Tokenizer {
  convert_tokens_to_ids(t: string): number
  encode(text: string, opts: { add_special_tokens: boolean }): number[]
  decode(ids: unknown, opts: { skip_special_tokens: boolean }): string
  eos_token_id: number
}
interface Seq2Seq { generate(args: Record<string, unknown>): Promise<unknown[]> }
interface ProgressInfo { status: string; file?: string; loaded?: number; total?: number }

const ctx = self as unknown as DedicatedWorkerGlobalScope
const post = (m: NeuralResponse) => ctx.postMessage(m)

let loading: Promise<void> | null = null
let tok: Tokenizer, model: Seq2Seq, Tensor: TensorCtor, LANG: Record<Lang, number>

function load(): Promise<void> {
  loading ??= (async () => {
    const T = await import(/* @vite-ignore */ TRANSFORMERS_URL)
    T.env.allowLocalModels = false
    Tensor = T.Tensor
    const progress_callback = (p: ProgressInfo) => {
      if (p.status === 'progress' && p.file) post({ type: 'progress', file: p.file, loaded: p.loaded ?? 0, total: p.total ?? 0 })
    }
    tok = await T.AutoTokenizer.from_pretrained(MODEL, { progress_callback })
    model = await T.AutoModelForSeq2SeqLM.from_pretrained(MODEL, { dtype: 'q8', device: 'wasm', progress_callback })
    LANG = { ido: tok.convert_tokens_to_ids('ido_Latn'), epo: tok.convert_tokens_to_ids('epo_Latn') }
  })().catch((e) => { loading = null; throw e })
  return loading
}

// The model was trained on sentence pairs, so text is translated sentence by sentence.
const SENT = /(?<=[.!?…])\s+(?=["«„(]?[A-ZĈĜĤĴŜŬ0-9])/u

async function translateSentence(s: string, src: Lang, tgt: Lang): Promise<string> {
  const ids = [LANG[src], ...tok.encode(s, { add_special_tokens: false }).slice(0, 254), tok.eos_token_id]
  const dims = [1, ids.length]
  const out = await model.generate({
    inputs: new Tensor('int64', BigInt64Array.from(ids.map(BigInt)), dims),
    attention_mask: new Tensor('int64', new BigInt64Array(ids.length).fill(1n), dims),
    forced_bos_token_id: LANG[tgt],
    max_new_tokens: 256,
  })
  return tok.decode(out[0], { skip_special_tokens: true }).trim()
}

async function translate(text: string, src: Lang, tgt: Lang): Promise<string> {
  const lines: string[] = []
  for (const line of text.split('\n')) {
    const parts = line.trim() ? line.trim().split(SENT).filter(Boolean) : []
    const done: string[] = []
    for (const s of parts) done.push(await translateSentence(s, src, tgt))
    lines.push(done.join(' '))
  }
  return lines.join('\n')
}

ctx.onmessage = async ({ data }: MessageEvent<NeuralRequest>) => {
  try {
    await load()
    if (data.type === 'load') {
      post({ type: 'ready' })
    } else {
      const [src, tgt] = data.direction === 'ido-epo' ? (['ido', 'epo'] as const) : (['epo', 'ido'] as const)
      post({ type: 'result', id: data.id, text: await translate(data.text, src, tgt) })
    }
  } catch (e) {
    post({ type: 'error', id: data.type === 'translate' ? data.id : undefined, message: String((e as Error)?.message ?? e) })
  }
}
