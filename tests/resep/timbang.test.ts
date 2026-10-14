/**
 * A weighed recipe row is dated (invariant 8: every measured value carries a
 * date). "ditimbang" without a date is a claim nobody can check, so the schema
 * refuses it; "perkiraan" with a date would imply a measurement that never
 * happened, so it refuses that too. Conservation is asserted on a trace built
 * from a weighed row, so the new field never disturbs the engine.
 */
import { describe, expect, it } from 'vitest'
import { BahanSchema, RECIPES, findRecipe } from '@/lib/resep'
import { assertConservation, traceFor } from '../helpers'

const baris = { ingredientId: 'tempe', beratG: 60 }

describe('a recipe row and its weighing date', () => {
  it('accepts a weighed row with its date', () => {
    expect(
      BahanSchema.safeParse({ ...baris, provenance: 'ditimbang', ditimbangPada: '2026-10-15' }).success,
    ).toBe(true)
  })

  it('refuses a weighed row with no date', () => {
    expect(BahanSchema.safeParse({ ...baris, provenance: 'ditimbang' }).success).toBe(false)
  })

  it('refuses a malformed date', () => {
    for (const ditimbangPada of ['15-10-2026', '2026/10/15', '', 'kemarin']) {
      expect(
        BahanSchema.safeParse({ ...baris, provenance: 'ditimbang', ditimbangPada }).success,
        ditimbangPada,
      ).toBe(false)
    }
  })

  it('refuses a date on an estimate — it would imply a weighing that never happened', () => {
    expect(
      BahanSchema.safeParse({ ...baris, provenance: 'perkiraan', ditimbangPada: '2026-10-15' }).success,
    ).toBe(false)
  })

  it('holds for every shipped recipe', () => {
    for (const recipe of RECIPES) {
      for (const bahan of recipe.bahan) {
        expect(BahanSchema.safeParse(bahan).success, `${recipe.id}/${bahan.ingredientId}`).toBe(true)
      }
    }
  })

  it('leaves the arithmetic untouched', () => {
    const gadoGado = findRecipe('gado-gado')!
    const ditimbang = {
      ...gadoGado,
      bahan: gadoGado.bahan.map((b) =>
        b.ingredientId === 'tempe' ? { ...b, provenance: 'ditimbang' as const, ditimbangPada: '2026-10-15' } : b,
      ),
    }
    const a = traceFor(gadoGado)
    const b = traceFor(ditimbang)
    assertConservation(a)
    assertConservation(b)
    expect(b.totals).toEqual(a.totals)
  })
})
