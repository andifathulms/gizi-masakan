/**
 * The mark, inline.
 *
 * It is 437 bytes and sits in the header of all 88 pages, so as a file it cost
 * a round trip on every page for less than half a kilobyte. Inline it costs
 * nothing extra — the header markup is already being sent.
 *
 * The file stays in public/: it is what the favicon, the apple-touch icon and
 * the manifest point at, and those cannot be inlined.
 *
 * The glyph is the project's thesis — a solid rule for the nutrition figure, a
 * dashed one beneath it for the recipe it assumes — so it carries a real title
 * rather than being hidden. role="img" plus a title element is how an inline
 * SVG gets an accessible name; alt is not an SVG attribute.
 */
export function Lambang({ label, className }: { label: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={36}
      height={36}
      role="img"
      aria-label={label}
      className={className}
    >
      <rect x="0" y="0" width="100" height="100" rx="22" fill="#EFEBDE" />
      <line x1="16" y1="38" x2="84" y2="38" stroke="#2C4F71" strokeWidth="6" strokeLinecap="round" />
      <line
        x1="16"
        y1="58"
        x2="60"
        y2="58"
        stroke="#A2502E"
        strokeWidth="4"
        strokeDasharray="1 6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="58" r="3.4" fill="#A2502E" />
    </svg>
  )
}
