/**
 * The site root. A static export has no server to redirect with, so this is a
 * real page that points at the default locale — and works with JavaScript off.
 */
import Link from 'next/link'
import { DEFAULT_LOCALE } from '@/lib/i18n'

const HOME = `/${DEFAULT_LOCALE}/masakan/`

export default function RootPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <meta httpEquiv="refresh" content={`0; url=${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${HOME}`} />
      <h1 className="font-display text-3xl text-rim">Gizi Masakan</h1>
      <p>
        Gizi masakan Indonesia, dengan resep yang diasumsikan ditampilkan di bawahnya dan bisa
        diubah.
      </p>
      <Link href={HOME} className="text-rim underline underline-offset-4">
        Buka daftar masakan →
      </Link>
    </main>
  )
}
