/**
 * TKPI adapter — DISABLED. PRD §3, invariant 7.
 *
 * Tabel Komposisi Pangan Indonesia would be the better ingredient source: it is
 * Indonesian, authoritative, and covers the local varieties FDC approximates
 * badly. It is also a copyrighted book with an all-rights-reserved notice, and
 * it is not a peraturan perundang-undangan, so UU 28/2014 Pasal 42 does not
 * exempt it.
 *
 * This file exists so that the day permission is obtained, the accuracy improves
 * without touching anything downstream. It contains NO TKPI values and must
 * never contain any. It calls the licence gate first, and the gate refuses,
 * because the manifest records tkpi as excluded.
 *
 * Do not:
 *   - flip the manifest entry to "enabled"
 *   - paste TKPI values into this file or any data file
 *   - add a code path that reaches loadRows() without the gate
 */
import { assertSourceUsable } from '@/lib/sources/manifest'
import type { IngredientTable } from '@/lib/sources/normalise'

/**
 * Shape a licensed TKPI extract would have to take, matching the FDC row shape
 * so normalise.ts treats both identically. Documented, not populated.
 */
export interface TkpiRow {
  readonly kode: string
  readonly nama: string
  /** per-100g edible portion, keyed by the local nutrient id used across the app */
  readonly per100: Readonly<Record<string, number>>
  /** BDD — bagian dapat dimakan, percent edible */
  readonly bddPersen: number
}

/** Always throws. The gate refuses tkpi; there is no argument that changes that. */
export function loadTkpiTable(): IngredientTable {
  assertSourceUsable('tkpi')
  // Unreachable while the manifest records tkpi as excluded. If a future
  // permission ever resolves the licence, the extract loader goes here.
  throw new Error(
    'TKPI licence resolved in the manifest but no licensed extract is present. ' +
      'Nothing may be loaded until a permitted extract exists.',
  )
}
