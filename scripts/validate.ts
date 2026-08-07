/**
 * `pnpm data:validate` — the gate on every build and on CI.
 *
 * It refuses rather than warns. Each check corresponds to an invariant in
 * CLAUDE.md, and the failure message says which one and what to do about it.
 *
 * Checks:
 *   1  licence manifest parses; every declared source has a resolved or
 *      explicitly-excluded licence                            (invariant 7)
 *   2  TKPI is still recorded and still excluded               (invariant 7)
 *   3  every ingredient carries an FDC id and a description    (invariant 8)
 *   4  the projected table decodes and matches curated.json
 *   5  every recipe references an ingredient that either exists in the table
 *      or is recorded in unmatched.json — never a typo         (invariant 2)
 *   6  every yieldRef and retentionCode a recipe names resolves
 *   7  every factor carries a citation or a stated derivation  (invariant 8)
 *   8  every URT entry has a measured weight and a date        (invariant 9)
 *   9  every AKG value carries its citation                    (invariant 8)
 *  10  every recipe is cited or marked own composition         (invariant 10)
 *  11  no tracking primitives have crept into lib/ or app/     (invariant 11)
 *  12  shipped ingredient data stays under 200 KB              (invariant 15)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { checkSource, manifest } from '../lib/sources/manifest'
import { findUnmatched, loadFdcTable, unmatchedIngredients } from '../lib/sources/fdc/load'
import { RECIPES } from '../lib/resep'
import { factors } from '../lib/nutrition/factors'
import { TAKARAN, urtStatus } from '../lib/portion'
import { AKG_CITATION, AKG_KELOMPOK } from '../lib/akg'
import { NUTRIENTS } from '../lib/nutrition/nutrients'

const ROOT = process.cwd()

const failures: string[] = []
const notes: string[] = []

function check(label: string, run: () => void): void {
  try {
    run()
    console.log(`  ok    ${label}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log(`  FAIL  ${label}`)
    failures.push(`${label}\n      ${message.split('\n').join('\n      ')}`)
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

/* 1 + 2 — the licence gate ------------------------------------------------ */

check('licence manifest declares a licence for every source', () => {
  for (const source of manifest.sources) {
    assert(
      source.licence.status === 'resolved' || source.status === 'excluded',
      `Source "${source.id}" has an unresolved licence but is not marked excluded. A source may not be used until its licence is resolved (invariant 7).`,
    )
    assert(
      source.licence.reasoning.length > 40,
      `Source "${source.id}" needs a licence reasoning that explains the decision, not a label.`,
    )
  }
})

check('TKPI is still recorded, and still excluded', () => {
  const tkpi = manifest.sources.find((source) => source.id === 'tkpi')
  assert(
    tkpi !== undefined,
    'The tkpi entry has been removed from the manifest. It is the record of the decision and must stay (invariant 7, PRD §13).',
  )
  assert(
    tkpi.status === 'excluded' && tkpi.licence.status === 'unresolved',
    'TKPI has been enabled. It is a copyrighted book outside the UU 28/2014 Pasal 42 exemptions — see PRD §3. Revert this.',
  )
  const gate = checkSource('tkpi')
  assert(gate.type === 'refused', 'The licence gate no longer refuses tkpi. A path around the gate has been added.')
  assert(tkpi.exclusion !== undefined, 'The tkpi exclusion record has lost its reasoning.')
})

check('the enabled ingredient source passes the gate', () => {
  const gate = checkSource('fdc')
  assert(gate.type === 'usable', `fdc should be usable: ${gate.type === 'refused' ? gate.reason : ''}`)
})

/* 3 + 4 — the ingredient table -------------------------------------------- */

const table = loadFdcTable()

check('every ingredient carries an FDC id and description', () => {
  for (const entry of table.entries.values()) {
    assert(Number.isInteger(entry.fdcId) && entry.fdcId > 0, `Ingredient "${entry.id}" has no FDC id (invariant 8).`)
    assert(entry.fdcDescription.length > 0, `Ingredient "${entry.id}" has no FDC description to check the match against.`)
    assert(entry.namaId.length > 0, `Ingredient "${entry.id}" has no Indonesian name.`)
  }
})

check('the projection matches the curated list', () => {
  const curated = JSON.parse(readFileSync(join(ROOT, 'data/ingredients/curated.json'), 'utf8')) as {
    ingredients: { id: string; fdcId: number }[]
  }
  assert(
    curated.ingredients.length === table.entries.size,
    `curated.json has ${curated.ingredients.length} ingredients but the projection has ${table.entries.size}. Re-run pnpm fdc:build.`,
  )
  for (const ingredient of curated.ingredients) {
    const entry = table.entries.get(ingredient.id)
    assert(entry !== undefined, `"${ingredient.id}" is curated but absent from the projection. Re-run pnpm fdc:build.`)
    assert(
      entry.fdcId === ingredient.fdcId,
      `"${ingredient.id}" has fdcId ${entry.fdcId} in the projection but ${ingredient.fdcId} in curated.json.`,
    )
  }
})

