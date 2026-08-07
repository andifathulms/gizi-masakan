# PRD — Gizi Masakan

**Nutrition for Indonesian dishes, with the recipe it assumed shown right underneath — because there is no single correct nasi padang.**

| | |
|---|---|
| **Status** | Draft — pre-implementation |
| **Owner** | Andi Fathul Mukminin Salahuddin |
| **Type** | Personal portfolio project, open source, public utility |
| **Deployment** | GitHub Pages (static export, no server, no runtime network) |
| **Language** | Indonesian-first UI; English secondary |
| **Ingredient data** | USDA FoodData Central SR Legacy (US Government, public domain) |

*Name: plain and explanatory, as asked. English alternative: **Indonesian Nutrition**. Deliberately not "Calorie Tracker" or similar — the word "tracker" describes a different product, and the reasons are in §5.*

---

## 1. Problem

Every nutrition app in Indonesian hands is built on a foreign food database. Type "nasi padang" and you get nothing, or a US approximation of a rice dish that shares almost nothing with the thing on the plate. *Gado-gado*, *soto betawi*, *rendang*, *pecel*, *ketoprak* — either absent or wrong.

The apps that do carry Indonesian dishes have the opposite problem: **they give a single confident number with no working shown.** 550 kcal for gado-gado. Whose gado-gado? How much peanut sauce? Was the tempeh fried or boiled? The number is unfalsifiable, so it cannot be checked and cannot be corrected.

And every one of them is framed as a **tracker** — daily budgets, calories remaining, streaks. That framing suits weight loss and suits almost nothing else. Indonesia's actual nutrition problems are stunting and micronutrient deficiency far more than overconsumption, which means the useful question is *am I getting enough iron, enough protein* — not *have I stayed under my ceiling*.

## 2. Product thesis

**A dish's nutrition is an estimate with a stated recipe. Show the recipe.**

Search a dish, get the numbers, and immediately below them the exact ingredient list and gram weights that produced them. Change the santan from 50 g to 100 g and watch everything move. The editability is not a power feature — **it is how the tool tells the truth**, because the variance between two warungs' gado-gado is larger than any precision the app could claim.

Two consequences follow, and both are the same pattern used across this project family: expose the assumption rather than burying it, and frame the output as adequacy rather than as a limit.

## 3. Data — the licence position

**USDA FoodData Central is the ingredient source.** A US Government work, therefore public domain: no permission, no ambiguity, bulk downloads provided. The **SR Legacy** dataset (~7,800 items) is the comprehensive ingredient table and covers most of what Indonesian cooking uses — rice, coconut milk, tempeh, tofu, palm oil, chilli, most vegetables and fish. The **Branded** dataset (~1.9 million packaged products) is explicitly excluded.

**Values are US-database approximations for Indonesian ingredients, and the app says so.** Where a variety differs meaningfully — Indonesian rice cultivars, local fish species, kelapa parut versus desiccated coconut — the entry carries a note. This is the same posture as showing an excluded transit network rather than hiding it.

**TKPI cannot be used.** The Kemenkes *Tabel Komposisi Pangan Indonesia* would be the better source — it is Indonesian, authoritative, and covers local varieties. But it is published as a book (ISBN 9786233010368, 140 pages, named authors) with an explicit all-rights-reserved notice, and it is not a *peraturan perundang-undangan*, so it falls outside the copyright exemptions in UU 28/2014 Pasal 42. **A TKPI adapter exists in the codebase and ships disabled**, behind the licence gate, so that if permission is ever obtained the accuracy improves without touching anything else.

**AKG is clean.** The recommended-intake tables are a Permenkes — a regulation, squarely inside the Pasal 42 exemption. Transcribed and cited.

**Recipes and URT portions are your own work.** This is the important reframing: the content that carries the project is not a third-party database at all.

- **Recipes** — researched, weighed, and authored, each cited to a source or marked as your own composition.
- **URT (Ukuran Rumah Tangga)** — *one centong of rice, one potong sedang of ayam, one mangkuk of soto* — **measured on a kitchen scale and published as your own table.** It doesn't exist openly anywhere, it is unambiguously yours, and it is genuinely useful to other people building in this space.

**Yield and retention factors** come from FAO/INFOODS published tables, cited per operation.

## 4. Scope

**In:**

- Dish lookup with the recipe shown beneath
- Editable recipe — gram weights adjustable, everything recomputes
- URT portions as the primary unit, grams available
- AKG adequacy by age and sex group
- Visible computation trace per nutrient
- Curated ingredient browser with Indonesian names
- Local recipe saving to the device

**Out, and why:**

| | |
|---|---|
| Daily logging, totals, streaks | Turns a reference into a tracker. See §5. |
| Calorie budgets, deficit goals, weight targets | Same, more directly. |
| Barcode scanning, branded foods | 1.9 million FDC entries not needed; a different problem. |
| Accounts, sync, community recipes | Each requires a backend. |
| Meal planning | Scope creep that solves no data problem. |
| Any health or medical claim | Not a clinical tool and must not read as one. |

