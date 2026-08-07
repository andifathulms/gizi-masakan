# PORTFOLIO_CONTEXT — Gizi Masakan

Raw material for a client-facing case study. Facts below are taken from the repo as it stands (60 commits, all tests green, deployed).

---

## 1. One-line summary

A free Indonesian-language website that tells you the nutrition of Indonesian dishes — and shows you the exact recipe it used to get that number, so you can correct it if your kitchen does it differently.

## 2. The problem

Nutrition apps used in Indonesia run on foreign food databases. Search *nasi padang*, *gado-gado*, *soto betawi*, or *pecel* and you get nothing, or a US approximation of a dish that shares almost nothing with the thing on the plate.

The apps that *do* carry Indonesian dishes have the opposite failure: one confident number, no working shown. "550 kcal for gado-gado." Whose gado-gado? How much peanut sauce? Fried tempeh or boiled? The number can't be checked, so it can't be corrected.

And nearly all of them are framed as **trackers** — daily budgets, calories remaining, streaks. That framing suits weight loss and little else. Indonesia's actual nutrition burden is stunting and micronutrient deficiency far more than overconsumption, so the useful question is *am I getting enough iron and protein*, not *have I stayed under my ceiling*. Calorie-budget framing is also actively harmful to people with disordered eating.

**Who it's for:** Indonesian home cooks, students, dietetics and public-health people, and anyone who wants a nutrition figure they can audit rather than trust. Indonesian-first UI, English secondary.

## 3. My role

Sole author. Everything in the repo — product definition (`PRD.md`), data pipeline, computation engine, UI, tests, accessibility work, deployment — was built by me. No team, no inherited codebase.

**Used as-is (third-party, not my work):**
- **USDA FoodData Central SR Legacy** — the ingredient nutrient values. US Government work, public domain. I wrote the fetch/filter/projection pipeline over it; I did not author the values.
- **FAO/INFOODS + USDA yield and retention tables** — cooking weight-change and nutrient-loss factors, transcribed and cited per operation.
- **Permenkes 28/2019 AKG tables** — Indonesian recommended intakes, transcribed with the article cited.
- Framework and libraries: Next.js, React, Tailwind, Zod, Vitest.

**Authored by me as original content, not sourced:**
- **40 dish recipes** with per-ingredient gram weights and cooking methods, each cited or explicitly marked as own composition.
- The 70-ingredient curated list mapping FDC entries to Indonesian kitchen names, including a published list of the 13 ingredients FDC cannot supply.
- The URT (household-measure) measurement protocol.

## 4. Technical approach

**The recipe is the product, not a footnote.** Every dish page shows the ingredient list and gram weights directly beneath the numbers. The weights are editable inline, and the cooking method is switchable (fried → boiled), and everything — totals, contribution bars, adequacy fills — recomputes as you type. This isn't a power feature; it's how the tool tells the truth, because the variance between two warungs' gado-gado is larger than any precision the app could claim.

**Never silently drop a missing value.** The single most dangerous failure mode in a nutrition calculator is quietly omitting an ingredient it has no data for: the total still looks plausible but understates the dish. So missing ingredients, missing nutrient values, and missing factors each produce a named gap in the output and are surfaced in the UI. Totals still show — labelled incomplete. Tests assert this in both directions: an incomplete recipe must name its gap, a complete one must name none.

**Retention has exactly two states.** A nutrient is either factor-adjusted with the factor cited, or explicitly marked unadjusted. There is no implicit "assume full retention" — that would be a silent assumption wearing a number's clothes.

**A pure, deterministic engine.** `(recipe, portion, ingredientTable, factors) → NutritionTrace`. No DOM, no React, no clock, no randomness, no network. Components render a trace; nothing is computed in a component. That's what makes 282 tests possible and makes every number reproducible.

**Build-time data pipeline, zero runtime network.** A dev/CI script downloads the FDC bulk CSV (millions of long-format rows), filters to the curated list, projects to 29 nutrients, and writes a compact table into `data/`. Raw CSVs are never committed. The site makes **zero network requests at runtime** — no API, no font CDN, no analytics. Fully offline after first load.

