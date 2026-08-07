'use client'

/**
 * The plate, the recipe strip, the gaps, the adequacy and the trace — the whole
 * dish view, and the one place edited weights live.
 *
 * Invariant 17: nothing is computed here. State is the edited gram weights;
 * everything shown comes from `compute`, which is pure and lives in
 * lib/nutrition. This component's job is to hold the edits and render a trace.
 */
import Link from 'next/link'
import { useMemo } from 'react'
import { compute } from '@/lib/nutrition/compute'
import { findUnmatched, loadFdcTable } from '@/lib/sources/fdc/load'
import { HEADLINE_NUTRIENT_IDS, NUTRIENTS } from '@/lib/nutrition/nutrients'
import { perPorsi, type Recipe } from '@/lib/nutrition/trace'
import { copyFor, type Locale } from '@/lib/i18n'
import { formatGram, formatNutrient, nutrientLabel, unitLabel } from '@/lib/format'
import { usePlateState } from '@/lib/url/use-plate-state'
import { StripResep } from '@/components/strip/StripResep'
import { PanelKekosongan } from '@/components/plate/PanelKekosongan'
import { Kecukupan } from '@/components/adequacy/Kecukupan'
import { JejakNutrien } from '@/components/trace/JejakNutrien'

const table = loadFdcTable()
const unmatched = { get: findUnmatched }

export function Piring({ recipe, locale }: { recipe: Recipe; locale: Locale }) {
  const copy = copyFor(locale)
  /* One piece of state for the whole plate, mirrored in the query string so a
     view survives a refresh and can be sent to someone else. */
  const [view, setView] = usePlateState(recipe.bahan.map((bahan) => bahan.ingredientId))
  const { nutrientId, perPorsiView, kelompokId, beratOverrideG } = view

  const trace = useMemo(
    () => compute({ recipe, table, unmatched, beratOverrideG }),
    [recipe, beratOverrideG],
  )

  const edited = Object.keys(beratOverrideG).length > 0
  const scale = perPorsiView ? 1 / trace.porsi : 1

  return (
    <div className="flex flex-col gap-block">
      <section className="plate-card px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-display text-2xl text-rim">{trace.namaId}</h1>
          <span className="text-sm text-chip">
            {recipe.porsi} {copy.plate.porsi}
          </span>
        </div>
        <p className="mt-2 max-w-prose text-base text-ink-soft">
          {recipe.deskripsiId}
        </p>
        <p className="mt-3 max-w-prose text-base text-edited">
          {copy.plate.estimasi}
        </p>

        <div className="mt-5 flex gap-1 text-sm" role="group">
          <button
            type="button"
            onClick={() => setView({ perPorsiView: true })}
            aria-pressed={perPorsiView}
            className={`rounded-l border border-rim/40 px-3 py-1 ${perPorsiView ? 'bg-rim text-enamel' : 'text-rim'}`}
          >
            {copy.plate.perPorsi}
          </button>
          <button
            type="button"
            onClick={() => setView({ perPorsiView: false })}
            aria-pressed={!perPorsiView}
            className={`rounded-r border border-rim/40 px-3 py-1 ${!perPorsiView ? 'bg-rim text-enamel' : 'text-rim'}`}
          >
            {copy.plate.seluruhResep}
          </button>
        </div>

        {/* Headline nutrients. Energy is first in reading order and is styled
            exactly like the others — invariant 13 forbids making it dominant. */}
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          {HEADLINE_NUTRIENT_IDS.map((id) => {
            const total = trace.totals.find((entry) => entry.nutrientId === id)!
            return (
              <div key={id}>
                <dt className="text-sm text-chip">{nutrientLabel(id, locale)}</dt>
                <dd className="font-mono text-lg">
                  <span className={edited ? 'text-edited' : undefined}>
                    {formatNutrient(total.total * scale, id, locale)}
                  </span>{' '}
                  <span className="text-sm text-chip">{unitLabel(id)}</span>
                  {/* A real dagger, not the combining asterisk this used to
                      carry: U+20F0 has no base character here, so it rendered
                      inconsistently or not at all. Its meaning was in a title
                      attribute, which never appears on a touch screen — which
                      meant an incomplete total looked complete on a phone.
                      Invariant 2 requires the gap to be visible. */}
                  {!total.lengkap && (
                    <span className="ml-1 align-middle text-sm text-chip">
                      †<span className="sr-only"> {copy.gaps.ringkasTidakLengkap}</span>
                    </span>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>

        {/* The legend is visible text, shown only when a dagger is actually on
            screen. The marker has to explain itself without a hover. */}
        {trace.totals.some((total) => !total.lengkap) && (
          <p className="mt-3 max-w-prose text-sm text-chip">{copy.gaps.tandaBelumLengkap}</p>
        )}

        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-rim/20 pt-4 text-sm">
          <div className="flex gap-2">
            <dt className="text-chip">{copy.plate.beratMentah}</dt>
            <dd className="font-mono">{formatGram(trace.massa.mentahG, locale)} g</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-chip">{copy.plate.beratMatang}</dt>
            <dd className="font-mono">
              {trace.massa.matangG === undefined ? (
                <span className="text-chip">{copy.plate.tidakDiketahui}</span>
              ) : (
                `${formatGram(trace.massa.matangG, locale)} g`
              )}
            </dd>
          </div>
        </dl>
      </section>

      <StripResep
        trace={trace}
        recipe={recipe}
        locale={locale}
        nutrientId={nutrientId}
        onNutrientChange={(next) => setView({ nutrientId: next })}
        beratOverrideG={beratOverrideG}
        onBeratChange={(ingredientId, beratG) =>
          setView({ beratOverrideG: { ...beratOverrideG, [ingredientId]: beratG } })
        }
        onReset={() => setView({ beratOverrideG: {} })}
      />

      <PanelKekosongan trace={trace} locale={locale} />

      <Kecukupan
        trace={trace}
        locale={locale}
        kelompokId={kelompokId}
        onKelompokChange={(next) => setView({ kelompokId: next })}
      />

      {/* Below this rule is the working, not the answer: the derivation of the
          selected nutrient and where the recipe came from. The trace is
          deliberately on the page rather than behind a tap (PRD §6.4), but
          flattening it against the plate made the page read as one
          undifferentiated column. */}
      <hr className="mt-section border-t border-rim/25" />

      <JejakNutrien trace={trace} locale={locale} nutrientId={nutrientId} />

      <section className="text-sm text-ink-soft">
        <h2 className="font-display text-lg text-rim">
          {locale === 'en' ? 'Where this recipe comes from' : 'Asal resep ini'}
        </h2>
        <p className="mt-2 max-w-prose">
          {trace.sumber.type === 'own-composition'
            ? trace.sumber.catatan
            : `${trace.sumber.sumber}`}
        </p>
        <p className="mt-2 max-w-prose">
          {locale === 'en'
            ? `Ingredient values from ${trace.ingredientRelease}.`
            : `Nilai bahan dari ${trace.ingredientRelease}.`}
        </p>
        {/* PRD §6.7: the method disclosure is "linked from the plate, not
            buried". It was reachable only from the nav. */}
        <p className="mt-3 max-w-prose">
          <Link href={`/${locale}/metode/`} className="text-rim underline underline-offset-4">
            {locale === 'en'
              ? 'How these numbers are made, and what is missing from them →'
              : 'Bagaimana angka ini dibuat, dan apa yang belum ada di dalamnya →'}
          </Link>
        </p>
      </section>
    </div>
  )
}

export const ALL_NUTRIENT_IDS = NUTRIENTS.map((nutrient) => nutrient.id)
export { perPorsi }
