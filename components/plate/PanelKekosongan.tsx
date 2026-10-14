'use client'

/**
 * The gaps, shown rather than buried. Invariant 2 says a gap must be named in
 * the output; this is where the output names it.
 *
 * Chip grey and the hatch throughout — PRD §9 reserves both for gaps, missing
 * data and unadjusted nutrients. Deliberately not red: a gap is an honest
 * absence, not an error the reader caused.
 */
import { describeGap, gapSeverity, massaTakTerhitung, nilaiKosongPerBahan } from '@/lib/nutrition/gaps'
import type { Gap, NutritionTrace } from '@/lib/nutrition/trace'
import { copyFor, type Locale } from '@/lib/i18n'
import { formatGram, formatPercent, nutrientLabel } from '@/lib/format'
import { TandaChip } from '@/components/chrome/TandaChip'

function heading(severity: ReturnType<typeof gapSeverity>, locale: Locale): string {
  const copy = copyFor(locale)
  switch (severity) {
    case 'bahan-hilang':
      return copy.gaps.bahanHilang
    case 'nilai-hilang':
      return copy.gaps.nilaiHilang
    case 'faktor-hilang':
      return copy.gaps.faktorHilang
    default: {
      const never: never = severity
      throw new Error(`Unhandled severity: ${String(never)}`)
    }
  }
}

export function PanelKekosongan({ trace, locale }: { trace: NutritionTrace; locale: Locale }) {
  const copy = copyFor(locale)

  const takTerhitung = massaTakTerhitung(trace)

  const grouped = new Map<ReturnType<typeof gapSeverity>, Gap[]>()
  for (const gap of trace.gaps) {
    const severity = gapSeverity(gap)
    const existing = grouped.get(severity)
    if (existing) existing.push(gap)
    else grouped.set(severity, [gap])
  }

  return (
    /* Bordered and set on the deeper enamel, because this panel is the
       project's correctness story (invariant 2, PRD §13's top risk). "Present
       but visibly incomplete" (PRD §9) should not mean easy to skip. */
    <section className="rounded-plate border border-rim/30 bg-enamel-deep px-5 py-5 sm:px-6">
      <h2 className="font-display text-xl text-rim">{copy.gaps.judul}</h2>
      <p className="mt-2 max-w-prose text-base font-medium">
        {trace.lengkap ? copy.gaps.ringkasLengkap : copy.gaps.ringkasTidakLengkap}
      </p>

      {/* Named is not enough: a reader cannot tell whether an absent
          ingredient costs 2% of the dish or most of it. Strictly mass, and the
          copy says so — 25 g of oil and 25 g of water weigh the same and are
          nothing alike. */}
      {takTerhitung.takTerhitungG > 0 && (
        <div className="mt-4">
          <div
            aria-hidden="true"
            className="flex h-4 overflow-hidden rounded-full border border-rim/30 bg-piring"
          >
            <span className="bg-rim-soft" style={{ width: `${(1 - takTerhitung.bagian) * 100}%` }} />
            <span
              className="arsir border-l-2 border-piring"
              style={{ width: `${takTerhitung.bagian * 100}%` }}
            />
          </div>
          <p aria-hidden="true" className="mt-1 flex justify-between text-xs text-ink-soft">
            <span>{copy.gaps.massaTerhitung}</span>
            <span className="text-chip">{copy.gaps.massaTakTerhitung}</span>
          </p>
          <p className="mt-2 max-w-prose text-sm text-chip">
            {copy.gaps.massaDish(
              formatGram(takTerhitung.takTerhitungG, locale),
              formatGram(takTerhitung.mentahG, locale),
              formatPercent(takTerhitung.bagian, locale),
            )}
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-3">
        {[...grouped.entries()].map(([severity, gaps]) => (
          <div key={severity} className="min-w-0">
            <h3 className="text-sm font-semibold text-ink">
              {heading(severity, locale)} <span className="font-mono">({gaps.length})</span>
            </h3>

            {severity === 'bahan-hilang' && (
              <ul className="mt-2 space-y-2 text-sm text-chip">
                {gaps.map((gap, index) =>
                  gap.type === 'bahan-tanpa-data' ? (
                    <li key={`${gap.ingredientId}-${index}`} className="flex gap-2">
                      <TandaChip className="mt-1" />
                      <span>
                        <span lang="id" className="font-medium text-ink">
                          {gap.namaId}
                        </span>{' '}
                        <span className="font-mono">({formatGram(gap.beratG, locale)} g)</span>.{' '}
                        {gap.reason}
                      </span>
                    </li>
                  ) : (
                    <li key={`${gap.type}-${index}`}>{describeGap(gap)}</li>
                  ),
                )}
              </ul>
            )}

            {/* One ingredient per line, its missing nutrients beside it. The
                explanation is said once for the group; every nutrient is still
                named. lib/nutrition/gaps.ts nilaiKosongPerBahan, tested to
                lose none. */}
            {severity === 'nilai-hilang' && (
              <>
                <p className="mt-2 text-sm text-chip">{copy.gaps.nilaiKosongPenjelasan}</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {nilaiKosongPerBahan(gaps).map((bahan) => (
                    <li key={bahan.ingredientId}>
                      <span lang="id" className="font-medium text-ink">
                        {bahan.namaId}
                      </span>
                      <ul className="mt-1 flex flex-wrap gap-1">
                        {bahan.nutrientIds.map((id) => (
                          <li
                            key={id}
                            className="rounded border border-dashed border-chip px-1.5 text-xs text-chip"
                          >
                            {nutrientLabel(id, locale)}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {severity === 'faktor-hilang' && (
              <ul className="mt-2 space-y-2 text-sm text-chip">
                {gaps.map((gap, index) => (
                  <li key={`${gap.type}-${gap.ingredientId}-${index}`}>{describeGap(gap)}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
