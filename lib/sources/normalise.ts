/**
 * The one internal ingredient shape. Invariant 6: `fdc` and `tkpi` both emit an
 * IngredientTable, and compute, render and test never branch on which produced
 * it. Provenance is carried as data (`sourceId`, `fdcId`) for the trace to show,
 * never as a code path.
 *
 * The single rule that matters here: **a nutrient with no value is absent from
 * `per100`, never present as zero.** Zero and unknown are different facts and
 * the whole gap-naming story depends on keeping them apart.
 */
import type { NutrientId } from '@/lib/nutrition/nutrients'

/** per-100g of edible portion. A missing key means "no value", not "zero". */
export type Per100 = Readonly<Partial<Record<NutrientId, number>>>

export interface IngredientEntry {
  /** Local stable slug used by recipes and URLs, e.g. 'santan-kental'. */
  readonly id: string
  readonly namaId: string
  readonly nameEn: string
  /** Invariant 8 — every ingredient carries an FDC id. */
  readonly fdcId: number
  /** FDC description, verbatim, so the approximation is inspectable. */
  readonly fdcDescription: string
  readonly kategori: string
  /**
   * Where the US entry is an imperfect match for the Indonesian ingredient.
   * PRD §3: stated per entry rather than hidden.
   */
  readonly catatan?: string
  readonly per100: Per100
}

export interface IngredientTable {
  /** Which adapter produced this table. Data, not a branch. */
  readonly sourceId: string
  readonly release: string
  readonly generatedOn: string
  readonly entries: ReadonlyMap<string, IngredientEntry>
}

export function lookupIngredient(
  table: IngredientTable,
  ingredientId: string,
): IngredientEntry | undefined {
  return table.entries.get(ingredientId)
}

/**
 * Reads a per-100g value. Returns `undefined` when there is no value — callers
 * must name that as a gap. Never defaults to zero, and there is no parameter
 * that makes it default to zero.
 */
export function per100Value(entry: IngredientEntry, nutrientId: NutrientId): number | undefined {
  const value = entry.per100[nutrientId]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function buildTable(params: {
  sourceId: string
  release: string
  generatedOn: string
  entries: readonly IngredientEntry[]
}): IngredientTable {
  const entries = new Map<string, IngredientEntry>()
  for (const entry of params.entries) {
    if (entries.has(entry.id)) {
      throw new Error(`Duplicate ingredient id "${entry.id}" in source "${params.sourceId}".`)
    }
    entries.set(entry.id, entry)
  }
  return {
    sourceId: params.sourceId,
    release: params.release,
    generatedOn: params.generatedOn,
    entries,
  }
}
