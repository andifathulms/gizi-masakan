/**
 * FDC fetch → filter → project → emit. DEV and scheduled-CI only.
 *
 * Never part of `pnpm build`, never in the browser bundle. PRD §7: the runtime
 * makes zero network requests, so every byte the app reads is committed.
 *
 *   pnpm fdc:fetch   download and unpack the SR Legacy bulk CSV into .fdc-cache
 *   pnpm fdc:build   filter to data/ingredients/curated.json, project to the
 *                    ~27 kept nutrients, write data/ingredients/table.json
 *
 * The raw CSVs stay in .fdc-cache, which is gitignored — invariant 15.
 *
 * Encoding. Values are packed as a Float32Array of nIngredients × nNutrients,
 * row-major in the order of index.ingredients and index.nutrients, base64'd
 * into the emitted JSON so it bundles with no fetch. **NaN encodes "no value"**
 * and is decoded back to `undefined`; it is never decoded to zero. That is the
 * whole point — see lib/sources/fdc/load.ts.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { NUTRIENTS } from '../lib/nutrition/nutrients'

// pnpm runs scripts from the package root, which is the repo root here.
const ROOT = process.cwd()
const CACHE = join(ROOT, '.fdc-cache')
const ZIP_URL =
  'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip'
const ZIP_PATH = join(CACHE, 'sr_legacy.zip')
const RELEASE = 'FDC SR Legacy, 2018-04 release'
const OUT_PATH = join(ROOT, 'data', 'ingredients', 'table.json')

interface CuratedIngredient {
  id: string
  namaId: string
  nameEn: string
  fdcId: number
  kategori: string
  catatan?: string
}

function fail(message: string): never {
  console.error(`\n  fdc-pipeline: ${message}\n`)
  process.exit(1)
}

/** RFC 4180-ish reader. FDC quotes every field and escapes quotes by doubling. */
function* readCsv(path: string): Generator<readonly string[]> {
  const text = readFileSync(path, 'utf8')
  let field = ''
  let row: string[] = []
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      field = ''
      if (row.length > 1 || row[0] !== '') yield row
      row = []
    } else if (char !== '\r') {
      field += char
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    yield row
  }
}

function csvDir(): string {
  if (!existsSync(CACHE)) fail('No .fdc-cache. Run `pnpm fdc:fetch` first.')
  const unpacked = readdirSync(CACHE).find((name) => name.startsWith('FoodData_Central_sr_legacy'))
  if (!unpacked) fail('No unpacked SR Legacy directory in .fdc-cache. Run `pnpm fdc:fetch`.')
  return join(CACHE, unpacked)
}

