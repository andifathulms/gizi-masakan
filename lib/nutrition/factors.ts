/**
 * Typed access to the emitted factor tables. Pure: reads committed JSON, no
 * clock, no network, no mutable module state beyond a parse-once cache of
 * immutable data.
 */
import retentionJson from '@/data/factors/retention.json'
import yieldsJson from '@/data/factors/yields.json'
import type { NutrientId } from '@/lib/nutrition/nutrients'

export interface RetentionOperation {
  readonly code: string
  readonly foodGroup: string
  readonly description: string
  readonly factors: Readonly<Record<string, number>>
}

export interface DerivedYield {
  readonly id: string
  readonly labelId: string
  readonly labelEn: string
  readonly appliesTo: readonly string[]
  readonly factor: number
  readonly basis: 'fdc-dry-matter'
  readonly derivation: {
    readonly formula: string
    readonly rawFdcWaterPer100: number
    readonly cookedFdcId: number
    readonly cookedFdcDescription: string
    readonly cookedFdcWaterPer100: number
    readonly reasoning: string
  }
}

export interface UsdaYield {
  readonly code: string
  readonly description: string
  readonly method: string
  readonly factor: number
  readonly basis: 'usda-yields'
}

interface RetentionFile {
  readonly citation: string
  readonly generatedOn: string
  readonly notes: Readonly<Record<string, string>>
  readonly unadjustedByDesign: { readonly nutrients: readonly string[]; readonly reason: string }
  readonly operations: readonly RetentionOperation[]
}

interface YieldsFile {
  readonly generatedOn: string
  readonly sources: Readonly<Record<string, { citation: string; licence: string }>>
  readonly derived: readonly DerivedYield[]
  readonly usda: readonly UsdaYield[]
}

const retentionFile = retentionJson as unknown as RetentionFile
const yieldsFile = yieldsJson as unknown as YieldsFile

const RETENTION_BY_CODE = new Map(retentionFile.operations.map((op) => [op.code, op]))
const DERIVED_BY_ID = new Map(yieldsFile.derived.map((entry) => [entry.id, entry]))
const USDA_YIELD_BY_CODE = new Map(yieldsFile.usda.map((entry) => [entry.code, entry]))

export interface FactorTables {
  readonly retentionCitation: string
  readonly retentionNotes: Readonly<Record<string, string>>
  /** Nutrients USDA publishes no retention factor for, in any operation. */
  readonly unadjustedByDesign: readonly NutrientId[]
  readonly unadjustedReason: string
  readonly yieldCitations: Readonly<Record<string, { citation: string; licence: string }>>
  retentionOperation(code: string): RetentionOperation | undefined
  derivedYield(id: string): DerivedYield | undefined
  usdaYield(code: string): UsdaYield | undefined
}

export const factors: FactorTables = {
  retentionCitation: retentionFile.citation,
  retentionNotes: retentionFile.notes,
  unadjustedByDesign: retentionFile.unadjustedByDesign.nutrients,
  unadjustedReason: retentionFile.unadjustedByDesign.reason,
  yieldCitations: yieldsFile.sources,
  retentionOperation: (code) => RETENTION_BY_CODE.get(code),
  derivedYield: (id) => DERIVED_BY_ID.get(id),
  usdaYield: (code) => USDA_YIELD_BY_CODE.get(code),
}

export function allRetentionOperations(): readonly RetentionOperation[] {
  return retentionFile.operations
}

export function allDerivedYields(): readonly DerivedYield[] {
  return yieldsFile.derived
}

export function allUsdaYields(): readonly UsdaYield[] {
  return yieldsFile.usda
}
