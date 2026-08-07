/**
 * The worked example's eleven outcomes, computed at build time.
 *
 * The panel is a slider over one ingredient of one dish with a fixed step, so
 * it has exactly eleven possible answers. Running `compute` in the browser to
 * find them meant the landing page shipped the whole ingredient table, the
 * 270-operation USDA retention table, the AKG table and all forty recipe JSONs
 * — roughly 32 kB gzipped of data — to do arithmetic with eleven results.
 *
 * This runs on the server during the export and hands the client an array. The
 * panel stays exactly as interactive as it was: the slider still moves, every
 * intermediate value is still on screen, and the numbers are the same numbers
 * because they come from the same `compute`.
 *
 * This half is the shape and the constants only, and imports no data. A value
 * import from a module that loads the ingredient table pulls that table into
 * every bundle that touches it — which is what happened when the builder and
 * the constants lived together: the panel imported CONTOH for its slider
 * bounds, and the landing shipped 32 kB of tables again. Builder in
 * ./contoh-build.
 */
export const CONTOH = {
  dish: 'nasi-uduk',
  bahan: 'santan-encer',
  nutrient: '208',
  minG: 0,
  maxG: 500,
  /* 50 g steps so weight ÷ 100 always lands on a whole or half number. At two
     decimals every product on screen is then exact, and a reader who
     multiplies it through gets the same answer — the point of the panel. */
  stepG: 50,
} as const

/** One slider position, with every value already rendered to a string. */
export interface LangkahContoh {
  readonly beratG: number
  readonly beratLabel: string
  readonly bagi100: string
  readonly per100: string
  readonly sumbangan: string
  readonly total: string
}

export interface DataContoh {
  readonly unit: string
  readonly awalG: number
  readonly langkah: readonly LangkahContoh[]
}
