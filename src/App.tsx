import { useState } from 'react'
import { ArrowLeftRight, Database, Book, Info, Globe } from 'lucide-react'
import TextTranslator from './components/TextTranslator'
import DictionariesDialog from './components/DictionariesDialog'
import RepoVersions from './components/RepoVersions'
import Footer from './components/Footer'
import SeoContent from './components/SeoContent'

type LanguageDirection = 'ido-epo' | 'epo-ido'

// About pages exist in io/en/eo; pick by browser language (English by default)
// so the header link and the footer link always agree.
const pickAboutLang = (): 'io' | 'en' | 'eo' => {
  const l = (typeof navigator !== 'undefined' && navigator.language || '').toLowerCase()
  return l.startsWith('eo') ? 'eo' : l.startsWith('io') ? 'io' : 'en'
}
const ABOUT_LANG = pickAboutLang()

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
        <header className="text-center mb-8 relative">
          <div className="absolute right-0 top-0 flex gap-2">
             <a 
              href="https://ido-vortaro.pages.dev" 
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-all"
            >
              <Book className="w-4 h-4" />
              Dictionary
            </a>
            <a 
              href="https://echodrift.pages.dev" 
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-all"
            >
              <Globe className="w-4 h-4" />
              EchoDrift
            </a>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Ido ⟷ Esperanto Translator
          </h1>
          <p className="text-white/80">
            Powered by Apertium Machine Translation
          </p>
        </header>

        {/* Admin Controls */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setIsDictionariesOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1f7a3a] hover:bg-[#1a6a33] text-white font-medium rounded-lg transition-all"
            aria-label="Manage dictionaries"
          >
            <Database className="w-4 h-4" />
            Dictionaries
          </button>
          <a
            href={`/about-${ABOUT_LANG}`}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all"
          >
            <Info className="w-4 h-4" />
            About
          </a>
        </div>

        {/* Language Direction Selector */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3 flex items-center gap-4">
            <span className="text-white font-medium">
              {direction === 'ido-epo' ? 'Ido' : 'Esperanto'}
            </span>
            <button
              onClick={handleSwapDirection}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
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

        <SeoContent />

        {/* Dictionaries Dialog */}
        <DictionariesDialog
          isOpen={isDictionariesOpen}
          onClose={() => setIsDictionariesOpen(false)}
        />

        {/* Footer */}
        <Footer lang={ABOUT_LANG} />
        
        {/* Repo Versions (Stats) */}
        <div className="flex justify-center mt-8">
          <RepoVersions />
        </div>
      </div>
    </div>
  )
}

export default App
