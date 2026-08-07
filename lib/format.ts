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
