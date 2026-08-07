"use client";

/**
 * The dish list with its search box.
 *
 * Invariant 17 holds: this computes no nutrition. Every card arrives already
 * rendered to numbers by the server component, which ran `compute` at build
 * time. All this does is decide which cards to show and mirror the query into
 * the URL, so a search is linkable and survives a refresh.
 *
 * Matching itself lives in lib/resep/cari — pure, and tested against the real
 * recipe set.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cari, type CariEntry } from "@/lib/resep/cari";
import { copyFor, type Locale } from "@/lib/i18n";

export interface KartuMasakan extends CariEntry {
  /** Pre-rendered so the component does no nutrition work. */
  readonly nutrients: readonly {
    readonly id: string;
    readonly label: string;
    readonly value: string;
    readonly unit: string;
  }[];
  readonly gapCount: number;
}

const PARAM = "cari";

export function DaftarMasakan({
  kartu,
  locale,
}: {
  kartu: readonly KartuMasakan[];
  locale: Locale;
}) {
  const copy = copyFor(locale);
  const [query, setQuery] = useState("");
  const adopted = useRef(false);

  // Adopt an incoming ?cari= after hydration. The list is prerendered whole, so
  // reading the URL during render would mismatch — and the unfiltered list is
  // the right thing to have in the static HTML anyway.
  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get(PARAM) ?? "");
    adopted.current = true;
  }, []);

  useEffect(() => {
    if (!adopted.current) return;
    const trimmed = query.trim();
    const url = `${window.location.pathname}${trimmed ? `?${PARAM}=${encodeURIComponent(trimmed)}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [query]);

  const hasil = cari(kartu, query);

  // Category order is the authored one; search filters within it and never
  // reorders, so a dish does not move up the page for invisible reasons.
  const byKategori = new Map<string, KartuMasakan[]>();
  for (const entry of hasil) {
    const existing = byKategori.get(entry.kategori);
    if (existing) existing.push(entry);
    else byKategori.set(entry.kategori, [entry]);
  }

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <label className="flex flex-1 items-center gap-2">
          <span className="sr-only">{copy.cari.label}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.cari.placeholder}
            className="w-full max-w-sm rounded border border-rim/40 bg-enamel px-3 py-2 text-base placeholder:text-ink-soft"
          />
        </label>
        <p aria-live="polite" className="text-sm text-ink-soft">
          {query.trim()
            ? copy.cari.hasil(hasil.length, kartu.length)
            : copy.cari.semua(kartu.length)}
        </p>
      </div>

      {hasil.length === 0 && (
        /* Named, not silent. An empty result says what was searched for and
           what the catalogue actually holds, rather than showing a blank. */
        <p className="mt-block max-w-prose text-base text-ink-soft">
          {copy.cari.kosong(query.trim())}
        </p>
      )}

      {[...byKategori.entries()].map(([kategori, entries]) => (
        <section key={kategori} className="mt-block">
          <h3 lang="id" className="font-display text-lg capitalize text-rim">
            {kategori}
          </h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/${locale}/masakan/${entry.id}/`}
                  className="list-card block h-full px-4 py-4 transition-colors hover:border-rim hover:bg-enamel-deep"
                >
                  <span
                    lang="id"
                    className="font-display text-md font-medium text-rim"
                  >
                    {entry.namaId}
                  </span>
                  <span className="mt-1 block text-sm text-ink-soft">
                    {entry.deskripsiId}
                  </span>
                  {/* Three nutrients at identical weight, not energy alone —
                      invariant 13. Values arrive pre-rendered. */}
                  <span className="mt-3 grid grid-cols-3 gap-2 border-t border-rim/20 pt-2 text-sm">
                    {entry.nutrients.map((nutrient) => (
                      <span key={nutrient.id} className="block">
                        <span className="block text-xs text-ink-soft">
                          {nutrient.label}
                        </span>
                        <span className="font-mono">{nutrient.value}</span>{" "}
                        <span className="text-xs text-ink-soft">
                          {nutrient.unit}
                        </span>
                      </span>
                    ))}
                  </span>
                  <span className="mt-2 block text-xs text-ink-soft">
                    {copy.plate.perPorsi.toLowerCase()}
                  </span>
                  {/* Phrased as something the dish does, not as a defect count:
                      naming a gap is the product, not a failure. */}
                  {entry.gapCount > 0 && (
                    <span className="mt-1 block text-xs text-chip">
                      {copy.cari.menyebut(entry.gapCount)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
