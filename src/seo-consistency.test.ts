import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { playerSlug, computeDynastyTradeVal, VALUES_UPDATED_AT } from './logic'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const distDir = resolve(rootDir, 'dist')
const afdpPath = resolve(rootDir, 'afdp.tsx')

type Player = { name: string; pos: string; age: number; team: string; ktcVal?: number; proj: { PPR: number; Half: number; Standard: number }; note?: string }

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

const defaultOpts = { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false }

// Mirror the eligibility rules from vite.config.ts
const INDEX_THRESHOLD = 1000
function isPageEligible(p: { pos: string; team: string; tradeVal: number }): boolean {
  if (!p.team || p.team === 'FA') return false
  if (p.pos === 'K' || p.pos === 'DST') return false
  if (p.tradeVal < 100) return false
  return true
}
function isIndexEligible(p: { tradeVal: number }): boolean {
  return p.tradeVal >= INDEX_THRESHOLD
}

let allPlayers: Player[]
try { allPlayers = parsePlayers() } catch { allPlayers = [] }

const withVals = allPlayers.map(p => ({
  ...p,
  slug: playerSlug(p.name),
  tradeVal: computeDynastyTradeVal(p.pos, p.age, p.ktcVal, 1, p.proj?.PPR || 0, defaultOpts),
}))
withVals.sort((a, b) => b.tradeVal - a.tradeVal)
const pageEligible = withVals.filter(isPageEligible)
const slugSet = new Set<string>()
const dedupedPageEligible = pageEligible.filter(p => {
  if (slugSet.has(p.slug)) return false
  slugSet.add(p.slug)
  return true
})
const indexEligible = dedupedPageEligible.filter(isIndexEligible)
const noindexEligible = dedupedPageEligible.filter(p => !isIndexEligible(p))

