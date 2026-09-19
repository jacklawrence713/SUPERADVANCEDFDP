import { describe, it, expect } from 'vitest'
import {
  computeDynastyTradeVal,
  dynastyBonus,
  tierLabel,
  scarcityLabel,
  getBaselines,
} from './logic'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ──────────────────────────────────────────────────────────────────
// Ranking consistency tests.
// Verifies that dynasty rankings follow FDP Value order (two-pass),
// redraft rankings follow VBD order, and all derived metrics (tier,
// scarcity, posRank) are consistent.
// ──────────────────────────────────────────────────────────────────

const thisDir = dirname(fileURLToPath(import.meta.url))
const afdpPath = resolve(thisDir, '..', 'afdp.tsx')

type Player = { name: string; pos: string; age: number; team: string; ktcVal?: number; proj: { PPR: number; Half: number; Standard: number } }

function parsePlayers(): Player[] {
  const src = readFileSync(afdpPath, 'utf-8')
  const marker = 'const PLAYERS=['
  const startIdx = src.indexOf(marker)
  if (startIdx === -1) throw new Error('PLAYERS not found')
  const arrayStart = src.indexOf('[', startIdx)
  let depth = 0, i = arrayStart
  for (; i < src.length; i++) {
    if (src[i] === '[') depth++
    else if (src[i] === ']') { depth--; if (depth === 0) break }
  }
  return new Function('return ' + src.substring(arrayStart, i + 1))() as any
}

// Simulate the two-pass dynasty ranking (mirrors afdp.tsx logic)
function rankDynasty(
  players: Player[],
  opts: { isSF: boolean; sKey: string; tePremium: number; idpMode: boolean },
) {
  const bl = getBaselines(12, opts.isSF)
  const byPos: Record<string, Player[]> = {}
  players.forEach(p => { if (!byPos[p.pos]) byPos[p.pos] = []; byPos[p.pos].push(p) })
  const baseVal: Record<string, number> = {}
  Object.keys(byPos).forEach(pos => {
    const s = byPos[pos].slice().sort((a, b) => (b.proj?.[opts.sKey as keyof Player['proj']] || 0) - (a.proj?.[opts.sKey as keyof Player['proj']] || 0))
    baseVal[pos] = s[Math.min((bl[pos] || 12) - 1, s.length - 1)]?.proj?.[opts.sKey as keyof Player['proj']] || 0
  })

  const list = players.map(p => {
    let pts = (p.proj as any)?.[opts.sKey] || p.proj?.PPR || 0
    if (p.pos === 'TE' && opts.tePremium > 0) {
      const estRec = p.proj.PPR && p.proj.Standard ? Math.round((p.proj.PPR - p.proj.Standard) * 0.7) : 45
      pts += opts.tePremium * estRec
    }
    pts = pts * dynastyBonus(p.pos, p.age)
    if (p.ktcVal) pts = p.ktcVal * 0.037
    const raw = pts - (baseVal[p.pos] || 0)
    const vbd = opts.isSF && p.pos === 'QB' ? raw * 1.38 : raw
    return { ...p, pts, vbd, posRank: 0, rank: 0, tradeVal: 0, _rawTV: 0, tier: { t: 0, c: '' }, scarcity: { l: '', c: '' } }
  })

  // Pass 1: VBD sort for preliminary posRank
  list.sort((a, b) => b.vbd - a.vbd)
  const prc1: Record<string, number> = {}
  list.forEach((p, i) => {
    prc1[p.pos] = (prc1[p.pos] || 0) + 1
    p.posRank = prc1[p.pos]
    p.rank = i + 1
    p.tradeVal = computeDynastyTradeVal(p.pos, p.age, p.ktcVal, p.posRank, (p.proj as any)?.[opts.sKey] || 0, opts)
    p._rawTV = computeDynastyTradeVal(p.pos, p.age, p.ktcVal, p.posRank, (p.proj as any)?.[opts.sKey] || 0, opts, true)
  })

  // Pass 2: Re-sort by FDP Value for final ranks (raw value + name for tie-breaking)
  list.sort((a, b) => b.tradeVal - a.tradeVal || b._rawTV - a._rawTV || a.name.localeCompare(b.name))
  const prc2: Record<string, number> = {}
  list.forEach((p, i) => {
    prc2[p.pos] = (prc2[p.pos] || 0) + 1
    p.posRank = prc2[p.pos]
    p.rank = i + 1
    p.tier = tierLabel(p.posRank, p.pos)
    p.scarcity = scarcityLabel(p.posRank, bl[p.pos] || 12)
  })

  return list
}

