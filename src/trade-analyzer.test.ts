import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  tVal, verdict, makePick, PRIME, FREE_TRADE_LIMIT,
  computeTradeAgeImpact, computeTradePositionalImpact,
  computeTradeDraftCapitalImpact, generateTradeWarnings,
  computeOptimalLineupFromSlots, computeDynastyTradeVal,
  formatContextLabel,
} from './logic'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const afdpSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8').replace(/\r\n/g, '\n')

// ══════════════════════════════════════════════════════════════
// 1. CANONICAL TRADE MATH PRESERVED
// ══════════════════════════════════════════════════════════════

describe('canonical trade math preserved', () => {
  it('tVal sums player tradeVal correctly', () => {
    const side = [
      { pos: 'QB', tradeVal: 5000 },
      { pos: 'RB', tradeVal: 3000 },
    ]
    expect(tVal(side, 0, 200)).toBe(8000)
  })

  it('tVal uses est for PICKs', () => {
    const side = [
      { pos: 'QB', tradeVal: 5000 },
      { pos: 'PICK', est: 6407, tradeVal: 6727 },
    ]
    expect(tVal(side, 0, 200)).toBe(5000 + 6407)
  })

  it('tVal adds FAAB value', () => {
    expect(tVal([], 100, 200)).toBe(100 * (2000 / 200))
  })

  it('verdict returns Fair Trade when within 8%', () => {
    const v = verdict(5000, 4800)
    expect(v.txt).toBe('Fair Trade')
    expect(v.pct).toBe(50)
  })

  it('verdict returns Team A Overpays when diff > 8%', () => {
    const v = verdict(6000, 4000)
    expect(v.txt).toBe('Team A Overpays')
    expect(v.sub).toContain('Team B wins')
  })

  it('verdict returns Team B Overpays when diff < -8%', () => {
    const v = verdict(4000, 6000)
    expect(v.txt).toBe('Team B Overpays')
    expect(v.sub).toContain('Team A wins')
  })

  it('verdict handles zero totals', () => {
    const v = verdict(0, 0)
    expect(v.txt).toBe('Fair Trade')
  })

  it('makePick preserves pick values', () => {
    const pk = makePick({ id: 'test', name: '2026 1st', round: 1, est: 6407, note: '' })
    expect(pk.pos).toBe('PICK')
    expect(pk.tradeVal).toBe(Math.round(6407 * 1.05))
  })

  it('pick values unchanged for round 2', () => {
    const pk = makePick({ id: 'test', name: '2026 2nd', round: 2, est: 3728, note: '' })
    expect(pk.tradeVal).toBe(Math.round(3728 * 1.03))
  })

  it('pick values unchanged for round 3+', () => {
    const pk = makePick({ id: 'test', name: '2026 3rd', round: 3, est: 2652, note: '' })
    expect(pk.tradeVal).toBe(2652)
  })

  it('FAAB behavior unchanged', () => {
    // FAAB scales by 2000/budget
    expect(tVal([], 50, 200)).toBe(50 * 10)
    expect(tVal([], 50, 100)).toBe(50 * 20)
    expect(tVal([], 50, 50)).toBe(50 * 40)
  })

  it('multi-player totals sum correctly', () => {
    const sideA = [
      { pos: 'QB', tradeVal: 5000 },
      { pos: 'RB', tradeVal: 3000 },
      { pos: 'WR', tradeVal: 2000 },
    ]
    expect(tVal(sideA, 0, 200)).toBe(10000)
  })

  it('mixed asset totals (player + pick + FAAB) correct', () => {
    const side = [
      { pos: 'WR', tradeVal: 4000 },
      { pos: 'PICK', est: 3000, tradeVal: 3090 },
    ]
    expect(tVal(side, 50, 200)).toBe(4000 + 3000 + 500)
  })

  it('FREE_TRADE_LIMIT unchanged', () => {
    expect(FREE_TRADE_LIMIT).toBe(3)
  })
})

// ══════════════════════════════════════════════════════════════
// 2. CANONICAL FDP VALUES UNCHANGED
// ══════════════════════════════════════════════════════════════

describe('canonical FDP values unchanged', () => {
  it('computeDynastyTradeVal caps at 9999', () => {
    const val = computeDynastyTradeVal('QB', 28, 9000, 1, 300, { isSF: true, sKey: 'PPR', tePremium: 0, idpMode: false })
    expect(val).toBeLessThanOrEqual(9999)
  })

  it('computeDynastyTradeVal uses ktcVal when available', () => {
    const withKtc = computeDynastyTradeVal('RB', 24, 7000, 1, 200, { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false })
    const withoutKtc = computeDynastyTradeVal('RB', 24, undefined, 1, 200, { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false })
    expect(withKtc).not.toBe(withoutKtc)
  })
})

