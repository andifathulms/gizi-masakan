/**
 * Yield and retention factors → data/factors/*.json. DEV and CI only.
 *
 *   pnpm factors:fetch   download the two USDA public-domain tables
 *   pnpm factors:build   transcribe them, and derive rice/vegetable yields
 *
 * Three sources, each cited per factor in the emitted file:
 *
 *  1. USDA Table of Nutrient Retention Factors, Release 6 (2007) — retention.
 *     Public domain. 26 components per food-group/method row. Only the
 *     components in our nutrient catalogue are kept; the rest of our nutrients
 *     get NO factor and are therefore marked unadjusted (invariant 3). USDA
 *     publishes no retention factors for protein, fat, carbohydrate, fibre,
 *     energy, cholesterol, selenium, vitamin E or vitamin K, so those stay
 *     unadjusted and say so.
 *
 *  2. USDA Table of Cooking Yields for Meat and Poultry (2012) — yields for
 *     meat and poultry. Public domain.
 *
 *  3. FDC dry-matter balance — for foods where USDA publishes no cooking yield
 *     but FDC has both a raw and a cooked entry. Water is the only thing that
 *     changes in a boil or a steam, so
 *
 *         yield = (100 − waterRaw) / (100 − waterCooked)
 *
 *     which is the mass ratio that conserves dry matter. Both FDC ids and the
 *     two water values are recorded on the factor so the derivation is
 *     inspectable rather than asserted. This is a derivation, and the emitted
 *     factor says so in `derivation`.
 *
 * A cooking operation with no factor from any of the three is NOT invented.
 * It is left out, and lib/nutrition names the missing factor as a gap.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const REFS = join(ROOT, '.fdc-cache', 'refs')
const OUT_DIR = join(ROOT, 'data', 'factors')

const RETENTION_PDF_URL =
  'https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/retn06.pdf'
const YIELDS_PDF_URL =
  'https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf'

const RETENTION_CITATION =
  'USDA Table of Nutrient Retention Factors, Release 6. Nutrient Data Laboratory, Beltsville Human Nutrition Research Center, Agricultural Research Service, USDA, December 2007. Public domain.'
const YIELDS_CITATION =
  'Showell BA, Williams JR, Duvall M, Howe JC, Patterson KY, Roseland JM, Holden JM. USDA Table of Cooking Yields for Meat and Poultry. Nutrient Data Laboratory, ARS, USDA, December 2012. Public domain.'

function fail(message: string): never {
  console.error(`\n  factors-pipeline: ${message}\n`)
  process.exit(1)
}

/**
 * Column order of the retention table, read off the rotated PDF header by word
 * x-position — 26 components, left to right. Entries mapped to `null` are
 * components we do not carry.
 */
const RETENTION_COLUMNS: readonly (string | null)[] = [
  '301', // Calcium, Ca
  '303', // Iron, Fe
  '304', // Magnesium, Mg
  '305', // Phosphorus, P
  '306', // Potassium, K
  '307', // Sodium, Na
  '309', // Zinc, Zn
  null, // Copper, Cu — not carried
  '401', // Vitamin C, total ascorbic acid
  '404', // Thiamin
  '405', // Riboflavin
  '406', // Niacin
  '415', // Vitamin B-6
  null, // Folate, food — superseded by Folate, total below
  null, // Folic acid
  '435', // Folate, total → applied to Folate, DFE. Noted on the factor.
  null, // Choline, total — not carried
  '418', // Vitamin B-12
  null, // Vitamin A, IU — we carry RAE
  '320', // Vitamin A, RE → applied to Vitamin A, RAE. Noted on the factor.
  null, // Alcohol, ethyl
  null, // Carotene, beta
  null, // Carotene, alpha
  null, // Cryptoxanthin, beta
  null, // Lycopene
  null, // Lutein+zeaxanthin
]

const FOLATE_NOTE =
  'USDA menerbitkan faktor untuk Folate, total (Nutr. No. 417). Di sini diterapkan ke Folat DFE (435) karena DFE tidak punya faktor tersendiri. Perlakuan ini dicatat, bukan disembunyikan.'
const VITA_NOTE =
  'USDA menerbitkan faktor untuk Vitamin A, RE (392). Di sini diterapkan ke Vitamin A, RAE (320). RE dan RAE beda definisi konversi karotenoid; faktor retensinya diperlakukan sama.'

function pdftotext(pdf: string, out: string): void {
  try {
    execFileSync('pdftotext', ['-layout', pdf, out], { stdio: 'inherit' })
  } catch {
    fail('pdftotext is required (brew install poppler / apt-get install poppler-utils).')
  }
}

