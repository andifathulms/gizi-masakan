'use client'

/**
 * The dish list with its search box and category chips.
 *
 * Invariant 17 holds: this computes no nutrition. Every card arrives already
 * rendered to numbers and ring segments by the server component, which ran
 * `compute` and `komposisi` at build time. All this does is decide which cards
 * to show and mirror the query and the category into the URL, so a filtered
 * list is linkable and survives a refresh (invariant 18).
 *
 * Matching lives in lib/resep/cari and lib/resep/kategori — pure, and tested
 * against the real recipe set.
 */
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { cari, type CariEntry } from '@/lib/resep/cari'
import { hitungKategori, parseKategori, saringKategori, urutanKategori } from '@/lib/resep/kategori'
import { copyFor, type Locale } from '@/lib/i18n'
import { CincinKomposisi, type SegmenCincin } from '@/components/masakan/CincinKomposisi'
import { TandaChip } from '@/components/chrome/TandaChip'

export interface KartuMasakan extends CariEntry {
  /** Pre-rendered so the component does no nutrition work. */
  readonly nutrients: readonly {
    readonly id: string
    readonly label: string
    readonly value: string
    readonly unit: string
  }[]
  readonly gapCount: number
  /** Ring slices, by raw weight — lib/resep/komposisi. */
  readonly segmen: readonly SegmenCincin[]
  /** The heaviest ingredients, as text: what the ring shows, said in words. */
  readonly palingBerat: readonly {
    readonly namaId: string
    readonly berat: string
    readonly perkiraan: boolean
  }[]
}

const PARAM_CARI = 'cari'
const PARAM_KATEGORI = 'kategori'

