import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import TextTranslator from './components/TextTranslator'
import UrlTranslator from './components/UrlTranslator'
import RebuildButton from './components/RebuildButton'
import RepoVersions from './components/RepoVersions'

type TranslationMode = 'text' | 'url'
type LanguageDirection = 'ido-epo' | 'epo-ido'

const App = () => {
  const [mode, setMode] = useState<TranslationMode>('text')
  const [direction, setDirection] = useState<LanguageDirection>('ido-epo')

  const handleSwapDirection = () => {
    setDirection(direction === 'ido-epo' ? 'epo-ido' : 'ido-epo')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1f3f7a] via-[#1f3f7a] to-[#1f7a3a]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Ido ⟷ Esperanto Translator
          </h1>
          <p className="text-white/80">
            Powered by Apertium Machine Translation
          </p>
        </header>

        {/* Mode Selector */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setMode('text')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              mode === 'text'
                ? 'bg-[#1f3f7a] text-white shadow-lg scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            aria-label="Switch to text translation mode"
          >
            Text Translation
          </button>
          <button
            onClick={() => setMode('url')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              mode === 'url'
                ? 'bg-[#1f7a3a] text-white shadow-lg scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            aria-label="Switch to URL translation mode"
          >
            URL Translation
          </button>
          <RebuildButton />
        </div>

        {/* Language Direction Selector */}
        {(
          <div className="flex justify-center items-center gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3 flex items-center gap-4">
              <span className="text-white font-medium">
                {direction === 'ido-epo' ? 'Ido' : 'Esperanto'}
              </span>
              <button
                onClick={handleSwapDirection}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110"
                aria-label="Swap translation direction"
              >
                <ArrowLeftRight className="w-5 h-5 text-white" />
              </button>
              <span className="text-white font-medium">
                {direction === 'ido-epo' ? 'Esperanto' : 'Ido'}
              </span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto">
          {mode === 'text' && <TextTranslator direction={direction} />}
          {mode === 'url' && <UrlTranslator direction={direction} />}
        </main>

        {/* Footer */}
        <footer className="text-center mt-12 text-white/80 text-sm">
          <p>
            Open source translation using Apertium · v{import.meta.env.VITE_APP_VERSION || 'dev'} ·{' '}
            <a
              href="https://github.com/apertium"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              Learn more
            </a>
          </p>
          {/* Versions */}
          <div className="flex justify-center">
            <div className="max-w-4xl">
              <RepoVersions />
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App

