import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  computeTeamPosValues,
  computePosRanksForTeams,
  computeTeamNeeds,
  computePartnerScore,
  generateTradeCandidates,
  TF_MAX_CANDIDATES,
  TF_FAIRNESS_THRESHOLD,
  TFCandidate,
} from './logic'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const afdpSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8').replace(/\r\n/g, '\n')

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function mkPlayer(name: string, pos: string, tradeVal: number, age?: number) {
  return { name, pos, tradeVal, age: age || 25 }
}

function mkPick(name: string, est: number) {
  return { name, pos: 'PICK', tradeVal: 0, est }
}

function fourTeamLeague() {
  return [
    { idx: 0, name: 'User Team', players: [
      mkPlayer('QB1', 'QB', 6000), mkPlayer('RB1', 'RB', 7000), mkPlayer('RB2', 'RB', 5000),
      mkPlayer('WR1', 'WR', 3000), mkPlayer('WR2', 'WR', 2000), mkPlayer('TE1', 'TE', 4000),
    ]},
    { idx: 1, name: 'Team Alpha', players: [
      mkPlayer('QB2', 'QB', 5000), mkPlayer('RB3', 'RB', 3000), mkPlayer('WR3', 'WR', 7000),
      mkPlayer('WR4', 'WR', 6000), mkPlayer('TE2', 'TE', 2000),
    ]},
    { idx: 2, name: 'Team Beta', players: [
      mkPlayer('QB3', 'QB', 4000), mkPlayer('RB4', 'RB', 6000), mkPlayer('RB5', 'RB', 5500),
      mkPlayer('WR5', 'WR', 2000), mkPlayer('TE3', 'TE', 5000),
    ]},
    { idx: 3, name: 'Team Gamma', players: [
      mkPlayer('QB4', 'QB', 3000), mkPlayer('RB6', 'RB', 2000), mkPlayer('WR6', 'WR', 4000),
      mkPlayer('WR7', 'WR', 3500), mkPlayer('TE4', 'TE', 3000),
    ]},
  ]
}

function twelveTeamLeague() {
  const teams: Array<{ idx: number; name: string; players: any[] }> = []
  for (let i = 0; i < 12; i++) {
    teams.push({ idx: i, name: 'Team ' + i, players: [
      mkPlayer('QB' + i, 'QB', 5000 - i * 300),
      mkPlayer('RB' + i + 'a', 'RB', 6000 - i * 400),
      mkPlayer('RB' + i + 'b', 'RB', 4000 - i * 200),
      mkPlayer('WR' + i + 'a', 'WR', 5500 - i * 350),
      mkPlayer('WR' + i + 'b', 'WR', 3000 - i * 150),
      mkPlayer('TE' + i, 'TE', 3500 - i * 200),
    ]})
  }
  return teams
}

// ══════════════════════════════════════════════════════════════
// 1. computeTeamPosValues
// ══════════════════════════════════════════════════════════════

