import { Info } from 'lucide-react'

interface FooterProps {
  lang: 'io' | 'en' | 'eo'
}

const Footer = ({ lang }: FooterProps) => {
  const translations = {
    io: {
      projects: 'Mea projekti',
      resources: 'Resursi',
      contact: 'Kontakto',
      about: 'Pri la projekto',
      code: 'kodo',
      report: 'Raportar eroro'
    },
    en: {
      projects: 'My projects',
      resources: 'Resources',
      contact: 'Contact',
      about: 'About the project',
      code: 'code',
      report: 'Report a translation error'
    },
    eo: {
      projects: 'Miaj projektoj',
      resources: 'Rimedoj',
      contact: 'Kontakto',
      about: 'Pri la projekto',
      code: 'kodo',
      report: 'Raporti tradukeraron'
    }
  }

  const t = translations[lang] || translations.io

  return (
    <footer className="mt-16 pt-10 pb-10 border-t border-white/10 text-white/70 text-center text-sm">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mb-3">
          <a href="https://lipu.dev/" className="text-white font-semibold hover:text-white transition-colors">lipu.dev</a>
          <span className="opacity-30">·</span>
          <a href="https://vortaro.lipu.dev/" className="text-white font-semibold hover:text-white transition-colors">Vortaro</a>
          <span className="opacity-30">·</span>
          <a href="https://github.com/komapc/ido-epo-translator" target="_blank" rel="noopener noreferrer" className="text-white font-semibold hover:text-white transition-colors">{t.code}</a>
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
          <span className="opacity-80">{t.resources}:</span>
          <a href="https://github.com/apertium" target="_blank" rel="noopener noreferrer" className="text-white font-semibold hover:text-white transition-colors">Apertium</a>
          <span className="text-xs opacity-50 -ml-3">(Apertium-based)</span>
          
          <span className="opacity-30">·</span>
          <span>{t.contact}: <a href="https://github.com/komapc" target="_blank" rel="noopener noreferrer" className="text-white font-semibold hover:text-white transition-colors">GitHub</a></span>
          
          <span className="opacity-30">·</span>
          <a
            href="https://github.com/komapc/apertium-ido-epo/issues/new?labels=translation&title=Translation%20error%3A%20"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white font-semibold hover:text-white transition-colors"
          >
            {t.report}
          </a>

          <span className="opacity-30">·</span>
          <a
            href={`/about-${lang}`}
            className="text-white font-semibold hover:text-white transition-colors flex items-center gap-1"
          >
            <Info className="w-3.5 h-3.5" /> {t.about}
          </a>
          
          <span className="bg-white/10 px-2 py-0.5 rounded font-mono text-[10px] opacity-60">v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
