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
import '../globals.css'

export const metadata: Metadata = {
  title: 'Gizi Masakan',
  description:
    'Gizi masakan Indonesia, dengan resep yang diasumsikan ditampilkan dan bisa diubah. Proyek pribadi, bukan nasihat medis.',
}

export default function SplashLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={fontVariables}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
