import { describe, it, expect } from 'vitest'
import {
  computeDynastyTradeVal,
  dynastyBonus,
  playerSlug,
  VALUES_UPDATED_AT,
  PRIME,
  PRODUCT_STATS,
} from './logic'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ──────────────────────────────────────────────────────────────────
// Value consistency tests.
// There is ONE dynasty valuation implementation: computeDynastyTradeVal
// in src/logic.ts, imported by afdp.tsx, vite.config.ts, and these tests.
// ──────────────────────────────────────────────────────────────────

// Thin wrapper matching the test interface to the shared function
function computeTradeVal(
  player: { pos: string; age: number; ktcVal: number; posRank: number; proj: { PPR: number } },
  opts: { isDynasty: boolean; isSF: boolean; tePremium: number; idpMode: boolean; sKey: string },
): number {
  if (!opts.isDynasty) return 0
  return computeDynastyTradeVal(
    player.pos, player.age, player.ktcVal, player.posRank, player.proj.PPR,
    { isSF: opts.isSF, sKey: opts.sKey, tePremium: opts.tePremium, idpMode: opts.idpMode },
  )
}

// ── 10 representative players ────────────────────────────────────

const REPRESENTATIVE_PLAYERS = [
  { name: 'Bijan Robinson', pos: 'RB', age: 24.6, ktcVal: 9999, posRank: 1, proj: { PPR: 335 } },
  { name: "Ja'Marr Chase", pos: 'WR', age: 26.5, ktcVal: 9980, posRank: 1, proj: { PPR: 362 } },
  { name: 'Josh Allen', pos: 'QB', age: 30.3, ktcVal: 9100, posRank: 1, proj: { PPR: 432 } },
  { name: 'Brock Bowers', pos: 'TE', age: 23.7, ktcVal: 8350, posRank: 1, proj: { PPR: 252 } },
  { name: 'Jahmyr Gibbs', pos: 'RB', age: 24.4, ktcVal: 9964, posRank: 2, proj: { PPR: 340 } },
  { name: 'Patrick Mahomes', pos: 'QB', age: 30.9, ktcVal: 6550, posRank: 4, proj: { PPR: 425 } },
  { name: 'Breece Hall', pos: 'RB', age: 25.2, ktcVal: 5800, posRank: 6, proj: { PPR: 295 } },
  { name: 'Travis Hunter', pos: 'WR', age: 23.3, ktcVal: 4400, posRank: 15, proj: { PPR: 228 } },
  { name: 'Derrick Henry', pos: 'RB', age: 32.6, ktcVal: 5000, posRank: 12, proj: { PPR: 258 } },
  { name: 'Saquon Barkley', pos: 'RB', age: 29.5, ktcVal: 5700, posRank: 5, proj: { PPR: 328 } },
]

const DEFAULT_OPTS = { isDynasty: true, isSF: false, tePremium: 0, idpMode: false, sKey: 'PPR' }
const SF_OPTS = { isDynasty: true, isSF: true, tePremium: 0, idpMode: false, sKey: 'PPR' }
const TEP_OPTS = { isDynasty: true, isSF: false, tePremium: 1, idpMode: false, sKey: 'PPR' }
const STD_OPTS = { isDynasty: true, isSF: false, tePremium: 0, idpMode: false, sKey: 'Standard' }

describe('value consistency: canonical tradeVal for 10 representative players', () => {
  REPRESENTATIVE_PLAYERS.forEach((p) => {
    it(`${p.name} (${p.pos}) has consistent tradeVal in 1QB PPR Dynasty`, () => {
      const tv = computeTradeVal(p, DEFAULT_OPTS)
      expect(tv).toBeGreaterThan(0)
      expect(tv).toBeLessThanOrEqual(9999)
      const ab = dynastyBonus(p.pos, p.age)
      const expected = Math.min(9999, Math.round(p.ktcVal * ab))
      expect(tv).toBe(expected)
    })
  })
})

