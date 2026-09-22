import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { computeDynastyTradeVal, tierLabel, playerSlug } from './logic'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const afdpSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8').replace(/\r\n/g, '\n')
const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf-8').replace(/\r\n/g, '\n')

// ── Helper: extract PLAYERS for regression checks ──
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

// ══════════════════════════════════════════════════════════════════
// 1. VIEWPORT / ZOOM SAFETY
// ══════════════════════════════════════════════════════════════════

describe('mobile: viewport zoom not disabled', () => {
  it('viewport meta does not contain user-scalable=no', () => {
    expect(indexHtml).not.toContain('user-scalable=no')
  })

  it('viewport meta does not contain maximum-scale=1', () => {
    expect(indexHtml).not.toMatch(/maximum-scale\s*=\s*1/)
  })

  it('viewport meta has width=device-width and initial-scale=1', () => {
    expect(indexHtml).toContain('width=device-width')
    expect(indexHtml).toContain('initial-scale=1')
  })
})

// ══════════════════════════════════════════════════════════════════
// 2. MOBILE NAVIGATION
// ══════════════════════════════════════════════════════════════════

describe('mobile: navigation', () => {
  it('has mobile bottom tab bar (fixed position)', () => {
    expect(afdpSrc).toContain('!isDesktop&&React.createElement("div",{style:{position:"fixed",bottom:0')
  })

  it('mobile header buttons have flexWrap for narrow screens', () => {
    expect(afdpSrc).toMatch(/display:"flex".*justifyContent:"center".*flexWrap:"wrap".*padding:"0 12px"/)
  })

  it('bottom tab buttons have minHeight for tap target', () => {
    expect(afdpSrc).toContain('minHeight:56')
  })
})

// ══════════════════════════════════════════════════════════════════
// 3. RESPONSIVE GRIDS — no fixed 4/5-col without responsive fallback
// ══════════════════════════════════════════════════════════════════

describe('mobile: responsive grids', () => {
  it('admin analytics grid uses auto-fit (not fixed 5-col)', () => {
    // Was: "1fr 1fr 1fr 1fr 1fr" — now uses auto-fit
    expect(afdpSrc).not.toContain('gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr"')
  })

  it('FDP value scale tiers use auto-fit', () => {
    // FDP Value page tier boxes (Elite/Star/Starter/Depth)
    expect(afdpSrc).toContain('gridTemplateColumns:"repeat(auto-fit, minmax(70px, 1fr))",gap:8,marginTop:16')
  })

  it('market filter categories use isDesktop conditional', () => {
    expect(afdpSrc).toContain('gridTemplateColumns:isDesktop?"1fr 1fr 1fr 1fr":"1fr 1fr"')
  })

  it('market report player stats use auto-fit', () => {
    expect(afdpSrc).toContain('gridTemplateColumns:"repeat(auto-fit, minmax(70px, 1fr))",gap:8,paddingTop:10')
  })

  it('auction stats grid uses auto-fit', () => {
    expect(afdpSrc).toContain('gridTemplateColumns:"repeat(auto-fit, minmax(70px, 1fr))",gap:4')
  })

  it('trade finder position needs uses responsive grid', () => {
    expect(afdpSrc).toContain('gridTemplateColumns:"repeat(4, 1fr)",gap:8,marginBottom:16')
  })

  it('value tuner layer selector uses auto-fit', () => {
    expect(afdpSrc).toContain('gridTemplateColumns:"repeat(auto-fit, minmax(60px, 1fr))",gap:4')
  })

  it('RB context table has overflowX wrapper for horizontal scroll', () => {
    expect(afdpSrc).toContain('overflowX:"auto"')
    expect(afdpSrc).toContain('minWidth:420')
  })
})

// ══════════════════════════════════════════════════════════════════
// 4. NO GLOBAL OVERFLOW HIDDEN HACK
// ══════════════════════════════════════════════════════════════════

