import { notFound } from 'next/navigation'
import { RECIPES } from '@/lib/resep'
import { compute } from '@/lib/nutrition/compute'
import { findUnmatched, loadFdcTable } from '@/lib/sources/fdc/load'
import { copyFor, isLocale, LOCALES, type Locale } from '@/lib/i18n'
import { formatNutrient, nutrientLabel, unitLabel } from '@/lib/format'
import { DaftarMasakan, type KartuMasakan } from '@/components/masakan/DaftarMasakan'
import { ContohBerjalan } from '@/components/masakan/ContohBerjalan'

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

  /* Cards are projected to strings here, at build time, so the client
     component that filters them does no nutrition work — invariant 17. */
  const kartu: KartuMasakan[] = RECIPES.map((recipe) => {
    const trace = compute({ recipe, table, unmatched: { get: findUnmatched } })
    return {
      id: recipe.id,
      namaId: recipe.namaId,
      nameEn: recipe.nameEn,
      deskripsiId: recipe.deskripsiId,
      kategori: recipe.kategori,
      nutrients: KARTU_NUTRIENT_IDS.map((id) => {
        const total = trace.totals.find((entry) => entry.nutrientId === id)!
        return {
          id,
          label: nutrientLabel(id, locale),
          value: formatNutrient(total.total / recipe.porsi, id, locale),
          unit: unitLabel(id),
        }
      }),
      gapCount: trace.lengkap ? 0 : trace.gaps.length,
    }
  })

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

      {/* The proposition, performed. It sits above the dish list because it is
          what the list is for — a reader who scrolls no further has still seen
          one number derived end to end. */}
      <ContohBerjalan locale={locale} />

      <h2 className="mt-section font-display text-xl text-rim">
        {copy.nav.masakan}
      </h2>
      <p className="mt-1 max-w-prose text-sm text-ink-soft">
        {locale === 'en'
          ? 'Each one shows the recipe it assumed, and names what it could not count.'
          : 'Tiap halaman menampilkan resep yang dipakai, dan menyebut apa yang tidak bisa dihitung.'}
      </p>

      <DaftarMasakan kartu={kartu} locale={locale} />
    </div>
  )
}
