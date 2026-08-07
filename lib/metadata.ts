/**
 * Per-page metadata, built from the page's own content.
 *
 * Every one of the 88 pages used to ship the same `<title>` and the same
 * description — the project disclaimer, which describes the project rather than
 * the page. Eighty dish pages were indistinguishable in search results, browser
 * tabs, bookmarks and link previews, on a site whose entire premise is that
 * each dish is its own answer.
 *
 * The title and description a page declares here are the same strings it
 * renders: a dish uses its own `namaId` and `deskripsiId`, the ingredient
 * browser uses the lede printed above its tables. A description maintained
 * separately from the page drifts, and a drifted description is worse than
 * none — so there is one source and this reads from it.
 */
import type { Metadata } from 'next'
import { brand, SITE_URL } from '@/lib/brand'
import { LOCALES, copyFor, type Locale } from '@/lib/i18n'

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** Absolute URL for a path already carrying the locale, e.g. `id/masakan`. */
export function pageUrl(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '')
  return `${SITE_URL}${base}/${clean}/`
}

export interface PageMetaInput {
  readonly locale: Locale
  /** The page's own heading. Becomes the title, before the site name. */
  readonly title: string
  /** The page's own lede. Becomes the description, verbatim. */
  readonly description: string
  /** Path after the locale, e.g. `masakan` or `masakan/gado-gado`. */
  readonly path: string
}

export function pageMetadata({ locale, title, description, path }: PageMetaInput): Metadata {
  const copy = copyFor(locale)
  const url = pageUrl(`${locale}/${path}`)

  return {
    title,
    description,
    openGraph: {
      title: `${title} — ${copy.siteName}`,
      description,
      url,
      siteName: copy.siteName,
      locale: locale === 'id' ? 'id_ID' : 'en_GB',
      images: [{ url: brand.og, width: 1200, height: 630, type: 'image/png', alt: copy.tagline }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — ${copy.siteName}`,
      description,
      images: [brand.og],
    },
    alternates: {
      canonical: url,
      /* Each page declares its own translation. Without this the id and en
         builds are two near-identical sites and a search engine picks one. */
      languages: Object.fromEntries(
        LOCALES.map((other) => [other, pageUrl(`${other}/${path}`)]),
      ),
    },
  }
}