async function download(url: string, path: string): Promise<void> {
  console.log(`  downloading ${url}`)
  const response = await fetch(url)
  if (!response.ok) fail(`download failed: HTTP ${response.status}`)
  writeFileSync(path, Buffer.from(await response.arrayBuffer()))
}

async function fetchRefs(): Promise<void> {
  mkdirSync(REFS, { recursive: true })
  await download(RETENTION_PDF_URL, join(REFS, 'retn06.pdf'))
  await download(YIELDS_PDF_URL, join(REFS, 'yields.pdf'))
  pdftotext(join(REFS, 'retn06.pdf'), join(REFS, 'retn06.txt'))
  pdftotext(join(REFS, 'yields.pdf'), join(REFS, 'yields.txt'))
  console.log('  next: pnpm factors:build')
}

interface RetentionRow {
  readonly code: string
  readonly foodGroup: string
  readonly description: string
  readonly factors: Readonly<Record<string, number>>
}

function parseRetention(): RetentionRow[] {
  const path = join(REFS, 'retn06.txt')
  if (!existsSync(path)) fail('no retn06.txt — run `pnpm factors:fetch` first.')
  const rows: RetentionRow[] = []
  // "  0001       01     CHEESE,BAKED    100 100 ... " — 26 trailing integers.
  const pattern = /^\s*(\d{4})\s+(\d{2})\s+(\S.*?)\s{2,}((?:\d{1,3}\s+){25}\d{1,3})\s*$/
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = pattern.exec(line)
    if (!match) continue
    const numbers = match[4]!.trim().split(/\s+/).map(Number)
    if (numbers.length !== RETENTION_COLUMNS.length) continue
    const factors: Record<string, number> = {}
    RETENTION_COLUMNS.forEach((nutrientId, index) => {
      const percent = numbers[index]
      if (nutrientId === null || percent === undefined) return
      factors[nutrientId] = percent / 100
    })
    rows.push({
      code: match[1]!,
      foodGroup: match[2]!,
      description: match[3]!.trim(),
      factors,
    })
  }
  if (rows.length < 200) {
    fail(`only parsed ${rows.length} retention rows; the table has ~270. Parser is wrong.`)
  }
  return rows
}

interface YieldRow {
  readonly code: string
  readonly description: string
  readonly method: string
  readonly yieldPercent: number
}

function parseYields(): YieldRow[] {
  const path = join(REFS, 'yields.txt')
  if (!existsSync(path)) fail('no yields.txt — run `pnpm factors:fetch` first.')
  const rows: YieldRow[] = []
  // Columns: food group, NDB no., description, method, yield %, n, SD, min %,
  // max %, moisture %, fat %, release year. n, SD, moisture and fat are blank
  // for some rows, so anchor on the first number after the method and on the
  // 4-digit release year that closes every data line.
  //   "05   5094   Chicken, broiler-fryer, thigh   Roasted,   69   58  79   1975"
  // A few rows carry the method only on a continuation line; those are skipped
  // rather than guessed at.
  const dataLine = /^\s*(0[57]|1[037])\s+(\d{4,5})?\s*(.*?)\s{2,}(\d{1,3})(?:\s.*)?\s(\d{4})\s*$/
  const withMethod =
    /^\s*(0[57]|1[037])\s+(\d{4,5})?\s*([A-Za-z][^\s].*?)\s{2,}([A-Za-z][A-Za-z,\-/ ]*?)\s{2,}(\d{1,3})(?:\s.*)?\s(\d{4})\s*$/
  let skipped = 0
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!dataLine.test(line)) continue
    const match = withMethod.exec(line)
    if (!match) {
      // Description or method sits on a continuation line the layout pass broke
      // apart. Skipped rather than stitched together by guesswork, and counted
      // so the omission is reported instead of looking like full coverage.
      skipped += 1
      continue
    }
    const yieldPercent = Number(match[5])
    if (!Number.isFinite(yieldPercent) || yieldPercent <= 0 || yieldPercent > 200) {
      skipped += 1
      continue
    }
    rows.push({
      code: match[2] ?? '',
      description: match[3]!.trim(),
      method: match[4]!.replace(/,$/, '').trim(),
      yieldPercent,
    })
  }
  console.log(`  yields     ${rows.length} rows parsed, ${skipped} skipped (split across lines)`)
  if (rows.length < 40) fail(`only parsed ${rows.length} yield rows. Parser is wrong.`)
  return rows
}

