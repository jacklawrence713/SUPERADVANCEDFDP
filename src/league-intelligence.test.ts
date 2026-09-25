import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { computeDynastyTradeVal, tierLabel } from './logic'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const afdpSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8').replace(/\r\n/g, '\n')

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
// 1. TEAM IDENTITY — stable identifiers
// ══════════════════════════════════════════════════════════════════

describe('league intel: team identity', () => {
  it('team objects include ownerId field in connectLeague', () => {
    expect(afdpSrc).toContain('ownerId:r.owner_id||""')
  })

  it('team objects include rosterId field in connectLeague', () => {
    expect(afdpSrc).toContain('rosterId:r.roster_id||""')
  })

  it('sleeperUserId state exists and persists to localStorage', () => {
    expect(afdpSrc).toContain("localStorage.getItem('fdp_sluid_v1')")
  })

  it('myTeamOwnerId state exists and persists to localStorage (league-scoped)', () => {
    expect(afdpSrc).toContain("localStorage.getItem('fdp_myowner_v2')")
  })

  it('user team is identified by matching ownerId to sleeperUserId', () => {
    expect(afdpSrc).toContain('r.owner_id===sleeperUserId')
  })

  it('sleeperUserId is stored during doLeagueImport', () => {
    const importBlock = afdpSrc.substring(
      afdpSrc.indexOf('function doLeagueImport'),
      afdpSrc.indexOf('function doLeagueImport') + 600
    )
    expect(importBlock).toContain('setSleeperUserId(uid)')
    expect(importBlock).toContain("localStorage.setItem('fdp_sluid_v1',uid)")
  })

  it('myTeamOwnerId is cleared on league disconnect', () => {
    expect(afdpSrc).toContain('saveMyTeamOwnerId(null)')
  })
})

// ══════════════════════════════════════════════════════════════════
// 2. LEAGUE CONTEXT — roster positions stored
// ══════════════════════════════════════════════════════════════════

describe('league intel: league context', () => {
  it('leagueRosterPositions state persists to localStorage (league-scoped)', () => {
    expect(afdpSrc).toContain("localStorage.getItem('fdp_rpos_v2')")
  })

  it('roster positions are stored during connectLeague (league-scoped)', () => {
    expect(afdpSrc).toContain("setLeagueRosterPositions(lg.roster_positions)")
    expect(afdpSrc).toContain("localStorage.setItem('fdp_rpos_v2',JSON.stringify({leagueId:lg.league_id,positions:lg.roster_positions}))")
  })

  it('roster positions are cleared on disconnect', () => {
    expect(afdpSrc).toContain("localStorage.removeItem('fdp_rpos_v2')")
  })

  it('SF detection from roster_positions unchanged', () => {
    expect(afdpSrc).toContain('lg.roster_positions.indexOf("SUPER_FLEX")!==-1')
  })

  it('IDP detection from roster_positions unchanged', () => {
    expect(afdpSrc).toContain('lg.roster_positions.indexOf("IDP_FLEX")!==-1')
  })
})

// ══════════════════════════════════════════════════════════════════
// 3. LEAGUE INTELLIGENCE ENGINE — useMemo
// ══════════════════════════════════════════════════════════════════

describe('league intel: intelligence engine', () => {
  it('leagueIntel useMemo exists', () => {
    expect(afdpSrc).toContain('var leagueIntel=useMemo(function()')
  })

  it('depends on powerRankingTeams and leagueRosterPositions', () => {
    expect(afdpSrc).toContain('[powerRankingTeams,leagueRosterPositions]')
  })

  it('computes per-team position values (QB/RB/WR/TE)', () => {
    expect(afdpSrc).toContain('posVal:{QB:0,RB:0,WR:0,TE:0}')
  })

  it('computes league averages', () => {
    expect(afdpSrc).toContain('avg.totalVal=Math.round(avg.totalVal/n)')
  })

  it('computes position ranks per team', () => {
    expect(afdpSrc).toContain('posRanks[t.idx]={};posRanks[t.idx][pos]=r+1')
  })

  it('computes overall and starter ranks', () => {
    expect(afdpSrc).toContain('t.overallRank=r+1')
    expect(afdpSrc).toContain('t.starterRank=r+1')
  })

  it('parses starter slots from roster positions', () => {
    expect(afdpSrc).toMatch(/if\(p==="QB"\)ss\.QB\+\+/)
    expect(afdpSrc).toMatch(/if\(p==="SUPER_FLEX"\)ss\.SUPER_FLEX\+\+/)
  })

  it('computes starter/bench split via slot-aware optimal lineup', () => {
    expect(afdpSrc).toContain('function computeOptimalLineup(plrs)')
    expect(afdpSrc).toContain('var lineup=computeOptimalLineup(plrs)')
  })

  it('returns null when no powerRankingTeams', () => {
    expect(afdpSrc).toContain('if(!powerRankingTeams||powerRankingTeams.length===0)return null')
  })
})

// ══════════════════════════════════════════════════════════════════
// 4. OVERVIEW TAB — League Intelligence
// ══════════════════════════════════════════════════════════════════

