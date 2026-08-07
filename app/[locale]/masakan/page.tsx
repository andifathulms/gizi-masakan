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

  /* The colour that carries each claim, so the strip doubles as the legend for
     the palette the reader is about to meet on a dish page — PRD §9. */
  const poinWarna = ['border-edited', 'border-chip', 'border-adequate']

  return (
    <div>
      {/* This is the page the root redirects to, so its heading is the
          proposition rather than the word "Masakan" — the nav already says
          which section this is. */}
      <h1 className="max-w-[20ch] font-display text-3xl text-rim">{copy.landing.judul}</h1>
      <p className="mt-4 max-w-prose text-md text-ink-soft">{copy.landing.lede}</p>

      <ul className="mt-block grid gap-4 sm:grid-cols-3">
        {copy.landing.poin.map((poin, index) => (
          <li key={poin.judul} className={`border-l-4 pl-4 ${poinWarna[index]}`}>
            <h2 className="font-display text-base font-medium text-rim">{poin.judul}</h2>
            <p className="mt-1 text-sm text-ink-soft">{poin.isi}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-section font-display text-xl text-rim">
        {RECIPES.length} {copy.nav.masakan.toLowerCase()}
      </h2>
      <p className="mt-1 max-w-prose text-sm text-ink-soft">
        {locale === 'en'
          ? 'Each one shows the recipe it assumed, and names what it could not count.'
          : 'Tiap halaman menampilkan resep yang dipakai, dan menyebut apa yang tidak bisa dihitung.'}
      </p>

      {[...byKategori.entries()].map(([kategori, recipes]) => (
        <section key={kategori} className="mt-block">
          <h3 className="font-display text-lg capitalize text-rim">{kategori}</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {recipes.map((recipe) => {
              const trace = compute({ recipe, table, unmatched: { get: findUnmatched } })
              const energy = trace.totals.find((total) => total.nutrientId === '208')!
              return (
                <li key={recipe.id}>
                  <Link
                    href={`/${locale}/masakan/${recipe.id}/`}
                    className="plate-card block h-full px-4 py-4 transition-colors hover:bg-enamel-deep"
                  >
                    <span className="font-display text-md font-medium text-rim">
                      {recipe.namaId}
                    </span>
                    <span className="mt-1 block text-sm text-ink-soft">{recipe.deskripsiId}</span>
                    <span className="mt-3 block border-t border-rim/20 pt-2 text-sm">
                      <span className="font-mono">
                        {formatNutrient(energy.total / recipe.porsi, '208', locale)}
                      </span>{' '}
                      <span className="text-ink-soft">
                        kcal / {copy.plate.perPorsi.toLowerCase()}
                      </span>
                      {/* Phrased as something the dish does, not as a defect
                          count: naming a gap is the product, not a failure. */}
                      {!trace.lengkap && (
                        <span className="mt-1 block text-xs text-chip">
                          {locale === 'en'
                            ? `names ${trace.gaps.length} things it cannot count`
                            : `menyebut ${trace.gaps.length} hal yang tidak bisa dihitung`}
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
