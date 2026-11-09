import { useCallback, useEffect, useRef, useState } from 'react'
import type { Direction, NeuralRequest, NeuralResponse } from './protocol'

export type NeuralStatus = 'idle' | 'loading' | 'ready' | 'error'

// One worker per page, created only when the user opts in. It is never created
// during SSR/prerender or on a plain visit.
let worker: Worker | null = null
const listeners = new Set<(m: NeuralResponse) => void>()
let lastStatus: NeuralStatus = 'idle'

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./nllbWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<NeuralResponse>) => listeners.forEach((l) => l(e.data))
  }
  return worker
}
const send = (m: NeuralRequest) => getWorker().postMessage(m)

/** True when transformers.js already cached the model (a returning visitor), so loading costs no download. */
export async function isNeuralModelCached(): Promise<boolean> {
  try {
    if (typeof caches === 'undefined' || !(await caches.keys()).includes('transformers-cache')) return false
    const keys = await (await caches.open('transformers-cache')).keys()
    return keys.some((r) => r.url.includes('nllb-ido-epo-600m-onnx') && r.url.includes('decoder_model_merged_quantized'))
  } catch {
    return false
  }
}

export function useNeuralTranslator() {
  const [status, setStatus] = useState<NeuralStatus>(lastStatus)
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const files = useRef(new Map<string, [number, number]>())
  const pending = useRef(new Map<number, { resolve: (s: string) => void; reject: (e: Error) => void }>())
  const nextId = useRef(0)

  useEffect(() => {
    const onMsg = (m: NeuralResponse) => {
      if (m.type === 'progress') {
        files.current.set(m.file, [m.loaded, m.total])
        let loaded = 0, total = 0
        for (const [l, t] of files.current.values()) { loaded += l; total += t }
        setProgress({ loaded, total })
      } else if (m.type === 'ready') {
        lastStatus = 'ready'; setStatus('ready'); setError(null)
      } else if (m.type === 'result') {
        pending.current.get(m.id)?.resolve(m.text); pending.current.delete(m.id)
      } else if (m.type === 'error') {
        if (m.id !== undefined && pending.current.has(m.id)) {
          pending.current.get(m.id)!.reject(new Error(m.message)); pending.current.delete(m.id)
        } else {
          lastStatus = 'error'; setStatus('error'); setError(m.message)
        }
      }
    }
    listeners.add(onMsg)
    return () => { listeners.delete(onMsg) }
  }, [])

  const load = useCallback(() => {
    if (lastStatus === 'loading' || lastStatus === 'ready') return
    lastStatus = 'loading'; setStatus('loading'); setError(null)
    send({ type: 'load' })
  }, [])

  const translate = useCallback((text: string, direction: Direction) => new Promise<string>((resolve, reject) => {
    const id = ++nextId.current
    pending.current.set(id, { resolve, reject })
    send({ type: 'translate', id, text, direction })
  }), [])

  return { status, progress, error, load, translate }
}
