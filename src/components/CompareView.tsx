import { useMemo, useState } from 'react'
import { Copy, CheckCircle, Loader2 } from 'lucide-react'
import { alignSegments, diffPair, agreement, tokenize, type Token } from '../compare/compare'

export type Vote = 'apertium' | 'neural' | 'same'

interface CompareViewProps {
  apertium: string | null // normalized Apertium output, null while pending/unavailable
  neural: string | null
  apertiumPending: boolean
  neuralPending: boolean
  neuralUnavailable: boolean // model not downloaded yet
  vote: Vote | null
  onVote: (v: Vote) => void
}

const TAG = {
  apertium: 'bg-sky-500/20 text-sky-200',
  neural: 'bg-purple-500/25 text-purple-200',
}

function Words({ tokens, highlight }: { tokens: Token[]; highlight: boolean }) {
  return (
    <>
      {tokens.map((t, i) => {
        const cls = [
          t.unknown ? 'text-red-400 font-semibold' : t.genError ? 'text-orange-400 font-semibold' : '',
          highlight && t.differs ? 'bg-amber-300/25 rounded px-0.5 -mx-0.5' : '',
        ].join(' ').trim()
        return (
          <span key={i}>
            {i > 0 && ' '}
            {cls ? <span className={cls}>{t.text}</span> : t.text}
          </span>
        )
      })}
    </>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setDone(true)
        setTimeout(() => setDone(false), 2000)
      }}
      className="p-1 rounded hover:bg-white/15 transition-all"
      aria-label={`Copy the ${label} translation`}
      title={`Copy the ${label} translation`}
    >
      {done ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/80" />}
    </button>
  )
}

const Pending = ({ text }: { text: string }) => (
  <span className="flex items-center gap-2 text-white/60 text-sm"><Loader2 className="w-4 h-4 animate-spin" />{text}</span>
)

/**
 * Both translations, paired sentence by sentence (A = Apertium, N = neural),
 * with the words that differ between them highlighted.
 */
const CompareView = ({ apertium, neural, apertiumPending, neuralPending, neuralUnavailable, vote, onVote }: CompareViewProps) => {
  const [highlight, setHighlight] = useState(true)
  const pairs = useMemo(
    () => (apertium !== null && neural !== null ? alignSegments(apertium, neural).map(([a, b]) => diffPair(a, b)) : null),
    [apertium, neural],
  )
  const agree = pairs ? agreement(pairs) : null

  const header = (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <span className={`px-2 py-0.5 rounded font-semibold ${TAG.apertium}`}>A</span>
      <span className="text-white/80 -ml-2">Apertium</span>
      {apertium && <CopyButton text={apertium.replace(/[*@]/g, '')} label="Apertium" />}
      <span className={`px-2 py-0.5 rounded font-semibold ${TAG.neural}`}>N</span>
      <span className="text-white/80 -ml-2">Neural β</span>
      {neural && <CopyButton text={neural} label="neural" />}
      {pairs && (
        <label className="ml-auto flex items-center gap-2 cursor-pointer text-white/80">
          <input
            type="checkbox"
            checked={highlight}
            onChange={(e) => setHighlight(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600"
          />
          <span>
            Highlight differences
            {agree !== null && <span className="text-white/60"> · {agree}% same</span>}
          </span>
        </label>
      )}
    </div>
  )

  // Until both are in, show each side as a whole so Apertium appears right away.
  const single = (side: 'apertium' | 'neural') => {
    const text = side === 'apertium' ? apertium : neural
    const pending = side === 'apertium' ? apertiumPending : neuralPending
    let body
    if (text !== null) body = <Words tokens={tokenize(text)} highlight={false} />
    else if (pending) body = <Pending text={side === 'neural' ? 'Neural model is translating…' : 'Translating…'} />
    else if (side === 'neural' && neuralUnavailable) body = <span className="text-white/60 text-sm">Download the neural model (button on the left) to see its translation here.</span>
    else body = <span className="text-purple-300/50">Translation will appear here...</span>
    return (
      <div className="flex gap-2 mb-3">
        <span className={`h-fit px-1.5 rounded text-xs font-semibold ${TAG[side]}`}>{side === 'apertium' ? 'A' : 'N'}</span>
        <div className="flex-1">{body}</div>
      </div>
    )
  }

  return (
    <div>
      {header}
      <div className="w-full h-64 p-4 bg-white/5 border border-white/20 rounded-lg text-white overflow-y-auto font-sans leading-7 text-[15px]">
        {pairs ? (
          pairs.map(([a, b], i) => (
            <div key={i} className="mb-3 last:mb-0 pb-3 last:pb-0 border-b last:border-b-0 border-white/10">
              <div className="flex gap-2">
                <span className={`h-fit mt-1 px-1.5 rounded text-xs font-semibold ${TAG.apertium}`}>A</span>
                <div className="flex-1"><Words tokens={a} highlight={highlight} /></div>
              </div>
              <div className="flex gap-2 mt-1">
                <span className={`h-fit mt-1 px-1.5 rounded text-xs font-semibold ${TAG.neural}`}>N</span>
                <div className="flex-1"><Words tokens={b} highlight={highlight} /></div>
              </div>
            </div>
          ))
        ) : (
          <>
            {single('apertium')}
            {single('neural')}
          </>
        )}
      </div>
      {pairs && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/80">
          <span>Which is better?</span>
          {([['apertium', 'Apertium'], ['neural', 'Neural β'], ['same', 'About the same']] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => onVote(v)}
              aria-pressed={vote === v}
              className={`px-3 py-1 rounded-lg transition-all ${
                vote === v ? 'bg-white/25 text-white font-medium' : 'bg-white/5 hover:bg-white/15'
              }`}
            >
              {label}
            </button>
          ))}
          {vote && <span className="text-white/60">Thanks! Only your choice is recorded, not the text.</span>}
        </div>
      )}
    </div>
  )
}

export default CompareView
