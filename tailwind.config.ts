import type { Config } from 'tailwindcss'

/**
 * Semantic tokens only — PRD §9. Components never use raw hex, and never a
 * one-off font size: every value here resolves to a CSS variable declared in
 * app/globals.css, which is the single place the design system lives.
 *
 * The palette carries the honesty distinction:
 *   edited    terracotta — user-edited values and stated estimates
 *   chip      grey       — gaps, missing data, unadjusted nutrients
 *   adequate  leaf green — adequacy fills, nothing else
 *
 * Colours are declared as `rgb(var(--token) / <alpha-value>)` so the opacity
 * modifiers used for rules and bar tracks (border-rim/25, bg-rim/10) still work.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        enamel: token('enamel'),
        'enamel-deep': token('enamel-deep'),
        rim: token('rim'),
        'rim-soft': token('rim-soft'),
        ink: token('ink'),
        'ink-soft': token('ink-soft'),
        edited: token('edited'),
        adequate: token('adequate'),
        chip: token('chip'),
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        /* Two families total. `font-mono` marks a *number*, not a third
           typeface: the alignment it existed for comes from the global
           font-variant-numeric: tabular-nums, which the sans face supports. */
        mono: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['var(--text-xs)', { lineHeight: 'var(--leading-normal)' }],
        sm: ['var(--text-sm)', { lineHeight: 'var(--leading-normal)' }],
        base: ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
        md: ['var(--text-md)', { lineHeight: 'var(--leading-normal)' }],
        lg: ['var(--text-lg)', { lineHeight: 'var(--leading-snug)' }],
        xl: ['var(--text-xl)', { lineHeight: 'var(--leading-snug)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-tight)' }],
        '3xl': ['var(--text-3xl)', { lineHeight: 'var(--leading-tight)' }],
      },
      /* Named steps rather than a renumbering of Tailwind's numeric scale, so
         the rhythm is chosen deliberately where it matters and nothing else
         silently shifts. */
      spacing: {
        bar: 'var(--bar-min)',
        'bar-sliver': 'var(--bar-min-sliver)',
        gutter: 'var(--space-5)',
        block: 'var(--space-6)',
        section: 'var(--space-7)',
        page: 'var(--space-8)',
      },
      borderRadius: {
        plate: '14px',
      },
    },
  },
  plugins: [],
}

export default config
