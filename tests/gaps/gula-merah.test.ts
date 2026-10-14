/**
 * gula-merah is curated from FDC SR Legacy "Sugars, brown" (168833) as a
 * stated approximation; kecap-manis has no SR Legacy entry and stays a named
 * gap. Both directions, per CLAUDE.md: the curated ingredient is no longer
 * named as missing anywhere, and the one that is still missing is still named
 * everywhere it is used. Conservation asserted on every trace.
 */
import { describe, expect, it } from 'vitest'
import { RECIPES } from '@/lib/resep'
import { findUnmatched } from '@/lib/sources/fdc/load'
import { assertConservation, table, traceFor } from '../helpers'

const memakai = (id: string) =>
  RECIPES.filter((recipe) => recipe.bahan.some((bahan) => bahan.ingredientId === id))

describe('gula-merah, from FDC brown sugar', () => {
  it('is in the ingredient table under its FDC id, with a note saying it approximates', () => {
    const entry = table.entries.get('gula-merah')
    expect(entry?.fdcId).toBe(168833)
    expect(entry?.catatan).toMatch(/pendekatan/i)
    expect(findUnmatched('gula-merah')).toBeUndefined()
  })

  it('is no longer named as an ingredient with no data in any recipe that uses it', () => {
    const recipes = memakai('gula-merah')
    expect(recipes.length).toBeGreaterThan(0)
    for (const recipe of recipes) {
      const trace = traceFor(recipe)
      assertConservation(trace)
      expect(
        trace.gaps.some((gap) => gap.type === 'bahan-tanpa-data' && gap.ingredientId === 'gula-merah'),
        recipe.id,
      ).toBe(false)
      const energi = trace.totals.find((total) => total.nutrientId === '208')!
      const sumbangan = energi.contributions.find((c) => c.ingredientId === 'gula-merah')
      expect(sumbangan?.total ?? 0, recipe.id).toBeGreaterThan(0)
    }
  })
})

describe('kecap-manis, still without a source', () => {
  it('is still named as missing in every recipe that uses it', () => {
    const recipes = memakai('kecap-manis')
    expect(recipes.length).toBeGreaterThan(0)
    expect(findUnmatched('kecap-manis')).toBeDefined()
    for (const recipe of recipes) {
      const trace = traceFor(recipe)
      assertConservation(trace)
      expect(
        trace.gaps.some((gap) => gap.type === 'bahan-tanpa-data' && gap.ingredientId === 'kecap-manis'),
        recipe.id,
      ).toBe(true)
    }
  })
})
