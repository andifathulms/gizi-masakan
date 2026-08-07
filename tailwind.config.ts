import type { Config } from 'tailwindcss'

/**
 * Semantic tokens only — PRD §9. Components never use raw hex.
 *
 * The palette carries the honesty distinction:
 *   edited    terracotta — user-edited values and stated estimates
 *   chip      grey       — gaps, missing data, unadjusted nutrients
 *   adequate  leaf green — adequacy fills, nothing else
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        enamel: '#F2EFE6',
        'enamel-deep': '#E7E2D4',
        rim: '#2C4E6B',
        'rim-soft': '#5A7C97',
        ink: '#24221D',
        edited: '#B0563A',
        adequate: '#4F7A4A',
        chip: '#7A776E',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        plate: '14px',
      },
    },
  },
  plugins: [],
}

export default config
