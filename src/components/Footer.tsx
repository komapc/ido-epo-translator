import { Book, Globe, Github, Info } from 'lucide-react'

interface FooterProps {
  onAboutClick: () => void
}

const Footer = ({ onAboutClick }: FooterProps) => {
  return (
    <footer className="mt-12 pt-12 pb-8 border-t border-white/10 text-white/70">
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          {/* Suite Section */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">
              Linguistikala Utensili
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://komapc.github.io/vortaro" className="hover:text-white transition-colors flex items-center justify-center md:justify-start gap-2">
                  <Book className="w-3 h-3" /> Vortaro (Dilingva)
                </a>
              </li>
              <li>
                <a href="https://ido-epo-translator.komapc.workers.dev/" className="hover:text-white transition-colors flex items-center justify-center md:justify-start gap-2 text-white font-medium">
                  <Globe className="w-3 h-3" /> Tradukilo (Apertium)
                </a>
              </li>
              <li>
                <a href="https://komapc.github.io/phonomorph" className="hover:text-white transition-colors flex items-center justify-center md:justify-start gap-2">
                  <Globe className="w-3 h-3" /> PhonoMorph (Phonetics)
                </a>
              </li>
            </ul>
          </div>

          {/* Resources Section */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">
              Rersursi
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://github.com/komapc/ido-epo-translator" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center justify-center md:justify-start gap-2">
                  <Github className="w-3 h-3" /> Translator Source
                </a>
              </li>
              <li>
                <a href="https://github.com/apertium" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center justify-center md:justify-start gap-2">
                  <Globe className="w-3 h-3" /> Apertium Project
                </a>
              </li>
              <li>
                <a href="https://io.wikipedia.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center justify-center md:justify-start gap-2">
                  <Globe className="w-3 h-3" /> Ido Wikipedia
                </a>
              </li>
            </ul>
          </div>

          {/* Info Section */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">
              Informo
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button 
                  onClick={onAboutClick}
                  className="hover:text-white transition-colors flex items-center justify-center md:justify-start gap-2 underline"
                >
                  <Info className="w-3 h-3" /> Pri ca projekto
                </button>
              </li>
              <li>Licenco: MIT / Apertium</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <div>© 2026 Linguo-Ekosistemo</div>
          <div className="bg-white/10 px-2 py-1 rounded font-mono">
            v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
