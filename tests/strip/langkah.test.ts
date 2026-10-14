/**
 * The stepper feeds gram weights into the engine, so it is held to the same
 * rule as every other input: no negative mass, no floating-point residue in a
 * weight that then lands in a shared URL. Each case also runs the stepped
 * weight through compute and asserts conservation, per CLAUDE.md.
 */
import { describe, expect, it } from 'vitest'
import { langkahBerat, LANGKAH_STEPPER_G } from '@/lib/portion/langkah'
import { findRecipe } from '@/lib/resep'
import { assertConservation, traceFor } from '../helpers'

const gadoGado = findRecipe('gado-gado')!
const kacang = gadoGado.bahan.find((bahan) => bahan.ingredientId === 'kacang-tanah-sangrai')!

describe('langkahBerat', () => {
  it('steps up and down by the given amount', () => {
    expect(langkahBerat(70, LANGKAH_STEPPER_G)).toBe(75)
    expect(langkahBerat(70, -LANGKAH_STEPPER_G)).toBe(65)
    assertConservation(traceFor(gadoGado, { [kacang.ingredientId]: langkahBerat(70, 5) }))
  })

  it('never goes below zero', () => {
    expect(langkahBerat(3, -LANGKAH_STEPPER_G)).toBe(0)
    expect(langkahBerat(0, -LANGKAH_STEPPER_G)).toBe(0)
    assertConservation(traceFor(gadoGado, { [kacang.ingredientId]: langkahBerat(3, -5) }))
  })

  it('leaves no floating-point residue on a decimal weight', () => {
    expect(langkahBerat(12.3, -LANGKAH_STEPPER_G)).toBe(7.3)
    expect(langkahBerat(0.1, 0.2)).toBe(0.3)
    assertConservation(traceFor(gadoGado, { [kacang.ingredientId]: langkahBerat(12.3, -5) }))
  })

  it('moves the dish total by exactly the stepped contribution', () => {
    const asli = traceFor(gadoGado)
    const naik = traceFor(gadoGado, { [kacang.ingredientId]: langkahBerat(kacang.beratG, 5) })
    const energi = (trace: typeof asli) => trace.totals.find((t) => t.nutrientId === '208')!
    const sumbangan = (trace: typeof asli) =>
      energi(trace).contributions.find((c) => c.ingredientId === kacang.ingredientId)!.total
    expect(energi(naik).total - energi(asli).total).toBeCloseTo(sumbangan(naik) - sumbangan(asli), 9)
    assertConservation(asli)
    assertConservation(naik)
  })
})
