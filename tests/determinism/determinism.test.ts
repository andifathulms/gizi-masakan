/**
 * PRD §8 — same inputs produce a byte-identical trace. The engine has no clock,
 * no randomness and no module-level mutable state, so this should hold, and the
 * test is what keeps it holding.
 */
import { describe, expect, it } from 'vitest'
import { RECIPES } from '@/lib/resep'
import { assertConservation, traceFor } from '@/tests/helpers'

describe('determinism', () => {
  for (const recipe of RECIPES) {
    it(`byte-identical across runs — ${recipe.id}`, () => {
      const first = traceFor(recipe)
      const second = traceFor(recipe)
      assertConservation(first)
      assertConservation(second)
      expect(JSON.stringify(second)).toBe(JSON.stringify(first))
    })
  }

  it('ordering is stable — nutrients, contributions and gaps', () => {
    const trace = traceFor(RECIPES.find((recipe) => recipe.id === 'gado-gado')!)
    const again = traceFor(RECIPES.find((recipe) => recipe.id === 'gado-gado')!)
    assertConservation(trace)
    expect(again.gaps.map((gap) => `${gap.type}:${gap.ingredientId}`)).toEqual(
      trace.gaps.map((gap) => `${gap.type}:${gap.ingredientId}`),
    )
    for (const [index, total] of trace.totals.entries()) {
      expect(again.totals[index]!.contributions.map((c) => c.ingredientId)).toEqual(
        total.contributions.map((c) => c.ingredientId),
      )
    }
  })

  it('an edit changes the trace, and leaves the untouched ingredients alone', () => {
    const recipe = RECIPES.find((entry) => entry.id === 'tempe-goreng')!
    const base = traceFor(recipe)
    const edited = traceFor(recipe, { tempe: 500 })
    const editedAgain = traceFor(recipe, { tempe: 500 })
    assertConservation(base)
    assertConservation(edited)
    expect(JSON.stringify(editedAgain)).toBe(JSON.stringify(edited))
    expect(JSON.stringify(edited)).not.toBe(JSON.stringify(base))

    const sodiumFrom = (trace: typeof base, ingredientId: string) =>
      trace.totals
        .find((total) => total.nutrientId === '307')!
        .contributions.find((contribution) => contribution.ingredientId === ingredientId)!.total
    expect(sodiumFrom(edited, 'garam')).toBe(sodiumFrom(base, 'garam'))
    expect(sodiumFrom(edited, 'tempe')).toBeGreaterThan(sodiumFrom(base, 'tempe'))
  })
})
