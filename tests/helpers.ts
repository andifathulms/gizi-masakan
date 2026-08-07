/**
 * Shared test fixtures, plus `assertConservation` — the rule from CLAUDE.md
 * that contribution conservation is asserted in EVERY test in EVERY suite, not
 * only in its own. Import it and call it; every suite here does.
 */
import { expect } from 'vitest'
import { compute, conservationBreaches, type ComputeInput } from '@/lib/nutrition/compute'
import { findUnmatched, loadFdcTable } from '@/lib/sources/fdc/load'
import { RECIPES } from '@/lib/resep'
import type { NutritionTrace, Recipe } from '@/lib/nutrition/trace'
import { buildTable, type IngredientEntry, type IngredientTable } from '@/lib/sources/normalise'

export const table = loadFdcTable()
export const unmatched = { get: findUnmatched }

export function traceFor(recipe: Recipe, overrides?: ComputeInput['beratOverrideG']): NutritionTrace {
  return compute({ recipe, table, unmatched, ...(overrides ? { beratOverrideG: overrides } : {}) })
}

export function allTraces(): readonly NutritionTrace[] {
  return RECIPES.map((recipe) => traceFor(recipe))
}

/**
 * Invariant 4. Call this in every test — the sum of per-ingredient
 * contributions equals the dish total for every nutrient.
 */
export function assertConservation(trace: NutritionTrace): void {
  const breaches = conservationBreaches(trace)
  expect(
    breaches,
    `contribution conservation broken in "${trace.recipeId}": ${breaches
      .map((b) => `${b.nutrientId} total=${b.total} sum=${b.sumOfContributions}`)
      .join('; ')}`,
  ).toEqual([])
}

/** Conservation across a whole set, for suites that compute several traces. */
export function assertConservationAll(traces: readonly NutritionTrace[]): void {
  for (const trace of traces) assertConservation(trace)
}

/* ------------------------------------------------------------- fixtures */

/**
 * A tiny hand-built table, so gap tests can construct exactly the missing
 * value they mean to test instead of depending on which values FDC happens to
 * lack this release.
 */
export function fixtureTable(entries: readonly Partial<IngredientEntry>[]): IngredientTable {
  return buildTable({
    sourceId: 'fixture',
    release: 'fixture',
    generatedOn: '2026-08-07',
    entries: entries.map((entry, index) => ({
      id: entry.id ?? `bahan-${index}`,
      namaId: entry.namaId ?? `Bahan ${index}`,
      nameEn: entry.nameEn ?? `Ingredient ${index}`,
      fdcId: entry.fdcId ?? 100000 + index,
      fdcDescription: entry.fdcDescription ?? 'fixture entry',
      kategori: entry.kategori ?? 'fixture',
      ...(entry.catatan ? { catatan: entry.catatan } : {}),
      per100: entry.per100 ?? {},
    })),
  })
}

export function fixtureRecipe(partial: Partial<Recipe> & Pick<Recipe, 'bahan'>): Recipe {
  return {
    id: partial.id ?? 'resep-uji',
    namaId: partial.namaId ?? 'Resep uji',
    nameEn: partial.nameEn ?? 'Test recipe',
    deskripsiId: partial.deskripsiId ?? 'Fixture.',
    kategori: partial.kategori ?? 'uji',
    porsi: partial.porsi ?? 1,
    bahan: partial.bahan,
    sumber: partial.sumber ?? { type: 'own-composition', catatan: 'Fixture.' },
    ditulisPada: partial.ditulisPada ?? '2026-08-07',
  }
}
