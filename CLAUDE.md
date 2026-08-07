# CLAUDE.md — Gizi Masakan

Nutrition for Indonesian dishes, with the assumed recipe shown and editable. Built on USDA FoodData Central (public domain), with authored recipes and a self-measured URT portion table. Static site, GitHub Pages, no backend, no runtime network.

Read `PRD.md` before starting any task — **§3 and §5 in particular**. It fixes scope; this file describes how to work in the repo.

**Four things shape everything:**

1. **This is a reference tool, not a tracker.** No daily totals, no calorie budgets, no streaks, no weight, no good/bad food framing. Trackers can do real harm to people with disordered eating, and the difference is entirely in the framing. Reject any feature that adds logging or budgeting — see PRD §5.
2. **Never silently drop a missing value.** An ingredient with no data, or a nutrient with no value, must be **named as a gap in the output**. Quietly omitting it understates the dish and the number still looks plausible. This is the most dangerous failure mode the project has.
3. **TKPI is off-limits.** It is a copyrighted Kemenkes book with an all-rights-reserved notice, outside the UU 28/2014 Pasal 42 exemptions. The adapter exists and ships disabled behind the licence gate. **Never enable it or paste its values in.**
4. **The recipe is the answer, not a footnote.** A dish's nutrition is an estimate with a stated recipe. Show it, make it editable, and let the numbers move.

---

## Stack

- Next.js 14, App Router, `output: 'export'` — static only
- TypeScript, `strict: true`
- Tailwind CSS
- Zod for data schema validation
- Vitest
- pnpm
- **No nutrition or food-database library.** Fonts via `next/font`, self-hosted.

## Commands

```bash
pnpm dev
pnpm build                  # static export to ./out; runs data:validate first
pnpm preview                # serve ./out under the production basePath
pnpm test                   # vitest watch
pnpm test:run               # vitest once — before every commit
pnpm test:conservation      # contribution sums, mass balance
pnpm test:gaps              # missing-value handling, both directions
pnpm fdc:fetch              # DEV/CI — download FDC SR Legacy bulk CSV
pnpm fdc:build              # filter to curated list, project nutrients, write binary
pnpm factors:fetch          # DEV/CI — download the two USDA public-domain factor tables
pnpm factors:build          # transcribe them, derive rice/vegetable yields
pnpm data:validate          # licence gate, FDC ids, citations, URT dates, recipe refs
pnpm typecheck
pnpm lint
```

`pnpm data:validate` gates the build and CI. `fdc:*` and `factors:*` are development and scheduled-CI only — never part of `pnpm build`, never in the browser bundle. `factors:fetch` needs `poppler-utils` for `pdftotext`.

## Layout

```
app/
  [locale]/                 # id (default), en
    masakan/                # dish lookup + plate + recipe strip
    bahan/                  # ingredient browser
    metode/                 # method disclosure
components/
  plate/                    # dish card, headline nutrients
  strip/                    # recipe rows, gram inputs, contribution bars
  adequacy/                 # AKG fills
  trace/                    # per-nutrient derivation
lib/
  sources/
    fdc/                    # FDC CSV → IngredientTable. Enabled.
    tkpi/                   # adapter. DISABLED behind the licence gate.
    normalise.ts            # any source → IngredientTable
    manifest.ts             # licence declarations + gate
  nutrition/                # THE CORE. Pure. No DOM, no React, no clock.
    compute.ts              # recipe → NutritionTrace
    yield.ts                # cooking weight change
    retention.ts            # nutrient retention factors
    gaps.ts                 # missing-value detection and naming
    trace.ts                # NutritionTrace types
  portion/                  # URT → grams
  akg/                      # requirement lookup by age/sex
scripts/
  fdc-pipeline.ts           # DEV/CI — fetch, filter, project, emit
data/
  ingredients/              # curated list + projected binary + manifest
  recipes/                  # authored, each cited or marked own composition
  urt/                      # measured portion weights, each with a date
  factors/                  # yield + retention, each cited to FAO/INFOODS
  akg/                      # Permenkes tables, cited
tests/
  conservation/
  gaps/
  akg/
```

## Invariants

1. **`lib/nutrition` is pure and deterministic.** `(recipe, portion, table, factors) → NutritionTrace`. No DOM, no React, no clock, no randomness, no module-level mutable state. Must run in Node.

2. **Gaps are named, never silent.** A missing ingredient, a missing nutrient value, or a missing factor produces an entry in `trace.gaps` and is surfaced in the UI. **Never substitute zero, never omit the row, never fall back to a similar ingredient.** A dish with gaps still shows its totals — labelled incomplete.

3. **Retention has exactly two states.** A nutrient is either factor-adjusted with the factor cited, or explicitly marked unadjusted. There is no implicit "assume full retention" — that is a silent assumption and it is banned.

4. **Contribution conservation.** Per-ingredient contributions sum to the dish total for every nutrient, to the stated rounding. Asserted in every test, not just its own suite.

5. **Mass balance.** Cooked weight equals raw weight times the yield factor. Rice roughly triples, meat loses. A recipe that doesn't balance is a bug.

6. **The ingredient source is a pluggable adapter, and nothing downstream branches on provenance.** `fdc` and `tkpi` both emit `IngredientTable`. Compute, render, and test never know which produced it.

7. **The licence gate runs before any adapter.** `data/ingredients/manifest.json` declares each source's licence. The build refuses a source whose licence is absent or unresolved. **TKPI is recorded as excluded with its reason. Do not remove the entry, do not enable the adapter, do not add a path around the gate.**

8. **Every ingredient carries an FDC id.** Every factor, URT weight, and AKG value carries a citation and a date. Validator-enforced.

