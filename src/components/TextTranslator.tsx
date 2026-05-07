import { useState } from 'react'
import { Loader2, Copy, CheckCircle, Shuffle } from 'lucide-react'
import HistoryPanel from './HistoryPanel'
import { useTranslationHistory, type HistoryEntry } from '../hooks/useTranslationHistory'

interface TextTranslatorProps {
  direction: 'ido-epo' | 'epo-ido'
}

const TextTranslator = ({ direction }: TextTranslatorProps) => {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingArticle, setIsLoadingArticle] = useState(false)
  const [copied, setCopied] = useState(false)
  const [useColorMode, setUseColorMode] = useState(true)
  const { history, addEntry, removeEntry, clearAll } = useTranslationHistory()

  // Replace exotic Unicode spaces with normal spaces; collapse runs of spaces (but preserve newlines)
  const normalizeDisplayWhitespace = (text: string): string => {
    if (!text) return ''
    const unicodeSpaces = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g
    let out = text.replace(unicodeSpaces, ' ')
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
          const hasAmbiguous = segment.includes('#')
          const hasGenError = segment.includes('@')
          if (useColorMode) {
            const clean = segment.replace(/[*#@]/g, '')
            if (!hasUnknown && !hasGenError && !hasAmbiguous) return clean
            let colorClass = 'text-white'
            if (hasUnknown) colorClass = 'text-red-400 font-semibold'
            else if (hasGenError) colorClass = 'text-orange-400 font-semibold'
            else if (hasAmbiguous) colorClass = 'text-yellow-300'
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
      // Persist to history (only when we got a non-error response)
      if (data.translation) {
        addEntry({ direction, input: inputText, output: translation })
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
        <button
          onClick={handleTranslate}
          disabled={isLoading || !inputText.trim()}
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
            {outputText && (
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
        {outputText && (
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
            renderColoredOutput(outputText)
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

