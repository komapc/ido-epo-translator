import { describe, expect, it } from 'vitest'
import { hasApertium, isPartner, pairFromHash, splitDirection } from './langs'

describe('pairFromHash (landing-page links such as /#ido-eng)', () => {
  it('opens Ido -> partner and partner -> Ido', () => {
    expect(pairFromHash('#ido-eng')).toEqual({ partner: 'eng', idoFirst: true })
    expect(pairFromHash('#eng-ido')).toEqual({ partner: 'eng', idoFirst: false })
    expect(pairFromHash('#ido-epo')).toEqual({ partner: 'epo', idoFirst: true })
    expect(pairFromHash('#deu-ido')).toEqual({ partner: 'deu', idoFirst: false })
  })

  it('ignores anything else', () => {
    for (const hash of ['', '#', '#ido', '#ido-ido', '#ido-xyz', '#eng-epo', '#ido-eng-x', 'ido-eng', '#IDO-ENG', '#about']) {
      expect(pairFromHash(hash), hash).toBeNull()
    }
  })
})

describe('directions', () => {
  it('Apertium exists only for Ido <-> Esperanto', () => {
    expect(hasApertium('ido-epo')).toBe(true)
    expect(hasApertium('epo-ido')).toBe(true)
    expect(hasApertium('ido-eng')).toBe(false)
  })

  it('splitDirection and isPartner', () => {
    expect(splitDirection('spa-ido')).toEqual(['spa', 'ido'])
    expect(isPartner('fra')).toBe(true)
    expect(isPartner('ido')).toBe(false)
  })
})
