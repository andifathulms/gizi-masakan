/**
 * The two faces, shared by both root layouts.
 *
 * Self-hosted through next/font — invariant 16 forbids any runtime network
 * request, and a font CDN is a network request.
 *
 * Two families is the budget. Tabular figures for gram weights and nutrient
 * values come from `font-variant-numeric: tabular-nums` on `html`, not from a
 * third monospace face.
 */
import { Zilla_Slab, Figtree } from 'next/font/google'

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

export const fontVariables = `${display.variable} ${sans.variable}`
