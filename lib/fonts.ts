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
  /* 400 and 500 only. Weight 700 was preloaded on all 88 pages and used
     nowhere: across app/ and components/, font-display co-occurs with
     font-medium four times and with font-bold or font-semibold never. */
  weight: ['400', '500'],
  variable: '--font-display',
  display: 'swap',
})

const sans = Figtree({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const fontVariables = `${display.variable} ${sans.variable}`