describe('league intel: overview tab', () => {
  it('overview tab exists in tab list', () => {
    expect(afdpSrc).toContain('["overview","League Intelligence"]')
  })

  it('overview tab renders when leagueSubTab==="overview"', () => {
    expect(afdpSrc).toContain('leagueSubTab==="overview"&&canAccessLeagueFeatures(user)&&React.createElement')
  })

  it('shows import prompt when no league connected', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).toContain('Import your Sleeper or ESPN league')
  })

  it('shows team selector when myTeamOwnerId is not set', () => {
    expect(afdpSrc).toContain('Choose your team...')
  })

  it('shows YOUR TEAM label when user team identified', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).toContain('"YOUR TEAM"')
  })

  it('overview shows league header with format context', () => {
    expect(afdpSrc).toContain('"League Intelligence"')
    expect(afdpSrc).toContain('fmtLabel2')
  })

  it('overview displays stat cards for value breakdown', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).toContain('"Total Value"')
    expect(overviewBlock).toContain('"Optimal Lineup"')
    expect(overviewBlock).toContain('"Bench"')
    expect(overviewBlock).toContain('"Picks"')
  })

  it('overview shows position strength with league-relative ranks', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).toContain('"POSITION STRENGTH"')
    expect(overviewBlock).toContain('ordSuf(rank)+" of "+n')
  })

  it('overview shows roster age context', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).toContain('"Pre-Prime"')
    expect(overviewBlock).toContain('"In Prime"')
    expect(overviewBlock).toContain('"Post-Prime"')
  })
})

// ══════════════════════════════════════════════════════════════════
// 5. ACTION CENTER — deterministic priorities
// ══════════════════════════════════════════════════════════════════

describe('league intel: action center', () => {
  it('action center exists in overview', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).toContain('"Action Center"')
  })

  it('generates strength items for top-quartile positions', () => {
    expect(afdpSrc).toContain('league-leading strength')
  })

  it('generates attention items for bottom-quartile positions', () => {
    expect(afdpSrc).toContain('needs attention')
  })

  it('compares optimal lineup value to league average only when slot data exists', () => {
    expect(afdpSrc).toContain('leagueIntel.hasSlotData&&myData.starterVal!=null&&avg.starterVal!=null')
    expect(afdpSrc).toContain('Optimal lineup above league average')
    expect(afdpSrc).toContain('Optimal lineup trails league average')
  })

  it('generates aging warnings from real data', () => {
    expect(afdpSrc).toContain('post-prime players')
  })

  it('has fallback for balanced rosters', () => {
    expect(afdpSrc).toContain('Roster is balanced')
  })
})

// ══════════════════════════════════════════════════════════════════
// 6. TRADE PARTNER CONTEXT
// ══════════════════════════════════════════════════════════════════

describe('league intel: trade partner context', () => {
  it('trade partners section exists in overview', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).toContain('"Potential Trade Partners"')
  })

  it('uses positional complement matching', () => {
    expect(afdpSrc).toContain('myWeakPos')
    expect(afdpSrc).toContain('myStrongPos')
  })

  it('limits to 4 trade partners', () => {
    expect(afdpSrc).toContain('partners.slice(0,4)')
  })

  it('does not generate complete trade packages', () => {
    // No Prompt 18 Trade Finder implementation
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).not.toContain('tradePackage')
    expect(overviewBlock).not.toContain('generateTrade')
  })
})

// ══════════════════════════════════════════════════════════════════
// 7. LEAGUE POSITION RANKINGS TABLE
// ══════════════════════════════════════════════════════════════════

describe('league intel: position rankings table', () => {
  it('league position rankings table exists', () => {
    expect(afdpSrc).toContain('"League Position Rankings"')
  })

  it('table has overflowX wrapper for mobile', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('"League Position Rankings"'),
      afdpSrc.indexOf('"League Position Rankings"') + 500
    )
    expect(overviewBlock).toContain('overflowX:"auto"')
  })

  it('highlights user team row in position rankings', () => {
    expect(afdpSrc).toContain('isMe?T.purple+"12":"transparent"')
  })
})

// ══════════════════════════════════════════════════════════════════
// 8. USER TEAM HIGHLIGHTING
// ══════════════════════════════════════════════════════════════════

describe('league intel: user team highlighting', () => {
  it('power rankings highlight user team', () => {
    expect(afdpSrc).toContain('var isMyTeam=powerRankingTeams&&myTeamOwnerId&&team.ownerId===myTeamOwnerId')
  })

  it('power rankings show YOUR TEAM label', () => {
    expect(afdpSrc).toContain('isMyTeam&&React.createElement("div",{style:{fontSize:9,fontWeight:800,color:T.purple,letterSpacing:1,marginBottom:6}},"YOUR TEAM")')
  })

  it('pick power rankings highlight user team', () => {
    expect(afdpSrc).toContain('var isMyTeamPP=powerRankingTeams&&myTeamOwnerId&&team.ownerId===myTeamOwnerId')
  })

  it('highlighting does not change ranking order', () => {
    // Teams are still sorted by totalVal/combinedVal, highlighting is visual only
    expect(afdpSrc).toContain('teams.sort(function(a,b){return b.totalVal-a.totalVal;})')
  })
})

// ══════════════════════════════════════════════════════════════════
// 9. FAKE METRIC FIXES
// ══════════════════════════════════════════════════════════════════

describe('league intel: fake metric fixes', () => {
  it('aging risk is computed from real player age data', () => {
    // Old fake: agingRisk=Math.max(0,Math.round(adviceTeam*3.5))
    expect(afdpSrc).not.toContain('Math.round(adviceTeam*3.5)')
    // New: counts post-prime players
    expect(afdpSrc).toContain('agingRisk=advicePlrs.length>0?advicePlrs.filter')
  })

  it('starter value is computed from actual top players', () => {
    // Old fake: starterVal=Math.round(team.totalVal*0.65/1000)*1000
    expect(afdpSrc).not.toContain('team.totalVal*0.65')
    // New: sums actual starter player values
    expect(afdpSrc).toContain('adviceStarters.reduce(function(s,p){return s+(p.tradeVal||0);},0)')
  })

  it('advice uses leagueIntel totalStarters for starter count', () => {
    expect(afdpSrc).toContain('leagueIntel.totalStarters')
  })
})

