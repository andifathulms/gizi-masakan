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
import { useRef } from 'react'
import { NUTRIENTS } from '@/lib/nutrition/nutrients'
import { alternatifUntuk } from '@/lib/nutrition/pengolahan'
import { kepekaan, LANGKAH_G } from '@/lib/nutrition/sensitivity'
import { langkahBerat, LANGKAH_STEPPER_G } from '@/lib/portion/langkah'
import type { NutritionTrace, Recipe } from '@/lib/nutrition/trace'
import { copyFor, type Locale } from '@/lib/i18n'
import { formatGram, formatNutrient, nutrientLabel, unitLabel } from '@/lib/format'
import { TandaChip } from '@/components/chrome/TandaChip'

interface Props {
  trace: NutritionTrace
  /** The authored recipe's own trace, so an edited row can mark where its bar
      stood before the edit. Never edited; computed once per recipe. */
  asli: NutritionTrace
  recipe: Recipe
  locale: Locale
  nutrientId: string
  onNutrientChange: (nutrientId: string) => void
  beratOverrideG: Record<string, number>
  onBeratChange: (ingredientId: string, beratG: number) => void
  pengolahanOverride: Record<string, string>
  onPengolahanChange: (ingredientId: string, retentionCode: string) => void
  onReset: () => void
}

