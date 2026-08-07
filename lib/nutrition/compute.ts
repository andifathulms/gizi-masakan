/**
 * The engine. (recipe, table, factors) → NutritionTrace.
 *
 * Invariant 1: pure and deterministic. No DOM, no React, no clock, no
 * randomness, no module-level mutable state. Runs in Node, and the tests do.
 *
 * The arithmetic is deliberately dull:
 *
 *   contribution = per100 / 100 × beratG × retentionFactor
 *   nutrient total = Σ contributions
 *   cooked weight = beratG × yieldFactor
 *
 * Everything interesting is in what happens when a piece is missing. Nothing is
 * substituted, nothing is dropped: the missing piece becomes a Gap, the
 * nutrient total is marked `lengkap: false` and lists who could not contribute,
 * and the dish still shows its numbers — labelled incomplete. A silently
 * plausible number is the failure this file exists to prevent.
 */
import { NUTRIENTS, type NutrientId } from '@/lib/nutrition/nutrients'
import {
  gapBahanTanpaData,
  gapFaktorRetensiKosong,
  gapFaktorYieldKosong,
  gapNilaiGiziKosong,
  sortGaps,
} from '@/lib/nutrition/gaps'
import { resolveRetention, retentionMultiplier } from '@/lib/nutrition/retention'
import { beratMatangG, resolveYield } from '@/lib/nutrition/yield'
import type {
  BahanTanpaData,
  BahanTrace,
  Contribution,
  Gap,
  NutrientTotal,
  NutritionTrace,
  Pengolahan,
  Recipe,
  RecipeBahan,
} from '@/lib/nutrition/trace'
import { bolehGantiKe } from '@/lib/nutrition/pengolahan'
import { lookupIngredient, per100Value, type IngredientTable } from '@/lib/sources/normalise'

/** Ingredients known to have no public-domain source, keyed by id. */
export interface UnmatchedLookup {
  readonly get: (ingredientId: string) => { namaId: string; reason: string; wouldComeFrom: string } | undefined
}

export interface ComputeInput {
  readonly recipe: Recipe
  readonly table: IngredientTable
  readonly unmatched?: UnmatchedLookup
  /**
   * Gram weights the user has edited, keyed by ingredient id. Overrides the
   * authored weight for that ingredient and nothing else.
   */
  readonly beratOverrideG?: Readonly<Record<string, number>>
  /**
   * Cooking methods the user has chosen instead of the authored one, keyed by
   * ingredient id and given as a USDA retention code.
   *
   * A code is honoured only when it belongs to the same food group as the
   * authored code — `bolehGantiKe` decides, so a code arriving from a query
   * string cannot apply chicken factors to spinach. A rejected code is ignored
   * and the authored method stands.
   *
   * Choosing a different method invalidates the recipe's yield factor, which
   * was published for the authored method. The cooked weight then becomes
   * unknown and is named as a gap rather than carried over as though it still
   * applied — invariant 3's rule, one level up.
   */
  readonly pengolahanOverride?: Readonly<Record<string, string>>
}

/**
 * The cooking method actually used for an ingredient, and whether it is the one
 * the recipe authored. Returns the authored pengolahan untouched when there is
 * no valid override, so the default path is byte-identical to before.
 */
function pengolahanFor(
  bahan: RecipeBahan,
  overrides: Readonly<Record<string, string>> | undefined,
): { pengolahan: Pengolahan | undefined; diganti: boolean } {
  const authored = bahan.pengolahan
  const wanted = overrides?.[bahan.ingredientId]
  if (!authored?.retentionCode || wanted === undefined) return { pengolahan: authored, diganti: false }
  if (wanted === authored.retentionCode) return { pengolahan: authored, diganti: false }
  if (!bolehGantiKe(authored.retentionCode, wanted)) return { pengolahan: authored, diganti: false }
  return {
    // The yield reference is dropped, not replaced: it was published for the
    // authored method and says nothing about this one.
    pengolahan: { ...authored, retentionCode: wanted, yieldRef: undefined },
    diganti: true,
  }
}

function beratFor(bahan: RecipeBahan, overrides: Readonly<Record<string, number>> | undefined): number {
  const override = overrides?.[bahan.ingredientId]
  return typeof override === 'number' && Number.isFinite(override) && override >= 0
    ? override
    : bahan.beratG
}

