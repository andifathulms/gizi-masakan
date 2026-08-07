/**
 * Saved recipes are untrusted input that feeds gram weights into the engine,
 * and they persist across releases. These assert that a malformed store
 * degrades to empty rather than throwing or half-loading, that weights are
 * rejected rather than coerced, and that the store carries no tracking
 * primitive — invariant 11.
 */
import { describe, expect, it } from 'vitest'
import {
  entryId,
  hapus,
  parseStore,
  serialiseStore,
  simpan,
  untukMasakan,
  type ResepTersimpan,
} from '@/lib/simpan/resep-tersimpan'

const ENTRY: ResepTersimpan = {
  id: 'gado-gado__versi-warung',
  dishId: 'gado-gado',
  nama: 'Versi warung',
  beratOverrideG: { santan: 100, tempe: 75 },
}

describe('entryId', () => {
  it('is deterministic — no clock, no randomness', () => {
    const first = entryId('gado-gado', 'Versi warung')
    for (let i = 0; i < 5; i += 1) expect(entryId('gado-gado', 'Versi warung')).toBe(first)
  })

  it('slugs the name and folds diacritics and case', () => {
    expect(entryId('pepes', 'Pepés Ibu')).toBe('pepes__pepes-ibu')
    expect(entryId('gado-gado', '  Versi  Warung!  ')).toBe('gado-gado__versi-warung')
  })

  it('gives the same id for the same name, so saving twice replaces', () => {
    expect(entryId('gado-gado', 'Versi warung')).toBe(entryId('gado-gado', 'versi WARUNG'))
  })

  it('keeps dishes separate', () => {
    expect(entryId('gado-gado', 'punyaku')).not.toBe(entryId('soto-betawi', 'punyaku'))
  })
})

describe('parseStore', () => {
  it('returns empty for null, empty and malformed input', () => {
    expect(parseStore(null)).toEqual([])
    expect(parseStore('')).toEqual([])
    expect(parseStore('not json')).toEqual([])
    expect(parseStore('{}')).toEqual([])
    expect(parseStore('[]')).toEqual([])
  })

  it('rejects a store from a different version rather than guessing', () => {
    expect(parseStore(JSON.stringify({ version: 2, entries: [ENTRY] }))).toEqual([])
  })

  it('round-trips a valid store', () => {
    expect(parseStore(serialiseStore([ENTRY]))).toEqual([ENTRY])
  })

  describe('rejects rather than coerces', () => {
    const withBerat = (beratOverrideG: unknown) =>
      JSON.stringify({ version: 1, entries: [{ ...ENTRY, beratOverrideG }] })

    it('drops the store when a weight is negative', () => {
      expect(parseStore(withBerat({ santan: -1 }))).toEqual([])
    })

    it('drops the store when a weight is not a number', () => {
      expect(parseStore(withBerat({ santan: '100' }))).toEqual([])
    })

    it('drops the store when a weight is NaN or Infinity', () => {
      expect(parseStore(withBerat({ santan: Number.NaN }))).toEqual([])
      expect(parseStore(withBerat({ santan: Number.POSITIVE_INFINITY }))).toEqual([])
    })

    it('accepts zero', () => {
      expect(parseStore(withBerat({ garam: 0 }))).toHaveLength(1)
    })

    it('drops the store when an ingredient id could not come from a recipe', () => {
      expect(parseStore(withBerat({ Santan: 100 }))).toEqual([])
    })
  })
})

describe('simpan', () => {
  it('appends a new entry', () => {
    expect(simpan([], ENTRY)).toEqual([ENTRY])
  })

  it('replaces an entry with the same id rather than duplicating it', () => {
    const updated = { ...ENTRY, beratOverrideG: { santan: 50 } }
    const result = simpan([ENTRY], updated)
    expect(result).toHaveLength(1)
    expect(result[0]?.beratOverrideG).toEqual({ santan: 50 })
  })

  it('leaves other entries alone', () => {
    const other: ResepTersimpan = { ...ENTRY, id: 'soto__a', dishId: 'soto-betawi' }
    expect(simpan([other], ENTRY)).toHaveLength(2)
  })
})

describe('hapus', () => {
  it('removes only the named entry', () => {
    const other: ResepTersimpan = { ...ENTRY, id: 'soto__a', dishId: 'soto-betawi' }
    expect(hapus([ENTRY, other], ENTRY.id)).toEqual([other])
  })

  it('is a no-op for an unknown id', () => {
    expect(hapus([ENTRY], 'tidak-ada')).toEqual([ENTRY])
  })
})

describe('untukMasakan', () => {
  it('returns only this dish', () => {
    const other: ResepTersimpan = { ...ENTRY, id: 'soto__a', dishId: 'soto-betawi' }
    expect(untukMasakan([ENTRY, other], 'gado-gado')).toEqual([ENTRY])
  })
})

describe('invariant 11 — this is a recipe store, not a log', () => {
  it('carries no timestamp, count, or any other accumulating field', () => {
    const stored = JSON.parse(serialiseStore([ENTRY]))
    const banned = /date|time|stamp|count|total|streak|log|history|opened|eaten|dikonsumsi/i
    const keys = Object.keys(stored.entries[0])
    expect(keys.sort()).toEqual(['beratOverrideG', 'dishId', 'id', 'nama'])
    for (const key of keys) expect(key).not.toMatch(banned)
  })

  it('drops unknown fields on load, so a stray one cannot creep in', () => {
    const raw = JSON.stringify({
      version: 1,
      entries: [{ ...ENTRY, savedAt: '2026-08-07', kaliDibuka: 3 }],
    })
    expect(parseStore(raw)).toEqual([ENTRY])
  })
})