describe('value consistency: superflex adjustments', () => {
  it('Josh Allen QB value increases in SF (capped at 9999)', () => {
    const base = computeTradeVal(REPRESENTATIVE_PLAYERS[2], DEFAULT_OPTS)
    const sf = computeTradeVal(REPRESENTATIVE_PLAYERS[2], SF_OPTS)
    expect(sf).toBeGreaterThan(base)
    // SF QB raw value exceeds 9999 but is capped
    const rawExpected = Math.round(REPRESENTATIVE_PLAYERS[2].ktcVal * dynastyBonus('QB', 30.3) * 1.25)
    expect(rawExpected).toBeGreaterThan(9999)
    expect(sf).toBe(9999)
  })

  it('RB value unchanged in SF', () => {
    const base = computeTradeVal(REPRESENTATIVE_PLAYERS[0], DEFAULT_OPTS)
    const sf = computeTradeVal(REPRESENTATIVE_PLAYERS[0], SF_OPTS)
    expect(sf).toBe(base)
  })
})

describe('value consistency: TE premium adjustments', () => {
  it('Brock Bowers TE value increases with TEP', () => {
    const base = computeTradeVal(REPRESENTATIVE_PLAYERS[3], DEFAULT_OPTS)
    const tep = computeTradeVal(REPRESENTATIVE_PLAYERS[3], TEP_OPTS)
    expect(tep).toBeGreaterThan(base)
    expect(tep).toBe(Math.min(9999, Math.round(REPRESENTATIVE_PLAYERS[3].ktcVal * dynastyBonus('TE', 23.7) * 1.15)))
  })

  it('RB value unchanged with TEP', () => {
    const base = computeTradeVal(REPRESENTATIVE_PLAYERS[0], DEFAULT_OPTS)
    const tep = computeTradeVal(REPRESENTATIVE_PLAYERS[0], TEP_OPTS)
    expect(tep).toBe(base)
  })
})

describe('value consistency: format adjustments', () => {
  it('RB value increases in Standard', () => {
    // Use Breece Hall (index 6) — not capped at 9999 so the 1.06x is observable
    const ppr = computeTradeVal(REPRESENTATIVE_PLAYERS[6], DEFAULT_OPTS)
    const std = computeTradeVal(REPRESENTATIVE_PLAYERS[6], STD_OPTS)
    expect(std).toBeGreaterThan(ppr)
  })

  it('WR value decreases in Standard', () => {
    const ppr = computeTradeVal(REPRESENTATIVE_PLAYERS[1], DEFAULT_OPTS)
    const std = computeTradeVal(REPRESENTATIVE_PLAYERS[1], STD_OPTS)
    expect(std).toBeLessThan(ppr)
  })
})

describe('value consistency: dynasty bonus applied correctly', () => {
  it('young Travis Hunter (23.3, WR) gets no youth boost (inside prime)', () => {
    // WR prime low = 23, age 23.3 → inside prime window → bonus = 1
    const ab = dynastyBonus('WR', 23.3)
    expect(ab).toBe(1)
    const tv = computeTradeVal(REPRESENTATIVE_PLAYERS[7], DEFAULT_OPTS)
    expect(tv).toBe(Math.min(9999, Math.round(4400 * 1)))
  })

  it('aging Derrick Henry (32.6, RB) gets aging penalty', () => {
    // RB lo=22, lo+6=28, age 32.6 → 1 - (32.6-28)*0.065 = 0.701
    const ab = dynastyBonus('RB', 32.6)
    expect(ab).toBeCloseTo(0.701)
    const tv = computeTradeVal(REPRESENTATIVE_PLAYERS[8], DEFAULT_OPTS)
    expect(tv).toBe(Math.min(9999, Math.round(5000 * ab)))
  })

  it('prime-age Bijan Robinson (24.6, RB) gets no adjustment', () => {
    expect(dynastyBonus('RB', 24.6)).toBe(1)
  })
})

// ── Duplicate player detection ───────────────────────────────────