/** Water content per 100 g, straight out of the shipped FDC projection. */
function waterFromFdc(): Map<string, number> {
  const table = JSON.parse(
    readFileSync(join(ROOT, 'data', 'ingredients', 'table.json'), 'utf8'),
  ) as { nutrientIds: string[]; ingredients: { id: string }[]; values: string }
  const waterIndex = table.nutrientIds.indexOf('255')
  const bytes = Buffer.from(table.values, 'base64')
  const values = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
  const water = new Map<string, number>()
  table.ingredients.forEach((ingredient, rowIndex) => {
    const value = values[rowIndex * table.nutrientIds.length + waterIndex]
    if (value !== undefined && Number.isFinite(value)) water.set(ingredient.id, value)
  })
  return water
}

/**
 * Foods where USDA publishes no cooking yield but FDC has a raw and a cooked
 * entry, so dry-matter balance gives a derivable one. `cookedFdcId` is recorded
 * on the emitted factor; the raw side is the curated ingredient itself.
 */
const DRY_MATTER_YIELDS: readonly {
  operationId: string
  ingredientId: string
  cookedFdcId: number
  cookedDescription: string
  labelId: string
  labelEn: string
}[] = [
  {
    operationId: 'beras-ditanak',
    ingredientId: 'beras-putih',
    cookedFdcId: 169757,
    cookedDescription: 'Rice, white, long-grain, regular, unenriched, cooked without salt',
    labelId: 'Beras ditanak jadi nasi',
    labelEn: 'Rice, boiled/steamed',
  },
  {
    operationId: 'ketan-dikukus',
    ingredientId: 'beras-ketan',
    cookedFdcId: 169711,
    cookedDescription: 'Rice, white, glutinous, unenriched, cooked',
    labelId: 'Ketan dikukus',
    labelEn: 'Glutinous rice, steamed',
  },
  {
    operationId: 'bihun-direbus',
    ingredientId: 'bihun-kering',
    cookedFdcId: 168914,
    cookedDescription: 'Rice noodles, cooked',
    labelId: 'Bihun direbus',
    labelEn: 'Rice noodles, boiled',
  },
  {
    operationId: 'mi-telur-direbus',
    ingredientId: 'mi-telur-kering',
    cookedFdcId: 168926,
    cookedDescription: 'Noodles, egg, unenriched, cooked, without added salt',
    labelId: 'Mi telur direbus',
    labelEn: 'Egg noodles, boiled',
  },
  {
    operationId: 'kacang-panjang-direbus',
    ingredientId: 'kacang-panjang',
    cookedFdcId: 169223,
    cookedDescription: 'Yardlong bean, cooked, boiled, drained, without salt',
    labelId: 'Kacang panjang direbus',
    labelEn: 'Yardlong bean, boiled',
  },
  {
    operationId: 'taoge-direbus',
    ingredientId: 'taoge',
    cookedFdcId: 169137,
    cookedDescription: 'Mung beans, mature seeds, sprouted, cooked, boiled, drained, without salt',
    labelId: 'Taoge direbus',
    labelEn: 'Mung bean sprouts, boiled',
  },
  {
    operationId: 'labu-siam-direbus',
    ingredientId: 'labu-siam',
    cookedFdcId: 170403,
    cookedDescription: 'Chayote, fruit, cooked, boiled, drained, without salt',
    labelId: 'Labu siam direbus',
    labelEn: 'Chayote, boiled',
  },
  {
    operationId: 'sawi-direbus',
    ingredientId: 'sawi-hijau',
    cookedFdcId: 169257,
    cookedDescription: 'Mustard greens, cooked, boiled, drained, without salt',
    labelId: 'Sawi direbus',
    labelEn: 'Mustard greens, boiled',
  },
  {
    operationId: 'kentang-direbus',
    ingredientId: 'kentang',
    cookedFdcId: 170438,
    cookedDescription: 'Potatoes, boiled, cooked in skin, flesh, without salt',
    labelId: 'Kentang direbus',
    labelEn: 'Potato, boiled',
  },
]

function waterOfFdcId(fdcId: number): number {
  // Read the cooked entry's water straight from the SR Legacy CSV. The cooked
  // entries are not in our curated table — only their water content is used.
  const dir = join(ROOT, '.fdc-cache', 'FoodData_Central_sr_legacy_food_csv_2018-04')
  const path = join(dir, 'food_nutrient.csv')
  if (!existsSync(path)) fail('no FDC CSVs in .fdc-cache — run `pnpm fdc:fetch` first.')
  const text = readFileSync(path, 'utf8')
  const pattern = new RegExp(`^"\\d+","${fdcId}","1051","([\\d.]+)"`, 'm')
  const match = pattern.exec(text)
  if (!match) fail(`no water (nutrient 1051) value for fdcId ${fdcId}.`)
  return Number(match[1])
}

