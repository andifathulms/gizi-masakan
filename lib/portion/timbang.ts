/**
 * Recording scale readings into the data — the pure half of `pnpm timbang`.
 *
 * Invariant 9: URT weights are measured, not estimated; invariant 8: every
 * measured value carries a date. This turns readings typed off a kitchen scale
 * into entries that satisfy both, and refuses anything else rather than
 * coercing it (invariant 19) — a reading of "15o" or "-3" is a typo, and a
 * typo saved as a weight is a plausible wrong number.
 *
 * No clock here: the date is passed in by the script, so this stays testable.
 */
import { TakaranSchema, type Takaran } from '@/lib/portion'

export type Hasil<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string }

const ISO = /^\d{4}-\d{2}-\d{2}$/

/** The protocol in data/urt/takaran.json: three fresh fills, averaged. */
export const ULANGAN_MIN = 3

/** One reading, as typed. Digits with an optional decimal point, greater than zero. */
export function bacaGram(teks: string): Hasil<number> {
  const trimmed = teks.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return { ok: false, error: `"${teks}" is not a weight in grams.` }
  const gram = Number(trimmed)
  if (!(gram > 0)) return { ok: false, error: `"${teks}" is not greater than zero.` }
  return { ok: true, value: gram }
}

/** Readings averaged to a tenth of a gram. At least ULANGAN_MIN of them. */
export function rataUlangan(teks: readonly string[]): Hasil<{ gramG: number; jumlahUlangan: number }> {
  if (teks.length < ULANGAN_MIN)
    return {
      ok: false,
      error: `${teks.length} reading(s) given; the protocol asks for ${ULANGAN_MIN} fresh fills.`,
    }
  const nilai: number[] = []
  for (const t of teks) {
    const r = bacaGram(t)
    if (!r.ok) return r
    nilai.push(r.value)
  }
  const rata = nilai.reduce((a, b) => a + b, 0) / nilai.length
  return { ok: true, value: { gramG: Math.round(rata * 10) / 10, jumlahUlangan: nilai.length } }
}

export function cekTanggal(tanggal: string): Hasil<string> {
  if (!ISO.test(tanggal)) return { ok: false, error: `"${tanggal}" is not an ISO date (yyyy-mm-dd).` }
  const d = new Date(`${tanggal}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== tanggal)
    return { ok: false, error: `"${tanggal}" is not a real date.` }
  return { ok: true, value: tanggal }
}

/**
 * Mark one row of a recipe file as weighed: new weight, provenance ditimbang,
 * and the date. A targeted edit to that row's text, so a recipe file's
 * hand-kept formatting is not churned by a re-serialise; the result is parsed
 * back and compared, so the edit can only ever touch the one row.
 */
export function tandaiDitimbang(
  teksResep: string,
  ingredientId: string,
  gramG: number,
  tanggal: string,
): Hasil<string> {
  const before = JSON.parse(teksResep) as { bahan: Record<string, unknown>[] }
  const index = before.bahan.findIndex((b) => b.ingredientId === ingredientId)
  if (index < 0) return { ok: false, error: `This recipe has no ingredient "${ingredientId}".` }
  if (before.bahan.filter((b) => b.ingredientId === ingredientId).length > 1)
    return { ok: false, error: `"${ingredientId}" appears more than once; edit it by hand.` }

  const anchor = `"ingredientId": "${ingredientId}"`
  const start = teksResep.indexOf(anchor)
  const next = teksResep.indexOf('"ingredientId":', start + anchor.length)
  const end = next < 0 ? teksResep.lastIndexOf(']') : next
  let row = teksResep.slice(start, end)

  if (!/"beratG":\s*[\d.]+/.test(row) || !/"provenance":\s*"(perkiraan|ditimbang)"/.test(row))
    return { ok: false, error: `Could not find beratG and provenance on "${ingredientId}"; edit it by hand.` }
  row = row.replace(/"beratG":\s*[\d.]+/, `"beratG": ${gramG}`)
  row = row.replace(/,\s*"ditimbangPada":\s*"[^"]*"/, '')
  /* One field per line where the file has one field per line; inline where
     the row is written inline. */
  const indent = row.match(/\n([ \t]*)"provenance":/)?.[1]
  const pemisah = indent === undefined ? ' ' : `\n${indent}`
  row = row.replace(
    /"provenance":\s*"(perkiraan|ditimbang)"/,
    `"provenance": "ditimbang",${pemisah}"ditimbangPada": "${tanggal}"`,
  )
  const teks = teksResep.slice(0, start) + row + teksResep.slice(end)

  let after: { bahan: Record<string, unknown>[] }
  try {
    after = JSON.parse(teks) as typeof after
  } catch {
    return { ok: false, error: `The edit would not leave valid JSON; edit "${ingredientId}" by hand.` }
  }
  const expected = structuredClone(before)
  expected.bahan[index] = {
    ...before.bahan[index],
    beratG: gramG,
    provenance: 'ditimbang',
    ditimbangPada: tanggal,
  }
  if (JSON.stringify(sortKeys(after)) !== JSON.stringify(sortKeys(expected)))
    return { ok: false, error: `The edit changed more than "${ingredientId}"; edit it by hand.` }
  return { ok: true, value: teks }
}

/** Add a weighed takaran to the URT file, or replace one with the same id. */
export function tambahTakaran(
  file: { entries: readonly unknown[] } & Record<string, unknown>,
  entri: Takaran,
  ganti: boolean,
): Hasil<typeof file> {
  const parsed = TakaranSchema.safeParse(entri)
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') }
  const ada = file.entries.findIndex((e) => (e as { id?: string }).id === entri.id)
  if (ada >= 0 && !ganti)
    return { ok: false, error: `"${entri.id}" is already in the table. Pass --ganti to replace it.` }
  const entries = [...file.entries]
  if (ada >= 0) entries[ada] = parsed.data
  else entries.push(parsed.data)
  return { ok: true, value: { ...file, entries } }
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeys(v)]),
    )
  return value
}
