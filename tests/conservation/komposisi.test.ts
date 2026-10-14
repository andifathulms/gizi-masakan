/**
 * The ring on each dish card. Mass balance and gap visibility, asserted over
 * all forty recipes, with conservation asserted on every trace used.
 */
import { describe, expect, it } from 'vitest'
import { RECIPES, findRecipe } from '@/lib/resep'
import { komposisi, SEGMEN_UTAMA } from '@/lib/resep/komposisi'
import { massaTakTerhitung } from '@/lib/nutrition/gaps'
import { assertConservation, traceFor } from '../helpers'

describe('komposisi', () => {
  it('sums to the raw weight for every recipe — nothing dropped', () => {
    for (const recipe of RECIPES) {
      const trace = traceFor(recipe)
      assertConservation(trace)
      const k = komposisi(recipe, trace)
      const sum = k.segmen.reduce((s, seg) => s + seg.beratG, 0)
      expect(sum, recipe.id).toBeCloseTo(trace.massa.mentahG, 9)
      expect(k.mentahG).toBeCloseTo(trace.massa.mentahG, 9)
      const bagian = k.segmen.reduce((s, seg) => s + seg.bagian, 0)
      expect(bagian, recipe.id).toBeCloseTo(1, 9)
    }
  })

  it('flags exactly the mass gaps.ts reports as uncounted', () => {
    for (const recipe of RECIPES) {
      const trace = traceFor(recipe)
      assertConservation(trace)
      const flagged = komposisi(recipe, trace)
        .segmen.filter((seg) => seg.tanpaData)
        .reduce((s, seg) => s + seg.beratG, 0)
      expect(flagged, recipe.id).toBeCloseTo(massaTakTerhitung(trace).takTerhitungG, 9)
    }
  })

  it('shows no hatched slice for a recipe with every ingredient in the table', () => {
    const lengkap = RECIPES.find((recipe) => traceFor(recipe).bahanTanpaData.length === 0)!
    const trace = traceFor(lengkap)
    assertConservation(trace)
    expect(komposisi(lengkap, trace).segmen.some((seg) => seg.tanpaData)).toBe(false)
  })

  it('gives the heaviest ingredients their own slices, heaviest first', () => {
    const gadoGado = findRecipe('gado-gado')!
    const trace = traceFor(gadoGado)
    assertConservation(trace)
    const k = komposisi(gadoGado, trace)
    const utama = k.segmen.slice(0, SEGMEN_UTAMA)
    for (let i = 1; i < utama.length; i += 1) {
      expect(utama[i - 1]!.beratG).toBeGreaterThanOrEqual(utama[i]!.beratG)
    }
    /* Gula merah (20 g) falls outside the top four and has no data: it must
       still appear, hatched, in the remainder. */
    expect(k.segmen.find((seg) => seg.id === 'lainnya-tanpa-data')?.tanpaData).toBe(true)
  })

  it('is deterministic', () => {
    const recipe = findRecipe('soto-ayam')!
    const trace = traceFor(recipe)
    assertConservation(trace)
    expect(komposisi(recipe, trace)).toEqual(komposisi(recipe, traceFor(recipe)))
  })
})