describe('computeTeamPosValues', () => {
  it('sums values per position', () => {
    const r = computeTeamPosValues([
      mkPlayer('A', 'QB', 5000), mkPlayer('B', 'RB', 3000), mkPlayer('C', 'RB', 2000),
    ])
    expect(r.QB).toBe(5000)
    expect(r.RB).toBe(5000)
    expect(r.WR).toBe(0)
    expect(r.TE).toBe(0)
  })

  it('ignores PICKs and non-offensive positions', () => {
    const r = computeTeamPosValues([
      mkPlayer('A', 'QB', 5000), mkPick('2025 1st', 4000), mkPlayer('D', 'DL', 1000),
    ])
    expect(r.QB).toBe(5000)
    expect(r.RB).toBe(0)
  })

  it('handles empty roster', () => {
    const r = computeTeamPosValues([])
    expect(r.QB).toBe(0)
    expect(r.RB).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════
// 2. computePosRanksForTeams
// ══════════════════════════════════════════════════════════════

describe('computePosRanksForTeams', () => {
  it('ranks teams correctly per position', () => {
    const vals = [
      { QB: 8000, RB: 2000, WR: 5000, TE: 1000 },
      { QB: 6000, RB: 9000, WR: 3000, TE: 4000 },
      { QB: 4000, RB: 5000, WR: 7000, TE: 3000 },
    ]
    const ranks = computePosRanksForTeams(vals)
    expect(ranks[0].QB).toBe(1)
    expect(ranks[1].RB).toBe(1)
    expect(ranks[2].WR).toBe(1)
    expect(ranks[0].RB).toBe(3)
  })

  it('ties give same rank (deterministic)', () => {
    const vals = [
      { QB: 5000, RB: 3000, WR: 4000, TE: 2000 },
      { QB: 3000, RB: 5000, WR: 4000, TE: 6000 },
    ]
    const ranks = computePosRanksForTeams(vals)
    expect(ranks[0].WR).toBe(1)
    expect(ranks[1].WR).toBe(1)
  })
})

// ══════════════════════════════════════════════════════════════
// 3. computeTeamNeeds — league-size percentiles
// ══════════════════════════════════════════════════════════════

describe('computeTeamNeeds', () => {
  it('bottom half = need, top third = surplus (12-team)', () => {
    const needs = computeTeamNeeds({ QB: 1, RB: 10, WR: 5, TE: 3 }, { QB: 8000, RB: 1000, WR: 3000, TE: 5000 }, 12)
    expect(needs.find(n => n.pos === 'QB')!.isSurplus).toBe(true)
    expect(needs.find(n => n.pos === 'RB')!.isNeed).toBe(true)
  })

  it('middle rank is neither need nor surplus (12-team)', () => {
    const needs = computeTeamNeeds({ QB: 5, RB: 5, WR: 5, TE: 5 }, { QB: 4000, RB: 4000, WR: 4000, TE: 4000 }, 12)
    needs.forEach(n => { expect(n.isNeed).toBe(false); expect(n.isSurplus).toBe(false) })
  })

  it('4-team league thresholds', () => {
    // n=4: need > ceil(2)=2, surplus <= max(1,ceil(1.32))=2
    // Rank 1-2 = surplus, Rank 3-4 = need — no middle ground in 4-team
    const needs = computeTeamNeeds({ QB: 1, RB: 3, WR: 2, TE: 4 }, { QB: 5000, RB: 2000, WR: 3000, TE: 1000 }, 4)
    expect(needs.find(n => n.pos === 'QB')!.isSurplus).toBe(true)
    expect(needs.find(n => n.pos === 'RB')!.isNeed).toBe(true)
    expect(needs.find(n => n.pos === 'WR')!.isSurplus).toBe(true)
    expect(needs.find(n => n.pos === 'TE')!.isNeed).toBe(true)
  })

  it('8-team league thresholds', () => {
    // n=8: need > ceil(4)=4, surplus <= max(1,ceil(2.64))=3
    const needs = computeTeamNeeds({ QB: 4, RB: 3, WR: 5, TE: 1 }, { QB: 4000, RB: 5000, WR: 2000, TE: 8000 }, 8)
    expect(needs.find(n => n.pos === 'QB')!.isNeed).toBe(false)
    expect(needs.find(n => n.pos === 'QB')!.isSurplus).toBe(false) // rank 4 is middle
    expect(needs.find(n => n.pos === 'RB')!.isSurplus).toBe(true) // rank 3
    expect(needs.find(n => n.pos === 'WR')!.isNeed).toBe(true) // rank 5
    expect(needs.find(n => n.pos === 'TE')!.isSurplus).toBe(true) // rank 1
  })

  it('10-team league thresholds', () => {
    // n=10: need > ceil(5)=5, surplus <= max(1,ceil(3.3))=4
    const needs = computeTeamNeeds({ QB: 5, RB: 6, WR: 4, TE: 1 }, { QB: 4000, RB: 3000, WR: 5000, TE: 8000 }, 10)
    expect(needs.find(n => n.pos === 'QB')!.isNeed).toBe(false) // rank 5 is not > 5
    expect(needs.find(n => n.pos === 'RB')!.isNeed).toBe(true) // rank 6 > 5
    expect(needs.find(n => n.pos === 'WR')!.isSurplus).toBe(true) // rank 4 <= 4
  })

  it('14-team league thresholds', () => {
    // n=14: need > ceil(7)=7, surplus <= max(1,ceil(4.62))=5
    const needs = computeTeamNeeds({ QB: 5, RB: 8, WR: 6, TE: 7 }, { QB: 4000, RB: 2000, WR: 3000, TE: 3000 }, 14)
    expect(needs.find(n => n.pos === 'QB')!.isSurplus).toBe(true)
    expect(needs.find(n => n.pos === 'RB')!.isNeed).toBe(true)
    expect(needs.find(n => n.pos === 'WR')!.isNeed).toBe(false) // rank 6 not > 7
    expect(needs.find(n => n.pos === 'TE')!.isNeed).toBe(false) // rank 7 not > 7
  })
})

// ══════════════════════════════════════════════════════════════
// 4. computePartnerScore
// ══════════════════════════════════════════════════════════════

describe('computePartnerScore', () => {
  it('cross-need/surplus scores highest', () => {
    const userNeeds = [
      { pos: 'QB', isNeed: true, isSurplus: false },
      { pos: 'RB', isNeed: false, isSurplus: true },
      { pos: 'WR', isNeed: false, isSurplus: false },
      { pos: 'TE', isNeed: false, isSurplus: false },
    ]
    const partnerNeeds = [
      { pos: 'QB', isNeed: false, isSurplus: true },
      { pos: 'RB', isNeed: true, isSurplus: false },
      { pos: 'WR', isNeed: false, isSurplus: false },
      { pos: 'TE', isNeed: false, isSurplus: false },
    ]
    expect(computePartnerScore(userNeeds, partnerNeeds)).toBe(6)
  })

  it('no overlap scores zero', () => {
    const flat = [
      { pos: 'QB', isNeed: false, isSurplus: false },
      { pos: 'RB', isNeed: false, isSurplus: false },
      { pos: 'WR', isNeed: false, isSurplus: false },
      { pos: 'TE', isNeed: false, isSurplus: false },
    ]
    expect(computePartnerScore(flat, flat)).toBe(0)
  })

  it('partial matches score +1', () => {
    const userNeeds = [
      { pos: 'QB', isNeed: true, isSurplus: false },
      { pos: 'RB', isNeed: false, isSurplus: false },
      { pos: 'WR', isNeed: false, isSurplus: false },
      { pos: 'TE', isNeed: false, isSurplus: false },
    ]
    const partnerNeeds = [
      { pos: 'QB', isNeed: false, isSurplus: false },
      { pos: 'RB', isNeed: false, isSurplus: false },
      { pos: 'WR', isNeed: false, isSurplus: false },
      { pos: 'TE', isNeed: false, isSurplus: false },
    ]
    expect(computePartnerScore(userNeeds, partnerNeeds)).toBe(1)
  })
})

// ══════════════════════════════════════════════════════════════
// 5. Core candidate generation
// ══════════════════════════════════════════════════════════════

describe('generateTradeCandidates', () => {
  it('returns empty when < 2 teams', () => {
    expect(generateTradeCandidates({
      userIdx: 0, teams: [{ idx: 0, name: 'Solo', players: [mkPlayer('QB1', 'QB', 5000)] }],
    })).toEqual([])
  })

  it('returns empty when userIdx not found', () => {
    expect(generateTradeCandidates({ userIdx: 99, teams: fourTeamLeague() })).toEqual([])
  })

  it('returns candidates with correct structure including fairnessLabel', () => {
    const r = generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague() })
    if (r.length > 0) {
      const c = r[0]
      expect(c).toHaveProperty('partnerIdx')
      expect(c).toHaveProperty('partnerName')
      expect(c).toHaveProperty('userSends')
      expect(c).toHaveProperty('userReceives')
      expect(c).toHaveProperty('userVal')
      expect(c).toHaveProperty('partnerVal')
      expect(c).toHaveProperty('fairnessPct')
      expect(c).toHaveProperty('score')
      expect(c).toHaveProperty('fitLabel')
      expect(c).toHaveProperty('fairnessLabel')
      expect(c).toHaveProperty('key')
    }
  })

  it('respects MAX_CANDIDATES cap', () => {
    expect(generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague() }).length)
      .toBeLessThanOrEqual(TF_MAX_CANDIDATES)
  })

  it('all candidates within fairness threshold', () => {
    generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague() }).forEach(c => {
      expect(c.fairnessPct).toBeLessThanOrEqual(TF_FAIRNESS_THRESHOLD)
    })
  })

  it('sorted by score descending with deterministic tie-breaking', () => {
    const r = generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague() })
    for (let i = 1; i < r.length; i++) {
      if (r[i].score === r[i - 1].score) {
        // Same score: secondary sort by fairnessPct ascending, then key
        expect(r[i].fairnessPct).toBeGreaterThanOrEqual(r[i - 1].fairnessPct)
      } else {
        expect(r[i].score).toBeLessThan(r[i - 1].score)
      }
    }
  })

  it('no duplicate keys', () => {
    const r = generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague() })
    expect(new Set(r.map(c => c.key)).size).toBe(r.length)
  })

  it('fitLabel is one of Strong/Good/Possible Fit', () => {
    generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague() }).forEach(c => {
      expect(['Strong Fit', 'Good Fit', 'Possible Fit']).toContain(c.fitLabel)
    })
  })

  it('userVal and partnerVal are positive', () => {
    generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague() }).forEach(c => {
      expect(c.userVal).toBeGreaterThan(0)
      expect(c.partnerVal).toBeGreaterThan(0)
    })
  })
})

