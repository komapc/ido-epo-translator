export type Direction = 'ido-epo' | 'epo-ido'

export type NeuralRequest =
  | { type: 'load' }
  | { type: 'translate'; id: number; text: string; direction: Direction }

export type NeuralResponse =
  | { type: 'progress'; file: string; loaded: number; total: number }
  | { type: 'ready' }
  | { type: 'result'; id: number; text: string }
  | { type: 'error'; id?: number; message: string }

/** Approximate download size of the browser model (int8 ONNX), shown to users before they opt in. */
export const NEURAL_MODEL_MB = 560