// ══════════════════════════════════════════════════════════════════
// 10. FORMAT CONSISTENCY
// ══════════════════════════════════════════════════════════════════

describe('league intel: format consistency', () => {
  it('league intelligence uses same rankedPlayers as trade analyzer', () => {
    expect(afdpSrc).toContain('powerRankingTeams=useMemo(function(){')
    expect(afdpSrc).toContain('byName[p.name.toLowerCase()]=p')
  })

  it('scoring format auto-synced from league settings', () => {
    expect(afdpSrc).toContain('if(rec===1)setFormat("PPR")')
    expect(afdpSrc).toContain('if(rec===0.5)setFormat("Half")')
  })

  it('superflex auto-synced from league settings', () => {
    expect(afdpSrc).toContain('setSfMode(true)')
  })
})

// ══════════════════════════════════════════════════════════════════
// 11. AI ROLE — deterministic only
// ══════════════════════════════════════════════════════════════════

describe('league intel: AI does not generate league data', () => {
  it('overview tab has no AI/LLM calls', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).not.toContain('openai')
    expect(overviewBlock).not.toContain('anthropic')
    expect(overviewBlock).not.toContain('analyze-trade')
  })

  it('leagueIntel useMemo has no API calls', () => {
    const intelBlock = afdpSrc.substring(
      afdpSrc.indexOf('// ── LEAGUE INTELLIGENCE ENGINE ──'),
      afdpSrc.indexOf('function tVal(side,fa)')
    )
    expect(intelBlock).not.toContain('fetch(')
    expect(intelBlock).not.toContain('supabase')
  })

  it('action center priorities are deterministic (no AI)', () => {
    const actionBlock = afdpSrc.substring(
      afdpSrc.indexOf('"Action Center"'),
      afdpSrc.indexOf('"Potential Trade Partners"')
    )
    expect(actionBlock).not.toContain('generate')
    expect(actionBlock).not.toContain('GPT')
    expect(actionBlock).not.toContain('claude')
  })
})

// ══════════════════════════════════════════════════════════════════
// 12. MOBILE RESPONSIVENESS
// ══════════════════════════════════════════════════════════════════

describe('league intel: mobile responsive', () => {
  it('overview stat cards use auto-fit grid', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).toContain('gridTemplateColumns:"repeat(auto-fit, minmax(90px, 1fr))"')
  })

  it('roster age grid uses auto-fit', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).toContain('gridTemplateColumns:"repeat(auto-fit, minmax(80px, 1fr))"')
  })

  it('position rankings table has overflow wrapper', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('"League Position Rankings"'),
      afdpSrc.indexOf('"League Position Rankings"') + 300
    )
    expect(overviewBlock).toContain('overflowX:"auto"')
    expect(overviewBlock).toContain('minWidth:340')
  })
})

// ══════════════════════════════════════════════════════════════════
// 13. MISSING/PARTIAL DATA HANDLING
// ══════════════════════════════════════════════════════════════════

describe('league intel: missing data graceful handling', () => {
  it('leagueIntel returns null without imported teams', () => {
    expect(afdpSrc).toContain('if(!powerRankingTeams||powerRankingTeams.length===0)return null')
  })

  it('myTeamIdx is null when no owner match', () => {
    expect(afdpSrc).toContain('if(myTeamIdx===-1)myTeamIdx=null')
  })

  it('overview shows team selector when team not identified', () => {
    expect(afdpSrc).toContain('Select your team to see personalized intelligence')
  })

  it('team name falls back to Team + roster_id', () => {
    expect(afdpSrc).toContain('"Team "+r.roster_id')
  })

  it('owner falls back to empty string', () => {
    expect(afdpSrc).toContain('owner:u.display_name||""')
  })

  it('no default starter slots when roster positions unavailable', () => {
    // When hasSlotData is false, ss is null — no guessed defaults
    expect(afdpSrc).toContain('var hasSlotData=!!leagueRosterPositions&&leagueRosterPositions.length>0')
    expect(afdpSrc).toContain('var ss=hasSlotData?')
    expect(afdpSrc).not.toContain('ss={QB:1,RB:2,WR:2,TE:1,FLEX:1,SUPER_FLEX:0}')
  })
})

// ══════════════════════════════════════════════════════════════════
// 14. PRODUCT LOGIC REGRESSION
// ══════════════════════════════════════════════════════════════════

describe('league intel: product logic regression', () => {
  it('canonical FDP Values unchanged (4 sample players)', () => {
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

  it('trade analyzer calculation references unchanged', () => {
    expect(afdpSrc).toContain('computeDynastyTradeVal(')
    expect(afdpSrc).toContain('tierLabel(')
  })

  it('odds architecture unchanged', () => {
    expect(afdpSrc).toContain('oddsSource===\"api\"||oddsSource===\"cache\"')
  })

  it('Prompt 15 mobile patterns preserved', () => {
    expect(afdpSrc).toContain('!isDesktop&&React.createElement("div",{style:{position:"fixed",bottom:0')
    expect(afdpSrc).toContain('minHeight:56')
  })

  it('existing league tabs still present', () => {
    expect(afdpSrc).toContain('["power","Power Rankings"]')
    expect(afdpSrc).toContain('["advice","Team Advice"]')
    expect(afdpSrc).toContain('["roster","Roster Health"]')
    expect(afdpSrc).toContain('["waiver","Waiver Wire"]')
    expect(afdpSrc).toContain('["lineup","Lineup"]')
  })
})

// ══════════════════════════════════════════════════════════════════
// 15. NO FUTURE PHASE FEATURES
// ══════════════════════════════════════════════════════════════════

describe('league intel: no future phase features', () => {
  it('no value history implementation (Prompt 19)', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).not.toContain('valueHistory')
    expect(overviewBlock).not.toContain('priceHistory')
  })

  it('no game intelligence implementation (Prompt 22)', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).not.toContain('gameIntelligence')
    expect(overviewBlock).not.toContain('weatherData')
  })
})