export function compute(input: ComputeInput): NutritionTrace {
  const { recipe, table } = input
  const gaps: Gap[] = []
  const bahanTraces: BahanTrace[] = []
  const bahanTanpaData: BahanTanpaData[] = []

  // Per nutrient, in catalogue order. Contributions are appended in recipe
  // order, so the trace is stable across runs.
  const contributionsByNutrient = new Map<NutrientId, Contribution[]>(
    NUTRIENTS.map((nutrient) => [nutrient.id, []]),
  )
  const missingByNutrient = new Map<NutrientId, string[]>(
    NUTRIENTS.map((nutrient) => [nutrient.id, []]),
  )

  let mentahG = 0
  let matangG = 0
  const matangTidakDiketahuiDari: string[] = []

  for (const bahan of recipe.bahan) {
    const beratG = beratFor(bahan, input.beratOverrideG)
    const { pengolahan, diganti: pengolahanDiganti } = pengolahanFor(bahan, input.pengolahanOverride)
    mentahG += beratG

    const entry = lookupIngredient(table, bahan.ingredientId)
    if (!entry) {
      // No row at all. Named, and it contributes to nothing — never approximated
      // by a similar ingredient, never quietly skipped.
      const known = input.unmatched?.get(bahan.ingredientId)
      const namaId = known?.namaId ?? bahan.ingredientId
      const reason =
        known?.reason ?? `Bahan "${bahan.ingredientId}" tidak ada di tabel bahan yang dipakai.`
      const wouldComeFrom = known?.wouldComeFrom ?? 'sumber yang belum ada'
      bahanTanpaData.push({ ingredientId: bahan.ingredientId, namaId, beratG, reason, wouldComeFrom })
      gaps.push(gapBahanTanpaData({ ingredientId: bahan.ingredientId, namaId, beratG, reason, wouldComeFrom }))
      matangTidakDiketahuiDari.push(bahan.ingredientId)
      continue
    }

    const yieldState = resolveYield(pengolahan)
    const matang = beratMatangG(beratG, yieldState)
    if (matang === undefined) {
      matangTidakDiketahuiDari.push(bahan.ingredientId)
      gaps.push(
        gapFaktorYieldKosong({
          ingredientId: bahan.ingredientId,
          namaId: entry.namaId,
          pengolahanLabel: pengolahan?.labelId ?? 'diolah',
        }),
      )
    } else {
      matangG += matang
    }

    if (pengolahan && !pengolahan.retentionCode) {
      gaps.push(
        gapFaktorRetensiKosong({
          ingredientId: bahan.ingredientId,
          namaId: entry.namaId,
          pengolahanLabel: pengolahan.labelId,
        }),
      )
    }

    bahanTraces.push({
      ingredientId: entry.id,
      namaId: entry.namaId,
      nameEn: entry.nameEn,
      fdcId: entry.fdcId,
      fdcDescription: entry.fdcDescription,
      beratG,
      provenance: bahan.provenance,
      beratMatangG: matang,
      yieldState,
      pengolahanLabel: pengolahan?.labelId,
      retentionCode: pengolahan?.retentionCode,
      pengolahanDiganti,
      catatan: bahan.catatan ?? entry.catatan,
    })

    for (const nutrient of NUTRIENTS) {
      const per100 = per100Value(entry, nutrient.id)
      if (per100 === undefined) {
        // Unknown, not zero. The nutrient total records who is missing.
        missingByNutrient.get(nutrient.id)?.push(entry.id)
        gaps.push(
          gapNilaiGiziKosong({
            ingredientId: entry.id,
            namaId: entry.namaId,
            nutrientId: nutrient.id,
          }),
        )
        continue
      }
      const retention = resolveRetention(pengolahan, nutrient.id)
      const total = (per100 / 100) * beratG * retentionMultiplier(retention)
      contributionsByNutrient.get(nutrient.id)?.push({
        ingredientId: entry.id,
        namaId: entry.namaId,
        nutrientId: nutrient.id,
        beratG,
        per100,
        total,
        retention,
        fdcId: entry.fdcId,
      })
    }
  }

  const totals: NutrientTotal[] = NUTRIENTS.map((nutrient) => {
    const contributions = contributionsByNutrient.get(nutrient.id) ?? []
    const kosongDari = missingByNutrient.get(nutrient.id) ?? []
    // Summed in recipe order so floating-point rounding is reproducible.
    const total = contributions.reduce((sum, contribution) => sum + contribution.total, 0)
    return {
      nutrientId: nutrient.id,
      total,
      // A nutrient is complete only if every ingredient could speak to it —
      // including the ingredients that have no row in the table at all.
      lengkap: kosongDari.length === 0 && bahanTanpaData.length === 0,
      kosongDari,
      contributions,
    }
  })

  return {
    recipeId: recipe.id,
    namaId: recipe.namaId,
    porsi: recipe.porsi,
    bahan: bahanTraces,
    bahanTanpaData,
    totals,
    massa: {
      mentahG,
      matangG: matangTidakDiketahuiDari.length === 0 ? matangG : undefined,
      matangTidakDiketahuiDari,
    },
    gaps: sortGaps(gaps),
    lengkap: gaps.length === 0,
    sumber: recipe.sumber,
    ingredientSourceId: table.sourceId,
    ingredientRelease: table.release,
  }
}

/**
 * Contribution conservation, as a checkable function rather than only a test
 * assertion — invariant 4. Returns the nutrients whose contributions do not sum
 * to the stated total within `tolerance`.
 */
export function conservationBreaches(
  trace: NutritionTrace,
  tolerance = 1e-9,
): readonly { nutrientId: NutrientId; total: number; sumOfContributions: number }[] {
  const breaches: { nutrientId: NutrientId; total: number; sumOfContributions: number }[] = []
  for (const total of trace.totals) {
    const sum = total.contributions.reduce((running, contribution) => running + contribution.total, 0)
    const scale = Math.max(1, Math.abs(total.total))
    if (Math.abs(sum - total.total) > tolerance * scale) {
      breaches.push({ nutrientId: total.nutrientId, total: total.total, sumOfContributions: sum })
    }
  }
  return breaches
}

/**
 * Mass balance — invariant 5. Cooked weight must equal Σ (raw × yield) for the
 * ingredients whose yield is known. Returns undefined when any cooked weight is
 * unknown, because then there is nothing to check rather than a passing check.
 */
export function massBalanceBreach(
  trace: NutritionTrace,
  tolerance = 1e-6,
): { expectedG: number; actualG: number } | undefined {
  if (trace.massa.matangG === undefined) return undefined
  const expected = trace.bahan.reduce((sum, bahan) => sum + (bahan.beratMatangG ?? 0), 0)
  const scale = Math.max(1, Math.abs(expected))
  if (Math.abs(expected - trace.massa.matangG) > tolerance * scale) {
    return { expectedG: expected, actualG: trace.massa.matangG }
  }
  return undefined
}
