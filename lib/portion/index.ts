/**
 * URT (Ukuran Rumah Tangga) → grams. PRD §6.2.
 *
 * Invariant 9: every entry records the gram weight and the date it was
 * measured. If it was not weighed, it does not go in the table — so this module
 * has no estimator, no density model, and no fallback conversion. When there is
 * no measured entry, `resolveTakaran` says there is no measured entry.
 *
 * The table is currently empty, because nothing has been weighed yet. That is
 * reported by `urtStatus()` and shown on the method page rather than left for
 * the reader to discover as an absence.
 */
import { z } from 'zod'
import urtJson from '@/data/urt/takaran.json'

export const TakaranSchema = z.object({
  id: z.string().min(1),
  labelId: z.string().min(1),
  labelEn: z.string().min(1),
  ingredientId: z.string().min(1),
  gramG: z.number().positive('a measured weight is greater than zero'),
  diukurPada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'measured-on must be an ISO date'),
  jumlahUlangan: z.number().int().positive(),
  alat: z.string().min(1),
  catatan: z.string().optional(),
})

export type Takaran = z.infer<typeof TakaranSchema>

const file = urtJson as unknown as {
  citation: string
  entries: unknown[]
  caraMengukur: { alat: string; prosedur: string[] }
  targetPengukuran: string[]
}

export const TAKARAN: readonly Takaran[] = file.entries.map((entry, index) => {
  const result = TakaranSchema.safeParse(entry)
  if (!result.success) {
    throw new Error(
      `Entri URT ke-${index + 1} tidak lolos skema:\n${result.error.issues
        .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
        .join('\n')}`,
    )
  }
  return result.data
})

export type TakaranResult =
  | { readonly type: 'terukur'; readonly takaran: Takaran }
  | { readonly type: 'belum-diukur'; readonly reason: string }

export function resolveTakaran(takaranId: string): TakaranResult {
  const takaran = TAKARAN.find((entry) => entry.id === takaranId)
  if (takaran) return { type: 'terukur', takaran }
  return {
    type: 'belum-diukur',
    reason: `Takaran "${takaranId}" belum ditimbang. Tabel URT hanya memuat berat yang benar-benar diukur, jadi tidak ada angka pengganti untuk ini.`,
  }
}

export function takaranUntukBahan(ingredientId: string): readonly Takaran[] {
  return TAKARAN.filter((entry) => entry.ingredientId === ingredientId)
}

export interface UrtStatus {
  readonly jumlahEntri: number
  readonly siap: boolean
  readonly caraMengukur: { readonly alat: string; readonly prosedur: readonly string[] }
  readonly targetPengukuran: readonly string[]
  readonly pesan: string
}

/** What the method page reports about the URT table's real state. */
export function urtStatus(): UrtStatus {
  const jumlahEntri = TAKARAN.length
  return {
    jumlahEntri,
    siap: jumlahEntri > 0,
    caraMengukur: file.caraMengukur,
    targetPengukuran: file.targetPengukuran,
    pesan:
      jumlahEntri > 0
        ? `${jumlahEntri} takaran sudah ditimbang, masing-masing dengan tanggal pengukurannya.`
        : 'Tabel URT masih kosong. Belum ada satu pun takaran yang ditimbang, jadi porsi di situs ini ditampilkan dalam gram. Mengisi tabel ini dengan angka kira-kira akan menghapus satu-satunya alasan tabel ini layak dipercaya.',
  }
}