// ══════════════════════════════════════════════════════════════════
// 16. STARTER/BENCH INTEGRITY — unknown settings
// ══════════════════════════════════════════════════════════════════

describe('league intel: unknown roster settings integrity', () => {
  it('hasSlotData is false when leagueRosterPositions is null', () => {
    expect(afdpSrc).toContain('var hasSlotData=!!leagueRosterPositions&&leagueRosterPositions.length>0')
  })

  it('starterSlots is null when hasSlotData is false', () => {
    expect(afdpSrc).toContain('var ss=hasSlotData?{QB:0,RB:0,WR:0,TE:0,FLEX:0,SUPER_FLEX:0,IDP_FLEX:0,DL:0,LB:0,DB:0}:null')
  })

  it('totalStarters is null when starterSlots is null', () => {
    expect(afdpSrc).toContain('var totalStarters=ss?ss.QB+ss.RB+ss.WR+ss.TE+ss.FLEX+ss.SUPER_FLEX:null')
  })

  it('computeOptimalLineup returns null without slot data', () => {
    expect(afdpSrc).toContain('if(!ss)return null')
  })

  it('per-team starterVal is null when lineup is null', () => {
    expect(afdpSrc).toContain('starterVal:lineup?lineup.starterVal:null')
    expect(afdpSrc).toContain('benchVal:lineup?lineup.benchVal:null')
  })

  it('league average starterVal is null when hasSlotData is false', () => {
    expect(afdpSrc).toContain('avg={totalVal:0,starterVal:null,benchVal:null')
  })

  it('league avg starter/bench only computed when hasSlotData', () => {
    expect(afdpSrc).toContain('if(hasSlotData){var svSum=0,bvSum=0')
  })

  it('starter ranks only computed when hasSlotData', () => {
    expect(afdpSrc).toContain('if(hasSlotData){td.slice().sort(function(a,b){return(b.starterVal||0)-(a.starterVal||0)')
  })

  it('hasSlotData flag is exposed in leagueIntel return', () => {
    expect(afdpSrc).toContain('hasSlotData:hasSlotData')
  })

  it('overview omits Optimal Lineup/Bench cards when hasSlotData is false', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// Stat cards'),
      afdpSrc.indexOf('// Position strength')
    )
    expect(overviewBlock).toContain('leagueIntel.hasSlotData?')
    expect(overviewBlock).toContain('"Optimal Lineup"')
    expect(overviewBlock).toContain('"Bench"')
  })

  it('action center guards starter/bench items with hasSlotData', () => {
    expect(afdpSrc).toContain('leagueIntel.hasSlotData&&myData.starterVal!=null&&avg.starterVal!=null')
    expect(afdpSrc).toContain('leagueIntel.hasSlotData&&myData.benchVal!=null&&avg.benchVal!=null')
  })

  it('advice tab guards starter value with slot data check', () => {
    expect(afdpSrc).toContain('var hasAdviceSlots=leagueIntel&&leagueIntel.hasSlotData&&leagueIntel.totalStarters!=null')
    expect(afdpSrc).toContain('var adviceStarters=hasAdviceSlots?')
    expect(afdpSrc).toContain('var starterVal=adviceStarters?adviceStarters.reduce')
  })

  it('advice stat cards omit starter value when null', () => {
    expect(afdpSrc).toContain('starterVal!=null?[["◎","Optimal Lineup"')
  })

  it('missing starter value does not become zero', () => {
    // starterVal is null, not 0, when slots are unavailable
    expect(afdpSrc).toContain('starterVal:lineup?lineup.starterVal:null')
    expect(afdpSrc).not.toContain('starterVal:lineup?lineup.starterVal:0')
  })
})

// ══════════════════════════════════════════════════════════════════
// 17. SLOT-AWARE LINEUP — FLEX/SUPER_FLEX eligibility
// ══════════════════════════════════════════════════════════════════

describe('league intel: slot-aware lineup calculation', () => {
  it('fills fixed position slots first (QB/RB/WR/TE)', () => {
    expect(afdpSrc).toContain('fillSlot("QB",ss.QB);fillSlot("RB",ss.RB);fillSlot("WR",ss.WR);fillSlot("TE",ss.TE)')
  })

  it('FLEX allows RB/WR/TE only', () => {
    expect(afdpSrc).toContain('["RB","WR","TE"].indexOf(p.pos)>=0&&!used[p.name]')
  })

  it('SUPER_FLEX allows QB/RB/WR/TE', () => {
    expect(afdpSrc).toContain('["QB","RB","WR","TE"].indexOf(p.pos)>=0&&!used[p.name]')
  })

  it('IDP slots are parsed from roster positions', () => {
    expect(afdpSrc).toContain('IDP_FLEX:0,DL:0,LB:0,DB:0')
    expect(afdpSrc).toContain('if(p==="IDP_FLEX")ss.IDP_FLEX++')
    expect(afdpSrc).toContain('if(p==="DL")ss.DL++')
    expect(afdpSrc).toContain('if(p==="LB")ss.LB++')
    expect(afdpSrc).toContain('if(p==="DB")ss.DB++')
  })

  it('optimal lineup labeled correctly (not "current starters")', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).toContain('"Optimal Lineup"')
    expect(overviewBlock).not.toContain('"Current Starters"')
    expect(overviewBlock).not.toContain('"Starter Value"')
  })

  it('advice tab labels lineup correctly', () => {
    expect(afdpSrc).toContain('"Optimal Lineup",starterVal.toLocaleString(),"slot-aware FDP value"')
  })

  it('used map prevents double-counting players across slots', () => {
    expect(afdpSrc).toContain('used[elig[j].name]=true')
    expect(afdpSrc).toContain('used[flexElig[j].name]=true')
    expect(afdpSrc).toContain('used[sfElig[j].name]=true')
  })
})

