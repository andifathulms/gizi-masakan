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
import '../globals.css'

const copy = copyFor('id')

export const metadata: Metadata = {
  title: copy.siteName,
  description: copy.disclaimer,
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
    title: copy.siteName,
    description: copy.tagline,
    images: [{ url: brand.og, width: 1200, height: 630, alt: copy.tagline }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image', images: [brand.og] },
}

export default function SplashLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={fontVariables}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
