import type { Direction } from '../langs'

/** komapc/nllb-ido-multi-onnx: one encoder and two decoders, downloaded in two parts. */
export const NEURAL_MODEL_ID = 'komapc/nllb-ido-multi-onnx'

/**
 * Folder of the Ido decoder. A new version gets a new folder, because transformers.js caches
 * files by URL and would otherwise keep serving the old decoder to returning visitors.
 */
export const IDO_SUBFOLDER = 'onnx_ido_v2'
/** Earlier Ido decoder folders, deleted from the cache once the new one is in use. */
export const OLD_IDO_SUBFOLDERS = ['onnx_ido']

/**
 * - base: the encoder and the decoder that writes Esperanto, English, Spanish, French
 *   and German (onnx/).
 * - ido: the decoder that writes Ido (IDO_SUBFOLDER). It reuses the base encoder.
 */
export type Part = 'base' | 'ido'
export const PARTS: readonly Part[] = ['base', 'ido']

/** Approximate download size of each part (int8 ONNX), shown before users opt in. */
export const PART_MB: Record<Part, number> = { base: 612, ido: 375 }

/** Parts a direction needs. Writing Ido needs both, because the Ido decoder uses the base encoder. */
export const partsFor = (d: Direction): Part[] => (d.endsWith('-ido') ? ['base', 'ido'] : ['base'])

export type NeuralRequest =
  | { type: 'load'; parts: Part[] }
  | { type: 'translate'; id: number; text: string; direction: Direction }

export type NeuralResponse =
  | { type: 'progress'; part: Part; file: string; loaded: number; total: number }
  | { type: 'ready'; part: Part }
  | { type: 'result'; id: number; text: string }
  | { type: 'error'; id?: number; part?: Part; message: string }
