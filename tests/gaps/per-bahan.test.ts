/**
 * Grouping the missing nutrient values by ingredient must never lose one.
 * Both directions, per CLAUDE.md: an incomplete recipe names every gap; a
 * complete one names none. Conservation asserted on every trace.
 */
import { describe, expect, it } from 'vitest'
import { RECIPES, findRecipe } from '@/lib/resep'
import { nilaiKosongPerBahan } from '@/lib/nutrition/gaps'
import { assertConservation, traceFor } from '../helpers'

describe('nilaiKosongPerBahan', () => {
  it('keeps every missing-value gap, exactly once, for every recipe', () => {
    for (const recipe of RECIPES) {
      const trace = traceFor(recipe)
      assertConservation(trace)
      const nilai = trace.gaps.filter((gap) => gap.type === 'nilai-gizi-kosong')
      const grouped = nilaiKosongPerBahan(trace.gaps)
      const pairs = grouped.flatMap((g) => g.nutrientIds.map((n) => `${g.ingredientId}:${n}`))
      expect(pairs.length, recipe.id).toBe(nilai.length)
      expect(new Set(pairs).size, recipe.id).toBe(pairs.length)
      for (const gap of nilai) {
        if (gap.type !== 'nilai-gizi-kosong') continue
        expect(pairs, recipe.id).toContain(`${gap.ingredientId}:${gap.nutrientId}`)
      }
    }
  })

  it('names each ingredient once', () => {
    const trace = traceFor(findRecipe('gado-gado')!)
    assertConservation(trace)
    const grouped = nilaiKosongPerBahan(trace.gaps)
    const ids = grouped.map((g) => g.ingredientId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining(['kacang-panjang', 'tempe']))
  })

  it('returns nothing when no value is missing', () => {
    const lengkap = RECIPES.map((r) => traceFor(r)).find(
      (t) => !t.gaps.some((gap) => gap.type === 'nilai-gizi-kosong'),
    )
    if (lengkap) {
      assertConservation(lengkap)
      expect(nilaiKosongPerBahan(lengkap.gaps)).toEqual([])
    }
    expect(nilaiKosongPerBahan([])).toEqual([])
  })

  it('ignores the other gap types — they are listed in their own groups', () => {
    const trace = traceFor(findRecipe('wedang-jahe')!)
    assertConservation(trace)
    const grouped = nilaiKosongPerBahan(trace.gaps)
    for (const g of grouped) {
      expect(trace.bahanTanpaData.map((b) => b.ingredientId)).not.toContain(g.ingredientId)
    }
  })
})
