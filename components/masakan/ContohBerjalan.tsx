'use client'

/**
 * The worked example on the landing page.
 *
 * PRD §2 explains the product with one illustration: "Change the santan from
 * 50 g to 100 g and watch everything move." The site asserted that in a bullet
 * and never performed it, so a newcomer had to pick a dish, scroll to the
 * strip and discover the point on their own.
 *
 * This performs it. Real dish, real ingredient, real per-100 g value from FDC,
 * and every intermediate value on screen — weight, weight ÷ 100, the per-100 g
 * figure, the product, and the dish total it lands in. Nothing is narrated
 * that is not also shown.
 *
 * Invariant 17 holds: no arithmetic here. `compute` does the work, exactly as
 * the plate does, and this renders the trace it returns.
 */
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { compute } from '@/lib/nutrition/compute'
import { findUnmatched, loadFdcTable } from '@/lib/sources/fdc/load'
import { findRecipe } from '@/lib/resep'
import { copyFor, type Locale } from '@/lib/i18n'
import { formatFactor, formatGram, formatNutrient, unitLabel } from '@/lib/format'

const table = loadFdcTable()
const unmatched = { get: findUnmatched }

const DISH = 'nasi-uduk'
const BAHAN = 'santan-encer'
const ENERGI = '208'
const MIN_G = 0
const MAX_G = 500
/* 50 g steps so weight ÷ 100 always lands on a whole or half number. At two
   decimals every product on screen is then exact, and a reader who multiplies
   it through gets the same answer — which is the entire point of the panel. */
const STEP_G = 50

export function ContohBerjalan({ locale }: { locale: Locale }) {
  const copy = copyFor(locale)
  const recipe = findRecipe(DISH)
  const authored = recipe?.bahan.find((bahan) => bahan.ingredientId === BAHAN)?.beratG ?? 250
  const [beratG, setBeratG] = useState(authored)

  const trace = useMemo(
    () =>
      recipe
        ? compute({ recipe, table, unmatched, beratOverrideG: { [BAHAN]: beratG } })
        : undefined,
    [recipe, beratG],
  )

  if (!recipe || !trace) return null

  const total = trace.totals.find((entry) => entry.nutrientId === ENERGI)
  const santan = total?.contributions.find((c) => c.ingredientId === BAHAN)
  if (!total || !santan) return null

  const num = (value: number) => formatNutrient(value, ENERGI, locale)
  const kcal = unitLabel(ENERGI)

  return (
    <section className="mt-block rounded-plate border border-rim/40 bg-enamel-deep px-5 py-5">
      <h2 className="font-display text-lg text-rim">{copy.contoh.judul}</h2>
      <p className="mt-2 max-w-prose text-base text-ink-soft">{copy.contoh.lede}</p>

      <label className="mt-4 block max-w-md">
        <span className="flex items-baseline justify-between text-sm">
          <span lang="id">{copy.contoh.geser}</span>
          <span className="font-mono text-edited">{formatGram(beratG, locale)} g</span>
        </span>
        <input
          type="range"
          min={MIN_G}
          max={MAX_G}
          step={STEP_G}
          value={beratG}
          onChange={(event) => setBeratG(Number(event.target.value))}
          className="mt-1 w-full accent-rim"
        />
      </label>

      {/* Every intermediate value, not just the input and the answer. */}
      <ol className="mt-4 space-y-2 text-sm">
        <li>
          <span className="text-ink-soft">{copy.contoh.langkah1}</span>
          <span className="mt-0.5 block font-mono">
            {formatGram(beratG, locale)} g ÷ 100 = {formatFactor(beratG / 100, locale)}
          </span>
        </li>
        <li>
          <span className="text-ink-soft">{copy.contoh.langkah2}</span>
          <span className="mt-0.5 block font-mono">
            {formatFactor(beratG / 100, locale)} × {num(santan.per100)} {kcal} ={' '}
            {num(santan.total)} {kcal}
          </span>
        </li>
        <li>
          <span className="text-ink-soft">{copy.contoh.langkah3}</span>
          <span className="mt-0.5 block font-mono text-edited">
            {num(santan.total)} {kcal}
          </span>
        </li>
      </ol>

      <p className="mt-4 border-t border-rim/20 pt-3 text-sm">
        <span className="text-ink-soft">{copy.contoh.totalLabel}</span>
        <span className="mt-0.5 block font-mono text-base">
          {num(total.total)} {kcal}
        </span>
      </p>

      {/* Where this example estimates or approximates, said here rather than
          left for the reader to find on the dish page. */}
      <p className="mt-3 max-w-prose text-sm text-chip">{copy.contoh.jujur}</p>

      {/* The slider position travels, because the plate reads the same query
          string this link writes. */}
      <p className="mt-3 text-sm">
        <Link
          href={`/${locale}/masakan/${DISH}/?b=${BAHAN}:${beratG}`}
          className="text-rim underline underline-offset-4"
        >
          {copy.contoh.buka}
        </Link>
      </p>
    </section>
  )
}