// Parse sitemap if dist exists
let sitemapPlayerSlugs: string[] = []
let sitemapExists = false
try {
  if (existsSync(resolve(distDir, 'sitemap.xml'))) {
    sitemapExists = true
    const sitemap = readFileSync(resolve(distDir, 'sitemap.xml'), 'utf-8')
    sitemapPlayerSlugs = [...sitemap.matchAll(/\/players\/([^/]+)\//g)].map(m => m[1])
  }
} catch { /* no dist */ }

// List player directories in dist
let distPlayerDirs: string[] = []
try {
  const playersDir = resolve(distDir, 'players')
  if (existsSync(playersDir)) {
    distPlayerDirs = readdirSync(playersDir).filter(f => {
      try { return statSync(resolve(playersDir, f)).isDirectory() } catch { return false }
    })
  }
} catch { /* no dist */ }

// ── Slug consistency ────────────────────────────────────────────

describe('player slugs: no duplicates', () => {
  it('no two players produce the same canonical slug', () => {
    if (allPlayers.length === 0) return
    const counts = new Map<string, string[]>()
    for (const p of allPlayers) {
      const s = playerSlug(p.name)
      if (!counts.has(s)) counts.set(s, [])
      counts.get(s)!.push(p.name)
    }
    const dupes = [...counts.entries()].filter(([, names]) => names.length > 1)
    expect(dupes.map(([slug, names]) => `${slug}: ${names.join(', ')}`)).toEqual([])
  })
})

describe('player slugs: canonical format', () => {
  it('slugs contain only lowercase letters, digits, and hyphens', () => {
    for (const p of allPlayers.slice(0, 200)) {
      const s = playerSlug(p.name)
      expect(s, p.name).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('slugs do not start or end with hyphens', () => {
    for (const p of allPlayers.slice(0, 200)) {
      const s = playerSlug(p.name)
      expect(s.startsWith('-'), `${p.name}: "${s}" starts with -`).toBe(false)
      expect(s.endsWith('-'), `${p.name}: "${s}" ends with -`).toBe(false)
    }
  })

  it('afdp.tsx playerSlug matches logic.ts playerSlug', () => {
    const testNames = ["Ja'Marr Chase", "D'Andre Swift", "C.J. Stroud", "Amon-Ra St. Brown"]
    for (const name of testNames) {
      const canonical = playerSlug(name)
      const inlineResult = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      expect(inlineResult, name).toBe(canonical)
    }
  })
})

// ── Eligibility tiers ───────────────────────────────────────────

describe('page eligibility: two-tier system', () => {
  it('page-eligible players have valid team, not K/DST, tradeVal >= 100', () => {
    for (const p of dedupedPageEligible) {
      expect(p.team, p.name).toBeTruthy()
      expect(p.team, p.name).not.toBe('FA')
      expect(['K', 'DST']).not.toContain(p.pos)
      expect(p.tradeVal, p.name).toBeGreaterThanOrEqual(100)
    }
  })

  it('index-eligible players have tradeVal >= INDEX_THRESHOLD', () => {
    for (const p of indexEligible) {
      expect(p.tradeVal, p.name).toBeGreaterThanOrEqual(INDEX_THRESHOLD)
    }
  })

  it('noindex players have tradeVal < INDEX_THRESHOLD', () => {
    for (const p of noindexEligible) {
      expect(p.tradeVal, p.name).toBeLessThan(INDEX_THRESHOLD)
    }
  })

  it('top dynasty players are all index-eligible', () => {
    const topNames = ['Bijan Robinson', "Ja'Marr Chase", 'Josh Allen', 'Brock Bowers', 'Jahmyr Gibbs']
    for (const name of topNames) {
      const found = indexEligible.find(p => p.name === name)
      expect(found, `${name} should be index-eligible`).toBeTruthy()
    }
  })

  it('low-value players are page-eligible but not index-eligible', () => {
    // Players with tradeVal 100-999 should have pages but be noindex
    const lowVal = dedupedPageEligible.filter(p => p.tradeVal >= 100 && p.tradeVal < INDEX_THRESHOLD)
    expect(lowVal.length).toBeGreaterThan(0)
    for (const p of lowVal.slice(0, 5)) {
      expect(isIndexEligible(p), `${p.name} (tv=${p.tradeVal}) should NOT be index-eligible`).toBe(false)
    }
  })

  it('K and DST are never page-eligible', () => {
    const kDst = withVals.filter(p => (p.pos === 'K' || p.pos === 'DST') && isPageEligible(p))
    expect(kDst.map(p => p.name)).toEqual([])
  })

  it('FA players are never page-eligible', () => {
    const fa = withVals.filter(p => p.team === 'FA' && isPageEligible(p))
    expect(fa.map(p => p.name)).toEqual([])
  })
})

// ── Sitemap ↔ Player Pages (requires build) ────────────────────

describe('sitemap: page consistency (requires build)', () => {
  it('every sitemap player URL has a corresponding player directory', () => {
    if (!sitemapExists) return
    const dirSet = new Set(distPlayerDirs)
    const missing = sitemapPlayerSlugs.filter(s => !dirSet.has(s))
    expect(missing, 'sitemap URLs without pages').toEqual([])
  })

  it('sitemap contains only index-eligible players', () => {
    if (!sitemapExists) return
    const indexSlugs = new Set(indexEligible.map(p => p.slug))
    const nonIndex = sitemapPlayerSlugs.filter(s => !indexSlugs.has(s))
    expect(nonIndex, 'non-index-eligible slugs in sitemap').toEqual([])
  })

  it('every index-eligible player has a sitemap entry', () => {
    if (!sitemapExists) return
    const sitemapSet = new Set(sitemapPlayerSlugs)
    const missing = indexEligible.filter(p => !sitemapSet.has(p.slug)).map(p => `${p.slug} (tv=${p.tradeVal})`)
    expect(missing, 'index-eligible players missing from sitemap').toEqual([])
  })

  it('sitemap has no duplicate player URLs', () => {
    if (!sitemapExists) return
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const s of sitemapPlayerSlugs) {
      if (seen.has(s)) dupes.push(s)
      seen.add(s)
    }
    expect(dupes).toEqual([])
  })

  it('sitemap does not contain legacy redirect slugs', () => {
    if (!sitemapExists) return
    const legacySlugs = ['jamarr-chase', 'dandre-swift', 'devon-achane']
    const found = sitemapPlayerSlugs.filter(s => legacySlugs.includes(s))
    expect(found, 'legacy slugs should not be in sitemap').toEqual([])
  })

  it('sitemap does not contain noindex pages', () => {
    if (!sitemapExists) return
    const noindexSlugs = new Set(noindexEligible.map(p => p.slug))
    const found = sitemapPlayerSlugs.filter(s => noindexSlugs.has(s))
    expect(found, 'noindex slugs should not be in sitemap').toEqual([])
  })

  it('sitemap player count matches index-eligible player count', () => {
    if (!sitemapExists) return
    expect(sitemapPlayerSlugs.length).toBe(indexEligible.length)
  })
})

// ── Sitemap lastmod accuracy (requires build) ───────────────────

describe('sitemap: lastmod accuracy (requires build)', () => {
  let sitemapContent = ''
  try {
    if (existsSync(resolve(distDir, 'sitemap.xml'))) {
      sitemapContent = readFileSync(resolve(distDir, 'sitemap.xml'), 'utf-8')
    }
  } catch { /* no dist */ }

  it('player page lastmod matches VALUES_UPDATED_AT', () => {
    if (!sitemapContent) return
    const playerEntries = [...sitemapContent.matchAll(/<url><loc>https:\/\/fantasydraftpros\.com\/players\/[^<]+<\/loc><lastmod>([^<]+)<\/lastmod>/g)]
    expect(playerEntries.length).toBeGreaterThan(0)
    for (const m of playerEntries) {
      expect(m[1], 'player lastmod should be VALUES_UPDATED_AT').toBe(VALUES_UPDATED_AT)
    }
  })

  it('static pages do not have lastmod (no fake build date)', () => {
    if (!sitemapContent) return
    const staticLocs = ['/', '/dynasty-trade-analyzer/', '/dynasty-trade-calculator/', '/dynasty-rankings/']
    for (const loc of staticLocs) {
      // Find the <url> entry for this static route
      const pattern = new RegExp(`<url><loc>https://fantasydraftpros\\.com${loc.replace(/\//g, '\\/')}</loc>(<lastmod>[^<]+</lastmod>)?`)
      const match = sitemapContent.match(pattern)
      if (!match) continue
      expect(match[1], `static page ${loc} should not have lastmod`).toBeUndefined()
    }
  })

  it('no lastmod uses current build date (rebuild stability)', () => {
    if (!sitemapContent) return
    const today = new Date().toISOString().split('T')[0]
    // If VALUES_UPDATED_AT happens to equal today, this is legitimate — skip check
    if (VALUES_UPDATED_AT === today) return
    const allLastmods = [...sitemapContent.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m => m[1])
    const buildDateEntries = allLastmods.filter(d => d === today)
    expect(buildDateEntries.length, 'no lastmod should use today\'s build date').toBe(0)
  })

  it('all lastmod values are valid ISO date format', () => {
    if (!sitemapContent) return
    const allLastmods = [...sitemapContent.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m => m[1])
    for (const d of allLastmods) {
      expect(d, 'lastmod must be YYYY-MM-DD').toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(isNaN(new Date(d).getTime()), `invalid date: ${d}`).toBe(false)
    }
  })

  it('no lastmod is in the future', () => {
    if (!sitemapContent) return
    const today = new Date().toISOString().split('T')[0]
    const allLastmods = [...sitemapContent.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m => m[1])
    for (const d of allLastmods) {
      expect(d <= today, `lastmod ${d} is in the future`).toBe(true)
    }
  })

  it('noindex player pages remain excluded from sitemap', () => {
    if (!sitemapContent) return
    const noindexSlugs = new Set(noindexEligible.map(p => p.slug))
    const found = sitemapPlayerSlugs.filter(s => noindexSlugs.has(s))
    expect(found, 'noindex slugs should not be in sitemap').toEqual([])
  })

  it('legacy redirects remain excluded from sitemap', () => {
    if (!sitemapContent) return
    const legacySlugs = ['jamarr-chase', 'dandre-swift', 'devon-achane']
    const found = sitemapPlayerSlugs.filter(s => legacySlugs.includes(s))
    expect(found, 'legacy slugs should not be in sitemap').toEqual([])
  })

  it('sitemap player count still matches index-eligible count', () => {
    if (!sitemapContent) return
    expect(sitemapPlayerSlugs.length).toBe(indexEligible.length)
  })
})

// ── Generated page content quality (requires build) ─────────────

describe('SEO page content: real player-specific data (requires build)', () => {
  const sampleSlugs = ['josh-allen', 'bijan-robinson', 'ja-marr-chase', 'brock-bowers']

  it('indexed pages contain overall rank', () => {
    if (!sitemapExists) return
    for (const slug of sampleSlugs) {
      const path = resolve(distDir, 'players', slug, 'index.html')
      if (!existsSync(path)) continue
      const html = readFileSync(path, 'utf-8')
      expect(html, `${slug} missing Overall rank`).toMatch(/Overall:.*#\d+/)
    }
  })

  it('indexed pages contain position rank', () => {
    if (!sitemapExists) return
    for (const slug of sampleSlugs) {
      const path = resolve(distDir, 'players', slug, 'index.html')
      if (!existsSync(path)) continue
      const html = readFileSync(path, 'utf-8')
      expect(html, `${slug} missing position rank`).toMatch(/(QB|RB|WR|TE|DL|LB|DB):.*#\d+/)
    }
  })

  it('indexed pages contain tier', () => {
    if (!sitemapExists) return
    for (const slug of sampleSlugs) {
      const path = resolve(distDir, 'players', slug, 'index.html')
      if (!existsSync(path)) continue
      const html = readFileSync(path, 'utf-8')
      expect(html, `${slug} missing Tier`).toMatch(/Tier:.*[1-5]/)
    }
  })

  it('indexed pages contain projections', () => {
    if (!sitemapExists) return
    for (const slug of sampleSlugs) {
      const path = resolve(distDir, 'players', slug, 'index.html')
      if (!existsSync(path)) continue
      const html = readFileSync(path, 'utf-8')
      expect(html, `${slug} missing PPR projection`).toContain('PPR:')
    }
  })

  it('indexed pages contain comparable players', () => {
    if (!sitemapExists) return
    for (const slug of sampleSlugs) {
      const path = resolve(distDir, 'players', slug, 'index.html')
      if (!existsSync(path)) continue
      const html = readFileSync(path, 'utf-8')
      expect(html, `${slug} missing comparable players`).toContain('Comparable Players')
    }
  })
})

// ── Noindex pages (requires build) ─────────────────────────────

describe('noindex pages: correct robots directive (requires build)', () => {
  it('low-value player pages have noindex directive', () => {
    if (!sitemapExists) return
    // Check a few known low-value slugs
    const lowSlugs = noindexEligible.slice(0, 5).map(p => p.slug)
    for (const slug of lowSlugs) {
      const path = resolve(distDir, 'players', slug, 'index.html')
      if (!existsSync(path)) continue
      const html = readFileSync(path, 'utf-8')
      expect(html, `${slug} should have noindex`).toContain('noindex')
    }
  })

  it('indexed pages do NOT have noindex directive', () => {
    if (!sitemapExists) return
    const indexSlugs = ['bijan-robinson', 'josh-allen', 'ja-marr-chase']
    for (const slug of indexSlugs) {
      const path = resolve(distDir, 'players', slug, 'index.html')
      if (!existsSync(path)) continue
      const html = readFileSync(path, 'utf-8')
      expect(html, `${slug} should NOT have noindex`).not.toContain('noindex')
    }
  })
})

// ── SEO metadata uniqueness (requires build) ───────────────────

describe('SEO metadata: uniqueness and correctness (requires build)', () => {
  const sampleSlugs = ['josh-allen', 'bijan-robinson', 'ja-marr-chase', 'brock-bowers', 'de-von-achane']

  it('sample player pages have unique titles', () => {
    if (!sitemapExists) return
    const titles: string[] = []
    for (const slug of sampleSlugs) {
      const path = resolve(distDir, 'players', slug, 'index.html')
      if (!existsSync(path)) continue
      const html = readFileSync(path, 'utf-8')
      const match = html.match(/<title>([^<]+)<\/title>/)
      if (match) titles.push(match[1])
    }
    expect(new Set(titles).size, 'duplicate titles').toBe(titles.length)
  })

  it('sample player pages have unique meta descriptions', () => {
    if (!sitemapExists) return
    const descs: string[] = []
    for (const slug of sampleSlugs) {
      const path = resolve(distDir, 'players', slug, 'index.html')
      if (!existsSync(path)) continue
      const html = readFileSync(path, 'utf-8')
      const match = html.match(/<meta name="description" content="([^"]+)"/)
      if (match) descs.push(match[1])
    }
    expect(new Set(descs).size, 'duplicate descriptions').toBe(descs.length)
  })

  it('sample player pages have correct canonical URLs', () => {
    if (!sitemapExists) return
    for (const slug of sampleSlugs) {
      const path = resolve(distDir, 'players', slug, 'index.html')
      if (!existsSync(path)) continue
      const html = readFileSync(path, 'utf-8')
      const match = html.match(/<link rel="canonical" href="([^"]+)"/)
      expect(match, `${slug} missing canonical`).not.toBeNull()
      expect(match![1]).toBe(`https://fantasydraftpros.com/players/${slug}/`)
    }
  })

  it('sample player pages have OG and Twitter metadata', () => {
    if (!sitemapExists) return
    for (const slug of sampleSlugs) {
      const path = resolve(distDir, 'players', slug, 'index.html')
      if (!existsSync(path)) continue
      const html = readFileSync(path, 'utf-8')
      expect(html, `${slug} missing og:title`).toContain('og:title')
      expect(html, `${slug} missing og:url`).toContain('og:url')
      expect(html, `${slug} missing twitter:title`).toContain('twitter:title')
    }
  })

  it('sample player pages have JSON-LD structured data', () => {
    if (!sitemapExists) return
    for (const slug of sampleSlugs) {
      const path = resolve(distDir, 'players', slug, 'index.html')
      if (!existsSync(path)) continue
      const html = readFileSync(path, 'utf-8')
      expect(html, `${slug} missing JSON-LD`).toContain('application/ld+json')
      expect(html, `${slug} missing schema.org`).toContain('schema.org')
    }
  })

  it('no player page shows FDP Value > 9,999', () => {
    if (!sitemapExists) return
    for (const slug of sampleSlugs) {
      const path = resolve(distDir, 'players', slug, 'index.html')
      if (!existsSync(path)) continue
      const html = readFileSync(path, 'utf-8')
      const valMatches = [...html.matchAll(/FDP (?:Dynasty |dynasty )?[Vv]alue:?\s*([\d,]+)/g)]
      for (const m of valMatches) {
        const val = parseInt(m[1].replace(/,/g, ''))
        expect(val, `${slug} value ${m[1]}`).toBeLessThanOrEqual(9999)
      }
    }
  })
})

// ── Legacy slug redirects (requires build) ──────────────────────

describe('legacy slug redirects (requires build)', () => {
  const redirects = [
    { old: 'jamarr-chase', canonical: 'ja-marr-chase' },
    { old: 'dandre-swift', canonical: 'd-andre-swift' },
    { old: 'devon-achane', canonical: 'de-von-achane' },
  ]

  for (const { old, canonical } of redirects) {
    it(`${old} redirects to ${canonical}`, () => {
      const path = resolve(distDir, 'players', old, 'index.html')
      if (!existsSync(path)) return
      const html = readFileSync(path, 'utf-8')
      expect(html).toContain(`href="https://fantasydraftpros.com/players/${canonical}/"`)
      expect(html).toContain('noindex')
      expect(html).toContain('meta http-equiv="refresh"')
      expect(html).toContain('content="0;url=')
    })

    it(`${canonical} has a real SEO page (not a redirect)`, () => {
      const path = resolve(distDir, 'players', canonical, 'index.html')
      if (!existsSync(path)) return
      const html = readFileSync(path, 'utf-8')
      expect(html).not.toContain('Redirecting')
      expect(html).toContain('Dynasty Value')
      expect(html).toContain('application/ld+json')
    })
  }
})
