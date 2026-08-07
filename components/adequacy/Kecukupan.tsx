'use client'

/**
 * Adequacy — PRD §6.3. How much of the daily figure one portion contributes.
 *
 * Rendered as a filled proportion in leaf green, which PRD §9 reserves for
 * exactly this. Deliberately NOT a consumed-from-budget bar: the fill grows
 * toward the figure, it does not drain away from it, and there is no total
 * across dishes anywhere on this page.
 *
 * A share over 100% overflows the track and is labelled with its real number.
 * It is not styled as a warning, because it is not one.
 */
import { AKG_CITATION, AKG_KELOMPOK, KELOMPOK_AWAL, adequacyFor, findKelompok } from '@/lib/akg'
import { NUTRIENTS, type NutrientDef, type NutrientGroup } from '@/lib/nutrition/nutrients'
import { perPorsi, type NutritionTrace } from '@/lib/nutrition/trace'
import { copyFor, type Locale } from '@/lib/i18n'
import { formatNutrient, formatPercent, nutrientLabel, unitLabel } from '@/lib/format'

/**
 * Group labels for the four buckets `NutrientDef.group` already carries. The
 * field existed from the start and nothing rendered it, so all 25 nutrients
 * arrived as one undifferentiated list — and "am I getting enough iron", the
 * question PRD §5 says this tool exists to answer, meant reading all 25.
 *
 * Reading order is unchanged: NUTRIENTS order is preserved inside each group,
 * and the groups appear in the order they first occur, so energy stays first.
 */
const GROUP_LABEL: Record<NutrientGroup, Record<Locale, string>> = {
  energi: { id: 'Energi', en: 'Energy' },
  makro: { id: 'Makronutrien', en: 'Macronutrients' },
  mineral: { id: 'Mineral', en: 'Minerals' },
  vitamin: { id: 'Vitamin', en: 'Vitamins' },
  lain: { id: 'Lainnya', en: 'Other' },
}

function byGroup(): Map<NutrientGroup, NutrientDef[]> {
  const grouped = new Map<NutrientGroup, NutrientDef[]>()
  for (const nutrient of NUTRIENTS) {
    const existing = grouped.get(nutrient.group)
    if (existing) existing.push(nutrient)
    else grouped.set(nutrient.group, [nutrient])
  }
  return grouped
}

/**
 * Controlled on the AKG group: the selection is held by the plate so it can be
 * mirrored into the query string with the rest of the view state, rather than
 * being local state that a refresh throws away.
 */
export function Kecukupan({
  trace,
  locale,
  kelompokId,
  onKelompokChange,
}: {
  trace: NutritionTrace
  locale: Locale
  kelompokId: string
  onKelompokChange: (kelompokId: string) => void
}) {
  const copy = copyFor(locale)
  const kelompok = findKelompok(kelompokId) ?? findKelompok(KELOMPOK_AWAL)!

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-lg text-rim">{copy.adequacy.judul}</h2>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-soft">{copy.adequacy.kelompok}</span>
          <select
            value={kelompokId}
            onChange={(event) => onKelompokChange(event.target.value)}
            className="rounded border border-rim/40 bg-enamel px-2 py-1"
          >
            {AKG_KELOMPOK.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-2 max-w-prose text-base text-ink-soft">{copy.adequacy.penjelasan}</p>

      {[...byGroup().entries()].map(([group, nutrients]) => (
        <div key={group} className="mt-5">
          <h3 className="border-b border-rim/20 pb-1 text-sm font-medium text-rim">
            {GROUP_LABEL[group][locale]}
          </h3>
          <ul className="mt-2 space-y-2">
            {nutrients.map((nutrient) => {
              const total = trace.totals.find((entry) => entry.nutrientId === nutrient.id)!
              const amount = perPorsi(trace, total)
              const adequacy = adequacyFor(kelompok, nutrient.id, amount)
              return (
                <li
                  key={nutrient.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                >
                  <span className="w-40 shrink-0">{nutrientLabel(nutrient.id, locale)}</span>
                  <span className="w-24 shrink-0 text-right font-mono">
                    {formatNutrient(amount, nutrient.id, locale)}{' '}
                    <span className="text-chip">{unitLabel(nutrient.id)}</span>
                  </span>

                  {adequacy.type === 'dibandingkan' ? (
                    <>
                      <span className="h-3 min-w-[80px] flex-1 bg-rim/10">
                        <span
                          className="move-together block h-3 bg-adequate"
                          style={{ width: `${Math.min(100, Math.round(adequacy.bagian * 100))}%` }}
                        />
                      </span>
                      <span className="w-16 shrink-0 text-right font-mono text-adequate">
                        {formatPercent(adequacy.bagian, locale)}
                      </span>
                    </>
                  ) : (
                    <span className="flex-1 text-chip">
                      {copy.adequacy.tidakDibandingkan} — {adequacy.reason}
                    </span>
                  )}

                  {!total.lengkap && (
                    <span className="w-full text-xs text-chip sm:w-auto">
                      {locale === 'en' ? 'incomplete' : 'belum lengkap'}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <p className="mt-4 max-w-prose text-xs text-ink-soft">{AKG_CITATION}</p>
    </section>
  )
}
