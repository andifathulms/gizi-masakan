/**
 * Choosing a cooking method other than the one the recipe authored.
 *
 * The dangerous version of this feature applies chicken factors to spinach, or
 * keeps a yield factor published for frying after the reader switched to
 * boiling. These assert that neither can happen, and that the default path is
 * untouched when nobody chooses anything.
 */
import { describe, expect, it } from 'vitest'
import { compute } from '@/lib/nutrition/compute'
import { findRecipe, RECIPES } from '@/lib/resep'
import { findUnmatched, loadFdcTable } from '@/lib/sources/fdc/load'
import {
  alternatifUntuk,
  bolehGantiKe,
  kelompokUntukKode,
  kodeRetensiAda,
  PENGOLAHAN_KELOMPOK,
} from '@/lib/nutrition/pengolahan'
import { assertConservation } from '../helpers'

const table = loadFdcTable()
const unmatched = { get: findUnmatched }
const run = (recipeId: string, pengolahanOverride?: Record<string, string>) =>
  compute({ recipe: findRecipe(recipeId)!, table, unmatched, pengolahanOverride })

describe('the alternatives table', () => {
  it('names only operations that exist in the transcribed USDA table', () => {
    for (const kelompok of PENGOLAHAN_KELOMPOK) {
      for (const operasi of kelompok.operasi) {
        expect(kodeRetensiAda(operasi.code), `${kelompok.id} → ${operasi.code}`).toBe(true)
      }
    }
  })

  it('puts every code in exactly one group', () => {
    const seen = new Map<string, string>()
    for (const kelompok of PENGOLAHAN_KELOMPOK) {
      for (const operasi of kelompok.operasi) {
        expect(seen.get(operasi.code), `${operasi.code} is in two groups`).toBeUndefined()
        seen.set(operasi.code, kelompok.id)
      }
    }
  })

  it('covers every retention code the shipped recipes author', () => {
    for (const recipe of RECIPES) {
      for (const bahan of recipe.bahan) {
        const code = bahan.pengolahan?.retentionCode
        if (!code) continue
        expect(
          kelompokUntukKode(code),
          `${recipe.id} → ${bahan.ingredientId} uses ${code}, which is in no group`,
        ).toBeDefined()
      }
    }
  })

  it('always offers the authored method among the alternatives', () => {
    for (const kelompok of PENGOLAHAN_KELOMPOK) {
      for (const operasi of kelompok.operasi) {
        expect(alternatifUntuk(operasi.code).map((o) => o.code)).toContain(operasi.code)
      }
    }
  })
})

describe('bolehGantiKe', () => {
  it('allows a swap within a food group', () => {
    // CHICKEN,FRIED,WO/COATING → CHICKEN,SIMMERED,W/DRIPPINGS
    expect(bolehGantiKe('0803', '0856')).toBe(true)
  })

  it('refuses a swap across food groups', () => {
    // chicken → leafy vegetables
    expect(bolehGantiKe('0803', '3005')).toBe(false)
    // leafy vegetables → beef
    expect(bolehGantiKe('3005', '0702')).toBe(false)
  })

  it('refuses a code that is not in the table at all', () => {
    expect(bolehGantiKe('0803', '9999')).toBe(false)
    expect(bolehGantiKe('0803', '')).toBe(false)
  })
})

describe('compute with a method override', () => {
  it('is identical to the authored trace when no override is given', () => {
    expect(run('ayam-goreng-kuning')).toEqual(run('ayam-goreng-kuning', {}))
  })

  it('ignores an override from a different food group, silently keeping the authored method', () => {
    const authored = run('ayam-goreng-kuning')
    const attacked = run('ayam-goreng-kuning', { 'ayam-paha-kulit': '3005' })
    expect(attacked).toEqual(authored)
  })

  it('ignores an override for an ingredient that has no authored method', () => {
    const authored = run('ayam-goreng-kuning')
    expect(run('ayam-goreng-kuning', { garam: '3005' })).toEqual(authored)
  })

  it('changes the numbers when the method is a real alternative', () => {
    const digoreng = run('ayam-goreng-kuning')
    const direbus = run('ayam-goreng-kuning', { 'ayam-paha-kulit': '0856' })
    const energi = (t: ReturnType<typeof run>) => t.totals.find((x) => x.nutrientId === '208')!.total
    // Energy is unadjusted by design either way, so it must NOT move.
    expect(energi(direbus)).toBeCloseTo(energi(digoreng), 6)
    // A nutrient USDA does publish factors for must move.
    const besi = (t: ReturnType<typeof run>) => t.totals.find((x) => x.nutrientId === '303')!.total
    expect(besi(direbus)).not.toBeCloseTo(besi(digoreng), 6)
  })

  it('drops the yield factor, because it was published for the authored method', () => {
    const direbus = run('ayam-goreng-kuning', { 'ayam-paha-kulit': '0856' })
    const ayam = direbus.bahan.find((b) => b.ingredientId === 'ayam-paha-kulit')!
    expect(ayam.pengolahanDiganti).toBe(true)
    expect(ayam.yieldState.type).toBe('tidak-diketahui')
    expect(ayam.beratMatangG).toBeUndefined()
  })

  it('names the dropped yield as a gap rather than carrying it silently', () => {
    const direbus = run('ayam-goreng-kuning', { 'ayam-paha-kulit': '0856' })
    expect(direbus.gaps.some((gap) => gap.type === 'faktor-yield-kosong')).toBe(true)
  })

  it('marks the authored method as not changed', () => {
    const authored = run('ayam-goreng-kuning')
    for (const bahan of authored.bahan) expect(bahan.pengolahanDiganti).toBe(false)
  })

  it('is deterministic', () => {
    const once = run('tumis-kangkung', { kol: '3006' })
    for (let i = 0; i < 3; i += 1) expect(run('tumis-kangkung', { kol: '3006' })).toEqual(once)
  })

  it('conserves contributions with an override applied', () => {
    assertConservation(run('ayam-goreng-kuning', { 'ayam-paha-kulit': '0856' }))
    assertConservation(run('gado-gado', { kol: '3006' }))
  })
})
