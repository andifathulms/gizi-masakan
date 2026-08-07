'use client'

/**
 * The browser half of the plate's URL state. Everything that touches `window`
 * is here; the parsing and serialising it delegates to are pure and tested.
 *
 * Two deliberate choices:
 *
 * 1. State initialises to the default and adopts the URL in an effect, rather
 *    than reading `window.location` during render. The dish page is prerendered
 *    to static HTML, so reading the URL during render would mismatch hydration.
 *    The first paint is the authored recipe — which is the correct, citable
 *    view — and a shared link applies immediately after.
 *
 * 2. Writes go through `history.replaceState`, not the Next router. A gram
 *    weight changes on every keystroke; pushing a route per keystroke would
 *    fill the history stack and re-render the tree for a value React already
 *    holds. replaceState keeps the address bar shareable at all times and the
 *    back button meaning "the page before this one".
 */
import { useEffect, useRef, useState } from 'react'
import {
  PLATE_DEFAULT,
  parsePlateState,
  serialisePlateState,
  type PlateState,
} from '@/lib/url/plate-state'

/**
 * @param ingredientIds the ids this recipe actually contains. Weights for
 *   anything else are dropped on adoption — `compute` already ignores them, so
 *   they change no number, but a link that carries an ingredient the dish does
 *   not have is a link that misstates what it encodes.
 */
export function usePlateState(
  ingredientIds: readonly string[],
): [PlateState, (next: Partial<PlateState>) => void] {
  const [state, setState] = useState<PlateState>(PLATE_DEFAULT)
  const adopted = useRef(false)

  // Adopt the incoming link once, after hydration.
  useEffect(() => {
    const incoming = parsePlateState(window.location.search)
    const belongs = new Set(ingredientIds)
    const beratOverrideG = Object.fromEntries(
      Object.entries(incoming.beratOverrideG).filter(([id]) => belongs.has(id)),
    )
    setState({ ...incoming, beratOverrideG })
    adopted.current = true
    // Recipe identity is fixed for the life of this component; adoption is a
    // once-per-mount step, not something that re-runs as the reader edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reflect state back into the address bar. Skipped until the incoming link
  // has been adopted, so the default state cannot overwrite a shared URL in
  // the frame before the effect above runs.
  useEffect(() => {
    if (!adopted.current) return
    const query = serialisePlateState(state)
    const url = `${window.location.pathname}${query ? `?${query}` : ''}`
    window.history.replaceState(null, '', url)
  }, [state])

  return [state, (next: Partial<PlateState>) => setState((current) => ({ ...current, ...next }))]
}