export function DaftarMasakan({
  kartu,
  locale,
}: {
  kartu: readonly KartuMasakan[]
  locale: Locale
}) {
  const copy = copyFor(locale)
  const [query, setQuery] = useState('')
  const [kategori, setKategori] = useState<string | null>(null)
  const adopted = useRef(false)
  const daftarKategori = urutanKategori(kartu)
  const jumlahKategori = hitungKategori(kartu)

  // Adopt an incoming ?cari= and ?kategori= after hydration. The list is
  // prerendered whole, so reading the URL during render would mismatch — and
  // the unfiltered list is the right thing to have in the static HTML anyway.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setQuery(params.get(PARAM_CARI) ?? '')
    setKategori(parseKategori(params.get(PARAM_KATEGORI), daftarKategori))
    adopted.current = true
    // Adopted once per mount; the category list is fixed for the export.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!adopted.current) return
    const params = new URLSearchParams()
    const trimmed = query.trim()
    if (trimmed) params.set(PARAM_CARI, trimmed)
    if (kategori) params.set(PARAM_KATEGORI, kategori)
    const search = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}`)
  }, [query, kategori])

  const hasil = cari(saringKategori(kartu, kategori), query)
  const total = kategori ? (jumlahKategori.get(kategori) ?? 0) : kartu.length

  // Category order is the authored one; search filters within it and never
  // reorders, so a dish does not move up the page for invisible reasons.
  const byKategori = new Map<string, KartuMasakan[]>()
  for (const entry of hasil) {
    const existing = byKategori.get(entry.kategori)
    if (existing) existing.push(entry)
    else byKategori.set(entry.kategori, [entry])
  }

  return (
    <div>
      {/* The whole box carries the focus ring, so it is one 2px outline in rim
          like every other control, around the thing that looks like the
          control — the bare input inside drops its own. */}
      <label className="flex max-w-xl items-center gap-3 rounded-plate border-2 border-rim-soft bg-piring px-4 py-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-rim">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          aria-hidden="true"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ stroke: 'rgb(var(--rim-soft))' }}
          className="shrink-0"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <span className="sr-only">{copy.cari.label}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.cari.placeholder}
          className="w-full bg-transparent text-md placeholder:text-ink-soft focus:outline-none"
        />
      </label>

      {/* Toggle buttons rather than links: they filter this list in place, and
          aria-pressed says which one is on. The count is the number of dishes
          in that category, not of matches, so it does not jump as you type. */}
      <div role="group" aria-label={copy.cari.kategoriLabel} className="mt-4 flex flex-wrap gap-2">
        {[null, ...daftarKategori].map((k) => {
          const aktif = kategori === k
          return (
            <button
              key={k ?? 'semua'}
              type="button"
              aria-pressed={aktif}
              onClick={() => setKategori(k)}
              className={`card-hover inline-flex items-baseline gap-1.5 rounded-full border px-3.5 py-1.5 text-sm ${
                aktif
                  ? 'border-rim bg-rim text-enamel'
                  : 'border-rim/30 bg-piring text-ink hover:border-rim hover:bg-rim-tint'
              }`}
            >
              <span lang="id" className="capitalize">
                {k ?? copy.cari.semuaKategori}
              </span>
              <span className={`font-mono text-xs ${aktif ? '' : 'text-ink-soft'}`}>
                {k ? jumlahKategori.get(k) : kartu.length}
              </span>
            </button>
          )
        })}
      </div>

      <p aria-live="polite" className="mt-3 text-sm text-ink-soft">
        {query.trim() ? copy.cari.hasil(hasil.length, total) : copy.cari.semua(total)}
      </p>

      {hasil.length === 0 && (
        /* Named, not silent. An empty result says what was searched for and
           what the catalogue actually holds, rather than showing a blank. */
        <p className="mt-block max-w-prose text-base text-ink-soft">
          {copy.cari.kosong(query.trim())}
        </p>
      )}

      {[...byKategori.entries()].map(([namaKategori, entries]) => (
        <section key={namaKategori} className="mt-block">
          <h3 lang="id" className="font-display text-lg capitalize text-rim">
            {namaKategori}
          </h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <li key={entry.id}>
                {/* Column layout so the numbers line up across a row of cards:
                    the description takes the slack, and everything below the
                    rule is pinned to the bottom of whichever card is tallest.
                    The gap line is always rendered, empty when there is
                    nothing to say, so its presence does not shift the row of
                    numbers up or down by a line. */}
                <Link
                  href={`/${locale}/masakan/${entry.id}/`}
                  className="list-card card-hover flex h-full flex-col gap-3 p-4 hover:border-rim"
                >
                  <span className="flex items-center gap-4">
                    <CincinKomposisi segmen={entry.segmen} id={entry.id} />
                    <span className="min-w-0">
                      <span lang="id" className="block font-display text-lg font-medium leading-tight text-rim">
                        {entry.namaId}
                      </span>
                      <span lang="id" className="block text-xs capitalize text-ink-soft">
                        {entry.kategori}
                      </span>
                    </span>
                  </span>
                  <span className="line-clamp-2 flex-1 text-sm text-ink-soft">{entry.deskripsiId}</span>
                  {/* What the ring shows, in words. Weights are estimates until
                      weighed, and look like it. */}
                  <span className="text-xs text-ink-soft">
                    {copy.cari.palingBerat}:{' '}
                    {entry.palingBerat.map((bahan, index) => (
                      <span key={bahan.namaId}>
                        {index > 0 && ' · '}
                        <span lang="id">{bahan.namaId}</span>{' '}
                        <span className={`font-mono ${bahan.perkiraan ? 'tanda-perkiraan' : ''}`}>
                          {bahan.berat} g
                        </span>
                      </span>
                    ))}
                  </span>
                  {/* Three nutrients at identical weight, not energy alone —
                      invariant 13. Values arrive pre-rendered. */}
                  <span className="grid grid-cols-3 gap-2 border-t border-rim/15 pt-3 text-sm">
                    {entry.nutrients.map((nutrient) => (
                      <span key={nutrient.id} className="block">
                        <span className="block text-xs text-ink-soft">{nutrient.label}</span>
                        <span className="font-mono text-md font-medium">{nutrient.value}</span>{' '}
                        <span className="text-xs text-ink-soft">{nutrient.unit}</span>
                      </span>
                    ))}
                  </span>
                  <span className="flex min-h-[1.5em] flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                    <span className="text-ink-soft">{copy.plate.perPorsi.toLowerCase()}</span>
                    {/* Phrased as something the dish does, not as a defect
                        count: naming a gap is the product, not a failure. */}
                    {entry.gapCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-chip">
                        <TandaChip />
                        {copy.cari.menyebut(entry.gapCount)}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