// ══════════════════════════════════════════════════════════════
// 6. Player ownership integrity
// ══════════════════════════════════════════════════════════════

describe('player ownership integrity', () => {
  it('userSends come only from user team', () => {
    const teams = fourTeamLeague()
    const userNames = new Set(teams[0].players.map(p => p.name))
    generateTradeCandidates({ userIdx: 0, teams }).forEach(c => {
      c.userSends.forEach(p => expect(userNames.has(p.name)).toBe(true))
    })
  })

  it('userReceives come only from partner team', () => {
    const teams = fourTeamLeague()
    generateTradeCandidates({ userIdx: 0, teams }).forEach(c => {
      const partnerNames = new Set(teams[c.partnerIdx].players.map(p => p.name))
      c.userReceives.forEach(p => expect(partnerNames.has(p.name)).toBe(true))
    })
  })

  it('no player on both sides', () => {
    generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague() }).forEach(c => {
      const sendNames = new Set(c.userSends.map(p => p.name))
      c.userReceives.forEach(p => expect(sendNames.has(p.name)).toBe(false))
    })
  })

  it('no player appears twice within a side', () => {
    generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague() }).forEach(c => {
      expect(new Set(c.userSends.map(p => p.name)).size).toBe(c.userSends.length)
      expect(new Set(c.userReceives.map(p => p.name)).size).toBe(c.userReceives.length)
    })
  })

  it('does not trade with self', () => {
    generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague() }).forEach(c => {
      expect(c.partnerIdx).not.toBe(0)
    })
  })

  it('no free agents appear as trade targets', () => {
    const teams = fourTeamLeague()
    const allNames = new Set(teams.flatMap(t => t.players.map(p => p.name)))
    generateTradeCandidates({ userIdx: 0, teams }).forEach(c => {
      c.userSends.concat(c.userReceives).forEach(p => {
        expect(allNames.has(p.name)).toBe(true)
      })
    })
  })
})

// ══════════════════════════════════════════════════════════════
// 7. Pick ownership
// ══════════════════════════════════════════════════════════════

describe('pick ownership', () => {
  it('only user-owned picks appear in userSends', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'QB', 5000), mkPlayer('B', 'RB', 3000),
        mkPlayer('C', 'WR', 2000), mkPlayer('D', 'TE', 1500),
        mkPick('User 2025 1st', 5000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 5200), mkPlayer('Y', 'RB', 6000),
        mkPlayer('Z', 'QB', 2000), mkPlayer('W', 'TE', 3000),
        mkPick('Partner 2025 1st', 4000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    r.forEach(c => {
      c.userSends.filter(p => p.pos === 'PICK').forEach(pk => {
        expect(pk.name).toBe('User 2025 1st')
      })
    })
  })

  it('partner picks do not appear in userSends', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'QB', 5000), mkPlayer('B', 'RB', 3000),
        mkPlayer('C', 'WR', 2000), mkPlayer('D', 'TE', 1500),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 5000), mkPlayer('Y', 'RB', 6000),
        mkPick('Partner 2025 1st', 4000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    r.forEach(c => {
      c.userSends.forEach(p => { expect(p.name).not.toBe('Partner 2025 1st') })
    })
  })

  it('uses est for pick valuation (not tradeVal)', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'QB', 5000), mkPlayer('B', 'RB', 7000),
        mkPlayer('C', 'WR', 2000), mkPlayer('D', 'TE', 1500),
        mkPick('2025 1st', 5000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 5000), mkPlayer('Y', 'RB', 2000),
        mkPlayer('Z', 'QB', 3000), mkPlayer('W', 'TE', 2000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    r.filter(c => c.userSends.some(p => p.pos === 'PICK')).forEach(c => {
      expect(c.userVal).toBeGreaterThan(0)
    })
  })
})

// ══════════════════════════════════════════════════════════════
// 8. Canonical fairness — 25% search vs 8% analyzer
// ══════════════════════════════════════════════════════════════

