import { notFound } from 'next/navigation'
import { RECIPES } from '@/lib/resep'
import { compute } from '@/lib/nutrition/compute'
import { findUnmatched, loadFdcTable } from '@/lib/sources/fdc/load'
import { copyFor, isLocale, LOCALES, type Locale } from '@/lib/i18n'
import { formatNutrient, nutrientLabel, unitLabel } from '@/lib/format'
import { DaftarMasakan, type KartuMasakan } from '@/components/masakan/DaftarMasakan'
import { ContohBerjalan } from '@/components/masakan/ContohBerjalan'
import { dataContoh } from '@/lib/contoh-build'
import { pageMetadata } from '@/lib/metadata'
import { komposisi } from '@/lib/resep/komposisi'
import { formatGram } from '@/lib/format'
import { TandaChip } from '@/components/chrome/TandaChip'

/**
 * What each card shows. Energi, protein and zat besi at equal weight — energy
 * is one nutrient among many (invariant 13), and it was previously the only
 * number on the card, which made it the headline by omission.
 */
const KARTU_NUTRIENT_IDS = ['208', '203', '303'] as const

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: { params: { locale: string } }) {
  const locale = isLocale(params.locale) ? params.locale : 'id'
  const copy = copyFor(locale)
  // The same heading and lede the page renders below.
  return pageMetadata({
    locale,
    title: copy.landing.judul,
    description: copy.landing.lede,
    path: 'masakan',
  })
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
    /* The ring and its words, projected here with the numbers. */
    const k = komposisi(recipe, trace)
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
      segmen: k.segmen.map((seg) => ({ bagian: seg.bagian, tanpaData: seg.tanpaData })),
      palingBerat: k.segmen
        .filter((seg) => !seg.id.startsWith('lainnya'))
        .slice(0, 3)
        .map((seg) => ({
          namaId: seg.namaId,
          berat: formatGram(seg.beratG, locale),
          perkiraan: seg.perkiraan,
        })),
    }
  })

  /* Eleven slider outcomes, computed here during the export rather than in the
     browser — see lib/contoh.ts. */
  const contoh = dataContoh(locale)

  /* The mark that carries each claim, so the row doubles as the legend for
     the palette the reader is about to meet on a dish page — PRD §9. */
  const poinTanda = [
    <span key="perkiraan" className="tanda-perkiraan font-mono text-md">70 g</span>,
    <span key="gap" className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="arsir inline-block h-3 w-10 rounded-full" />
      <TandaChip />
    </span>,
    <span key="rujukan" aria-hidden="true" className="inline-block h-3 w-10 overflow-hidden rounded-full bg-adequate-tint">
      <span className="block h-3 w-3/5 rounded-full bg-adequate" />
    </span>,
  ]

  return (
    <div className="flex flex-col gap-section">
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-block lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          {/* This is the page the root redirects to, so its heading is the
              proposition rather than the word "Masakan" — the nav already says
              which section this is. */}
          <h1 className="max-w-[18ch] font-display text-3xl text-rim sm:text-[3.25rem] sm:leading-[1.05]">
            {copy.landing.judul}
          </h1>
          <p className="mt-4 max-w-prose text-md text-ink-soft">{copy.landing.lede}</p>

          <ul className="mt-block grid gap-4">
            {copy.landing.poin.map((poin, index) => (
              <li key={poin.judul} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-3">
                <span className="flex justify-end">{poinTanda[index]}</span>
                <div>
                  <h2 className="font-display text-base font-medium text-rim">{poin.judul}</h2>
                  <p className="mt-0.5 text-sm text-ink-soft">{poin.isi}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* The proposition, performed, beside the claim it makes. A reader who
            scrolls no further has still seen one number derived end to end. */}
        {contoh && <ContohBerjalan locale={locale} data={contoh} />}
      </div>

      <section aria-labelledby="judul-daftar">
        <h2 id="judul-daftar" className="font-display text-2xl text-rim">
          {copy.nav.masakan}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-ink-soft">
          {locale === 'en'
            ? 'Each one shows the recipe it assumed, and names what it could not count.'
            : 'Tiap halaman menampilkan resep yang dipakai, dan menyebut apa yang tidak bisa dihitung.'}
        </p>
        <div className="mt-4">
          <DaftarMasakan kartu={kartu} locale={locale} />
        </div>
      </section>
    </div>
  )
}
