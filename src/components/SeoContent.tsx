// Always-visible, crawlable explanation of what this tool is. The About panel
// is hidden behind a toggle and the rest of the UI is an interactive widget, so
// without this the page carries almost no indexable text.
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

    <h3 className="text-xl font-semibold text-white mb-2">How to use it</h3>
    <ol className="list-decimal list-inside mb-4 space-y-1">
      <li>Pick the direction with the swap button: Ido → Esperanto or Esperanto → Ido.</li>
      <li>Type or paste your text into the input box.</li>
      <li>The translation appears next to it.</li>
    </ol>

    <h3 className="text-xl font-semibold text-white mb-2">Single words and dictionary</h3>
    <p className="mb-4">
      To look up one word with its part of speech, related words and browsing by letter, use
      the companion{' '}
      <a className="underline" href="https://ido-vortaro.pages.dev/">
        Ido–Esperanto dictionary (Vortaro)
      </a>
      , which contains more than 37,000 entries built from the same data this translator uses.
    </p>

    <h3 className="text-xl font-semibold text-white mb-2">About Ido</h3>
    <p className="mb-4">
      Ido is a constructed language published in 1907 as a reform of Esperanto, with a
      regular grammar and a vocabulary drawn from Romance and Germanic languages. Ido and
      Esperanto share most of their structure, so word-for-word rules cover much of the
      translation, while differing roots, endings and articles are handled by the
      dictionary and transfer rules.
    </p>

    <h3 className="text-xl font-semibold text-white mb-2">Questions</h3>
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