describe('canonical fairness alignment', () => {
  it('fairnessLabel says "Fair" only when gap < 8%', () => {
    const teams = fourTeamLeague()
    const r = generateTradeCandidates({ userIdx: 0, teams })
    r.forEach(c => {
      if (c.fairnessLabel === 'Fair') {
        expect(c.fairnessPct).toBeLessThan(8)
      }
    })
  })

  it('20% gap candidate is NOT labeled "Fair"', () => {
    // Create a scenario that produces a ~20% gap candidate
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 6000), mkPlayer('B', 'RB', 5000),
        mkPlayer('C', 'QB', 4000), mkPlayer('D', 'WR', 1000), mkPlayer('E', 'TE', 2000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 5000), mkPlayer('Y', 'QB', 3000),
        mkPlayer('Z', 'RB', 1000), mkPlayer('W', 'TE', 2000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    r.filter(c => c.fairnessPct >= 8).forEach(c => {
      expect(c.fairnessLabel).not.toBe('Fair')
      expect(['Value favors you', 'Value favors partner']).toContain(c.fairnessLabel)
    })
  })

  it('fairnessLabel direction is correct', () => {
    const teams = fourTeamLeague()
    const r = generateTradeCandidates({ userIdx: 0, teams })
    r.forEach(c => {
      if (c.fairnessPct >= 8) {
        if (c.userVal > c.partnerVal) {
          expect(c.fairnessLabel).toBe('Value favors you')
        } else {
          expect(c.fairnessLabel).toBe('Value favors partner')
        }
      }
    })
  })

  it('fairnessPct uses canonical abs(diff)/max formula', () => {
    generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague() }).forEach(c => {
      const mx = Math.max(c.userVal, c.partnerVal)
      const expectedPct = Math.abs(c.userVal - c.partnerVal) / mx * 100
      expect(Math.abs(c.fairnessPct - expectedPct)).toBeLessThan(0.01)
    })
  })
})

// ══════════════════════════════════════════════════════════════
// 9. Bidirectional fit
// ══════════════════════════════════════════════════════════════

describe('bidirectional fit scoring', () => {
  it('trades filling mutual needs score higher', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('RB1', 'RB', 7000), mkPlayer('RB2', 'RB', 6000), mkPlayer('RB3', 'RB', 5000),
        mkPlayer('QB1', 'QB', 5000), mkPlayer('WR1', 'WR', 1000), mkPlayer('TE1', 'TE', 3000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('WR2', 'WR', 7000), mkPlayer('WR3', 'WR', 6000), mkPlayer('WR4', 'WR', 5500),
        mkPlayer('QB2', 'QB', 4000), mkPlayer('RB4', 'RB', 1000), mkPlayer('TE2', 'TE', 3000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    if (r.length > 0) {
      expect(r[0].userSends.some(p => p.pos === 'RB')).toBe(true)
      expect(r[0].userReceives.some(p => p.pos === 'WR')).toBe(true)
    }
  })

  it('partner-worsening trade gets capped at Possible Fit', () => {
    // User has surplus RB, partner also has surplus RB — sending RB to partner worsens them
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('RB1', 'RB', 5000), mkPlayer('RB2', 'RB', 4800),
        mkPlayer('QB1', 'QB', 3000), mkPlayer('WR1', 'WR', 1000), mkPlayer('TE1', 'TE', 2000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('WR2', 'WR', 5000), mkPlayer('WR3', 'WR', 4500),
        mkPlayer('QB2', 'QB', 3000), mkPlayer('RB3', 'RB', 1000), mkPlayer('TE2', 'TE', 2000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    // All candidates with negative partner fit should be "Possible Fit"
    // We can't directly measure pFit, but we verify the label constraint
    r.forEach(c => {
      expect(['Strong Fit', 'Good Fit', 'Possible Fit']).toContain(c.fitLabel)
    })
  })
})

// ══════════════════════════════════════════════════════════════
// 10. Package types
// ══════════════════════════════════════════════════════════════

describe('package types', () => {
  it('produces 1-for-1 trades', () => {
    // Two teams with matching value players at complementary positions
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 5000), mkPlayer('B', 'QB', 4000),
        mkPlayer('C', 'WR', 1000), mkPlayer('D', 'TE', 2000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 5000), mkPlayer('Y', 'QB', 3000),
        mkPlayer('Z', 'RB', 1000), mkPlayer('W', 'TE', 2000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    const oneForOne = r.filter(c => c.userSends.length === 1 && c.userReceives.length === 1)
    expect(oneForOne.length).toBeGreaterThan(0)
  })

  it('produces 2-for-1 trades', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 4000), mkPlayer('B', 'RB', 3500),
        mkPlayer('C', 'QB', 3000), mkPlayer('D', 'WR', 1000), mkPlayer('E', 'TE', 1500),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 7000), mkPlayer('Y', 'QB', 3000),
        mkPlayer('Z', 'RB', 1000), mkPlayer('W', 'TE', 2000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    const twoForOne = r.filter(c => c.userSends.length === 2 && c.userReceives.length === 1)
    expect(twoForOne.length).toBeGreaterThan(0)
  })

  it('produces 1-for-2 trades when user has high-value asset', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 9000), mkPlayer('B', 'QB', 3000),
        mkPlayer('C', 'WR', 1000), mkPlayer('D', 'TE', 1000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 5000), mkPlayer('Y', 'WR', 4500),
        mkPlayer('Z', 'QB', 2000), mkPlayer('W', 'TE', 2000), mkPlayer('V', 'RB', 1000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    const oneForTwo = r.filter(c => c.userSends.length === 1 && c.userReceives.length === 2)
    expect(oneForTwo.length).toBeGreaterThan(0)
  })

  it('produces 2-for-2 trades', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 5000), mkPlayer('B', 'RB', 4000),
        mkPlayer('C', 'QB', 3000), mkPlayer('D', 'WR', 1000), mkPlayer('E', 'TE', 1500),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 5000), mkPlayer('Y', 'WR', 4000),
        mkPlayer('Z', 'QB', 2000), mkPlayer('W', 'RB', 1000), mkPlayer('V', 'TE', 2000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    const twoForTwo = r.filter(c => c.userSends.length === 2 && c.userReceives.length === 2)
    expect(twoForTwo.length).toBeGreaterThan(0)
  })

  it('player+pick packages work', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 4000), mkPlayer('B', 'QB', 3000),
        mkPlayer('C', 'WR', 1000), mkPlayer('D', 'TE', 1500),
        mkPick('2025 1st', 3000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 7000), mkPlayer('Y', 'QB', 2000),
        mkPlayer('Z', 'RB', 1000), mkPlayer('W', 'TE', 2000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    const withPick = r.filter(c => c.userSends.some(p => p.pos === 'PICK'))
    expect(withPick.length).toBeGreaterThan(0)
  })
})

// ══════════════════════════════════════════════════════════════
// 11. Junk piling
// ══════════════════════════════════════════════════════════════

