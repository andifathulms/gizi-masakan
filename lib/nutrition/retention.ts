/**
 * Nutrient retention. Invariant 3, stated once more because it is the rule most
 * easily broken by accident:
 *
 *   A nutrient is either factor-adjusted with the factor cited, or explicitly
 *   marked unadjusted. There is no implicit "assume full retention".
 *
 * `resolveRetention` therefore always returns a RetentionState — never
 * undefined, never a bare 1.0 that a caller could mistake for a real factor.
 * When it returns `unadjusted`, the value passes through unchanged AND the
 * trace says so, which is a different claim from "we applied 100%".
 */
import { factors } from '@/lib/nutrition/factors'
import type { NutrientId } from '@/lib/nutrition/nutrients'
import type { Pengolahan, RetentionState } from '@/lib/nutrition/trace'

const TIDAK_DIMASAK: RetentionState = {
  type: 'unadjusted',
  reason: 'Bahan tidak dimasak, jadi tidak ada retensi yang perlu diterapkan.',
}

export function resolveRetention(
  pengolahan: Pengolahan | undefined,
  nutrientId: NutrientId,
): RetentionState {
  if (!pengolahan) return TIDAK_DIMASAK

  const code = pengolahan.retentionCode
  if (!code) {
    return {
      type: 'unadjusted',
      reason: `Pengolahan "${pengolahan.labelId}" belum dipetakan ke kode faktor retensi USDA.`,
    }
  }

  const operation = factors.retentionOperation(code)
  if (!operation) {
    return {
      type: 'unadjusted',
      reason: `Kode retensi "${code}" tidak ada di tabel USDA yang tersalin.`,
    }
  }

  const factor = operation.factors[nutrientId]
  if (factor === undefined) {
    return {
      type: 'unadjusted',
      reason: factors.unadjustedByDesign.includes(nutrientId)
        ? factors.unadjustedReason
        : `USDA tidak menerbitkan faktor retensi nutrien ini untuk "${operation.description}".`,
    }
  }

  const catatan = factors.retentionNotes[nutrientId]
  return {
    type: 'adjusted',
    factor,
    code: operation.code,
    description: operation.description,
    citation: factors.retentionCitation,
    ...(catatan ? { catatan } : {}),
  }
}

/** The multiplier to apply. Unadjusted means 1, and the state records why. */
export function retentionMultiplier(state: RetentionState): number {
  switch (state.type) {
    case 'adjusted':
      return state.factor
    case 'unadjusted':
      return 1
    default: {
      const never: never = state
      throw new Error(`RetentionState tidak dikenal: ${JSON.stringify(never)}`)
    }
  }
}
