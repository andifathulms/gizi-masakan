/**
 * The nutrient catalogue. Ids are FDC nutrient numbers as strings, with a local
 * label map — the convention fixed in CLAUDE.md so an id is traceable straight
 * back to FoodData Central.
 *
 * `fdcId` is the FDC `nutrient.id` used inside the CSV join; `id` is the stable
 * nutrient number (`nutrient_nbr`) that appears in traces, URLs and tests.
 *
 * Energy is listed first because it is what people look for, not because it is
 * the headline. PRD §5: it is one nutrient among many and must not be styled as
 * dominant — see components/plate.
 */

export type NutrientUnit = 'kcal' | 'g' | 'mg' | 'µg'

export type NutrientGroup = 'energi' | 'makro' | 'mineral' | 'vitamin' | 'lain'

export interface NutrientDef {
  /** FDC nutrient number, e.g. '208' for energy. Stable across FDC releases. */
  readonly id: string
  /** FDC internal nutrient.id, used only by the build-time pipeline. */
  readonly fdcId: number
  readonly unit: NutrientUnit
  readonly labelId: string
  readonly labelEn: string
  readonly group: NutrientGroup
  /** Shown on the plate without opening the full list. */
  readonly headline: boolean
}

export const NUTRIENTS: readonly NutrientDef[] = [
  { id: '208', fdcId: 1008, unit: 'kcal', labelId: 'Energi', labelEn: 'Energy', group: 'energi', headline: true },
  { id: '203', fdcId: 1003, unit: 'g', labelId: 'Protein', labelEn: 'Protein', group: 'makro', headline: true },
  { id: '204', fdcId: 1004, unit: 'g', labelId: 'Lemak total', labelEn: 'Total fat', group: 'makro', headline: true },
  { id: '606', fdcId: 1258, unit: 'g', labelId: 'Lemak jenuh', labelEn: 'Saturated fat', group: 'makro', headline: false },
  { id: '205', fdcId: 1005, unit: 'g', labelId: 'Karbohidrat', labelEn: 'Carbohydrate', group: 'makro', headline: true },
  { id: '291', fdcId: 1079, unit: 'g', labelId: 'Serat', labelEn: 'Dietary fibre', group: 'makro', headline: true },
  { id: '269', fdcId: 2000, unit: 'g', labelId: 'Gula total', labelEn: 'Total sugars', group: 'makro', headline: false },
  { id: '255', fdcId: 1051, unit: 'g', labelId: 'Air', labelEn: 'Water', group: 'lain', headline: false },
  { id: '601', fdcId: 1253, unit: 'mg', labelId: 'Kolesterol', labelEn: 'Cholesterol', group: 'lain', headline: false },

  { id: '301', fdcId: 1087, unit: 'mg', labelId: 'Kalsium', labelEn: 'Calcium', group: 'mineral', headline: false },
  { id: '303', fdcId: 1089, unit: 'mg', labelId: 'Zat besi', labelEn: 'Iron', group: 'mineral', headline: true },
  { id: '304', fdcId: 1090, unit: 'mg', labelId: 'Magnesium', labelEn: 'Magnesium', group: 'mineral', headline: false },
  { id: '305', fdcId: 1091, unit: 'mg', labelId: 'Fosfor', labelEn: 'Phosphorus', group: 'mineral', headline: false },
  { id: '306', fdcId: 1092, unit: 'mg', labelId: 'Kalium', labelEn: 'Potassium', group: 'mineral', headline: false },
  { id: '307', fdcId: 1093, unit: 'mg', labelId: 'Natrium', labelEn: 'Sodium', group: 'mineral', headline: false },
  { id: '309', fdcId: 1095, unit: 'mg', labelId: 'Seng', labelEn: 'Zinc', group: 'mineral', headline: true },
  { id: '317', fdcId: 1103, unit: 'µg', labelId: 'Selenium', labelEn: 'Selenium', group: 'mineral', headline: false },

  { id: '320', fdcId: 1106, unit: 'µg', labelId: 'Vitamin A (RAE)', labelEn: 'Vitamin A (RAE)', group: 'vitamin', headline: true },
  { id: '401', fdcId: 1162, unit: 'mg', labelId: 'Vitamin C', labelEn: 'Vitamin C', group: 'vitamin', headline: false },
  { id: '404', fdcId: 1165, unit: 'mg', labelId: 'Tiamin (B1)', labelEn: 'Thiamin (B1)', group: 'vitamin', headline: false },
  { id: '405', fdcId: 1166, unit: 'mg', labelId: 'Riboflavin (B2)', labelEn: 'Riboflavin (B2)', group: 'vitamin', headline: false },
  { id: '406', fdcId: 1167, unit: 'mg', labelId: 'Niasin (B3)', labelEn: 'Niacin (B3)', group: 'vitamin', headline: false },
  { id: '415', fdcId: 1175, unit: 'mg', labelId: 'Vitamin B6', labelEn: 'Vitamin B6', group: 'vitamin', headline: false },
  { id: '435', fdcId: 1190, unit: 'µg', labelId: 'Folat (DFE)', labelEn: 'Folate (DFE)', group: 'vitamin', headline: false },
  { id: '418', fdcId: 1178, unit: 'µg', labelId: 'Vitamin B12', labelEn: 'Vitamin B12', group: 'vitamin', headline: false },
  { id: '323', fdcId: 1109, unit: 'mg', labelId: 'Vitamin E', labelEn: 'Vitamin E', group: 'vitamin', headline: false },
  { id: '430', fdcId: 1185, unit: 'µg', labelId: 'Vitamin K', labelEn: 'Vitamin K', group: 'vitamin', headline: false },
] as const

export type NutrientId = string

const BY_ID = new Map(NUTRIENTS.map((nutrient) => [nutrient.id, nutrient]))
const BY_FDC_ID = new Map(NUTRIENTS.map((nutrient) => [nutrient.fdcId, nutrient]))

export const NUTRIENT_IDS: readonly string[] = NUTRIENTS.map((nutrient) => nutrient.id)

export function nutrientById(id: string): NutrientDef | undefined {
  return BY_ID.get(id)
}

export function nutrientByFdcId(fdcId: number): NutrientDef | undefined {
  return BY_FDC_ID.get(fdcId)
}

export function isKnownNutrient(id: string): boolean {
  return BY_ID.has(id)
}

export const HEADLINE_NUTRIENT_IDS: readonly string[] = NUTRIENTS.filter((n) => n.headline).map(
  (n) => n.id,
)

/**
 * Decimal places for display, per unit. Values are carried at full precision
 * through compute and rounded only at the edge — the rounding the conservation
 * test states its tolerance against.
 */
export function decimalsFor(unit: NutrientUnit): number {
  switch (unit) {
    case 'kcal':
      return 0
    case 'g':
      return 1
    case 'mg':
      return 1
    case 'µg':
      return 1
    default: {
      const never: never = unit
      throw new Error(`Unhandled unit: ${String(never)}`)
    }
  }
}
