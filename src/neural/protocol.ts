import type { Direction } from '../langs'

/** komapc/nllb-ido-multi-onnx: one encoder and two decoders, downloaded in two parts. */
export const NEURAL_MODEL_ID = 'komapc/nllb-ido-multi-onnx'

/**
 * - base: the encoder and the decoder that writes Esperanto, English, Spanish, French
 *   and German (onnx/).
 * - ido: the decoder that writes Ido (onnx_ido/). It reuses the base encoder.
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
