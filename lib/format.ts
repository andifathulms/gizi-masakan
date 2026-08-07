/**
 * Number formatting for display. Pure, and the only place rounding happens —
 * compute carries full precision and rounds at the edge, which is the precision
 * the conservation tolerance is stated against.
 */
import { decimalsFor, nutrientById } from '@/lib/nutrition/nutrients'
import type { Locale } from '@/lib/i18n'

function localeTag(locale: Locale): string {
  return locale === 'en' ? 'en-GB' : 'id-ID'
}

export function formatGram(value: number, locale: Locale): string {
  const decimals = value < 10 && value % 1 !== 0 ? 1 : 0
  return new Intl.NumberFormat(localeTag(locale), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatNutrient(value: number, nutrientId: string, locale: Locale): string {
  const nutrient = nutrientById(nutrientId)
  const decimals = nutrient ? decimalsFor(nutrient.unit) : 1
  // Small non-zero amounts must not round to a flat 0 — that reads as absence,
  // which is the one thing this project cannot let a number imply.
  if (value > 0 && value < 0.5 * 10 ** -decimals) return locale === 'en' ? '< 0.1' : '< 0,1'
  return new Intl.NumberFormat(localeTag(locale), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * A multiplier or a ratio — a retention factor, or a weight divided by 100.
 * Two decimals, always: these appear inside arithmetic the reader is invited to
 * check, and a ratio rounded to whole numbers turns 2.5 into 3 and makes the
 * sum on screen visibly wrong.
 */
export function formatFactor(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * A signed change. The sign is the whole point — "12 kcal" and "−12 kcal" are
 * opposite facts — so it is always written, including the plus.
 */
export function formatDelta(value: number, nutrientId: string, locale: Locale): string {
  const magnitude = formatNutrient(Math.abs(value), nutrientId, locale)
  if (Math.abs(value) < Number.EPSILON) return `±${magnitude}`
  return `${value > 0 ? '+' : '−'}${magnitude}`
}

export function formatPercent(fraction: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(fraction)
}

export function unitLabel(nutrientId: string): string {
  return nutrientById(nutrientId)?.unit ?? ''
}

export function nutrientLabel(nutrientId: string, locale: Locale): string {
  const nutrient = nutrientById(nutrientId)
  if (!nutrient) return nutrientId
  return locale === 'en' ? nutrient.labelEn : nutrient.labelId
}
