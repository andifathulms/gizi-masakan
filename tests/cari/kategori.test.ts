/**
 * The category filter takes untrusted input from the query string. Asserted
 * against the real recipe set so every shipped category is reachable.
 */
import { describe, expect, it } from 'vitest'
import { RECIPES } from '@/lib/resep'
import { hitungKategori, parseKategori, saringKategori, urutanKategori } from '@/lib/resep/kategori'

const KATEGORI = urutanKategori(RECIPES)

describe('urutanKategori', () => {
  it('lists each category once, in authored order', () => {
    expect(new Set(KATEGORI).size).toBe(KATEGORI.length)
    expect(KATEGORI[0]).toBe(RECIPES[0]!.kategori)
  })
})

describe('parseKategori', () => {
  it('accepts every real category', () => {
    for (const kategori of KATEGORI) expect(parseKategori(kategori, KATEGORI)).toBe(kategori)
  })

  it('folds case and whitespace', () => {
    expect(parseKategori(' SAYUR ', KATEGORI)).toBe('sayur')
  })

  it('drops anything unknown to "all", never to a near match', () => {
    expect(parseKategori(null, KATEGORI)).toBeNull()
    expect(parseKategori('', KATEGORI)).toBeNull()
    expect(parseKategori('sayu', KATEGORI)).toBeNull()
    expect(parseKategori('<script>', KATEGORI)).toBeNull()
  })
})

describe('saringKategori', () => {
  it('returns everything for null', () => {
    expect(saringKategori(RECIPES, null)).toBe(RECIPES)
  })

  it('partitions the catalogue: the categories together hold every dish exactly once', () => {
    const total = KATEGORI.reduce((sum, k) => sum + saringKategori(RECIPES, k).length, 0)
    expect(total).toBe(RECIPES.length)
    for (const k of KATEGORI) {
      expect(saringKategori(RECIPES, k).every((r) => r.kategori === k)).toBe(true)
    }
  })

  it('agrees with the counts shown on the chips', () => {
    const counts = hitungKategori(RECIPES)
    for (const k of KATEGORI) expect(counts.get(k)).toBe(saringKategori(RECIPES, k).length)
  })
})
