/**
 * The query string is untrusted input that feeds the gram weights the engine
 * computes from. These assert the two things that matter: a link round-trips
 * exactly, and anything malformed degrades to the authored recipe rather than
 * producing a number nobody can account for.
 */
import { describe, expect, it } from 'vitest'
import {
  PLATE_DEFAULT,
  parsePlateState,
  serialisePlateState,
  type PlateState,
} from '@/lib/url/plate-state'
import { KELOMPOK_AWAL, AKG_KELOMPOK } from '@/lib/akg'

const OTHER_KELOMPOK = AKG_KELOMPOK.find((entry) => entry.id !== KELOMPOK_AWAL)!

describe('parsePlateState', () => {
  it('returns the defaults for an empty query', () => {
    expect(parsePlateState('')).toEqual(PLATE_DEFAULT)
    expect(parsePlateState('?')).toEqual(PLATE_DEFAULT)
  })

  it('reads a leading question mark or not, identically', () => {
    expect(parsePlateState('?n=303')).toEqual(parsePlateState('n=303'))
  })

  it('reads every parameter', () => {
    const state = parsePlateState(`?n=303&v=resep&g=${OTHER_KELOMPOK.id}&b=santan:100,tempe:75`)
    expect(state.nutrientId).toBe('303')
    expect(state.perPorsiView).toBe(false)
    expect(state.kelompokId).toBe(OTHER_KELOMPOK.id)
    expect(state.beratOverrideG).toEqual({ santan: 100, tempe: 75 })
  })

  it('falls back to the default nutrient when the id is not in the catalogue', () => {
    expect(parsePlateState('?n=999').nutrientId).toBe(PLATE_DEFAULT.nutrientId)
    expect(parsePlateState('?n=').nutrientId).toBe(PLATE_DEFAULT.nutrientId)
    expect(parsePlateState('?n=%3Cscript%3E').nutrientId).toBe(PLATE_DEFAULT.nutrientId)
  })

  it('falls back to the default AKG group when the id is unknown', () => {
    expect(parsePlateState('?g=tidak-ada').kelompokId).toBe(KELOMPOK_AWAL)
  })

  it('treats any view value other than resep as per portion', () => {
    expect(parsePlateState('?v=resep').perPorsiView).toBe(false)
    expect(parsePlateState('?v=porsi').perPorsiView).toBe(true)
    expect(parsePlateState('?v=nonsense').perPorsiView).toBe(true)
  })

  describe('gram weights', () => {
    it('accepts zero and decimals', () => {
      expect(parsePlateState('?b=garam:0,santan:12.5').beratOverrideG).toEqual({
        garam: 0,
        santan: 12.5,
      })
    })

    it('drops a negative mass rather than coercing it', () => {
      expect(parsePlateState('?b=santan:-50').beratOverrideG).toEqual({})
    })

    it('drops non-numeric, NaN and Infinity', () => {
      expect(parsePlateState('?b=santan:abc').beratOverrideG).toEqual({})
      expect(parsePlateState('?b=santan:NaN').beratOverrideG).toEqual({})
      expect(parsePlateState('?b=santan:Infinity').beratOverrideG).toEqual({})
      expect(parsePlateState('?b=santan:1e5').beratOverrideG).toEqual({})
    })

    it('drops an ingredient id that could not have come from a recipe', () => {
      expect(parsePlateState('?b=<script>:100').beratOverrideG).toEqual({})
      expect(parsePlateState('?b=Santan:100').beratOverrideG).toEqual({})
      expect(parsePlateState('?b=:100').beratOverrideG).toEqual({})
    })

    it('keeps the valid entries when one entry in the list is bad', () => {
      expect(parsePlateState('?b=santan:100,tempe:-1,tahu:50').beratOverrideG).toEqual({
        santan: 100,
        tahu: 50,
      })
    })
  })
})

describe('serialisePlateState', () => {
  it('writes nothing for the default state', () => {
    expect(serialisePlateState(PLATE_DEFAULT)).toBe('')
  })

  it('writes only what differs from the default', () => {
    expect(serialisePlateState({ ...PLATE_DEFAULT, nutrientId: '303' })).toBe('n=303')
    expect(serialisePlateState({ ...PLATE_DEFAULT, perPorsiView: false })).toBe('v=resep')
  })

  it('sorts ingredient ids so the same edits always give the same link', () => {
    const a: PlateState = { ...PLATE_DEFAULT, beratOverrideG: { tempe: 75, santan: 100 } }
    const b: PlateState = { ...PLATE_DEFAULT, beratOverrideG: { santan: 100, tempe: 75 } }
    expect(serialisePlateState(a)).toBe(serialisePlateState(b))
    expect(serialisePlateState(a)).toBe('b=santan:100,tempe:75')
  })

  it('leaves the separators unescaped so a shared link stays readable', () => {
    const query = serialisePlateState({
      ...PLATE_DEFAULT,
      beratOverrideG: { santan: 100, tempe: 75 },
    })
    expect(query).not.toContain('%3A')
    expect(query).not.toContain('%2C')
  })
})

describe('cooking method', () => {
  it('reads a method that exists in the alternatives table', () => {
    expect(parsePlateState('?m=tempe:0501').pengolahanOverride).toEqual({ tempe: '0501' })
  })

  it('drops a code that is in no food group, rather than passing it through', () => {
    expect(parsePlateState('?m=tempe:9999').pengolahanOverride).toEqual({})
    expect(parsePlateState('?m=tempe:').pengolahanOverride).toEqual({})
  })

  it('drops an ingredient id that could not have come from a recipe', () => {
    expect(parsePlateState('?m=<script>:0501').pengolahanOverride).toEqual({})
  })

  it('round-trips and sorts', () => {
    const state: PlateState = {
      ...PLATE_DEFAULT,
      pengolahanOverride: { tempe: '0501', ayam: '0856' },
    }
    expect(serialisePlateState(state)).toBe('m=ayam:0856,tempe:0501')
    expect(parsePlateState(serialisePlateState(state))).toEqual(state)
  })
})

describe('round trip', () => {
  const cases: PlateState[] = [
    PLATE_DEFAULT,
    { ...PLATE_DEFAULT, nutrientId: '303' },
    { ...PLATE_DEFAULT, perPorsiView: false },
    { ...PLATE_DEFAULT, kelompokId: OTHER_KELOMPOK.id },
    { ...PLATE_DEFAULT, beratOverrideG: { santan: 100, tempe: 75, garam: 0 } },
    {
      nutrientId: '303',
      perPorsiView: false,
      kelompokId: OTHER_KELOMPOK.id,
      beratOverrideG: { santan: 100 },
      pengolahanOverride: {},
    },
  ]

  it.each(cases)('parse(serialise(state)) === state', (state) => {
    expect(parsePlateState(serialisePlateState(state))).toEqual(state)
  })

  it('is deterministic — the same state always serialises identically', () => {
    const state: PlateState = {
      nutrientId: '303',
      perPorsiView: false,
      kelompokId: OTHER_KELOMPOK.id,
      beratOverrideG: { tempe: 75, santan: 100 },
      pengolahanOverride: {},
    }
    const first = serialisePlateState(state)
    for (let i = 0; i < 5; i += 1) expect(serialisePlateState(state)).toBe(first)
  })
})
