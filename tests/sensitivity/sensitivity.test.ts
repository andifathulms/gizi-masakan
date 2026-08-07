/**
 * The sensitivity ranking is an identity, not a simulation: because the engine
 * is linear in weight, the rate of change is the contribution divided by the
 * weight. These assert that identity against the engine itself — if compute
 * ever stopped being linear, this fails rather than quietly lying.
 */
import { describe, expect, it } from 'vitest'
import { compute } from '@/lib/nutrition/compute'
import { kepekaan, LANGKAH_G } from '@/lib/nutrition/sensitivity'
import { findRecipe, RECIPES } from '@/lib/resep'
import { table, traceFor, unmatched } from '../helpers'

const trace = (id: string) => traceFor(findRecipe(id)!)

describe('kepekaan', () => {
  it('matches what the engine actually does when the weight changes', () => {
    const recipe = findRecipe('nasi-uduk')!
    const base = trace('nasi-uduk')
    const before = base.totals.find((t) => t.nutrientId === '208')!.total
    for (const row of kepekaan(base, '208')) {
      const bahan = recipe.bahan.find((b) => b.ingredientId === row.ingredientId)!
      const moved = compute({
        recipe,
        table,
        unmatched,
        beratOverrideG: { [row.ingredientId]: bahan.beratG + LANGKAH_G },
      })
      const after = moved.totals.find((t) => t.nutrientId === '208')!.total
      expect(row.perLangkah).toBeCloseTo(after - before, 8)
    }
  })

  it('is ranked largest first', () => {
    const rows = kepekaan(trace('gado-gado'), '208')
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i - 1]!.perLangkah).toBeGreaterThanOrEqual(rows[i]!.perLangkah)
    }
  })

  it('is a different ranking from contribution share, across the catalogue', () => {
    /* The whole point of the feature. Asserted over every dish and nutrient
       rather than one dish, because for some — nasi uduk's energy among them —
       the biggest contributor really is also the most concentrated, and an
       assertion pinned to a single dish would have claimed otherwise. */
    let differ = 0
    for (const recipe of RECIPES) {
      const t = traceFor(recipe)
      for (const total of t.totals) {
        const rows = kepekaan(t, total.nutrientId)
        if (rows.length < 2) continue
        const byShare = [...rows].sort((a, b) => b.bagianTotal - a.bagianTotal)
        if (rows[0]!.ingredientId !== byShare[0]!.ingredientId) differ += 1
      }
    }
    expect(differ).toBeGreaterThan(100)
  })

  it('carries the current weight, so a dense spice is visibly a spice', () => {
    const recipe = findRecipe('soto-betawi')!
    for (const row of kepekaan(traceFor(recipe), '208')) {
      const bahan = recipe.bahan.find((b) => b.ingredientId === row.ingredientId)!
      expect(row.beratG).toBe(bahan.beratG)
    }
  })

  it('omits ingredients with no data rather than reporting them as inert', () => {
    const t = trace('nasi-uduk')
    const ids = kepekaan(t, '208').map((r) => r.ingredientId)
    for (const bahan of t.bahanTanpaData) expect(ids).not.toContain(bahan.ingredientId)
  })

  it('omits ingredients with no value for the selected nutrient', () => {
    for (const id of ['gado-gado', 'soto-betawi']) {
      const t = trace(id)
      for (const total of t.totals) {
        const ids = kepekaan(t, total.nutrientId).map((r) => r.ingredientId)
        for (const kosong of total.kosongDari) expect(ids).not.toContain(kosong)
      }
    }
  })

  it('returns nothing for an unknown nutrient rather than throwing', () => {
    expect(kepekaan(trace('nasi-putih'), '9999')).toEqual([])
  })

  it('is deterministic across recipes and nutrients', () => {
    for (const recipe of RECIPES.slice(0, 8)) {
      const t = traceFor(recipe)
      for (const total of t.totals) {
        const first = kepekaan(t, total.nutrientId)
        expect(kepekaan(t, total.nutrientId)).toEqual(first)
      }
    }
  })
})
