'use client'

/**
 * The computation trace — PRD §6.4. For the selected nutrient: which ingredient
 * contributed what, at which gram weight, from which FDC entry, with which
 * retention factor applied or explicitly not applied.
 *
 * Every number on this page is one step from its source. That is the whole
 * claim the project makes, so the trace is a section on the plate rather than
 * something behind a tap.
 */
import type { NutritionTrace } from '@/lib/nutrition/trace'
import { copyFor, type Locale } from '@/lib/i18n'
import { formatGram, formatNutrient, nutrientLabel, unitLabel } from '@/lib/format'

export function JejakNutrien({
  trace,
  locale,
  nutrientId,
}: {
  trace: NutritionTrace
  locale: Locale
  nutrientId: string
}) {
  const copy = copyFor(locale)
  const total = trace.totals.find((entry) => entry.nutrientId === nutrientId)!

  return (
    <section>
      <h2 className="font-display text-lg text-rim">
        {copy.trace.judul} — {nutrientLabel(nutrientId, locale)}
      </h2>

      {/* Focusable so the FDC id and retention columns can be reached without
          a mouse (WCAG 2.1.1). role + name because a focusable container with
          no role is an unlabelled tab stop; there is no native scrollable
          region element. */}
      <div
        className="scroll-x mt-3"
        tabIndex={0}
        role="region"
        aria-label={`${copy.trace.judul} — ${nutrientLabel(nutrientId, locale)}`}
      >
        <table className="w-full min-w-[52rem] text-sm">
          <caption className="sr-only">
            {copy.trace.judul} — {nutrientLabel(nutrientId, locale)}
          </caption>
          <thead>
            <tr className="border-b border-rim/25 text-left text-ink-soft">
              <th scope="col" className="whitespace-nowrap py-2 pr-4 align-bottom font-normal">
                {copy.strip.bahan}
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-2 text-right align-bottom font-normal">
                {copy.strip.berat}
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-2 text-right align-bottom font-normal">
                {copy.trace.per100}
              </th>
              <th scope="col" className="whitespace-nowrap py-2 pr-4 align-bottom font-normal">
                {copy.trace.retensi}
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-2 text-right align-bottom font-normal">
                {copy.trace.sumbanganTotal}
              </th>
              <th scope="col" className="whitespace-nowrap py-2 pl-4 align-bottom font-normal">
                FDC
              </th>
            </tr>
          </thead>
          <tbody>
            {total.contributions.map((contribution) => (
              <tr key={contribution.ingredientId} className="border-b border-rim/10 align-top">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  {contribution.namaId}
                </th>
                <td className="px-3 py-2 text-right font-mono">
                  {formatGram(contribution.beratG, locale)} g
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {formatNutrient(contribution.per100, nutrientId, locale)}{' '}
                  <span className="text-chip">{unitLabel(nutrientId)}</span>
                </td>
                <td className="py-2 pr-3">
                  {contribution.retention.type === 'adjusted' ? (
                    <>
                      <span className="font-mono">×{contribution.retention.factor.toFixed(2)}</span>{' '}
                      <span className="text-chip">
                        {copy.trace.disesuaikan} — {contribution.retention.description}
                      </span>
                      <span className="block text-xs text-chip">
                        {contribution.retention.citation}
                      </span>
                      {contribution.retention.catatan && (
                        <span className="block text-xs text-chip">{contribution.retention.catatan}</span>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Chip grey, and it says unadjusted — never "×1.00",
                          which would read as an applied factor. */}
                      <span className="text-chip">{copy.trace.tanpaPenyesuaian}</span>
                      <span className="block text-xs text-chip">{contribution.retention.reason}</span>
                    </>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {formatNutrient(contribution.total, nutrientId, locale)}{' '}
                  <span className="text-chip">{unitLabel(nutrientId)}</span>
                </td>
                <td className="py-2 pl-3 text-xs text-chip">
                  <span className="font-mono">{contribution.fdcId}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-rim/40">
              <th scope="row" colSpan={4} className="py-2 text-left font-normal">
                {locale === 'en' ? 'Total for the whole recipe' : 'Total seluruh resep'}
                {!total.lengkap && (
                  <span className="block text-xs text-chip">
                    {locale === 'en'
                      ? `Missing a value from: ${total.kosongDari.join(', ')}`
                      : `Tidak ada nilai dari: ${total.kosongDari.join(', ')}`}
                  </span>
                )}
              </th>
              <td className="px-3 py-2 text-right font-mono">
                {formatNutrient(total.total, nutrientId, locale)}{' '}
                <span className="text-chip">{unitLabel(nutrientId)}</span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
