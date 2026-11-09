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
      directions, Ido to Esperanto and Esperanto to Ido, and offers two engines. The default
      is <a className="underline" href="https://apertium.org/">Apertium</a>, an open-source
      rule-based machine translation engine: results are predictable and every word can be
      traced back to a dictionary entry. The second, <strong>Neural β</strong>, is a neural
      model that runs entirely in your browser.
    </p>

    <h2 id="neural" className="text-xl font-semibold text-white mb-2">Neural translation (beta)</h2>
    <p className="mb-4">
      The neural engine is{' '}
      <a className="underline" href="https://huggingface.co/komapc/nllb-ido-epo-600m">
        NLLB-200 (600M parameters) fine-tuned for Ido
      </a>
      , trained on Ido–Esperanto sentence pairs. It runs on your device after a one-time download
      of about 560 MB, which your browser keeps for later visits, so the text you translate is
      never sent to a server. On a held-out test set of 1,000 sentences it scores chrF 73
      against 65 for the rule-based engine. It is usually more fluent, but it can change or
      invent words, so check names, numbers and rare terms. You can also try it as a{' '}
      <a className="underline" href="https://huggingface.co/spaces/komapc/ido-epo-translator">
        standalone demo
      </a>
      .
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
      <li>Optionally pick the engine: Apertium (rules) or Neural β.</li>
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
          Good for related-language text with common vocabulary. With the rule-based engine,
          rare words and idioms may be left untranslated; the neural engine is more fluent but
          can make up words. Check the output for important text.
        </dd>
      </div>
      <div>
        <dt className="font-semibold text-white">Is my text sent to a server?</dt>
        <dd>
          With the rule-based engine, the text goes to our Apertium server to be translated.
          With the neural engine, translation happens in your browser and the text stays on
          your device.
        </dd>
      </div>
      <div>
        <dt className="font-semibold text-white">Which engine should I use?</dt>
        <dd>
          Neural β for natural-sounding everyday sentences; Apertium for predictable,
          word-by-word output, for long texts, or when you cannot download the 560 MB model.
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
