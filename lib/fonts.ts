/**
 * The two faces, shared by both root layouts.
 *
 * Self-hosted through next/font — invariant 16 forbids any runtime network
 * request, and a font CDN is a network request. next/font downloads them once,
 * at build time, and serves them from the site.
 *
 * Two families is the budget, PRD §9:
 *
 * - Fraunces for display and dish names. Variable, with a "soft" axis that
 *   rounds the serifs toward a hand-painted warung menu board; set in
 *   globals.css alongside the family.
 * - Plus Jakarta Sans for prose, controls and numerals. Drawn by Tokotype, an
 *   Indonesian foundry, for the city of Jakarta. Its open counters keep 13px
 *   metadata legible, and it carries tabular figures — so gram weights and
 *   nutrient values still come from `font-variant-numeric: tabular-nums` on
 *   `html`, not from a third monospace face.
 */
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'

const display = Fraunces({
  subsets: ['latin'],
  /* Variable weight plus the soft and optical-size axes, in one file. */
  axes: ['SOFT', 'opsz'],
  variable: '--font-display',
  display: 'swap',
})

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const fontVariables = `${display.variable} ${sans.variable}`