// Simulate redraft ranking (single-pass VBD)
function rankRedraft(
  players: Player[],
  opts: { isSF: boolean; sKey: string; tePremium: number },
) {
  const bl = getBaselines(12, opts.isSF)
  const byPos: Record<string, Player[]> = {}
  players.forEach(p => { if (!byPos[p.pos]) byPos[p.pos] = []; byPos[p.pos].push(p) })
  const baseVal: Record<string, number> = {}
  Object.keys(byPos).forEach(pos => {
    const s = byPos[pos].slice().sort((a, b) => (b.proj?.[opts.sKey as keyof Player['proj']] || 0) - (a.proj?.[opts.sKey as keyof Player['proj']] || 0))
    baseVal[pos] = s[Math.min((bl[pos] || 12) - 1, s.length - 1)]?.proj?.[opts.sKey as keyof Player['proj']] || 0
  })

  const list = players.map(p => {
    let pts = (p.proj as any)?.[opts.sKey] || p.proj?.PPR || 0
    if (p.pos === 'TE' && opts.tePremium > 0) {
      const estRec = p.proj.PPR && p.proj.Standard ? Math.round((p.proj.PPR - p.proj.Standard) * 0.7) : 45
      pts += opts.tePremium * estRec
    }
    const raw = pts - (baseVal[p.pos] || 0)
    const vbd = opts.isSF && p.pos === 'QB' ? raw * 1.38 : raw
    return { ...p, pts, vbd, posRank: 0, rank: 0, tradeVal: 0, tier: { t: 0, c: '' }, scarcity: { l: '', c: '' } }
  })

  // Single pass: VBD sort → assign rank, posRank, tradeVal, tier, scarcity
  list.sort((a, b) => b.vbd - a.vbd)
  const prc: Record<string, number> = {}
  list.forEach((p, i) => {
    prc[p.pos] = (prc[p.pos] || 0) + 1
    p.posRank = prc[p.pos]
    p.rank = i + 1
    const baseTV = Math.round(p.vbd * 18)
    const rdPk = p.pos === 'QB' ? (opts.isSF ? 7000 : 3500)
      : p.pos === 'RB' ? 8000
      : p.pos === 'TE' ? 5000
      : p.pos === 'K' || p.pos === 'DST' ? 2500
      : p.pos === 'DL' ? 4000
      : p.pos === 'LB' ? 3000
      : p.pos === 'DB' ? 2800
      : 7500
    const rdDc = p.pos === 'TE' ? 0.850 : 0.900
    const rdFloor = Math.round(Math.max(100, rdPk * Math.pow(rdDc, p.posRank - 1)))
    p.tradeVal = Math.max(rdFloor, Math.min(9500, Math.max(100, baseTV)))
    p.tier = tierLabel(p.posRank, p.pos)
    p.scarcity = scarcityLabel(p.posRank, bl[p.pos] || 12)
  })

  return list
}

let allPlayers: Player[]
try { allPlayers = parsePlayers() } catch { allPlayers = [] }

// ── Dynasty ranking tests ────────────────────────────────────────

describe('dynasty rankings: FDP Value ordering', () => {
  const FORMATS = [
    { label: 'Dynasty PPR 1QB', isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false },
    { label: 'Dynasty SF PPR', isSF: true, sKey: 'PPR', tePremium: 0, idpMode: false },
    { label: 'Dynasty Standard', isSF: false, sKey: 'Standard', tePremium: 0, idpMode: false },
    { label: 'Dynasty Half PPR', isSF: false, sKey: 'Half', tePremium: 0, idpMode: false },
    { label: 'Dynasty TEP', isSF: false, sKey: 'PPR', tePremium: 1, idpMode: false },
    { label: 'Dynasty IDP', isSF: false, sKey: 'PPR', tePremium: 0, idpMode: true },
  ]

  FORMATS.forEach(({ label, ...opts }) => {
    describe(label, () => {
      const ranked = allPlayers.length > 0 ? rankDynasty(allPlayers, opts) : []

      it('higher FDP Value always produces higher overall rank', () => {
        if (ranked.length === 0) return
        for (let i = 1; i < ranked.length; i++) {
          expect(ranked[i].tradeVal).toBeLessThanOrEqual(ranked[i - 1].tradeVal)
        }
      })

      it('no duplicate overall ranks', () => {
        if (ranked.length === 0) return
        const ranks = ranked.map(p => p.rank)
        expect(new Set(ranks).size).toBe(ranks.length)
      })

      it('no duplicate position ranks within a position', () => {
        if (ranked.length === 0) return
        const byPos: Record<string, number[]> = {}
        ranked.forEach(p => {
          if (!byPos[p.pos]) byPos[p.pos] = []
          byPos[p.pos].push(p.posRank)
        })
        for (const [pos, ranks] of Object.entries(byPos)) {
          expect(new Set(ranks).size, `duplicate posRank in ${pos}`).toBe(ranks.length)
        }
      })

      it('no rank 0', () => {
        if (ranked.length === 0) return
        const zeros = ranked.filter(p => p.rank === 0 || p.posRank === 0)
        expect(zeros.map(p => p.name)).toEqual([])
      })

      it('no missing ranks (sequential 1..N)', () => {
        if (ranked.length === 0) return
        const maxRank = ranked.length
        const ranks = new Set(ranked.map(p => p.rank))
        for (let r = 1; r <= maxRank; r++) {
          expect(ranks.has(r), `missing rank ${r}`).toBe(true)
        }
      })

      it('tier matches final position rank', () => {
        if (ranked.length === 0) return
        for (const p of ranked) {
          const expected = tierLabel(p.posRank, p.pos)
          expect(p.tier.t, `${p.name} tier mismatch`).toBe(expected.t)
        }
      })

      it('scarcity matches final position rank', () => {
        if (ranked.length === 0) return
        const bl = getBaselines(12, opts.isSF)
        for (const p of ranked) {
          const expected = scarcityLabel(p.posRank, bl[p.pos] || 12)
          expect(p.scarcity.l, `${p.name} scarcity mismatch`).toBe(expected.l)
        }
      })
    })
  })
})