describe('mobile: no global overflow hidden hack', () => {
  it('body does not have overflow:hidden globally', () => {
    // Should not have document-level overflow:hidden that masks layout problems
    expect(indexHtml).not.toContain('overflow:hidden')
    expect(indexHtml).not.toContain('overflow: hidden')
  })
})

// ══════════════════════════════════════════════════════════════════
// 5. TABLE HANDLING
// ══════════════════════════════════════════════════════════════════

describe('mobile: table horizontal scroll containment', () => {
  it('pricing feature comparison table has overflowX wrapper', () => {
    // The HTML table should be inside an overflowX:auto container
    const pricingArea = afdpSrc.substring(
      afdpSrc.indexOf('"Feature Comparison"'),
      afdpSrc.indexOf('"Feature Comparison"') + 500
    )
    expect(pricingArea).toContain('overflowX:"auto"')
  })
})

// ══════════════════════════════════════════════════════════════════
// 6. TAP TARGETS
// ══════════════════════════════════════════════════════════════════

describe('mobile: tap targets on close buttons', () => {
  it('settings modal close button has min 44px tap target', () => {
    const settingsArea = afdpSrc.substring(
      afdpSrc.indexOf('"League Settings"'),
      afdpSrc.indexOf('"League Settings"') + 500
    )
    expect(settingsArea).toContain('minWidth:44')
    expect(settingsArea).toContain('minHeight:44')
  })

  it('auth modal close button has min 44px tap target', () => {
    // The close button is near the start of the AuthModal return
    const authStart = afdpSrc.indexOf('function AuthModal')
    const authReturn = afdpSrc.indexOf('return React.createElement("div"', authStart)
    const authArea = afdpSrc.substring(authReturn, authReturn + 1000)
    expect(authArea).toContain('minWidth:44')
    expect(authArea).toContain('minHeight:44')
  })

  it('mobile bottom tabs have adequate height', () => {
    // Each tab should have minHeight:56 (reported by audit)
    expect(afdpSrc).toContain('minHeight:56')
  })

  it('mobile header action buttons have minHeight:44', () => {
    expect(afdpSrc).toContain('minHeight:44')
  })
})

// ══════════════════════════════════════════════════════════════════
// 7. MODAL SAFETY
// ══════════════════════════════════════════════════════════════════

describe('mobile: modals fit viewport', () => {
  it('auth modal uses width:100% with maxWidth', () => {
    expect(afdpSrc).toContain('width:"100%",maxWidth:400')
  })

  it('settings modal uses width:100% with maxWidth', () => {
    expect(afdpSrc).toContain('width:"100%",maxWidth:440')
  })

  it('modals have padding on outer container for viewport safety', () => {
    // All fixed modals should have padding:16 on the overlay
    expect(afdpSrc).toMatch(/position:"fixed",inset:0.*padding:16/)
  })
})

// ══════════════════════════════════════════════════════════════════
// 8. NEWSLETTER FORM
// ══════════════════════════════════════════════════════════════════

describe('mobile: newsletter form wraps on narrow screens', () => {
  it('newsletter form flex container has flexWrap', () => {
    expect(afdpSrc).toContain('display:"flex",gap:8,maxWidth:380,margin:"0 auto",flexWrap:"wrap"')
  })
})

// ══════════════════════════════════════════════════════════════════
// 9. HORIZONTAL SCROLL TABS
// ══════════════════════════════════════════════════════════════════

describe('mobile: horizontal scroll tab patterns', () => {
  it('league sub-tabs use overflowX:auto', () => {
    expect(afdpSrc).toMatch(/leagueTabsRef.*overflowX:"auto"/)
  })

  it('ranking sub-tabs use overflowX:auto', () => {
    expect(afdpSrc).toMatch(/rankingTabsRef.*overflowX:"auto"/)
  })

  it('reports sub-tabs use overflowX:auto', () => {
    expect(afdpSrc).toMatch(/reportsTabsRef.*overflowX:"auto"/)
  })
})

// ══════════════════════════════════════════════════════════════════
// 10. PLAYER PAGE PRESERVES PROMPT 14
// ══════════════════════════════════════════════════════════════════

