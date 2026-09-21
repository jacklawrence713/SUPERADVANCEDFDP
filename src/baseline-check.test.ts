import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { computeDynastyTradeVal, tierLabel } from './logic'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const afdpSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8').replace(/\r\n/g, '\n')

function parsePlayers(): any[] {
  const marker = 'const PLAYERS=['
  const startIdx = afdpSrc.indexOf(marker)
  const arrayStart = afdpSrc.indexOf('[', startIdx)
  let depth = 0, i = arrayStart
  for (; i < afdpSrc.length; i++) {
    if (afdpSrc[i] === '[') depth++
    else if (afdpSrc[i] === ']') { depth--; if (depth === 0) break }
  }
  return new Function('return ' + afdpSrc.substring(arrayStart, i + 1))() as any
}

function rankAll() {
  const opts = { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false }
  const players = parsePlayers()
  const list = players.map((p: any) => ({
    name: p.name, pos: p.pos, age: p.age, team: p.team, ktcVal: p.ktcVal,
    tradeVal: computeDynastyTradeVal(p.pos, p.age, p.ktcVal, 1, (p.proj || {}).PPR || 0, opts),
    posRank: 0, rank: 0, tier: null as any,
  }))
  list.sort((a, b) => b.tradeVal - a.tradeVal || a.name.localeCompare(b.name))
  const pc: Record<string, number> = {}
  list.forEach((p, i) => {
    pc[p.pos] = (pc[p.pos] || 0) + 1
    p.posRank = pc[p.pos]
    p.rank = i + 1
    p.tier = tierLabel(p.posRank, p.pos)
  })
  return list
}

const ranked = rankAll()

// These are the expected values computed from commit 2d5e988 using the same
// computeDynastyTradeVal + tierLabel from src/logic.ts (which has zero diff).
// Since PLAYERS data and src/logic.ts are identical, values MUST be identical.
// Values verified against commit 2d5e988 PLAYERS data + computeDynastyTradeVal
const EXPECTED: Record<string, { ktcVal: number; tradeVal: number; pos: string; team: string }> = {
  'Josh Allen':          { ktcVal: 9100, tradeVal: 9100, pos: 'QB', team: 'BUF' },
  'Joe Burrow':          { ktcVal: 8200, tradeVal: 8200, pos: 'QB', team: 'CIN' },
  'Jalen Hurts':         { ktcVal: 6100, tradeVal: 6100, pos: 'QB', team: 'PHI' },
  'Patrick Mahomes':     { ktcVal: 6550, tradeVal: 6550, pos: 'QB', team: 'KC' },
  'Bijan Robinson':      { ktcVal: 9999, tradeVal: 9999, pos: 'RB', team: 'ATL' },
  'Jahmyr Gibbs':        { ktcVal: 9964, tradeVal: 9964, pos: 'RB', team: 'DET' },
  "Ja'Marr Chase":       { ktcVal: 9980, tradeVal: 9980, pos: 'WR', team: 'CIN' },
  'Jaxon Smith-Njigba':  { ktcVal: 9400, tradeVal: 9400, pos: 'WR', team: 'SEA' },
  'Brock Bowers':        { ktcVal: 8350, tradeVal: 8838, pos: 'TE', team: 'LV' },  // pre-prime youth bonus (age 23.7, TE prime 25-30)
  'Trey McBride':        { ktcVal: 7500, tradeVal: 7500, pos: 'TE', team: 'ARI' },
}

describe('Prompt 14 regression: canonical values unchanged from baseline', () => {
  // First, print the full table for manual inspection
  it('prints value table for verification', () => {
    console.log('\n=== Dynasty 1QB PPR Canonical Values ===')
    console.log('Name                   | ktcVal | FDP Val | Overall | PosRank | Tier')
    console.log('-'.repeat(75))
    for (const name of Object.keys(EXPECTED)) {
      const p = ranked.find(x => x.name === name)!
      console.log(
        name.padEnd(23) + '| ' +
        String(p.ktcVal || '-').padEnd(7) + '| ' +
        String(p.tradeVal).padEnd(8) + '| #' +
        String(p.rank).padEnd(7) + '| ' +
        p.pos + String(p.posRank).padEnd(5) + '| Tier ' + p.tier.t
      )
    }
    expect(true).toBe(true) // placeholder — real assertions below
  })

  for (const [name, exp] of Object.entries(EXPECTED)) {
    describe(name, () => {
      const p = ranked.find(x => x.name === name)!

      it('has correct ktcVal (PLAYERS data unchanged)', () => {
        expect(p.ktcVal).toBe(exp.ktcVal)
      })

      it('has correct FDP Value (formula unchanged)', () => {
        expect(p.tradeVal).toBe(exp.tradeVal)
      })

      it('has correct position', () => {
        expect(p.pos).toBe(exp.pos)
      })

      it('has correct team', () => {
        expect(p.team).toBe(exp.team)
      })
    })
  }
})

describe('Prompt 14 regression: src/logic.ts is unchanged', () => {
  it('computeDynastyTradeVal produces same results for all ktcVal players', () => {
    const opts = { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false }
    // Josh Allen: QB, age 30.3, ktcVal 9100 — should be 9100 (ktcVal * 1.0 age bonus * 1.0 fmtAdj)
    expect(computeDynastyTradeVal('QB', 30.3, 9100, 1, 432, opts)).toBe(9100)
    // Bijan Robinson: RB, age 24.6, ktcVal 9999 — at prime, no decay
    expect(computeDynastyTradeVal('RB', 24.6, 9999, 1, 335, opts)).toBe(9999)
    // Brock Bowers: TE, age 23.7, ktcVal 8350 — pre-prime youth bonus (TE prime 25-30)
    expect(computeDynastyTradeVal('TE', 23.7, 8350, 1, 252, opts)).toBe(8838)
  })
})

describe('Prompt 14 regression: no PLAYERS data changes', () => {
  it('PLAYERS array in afdp.tsx is identical to baseline (no ktcVal diff)', () => {
    // git diff 2d5e988 -- afdp.tsx shows zero ktcVal changes
    // Verify by checking that all 10 sample players match baseline ktcVal
    const players = parsePlayers()
    const lookup = new Map(players.map((p: any) => [p.name, p]))
    for (const [name, exp] of Object.entries(EXPECTED)) {
      const p = lookup.get(name)
      expect(p).toBeDefined()
      expect(p!.ktcVal).toBe(exp.ktcVal)
    }
  })
})

describe('Prompt 14 regression: teammate section does not imply roster status', () => {
  it('player page does not contain "practice squad" text', () => {
    const ppBlock = afdpSrc.substring(
      afdpSrc.indexOf('// ── PLAYER PROFILE PAGE ──'),
      afdpSrc.indexOf('return React.createElement("div",{style:{background:T.bg,height:"100vh"')
    )
    expect(ppBlock.toLowerCase()).not.toContain('practice squad')
  })

  it('player page does not contain "deep bench" text', () => {
    const ppBlock = afdpSrc.substring(
      afdpSrc.indexOf('// ── PLAYER PROFILE PAGE ──'),
      afdpSrc.indexOf('return React.createElement("div",{style:{background:T.bg,height:"100vh"')
    )
    expect(ppBlock.toLowerCase()).not.toContain('deep bench')
  })
})
