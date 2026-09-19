import { describe, it, expect } from 'vitest'
import {
  dynastyBonus,
  getBaselines,
  ageGrade,
  tierLabel,
  scarcityLabel,
  makePick,
  playerSlug,
  tVal,
  verdict,
  isAdminEmail,
  isFullAccessEmail,
  FREE_RANK_LIMIT,
  FREE_TRADE_LIMIT,
  PRIME,
} from './logic'

// ── Smoke tests ──────────────────────────────────────────────────

describe('smoke', () => {
  it('test runner works', () => {
    expect(1 + 1).toBe(2)
  })
  it('logic module exports functions', () => {
    expect(typeof dynastyBonus).toBe('function')
    expect(typeof verdict).toBe('function')
  })
})

// ── dynastyBonus ─────────────────────────────────────────────────

describe('dynastyBonus', () => {
  it('returns 1 for DST, K, PICK', () => {
    expect(dynastyBonus('DST', 30)).toBe(1)
    expect(dynastyBonus('K', 22)).toBe(1)
    expect(dynastyBonus('PICK', 0)).toBe(1)
  })

  it('boosts young RBs (age < prime low)', () => {
    // RB prime low = 22, age 20 → 1 + 2*0.045 = 1.09
    expect(dynastyBonus('RB', 20)).toBeCloseTo(1.09)
  })

  it('boosts young QBs at slower rate', () => {
    // QB prime low = 26, age 22 → 1 + 4*0.020 = 1.08
    expect(dynastyBonus('QB', 22)).toBeCloseTo(1.08)
  })

  it('returns 1 for players in prime window', () => {
    expect(dynastyBonus('RB', 24)).toBe(1)
    expect(dynastyBonus('QB', 30)).toBe(1)
  })

  it('penalizes aging players (age > lo+6)', () => {
    // RB prime low = 22, lo+6 = 28, age 30 → 1 - (30-28)*0.065 = 0.87
    expect(dynastyBonus('RB', 30)).toBeCloseTo(0.87)
  })

  it('floors aging penalty at 0.45', () => {
    expect(dynastyBonus('RB', 40)).toBe(0.45)
  })
})

// ── getBaselines ─────────────────────────────────────────────────

describe('getBaselines', () => {
  it('returns correct baselines for 12-team non-SF', () => {
    const bl = getBaselines(12, false)
    expect(bl.QB).toBe(12)
    expect(bl.RB).toBe(24)
    expect(bl.WR).toBe(24)
    expect(bl.TE).toBe(12)
  })

  it('doubles QB baseline in superflex', () => {
    const bl = getBaselines(12, true)
    expect(bl.QB).toBe(24)
    expect(bl.RB).toBe(24)
  })
})

// ── ageGrade ─────────────────────────────────────────────────────

describe('ageGrade', () => {
  it('returns N/A for DST and PICK', () => {
    expect(ageGrade('DST', 0).g).toBe('N/A')
    expect(ageGrade('PICK', 0).g).toBe('N/A')
  })

  it('returns A+ for prime-center age', () => {
    // RB prime center = (22+27)/2 = 24.5, age 24 → d=0.5 ≤ 1.5
    expect(ageGrade('RB', 24).g).toBe('A+')
  })

  it('returns A for near-prime', () => {
    // RB center=24.5, age 22 → d=2.5 ≤ 3
    expect(ageGrade('RB', 22).g).toBe('A')
  })

  it('returns B for young pre-prime', () => {
    // RB center=24.5, age 19 → d=5.5 > 3, age < lo(22)
    expect(ageGrade('RB', 19).g).toBe('B')
  })

  it('returns D for very old', () => {
    // RB hi=27, age 33 > 27+5=32
    expect(ageGrade('RB', 33).g).toBe('D')
  })

  it('returns C for post-prime', () => {
    // RB center=24.5, age 30 → d=5.5 > 3, not < lo, not > hi+5(32)
    expect(ageGrade('RB', 30).g).toBe('C')
  })
})

// ── tierLabel ────────────────────────────────────────────────────

describe('tierLabel', () => {
  it('RB1 is tier 1', () => {
    expect(tierLabel(1, 'RB').t).toBe(1)
  })
  it('RB4 is tier 2', () => {
    expect(tierLabel(4, 'RB').t).toBe(2)
  })
  it('RB8 is tier 3', () => {
    expect(tierLabel(8, 'RB').t).toBe(3)
  })
  it('RB16 is tier 4', () => {
    expect(tierLabel(16, 'RB').t).toBe(4)
  })
  it('RB30 is tier 5', () => {
    expect(tierLabel(30, 'RB').t).toBe(5)
  })
  it('QB has different cutoffs', () => {
    expect(tierLabel(3, 'QB').t).toBe(2)
    expect(tierLabel(6, 'QB').t).toBe(3)
  })
  it('TE1 is tier 1', () => {
    expect(tierLabel(1, 'TE').t).toBe(1)
  })
})

// ── scarcityLabel ────────────────────────────────────────────────

describe('scarcityLabel', () => {
  it('Elite for top 25% of baseline', () => {
    expect(scarcityLabel(3, 12).l).toBe('Elite')
  })
  it('Scarce for 25-50%', () => {
    expect(scarcityLabel(5, 12).l).toBe('Scarce')
  })
  it('Available for 50-75%', () => {
    expect(scarcityLabel(8, 12).l).toBe('Available')
  })
  it('Deep for beyond baseline', () => {
    expect(scarcityLabel(12, 12).l).toBe('Deep')
  })
})