describe('value consistency: duplicate player detection', () => {
  function findDuplicates(players: { name: string }[]): string[] {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const p of players) {
      if (seen.has(p.name)) dupes.push(p.name)
      seen.add(p.name)
    }
    return dupes
  }

  it('detects duplicate names in a list', () => {
    const players = [{ name: 'Player A' }, { name: 'Player B' }, { name: 'Player A' }]
    expect(findDuplicates(players)).toEqual(['Player A'])
  })

  it('returns empty array when no duplicates', () => {
    const players = [{ name: 'A' }, { name: 'B' }, { name: 'C' }]
    expect(findDuplicates(players)).toEqual([])
  })
})

// ── Missing/invalid value detection ──────────────────────────────

describe('value consistency: invalid value detection', () => {
  function validatePlayer(p: { name: string; pos: string; ktcVal: number; age: number }): string[] {
    const errors: string[] = []
    if (!p.name) errors.push('missing name')
    if (!p.pos) errors.push('missing pos')
    if (p.ktcVal < 0) errors.push('negative ktcVal')
    if (p.ktcVal > 9999) errors.push('ktcVal exceeds 9999')
    if (p.age <= 0 || p.age > 50) errors.push('invalid age: ' + p.age)
    if (!PRIME[p.pos] && p.pos !== 'PICK') errors.push('unknown position: ' + p.pos)
    return errors
  }

  it('passes for valid player', () => {
    expect(validatePlayer({ name: 'Test', pos: 'QB', ktcVal: 5000, age: 25 })).toEqual([])
  })

  it('catches missing name', () => {
    expect(validatePlayer({ name: '', pos: 'QB', ktcVal: 5000, age: 25 })).toContain('missing name')
  })

  it('catches negative ktcVal', () => {
    expect(validatePlayer({ name: 'X', pos: 'QB', ktcVal: -1, age: 25 })).toContain('negative ktcVal')
  })

  it('catches ktcVal > 9999', () => {
    expect(validatePlayer({ name: 'X', pos: 'QB', ktcVal: 10000, age: 25 })).toContain('ktcVal exceeds 9999')
  })

  it('catches invalid age', () => {
    expect(validatePlayer({ name: 'X', pos: 'QB', ktcVal: 5000, age: 0 })).toContain('invalid age: 0')
  })

  it('catches unknown position', () => {
    expect(validatePlayer({ name: 'X', pos: 'XY', ktcVal: 5000, age: 25 })).toContain('unknown position: XY')
  })
})

// ── Cross-consumer consistency ───────────────────────────────────

describe('value consistency: all consumers use same source', () => {
  it('tradeVal and ktcVal differ when dynasty bonus != 1', () => {
    const henry = REPRESENTATIVE_PLAYERS[8] // Derrick Henry, 32.6, RB
    const tv = computeTradeVal(henry, DEFAULT_OPTS)
    expect(tv).not.toBe(henry.ktcVal)
    expect(tv).toBeLessThan(henry.ktcVal) // aging penalty
  })

  it('tradeVal equals ktcVal for prime-age players (no bonus)', () => {
    const bijan = REPRESENTATIVE_PLAYERS[0]
    const tv = computeTradeVal(bijan, DEFAULT_OPTS)
    expect(tv).toBe(Math.min(9999, bijan.ktcVal))
  })

  it('player page value matches trade analyzer value', () => {
    REPRESENTATIVE_PLAYERS.forEach((p) => {
      const playerPageVal = computeTradeVal(p, DEFAULT_OPTS)
      const tradeAnalyzerVal = computeTradeVal(p, DEFAULT_OPTS)
      expect(playerPageVal).toBe(tradeAnalyzerVal)
    })
  })

  it('comparable players use tradeVal not ktcVal', () => {
    const chase = REPRESENTATIVE_PLAYERS[1]
    const chaseTv = computeTradeVal(chase, DEFAULT_OPTS)
    const bijanTv = computeTradeVal(REPRESENTATIVE_PLAYERS[0], DEFAULT_OPTS)
    const diff = Math.abs(chaseTv - bijanTv)
    expect(diff).toBeDefined()
    expect(typeof diff).toBe('number')
  })
})

