/**
 * Cooking weight change. Invariant 5: cooked weight is raw weight times the
 * yield factor, and a recipe whose weights do not balance is a bug.
 *
 * Three outcomes, and "assume 1.0" is not one of them:
 *   applied           a factor exists, with its citation or its derivation
 *   mentah            the ingredient is not cooked, so there is nothing to apply
 *   tidak-diketahui   it is cooked and no factor exists — the cooked weight is
 *                     left unknown and named as a gap
 */
import { factors } from '@/lib/nutrition/factors'
import type { Pengolahan, YieldState } from '@/lib/nutrition/trace'

const MENTAH: YieldState = {
  type: 'mentah',
  reason: 'Bahan ini tidak dimasak, jadi beratnya tidak berubah.',
}

export function resolveYield(pengolahan: Pengolahan | undefined): YieldState {
  if (!pengolahan) return MENTAH

  const ref = pengolahan.yieldRef
  if (!ref) {
    return {
      type: 'tidak-diketahui',
      reason: `Tidak ada faktor yield untuk pengolahan "${pengolahan.labelId}".`,
    }
  }

  switch (ref.kind) {
    case 'derived': {
      const entry = factors.derivedYield(ref.id)
      if (!entry) {
        return {
          type: 'tidak-diketahui',
          reason: `Faktor yield "${ref.id}" tidak ada di data/factors/yields.json.`,
        }
      }
      const citation = factors.yieldCitations['fdc-dry-matter']?.citation ?? ''
      return {
        type: 'applied',
        factor: entry.factor,
        labelId: entry.labelId,
        basis: 'fdc-dry-matter',
        citation,
        derivation: entry.derivation,
      }
    }
    case 'usda': {
      const entry = factors.usdaYield(ref.code)
      if (!entry) {
        return {
          type: 'tidak-diketahui',
          reason: `Kode yield USDA "${ref.code}" tidak ada di data/factors/yields.json.`,
        }
      }
      const citation = factors.yieldCitations['usda-yields']?.citation ?? ''
      return {
        type: 'applied',
        factor: entry.factor,
        labelId: `${entry.description} — ${entry.method}`,
        basis: 'usda-yields',
        citation,
      }
    }
    default: {
      const never: never = ref
      throw new Error(`YieldRef tidak dikenal: ${JSON.stringify(never)}`)
    }
  }
}

/** Cooked weight, or undefined when no factor is known. Never falls back. */
export function beratMatangG(beratG: number, state: YieldState): number | undefined {
  switch (state.type) {
    case 'applied':
      return beratG * state.factor
    case 'mentah':
      return beratG
    case 'tidak-diketahui':
      return undefined
    default: {
      const never: never = state
      throw new Error(`YieldState tidak dikenal: ${JSON.stringify(never)}`)
    }
  }
}
