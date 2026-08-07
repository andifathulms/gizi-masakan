import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RECIPES, recipesByKategori } from '@/lib/resep'
import { compute } from '@/lib/nutrition/compute'
import { findUnmatched, loadFdcTable } from '@/lib/sources/fdc/load'
import { copyFor, isLocale, LOCALES, type Locale } from '@/lib/i18n'
import { formatNutrient } from '@/lib/format'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function MasakanPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const copy = copyFor(locale)
  const table = loadFdcTable()
  const byKategori = recipesByKategori()

  return (
    <div>
      <h1 className="font-display text-3xl text-rim">{copy.nav.masakan}</h1>
      <p className="mt-2 max-w-prose leading-relaxed">{copy.tagline}</p>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-chip">
        {locale === 'en'
          ? `${RECIPES.length} dishes. Each one shows the recipe it assumed, and names what it could not count.`
          : `${RECIPES.length} masakan. Tiap halaman menampilkan resep yang dipakai, dan menyebut apa yang tidak bisa dihitung.`}
      </p>

      {[...byKategori.entries()].map(([kategori, recipes]) => (
        <section key={kategori} className="mt-8">
          <h2 className="font-display text-xl capitalize text-rim">{kategori}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {recipes.map((recipe) => {
              const trace = compute({ recipe, table, unmatched: { get: findUnmatched } })
              const energy = trace.totals.find((total) => total.nutrientId === '208')!
              return (
                <li key={recipe.id}>
                  <Link
                    href={`/${locale}/masakan/${recipe.id}/`}
                    className="plate-card block px-4 py-3 transition-colors hover:bg-enamel-deep"
                  >
                    <span className="font-display text-lg text-rim">{recipe.namaId}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink/75">
                      {recipe.deskripsiId}
                    </span>
                    <span className="mt-2 block font-mono text-sm">
                      {formatNutrient(energy.total / recipe.porsi, '208', locale)}{' '}
                      <span className="text-chip">kcal / {copy.plate.perPorsi.toLowerCase()}</span>
                      {!trace.lengkap && (
                        <span className="ml-2 text-chip">
                          · {trace.gaps.length}{' '}
                          {locale === 'en' ? 'gaps named' : 'kekosongan disebut'}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