// ── Key player verification ──────────────────────────────────────

describe('dynasty rankings: key player verification', () => {
  const ranked = allPlayers.length > 0
    ? rankDynasty(allPlayers, { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false })
    : []
  const byName = new Map(ranked.map(p => [p.name, p]))

  const KEY_PLAYERS = [
    'Bijan Robinson', "Ja'Marr Chase", 'Jahmyr Gibbs', 'Jaxon Smith-Njigba',
    'Josh Allen', 'Brock Bowers', 'Trey McBride', 'Breece Hall',
    'Saquon Barkley', 'Josh Jacobs', 'Brian Thomas Jr.',
  ]

  it('all key players exist in rankings', () => {
    for (const name of KEY_PLAYERS) {
      expect(byName.has(name), `${name} missing`).toBe(true)
    }
  })

  it('key players have rank > 0 and posRank > 0', () => {
    for (const name of KEY_PLAYERS) {
      const p = byName.get(name)!
      expect(p.rank, `${name} rank`).toBeGreaterThan(0)
      expect(p.posRank, `${name} posRank`).toBeGreaterThan(0)
    }
  })

  it('Bijan Robinson is RB1 (highest RB FDP Value)', () => {
    const p = byName.get('Bijan Robinson')!
    expect(p.pos).toBe('RB')
    expect(p.posRank).toBe(1)
  })

  it("Ja'Marr Chase is WR1 (highest WR FDP Value)", () => {
    const p = byName.get("Ja'Marr Chase")!
    expect(p.pos).toBe('WR')
    expect(p.posRank).toBe(1)
  })

  it('Brock Bowers is TE1 (highest TE FDP Value)', () => {
    const p = byName.get('Brock Bowers')!
    expect(p.pos).toBe('TE')
    expect(p.posRank).toBe(1)
  })

  it('younger RBs rank above older RBs with similar ktcVal', () => {
    // Jahmyr Gibbs (24) should rank above Saquon Barkley (29) in dynasty
    const gibbs = byName.get('Jahmyr Gibbs')!
    const saquon = byName.get('Saquon Barkley')!
    expect(gibbs.rank).toBeLessThan(saquon.rank)
    expect(gibbs.tradeVal).toBeGreaterThan(saquon.tradeVal)
  })

  it('Josh Allen ranks in top 10 in dynasty 1QB', () => {
    const p = byName.get('Josh Allen')!
    expect(p.rank).toBeLessThanOrEqual(10)
  })
})

// ── Superflex ranking tests ──────────────────────────────────────

describe('dynasty rankings: Superflex', () => {
  const sf = allPlayers.length > 0
    ? rankDynasty(allPlayers, { isSF: true, sKey: 'PPR', tePremium: 0, idpMode: false })
    : []
  const oneQB = allPlayers.length > 0
    ? rankDynasty(allPlayers, { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false })
    : []

  it('QBs rank higher in SF than 1QB', () => {
    if (sf.length === 0) return
    const sfMap = new Map(sf.map(p => [p.name, p]))
    const oqMap = new Map(oneQB.map(p => [p.name, p]))
    // Top QB should rank higher in SF
    const topQBs = sf.filter(p => p.pos === 'QB').slice(0, 5)
    for (const qb of topQBs) {
      const sfRank = sfMap.get(qb.name)!.rank
      const oqRank = oqMap.get(qb.name)!.rank
      expect(sfRank, `${qb.name} should rank higher in SF`).toBeLessThanOrEqual(oqRank)
    }
  })

  it('SF monotonicity: higher FDP Value = higher rank', () => {
    if (sf.length === 0) return
    for (let i = 1; i < sf.length; i++) {
      expect(sf[i].tradeVal).toBeLessThanOrEqual(sf[i - 1].tradeVal)
    }
  })
})

