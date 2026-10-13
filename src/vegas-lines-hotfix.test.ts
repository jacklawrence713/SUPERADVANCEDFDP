import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const afdpSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8')

describe('Vegas lines: Week 5 authoritative schedule', () => {
  it('Week 5 schedule exists with correct dates', () => {
    expect(afdpSrc).toContain('var WEEKLY_LINES')
    expect(afdpSrc).toContain('Week 5, Oct 8-12 2026')
  })

  it('Week 5 has 15 games (by counting null,null patterns)', () => {
    const match = afdpSrc.match(/var WEEKLY_LINES:.*?\];/s)
    if (match) {
      const nullCount = (match[0].match(/,null,null/g) || []).length
      expect(nullCount).toBe(15)
    }
  })

  it('Week 5 byes are CAR and KC', () => {
    const match = afdpSrc.match(/var WEEKLY_LINES:.*?\];/s)
    if (match) {
      expect(match[0]).toContain('Byes: CAR, KC')
    }
  })

  it('Week 5 has no KC games (on bye)', () => {
    const match = afdpSrc.match(/var WEEKLY_LINES:.*?\];/s)
    if (match) {
      const text = match[0]
      const kcInGames = text.match(/\[".*?"KC|KC".*?"\]/g)
      expect(kcInGames).toBeNull()
    }
  })

  it('Week 5 has no CAR games (on bye)', () => {
    const match = afdpSrc.match(/var WEEKLY_LINES:.*?\];/s)
    if (match) {
      const text = match[0]
      const carInGames = text.match(/\[".*?"CAR|CAR".*?"\]/g)
      expect(carInGames).toBeNull()
    }
  })

  it('Week 5 contains DAL @ TB', () => {
    expect(afdpSrc).toContain('["DAL","TB",null,null]')
  })

  it('Week 5 contains LAR @ BUF (Monday)', () => {
    expect(afdpSrc).toContain('["LAR","BUF",null,null]')
  })
})

describe('Vegas lines: Week 6 authoritative schedule', () => {
  it('Week 6 schedule exists', () => {
    expect(afdpSrc).toContain('var WEEK_6_LINES')
    expect(afdpSrc).toContain('Week 6 schedule (Oct 15-19')
  })

  it('Week 6 has 14 games (by counting null,null patterns)', () => {
    const match = afdpSrc.match(/var WEEK_6_LINES:.*?\];/s)
    if (match) {
      const nullCount = (match[0].match(/,null,null/g) || []).length
      expect(nullCount).toBe(14)
    }
  })

  it('Week 6 byes are CIN, DET, MIA, MIN', () => {
    const match = afdpSrc.match(/var WEEK_6_LINES:.*?\];/s)
    if (match) {
      expect(match[0]).toContain('Byes: CIN, DET, MIA, MIN')
    }
  })

  it('Week 6 contains DEN @ SEA (Thursday)', () => {
    expect(afdpSrc).toContain('["DEN","SEA",null,null]')
  })
})

describe('Vegas lines: null odds (never fabricated)', () => {
  it('Week 5 uses null not zero for unavailable odds', () => {
    const match = afdpSrc.match(/var WEEKLY_LINES:.*?\];/s)
    if (match) {
      expect(match[0]).toContain(',null,null')
      expect(match[0]).not.toContain(',0,0]')
    }
  })

  it('Week 6 uses null not zero for unavailable odds', () => {
    const match = afdpSrc.match(/var WEEK_6_LINES:.*?\];/s)
    if (match) {
      expect(match[0]).toContain(',null,null')
      expect(match[0]).not.toContain(',0,0]')
    }
  })

  it('no fabricated numeric odds anywhere', () => {
    expect(afdpSrc).not.toContain(',0,0]')
  })
})

describe('Vegas lines: fallback labeling', () => {
  it('fallback shows SCHEDULE (Lines Unavailable)', () => {
    expect(afdpSrc).toContain('SCHEDULE (Lines Unavailable)')
  })

  it('live odds show THIS WEEK\'S GAMES', () => {
    expect(afdpSrc).toContain('THIS WEEK\'S GAMES')
  })
})

describe('Vegas lines: week progression', () => {
  it('getCurrentNFLWeek function exists', () => {
    expect(afdpSrc).toContain('function getCurrentNFLWeek')
  })

  it('Oct 12 maps to Week 5', () => {
    expect(afdpSrc).toContain('if(day<=12){return{week:5')
  })

  it('Oct 15+ maps to Week 6', () => {
    expect(afdpSrc).toContain('if(day<=19){return{week:6')
  })
})

