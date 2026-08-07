/**
 * AKG transcription fixtures, asserted against the Permenkes with the article
 * cited — PRD §8. Plus the framing rules from §5, which are testable: adequacy
 * is a share contributed, never a remainder, and there is no accumulation.
 */
import { describe, expect, it } from 'vitest'
import {
  AKG_CITATION,
  AKG_KELOMPOK,
  AKG_KELOMPOK_TIDAK_DIMUAT,
  adequacyFor,
  findKelompok,
} from '@/lib/akg'
import { RECIPES } from '@/lib/resep'
import { perPorsi } from '@/lib/nutrition/trace'
import { assertConservation, traceFor } from '@/tests/helpers'

/**
 * Spot values read off Lampiran I of Permenkes RI No. 28 Tahun 2019
 * (Berita Negara 2019 No. 956):
 *   Tabel 1 — energi, protein, lemak, karbohidrat, serat
 *   Tabel 2 — vitamin
 *   Tabel 3 — mineral
 * If a transcription slips, one of these fails.
 */
const FIXTURES: readonly { kelompok: string; nutrientId: string; expected: number; tabel: string }[] = [
  { kelompok: 'laki-19-29', nutrientId: '208', expected: 2650, tabel: 'Tabel 1' },
  { kelompok: 'laki-19-29', nutrientId: '203', expected: 65, tabel: 'Tabel 1' },
  { kelompok: 'laki-19-29', nutrientId: '291', expected: 37, tabel: 'Tabel 1' },
  { kelompok: 'perempuan-19-29', nutrientId: '208', expected: 2250, tabel: 'Tabel 1' },
  { kelompok: 'perempuan-19-29', nutrientId: '203', expected: 60, tabel: 'Tabel 1' },
  { kelompok: 'anak-1-3', nutrientId: '208', expected: 1350, tabel: 'Tabel 1' },
  { kelompok: 'anak-7-9', nutrientId: '205', expected: 250, tabel: 'Tabel 1' },
  { kelompok: 'laki-16-18', nutrientId: '320', expected: 700, tabel: 'Tabel 2' },
  { kelompok: 'perempuan-19-29', nutrientId: '401', expected: 75, tabel: 'Tabel 2' },
  { kelompok: 'laki-19-29', nutrientId: '435', expected: 400, tabel: 'Tabel 2' },
  { kelompok: 'perempuan-19-29', nutrientId: '303', expected: 18, tabel: 'Tabel 3' },
  { kelompok: 'laki-19-29', nutrientId: '303', expected: 9, tabel: 'Tabel 3' },
  { kelompok: 'perempuan-19-29', nutrientId: '301', expected: 1000, tabel: 'Tabel 3' },
  { kelompok: 'laki-13-15', nutrientId: '309', expected: 11, tabel: 'Tabel 3' },
  { kelompok: 'perempuan-65-80', nutrientId: '306', expected: 4700, tabel: 'Tabel 3' },
]

describe('AKG transcription', () => {
  it('cites the regulation, the lampiran and the Berita Negara number', () => {
    expect(AKG_CITATION).toContain('Nomor 28 Tahun 2019')
    expect(AKG_CITATION).toContain('Lampiran I')
    expect(AKG_CITATION).toContain('956')
  })

  for (const fixture of FIXTURES) {
    it(`${fixture.kelompok} / ${fixture.nutrientId} = ${fixture.expected} (${fixture.tabel})`, () => {
      const kelompok = findKelompok(fixture.kelompok)
      expect(kelompok, `kelompok "${fixture.kelompok}" missing`).toBeDefined()
      expect(kelompok!.nilai[fixture.nutrientId]).toBe(fixture.expected)
    })
  }

  it('carries no body weight or height anywhere — invariant 12', () => {
    const serialised = JSON.stringify(AKG_KELOMPOK)
    expect(serialised).not.toContain('beratBadan')
    expect(serialised).not.toContain('tinggiBadan')
    for (const kelompok of AKG_KELOMPOK) {
      expect(Object.keys(kelompok)).toEqual([
        'id',
        'label',
        'jenisKelamin',
        'umurMin',
        'umurMax',
        'nilai',
      ])
    }
  })

  it('records the groups deliberately not carried rather than just omitting them', () => {
    expect(AKG_KELOMPOK_TIDAK_DIMUAT.kelompok.length).toBeGreaterThan(0)
    expect(AKG_KELOMPOK_TIDAK_DIMUAT.alasan.length).toBeGreaterThan(40)
  })
})

describe('adequacy is a contribution, never a ceiling', () => {
  const kelompok = findKelompok('perempuan-19-29')!

  it('reports the share of the daily figure a portion contributes', () => {
    const trace = traceFor(RECIPES.find((recipe) => recipe.id === 'soto-ayam')!)
    assertConservation(trace)
    const protein = trace.totals.find((total) => total.nutrientId === '203')!
    const adequacy = adequacyFor(kelompok, '203', perPorsi(trace, protein))
    expect(adequacy.type).toBe('dibandingkan')
    if (adequacy.type !== 'dibandingkan') throw new Error('expected a comparison')
    expect(adequacy.bagian).toBeGreaterThan(0)
    expect(adequacy.akg).toBe(60)
    expect(adequacy.bagian).toBeCloseTo(perPorsi(trace, protein) / 60, 10)
  })

  it('a share above 1 is reported as-is, not as an excess or an overage', () => {
    const adequacy = adequacyFor(kelompok, '203', 120)
    if (adequacy.type !== 'dibandingkan') throw new Error('expected a comparison')
    expect(adequacy.bagian).toBe(2)
    // The union has no "remaining", "over", "budget" or "limit" member — if one
    // is ever added, this fails.
    expect(Object.keys(adequacy).sort()).toEqual(['akg', 'bagian', 'nutrientId', 'type', 'unit'])
  })

  it('refuses the comparison when the regulation prints a different unit', () => {
    // Permenkes prints vitamin E in mcg; our table is in mg. Not reconciled.
    const adequacy = adequacyFor(kelompok, '323', 10)
    expect(adequacy.type).toBe('tidak-dibandingkan')
    if (adequacy.type !== 'tidak-dibandingkan') throw new Error('expected a refusal')
    expect(adequacy.reason).toContain('satuan')
  })

  it('refuses when the regulation has no figure for that nutrient', () => {
    const adequacy = adequacyFor(kelompok, '601', 50) // cholesterol — not an AKG figure
    expect(adequacy.type).toBe('tidak-dibandingkan')
  })
})
