/**
 * Root layout for every localised page — it renders `<html>` itself rather
 * than nesting inside a shared one.
 *
 * `<html lang>` must name the language of the page, and the language is the
 * route parameter. A single root layout above `[locale]` cannot see it, so
 * every English page shipped `lang="id"` and was announced with Indonesian
 * pronunciation — WCAG 3.1.1 Language of Page. The site root lives in its own
 * route group with its own root layout; route groups do not appear in the URL,
 * so no path changed.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { copyFor, isLocale, LOCALES, type Locale } from '@/lib/i18n'
import { NavUtama } from '@/components/chrome/NavUtama'
import { fontVariables } from '@/lib/fonts'
import '../globals.css'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const copy = copyFor(isLocale(params.locale) ? params.locale : 'id')
  return { title: copy.siteName, description: copy.disclaimer }
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const copy = copyFor(locale)
  const other = locale === 'id' ? 'en' : 'id'

  return (
    <html lang={locale} className={fontVariables}>
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b border-rim/25">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-3 px-gutter py-4">
            {/* The wordmark carries the one-line proposition, so the site says
              what it is even on a page whose own heading does not. */}
            <Link href={`/${locale}/masakan/`} className="mr-2 leading-tight">
              <span className="block font-display text-lg font-medium text-rim">
                {copy.siteName}
              </span>
              <span className="block text-xs text-ink-soft">{copy.tagline5}</span>
            </Link>

            <NavUtama locale={locale} />

            {/* Labelled as a language switch rather than sitting in the nav as a
              bare word that reads like a fourth section. */}
            <Link
              href={`/${other}/masakan/`}
              lang={other}
              className="ml-auto text-sm text-ink-soft underline underline-offset-4 hover:text-rim"
            >
              <span aria-hidden="true">🌐 </span>
              {other === 'en' ? 'English' : 'Bahasa Indonesia'}
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-gutter py-block">{children}</main>

        <footer className="mt-section border-t border-rim/25">
          {/* ink-soft, not chip: this is the standing disclaimer, not a gap.
            Chip grey is reserved for missing data — PRD §9. */}
          <p className="mx-auto max-w-4xl px-gutter py-block text-sm text-ink-soft">
            {copy.disclaimer}
          </p>
        </footer>
      </body>
    </html>
  )
}
