/**
 * Root layout. Fonts are self-hosted through next/font — invariant 16 forbids
 * any runtime network request, and a font CDN is a network request.
 */
import type { Metadata } from 'next'
import { Zilla_Slab, Figtree } from 'next/font/google'
import './globals.css'

const display = Zilla_Slab({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-display',
  display: 'swap',
})

const sans = Figtree({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Gizi Masakan',
  description:
    'Gizi masakan Indonesia, dengan resep yang diasumsikan ditampilkan dan bisa diubah. Proyek pribadi, bukan nasihat medis.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