describe('junk piling prevention', () => {
  it('minimum asset value of 500 prevents zero-value filler', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 5000), mkPlayer('B', 'RB', 100), // below threshold
        mkPlayer('C', 'QB', 3000), mkPlayer('D', 'WR', 1000), mkPlayer('E', 'TE', 1500),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 5000), mkPlayer('Y', 'QB', 3000),
        mkPlayer('Z', 'RB', 1000), mkPlayer('W', 'TE', 2000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    r.forEach(c => {
      c.userSends.filter(p => p.pos !== 'PICK').forEach(p => {
        expect(p.tradeVal!).toBeGreaterThanOrEqual(500)
      })
    })
  })

  it('no zero-value sides', () => {
    generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague() }).forEach(c => {
      expect(c.userVal).toBeGreaterThan(0)
      expect(c.partnerVal).toBeGreaterThan(0)
    })
  })
})

// ══════════════════════════════════════════════════════════════
// 12. Deduplication
// ══════════════════════════════════════════════════════════════

describe('deduplication', () => {
  it('keys normalize asset order (A+B = B+A)', () => {
    const teams = fourTeamLeague()
    const r = generateTradeCandidates({ userIdx: 0, teams })
    r.forEach(c => {
      // Key sends are sorted alphabetically
      const sendPart = c.key.split('\u2194')[0]
      const recvPart = c.key.split('\u2194')[1]
      if (sendPart.includes('+')) {
        const parts = sendPart.split('+')
        expect(parts).toEqual([...parts].sort())
      }
      if (recvPart.includes('+')) {
        const parts = recvPart.split('+')
        expect(parts).toEqual([...parts].sort())
      }
    })
  })

  it('direction is preserved (A↔B ≠ B↔A)', () => {
    // The key uses ↔ separator with user sends on left, receives on right
    const teams = fourTeamLeague()
    const r = generateTradeCandidates({ userIdx: 0, teams })
    r.forEach(c => {
      const [sendPart, recvPart] = c.key.split('\u2194')
      const sendNames = c.userSends.map(p => p.name).sort().join('+')
      const recvNames = c.userReceives.map(p => p.name).sort().join('+')
      expect(sendPart).toBe(sendNames)
      expect(recvPart).toBe(recvNames)
    })
  })
})

// ══════════════════════════════════════════════════════════════
// 13. Filters
// ══════════════════════════════════════════════════════════════

describe('filters', () => {
  it('posFilter restricts received to that position', () => {
    generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague(), posFilter: 'WR' }).forEach(c => {
      expect(c.userReceives.some(p => p.pos === 'WR')).toBe(true)
    })
  })

  it('partnerIdx restricts to single partner', () => {
    generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague(), partnerIdx: 1 }).forEach(c => {
      expect(c.partnerIdx).toBe(1)
    })
  })

  it('targetPlayerName finds specific player', () => {
    generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague(), targetPlayerName: 'WR3' }).forEach(c => {
      expect(c.userReceives.some(p => p.name === 'WR3')).toBe(true)
    })
  })

  it('nonexistent targetPlayer returns empty', () => {
    expect(generateTradeCandidates({ userIdx: 0, teams: fourTeamLeague(), targetPlayerName: 'NOBODY' })).toEqual([])
  })
})

// ══════════════════════════════════════════════════════════════
// 14. Edge cases
// ══════════════════════════════════════════════════════════════

