import { Info } from 'lucide-react'

interface FooterProps {
  onAboutClick: () => void
  lang: 'io' | 'en' | 'eo'
}

const Footer = ({ onAboutClick, lang }: FooterProps) => {
  const translations = {
    io: {
      projects: 'Mea projekti',
      resources: 'Rersursi',
      contact: 'Kontakto',
      about: 'Pri la projekto',
      code: 'kodo'
    },
    en: {
      projects: 'My projects',
      resources: 'Resources',
      contact: 'Contact',
      about: 'About the project',
      code: 'code'
    },
    eo: {
      projects: 'Miaj projektoj',
      resources: 'Rimedoj',
      contact: 'Kontakto',
      about: 'Pri la projekto',
      code: 'kodo'
    }
  }

  const t = translations[lang] || translations.io

  return (
    <footer className="mt-16 pt-10 pb-10 border-t border-white/10 text-white/70 text-center text-sm">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mb-3">
          <span className="opacity-80">{t.projects}:</span>
          <a href="https://vortaro.komapc.workers.dev/" className="text-white font-semibold hover:text-white transition-colors">Vortaro</a> 
          <span className="text-xs opacity-50 -ml-2">(<a href="https://github.com/komapc/vortaro" target="_blank" rel="noopener noreferrer" className="hover:underline">{t.code}</a>)</span>
          
          <span className="opacity-30">·</span>
          <a href="https://ido-epo-translator.komapc.workers.dev/" className="text-white font-semibold hover:text-white transition-colors underline decoration-white/30 underline-offset-4">Tradukilo</a> 
          <span className="text-xs opacity-50 -ml-2">(<a href="https://github.com/komapc/ido-epo-translator" target="_blank" rel="noopener noreferrer" className="hover:underline">{t.code}</a>)</span>
          
          <span className="opacity-30">·</span>
          <a href="https://komapc.github.io/a2a" className="text-white font-semibold hover:text-white transition-colors">EchoDrift</a> 
          <span className="text-xs opacity-50 -ml-2">(<a href="https://github.com/komapc/a2a" target="_blank" rel="noopener noreferrer" className="hover:underline">{t.code}</a>)</span>
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
          <span className="opacity-80">{t.resources}:</span>
          <a href="https://github.com/apertium" target="_blank" rel="noopener noreferrer" className="text-white font-semibold hover:text-white transition-colors">Apertium</a>
          <span className="text-xs opacity-50 -ml-3">(Apertium-based)</span>
          
          <span className="opacity-30">·</span>
          <span>{t.contact}: <a href="mailto:komapc@gmail.com" className="text-white font-semibold hover:text-white transition-colors">komapc@gmail.com</a></span>
          
          <span className="opacity-30">·</span>
          <button 
            onClick={onAboutClick}
            className="text-white font-semibold hover:text-white transition-colors flex items-center gap-1"
          >
            <Info className="w-3.5 h-3.5" /> {t.about}
          </button>
          
          <span className="bg-white/10 px-2 py-0.5 rounded font-mono text-[10px] opacity-60">v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