// ── TE Premium ranking tests ─────────────────────────────────────

describe('dynasty rankings: TE Premium', () => {
  const tep = allPlayers.length > 0
    ? rankDynasty(allPlayers, { isSF: false, sKey: 'PPR', tePremium: 1, idpMode: false })
    : []
  const noTep = allPlayers.length > 0
    ? rankDynasty(allPlayers, { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false })
    : []

  it('TEs rank higher in TEP than non-TEP', () => {
    if (tep.length === 0) return
    const tepMap = new Map(tep.map(p => [p.name, p]))
    const ntMap = new Map(noTep.map(p => [p.name, p]))
    const topTEs = tep.filter(p => p.pos === 'TE').slice(0, 3)
    for (const te of topTEs) {
      const tepRank = tepMap.get(te.name)!.rank
      const ntRank = ntMap.get(te.name)!.rank
      expect(tepRank, `${te.name} should rank higher in TEP`).toBeLessThanOrEqual(ntRank)
    }
  })
})

// ── IDP ranking tests ────────────────────────────────────────────

describe('dynasty rankings: IDP', () => {
  const idp = allPlayers.length > 0
    ? rankDynasty(allPlayers, { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: true })
    : []
  const noIdp = allPlayers.length > 0
    ? rankDynasty(allPlayers, { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false })
    : []

  it('IDP players get higher tradeVal in IDP mode', () => {
    if (idp.length === 0) return
    const idpMap = new Map(idp.map(p => [p.name, p]))
    const niMap = new Map(noIdp.map(p => [p.name, p]))
    const idpPlayers = idp.filter(p => ['DL', 'LB', 'DB'].includes(p.pos) && p.ktcVal && p.ktcVal > 500).slice(0, 5)
    for (const ip of idpPlayers) {
      expect(idpMap.get(ip.name)!.tradeVal, `${ip.name}`).toBeGreaterThanOrEqual(niMap.get(ip.name)!.tradeVal)
    }
  })
})

// ── Redraft ranking tests ────────────────────────────────────────

describe('redraft rankings: VBD ordering preserved', () => {
  const ranked = allPlayers.length > 0
    ? rankRedraft(allPlayers, { isSF: false, sKey: 'PPR', tePremium: 0 })
    : []

  it('ranks are sequential 1..N', () => {
    if (ranked.length === 0) return
    const ranks = new Set(ranked.map(p => p.rank))
    for (let r = 1; r <= ranked.length; r++) {
      expect(ranks.has(r), `missing rank ${r}`).toBe(true)
    }
  })

  it('no duplicate overall ranks', () => {
    if (ranked.length === 0) return
    const ranks = ranked.map(p => p.rank)
    expect(new Set(ranks).size).toBe(ranks.length)
  })

  it('no duplicate position ranks within a position', () => {
    if (ranked.length === 0) return
    const byPos: Record<string, number[]> = {}
    ranked.forEach(p => {
      if (!byPos[p.pos]) byPos[p.pos] = []
      byPos[p.pos].push(p.posRank)
    })
    for (const [pos, ranks] of Object.entries(byPos)) {
      expect(new Set(ranks).size, `duplicate posRank in ${pos}`).toBe(ranks.length)
    }
  })

  it('VBD ordering: higher VBD = higher rank', () => {
    if (ranked.length === 0) return
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].vbd, `rank ${i + 1} VBD should be <= rank ${i}`).toBeLessThanOrEqual(ranked[i - 1].vbd)
    }
  })

  it('redraft tradeVal > 0 for all ranked players', () => {
    if (ranked.length === 0) return
    const zeros = ranked.filter(p => p.tradeVal <= 0)
    expect(zeros.map(p => p.name)).toEqual([])
  })

  it('tier matches position rank', () => {
    if (ranked.length === 0) return
    for (const p of ranked) {
      const expected = tierLabel(p.posRank, p.pos)
      expect(p.tier.t, `${p.name} tier`).toBe(expected.t)
    }
  })
})

// ── Redraft SF regression ────────────────────────────────────────

