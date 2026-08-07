/**
 * The plate's view state, encoded in the query string.
 *
 * Everything the reader can change on a dish page — the nutrient the bars rank
 * by, per-portion or whole-recipe, the AKG group, and any edited gram weight —
 * lives here so it survives a refresh and can be sent to someone else. PRD §6.1
 * turns on "change the santan to 100 g and watch it move"; a result that cannot
 * be reloaded or shared is only half of that.
 *
 * Pure. No DOM, no clock, no React — parse and serialise are ordinary functions
 * over strings, so they are unit-tested like the rest of the computation path.
 * The hook that touches `window` is in ./use-plate-state.ts.
 *
 * Encoding, chosen to stay readable in a shared link:
 *
 *   ?n=303                        nutrient (FDC nutrient number)
 *   &v=resep                      whole recipe; absent means per portion
 *   &g=perempuan-19-29            AKG age and sex group
 *   &b=santan:100,tempe:75        edited gram weights
 *
 * A parameter is written only when it differs from the default, so an untouched
 * plate has a clean URL and a shared one carries exactly what was changed.
 */
import { isKnownNutrient } from '@/lib/nutrition/nutrients'
import { findKelompok, KELOMPOK_AWAL } from '@/lib/akg'

export interface PlateState {
  readonly nutrientId: string
  readonly perPorsiView: boolean
  readonly kelompokId: string
  readonly beratOverrideG: Readonly<Record<string, number>>
}

export const PLATE_DEFAULT: PlateState = {
  nutrientId: '208',
  perPorsiView: true,
  kelompokId: KELOMPOK_AWAL,
  beratOverrideG: {},
}

const PARAM = {
  nutrient: 'n',
  view: 'v',
  kelompok: 'g',
  berat: 'b',
} as const

/** Ingredient ids are kebab-case; anything else did not come from a recipe. */
const INGREDIENT_ID = /^[a-z0-9-]+$/

/**
 * A gram weight from a URL is untrusted input. Accept only a finite,
 * non-negative number written plainly — never NaN, never Infinity, never a
 * negative mass. Rejected entries are dropped rather than coerced, because a
 * coerced weight would silently produce a wrong number, which is the failure
 * mode this project exists to avoid.
 */
function parseBeratG(raw: string): number | undefined {
  if (!/^\d+(\.\d+)?$/.test(raw)) return undefined
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

function parseBerat(raw: string | null): Record<string, number> {
  if (!raw) return {}
  const result: Record<string, number> = {}
  for (const pair of raw.split(',')) {
    const separator = pair.indexOf(':')
    if (separator < 1) continue
    const ingredientId = pair.slice(0, separator)
    if (!INGREDIENT_ID.test(ingredientId)) continue
    const beratG = parseBeratG(pair.slice(separator + 1))
    if (beratG === undefined) continue
    result[ingredientId] = beratG
  }
  return result
}

/**
 * Read state out of a query string. Every value is validated against the same
 * catalogues the UI renders from — an unknown nutrient id or AKG group falls
 * back to the default rather than being passed through, so a malformed or
 * stale link degrades to the authored view instead of rendering nothing.
 */
export function parsePlateState(search: string): PlateState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)

  const nutrientId = params.get(PARAM.nutrient)
  const kelompokId = params.get(PARAM.kelompok)

  return {
    nutrientId:
      nutrientId && isKnownNutrient(nutrientId) ? nutrientId : PLATE_DEFAULT.nutrientId,
    perPorsiView: params.get(PARAM.view) !== 'resep',
    kelompokId:
      kelompokId && findKelompok(kelompokId) ? kelompokId : PLATE_DEFAULT.kelompokId,
    beratOverrideG: parseBerat(params.get(PARAM.berat)),
  }
}

/**
 * Write state back to a query string, shortest form first: only what differs
 * from the default appears. Ingredient ids are sorted so the same set of edits
 * always produces the same URL — two people who make the same change get the
 * same link, and the output is stable to diff.
 */
export function serialisePlateState(state: PlateState): string {
  const params = new URLSearchParams()

  if (state.nutrientId !== PLATE_DEFAULT.nutrientId) {
    params.set(PARAM.nutrient, state.nutrientId)
  }
  if (!state.perPorsiView) {
    params.set(PARAM.view, 'resep')
  }
  if (state.kelompokId !== PLATE_DEFAULT.kelompokId) {
    params.set(PARAM.kelompok, state.kelompokId)
  }

  const ingredientIds = Object.keys(state.beratOverrideG).sort()
  if (ingredientIds.length > 0) {
    params.set(
      PARAM.berat,
      ingredientIds.map((id) => `${id}:${state.beratOverrideG[id]}`).join(','),
    )
  }

  const query = params.toString()
  // URLSearchParams percent-encodes the separators, which makes a shared link
  // unreadable for no gain — both are legal unescaped in a query string.
  return query.replace(/%3A/g, ':').replace(/%2C/g, ',')
}
