/**
 * The recipe strip's stepper. One press moves a weight by a fixed step, never
 * below zero.
 *
 * Pure, and kept out of the component: a weight read from a shared link can be
 * a decimal (12.3 g), and stepping it in floating point writes
 * 7.300000000000001 into both the input and the URL. Rounding to a milligram
 * here removes the drift without changing any weight a reader typed.
 */

/** Five grams is a pinch of salt or a sliver of tempe — small enough to
    explore with, large enough that a bar visibly moves. */
export const LANGKAH_STEPPER_G = 5

export function langkahBerat(beratG: number, deltaG: number): number {
  return Math.max(0, Math.round((beratG + deltaG) * 1000) / 1000)
}
