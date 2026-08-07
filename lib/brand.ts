/**
 * Brand asset paths, prefixed for the deploy's basePath.
 *
 * The site ships under a repository subpath on GitHub Pages, and a `<link
 * rel="icon">` href is a plain URL that Next does not rewrite the way it
 * rewrites `<Link>`. So the prefix is applied here, once, rather than being
 * remembered at each use.
 *
 * The masters live in exports/, which is not committed — it is a source kit,
 * not a build input. Only the files the site actually serves are in public/.
 *
 * A note on the palette. The mark uses the brand's own Paper/Navy/Rust, which
 * are a shade lighter than the app's tokens: the tokens were darkened to clear
 * WCAG AA because colour carries meaning in the interface (invariant 14). A
 * logotype is exempt from contrast minimums (WCAG 1.4.3), and repainting the
 * mark to match would change the identity to solve a problem it does not have.
 */
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export const brand = {
  /** Tab icon. Ink ground, so it holds up against a light or dark browser chrome. */
  favicon: `${base}/favicon.svg`,
  /** Paper ground, for placing on the app's enamel. */
  mark: `${base}/mark.svg`,
  appleTouch: `${base}/icon-180.png`,
  icon32: `${base}/icon-32.png`,
  icon192: `${base}/icon-192.png`,
  icon512: `${base}/icon-512.png`,
  iconMaskable: `${base}/icon-maskable-512.png`,
  og: `${base}/og.png`,
} as const

/**
 * What the mark means, for anyone who cannot see it. The glyph is the project's
 * thesis: a solid rule for the nutrition figure, a dashed one underneath for
 * the assumption it rests on.
 */
export const MARK_ALT = {
  id: 'Lambang Gizi Masakan: satu garis tegas untuk angkanya, satu garis putus-putus di bawahnya untuk resep yang diasumsikan.',
  en: 'The Gizi Masakan mark: one solid rule for the number, one dashed rule beneath it for the recipe it assumes.',
} as const
