import { useEffect, useState } from 'react'
import { Loader2, Copy, CheckCircle, Shuffle, Download, HelpCircle } from 'lucide-react'
import HistoryPanel from './HistoryPanel'
import { useTranslationHistory, type HistoryEntry } from '../hooks/useTranslationHistory'
import { useNeuralTranslator, isNeuralModelCached } from '../neural/useNeuralTranslator'
import { NEURAL_MODEL_MB } from '../neural/protocol'

type Engine = 'apertium' | 'neural'
const ENGINE_KEY = 'translator.engine'

interface TextTranslatorProps {
  direction: 'ido-epo' | 'epo-ido'
}

const TextTranslator = ({ direction }: TextTranslatorProps) => {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingArticle, setIsLoadingArticle] = useState(false)
  const [showEngineHelp, setShowEngineHelp] = useState(false)
  const [copied, setCopied] = useState(false)
  const [useColorMode, setUseColorMode] = useState(true)
  const { history, addEntry, removeEntry, clearAll } = useTranslationHistory()
  // 'apertium' on first render so SSR markup and hydration match; the saved choice is applied after mount.
  const [engine, setEngine] = useState<Engine>('apertium')
  const [outputEngine, setOutputEngine] = useState<Engine>('apertium')
  const neural = useNeuralTranslator()

  useEffect(() => {
    let saved: string | null = null
    try { saved = window.localStorage.getItem(ENGINE_KEY) } catch { /* storage disabled */ }
    if (saved !== 'neural') return
    setEngine('neural')
    // A returning visitor with the model already cached gets it loaded without asking again.
    isNeuralModelCached().then((cached) => { if (cached) neural.load() })
  }, [neural.load])

  const chooseEngine = (e: Engine) => {
    setEngine(e)
    try { window.localStorage.setItem(ENGINE_KEY, e) } catch { /* storage disabled */ }
  }
  const neuralBlocked = engine === 'neural' && neural.status !== 'ready'

  // Replace exotic Unicode spaces with normal spaces; collapse runs of spaces (but preserve newlines)
  const normalizeDisplayWhitespace = (text: string): string => {
    if (!text) return ''
    const unicodeSpaces = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g
    let out = text.replace(unicodeSpaces, ' ')
    // Drop the unreliable Apertium "#" generation-failure marker. It is a mix
    // of false positives on correct closed-class words (e.g. La<det>, Kiu<prn>,
    // whose echoed surface form is actually right) and honest gaps lt-proc
    // cannot tell apart, so we hide it everywhere while keeping "*" (unknown)
    // and "@" (bidix gap). This used to be done by a `sed s/#//g` stage inside
    // the apertium mode; it now lives here so the shared, upstreamable
    // ido-epo mode stays a pure apertium/lttoolbox/cg pipeline.
    out = out.replace(/#/g, '')
    // Collapse multiple spaces (not newlines) to a single space
    out = out.replace(/[ \t]+/g, ' ')
    // Collapse more than two consecutive newlines to two
    out = out.replace(/\n{3,}/g, '\n\n')
    return out.trim()
  }

  // Calculate translation quality score (percentage of correctly translated words)
  // Only count * (unknown) words as errors
  const calculateQualityScore = (text: string): number => {
    text = normalizeDisplayWhitespace(text)
    if (!text.trim()) return 0
    const words = text.split(/\s+/)
    const totalWords = words.length
    const errorWords = words.filter(word => word.includes('*')).length
    const correctWords = totalWords - errorWords
    return Math.round((correctWords / totalWords) * 100)
  }

  const qualityScore = calculateQualityScore(outputText)

  // Parse output text and apply color coding
  const renderColoredOutput = (text: string) => {
    if (!text) return null
    const normalized = normalizeDisplayWhitespace(text)
    // Split into paragraphs first, then process words within each
    const paragraphs = normalized.split(/\n\n+/)
    return paragraphs.map((para, pIdx) => {
      const lines = para.split(/\n/)
      const renderedLines = lines.map((line, lIdx) => {
        const segments = line.split(/(\s+)/)
        const renderedSegments = segments.map((segment, sIdx) => {
          if (/^\s+$/.test(segment)) return ' '
          const hasUnknown = segment.includes('*')
          const hasGenError = segment.includes('@')
          if (useColorMode) {
            const clean = segment.replace(/[*#@]/g, '')
            if (!hasUnknown && !hasGenError) return clean
            let colorClass = 'text-white'
            if (hasUnknown) colorClass = 'text-red-400 font-semibold'
            else if (hasGenError) colorClass = 'text-orange-400 font-semibold'
            return <span key={sIdx} className={`${colorClass} inline`}>{clean}</span>
          }
          return segment
        })
        return <span key={lIdx}>{renderedSegments}{lIdx < lines.length - 1 && <br />}</span>
      })
      return <p key={pIdx} className="mb-2 last:mb-0">{renderedLines}</p>
    })
  }

  const handleRandomArticle = async () => {
    setIsLoadingArticle(true)
    try {
      const wiki = direction === 'ido-epo' ? 'io' : 'eo'
      const res = await fetch(`https://${wiki}.wikipedia.org/api/rest_v1/page/random/summary`)
      const data = await res.json()
      const text = [data.title, data.extract].filter(Boolean).join('\n\n')
      setInputText(text)
      setOutputText('')
    } catch (error) {
      console.error('Wikipedia fetch error:', error)
    } finally {
      setIsLoadingArticle(false)
    }
  }

  const handleTranslate = async () => {
    if (!inputText.trim()) return

    setIsLoading(true)
    if (engine === 'neural') {
      try {
        const translation = await neural.translate(inputText, direction)
        setOutputText(translation)
        setOutputEngine('neural')
        addEntry({ direction, input: inputText, output: translation })
        ;(window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', 'translate', {
          direction,
          chars: inputText.length,
          engine: 'neural',
        })
      } catch (error) {
        console.error('Neural translation error:', error)
        setOutputText('Error: neural translation failed')
        setOutputEngine('neural')
      } finally {
        setIsLoading(false)
      }
      return
    }
    try {
      // Use API endpoint (Cloudflare Worker for Pages, local for dev)
      const apiUrl = import.meta.env.VITE_API_URL || '/api/translate'
      const endpoint = apiUrl.startsWith('http') ? apiUrl : `${apiUrl}`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          direction: direction,
        }),
      })

      const data = await response.json()
      const translation = data.translation || 'Translation failed'
      setOutputText(translation)
      setOutputEngine('apertium')
      // Persist to history (only when we got a non-error response)
      if (data.translation) {
        addEntry({ direction, input: inputText, output: translation })
        // GA4 (only live after consent): direction and size, never the text itself
        ;(window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', 'translate', {
          direction,
          chars: inputText.length,
          engine: 'apertium',
        })
      }
    } catch (error) {
      console.error('Translation error:', error)
      setOutputText('Error: Could not connect to translation service')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(outputText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRestore = (entry: HistoryEntry) => {
    if (entry.direction !== direction) {
      // Direction switch is handled by the parent via tab; for now just note it.
      // Restoring the input means the user can re-translate (or hit translate again).
    }
    setInputText(entry.input)
    setOutputText(entry.output)
  }

  return (
    <>
    <div className="grid md:grid-cols-2 gap-6">
      {/* Input Panel */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            {direction === 'ido-epo' ? 'Ido' : 'Esperanto'} Input
          </h2>
          <button
            onClick={handleRandomArticle}
            disabled={isLoadingArticle}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-all"
            title={`Load random ${direction === 'ido-epo' ? 'Ido' : 'Esperanto'} Wikipedia article`}
          >
            {isLoadingArticle ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Shuffle className="w-4 h-4" />
            )}
            Random article
          </button>
        </div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Enter ${direction === 'ido-epo' ? 'Ido' : 'Esperanto'} text here...`}
          className="w-full h-64 p-4 bg-white/5 border border-white/20 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          data-gramm="false"
          aria-label="Input text to translate"
        />
        <div className="mt-4 flex items-center gap-2 text-sm" role="radiogroup" aria-label="Translation engine">
          <span className="text-white/70">Engine:</span>
          {([['apertium', 'Apertium (rules)'], ['neural', 'Neural β']] as const).map(([value, label]) => (
            <button
              key={value}
              role="radio"
              aria-checked={engine === value}
              onClick={() => chooseEngine(value)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                engine === value ? 'bg-white/25 text-white font-medium' : 'bg-white/5 text-white/70 hover:bg-white/15'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setShowEngineHelp((v) => !v)}
            aria-expanded={showEngineHelp}
            aria-controls="engine-help"
            aria-label="What is the difference between the engines?"
            title="What is the difference between the engines?"
            className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
        {showEngineHelp && (
          <div id="engine-help" className="mt-3 p-3 rounded-lg bg-white/5 border border-white/15 text-sm text-white/85 space-y-2">
            <p>
              <b>Apertium (rules)</b> runs on our server. It uses a dictionary and grammar rules, so it is fast and
              predictable, and words it does not know are marked with <code>*</code>. It can sound stiff.
            </p>
            <p>
              <b>Neural β</b> is NLLB-200 (600M), fine-tuned on Ido–Esperanto sentence pairs. It runs entirely in your
              browser after a one-time download of about {NEURAL_MODEL_MB} MB, so your text never leaves your device.
              On our held-out test set it scores chrF 73 against 65 for Apertium. It works
              best on everyday sentences; it can make up or change words, so check names, numbers and rare terms.
              It translates one sentence at a time, and the first run after loading is slower.
            </p>
            <p>
              <a className="underline" href="/about-en#neural">More about the neural engine</a> ·{' '}
              <a className="underline" href="https://huggingface.co/komapc/nllb-ido-epo-600m" target="_blank" rel="noopener noreferrer">
                model card
              </a>
            </p>
          </div>
        )}
        {engine === 'neural' && neural.status !== 'ready' && (
          <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/15 text-sm text-white/85">
            {neural.status === 'loading' ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {neural.progress.total
                    ? `Downloading the model… ${Math.round(neural.progress.loaded / 1e6)} / ${Math.round(neural.progress.total / 1e6)} MB`
                    : 'Starting…'}
                </div>
                <progress
                  className="w-full h-2 accent-purple-500"
                  max={1}
                  value={neural.progress.total ? neural.progress.loaded / neural.progress.total : 0}
                />
              </>
            ) : (
              <>
                <p className="mb-2">
                  The neural translator (NLLB-200 fine-tuned for Ido) runs <b>in your browser</b>, so your text is not
                  sent to any server. It needs a one-time download of about {NEURAL_MODEL_MB} MB, which your browser
                  then caches. It is often more fluent than Apertium, but it can make up words, so check names and numbers.{' '}
                  <a className="underline" href="/about-en#neural">Learn more</a>
                </p>
                {neural.status === 'error' && <p className="mb-2 text-orange-300">Loading failed: {neural.error}</p>}
                <button
                  onClick={neural.load}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download model (~{NEURAL_MODEL_MB} MB)
                </button>
              </>
            )}
          </div>
        )}
        <button
          onClick={handleTranslate}
          disabled={isLoading || !inputText.trim() || neuralBlocked}
          className="mt-4 w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          aria-label="Translate text"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Translating...
            </>
          ) : (
            'Translate'
          )}
        </button>
      </div>

      {/* Output Panel */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">
              {direction === 'ido-epo' ? 'Esperanto' : 'Ido'} Translation
            </h2>
            {outputText && outputEngine === 'neural' && (
              <div
                className="px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-200"
                title="Translated by the neural model in your browser"
              >
                Neural β
              </div>
            )}
            {outputText && outputEngine === 'apertium' && (
              <div 
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  qualityScore >= 95 
                    ? 'bg-green-500/20 text-green-300' 
                    : qualityScore >= 80 
                    ? 'bg-yellow-500/20 text-yellow-300' 
                    : 'bg-red-500/20 text-red-300'
                }`}
                title="Translation quality: percentage of words correctly translated (excludes red/unknown words)"
              >
                Score: {qualityScore}%
              </div>
            )}
          </div>
          {outputText && (
            <button
              onClick={handleCopy}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
              aria-label="Copy translation to clipboard"
            >
              {copied ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-white" />
              )}
            </button>
          )}
        </div>
        {outputText && outputEngine === 'apertium' && (
          <div className="mb-3 flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-white/80 text-sm">
              <input
                type="checkbox"
                checked={!useColorMode}
                onChange={(e) => setUseColorMode(!e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500"
                aria-label="Toggle symbol display mode"
              />
              Show symbols (*#@)
            </label>
            <div className="ml-auto flex items-center gap-3 text-xs text-white/70">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-400 rounded"></span>
                Unknown
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-orange-400 rounded"></span>
                Gen. Error
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-yellow-300 rounded"></span>
                Ambiguous
              </span>
            </div>
          </div>
        )}
        <div className="w-full h-64 p-4 bg-white/5 border border-white/20 rounded-lg text-white overflow-y-auto whitespace-normal break-normal font-sans leading-7 text-[15px]" data-gramm="false">
          {outputText ? (
            outputEngine === 'neural'
              ? <p className="whitespace-pre-wrap">{outputText}</p>
              : renderColoredOutput(outputText)
          ) : (
            <span className="text-purple-300/50">Translation will appear here...</span>
          )}
        </div>
      </div>
    </div>
    <HistoryPanel
      entries={history.filter(e => e.direction === direction)}
      onRestore={handleRestore}
      onRemove={removeEntry}
      onClear={clearAll}
    />
    </>
  )
}

export default TextTranslator