**A licence gate that fails the build.** The obviously better ingredient source is TKPI (Kemenkes' Indonesian food composition table) — but it's a copyrighted book with an all-rights-reserved notice, outside the UU 28/2014 Pasal 42 exemption for regulations. So a TKPI adapter exists in the codebase and **ships disabled behind a licence gate**, with the exclusion and its legal reason recorded in the manifest. If permission ever arrives, accuracy improves without touching anything downstream — both adapters emit the same `IngredientTable` and nothing branches on provenance.

**Everything reader-visible lives in the URL.** Selected nutrient, per-portion toggle, AKG age/sex group, edited gram weights, cooking method, and the dish search are all query parameters — so a view survives a refresh and can be sent to someone. Component-only state for a reader-visible choice is treated as a bug. Every untrusted input (query strings, localStorage) is validated and never coerced: a negative, NaN, or non-numeric weight is dropped rather than silently turned into a plausible wrong number.

**Colour carries meaning, so it clears contrast.** Terracotta marks user-edited and estimated values; chip grey marks gaps and unadjusted nutrients; leaf green is adequacy fill only. Because the palette is load-bearing, every ink token clears WCAG AA 4.5:1 on both backgrounds — four hues set by eye failed and were darkened in place.

**Anti-tracking as an architectural constraint.** No daily totals, no running sums across dishes, no logging store, no date-keyed records. This is enforced by test: the saved-recipe store's keys are exactly `{id, dishId, nama, beratOverrideG}` and a stray timestamp is dropped on load.

## 5. Actual tech stack

From `package.json` — the dependency list is genuinely this short:

**Runtime dependencies (4):** Next.js 14.2.15 (App Router, `output: 'export'`), React 18.3.1, React DOM, Zod 3.23.8.

**Dev:** TypeScript 5.6 (`strict: true`), Tailwind CSS 3.4, Vitest 2.1, tsx, ESLint + eslint-config-next, PostCSS/Autoprefixer. pnpm 9.15.9.

**Notably absent:** no nutrition or food-database library, no charting library (contribution bars are CSS), no state library (URL + localStorage), no analytics, no CSS-in-JS, no UI kit. Fonts (Zilla Slab, Figtree) self-hosted via `next/font`.

**Infrastructure:** GitHub Actions → GitHub Pages static hosting. Two workflows: `deploy.yml` (build + deploy, gated by `data:validate`) and `refresh-fdc.yml` (scheduled FDC projection refresh that fails loudly rather than shipping unvalidated data). No backend, no database, no server.

## 6. Notable features

- **The plate** — dish, portion, and nutrition, with the recipe strip immediately beneath: one row per ingredient, gram weight, and a proportional bar showing its contribution to the currently selected nutrient. Switch nutrient and the bars re-rank, so *"most of the calories here are the santan"* becomes something you see rather than something you're told.
- **Inline recipe editing, including cooking method** — change santan from 50 g to 100 g, or switch an ingredient from fried to boiled, and totals, bars, and adequacy fills move together. The one orchestrated animation in the product.
- **Named gaps, never silent omissions** — a dedicated panel lists exactly which ingredients or nutrient values the dish is missing, with the total labelled incomplete rather than quietly wrong.
- **Per-nutrient computation trace** — tap a total and see which ingredient contributed what, at which gram weight, from which FDC entry, with which retention factor applied, plus the arithmetic stated explicitly (`berat ÷ 100 × nilai per 100 g × faktor retensi`) and a note showing where yield is *not* part of it.
- **AKG adequacy by age and sex group** — from Permenkes 28/2019, rendered as *how much of the requirement this contributes*, with the underlying requirement figure printed alongside the percentage. Never a consumed-from-budget bar.
- **Ingredient browser + method disclosure** — the curated FDC subset with Indonesian names, FDC ids, and variety notes; and a method page stating which FDC release, which nutrients are kept, how factors are applied, and why TKPI is not used.
- **Local recipe saving** — save your own version of a dish to the device. Nothing leaves the browser, ever.
- **Bilingual, static, offline** — id (default) and en routes, fully prerendered, zero runtime requests.

## 7. Challenges / tradeoffs

**The best data source is legally off-limits, and the response was architectural rather than a workaround.** TKPI would materially improve accuracy for Indonesian varieties. Rather than use it and hope, or ignore it, the project records it in the licence manifest as excluded *with the legal reason*, ships the adapter disabled, and makes the build fail if a source's licence is absent or unresolved. The exclusion is stated on the method page as product content, not hidden as a limitation.

**Breadth vs. weighing — and the git log records this as a deliberate, documented regression.** PRD §4 asks for weighed recipes; the M3 target asks for forty dishes. The commit `feat(resep): 28 more dishes, taking the catalogue to forty` is immediately followed by `docs: record forty dishes, and what got worse by reaching forty`. All 40 recipes' gram weights are currently **estimates, not scale readings** — every row marked `perkiraan` and rendered in terracotta so the reader can see it. The honest position taken in the docs is that this was the wrong trade against the PRD's own advice ("ten honest dishes beat forty guessed"), and weighing is now flagged as the highest-value remaining work.

**The URT table is deliberately, visibly empty.** The measured household-portion table (*centong*, *potong sedang*, *mangkuk*) was to be the project's most defensible original contribution. Invariant 9 forbids unmeasured entries — so rather than populate it from a published table or a guess, the file ships empty, carrying only the kitchen-scale measurement protocol and the list of takaran still to weigh. Portions currently display in grams. Choosing an empty table over a plausible one is the whole thesis of the project applied to itself.

**Two unresolved ingredients distort whole dishes, and each affected recipe says so.** 13 Indonesian ingredients have no FDC match, recorded in `unmatched.json` and named as gaps in every trace. Two bite hard: `gula-merah` leaves wedang jahe at 16 kcal a glass, and `kecap-manis` empties the sugar out of four dishes named after it. The fix is FDC curation, not a pasted value.

**A significant late accessibility and design-system pass.** Roughly a dozen consecutive commits rework contrast, focus rings, table keyboard scrolling, button naming, table captions, language declaration, and live-region announcement of the recomputation the plate performs silently. Four palette hues failed WCAG AA and were darkened in place. A third font family was carried for a while purely for tabular numerals and was dropped once `font-variant-numeric` on `html` proved sufficient — a font download removed for free.

**Performance choices visible in the log:** the worked example on the landing page was precomputed at build time rather than shipping four data tables to the client; the header mark was inlined instead of fetched; an unused font weight was un-preloaded.

## 8. Status

- **Live and public.** Deployed to GitHub Pages at **https://andifathulms.github.io/gizi-masakan/**, built and deployed from `main` via GitHub Actions.
- **Public repository:** https://github.com/andifathulms/gizi-masakan
- **Maturity:** shipped and functional, self-described in the product as a personal project. All six planned milestones (M0–M5) are implemented: pipeline, engine, plate with inline editing, ingredient browser, method page, AKG adequacy, URL state, dish search, local saving. Not a prototype — it validates, tests, and deploys — but the *data* is explicitly incomplete in three stated ways (§7), and the site says so rather than hiding it.
- The site states plainly that it is a personal project, that ingredient values are US-database approximations for Indonesian ingredients, that dish numbers are estimates from a stated recipe, and that it is not medical or dietary advice.

## 9. Metrics

| | |
|---|---|
| Commits | 60 |
| Time span | Single intensive build day — first commit 2026-08-07 09:21, last 2026-08-07 17:35 (~8 hours) |
| Application code | ~7,700 lines TypeScript/TSX |
| — `lib/` (engine, sources, state, i18n) | ~3,030 lines |
| — `components/` | ~1,520 lines |
| — `scripts/` (pipelines + validator) | ~1,110 lines |
| — `tests/` | ~1,160 lines |
| — `app/` (routes) | ~770 lines |
| Tests | **282 passing** across 9 suites — conservation, gaps, retention, determinism, AKG, cooking method, URL state, saved recipes, search |
| Dishes | 40 authored recipes |
| Ingredients | 70 curated from FDC SR Legacy (+13 documented as unmatched) |
| Nutrients tracked | 29, keyed by FDC nutrient number |
| Shipped ingredient data | 28.9 KB (`table.json`) against a 200 KB budget |
| Runtime dependencies | 4 |
| Runtime network requests | 0 |
| Prerendered pages | ~87 (2 locales × [40 dish pages + list + ingredient browser + method] + splash) |

## 10. Suggested screenshots

1. **The plate — signature view.** A dish with visible complexity, e.g. `/id/masakan/gado-gado/` or `/id/masakan/rendang-daging/`. Capture the nutrition block *and* the recipe strip beneath it in one frame, with contribution bars visible — this single image is the whole product thesis. Ideally a second frame mid-edit, with an edited gram weight rendered in terracotta.
   *Components:* [components/plate/Piring.tsx](components/plate/Piring.tsx), [components/strip/StripResep.tsx](components/strip/StripResep.tsx), route [app/[locale]/masakan/[id]/page.tsx](app/[locale]/masakan/[id]/page.tsx)

2. **The gaps panel on a dish that has real gaps** — `/id/masakan/wedang-jahe/` (the `gula-merah` case) or one of the four `kecap-manis` dishes. Shows the project's core correctness argument: the total is displayed *and* labelled incomplete, with the missing ingredient named in chip grey.
   *Component:* [components/plate/PanelKekosongan.tsx](components/plate/PanelKekosongan.tsx)

3. **The computation trace, expanded on one nutrient** — the derivation for energy or iron: contributing ingredients, gram weights, FDC ids, retention factors, and the stated arithmetic. Best evidence that every number is auditable in one interaction.
   *Component:* [components/trace/JejakNutrien.tsx](components/trace/JejakNutrien.tsx)

4. **Adequacy against AKG** — with an age/sex group selected, showing leaf-green fills and the underlying requirement figure printed beside each percentage. Use this to make the *adequacy, not budget* framing concrete.
   *Component:* [components/adequacy/Kecukupan.tsx](components/adequacy/Kecukupan.tsx)

5. *(Optional fifth)* **The landing / dish list** — `/id/masakan/` with the worked example and the search box, three nutrients per card. Good establishing shot for the enamelware visual identity (cream ground, rim blue, the *piring kaleng* motif as a real border on the plate card).
   *Components:* [components/masakan/ContohBerjalan.tsx](components/masakan/ContohBerjalan.tsx), [components/masakan/DaftarMasakan.tsx](components/masakan/DaftarMasakan.tsx)