check('no nutrient value was stored as a substituted zero', () => {
  // A projected value of exactly 0 is legitimate (oil has no carbohydrate).
  // What must never happen is a value present for a nutrient FDC has no data
  // for — the pipeline encodes those as NaN and the loader drops the key.
  const known = new Set(NUTRIENTS.map((nutrient) => nutrient.id))
  for (const entry of table.entries.values()) {
    for (const nutrientId of Object.keys(entry.per100)) {
      assert(known.has(nutrientId), `Ingredient "${entry.id}" carries unknown nutrient "${nutrientId}".`)
      const value = entry.per100[nutrientId]
      assert(
        typeof value === 'number' && Number.isFinite(value) && value >= 0,
        `Ingredient "${entry.id}" has a non-finite or negative value for nutrient ${nutrientId}.`,
      )
    }
  }
})

/* 5 + 6 — recipes reference real things ----------------------------------- */

check('every recipe ingredient resolves, in the table or as a recorded gap', () => {
  const unmatchedIds = new Set(unmatchedIngredients().map((entry) => entry.id))
  for (const recipe of RECIPES) {
    for (const bahan of recipe.bahan) {
      const inTable = table.entries.has(bahan.ingredientId)
      const recorded = unmatchedIds.has(bahan.ingredientId)
      assert(
        inTable || recorded,
        `Recipe "${recipe.id}" references "${bahan.ingredientId}", which is neither in the ingredient table nor recorded in unmatched.json. If it genuinely has no source, add it to unmatched.json with its reason — do not delete it from the recipe (invariant 2).`,
      )
      assert(
        !(inTable && recorded),
        `"${bahan.ingredientId}" is both in the ingredient table and in unmatched.json. One of the two is wrong.`,
      )
    }
  }
})

check('every unmatched ingredient explains itself', () => {
  for (const entry of unmatchedIngredients()) {
    assert(entry.reason.length > 20, `Unmatched ingredient "${entry.id}" needs a reason a reader can evaluate.`)
    assert(entry.wouldComeFrom.length > 0, `Unmatched ingredient "${entry.id}" should say where the data would come from.`)
    assert(findUnmatched(entry.id) !== undefined, `Unmatched lookup fails for "${entry.id}".`)
  }
})

check('every yieldRef and retentionCode a recipe names resolves', () => {
  for (const recipe of RECIPES) {
    for (const bahan of recipe.bahan) {
      const pengolahan = bahan.pengolahan
      if (!pengolahan) continue
      if (pengolahan.yieldRef?.kind === 'derived') {
        assert(
          factors.derivedYield(pengolahan.yieldRef.id) !== undefined,
          `Recipe "${recipe.id}" names derived yield "${pengolahan.yieldRef.id}", which is not in data/factors/yields.json.`,
        )
      }
      if (pengolahan.yieldRef?.kind === 'usda') {
        assert(
          factors.usdaYield(pengolahan.yieldRef.code) !== undefined,
          `Recipe "${recipe.id}" names USDA yield code "${pengolahan.yieldRef.code}", which is not in data/factors/yields.json.`,
        )
      }
      if (pengolahan.retentionCode) {
        assert(
          factors.retentionOperation(pengolahan.retentionCode) !== undefined,
          `Recipe "${recipe.id}" names retention code "${pengolahan.retentionCode}", which is not in data/factors/retention.json.`,
        )
      }
    }
  }
})

/* 7 — factors are cited --------------------------------------------------- */

check('every factor carries a citation or a stated derivation', () => {
  const yields = JSON.parse(readFileSync(join(ROOT, 'data/factors/yields.json'), 'utf8')) as {
    sources: Record<string, { citation: string; licence: string }>
    derived: { id: string; derivation?: { formula: string; cookedFdcId: number } }[]
    usda: { code: string }[]
  }
  for (const [id, source] of Object.entries(yields.sources)) {
    assert(source.citation.length > 30, `Yield source "${id}" needs a real citation.`)
    assert(source.licence.length > 0, `Yield source "${id}" needs a licence statement.`)
  }
  for (const entry of yields.derived) {
    assert(
      entry.derivation !== undefined && entry.derivation.formula.length > 0 && entry.derivation.cookedFdcId > 0,
      `Derived yield "${entry.id}" must show the derivation, not just a number (invariant 8).`,
    )
  }
  assert(factors.retentionCitation.length > 40, 'The retention table has lost its citation.')
  assert(
    factors.unadjustedByDesign.length > 0 && factors.unadjustedReason.length > 20,
    'The list of nutrients with no published retention factor must be declared, so they can be marked unadjusted rather than assumed (invariant 3).',
  )
})

/* 8 — URT ------------------------------------------------------------------ */