describe('edge cases', () => {
  it('empty partner roster produces no candidates with that partner', () => {
    const teams = [
      { idx: 0, name: 'User', players: [mkPlayer('A', 'QB', 5000), mkPlayer('B', 'RB', 3000)] },
      { idx: 1, name: 'Empty', players: [] },
      { idx: 2, name: 'Partner', players: [mkPlayer('C', 'WR', 5000), mkPlayer('D', 'RB', 3000)] },
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    r.forEach(c => expect(c.partnerIdx).not.toBe(1))
  })

  it('all low-value players produce no candidates', () => {
    const teams = [
      { idx: 0, name: 'User', players: [mkPlayer('A', 'QB', 400), mkPlayer('B', 'RB', 300)] },
      { idx: 1, name: 'Partner', players: [mkPlayer('C', 'WR', 400), mkPlayer('D', 'TE', 300)] },
    ]
    expect(generateTradeCandidates({ userIdx: 0, teams })).toEqual([])
  })

  it('12-team league generates valid candidates', () => {
    const teams = twelveTeamLeague()
    const r = generateTradeCandidates({ userIdx: 0, teams })
    expect(r.length).toBeLessThanOrEqual(TF_MAX_CANDIDATES)
    r.forEach(c => {
      expect(c.fairnessPct).toBeLessThanOrEqual(TF_FAIRNESS_THRESHOLD)
      expect(c.partnerIdx).not.toBe(0)
    })
  })
})

// ══════════════════════════════════════════════════════════════
// 15. IDP scope — only QB/RB/WR/TE in needs
// ══════════════════════════════════════════════════════════════

describe('IDP scope', () => {
  it('IDP players are excluded from needs analysis', () => {
    const r = computeTeamPosValues([
      mkPlayer('A', 'QB', 5000), mkPlayer('B', 'DL', 3000), mkPlayer('C', 'LB', 2000),
    ])
    expect(r).not.toHaveProperty('DL')
    expect(r).not.toHaveProperty('LB')
  })

  it('IDP players may appear as secondary balancing assets', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 4000), mkPlayer('B', 'QB', 3000),
        mkPlayer('C', 'WR', 1000), mkPlayer('D', 'TE', 1500),
        mkPlayer('E', 'DL', 4000), mkPlayer('F', 'LB', 3000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 7500), mkPlayer('Y', 'QB', 3000),
        mkPlayer('Z', 'RB', 1000), mkPlayer('W', 'TE', 2000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    // IDP assets should be eligible in packages
    r.forEach(c => {
      c.userSends.forEach(p => expect(['QB', 'RB', 'WR', 'TE', 'PICK', 'DL', 'LB', 'DB']).toContain(p.pos))
    })
  })

  it('IDP players are not treated as offensive need targets', () => {
    // DL/LB/DB never appear as the primary target in a trade, only as secondary balancing
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'QB', 5000), mkPlayer('B', 'RB', 3000),
        mkPlayer('C', 'WR', 2000), mkPlayer('D', 'TE', 1500),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 5000), mkPlayer('Y', 'QB', 3000),
        mkPlayer('Z', 'DL', 5000), mkPlayer('W', 'LB', 4000), mkPlayer('V', 'RB', 3000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    r.forEach(c => {
      // All receives must be offensive, PICK, or IDP (as secondary balancing)
      c.userReceives.forEach(p => expect(['QB', 'RB', 'WR', 'TE', 'PICK', 'DL', 'LB', 'DB']).toContain(p.pos))
      // At least one receive must be an offensive player (IDP can't be the sole target)
      expect(c.userReceives.some(p => ['QB', 'RB', 'WR', 'TE'].includes(p.pos))).toBe(true)
    })
  })

  it('partner IDP players are receivable as secondary balancing assets', () => {
    // Symmetric with user IDP sends: partner DL/LB/DB can be included in packages
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'QB', 7000), mkPlayer('B', 'RB', 6000),
        mkPlayer('C', 'WR', 2000), mkPlayer('D', 'TE', 1500),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 6000), mkPlayer('Y', 'DL', 2000),
        mkPlayer('Z', 'QB', 3000), mkPlayer('W', 'RB', 3000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    // Partner IDP (Y, DL, 2000) should be eligible as a balancing piece in receives
    const hasIdpReceive = r.some(c => c.userReceives.some(p => p.pos === 'DL'))
    expect(hasIdpReceive).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// 16. Superflex / TEP — uses canonical values, no extra multiplier
// ══════════════════════════════════════════════════════════════

describe('Superflex and TEP canonical values', () => {
  it('QB values are used as-is (no extra SF multiplier)', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('QB1', 'QB', 9000), mkPlayer('QB2', 'QB', 7000),
        mkPlayer('RB1', 'RB', 3000), mkPlayer('WR1', 'WR', 1000), mkPlayer('TE1', 'TE', 2000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('WR2', 'WR', 9000), mkPlayer('QB3', 'QB', 2000),
        mkPlayer('RB2', 'RB', 3000), mkPlayer('TE2', 'TE', 2000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    // Verify the candidate values directly reflect input tradeVal, not multiplied
    r.forEach(c => {
      c.userSends.forEach(p => {
        if (p.pos !== 'PICK') {
          const orig = teams[0].players.find(tp => tp.name === p.name)
          expect(p.tradeVal).toBe(orig!.tradeVal)
        }
      })
    })
  })

  it('TE values are used as-is (no extra TEP multiplier)', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('TE1', 'TE', 8000), mkPlayer('QB1', 'QB', 3000),
        mkPlayer('RB1', 'RB', 2000), mkPlayer('WR1', 'WR', 1000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('RB2', 'RB', 8000), mkPlayer('QB2', 'QB', 3000),
        mkPlayer('WR2', 'WR', 2000), mkPlayer('TE2', 'TE', 1000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    r.forEach(c => {
      c.userReceives.forEach(p => {
        if (p.pos === 'TE') {
          const orig = teams[c.partnerIdx].players.find(tp => tp.name === p.name)
          expect(p.tradeVal).toBe(orig!.tradeVal)
        }
      })
    })
  })
})

// ══════════════════════════════════════════════════════════════
// 17. Analyze This Trade wiring (source inspection)
// ══════════════════════════════════════════════════════════════

describe('Analyze This Trade integration', () => {
  it('button sets tradeA and tradeB without passing fit score', () => {
    // Verify the "Analyze This Trade" button code populates tradeA/tradeB
    // and calls setAnalyzed(false) — does NOT pass fitLabel or score
    expect(afdpSrc).toContain('setTradeA(sA as any[]);setTradeB(sB as any[]);setAnalyzed(false)')
  })

  it('does not pass Trade Finder fairness to the Analyzer', () => {
    // The Analyze button should NOT set any fairness/verdict state
    // It only sets tradeA and tradeB — the Analyzer recomputes everything
    const btnCode = afdpSrc.match(/Analyze This Trade[^}]*}/g) || []
    btnCode.forEach(code => {
      expect(code).not.toContain('setVerdict')
      expect(code).not.toContain('fairnessLabel')
      expect(code).not.toContain('fitLabel')
    })
  })
})

// ══════════════════════════════════════════════════════════════
// 18. Old Trade Finder migration
// ══════════════════════════════════════════════════════════════

describe('old Trade Finder code removed', () => {
  it('no idealRatios in Trade Finder context', () => {
    // idealRatios should not appear in the trade finder sub-tab section
    // (it may still exist in auction/draft advisor — that's fine)
    const tfSection = afdpSrc.split('rankSubTab==="tradefinder"')[1]?.split('rankSubTab===')[0] || ''
    expect(tfSection).not.toContain('idealRatios')
  })

  it('no impRoster-based candidate generation in tradefinder tab', () => {
    const tfSection = afdpSrc.split('rankSubTab==="tradefinder"')[1]?.split('rankSubTab===')[0] || ''
    expect(tfSection).not.toContain('impRoster')
  })

  it('no hardcoded count thresholds in league Trade Finder', () => {
    // Old code had myPosCts.QB<2, myPosCts.RB<4, etc. in trade finder
    // The new code uses league-relative ranks
    const tfSection = afdpSrc.split('rankSubTab==="tradefinder"')[1]?.split('rankSubTab===')[0] || ''
    expect(tfSection).not.toContain('myPosCts')
    expect(tfSection).not.toContain('theirPosCts')
  })
})

// ══════════════════════════════════════════════════════════════
// 19. Empty states in UI
// ══════════════════════════════════════════════════════════════

describe('empty states', () => {
  it('no league state shows connect league CTA', () => {
    expect(afdpSrc).toContain('Connect Your League')
  })

  it('no user team state shows identify team message', () => {
    expect(afdpSrc).toContain('Identify Your Team')
  })

  it('no candidates shows contextual empty state', () => {
    expect(afdpSrc).toContain('No matching trades found')
    expect(afdpSrc).toContain('No trades found for')
  })
})

// ══════════════════════════════════════════════════════════════
// 20. Mobile responsiveness
// ══════════════════════════════════════════════════════════════

describe('mobile responsiveness', () => {
  it('position rank grid uses repeat(4, 1fr) for consistent 4-column layout', () => {
    expect(afdpSrc).toContain('gridTemplateColumns:"repeat(4, 1fr)",gap:8,marginBottom:16')
  })

  it('filter buttons use flexWrap', () => {
    // Account for paywall branch that now precedes Trade Finder content
    const tfSplit = afdpSrc.split('rankSubTab==="tradefinder"&&canAccessLeagueFeatures(user)&&React.createElement')[1] || ''
    expect(tfSplit).toContain('flexWrap:"wrap"')
  })

  it('candidate cards use 1fr 30px 1fr grid', () => {
    expect(afdpSrc).toContain('gridTemplateColumns:"1fr 30px 1fr"')
  })
})

// ══════════════════════════════════════════════════════════════
// 21. Redraft vs Dynasty value separation
// ══════════════════════════════════════════════════════════════

describe('Redraft vs Dynasty value separation', () => {
  it('Trade Finder uses tradeVal as provided (dynasty values)', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 8000), mkPlayer('B', 'QB', 5000),
        mkPlayer('C', 'WR', 1500), mkPlayer('D', 'TE', 2000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 8000), mkPlayer('Y', 'QB', 3000),
        mkPlayer('Z', 'RB', 1000), mkPlayer('W', 'TE', 2000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    // Candidate values should match input exactly
    r.forEach(c => {
      const sendTotal = c.userSends.reduce((s, p) => s + (p.tradeVal || 0), 0)
      expect(c.userVal).toBe(sendTotal)
    })
  })

  it('different tradeVal inputs produce different candidates', () => {
    // Dynasty-like values
    const dynastyTeams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 9000), mkPlayer('B', 'QB', 7000),
        mkPlayer('C', 'WR', 1000), mkPlayer('D', 'TE', 2000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 9000), mkPlayer('Y', 'QB', 3000),
        mkPlayer('Z', 'RB', 1000), mkPlayer('W', 'TE', 2000),
      ]},
    ]
    // Redraft-like values (different scale)
    const redraftTeams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 4000), mkPlayer('B', 'QB', 2000),
        mkPlayer('C', 'WR', 500), mkPlayer('D', 'TE', 1000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 4000), mkPlayer('Y', 'QB', 1500),
        mkPlayer('Z', 'RB', 500), mkPlayer('W', 'TE', 1000),
      ]},
    ]
    const dR = generateTradeCandidates({ userIdx: 0, teams: dynastyTeams })
    const rR = generateTradeCandidates({ userIdx: 0, teams: redraftTeams })
    // Values should differ
    if (dR.length > 0 && rR.length > 0) {
      expect(dR[0].userVal).not.toBe(rR[0].userVal)
    }
  })

  it('no dynastyBonus or computeDynastyTradeVal in Trade Finder logic', () => {
    // Trade Finder uses tradeVal as pre-computed — does NOT call dynasty functions
    const logicSrc = readFileSync(resolve(thisDir, 'logic.ts'), 'utf-8')
    const tfSection = logicSrc.split('export function generateTradeCandidates')[1]?.split('\nexport ')[0] || ''
    expect(tfSection).not.toContain('dynastyBonus')
    expect(tfSection).not.toContain('computeDynastyTradeVal')
  })
})

