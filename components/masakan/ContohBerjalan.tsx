'use client'

/**
 * The worked example on the landing page.
 *
 * PRD §2 explains this product with one illustration: "Change the santan from
 * 50 g to 100 g and watch everything move." The site asserted that in a bullet
 * and never performed it, so a newcomer had to pick a dish, scroll to the strip
 * and discover the point on their own. This performs it — real dish, real
 * ingredient, real per-100 g value from FDC, every intermediate value shown.
 *
 * The eleven outcomes arrive precomputed. The slider has a fixed step over one
 * ingredient, so the whole panel has eleven possible states; running `compute`
 * here to find them dragged the ingredient table, the retention table, the AKG
 * table and all forty recipes into the landing page's client bundle. Same
 * numbers, same `compute`, same interactivity — the arithmetic just happens
 * during the export instead of on the reader's phone.
 */
import Link from 'next/link'
import { useState } from 'react'
import { CONTOH, type DataContoh } from '@/lib/contoh'
import { copyFor, type Locale } from '@/lib/i18n'

export function ContohBerjalan({ locale, data }: { locale: Locale; data: DataContoh }) {
  const copy = copyFor(locale)
  const [beratG, setBeratG] = useState(data.awalG)

  const langkah = data.langkah.find((entry) => entry.beratG === beratG) ?? data.langkah[0]
  if (!langkah) return null

  return (
    <section className="mt-block rounded-plate border border-rim/40 bg-enamel-deep px-5 py-5">
      <h2 className="font-display text-lg text-rim">{copy.contoh.judul}</h2>
      <p className="mt-2 max-w-prose text-base text-ink-soft">{copy.contoh.lede}</p>

      <label className="mt-4 block max-w-md">
        <span className="flex items-baseline justify-between text-sm">
          <span lang="id">{copy.contoh.geser}</span>
          <span className="font-mono text-edited">{langkah.beratLabel} g</span>
        </span>
        <input
          type="range"
          min={CONTOH.minG}
          max={CONTOH.maxG}
          step={CONTOH.stepG}
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
            {langkah.beratLabel} g ÷ 100 = {langkah.bagi100}
          </span>
        </li>
        <li>
          <span className="text-ink-soft">{copy.contoh.langkah2}</span>
          <span className="mt-0.5 block font-mono">
            {langkah.bagi100} × {langkah.per100} {data.unit} = {langkah.sumbangan} {data.unit}
          </span>
        </li>
        <li>
          <span className="text-ink-soft">{copy.contoh.langkah3}</span>
          <span className="mt-0.5 block font-mono text-edited">
            {langkah.sumbangan} {data.unit}
          </span>
        </li>
      </ol>

      <p className="mt-4 border-t border-rim/20 pt-3 text-sm">
        <span className="text-ink-soft">{copy.contoh.totalLabel}</span>
        <span className="mt-0.5 block font-mono text-base">
          {langkah.total} {data.unit}
        </span>
      </p>

      {/* Where this example estimates or approximates, said here rather than
          left for the reader to find on the dish page. */}
      <p className="mt-3 max-w-prose text-sm text-chip">{copy.contoh.jujur}</p>

      {/* The slider position travels, because the plate reads the same query
          string this link writes. */}
      <p className="mt-3 text-sm">
        <Link
          href={`/${locale}/masakan/${CONTOH.dish}/?b=${CONTOH.bahan}:${beratG}`}
          className="text-rim underline underline-offset-4"
        >
          {copy.contoh.buka}
        </Link>
      </p>
    </section>
  )
}
