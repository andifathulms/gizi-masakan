/**
 * Alternative cooking methods for an ingredient — the data behind "what if this
 * were boiled instead of fried".
 *
 * Pure and deterministic, like the rest of lib/nutrition. The grouping is
 * authored data in data/factors/pengolahan-alternatif.json; every operation it
 * names is a real row in the transcribed USDA retention table, and this module
 * only indexes and looks them up. It invents no factor and adjusts no value.
 *
 * A code belongs to at most one group. `data:validate` enforces that, and
 * enforces that every retention code a recipe authors is in some group — so a
 * new recipe cannot quietly ship a method with no alternatives while the UI
 * implies there are none.
 */
import alternatifFile from '@/data/factors/pengolahan-alternatif.json'
import { factors } from '@/lib/nutrition/factors'

export interface OperasiPengolahan {
  readonly code: string
  readonly description: string
}

export interface KelompokPengolahan {
  readonly id: string
  readonly labelId: string
  readonly labelEn: string
  readonly operasi: readonly OperasiPengolahan[]
}

export const PENGOLAHAN_KELOMPOK: readonly KelompokPengolahan[] = alternatifFile.kelompok
export const PENGOLAHAN_BASIS = alternatifFile.basis
export const PENGOLAHAN_CATATAN = alternatifFile.catatan

const BY_CODE = new Map<string, KelompokPengolahan>()
for (const kelompok of PENGOLAHAN_KELOMPOK) {
  for (const operasi of kelompok.operasi) BY_CODE.set(operasi.code, kelompok)
}

/** The group a retention code belongs to, or undefined if it is in none. */
export function kelompokUntukKode(code: string): KelompokPengolahan | undefined {
  return BY_CODE.get(code)
}

/**
 * The methods a reader may choose instead of `code`, including `code` itself so
 * the authored choice is always in the list. Empty when the code is in no
 * group, which means the UI offers nothing rather than guessing.
 */
export function alternatifUntuk(code: string): readonly OperasiPengolahan[] {
  return kelompokUntukKode(code)?.operasi ?? []
}

/** True when `code` is a real, transcribed USDA operation. */
export function kodeRetensiAda(code: string): boolean {
  return factors.retentionOperation(code) !== undefined
}

/**
 * Whether `code` is an alternative the reader is actually allowed to pick for
 * an ingredient whose recipe authored `authored`. Used to validate a code
 * arriving from a query string, which is untrusted: a code from a different
 * food group would silently apply chicken factors to spinach.
 */
export function bolehGantiKe(authored: string, code: string): boolean {
  const kelompok = kelompokUntukKode(authored)
  if (!kelompok) return false
  return kelompok.operasi.some((operasi) => operasi.code === code)
}
