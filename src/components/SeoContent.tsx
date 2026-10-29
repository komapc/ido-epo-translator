// Always-visible, crawlable explanation of what this tool is. The About panel
// is hidden behind a toggle and the rest of the UI is an interactive widget, so
// without this the page carries almost no indexable text. It is also
// prerendered into the static index.html (scripts/prerender.mjs).

// Real translator output; keep in sync with what the engine actually returns.
const EXAMPLES: [string, string][] = [
  ['Me amas vu.', 'Mi amas vin.'],
  ['La hundo manjas la pomo.', 'La hundo manĝas la pomon.'],
  ['Ube esas la biblioteko?', 'Kie estas la biblioteko?'],
  ['Ni iros a la urbo morge.', 'Ni iros al la urbo morgaŭ.'],
]

const SeoContent = () => (
  <section
    className="max-w-3xl mx-auto mt-16 text-white/85 leading-relaxed"
    aria-labelledby="about-translator-heading"
  >
    <h2 id="about-translator-heading" className="text-2xl font-bold text-white mb-3">
      Free Ido–Esperanto machine translation
    </h2>
    <p className="mb-4">
      This is a free online translator between <strong>Ido</strong> and{' '}
      <strong>Esperanto</strong>, two international auxiliary languages. It works in both
      directions, Ido to Esperanto and Esperanto to Ido, and is built on{' '}
      <a className="underline" href="https://apertium.org/">Apertium</a>, an open-source
      rule-based machine translation engine. Because translation is rule-based rather than
      statistical, results are predictable and every word can be traced back to a dictionary
      entry.
    </p>

    <h2 className="text-xl font-semibold text-white mb-2">Example translations</h2>
    <table className="w-full mb-2 border-collapse text-left">
      <thead>
        <tr>
          <th className="border border-white/25 bg-white/10 px-3 py-2">Ido</th>
          <th className="border border-white/25 bg-white/10 px-3 py-2">Esperanto</th>
        </tr>
      </thead>
      <tbody>
        {EXAMPLES.map(([io, eo]) => (
          <tr key={io}>
            <td lang="io" className="border border-white/25 px-3 py-2">{io}</td>
            <td lang="eo" className="border border-white/25 px-3 py-2">{eo}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <p className="mb-4 text-sm">
      More examples for each direction:{' '}
      <a className="underline" href="/ido-epo">Ido → Esperanto</a> ·{' '}
      <a className="underline" href="/epo-ido">Esperanto → Ido</a>.
    </p>

    <h2 className="text-xl font-semibold text-white mb-2">How to use it</h2>
    <ol className="list-decimal list-inside mb-4 space-y-1">
      <li>Pick the direction with the swap button: Ido → Esperanto or Esperanto → Ido.</li>
      <li>Type or paste your text into the input box.</li>
      <li>The translation appears next to it.</li>
    </ol>

    <h2 className="text-xl font-semibold text-white mb-2">Single words and dictionary</h2>
    <p className="mb-4">
      To look up one word with its part of speech, related words and browsing by letter, use
      the companion{' '}
      <a className="underline" href="https://vortaro.lipu.dev/">
        Ido–Esperanto dictionary (Vortaro)
      </a>
      , which contains more than 37,000 entries built from the same data this translator uses.
    </p>

    <h2 className="text-xl font-semibold text-white mb-2">About Ido</h2>
    <p className="mb-4">
      Ido is a constructed language published in 1907 as a reform of Esperanto, with a
      regular grammar and a vocabulary drawn from Romance and Germanic languages. Ido and
      Esperanto share most of their structure, so word-for-word rules cover much of the
      translation, while differing roots, endings and articles are handled by the
      dictionary and transfer rules.
    </p>

    <h2 className="text-xl font-semibold text-white mb-2">Questions</h2>
    <dl className="mb-4 space-y-3">
      <div>
        <dt className="font-semibold text-white">Is the translator free?</dt>
        <dd>Yes. It is free to use and the dictionaries and rules are open source.</dd>
      </div>
      <div>
        <dt className="font-semibold text-white">How accurate is it?</dt>
        <dd>
          Good for related-language text with common vocabulary. Rare words and idioms may
          be left untranslated, and the output should be checked for important text.
        </dd>
      </div>
      <div>
        <dt className="font-semibold text-white">Can I improve the dictionary?</dt>
        <dd>
          Yes, the data lives in the open-source Apertium Ido–Esperanto pair; corrections
          and new entries are welcome.
        </dd>
      </div>
    </dl>
  </section>
)

export default SeoContent
