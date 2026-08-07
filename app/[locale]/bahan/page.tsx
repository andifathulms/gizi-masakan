import { notFound } from 'next/navigation'
import { fdcRelease, loadFdcTable, unmatchedIngredients } from '@/lib/sources/fdc/load'
import { NUTRIENTS } from '@/lib/nutrition/nutrients'
import { copyFor, isLocale, LOCALES, type Locale } from '@/lib/i18n'
import { formatNutrient } from '@/lib/format'
import { pageMetadata } from '@/lib/metadata'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: { params: { locale: string } }) {
  const locale = isLocale(params.locale) ? params.locale : 'id'
  const copy = copyFor(locale)
  return pageMetadata({
    locale,
    title: copy.nav.bahan,
    description: copy.lede.bahan(loadFdcTable().entries.size, fdcRelease().release),
    path: 'bahan',
  })
}

/**
 * The ingredient browser — PRD §6.5. Indonesian names, FDC ids, and the variety
 * notes where the US entry is an imperfect match.
 *
 * The second half lists the ingredients FDC cannot supply at all. They belong
 * here for the same reason they stay in the recipes: an ingredient browser that
 * only showed what it had would imply it had everything.
 */
export default function BahanPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const copy = copyFor(locale)
  const table = loadFdcTable()
  const release = fdcRelease()
  const entries = [...table.entries.values()]
  const unmatched = unmatchedIngredients()

  const byKategori = new Map<string, typeof entries>()
  for (const entry of entries) {
    const existing = byKategori.get(entry.kategori)
    if (existing) existing.push(entry)
    else byKategori.set(entry.kategori, [entry])
  }

  const shown = ['208', '203', '204', '205', '303']

  return (
    <div>
      <h1 className="font-display text-2xl text-rim">{copy.nav.bahan}</h1>
      <p className="mt-4 max-w-prose text-base text-ink-soft">
        {copy.lede.bahan(entries.length, release.release)}
      </p>

      {[...byKategori.entries()].map(([kategori, list]) => (
        <section key={kategori} className="mt-8">
          <h2 lang="id" className="font-display text-lg capitalize text-rim">
            {kategori}
          </h2>
          {/* Focusable so the columns past the edge can be reached without a
              mouse (WCAG 2.1.1); named because a focusable container with no
              role announces nothing. */}
          <div
            className="scroll-x mt-2"
            tabIndex={0}
            role="region"
            aria-label={`${copy.nav.bahan} — ${kategori}`}
          >
            <table className="w-full min-w-[48rem] text-sm">
              {/* One table per category, so each needs its own name — a screen
                  reader listing tables otherwise sees several unnamed ones.
                  The h2 above is not programmatically the table's name. */}
              <caption className="sr-only">
                {copy.nav.bahan} — {kategori}
              </caption>
              <thead>
                <tr className="border-b border-rim/25 text-left text-ink-soft">
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {copy.strip.bahan}
                  </th>
                  {shown.map((id) => (
                    <th
                      key={id}
                      scope="col"
                      className="whitespace-nowrap px-3 py-2 text-right align-bottom font-normal"
                    >
                      {NUTRIENTS.find((n) => n.id === id)![locale === 'en' ? 'labelEn' : 'labelId']}
                    </th>
                  ))}
                  <th scope="col" className="py-2 pl-4 align-bottom font-normal">
                    FDC
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((entry) => (
                  <tr key={entry.id} className="border-b border-rim/10 align-top">
                    <th scope="row" className="py-2 pr-4 text-left font-normal">
                      <span lang="id">{entry.namaId}</span>
                      <span lang="en" className="block text-xs text-chip">
                        {entry.fdcDescription}
                      </span>
                      {entry.catatan && (
                        <span className="mt-1 block max-w-prose text-xs text-edited">
                          {entry.catatan}
                        </span>
                      )}
                    </th>
                    {shown.map((id) => {
                      const value = entry.per100[id]
                      return (
                        <td key={id} className="px-3 py-2 text-right font-mono">
                          {value === undefined ? (
                            <span className="text-chip">
                              —
                              <span className="sr-only">
                                {locale === 'en' ? 'no value in FDC' : 'tidak ada nilainya di FDC'}
                              </span>
                            </span>
                          ) : (
                            formatNutrient(value, id, locale)
                          )}
                        </td>
                      )
                    })}
                    <td className="py-2 pl-4 font-mono text-xs text-chip">{entry.fdcId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="mt-12">
        <h2 className="font-display text-lg text-rim">
          {locale === 'en' ? 'Ingredients with no source' : 'Bahan yang belum ada sumbernya'}
        </h2>
        <p className="mt-2 max-w-prose text-base text-ink-soft">
          {locale === 'en'
            ? 'These are used in the recipes and cannot be given a number. They are listed here rather than approximated with a distant FDC entry.'
            : 'Bahan-bahan ini dipakai di resep dan belum bisa diberi angka. Didaftarkan di sini, bukan didekati dengan entri FDC yang jauh.'}
        </p>
        <ul className="mt-3 space-y-2 text-sm text-chip">
          {unmatched.map((entry) => (
            <li key={entry.id} className="max-w-prose">
              <span className="text-ink">{entry.namaId}</span> — {entry.reason}{' '}
              <span className="italic">
                {locale === 'en' ? 'Would come from: ' : 'Akan datang dari: '}
                {entry.wouldComeFrom}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
