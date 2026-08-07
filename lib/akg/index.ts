/**
 * AKG lookup and adequacy. PRD §6.3, §5.
 *
 * Adequacy answers *am I getting enough* — the result is "this dish
 * contributes X% of the daily figure", never "you have Y% remaining". There is
 * deliberately no function here that subtracts, accumulates across dishes, or
 * returns a number to stay under. A ceiling is a different product.
 *
 * Where the regulation's unit does not match the unit our ingredient table
 * uses, the comparison is REFUSED rather than fudged, and the refusal is
 * reported so the UI can say why.
 */
import akgJson from '@/data/akg/permenkes-28-2019.json'
import { nutrientById, type NutrientId } from '@/lib/nutrition/nutrients'

export interface KelompokAkg {
  readonly id: string
  readonly label: string
  readonly jenisKelamin: 'anak' | 'laki-laki' | 'perempuan'
  readonly umurMin: number
  readonly umurMax: number
  readonly nilai: Readonly<Record<string, number>>
}

interface AkgFile {
  readonly citation: string
  readonly citationUrl: string
  readonly licence: string
  readonly transcribedOn: string
  readonly transcribedFrom: string
  readonly unitsAsPrinted: Readonly<Record<string, string>>
  readonly catatanSatuan: Readonly<Record<string, string>>
  readonly kelompokTidakDimuat: { readonly kelompok: readonly string[]; readonly alasan: string }
  readonly kelompok: readonly KelompokAkg[]
}

const akgFile = akgJson as unknown as AkgFile

export const AKG_CITATION = akgFile.citation
export const AKG_CITATION_URL = akgFile.citationUrl
export const AKG_TRANSCRIBED_ON = akgFile.transcribedOn
export const AKG_KELOMPOK: readonly KelompokAkg[] = akgFile.kelompok
export const AKG_KELOMPOK_TIDAK_DIMUAT = akgFile.kelompokTidakDimuat

export function findKelompok(id: string): KelompokAkg | undefined {
  return AKG_KELOMPOK.find((kelompok) => kelompok.id === id)
}

/** The group shown before the reader picks one. Not a default "user profile". */
export const KELOMPOK_AWAL = 'laki-19-29'

/**
 * The unit the regulation prints, mapped onto ours. `mcg` and `µg` are the same
 * unit written differently; anything else is a genuine mismatch.
 */
function unitsAgree(printed: string, ours: string): boolean {
  const normalise = (unit: string) => (unit === 'mcg' ? 'µg' : unit === 'kkal' ? 'kcal' : unit)
  return normalise(printed) === normalise(ours)
}

export type Adequacy =
  | {
      readonly type: 'dibandingkan'
      readonly nutrientId: NutrientId
      readonly akg: number
      readonly unit: string
      /** Share of the daily figure this amount contributes. Never a remainder. */
      readonly bagian: number
      readonly catatan?: string
    }
  | {
      readonly type: 'tidak-dibandingkan'
      readonly nutrientId: NutrientId
      readonly reason: string
    }

/**
 * How much of the AKG figure `total` contributes. `total` is one portion of one
 * dish — this function has no memory and no notion of a day's running sum.
 */
export function adequacyFor(
  kelompok: KelompokAkg,
  nutrientId: NutrientId,
  total: number,
): Adequacy {
  const nutrient = nutrientById(nutrientId)
  if (!nutrient) {
    return { type: 'tidak-dibandingkan', nutrientId, reason: `Nutrien "${nutrientId}" tidak dikenal.` }
  }
  const akg = kelompok.nilai[nutrientId]
  if (akg === undefined) {
    return {
      type: 'tidak-dibandingkan',
      nutrientId,
      reason: `Permenkes 28/2019 tidak memuat angka kecukupan ${nutrient.labelId} untuk kelompok ${kelompok.label}.`,
    }
  }
  const printedUnit = akgFile.unitsAsPrinted[nutrientId]
  if (!printedUnit || !unitsAgree(printedUnit, nutrient.unit)) {
    return {
      type: 'tidak-dibandingkan',
      nutrientId,
      reason:
        akgFile.catatanSatuan[nutrientId] ??
        `Satuan AKG (${printedUnit ?? 'tidak tercatat'}) tidak sama dengan satuan tabel gizi (${nutrient.unit}), jadi tidak dibandingkan.`,
    }
  }
  if (akg <= 0) {
    return {
      type: 'tidak-dibandingkan',
      nutrientId,
      reason: `Angka kecukupan ${nutrient.labelId} untuk kelompok ini nol atau tidak berlaku.`,
    }
  }
  const catatan = akgFile.catatanSatuan[nutrientId]
  return {
    type: 'dibandingkan',
    nutrientId,
    akg,
    unit: printedUnit,
    bagian: total / akg,
    ...(catatan ? { catatan } : {}),
  }
}
