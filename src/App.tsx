import { useState } from 'react'
import { ArrowLeftRight, Database, Book, Info, Globe } from 'lucide-react'
import TextTranslator from './components/TextTranslator'
import DictionariesDialog from './components/DictionariesDialog'
import RepoVersions from './components/RepoVersions'

type LanguageDirection = 'ido-epo' | 'epo-ido'
type AboutLang = 'io' | 'en' | 'eo'

const App = () => {
  const [direction, setDirection] = useState<LanguageDirection>('ido-epo')
  const [isDictionariesOpen, setIsDictionariesOpen] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [aboutLang, setAboutLang] = useState<AboutLang>('io')

  const handleSwapDirection = () => {
    setDirection(direction === 'ido-epo' ? 'epo-ido' : 'ido-epo')
  }

  const aboutContent = {
    io: {
      title: 'Pri la Tradukilo',
      desc: 'Ca tradukilo posibligas rapida e preciza tradukado inter Ido e Esperanto per la Apertium-mashintradukado-motoro.',
      features: 'Traiti:',
      f1: 'Dudireciona tradukado (Ido ↔ Esperanto)',
      f2: 'Morfologiala analizo di vorti',
      f3: 'Libera kodo e gratuita uzo',
      related: 'Relatanta projekti:',
      dictionary: 'Ido-Esperanto-Vortaro',
      phonomorph: 'EchoDrift (Fonetikala evoluciono)'
    },
    en: {
      title: 'About the Translator',
      desc: 'This translator enables fast and accurate translation between Ido and Esperanto using the Apertium machine translation engine.',
      features: 'Features:',
      f1: 'Two-way translation (Ido ↔ Esperanto)',
      f2: 'Morphological analysis of words',
      f3: 'Open source and free to use',
      related: 'Related projects:',
      dictionary: 'Ido-Esperanto Dictionary',
      phonomorph: 'EchoDrift (Phonetic Shifts)'
    },
    eo: {
      title: 'Pri la Tradukilo',
      desc: 'Ĉi tiu tradukilo ebligas rapidan kaj akuratan tradukadon inter Ido kaj Esperanto per la Apertium-maŝintraduka motoro.',
      features: 'Trajtoj:',
      f1: 'Dudirekta tradukado (Ido ↔ Esperanto)',
      f2: 'Morfologia analizo de vortoj',
      f3: 'Malferma fontkodo kaj libera uzo',
      related: 'Rilataj projektoj:',
      dictionary: 'Ido-Esperanto Vortaro',
      phonomorph: 'EchoDrift (Fonetikaj Ŝanĝoj)'
    }
  }

  const t = aboutContent[aboutLang]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1f3f7a] via-[#1f3f7a] to-[#1f7a3a]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8 relative">
          <div className="absolute right-0 top-0 flex gap-2">
             <a 
              href="https://vortaro.app" 
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-all"
            >
              <Book className="w-4 h-4" />
              Dictionary
            </a>
            <a 
              href="https://phonomorph.app" 
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-all"
            >
              <Globe className="w-4 h-4" />
              PhonoMorph
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
          <button
            onClick={() => setShowAbout(!showAbout)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all"
            aria-label="Show about information"
          >
            <Info className="w-4 h-4" />
            About
          </button>
        </div>

        {/* About Section */}
        {showAbout && (
          <div className="max-w-2xl mx-auto mb-8 bg-white/10 backdrop-blur-md rounded-xl p-6 text-white border border-white/20">
            <div className="flex justify-center gap-2 mb-4">
              {(['io', 'en', 'eo'] as const).map(l => (
                <button 
                  key={l}
                  onClick={() => setAboutLang(l)}
                  className={`px-3 py-1 rounded text-xs uppercase ${aboutLang === l ? 'bg-white/30' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  {l === 'io' ? 'Ido' : l === 'en' ? 'English' : 'Esperanto'}
                </button>
              ))}
            </div>
            <h2 className="text-xl font-bold mb-3">{t.title}</h2>
            <p className="mb-4 text-white/90">{t.desc}</p>
            <h3 className="font-bold mb-2">{t.features}</h3>
            <ul className="list-disc list-inside mb-4 text-white/80">
              <li>{t.f1}</li>
              <li>{t.f2}</li>
              <li>{t.f3}</li>
            </ul>
            <p className="text-sm font-bold mb-2">{t.related}</p>
            <div className="flex flex-col gap-2">
              <a href="https://vortaro.app" className="text-blue-300 hover:text-blue-200 underline flex items-center gap-1">
                <Book className="w-3 h-3" /> {t.dictionary}
              </a>
              <a href="https://phonomorph.app" className="text-blue-300 hover:text-blue-200 underline flex items-center gap-1">
                <Globe className="w-3 h-3" /> {t.phonomorph}
              </a>
            </div>
          </div>
        )}

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
          import RepoVersions from './components/RepoVersions'
          import Footer from './components/Footer'

          type LanguageDirection = 'ido-epo' | 'epo-ido'
          ...
                  {/* Dictionaries Dialog */}
                  <DictionariesDialog
                    isOpen={isDictionariesOpen}
                    onClose={() => setIsDictionariesOpen(false)}
                  />

                  {/* Footer */}
                  <Footer onAboutClick={() => setShowAbout(true)} lang={aboutLang} />
                  </div>
                  </div>
                  )
                  }export default App