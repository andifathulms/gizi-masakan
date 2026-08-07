/**
 * The site root. A static export has no server to redirect with, so this is a
 * real page that points at the default locale — and works with JavaScript off.
 *
 * Deliberately a one-line splash rather than a second, differently-styled
 * homepage: it is on screen for a moment before the refresh fires, and a
 * partial homepage flashing past costs part of the few seconds a first-time
 * visitor spends deciding what this is.
 */
import Link from 'next/link'
import { copyFor, DEFAULT_LOCALE } from '@/lib/i18n'

const HOME = `/${DEFAULT_LOCALE}/masakan/`
const copy = copyFor(DEFAULT_LOCALE)

export default function RootPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-prose flex-col justify-center gap-3 px-gutter">
      <meta httpEquiv="refresh" content={`0; url=${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${HOME}`} />
      <p className="font-display text-lg font-medium text-rim">{copy.siteName}</p>
      <p className="text-md text-ink-soft">{copy.tagline5}</p>
      <Link href={HOME} className="text-rim underline underline-offset-4">
        Buka daftar masakan →
      </Link>
    </main>
  )
}
