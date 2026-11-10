// Languages the translator offers. Apertium covers only Ido <-> Esperanto; the
// neural engine (NLLB split-decoder build) also covers Ido <-> the other languages.

export const LANGS = ['ido', 'epo', 'eng', 'spa', 'fra', 'deu'] as const
export type Lang = (typeof LANGS)[number]
/** "<source>-<target>", e.g. "ido-epo". Stored in history and sent to the Apertium API. */
export type Direction = `${Lang}-${Lang}`

/** The language paired with Ido, in menu order. */
export const PARTNERS = ['epo', 'eng', 'spa', 'fra', 'deu'] as const
export type Partner = (typeof PARTNERS)[number]

export const LANG_NAME: Record<Lang, string> = {
  ido: 'Ido', epo: 'Esperanto', eng: 'English', spa: 'Spanish', fra: 'French', deu: 'German',
}
export const LANG_SHORT: Record<Lang, string> = { ido: 'IO', epo: 'EO', eng: 'EN', spa: 'ES', fra: 'FR', deu: 'DE' }
/** Wikipedia subdomain, for the "Random article" button. */
export const WIKI: Record<Lang, string> = { ido: 'io', epo: 'eo', eng: 'en', spa: 'es', fra: 'fr', deu: 'de' }
/** NLLB-200 language token. */
export const NLLB: Record<Lang, string> = {
  ido: 'ido_Latn', epo: 'epo_Latn', eng: 'eng_Latn', spa: 'spa_Latn', fra: 'fra_Latn', deu: 'deu_Latn',
}

export const splitDirection = (d: Direction) => d.split('-') as [Lang, Lang]
export const isPartner = (s: string): s is Partner => (PARTNERS as readonly string[]).includes(s)
/** Apertium (rules) exists only for Ido <-> Esperanto. */
export const hasApertium = (d: Direction) => d === 'ido-epo' || d === 'epo-ido'
