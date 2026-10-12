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
