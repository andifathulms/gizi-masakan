'use client'

/**
 * The recipe strip — PRD §6.1. One row per ingredient, its gram weight
 * editable inline, and a bar showing its contribution to the currently selected
 * nutrient. Switch nutrient and the bars re-rank, so "most of the calories here
 * are the santan" becomes something you see.
 *
 * Ingredients with no data get a row too. They cannot have a bar, and the row
 * says so — an ingredient that vanished from this list would be the exact
 * failure invariant 2 exists to prevent.
 */
import { NUTRIENTS } from '@/lib/nutrition/nutrients'
import type { NutritionTrace, Recipe } from '@/lib/nutrition/trace'
import { copyFor, type Locale } from '@/lib/i18n'
import { formatGram, formatNutrient, nutrientLabel, unitLabel } from '@/lib/format'

interface Props {
  trace: NutritionTrace
  recipe: Recipe
  locale: Locale
  nutrientId: string
  onNutrientChange: (nutrientId: string) => void
  beratOverrideG: Record<string, number>
  onBeratChange: (ingredientId: string, beratG: number) => void
  onReset: () => void
}

export function StripResep({
  trace,
  recipe,
  locale,
  nutrientId,
  onNutrientChange,
  beratOverrideG,
  onBeratChange,
  onReset,
}: Props) {
  const copy = copyFor(locale)
  const total = trace.totals.find((entry) => entry.nutrientId === nutrientId)!
  const largest = total.contributions.reduce((max, c) => Math.max(max, c.total), 0)
  const edited = Object.keys(beratOverrideG).length > 0

  // Rows in recipe order — the order you would cook in, not a ranking. The bar
  // lengths carry the ranking.
  const rows = recipe.bahan.map((bahan) => {
    const contribution = total.contributions.find((c) => c.ingredientId === bahan.ingredientId)
    const known = trace.bahan.find((entry) => entry.ingredientId === bahan.ingredientId)
    const missing = trace.bahanTanpaData.find((entry) => entry.ingredientId === bahan.ingredientId)
    const beratG = beratOverrideG[bahan.ingredientId] ?? bahan.beratG
    return { bahan, contribution, known, missing, beratG }
  })

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-xl text-rim">{copy.strip.judul}</h2>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-chip">{copy.strip.pilihNutrien}</span>
            <select
              value={nutrientId}
              onChange={(event) => onNutrientChange(event.target.value)}
              className="rounded border border-rim/40 bg-enamel px-2 py-1"
            >
              {NUTRIENTS.map((nutrient) => (
                <option key={nutrient.id} value={nutrient.id}>
                  {locale === 'en' ? nutrient.labelEn : nutrient.labelId}
                </option>
              ))}
            </select>
          </label>
          {edited && (
            <button type="button" onClick={onReset} className="text-edited underline underline-offset-4">
              {copy.strip.kembalikan}
            </button>
          )}
        </div>
      </div>

      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">
          {copy.strip.judul} — {copy.strip.sumbangan}: {nutrientLabel(nutrientId, locale)}
        </caption>
        <thead>
          <tr className="border-b border-rim/25 text-left text-chip">
            <th scope="col" className="py-2 font-normal">
              {copy.strip.bahan}
            </th>
            <th scope="col" className="w-28 py-2 text-right font-normal">
              {copy.strip.berat}
            </th>
            <th scope="col" className="py-2 pl-4 font-normal">
              {copy.strip.sumbangan} — {nutrientLabel(nutrientId, locale)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ bahan, contribution, known, missing, beratG }) => {
            const isEdited = beratOverrideG[bahan.ingredientId] !== undefined
            const isEstimate = bahan.provenance === 'perkiraan'
            const share = largest > 0 && contribution ? contribution.total / largest : 0
            return (
              <tr key={bahan.ingredientId} className="border-b border-rim/10 align-top">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  <span className={missing ? 'text-chip' : undefined}>
                    {known?.namaId ?? missing?.namaId ?? bahan.ingredientId}
                  </span>
                  {known?.pengolahanLabel && (
                    <span className="block text-xs text-chip">{known.pengolahanLabel}</span>
                  )}
                  {missing && (
                    <span className="block text-xs text-chip">
                      {locale === 'en' ? 'no data — not counted' : 'tidak ada datanya — tidak dihitung'}
                    </span>
                  )}
                </th>

                <td className="py-2 text-right">
                  <label className="inline-flex items-baseline gap-1">
                    <span className="sr-only">
                      {known?.namaId ?? bahan.ingredientId} — {copy.strip.berat}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={beratG}
                      onChange={(event) => {
                        const next = Number(event.target.value)
                        if (Number.isFinite(next) && next >= 0) onBeratChange(bahan.ingredientId, next)
                      }}
                      className={`w-16 rounded border border-rim/30 bg-enamel px-1 py-0.5 text-right font-mono ${
                        isEdited || isEstimate ? 'text-edited' : ''
                      }`}
                    />
                    <span className="text-chip">g</span>
                  </label>
                  <span className="block text-xs text-chip">
                    {isEdited ? copy.strip.diedit : isEstimate ? copy.strip.perkiraan : copy.strip.ditimbang}
                  </span>
                </td>

                <td className="py-2 pl-4">
                  {contribution ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 min-w-[2px] flex-1 bg-rim/10">
                        <div
                          className="move-together h-2 bg-rim/70"
                          style={{ width: `${Math.round(share * 100)}%` }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right font-mono">
                        {formatNutrient(contribution.total, nutrientId, locale)}{' '}
                        <span className="text-chip">{unitLabel(nutrientId)}</span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-chip">
                      {missing
                        ? locale === 'en'
                          ? 'no value — this dish is understated by whatever it contributes'
                          : 'tidak ada nilainya — angka masakan ini kurang sebanyak sumbangannya'
                        : locale === 'en'
                          ? 'no value for this nutrient'
                          : 'tidak ada nilai untuk nutrien ini'}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className="mt-3 text-sm text-chip">
        {locale === 'en'
          ? 'Weights in terracotta are estimates or your edits, not measurements.'
          : 'Berat berwarna terakota adalah perkiraan atau hasil suntingan Anda, bukan hasil timbangan.'}{' '}
        <span className="font-mono">
          {formatGram(trace.massa.mentahG, locale)} g {locale === 'en' ? 'raw in total' : 'total mentah'}
        </span>
      </p>
    </section>
  )
}
