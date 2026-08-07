'use client'

/**
 * The localStorage half of saved recipes. Everything that touches storage is
 * here; the parsing, validation and list operations it delegates to are pure
 * and tested.
 *
 * Storage can throw — private browsing, a full quota, a blocked origin. Every
 * access is guarded, and a failure degrades to "no saved recipes" rather than
 * taking the page down. Saving is the only thing that reports a failure, since
 * it is the only one where the reader is owed an answer.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  hapus,
  parseStore,
  serialiseStore,
  simpan,
  STORAGE_KEY,
  type ResepTersimpan,
} from '@/lib/simpan/resep-tersimpan'

function read(): readonly ResepTersimpan[] {
  try {
    return parseStore(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return []
  }
}

function write(entries: readonly ResepTersimpan[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, serialiseStore(entries))
    return true
  } catch {
    return false
  }
}

export interface SavedRecipes {
  readonly entries: readonly ResepTersimpan[]
  /** True once storage has been read, so the UI does not flash an empty list. */
  readonly ready: boolean
  /** False when storage refused the write — quota, or a blocked origin. */
  readonly save: (entry: ResepTersimpan) => boolean
  readonly remove: (id: string) => void
}

export function useResepTersimpan(): SavedRecipes {
  const [entries, setEntries] = useState<readonly ResepTersimpan[]>([])
  const [ready, setReady] = useState(false)

  // Read after mount: localStorage does not exist during the static export.
  useEffect(() => {
    setEntries(read())
    setReady(true)
  }, [])

  const save = useCallback((entry: ResepTersimpan) => {
    const next = simpan(read(), entry)
    if (!write(next)) return false
    setEntries(next)
    return true
  }, [])

  const remove = useCallback((id: string) => {
    const next = hapus(read(), id)
    write(next)
    setEntries(next)
  }, [])

  return { entries, ready, save, remove }
}