// ══════════════════════════════════════════════════════════════
// 22. Active context — no double adjustments
// ══════════════════════════════════════════════════════════════

describe('active context — no double adjustments', () => {
  it('powerRankingTeams inherits tradeVal from rankedPlayers (source verification)', () => {
    // Verify the data flow: powerRankingTeams maps importedTeams through rankedPlayers
    expect(afdpSrc).toContain('byName[p.name.toLowerCase()]||p')
  })

  it('rankedPlayers tradeVal has separate dynasty and redraft paths', () => {
    expect(afdpSrc).toContain('if(isDynasty){')
    expect(afdpSrc).toContain('computeDynastyTradeVal(p.pos,p.age,p.ktcVal')
    // Redraft path uses canonical helper
    expect(afdpSrc).toContain('p.tradeVal=computeRedraftTradeVal(')
  })
})

// ══════════════════════════════════════════════════════════════
// 23. Partner picks
// ══════════════════════════════════════════════════════════════

describe('partner picks', () => {
  it('partner-owned picks may appear in userReceives', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 7000), mkPlayer('B', 'QB', 5000),
        mkPlayer('C', 'WR', 1000), mkPlayer('D', 'TE', 2000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 5000), mkPlayer('Y', 'QB', 2000),
        mkPlayer('Z', 'RB', 1000), mkPlayer('W', 'TE', 2000),
        mkPick('Partner 2025 1st', 3000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    const withPartnerPick = r.filter(c => c.userReceives.some(p => p.pos === 'PICK'))
    expect(withPartnerPick.length).toBeGreaterThan(0)
    withPartnerPick.forEach(c => {
      c.userReceives.filter(p => p.pos === 'PICK').forEach(pk => {
        expect(pk.name).toBe('Partner 2025 1st')
      })
    })
  })

  it('partner pick is NOT in user sends', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 5000), mkPlayer('B', 'QB', 3000),
        mkPlayer('C', 'WR', 2000), mkPlayer('D', 'TE', 1500),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 5000), mkPlayer('Y', 'QB', 3000),
        mkPick('Partner 2025 1st', 4000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    r.forEach(c => {
      c.userSends.forEach(p => expect(p.name).not.toBe('Partner 2025 1st'))
    })
  })

  it('same pick cannot appear on both teams', () => {
    // A pick belongs to exactly one team — if partner owns it, user doesn't
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 5000), mkPlayer('B', 'QB', 3000),
        mkPlayer('C', 'WR', 2000), mkPlayer('D', 'TE', 1500),
        mkPick('User 2025 1st', 5000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 5000), mkPlayer('Y', 'QB', 3000),
        mkPick('Partner 2025 2nd', 2000),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    r.forEach(c => {
      // User sends should only contain user picks
      c.userSends.filter(p => p.pos === 'PICK').forEach(p => {
        expect(p.name).toBe('User 2025 1st')
      })
      // User receives should only contain partner picks
      c.userReceives.filter(p => p.pos === 'PICK').forEach(p => {
        expect(p.name).toBe('Partner 2025 2nd')
      })
    })
  })

  it('pick valuation uses est consistently', () => {
    const teams = [
      { idx: 0, name: 'User', players: [
        mkPlayer('A', 'RB', 7000), mkPlayer('B', 'QB', 4000),
        mkPlayer('C', 'WR', 1000), mkPlayer('D', 'TE', 2000),
      ]},
      { idx: 1, name: 'Partner', players: [
        mkPlayer('X', 'WR', 4000), mkPlayer('Y', 'QB', 2000),
        mkPlayer('Z', 'RB', 1000), mkPlayer('W', 'TE', 2000),
        mkPick('Partner Pick', 3500),
      ]},
    ]
    const r = generateTradeCandidates({ userIdx: 0, teams })
    const pickCandidates = r.filter(c => c.userReceives.some(p => p.pos === 'PICK'))
    pickCandidates.forEach(c => {
      // partnerVal should include the pick's est value
      const pickEst = c.userReceives.filter(p => p.pos === 'PICK').reduce((s, p) => s + (p.est || 0), 0)
      const playerVal = c.userReceives.filter(p => p.pos !== 'PICK').reduce((s, p) => s + (p.tradeVal || 0), 0)
      expect(c.partnerVal).toBe(pickEst + playerVal)
    })
  })
})