9. **URT weights are measured, not estimated.** Each entry records the gram weight and the date it was measured. If it was not weighed, it does not go in the table.

10. **Recipes are authored data.** Each is cited to a source or explicitly marked as own composition. Never scraped, never copied from a copyrighted cookbook.

11. **No tracking primitives anywhere.** No daily total, no running sum across dishes, no "remaining", no logging store, no date-keyed consumption records, no streak counter. If a type or a route implies accumulation across a day, it does not belong here.

12. **No weight, BMI, or weight-goal anything.** Not in the model, not in the UI, not in the copy.

13. **Energy is one nutrient among many.** It may appear first in reading order but must not be styled as the headline number with others subordinate.

14. **Terracotta marks user-edited and estimated values; chip grey marks gaps and unadjusted nutrients; leaf green is adequacy fill only.** Colour carries the honesty distinction — see PRD §9.

15. **Raw FDC CSVs are never committed.** The pipeline emits a projected binary; the CSVs stay out of the repo. Shipped ingredient data stays under 200 KB.

16. **Zero network requests at runtime.** No API, no font CDN, no analytics. Everything bundled.

17. **Nothing is computed in a component.** Components render a `NutritionTrace`.

## Working style

- **Pipeline before engine.** M0 exists so the ingredient table's shape is settled before compute depends on it.
- **Write `gaps.ts` early, not late.** Gap handling is not an edge case here; it is the correctness story. Build it with the first recipe, not after forty.
- **Weigh things.** URT entries and recipe gram weights come from a kitchen scale, not from estimation. That measured data is the project's most defensible contribution.
- **Ship at ten dishes.** Ten honest, weighed, cited recipes beat forty guessed. M3 takes it to forty.
- **When a feature request implies logging, decline it and say why.** Daily totals, budgets, and streaks are not deferred — they are out.
- **Never paste a value from TKPI, a cookbook, or another app.** If you need a number and don't have a licensed source, record the gap.
- **Don't touch `next.config.js`, the Actions workflow, `data:validate`, or the licence manifest without saying so explicitly.**
- **Never weaken a test or the validator to make something pass.**

## Conventions

- Named exports; defaults only where Next requires them.
- Discriminated unions for trace entries, gaps, and results, keyed on `type`. Exhaustive `switch` with a `never` default.
- No `any`. No non-null `!` in `lib/nutrition`.
- Masses are grams as `number`, named `*G`. Nutrient values are per-100g in the table and absolute in the trace — never let the two mix; name them `per100` and `total` explicitly.
- Indonesian kitchen vocabulary in identifiers and UI: `bahan`, `takaran`, `porsi`, `centong`, `potongSedang`, `masakan`. Do not substitute English approximations.
- Nutrient ids follow FDC nutrient numbers, with a local label map.
- Recipe and dish ids stable and readable: `gado-gado`, `soto-betawi`, `nasi-uduk`. They appear in URLs.
- Comments cite the FAO/INFOODS table or the Permenkes article they implement.
- Tabular numerals on every gram weight, nutrient value, and percentage.
- Tailwind utilities inline; semantic tokens in `tailwind.config.ts` — `enamel`, `rim`, `ink`, `edited`, `adequate`, `chip`. Never raw hex in components.

## Testing rules

- `pnpm test:run` before every commit; `pnpm test:conservation` and `pnpm test:gaps` before any commit touching `lib/nutrition` or the ingredient pipeline.
- **Contribution conservation is asserted in every test in every suite**, not only its own.
- New recipe → mass balance, conservation, gap coverage, and a citation or own-composition marker.
- New ingredient → FDC id present, nutrient projection lossless for kept nutrients.
- New factor → citation, and a fixture showing the adjusted and unadjusted paths.
- Gap tests run both directions: incomplete recipe names the gap; complete recipe names none.
- AKG values asserted against transcription fixtures with the article cited.
- Determinism asserted on every trace.
- Bug fix → failing test first.

## Deployment

`main` builds and deploys via Actions; `data:validate` gates it. A scheduled workflow may refresh the FDC projection and commit the binary — **failing loudly rather than shipping data that does not validate**. `basePath` must match the repository name; `.nojekyll` must exist in `out/`. Verify with `pnpm preview` before pushing.

## Framing

The site states plainly that it is a personal project, that ingredient values are US-database approximations for Indonesian ingredients, that dish numbers are estimates from a stated recipe, and that it is not medical or dietary advice. The method page carries the full disclosure, including why TKPI is not used. No OIKN or government branding anywhere.

## Current state

**M2 shipped.** M0 through M4 are in: pipeline, engine, plate with inline recipe editing, ingredient browser, method page, AKG adequacy. 12 recipes, 70 ingredients, 94 tests, 28.3 KB of the 200 KB data budget.

Three things are deliberately incomplete, and each is stated in the product rather than hidden:

1. **Recipe gram weights are not weighed.** All marked `perkiraan`, rendered in terracotta. Changing one to `ditimbang` means replacing the number with a scale reading and dating it. This is the most valuable remaining work — see PRD §4.
2. **The URT table is empty.** Invariant 9 forbids unmeasured entries, so portions show in grams. `data/urt/takaran.json` carries the measuring protocol and the list of takaran to weigh.
3. **13 Indonesian ingredients have no source.** Recorded in `data/ingredients/unmatched.json`, still present in the recipes, named as gaps in every trace. **Do not resolve any of them from TKPI.**

Next, in order of value: weigh the URT table; weigh the existing recipes; then M3's remaining dishes toward forty. Local recipe saving (§6.6) is the one M5 feature not yet built.