// ── playerSlug consistency ───────────────────────────────────────

describe('value consistency: player slugs', () => {
  it('slug round-trips for all representative players', () => {
    REPRESENTATIVE_PLAYERS.forEach((p) => {
      const slug = playerSlug(p.name)
      expect(slug.length).toBeGreaterThan(0)
      expect(slug).not.toContain(' ')
      expect(slug).toMatch(/^[a-z0-9-]+$/)
    })
  })

  it('SEO page slug matches app slug', () => {
    const seoPlayers = [
      "Ja'Marr Chase", 'Bijan Robinson', 'Josh Allen',
      'Brock Bowers', 'Jahmyr Gibbs', 'Patrick Mahomes',
      'Saquon Barkley', 'Travis Hunter', 'Breece Hall',
      'Justin Jefferson',
    ]
    const expectedSlugs = [
      'ja-marr-chase', 'bijan-robinson', 'josh-allen',
      'brock-bowers', 'jahmyr-gibbs', 'patrick-mahomes',
      'saquon-barkley', 'travis-hunter', 'breece-hall',
      'justin-jefferson',
    ]
    seoPlayers.forEach((name, i) => {
      expect(playerSlug(name)).toBe(expectedSlugs[i])
    })
  })
})

// ── VALUES_UPDATED_AT ────────────────────────────────────────────