function build(): void {
  mkdirSync(OUT_DIR, { recursive: true })
  const generatedOn = new Date().toISOString().slice(0, 10)

  // Retention.
  const retentionRows = parseRetention()
  const retention = {
    $comment:
      'GENERATED by scripts/factors-pipeline.ts from the USDA Table of Nutrient Retention Factors, Release 6. Do not edit by hand. A nutrient absent from a row has NO published factor and must be marked unadjusted, never assumed fully retained (invariant 3).',
    citation: RETENTION_CITATION,
    sourceUrl: RETENTION_PDF_URL,
    licence: 'US Government work — public domain',
    generatedOn,
    notes: { '435': FOLATE_NOTE, '320': VITA_NOTE },
    unadjustedByDesign: {
      nutrients: ['208', '203', '204', '606', '205', '291', '269', '255', '601', '317', '323', '430'],
      reason:
        'USDA tidak menerbitkan faktor retensi untuk energi, makronutrien, serat, gula, air, kolesterol, selenium, vitamin E, dan vitamin K. Nutrien ini lewat tanpa penyesuaian dan ditandai demikian.',
    },
    operations: retentionRows.map((row) => ({
      code: row.code,
      foodGroup: row.foodGroup,
      description: row.description,
      factors: row.factors,
    })),
  }
  writeFileSync(join(OUT_DIR, 'retention.json'), `${JSON.stringify(retention, null, 2)}\n`)

  // Yields — USDA meat and poultry.
  const yieldRows = parseYields()
  const water = waterFromFdc()
  const derived = DRY_MATTER_YIELDS.map((entry) => {
    const waterRaw = water.get(entry.ingredientId)
    if (waterRaw === undefined) {
      fail(`no water value for curated ingredient "${entry.ingredientId}" — cannot derive a yield.`)
    }
    const waterCooked = waterOfFdcId(entry.cookedFdcId)
    const factor = (100 - waterRaw) / (100 - waterCooked)
    return {
      id: entry.operationId,
      labelId: entry.labelId,
      labelEn: entry.labelEn,
      appliesTo: [entry.ingredientId],
      factor: Number(factor.toFixed(4)),
      basis: 'fdc-dry-matter' as const,
      derivation: {
        formula: 'yield = (100 − waterRaw) / (100 − waterCooked)',
        rawFdcWaterPer100: waterRaw,
        cookedFdcId: entry.cookedFdcId,
        cookedFdcDescription: entry.cookedDescription,
        cookedFdcWaterPer100: waterCooked,
        reasoning:
          'Merebus atau mengukus hanya mengubah air; bahan kering kekal. Rasio massa yang menjaga bahan kering itulah faktor yield-nya.',
      },
    }
  })

  const yields = {
    $comment:
      'GENERATED by scripts/factors-pipeline.ts. Do not edit by hand. Every factor carries either a USDA citation or a stated derivation. An operation with no factor is left out — lib/nutrition names it as a gap rather than assuming 1.0.',
    generatedOn,
    sources: {
      'usda-yields': { citation: YIELDS_CITATION, url: YIELDS_PDF_URL, licence: 'US Government work — public domain' },
      'fdc-dry-matter': {
        citation:
          'Diturunkan dari kadar air entri mentah dan matang FDC SR Legacy 2018-04. Nilai air kedua entri dicatat pada setiap faktor.',
        licence: 'US Government work — public domain',
      },
    },
    derived,
    usda: yieldRows.map((row) => ({
      code: row.code,
      description: row.description,
      method: row.method,
      factor: Number((row.yieldPercent / 100).toFixed(4)),
      basis: 'usda-yields' as const,
    })),
  }
  writeFileSync(join(OUT_DIR, 'yields.json'), `${JSON.stringify(yields, null, 2)}\n`)

  console.log(`  retention  ${retentionRows.length} operations`)
  console.log(`  yields     ${yieldRows.length} USDA rows, ${derived.length} derived`)
  for (const entry of derived) {
    console.log(`               ${entry.id}: ×${entry.factor}`)
  }
}

async function main(): Promise<void> {
  switch (process.argv[2]) {
    case 'fetch':
      await fetchRefs()
      break
    case 'build':
      build()
      break
    default:
      fail('usage: factors-pipeline.ts <fetch|build>')
  }
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)))
