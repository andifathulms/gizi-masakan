/**
 * The signed change shown beside an edited total. "12 kcal" and "−12 kcal" are
 * opposite facts, so the sign is never optional and never inferred from
 * context.
 */
import { describe, expect, it } from 'vitest'
import { formatDelta } from '@/lib/format'

describe('formatDelta', () => {
  it('always writes the sign, including the plus', () => {
    expect(formatDelta(12, '208', 'en')).toBe('+12')
    expect(formatDelta(-12, '208', 'en')).toBe('−12')
  })

  it('uses a real minus sign, not a hyphen', () => {
    expect(formatDelta(-12, '208', 'en')).not.toContain('-')
    expect(formatDelta(-12, '208', 'en').codePointAt(0)).toBe(0x2212)
  })

  it('marks no change as no change rather than as an increase', () => {
    expect(formatDelta(0, '208', 'en')).toBe('±0')
  })

  it('respects the nutrient s decimal places and the locale', () => {
    // Energy is whole; protein carries a decimal, and id uses a comma.
    expect(formatDelta(2.5, '203', 'en')).toBe('+2.5')
    expect(formatDelta(2.5, '203', 'id')).toBe('+2,5')
  })

  it('never shows a negative zero', () => {
    expect(formatDelta(-0, '208', 'en')).toBe('±0')
  })
})