// ══════════════════════════════════════════════════════════════════
// 18. TEAM IDENTITY SCOPING
// ══════════════════════════════════════════════════════════════════

describe('league intel: team identity scoping', () => {
  it('connectLeague always resolves myTeamOwnerId with league scope (even to null)', () => {
    // Must always call saveMyTeamOwnerId with league ID
    expect(afdpSrc).toContain('var myOid=null;if(sleeperUserId){rosters.forEach(function(r){if(r.owner_id===sleeperUserId)myOid=r.owner_id;});}saveMyTeamOwnerId(myOid,lg.league_id);')
  })

  it('changing league clears stale identity when user not found', () => {
    // saveMyTeamOwnerId(myOid,lg.league_id) where myOid can be null — clears stale
    expect(afdpSrc).toContain('}saveMyTeamOwnerId(myOid,lg.league_id);')
  })

  it('disconnect clears both identity and roster positions', () => {
    expect(afdpSrc).toContain('saveMyTeamOwnerId(null);setLeagueRosterPositions(null)')
  })

  it('team highlighting never changes ranking order', () => {
    // isMyTeam is only used for styling, not sort order
    expect(afdpSrc).toContain('teams.sort(function(a,b){return b.totalVal-a.totalVal;})')
    // Highlighting is visual only
    expect(afdpSrc).toContain('isMyTeam?T.purple+"08":T.bgCard')
  })

  it('team name fallback is clearly generated', () => {
    expect(afdpSrc).toContain('"Team "+r.roster_id')
  })
})

// ══════════════════════════════════════════════════════════════════
// 19. LEAGUE-SCOPED IDENTITY — cross-league safety
// ══════════════════════════════════════════════════════════════════

describe('league intel: league-scoped identity persistence', () => {
  it('myTeamOwnerId is persisted with leagueId scope (v2 format)', () => {
    expect(afdpSrc).toContain("localStorage.setItem('fdp_myowner_v2',JSON.stringify({ownerId:id,leagueId:lid}))")
  })

  it('myTeamOwnerId restore validates leagueId matches active league', () => {
    // The useState initializer checks stored leagueId against active league
    expect(afdpSrc).toContain("d.leagueId===lid)?d.ownerId:null")
  })

  it('leagueRosterPositions is persisted with leagueId scope (v2 format)', () => {
    expect(afdpSrc).toContain("localStorage.setItem('fdp_rpos_v2',JSON.stringify({leagueId:lg.league_id,positions:lg.roster_positions}))")
  })

  it('leagueRosterPositions restore validates leagueId matches active league', () => {
    expect(afdpSrc).toContain("d.leagueId===lid)?d.positions:null")
  })

  it('ESPN import clears Sleeper identity and roster positions', () => {
    const espnStart = afdpSrc.indexOf('function processEspnData')
    const espnEnd = afdpSrc.indexOf('tryNext(proxies,0)', espnStart)
    const espnBlock = afdpSrc.substring(espnStart, espnEnd)
    expect(espnBlock).toContain('saveMyTeamOwnerId(null)')
    expect(espnBlock).toContain('setLeagueRosterPositions(null)')
    expect(espnBlock).toContain("localStorage.removeItem('fdp_rpos_v2')")
  })

  it('manual import clears Sleeper identity and roster positions', () => {
    const manualStart = afdpSrc.indexOf('function doManualImport')
    const manualEnd = afdpSrc.indexOf('function connectLeague', manualStart)
    const manualBlock = afdpSrc.substring(manualStart, manualEnd)
    expect(manualBlock).toContain('saveMyTeamOwnerId(null)')
    expect(manualBlock).toContain('setLeagueRosterPositions(null)')
    expect(manualBlock).toContain("localStorage.removeItem('fdp_rpos_v2')")
  })

  it('ESPN teams use stable provider-scoped ownerId (not array index)', () => {
    const espnStart = afdpSrc.indexOf('function processEspnData')
    const espnEnd = afdpSrc.indexOf('tryNext(proxies,0)', espnStart)
    const espnBlock = afdpSrc.substring(espnStart, espnEnd)
    // Uses stable ESPN team ID, not array index
    expect(espnBlock).toContain('ownerId:ownerId||("espn_team_"+t.id)')
    expect(espnBlock).not.toContain('"team_"+i')
    expect(espnBlock).not.toContain('"team_"+t.i')
  })

  it('no old unscoped fdp_myowner_v1 or fdp_rpos_v1 keys remain', () => {
    expect(afdpSrc).not.toContain("fdp_myowner_v1")
    expect(afdpSrc).not.toContain("fdp_rpos_v1")
  })

  it('saveMyTeamOwnerId accepts optional leagueId parameter', () => {
    expect(afdpSrc).toContain('function saveMyTeamOwnerId(id,leagueId?)')
  })

  it('connectLeague passes league_id when saving identity', () => {
    expect(afdpSrc).toContain('saveMyTeamOwnerId(myOid,lg.league_id)')
  })

  it('Sleeper league without roster_positions clears stored positions', () => {
    // When lg.roster_positions is falsy, positions should be cleared
    expect(afdpSrc).toContain('}else{setLeagueRosterPositions(null);try{localStorage.removeItem(')
  })
})