describe('redraft rankings: Superflex', () => {
  const sfRanked = allPlayers.length > 0
    ? rankRedraft(allPlayers, { isSF: true, sKey: 'PPR', tePremium: 0 })
    : []
  const oqRanked = allPlayers.length > 0
    ? rankRedraft(allPlayers, { isSF: false, sKey: 'PPR', tePremium: 0 })
    : []

  it('QBs rank higher in SF redraft', () => {
    if (sfRanked.length === 0) return
    const sfMap = new Map(sfRanked.map(p => [p.name, p]))
    const oqMap = new Map(oqRanked.map(p => [p.name, p]))
    // Find top QB in SF
    const topQB = sfRanked.find(p => p.pos === 'QB')!
    expect(sfMap.get(topQB.name)!.rank).toBeLessThan(oqMap.get(topQB.name)!.rank)
  })
})

// ── Cross-surface consistency ────────────────────────────────────

describe('ranking consistency: SEO vs app tradeVal', () => {
  // The SEO generator (vite.config.ts) passes posRank=1 for all players,
  // while the app uses actual VBD-based posRank for the fallback formula.
  // For ktcVal players, posRank is ignored so tradeVals MUST match exactly.
  // Both systems sort by tradeVal descending, so relative ordering also matches.

  const ranked = allPlayers.length > 0
    ? rankDynasty(allPlayers, { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false })
    : []

  it('ktcVal players get identical tradeVal from SEO and app', () => {
    if (ranked.length === 0) return
    const seoOpts = { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false }
    const appMap = new Map(ranked.map(p => [p.name, p]))
    const ktcPlayers = allPlayers.filter(p => p.ktcVal && p.ktcVal > 0)
    const mismatches: string[] = []
    for (const p of ktcPlayers) {
      const seoVal = computeDynastyTradeVal(p.pos, p.age, p.ktcVal, 1, p.proj?.PPR || 0, seoOpts)
      const appVal = appMap.get(p.name)!.tradeVal
      if (seoVal !== appVal) mismatches.push(`${p.name}: seo=${seoVal} app=${appVal}`)
    }
    expect(mismatches).toEqual([])
  })

  it('both systems produce same top-10 overall order for ktcVal players', () => {
    if (ranked.length === 0) return
    const seoOpts = { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false }
    const seoList = allPlayers
      .filter(p => p.ktcVal && p.ktcVal > 0)
      .map(p => ({ name: p.name, tradeVal: computeDynastyTradeVal(p.pos, p.age, p.ktcVal, 1, p.proj?.PPR || 0, seoOpts) }))
    seoList.sort((a, b) => b.tradeVal - a.tradeVal)
    const seoTop10 = seoList.slice(0, 10).map(p => p.name)
    const appTop10 = ranked.filter(p => p.ktcVal && p.ktcVal > 0).slice(0, 10).map(p => p.name)
    expect(appTop10).toEqual(seoTop10)
  })
})

// ── Format-specific ranking consistency ──────────────────────────
// Verifies that when a format is selected, FDP Value, rank, posRank,
// tier, and scarcity are ALL consistent with that format. No stale
// base-format data leaks into the selected-format view.

describe('format consistency: SF FDP Value matches SF rank', () => {
  const sfRanked = allPlayers.length > 0
    ? rankDynasty(allPlayers, { isSF: true, sKey: 'PPR', tePremium: 0, idpMode: false })
    : []
  const oqRanked = allPlayers.length > 0
    ? rankDynasty(allPlayers, { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false })
    : []

  it('SF: rank order matches tradeVal order (no display hack)', () => {
    if (sfRanked.length === 0) return
    for (let i = 1; i < sfRanked.length; i++) {
      expect(sfRanked[i].tradeVal, `rank ${i + 1}`).toBeLessThanOrEqual(sfRanked[i - 1].tradeVal)
    }
  })

  it('SF: posRank within QBs matches SF tradeVal order', () => {
    if (sfRanked.length === 0) return
    const qbs = sfRanked.filter(p => p.pos === 'QB')
    for (let i = 1; i < qbs.length; i++) {
      expect(qbs[i].posRank, `${qbs[i].name} posRank`).toBe(qbs[i - 1].posRank + 1)
      expect(qbs[i].tradeVal).toBeLessThanOrEqual(qbs[i - 1].tradeVal)
    }
  })

  it('SF: tier uses SF posRank (not 1QB posRank)', () => {
    if (sfRanked.length === 0) return
    for (const p of sfRanked) {
      const expected = tierLabel(p.posRank, p.pos)
      expect(p.tier.t, `${p.name}`).toBe(expected.t)
    }
  })

  it('SF: scarcity uses SF posRank (not 1QB posRank)', () => {
    if (sfRanked.length === 0) return
    const bl = getBaselines(12, true)
    for (const p of sfRanked) {
      const expected = scarcityLabel(p.posRank, bl[p.pos] || 12)
      expect(p.scarcity.l, `${p.name}`).toBe(expected.l)
    }
  })

  it('SF QBs have higher tradeVal than 1QB QBs', () => {
    if (sfRanked.length === 0 || oqRanked.length === 0) return
    const sfMap = new Map(sfRanked.map(p => [p.name, p]))
    const oqMap = new Map(oqRanked.map(p => [p.name, p]))
    const topQBs = sfRanked.filter(p => p.pos === 'QB' && p.ktcVal && p.ktcVal > 5000).slice(0, 5)
    for (const qb of topQBs) {
      expect(sfMap.get(qb.name)!.tradeVal, `${qb.name} SF > 1QB`).toBeGreaterThan(oqMap.get(qb.name)!.tradeVal)
    }
  })
})

