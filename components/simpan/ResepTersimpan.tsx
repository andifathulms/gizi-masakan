'use client'

/**
 * Saved recipe versions for this dish — PRD §6.6.
 *
 * What is saved is the set of edited gram weights, under a name the reader
 * chooses. Loading one puts those weights back on the plate, which also puts
 * them in the URL — so a saved version is both kept on the device and
 * shareable, without the device ever being the thing that shares it.
 *
 * There is no date on a saved version and no count of anything. PRD §5 and
 * invariant 11: this stores a recipe, not a record of eating. The copy says so
 * out loud, because a "save" button in a nutrition app is exactly where a
 * reader would reasonably expect a food diary to begin.
 */
import { useRef, useState } from 'react'
import {
  entryId,
  untukMasakan,
  NAMA_MAX,
  type ResepTersimpan as Entry,
} from '@/lib/simpan/resep-tersimpan'
import { useResepTersimpan } from '@/lib/simpan/use-resep-tersimpan'
import { copyFor, type Locale } from '@/lib/i18n'

export function ResepTersimpan({
  dishId,
  locale,
  beratOverrideG,
  onMuat,
}: {
  dishId: string
  locale: Locale
  beratOverrideG: Readonly<Record<string, number>>
  onMuat: (beratOverrideG: Readonly<Record<string, number>>) => void
}) {
  const copy = copyFor(locale)
  const { entries, ready, save, remove } = useResepTersimpan()
  const [nama, setNama] = useState('')
  const [gagal, setGagal] = useState(false)
  /* Deleting a version removes the row holding the button that did it, which
     drops focus to <body> — WCAG 2.4.3. Focus moves to the list, which is
     where the result of the deletion is. */
  const daftarRef = useRef<HTMLUListElement>(null)

  const milik = untukMasakan(entries, dishId)
  const adaPerubahan = Object.keys(beratOverrideG).length > 0
  const bisaSimpan = adaPerubahan && nama.trim().length > 0

  function onSimpan() {
    const trimmed = nama.trim()
    if (!adaPerubahan || trimmed.length === 0) return
    const entry: Entry = {
      id: entryId(dishId, trimmed),
      dishId,
      nama: trimmed,
      beratOverrideG: { ...beratOverrideG },
    }
    setGagal(!save(entry))
    setNama('')
  }

  return (
    <section>
      <h2 className="font-display text-lg text-rim">{copy.simpan.judul}</h2>
      <p className="mt-2 max-w-prose text-base text-ink-soft">{copy.simpan.penjelasan}</p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-soft">{copy.simpan.namaLabel}</span>
          <input
            type="text"
            value={nama}
            maxLength={NAMA_MAX}
            onChange={(event) => setNama(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSimpan()
            }}
            placeholder={copy.simpan.namaPlaceholder}
            className="w-64 rounded border border-rim/40 bg-enamel px-2 py-1 text-base placeholder:text-ink-soft"
          />
        </label>
        {/* aria-disabled, not disabled: a disabled button is removed from the
            tab order, so a keyboard user tabbed straight past it and never
            found out it existed, let alone why it was off. This one stays
            focusable and points at the sentence that explains it —
            WCAG 3.3.2. */}
        <button
          type="button"
          onClick={onSimpan}
          aria-disabled={!bisaSimpan}
          aria-describedby={adaPerubahan ? undefined : 'simpan-syarat'}
          className={`rounded border border-rim/40 px-3 py-1 text-sm ${
            bisaSimpan ? 'text-rim' : 'cursor-not-allowed text-ink-soft opacity-60'
          }`}
        >
          {copy.simpan.tombol}
        </button>
      </div>

      {/* Says why the button is unavailable rather than leaving it inert. */}
      {!adaPerubahan && (
        <p id="simpan-syarat" className="mt-2 text-sm text-ink-soft">
          {copy.simpan.perluUbah}
        </p>
      )}
      {gagal && <p className="mt-2 max-w-prose text-sm text-edited">{copy.simpan.gagal}</p>}

      {ready && (
        <ul ref={daftarRef} tabIndex={-1} className="mt-4 space-y-2 text-sm">
          {milik.length === 0 && <li className="text-ink-soft">{copy.simpan.kosong}</li>}
          {milik.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {/* Terracotta: a saved version is the reader's own weights, which
                  is exactly what the colour is reserved for — PRD §9. */}
              <span className="text-edited">{entry.nama}</span>
              <span className="text-ink-soft">
                {Object.keys(entry.beratOverrideG).length}{' '}
                {locale === 'en' ? 'weights changed' : 'takaran diubah'}
              </span>
              <button
                type="button"
                onClick={() => onMuat(entry.beratOverrideG)}
                className="text-rim underline underline-offset-4"
              >
                {copy.simpan.muat}
                <span className="sr-only"> {copy.simpan.muatNama(entry.nama)}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  remove(entry.id)
                  daftarRef.current?.focus()
                }}
                className="text-ink-soft underline underline-offset-4 hover:text-rim"
              >
                {copy.simpan.hapus}
                <span className="sr-only"> {copy.simpan.hapusNama(entry.nama)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