export function StripResep({
  trace,
  asli,
  recipe,
  locale,
  nutrientId,
  onNutrientChange,
  beratOverrideG,
  onBeratChange,
  pengolahanOverride,
  onPengolahanChange,
  onReset,
}: Props) {
  const copy = copyFor(locale)
  /* The reset button renders only while there are edits, so activating it
     unmounts it and drops focus to <body> — WCAG 2.4.3. Focus moves to the
     section heading instead, which is where the reader now is. */
  const judulRef = useRef<HTMLHeadingElement>(null)
  const total = trace.totals.find((entry) => entry.nutrientId === nutrientId)!
  const totalAsli = asli.totals.find((entry) => entry.nutrientId === nutrientId)
  /* The scale covers the authored contributions too, so the tick marking
     where a bar used to stand never falls off the end of its track. */
  const largest = Math.max(
    0,
    ...total.contributions.map((c) => c.total),
    ...(totalAsli?.contributions.map((c) => c.total) ?? []),
  )
  const edited =
    Object.keys(beratOverrideG).length > 0 || Object.keys(pengolahanOverride).length > 0
  /* Top three by rate. Three because the tail is rounding — a forty-ingredient
     dish has a handful that move the number and the rest are noise. */
  const peka = kepekaan(trace, nutrientId).slice(0, 3)
  /* The headline nutrients are chosen from the plate's tiles; this select
     carries the rest, and shows its placeholder while a tile is selected. */
  const isHeadline = NUTRIENTS.some((n) => n.id === nutrientId && n.headline)
  const langkahLabel = formatGram(LANGKAH_STEPPER_G, locale)

  // Rows in recipe order — the order you would cook in, not a ranking. The bar
  // lengths carry the ranking.
  const rows = recipe.bahan.map((bahan) => {
    const contribution = total.contributions.find((c) => c.ingredientId === bahan.ingredientId)
    const contributionAsli = totalAsli?.contributions.find(
      (c) => c.ingredientId === bahan.ingredientId,
    )
    const known = trace.bahan.find((entry) => entry.ingredientId === bahan.ingredientId)
    const missing = trace.bahanTanpaData.find((entry) => entry.ingredientId === bahan.ingredientId)
    const beratG = beratOverrideG[bahan.ingredientId] ?? bahan.beratG
    return { bahan, contribution, contributionAsli, known, missing, beratG }
  })

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 ref={judulRef} tabIndex={-1} className="font-display text-xl text-rim">
          {copy.strip.judul}
        </h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-ink-soft">{copy.strip.nutrienLain}</span>
            <select
              value={isHeadline ? '' : nutrientId}
              onChange={(event) => {
                if (event.target.value) onNutrientChange(event.target.value)
              }}
              className="h-9 rounded border border-rim/40 bg-enamel px-2"
            >
              <option value="" disabled>
                —
              </option>
              {NUTRIENTS.filter((nutrient) => !nutrient.headline).map((nutrient) => (
                <option key={nutrient.id} value={nutrient.id}>
                  {locale === 'en' ? nutrient.labelEn : nutrient.labelId}
                </option>
              ))}
            </select>
          </label>
          {edited && (
            <button
              type="button"
              onClick={() => {
                onReset()
                judulRef.current?.focus()
              }}
              className="rounded-full border border-edited px-3 py-1 text-edited hover:bg-edited-tint"
            >
              {copy.strip.kembalikan}
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 text-sm text-ink-soft">
        {copy.strip.barMenunjukkan}{' '}
        <span className="font-medium text-rim">{nutrientLabel(nutrientId, locale)}</span>.{' '}
        {edited && copy.strip.tandaAsli}
      </p>

      {/* A list, not a table. As a table the strip needed a fixed minimum
          width and scrolled sideways on a phone; as rows on a grid it folds to
          two lines — name and weight, then the bar — and never overflows. The
          column headings are visual only: every input, value and bar carries
          its own accessible name, so nothing depended on header association. */}
      <div
        aria-hidden="true"
        className="mt-4 hidden grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1.5fr)] gap-x-4 border-b border-rim/25 pb-2 text-sm text-ink-soft sm:grid"
      >
        <span>{copy.strip.bahan}</span>
        <span className="w-[11.5rem] text-right">{copy.strip.berat}</span>
        <span>
          {copy.strip.sumbangan} — {nutrientLabel(nutrientId, locale)}
        </span>
      </div>
      <ul className="mt-3 text-sm sm:mt-0">
        {rows.map(({ bahan, contribution, contributionAsli, known, missing, beratG }) => {
          const isEdited = beratOverrideG[bahan.ingredientId] !== undefined
          /* The tick marks any departure from the authored row — a changed
             cooking method moves the bar as surely as a changed weight. */
          const rowDiubah = isEdited || pengolahanOverride[bahan.ingredientId] !== undefined
          const isEstimate = bahan.provenance === 'perkiraan'
          const nama = known?.namaId ?? missing?.namaId ?? bahan.ingredientId
          const share = largest > 0 && contribution ? contribution.total / largest : 0
          const shareAsli =
            largest > 0 && contributionAsli ? contributionAsli.total / largest : undefined
          const inputId = `berat-${bahan.ingredientId}`
          return (
            <li
              key={bahan.ingredientId}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 border-b border-rim/10 py-3 sm:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1.5fr)] sm:items-center"
            >
              <div className="min-w-0">
                <span lang="id" className={`text-base ${missing ? 'text-chip' : ''}`}>
                  {nama}
                </span>
                {known?.pengolahanLabel && !known.retentionCode && (
                  <span className="block text-xs text-ink-soft">{known.pengolahanLabel}</span>
                )}
                {/* The second-largest assumption after the grams. Only
                    rendered where USDA publishes more than one operation for
                    this kind of ingredient. */}
                {known?.retentionCode && alternatifUntuk(known.retentionCode).length > 1 && (
                  <label className="mt-1 block">
                    <span className="sr-only">
                      {known.namaId} — {copy.strip.caraMasak}
                    </span>
                    {/* The option text is the literal USDA operation name,
                        in English and in the source's own capitalisation, so
                        it can be found in the retention table. That is the
                        citation; lang marks it for a screen reader. */}
                    <select
                      lang="en"
                      value={known.retentionCode}
                      onChange={(event) =>
                        onPengolahanChange(bahan.ingredientId, event.target.value)
                      }
                      className={`w-full max-w-[14rem] rounded border border-rim/30 bg-enamel px-1 py-0.5 text-xs ${
                        known.pengolahanDiganti ? 'text-edited' : 'text-ink-soft'
                      }`}
                    >
                      {alternatifUntuk(known.retentionCode).map((operasi) => (
                        <option key={operasi.code} value={operasi.code}>
                          {operasi.description}
                        </option>
                      ))}
                    </select>
                    <span className="block text-xs text-ink-soft">
                      {known.pengolahanDiganti
                        ? copy.strip.caraMasakDiganti
                        : `${known.pengolahanLabel} — ${copy.strip.caraMasakAsli}`}
                    </span>
                  </label>
                )}
                {known?.retentionCode && alternatifUntuk(known.retentionCode).length <= 1 && (
                  <span className="block text-xs text-ink-soft">{known.pengolahanLabel}</span>
                )}
                {missing && (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-chip">
                    <TandaChip />
                    {locale === 'en'
                      ? 'no data — not counted'
                      : 'tidak ada datanya — tidak dihitung'}
                  </span>
                )}
              </div>

              <div className="text-right sm:w-[11.5rem]">
                <label htmlFor={inputId} className="sr-only">
                  {nama} — {copy.strip.berat}
                </label>
                {/* 44px tall, with steppers, so nudging a weight on a phone
                    does not need the keyboard over the rows being compared. */}
                <span className="inline-flex items-center gap-1">
                  <span
                    className={`inline-flex h-11 items-stretch overflow-hidden rounded border ${
                      isEdited ? 'border-edited bg-edited-tint' : 'border-rim/30 bg-piring'
                    }`}
                  >
                    <button
                      type="button"
                      aria-label={copy.strip.kurangi(nama, langkahLabel)}
                      onClick={() =>
                        onBeratChange(bahan.ingredientId, langkahBerat(beratG, -LANGKAH_STEPPER_G))
                      }
                      className="w-9 text-md text-rim hover:bg-rim-tint"
                    >
                      −
                    </button>
                    <input
                      id={inputId}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={1}
                      value={beratG}
                      onChange={(event) => {
                        const next = Number(event.target.value)
                        if (event.target.value.trim() !== '' && Number.isFinite(next) && next >= 0)
                          onBeratChange(bahan.ingredientId, next)
                      }}
                      className={`w-14 border-x border-rim/20 bg-transparent px-1 text-right font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                        isEdited ? 'tanda-diubah' : isEstimate ? 'tanda-perkiraan' : ''
                      }`}
                    />
                    <button
                      type="button"
                      aria-label={copy.strip.tambah(nama, langkahLabel)}
                      onClick={() =>
                        onBeratChange(bahan.ingredientId, langkahBerat(beratG, LANGKAH_STEPPER_G))
                      }
                      className="w-9 text-md text-rim hover:bg-rim-tint"
                    >
                      +
                    </button>
                  </span>
                  <span className="text-ink-soft">g</span>
                </span>
                <span className="mt-0.5 block whitespace-nowrap text-xs text-ink-soft">
                  {isEdited
                    ? copy.strip.diedit
                    : isEstimate
                      ? copy.strip.perkiraan
                      : /* The date the reading was taken, shown where the weight
                           is — invariant 8 says a measured value carries one. */
                        `${copy.strip.ditimbang}${bahan.ditimbangPada ? ` ${bahan.ditimbangPada}` : ''}`}
                </span>
              </div>

              <div className="col-span-2 min-w-0 sm:col-span-1">
                {contribution ? (
                  <div className="flex items-center gap-3">
                    <div className="relative h-2.5 min-w-bar-sliver flex-1 rounded-full bg-rim-tint">
                      <div
                        className="move-together h-2.5 rounded-full bg-rim/70"
                        style={{ width: `${Math.round(share * 100)}%` }}
                      />
                      {/* Where the bar stood in the authored recipe. Shown only
                          on a row the reader changed, so an unedited strip has
                          no marks to explain. */}
                      {rowDiubah && shareAsli !== undefined && (
                        <span
                          aria-hidden="true"
                          className="move-together absolute -bottom-1 -top-1 w-0.5 rounded bg-edited"
                          style={{ left: `calc(${Math.round(shareAsli * 100)}% - 1px)` }}
                        />
                      )}
                    </div>
                    <span className="w-24 shrink-0 text-right font-mono">
                      <span className="sr-only">
                        {copy.strip.sumbangan} — {nutrientLabel(nutrientId, locale)}:{' '}
                      </span>
                      {formatNutrient(contribution.total, nutrientId, locale)}{' '}
                      <span className="text-ink-soft">{unitLabel(nutrientId)}</span>
                      {rowDiubah && contributionAsli && (
                        <span className="sr-only">
                          {' '}
                          (
                          {copy.strip.resepAsliTanda(
                            `${formatNutrient(contributionAsli.total, nutrientId, locale)} ${unitLabel(nutrientId)}`,
                          )}
                          )
                        </span>
                      )}
                    </span>
                  </div>
                ) : (
                  /* Hatched, the one pattern in the product: there is no bar
                     because there is no number, and the track says so. */
                  <span className="block">
                    <span aria-hidden="true" className="arsir block h-2.5 rounded-full" />
                    <span className="mt-1 block text-xs text-chip">
                    {missing
                      ? locale === 'en'
                        ? 'no value — this dish is understated by whatever it contributes'
                        : 'tidak ada nilainya — angka masakan ini kurang sebanyak sumbangannya'
                      : locale === 'en'
                        ? 'no value for this nutrient'
                        : 'tidak ada nilai untuk nutrien ini'}
                    </span>
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* The bars above rank by share of the total. This ranks by rate, which
          is a different question and the one a reader with a different recipe
          actually has. Kept out of the table so the strip does not get wider. */}
      {peka.length > 0 && (
        <section className="mt-4">
          <h3 className="text-sm font-medium text-ink">{copy.strip.kepekaanJudul}</h3>
          <p className="mt-1 max-w-prose text-sm text-ink-soft">
            {copy.strip.kepekaanPenjelasan(
              formatGram(LANGKAH_G, locale),
              nutrientLabel(nutrientId, locale).toLowerCase(),
            )}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {peka.map((row) => (
              <li key={row.ingredientId} className="rounded-lg border border-rim/20 px-3 py-1.5">
                <span lang="id" className="font-medium">
                  {row.namaId}
                </span>{' '}
                <span className="font-mono">
                  +{formatNutrient(row.perLangkah, nutrientId, locale)} {unitLabel(nutrientId)}
                </span>{' '}
                <span className="text-ink-soft">
                  / {formatGram(LANGKAH_G, locale)} g · {copy.strip.berat.toLowerCase()}{' '}
                  <span className="font-mono">{formatGram(row.beratG, locale)} g</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Said next to the control, because the consequence of using it —
          losing the cooked weight — is not obvious. */}
      <p className="mt-3 max-w-prose text-sm text-ink-soft">{copy.strip.caraMasakPenjelasan}</p>

      <p className="mt-2 text-sm text-ink-soft">
        {locale === 'en'
          ? 'Weights in terracotta are estimates or your edits, not measurements.'
          : 'Berat berwarna terakota adalah perkiraan atau hasil suntingan Anda, bukan hasil timbangan.'}{' '}
        <span className="font-mono">
          {formatGram(trace.massa.mentahG, locale)} g{' '}
          {locale === 'en' ? 'raw in total' : 'total mentah'}
        </span>
      </p>
    </section>
  )
}