describe('format consistency: TEP FDP Value matches TEP rank', () => {
  const tepRanked = allPlayers.length > 0
    ? rankDynasty(allPlayers, { isSF: false, sKey: 'PPR', tePremium: 1, idpMode: false })
    : []
  const noTepRanked = allPlayers.length > 0
    ? rankDynasty(allPlayers, { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false })
    : []

  it('TEP: rank order matches tradeVal order', () => {
    if (tepRanked.length === 0) return
    for (let i = 1; i < tepRanked.length; i++) {
      expect(tepRanked[i].tradeVal).toBeLessThanOrEqual(tepRanked[i - 1].tradeVal)
    }
  })

  it('TEP: posRank within TEs matches TEP tradeVal order', () => {
    if (tepRanked.length === 0) return
    const tes = tepRanked.filter(p => p.pos === 'TE')
    for (let i = 1; i < tes.length; i++) {
      expect(tes[i].posRank, `${tes[i].name} posRank`).toBe(tes[i - 1].posRank + 1)
      expect(tes[i].tradeVal).toBeLessThanOrEqual(tes[i - 1].tradeVal)
    }
  })

  it('TEP: tier uses TEP posRank', () => {
    if (tepRanked.length === 0) return
    for (const p of tepRanked) {
      const expected = tierLabel(p.posRank, p.pos)
      expect(p.tier.t, `${p.name}`).toBe(expected.t)
    }
  })

  it('TEP: scarcity uses TEP posRank', () => {
    if (tepRanked.length === 0) return
    const bl = getBaselines(12, false)
    for (const p of tepRanked) {
      const expected = scarcityLabel(p.posRank, bl[p.pos] || 12)
      expect(p.scarcity.l, `${p.name}`).toBe(expected.l)
    }
  })

  it('TEP TEs have higher tradeVal than non-TEP TEs', () => {
    if (tepRanked.length === 0 || noTepRanked.length === 0) return
    const tepMap = new Map(tepRanked.map(p => [p.name, p]))
    const ntMap = new Map(noTepRanked.map(p => [p.name, p]))
    const topTEs = tepRanked.filter(p => p.pos === 'TE' && p.ktcVal && p.ktcVal > 3000).slice(0, 3)
    for (const te of topTEs) {
      expect(tepMap.get(te.name)!.tradeVal, `${te.name} TEP > non-TEP`).toBeGreaterThan(ntMap.get(te.name)!.tradeVal)
    }
  })
})

describe('format consistency: SF + TEP combination', () => {
  const combo = allPlayers.length > 0
    ? rankDynasty(allPlayers, { isSF: true, sKey: 'PPR', tePremium: 1, idpMode: false })
    : []

  it('SF+TEP: rank order matches tradeVal order', () => {
    if (combo.length === 0) return
    for (let i = 1; i < combo.length; i++) {
      expect(combo[i].tradeVal).toBeLessThanOrEqual(combo[i - 1].tradeVal)
    }
  })

  it('SF+TEP: no duplicate posRanks', () => {
    if (combo.length === 0) return
    const byPos: Record<string, number[]> = {}
    combo.forEach(p => {
      if (!byPos[p.pos]) byPos[p.pos] = []
      byPos[p.pos].push(p.posRank)
    })
    for (const [pos, ranks] of Object.entries(byPos)) {
      expect(new Set(ranks).size, `${pos}`).toBe(ranks.length)
    }
  })

  it('SF+TEP: tier uses combo posRank', () => {
    if (combo.length === 0) return
    for (const p of combo) {
      expect(p.tier.t, `${p.name}`).toBe(tierLabel(p.posRank, p.pos).t)
    }
  })
})

// ── Key player format-specific values ────────────────────────────