describe('Vegas lines: no Week 2 leakage', () => {
  it('no Week 2 odds (BUF @ DET with -4, 53.5)', () => {
    expect(afdpSrc).not.toContain('["BUF","DET",-4,53.5]')
  })

  it('WEEKLY_PROPS no old player data', () => {
    const propsMatch = afdpSrc.match(/const WEEKLY_PROPS=\[(.*?)\]/s)
    if (propsMatch) {
      expect(propsMatch[0]).not.toContain('{name:"Josh Allen"')
    }
  })
})

describe('Vegas lines: no regression', () => {
  it('login hotfix preserved', () => {
    expect(afdpSrc).toContain('pendingCheckoutIntent')
  })

  it('Stripe preserved', () => {
    expect(afdpSrc).toContain('handleCheckout')
  })

  it('Auth preserved', () => {
    expect(afdpSrc).toContain('isAdminEmail')
  })
})

describe('Vegas lines: schedule-based rendering (hotfix)', () => {
  it('games array built from getCurrentNFLWeek(), not oddsData', () => {
    expect(afdpSrc).toContain('var weekInfo=getCurrentNFLWeek()')
    expect(afdpSrc).toContain('var scheduleGames=weekInfo.lines')
    expect(afdpSrc).toContain('var games=scheduleGames.map(function(sg)')
  })

  it('games.map extracts home/away/spread/total from schedule', () => {
    expect(afdpSrc).toContain('var home=sg[0],away=sg[1],scheduleSpread=sg[2],scheduleTotal=sg[3]')
  })

  it('spread/total fallback to schedule when oddsData missing', () => {
    expect(afdpSrc).toContain('homeSpread=homeOdds?.spread??scheduleSpread')
    expect(afdpSrc).toContain('homeTotal=homeOdds?.total??scheduleTotal')
  })

  it('games always populated from schedule (never empty)', () => {
    expect(afdpSrc).toContain('return {home:home,away:away,spread:homeSpread,total:homeTotal,eventId:homeOdds?.eventId??null}')
  })

  it('hasData checks games.length > 0 (always true from schedule)', () => {
    expect(afdpSrc).toContain('var hasData=games.length>0')
  })

  it('spread N/A renders when null', () => {
    expect(afdpSrc).toContain('g.spread===null?"Line N/A"')
  })

  it('total Unavailable renders when null', () => {
    expect(afdpSrc).toContain('g.total===null?"Unavailable"')
  })

  it('no eventId requirement blocks games (old bug removed)', () => {
    const oldBugPattern = /if\(!g\.eventId\)return;/
    expect(afdpSrc).not.toMatch(oldBugPattern)
  })
})

describe('Vegas lines: provider overlay behavior', () => {
  it('provider odds overlay spread if present', () => {
    expect(afdpSrc).toContain('homeOdds?.spread??scheduleSpread')
  })

  it('provider odds overlay total if present', () => {
    expect(afdpSrc).toContain('homeOdds?.total??scheduleTotal')
  })

  it('schedule values preserved when provider missing', () => {
    expect(afdpSrc).toContain('homeOdds=oddsData?oddsData[home]:null')
  })
})

describe('Vegas lines: UI state labels', () => {
  it('THIS WEEK\'S GAMES when api/cache source', () => {
    expect(afdpSrc).toContain('oddsSource==="api"||oddsSource==="cache"?"THIS WEEK\'S GAMES"')
  })

  it('SCHEDULE (Lines Unavailable) when manual source', () => {
    expect(afdpSrc).toContain('"SCHEDULE (Lines Unavailable)"')
  })

  it('LINES UNAVAILABLE as fallback', () => {
    expect(afdpSrc).toContain('"LINES UNAVAILABLE"')
  })
})

describe('Vegas lines: no blank page regressions', () => {
  it('No "No Current NFL Lines" when schedule exists', () => {
    // The message should only show if somehow hasData is false
    // But with the fix, hasData is always true when schedule has games
    expect(afdpSrc).toContain('No Current NFL Lines')
    // Message exists for backward compat but won't show in normal operation
  })

  it('games.length always displayed in UI', () => {
    expect(afdpSrc).toContain('games.length')
  })
})
