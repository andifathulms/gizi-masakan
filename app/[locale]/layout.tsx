import Link from 'next/link'
import { notFound } from 'next/navigation'
import { copyFor, isLocale, LOCALES, type Locale } from '@/lib/i18n'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
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
    <div className="min-h-screen">
      <header className="border-b border-rim/25">
        <div className="mx-auto flex max-w-4xl flex-wrap items-baseline gap-x-6 gap-y-2 px-5 py-4">
          <Link href={`/${locale}/masakan/`} className="font-display text-xl font-medium text-rim">
            {copy.siteName}
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href={`/${locale}/masakan/`} className="hover:text-rim">
              {copy.nav.masakan}
            </Link>
            <Link href={`/${locale}/bahan/`} className="hover:text-rim">
              {copy.nav.bahan}
            </Link>
            <Link href={`/${locale}/metode/`} className="hover:text-rim">
              {copy.nav.metode}
            </Link>
          </nav>
          <Link
            href={`/${other}/masakan/`}
            className="ml-auto text-sm text-chip underline underline-offset-4 hover:text-rim"
          >
            {other === 'en' ? 'English' : 'Bahasa Indonesia'}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">{children}</main>

      <footer className="mt-12 border-t border-rim/25">
        <p className="mx-auto max-w-4xl px-5 py-6 text-sm leading-relaxed text-chip">
          {copy.disclaimer}
        </p>
      </footer>
    </div>
  )
}
