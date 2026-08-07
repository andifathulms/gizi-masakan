/**
 * Invariant 4 and invariant 5 — contribution conservation and mass balance,
 * across every shipped recipe.
 */
import { describe, expect, it } from 'vitest'
import { RECIPES } from '@/lib/resep'
import { massBalanceBreach } from '@/lib/nutrition/compute'
import { NUTRIENTS } from '@/lib/nutrition/nutrients'
import { assertConservation, allTraces, traceFor } from '@/tests/helpers'

describe('contribution conservation', () => {
  for (const recipe of RECIPES) {
    it(`sums to the dish total for every nutrient — ${recipe.id}`, () => {
      assertConservation(traceFor(recipe))
    })
  }

  it('holds after a gram weight is edited', () => {
    const recipe = RECIPES.find((entry) => entry.id === 'nasi-uduk')
    expect(recipe).toBeDefined()
    const doubled = traceFor(recipe!, { 'santan-encer': 500 })
    assertConservation(doubled)

    // And the edit actually moves the number, which is the whole point of the
    // recipe strip being editable.
    const original = traceFor(recipe!)
    const energyBefore = original.totals.find((total) => total.nutrientId === '208')!.total
    const energyAfter = doubled.totals.find((total) => total.nutrientId === '208')!.total
    expect(energyAfter).toBeGreaterThan(energyBefore)
    assertConservation(original)
  })

  it('covers every nutrient in the catalogue, not just the ones with values', () => {
    for (const trace of allTraces()) {
      expect(trace.totals.map((total) => total.nutrientId)).toEqual(NUTRIENTS.map((n) => n.id))
      assertConservation(trace)
    }
  })
})

describe('mass balance', () => {
  for (const recipe of RECIPES) {
    it(`cooked weight equals raw times yield — ${recipe.id}`, () => {
      const trace = traceFor(recipe)
      assertConservation(trace)
      expect(massBalanceBreach(trace)).toBeUndefined()
    })
  }

  it('rice roughly triples', () => {
    const trace = traceFor(RECIPES.find((recipe) => recipe.id === 'nasi-putih')!)
    assertConservation(trace)
    const beras = trace.bahan.find((bahan) => bahan.ingredientId === 'beras-putih')
    expect(beras?.yieldState.type).toBe('applied')
    if (beras?.yieldState.type !== 'applied') throw new Error('expected an applied yield')
    expect(beras.yieldState.factor).toBeGreaterThan(2.5)
    expect(beras.yieldState.factor).toBeLessThan(3.5)
    expect(beras.beratMatangG).toBeCloseTo(beras.beratG * beras.yieldState.factor, 9)
  })

  it('meat loses weight', () => {
    const trace = traceFor(RECIPES.find((recipe) => recipe.id === 'soto-ayam')!)
    assertConservation(trace)
    const ayam = trace.bahan.find((bahan) => bahan.ingredientId === 'ayam-utuh-kulit')
    if (ayam?.yieldState.type !== 'applied') throw new Error('expected an applied yield')
    expect(ayam.yieldState.factor).toBeLessThan(1)
    expect(ayam.beratMatangG!).toBeLessThan(ayam.beratG)
  })

  it('leaves the dish cooked weight unknown when any ingredient has no yield factor', () => {
    const trace = traceFor(RECIPES.find((recipe) => recipe.id === 'gado-gado')!)
    assertConservation(trace)
    expect(trace.massa.matangG).toBeUndefined()
    expect(trace.massa.matangTidakDiketahuiDari.length).toBeGreaterThan(0)
    // Not silently equal to the raw weight — that is the failure being guarded.
    expect(trace.massa.matangG).not.toBe(trace.massa.mentahG)
  })
})
