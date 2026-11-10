import { useEffect, useState } from 'react'
import { ArrowLeftRight, Database, Book, Info, Globe } from 'lucide-react'
import TextTranslator from './components/TextTranslator'
import DictionariesDialog from './components/DictionariesDialog'
import RepoVersions from './components/RepoVersions'
import Footer from './components/Footer'
import SeoContent from './components/SeoContent'
import { LANG_NAME, PARTNERS, isPartner, type Direction, type Partner } from './langs'

const PARTNER_KEY = 'translator.partner'

// About pages exist in io/en/eo; pick by browser language (English by default)
// so the header link and the footer link always agree.
const pickAboutLang = (): 'io' | 'en' | 'eo' => {
  const l = (typeof navigator !== 'undefined' && navigator.language || '').toLowerCase()
  return l.startsWith('eo') ? 'eo' : l.startsWith('io') ? 'io' : 'en'
}
const ABOUT_LANG = pickAboutLang()

const App = () => {
  // Ido is always on one side; `partner` is the other language. Defaults render on the
  // server; a saved partner is applied after mount so hydration matches.
  const [partner, setPartner] = useState<Partner>('epo')
  const [idoFirst, setIdoFirst] = useState(true)
  const [isDictionariesOpen, setIsDictionariesOpen] = useState(false)
  const direction: Direction = idoFirst ? `ido-${partner}` : `${partner}-ido`

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PARTNER_KEY)
      if (saved && isPartner(saved)) setPartner(saved)
    } catch { /* storage disabled */ }
  }, [])

  const choosePartner = (p: Partner) => {
    setPartner(p)
    try { window.localStorage.setItem(PARTNER_KEY, p) } catch { /* storage disabled */ }
  }

  const partnerSelect = (
    <select
      value={partner}
      onChange={(e) => choosePartner(e.target.value as Partner)}
      className="bg-transparent text-white font-medium rounded-md px-1 py-0.5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
      aria-label={idoFirst ? 'Target language' : 'Source language'}
    >
      {PARTNERS.map((p) => (
        <option key={p} value={p} className="text-black">
          {LANG_NAME[p]}{p === 'epo' ? '' : ' (β)'}
        </option>
      ))}
    </select>
  )
  const ido = <span className="text-white font-medium">Ido</span>

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1f3f7a] via-[#1f3f7a] to-[#1f7a3a]">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Top bar: secondary links in normal flow, so they never sit on the title */}
        <nav className="flex flex-wrap justify-center sm:justify-end gap-0.5 sm:gap-1 mb-3 sm:mb-4" aria-label="Site">
          <a href="https://vortaro.lipu.dev" className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 text-white/80 text-[13px] sm:text-sm hover:text-white hover:bg-white/10 rounded-md transition-colors">
            <Book className="w-4 h-4" />
            Vortaro
          </a>
          <a href="https://echodrift.lipu.dev" className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 text-white/80 text-[13px] sm:text-sm hover:text-white hover:bg-white/10 rounded-md transition-colors">
            <Globe className="w-4 h-4" />
            EchoDrift
          </a>
          <button
            onClick={() => setIsDictionariesOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 text-white/80 text-[13px] sm:text-sm hover:text-white hover:bg-white/10 rounded-md transition-colors"
            aria-label="Dictionary sources and versions"
          >
            <Database className="w-4 h-4" />
            Dictionaries
          </button>
          <a href={`/about-${ABOUT_LANG}`} className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 text-white/80 text-[13px] sm:text-sm hover:text-white hover:bg-white/10 rounded-md transition-colors">
            <Info className="w-4 h-4" />
            About
          </a>
        </nav>

        {/* Header */}
        <header className="text-center mb-5 sm:mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">
            Ido ⟷ Esperanto Translator
          </h1>
          <p className="text-white/80 text-sm sm:text-base">
            Powered by Apertium Machine Translation
          </p>
        </header>

        {/* Language Direction Selector */}
        <div className="flex justify-center items-center gap-4 mb-5 sm:mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-2 sm:px-6 sm:py-3 flex items-center gap-4">
            {idoFirst ? ido : partnerSelect}
            <button
              onClick={() => setIdoFirst((v) => !v)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Swap translation direction"
            >
              <ArrowLeftRight className="w-5 h-5 text-white" />
            </button>
            {idoFirst ? partnerSelect : ido}
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
