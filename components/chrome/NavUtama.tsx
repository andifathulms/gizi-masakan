'use client'

/**
 * The main navigation, with the current section marked.
 *
 * A client component only because it reads the pathname — it computes nothing
 * and holds no state. Without the current-section mark the header renders
 * identically on every page, so the reader never learns where they are.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { copyFor, type Locale } from '@/lib/i18n'

const SECTIONS = ['masakan', 'bahan', 'metode'] as const

export function NavUtama({ locale }: { locale: Locale }) {
  const copy = copyFor(locale)
  const pathname = usePathname() ?? ''

  return (
    <nav className="flex gap-5 text-base">
      {SECTIONS.map((section) => {
        const href = `/${locale}/${section}/`
        const active = pathname.includes(`/${section}`)
        return (
          <Link
            key={section}
            href={href}
            aria-current={active ? 'page' : undefined}
            /* Marked with an underline as well as colour — colour alone is not
               a signal every reader receives. */
            className={
              active
                ? 'border-b-2 border-rim pb-1 font-medium text-rim'
                : 'border-b-2 border-transparent pb-1 text-ink-soft hover:text-rim'
            }
          >
            {copy.nav[section]}
          </Link>
        )
      })}
    </nav>
  )
}
