/**
 * Recipe loading and validation. Invariant 10: recipes are authored data, each
 * cited to a source or explicitly marked as own composition — the schema makes
 * that non-optional rather than a convention.
 *
 * Recipes are imported statically so the export has no filesystem or network
 * dependency at runtime.
 */
import { z } from 'zod'
import type { Recipe } from '@/lib/nutrition/trace'

import ayamGorengKuning from '@/data/recipes/ayam-goreng-kuning.json'
import gadoGado from '@/data/recipes/gado-gado.json'
import nasiPutih from '@/data/recipes/nasi-putih.json'
import nasiUduk from '@/data/recipes/nasi-uduk.json'
import pecelLele from '@/data/recipes/pecel-lele.json'
import perkedelKentang from '@/data/recipes/perkedel-kentang.json'
import sayurBeningBayam from '@/data/recipes/sayur-bening-bayam.json'
import semurDaging from '@/data/recipes/semur-daging.json'
import sotoAyam from '@/data/recipes/soto-ayam.json'
import telurDadar from '@/data/recipes/telur-dadar.json'
import tempeGoreng from '@/data/recipes/tempe-goreng.json'
import tumisKangkung from '@/data/recipes/tumis-kangkung.json'

const IdSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'ids are lowercase and hyphenated')
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dates are ISO yyyy-mm-dd')

const YieldRefSchema = z.union([
  z.object({ kind: z.literal('derived'), id: z.string().min(1) }),
  z.object({ kind: z.literal('usda'), code: z.string().min(1) }),
])

const PengolahanSchema = z.object({
  labelId: z.string().min(1),
  labelEn: z.string().min(1),
  yieldRef: YieldRefSchema.optional(),
  retentionCode: z.string().min(1).optional(),
})

const BahanSchema = z.object({
  ingredientId: IdSchema,
  beratG: z.number().positive('gram weights are positive'),
  // Not defaulted. A weight is either measured or stated as an estimate, and
  // the UI colours the two differently (PRD §9).
  provenance: z.enum(['ditimbang', 'perkiraan']),
  pengolahan: PengolahanSchema.optional(),
  catatan: z.string().optional(),
})

const SumberSchema = z.union([
  z.object({ type: z.literal('own-composition'), catatan: z.string().min(1) }),
  z.object({ type: z.literal('citation'), sumber: z.string().min(1), url: z.string().url().optional() }),
])

export const RecipeSchema = z.object({
  id: IdSchema,
  namaId: z.string().min(1),
  nameEn: z.string().min(1),
  deskripsiId: z.string().min(1),
  kategori: z.string().min(1),
  porsi: z.number().int().positive(),
  bahan: z.array(BahanSchema).min(1),
  sumber: SumberSchema,
  ditulisPada: DateSchema,
})

const RAW_RECIPES: readonly unknown[] = [
  nasiPutih,
  nasiUduk,
  gadoGado,
  sotoAyam,
  ayamGorengKuning,
  semurDaging,
  pecelLele,
  tempeGoreng,
  telurDadar,
  perkedelKentang,
  tumisKangkung,
  sayurBeningBayam,
]

function parseAll(): readonly Recipe[] {
  const recipes = RAW_RECIPES.map((raw, index) => {
    const result = RecipeSchema.safeParse(raw)
    if (!result.success) {
      throw new Error(
        `Resep ke-${index + 1} tidak lolos skema:\n${result.error.issues
          .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
          .join('\n')}`,
      )
    }
    return result.data as Recipe
  })
  const ids = new Set<string>()
  for (const recipe of recipes) {
    if (ids.has(recipe.id)) throw new Error(`Id resep ganda: "${recipe.id}".`)
    ids.add(recipe.id)
  }
  return recipes
}

export const RECIPES: readonly Recipe[] = parseAll()

export function findRecipe(id: string): Recipe | undefined {
  return RECIPES.find((recipe) => recipe.id === id)
}

export function recipeIds(): readonly string[] {
  return RECIPES.map((recipe) => recipe.id)
}

export function recipesByKategori(): ReadonlyMap<string, readonly Recipe[]> {
  const byKategori = new Map<string, Recipe[]>()
  for (const recipe of RECIPES) {
    const existing = byKategori.get(recipe.kategori)
    if (existing) existing.push(recipe)
    else byKategori.set(recipe.kategori, [recipe])
  }
  return byKategori
}
