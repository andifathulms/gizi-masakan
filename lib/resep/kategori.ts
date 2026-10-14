/**
 * The category filter on the dish list. Pure; the component mirrors it into
 * the URL as ?kategori= so a filtered list survives a refresh and can be sent
 * to someone (invariant 18).
 *
 * The query string is untrusted input (invariant 19). An unknown category is
 * dropped to "all", never matched loosely — a filter that silently showed a
 * near miss would be a list the reader cannot account for.
 */

/** Categories in the order they first appear in the authored recipe list. */
export function urutanKategori(entries: readonly { readonly kategori: string }[]): readonly string[] {
  const urutan: string[] = []
  for (const entry of entries) if (!urutan.includes(entry.kategori)) urutan.push(entry.kategori)
  return urutan
}

/** A category from the URL, or null for "all". */
export function parseKategori(
  value: string | null | undefined,
  dikenal: readonly string[],
): string | null {
  if (!value) return null
  const trimmed = value.trim().toLowerCase()
  return dikenal.includes(trimmed) ? trimmed : null
}

export function saringKategori<T extends { readonly kategori: string }>(
  entries: readonly T[],
  kategori: string | null,
): readonly T[] {
  return kategori === null ? entries : entries.filter((entry) => entry.kategori === kategori)
}

export function hitungKategori(
  entries: readonly { readonly kategori: string }[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>()
  for (const entry of entries) counts.set(entry.kategori, (counts.get(entry.kategori) ?? 0) + 1)
  return counts
}