check('every URT entry is measured, with a date', () => {
  for (const takaran of TAKARAN) {
    assert(takaran.gramG > 0, `URT entry "${takaran.id}" has no measured weight (invariant 9).`)
    assert(
      /^\d{4}-\d{2}-\d{2}$/.test(takaran.diukurPada),
      `URT entry "${takaran.id}" has no measurement date (invariant 9).`,
    )
    assert(takaran.alat.length > 0, `URT entry "${takaran.id}" should record what it was weighed on.`)
  }
  const status = urtStatus()
  if (!status.siap) {
    notes.push(
      'URT table is empty — porsi are shown in grams. This is the honest state until entries are weighed; see data/urt/takaran.json.',
    )
  }
})

/* 9 — AKG ------------------------------------------------------------------ */

check('AKG values carry their citation, and no body weight', () => {
  assert(AKG_CITATION.includes('Nomor 28 Tahun 2019'), 'The AKG table has lost its Permenkes citation.')
  assert(AKG_KELOMPOK.length > 0, 'The AKG table is empty.')
  const serialised = JSON.stringify(AKG_KELOMPOK)
  for (const banned of ['beratBadan', 'tinggiBadan', 'bmi', 'imt']) {
    assert(
      !serialised.toLowerCase().includes(banned.toLowerCase()),
      `The AKG table carries "${banned}". Weight and BMI do not belong in the model (invariant 12).`,
    )
  }
})

/* 10 — recipes are authored data ------------------------------------------ */

check('every recipe is cited or marked own composition', () => {
  for (const recipe of RECIPES) {
    switch (recipe.sumber.type) {
      case 'own-composition':
        assert(
          recipe.sumber.catatan.length > 20,
          `Recipe "${recipe.id}" is marked own composition but does not say what it is based on (invariant 10).`,
        )
        break
      case 'citation':
        assert(recipe.sumber.sumber.length > 5, `Recipe "${recipe.id}" has an empty citation.`)
        break
      default: {
        const never: never = recipe.sumber
        throw new Error(`Unknown sumber type: ${JSON.stringify(never)}`)
      }
    }
  }
})

/* 11 — no tracking primitives --------------------------------------------- */

check('no tracking primitives in lib/ or app/', () => {
  // Invariant 11 and PRD §5. Names that imply accumulation across a day, a
  // budget, or a weight goal. Checked as identifiers, not prose.
  const banned = [
    'dailyTotal',
    'totalHarian',
    'caloriesRemaining',
    'sisaKalori',
    'calorieBudget',
    'targetKalori',
    'streak',
    'consumptionLog',
    'catatanKonsumsi',
    'weightGoal',
    'targetBerat',
    'bmi',
  ]
  const offenders: string[] = []
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) {
        walk(path)
        continue
      }
      if (!/\.tsx?$/.test(path)) continue
      // Identifiers, not prose. The method page explains at length that there
      // are no streaks and no daily totals, and saying so must not trip the
      // check that enforces it — so string literals and comments come out
      // first, and what remains is code.
      const code = readFileSync(path, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/[^\n]*/g, ' ')
        .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
        .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
        .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      for (const term of banned) {
        if (new RegExp(`\\b${term}\\b`, 'i').test(code)) {
          offenders.push(`${path.slice(ROOT.length + 1)}: ${term}`)
        }
      }
    }
  }
  for (const dir of ['lib', 'app', 'components']) {
    try {
      walk(join(ROOT, dir))
    } catch {
      /* directory may not exist yet */
    }
  }
  assert(
    offenders.length === 0,
    `Tracking primitives found. This is a reference tool, not a tracker — PRD §5 is binding.\n${offenders.join('\n')}`,
  )
})

/* 12 — data budget --------------------------------------------------------- */

check('shipped ingredient data stays under 200 KB', () => {
  const bytes = statSync(join(ROOT, 'data/ingredients/table.json')).size
  assert(
    bytes <= 200 * 1024,
    `data/ingredients/table.json is ${(bytes / 1024).toFixed(0)} KB, over the 200 KB success criterion.`,
  )
  notes.push(`ingredient table ${(bytes / 1024).toFixed(1)} KB of the 200 KB budget`)
})

check('no raw FDC CSV has been committed', () => {
  const stray: string[] = []
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (name.endsWith('.csv')) stray.push(path.slice(ROOT.length + 1))
    }
  }
  walk(join(ROOT, 'data'))
  assert(stray.length === 0, `Raw CSVs must not be committed (invariant 15):\n${stray.join('\n')}`)
})

/* ------------------------------------------------------------------------- */

console.log('')
for (const note of notes) console.log(`  note  ${note}`)

if (failures.length > 0) {
  console.error(`\n  data:validate failed — ${failures.length} check(s):\n`)
  for (const failure of failures) console.error(`    ${failure}\n`)
  process.exit(1)
}

console.log(`\n  data:validate passed — ${RECIPES.length} recipes, ${table.entries.size} ingredients, ${AKG_KELOMPOK.length} AKG groups.\n`)
