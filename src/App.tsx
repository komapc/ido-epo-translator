import { useEffect, useState } from 'react'
import { ArrowLeftRight, Book, Info } from 'lucide-react'
import TextTranslator from './components/TextTranslator'
import DictionariesDialog from './components/DictionariesDialog'
import Footer from './components/Footer'
import SeoContent from './components/SeoContent'
import { LANG_NAME, PARTNERS, isPartner, pairFromHash, type Direction, type Partner } from './langs'

const PARTNER_KEY = 'translator.partner'

// About pages exist in io/en/eo; pick by browser language (English by default).
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
    // Landing pages link to /#ido-eng, /#eng-ido etc. to open that pair. A hash, not a
    // query parameter: the worker reads ?dir= as an Apertium (Esperanto) direction.
    // It wins over the saved partner for this visit and is then dropped from the URL,
    // so a later reload doesn't undo a choice made in the menu.
    const pair = pairFromHash(window.location.hash)
    if (pair) {
      setPartner(pair.partner)
      setIdoFirst(pair.idoFirst)
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  const choosePartner = (p: Partner) => {
    setPartner(p)
    try { window.localStorage.setItem(PARTNER_KEY, p) } catch { /* storage disabled */ }
  }

  const partnerSelect = (
    <select
      value={partner}
      onChange={(e) => choosePartner(e.target.value as Partner)}
      className="bg-transparent text-white font-medium rounded-md px-2 py-1 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
      aria-label={idoFirst ? 'Target language' : 'Source language'}
    >
      {PARTNERS.map((p) => (
        <option key={p} value={p} className="text-black">
          {LANG_NAME[p]}{p === 'epo' ? '' : ' (β)'}
        </option>
      ))}
    </select>
  )
  const ido = <span className="text-white font-medium px-2 py-1">Ido</span>

  const navLink = 'flex items-center gap-1.5 px-2.5 py-1 text-white/75 text-sm hover:text-white hover:bg-white/10 rounded-md transition-colors'

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#1f3f7a] via-[#1f3f7a] to-[#1f7a3a]">
      <div className="container mx-auto px-4 py-4 sm:py-6 flex-1">
        {/* Top bar: only what helps while translating; everything else is in the footer */}
        <nav className="flex justify-end gap-1 mb-2 sm:mb-3" aria-label="Site">
          <a href="https://vortaro.lipu.dev" className={navLink}>
            <Book className="w-4 h-4" />
            Vortaro
          </a>
          <a href={`/about-${ABOUT_LANG}`} className={navLink}>
            <Info className="w-4 h-4" />
            About
          </a>
        </nav>

        <header className="text-center mb-5 sm:mb-6">
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1">
            Ido ⟷ Esperanto & English Translator
          </h1>
          <p className="text-white/70 text-sm sm:text-base">
            Rule-based Apertium and a neural model · English, Spanish, French, German in beta · free and open source
          </p>
        </header>

        <main className="max-w-7xl mx-auto">
          <TextTranslator
            direction={direction}
            languageBar={
              <div className="inline-flex items-center gap-1 bg-white/10 rounded-lg px-1 py-1">
                {idoFirst ? ido : partnerSelect}
                <button
                  onClick={() => setIdoFirst((v) => !v)}
                  className="p-1.5 hover:bg-white/15 rounded-md transition-colors"
                  aria-label="Swap translation direction"
                  title="Swap direction"
                >
                  <ArrowLeftRight className="w-4 h-4 text-white" />
                </button>
                {idoFirst ? partnerSelect : ido}
              </div>
            }
          />
        </main>

        <SeoContent />

        <DictionariesDialog
          isOpen={isDictionariesOpen}
          onClose={() => setIsDictionariesOpen(false)}
        />
      </div>
      <Footer lang={ABOUT_LANG} onOpenDictionaries={() => setIsDictionariesOpen(true)} />
    </div>
  )
}

export default App
