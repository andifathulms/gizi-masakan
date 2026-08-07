/**
 * FDC adapter. Reads the projection emitted by scripts/fdc-pipeline.ts and
 * normalises it to the one internal IngredientTable (invariant 6).
 *
 * Runs the licence gate before touching the data (invariant 7), decodes the
 * packed Float32Array, and — the part that matters — turns NaN back into an
 * absent key rather than a zero. A nutrient FDC has no value for stays unknown
 * all the way to the trace, where it is named.
 *
 * No network. The projection is a committed module, imported and bundled.
 */
import { assertSourceUsable } from '@/lib/sources/manifest'
import { buildTable, type IngredientEntry, type IngredientTable, type Per100 } from '@/lib/sources/normalise'
import tableJson from '@/data/ingredients/table.json'
import unmatchedJson from '@/data/ingredients/unmatched.json'

interface RawIngredient {
  readonly id: string
  readonly namaId: string
  readonly nameEn: string
  readonly fdcId: number
  readonly fdcDescription: string
  readonly kategori: string
  readonly catatan?: string
}

function decodeBase64(value: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
  // Node — tests and the build.
  return new Uint8Array(Buffer.from(value, 'base64'))
}

function decodeValues(base64: string, expectedLength: number): Float32Array {
  const bytes = decodeBase64(base64)
  const values = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
  if (values.length !== expectedLength) {
    throw new Error(
      `data/ingredients/table.json is inconsistent: expected ${expectedLength} packed values, found ${values.length}. Re-run pnpm fdc:build.`,
    )
  }
  return values
}

let cached: IngredientTable | undefined

/** The shipped ingredient table. Built once, then shared — it is immutable. */
export function loadFdcTable(): IngredientTable {
  if (cached) return cached

  assertSourceUsable('fdc')

  const raw = tableJson as unknown as {
    sourceId: string
    release: string
    generatedOn: string
    nutrientIds: string[]
    ingredients: RawIngredient[]
    values: string
  }

  const nutrientIds = raw.nutrientIds
  const values = decodeValues(raw.values, raw.ingredients.length * nutrientIds.length)

  const entries: IngredientEntry[] = raw.ingredients.map((ingredient, rowIndex) => {
    const per100: Record<string, number> = {}
    nutrientIds.forEach((nutrientId, colIndex) => {
      const value = values[rowIndex * nutrientIds.length + colIndex]
      // NaN means FDC has no value. Leave the key absent; never write 0.
      if (value !== undefined && Number.isFinite(value)) per100[nutrientId] = value
    })
    return {
      id: ingredient.id,
      namaId: ingredient.namaId,
      nameEn: ingredient.nameEn,
      fdcId: ingredient.fdcId,
      fdcDescription: ingredient.fdcDescription,
      kategori: ingredient.kategori,
      ...(ingredient.catatan ? { catatan: ingredient.catatan } : {}),
      per100: per100 as Per100,
    }
  })

  cached = buildTable({
    sourceId: raw.sourceId,
    release: raw.release,
    generatedOn: raw.generatedOn,
    entries,
  })
  return cached
}

export interface UnmatchedIngredient {
  readonly id: string
  readonly namaId: string
  readonly nameEn: string
  readonly reason: string
  readonly wouldComeFrom: string
}

/**
 * Indonesian ingredients with no acceptable public-domain source. Recipes may
 * reference these; compute names them as gaps rather than approximating them.
 */
export function unmatchedIngredients(): readonly UnmatchedIngredient[] {
  return (unmatchedJson as { ingredients: UnmatchedIngredient[] }).ingredients
}

export function findUnmatched(ingredientId: string): UnmatchedIngredient | undefined {
  return unmatchedIngredients().find((ingredient) => ingredient.id === ingredientId)
}

/** Release metadata for the method page. */
export function fdcRelease(): { release: string; generatedOn: string } {
  const raw = tableJson as unknown as { release: string; generatedOn: string }
  return { release: raw.release, generatedOn: raw.generatedOn }
}
