/**
 * The shape compute produces and everything downstream renders. Discriminated
 * unions keyed on `type`, so every consumer switches exhaustively and a new
 * case is a type error rather than a silent fallthrough.
 *
 * Nothing here is optional-because-convenient. Where a value can be unknown,
 * the union says so and the consumer has to handle it.
 *
 * Naming, per CLAUDE.md: masses are grams and end in G. Nutrient values are
 * `per100` in the table and `total` in the trace, never mixed.
 */
import type { NutrientId } from '@/lib/nutrition/nutrients'

/* ---------------------------------------------------------------- recipes */

export type BeratProvenance = 'ditimbang' | 'perkiraan'

/** A yield factor reference — either a derived one or a USDA table row. */
export type YieldRef =
  | { readonly kind: 'derived'; readonly id: string }
  | { readonly kind: 'usda'; readonly code: string }

export interface Pengolahan {
  /** How this ingredient is cooked, in kitchen words. */
  readonly labelId: string
  readonly labelEn: string
  readonly yieldRef?: YieldRef
  /** 4-digit code into the USDA retention table. */
  readonly retentionCode?: string
}

export interface RecipeBahan {
  readonly ingredientId: string
  /** Raw weight as authored. Editing this is what the recipe strip does. */
  readonly beratG: number
  readonly provenance: BeratProvenance
  /** Absent means the ingredient goes in raw and is eaten raw. */
  readonly pengolahan?: Pengolahan
  readonly catatan?: string
}

export type RecipeSumber =
  | { readonly type: 'own-composition'; readonly catatan: string }
  | { readonly type: 'citation'; readonly sumber: string; readonly url?: string }

export interface Recipe {
  readonly id: string
  readonly namaId: string
  readonly nameEn: string
  readonly deskripsiId: string
  readonly kategori: string
  /** How many porsi the whole recipe makes. */
  readonly porsi: number
  readonly bahan: readonly RecipeBahan[]
  readonly sumber: RecipeSumber
  readonly ditulisPada: string
}

/* ------------------------------------------------------------------- gaps */

/**
 * Every way a number can be unknown. Each one is surfaced in the UI; none of
 * them is ever resolved by substituting a zero or a similar ingredient.
 */
export type Gap =
  | {
      readonly type: 'bahan-tanpa-data'
      readonly ingredientId: string
      readonly namaId: string
      readonly beratG: number
      readonly reason: string
      readonly wouldComeFrom: string
    }
  | {
      readonly type: 'nilai-gizi-kosong'
      readonly ingredientId: string
      readonly namaId: string
      readonly nutrientId: NutrientId
      readonly reason: string
    }
  | {
      readonly type: 'faktor-yield-kosong'
      readonly ingredientId: string
      readonly namaId: string
      readonly pengolahanLabel: string
      readonly reason: string
    }
  | {
      readonly type: 'faktor-retensi-kosong'
      readonly ingredientId: string
      readonly namaId: string
      readonly pengolahanLabel: string
      readonly reason: string
    }

/* -------------------------------------------------------------- retention */

/**
 * Invariant 3 — exactly two states. A nutrient is factor-adjusted with the
 * factor and its citation attached, or it is explicitly unadjusted with the
 * reason. There is no third state and no implicit "assume full retention".
 */
export type RetentionState =
  | {
      readonly type: 'adjusted'
      readonly factor: number
      readonly code: string
      readonly description: string
      readonly citation: string
      readonly catatan?: string
    }
  | {
      readonly type: 'unadjusted'
      readonly reason: string
    }

/* ------------------------------------------------------------------ yield */

export type YieldState =
  | {
      readonly type: 'applied'
      readonly factor: number
      readonly labelId: string
      readonly basis: 'usda-yields' | 'fdc-dry-matter'
      readonly citation: string
      readonly derivation?: {
        readonly formula: string
        readonly rawFdcWaterPer100: number
        readonly cookedFdcId: number
        readonly cookedFdcDescription: string
        readonly cookedFdcWaterPer100: number
        readonly reasoning: string
      }
    }
  | { readonly type: 'mentah'; readonly reason: string }
  | { readonly type: 'tidak-diketahui'; readonly reason: string }

/* ---------------------------------------------------------- contributions */

/** One ingredient's contribution to one nutrient. */
export interface Contribution {
  readonly ingredientId: string
  readonly namaId: string
  readonly nutrientId: NutrientId
  readonly beratG: number
  /** Value per 100 g in the ingredient table, before any factor. */
  readonly per100: number
  /** Absolute amount this ingredient puts in the dish, after retention. */
  readonly total: number
  readonly retention: RetentionState
  readonly fdcId: number
}

export interface NutrientTotal {
  readonly nutrientId: NutrientId
  /** Sum of the known contributions. Never silently complete-looking. */
  readonly total: number
  /** False when at least one ingredient had no value for this nutrient. */
  readonly lengkap: boolean
  /** Ingredient ids that could not contribute a value. */
  readonly kosongDari: readonly string[]
  readonly contributions: readonly Contribution[]
}

/* ------------------------------------------------------------------ bahan */

export interface BahanTrace {
  readonly ingredientId: string
  readonly namaId: string
  readonly nameEn: string
  readonly fdcId: number
  readonly fdcDescription: string
  readonly beratG: number
  readonly provenance: BeratProvenance
  /** Cooked weight, when a yield factor is known. */
  readonly beratMatangG: number | undefined
  readonly yieldState: YieldState
  readonly pengolahanLabel: string | undefined
  /** The USDA retention code actually used, authored or chosen by the reader. */
  readonly retentionCode: string | undefined
  /** True when the reader picked a method other than the one the recipe authored. */
  readonly pengolahanDiganti: boolean
  readonly catatan: string | undefined
}

/** An ingredient in the recipe with no row in the ingredient table at all. */
export interface BahanTanpaData {
  readonly ingredientId: string
  readonly namaId: string
  readonly beratG: number
  readonly reason: string
  readonly wouldComeFrom: string
}

/* ------------------------------------------------------------------ trace */

export interface MassaTrace {
  readonly mentahG: number
  /** Undefined when any cooked ingredient has no yield factor. */
  readonly matangG: number | undefined
  /** Ingredients whose cooked weight is unknown, by id. */
  readonly matangTidakDiketahuiDari: readonly string[]
}

export interface NutritionTrace {
  readonly recipeId: string
  readonly namaId: string
  readonly porsi: number
  readonly bahan: readonly BahanTrace[]
  readonly bahanTanpaData: readonly BahanTanpaData[]
  /** Whole-recipe totals, in catalogue order. */
  readonly totals: readonly NutrientTotal[]
  readonly massa: MassaTrace
  readonly gaps: readonly Gap[]
  /** False when gaps.length > 0. The dish still shows its totals, labelled. */
  readonly lengkap: boolean
  readonly sumber: RecipeSumber
  readonly ingredientSourceId: string
  readonly ingredientRelease: string
}

export function totalFor(trace: NutritionTrace, nutrientId: NutrientId): NutrientTotal | undefined {
  return trace.totals.find((total) => total.nutrientId === nutrientId)
}

/** Per-porsi value. Division only — the recipe total is the computed quantity. */
export function perPorsi(trace: NutritionTrace, total: NutrientTotal): number {
  return trace.porsi > 0 ? total.total / trace.porsi : total.total
}
