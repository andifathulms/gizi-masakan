/**
 * Invariant 3 — exactly two states, and no third. The important assertion is
 * the negative one: there is no nutrient anywhere in any trace that is neither
 * adjusted-with-a-citation nor explicitly marked unadjusted.
 */
import { describe, expect, it } from 'vitest'
import { RECIPES } from '@/lib/resep'
import { resolveRetention, retentionMultiplier } from '@/lib/nutrition/retention'
import { factors } from '@/lib/nutrition/factors'
import { assertConservation, allTraces, traceFor } from '@/tests/helpers'

describe('retention marking', () => {
  it('every contribution in every recipe is adjusted-with-citation or explicitly unadjusted', () => {
    for (const trace of allTraces()) {
      assertConservation(trace)
      for (const total of trace.totals) {
        for (const contribution of total.contributions) {
          const state = contribution.retention
          switch (state.type) {
            case 'adjusted':
              expect(state.citation.length).toBeGreaterThan(20)
              expect(state.code).toMatch(/^\d{4}$/)
              expect(state.description.length).toBeGreaterThan(0)
              expect(state.factor).toBeGreaterThan(0)
              expect(state.factor).toBeLessThanOrEqual(1)
              break
            case 'unadjusted':
              expect(state.reason.length).toBeGreaterThan(10)
              break
            default: {
              const never: never = state
              throw new Error(`third retention state found: ${JSON.stringify(never)}`)
            }
          }
        }
      }
    }
  })

  it('shows both paths on a single ingredient — adjusted and unadjusted', () => {
    const trace = traceFor(RECIPES.find((recipe) => recipe.id === 'sayur-bening-bayam')!)
    assertConservation(trace)

    // Vitamin C in boiled greens has a published factor.
    const vitC = trace.totals.find((total) => total.nutrientId === '401')!
    const bayamVitC = vitC.contributions.find((c) => c.ingredientId === 'bayam')!
    expect(bayamVitC.retention.type).toBe('adjusted')
    if (bayamVitC.retention.type !== 'adjusted') throw new Error('expected adjusted')
    expect(bayamVitC.retention.factor).toBeLessThan(1)

    // Protein does not. USDA publishes no retention factor for it, so it is
    // marked unadjusted rather than assumed fully retained.
    const protein = trace.totals.find((total) => total.nutrientId === '203')!
    const bayamProtein = protein.contributions.find((c) => c.ingredientId === 'bayam')!
    expect(bayamProtein.retention.type).toBe('unadjusted')
    if (bayamProtein.retention.type !== 'unadjusted') throw new Error('expected unadjusted')
    expect(bayamProtein.retention.reason).toContain('tidak menerbitkan faktor retensi')
  })

  it('an unadjusted nutrient passes through at 1 and says so, rather than claiming 100% retention', () => {
    const state = resolveRetention(
      { labelId: 'Direbus', labelEn: 'Boiled', retentionCode: '3006' },
      '203',
    )
    expect(state.type).toBe('unadjusted')
    expect(retentionMultiplier(state)).toBe(1)
  })

  it('a cooked ingredient with no retention code is a named gap, not a silent pass-through', () => {
    const trace = traceFor(RECIPES.find((recipe) => recipe.id === 'gado-gado')!)
    assertConservation(trace)
    const state = resolveRetention({ labelId: 'Digoreng', labelEn: 'Fried' }, '303')
    expect(state.type).toBe('unadjusted')
    if (state.type !== 'unadjusted') throw new Error('expected unadjusted')
    expect(state.reason).toContain('belum dipetakan')
  })

  it('a raw ingredient is unadjusted for the right reason', () => {
    const state = resolveRetention(undefined, '401')
    expect(state.type).toBe('unadjusted')
    if (state.type !== 'unadjusted') throw new Error('expected unadjusted')
    expect(state.reason).toContain('tidak dimasak')
  })

  it('the nutrients USDA publishes no factors for are declared, not discovered', () => {
    for (const nutrientId of ['208', '203', '204', '205', '291', '323', '430']) {
      expect(factors.unadjustedByDesign).toContain(nutrientId)
    }
    expect(factors.unadjustedReason.length).toBeGreaterThan(20)
  })
})

describe('yield factors carry their provenance', () => {
  it('a derived factor shows the derivation, not just the number', () => {
    const trace = traceFor(RECIPES.find((recipe) => recipe.id === 'nasi-putih')!)
    assertConservation(trace)
    const beras = trace.bahan.find((bahan) => bahan.ingredientId === 'beras-putih')!
    if (beras.yieldState.type !== 'applied') throw new Error('expected applied')
    expect(beras.yieldState.basis).toBe('fdc-dry-matter')
    const derivation = beras.yieldState.derivation!
    expect(derivation.formula).toContain('waterRaw')
    expect(derivation.cookedFdcId).toBeGreaterThan(0)
    expect(derivation.rawFdcWaterPer100).toBeGreaterThan(0)
    expect(derivation.cookedFdcWaterPer100).toBeGreaterThan(derivation.rawFdcWaterPer100)
  })

  it('a USDA factor carries the USDA citation', () => {
    const trace = traceFor(RECIPES.find((recipe) => recipe.id === 'soto-ayam')!)
    assertConservation(trace)
    const ayam = trace.bahan.find((bahan) => bahan.ingredientId === 'ayam-utuh-kulit')!
    if (ayam.yieldState.type !== 'applied') throw new Error('expected applied')
    expect(ayam.yieldState.basis).toBe('usda-yields')
    expect(ayam.yieldState.citation).toContain('USDA')
  })
})
