/**
 * Root layout for the site root only — the one-line splash at `/`.
 *
 * There are two root layouts, in two route groups, because `<html lang>` has to
 * name the language of the page and the language is a route parameter. A single
 * root layout cannot see `[locale]`, so every English page shipped
 * `lang="id"` and was read aloud with Indonesian pronunciation (WCAG 3.1.1).
 * Route groups do not appear in the URL, so the paths are unchanged.
 *
 * This one is fixed to Indonesian: the splash is Indonesian copy, and it
 * forwards to the Indonesian locale.
 */
import type { Metadata } from 'next'
import { fontVariables } from '@/lib/fonts'
import { brand, SITE_URL } from '@/lib/brand'
import { copyFor } from '@/lib/i18n'
import { pageUrl } from '@/lib/metadata'
import '../globals.css'

const copy = copyFor('id')

export const metadata: Metadata = {
  /* The bare URL is the one people paste, so it gets the same treatment as
     every other page rather than the layout defaults it had. The page itself
     forwards to /id/masakan/, so that is its canonical and its description is
     that page's — a preview should describe where the link lands. */
  title: { absolute: `${copy.landing.judul} — ${copy.siteName}` },
  description: copy.landing.lede,
  alternates: { canonical: pageUrl('id/masakan') },
  /* Next injects a manifest link without the basePath, which 404s on a
     project page. Setting it here overrides that with the real path. */
  metadataBase: new URL(SITE_URL),
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: brand.favicon, type: 'image/svg+xml' },
      { url: brand.icon32, sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: brand.appleTouch, sizes: '180x180' }],
  },
  openGraph: {
    title: `${copy.landing.judul} — ${copy.siteName}`,
    description: copy.landing.lede,
    images: [{ url: brand.og, width: 1200, height: 630, type: 'image/png', alt: copy.tagline }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${copy.landing.judul} — ${copy.siteName}`,
    description: copy.landing.lede,
    images: [brand.og],
  },
}

export default function SplashLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={fontVariables}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
