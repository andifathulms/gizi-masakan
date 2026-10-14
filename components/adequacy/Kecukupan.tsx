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
import { TandaChip } from '@/components/chrome/TandaChip'

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
        <h2 className="font-display text-xl text-rim">{copy.adequacy.judul}</h2>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-soft">{copy.adequacy.kelompok}</span>
          <select
            value={kelompokId}
            onChange={(event) => onKelompokChange(event.target.value)}
            className="h-9 rounded border border-rim/40 bg-piring px-2"
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
      {/* The operation and its source, stated where the operation happens
          rather than in a footnote. A percentage whose denominator is not shown
          reads as an allowance being spent — the exact framing PRD §5 bans. */}
      <p className="mt-2 max-w-prose text-sm text-ink-soft">{copy.adequacy.rumus}</p>
      <p className="mt-1 max-w-prose text-xs text-ink-soft">{AKG_CITATION}</p>
      {/* The mark explains itself in words wherever it appears. */}
      {trace.totals.some((total) => !total.lengkap) && (
        <p className="mt-3 flex max-w-prose gap-2 text-sm text-chip">
          <TandaChip className="mt-1" />
          <span>{copy.gaps.tandaBelumLengkap}</span>
        </p>
      )}

      {/* Groups flow into two columns on a wide screen, so "am I getting enough
          iron" does not mean scrolling past all twenty-seven rows. Reading
          order is unchanged and energy stays first. */}
      <div className="mt-5 grid gap-x-10 gap-y-6 lg:grid-cols-2">
        {[...byGroup().entries()].map(([group, nutrients]) => (
          <div key={group} className="min-w-0">
            <h3 className="border-b border-rim/20 pb-1 text-xs font-semibold uppercase tracking-wider text-rim-soft">
              {GROUP_LABEL[group][locale]}
            </h3>
            <ul className="mt-1">
              {nutrients.map((nutrient) => {
                const total = trace.totals.find((entry) => entry.nutrientId === nutrient.id)!
                const amount = perPorsi(trace, total)
                const adequacy = adequacyFor(kelompok, nutrient.id, amount)
                return (
                  <li
                    key={nutrient.id}
                    className="grid grid-cols-[minmax(0,8.5rem)_5.5rem_minmax(0,1fr)] items-center gap-x-3 border-b border-rim/10 py-2 text-sm sm:grid-cols-[minmax(0,9.5rem)_6rem_minmax(0,1fr)_6.5rem]"
                  >
                    <span className="min-w-0">
                      {nutrientLabel(nutrient.id, locale)}
                      {!total.lengkap && (
                        <span className="ml-1.5">
                          <TandaChip />
                          <span className="sr-only">
                            {' '}
                            {locale === 'en' ? 'incomplete' : 'belum lengkap'}
                          </span>
                        </span>
                      )}
                    </span>
                    <span className="text-right font-mono">
                      {formatNutrient(amount, nutrient.id, locale)}{' '}
                      <span className="text-ink-soft">{unitLabel(nutrient.id)}</span>
                    </span>

                    {adequacy.type === 'dibandingkan' ? (
                      <>
                        {/* Fills toward the figure, never drains from it. Over
                            100% fills the track and says its real number; it is
                            not styled as a warning, because it is not one. */}
                        <span className="h-3 min-w-bar overflow-hidden rounded-full bg-adequate-tint">
                          <span
                            className="move-together block h-3 rounded-full bg-adequate"
                            style={{ width: `${Math.min(100, Math.round(adequacy.bagian * 100))}%` }}
                          />
                        </span>
                        <span className="col-span-3 text-right sm:col-span-1">
                          <span className="font-mono font-semibold text-adequate">
                            {formatPercent(adequacy.bagian, locale)}
                          </span>{' '}
                          {/* The denominator, printed. A percentage of a
                              quantity the reader cannot see is not checkable. */}
                          <span className="font-mono text-xs text-ink-soft sm:block">
                            {copy.adequacy.dari(
                              `${formatNutrient(adequacy.akg, nutrient.id, locale)} ${adequacy.unit}`,
                            )}
                          </span>
                        </span>
                      </>
                    ) : (
                      <span className="col-span-3 text-xs text-chip sm:col-span-2">
                        {copy.adequacy.tidakDibandingkan} — {adequacy.reason}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
