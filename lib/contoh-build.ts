/**
 * Builds the worked example's eleven outcomes. Server-side only: it loads the
 * ingredient table, the factor tables and every recipe, none of which belongs
 * in a browser bundle. The shape it returns lives in ./contoh, which imports no
 * data and is what the client component touches.
 */
import { compute } from '@/lib/nutrition/compute'
import { findRecipe } from '@/lib/resep'
import { findUnmatched, loadFdcTable } from '@/lib/sources/fdc/load'
import { formatFactor, formatGram, formatNutrient, unitLabel } from '@/lib/format'
import type { Locale } from '@/lib/i18n'
import { CONTOH, type DataContoh, type LangkahContoh } from '@/lib/contoh'

/** Build-time only. Called from a server component; never reaches the client. */
export function dataContoh(locale: Locale): DataContoh | undefined {
  const recipe = findRecipe(CONTOH.dish)
  if (!recipe) return undefined

  const table = loadFdcTable()
  const unmatched = { get: findUnmatched }
  const awalG = recipe.bahan.find((b) => b.ingredientId === CONTOH.bahan)?.beratG ?? CONTOH.minG

  const langkah: LangkahContoh[] = []
  for (let beratG = CONTOH.minG; beratG <= CONTOH.maxG; beratG += CONTOH.stepG) {
    const trace = compute({
      recipe,
      table,
      unmatched,
      beratOverrideG: { [CONTOH.bahan]: beratG },
    })
    const total = trace.totals.find((entry) => entry.nutrientId === CONTOH.nutrient)
    const santan = total?.contributions.find((c) => c.ingredientId === CONTOH.bahan)
    if (!total || !santan) return undefined

    const num = (value: number) => formatNutrient(value, CONTOH.nutrient, locale)
    langkah.push({
      beratG,
      beratLabel: formatGram(beratG, locale),
      bagi100: formatFactor(beratG / 100, locale),
      per100: num(santan.per100),
      sumbangan: num(santan.total),
      total: num(total.total),
    })
  }

  return { unit: unitLabel(CONTOH.nutrient), awalG, langkah }
}
