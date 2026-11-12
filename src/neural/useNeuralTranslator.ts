import { useCallback, useEffect, useRef, useState } from 'react'
import type { Direction } from '../langs'
import { IDO_SUBFOLDER, NEURAL_MODEL_ID, OLD_IDO_SUBFOLDERS, PART_MB, PARTS, partsFor, type NeuralRequest, type NeuralResponse, type Part } from './protocol'

export type NeuralStatus = 'idle' | 'loading' | 'ready' | 'error'

// One worker per page, created only when the user opts in. It is never created
// during SSR/prerender or on a plain visit.
let worker: Worker | null = null
const listeners = new Set<(m: NeuralResponse) => void>()
const partStatus: Record<Part, NeuralStatus> = { base: 'idle', ido: 'idle' }

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./nllbWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<NeuralResponse>) => listeners.forEach((l) => l(e.data))
  }
  return worker
}
const send = (m: NeuralRequest) => getWorker().postMessage(m)

const CACHE = 'transformers-cache'
// Cache keys are the download URLs, e.g. …/nllb-ido-multi-onnx/resolve/main/onnx_ido_v2/decoder_model_merged_quantized.onnx
const PART_FILE: Record<Part, string> = { base: '/onnx/decoder_model_merged_quantized', ido: `/${IDO_SUBFOLDER}/decoder_model_merged_quantized` }

/** Parts transformers.js already cached (a returning visitor), so loading them costs no download. */
export async function cachedParts(): Promise<Part[]> {
  try {
    if (typeof caches === 'undefined' || !(await caches.keys()).includes(CACHE)) return []
    const urls = (await (await caches.open(CACHE)).keys()).map((r) => r.url).filter((u) => u.includes(NEURAL_MODEL_ID))
    return PARTS.filter((p) => urls.some((u) => u.includes(PART_FILE[p])))
  } catch {
    return []
  }
}

/**
 * Drop superseded files once the base part works: the previous Ido–Esperanto-only model (~560 MB)
 * and earlier Ido decoders (~375 MB each).
 */
async function dropOldModel() {
  try {
    if (typeof caches === 'undefined' || !(await caches.keys()).includes(CACHE)) return
    const cache = await caches.open(CACHE)
    const old = ['/komapc/nllb-ido-epo-600m-onnx/', ...OLD_IDO_SUBFOLDERS.map((f) => `/${NEURAL_MODEL_ID}/resolve/main/${f}/`)]
    for (const r of await cache.keys()) if (old.some((o) => r.url.includes(o))) await cache.delete(r)
  } catch { /* best effort */ }
}

const combine = (parts: Part[], st: Record<Part, NeuralStatus>): NeuralStatus =>
  parts.some((p) => st[p] === 'error') ? 'error'
  : parts.some((p) => st[p] === 'loading') ? 'loading'
  : parts.every((p) => st[p] === 'ready') ? 'ready' : 'idle'

/** Neural engine state for one direction: its parts, their download, and translation. */
export function useNeuralTranslator(direction: Direction) {
  const [status, setStatus] = useState<Record<Part, NeuralStatus>>({ ...partStatus })
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const files = useRef(new Map<string, [number, number]>())
  const pending = useRef(new Map<number, { resolve: (s: string) => void; reject: (e: Error) => void }>())
  const nextId = useRef(0)

  useEffect(() => {
    const setPart = (p: Part, s: NeuralStatus) => { partStatus[p] = s; setStatus({ ...partStatus }) }
    const onMsg = (m: NeuralResponse) => {
      if (m.type === 'progress') {
        files.current.set(`${m.part}:${m.file}`, [m.loaded, m.total])
        let loaded = 0, total = 0
        for (const [l, t] of files.current.values()) { loaded += l; total += t }
        setProgress({ loaded, total })
      } else if (m.type === 'ready') {
        setPart(m.part, 'ready'); setError(null)
        if (m.part === 'base') dropOldModel()
      } else if (m.type === 'result') {
        pending.current.get(m.id)?.resolve(m.text); pending.current.delete(m.id)
      } else if (m.type === 'error') {
        if (m.id !== undefined && pending.current.has(m.id)) {
          pending.current.get(m.id)!.reject(new Error(m.message)); pending.current.delete(m.id)
        } else {
          if (m.part) setPart(m.part, 'error')
          setError(m.message)
        }
      }
    }
    listeners.add(onMsg)
    return () => { listeners.delete(onMsg) }
  }, [])

  const needed = partsFor(direction)
  const missing = needed.filter((p) => status[p] !== 'ready')

  /** Download (or load from cache) whatever this direction still needs. */
  const load = useCallback(() => {
    const parts = partsFor(direction).filter((p) => partStatus[p] === 'idle' || partStatus[p] === 'error')
    if (!parts.length) return
    files.current.clear(); setProgress({ loaded: 0, total: 0 })
    for (const p of parts) partStatus[p] = 'loading'
    setStatus({ ...partStatus }); setError(null)
    send({ type: 'load', parts })
  }, [direction])

  const translate = useCallback((text: string, dir: Direction) => new Promise<string>((resolve, reject) => {
    const id = ++nextId.current
    pending.current.set(id, { resolve, reject })
    send({ type: 'translate', id, text, direction: dir })
  }), [])

  return {
    status: combine(needed, status),
    /** MB still to download for this direction (0 when ready). */
    missingMB: missing.reduce((s, p) => s + PART_MB[p], 0),
    /** True when this direction needs the Ido part on top of a base part that is already loaded. */
    onlyIdoMissing: missing.length === 1 && missing[0] === 'ido',
    progress, error, load, translate,
  }
}
