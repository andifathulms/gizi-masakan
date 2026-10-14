'use client'

/**
 * The main navigation, with the current section marked — as a row in the
 * header from sm up, and as a tab bar at the bottom of a phone's screen, where
 * three sections fit under the thumb and the header can shrink to the
 * wordmark.
 *
 * A client component only because it reads the pathname — it computes nothing
 * and holds no state. Without the current-section mark the header renders
 * identically on every page, so the reader never learns where they are.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { copyFor, type Locale } from '@/lib/i18n'

const SECTIONS = ['masakan', 'bahan', 'metode'] as const
type Section = (typeof SECTIONS)[number]

function Ikon({ section }: { section: Section }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 22,
    height: 22,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (section) {
    case 'masakan':
      /* A plate seen from above, rim and well. */
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="5" />
        </svg>
      )
    case 'bahan':
      return (
        <svg {...common}>
          <path d="M5 19c0-7 4-12 13-14-1 8-5 13-13 14z" />
          <path d="M5 19l7-7" />
        </svg>
      )
    case 'metode':
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" />
        </svg>
      )
    default: {
      const never: never = section
      throw new Error(`Unhandled section: ${String(never)}`)
    }
  }
}

export function NavUtama({ locale }: { locale: Locale }) {
  const copy = copyFor(locale)
  const pathname = usePathname() ?? ''

  return (
    <nav aria-label={locale === 'en' ? 'Main' : 'Utama'} className="hidden gap-1 text-base sm:flex">
      {SECTIONS.map((section) => {
        const href = `/${locale}/${section}/`
        const active = pathname.includes(`/${section}`)
        return (
          <Link
            key={section}
            href={href}
            aria-current={active ? 'page' : undefined}
            /* Marked by a filled pill as well as colour — colour alone is not
               a signal every reader receives. */
            className={`rounded-full px-3.5 py-1.5 ${
              active
                ? 'bg-rim font-medium text-enamel'
                : 'text-ink-soft hover:bg-rim-tint hover:text-rim'
            }`}
          >
            {copy.nav[section]}
          </Link>
        )
      })}
    </nav>
  )
}

export function TabBawah({ locale }: { locale: Locale }) {
  const copy = copyFor(locale)
  const pathname = usePathname() ?? ''

  return (
    <nav
      aria-label={locale === 'en' ? 'Main' : 'Utama'}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rim/20 bg-piring pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="grid h-16 grid-cols-3">
        {SECTIONS.map((section) => {
          const active = pathname.includes(`/${section}`)
          return (
            <li key={section}>
              <Link
                href={`/${locale}/${section}/`}
                aria-current={active ? 'page' : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? 'font-semibold text-rim' : 'text-ink-soft'
                }`}
              >
                <Ikon section={section} />
                {copy.nav[section]}
                {/* The current tab is marked by weight and a bar, not colour
                    alone. */}
                <span
                  aria-hidden="true"
                  className={`mt-0.5 h-0.5 w-6 rounded-full ${active ? 'bg-rim' : 'bg-transparent'}`}
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * ID | EN. Keeps the reader on the same page in the other language rather than
 * sending them back to the dish list, which is where the old link went.
 */
export function PilihBahasa({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? `/${locale}/masakan/`
  const untuk = (target: Locale) =>
    pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${target}`) || `/${target}/masakan/`

  return (
    <div
      role="group"
      aria-label={locale === 'en' ? 'Language' : 'Bahasa'}
      className="ml-auto inline-flex overflow-hidden rounded-full border border-rim/30 text-xs font-semibold"
    >
      {(['id', 'en'] as const).map((target) => (
        <Link
          key={target}
          href={untuk(target)}
          lang={target}
          hrefLang={target}
          aria-current={target === locale ? 'true' : undefined}
          className={`px-3 py-1.5 ${
            target === locale ? 'bg-rim-tint text-rim' : 'text-ink-soft hover:text-rim'
          }`}
        >
          <span aria-hidden="true">{target.toUpperCase()}</span>
          <span className="sr-only">{target === 'id' ? 'Bahasa Indonesia' : 'English'}</span>
        </Link>
      ))}
    </div>
  )
}