// ══════════════════════════════════════════════════════════════════
// 20. FORMAT SETTINGS — provider vs FDP context
// ══════════════════════════════════════════════════════════════════

describe('league intel: format settings honesty', () => {
  it('Sleeper auto-syncs scoring format from league settings', () => {
    expect(afdpSrc).toContain('lg.scoring_settings&&lg.scoring_settings.rec!=null?lg.scoring_settings.rec:null')
    expect(afdpSrc).toContain('if(rec===1)setFormat("PPR")')
    expect(afdpSrc).toContain('if(rec===0.5)setFormat("Half")')
    expect(afdpSrc).toContain('if(rec===0)setFormat("Standard")')
  })

  it('Sleeper auto-syncs superflex from roster_positions', () => {
    expect(afdpSrc).toContain('lg.roster_positions.indexOf("SUPER_FLEX")!==-1')
    expect(afdpSrc).toContain('setSfMode(true)')
  })

  it('Sleeper auto-syncs IDP from roster_positions', () => {
    expect(afdpSrc).toContain('lg.roster_positions.indexOf("IDP_FLEX")!==-1||lg.roster_positions.indexOf("DL")!==-1')
    expect(afdpSrc).toContain('setIdpMode(true)')
  })

  it('Sleeper auto-syncs dynasty type from league settings', () => {
    expect(afdpSrc).toContain('lg.settings.type===2||lg.settings.type==="2"')
    expect(afdpSrc).toContain('setLeagueType("Dynasty")')
  })

  it('ESPN import does NOT auto-sync any format settings', () => {
    const espnBlock = afdpSrc.substring(
      afdpSrc.indexOf('function processEspnData'),
      afdpSrc.indexOf('function processEspnData') + 2000
    )
    expect(espnBlock).not.toContain('setFormat(')
    expect(espnBlock).not.toContain('setSfMode(')
    expect(espnBlock).not.toContain('setIdpMode(')
    expect(espnBlock).not.toContain('setLeagueType(')
  })

  it('overview header distinguishes provider-confirmed vs FDP context', () => {
    // Sleeper → "League Format:", ESPN/manual → "FDP Context:"
    expect(afdpSrc).toContain('isSleeper?"League Format: "')
    expect(afdpSrc).toContain('"FDP Context: "')
  })

  it('Sleeper TE Premium is labeled as FDP-selected, not provider-confirmed', () => {
    // TE Premium appears as "FDP: TE Premium" inside the Sleeper League Format string
    expect(afdpSrc).toContain('" · FDP: TE Premium"')
  })

  it('provLabel distinguishes Sleeper, ESPN, and Manual providers', () => {
    expect(afdpSrc).toContain('league_id==="manual"?"Manual"')
    expect(afdpSrc).toContain('league_id.startsWith("espn_")?"ESPN":"Sleeper"')
  })

  it('unknown format settings are never silently invented', () => {
    // No hardcoded format defaults applied during ESPN or manual import
    const espnBlock = afdpSrc.substring(
      afdpSrc.indexOf('function processEspnData'),
      afdpSrc.indexOf('function processEspnData') + 2000
    )
    const manualBlock = afdpSrc.substring(
      afdpSrc.indexOf('function doManualImport'),
      afdpSrc.indexOf('function doManualImport') + 800
    )
    expect(espnBlock).not.toContain('setSfMode(true)')
    expect(espnBlock).not.toContain('setIdpMode(true)')
    expect(manualBlock).not.toContain('setSfMode(')
    expect(manualBlock).not.toContain('setIdpMode(')
  })
})

// ══════════════════════════════════════════════════════════════════
// 21. SLOT PARSING — bench/reserve/taxi/kicker exclusion
// ══════════════════════════════════════════════════════════════════

describe('league intel: slot parsing safety', () => {
  it('only starter-relevant slots are counted in ss object', () => {
    // BN, K, DEF, TAXI, IR, etc. fall through the if/else chain and are NOT counted
    const slotParser = afdpSrc.substring(
      afdpSrc.indexOf('if(ss&&leagueRosterPositions)'),
      afdpSrc.indexOf('if(ss&&leagueRosterPositions)') + 500
    )
    expect(slotParser).toContain('if(p==="QB")ss.QB++')
    expect(slotParser).toContain('if(p==="RB")ss.RB++')
    expect(slotParser).toContain('if(p==="WR")ss.WR++')
    expect(slotParser).toContain('if(p==="TE")ss.TE++')
    expect(slotParser).toContain('if(p==="FLEX"||p==="REC_FLEX")ss.FLEX++')
    expect(slotParser).toContain('if(p==="SUPER_FLEX")ss.SUPER_FLEX++')
    // BN/K/DEF/TAXI/IR are not mentioned → correctly excluded
    expect(slotParser).not.toContain('"BN"')
    expect(slotParser).not.toContain('"K"')
    expect(slotParser).not.toContain('"DEF"')
  })

  it('repeated slots are counted by increment not collapsed', () => {
    // ss.RB++ runs for each "RB" in roster_positions array — forEach handles duplicates
    expect(afdpSrc).toContain('leagueRosterPositions.forEach(function(p){if(p==="QB")ss.QB++')
  })

  it('totalStarters does not include IDP slots', () => {
    expect(afdpSrc).toContain('totalStarters=ss?ss.QB+ss.RB+ss.WR+ss.TE+ss.FLEX+ss.SUPER_FLEX:null')
  })

  it('REC_FLEX is treated as FLEX', () => {
    expect(afdpSrc).toContain('if(p==="FLEX"||p==="REC_FLEX")ss.FLEX++')
  })

  it('computeOptimalLineup receives only offensive positions', () => {
    // team.players are filtered to QB/RB/WR/TE before calling computeOptimalLineup
    expect(afdpSrc).toContain('(team.players||[]).filter(function(p){return ["QB","RB","WR","TE"].indexOf(p.pos)>=0;})')
  })
})

