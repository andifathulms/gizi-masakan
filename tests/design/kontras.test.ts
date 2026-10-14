/**
 * Invariant 14: colour carries the honesty distinction, so every ink token
 * must clear WCAG AA 4.5:1 on every surface it can sit on. A marker some
 * readers cannot read is not a marker.
 *
 * Read from app/globals.css itself, not from a copy of the palette, so the
 * file that ships is the file that is tested. Each theme block is checked on
 * its own: a token redefined for dark mode is held to the same floor.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const CSS = readFileSync(join(__dirname, '../../app/globals.css'), 'utf8')

const INK = ['ink', 'ink-soft', 'rim', 'rim-soft', 'edited', 'adequate', 'chip'] as const
const SURFACES = ['enamel', 'piring', 'enamel-deep', 'rim-tint', 'edited-tint', 'adequate-tint'] as const
const AA = 4.5

type Rgb = readonly [number, number, number]

/** Every `--name: r g b;` declaration inside the block that opens at `start`. */
function tokensIn(block: string): Map<string, Rgb> {
  const tokens = new Map<string, Rgb>()
  for (const match of block.matchAll(/--([a-z-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)) {
    const [, name, r, g, b] = match
    if (name) tokens.set(name, [Number(r), Number(g), Number(b)])
  }
  return tokens
}

/** The body of the first `{ … }` after `marker`, braces balanced. */
function blockAfter(marker: string): string {
  const at = CSS.indexOf(marker)
  if (at < 0) throw new Error(`no block after ${marker}`)
  const open = CSS.indexOf('{', at)
  let depth = 0
  for (let i = open; i < CSS.length; i += 1) {
    if (CSS[i] === '{') depth += 1
    if (CSS[i] === '}') depth -= 1
    if (depth === 0) return CSS.slice(open + 1, i)
  }
  throw new Error(`unbalanced block after ${marker}`)
}

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

function ratio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

function themes(): { name: string; tokens: Map<string, Rgb> }[] {
  const light = tokensIn(blockAfter(':root {'))
  const out = [{ name: 'light', tokens: light }]
  if (CSS.includes(':root[data-theme')) throw new Error('unexpected theme selector')
  const darkAt = CSS.indexOf('@media (prefers-color-scheme: dark)')
  if (darkAt >= 0) {
    /* Dark redefines a subset; anything it leaves alone keeps its light
       value, which is exactly what the browser does. */
    const dark = new Map(light)
    for (const [name, rgb] of tokensIn(blockAfter('@media (prefers-color-scheme: dark)'))) {
      dark.set(name, rgb)
    }
    out.push({ name: 'dark', tokens: dark })
  }
  return out
}

describe('palette contrast (invariant 14)', () => {
  for (const { name, tokens } of themes()) {
    describe(name, () => {
      it('declares every ink and surface token', () => {
        for (const token of [...INK, ...SURFACES]) expect(tokens.has(token), token).toBe(true)
      })

      for (const ink of INK) {
        it(`${ink} clears AA on every surface`, () => {
          for (const surface of SURFACES) {
            const value = ratio(tokens.get(ink)!, tokens.get(surface)!)
            expect(value, `${ink} on ${surface} is ${value.toFixed(2)}`).toBeGreaterThanOrEqual(AA)
          }
        })
      }

      /* Selected controls and the phone's plate bar set enamel-coloured text
         on a rim fill. */
      it('enamel text clears AA on a rim fill', () => {
        expect(ratio(tokens.get('enamel')!, tokens.get('rim')!)).toBeGreaterThanOrEqual(AA)
        expect(ratio(tokens.get('piring')!, tokens.get('rim')!)).toBeGreaterThanOrEqual(AA)
      })
    })
  }
})
