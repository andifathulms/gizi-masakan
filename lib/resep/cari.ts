/**
 * Dish search. Pure, deterministic, and deliberately a rule rather than a
 * ranking heuristic: an entry either contains every term the reader typed, in
 * one of its searchable fields, or it does not appear. No fuzzy matching, no
 * scoring, no cut-off — so the result set is something a reader can predict and
 * a test can assert exactly.
 *
 * Order is never rearranged by relevance. The list keeps its authored category
 * order, because a dish moving up the page for reasons the reader cannot see is
 * the same class of unexplainable output this project avoids everywhere else.
 */

export interface CariEntry {
  readonly id: string
  readonly namaId: string
  readonly nameEn: string
  readonly deskripsiId: string
  readonly kategori: string
}

/**
 * Fold to a comparable form: lowercase, and strip the diacritics an Indonesian
 * keyboard may or may not produce (é in *pepés*, for instance). NFD splits a
 * letter from its accent so the accent can be removed on its own.
 */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Terms are whitespace-separated; every one must match somewhere. */
export function cariTerms(query: string): readonly string[] {
  return fold(query).split(/\s+/).filter((term) => term.length > 0)
}

export function matchesCari<T extends CariEntry>(entry: T, terms: readonly string[]): boolean {
  if (terms.length === 0) return true
  const haystack = fold(
    `${entry.namaId} ${entry.nameEn} ${entry.deskripsiId} ${entry.kategori} ${entry.id}`,
  )
  return terms.every((term) => haystack.includes(term))
}

export function cari<T extends CariEntry>(entries: readonly T[], query: string): readonly T[] {
  const terms = cariTerms(query)
  if (terms.length === 0) return entries
  return entries.filter((entry) => matchesCari(entry, terms))
}