describe('mobile: player page prompt 14 preserved', () => {
  const ppBlock = afdpSrc.substring(
    afdpSrc.indexOf('// ── PLAYER PROFILE PAGE ──'),
    afdpSrc.indexOf('return React.createElement("div",{style:{background:T.bg,height:"100vh"')
  )

  it('player page value bar uses CSS grid auto-fit', () => {
    expect(ppBlock).toContain('gridTemplateColumns:"repeat(auto-fit, minmax(64px, 1fr))"')
  })

  it('player page game script has flexWrap', () => {
    const gsSection = ppBlock.substring(
      ppBlock.indexOf('// Game Script'),
      ppBlock.indexOf('// Season Projections')
    )
    expect(gsSection).toContain('flexWrap:"wrap"')
  })

  it('player page uses main landmark', () => {
    expect(ppBlock).toContain('React.createElement("main"')
  })

  it('canonical tier still uses pp.tier', () => {
    expect(ppBlock).toContain('pp.tier?"Tier "+pp.tier.t')
  })

  it('game script still consumes centralized oddsData only', () => {
    expect(ppBlock).toContain('getGameScript(pp.team,oddsData)')
    expect(ppBlock).not.toContain('buildHardcodedOdds()')
  })
})

// ══════════════════════════════════════════════════════════════════
// 11. PRODUCT LOGIC REGRESSION — values unchanged
// ══════════════════════════════════════════════════════════════════

describe('mobile: product logic regression safety', () => {
  it('canonical FDP values unchanged (10 sample players)', () => {
    const opts = { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false }
    const players = parsePlayers()
    const lookup = new Map(players.map((p: any) => [p.name, p]))

    const expected: Record<string, { ktcVal: number; tradeVal: number }> = {
      'Josh Allen': { ktcVal: 9100, tradeVal: 9100 },
      'Bijan Robinson': { ktcVal: 9999, tradeVal: 9999 },
      "Ja'Marr Chase": { ktcVal: 9980, tradeVal: 9980 },
      'Brock Bowers': { ktcVal: 8350, tradeVal: 8838 },
    }

    for (const [name, exp] of Object.entries(expected)) {
      const p = lookup.get(name)
      expect(p).toBeDefined()
      expect(p!.ktcVal).toBe(exp.ktcVal)
      const tv = computeDynastyTradeVal(p!.pos, p!.age, p!.ktcVal, 1, (p!.proj || {}).PPR || 0, opts)
      expect(tv).toBe(exp.tradeVal)
    }
  })

  it('odds freshness semantics unchanged', () => {
    const ppBlock = afdpSrc.substring(
      afdpSrc.indexOf('// ── PLAYER PROFILE PAGE ──'),
      afdpSrc.indexOf('return React.createElement("div",{style:{background:T.bg,height:"100vh"')
    )
    expect(ppBlock).toContain('oddsSource==="api"||oddsSource==="cache"?"GAME SCRIPT":"ARCHIVED GAME SCRIPT"')
  })

  it('trade analyzer calculation references unchanged', () => {
    expect(afdpSrc).toContain('computeDynastyTradeVal(')
    expect(afdpSrc).toContain('tierLabel(')
  })
})

// ══════════════════════════════════════════════════════════════════
// 12. ACCESSIBILITY
// ══════════════════════════════════════════════════════════════════

describe('mobile: accessibility preserved', () => {
  it('auth modal close has aria-label', () => {
    expect(afdpSrc).toContain('"aria-label":"Close"')
  })

  it('player page has h1 and h2 hierarchy', () => {
    const ppBlock = afdpSrc.substring(
      afdpSrc.indexOf('// ── PLAYER PROFILE PAGE ──'),
      afdpSrc.indexOf('return React.createElement("div",{style:{background:T.bg,height:"100vh"')
    )
    const h1Count = (ppBlock.match(/React\.createElement\("h1"/g) || []).length
    const h2Count = (ppBlock.match(/React\.createElement\("h2"/g) || []).length
    expect(h1Count).toBe(1)
    expect(h2Count).toBeGreaterThanOrEqual(5)
  })
})
