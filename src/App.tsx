import { useState } from 'react'
import { ArrowLeftRight, Database } from 'lucide-react'
import TextTranslator from './components/TextTranslator'
import DictionariesDialog from './components/DictionariesDialog'
import RepoVersions from './components/RepoVersions'

type LanguageDirection = 'ido-epo' | 'epo-ido'

const App = () => {
  const [direction, setDirection] = useState<LanguageDirection>('ido-epo')
  const [isDictionariesOpen, setIsDictionariesOpen] = useState(false)

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

        {/* Admin Controls */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setIsDictionariesOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1f7a3a] hover:bg-[#1a6a33] text-white font-medium rounded-lg transition-all"
            aria-label="Manage dictionaries"
          >
            <Database className="w-4 h-4" />
            Dictionaries
          </button>
        </div>

        {/* Language Direction Selector */}
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

        {/* Main Content */}
        <main className="max-w-7xl mx-auto">
          <TextTranslator direction={direction} />
        </main>

        {/* Dictionaries Dialog */}
        <DictionariesDialog
          isOpen={isDictionariesOpen}
          onClose={() => setIsDictionariesOpen(false)}
        />

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