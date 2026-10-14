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
import { useEffect, useMemo, useRef, useState } from 'react'
import { compute } from '@/lib/nutrition/compute'
import { findUnmatched, loadFdcTable } from '@/lib/sources/fdc/load'
import { HEADLINE_NUTRIENT_IDS, NUTRIENTS } from '@/lib/nutrition/nutrients'
import { perPorsi, type Recipe } from '@/lib/nutrition/trace'
import { copyFor, type Locale } from '@/lib/i18n'
import { formatDelta, formatGram, formatNutrient, nutrientLabel, unitLabel } from '@/lib/format'
import { usePlateState } from '@/lib/url/use-plate-state'
import { StripResep } from '@/components/strip/StripResep'
import { PanelKekosongan } from '@/components/plate/PanelKekosongan'
import { Kecukupan } from '@/components/adequacy/Kecukupan'
import { JejakNutrien } from '@/components/trace/JejakNutrien'
import { ResepTersimpan } from '@/components/simpan/ResepTersimpan'
import { TandaChip } from '@/components/chrome/TandaChip'

const table = loadFdcTable()
const unmatched = { get: findUnmatched }

export function Piring({ recipe, locale }: { recipe: Recipe; locale: Locale }) {
  const copy = copyFor(locale)
  /* One piece of state for the whole plate, mirrored in the query string so a
     view survives a refresh and can be sent to someone else. */
  const [view, setView] = usePlateState(recipe.bahan.map((bahan) => bahan.ingredientId))
  const { nutrientId, perPorsiView, kelompokId, beratOverrideG, pengolahanOverride } = view

  const trace = useMemo(
    () => compute({ recipe, table, unmatched, beratOverrideG, pengolahanOverride }),
    [recipe, beratOverrideG, pengolahanOverride],
  )

  /* The authored recipe's own trace, so an edited plate can show what it
     departed from. Memoised on the recipe alone — it never changes as the
     reader edits, and computing it costs about a tenth of a millisecond. */
  const dasar = useMemo(() => compute({ recipe, table, unmatched }), [recipe])

  /* Whether the plate is on screen, for the phone's pinned summary below.
     Layout state, not a reader's choice, so it does not belong in the URL. */
  const piringRef = useRef<HTMLElement>(null)
  const [piringTerlihat, setPiringTerlihat] = useState(true)
  useEffect(() => {
    const node = piringRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setPiringTerlihat(entry.isIntersecting)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const edited =
    Object.keys(beratOverrideG).length > 0 || Object.keys(pengolahanOverride).length > 0
  const scale = perPorsiView ? 1 / trace.porsi : 1

  /* Editing a weight, switching nutrient, or switching per-portion rewrites
     every total, bar and adequacy fill at once. A sighted reader sees that
     happen; without this it is silent. WCAG 4.1.3 Status Messages.
     One region, reporting the selected nutrient — announcing all eight totals
     on every keystroke would be noise, not information. */
  const asliFor = (id: string) =>
    dasar.totals.find((entry) => entry.nutrientId === id)?.total ?? 0

  const selected = trace.totals.find((entry) => entry.nutrientId === nutrientId)!
  const pengumuman = copy.diperbarui(
    nutrientLabel(nutrientId, locale),
    `${formatNutrient(selected.total * scale, nutrientId, locale)} ${unitLabel(nutrientId)}`,
    perPorsiView ? copy.plate.perPorsi.toLowerCase() : copy.plate.seluruhResep.toLowerCase(),
  )

  /* Said once when every total on the plate is incomplete, which is the usual
     case — the same dagger on eight tiles was eight copies of one fact. A
     marker per tile returns as soon as some totals are complete and others are
     not, because then the marker distinguishes something. */
  const headlineTotals = HEADLINE_NUTRIENT_IDS.map(
    (id) => trace.totals.find((entry) => entry.nutrientId === id)!,
  )
  const semuaBelumLengkap = headlineTotals.every((total) => !total.lengkap)
  const adaBelumLengkap = headlineTotals.some((total) => !total.lengkap)

  const selectedAsli = asliFor(nutrientId)

  return (
    <div className="flex flex-col gap-section pb-24 lg:pb-0">
      {/* Present from first render, because a live region created at the same
          moment as its content is not announced. Its initial content is
          therefore silent, and every later change speaks. */}
      <p aria-live="polite" className="sr-only">
        {pengumuman}
      </p>

      {/* The answer beside the question. On a wide screen the plate stays in
          view while the reader edits the recipe beside it, so editing a weight
          and watching every total move — the one orchestrated moment, PRD §9 —
          happens on screen rather than a scroll above it. */}
      {/* minmax(0, 1fr), not the implicit auto column: an auto column sizes to
          its widest content, which pushed a phone's page wider than its
          screen. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-block lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:items-start">
        {/* The sticky, scrollable wrapper is separate from the plate so the
            chip notch on the rim is not clipped by the scroll container. */}
        <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pt-1">
          <section
            id="piring"
            ref={piringRef}
            data-belum-lengkap={trace.lengkap ? undefined : ''}
            className="plate-card scroll-mt-4 px-5 py-5 sm:px-6"
          >
            <p lang="id" className="text-xs capitalize text-ink-soft">
              <Link href={`/${locale}/masakan/`} className="hover:text-rim hover:underline">
                {copy.nav.masakan}
              </Link>{' '}
              › {recipe.kategori}
            </p>
            <h1 lang="id" className="mt-1 font-display text-2xl text-rim">
              {trace.namaId}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {recipe.porsi} {copy.plate.porsi}
            </p>
            <p className="mt-3 text-base text-ink-soft">{recipe.deskripsiId}</p>
            <p className="mt-3 text-sm text-edited">{copy.plate.estimasi}</p>

            {/* A fieldset with a legend, not a div with role="group": these are
                two mutually exclusive options, which is what radios are, and the
                legend gives the group the accessible name the bare role never
                had. The radios are visually the same segmented control. */}
            <fieldset className="mt-4">
              <legend className="sr-only">{copy.plate.dasarPerhitungan}</legend>
              <div className="inline-flex gap-1 rounded-lg border border-rim/30 p-1 text-sm">
                {[true, false].map((perPorsi) => (
                  <label
                    key={String(perPorsi)}
                    className={`pilihan cursor-pointer rounded-md px-3 py-1.5 ${
                      perPorsiView === perPorsi
                        ? 'bg-rim font-medium text-enamel'
                        : 'text-rim hover:bg-rim-tint'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dasar-perhitungan"
                      className="sr-only"
                      checked={perPorsiView === perPorsi}
                      onChange={() => setView({ perPorsiView: perPorsi })}
                    />
                    {perPorsi ? copy.plate.perPorsi : copy.plate.seluruhResep}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Headline nutrients, which are also the selector for the recipe
                bars: tap Protein and the strip re-ranks by protein. Radios, like
                the switch above, because exactly one is selected. Energy is
                first in reading order and is styled exactly like the others —
                invariant 13 forbids making it dominant. */}
            <fieldset className="mt-4">
              <legend className="text-sm text-ink-soft">{copy.plate.pilihNutrien}</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                {headlineTotals.map((total) => {
                  const id = total.nutrientId
                  const dipilih = nutrientId === id
                  return (
                    <label
                      key={id}
                      className={`pilihan card-hover block cursor-pointer rounded-lg border px-3 py-2 ${
                        dipilih
                          ? 'border-rim bg-rim-tint shadow-[inset_0_0_0_1px_rgb(var(--rim))]'
                          : 'border-rim/20 bg-piring hover:border-rim/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="nutrien-piring"
                        className="sr-only"
                        checked={dipilih}
                        onChange={() => setView({ nutrientId: id })}
                      />
                      <span className="block text-sm text-ink-soft">{nutrientLabel(id, locale)}</span>
                      <span className="block font-mono text-lg font-medium">
                        <span className={edited ? 'tanda-diubah' : undefined}>
                          {formatNutrient(total.total * scale, id, locale)}
                        </span>{' '}
                        <span className="text-sm font-normal text-ink-soft">{unitLabel(id)}</span>
                        {/* The chip mark, visible, with its meaning in text —
                            never a title attribute, which a touch screen never
                            shows. When every total is incomplete the legend
                            below says so once, and the per-tile text stays for
                            a screen reader. Invariant 2. */}
                        {!total.lengkap && (
                          <span className="ml-1 text-sm font-normal">
                            {!semuaBelumLengkap && <TandaChip />}
                            <span className="sr-only"> {copy.gaps.ringkasTidakLengkap}</span>
                          </span>
                        )}
                      </span>
                      {/* PRD §2 turns on watching the number move. Once the
                          reader stops moving it, the movement was gone: they saw
                          where they landed and not how far. */}
                      {edited && (
                        <span className="mt-0.5 block text-xs text-ink-soft">
                          {copy.plate.resepAsli}{' '}
                          <span className="font-mono">
                            {formatNutrient(asliFor(id) * scale, id, locale)}
                          </span>{' '}
                          ·{' '}
                          <span className="font-mono">
                            {formatDelta((total.total - asliFor(id)) * scale, id, locale)}
                          </span>
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {/* The legend is visible text, shown whenever an incomplete total is
                on screen. The marker has to explain itself without a hover. */}
            {adaBelumLengkap && (
              <p className="mt-3 flex gap-2 text-sm text-chip">
                <TandaChip className="mt-1" />
                <span>
                  {semuaBelumLengkap ? copy.gaps.semuaBelumLengkap : copy.gaps.tandaBelumLengkap}
                </span>
              </p>
            )}

            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-rim/20 pt-3 text-sm">
              <div className="flex gap-2">
                <dt className="text-ink-soft">{copy.plate.beratMentah}</dt>
                <dd className="font-mono">{formatGram(trace.massa.mentahG, locale)} g</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink-soft">{copy.plate.beratMatang}</dt>
                <dd className="font-mono">
                  {trace.massa.matangG === undefined ? (
                    <span className="text-chip">{copy.plate.tidakDiketahui}</span>
                  ) : (
                    `${formatGram(trace.massa.matangG, locale)} g`
                  )}
                </dd>
              </div>
            </dl>
            {/* States which of the two weights above the nutrition belongs to.
                Rice nearly triples in the pan; without this the pair reads as if
                the calories tripled with it. */}
            <p className="mt-2 text-xs text-ink-soft">{copy.plate.dasarBerat}</p>

            <nav aria-label={copy.lompat.label} className="mt-4 border-t border-rim/20 pt-3">
              <ul className="flex flex-wrap gap-2 text-xs">
                {(
                  [
                    ['resep', copy.lompat.resep],
                    ['kekosongan', copy.lompat.kekosongan],
                    ['kecukupan', copy.lompat.kecukupan],
                    ['jejak', copy.lompat.jejak],
                  ] as const
                ).map(([anchor, label]) => (
                  <li key={anchor}>
                    <a
                      href={`#${anchor}`}
                      className="block rounded-full border border-rim/25 px-3 py-1 text-rim hover:border-rim hover:bg-rim-tint"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-section">
          <div id="resep" className="scroll-mt-4">
            <StripResep
              trace={trace}
              asli={dasar}
              recipe={recipe}
              locale={locale}
              nutrientId={nutrientId}
              onNutrientChange={(next) => setView({ nutrientId: next })}
              beratOverrideG={beratOverrideG}
              onBeratChange={(ingredientId, beratG) =>
                setView({
                  beratOverrideG: { ...beratOverrideG, [ingredientId]: beratG },
                })
              }
              pengolahanOverride={pengolahanOverride}
              onPengolahanChange={(ingredientId, retentionCode) =>
                setView({
                  pengolahanOverride: { ...pengolahanOverride, [ingredientId]: retentionCode },
                })
              }
              onReset={() => setView({ beratOverrideG: {}, pengolahanOverride: {} })}
            />
          </div>

          <ResepTersimpan
            dishId={recipe.id}
            locale={locale}
            beratOverrideG={beratOverrideG}
            onMuat={(saved) => setView({ beratOverrideG: { ...saved } })}
          />
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-section">
        <div id="kekosongan" className="scroll-mt-4">
          <PanelKekosongan trace={trace} locale={locale} />
        </div>
        <div id="kecukupan" className="scroll-mt-4">
          <Kecukupan
            trace={trace}
            locale={locale}
            kelompokId={kelompokId}
            onKelompokChange={(next) => setView({ kelompokId: next })}
          />
        </div>
      </div>

      {/* Below this rule is the working, not the answer: the derivation of the
          selected nutrient and where the recipe came from. The trace is
          deliberately on the page rather than behind a tap (PRD §6.4), but
          flattening it against the plate made the page read as one
          undifferentiated column. */}
      <hr className="border-t border-rim/25" />

      <div id="jejak" className="scroll-mt-4">
        <JejakNutrien trace={trace} locale={locale} nutrientId={nutrientId} />
      </div>

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

      {/* On a phone the plate scrolls away as soon as the reader reaches the
          recipe, which is where they edit. This keeps the selected total and
          how far it has moved in view, above the thumb, and links back to the
          full plate. Shown only while the plate itself is off screen, so the
          same number is never on screen twice. Not on wide screens, where the
          plate is sticky. */}
      <a
        href="#piring"
        hidden={piringTerlihat}
        className="fixed inset-x-0 bottom-[var(--tab-bar-h)] z-30 px-3 pb-2 lg:hidden"
      >
        <span className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-plate bg-rim px-4 py-2.5 text-enamel shadow-lg">
          <span className="min-w-0">
            <span className="block text-xs">
              {nutrientLabel(nutrientId, locale)} ·{' '}
              {perPorsiView ? copy.plate.perPorsi.toLowerCase() : copy.plate.seluruhResep.toLowerCase()}
            </span>
            <span className="block font-mono text-lg font-medium">
              {formatNutrient(selected.total * scale, nutrientId, locale)}{' '}
              <span className="text-sm font-normal">{unitLabel(nutrientId)}</span>
              {/* Words, not the chip glyph: its chip-grey ring would not read
                  on the rim fill. */}
              {!selected.lengkap && (
                <span className="ml-2 text-xs font-normal">{copy.gaps.belumLengkap}</span>
              )}
            </span>
          </span>
          <span className="shrink-0 text-right text-xs">
            {edited ? (
              <>
                <span className="block">
                  {copy.plate.resepAsli}{' '}
                  <span className="font-mono">
                    {formatNutrient(selectedAsli * scale, nutrientId, locale)}
                  </span>
                </span>
                <span className="block font-mono text-sm font-medium">
                  {formatDelta((selected.total - selectedAsli) * scale, nutrientId, locale)}
                </span>
              </>
            ) : (
              <span className="underline underline-offset-4">{copy.plate.lihatRingkasan}</span>
            )}
          </span>
        </span>
      </a>
    </div>
  )
}

export const ALL_NUTRIENT_IDS = NUTRIENTS.map((nutrient) => nutrient.id)
export { perPorsi }
