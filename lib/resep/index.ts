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

import ayamBakarKecap from '@/data/recipes/ayam-bakar-kecap.json'
import ayamGorengKuning from '@/data/recipes/ayam-goreng-kuning.json'
import bakwanSayur from '@/data/recipes/bakwan-sayur.json'
import buburAyam from '@/data/recipes/bubur-ayam.json'
import capcay from '@/data/recipes/capcay.json'
import esJerukNipis from '@/data/recipes/es-jeruk-nipis.json'
import gadoGado from '@/data/recipes/gado-gado.json'
import gulaiIkanKembung from '@/data/recipes/gulai-ikan-kembung.json'
import karedok from '@/data/recipes/karedok.json'
import kolakPisang from '@/data/recipes/kolak-pisang.json'
import miGoreng from '@/data/recipes/mi-goreng.json'
import nasiGoreng from '@/data/recipes/nasi-goreng.json'
import nasiKuning from '@/data/recipes/nasi-kuning.json'
import nasiLiwet from '@/data/recipes/nasi-liwet.json'
import nasiPutih from '@/data/recipes/nasi-putih.json'
import nasiUduk from '@/data/recipes/nasi-uduk.json'
import oporAyam from '@/data/recipes/opor-ayam.json'
import orekTempe from '@/data/recipes/orek-tempe.json'
import pecelLele from '@/data/recipes/pecel-lele.json'
import pepesIkanNila from '@/data/recipes/pepes-ikan-nila.json'
import perkedelKentang from '@/data/recipes/perkedel-kentang.json'
import pisangGoreng from '@/data/recipes/pisang-goreng.json'
import rendangDaging from '@/data/recipes/rendang-daging.json'
import sateAyam from '@/data/recipes/sate-ayam.json'
import sayurAsem from '@/data/recipes/sayur-asem.json'
import sayurBeningBayam from '@/data/recipes/sayur-bening-bayam.json'
import sayurLodeh from '@/data/recipes/sayur-lodeh.json'
import sayurSop from '@/data/recipes/sayur-sop.json'
import semurDaging from '@/data/recipes/semur-daging.json'
import sotoAyam from '@/data/recipes/soto-ayam.json'
import sotoBetawi from '@/data/recipes/soto-betawi.json'
import tahuIsi from '@/data/recipes/tahu-isi.json'
import telurBalado from '@/data/recipes/telur-balado.json'
import telurDadar from '@/data/recipes/telur-dadar.json'
import tempeGoreng from '@/data/recipes/tempe-goreng.json'
import terongBalado from '@/data/recipes/terong-balado.json'
import tumisKangkung from '@/data/recipes/tumis-kangkung.json'
import udangBalado from '@/data/recipes/udang-balado.json'
import urapSayur from '@/data/recipes/urap-sayur.json'
import wedangJahe from '@/data/recipes/wedang-jahe.json'

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
  nasiKuning,
  nasiLiwet,
  nasiGoreng,
  miGoreng,
  sotoAyam,
  sotoBetawi,
  buburAyam,
  gulaiIkanKembung,
  ayamGorengKuning,
  ayamBakarKecap,
  oporAyam,
  sateAyam,
  semurDaging,
  rendangDaging,
  pecelLele,
  pepesIkanNila,
  udangBalado,
  telurDadar,
  telurBalado,
  tempeGoreng,
  orekTempe,
  perkedelKentang,
  gadoGado,
  karedok,
  urapSayur,
  tumisKangkung,
  sayurBeningBayam,
  sayurAsem,
  sayurLodeh,
  sayurSop,
  capcay,
  terongBalado,
  pisangGoreng,
  bakwanSayur,
  tahuIsi,
  kolakPisang,
  esJerukNipis,
  wedangJahe,
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
