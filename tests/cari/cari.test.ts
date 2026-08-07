/**
 * Search is a rule, not a ranking. These assert the rule exactly, and assert
 * that it is run against the real recipe set so a shipped dish is always
 * reachable by its own name.
 */
import { describe, expect, it } from 'vitest'
import { cari, cariTerms, matchesCari, type CariEntry } from '@/lib/resep/cari'
import { RECIPES } from '@/lib/resep'

const ENTRIES: CariEntry[] = [
  {
    id: 'gado-gado',
    namaId: 'Gado-gado',
    nameEn: 'Vegetables in peanut sauce',
    deskripsiId: 'Sayuran rebus dengan saus kacang.',
    kategori: 'sayur',
  },
  {
    id: 'soto-betawi',
    namaId: 'Soto Betawi',
    nameEn: 'Jakarta beef soup',
    deskripsiId: 'Soto berkuah santan dengan daging sapi.',
    kategori: 'lauk',
  },
  {
    id: 'nasi-putih',
    namaId: 'Nasi putih',
    nameEn: 'Plain rice',
    deskripsiId: 'Beras ditanak dengan air.',
    kategori: 'nasi',
  },
]

describe('cariTerms', () => {
  it('splits on whitespace and drops empties', () => {
    expect(cariTerms('  soto   betawi ')).toEqual(['soto', 'betawi'])
    expect(cariTerms('')).toEqual([])
    expect(cariTerms('   ')).toEqual([])
  })

  it('folds case and diacritics', () => {
    expect(cariTerms('PEPÉS')).toEqual(['pepes'])
  })
})

describe('cari', () => {
  it('returns everything for an empty query', () => {
    expect(cari(ENTRIES, '')).toEqual(ENTRIES)
    expect(cari(ENTRIES, '   ')).toEqual(ENTRIES)
  })

  it('matches on the Indonesian name', () => {
    expect(cari(ENTRIES, 'gado').map((e) => e.id)).toEqual(['gado-gado'])
  })

  it('matches on the English name, so an English reader finds the dish', () => {
    expect(cari(ENTRIES, 'peanut').map((e) => e.id)).toEqual(['gado-gado'])
  })

  it('matches on the description and the category', () => {
    expect(cari(ENTRIES, 'santan').map((e) => e.id)).toEqual(['soto-betawi'])
    expect(cari(ENTRIES, 'nasi').map((e) => e.id)).toEqual(['nasi-putih'])
  })

  it('requires every term, not any', () => {
    expect(cari(ENTRIES, 'soto betawi').map((e) => e.id)).toEqual(['soto-betawi'])
    expect(cari(ENTRIES, 'soto nasi')).toEqual([])
  })

  it('ignores case and surrounding whitespace', () => {
    expect(cari(ENTRIES, '  SOTO  ').map((e) => e.id)).toEqual(['soto-betawi'])
  })

  it('returns an empty list rather than a fallback when nothing matches', () => {
    expect(cari(ENTRIES, 'zzzz')).toEqual([])
  })

  it('preserves input order — it never ranks', () => {
    expect(cari(ENTRIES, 'a').map((e) => e.id)).toEqual(
      ENTRIES.filter((e) => matchesCari(e, ['a'])).map((e) => e.id),
    )
  })

  it('is deterministic', () => {
    const first = cari(ENTRIES, 'so').map((e) => e.id)
    for (let i = 0; i < 5; i += 1) expect(cari(ENTRIES, 'so').map((e) => e.id)).toEqual(first)
  })
})

describe('against the shipped recipes', () => {
  it('finds every dish by its own Indonesian name', () => {
    for (const recipe of RECIPES) {
      const hits = cari(RECIPES, recipe.namaId).map((r) => r.id)
      expect(hits).toContain(recipe.id)
    }
  })

  it('finds every dish by its own id', () => {
    for (const recipe of RECIPES) {
      expect(cari(RECIPES, recipe.id).map((r) => r.id)).toContain(recipe.id)
    }
  })

  it('never invents a result', () => {
    expect(cari(RECIPES, 'tidakadamasakanini')).toEqual([])
  })
})
