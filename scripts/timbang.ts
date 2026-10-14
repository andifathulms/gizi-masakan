/**
 * DEV — record scale readings into the data. Never part of the build.
 *
 *   pnpm timbang resep <recipe-id> <ingredient-id> <gram> [--tanggal yyyy-mm-dd]
 *     Replace one recipe row's estimated weight with a scale reading:
 *     beratG, provenance "ditimbang", and the date it was weighed.
 *
 *   pnpm timbang urt <takaran-id> --label "1 centong nasi" --en "1 rice scoop"
 *                    --bahan nasi-putih --ulangan 152,148,151   (decimals: 12.5)
 *                    [--alat "Timbangan dapur digital 1 g"] [--catatan "…"]
 *                    [--tanggal yyyy-mm-dd] [--ganti]
 *     Add a weighed household measure to data/urt/takaran.json, averaging
 *     the fresh fills the protocol asks for (three or more).
 *
 *   pnpm timbang daftar
 *     List what is still unweighed: estimated recipe rows and URT targets.
 *
 * The date defaults to today. Every reading is validated and refused if
 * malformed — invariant 19 — and nothing here estimates: if it was not read
 * off a scale, do not type it in (invariant 9). Run `pnpm data:validate`
 * afterwards; the build will refuse anything this let through by mistake.
 *
 * The parsing, averaging and editing live in lib/portion/timbang.ts, pure and
 * tested. This file only reads arguments, the clock and the files.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { bacaGram, cekTanggal, rataUlangan, tambahTakaran, tandaiDitimbang } from '../lib/portion/timbang'

const ROOT = join(__dirname, '..')
const ALAT_BAWAAN = 'Timbangan dapur digital 1 g'

function fail(message: string): never {
  console.error(`\n  timbang: ${message}\n`)
  process.exit(1)
}

function opsi(args: string[]): { posisi: string[]; flag: Map<string, string | true> } {
  const posisi: string[] = []
  const flag = new Map<string, string | true>()
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!
    if (arg.startsWith('--')) {
      const next = args[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        flag.set(arg.slice(2), next)
        i += 1
      } else flag.set(arg.slice(2), true)
    } else posisi.push(arg)
  }
  return { posisi, flag }
}

function teks(flag: Map<string, string | true>, nama: string): string | undefined {
  const v = flag.get(nama)
  return typeof v === 'string' ? v : undefined
}

/** Local date, not UTC: a reading taken at 06:00 in Jakarta is that day. */
function hariIni(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function tanggalDari(flag: Map<string, string | true>): string {
  const r = cekTanggal(teks(flag, 'tanggal') ?? hariIni())
  if (!r.ok) fail(r.error)
  return r.value
}

function resep(posisi: string[], flag: Map<string, string | true>) {
  const [recipeId, ingredientId, gram] = posisi
  if (!recipeId || !ingredientId || !gram)
    fail('usage: pnpm timbang resep <recipe-id> <ingredient-id> <gram> [--tanggal yyyy-mm-dd]')
  if (!/^[a-z0-9-]+$/.test(recipeId)) fail(`"${recipeId}" is not a recipe id.`)
  const berat = bacaGram(gram)
  if (!berat.ok) fail(berat.error)
  const tanggal = tanggalDari(flag)
  const path = join(ROOT, 'data', 'recipes', `${recipeId}.json`)
  let sebelum: string
  try {
    sebelum = readFileSync(path, 'utf8')
  } catch {
    fail(`No recipe "${recipeId}" in data/recipes.`)
  }
  const hasil = tandaiDitimbang(sebelum, ingredientId, berat.value, tanggal)
  if (!hasil.ok) fail(hasil.error)
  writeFileSync(path, hasil.value)
  console.log(`  ${recipeId} / ${ingredientId}: ${berat.value} g, ditimbang ${tanggal}`)
  console.log('  Next: pnpm data:validate && pnpm test:conservation')
}

function urt(posisi: string[], flag: Map<string, string | true>) {
  const [id] = posisi
  const labelId = teks(flag, 'label')
  const labelEn = teks(flag, 'en')
  const ingredientId = teks(flag, 'bahan')
  const ulangan = teks(flag, 'ulangan')
  if (!id || !labelId || !labelEn || !ingredientId || !ulangan)
    fail(
      'usage: pnpm timbang urt <takaran-id> --label "…" --en "…" --bahan <ingredient-id> --ulangan g1,g2,g3',
    )
  /* Readings are separated by commas, semicolons or spaces, so a decimal
     reading uses a point: --ulangan 12.5,13,12.5 */
  const rata = rataUlangan(ulangan.split(/[,;\s]+/).filter(Boolean))
  if (!rata.ok) fail(rata.error)
  const path = join(ROOT, 'data', 'urt', 'takaran.json')
  const file = JSON.parse(readFileSync(path, 'utf8')) as { entries: unknown[] } & Record<string, unknown>
  const catatan = teks(flag, 'catatan')
  const hasil = tambahTakaran(
    file,
    {
      id,
      labelId,
      labelEn,
      ingredientId,
      gramG: rata.value.gramG,
      diukurPada: tanggalDari(flag),
      jumlahUlangan: rata.value.jumlahUlangan,
      alat: teks(flag, 'alat') ?? ALAT_BAWAAN,
      ...(catatan ? { catatan } : {}),
    },
    flag.has('ganti'),
  )
  if (!hasil.ok) fail(hasil.error)
  writeFileSync(path, `${JSON.stringify(hasil.value, null, 2)}\n`)
  console.log(`  ${labelId}: ${rata.value.gramG} g (rata-rata ${rata.value.jumlahUlangan} ulangan)`)
  console.log('  Next: pnpm data:validate')
}

/** What is still unweighed: every recipe's estimated rows, and the URT targets. */
async function daftar() {
  const { RECIPES } = await import('../lib/resep')
  const { TAKARAN, urtStatus } = await import('../lib/portion')
  let sisa = 0
  let total = 0
  console.log('\n  Resep (baris perkiraan / semua baris)')
  for (const recipe of RECIPES) {
    const perkiraan = recipe.bahan.filter((b) => b.provenance === 'perkiraan')
    sisa += perkiraan.length
    total += recipe.bahan.length
    if (perkiraan.length > 0)
      console.log(
        `    ${recipe.id.padEnd(22)} ${String(perkiraan.length).padStart(2)} / ${recipe.bahan.length}   ${perkiraan.map((b) => b.ingredientId).join(', ')}`,
      )
  }
  console.log(`  ${total - sisa} of ${total} recipe rows weighed.`)
  const sudah = new Set(TAKARAN.map((t) => t.labelId))
  const target = urtStatus().targetPengukuran.filter((t: string) => !sudah.has(t))
  console.log(`\n  URT: ${TAKARAN.length} weighed. Still to weigh:`)
  for (const t of target) console.log(`    ${t}`)
  console.log('')
}

const [perintah, ...sisa] = process.argv.slice(2)
const { posisi, flag } = opsi(sisa)
if (perintah === 'resep') resep(posisi, flag)
else if (perintah === 'urt') urt(posisi, flag)
else if (perintah === 'daftar') void daftar()
else fail('usage: pnpm timbang resep … | pnpm timbang urt …   (see scripts/timbang.ts)')
