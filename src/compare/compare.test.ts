import { describe, expect, it } from 'vitest'
import { agreement, alignSegments, diffPair, splitSentences, tokenize } from './compare'

const differing = (tokens: { text: string; differs: boolean }[]) => tokens.filter((t) => t.differs).map((t) => t.text)

describe('splitSentences', () => {
  it('splits after . ! ? … before an uppercase letter, digit or opening quote', () => {
    expect(splitSentences('Me venis. Il iris! Ka vu? «Yes» 3 homi… Fine.'))
      .toEqual(['Me venis.', 'Il iris!', 'Ka vu?', '«Yes» 3 homi…', 'Fine.'])
    expect(splitSentences('Hola. ¿Qué tal?')).toEqual(['Hola.', '¿Qué tal?'])
  })

  it('does not split before a lowercase word, and an empty line has no sentences', () => {
    expect(splitSentences('ktp. e cetere')).toEqual(['ktp. e cetere'])
    expect(splitSentences('   ')).toEqual([])
  })
})

describe('alignSegments', () => {
  it('pairs sentences when both sides have the same count per line', () => {
    expect(alignSegments('A. B.\nC.', 'X. Y.\nZ.')).toEqual([['A.', 'X.'], ['B.', 'Y.'], ['C.', 'Z.']])
  })

  it('falls back to the line when the sentence counts differ', () => {
    expect(alignSegments('A. B.', 'X.')).toEqual([['A. B.', 'X.']])
  })

  it('falls back to the whole text when the line counts differ, never dropping text', () => {
    expect(alignSegments('A.\nB.', 'X.')).toEqual([['A.\nB.', 'X.']])
  })

  it('ignores blank lines on either side', () => {
    expect(alignSegments('A.\n\nB.', 'X.\nY.\n')).toEqual([['A.', 'X.'], ['B.', 'Y.']])
  })
})

describe('tokenize', () => {
  it('strips Apertium markers and records them', () => {
    expect(tokenize('*hundo @kato #domo')).toEqual([
      { text: 'hundo', unknown: true, genError: false, differs: false },
      { text: 'kato', unknown: false, genError: true, differs: false },
      { text: 'domo', unknown: false, genError: false, differs: false },
    ])
  })
})

describe('diffPair', () => {
  it('marks the words each side lacks, ignoring case and punctuation', () => {
    const [a, b] = diffPair('La hundo kuras rapide.', 'la Hundo kuras.')
    expect(differing(a)).toEqual(['rapide.'])
    expect(differing(b)).toEqual([])
  })

  it('never marks pure punctuation', () => {
    const [a, b] = diffPair('A — b', 'A b')
    expect(differing(a)).toEqual([])
    expect(differing(b)).toEqual([])
  })

  it('skips the diff (no highlights) when the texts are too long', () => {
    const long = Array.from({ length: 600 }, (_, i) => `w${i}`).join(' ')
    const [a, b] = diffPair(long, 'x '.repeat(600))
    expect(differing(a)).toEqual([])
    expect(differing(b)).toEqual([])
  })
})

describe('agreement', () => {
  it('is the share of identical words over both sides, 100 for nothing to compare', () => {
    expect(agreement([diffPair('a b c d', 'a b c d')])).toBe(100)
    expect(agreement([diffPair('a b', 'a c')])).toBe(50)
    expect(agreement([diffPair('—', '—')])).toBe(100)
    expect(agreement([])).toBe(100)
  })
})
