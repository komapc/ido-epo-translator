import { useState } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'

interface UrlTranslatorProps {
  direction: 'ido-epo' | 'epo-ido'
}

const UrlTranslator = ({ direction }: UrlTranslatorProps) => {
  const [url, setUrl] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [useColorMode, setUseColorMode] = useState(true)

  // Replace exotic Unicode spaces with normal spaces; collapse all whitespace to single spaces
  const normalizeDisplayWhitespace = (text: string): string => {
    if (!text) return ''
    const unicodeSpaces = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g
    let out = text.replace(unicodeSpaces, ' ')
    out = out.replace(/\s+/g, ' ')
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

  const qualityScore = calculateQualityScore(translatedText)

  const renderColoredOutput = (text: string) => {
    if (!text) return null
    const normalized = normalizeDisplayWhitespace(text)
    const segments = normalized.split(/(\s+)/)
    return segments.map((segment, index) => {
      if (/^\s+$/.test(segment)) return ' '
      const hasUnknown = segment.includes('*')
      const hasAmbiguous = segment.includes('#')
      const hasGenError = segment.includes('@')
      if (useColorMode) {
        const clean = segment.replace(/[\*#@]/g, '')
        if (!hasUnknown && !hasGenError && !hasAmbiguous) {
          return clean
        }
        let colorClass = 'text-white'
        if (hasUnknown) colorClass = 'text-red-400 font-semibold'
        else if (hasGenError) colorClass = 'text-orange-400 font-semibold'
        else if (hasAmbiguous) colorClass = 'text-yellow-300'
        return <span key={index} className={`${colorClass} inline`}>{clean}</span>
      }
      return segment
    })
  }

  const handleTranslate = async () => {
    if (!url.trim()) return

    setIsLoading(true)
    setError('')
    setOriginalText('')
    setTranslatedText('')

    try {
      const response = await fetch('/api/translate-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          direction: direction,
        }),
      })

      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setOriginalText(data.original || '')
        setTranslatedText(data.translation || '')
      }
    } catch (err) {
      console.error('Translation error:', err)
      setError('Error: Could not connect to translation service')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white mb-4">Enter URL</h2>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://io.wikipedia.org/wiki/..."
            className="flex-1 p-4 bg-white/5 border border-white/20 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Enter URL to translate"
          />
          <button
            onClick={handleTranslate}
            disabled={isLoading || !url.trim()}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center gap-2"
            aria-label="Translate URL"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : (
              'Translate'
            )}
          </button>
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            {error}
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison */}
      {(originalText || translatedText) && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Original Text */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Original ({direction === 'ido-epo' ? 'Ido' : 'Esperanto'})
              </h2>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                aria-label="Open original URL"
              >
                <ExternalLink className="w-5 h-5 text-white" />
              </a>
            </div>
            <div className="p-4 bg-white/5 border border-white/20 rounded-lg max-h-96 overflow-y-auto" data-gramm="false">
              <p className="text-white whitespace-pre-line" data-gramm="false">{originalText}</p>
            </div>
          </div>

          {/* Translated Text */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-white">
                Translation ({direction === 'ido-epo' ? 'Esperanto' : 'Ido'})
              </h2>
              {translatedText && (
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
            {translatedText && (
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
            <div className="p-4 bg-white/5 border border-white/20 rounded-lg max-h-96 overflow-y-auto whitespace-normal break-normal font-sans leading-7 text-[15px]" data-gramm="false">
              {translatedText ? renderColoredOutput(translatedText) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UrlTranslator

