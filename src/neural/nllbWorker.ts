/// <reference lib="webworker" />
// Neural (NLLB) translation between Ido and Esperanto, English, Spanish, French and
// German, run entirely in the browser.
//
// The model (komapc/nllb-ido-multi-onnx, int8) has one encoder and two decoders and
// comes in two parts, each downloaded only when needed and then cached by
// transformers.js (Cache API):
// - base (onnx/, ~612 MB): the encoder and the decoder that writes every language but Ido;
// - ido (onnx_ido_v2/, ~375 MB): the decoder that writes Ido. transformers.js loads it with
//   a tiny placeholder encoder, which is swapped for the real base encoder before use.
// transformers.js itself comes from a pinned CDN build rather than npm, so it
// doesn't add ~1 MB of JS and wasm glue to the site bundle for a feature most
// visitors never open.
import type { NeuralRequest, NeuralResponse, Part } from './protocol'
import { IDO_SUBFOLDER, NEURAL_MODEL_ID, partsFor } from './protocol'
import { NLLB, splitDirection, type Lang } from '../langs'
import { splitSentences } from '../compare/compare'

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js'
// Build-time override for testing against a local mirror of the HF repo layout.
const REMOTE_HOST: string | undefined = import.meta.env.VITE_NEURAL_REMOTE_HOST

type TensorCtor = new (type: string, data: BigInt64Array, dims: number[]) => unknown
interface Tokenizer {
  convert_tokens_to_ids(t: string): number
  encode(text: string, opts: { add_special_tokens: boolean }): number[]
  decode(ids: unknown, opts: { skip_special_tokens: boolean }): string
  eos_token_id: number
}
interface Session { release?: () => Promise<void> }
interface Seq2Seq { generate(args: Record<string, unknown>): Promise<unknown[]>; sessions: Record<string, Session> }
interface ProgressInfo { status: string; file?: string; loaded?: number; total?: number }

const ctx = self as unknown as DedicatedWorkerGlobalScope
const post = (m: NeuralResponse) => ctx.postMessage(m)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let T: any, Tensor: TensorCtor, tok: Tokenizer
const models: Partial<Record<Part, Seq2Seq>> = {}
const loading: Partial<Record<Part, Promise<void>>> = {}

const progressFor = (part: Part) => (p: ProgressInfo) => {
  if (p.status === 'progress' && p.file) post({ type: 'progress', part, file: p.file, loaded: p.loaded ?? 0, total: p.total ?? 0 })
}

function loadPart(part: Part): Promise<void> {
  loading[part] ??= (async () => {
    if (part === 'base') {
      T = await import(/* @vite-ignore */ TRANSFORMERS_URL)
      T.env.allowLocalModels = false
      if (REMOTE_HOST) T.env.remoteHost = REMOTE_HOST
      Tensor = T.Tensor
      tok = await T.AutoTokenizer.from_pretrained(NEURAL_MODEL_ID, { progress_callback: progressFor('base') })
      models.base = await T.AutoModelForSeq2SeqLM.from_pretrained(NEURAL_MODEL_ID, {
        dtype: 'q8', device: 'wasm', progress_callback: progressFor('base'),
      })
    } else {
      await loadPart('base')
      const m: Seq2Seq = await T.AutoModelForSeq2SeqLM.from_pretrained(NEURAL_MODEL_ID, {
        dtype: 'q8', device: 'wasm', subfolder: IDO_SUBFOLDER, progress_callback: progressFor('ido'),
      })
      // The Ido folder ships a placeholder encoder that outputs zeros: share the real one
      // before this part is reported ready, so the placeholder is never used.
      await m.sessions.model.release?.()
      m.sessions.model = models.base!.sessions.model
      models.ido = m
    }
  })().catch((e) => { delete loading[part]; throw e })
  return loading[part]!
}

async function generate(model: Seq2Seq, s: string, src: Lang, tgt: Lang): Promise<string> {
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

// Only the Ido decoder writes Ido; anything else is written by the base decoder.
// Into Ido from a language other than Esperanto goes through Esperanto, which
// scored better than translating directly (eval/explore in ido-epo-llm).
async function translateSentence(s: string, src: Lang, tgt: Lang): Promise<string> {
  if (tgt !== 'ido') return generate(models.base!, s, src, tgt)
  const eo = src === 'epo' ? s : await generate(models.base!, s, src, 'epo')
  return generate(models.ido!, eo, 'epo', 'ido')
}

// The model was trained on sentence pairs, so text is translated sentence by sentence.
async function translate(text: string, src: Lang, tgt: Lang): Promise<string> {
  const lines: string[] = []
  for (const line of text.split('\n')) {
    const done: string[] = []
    for (const s of splitSentences(line)) done.push(await translateSentence(s, src, tgt))
    lines.push(done.join(' '))
  }
  return lines.join('\n')
}

ctx.onmessage = async ({ data }: MessageEvent<NeuralRequest>) => {
  if (data.type === 'load') {
    for (const part of data.parts) {
      try {
        await loadPart(part)
        post({ type: 'ready', part })
      } catch (e) {
        post({ type: 'error', part, message: String((e as Error)?.message ?? e) })
        return
      }
    }
    return
  }
  try {
    // The UI only sends a translation once the parts are loaded; this just waits for them.
    for (const part of partsFor(data.direction)) await loadPart(part)
    const [src, tgt] = splitDirection(data.direction)
    post({ type: 'result', id: data.id, text: await translate(data.text, src, tgt) })
  } catch (e) {
    post({ type: 'error', id: data.id, message: String((e as Error)?.message ?? e) })
  }
}
