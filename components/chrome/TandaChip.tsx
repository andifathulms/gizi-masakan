/**
 * The chip glyph: a ring with a notch of bare iron, the mark of a chipped
 * enamel plate. It replaces the dagger on incomplete totals.
 *
 * Decorative by itself — every place it appears says what it means in text,
 * visible or for a screen reader, because invariant 2 requires the gap to be
 * named, not merely marked. Colours come from tokens, so it follows the theme.
 */
export function TandaChip({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
      className={`inline-block shrink-0 align-[-2px] ${className}`}
    >
      <circle cx="7" cy="7" r="5.75" fill="none" strokeWidth="1.5" style={{ stroke: 'rgb(var(--chip))' }} />
      <path d="M9.5 1.1 L12.9 3.8 L11 4.5 L10.6 6.2 L8.5 4.9 Z" style={{ fill: 'rgb(var(--iron))' }} />
    </svg>
  )
}
