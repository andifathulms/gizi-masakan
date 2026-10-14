/**
 * `pnpm timbang` writes scale readings into the data. The pure half is held to
 * invariant 19: malformed readings are refused, never coerced. Edits are run
 * against the real recipe files, and every recipe that comes out the other
 * side still validates, still balances, and still conserves.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BahanSchema, RECIPES, RecipeSchema } from '@/lib/resep'
import { bacaGram, cekTanggal, rataUlangan, tambahTakaran, tandaiDitimbang } from '@/lib/portion/timbang'
import type { Recipe } from '@/lib/nutrition/trace'
import { assertConservation, traceFor } from '../helpers'

const teksResep = (id: string) => readFileSync(join(__dirname, `../../data/recipes/${id}.json`), 'utf8')

describe('bacaGram', () => {
  it('reads a plain or decimal weight, with a comma or a point', () => {
    expect(bacaGram('152')).toEqual({ ok: true, value: 152 })
    expect(bacaGram(' 12,5 ')).toEqual({ ok: true, value: 12.5 })
  })

  it('refuses anything that is not a positive number of grams', () => {
    for (const teks of ['', '0', '-3', '15o', '1e3', 'NaN', 'Infinity', '12 g', '1.2.3']) {
      expect(bacaGram(teks).ok, teks).toBe(false)
    }
  })
})

describe('rataUlangan', () => {
  it('averages three or more readings to a tenth of a gram', () => {
    expect(rataUlangan(['152', '148', '151'])).toEqual({
      ok: true,
      value: { gramG: 150.3, jumlahUlangan: 3 },
    })
  })

  it('refuses fewer than three — the protocol asks for three fresh fills', () => {
    expect(rataUlangan(['150', '150']).ok).toBe(false)
  })

  it('refuses the whole set if any one reading is malformed', () => {
    expect(rataUlangan(['150', '15o', '149']).ok).toBe(false)
  })
})

describe('cekTanggal', () => {
  it('accepts a real ISO date and refuses anything else', () => {
    expect(cekTanggal('2026-10-15').ok).toBe(true)
    for (const t of ['2026-02-30', '15-10-2026', '2026-1-5', 'today']) expect(cekTanggal(t).ok, t).toBe(false)
  })
})

describe('tandaiDitimbang', () => {
  it('marks exactly one row, on every row of every recipe', () => {
    for (const recipe of RECIPES) {
      const teks = teksResep(recipe.id)
      for (const bahan of recipe.bahan) {
        const hasil = tandaiDitimbang(teks, bahan.ingredientId, 42, '2026-10-15')
        expect(hasil.ok, `${recipe.id}/${bahan.ingredientId}`).toBe(true)
        if (!hasil.ok) continue
        const parsed = RecipeSchema.parse(JSON.parse(hasil.value)) as Recipe
        const baris = parsed.bahan.find((b) => b.ingredientId === bahan.ingredientId)!
        expect(baris).toMatchObject({ beratG: 42, provenance: 'ditimbang', ditimbangPada: '2026-10-15' })
        expect(BahanSchema.safeParse(baris).success).toBe(true)
        for (const lain of parsed.bahan.filter((b) => b.ingredientId !== bahan.ingredientId)) {
          expect(lain).toEqual(recipe.bahan.find((b) => b.ingredientId === lain.ingredientId))
        }
      }
    }
  })

  it('produces a recipe that still balances and conserves', () => {
    const recipe = RECIPES.find((r) => r.id === 'gado-gado')!
    const hasil = tandaiDitimbang(teksResep('gado-gado'), 'kacang-tanah-sangrai', 64, '2026-10-15')
    expect(hasil.ok).toBe(true)
    if (!hasil.ok) return
    const ditimbang = RecipeSchema.parse(JSON.parse(hasil.value)) as Recipe
    const trace = traceFor(ditimbang)
    assertConservation(trace)
    assertConservation(traceFor(recipe))
    expect(trace.massa.mentahG).toBeCloseTo(traceFor(recipe).massa.mentahG - 70 + 64, 9)
  })

  it('refuses an ingredient the recipe does not have', () => {
    expect(tandaiDitimbang(teksResep('gado-gado'), 'rendang', 10, '2026-10-15').ok).toBe(false)
  })

  it('re-weighing a weighed row replaces its date rather than adding a second', () => {
    const sekali = tandaiDitimbang(teksResep('gado-gado'), 'tempe', 61, '2026-10-15')
    expect(sekali.ok).toBe(true)
    if (!sekali.ok) return
    const dua = tandaiDitimbang(sekali.value, 'tempe', 59, '2026-11-01')
    expect(dua.ok).toBe(true)
    if (!dua.ok) return
    const tempe = (JSON.parse(dua.value) as Recipe).bahan.find((b) => b.ingredientId === 'tempe')!
    expect(tempe).toMatchObject({ beratG: 59, ditimbangPada: '2026-11-01' })
    expect(dua.value.match(/ditimbangPada/g)).toHaveLength(1)
  })
})

describe('tambahTakaran', () => {
  const entri = {
    id: 'centong-nasi',
    labelId: '1 centong nasi',
    labelEn: '1 rice scoop',
    ingredientId: 'nasi-putih',
    gramG: 150.3,
    diukurPada: '2026-10-15',
    jumlahUlangan: 3,
    alat: 'Timbangan dapur digital 1 g',
  }

  it('adds an entry, and refuses a duplicate unless asked to replace', () => {
    const satu = tambahTakaran({ entries: [] }, entri, false)
    expect(satu.ok && satu.value.entries).toHaveLength(1)
    if (!satu.ok) return
    expect(tambahTakaran(satu.value, entri, false).ok).toBe(false)
    const ganti = tambahTakaran(satu.value, { ...entri, gramG: 149 }, true)
    expect(ganti.ok && ganti.value.entries).toEqual([{ ...entri, gramG: 149 }])
  })

  it('refuses an entry that fails the URT schema', () => {
    expect(tambahTakaran({ entries: [] }, { ...entri, gramG: 0 }, false).ok).toBe(false)
    expect(tambahTakaran({ entries: [] }, { ...entri, diukurPada: 'kemarin' }, false).ok).toBe(false)
  })
})