**v1 content target — this is the real work:**

- **~40 dishes**, spanning nasi, lauk, sayur, jajanan, minuman. Forty covers most of what people eat daily. Roughly three weekends of cooking, weighing, and recording — the part that cannot be automated, and therefore the part that is defensible.
- **~400 ingredients** curated from FDC SR Legacy and mapped to Indonesian names.
- **A measured URT table.**
- **AKG tables** transcribed from the Permenkes.
- **Yield and retention factors** from FAO/INFOODS.

## 5. Framing — binding

A nutrition tool becomes a calorie-restriction tool almost by default, and calorie-restriction tools can be actively harmful to people with disordered eating. The difference is entirely in the framing, so the framing is a specification, not a preference.

- **Reference and lookup, never tracking-and-budgeting.** No daily total, no "calories remaining", no streaks, no logging.
- **Adequacy, not ceilings.** AKG comparison answers *am I getting enough* — protein, iron, zinc, vitamin A. Never *have I exceeded*.
- **No weight framing anywhere.** No BMI, no weight goals, no weight-loss language, in the interface or the copy.
- **No ranking of foods as good or bad.** Numbers with context, never judgement.
- **Energy is one nutrient among many**, presented alongside the others rather than as the headline.

The site states plainly that it is a personal project, that values are estimates from a US database, and that it is not medical or dietary advice.

## 6. Features

### 6.1 The plate — signature view
A dish, its portion in URT, and its nutrition. Directly beneath, **the recipe strip**: one row per ingredient with its gram weight and a proportional bar showing its contribution to the currently selected nutrient. Switch nutrient and the bars re-rank — so *"most of the calories here are the santan"* becomes something you see rather than something you're told.

Gram weights are editable inline. Totals, bars, and adequacy move as you type.

### 6.2 Portions in URT
The primary unit. Grams available for anyone who wants them. Every URT entry states the gram weight it maps to and the date it was measured.

### 6.3 Adequacy
Per nutrient, against AKG for a selected age and sex group. Rendered as *how much of the requirement this contributes* — a filled proportion, not a consumed-from-budget bar.

### 6.4 The computation trace
Tap any nutrient total: which ingredient contributed what, at which gram weight, from which FDC entry, with which yield and retention factor applied. Every number traceable to its source in one step.

### 6.5 Ingredient browser
The curated FDC subset with Indonesian names, FDC ids, and variety notes where the US entry is an imperfect match.

### 6.6 Local recipes
Save your own version of a dish, or a new one, to the device. localStorage or IndexedDB. Nothing leaves the browser, ever.

### 6.7 Method disclosure
Which FDC release, which nutrients kept, which yield and retention factors, how URT weights were measured, what TKPI would add and why it isn't used. Linked from the plate, not buried.

## 7. Architecture

Static Next.js 14 App Router export. No backend, **no runtime network requests**.

```
dish + portion
  → recipe (grams per ingredient)
  → ingredient lookup (FDC subset)
  → yield + retention factors
  → NutritionTrace  →  plate | recipe strip | adequacy | trace
```

**The ingredient source is a pluggable adapter.** `lib/sources/fdc` ships enabled; `lib/sources/tkpi` ships **disabled behind the licence gate**. Both normalise to one internal `IngredientTable`; nothing downstream branches on provenance. Same pattern as the transit project, for the same reason.

**Build-time pipeline, not runtime.** A dev/CI script downloads the FDC bulk CSV, filters to the curated ingredient list, projects down to ~25 nutrients, and writes a compact binary into `data/`. The FDC CSVs are normalised long-format — one row per food per nutrient — so a million-plus rows collapse to roughly **400 items × 25 nutrients ≈ 100 KB** as typed arrays. Raw CSVs are never committed.

**The engine is pure.** `(recipe, portion, ingredientTable, factors) → NutritionTrace`. No DOM, no React, no clock, no network.

**Refuse rather than silently drop.** A recipe containing an ingredient with no data, or a nutrient with no value for an ingredient, **names the gap in the output**. Quietly omitting it understates the dish — which is the single most dangerous failure mode a nutrition calculator has, because the number still looks plausible.

**Retention factors apply only where published.** Nutrients without a factor pass through unchanged and are **marked as unadjusted**, never silently treated as fully retained.

## 8. Testing

**Contribution conservation.** The sum of per-ingredient contributions equals the dish total for every nutrient, to the stated rounding. Asserted on every recipe in every test.

**Mass balance.** Cooked weight equals raw weight times the yield factor. Rice roughly triples; meat loses. A recipe whose weights don't balance is a bug.

**Gap coverage, both directions.** A recipe with a missing ingredient value must produce a named gap; a complete recipe must produce none.