// ── makePick ─────────────────────────────────────────────────────

describe('makePick', () => {
  it('applies 5% boost for round 1 picks', () => {
    const pk = makePick({ round: 1, est: 1000, name: '2027 1st' })
    expect(pk.tradeVal).toBe(1050)
    expect(pk.pos).toBe('PICK')
  })

  it('applies 3% boost for round 2 picks', () => {
    const pk = makePick({ round: 2, est: 1000, name: '2027 2nd' })
    expect(pk.tradeVal).toBe(1030)
  })

  it('no boost for round 3+ picks', () => {
    const pk = makePick({ round: 3, est: 1000, name: '2027 3rd' })
    expect(pk.tradeVal).toBe(1000)
  })

  it('sets age to 0 and pos to PICK', () => {
    const pk = makePick({ round: 1, est: 500, name: 'test' })
    expect(pk.age).toBe(0)
    expect(pk.pos).toBe('PICK')
  })
})

// ── playerSlug ───────────────────────────────────────────────────

describe('playerSlug', () => {
  it('converts name to slug', () => {
    expect(playerSlug('Patrick Mahomes')).toBe('patrick-mahomes')
  })
  it('strips special characters', () => {
    expect(playerSlug("Ja'Marr Chase")).toBe('ja-marr-chase')
  })
  it('handles Jr. suffix', () => {
    expect(playerSlug('Travis Etienne Jr.')).toBe('travis-etienne-jr')
  })
  it('handles III suffix', () => {
    expect(playerSlug('Kenneth Walker III')).toBe('kenneth-walker-iii')
  })
})

// ── tVal (trade value sum) ───────────────────────────────────────

describe('tVal', () => {
  it('sums tradeVal for players', () => {
    const side = [
      { pos: 'QB', tradeVal: 5000 },
      { pos: 'RB', tradeVal: 3000 },
    ]
    expect(tVal(side, 0, 200)).toBe(8000)
  })

  it('uses est for PICKs', () => {
    const side = [
      { pos: 'PICK', est: 2000, tradeVal: 1500 },
    ]
    expect(tVal(side, 0, 200)).toBe(2000)
  })

  it('converts FAAB to value', () => {
    // fa=100, budget=200 → 100 * (2000/200) = 1000
    expect(tVal([], 100, 200)).toBe(1000)
  })

  it('clamps tradeVal to 0 minimum', () => {
    const side = [{ pos: 'QB', tradeVal: -500 }]
    expect(tVal(side, 0, 200)).toBe(0)
  })
})

// ── verdict ──────────────────────────────────────────────────────

describe('verdict', () => {
  it('returns Fair Trade when both sides are 0', () => {
    expect(verdict(0, 0).txt).toBe('Fair Trade')
  })

  it('returns Fair Trade when diff < 8%', () => {
    // 5000 vs 4800 → diff=200, pct=200/5000*100=4%
    expect(verdict(5000, 4800).txt).toBe('Fair Trade')
  })

  it('returns Team A Overpays when A > B by 8%+', () => {
    // 6000 vs 4000 → diff=2000, pct=2000/6000*100=33%
    const v = verdict(6000, 4000)
    expect(v.txt).toBe('Team A Overpays')
    expect(v.sub).toContain('Team B wins')
  })

  it('returns Team B Overpays when B > A by 8%+', () => {
    const v = verdict(4000, 6000)
    expect(v.txt).toBe('Team B Overpays')
    expect(v.sub).toContain('Team A wins')
  })

  it('pct clamps between 15 and 85', () => {
    const v1 = verdict(10000, 1000)
    expect(v1.pct).toBeGreaterThanOrEqual(15)
    const v2 = verdict(1000, 10000)
    expect(v2.pct).toBeLessThanOrEqual(85)
  })
})

// ── Entitlement checks ───────────────────────────────────────────

describe('entitlements', () => {
  it('FREE_RANK_LIMIT is 20', () => {
    expect(FREE_RANK_LIMIT).toBe(20)
  })

  it('FREE_TRADE_LIMIT is 3', () => {
    expect(FREE_TRADE_LIMIT).toBe(3)
  })

  it('identifies admin emails (case insensitive)', () => {
    expect(isAdminEmail('jacklawrence713@gmail.com')).toBe(true)
    expect(isAdminEmail('JACKLAWRENCE713@GMAIL.COM')).toBe(true)
    expect(isAdminEmail('random@gmail.com')).toBe(false)
  })

  it('handles null/undefined for admin check', () => {
    expect(isAdminEmail(null)).toBe(false)
    expect(isAdminEmail(undefined)).toBe(false)
  })

  it('identifies full-access emails', () => {
    expect(isFullAccessEmail('stevengroller@yahoo.com')).toBe(true)
    expect(isFullAccessEmail('nobody@example.com')).toBe(false)
  })
})

// ── PRIME windows ────────────────────────────────────────────────

describe('PRIME windows', () => {
  it('RB prime is 22-27', () => {
    expect(PRIME.RB).toEqual([22, 27])
  })
  it('QB prime is 26-35', () => {
    expect(PRIME.QB).toEqual([26, 35])
  })
  it('all positions have prime windows', () => {
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DL', 'LB', 'DB']
    positions.forEach(pos => {
      expect(PRIME[pos]).toBeDefined()
      expect(PRIME[pos]).toHaveLength(2)
    })
  })
})