async function fetchDataset(): Promise<void> {
  mkdirSync(CACHE, { recursive: true })
  console.log(`  downloading ${ZIP_URL}`)
  const response = await fetch(ZIP_URL)
  if (!response.ok) fail(`download failed: HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  writeFileSync(ZIP_PATH, bytes)
  console.log(`  wrote ${ZIP_PATH} (${(bytes.length / 1e6).toFixed(1)} MB)`)
  // `unzip` is a dev/CI dependency, not a runtime one. ubuntu-latest has it.
  execFileSync('unzip', ['-o', '-q', ZIP_PATH, '-d', CACHE], { stdio: 'inherit' })
  console.log(`  unpacked into ${CACHE}`)
  console.log('  next: pnpm fdc:build')
}

function build(): void {
  const dir = csvDir()
  const curatedJson = JSON.parse(
    readFileSync(join(ROOT, 'data', 'ingredients', 'curated.json'), 'utf8'),
  ) as { release: string; curatedOn: string; ingredients: CuratedIngredient[] }
  const curated = curatedJson.ingredients

  const wanted = new Map<number, CuratedIngredient>()
  for (const ingredient of curated) {
    if (wanted.has(ingredient.fdcId)) {
      fail(`fdcId ${ingredient.fdcId} is claimed by two curated ingredients.`)
    }
    wanted.set(ingredient.fdcId, ingredient)
  }

  // Pass 1 — descriptions, and proof every curated fdcId exists in the release.
  const descriptions = new Map<number, string>()
  for (const row of skipHeader(readCsv(join(dir, 'food.csv')))) {
    const fdcId = Number(row[0])
    if (wanted.has(fdcId)) descriptions.set(fdcId, String(row[2]))
  }
  const absent = curated.filter((ingredient) => !descriptions.has(ingredient.fdcId))
  if (absent.length > 0) {
    fail(
      `these curated ingredients have no entry in ${RELEASE}:\n` +
        absent.map((i) => `    ${i.id} (fdcId ${i.fdcId})`).join('\n') +
        '\n  A wrong fdcId must fail the build, not silently produce an empty row.',
    )
  }

  // Pass 2 — the long-format nutrient rows, projected down to the kept set.
  const keptByFdcNutrientId = new Map(NUTRIENTS.map((n) => [n.fdcId, n]))
  const values = new Map<number, Map<string, number>>()
  let scanned = 0
  for (const row of skipHeader(readCsv(join(dir, 'food_nutrient.csv')))) {
    scanned += 1
    const fdcId = Number(row[1])
    if (!wanted.has(fdcId)) continue
    const nutrient = keptByFdcNutrientId.get(Number(row[2]))
    if (!nutrient) continue
    const amount = Number(row[3])
    // An empty or non-finite amount is no value at all. Do not store it as 0.
    if (row[3] === '' || !Number.isFinite(amount)) continue
    let forFood = values.get(fdcId)
    if (!forFood) {
      forFood = new Map()
      values.set(fdcId, forFood)
    }
    forFood.set(nutrient.id, amount)
  }

  // Emit. Ingredients in curated order; nutrients in catalogue order.
  const nutrientIds = NUTRIENTS.map((n) => n.id)
  const packed = new Float32Array(curated.length * nutrientIds.length)
  const gaps: { ingredient: string; nutrients: string[] }[] = []

  curated.forEach((ingredient, rowIndex) => {
    const forFood = values.get(ingredient.fdcId) ?? new Map<string, number>()
    const missing: string[] = []
    nutrientIds.forEach((nutrientId, colIndex) => {
      const value = forFood.get(nutrientId)
      if (value === undefined) {
        // NaN is the encoding for "FDC has no value here". Decoded to undefined,
        // never to zero, and named as a gap wherever it is used.
        packed[rowIndex * nutrientIds.length + colIndex] = Number.NaN
        missing.push(nutrientId)
      } else {
        packed[rowIndex * nutrientIds.length + colIndex] = value
      }
    })
    if (missing.length > 0) gaps.push({ ingredient: ingredient.id, nutrients: missing })
  })

  const buffer = Buffer.from(packed.buffer, packed.byteOffset, packed.byteLength)
  const table = {
    $comment:
      'GENERATED by scripts/fdc-pipeline.ts. Do not edit by hand. values is a base64 Float32Array of ingredients × nutrients, row-major; NaN means FDC has no value and decodes to undefined, never to zero.',
    sourceId: 'fdc',
    release: RELEASE,
    releaseUrl: ZIP_URL,
    generatedOn: new Date().toISOString().slice(0, 10),
    checksum: createHash('sha256').update(buffer).digest('hex'),
    nutrientIds,
    ingredients: curated.map((ingredient) => ({
      id: ingredient.id,
      namaId: ingredient.namaId,
      nameEn: ingredient.nameEn,
      fdcId: ingredient.fdcId,
      fdcDescription: descriptions.get(ingredient.fdcId),
      kategori: ingredient.kategori,
      ...(ingredient.catatan ? { catatan: ingredient.catatan } : {}),
    })),
    values: buffer.toString('base64'),
  }

  writeFileSync(OUT_PATH, `${JSON.stringify(table, null, 2)}\n`)

  const bytes = readFileSync(OUT_PATH).length
  console.log(`  scanned    ${scanned.toLocaleString()} nutrient rows`)
  console.log(`  kept       ${curated.length} ingredients × ${nutrientIds.length} nutrients`)
  console.log(`  wrote      ${OUT_PATH} (${(bytes / 1024).toFixed(1)} KB)`)
  if (bytes > 200 * 1024) {
    fail(`emitted table is ${(bytes / 1024).toFixed(0)} KB — the 200 KB budget is a success criterion.`)
  }
  if (gaps.length > 0) {
    const total = gaps.reduce((sum, gap) => sum + gap.nutrients.length, 0)
    console.log(`  gaps       ${total} missing values across ${gaps.length} ingredients:`)
    for (const gap of gaps) {
      console.log(`               ${gap.ingredient}: ${gap.nutrients.join(', ')}`)
    }
    console.log('  These are recorded, not filled. They surface in any dish that uses them.')
  }
}

function* skipHeader(rows: Generator<readonly string[]>): Generator<readonly string[]> {
  let first = true
  for (const row of rows) {
    if (first) {
      first = false
      continue
    }
    yield row
  }
}

async function main(): Promise<void> {
  const command = process.argv[2]
  switch (command) {
    case 'fetch':
      await fetchDataset()
      break
    case 'build':
      build()
      break
    default:
      fail('usage: fdc-pipeline.ts <fetch|build>')
  }
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)))
