/**
 * How much of a dish a total could not account for.
 *
 * The figure is strictly mass, and the tests say so: they assert it against
 * gram weights, never against a nutrient. The dangerous version of this feature
 * is one that implies "92% of the energy is counted", which nothing here can
 * support.
 */
import { describe, expect, it } from 'vitest'
import { massaTakTerhitung } from '@/lib/nutrition/gaps'
import { findRecipe } from '@/lib/resep'
import { traceFor } from '../helpers'

const trace = (id: string) => traceFor(findRecipe(id)!)

describe('massaTakTerhitung', () => {
  it('is zero for a recipe with nothing missing', () => {
    const hasil = massaTakTerhitung(trace('nasi-putih'))
    expect(hasil.takTerhitungG).toBe(0)
    expect(hasil.bagian).toBe(0)
    expect(hasil.dari).toEqual([])
  })

  it('counts the raw grams of ingredients with no row at all', () => {
    // nasi uduk carries serai, which has no source.
    const t = trace('nasi-uduk')
    const hasil = massaTakTerhitung(t)
    const expected = t.bahanTanpaData.reduce((sum, b) => sum + b.beratG, 0)
    expect(hasil.takTerhitungG).toBe(expected)
    expect(hasil.takTerhitungG).toBeGreaterThan(0)
    expect(hasil.dari.length).toBe(t.bahanTanpaData.length)
  })

  it('reports the raw mass as the denominator, not the cooked mass', () => {
    const t = trace('nasi-uduk')
    expect(massaTakTerhitung(t).mentahG).toBe(t.massa.mentahG)
  })

  it('is a fraction of the raw mass, between zero and one', () => {
    for (const id of ['gado-gado', 'soto-betawi', 'wedang-jahe', 'rendang-daging']) {
      const hasil = massaTakTerhitung(trace(id))
      expect(hasil.bagian).toBeGreaterThanOrEqual(0)
      expect(hasil.bagian).toBeLessThanOrEqual(1)
      expect(hasil.bagian).toBeCloseTo(hasil.takTerhitungG / hasil.mentahG, 10)
    }
  })

  it('counts more for a nutrient than for the dish when values are missing', () => {
    // Per nutrient it also counts ingredients that are in the table but have
    // no value for that one, so it can only ever be greater or equal.
    for (const id of ['gado-gado', 'soto-betawi', 'opor-ayam']) {
      const t = trace(id)
      const dish = massaTakTerhitung(t).takTerhitungG
      for (const total of t.totals) {
        expect(massaTakTerhitung(t, total.nutrientId).takTerhitungG).toBeGreaterThanOrEqual(dish)
      }
    }
  })

  it('never exceeds the raw mass, even per nutrient', () => {
    for (const id of ['gado-gado', 'soto-betawi', 'wedang-jahe']) {
      const t = trace(id)
      for (const total of t.totals) {
        const hasil = massaTakTerhitung(t, total.nutrientId)
        expect(hasil.takTerhitungG).toBeLessThanOrEqual(hasil.mentahG)
      }
    }
  })

  it('is zero for a nutrient every ingredient can speak to', () => {
    const t = trace('nasi-putih')
    const energi = t.totals.find((x) => x.nutrientId === '208')!
    expect(energi.lengkap).toBe(true)
    expect(massaTakTerhitung(t, '208').takTerhitungG).toBe(0)
  })

  it('is deterministic', () => {
    const t = trace('gado-gado')
    const first = massaTakTerhitung(t, '303')
    for (let i = 0; i < 3; i += 1) expect(massaTakTerhitung(t, '303')).toEqual(first)
  })
})