// ══════════════════════════════════════════════════════════════════
// 22. IDP SLOT ELIGIBILITY
// ══════════════════════════════════════════════════════════════════

describe('league intel: IDP position mapping', () => {
  it('Sleeper maps granular IDP positions to generalized FDP positions', () => {
    expect(afdpSrc).toContain('if(p==="DE"||p==="DT"||p==="EDGE"||p==="NT")return "DL"')
    expect(afdpSrc).toContain('if(p==="LB"||p==="ILB"||p==="OLB"||p==="MLB")return "LB"')
    expect(afdpSrc).toContain('if(p==="CB"||p==="S"||p==="FS"||p==="SS"||p==="DB")return "DB"')
  })

  it('FDP PLAYERS array uses generalized IDP positions (DL/LB/DB)', () => {
    // Players in PLAYERS array use mapped positions matching slot names
    expect(afdpSrc).toContain('"Myles Garrett",pos:"DL"')
    expect(afdpSrc).toContain('"Roquan Smith",pos:"LB"')
  })

  it('IDP slots in computeOptimalLineup are parsed but not used for offensive lineup', () => {
    // computeOptimalLineup only processes QB/RB/WR/TE/FLEX/SUPER_FLEX
    // IDP_FLEX/DL/LB/DB are parsed into ss but not filled in computeOptimalLineup
    const lineup = afdpSrc.substring(
      afdpSrc.indexOf('function computeOptimalLineup'),
      afdpSrc.indexOf('function computeOptimalLineup') + 800
    )
    expect(lineup).toContain('fillSlot("QB",ss.QB)')
    expect(lineup).toContain('fillSlot("RB",ss.RB)')
    expect(lineup).toContain('fillSlot("WR",ss.WR)')
    expect(lineup).toContain('fillSlot("TE",ss.TE)')
    expect(lineup).not.toContain('fillSlot("DL"')
    expect(lineup).not.toContain('fillSlot("LB"')
    expect(lineup).not.toContain('fillSlot("DB"')
    expect(lineup).not.toContain('fillSlot("IDP_FLEX"')
  })
})

// ══════════════════════════════════════════════════════════════════
// 22b. IDP BENCH/STARTER HONESTY
// ══════════════════════════════════════════════════════════════════

describe('league intel: IDP lineup/bench honesty', () => {
  it('IDP leagues label optimal lineup as offensive-only', () => {
    expect(afdpSrc).toContain('idpMode?"Off. Optimal Lineup":"Optimal Lineup"')
  })

  it('IDP leagues suppress misleading bench card in overview', () => {
    // Bench is suppressed for IDP because it excludes IDP starters
    expect(afdpSrc).toContain('idpMode?[]:[["Bench"')
  })

  it('IDP leagues suppress bench depth Action Center item', () => {
    expect(afdpSrc).toContain('!idpMode&&leagueIntel.hasSlotData&&myData.benchVal!=null')
  })
})

// ══════════════════════════════════════════════════════════════════
// 23. SLEEPER r.starters NOT MISUSED
// ══════════════════════════════════════════════════════════════════

describe('league intel: optimal lineup labeling consistency', () => {
  it('no UI labels say "Current Starters" for optimal metric', () => {
    expect(afdpSrc).not.toContain('"Current Starters"')
  })

  it('no UI labels say "Starter Value" (replaced by "Optimal Lineup")', () => {
    const overviewBlock = afdpSrc.substring(
      afdpSrc.indexOf('// LEAGUE INTELLIGENCE OVERVIEW'),
      afdpSrc.indexOf('// POWER RANKINGS')
    )
    expect(overviewBlock).not.toContain('"Starter Value"')
  })

  it('r.starters array is not referenced for lineup calculations', () => {
    // Only r.players is used — r.starters would be actual weekly starters, not used
    expect(afdpSrc).not.toContain('r.starters')
  })
})

// ══════════════════════════════════════════════════════════════════
// 24. PRODUCT LOGIC REGRESSION — FINAL
// ══════════════════════════════════════════════════════════════════

describe('league intel: final product logic regression', () => {
  it('canonical FDP values unchanged (spot check)', () => {
    const opts = { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false }
    const players = parsePlayers()
    const lookup = new Map(players.map((p: any) => [p.name, p]))

    const expected: Record<string, number> = {
      'Bijan Robinson': 9999,
      "Ja'Marr Chase": 9980,
      'Josh Allen': 9100,
      'Brock Bowers': 8350,
    }
    for (const [name, ktc] of Object.entries(expected)) {
      const p = lookup.get(name)
      expect(p).toBeDefined()
      expect(p!.ktcVal).toBe(ktc)
    }
  })

  it('trade analyzer math unchanged', () => {
    expect(afdpSrc).toContain('computeDynastyTradeVal(')
    expect(afdpSrc).toContain('tierLabel(')
    expect(afdpSrc).toContain('var diff=tvA-tvB')
  })

  it('canonical rankings order unchanged', () => {
    expect(afdpSrc).toContain('playerSlug(')
  })

  it('power-ranking sort methodology unchanged', () => {
    expect(afdpSrc).toContain('teams.sort(function(a,b){return b.totalVal-a.totalVal;})')
  })
})

