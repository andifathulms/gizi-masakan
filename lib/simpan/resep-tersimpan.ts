/**
 * Locally saved recipe versions — PRD §6.6. Your own weights for a dish, kept
 * on this device, never sent anywhere.
 *
 * What this stores, and what it deliberately does not:
 *
 *   stores    a name, the dish it belongs to, and the gram weights
 *   does not  a date, a count, a "last opened", an order of use, or anything
 *             else that accumulates
 *
 * That absence is the design. Invariant 11 bans tracking primitives, and a
 * store with timestamps is one report away from being a food diary — which is
 * the product PRD §5 exists to refuse. A saved recipe is a recipe, not an entry
 * in a log, so there is nothing here to key by day.
 *
 * Pure: parse, serialise and the two list operations are ordinary functions.
 * The half that touches localStorage is in ./use-resep-tersimpan.ts.
 */
import { z } from 'zod'

export const STORAGE_KEY = 'gizi-masakan/resep-tersimpan/v1'

/**
 * A stored weight is untrusted — it survives across releases and a reader can
 * edit it by hand. Same rule as the query string: finite and non-negative, or
 * the entry does not load. Never coerced, because a coerced weight produces a
 * plausible wrong number.
 */
const BeratSchema = z.record(z.string().regex(/^[a-z0-9-]+$/), z.number().finite().nonnegative())

const EntrySchema = z.object({
  id: z.string().min(1),
  dishId: z.string().min(1),
  nama: z.string().min(1),
  beratOverrideG: BeratSchema,
})

const StoreSchema = z.object({
  version: z.literal(1),
  entries: z.array(EntrySchema),
})

export type ResepTersimpan = z.infer<typeof EntrySchema>

export const NAMA_MAX = 60

/**
 * The id is derived from the dish and the name rather than generated, so it is
 * deterministic — no clock, no randomness. Saving twice under the same name
 * replaces, which is what a reader means by saving twice under the same name.
 */
export function entryId(dishId: string, nama: string): string {
  const slug = nama
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${dishId}__${slug}`
}

/** A malformed or older store yields an empty list rather than throwing. */
export function parseStore(raw: string | null): readonly ResepTersimpan[] {
  if (!raw) return []
  try {
    const parsed = StoreSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data.entries : []
  } catch {
    return []
  }
}

export function serialiseStore(entries: readonly ResepTersimpan[]): string {
  return JSON.stringify({ version: 1, entries })
}

export function simpan(
  entries: readonly ResepTersimpan[],
  entry: ResepTersimpan,
): readonly ResepTersimpan[] {
  const without = entries.filter((existing) => existing.id !== entry.id)
  return [...without, entry]
}

export function hapus(
  entries: readonly ResepTersimpan[],
  id: string,
): readonly ResepTersimpan[] {
  return entries.filter((entry) => entry.id !== id)
}

export function untukMasakan(
  entries: readonly ResepTersimpan[],
  dishId: string,
): readonly ResepTersimpan[] {
  return entries.filter((entry) => entry.dishId === dishId)
}
