interface FooterProps {
  lang: 'io' | 'en' | 'eo'
  onOpenDictionaries: () => void
}

const STRINGS = {
  io: { dictionaries: 'Vortari', code: 'GitHub', report: 'Raportar eroro', analytics: 'Google Analytics' },
  en: { dictionaries: 'Dictionaries', code: 'GitHub', report: 'Report a translation error', analytics: 'Analytics settings' },
  eo: { dictionaries: 'Vortaroj', code: 'GitHub', report: 'Raporti tradukeraron', analytics: 'Google Analytics' },
}

// Every link appears once on the page: Vortaro and About live in the top bar,
// everything else is here.
const Footer = ({ lang, onOpenDictionaries }: FooterProps) => {
  const t = STRINGS[lang] || STRINGS.en
  const link = 'hover:text-white transition-colors'

  return (
    <footer className="mt-16 py-6 border-t border-white/10 text-white/60 text-sm">
      <div className="container mx-auto px-4 flex flex-wrap justify-center items-center gap-x-5 gap-y-2">
        <a href="https://lipu.dev/" className={`${link} font-semibold text-white/80`}>lipu.dev</a>
        <a href="https://echodrift.lipu.dev" className={link}>EchoDrift</a>
        <a
          href="https://github.com/komapc/apertium-ido-epo/issues/new?labels=translation&title=Translation%20error%3A%20"
          target="_blank"
          rel="noopener noreferrer"
          className={link}
        >
          {t.report}
        </a>
        <button onClick={onOpenDictionaries} className={link}>{t.dictionaries}</button>
        <a href="https://github.com/komapc/ido-epo-translator" target="_blank" rel="noopener noreferrer" className={link}>{t.code}</a>
        {/* Reopens the shared consent banner (https://geo.lipu.dev/consent.js). */}
        <a href="#" data-lipu-consent-open className={link}>{t.analytics}</a>
        <span className="font-mono text-xs text-white/40">v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</span>
      </div>
    </footer>
  )
}

export default Footer