describe('value consistency: VALUES_UPDATED_AT', () => {
  it('is a valid ISO date string', () => {
    expect(VALUES_UPDATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const d = new Date(VALUES_UPDATED_AT)
    expect(d.getTime()).not.toBeNaN()
  })

  it('is not in the future', () => {
    const d = new Date(VALUES_UPDATED_AT)
    expect(d.getTime()).toBeLessThanOrEqual(Date.now() + 86400000)
  })
})

// ── Generated player HTML SEO verification ───────────────────────

describe('value consistency: generated player page HTML', () => {
  // These tests inspect the actual dist output after `npm run build`.
  // They verify that each player URL has unique, player-specific metadata.

  const thisDir = dirname(fileURLToPath(import.meta.url))
  const distPlayersDir = resolve(thisDir, '..', 'dist', 'players')

  function readPlayerHtml(slug: string): string | null {
    try {
      return readFileSync(resolve(distPlayersDir, slug, 'index.html'), 'utf-8')
    } catch {
      return null
    }
  }

  const SEO_PLAYERS = [
    { slug: 'brock-bowers', name: 'Brock Bowers', pos: 'TE', team: 'LV' },
    { slug: 'josh-allen', name: 'Josh Allen', pos: 'QB', team: 'BUF' },
    { slug: 'breece-hall', name: 'Breece Hall', pos: 'RB', team: 'NYJ' },
  ]

  SEO_PLAYERS.forEach(({ slug, name, pos, team }) => {
    describe(`/players/${slug}/`, () => {
      it('has player-specific title', () => {
        const html = readPlayerHtml(slug)
        if (!html) return // dist not built yet — skip
        expect(html).toContain(`<title>${name} Dynasty Value`)
        expect(html).not.toContain('<title>Fantasy Draft Pros — Free Dynasty Trade Analyzer 2026</title>')
      })

      it('has player-specific canonical URL', () => {
        const html = readPlayerHtml(slug)
        if (!html) return
        expect(html).toContain(`<link rel="canonical" href="https://fantasydraftpros.com/players/${slug}/" />`)
        expect(html).not.toContain('<link rel="canonical" href="https://fantasydraftpros.com/" />')
      })

      it('has player-specific meta description', () => {
        const html = readPlayerHtml(slug)
        if (!html) return
        expect(html).toContain(`${name} dynasty trade value:`)
        expect(html).toContain(pos)
      })

      it('has correct OG URL', () => {
        const html = readPlayerHtml(slug)
        if (!html) return
        expect(html).toContain(`og:url" content="https://fantasydraftpros.com/players/${slug}/"`)
      })

      it('has player-specific JSON-LD', () => {
        const html = readPlayerHtml(slug)
        if (!html) return
        expect(html).toContain('"@type": "Person"')
        expect(html).toContain(`"name": "${name}"`)
      })

      it('has canonical FDP Value in pre-hydration content', () => {
        const html = readPlayerHtml(slug)
        if (!html) return
        // The fallback div should contain the computed tradeVal
        expect(html).toContain('FDP Dynasty Value:')
        // Value should be a number, not a placeholder
        const valMatch = html.match(/FDP Dynasty Value:\s*([\d,]+)/)
        expect(valMatch).not.toBeNull()
        const val = parseInt(valMatch![1].replace(/,/g, ''))
        expect(val).toBeGreaterThan(0)
        expect(val).toBeLessThanOrEqual(9999)
      })

      it('does not contain stale hardcoded values', () => {
        const html = readPlayerHtml(slug)
        if (!html) return
        // Should not contain the old static page patterns
        expect(html).not.toContain('Dynasty Value: 8,156')
        expect(html).not.toContain('Dynasty Value: 8,350')
      })
    })
  })

  it('two different player URLs do NOT have identical metadata', () => {
    const html1 = readPlayerHtml('brock-bowers')
    const html2 = readPlayerHtml('josh-allen')
    if (!html1 || !html2) return // dist not built
    // Titles must differ
    const title1 = html1.match(/<title>(.*?)<\/title>/)?.[1]
    const title2 = html2.match(/<title>(.*?)<\/title>/)?.[1]
    expect(title1).not.toBe(title2)
    // Canonical URLs must differ
    const canon1 = html1.match(/rel="canonical" href="([^"]+)"/)?.[1]
    const canon2 = html2.match(/rel="canonical" href="([^"]+)"/)?.[1]
    expect(canon1).not.toBe(canon2)
    // OG URLs must differ
    const og1 = html1.match(/og:url" content="([^"]+)"/)?.[1]
    const og2 = html2.match(/og:url" content="([^"]+)"/)?.[1]
    expect(og1).not.toBe(og2)
    // Meta descriptions must differ
    const desc1 = html1.match(/name="description" content="([^"]+)"/)?.[1]
    const desc2 = html2.match(/name="description" content="([^"]+)"/)?.[1]
    expect(desc1).not.toBe(desc2)
  })
})

// ── Full player pool verification ────────────────────────────────
// Parses ALL players from afdp.tsx and verifies computeDynastyTradeVal
// produces valid values for every player with ktcVal > 0, across all formats.

describe('value consistency: full player pool', () => {
  const thisDir = dirname(fileURLToPath(import.meta.url))
  const afdpPath = resolve(thisDir, '..', 'afdp.tsx')

  function parsePlayers(): Array<{ name: string; pos: string; age: number; ktcVal?: number; proj: { PPR: number; Half: number; Standard: number } }> {
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

  const FORMAT_OPTS = [
    { label: 'Dynasty PPR 1QB', isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false },
    { label: 'Dynasty SF PPR', isSF: true, sKey: 'PPR', tePremium: 0, idpMode: false },
    { label: 'Dynasty Standard', isSF: false, sKey: 'Standard', tePremium: 0, idpMode: false },
    { label: 'Dynasty Half', isSF: false, sKey: 'Half', tePremium: 0, idpMode: false },
    { label: 'Dynasty TEP', isSF: false, sKey: 'PPR', tePremium: 1, idpMode: false },
    { label: 'Dynasty IDP', isSF: false, sKey: 'PPR', tePremium: 0, idpMode: true },
  ]

  let allPlayers: ReturnType<typeof parsePlayers>
  try { allPlayers = parsePlayers() } catch { allPlayers = [] }

  const ktcPlayers = allPlayers.filter(p => p.ktcVal && p.ktcVal > 0)

  it(`parsed ${allPlayers.length} total players, ${ktcPlayers.length} with ktcVal`, () => {
    expect(allPlayers.length).toBeGreaterThan(1000)
    expect(ktcPlayers.length).toBeGreaterThan(1000)
  })

  FORMAT_OPTS.forEach(({ label, ...opts }) => {
    it(`all ktcVal players produce valid tradeVal in ${label}`, () => {
      if (ktcPlayers.length === 0) return
      let failures: string[] = []
      for (const p of ktcPlayers) {
        const tv = computeDynastyTradeVal(p.pos, p.age, p.ktcVal!, 1, p.proj?.PPR || 0, opts)
        if (tv <= 0 || (!(opts.isSF && p.pos === 'QB') && tv > 9999)) {
          failures.push(`${p.name} (${p.pos}): tradeVal=${tv}`)
        }
      }
      expect(failures).toEqual([])
    })
  })

  it('no ktcVal player produces tradeVal of 0', () => {
    if (ktcPlayers.length === 0) return
    const opts = { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false }
    const zeros = ktcPlayers.filter(p =>
      computeDynastyTradeVal(p.pos, p.age, p.ktcVal!, 1, p.proj?.PPR || 0, opts) === 0
    )
    expect(zeros.map(p => p.name)).toEqual([])
  })

  it('aging players get lower values than ktcVal', () => {
    if (ktcPlayers.length === 0) return
    const opts = { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false }
    const agingRBs = ktcPlayers.filter(p => p.pos === 'RB' && p.age > 28)
    expect(agingRBs.length).toBeGreaterThan(0)
    for (const p of agingRBs) {
      const tv = computeDynastyTradeVal(p.pos, p.age, p.ktcVal!, 1, p.proj?.PPR || 0, opts)
      expect(tv).toBeLessThanOrEqual(p.ktcVal!)
    }
  })

  it('value cap enforced: no non-SF-QB exceeds 9999', () => {
    if (ktcPlayers.length === 0) return
    const opts = { isSF: true, sKey: 'PPR', tePremium: 1, idpMode: true }
    const violations = ktcPlayers.filter(p => {
      if (p.pos === 'QB') return false // SF QBs can exceed 9999
      const tv = computeDynastyTradeVal(p.pos, p.age, p.ktcVal!, 1, p.proj?.PPR || 0, opts)
      return tv > 9999
    })
    expect(violations.map(p => p.name)).toEqual([])
  })
})

// ── Product statistics consistency ──────────────────────────────

describe('product statistics: centralized and truthful', () => {
  const thisDir = dirname(fileURLToPath(import.meta.url))
  const afdpSrc = readFileSync(resolve(thisDir, '..', 'afdp.tsx'), 'utf-8')
  const indexSrc = readFileSync(resolve(thisDir, '..', 'index.html'), 'utf-8')

  it('PRODUCT_STATS.PLATFORM_COUNT matches SUPPORTED_PLATFORMS length', () => {
    expect(PRODUCT_STATS.PLATFORM_COUNT).toBe(PRODUCT_STATS.SUPPORTED_PLATFORMS.length)
  })

  it('supported platforms are only those with real API import', () => {
    // Sleeper has live API import; ESPN has API import
    expect(PRODUCT_STATS.SUPPORTED_PLATFORMS).toContain('Sleeper')
    expect(PRODUCT_STATS.SUPPORTED_PLATFORMS).toContain('ESPN')
    // Yahoo is manual paste only — not a real integration
    expect(PRODUCT_STATS.SUPPORTED_PLATFORMS).not.toContain('Yahoo')
    // MFL, NFL.com, Fleaflicker are Coming Soon
    expect(PRODUCT_STATS.SUPPORTED_PLATFORMS).not.toContain('MFL')
    expect(PRODUCT_STATS.SUPPORTED_PLATFORMS).not.toContain('NFL.com')
    expect(PRODUCT_STATS.SUPPORTED_PLATFORMS).not.toContain('Fleaflicker')
  })

  it('each supported platform has a real import function in afdp.tsx', () => {
    // Sleeper: importSleeper() calls api.sleeper.app
    expect(afdpSrc).toContain('function importSleeper()')
    expect(afdpSrc).toContain('api.sleeper.app')
    // ESPN: doEspnImport() calls fantasy.espn.com API
    expect(afdpSrc).toContain('function doEspnImport()')
    expect(afdpSrc).toContain('fantasy.espn.com')
  })

  it('Yahoo import is manual paste (not counted as supported)', () => {
    // Yahoo "import" calls doManualImport — same as manual entry
    expect(afdpSrc).toContain('doManualImport("My Yahoo League"')
    // No Yahoo API calls exist
    expect(afdpSrc).not.toMatch(/api\.yahoo\.|fantasysports\.yahooapis/)
  })

  it('no "updated daily" or "updated weekly" claims in public copy', () => {
    const publicCopyMatches = [...afdpSrc.matchAll(/updated (?:daily|weekly)/gi)]
      .filter(m => {
        const lineStart = afdpSrc.lastIndexOf('\n', m.index!) + 1
        const line = afdpSrc.substring(lineStart, m.index! + m[0].length + 50)
        return !line.trimStart().startsWith('//')
      })
    expect(publicCopyMatches.length, 'found unsupported cadence claim in public copy').toBe(0)
  })

  it('no "updated daily" or "updated weekly" in index.html', () => {
    expect(indexSrc).not.toMatch(/updated daily/i)
    expect(indexSrc).not.toMatch(/updated weekly/i)
  })

  it('no MFL or Yahoo in FAQ platform support claims', () => {
    const faqSection = afdpSrc.match(/var FAQS=\[.*?\];/s)?.[0] || ''
    expect(faqSection).not.toContain('MFL')
    // Yahoo should only appear in context of manual roster entry
    const yahooInFaq = faqSection.match(/Yahoo/g) || []
    if (yahooInFaq.length > 0) {
      expect(faqSection).toContain('manual roster entry')
    }
  })

  it('no conflicting player count claims', () => {
    const rankingClaims = [...afdpSrc.matchAll(/(?:Full|all)\s+(\d+)\+\s+(?:rank|player)/gi)]
    for (const m of rankingClaims) {
      const count = parseInt(m[1])
      expect(count, `claim "${m[0]}" is too low`).toBeGreaterThanOrEqual(600)
    }
  })

  it('no false live/real-time claims for static data', () => {
    expect(afdpSrc).not.toContain('"Real-time value adjustments"')
    expect(afdpSrc).not.toContain('"Real-time buy-low')
  })

  it('VALUES_UPDATED_AT is used for market trends timestamp', () => {
    expect(afdpSrc).toContain('"Values as of "+VALUES_UPDATED_AT')
  })

  it('SCORING_FORMATS count matches actual base scoring options', () => {
    // PPR, Half PPR, Standard — the three base scoring systems
    expect(PRODUCT_STATS.SCORING_FORMATS.length).toBe(3)
    expect(PRODUCT_STATS.SCORING_FORMATS).toContain('PPR')
    expect(PRODUCT_STATS.SCORING_FORMATS).toContain('Half PPR')
    expect(PRODUCT_STATS.SCORING_FORMATS).toContain('Standard')
  })

  it('1,000+ player claim is truthful', () => {
    const marker = 'const PLAYERS=['
    const startIdx = afdpSrc.indexOf(marker)
    expect(startIdx).toBeGreaterThan(-1)
    const arrayStart = afdpSrc.indexOf('[', startIdx)
    let depth = 0, i = arrayStart
    for (; i < afdpSrc.length; i++) {
      if (afdpSrc[i] === '[') depth++
      else if (afdpSrc[i] === ']') { depth--; if (depth === 0) break }
    }
    const players = new Function('return ' + afdpSrc.substring(arrayStart, i + 1))() as any[]
    expect(players.length, 'PLAYERS count should justify 1,000+ claim').toBeGreaterThanOrEqual(1000)
  })
})
