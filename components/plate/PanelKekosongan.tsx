'use client'

/**
 * The gaps, shown rather than buried. Invariant 2 says a gap must be named in
 * the output; this is where the output names it.
 *
 * Chip grey throughout — PRD §9 reserves it for gaps, missing data and
 * unadjusted nutrients. Deliberately not red: a gap is an honest absence, not
 * an error the reader caused.
 */
import { gapSeverity, describeGap } from '@/lib/nutrition/gaps'
import type { Gap, NutritionTrace } from '@/lib/nutrition/trace'
import { copyFor, type Locale } from '@/lib/i18n'
import { formatGram } from '@/lib/format'

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

  const grouped = new Map<ReturnType<typeof gapSeverity>, Gap[]>()
  for (const gap of trace.gaps) {
    const severity = gapSeverity(gap)
    const existing = grouped.get(severity)
    if (existing) existing.push(gap)
    else grouped.set(severity, [gap])
  }

  return (
    <section>
      <h2 className="font-display text-xl text-rim">{copy.gaps.judul}</h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed">
        {trace.lengkap ? copy.gaps.ringkasLengkap : copy.gaps.ringkasTidakLengkap}
      </p>

      {trace.bahanTanpaData.length > 0 && (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-chip">
          {locale === 'en'
            ? `${formatGram(
                trace.bahanTanpaData.reduce((sum, bahan) => sum + bahan.beratG, 0),
                locale,
              )} g of this dish contributes nothing to the numbers above, because there is no licensed data for it.`
            : `${formatGram(
                trace.bahanTanpaData.reduce((sum, bahan) => sum + bahan.beratG, 0),
                locale,
              )} g dari masakan ini tidak menyumbang apa pun ke angka di atas, karena datanya tidak ada.`}
        </p>
      )}

      {[...grouped.entries()].map(([severity, gaps]) => (
        <div key={severity} className="mt-4">
          <h3 className="text-sm font-medium text-chip">
            {heading(severity, locale)} ({gaps.length})
          </h3>
          <ul className="mt-1 space-y-1 text-sm leading-relaxed text-chip">
            {gaps.map((gap, index) => (
              <li key={`${gap.type}-${gap.ingredientId}-${index}`} className="max-w-prose">
                {describeGap(gap)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