**Retention marking.** Every nutrient in the output is either factor-adjusted with the factor cited, or explicitly marked unadjusted. No third state.

**Pipeline integrity at build time.** Every ingredient carries an FDC id; the nutrient projection is lossless for kept nutrients; every recipe references only ingredients present in the table; every URT entry has a measured weight and a date; every yield and retention factor has a citation. The build fails otherwise.

**AKG transcription fixtures**, asserted against the Permenkes tables with the article cited.

**Determinism.** Same recipe, portion, table, and factors produce a byte-identical trace.

## 9. Design direction

The material world is **enamelware** — the cream *piring kaleng* with its dark rim, chipped at the edges, on every warung table in the country. Warm, utilitarian, unmistakably Indonesian, and it carries a data-dense layout without fighting it.

**Palette.** Enamel cream `#F2EFE6` as ground. Rim blue `#2C4E6B` for structure, headings, and borders — the dark edge of the plate. Ink `#24221D` for text. **Terracotta `#B0563A` reserved for values the user has edited and for stated estimates** — the honesty colour, so an adjusted recipe is visibly the user's rather than the app's. **Leaf green `#4F7A4A` for adequacy fills.** Chip grey `#7A776E` for gaps, missing data, and unadjusted nutrients — present but visibly incomplete.

**Type.** **Zilla Slab** for display and dish names — a warm slab with a menu-board register. **Figtree** for prose and controls. **Roboto Mono** with tabular figures for every gram weight, nutrient value, and percentage; these change as the user edits and must not reflow.

**Structure.** The plate sits at the top with the portion and the headline nutrients; the recipe strip runs full width beneath it, one row per ingredient, right-aligned numerals with the contribution bar extending from the gram weight. The rim motif is a real border on the plate card, not applied decoratively elsewhere.

**Motion.** One orchestrated moment: editing a gram weight, and every bar, total, and adequacy fill moving together. Nothing else animates.

**Copy.** Indonesian first, in the vocabulary of a kitchen — *bahan*, *takaran*, *porsi*, *centong*, *potong sedang*. Estimates stated plainly: *"Angka ini dari resep di bawah. Ubah takarannya kalau resep Anda berbeda."*

## 10. Milestones

| | | |
|---|---|---|
| **M0** | Pipeline | Scaffold; FDC download, filter, and projection script; curated ingredient list v1; licence manifest with TKPI recorded as excluded; build-time validation. |
| **M1** | Engine | Recipe computation, yield and retention factors, gap handling, trace. Conservation and mass-balance tests green. Console only. |
| **M2** | The plate | **Ten dishes**, lookup, plate view, recipe strip, method page. **Ship publicly here** — ten honest dishes beat forty guessed ones. |
| **M3** | Content + editing | Forty dishes, inline recipe editing, measured URT table. |
| **M4** | Adequacy | AKG tables, age and sex groups, adequacy view. |
| **M5** | Depth | Ingredient browser, local recipe saving, sharing, a11y polish. |

## 11. Success criteria

- Contribution sums equal dish totals for every nutrient across every recipe.
- Mass balance holds for every recipe with a yield factor.
- No ingredient or nutrient is ever silently dropped — every gap is named in the output.
- Every ingredient carries an FDC id; every factor, URT weight, and AKG value carries a citation and date.
- No tracking, budgeting, weight, or good/bad-food framing anywhere in the product.
- Shipped ingredient data under 200 KB; zero network requests after first load.
- A user can go from a dish to seeing which ingredient drives its calories in one interaction.
- Fully offline after first load. JS ≤ 200 KB gzipped.

## 12. Deployment

`output: 'export'`, `basePath` matching the repository name, `images.unoptimized`, `trailingSlash: true`, `.nojekyll` in the output root. Ingredient data ships as a separate chunk. Pipeline validation gates the deploy. Fonts self-hosted via `next/font`. Verify under the production `basePath` with `pnpm preview` before pushing.

## 13. Risks

| Risk | Mitigation |
|---|---|
| **Silently dropping a missing ingredient understates a dish.** | Gaps are named in the output, asserted in both directions. The most dangerous failure here, because the number still looks right. |
| **US values are wrong for Indonesian varieties.** | Stated on the page and per-entry where it matters. TKPI adapter ready if permission ever arrives. |
| **Someone reintroduces TKPI data.** | Recorded in the licence manifest as excluded with the reason; the gate fails the build. |
| **Drifting into a calorie tracker.** | §5 is binding. No logging, no budgets, no weight, no streaks. Reject the feature request, not the framing. |
| **Recipe content stalls the project.** | Ship at ten dishes. Forty is M3, not a launch requirement. |
| **Retention factors quietly assumed.** | Unadjusted nutrients are explicitly marked. No third state. |
| **Scope creep into meal planning or logging.** | §4 is binding. |
