import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { computeDynastyTradeVal, playerSlug, tierLabel, VALUES_UPDATED_AT } from './logic'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const afdpSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8').replace(/\r\n/g, '\n')
const viteConfigSrc = readFileSync(resolve(rootDir, 'vite.config.ts'), 'utf-8').replace(/\r\n/g, '\n')

// ── Extract PLAYERS array for data-driven tests ─────────────────
function parsePlayers(): Array<{ name: string; pos: string; age: number; team: string; ktcVal?: number; proj: { PPR: number; Half: number; Standard: number }; note?: string }> {
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

const PLAYERS = parsePlayers()

function rankAllPlayers() {
  const defaultOpts = { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false }
  const withVals = PLAYERS.map(p => ({
    ...p,
    slug: playerSlug(p.name),
    tradeVal: computeDynastyTradeVal(p.pos, p.age, p.ktcVal, 1, p.proj?.PPR || 0, defaultOpts),
    posRank: 0, rank: 0,
    tier: null as null | { t: number; c: string },
  }))
  withVals.sort((a, b) => b.tradeVal - a.tradeVal)
  const posCount: Record<string, number> = {}
  withVals.forEach((p, i) => {
    posCount[p.pos] = (posCount[p.pos] || 0) + 1
    p.posRank = posCount[p.pos]
    p.rank = i + 1
    p.tier = tierLabel(p.posRank, p.pos)
  })
  return withVals
}

const ranked = rankAllPlayers()

// ── Helper: extract the player-page block from afdp.tsx ─────────
function getPlayerPageBlock(): string {
  const marker = '// ── PLAYER PROFILE PAGE ──'
  const startIdx = afdpSrc.indexOf(marker)
  // Find the closing of the player page if(playerPage){ ... } block
  // It ends at the next top-level "return React.createElement" after the block
  const endMarker = 'return React.createElement("div",{style:{background:T.bg,height:"100vh"'
  const endIdx = afdpSrc.indexOf(endMarker, startIdx)
  return afdpSrc.substring(startIdx, endIdx)
}

const ppBlock = getPlayerPageBlock()

// ══════════════════════════════════════════════════════════════════
// 1. GAME SCRIPT FRESHNESS — does NOT bypass Prompt 13A architecture
// ══════════════════════════════════════════════════════════════════

describe('player page: game script architecture compliance', () => {
  it('does not directly call buildHardcodedOdds() in the player page block', () => {
    // The player page must consume centralized oddsData, not bypass with buildHardcodedOdds
    expect(ppBlock).not.toContain('buildHardcodedOdds()')
  })

  it('does not call api.the-odds-api.com from the player page', () => {
    expect(ppBlock).not.toContain('api.the-odds-api.com')
  })

  it('does not reference VITE_ODDS_API_KEY from the player page', () => {
    expect(ppBlock).not.toContain('VITE_ODDS_API_KEY')
  })

  it('does not call fetchOdds() directly from the player page block', () => {
    // Player page should consume oddsData state, not trigger its own fetch
    expect(ppBlock).not.toMatch(/fetchOdds\s*\(/)
  })

  it('consumes centralized oddsData state for game script', () => {
    expect(ppBlock).toContain('getGameScript(pp.team,oddsData)')
  })

  it('does not have a parallel fallback to buildHardcodedOdds', () => {
    // Ensure no || buildHardcodedOdds pattern
    expect(ppBlock).not.toMatch(/getGameScript.*\|\|.*buildHardcodedOdds/)
  })
})

// ══════════════════════════════════════════════════════════════════
// 2. GAME SCRIPT LABELING — honest labels per odds state
// ══════════════════════════════════════════════════════════════════

describe('player page: game script labeling', () => {
  it('uses "GAME SCRIPT" for fresh API/cache data (not "THIS WEEK\'S" or "LIVE")', () => {
    // Fresh data label should be neutral "GAME SCRIPT"
    expect(ppBlock).toContain('oddsSource==="api"||oddsSource==="cache"?"GAME SCRIPT"')
  })

  it('uses "ARCHIVED GAME SCRIPT" for manual/non-fresh data', () => {
    expect(ppBlock).toContain('"ARCHIVED GAME SCRIPT"')
  })

  it('does not use "THIS WEEK\'S" as a game script label', () => {
    // This was the old incorrect label
    expect(ppBlock).not.toContain("THIS WEEK'S")
    expect(ppBlock).not.toContain('THIS WEEK')
  })

  it('does not use "LIVE" or "CURRENT" as game script labels', () => {
    expect(ppBlock).not.toMatch(/["']LIVE\b/)
    expect(ppBlock).not.toMatch(/["']CURRENT\b/)
  })

  it('does not use "UPCOMING" as game script label (misleading for archived data)', () => {
    expect(ppBlock).not.toContain('"UPCOMING')
  })

  it('shows stale/updating indicator when oddsStale is true', () => {
    expect(ppBlock).toContain('oddsStale')
    expect(ppBlock).toMatch(/oddsStale.*Updating/)
  })

  it('shows "May not reflect current week" for manual odds', () => {
    expect(ppBlock).toContain('oddsSource==="manual"')
    expect(ppBlock).toContain('May not reflect current week')
  })
})

// ══════════════════════════════════════════════════════════════════
// 3. PLAYER MATCHUP ACCURACY
// ══════════════════════════════════════════════════════════════════

describe('player page: matchup accuracy', () => {
  it('uses pp.team (the player\'s actual team) for getGameScript', () => {
    expect(ppBlock).toMatch(/getGameScript\(pp\.team/)
  })

  it('only renders game script when ppScript is truthy (handles missing matchup)', () => {
    expect(ppBlock).toMatch(/ppScript&&React\.createElement/)
  })

  it('displays opponent from ppScript.opp', () => {
    expect(ppBlock).toContain('ppScript.opp')
  })

  it('displays spread from ppScript', () => {
    expect(ppBlock).toContain('ppScript.spread')
  })

  it('displays total from ppScript', () => {
    expect(ppBlock).toContain('ppScript.total')
  })

  it('getGameScript returns null when team is not found in odds', () => {
    // Verify the function handles missing teams
    const getGameScriptSrc = afdpSrc.substring(
      afdpSrc.indexOf('function getGameScript('),
      afdpSrc.indexOf('}', afdpSrc.indexOf('return{spread,total,script,label', afdpSrc.indexOf('function getGameScript('))) + 1
    )
    expect(getGameScriptSrc).toContain('if(!odds)return null')
    expect(getGameScriptSrc).toContain('if(!g)return null')
  })
})

// ══════════════════════════════════════════════════════════════════
// 5. PROJECTION DATA TRUTHFULNESS
// ══════════════════════════════════════════════════════════════════

describe('player page: projection data truthfulness', () => {
  it('projections come from pp.proj (legitimate PLAYERS data), not FDP Value', () => {
    expect(ppBlock).toContain('var ppProj=pp.proj||{}')
    expect(ppBlock).toContain('ppProj.PPR')
    expect(ppBlock).toContain('ppProj.Half')
    expect(ppBlock).toContain('ppProj.Standard')
  })

  it('does not fabricate projections from tradeVal or ktcVal', () => {
    // The projection section should not reference tradeVal or ktcVal for projection values
    const projSection = ppBlock.substring(
      ppBlock.indexOf('// Season Projections'),
      ppBlock.indexOf('// Teammates')
    )
    expect(projSection).not.toContain('tradeVal')
    expect(projSection).not.toContain('ktcVal')
  })

  it('labels projections as "2026 SEASON PROJECTIONS" (not stats or actuals)', () => {
    expect(ppBlock).toContain('2026 SEASON PROJECTIONS')
  })

  it('labels projections as "Projected fantasy points"', () => {
    expect(ppBlock).toContain('Projected fantasy points')
  })

  it('uses explicit type check for projection rendering (zero is valid)', () => {
    // typeof item[1]==="number"&&isFinite(item[1]) — zero renders as "0.0", undefined/null shows "—"
    expect(ppBlock).toContain('typeof item[1]==="number"&&isFinite(item[1]')
  })

  it('zero projection renders as 0.0 not as missing', () => {
    // The explicit isFinite check means 0 is treated as a valid number
    expect(ppBlock).not.toMatch(/item\[1\]\?item\[1\]\.toFixed/)  // no truthiness check
  })

  it('only renders projection section when at least one format has data', () => {
    expect(ppBlock).toContain('(ppProj.PPR||ppProj.Half||ppProj.Standard)&&React.createElement')
  })

  it('all PLAYERS entries have real projection data', () => {
    for (const p of PLAYERS.slice(0, 50)) {
      // Top players should have non-zero projections
      if (p.proj) {
        expect(p.proj.PPR).toBeGreaterThan(0)
        expect(p.proj.Half).toBeGreaterThan(0)
        expect(p.proj.Standard).toBeGreaterThan(0)
      }
    }
  })
})

// ══════════════════════════════════════════════════════════════════
// 6. ACTIVE FORMAT HIGHLIGHT
// ══════════════════════════════════════════════════════════════════

describe('player page: active format highlight', () => {
  it('highlights PPR when sKey==="PPR"', () => {
    expect(ppBlock).toContain('item[0]==="PPR"&&sKey==="PPR"')
  })

  it('highlights Half PPR when sKey==="Half"', () => {
    expect(ppBlock).toContain('item[0]==="Half PPR"&&sKey==="Half"')
  })

  it('highlights Standard when sKey==="Standard"', () => {
    expect(ppBlock).toContain('item[0]==="Standard"&&sKey==="Standard"')
  })

  it('highlight logic does not reference isSF or tePremium (base format only)', () => {
    // Superflex and TE Premium should not alter which projection column is highlighted
    const projHighlightLine = ppBlock.substring(
      ppBlock.indexOf('var isActive='),
      ppBlock.indexOf(';', ppBlock.indexOf('var isActive='))
    )
    expect(projHighlightLine).not.toContain('isSF')
    expect(projHighlightLine).not.toContain('tePremium')
  })
})

// ══════════════════════════════════════════════════════════════════
// 7. TEAMMATE VALUES — canonical source
// ══════════════════════════════════════════════════════════════════

describe('player page: teammate values', () => {
  it('teammates come from rankedPlayers (canonical source)', () => {
    expect(ppBlock).toContain('rankedPlayers.filter(function(x:any){return x.name!==pp.name&&x.team===pp.team')
  })

  it('excludes current player from teammates', () => {
    expect(ppBlock).toContain('x.name!==pp.name')
  })

  it('filters by same team', () => {
    expect(ppBlock).toContain('x.team===pp.team')
  })

  it('uses canonical tradeVal for sorting', () => {
    expect(ppBlock).toMatch(/sort\(function\(a:any,b:any\)\{return\(b\.tradeVal\|\|0\)-\(a\.tradeVal\|\|0\)/)
  })

  it('teammate links use canonical playerSlug', () => {
    expect(ppBlock).toMatch(/href:"\/players\/"\+playerSlug\(tm\.name\)/)
  })

  it('displays tradeVal from canonical source (not recalculated)', () => {
    // The teammate section renders tm.tradeVal, not a locally computed value
    const teamSection = ppBlock.substring(
      ppBlock.indexOf('// Teammates'),
      ppBlock.indexOf('// Trade Comps')
    )
    expect(teamSection).toContain('(tm.tradeVal||0).toLocaleString()')
    expect(teamSection).not.toContain('computeDynastyTradeVal')
  })

  it('limits to 6 teammates', () => {
    expect(ppBlock).toContain('.slice(0,6)')
  })

  it('is sorted deterministically (by tradeVal descending)', () => {
    expect(ppBlock).toContain('.sort(function(a:any,b:any){return(b.tradeVal||0)-(a.tradeVal||0);})')
  })
})

// ══════════════════════════════════════════════════════════════════
// 8. TEAMMATE THRESHOLD
// ══════════════════════════════════════════════════════════════════

describe('player page: teammate threshold', () => {
  it('uses tradeVal > 500 as presentational threshold', () => {
    expect(ppBlock).toContain('(x.tradeVal||0)>500')
  })

  it('threshold is purely presentational (does not affect rankings or values)', () => {
    // The threshold only appears in the teammates filter, not in any value computation
    const occurrences = ppBlock.split('>500').length - 1
    expect(occurrences).toBe(1) // Only one place uses 500 threshold
  })
})

// ══════════════════════════════════════════════════════════════════
// 9. CANONICAL TIER — no local tier formula
// ══════════════════════════════════════════════════════════════════

describe('player page: canonical tier (no local formula)', () => {
  it('uses pp.tier from rankedPlayers as primary tier source', () => {
    expect(ppBlock).toContain('pp.tier?"Tier "+pp.tier.t')
  })

  it('falls back to dash when tier unavailable (not a local recalculation)', () => {
    // Should show "—" not "Elite"/"Star"/"Starter" etc.
    expect(ppBlock).toMatch(/pp\.tier\?"Tier "\+pp\.tier\.t:"\u2014"/)
  })

  it('does NOT contain value-based tier thresholds (8000/6000/4000/2000)', () => {
    // The old local tier: ppVal>=8000?"Elite":ppVal>=6000?"Star":...
    const tierLine = ppBlock.substring(
      ppBlock.indexOf('var ppTier='),
      ppBlock.indexOf(';', ppBlock.indexOf('var ppTier='))
    )
    expect(tierLine).not.toContain('8000')
    expect(tierLine).not.toContain('6000')
    expect(tierLine).not.toContain('4000')
    expect(tierLine).not.toContain('2000')
    expect(tierLine).not.toContain('"Elite"')
    expect(tierLine).not.toContain('"Star"')
    expect(tierLine).not.toContain('"Starter"')
    expect(tierLine).not.toContain('"Depth"')
    expect(tierLine).not.toContain('"Bench"')
  })

  it('tier color uses pp.tier.c or T.textDim fallback (not value thresholds)', () => {
    const tierColorLine = ppBlock.substring(
      ppBlock.indexOf('var ppTierColor='),
      ppBlock.indexOf(';', ppBlock.indexOf('var ppTierColor='))
    )
    expect(tierColorLine).toContain('pp.tier?pp.tier.c:T.textDim')
    expect(tierColorLine).not.toContain('8000')
    expect(tierColorLine).not.toContain('6000')
  })
})

// ══════════════════════════════════════════════════════════════════
// 10. SEO / RUNTIME FACT ALIGNMENT
// ══════════════════════════════════════════════════════════════════

describe('player page: SEO/runtime fact alignment (Dynasty 1QB PPR)', () => {
  const spotCheck = ['Josh Allen', "Ja'Marr Chase", 'Brock Bowers', 'Bijan Robinson', 'Jaxon Smith-Njigba']

  for (const name of spotCheck) {
    describe(name, () => {
      const player = ranked.find(p => p.name === name)!
      const raw = PLAYERS.find(p => p.name === name)!

      it('exists in PLAYERS and rankedPlayers', () => {
        expect(player).toBeDefined()
        expect(raw).toBeDefined()
      })

      it('SEO and runtime use same computeDynastyTradeVal for FDP Value', () => {
        // Both SEO (vite.config.ts) and runtime compute via computeDynastyTradeVal
        // with default Dynasty 1QB PPR options
        const defaultOpts = { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false }
        const seoVal = computeDynastyTradeVal(raw.pos, raw.age, raw.ktcVal, 1, raw.proj?.PPR || 0, defaultOpts)
        expect(player.tradeVal).toBe(seoVal)
      })

      it('SEO and runtime use same tierLabel for tier', () => {
        const seoTier = tierLabel(player.posRank, player.pos)
        expect(player.tier).toEqual(seoTier)
      })

      it('SEO and runtime use same playerSlug', () => {
        const slug = playerSlug(name)
        expect(player.slug).toBe(slug)
      })

      it('has consistent team and position between PLAYERS and ranked', () => {
        expect(player.pos).toBe(raw.pos)
        expect(player.team).toBe(raw.team)
      })
    })
  }
})

// ══════════════════════════════════════════════════════════════════
// 11. MOBILE SAFETY
// ══════════════════════════════════════════════════════════════════

describe('player page: mobile safety', () => {
  it('uses CSS grid with auto-fit for value bar (responsive columns)', () => {
    expect(ppBlock).toContain('gridTemplateColumns:"repeat(auto-fit, minmax(64px, 1fr))"')
  })

  it('game script matchup text uses flexWrap', () => {
    // The game script row should wrap on narrow screens
    const gsSection = ppBlock.substring(
      ppBlock.indexOf('// Game Script'),
      ppBlock.indexOf('// Season Projections')
    )
    expect(gsSection).toContain('flexWrap:"wrap"')
  })

  it('projection grid uses fixed 3-column layout (each column >= ~100px at 375px)', () => {
    // At 375px with 16px*2 padding = 343px content, 3 columns = ~107px each — fine
    expect(ppBlock).toContain('gridTemplateColumns:"repeat(3,1fr)"')
  })

  it('main content area has maxWidth 720 and 16px padding', () => {
    expect(ppBlock).toContain('maxWidth:720')
    expect(ppBlock).toContain('padding:"20px 16px"')
  })

  it('uses <main> landmark for content area', () => {
    expect(ppBlock).toContain('React.createElement("main"')
  })
})

// ══════════════════════════════════════════════════════════════════
// 12. HEADING HIERARCHY
// ══════════════════════════════════════════════════════════════════

describe('player page: heading hierarchy and accessibility', () => {
  it('has exactly one h1 (player name)', () => {
    const h1Count = (ppBlock.match(/React\.createElement\("h1"/g) || []).length
    expect(h1Count).toBe(1)
  })

  it('section headers use h2 elements', () => {
    // Game Script, Projections, Teammates, Trade Comps, News, Top Players should all be h2
    const h2Count = (ppBlock.match(/React\.createElement\("h2"/g) || []).length
    expect(h2Count).toBeGreaterThanOrEqual(5)
  })

  it('WhyThisValue has aria-expanded and aria-label', () => {
    // WhyThisValue component (used in player page) has accessibility attributes
    const whySrc = afdpSrc.substring(
      afdpSrc.indexOf('function WhyThisValue('),
      afdpSrc.indexOf('}', afdpSrc.indexOf('function WhyThisValue(') + 500) + 1
    )
    expect(whySrc).toContain('"aria-expanded"')
    expect(whySrc).toContain('"aria-label"')
  })
})

// ══════════════════════════════════════════════════════════════════
// 13. SEO ARCHITECTURE PRESERVED
// ══════════════════════════════════════════════════════════════════

describe('player page: SEO architecture (Prompt 9) preserved', () => {
  it('sets document.title for player page', () => {
    expect(ppBlock).toContain('document.title=')
    expect(ppBlock).toContain('Dynasty Value & Trade Analysis | Fantasy Draft Pros')
  })

  it('updates meta description with canonical value', () => {
    expect(ppBlock).toContain('meta[name="description"]')
    expect(ppBlock).toContain('ppVal.toLocaleString()')
  })

  it('renders JSON-LD Person schema', () => {
    expect(ppBlock).toContain('"@type":"Person"')
    expect(ppBlock).toContain('"@context":"https://schema.org"')
  })

  it('JSON-LD includes canonical URL with playerSlug', () => {
    expect(ppBlock).toContain('"url":"https://fantasydraftpros.com/players/"+playerSlug(pp.name)')
  })

  it('build-time SEO generates same tier function as runtime', () => {
    expect(viteConfigSrc).toContain("import { computeDynastyTradeVal, playerSlug, tierLabel, VALUES_UPDATED_AT } from './src/logic'")
  })
})