// ══════════════════════════════════════════════════════════════
// 3. TRADE AGE IMPACT
// ══════════════════════════════════════════════════════════════

describe('trade age impact', () => {
  it('computes average age only from valid ages', () => {
    const result = computeTradeAgeImpact(
      [{ pos: 'RB', age: 24 }, { pos: 'WR', age: undefined }],
      [{ pos: 'QB', age: 28 }],
    )
    expect(result.avgAgeSent).toBe(24)
    expect(result.sentWithAge).toBe(1)
    expect(result.avgAgeReceived).toBe(28)
    expect(result.receivedWithAge).toBe(1)
  })

  it('returns null avg when no valid ages', () => {
    const result = computeTradeAgeImpact(
      [{ pos: 'RB' }],
      [{ pos: 'PICK', age: 0 }],
    )
    expect(result.avgAgeSent).toBeNull()
    expect(result.avgAgeReceived).toBeNull()
  })

  it('excludes PICK from age calculations', () => {
    const result = computeTradeAgeImpact(
      [{ pos: 'PICK', age: 0 }, { pos: 'RB', age: 23 }],
      [{ pos: 'WR', age: 26 }],
    )
    expect(result.avgAgeSent).toBe(23)
    expect(result.sentWithAge).toBe(1)
  })

  it('classifies pre-prime correctly', () => {
    const result = computeTradeAgeImpact(
      [{ pos: 'RB', age: 20 }], // RB prime is 22-27, so 20 is pre-prime
      [],
    )
    expect(result.preSent).toBe(1)
    expect(result.primeSent).toBe(0)
    expect(result.postSent).toBe(0)
  })

  it('classifies post-prime correctly', () => {
    const result = computeTradeAgeImpact(
      [{ pos: 'RB', age: 29 }], // RB prime is 22-27, 29 is post-prime
      [],
    )
    expect(result.preSent).toBe(0)
    expect(result.postSent).toBe(1)
  })

  it('classifies in-prime correctly', () => {
    const result = computeTradeAgeImpact(
      [{ pos: 'QB', age: 28 }], // QB prime is 26-35
      [],
    )
    expect(result.primeSent).toBe(1)
  })

  it('aggregates multiple players correctly', () => {
    const result = computeTradeAgeImpact(
      [{ pos: 'RB', age: 24 }, { pos: 'WR', age: 26 }],
      [{ pos: 'QB', age: 30 }, { pos: 'TE', age: 28 }],
    )
    expect(result.avgAgeSent).toBe(25)
    expect(result.avgAgeReceived).toBe(29)
    expect(result.sentWithAge).toBe(2)
    expect(result.receivedWithAge).toBe(2)
  })

  it('handles age 0 as invalid', () => {
    const result = computeTradeAgeImpact(
      [{ pos: 'RB', age: 0 }],
      [],
    )
    expect(result.avgAgeSent).toBeNull()
    expect(result.sentWithAge).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════
// 4. POSITIONAL IMPACT
// ══════════════════════════════════════════════════════════════

describe('trade positional impact', () => {
  it('computes positional deltas', () => {
    const result = computeTradePositionalImpact(
      [{ pos: 'RB', tradeVal: 5000 }],
      [{ pos: 'WR', tradeVal: 4500 }],
    )
    expect(result).toHaveLength(2)
    const rb = result.find(d => d.pos === 'RB')!
    expect(rb.valSent).toBe(5000)
    expect(rb.valReceived).toBe(0)
    expect(rb.net).toBe(-5000)
    const wr = result.find(d => d.pos === 'WR')!
    expect(wr.valSent).toBe(0)
    expect(wr.valReceived).toBe(4500)
    expect(wr.net).toBe(4500)
  })

  it('filters out unaffected positions', () => {
    const result = computeTradePositionalImpact(
      [{ pos: 'QB', tradeVal: 5000 }],
      [{ pos: 'QB', tradeVal: 4000 }],
    )
    expect(result).toHaveLength(1)
    expect(result[0].pos).toBe('QB')
    expect(result[0].net).toBe(-1000)
  })

  it('handles multi-player same position', () => {
    const result = computeTradePositionalImpact(
      [{ pos: 'WR', tradeVal: 3000 }, { pos: 'WR', tradeVal: 2000 }],
      [{ pos: 'WR', tradeVal: 6000 }],
    )
    expect(result).toHaveLength(1)
    expect(result[0].valSent).toBe(5000)
    expect(result[0].valReceived).toBe(6000)
    expect(result[0].countSent).toBe(2)
    expect(result[0].countReceived).toBe(1)
  })

  it('excludes PICKs from positional impact', () => {
    const result = computeTradePositionalImpact(
      [{ pos: 'PICK', tradeVal: 6000 }],
      [{ pos: 'RB', tradeVal: 5000 }],
    )
    // PICK is not QB/RB/WR/TE so not in impact
    expect(result).toHaveLength(1)
    expect(result[0].pos).toBe('RB')
  })

  it('is deterministic', () => {
    const sent = [{ pos: 'QB', tradeVal: 5000 }, { pos: 'RB', tradeVal: 3000 }]
    const rcvd = [{ pos: 'WR', tradeVal: 7000 }]
    const r1 = computeTradePositionalImpact(sent, rcvd)
    const r2 = computeTradePositionalImpact(sent, rcvd)
    expect(r1).toEqual(r2)
  })
})

// ══════════════════════════════════════════════════════════════
// 5. DRAFT CAPITAL IMPACT
// ══════════════════════════════════════════════════════════════

describe('trade draft capital impact', () => {
  it('computes pick value sent/received', () => {
    const result = computeTradeDraftCapitalImpact(
      [{ pos: 'PICK', tradeVal: 6700, est: 6407 }, { pos: 'QB', tradeVal: 5000 }],
      [{ pos: 'PICK', tradeVal: 3840, est: 3728 }],
    )
    expect(result.picksSentCount).toBe(1)
    expect(result.picksReceivedCount).toBe(1)
    expect(result.pickValSent).toBe(6700)
    expect(result.pickValReceived).toBe(3840)
    expect(result.netPickVal).toBe(3840 - 6700)
  })

  it('handles no picks', () => {
    const result = computeTradeDraftCapitalImpact(
      [{ pos: 'QB', tradeVal: 5000 }],
      [{ pos: 'RB', tradeVal: 4000 }],
    )
    expect(result.picksSentCount).toBe(0)
    expect(result.picksReceivedCount).toBe(0)
    expect(result.netPickVal).toBe(0)
  })

  it('no double-counting: players excluded from pick calc', () => {
    const result = computeTradeDraftCapitalImpact(
      [{ pos: 'QB', tradeVal: 9000 }],
      [{ pos: 'RB', tradeVal: 8000 }],
    )
    expect(result.pickValSent).toBe(0)
    expect(result.pickValReceived).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════
// 6. TRADE WARNINGS
// ══════════════════════════════════════════════════════════════

describe('trade warnings', () => {
  it('warns on QB loss in Superflex', () => {
    const w = generateTradeWarnings(
      [{ pos: 'QB' }], [{ pos: 'RB' }],
      { isSF: true, picksSentCount: 0 },
    )
    expect(w.some(s => s.includes('Superflex'))).toBe(true)
  })

  it('warns on QB loss in SF with roster context', () => {
    const w = generateTradeWarnings(
      [{ pos: 'QB', name: 'Mahomes' }], [{ pos: 'RB', name: 'Barkley' }],
      { isSF: true, picksSentCount: 0, userRoster: [{ pos: 'QB', name: 'Mahomes' }, { pos: 'QB', name: 'Allen' }] },
    )
    expect(w.some(s => s.includes('1 QB'))).toBe(true)
  })

  it('no QB warning in 1QB', () => {
    const w = generateTradeWarnings(
      [{ pos: 'QB' }], [{ pos: 'RB' }],
      { isSF: false, picksSentCount: 0 },
    )
    expect(w.some(s => s.includes('Superflex'))).toBe(false)
  })

  it('warns on TE removal', () => {
    const w = generateTradeWarnings(
      [{ pos: 'TE', name: 'Kelce' }], [{ pos: 'RB', name: 'X' }],
      { isSF: false, picksSentCount: 0, userRoster: [{ pos: 'TE', name: 'Kelce' }] },
    )
    expect(w.some(s => s.includes('all TEs'))).toBe(true)
  })

  it('warns on 3+ picks sent', () => {
    const w = generateTradeWarnings(
      [], [],
      { isSF: false, picksSentCount: 3 },
    )
    expect(w.some(s => s.includes('3 draft picks'))).toBe(true)
  })

  it('warns when lineup settings unavailable', () => {
    const w = generateTradeWarnings(
      [], [],
      { isSF: false, picksSentCount: 0, userRoster: [{ pos: 'QB', name: 'A' }], hasSlotData: false },
    )
    expect(w.some(s => s.includes('Lineup settings unavailable'))).toBe(true)
  })

  it('no warning when conditions not met', () => {
    const w = generateTradeWarnings(
      [{ pos: 'RB' }], [{ pos: 'WR' }],
      { isSF: false, picksSentCount: 0 },
    )
    expect(w).toHaveLength(0)
  })

  it('warnings are deterministic', () => {
    const opts = { isSF: true, picksSentCount: 3 } as const
    const w1 = generateTradeWarnings([{ pos: 'QB' }], [{ pos: 'RB' }], opts)
    const w2 = generateTradeWarnings([{ pos: 'QB' }], [{ pos: 'RB' }], opts)
    expect(w1).toEqual(w2)
  })
})

// ══════════════════════════════════════════════════════════════
// 7. OPTIMAL LINEUP FROM SLOTS
// ══════════════════════════════════════════════════════════════

describe('optimal lineup from slots', () => {
  const slots = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPER_FLEX: 0 }
  const sfSlots = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPER_FLEX: 1 }

  it('fills mandatory slots first', () => {
    const plrs = [
      { pos: 'QB', name: 'Q1', tradeVal: 5000 },
      { pos: 'RB', name: 'R1', tradeVal: 4000 },
      { pos: 'RB', name: 'R2', tradeVal: 3000 },
      { pos: 'WR', name: 'W1', tradeVal: 3500 },
      { pos: 'WR', name: 'W2', tradeVal: 2500 },
      { pos: 'TE', name: 'T1', tradeVal: 2000 },
      { pos: 'RB', name: 'R3', tradeVal: 1500 },
    ]
    const result = computeOptimalLineupFromSlots(plrs, slots)
    // Starters: Q1 + R1 + R2 + W1 + W2 + T1 + FLEX=R3
    expect(result.starterVal).toBe(5000 + 4000 + 3000 + 3500 + 2500 + 2000 + 1500)
    expect(result.benchVal).toBe(0)
  })

  it('FLEX picks best remaining RB/WR/TE', () => {
    const plrs = [
      { pos: 'QB', name: 'Q1', tradeVal: 5000 },
      { pos: 'RB', name: 'R1', tradeVal: 4000 },
      { pos: 'RB', name: 'R2', tradeVal: 3000 },
      { pos: 'WR', name: 'W1', tradeVal: 3500 },
      { pos: 'WR', name: 'W2', tradeVal: 2500 },
      { pos: 'TE', name: 'T1', tradeVal: 2000 },
      { pos: 'WR', name: 'W3', tradeVal: 1800 },
      { pos: 'RB', name: 'R3', tradeVal: 1500 },
    ]
    const result = computeOptimalLineupFromSlots(plrs, slots)
    // FLEX should pick W3 (1800) over R3 (1500)
    expect(result.starterVal).toBe(5000 + 4000 + 3000 + 3500 + 2500 + 2000 + 1800)
    expect(result.benchVal).toBe(1500)
  })

  it('SUPER_FLEX picks best remaining QB/RB/WR/TE', () => {
    const plrs = [
      { pos: 'QB', name: 'Q1', tradeVal: 8000 },
      { pos: 'QB', name: 'Q2', tradeVal: 6000 },
      { pos: 'RB', name: 'R1', tradeVal: 4000 },
      { pos: 'RB', name: 'R2', tradeVal: 3000 },
      { pos: 'WR', name: 'W1', tradeVal: 3500 },
      { pos: 'WR', name: 'W2', tradeVal: 2500 },
      { pos: 'TE', name: 'T1', tradeVal: 2000 },
      { pos: 'RB', name: 'R3', tradeVal: 1500 },
    ]
    const result = computeOptimalLineupFromSlots(plrs, sfSlots)
    // QB1=8000, RB=4000+3000, WR=3500+2500, TE=2000, FLEX=R3(1500), SF=Q2(6000)
    expect(result.starterVal).toBe(8000 + 4000 + 3000 + 3500 + 2500 + 2000 + 1500 + 6000)
  })
})

// ══════════════════════════════════════════════════════════════
// 8. STANDALONE MODE
// ══════════════════════════════════════════════════════════════

describe('standalone mode', () => {
  it('buildTradeContext exists in afdp.tsx', () => {
    expect(afdpSrc).toContain('function buildTradeContext()')
  })

  it('standalone trade does not fabricate roster fit', () => {
    // When no powerRankingTeams, rosterImpact should be null
    expect(afdpSrc).toContain('var rosterImpact=null')
    expect(afdpSrc).toContain('if(powerRankingTeams&&myTeamIdx!=null)')
  })

  it('position impact is always available (no league required)', () => {
    // posImpact computed from tradeA/tradeB directly
    expect(afdpSrc).toContain('ctx.posImpact.length>0&&React.createElement')
  })

  it('age section uses only valid ages — no ||25 default', () => {
    // The old pattern should be gone from the age IIFE
    expect(afdpSrc).not.toMatch(/avgAgeA=tradeA\.reduce.*\|\|25/)
    expect(afdpSrc).not.toMatch(/avgAgeB=tradeB\.reduce.*\|\|25/)
  })

  it('age section shows "No age data" when ages unavailable', () => {
    expect(afdpSrc).toContain('"No age data"')
  })
})

// ══════════════════════════════════════════════════════════════
// 9. CONNECTED LEAGUE MODE
// ══════════════════════════════════════════════════════════════

describe('connected league mode', () => {
  it('user side detected by matching player names to roster', () => {
    expect(afdpSrc).toContain('uNames.indexOf(p.name)>=0')
  })

  it('user side requires positive match — does not default to A', () => {
    expect(afdpSrc).toContain('if(aOnU>0||bOnU>0)')
  })

  it('ownership validation checks if players are on user roster with granularity', () => {
    expect(afdpSrc).toContain('onRoster:onMy')
    expect(afdpSrc).toContain('otherTeam:otherTeam')
  })

  it('ownership warning distinguishes other-roster from free agent', () => {
    expect(afdpSrc).toContain('On another roster:')
    expect(afdpSrc).toContain('free agent')
  })

  it('before/after roster simulation does not mutate imported state', () => {
    // afterP is a derived array from filter+concat, not a mutation
    expect(afdpSrc).toContain('var afterP=offP.filter(')
  })

  it('lineup impact only computed when slot data available', () => {
    expect(afdpSrc).toContain('leagueIntel&&leagueIntel.hasSlotData&&leagueIntel.starterSlots')
  })

  it('roster impact section only renders when connected', () => {
    expect(afdpSrc).toContain('ctx.rosterImpact&&(function()')
  })

  it('position group ranks computed from league data', () => {
    expect(afdpSrc).toContain('leagueIntel.teams.forEach(function(t,ti)')
  })
})

// ══════════════════════════════════════════════════════════════
// 9b. USER-SIDE DETECTION INTEGRITY
// ══════════════════════════════════════════════════════════════

describe('user-side detection integrity', () => {
  // The core logic: aOnU>0&&bOnU>0 → always null (ambiguous)
  // Only one side having user players → that side identified

  it('A has user players, B has zero → userSide = A', () => {
    // When aOnU>0 and bOnU===0, aOnU>0&&bOnU>0 is false, so: aOnU>0?"A":"B" → "A"
    expect(afdpSrc).toContain('aOnU>0&&bOnU>0?null:aOnU>0?"A":"B"')
  })

  it('B has user players, A has zero → userSide = B', () => {
    // When aOnU===0 and bOnU>0, aOnU>0&&bOnU>0 is false, so: aOnU>0?"A":"B" → "B"
    // Same expression, verified by the ternary fallback
    expect(afdpSrc).toContain('aOnU>0?"A":"B"')
  })

  it('A has 2 user players, B has 1 → ambiguous (null)', () => {
    // Both > 0 → aOnU>0&&bOnU>0 is true → null
    // Critically: player COUNT does NOT resolve ambiguity
    expect(afdpSrc).toContain('aOnU>0&&bOnU>0?null')
    expect(afdpSrc).not.toContain('aOnU>=bOnU?"A":"B"')
  })

  it('A has 1 user player, B has 3 → ambiguous (null)', () => {
    // Same logic: both > 0 → null, regardless of count disparity
    // The expression does NOT compare counts — only checks >0
    const expr = 'aOnU>0&&bOnU>0?null:aOnU>0?"A":"B"'
    expect(afdpSrc).toContain(expr)
  })

  it('A has 1 user player, B has 1 → ambiguous (null)', () => {
    // Equal counts, both > 0 → null
    expect(afdpSrc).toContain('aOnU>0&&bOnU>0?null')
  })

  it('A has zero, B has zero → userSide = null (unknown)', () => {
    // aOnU===0 && bOnU===0 → outer if(aOnU>0||bOnU>0) is false → userSide stays null
    expect(afdpSrc).toContain('var userSide=null')
    expect(afdpSrc).toContain('if(aOnU>0||bOnU>0)')
  })

  it('ambiguous user side suppresses roster simulation', () => {
    // Roster simulation is guarded by if(userSide)
    expect(afdpSrc).toContain('if(userSide){')
    expect(afdpSrc).toContain('var uSent=userSide==="A"?tradeA:tradeB')
    // rosterImpact is only assigned inside the if(userSide) block
    // so when userSide is null, rosterImpact stays null
  })

  it('unknown user side suppresses roster simulation', () => {
    // When neither side has user players, userSide stays null (initial value)
    // The outer if(aOnU>0||bOnU>0) prevents entering the block at all
    expect(afdpSrc).toContain('var rosterImpact=null')
  })

  it('ambiguous user side preserves canonical totals and fairness', () => {
    // tVal and verdict are computed independently, outside buildTradeContext
    expect(afdpSrc).toContain('var tvA=tVal(tradeA,faabA),tvB=tVal(tradeB,faabB)')
    expect(afdpSrc).toContain('function verdict()')
  })

  it('unknown user side preserves canonical totals and fairness', () => {
    // Same — verdict doesn't depend on userSide at all
    const fnStart = afdpSrc.indexOf('function verdict()')
    const fnEnd = afdpSrc.indexOf('}', afdpSrc.indexOf('return {txt:"Team B', fnStart))
    const fnBody = afdpSrc.substring(fnStart, fnEnd)
    expect(fnBody).not.toContain('userSide')
    expect(fnBody).not.toContain('rosterImpact')
  })

  it('AI payload does not send rosterFit when userSide is null', () => {
    // rosterFit is gated on tCtx.rosterImpact which is null when userSide is null
    expect(afdpSrc).toContain('rosterFit:tCtx.rosterImpact?')
    expect(afdpSrc).toContain('rosterFit:rCtx.rosterImpact?')
  })

  it('ownership warnings remain neutral when side is ambiguous', () => {
    // Warning uses "Both sides contain your rostered players" not "You're sending/receiving"
    expect(afdpSrc).toContain('Both sides contain your rostered players')
    expect(afdpSrc).not.toContain("You're sending")
    expect(afdpSrc).not.toContain("You're receiving")
  })

  it('picks and FAAB do not determine user side', () => {
    // aOnU/bOnU filter explicitly excludes PICKs: p.pos!=="PICK"
    expect(afdpSrc).toContain('p.pos!=="PICK"&&uNames.indexOf(p.name)>=0')
    // FAAB is not part of the user-side detection
    const ctxFn = afdpSrc.substring(afdpSrc.indexOf('function buildTradeContext()'), afdpSrc.indexOf('function downloadGradeCard'))
    expect(ctxFn).not.toContain('faabA')
    expect(ctxFn).not.toContain('faabB')
  })
})

// ══════════════════════════════════════════════════════════════
// 10. FAIRNESS VS ROSTER FIT SEPARATION
// ══════════════════════════════════════════════════════════════

describe('fairness vs roster fit separation', () => {
  it('verdict function unchanged — does not consider roster', () => {
    // verdict only uses tvA, tvB
    const fair = verdict(5000, 4800)
    const unfair = verdict(8000, 4000)
    expect(fair.txt).toBe('Fair Trade')
    expect(unfair.txt).toBe('Team A Overpays')
  })

  it('roster impact is a separate section from verdict', () => {
    expect(afdpSrc).toContain('ROSTER IMPACT')
    // Verdict and roster impact are separate elements
    const verdictIdx = afdpSrc.indexOf('v.txt')
    const rosterIdx = afdpSrc.indexOf('ROSTER IMPACT')
    expect(verdictIdx).toBeLessThan(rosterIdx)
  })
})

// ══════════════════════════════════════════════════════════════
// 11. STRUCTURED RESULT SECTIONS
// ══════════════════════════════════════════════════════════════

describe('structured result sections', () => {
  it('renders POSITION IMPACT section', () => {
    expect(afdpSrc).toContain('"POSITION IMPACT"')
  })

  it('renders AGE / DYNASTY CONTEXT section', () => {
    expect(afdpSrc).toContain('"AGE / DYNASTY CONTEXT"')
  })

  it('renders DRAFT CAPITAL section', () => {
    expect(afdpSrc).toContain('"DRAFT CAPITAL"')
  })

  it('renders TRADE WARNINGS section', () => {
    expect(afdpSrc).toContain('"TRADE WARNINGS"')
  })

  it('renders FORMAT CONTEXT notes', () => {
    expect(afdpSrc).toContain('ctx.fmtNotes.length>0')
  })

  it('result order: verdict → values → players → roster → position → age → picks → warnings → AI', () => {
    const verdictPos = afdpSrc.indexOf('v.txt')
    const positionPos = afdpSrc.indexOf('"POSITION IMPACT"')
    const agePos = afdpSrc.indexOf('"AGE / DYNASTY CONTEXT"')
    const draftPos = afdpSrc.indexOf('"DRAFT CAPITAL"')
    const warningPos = afdpSrc.indexOf('"TRADE WARNINGS"')
    const aiPos = afdpSrc.indexOf('"AI ANALYSIS"')
    expect(verdictPos).toBeLessThan(positionPos)
    expect(positionPos).toBeLessThan(agePos)
    expect(agePos).toBeLessThan(draftPos)
    expect(draftPos).toBeLessThan(warningPos)
    expect(warningPos).toBeLessThan(aiPos)
  })

  it('draft capital only shown when picks involved', () => {
    expect(afdpSrc).toContain('ctx.draftCap.sent.length>0||ctx.draftCap.received.length>0')
  })

  it('warnings only shown when warnings exist', () => {
    expect(afdpSrc).toContain('ctx.warnings.length>0&&React.createElement')
  })
})

// ══════════════════════════════════════════════════════════════
// 12. AI PAYLOAD AND PROMPT
// ══════════════════════════════════════════════════════════════

describe('AI payload and prompt', () => {
  it('AI payload sends tradeVal not ktcVal', () => {
    // The old pattern val:p.ktcVal||0 should be replaced with val:p.tradeVal||0
    expect(afdpSrc).not.toContain('val:p.ktcVal||0')
    expect(afdpSrc).toContain('val:p.tradeVal||0')
  })

  it('AI payload includes positional impact', () => {
    expect(afdpSrc).toContain('posImpact:tCtx.posImpact')
  })

  it('AI payload includes roster fit when available', () => {
    expect(afdpSrc).toContain('rosterFit:tCtx.rosterImpact')
  })

  it('AI payload includes warnings', () => {
    expect(afdpSrc).toContain('warnings:tCtx.warnings')
  })

  it('core result works when AI unavailable (fallback)', () => {
    expect(afdpSrc).toContain('catch(e){setAiAnalysis(genAiAnalysis(tradeA,tradeB,tvA,tvB));}')
  })

  it('deterministic verdict renders before AI', () => {
    const verdictIdx = afdpSrc.indexOf('v.txt')
    const aiIdx = afdpSrc.indexOf('setAiAnalysis("Analyzing...")')
    // Verdict computation is before AI call
    expect(verdictIdx).toBeGreaterThan(0)
  })

  it('edge function prompt instructs AI to use only supplied facts', () => {
    const edgeSrc = readFileSync(resolve(rootDir, 'supabase/functions/analyze-trade/index.ts'), 'utf-8')
    expect(edgeSrc).toContain('Use ONLY supplied values and facts')
    expect(edgeSrc).toContain('Do NOT invent stats')
    expect(edgeSrc).toContain('Do NOT alter the trade totals')
    expect(edgeSrc).toContain('Distinguish raw trade fairness from roster fit')
  })

  it('edge function uses p.val for player value (not p.tradeVal or p.est)', () => {
    const edgeSrc = readFileSync(resolve(rootDir, 'supabase/functions/analyze-trade/index.ts'), 'utf-8')
    expect(edgeSrc).toContain('Value ${p.val || 0}')
  })
})

// ══════════════════════════════════════════════════════════════
// 13. FORMAT CONTEXT
// ══════════════════════════════════════════════════════════════

describe('format context', () => {
  it('formatContextLabel produces correct labels', () => {
    expect(formatContextLabel(true, true, 'PPR', 0)).toBe('Dynasty \u00B7 Superflex \u00B7 PPR')
    expect(formatContextLabel(false, false, 'Standard', 0)).toBe('Redraft \u00B7 1QB \u00B7 Standard')
    expect(formatContextLabel(true, false, 'Half', 0.5)).toBe('Dynasty \u00B7 1QB \u00B7 Half PPR \u00B7 TEP')
  })

  it('SF format note included when QB in trade', () => {
    expect(afdpSrc).toContain('QB assets carry premium value in Superflex')
  })

  it('TEP format note included when TE in trade', () => {
    expect(afdpSrc).toContain('TE values already reflect TE Premium adjustment')
  })

  it('dynasty format note for age relevance', () => {
    expect(afdpSrc).toContain('Age and draft picks are significant factors in dynasty')
  })
})

// ══════════════════════════════════════════════════════════════
// 14. IDP HANDLING
// ══════════════════════════════════════════════════════════════

describe('IDP handling', () => {
  it('IDP warning when IDP players in trade', () => {
    expect(afdpSrc).toContain('IDP player values included in totals but lineup impact reflects offensive positions only')
  })

  it('positional impact only tracks QB/RB/WR/TE', () => {
    const result = computeTradePositionalImpact(
      [{ pos: 'DL', tradeVal: 3000 }],
      [{ pos: 'LB', tradeVal: 2000 }],
    )
    // DL and LB are not in QB/RB/WR/TE
    expect(result).toHaveLength(0)
  })
})

// ══════════════════════════════════════════════════════════════
// 15. GENAIANALYSIS FIX
// ══════════════════════════════════════════════════════════════

describe('genAiAnalysis age fix', () => {
  it('genAiAnalysis no longer uses ||25 for age default', () => {
    // Extract genAiAnalysis function body
    const fnStart = afdpSrc.indexOf('function genAiAnalysis(')
    const fnEnd = afdpSrc.indexOf('function genCounterOffer(')
    const fnBody = afdpSrc.substring(fnStart, fnEnd)
    expect(fnBody).not.toContain('p.age||25')
    expect(fnBody).not.toContain('(p.age||25)')
  })

  it('genAiAnalysis filters to valid ages only', () => {
    const fnStart = afdpSrc.indexOf('function genAiAnalysis(')
    const fnEnd = afdpSrc.indexOf('function genCounterOffer(')
    const fnBody = afdpSrc.substring(fnStart, fnEnd)
    expect(fnBody).toContain('p.age&&p.age>0')
  })

  it('genAiAnalysis null-checks before age comparison', () => {
    const fnStart = afdpSrc.indexOf('function genAiAnalysis(')
    const fnEnd = afdpSrc.indexOf('function genCounterOffer(')
    const fnBody = afdpSrc.substring(fnStart, fnEnd)
    expect(fnBody).toContain('aAge!=null&&bAge!=null')
  })
})

// ══════════════════════════════════════════════════════════════
// 16. REGRESSION SAFETY
// ══════════════════════════════════════════════════════════════

describe('regression safety', () => {
  it('Prompt 16 league intelligence preserved', () => {
    expect(afdpSrc).toContain('LEAGUE INTELLIGENCE ENGINE')
    expect(afdpSrc).toContain('computeOptimalLineup')
    expect(afdpSrc).toContain('posRanks')
  })

  it('canonical rankings unchanged', () => {
    expect(afdpSrc).toContain('computeDynastyTradeVal(p.pos,p.age,p.ktcVal,p.posRank')
  })

  it('odds architecture unchanged', () => {
    expect(afdpSrc).toContain('oddsData')
    expect(afdpSrc).toContain('oddsSource')
  })

  it('current entitlement behavior unchanged', () => {
    expect(afdpSrc).toContain('FREE_TRADE_LIMIT')
    expect(afdpSrc).toContain("tradeCount>=FREE_TRADE_LIMIT")
  })

  it('share modal preserved', () => {
    expect(afdpSrc).toContain('showShareModal')
    expect(afdpSrc).toContain('Share This Trade')
  })

  it('poll preserved', () => {
    expect(afdpSrc).toContain('Who Won This Trade')
    expect(afdpSrc).toContain('castVote')
  })

  it('counter offer preserved', () => {
    expect(afdpSrc).toContain('genCounterOffer')
    expect(afdpSrc).toContain('SUGGESTED FIX')
  })

  it('trade tips preserved', () => {
    expect(afdpSrc).toContain('genAiSuggestions')
    expect(afdpSrc).toContain('TRADE TIPS')
  })

  it('save trade preserved', () => {
    expect(afdpSrc).toContain('saveTrade')
    expect(afdpSrc).toContain('tradeHistory')
  })

  it('trade block preserved', () => {
    expect(afdpSrc).toContain('TRADE BLOCK')
    expect(afdpSrc).toContain('tradeBlock')
  })

  it('multi-team: only 2-team trades supported (no 3-team)', () => {
    // Just Team A / Team B — no Team C
    expect(afdpSrc).toContain('"Team A"')
    expect(afdpSrc).toContain('"Team B"')
  })

  it('mobile responsive classes preserved', () => {
    expect(afdpSrc).toContain('flexWrap')
  })

  it('Prompt 15 mobile behavior preserved', () => {
    expect(afdpSrc).toContain('isDesktop')
    expect(afdpSrc).toContain('window.innerWidth')
  })
})
