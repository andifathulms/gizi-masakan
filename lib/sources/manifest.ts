/**
 * The licence gate. PRD §3, invariant 7.
 *
 * Every ingredient source declares its licence in data/ingredients/manifest.json.
 * `assertSourceUsable` runs before any adapter and throws if a source's licence
 * is absent, unresolved, or the source is marked excluded. There is deliberately
 * no override parameter and no environment escape hatch: the only way to enable
 * a source is to resolve its licence in the manifest.
 */
import { z } from 'zod'
import manifestJson from '@/data/ingredients/manifest.json'

export const LicenceStatus = z.enum(['resolved', 'unresolved'])

export const LicenceSchema = z.object({
  status: LicenceStatus,
  kind: z.enum([
    'public-domain',
    'regulation-exempt',
    'cite-permitted',
    'own-work',
    'all-rights-reserved',
  ]),
  label: z.string().min(1),
  reasoning: z.string().min(1),
  reviewedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'reviewedOn must be an ISO date'),
})

export const SourceStatus = z.enum(['enabled', 'excluded'])

const IngredientSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  publisher: z.string().min(1),
  release: z.string().min(1),
  url: z.string().url(),
  licence: LicenceSchema,
  status: SourceStatus,
  datasetsIncluded: z.array(z.string()).optional(),
  datasetsExcluded: z
    .array(z.object({ name: z.string(), reason: z.string().min(1) }))
    .optional(),
  exclusion: z
    .object({
      reason: z.string().min(1),
      whatItWouldAdd: z.string().min(1),
      howItCouldChange: z.string().min(1),
      doNotRemove: z.string().min(1),
    })
    .optional(),
})

const OtherSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  licence: LicenceSchema,
  status: SourceStatus,
})

export const ManifestSchema = z.object({
  $comment: z.string().optional(),
  generatedBy: z.string(),
  sources: z.array(IngredientSourceSchema).min(1),
  otherSources: z.array(OtherSourceSchema),
})

export type Licence = z.infer<typeof LicenceSchema>
export type IngredientSource = z.infer<typeof IngredientSourceSchema>
export type Manifest = z.infer<typeof ManifestSchema>

/** Parsed once. A malformed manifest is a build failure, not a runtime warning. */
export const manifest: Manifest = ManifestSchema.parse(manifestJson)

export function findSource(sourceId: string): IngredientSource | undefined {
  return manifest.sources.find((source) => source.id === sourceId)
}

export type GateResult =
  | { readonly type: 'usable'; readonly source: IngredientSource }
  | { readonly type: 'refused'; readonly sourceId: string; readonly reason: string }

export function checkSource(sourceId: string): GateResult {
  const source = findSource(sourceId)
  if (!source) {
    return {
      type: 'refused',
      sourceId,
      reason: `Source "${sourceId}" is not declared in data/ingredients/manifest.json. A source with no licence declaration cannot be used.`,
    }
  }
  if (source.licence.status !== 'resolved') {
    return {
      type: 'refused',
      sourceId,
      reason: `Source "${sourceId}" has an unresolved licence (${source.licence.label}). ${source.licence.reasoning}`,
    }
  }
  if (source.status !== 'enabled') {
    return {
      type: 'refused',
      sourceId,
      reason: `Source "${sourceId}" is recorded as excluded. ${source.exclusion?.reason ?? ''}`.trim(),
    }
  }
  return { type: 'usable', source }
}

/** Throws unless the source's licence is resolved and the source is enabled. */
export function assertSourceUsable(sourceId: string): IngredientSource {
  const result = checkSource(sourceId)
  switch (result.type) {
    case 'usable':
      return result.source
    case 'refused':
      throw new Error(`Licence gate refused source "${result.sourceId}": ${result.reason}`)
    default: {
      const never: never = result
      throw new Error(`Unhandled gate result: ${JSON.stringify(never)}`)
    }
  }
}

/** The enabled ingredient sources, for the method page. */
export function enabledSources(): readonly IngredientSource[] {
  return manifest.sources.filter((source) => checkSource(source.id).type === 'usable')
}

/** The excluded ones, with their reasons — shown on the method page, not hidden. */
export function excludedSources(): readonly IngredientSource[] {
  return manifest.sources.filter((source) => checkSource(source.id).type === 'refused')
}
