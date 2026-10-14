/**
 * What a dish is made of, by raw weight — the ring on each dish card.
 *
 * The card's job is to show the recipe, not only three numbers: the recipe is
 * the answer (CLAUDE.md, the fourth rule). Pure, and run during the export, so
 * the client component that draws the ring does no nutrition work
 * (invariant 17).
 *
 * Two rules hold, and the tests assert both:
 *
 * - Mass balance. The segments sum to the recipe's raw weight. Nothing is
 *   rounded away and nothing is dropped, so a ring never implies a dish is
 *   made of less than it is.
 * - Gaps stay visible. An ingredient with no data keeps its own mass in the
 *   ring, flagged, so the card shows a hatched slice before the dish is opened.
 *   The flagged mass equals what gaps.ts reports as uncounted (invariant 2).
 */
import type { NutritionTrace, Recipe } from '@/lib/nutrition/trace'

export interface SegmenKomposisi {
  /** Ingredient id, or 'lainnya' / 'lainnya-tanpa-data' for the remainder. */
  readonly id: string
  readonly namaId: string
  readonly beratG: number
  /** Share of the raw weight, 0–1. */
  readonly bagian: number
  readonly tanpaData: boolean
  /** True when the weight is an estimate rather than weighed. */
  readonly perkiraan: boolean
}

export interface Komposisi {
  readonly mentahG: number
  readonly segmen: readonly SegmenKomposisi[]
}

/** The heaviest few get their own slice; past four a ring is unreadable. */
export const SEGMEN_UTAMA = 4

export function komposisi(recipe: Recipe, trace: NutritionTrace): Komposisi {
  const tanpaData = new Set(trace.bahanTanpaData.map((bahan) => bahan.ingredientId))
  const namaOf = (id: string) =>
    trace.bahan.find((b) => b.ingredientId === id)?.namaId ??
    trace.bahanTanpaData.find((b) => b.ingredientId === id)?.namaId ??
    id

  const mentahG = recipe.bahan.reduce((sum, bahan) => sum + bahan.beratG, 0)
  const bagian = (beratG: number) => (mentahG > 0 ? beratG / mentahG : 0)

  /* Heaviest first; ties keep recipe order, so the ring is deterministic. */
  const urut = recipe.bahan
    .map((bahan, index) => ({ bahan, index }))
    .sort((a, b) => b.bahan.beratG - a.bahan.beratG || a.index - b.index)
    .map(({ bahan }) => bahan)

  const utama = urut.slice(0, SEGMEN_UTAMA)
  const sisa = urut.slice(SEGMEN_UTAMA)

  const segmen: SegmenKomposisi[] = utama.map((bahan) => ({
    id: bahan.ingredientId,
    namaId: namaOf(bahan.ingredientId),
    beratG: bahan.beratG,
    bagian: bagian(bahan.beratG),
    tanpaData: tanpaData.has(bahan.ingredientId),
    perkiraan: bahan.provenance === 'perkiraan',
  }))

  /* The remainder is split by whether it has data, so a missing ingredient
     that is light enough to fall outside the top four still shows hatched. */
  for (const [id, namaId, flag] of [
    ['lainnya', 'Lainnya', false],
    ['lainnya-tanpa-data', 'Lainnya, tanpa data', true],
  ] as const) {
    const bahan = sisa.filter((b) => tanpaData.has(b.ingredientId) === flag)
    const beratG = bahan.reduce((sum, b) => sum + b.beratG, 0)
    if (bahan.length === 0) continue
    segmen.push({
      id,
      namaId,
      beratG,
      bagian: bagian(beratG),
      tanpaData: flag,
      perkiraan: bahan.some((b) => b.provenance === 'perkiraan'),
    })
  }

  return { mentahG, segmen }
}