// ══════════════════════════════════════════════════════════════════
// 25. ESPN STABLE IDENTITY
// ══════════════════════════════════════════════════════════════════

describe('league intel: ESPN stable team identity', () => {
  it('ESPN fallback ownerId uses stable t.id, not array index', () => {
    expect(afdpSrc).toContain('"espn_team_"+t.id')
    expect(afdpSrc).not.toContain('"team_"+i')
  })

  it('ESPN team selector does not use array-index fallback', () => {
    const selectorBlock = afdpSrc.substring(
      afdpSrc.indexOf('Select your team to see personalized intelligence'),
      afdpSrc.indexOf('Select your team to see personalized intelligence') + 600
    )
    expect(selectorBlock).not.toContain('"team_"+i')
    expect(selectorBlock).toContain('value:t.ownerId')
  })

  it('ESPN ownerId prefers primaryOwner when available', () => {
    expect(afdpSrc).toContain('var ownerId=t.primaryOwner||(t.owners&&t.owners[0])||""')
  })

  it('manual import teams have stable ownerId', () => {
    expect(afdpSrc).toContain('t.ownerId="manual_"+(i+1)')
  })

  it('duplicate ESPN team names do not affect identity (matched by ownerId)', () => {
    // myTeamIdx uses ownerId matching, not name matching
    expect(afdpSrc).toContain('t.ownerId===myTeamOwnerId')
    expect(afdpSrc).not.toContain('t.name===myTeamOwnerId')
  })
})

// ══════════════════════════════════════════════════════════════════
// 26. MISSING AGE SAFETY
// ══════════════════════════════════════════════════════════════════

describe('league intel: missing age handling', () => {
  it('missing age is excluded from average (not defaulted to 25)', () => {
    expect(afdpSrc).toContain('if(p.age&&p.age>0){ageSum+=p.age;ageCt++;}')
    expect(afdpSrc).not.toContain('var avgAge=ageCt>0?ageSum/ageCt:25')
  })

  it('all-unknown ages produce null average, not 25', () => {
    expect(afdpSrc).toContain('var avgAge=ageCt>0?ageSum/ageCt:null')
  })

  it('prime-window counts use only players with valid age', () => {
    expect(afdpSrc).toContain('var agedPlrs=plrs.filter(function(p){return p.age&&p.age>0;})')
    expect(afdpSrc).toContain('agedPlrs.filter(function(p){return p.age<')
  })

  it('no literal (p.age||25) fallback in leagueIntel age logic', () => {
    const intelBlock = afdpSrc.substring(
      afdpSrc.indexOf('// ── LEAGUE INTELLIGENCE ENGINE ──'),
      afdpSrc.indexOf('},[powerRankingTeams,leagueRosterPositions])')
    )
    expect(intelBlock).not.toContain('p.age||25')
  })

  it('overview displays "—" when avgAge is null', () => {
    expect(afdpSrc).toContain('myData.avgAge!=null?myData.avgAge.toFixed(1):"—"')
  })

  it('age-based Action Center items require sufficient age data', () => {
    expect(afdpSrc).toContain('var hasAgeData=(myData.youngCt+myData.primeCt+myData.postCt)>=Math.ceil(myData.playerCount*0.5)')
    expect(afdpSrc).toContain('hasAgeData&&myData.postCt>=3')
    expect(afdpSrc).toContain('hasAgeData&&myData.youngCt>=')
  })

  it('advice tab agingRisk excludes unknown-age players', () => {
    expect(afdpSrc).toContain('p.age&&p.age>0&&p.age>(PRIME[p.pos]')
  })
})

// ══════════════════════════════════════════════════════════════════
// 27. IDP ROSTER GRADE INTEGRITY
// ══════════════════════════════════════════════════════════════════

describe('league intel: IDP roster grade', () => {
  it('IDP grade uses offensive value only (not inflated by IDP assets)', () => {
    expect(afdpSrc).toContain('idpMode?myData.offensiveVal:myData.totalVal')
  })

  it('offensiveVal is computed from QB/RB/WR/TE only', () => {
    expect(afdpSrc).toContain('var offVal=plrs.reduce(function(s,p){return s+(p.tradeVal||0);},0)')
    // plrs is filtered to QB/RB/WR/TE earlier in the same block
    expect(afdpSrc).toContain('(team.players||[]).filter(function(p){return ["QB","RB","WR","TE"].indexOf(p.pos)>=0;})')
  })

  it('grade thresholds are unchanged', () => {
    expect(afdpSrc).toContain('gradeVal>=120000?"A+":gradeVal>=100000?"A":gradeVal>=85000?"A-"')
  })

  it('total roster value still includes IDP assets for display', () => {
    // totalVal from powerRankingTeams includes all players — used for Total Value card
    expect(afdpSrc).toContain('["Total Value",myData.totalVal,T.purpleLight]')
  })

  it('grade basis is documented in code comment', () => {
    expect(afdpSrc).toContain('Roster grade uses offensive value only')
  })
})
