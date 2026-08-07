import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RECIPES, recipesByKategori } from '@/lib/resep'
import { compute } from '@/lib/nutrition/compute'
import { findUnmatched, loadFdcTable } from '@/lib/sources/fdc/load'
import { copyFor, isLocale, LOCALES, type Locale } from '@/lib/i18n'
import { formatNutrient, nutrientLabel, unitLabel } from '@/lib/format'

/**
 * What each card shows. Energi, protein and zat besi at equal weight — energy
 * is one nutrient among many (invariant 13), and it was previously the only
 * number on the card, which made it the headline by omission.
 */
const KARTU_NUTRIENT_IDS = ['208', '203', '303'] as const

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
                    {/* Three nutrients at identical weight, not energy alone.
                        Invariant 13 and PRD §5 say energy is one nutrient among
                        many; when it is the only number on a card it becomes
                        the headline by omission, which is the calorie-first
                        framing §5 exists to prevent. Protein and zat besi are
                        the two the stunting-and-deficiency framing cares about
                        most, and both are already in the trace. */}
                    <span className="mt-3 grid grid-cols-3 gap-2 border-t border-rim/20 pt-2 text-sm">
                      {KARTU_NUTRIENT_IDS.map((id) => {
                        const total = trace.totals.find((entry) => entry.nutrientId === id)!
                        return (
                          <span key={id} className="block">
                            <span className="block text-xs text-ink-soft">
                              {nutrientLabel(id, locale)}
                            </span>
                            <span className="font-mono">
                              {formatNutrient(total.total / recipe.porsi, id, locale)}
                            </span>{' '}
                            <span className="text-xs text-ink-soft">{unitLabel(id)}</span>
                          </span>
                        )
                      })}
                    </span>
                    <span className="mt-2 block text-xs text-ink-soft">
                      {copy.plate.perPorsi.toLowerCase()}
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