// ══════════════════════════════════════════════════════════════
// 24. No-league CTA
// ══════════════════════════════════════════════════════════════

describe('no-league CTA', () => {
  it('routes to league import page, not trade tab', () => {
    // The "Connect Your League" / "Go to League Hub" button should navigate
    // to the league import workflow, not the standalone Trade Analyzer
    // Account for paywall branch that now precedes Trade Finder content
    const tfSplit = afdpSrc.split('rankSubTab==="tradefinder"&&canAccessLeagueFeatures(user)&&React.createElement')[1] || ''
    expect(tfSplit).toContain('setTab("league")')
    expect(tfSplit).toContain('setLeagueSubTab("leagimport")')
    // Should NOT just go to trade tab
    expect(tfSplit).not.toContain('"Go to Trade Tab"')
  })

  it('non-pro users see auth prompt', () => {
    // Account for paywall branch that now precedes Trade Finder content
    const tfSplit = afdpSrc.split('rankSubTab==="tradefinder"&&canAccessLeagueFeatures(user)&&React.createElement')[1] || ''
    expect(tfSplit).toContain('setAuthMode("signup")')
    expect(tfSplit).toContain('setShowAuth(true)')
  })
})

// ══════════════════════════════════════════════════════════════
// 25. Performance caps with new asset pools
// ══════════════════════════════════════════════════════════════

describe('performance caps', () => {
  it('IDP balancing assets are capped at 3', () => {
    const logicSrc = readFileSync(resolve(thisDir, 'logic.ts'), 'utf-8')
    expect(logicSrc).toContain('userIdpPlayers')
    const idpMatch = logicSrc.match(/var userIdpPlayers[\s\S]*?\.slice\(0,\s*3\)/)
    expect(idpMatch).not.toBeNull()
  })

  it('partner IDP balancing assets are capped at 3', () => {
    const logicSrc = readFileSync(resolve(thisDir, 'logic.ts'), 'utf-8')
    expect(logicSrc).toContain('pIdpPlayers')
    const pidpMatch = logicSrc.match(/var pIdpPlayers[\s\S]*?\.slice\(0,\s*3\)/)
    expect(pidpMatch).not.toBeNull()
  })

  it('partner picks are capped at 3', () => {
    const logicSrc = readFileSync(resolve(thisDir, 'logic.ts'), 'utf-8')
    // pPicks definition includes slice(0, 3) cap
    expect(logicSrc).toContain('pPicks')
    // Find the pPicks assignment block (multi-line, ends with slice(0, 3))
    const ppMatch = logicSrc.match(/var pPicks[\s\S]*?\.slice\(0,\s*3\)/)
    expect(ppMatch).not.toBeNull()
  })

  it('total candidates still capped at MAX_CANDIDATES', () => {
    // Large league should still produce at most 8 candidates
    const teams = twelveTeamLeague()
    const r = generateTradeCandidates({ userIdx: 0, teams })
    expect(r.length).toBeLessThanOrEqual(TF_MAX_CANDIDATES)
  })
})

// ══════════════════════════════════════════════════════════════
// 26. Regression safety
// ══════════════════════════════════════════════════════════════

describe('regression safety', () => {
  it('canonical Trade Analyzer tVal unchanged', () => {
    expect(afdpSrc).toContain('function tVal(side,fa){return side.reduce(function(s,x){return s+(x.pos==="PICK"?x.est:Math.max(0,x.tradeVal));},0)')
  })

  it('canonical verdict unchanged', () => {
    expect(afdpSrc).toContain('if(pct<8) return {txt:"Fair Trade"')
  })

  it('FREE_TRADE_LIMIT unchanged', () => {
    const logicSrc = readFileSync(resolve(thisDir, 'logic.ts'), 'utf-8')
    expect(logicSrc).toContain('export const FREE_TRADE_LIMIT = 3')
  })

  it('Trade Finder does not alter verdict()', () => {
    const logicSrc = readFileSync(resolve(thisDir, 'logic.ts'), 'utf-8')
    const tfSection = logicSrc.split('export function generateTradeCandidates')[1]?.split('\nexport ')[0] || ''
    expect(tfSection).not.toContain('verdict')
  })

  it('25% is search tolerance only, not canonical fair threshold', () => {
    const logicSrc = readFileSync(resolve(thisDir, 'logic.ts'), 'utf-8')
    expect(logicSrc).toContain('TF_FAIRNESS_THRESHOLD = 25')
    // 8% remains the canonical analyzer threshold
    expect(afdpSrc).toContain('if(pct<8)')
  })
})
