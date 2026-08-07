/**
 * Which assumption actually moves the number.
 *
 * The recipe strip already ranks by contribution, which answers "where does
 * this total come from". It does not answer "if my recipe differs from this
 * one, where does that matter" — and since the recipe is explicitly an
 * assumption (PRD §2), that is the reader's real question. A forty-ingredient
 * dish usually has three ingredients that move the total and the rest is
 * rounding.
 *
 * The two rankings are not the same, and the difference is the point: an
 * ingredient can be most of the total because there is a lot of it, while
 * another moves the number far more per gram. Nasi putih is the biggest share
 * of nasi goreng's energy; minyak sawit moves it most per gram. They diverge
 * in 508 of the 939 dish-by-nutrient pairs in the current catalogue, so this
 * is not a distinction that only shows up in contrived cases.
 *
 * One thing this deliberately does not do is decide which ingredients are
 * worth varying. Ranking by rate alone puts pala bubuk at the top of soto
 * Betawi — true, it is dense — but nobody's recipe differs by 10 g of nutmeg.
 * Suppressing it would need a threshold, and any threshold would be a number
 * invented here rather than derived. So the weight travels with the rate
 * instead, and a 1 g spice is visibly a 1 g spice.
 *
 * No chosen delta, no simulation. The engine computes
 *
 *   contribution = per100 / 100 × beratG × retention
 *
 * which is linear in beratG, so the rate of change is exactly
 *
 *   per100 / 100 × retention
 *
 * — the contribution divided by its own weight. This is an identity, not an
 * approximation, and it is as citable as the arithmetic it comes from.
 *
 * Pure and deterministic, like everything else in lib/nutrition.
 */
import type { NutrientId } from '@/lib/nutrition/nutrients'
import type { NutritionTrace } from '@/lib/nutrition/trace'

/** The display step. The underlying rate is per gram; ten reads better. */
export const LANGKAH_G = 10

export interface Kepekaan {
  readonly ingredientId: string
  readonly namaId: string
  /** Change in the nutrient per LANGKAH_G grams of this ingredient. */
  readonly perLangkah: number
  /** What the recipe currently uses. Carried so a dense 1 g spice reads as a
      1 g spice rather than as advice. */
  readonly beratG: number
  /** Share of the total this ingredient currently supplies. */
  readonly bagianTotal: number
}

/**
 * Ingredients ranked by how much the selected nutrient moves per unit weight,
 * largest first. Ingredients with no data, no value for this nutrient, or no
 * weight are absent — there is no rate to state for them, and inventing a zero
 * would say they are inert rather than unknown.
 */
export function kepekaan(trace: NutritionTrace, nutrientId: NutrientId): readonly Kepekaan[] {
  const total = trace.totals.find((entry) => entry.nutrientId === nutrientId)
  if (!total) return []

  const rows = total.contributions
    .filter((contribution) => contribution.beratG > 0)
    .map((contribution) => ({
      ingredientId: contribution.ingredientId,
      namaId: contribution.namaId,
      perLangkah: (contribution.total / contribution.beratG) * LANGKAH_G,
      beratG: contribution.beratG,
      bagianTotal: total.total > 0 ? contribution.total / total.total : 0,
    }))
    .filter((row) => row.perLangkah > 0)

  // Sorted by rate, then by id so equal rates never reorder between runs.
  return [...rows].sort(
    (a, b) => b.perLangkah - a.perLangkah || a.ingredientId.localeCompare(b.ingredientId),
  )
}
