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
import type { Gap, NutritionTrace } from '@/lib/nutrition/trace'
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

/* ------------------------------------------------- how much is not counted */

/**
 * The mass a total could not account for.
 *
 * The gaps panel names what is missing; this says how much of the dish it is.
 * Naming `gula-merah` as absent tells a reader nothing about whether the number
 * beside it is 2% short or most of the drink, and that difference is the whole
 * of "should I trust this".
 *
 * Strictly mass. 25 g of coconut oil and 25 g of water are the same mass and
 * nothing alike, so this must never be read — or rendered — as a share of the
 * nutrient. It answers "how much of what went into the pan is missing from the
 * arithmetic", and nothing else.
 */
export interface MassaTakTerhitung {
  /** Raw grams that contributed nothing. */
  readonly takTerhitungG: number
  /** Raw grams the recipe started from. */
  readonly mentahG: number
  /** takTerhitungG ÷ mentahG. Zero when the recipe has no mass at all. */
  readonly bagian: number
  /** Ingredient names behind it, in recipe order. */
  readonly dari: readonly string[]
}

/**
 * @param nutrientId when given, also counts ingredients that are in the table
 *   but carry no value for that nutrient — they are absent from that total and
 *   present in every other one. Omit for the dish-level figure, which counts
 *   only ingredients with no row at all.
 */
export function massaTakTerhitung(
  trace: NutritionTrace,
  nutrientId?: NutrientId,
): MassaTakTerhitung {
  const tanpaData = trace.bahanTanpaData
  const kosong =
    nutrientId === undefined
      ? []
      : (trace.totals.find((total) => total.nutrientId === nutrientId)?.kosongDari ?? [])

  const dariNilai = trace.bahan.filter((bahan) => kosong.includes(bahan.ingredientId))
  const takTerhitungG =
    tanpaData.reduce((sum, bahan) => sum + bahan.beratG, 0) +
    dariNilai.reduce((sum, bahan) => sum + bahan.beratG, 0)

  return {
    takTerhitungG,
    mentahG: trace.massa.mentahG,
    bagian: trace.massa.mentahG > 0 ? takTerhitungG / trace.massa.mentahG : 0,
    dari: [...tanpaData.map((b) => b.namaId), ...dariNilai.map((b) => b.namaId)],
  }
}