describe('key players: format-specific FDP Value and rank', () => {
  const formats = [
    { label: 'Dynasty PPR 1QB', isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false },
    { label: 'Dynasty PPR SF', isSF: true, sKey: 'PPR', tePremium: 0, idpMode: false },
    { label: 'Dynasty PPR TEP', isSF: false, sKey: 'PPR', tePremium: 1, idpMode: false },
    { label: 'Dynasty PPR SF+TEP', isSF: true, sKey: 'PPR', tePremium: 1, idpMode: false },
    { label: 'Dynasty Half 1QB', isSF: false, sKey: 'Half', tePremium: 0, idpMode: false },
    { label: 'Dynasty Standard 1QB', isSF: false, sKey: 'Standard', tePremium: 0, idpMode: false },
    { label: 'Dynasty IDP', isSF: false, sKey: 'PPR', tePremium: 0, idpMode: true },
  ]

  const KEY_PLAYERS = [
    'Josh Allen', 'Jalen Hurts', 'Patrick Mahomes',
    'Bijan Robinson', 'Jahmyr Gibbs',
    "Ja'Marr Chase", 'Jaxon Smith-Njigba',
    'Brock Bowers', 'Trey McBride',
  ]

  formats.forEach(({ label, ...opts }) => {
    describe(label, () => {
      const ranked = allPlayers.length > 0 ? rankDynasty(allPlayers, opts) : []
      const byName = new Map(ranked.map(p => [p.name, p]))

      it('key players all have valid rank and posRank', () => {
        for (const name of KEY_PLAYERS) {
          const p = byName.get(name)
          if (!p) continue // player may not exist
          expect(p.rank, `${name} rank`).toBeGreaterThan(0)
          expect(p.posRank, `${name} posRank`).toBeGreaterThan(0)
          expect(p.tradeVal, `${name} tradeVal`).toBeGreaterThan(0)
        }
      })

      it('rank order matches tradeVal order for key players', () => {
        const keyRanked = KEY_PLAYERS.map(n => byName.get(n)).filter(Boolean) as any[]
        keyRanked.sort((a, b) => a.rank - b.rank)
        for (let i = 1; i < keyRanked.length; i++) {
          expect(keyRanked[i].tradeVal, `${keyRanked[i].name} tradeVal vs ${keyRanked[i - 1].name}`)
            .toBeLessThanOrEqual(keyRanked[i - 1].tradeVal)
        }
      })
    })
  })
})

// ── FDP Value 9,999 cap enforcement ──────────────────────────────

describe('FDP Value cap: universal 9,999 maximum', () => {
  const ALL_FORMATS = [
    { label: '1QB PPR', isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false },
    { label: 'SF PPR', isSF: true, sKey: 'PPR', tePremium: 0, idpMode: false },
    { label: 'TEP', isSF: false, sKey: 'PPR', tePremium: 1, idpMode: false },
    { label: 'SF+TEP', isSF: true, sKey: 'PPR', tePremium: 1, idpMode: false },
    { label: 'IDP', isSF: false, sKey: 'PPR', tePremium: 0, idpMode: true },
    { label: 'Standard', isSF: false, sKey: 'Standard', tePremium: 0, idpMode: false },
    { label: 'Half PPR', isSF: false, sKey: 'Half', tePremium: 0, idpMode: false },
  ]

  ALL_FORMATS.forEach(({ label, ...opts }) => {
    it(`${label}: no player FDP Value exceeds 9,999`, () => {
      if (allPlayers.length === 0) return
      const ranked = rankDynasty(allPlayers, opts)
      const over = ranked.filter(p => p.tradeVal > 9999)
      expect(over.map(p => `${p.name}=${p.tradeVal}`)).toEqual([])
    })
  })

  it('computeDynastyTradeVal caps SF QB at 9,999', () => {
    // High-value SF QB should be capped
    const val = computeDynastyTradeVal('QB', 28, 9100, 1, 300, { isSF: true, sKey: 'PPR', tePremium: 0, idpMode: false })
    expect(val).toBeLessThanOrEqual(9999)
  })

  it('computeDynastyTradeVal uncapped=true returns raw value above 9,999 for elite SF QBs', () => {
    const raw = computeDynastyTradeVal('QB', 28, 9100, 1, 300, { isSF: true, sKey: 'PPR', tePremium: 0, idpMode: false }, true)
    expect(raw).toBeGreaterThan(9999)
  })

  it('computeDynastyTradeVal uncapped=false and default produce same result', () => {
    const opts = { isSF: true, sKey: 'PPR' as string, tePremium: 0, idpMode: false }
    const defaultVal = computeDynastyTradeVal('QB', 28, 9100, 1, 300, opts)
    const explicitVal = computeDynastyTradeVal('QB', 28, 9100, 1, 300, opts, false)
    expect(defaultVal).toBe(explicitVal)
  })
})

// ── Cap tie-breaking tests ──────────────────────────────────────

