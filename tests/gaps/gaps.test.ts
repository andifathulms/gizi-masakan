/**
 * Invariant 2, tested in both directions: an incomplete recipe names its gaps,
 * a complete one names none. Plus the specific ways a value could be lost
 * silently — each has a test that would fail if the value were dropped or
 * zeroed instead.
 */
import { describe, expect, it } from 'vitest'
import { compute } from '@/lib/nutrition/compute'
import { RECIPES } from '@/lib/resep'
import { describeGap } from '@/lib/nutrition/gaps'
import {
  assertConservation,
  fixtureRecipe,
  fixtureTable,
  traceFor,
  unmatched,
} from '@/tests/helpers'

describe('gap coverage, both directions', () => {
  it('a complete recipe names no gaps', () => {
    const trace = traceFor(RECIPES.find((recipe) => recipe.id === 'nasi-putih')!)
    assertConservation(trace)
    expect(trace.gaps).toEqual([])
    expect(trace.lengkap).toBe(true)
    expect(trace.totals.every((total) => total.lengkap)).toBe(true)
  })

  it('a recipe with an ingredient outside the table names it', () => {
    const trace = traceFor(RECIPES.find((recipe) => recipe.id === 'tumis-kangkung')!)
    assertConservation(trace)
    expect(trace.lengkap).toBe(false)
    const missing = trace.gaps.filter((gap) => gap.type === 'bahan-tanpa-data')
    expect(missing.map((gap) => gap.ingredientId)).toContain('kangkung')
    // Named with its weight, so the reader can see how much is unaccounted for.
    const kangkung = trace.bahanTanpaData.find((bahan) => bahan.ingredientId === 'kangkung')
    expect(kangkung?.beratG).toBe(250)
  })
})

describe('a missing ingredient is never approximated away', () => {
  const table = fixtureTable([{ id: 'ada', per100: { '208': 100, '203': 10 } }])
  const recipe = fixtureRecipe({
    bahan: [
      { ingredientId: 'ada', beratG: 100, provenance: 'ditimbang' },
      { ingredientId: 'tidak-ada', beratG: 100, provenance: 'ditimbang' },
    ],
  })

  it('contributes nothing, appears in the trace, and marks every nutrient incomplete', () => {
    const trace = compute({ recipe, table })
    assertConservation(trace)

    const energy = trace.totals.find((total) => total.nutrientId === '208')!
    expect(energy.total).toBe(100) // only the ingredient that has data
    expect(energy.lengkap).toBe(false)
    expect(trace.bahanTanpaData.map((bahan) => bahan.ingredientId)).toEqual(['tidak-ada'])
    expect(trace.gaps.some((gap) => gap.type === 'bahan-tanpa-data')).toBe(true)

    // The raw weight still counts toward the dish mass — the food is on the
    // plate even when its data is not.
    expect(trace.massa.mentahG).toBe(200)
    expect(trace.massa.matangG).toBeUndefined()
  })

  it('does not fall back to a similar ingredient', () => {
    const trace = compute({ recipe, table })
    assertConservation(trace)
    const energy = trace.totals.find((total) => total.nutrientId === '208')!
    expect(energy.contributions.map((contribution) => contribution.ingredientId)).toEqual(['ada'])
  })
})

describe('a missing nutrient value is unknown, not zero', () => {
  const table = fixtureTable([
    { id: 'lengkap', per100: { '208': 100, '303': 5 } },
    { id: 'tanpa-besi', per100: { '208': 100 } }, // no iron value at all
  ])
  const recipe = fixtureRecipe({
    bahan: [
      { ingredientId: 'lengkap', beratG: 100, provenance: 'ditimbang' },
      { ingredientId: 'tanpa-besi', beratG: 100, provenance: 'ditimbang' },
    ],
  })

  it('names the gap and records who could not contribute', () => {
    const trace = compute({ recipe, table })
    assertConservation(trace)

    const iron = trace.totals.find((total) => total.nutrientId === '303')!
    expect(iron.total).toBe(5)
    expect(iron.lengkap).toBe(false)
    expect(iron.kosongDari).toEqual(['tanpa-besi'])

    const gap = trace.gaps.find(
      (entry) => entry.type === 'nilai-gizi-kosong' && entry.nutrientId === '303',
    )
    expect(gap).toBeDefined()
    expect(describeGap(gap!)).toContain('tidak dianggap nol')
  })

  it('leaves nutrients that everyone could speak to marked complete', () => {
    const trace = compute({ recipe, table })
    assertConservation(trace)
    const energy = trace.totals.find((total) => total.nutrientId === '208')!
    expect(energy.total).toBe(200)
    expect(energy.lengkap).toBe(true)
    expect(energy.kosongDari).toEqual([])
  })
})

describe('every shipped recipe reports its own state truthfully', () => {
  for (const recipe of RECIPES) {
    it(`gaps and lengkap agree — ${recipe.id}`, () => {
      const trace = traceFor(recipe)
      assertConservation(trace)
      expect(trace.lengkap).toBe(trace.gaps.length === 0)
      // Every gap describes itself in words a reader can act on.
      for (const gap of trace.gaps) {
        expect(describeGap(gap).length).toBeGreaterThan(20)
      }
    })
  }

  it('an ingredient with no public-domain source explains where it would come from', () => {
    const trace = compute({
      recipe: RECIPES.find((recipe) => recipe.id === 'semur-daging')!,
      table: fixtureTable([]),
      unmatched,
    })
    assertConservation(trace)
    const kecap = trace.bahanTanpaData.find((bahan) => bahan.ingredientId === 'kecap-manis')
    expect(kecap?.wouldComeFrom).toContain('TKPI')
    expect(kecap?.reason.length).toBeGreaterThan(20)
  })
})
