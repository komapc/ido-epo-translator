// Helpers for showing the Apertium and neural translations side by side:
// sentence alignment and a word-level diff. Pure functions, no React.

// Same rule the neural worker uses to cut input into sentences (nllbWorker.ts).
const SENT = /(?<=[.!?…])\s+(?=["«„(]?[A-ZĈĜĤĴŜŬ0-9])/u

export const splitSentences = (line: string): string[] =>
  line.trim() ? line.trim().split(SENT).filter(Boolean) : []

/**
 * Pair up the two outputs segment by segment. Tries sentence-level pairs first,
 * falls back to line-level pairs, and finally to one pair for the whole text,
 * so a mismatch never drops text, it only makes the pairs coarser.
 */
export function alignSegments(a: string, b: string): [string, string][] {
  const la = a.split('\n').filter((l) => l.trim())
  const lb = b.split('\n').filter((l) => l.trim())
  if (la.length !== lb.length) return [[a.trim(), b.trim()]]
  const pairs: [string, string][] = []
  for (let i = 0; i < la.length; i++) {
    const sa = splitSentences(la[i])
    const sb = splitSentences(lb[i])
    if (sa.length === sb.length) sa.forEach((s, j) => pairs.push([s, sb[j]]))
    else pairs.push([la[i].trim(), lb[i].trim()])
  }
  return pairs
}

export interface Token {
  text: string // as displayed (Apertium markers stripped)
  unknown: boolean // Apertium "*" marker
  genError: boolean // Apertium "@" marker
  differs: boolean // not part of the common subsequence of the two outputs
}

export const tokenize = (s: string): Token[] =>
  s.split(/\s+/).filter(Boolean).map((raw) => ({
    text: raw.replace(/[*#@]/g, ''),
    unknown: raw.includes('*'),
    genError: raw.includes('@'),
    differs: false,
  }))

// Compare words, not punctuation or case: "Domo," and "domo" are the same word.
const key = (t: Token) => t.text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

const MAX_CELLS = 250_000

/** Word-level diff of one aligned pair: marks the words of each side that the other side lacks. */
export function diffPair(a: string, b: string): [Token[], Token[]] {
  const ta = tokenize(a)
  const tb = tokenize(b)
  const n = ta.length, m = tb.length
  if (n * m > MAX_CELLS) return [ta, tb] // too long to diff cheaply: show without highlights
  const ka = ta.map(key), kb = tb.map(key)
  // LCS table, row-major (n+1) x (m+1)
  const w = m + 1
  const L = new Uint16Array((n + 1) * w)
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      L[i * w + j] = ka[i] === kb[j] ? L[(i + 1) * w + j + 1] + 1 : Math.max(L[(i + 1) * w + j], L[i * w + j + 1])
  ta.forEach((t) => { t.differs = true })
  tb.forEach((t) => { t.differs = true })
  let i = 0, j = 0
  while (i < n && j < m) {
    if (ka[i] === kb[j]) { ta[i].differs = false; tb[j].differs = false; i++; j++ }
    else if (L[(i + 1) * w + j] >= L[i * w + j + 1]) i++
    else j++
  }
  // Pure punctuation tokens ("—", "-") have an empty key; never flag those.
  for (const t of [...ta, ...tb]) if (!key(t)) t.differs = false
  return [ta, tb]
}

/** Share of words (by count, both sides) that are identical, 0..100. */
export function agreement(pairs: [Token[], Token[]][]): number {
  let same = 0, total = 0
  for (const [a, b] of pairs) for (const t of [...a, ...b]) {
    if (!key(t)) continue
    total++
    if (!t.differs) same++
  }
  return total ? Math.round((same / total) * 100) : 100
}