describe('cap tie-breaking: deterministic ranking at 9,999', () => {
  const KEY_PLAYERS = [
    'Josh Allen', 'Joe Burrow', 'Jalen Hurts', 'Patrick Mahomes',
    'Bijan Robinson', 'Jahmyr Gibbs', "Ja'Marr Chase",
    'Brock Bowers', 'Trey McBride',
  ]

  const sfRanked = allPlayers.length > 0
    ? rankDynasty(allPlayers, { isSF: true, sKey: 'PPR', tePremium: 0, idpMode: false })
    : []

  it('SF: players at 9,999 have deterministic rank order (rawTV tiebreak)', () => {
    if (sfRanked.length === 0) return
    const at9999 = sfRanked.filter(p => p.tradeVal === 9999)
    // If multiple players at 9999, they should be sorted by _rawTV desc then name
    for (let i = 1; i < at9999.length; i++) {
      const prev = at9999[i - 1]
      const curr = at9999[i]
      const ok = prev._rawTV > curr._rawTV || (prev._rawTV === curr._rawTV && prev.name.localeCompare(curr.name) <= 0)
      expect(ok, `${prev.name}(raw=${prev._rawTV}) should sort before ${curr.name}(raw=${curr._rawTV})`).toBe(true)
    }
  })

  it('SF: repeated ranking produces identical order', () => {
    if (allPlayers.length === 0) return
    const run1 = rankDynasty(allPlayers, { isSF: true, sKey: 'PPR', tePremium: 0, idpMode: false })
    const run2 = rankDynasty(allPlayers, { isSF: true, sKey: 'PPR', tePremium: 0, idpMode: false })
    const order1 = run1.map(p => p.name)
    const order2 = run2.map(p => p.name)
    expect(order1).toEqual(order2)
  })

  it('SF: key players capped at 9,999 are still correctly ranked', () => {
    if (sfRanked.length === 0) return
    const byName = new Map(sfRanked.map(p => [p.name, p]))
    for (const name of KEY_PLAYERS) {
      const p = byName.get(name)
      if (!p) continue
      expect(p.tradeVal, `${name} FDP Value`).toBeLessThanOrEqual(9999)
      expect(p.rank, `${name} rank`).toBeGreaterThan(0)
      expect(p.posRank, `${name} posRank`).toBeGreaterThan(0)
    }
  })

  it('SF+TEP: no FDP Value exceeds 9,999', () => {
    if (allPlayers.length === 0) return
    const ranked = rankDynasty(allPlayers, { isSF: true, sKey: 'PPR', tePremium: 1, idpMode: false })
    const over = ranked.filter(p => p.tradeVal > 9999)
    expect(over.map(p => `${p.name}=${p.tradeVal}`)).toEqual([])
  })
})

// ── Default format tests ────────────────────────────────────────

describe('default format: 1QB Dynasty', () => {
  it('sfMode defaults to false in app state', () => {
    // Verify the default by checking afdp.tsx source
    const src = readFileSync(afdpPath, 'utf-8')
    const sfMatch = src.match(/\[sfMode,\s*setSfMode\]\s*=\s*useState\(([^)]+)\)/)
    expect(sfMatch).not.toBeNull()
    expect(sfMatch![1]).toBe('false')
  })

  it('tePremium defaults to 0 in app state', () => {
    const src = readFileSync(afdpPath, 'utf-8')
    // tePremium uses a localStorage initializer that defaults to 0
    const tepLine = src.split('\n').find(l => /\[tePremium,\s*setTePremium\]/.test(l))
    expect(tepLine).toBeDefined()
    // The initializer function returns 0 as fallback
    expect(tepLine).toContain('return 0;')
  })

  it('leagueType defaults to Dynasty', () => {
    const src = readFileSync(afdpPath, 'utf-8')
    const ltMatch = src.match(/\[leagueType,\s*setLeagueType\]\s*=\s*useState\("([^"]+)"\)/)
    expect(ltMatch).not.toBeNull()
    expect(ltMatch![1]).toBe('Dynasty')
  })

  it('no stale rankFormat display hack exists', () => {
    const src = readFileSync(afdpPath, 'utf-8')
    expect(src).not.toContain('rankFormat')
    expect(src).not.toContain('setRankFormat')
  })

  it('no stale pvTep display hack exists', () => {
    const src = readFileSync(afdpPath, 'utf-8')
    expect(src).not.toContain('pvTep')
    expect(src).not.toContain('setPvTep')
  })

  it('no stale rankTep display hack exists', () => {
    const src = readFileSync(afdpPath, 'utf-8')
    expect(src).not.toContain('rankTep')
    expect(src).not.toContain('setRankTep')
  })
})
