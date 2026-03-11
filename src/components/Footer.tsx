import { Info } from 'lucide-react'

interface FooterProps {
  onAboutClick: () => void
}

const Footer = ({ onAboutClick }: FooterProps) => {
  return (
    <footer className="mt-12 pt-8 pb-8 border-t border-white/10 text-white/70 text-center text-sm leading-relaxed">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-2">
          Mea projekti: 
          <a href="https://komapc.github.io/vortaro" className="text-white hover:underline mx-1">Vortaro</a> 
          (<a href="https://github.com/komapc/vortaro" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:underline">kodo</a>)
          <span className="mx-2 opacity-30">·</span>
          <a href="https://ido-epo-translator.komapc.workers.dev/" className="text-white hover:underline mx-1">Tradukilo</a> 
          (<a href="https://github.com/komapc/ido-epo-translator" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:underline">kodo</a>)
          <span className="mx-2 opacity-30">·</span>
          <a href="https://komapc.github.io/a2a" className="text-white hover:underline mx-1">EchoDrift</a> 
          (<a href="https://github.com/komapc/a2a" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:underline">kodo</a>)
        </div>
        
        <div>
          Rersursi: 
          <a href="https://github.com/apertium" target="_blank" rel="noopener noreferrer" className="text-white hover:underline mx-1">Apertium</a> (Apertium-based)
          <span className="mx-2 opacity-30">·</span>
          Kontakto: <a href="mailto:komapc@gmail.com" className="text-white hover:underline mx-1">komapc@gmail.com</a>
          <span className="mx-2 opacity-30">·</span>
          <button 
            onClick={onAboutClick}
            className="text-white hover:underline mx-1 inline-flex items-center gap-1"
          >
            <Info className="w-3 h-3" /> Pri ca projekto
          </button>
          <span className="ml-4 font-mono opacity-50 text-xs">v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
