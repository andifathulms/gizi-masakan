/**
 * Gap detection and naming. Invariant 2, and the reason this file was written
 * before the engine rather than after it.
 *
 * The dangerous failure in a nutrition calculator is not an error — it is a
 * plausible number. An ingredient with no data, dropped quietly, leaves a total
 * that still looks right and is understated by exactly the amount nobody can
 * see. So every unknown becomes a Gap, every Gap is carried in the trace, and
 * the UI shows them.
 *
 * There is no function in this file that fills a gap. There is no default
 * value, no nearest-neighbour fallback, no zero substitution. That is the point.
 */
import type { Gap } from '@/lib/nutrition/trace'
import { nutrientById, type NutrientId } from '@/lib/nutrition/nutrients'

export function gapBahanTanpaData(params: {
  ingredientId: string
  namaId: string
  beratG: number
  reason: string
  wouldComeFrom: string
}): Gap {
  return { type: 'bahan-tanpa-data', ...params }
}

export function gapNilaiGiziKosong(params: {
  ingredientId: string
  namaId: string
  nutrientId: NutrientId
}): Gap {
  const label = nutrientById(params.nutrientId)?.labelId ?? params.nutrientId
  return {
    type: 'nilai-gizi-kosong',
    ...params,
    reason: `FDC tidak punya nilai ${label} untuk ${params.namaId}. Nilainya tidak dianggap nol — bahan ini tidak dihitung untuk ${label}.`,
  }
}

export function gapFaktorYieldKosong(params: {
  ingredientId: string
  namaId: string
  pengolahanLabel: string
}): Gap {
  return {
    type: 'faktor-yield-kosong',
    ...params,
    reason: `Tidak ada faktor yield untuk ${params.namaId} yang ${params.pengolahanLabel.toLowerCase()}. Berat matangnya tidak dihitung, bukan dianggap sama dengan berat mentah.`,
  }
}

export function gapFaktorRetensiKosong(params: {
  ingredientId: string
  namaId: string
  pengolahanLabel: string
}): Gap {
  return {
    type: 'faktor-retensi-kosong',
    ...params,
    reason: `Tidak ada kode faktor retensi untuk ${params.namaId} yang ${params.pengolahanLabel.toLowerCase()}. Semua nutriennya lewat tanpa penyesuaian dan ditandai demikian.`,
  }
}

/** One line per gap, for the UI and for test messages. */
export function describeGap(gap: Gap): string {
  switch (gap.type) {
    case 'bahan-tanpa-data':
      return `${gap.namaId} (${gap.beratG} g) tidak ada di tabel bahan. ${gap.reason}`
    case 'nilai-gizi-kosong':
      return gap.reason
    case 'faktor-yield-kosong':
      return gap.reason
    case 'faktor-retensi-kosong':
      return gap.reason
    default: {
      const never: never = gap
      throw new Error(`Gap tidak dikenal: ${JSON.stringify(never)}`)
    }
  }
}

export type GapSeverity = 'bahan-hilang' | 'nilai-hilang' | 'faktor-hilang'

/**
 * How badly a gap distorts the number. A missing ingredient understates every
 * nutrient at once and is the worst of the three; a missing factor changes the
 * value least. Used for ordering in the UI, never for hiding anything.
 */
export function gapSeverity(gap: Gap): GapSeverity {
  switch (gap.type) {
    case 'bahan-tanpa-data':
      return 'bahan-hilang'
    case 'nilai-gizi-kosong':
      return 'nilai-hilang'
    case 'faktor-yield-kosong':
    case 'faktor-retensi-kosong':
      return 'faktor-hilang'
    default: {
      const never: never = gap
      throw new Error(`Gap tidak dikenal: ${JSON.stringify(never)}`)
    }
  }
}

const SEVERITY_ORDER: readonly GapSeverity[] = ['bahan-hilang', 'nilai-hilang', 'faktor-hilang']

/**
 * Stable ordering: worst first, then by ingredient, then by nutrient. Stable so
 * the trace is byte-identical across runs — determinism is asserted in tests.
 */
export function sortGaps(gaps: readonly Gap[]): readonly Gap[] {
  return [...gaps].sort((left, right) => {
    const bySeverity =
      SEVERITY_ORDER.indexOf(gapSeverity(left)) - SEVERITY_ORDER.indexOf(gapSeverity(right))
    if (bySeverity !== 0) return bySeverity
    const byIngredient = left.ingredientId.localeCompare(right.ingredientId)
    if (byIngredient !== 0) return byIngredient
    const leftNutrient = left.type === 'nilai-gizi-kosong' ? left.nutrientId : ''
    const rightNutrient = right.type === 'nilai-gizi-kosong' ? right.nutrientId : ''
    return leftNutrient.localeCompare(rightNutrient)
  })
}

/** Groups the per-nutrient gaps by nutrient, for the nutrient rows in the UI. */
export function gapsByNutrient(gaps: readonly Gap[]): ReadonlyMap<NutrientId, readonly Gap[]> {
  const byNutrient = new Map<NutrientId, Gap[]>()
  for (const gap of gaps) {
    if (gap.type !== 'nilai-gizi-kosong') continue
    const existing = byNutrient.get(gap.nutrientId)
    if (existing) existing.push(gap)
    else byNutrient.set(gap.nutrientId, [gap])
  }
  return byNutrient
}
