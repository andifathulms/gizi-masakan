/**
 * The composition ring on a dish card: the plate seen from above, its slices
 * the ingredients by raw weight.
 *
 * Draws what lib/resep/komposisi projected at build time and computes nothing
 * about nutrition. Cobalt steps for ingredients with data, the hatch for one
 * without — the hatch is the product's one pattern, and it always means a gap.
 * No hue per ingredient: colour here is reserved for the honesty distinction.
 *
 * Decorative for a screen reader; the card states the heaviest ingredients in
 * text beside it.
 */
export interface SegmenCincin {
  readonly bagian: number
  readonly tanpaData: boolean
}

/* Rim mixed toward the plate, darkest for the heaviest slice — but never the
   rim itself, or the heaviest slice merges with the rim around it. */
const LANGKAH = [82, 58, 38, 24, 14]
/* A band of glaze between the rim and the slices, as on the plate. */
const R = 20.5
const KELILING = 2 * Math.PI * R

export function CincinKomposisi({ segmen, id }: { segmen: readonly SegmenCincin[]; id: string }) {
  let offset = 0
  const pola = `arsir-${id}`
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false" className="shrink-0">
      <defs>
        <pattern id={pola} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" style={{ fill: 'rgb(var(--piring))' }} />
          <rect width="1.6" height="5" style={{ fill: 'rgb(var(--chip))' }} />
        </pattern>
      </defs>
      <circle cx="32" cy="32" r="30" style={{ fill: 'rgb(var(--rim))' }} />
      <circle cx="32" cy="32" r="27.5" style={{ fill: 'rgb(var(--piring))' }} />
      {segmen.map((seg, index) => {
        const panjang = seg.bagian * KELILING
        /* A hairline gap between slices, so neighbouring steps stay apart. */
        const garis = Math.max(panjang - 0.6, 0.3)
        const el = (
          <circle
            key={index}
            cx="32"
            cy="32"
            r={R}
            fill="none"
            strokeWidth="9"
            transform="rotate(-90 32 32)"
            /* style, not the stroke attribute: presentation attributes do not
               resolve CSS variables, so the ring would ignore the theme. */
            style={{
              stroke: seg.tanpaData
                ? `url(#${pola})`
                : `color-mix(in srgb, rgb(var(--rim)) ${LANGKAH[Math.min(index, LANGKAH.length - 1)]}%, rgb(var(--piring)))`,
            }}
            strokeDasharray={`${garis.toFixed(2)} ${KELILING.toFixed(2)}`}
            strokeDashoffset={(-offset).toFixed(2)}
          />
        )
        offset += panjang
        return el
      })}
    </svg>
  )
}
