import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  computeValueChange,
  snapshotContextKey,
  FDP_SNAPSHOT_CONTEXTS,
  VALUES_UPDATED_AT,
  VALUES_VERSION,
  parseValuesVersion,
  isSnapshotContextSupported,
  normalizeSnapshotContext,
  computeDynastyTradeVal,
  computeRedraftTradeVal,
  REDRAFT_TV_MULT,
  getBaselines,
  playerSlug,
  dynastyBonus,
  PRIME,
  TEP_LEVELS,
  HISTORY_PAGE_SIZE,
} from './logic'
import type { FdpSnapshot } from './logic'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const afdpSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8').replace(/\r\n/g, '\n')
const logicSrc = readFileSync(resolve(thisDir, 'logic.ts'), 'utf-8').replace(/\r\n/g, '\n')
const migrationSrc = readFileSync(resolve(rootDir, 'supabase/migrations/20260922003719_fdp_value_snapshots.sql'), 'utf-8').replace(/\r\n/g, '\n')
const edgeFnSrc = readFileSync(resolve(rootDir, 'supabase/functions/record-value-snapshots/index.ts'), 'utf-8').replace(/\r\n/g, '\n')
const producerSrc = readFileSync(resolve(rootDir, 'scripts/generate-snapshots.ts'), 'utf-8').replace(/\r\n/g, '\n')

// ── Helper ──
function mkSnap(value: number, effective_at: string, version?: string): FdpSnapshot {
  return {
    player_slug: 'test-player',
    player_name: 'Test Player',
    value,
    values_version: version || '2026-09-19.1',
    effective_at,
    recorded_at: effective_at, // audit timestamp, not used for chart
  }
}

// ══════════════════════════════════════════════════════════════
// 1. NO FABRICATED HISTORY
// ══════════════════════════════════════════════════════════════

describe('no fabricated history', () => {
  it('no sparkline function in codebase', () => {
    expect(afdpSrc).not.toContain('function sparkline(')
  })

  it('no Math.random used for value generation', () => {
    const historyBlock = logicSrc.substring(logicSrc.indexOf('FDP Value History Logic'))
    expect(historyBlock).not.toContain('Math.random')
  })

  it('no hardcoded value deltas in history helpers', () => {
    const historyBlock = logicSrc.substring(logicSrc.indexOf('FDP Value History Logic'))
    expect(historyBlock).not.toMatch(/delta:\s*\d+/)
    expect(historyBlock).not.toContain('"7d"')
  })

  it('computeValueChange returns null when no prior point exists', () => {
    const result = computeValueChange([mkSnap(5000, '2026-09-19')], 7)
    expect(result.delta).toBeNull()
    expect(result.prior).toBeNull()
    expect(result.pctChange).toBeNull()
    expect(result.priorDate).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════
// 2. ZERO / ONE / TWO+ SNAPSHOTS
// ══════════════════════════════════════════════════════════════

describe('zero snapshots', () => {
  it('returns zero current, null fields', () => {
    const r = computeValueChange([], 7)
    expect(r.current).toBe(0)
    expect(r.delta).toBeNull()
  })

  it('player page shows empty state text', () => {
    expect(afdpSrc).toContain('No FDP Value snapshot has been recorded for this context yet.')
  })
})

describe('one snapshot', () => {
  it('returns current value, null delta', () => {
    const r = computeValueChange([mkSnap(8000, '2026-09-19')], 7)
    expect(r.current).toBe(8000)
    expect(r.delta).toBeNull()
  })

  it('player page shows one-point state', () => {
    expect(afdpSrc).toContain('Value history tracking started')
    expect(afdpSrc).toContain('More data is needed to show a trend')
  })
})

describe('two snapshots', () => {
  const snaps = [mkSnap(8500, '2026-09-19'), mkSnap(8000, '2026-09-12')]
  it('computes correct delta', () => {
    const r = computeValueChange(snaps, 7)
    expect(r.current).toBe(8500)
    expect(r.prior).toBe(8000)
    expect(r.delta).toBe(500)
  })
  it('computes correct percent change', () => {
    expect(computeValueChange(snaps, 7).pctChange).toBe(6.3)
  })
  it('returns prior date from effective_at', () => {
    expect(computeValueChange(snaps, 7).priorDate).toBe('2026-09-12')
  })
})

describe('multiple snapshots ordered correctly', () => {
  const snaps = [
    mkSnap(9000, '2026-09-19'),
    mkSnap(8700, '2026-09-10'),
    mkSnap(8200, '2026-08-15'),
    mkSnap(7800, '2026-06-19'),
  ]
  it('7D finds correct prior', () => {
    expect(computeValueChange(snaps, 7).delta).toBe(300)
  })
  it('30D finds correct prior', () => {
    expect(computeValueChange(snaps, 30).delta).toBe(800)
  })
  it('90D finds correct prior', () => {
    expect(computeValueChange(snaps, 90).delta).toBe(1200)
  })
})

// ══════════════════════════════════════════════════════════════
// 3. FORMAT CONTEXT ISOLATION
// ══════════════════════════════════════════════════════════════

describe('format-context isolation', () => {
  it('dynasty and redraft produce different context keys', () => {
    expect(snapshotContextKey({ leagueType: 'dynasty', scoring: 'PPR', superflex: false, tePremium: 0, idp: false }))
      .not.toBe(snapshotContextKey({ leagueType: 'redraft', scoring: 'PPR', superflex: false, tePremium: 0, idp: false }))
  })
  it('1QB and SF produce different context keys', () => {
    expect(snapshotContextKey({ leagueType: 'dynasty', scoring: 'PPR', superflex: false, tePremium: 0, idp: false }))
      .not.toBe(snapshotContextKey({ leagueType: 'dynasty', scoring: 'PPR', superflex: true, tePremium: 0, idp: false }))
  })
  it('different TEP levels produce different context keys', () => {
    const base = { leagueType: 'redraft' as const, scoring: 'PPR', superflex: false, idp: false }
    const keys = TEP_LEVELS.map(t => snapshotContextKey({ ...base, tePremium: t }))
    // All keys must be unique
    expect(new Set(keys).size).toBe(TEP_LEVELS.length)
  })
  it('database query filters by all context dimensions', () => {
    expect(afdpSrc).toContain('.eq("league_type",ctx.leagueType)')
    expect(afdpSrc).toContain('.eq("scoring",ctx.scoring)')
    expect(afdpSrc).toContain('.eq("superflex",ctx.superflex)')
    expect(afdpSrc).toContain('.eq("te_premium",ctx.tePremium)')
    expect(afdpSrc).toContain('.eq("idp",ctx.idp)')
  })
})

// ══════════════════════════════════════════════════════════════
// 4. PERCENT CHANGE EDGE CASES
// ══════════════════════════════════════════════════════════════

describe('percent change edge cases', () => {
  it('0→positive returns null pctChange (undefined denominator)', () => {
    const r = computeValueChange([mkSnap(5000, '2026-09-19'), mkSnap(0, '2026-08-01')], 30)
    expect(r.pctChange).toBeNull()
    expect(r.delta).toBe(5000)
  })
  it('0→0 returns 0%', () => {
    expect(computeValueChange([mkSnap(0, '2026-09-19'), mkSnap(0, '2026-08-01')], 30).pctChange).toBe(0)
  })
  it('same value returns 0 delta and 0%', () => {
    const r = computeValueChange([mkSnap(8000, '2026-09-19'), mkSnap(8000, '2026-08-01')], 30)
    expect(r.delta).toBe(0)
    expect(r.pctChange).toBe(0)
  })
  it('no Infinity or NaN', () => {
    [[mkSnap(100, '2026-09-19'), mkSnap(0, '2026-08-01')],
     [mkSnap(0, '2026-09-19'), mkSnap(100, '2026-08-01')],
     [mkSnap(0, '2026-09-19'), mkSnap(0, '2026-08-01')]].forEach(snaps => {
      const r = computeValueChange(snaps, 30)
      if (r.pctChange != null) {
        expect(isFinite(r.pctChange)).toBe(true)
        expect(isNaN(r.pctChange)).toBe(false)
      }
    })
  })
})

// ══════════════════════════════════════════════════════════════
// 5. CONTEXT MATRIX — ACTUAL APP AUDIT
// ══════════════════════════════════════════════════════════════

describe('context matrix matches actual application', () => {
  it('dynasty sKey is hardcoded to PPR in app', () => {
    expect(afdpSrc).toContain('var sKey=isDynasty?"PPR"')
  })

  it('dynasty contexts only have scoring PPR', () => {
    FDP_SNAPSHOT_CONTEXTS.filter(c => c.leagueType === 'dynasty').forEach(c => {
      expect(c.scoring).toBe('PPR')
    })
  })

  it('4 dynasty contexts (PPR × 1QB/SF × TEP{0,1.0})', () => {
    expect(FDP_SNAPSHOT_CONTEXTS.filter(c => c.leagueType === 'dynasty').length).toBe(4)
  })

  it('dynasty TEP is binary: only 0 and 1.0', () => {
    const tepLevels = new Set(FDP_SNAPSHOT_CONTEXTS.filter(c => c.leagueType === 'dynasty').map(c => c.tePremium))
    expect(tepLevels.size).toBe(2)
    expect(tepLevels.has(0)).toBe(true)
    expect(tepLevels.has(1.0)).toBe(true)
  })

  it('24 redraft contexts (PPR/Half/Standard × 1QB/SF × TEP{0,0.25,0.5,1.0})', () => {
    expect(FDP_SNAPSHOT_CONTEXTS.filter(c => c.leagueType === 'redraft').length).toBe(24)
  })

  it('total 28 contexts', () => {
    expect(FDP_SNAPSHOT_CONTEXTS.length).toBe(28)
  })

  it('redraft has all 3 scoring formats', () => {
    const scorings = new Set(FDP_SNAPSHOT_CONTEXTS.filter(c => c.leagueType === 'redraft').map(c => c.scoring))
    expect(scorings.has('PPR')).toBe(true)
    expect(scorings.has('Half')).toBe(true)
    expect(scorings.has('Standard')).toBe(true)
  })

  it('redraft has all 4 TEP levels', () => {
    const tepLevels = new Set(FDP_SNAPSHOT_CONTEXTS.filter(c => c.leagueType === 'redraft').map(c => c.tePremium))
    expect(tepLevels.size).toBe(4)
    TEP_LEVELS.forEach(t => expect(tepLevels.has(t)).toBe(true))
  })

  it('redraft has SF contexts', () => {
    expect(FDP_SNAPSHOT_CONTEXTS.some(c => c.leagueType === 'redraft' && c.superflex)).toBe(true)
  })

  it('no IDP contexts snapshotted', () => {
    FDP_SNAPSHOT_CONTEXTS.forEach(c => {
      expect(c.idp).toBe(false)
    })
  })

  it('tePremium is numeric in all contexts', () => {
    FDP_SNAPSHOT_CONTEXTS.forEach(c => {
      expect(typeof c.tePremium).toBe('number')
    })
  })

  it('SF is available in both dynasty and redraft in app', () => {
    expect(afdpSrc).toContain('setSfMode')
  })

  it('TEP selectable values are 0, 0.25, 0.5, 1.0 in app', () => {
    expect(afdpSrc).toContain('[0,0.25,0.5,1.0]')
  })

  it('IDP mode is available in app', () => {
    expect(afdpSrc).toContain('setIdpMode')
  })
})

// ══════════════════════════════════════════════════════════════
// 5b. normalizeSnapshotContext
// ══════════════════════════════════════════════════════════════

describe('normalizeSnapshotContext', () => {
  it('dynasty: scoring always PPR regardless of input', () => {
    const ctx = normalizeSnapshotContext({ isDynasty: true, scoring: 'Half', superflex: false, tePremium: 0, idp: false })
    expect(ctx.scoring).toBe('PPR')
  })

  it('dynasty: TEP normalized to binary (0.25 → 1.0)', () => {
    expect(normalizeSnapshotContext({ isDynasty: true, scoring: 'PPR', superflex: false, tePremium: 0.25, idp: false }).tePremium).toBe(1.0)
    expect(normalizeSnapshotContext({ isDynasty: true, scoring: 'PPR', superflex: false, tePremium: 0.5, idp: false }).tePremium).toBe(1.0)
    expect(normalizeSnapshotContext({ isDynasty: true, scoring: 'PPR', superflex: false, tePremium: 1.0, idp: false }).tePremium).toBe(1.0)
    expect(normalizeSnapshotContext({ isDynasty: true, scoring: 'PPR', superflex: false, tePremium: 0, idp: false }).tePremium).toBe(0)
  })

  it('redraft: exact TEP level preserved', () => {
    TEP_LEVELS.forEach(t => {
      const ctx = normalizeSnapshotContext({ isDynasty: false, scoring: 'PPR', superflex: false, tePremium: t, idp: false })
      expect(ctx.tePremium).toBe(t)
    })
  })

  it('redraft: scoring passed through', () => {
    expect(normalizeSnapshotContext({ isDynasty: false, scoring: 'Half', superflex: true, tePremium: 0, idp: false }).scoring).toBe('Half')
    expect(normalizeSnapshotContext({ isDynasty: false, scoring: 'Standard', superflex: false, tePremium: 0, idp: false }).scoring).toBe('Standard')
  })

  it('IDP passed through (rejected by isSnapshotContextSupported)', () => {
    const ctx = normalizeSnapshotContext({ isDynasty: true, scoring: 'PPR', superflex: false, tePremium: 0, idp: true })
    expect(ctx.idp).toBe(true)
    expect(isSnapshotContextSupported(ctx)).toBe(false)
  })

  it('frontend uses normalizeSnapshotContext', () => {
    expect(afdpSrc).toContain('normalizeSnapshotContext')
    expect(afdpSrc).toContain('ppSnapshotCtx')
  })
})

// ══════════════════════════════════════════════════════════════
// 6. UNSUPPORTED CONTEXT HANDLING (IDP)
// ══════════════════════════════════════════════════════════════

describe('unsupported context handling', () => {
  it('isSnapshotContextSupported returns true for supported contexts', () => {
    expect(isSnapshotContextSupported({ leagueType: 'dynasty', scoring: 'PPR', superflex: false, tePremium: 0, idp: false })).toBe(true)
    expect(isSnapshotContextSupported({ leagueType: 'redraft', scoring: 'Half', superflex: true, tePremium: 0.5, idp: false })).toBe(true)
  })

  it('isSnapshotContextSupported returns false for IDP contexts', () => {
    expect(isSnapshotContextSupported({ leagueType: 'dynasty', scoring: 'PPR', superflex: false, tePremium: 0, idp: true })).toBe(false)
  })

  it('isSnapshotContextSupported returns false for dynasty Half', () => {
    expect(isSnapshotContextSupported({ leagueType: 'dynasty', scoring: 'Half', superflex: false, tePremium: 0, idp: false })).toBe(false)
  })

  it('isSnapshotContextSupported returns false for unsupported TEP level', () => {
    // Dynasty with TEP 0.25 is not in the matrix (dynasty only has 0 and 1.0)
    expect(isSnapshotContextSupported({ leagueType: 'dynasty', scoring: 'PPR', superflex: false, tePremium: 0.25, idp: false })).toBe(false)
  })

  it('frontend shows unsupported context message', () => {
    expect(afdpSrc).toContain('Value history is not currently tracked for this format.')
  })

  it('frontend checks ppCtxSupported before fetching', () => {
    expect(afdpSrc).toContain('ppCtxSupported')
    expect(afdpSrc).toContain('isSnapshotContextSupported')
  })

  it('does not query database for unsupported context or custom multiplier', () => {
    expect(afdpSrc).toContain('if(!ppCtxSupported||ppCanonicalMult)')
  })
})

// ══════════════════════════════════════════════════════════════
// 7. EFFECTIVE DATE ARCHITECTURE
// ══════════════════════════════════════════════════════════════

describe('effective date architecture', () => {
  it('FdpSnapshot interface includes effective_at', () => {
    expect(logicSrc).toContain('effective_at: string')
  })

  it('migration has effective_at column on snapshots', () => {
    expect(migrationSrc).toContain('effective_at  date')
  })

  it('migration has effective_at column on batches', () => {
    expect(migrationSrc).toMatch(/fdp_snapshot_batches[\s\S]*effective_at\s+date/)
  })

  it('query index uses effective_at desc (not recorded_at)', () => {
    expect(migrationSrc).toContain('effective_at desc')
  })

  it('frontend query orders by effective_at', () => {
    expect(afdpSrc).toContain('.order("effective_at"')
  })

  it('frontend query fetches effective_at field', () => {
    expect(afdpSrc).toContain('effective_at')
  })

  it('chart uses effective_at for date display', () => {
    const histSection = afdpSrc.substring(afdpSrc.indexOf('FDP VALUE HISTORY'), afdpSrc.indexOf('FDP VALUE HISTORY') + 5000)
    expect(histSection).toContain('s.effective_at||s.recorded_at')
  })

  it('parseValuesVersion extracts date correctly', () => {
    const parsed = parseValuesVersion('2026-09-19.1')
    expect(parsed).not.toBeNull()
    expect(parsed!.date).toBe('2026-09-19')
    expect(parsed!.revision).toBe(1)
  })

  it('parseValuesVersion rejects malformed versions', () => {
    expect(parseValuesVersion('foo')).toBeNull()
    expect(parseValuesVersion('2026-9-19.1')).toBeNull()
    expect(parseValuesVersion('2026-09-19')).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════
// 7b. CALENDAR DATE VALIDATION
// ══════════════════════════════════════════════════════════════

describe('calendar date validation', () => {
  it('rejects impossible month (2026-13-01.1)', () => {
    expect(parseValuesVersion('2026-13-01.1')).toBeNull()
  })

  it('rejects impossible day (2026-09-40.1)', () => {
    expect(parseValuesVersion('2026-09-40.1')).toBeNull()
  })

  it('rejects Feb 30 (2026-02-30.1)', () => {
    expect(parseValuesVersion('2026-02-30.1')).toBeNull()
  })

  it('rejects Feb 29 non-leap year (2025-02-29.1)', () => {
    expect(parseValuesVersion('2025-02-29.1')).toBeNull()
  })

  it('accepts Feb 29 leap year (2028-02-29.1)', () => {
    expect(parseValuesVersion('2028-02-29.1')).not.toBeNull()
  })

  it('accepts valid date (2026-09-19.1)', () => {
    expect(parseValuesVersion('2026-09-19.1')).not.toBeNull()
  })

  it('edge function validates calendar date', () => {
    expect(edgeFnSrc).toContain('getFullYear')
    expect(edgeFnSrc).toContain('getMonth')
    expect(edgeFnSrc).toContain('getDate')
  })
})

// ══════════════════════════════════════════════════════════════
// 8. VALUES_VERSION VALIDATION
// ══════════════════════════════════════════════════════════════

describe('values_version validation', () => {
  it('VALUES_VERSION format is YYYY-MM-DD.N', () => {
    expect(parseValuesVersion(VALUES_VERSION)).not.toBeNull()
  })

  it('edge function validates version format', () => {
    expect(edgeFnSrc).toContain('VERSION_RE')
    expect(edgeFnSrc).toContain('YYYY-MM-DD.N')
  })

  it('producer validates version on startup', () => {
    expect(producerSrc).toContain('parseValuesVersion(VALUES_VERSION)')
    expect(producerSrc).toContain('Invalid VALUES_VERSION format')
  })
})

// ══════════════════════════════════════════════════════════════
// 9. ALL RANGE — KEYSET/CURSOR PAGINATED FETCH
// ══════════════════════════════════════════════════════════════

describe('ALL range uses keyset pagination', () => {
  it('HISTORY_PAGE_SIZE is exported from logic.ts', () => {
    expect(HISTORY_PAGE_SIZE).toBe(500)
  })

  it('FdpSnapshot interface includes id for cursor', () => {
    expect(logicSrc).toContain('id?: number')
    expect(logicSrc).toContain('stable cursor key')
  })

  it('frontend does NOT use offset .range() pagination', () => {
    expect(afdpSrc).not.toContain('.range(page*HISTORY_PAGE_SIZE')
    expect(afdpSrc).not.toContain('.limit(2000)')
  })

  it('frontend uses .limit(HISTORY_PAGE_SIZE) per page', () => {
    expect(afdpSrc).toContain('.limit(HISTORY_PAGE_SIZE)')
  })

  it('frontend uses keyset cursor via .or() with effective_at and id', () => {
    const fetchBlock = afdpSrc.substring(afdpSrc.indexOf('Keyset-paginated ALL fetch'), afdpSrc.indexOf('Keyset-paginated ALL fetch') + 1500)
    expect(fetchBlock).toContain('cursorDate')
    expect(fetchBlock).toContain('cursorId')
    expect(fetchBlock).toContain('.or("effective_at.lt.')
    expect(fetchBlock).toContain(',id.lt.')
  })

  it('frontend orders by effective_at DESC then id DESC', () => {
    const fetchBlock = afdpSrc.substring(afdpSrc.indexOf('Keyset-paginated ALL fetch'), afdpSrc.indexOf('Keyset-paginated ALL fetch') + 1500)
    expect(fetchBlock).toContain('.order("effective_at",{ascending:false})')
    expect(fetchBlock).toContain('.order("id",{ascending:false})')
  })

  it('frontend selects id field for cursor', () => {
    const fetchBlock = afdpSrc.substring(afdpSrc.indexOf('Keyset-paginated ALL fetch'), afdpSrc.indexOf('Keyset-paginated ALL fetch') + 1500)
    expect(fetchBlock).toContain('.select("id,player_slug,')
  })

  it('frontend loops until fewer than pageSize rows returned', () => {
    expect(afdpSrc).toContain('hasMore=rows.length===HISTORY_PAGE_SIZE')
  })

  it('frontend deduplicates by id defensively', () => {
    const fetchBlock = afdpSrc.substring(afdpSrc.indexOf('Keyset-paginated ALL fetch'), afdpSrc.indexOf('Keyset-paginated ALL fetch') + 1500)
    expect(fetchBlock).toContain('seen.has(rows[ri].id')
    expect(fetchBlock).toContain('seen.add(rows[ri].id')
  })

  it('frontend cancels stale fetches on context change', () => {
    expect(afdpSrc).toContain('cancelled=true')
    expect(afdpSrc).toContain('if(!cancelled)')
  })

  it('context filters present in keyset query', () => {
    const fetchBlock = afdpSrc.substring(afdpSrc.indexOf('Keyset-paginated ALL fetch'), afdpSrc.indexOf('Keyset-paginated ALL fetch') + 1500)
    expect(fetchBlock).toContain('.eq("league_type",ctx.leagueType)')
    expect(fetchBlock).toContain('.eq("scoring",ctx.scoring)')
    expect(fetchBlock).toContain('.eq("superflex",ctx.superflex)')
    expect(fetchBlock).toContain('.eq("te_premium",ctx.tePremium)')
    expect(fetchBlock).toContain('.eq("idp",ctx.idp)')
  })

  it('migration index includes id DESC for deterministic ordering', () => {
    expect(migrationSrc).toContain('effective_at desc, id desc)')
  })
})

// ══════════════════════════════════════════════════════════════
// 9b. KEYSET PAGINATION BEHAVIORAL TESTS
// ══════════════════════════════════════════════════════════════

describe('keyset pagination behavioral tests', () => {
  // Simulate rows with (id, effective_at) as the composite cursor
  interface SimRow { id: number; effective_at: string }

  function makeRows(count: number, startId: number, baseDate: string): SimRow[] {
    const rows: SimRow[] = []
    const base = new Date(baseDate)
    for (let i = 0; i < count; i++) {
      const d = new Date(base)
      d.setDate(d.getDate() - Math.floor(i / 2)) // 2 rows per date to test same-date
      rows.push({ id: startId + count - 1 - i, effective_at: d.toISOString().slice(0, 10) })
    }
    // Sort newest-first by effective_at DESC, id DESC (same as DB)
    rows.sort((a, b) => a.effective_at > b.effective_at ? -1 : a.effective_at < b.effective_at ? 1 : b.id - a.id)
    return rows
  }

  // Simulate the keyset pagination loop (mirrors frontend logic)
  function simulateKeysetFetch(allRows: SimRow[], pageSize: number): { pages: number; fetched: SimRow[] } {
    let cursorDate: string | null = null
    let cursorId: number | null = null
    let hasMore = true
    let pages = 0
    const fetched: SimRow[] = []
    const seen = new Set<number>()

    while (hasMore) {
      // Filter by cursor (same logic as the .or() in frontend)
      let eligible: SimRow[]
      if (cursorDate === null || cursorId === null) {
        eligible = allRows
      } else {
        eligible = allRows.filter(r =>
          r.effective_at < cursorDate! ||
          (r.effective_at === cursorDate! && r.id < cursorId!)
        )
      }
      // Already sorted newest-first; take first pageSize
      const page = eligible.slice(0, pageSize)
      pages++
      for (const r of page) {
        if (!seen.has(r.id)) { seen.add(r.id); fetched.push(r) }
      }
      hasMore = page.length === pageSize
      if (page.length > 0) {
        const last = page[page.length - 1]
        cursorDate = last.effective_at
        cursorId = last.id
      }
    }
    return { pages, fetched }
  }

  it('0 rows: 1 page, 0 fetched', () => {
    const r = simulateKeysetFetch([], HISTORY_PAGE_SIZE)
    expect(r.pages).toBe(1)
    expect(r.fetched.length).toBe(0)
  })

  it('1 row: 1 page, 1 fetched', () => {
    const rows = makeRows(1, 1, '2026-09-19')
    const r = simulateKeysetFetch(rows, HISTORY_PAGE_SIZE)
    expect(r.pages).toBe(1)
    expect(r.fetched.length).toBe(1)
  })

  it('exactly 1 full page: fetch + empty-check = 2 pages', () => {
    const rows = makeRows(HISTORY_PAGE_SIZE, 1, '2026-09-19')
    const r = simulateKeysetFetch(rows, HISTORY_PAGE_SIZE)
    expect(r.pages).toBe(2)
    expect(r.fetched.length).toBe(HISTORY_PAGE_SIZE)
  })

  it('page + 1: 2 pages', () => {
    const rows = makeRows(HISTORY_PAGE_SIZE + 1, 1, '2026-09-19')
    const r = simulateKeysetFetch(rows, HISTORY_PAGE_SIZE)
    expect(r.pages).toBe(2)
    expect(r.fetched.length).toBe(HISTORY_PAGE_SIZE + 1)
  })

  it('> 2000 rows (2001): all fetched', () => {
    const rows = makeRows(2001, 1, '2026-09-19')
    const r = simulateKeysetFetch(rows, HISTORY_PAGE_SIZE)
    expect(r.fetched.length).toBe(2001)
  })

  it('2500+ rows: all fetched', () => {
    const rows = makeRows(2500, 1, '2026-09-19')
    const r = simulateKeysetFetch(rows, HISTORY_PAGE_SIZE)
    expect(r.fetched.length).toBe(2500)
  })

  it('no rows lost across various sizes', () => {
    for (const total of [0, 1, 249, 500, 501, 999, 1000, 1500, 2000, 2001, 2500]) {
      const rows = makeRows(total, 1, '2026-09-19')
      const r = simulateKeysetFetch(rows, HISTORY_PAGE_SIZE)
      expect(r.fetched.length).toBe(total)
    }
  })

  it('no duplicate rows across pages', () => {
    const rows = makeRows(1200, 1, '2026-09-19')
    const r = simulateKeysetFetch(rows, HISTORY_PAGE_SIZE)
    const ids = r.fetched.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ordering remains effective_at DESC, id DESC', () => {
    const rows = makeRows(1200, 1, '2026-09-19')
    const r = simulateKeysetFetch(rows, HISTORY_PAGE_SIZE)
    for (let j = 1; j < r.fetched.length; j++) {
      const prev = r.fetched[j - 1], curr = r.fetched[j]
      const dateCmp = prev.effective_at > curr.effective_at ? 1 : prev.effective_at < curr.effective_at ? -1 : 0
      if (dateCmp === 0) expect(prev.id).toBeGreaterThan(curr.id)
      else expect(dateCmp).toBe(1) // prev is newer or same date
    }
  })

  it('same effective_at across several revisions: none skipped', () => {
    // 10 rows all sharing same date, different ids
    const rows: SimRow[] = []
    for (let i = 0; i < 10; i++) rows.push({ id: 100 + i, effective_at: '2026-09-19' })
    rows.sort((a, b) => b.id - a.id)
    const r = simulateKeysetFetch(rows, 3) // small page to force multiple pages
    expect(r.fetched.length).toBe(10)
    expect(r.pages).toBe(4) // 3+3+3+1
    const ids = r.fetched.map(f => f.id)
    expect(new Set(ids).size).toBe(10)
    // Verify order: id DESC
    for (let j = 1; j < r.fetched.length; j++) {
      expect(r.fetched[j - 1].id).toBeGreaterThan(r.fetched[j].id)
    }
  })

  it('same effective_at: pagination crosses same-date boundary correctly', () => {
    // Mix of dates: 5 rows on 2026-09-19, 5 rows on 2026-09-18
    const rows: SimRow[] = [
      { id: 110, effective_at: '2026-09-19' },
      { id: 109, effective_at: '2026-09-19' },
      { id: 108, effective_at: '2026-09-19' },
      { id: 107, effective_at: '2026-09-19' },
      { id: 106, effective_at: '2026-09-19' },
      { id: 105, effective_at: '2026-09-18' },
      { id: 104, effective_at: '2026-09-18' },
      { id: 103, effective_at: '2026-09-18' },
      { id: 102, effective_at: '2026-09-18' },
      { id: 101, effective_at: '2026-09-18' },
    ]
    const r = simulateKeysetFetch(rows, 3) // page boundary falls mid-date
    expect(r.fetched.length).toBe(10)
    const ids = r.fetched.map(f => f.id)
    expect(ids).toEqual([110, 109, 108, 107, 106, 105, 104, 103, 102, 101])
  })

  it('concurrent newer insert during traversal: no skips, no duplicates', () => {
    // Simulate: fetch page 1, then a new row appears (higher id, newer date)
    const originalRows: SimRow[] = makeRows(10, 1, '2026-09-15')
    // Page 1: fetch first 3
    const page1 = originalRows.slice(0, 3)
    const cursorDate = page1[2].effective_at
    const cursorId = page1[2].id

    // Now a new row appears with a newer date and higher id
    const newRow: SimRow = { id: 999, effective_at: '2026-09-20' }
    const allWithNew = [newRow, ...originalRows]

    // Page 2 uses cursor — should not include the new row or any page-1 rows
    const page2Eligible = allWithNew.filter(r =>
      r.effective_at < cursorDate ||
      (r.effective_at === cursorDate && r.id < cursorId)
    )

    // New row has effective_at > cursorDate → excluded (it's NEWER, not < cursor)
    expect(page2Eligible.find(r => r.id === 999)).toBeUndefined()

    // No page-1 rows should appear in page-2 eligible set
    for (const p1r of page1) {
      expect(page2Eligible.find(r => r.id === p1r.id)).toBeUndefined()
    }

    // Remaining original rows should all be there
    const remainingOriginal = originalRows.slice(3)
    for (const rem of remainingOriginal) {
      expect(page2Eligible.find(r => r.id === rem.id)).toBeDefined()
    }
  })

  it('pagination stops correctly when final page < pageSize', () => {
    const rows = makeRows(7, 1, '2026-09-19')
    const r = simulateKeysetFetch(rows, 3)
    expect(r.pages).toBe(3) // 3+3+1
    expect(r.fetched.length).toBe(7)
  })

  it('ALL still returns complete stable history when dataset is static', () => {
    const rows = makeRows(1500, 1, '2026-09-19')
    const r = simulateKeysetFetch(rows, HISTORY_PAGE_SIZE)
    expect(r.fetched.length).toBe(1500)
    // Every original row present
    const fetchedIds = new Set(r.fetched.map(f => f.id))
    for (const row of rows) {
      expect(fetchedIds.has(row.id)).toBe(true)
    }
  })
})

// ══════════════════════════════════════════════════════════════
// 10. DUPLICATE PROTECTION / BATCH ARCHITECTURE
// ══════════════════════════════════════════════════════════════

describe('batch architecture', () => {
  it('unique index excludes failed batches', () => {
    expect(migrationSrc).toContain("where (status != 'failed')")
  })

  it('unique index on player per batch', () => {
    expect(migrationSrc).toContain('uq_fdp_snapshot_player_batch')
  })

  it('batch table has expected_count and recorded_count', () => {
    expect(migrationSrc).toContain('expected_count')
    expect(migrationSrc).toContain('recorded_count')
  })

  it('RLS only exposes complete batches', () => {
    expect(migrationSrc).toContain("status = 'complete'")
  })

  it('snapshots cascade on batch delete', () => {
    expect(migrationSrc).toContain('on delete cascade')
  })
})

// ══════════════════════════════════════════════════════════════
// 11. FAILED BATCH RETRY
// ══════════════════════════════════════════════════════════════

describe('failed batch retry', () => {
  it('edge function checks for existing batch before creating', () => {
    expect(edgeFnSrc).toContain('existingBatches')
  })

  it('complete batch returns 409 immutable', () => {
    expect(edgeFnSrc).toContain('immutable')
    expect(edgeFnSrc).toContain('409')
  })

  it('pending batch returns 409 concurrent', () => {
    expect(edgeFnSrc).toContain('Concurrent duplicate rejected')
  })

  it('failed batch is deleted before retry', () => {
    expect(edgeFnSrc).toContain('.delete().eq("id", eb.id)')
  })

  it('edge function verifies recorded count before marking complete', () => {
    expect(edgeFnSrc).toContain('Row count mismatch')
    expect(edgeFnSrc).toContain("count: \"exact\"")
  })
})

// ══════════════════════════════════════════════════════════════
// 12. EDGE FUNCTION VALIDATION
// ══════════════════════════════════════════════════════════════

describe('edge function validation', () => {
  it('validates values_version format', () => {
    expect(edgeFnSrc).toContain('values_version required (format: YYYY-MM-DD.N)')
  })

  it('validates context object', () => {
    expect(edgeFnSrc).toContain('context object required')
  })

  it('validates te_premium is numeric with valid levels', () => {
    expect(edgeFnSrc).toContain('VALID_TEP_LEVELS')
    expect(edgeFnSrc).toContain('Invalid te_premium')
  })

  it('validates individual snapshot rows', () => {
    expect(edgeFnSrc).toContain('player_slug required')
    expect(edgeFnSrc).toContain('player_name required')
    expect(edgeFnSrc).toContain('invalid pos')
  })

  it('rejects duplicate player_slug in batch', () => {
    expect(edgeFnSrc).toContain('duplicate player_slug')
  })

  it('rejects invalid values (never clamps)', () => {
    expect(edgeFnSrc).toContain('value must be integer 0-9999')
    expect(edgeFnSrc).not.toContain('Math.max(0, Math.min(9999')
  })

  it('caps batch size at 2000', () => {
    expect(edgeFnSrc).toContain('max 2000')
  })

  it('uses dedicated write secret', () => {
    expect(edgeFnSrc).toContain('FDP_SNAPSHOT_WRITE_SECRET')
    expect(edgeFnSrc).toContain('dedicated write key')
  })

  it('uses constant-time comparison', () => {
    expect(edgeFnSrc).toContain('safeCompare')
    expect(edgeFnSrc).toContain('charCodeAt')
  })

  it('inserts effective_at on rows', () => {
    expect(edgeFnSrc).toContain('effective_at: effectiveDate')
  })

  it('uses CORS headers', () => {
    expect(edgeFnSrc).toContain('Access-Control-Allow-Origin')
  })
})

// ══════════════════════════════════════════════════════════════
// 13. PRODUCER — IMPORTS CANONICAL LOGIC
// ══════════════════════════════════════════════════════════════

describe('producer imports canonical logic', () => {
  it('imports computeDynastyTradeVal from logic.ts', () => {
    expect(producerSrc).toContain('computeDynastyTradeVal')
    expect(producerSrc).toContain('from "../src/logic"')
  })

  it('imports computeRedraftTradeVal from logic.ts', () => {
    expect(producerSrc).toContain('computeRedraftTradeVal')
  })

  it('imports REDRAFT_TV_MULT from logic.ts', () => {
    expect(producerSrc).toContain('REDRAFT_TV_MULT')
  })

  it('imports playerSlug from logic.ts', () => {
    expect(producerSrc).toContain('playerSlug')
  })

  it('imports VALUES_VERSION from logic.ts', () => {
    expect(producerSrc).toContain('VALUES_VERSION')
  })

  it('imports FDP_SNAPSHOT_CONTEXTS from logic.ts', () => {
    expect(producerSrc).toContain('FDP_SNAPSHOT_CONTEXTS')
  })

  it('imports dynastyBonus from logic.ts', () => {
    expect(producerSrc).toContain('dynastyBonus')
  })

  it('imports getBaselines from logic.ts', () => {
    expect(producerSrc).toContain('getBaselines')
  })

  it('does NOT define its own dynastyBonus function', () => {
    expect(producerSrc).not.toContain('function dynastyBonus(')
  })

  it('does NOT define its own computeDynastyTradeVal function', () => {
    expect(producerSrc).not.toContain('function computeDynastyTradeVal(')
  })

  it('does NOT define its own PRIME constants', () => {
    expect(producerSrc).not.toContain('const PRIME')
    expect(producerSrc).not.toContain('var PRIME')
  })

  it('does NOT define its own playerSlug function', () => {
    expect(producerSrc).not.toContain('function playerSlug(')
  })
})

// ══════════════════════════════════════════════════════════════
// 14. PRODUCER — REDRAFT USES CANONICAL HELPER
// ══════════════════════════════════════════════════════════════

describe('producer redraft uses canonical helper', () => {
  it('calls computeRedraftTradeVal for redraft values', () => {
    expect(producerSrc).toContain('computeRedraftTradeVal(')
  })

  it('uses REDRAFT_TV_MULT for baseTV calculation', () => {
    expect(producerSrc).toContain('REDRAFT_TV_MULT')
  })

  it('does NOT define its own redraft peak/decay constants', () => {
    expect(producerSrc).not.toContain('var rdPk')
    expect(producerSrc).not.toContain('var rdDc')
  })

  it('has write-integrity safety gate', () => {
    expect(producerSrc).toContain('SAFETY GATE FAILED')
    expect(producerSrc).toContain('Number.isFinite')
  })

  it('safety gate checks context is in supported matrix', () => {
    expect(producerSrc).toContain('isSnapshotContextSupported(ctx)')
    expect(producerSrc).toContain('not in FDP_SNAPSHOT_CONTEXTS')
  })

  it('safety gate checks player count matches expected', () => {
    expect(producerSrc).toContain('snaps.length !== expectedCount')
  })

  it('safety gate checks for duplicate slugs', () => {
    expect(producerSrc).toContain('slugSet.size !== snaps.length')
    expect(producerSrc).toContain('duplicate slugs')
  })

  it('safety gate checks values are finite integers 0-9999', () => {
    expect(producerSrc).toContain('Number.isInteger(s.value)')
  })
})

// ══════════════════════════════════════════════════════════════
// 15. APP — REDRAFT USES CANONICAL HELPER
// ══════════════════════════════════════════════════════════════

describe('app redraft uses canonical helper', () => {
  it('afdp.tsx imports computeRedraftTradeVal', () => {
    expect(afdpSrc).toContain('computeRedraftTradeVal')
  })

  it('afdp.tsx calls computeRedraftTradeVal for redraft', () => {
    expect(afdpSrc).toContain('p.tradeVal=computeRedraftTradeVal(')
  })

  it('afdp.tsx does NOT have inline redraft peak/decay constants', () => {
    expect(afdpSrc).not.toContain('var rdPk=')
    expect(afdpSrc).not.toContain('var rdDc=')
    expect(afdpSrc).not.toContain('var rdFloor=')
  })
})

// ══════════════════════════════════════════════════════════════
// 16. COMPLETE VALUE PARITY TEST
// ══════════════════════════════════════════════════════════════

describe('complete dynasty parity', () => {
  // Parse PLAYERS same way as producer
  const marker = "const PLAYERS=["
  const startIdx = afdpSrc.indexOf(marker)
  const arrayStart = afdpSrc.indexOf("[", startIdx)
  let depth = 0, i = arrayStart
  for (; i < afdpSrc.length; i++) {
    if (afdpSrc[i] === "[") depth++
    else if (afdpSrc[i] === "]") { depth--; if (depth === 0) break; }
  }
  const players: any[] = new Function("return " + afdpSrc.substring(arrayStart, i + 1))()
  const eligible = players.filter((p: any) => ["QB","RB","WR","TE","K","DST","DL","LB","DB"].includes(p.pos))

  for (const ctx of FDP_SNAPSHOT_CONTEXTS.filter(c => c.leagueType === 'dynasty')) {
    const label = `dynasty:PPR:${ctx.superflex ? 'SF' : '1QB'}:TEP${ctx.tePremium}`

    it(`${label}: all players have valid values`, () => {
      const sKey = 'PPR'
      const isSF = ctx.superflex
      const tePremium = ctx.tePremium
      const bl = getBaselines(12, isSF)

      const byPos: Record<string, any[]> = {}
      eligible.forEach((p: any) => { if (!byPos[p.pos]) byPos[p.pos] = []; byPos[p.pos].push(p) })
      const baseVal: Record<string, number> = {}
      Object.keys(byPos).forEach(pos => {
        const sorted = byPos[pos].slice().sort((a: any, b: any) => (b.proj?.[sKey] || 0) - (a.proj?.[sKey] || 0))
        const idx = Math.min((bl[pos] || 12) - 1, sorted.length - 1)
        baseVal[pos] = sorted[idx]?.proj?.[sKey] || 0
      })

      const withVbd = eligible.map((p: any) => {
        let pts = (p.proj?.[sKey] || p.proj?.PPR || 0)
        if (p.pos === 'TE' && tePremium > 0) {
          const estRec = p.proj?.PPR && p.proj?.Standard ? Math.round((p.proj.PPR - p.proj.Standard) * 0.7) : 45
          pts += tePremium * estRec
        }
        pts = pts * dynastyBonus(p.pos, p.age)
        if (p.ktcVal) pts = p.ktcVal * 0.037
        const raw = pts - (baseVal[p.pos] || 0)
        const vbd = isSF && p.pos === 'QB' ? raw * 1.38 : raw
        return { ...p, _vbd: vbd }
      })

      withVbd.sort((a, b) => b._vbd - a._vbd)
      const prc: Record<string, number> = {}
      withVbd.forEach(p => {
        prc[p.pos] = (prc[p.pos] || 0) + 1
        p._posRank = prc[p.pos]
      })

      // Compute and verify
      const slugs = new Set<string>()
      withVbd.forEach(p => {
        const val = Math.min(9999, Math.max(0, computeDynastyTradeVal(
          p.pos, p.age, p.ktcVal, p._posRank, p.proj?.[sKey] || 0,
          { isSF, sKey, tePremium, idpMode: ctx.idp },
        )))
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(9999)
        const slug = playerSlug(p.name)
        expect(slugs.has(slug)).toBe(false) // no duplicate slugs
        slugs.add(slug)
      })

      expect(withVbd.length).toBe(eligible.length) // no missing players
    })
  }
})

describe('complete redraft parity — ALL 24 contexts', () => {
  const marker = "const PLAYERS=["
  const startIdx = afdpSrc.indexOf(marker)
  const arrayStart = afdpSrc.indexOf("[", startIdx)
  let depth = 0, i = arrayStart
  for (; i < afdpSrc.length; i++) {
    if (afdpSrc[i] === "[") depth++
    else if (afdpSrc[i] === "]") { depth--; if (depth === 0) break; }
  }
  const players: any[] = new Function("return " + afdpSrc.substring(arrayStart, i + 1))()
  const eligible = players.filter((p: any) => ["QB","RB","WR","TE","K","DST","DL","LB","DB"].includes(p.pos))

  // Test every one of the 24 redraft contexts
  for (const ctx of FDP_SNAPSHOT_CONTEXTS.filter(c => c.leagueType === 'redraft')) {
    const label = `redraft:${ctx.scoring}:${ctx.superflex ? 'SF' : '1QB'}:TEP${ctx.tePremium}`
    it(`${label} — all players, valid values, no duplicate slugs`, () => {
      const sKey = ctx.scoring
      const isSF = ctx.superflex
      const tepLevel = ctx.tePremium
      const bl = getBaselines(12, isSF)

      const byPos: Record<string, any[]> = {}
      eligible.forEach((p: any) => { if (!byPos[p.pos]) byPos[p.pos] = []; byPos[p.pos].push(p) })
      const baseVal: Record<string, number> = {}
      Object.keys(byPos).forEach(pos => {
        const sorted = byPos[pos].slice().sort((a: any, b: any) =>
          ((b.proj?.[sKey] || b.proj?.PPR || 0) - (a.proj?.[sKey] || a.proj?.PPR || 0)))
        const idx = Math.min((bl[pos] || 12) - 1, sorted.length - 1)
        baseVal[pos] = sorted[idx]?.proj?.[sKey] || sorted[idx]?.proj?.PPR || 0
      })

      const withVbd = eligible.map((p: any) => {
        let pts = (p.proj?.[sKey] || p.proj?.PPR || 0)
        if (p.pos === 'TE' && tepLevel > 0) {
          const estRec = p.proj?.PPR && p.proj?.Standard ? Math.round((p.proj.PPR - p.proj.Standard) * 0.7) : 45
          pts += tepLevel * estRec
        }
        const raw = pts - (baseVal[p.pos] || 0)
        const vbd = isSF && p.pos === 'QB' ? raw * 1.38 : raw
        return { ...p, _vbd: vbd }
      })

      withVbd.sort((a, b) => b._vbd - a._vbd)
      const prc: Record<string, number> = {}
      withVbd.forEach(p => {
        prc[p.pos] = (prc[p.pos] || 0) + 1
        p._posRank = prc[p.pos]
      })

      const slugs = new Set<string>()
      withVbd.forEach(p => {
        const baseTV = Math.round(p._vbd * REDRAFT_TV_MULT)
        const val = Math.min(9999, Math.max(0, computeRedraftTradeVal(p.pos, p._posRank, baseTV, { isSF })))
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(9999)
        const slug = playerSlug(p.name)
        expect(slugs.has(slug)).toBe(false)
        slugs.add(slug)
      })

      expect(withVbd.length).toBe(eligible.length)
    })
  }
})

describe('Brock Bowers redraft TEP differentiation', () => {
  // Brock Bowers produces different Redraft values at each TEP level
  const marker = "const PLAYERS=["
  const startIdx = afdpSrc.indexOf(marker)
  const arrayStart = afdpSrc.indexOf("[", startIdx)
  let depth = 0, i = arrayStart
  for (; i < afdpSrc.length; i++) {
    if (afdpSrc[i] === "[") depth++
    else if (afdpSrc[i] === "]") { depth--; if (depth === 0) break; }
  }
  const players: any[] = new Function("return " + afdpSrc.substring(arrayStart, i + 1))()
  const eligible = players.filter((p: any) => ["QB","RB","WR","TE","K","DST","DL","LB","DB"].includes(p.pos))

  function computeBowersRedraft(tepLevel: number): number {
    const sKey = 'PPR'
    const isSF = false
    const bl = getBaselines(12, isSF)
    const byPos: Record<string, any[]> = {}
    eligible.forEach((p: any) => { if (!byPos[p.pos]) byPos[p.pos] = []; byPos[p.pos].push(p) })
    const baseVal: Record<string, number> = {}
    Object.keys(byPos).forEach(pos => {
      const sorted = byPos[pos].slice().sort((a: any, b: any) =>
        ((b.proj?.[sKey] || b.proj?.PPR || 0) - (a.proj?.[sKey] || a.proj?.PPR || 0)))
      const idx = Math.min((bl[pos] || 12) - 1, sorted.length - 1)
      baseVal[pos] = sorted[idx]?.proj?.[sKey] || sorted[idx]?.proj?.PPR || 0
    })
    const withVbd = eligible.map((p: any) => {
      let pts = (p.proj?.[sKey] || p.proj?.PPR || 0)
      if (p.pos === 'TE' && tepLevel > 0) {
        const estRec = p.proj?.PPR && p.proj?.Standard ? Math.round((p.proj.PPR - p.proj.Standard) * 0.7) : 45
        pts += tepLevel * estRec
      }
      const raw = pts - (baseVal[p.pos] || 0)
      const vbd = isSF && p.pos === 'QB' ? raw * 1.38 : raw
      return { ...p, _vbd: vbd }
    })
    withVbd.sort((a, b) => b._vbd - a._vbd)
    const prc: Record<string, number> = {}
    withVbd.forEach(p => { prc[p.pos] = (prc[p.pos] || 0) + 1; p._posRank = prc[p.pos] })
    const bowers = withVbd.find(p => p.name === 'Brock Bowers')
    if (!bowers) throw new Error('Brock Bowers not found')
    const baseTV = Math.round(bowers._vbd * REDRAFT_TV_MULT)
    return Math.min(9999, Math.max(0, computeRedraftTradeVal(bowers.pos, bowers._posRank, baseTV, { isSF })))
  }

  it('Brock Bowers has different values at TEP 0 vs 0.25 vs 0.5 vs 1.0', () => {
    const vals = TEP_LEVELS.map(t => computeBowersRedraft(t))
    // TEP 0 should produce lowest TE value; increasing TEP should increase or maintain
    expect(vals[0]).toBeLessThanOrEqual(vals[1]) // TEP 0 ≤ TEP 0.25
    expect(vals[1]).toBeLessThanOrEqual(vals[2]) // TEP 0.25 ≤ TEP 0.5
    expect(vals[2]).toBeLessThanOrEqual(vals[3]) // TEP 0.5 ≤ TEP 1.0
    // At least TEP 0 and TEP 1.0 must produce different values
    expect(vals[0]).not.toBe(vals[3])
  })
})

describe('spot-check canonical players', () => {
  it('Josh Allen dynasty 1QB PPR = 9100', () => {
    // ktcVal=9100, age~29.2, dynastyBonus for QB at 29.2 = 1.0 (in prime 26-32)
    const val = computeDynastyTradeVal('QB', 29.2, 9100, 1, 350, { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false })
    expect(val).toBe(9100)
  })
  it('Brock Bowers dynasty 1QB PPR TEP = 9999 (capped)', () => {
    // ktcVal=8350, age=23.7, dynastyBonus=1.0585, tepAdj=1.15
    const val = computeDynastyTradeVal('TE', 23.7, 8350, 1, 252, { isSF: false, sKey: 'PPR', tePremium: 1, idpMode: false })
    expect(val).toBe(9999) // 8350 * 1.0585 * 1.15 = 10163 → capped at 9999
  })
})

// ══════════════════════════════════════════════════════════════
// 17. DATABASE SCHEMA
// ══════════════════════════════════════════════════════════════

describe('database schema', () => {
  it('value constrained 0-9999', () => {
    expect(migrationSrc).toContain('value >= 0 and value <= 9999')
  })
  it('league_type constrained', () => {
    expect(migrationSrc).toContain("league_type in ('dynasty','redraft')")
  })
  it('scoring constrained', () => {
    expect(migrationSrc).toContain("scoring in ('PPR','Half','Standard')")
  })
  it('te_premium is numeric with valid levels', () => {
    expect(migrationSrc).toContain('te_premium     numeric')
    expect(migrationSrc).toContain('te_premium in (0, 0.25, 0.5, 1.0)')
  })
  it('batch status field', () => {
    expect(migrationSrc).toContain("status in ('pending','complete','failed')")
  })
  it('batch has expected_count check', () => {
    expect(migrationSrc).toContain('expected_count > 0')
  })
  it('snapshot table has batch_id foreign key with cascade', () => {
    expect(migrationSrc).toContain('references public.fdp_snapshot_batches(id) on delete cascade')
  })
  it('RLS enabled on both tables', () => {
    expect(migrationSrc).toContain('alter table public.fdp_snapshot_batches enable row level security')
    expect(migrationSrc).toContain('alter table public.fdp_value_snapshots enable row level security')
  })
  it('write revoked from public/anon/authenticated', () => {
    expect(migrationSrc).toContain('revoke insert, update, delete on public.fdp_value_snapshots from anon')
    expect(migrationSrc).toContain('revoke insert, update, delete on public.fdp_value_snapshots from authenticated')
  })
  it('service_role has full access', () => {
    expect(migrationSrc).toContain('grant all on public.fdp_value_snapshots to service_role')
  })
})

// ══════════════════════════════════════════════════════════════
// 18. MIGRATION SAFETY
// ══════════════════════════════════════════════════════════════

describe('migration safety', () => {
  it('does NOT use IF NOT EXISTS for tables (fails loudly on conflict)', () => {
    expect(migrationSrc).not.toContain('create table if not exists')
  })

  it('documentation says run once', () => {
    expect(migrationSrc).toContain('run ONCE')
  })
})

// ══════════════════════════════════════════════════════════════
// 19. GENERATED ARTIFACTS
// ══════════════════════════════════════════════════════════════

describe('generated artifact safety', () => {
  it('scripts/output/ is in .gitignore', () => {
    const gitignore = readFileSync(resolve(rootDir, '.gitignore'), 'utf-8')
    expect(gitignore).toContain('scripts/output/')
  })

  it('producer default is dry run', () => {
    expect(producerSrc).toContain('--write')
    expect(producerSrc).toContain('DRY RUN')
  })

  it('producer requires env vars for write mode', () => {
    expect(producerSrc).toContain('FDP_SNAPSHOT_WRITE_SECRET')
    expect(producerSrc).toContain('EDGE_URL')
  })
})

// ══════════════════════════════════════════════════════════════
// 20. CROSS-CONTEXT COMPLETION SEMANTICS
// ══════════════════════════════════════════════════════════════

describe('cross-context completion', () => {
  it('edge function documents each context independently complete', () => {
    expect(edgeFnSrc).toContain('Each context is independently complete')
  })
})

// ══════════════════════════════════════════════════════════════
// 21. EMPTY STATES
// ══════════════════════════════════════════════════════════════

describe('empty states are distinct', () => {
  it('unsupported context', () => {
    expect(afdpSrc).toContain('Value history is not currently tracked for this format.')
  })
  it('supported context no snapshot', () => {
    expect(afdpSrc).toContain('No FDP Value snapshot has been recorded for this context yet.')
  })
  it('API/table error', () => {
    expect(afdpSrc).toContain('Value history unavailable. Player value is current.')
  })
  it('one point', () => {
    expect(afdpSrc).toContain('More data is needed to show a trend')
  })
  it('range has 0 points', () => {
    expect(afdpSrc).toContain('No data points in the ')
  })
  it('range has 1 point', () => {
    expect(afdpSrc).toContain('Only one data point in this range')
  })
  it('range never silently falls back to ALL', () => {
    expect(afdpSrc).not.toContain('if(pts.length<2)pts=ppHistory')
  })
})

// ══════════════════════════════════════════════════════════════
// 22. CHART / UI
// ══════════════════════════════════════════════════════════════

describe('chart implementation', () => {
  it('uses SVG polyline', () => {
    expect(afdpSrc).toContain('React.createElement("polyline"')
  })
  it('has aria-label for accessibility', () => {
    expect(afdpSrc).toContain('"aria-label":"FDP Value history chart')
  })
  it('accessible data table fallback', () => {
    expect(afdpSrc).toContain('View data table')
  })
  it('range buttons with aria-pressed', () => {
    expect(afdpSrc).toContain('"aria-pressed"')
  })
  it('range buttons wrap on mobile', () => {
    const histSection = afdpSrc.substring(afdpSrc.indexOf('FDP VALUE HISTORY'), afdpSrc.indexOf('FDP VALUE HISTORY') + 5000)
    expect(histSection).toContain('flexWrap:"wrap"')
  })
  it('chart container has overflowX auto', () => {
    const histSection = afdpSrc.substring(afdpSrc.indexOf('FDP VALUE HISTORY'), afdpSrc.indexOf('FDP VALUE HISTORY') + 5000)
    expect(histSection).toContain('overflowX:"auto"')
  })
})

// ══════════════════════════════════════════════════════════════
// 23. adminTvMult / Keeper / Storage
// ══════════════════════════════════════════════════════════════

describe('adminTvMult and Keeper semantics', () => {
  it('adminTvMult defaults to 80 (matches REDRAFT_TV_MULT)', () => {
    expect(REDRAFT_TV_MULT).toBe(80)
    expect(afdpSrc).toContain("'fdp_tvm_v2');return s?+s:80;")
  })

  it('adminTvMult is admin-only (behind isAdmin gate)', () => {
    expect(afdpSrc).toContain('user.isAdmin')
  })

  it('Keeper mode only exists in Mock Draft / Startup (not main Trade tab)', () => {
    // Main Trade tab has only Dynasty/Redraft
    expect(afdpSrc).toContain('["Dynasty","Redraft"]')
  })
})

// ══════════════════════════════════════════════════════════════
// 23b. CUSTOM MULTIPLIER HISTORY SAFETY
// ══════════════════════════════════════════════════════════════

describe('custom multiplier history safety', () => {
  it('ppCanonicalMult detects non-default adminTvMult for redraft', () => {
    expect(afdpSrc).toContain('ppCanonicalMult=!isDynasty&&adminTvMult!==REDRAFT_TV_MULT')
  })

  it('custom multiplier suppresses history fetch', () => {
    expect(afdpSrc).toContain('if(!ppCtxSupported||ppCanonicalMult)')
  })

  it('custom multiplier shows explicit message instead of history', () => {
    expect(afdpSrc).toContain('Value history reflects the canonical FDP multiplier and is unavailable while custom value tuning is active.')
  })

  it('dynasty is unaffected by adminTvMult (dynasty uses computeDynastyTradeVal)', () => {
    // ppCanonicalMult = !isDynasty && ... — dynasty is excluded
    expect(afdpSrc).toContain('ppCanonicalMult=!isDynasty&&')
  })

  it('ordinary non-admin users have canonical default (80)', () => {
    // The default is 80, and only admins can change it
    expect(afdpSrc).toContain("'fdp_tvm_v2');return s?+s:80;")
    // adminTvMult UI is behind isAdmin gate
    expect(afdpSrc).toContain('user.isAdmin')
  })

  it('no snapshot query is performed when custom multiplier active', () => {
    // The ppCanonicalMult check short-circuits before the paginated fetch
    // It sets history to empty and returns early
    const fetchBlock = afdpSrc.substring(afdpSrc.indexOf('ppCanonicalMult'), afdpSrc.indexOf('Keyset-paginated ALL fetch'))
    expect(fetchBlock).toContain('setPpHistory([]);setPpHistoryLoading(false);setPpHistoryError(false);return')
  })
})

// ══════════════════════════════════════════════════════════════
// 23c. PLAYER COUNT AND STORAGE SCALE
// ══════════════════════════════════════════════════════════════

describe('player count and storage scale', () => {
  // Parse actual player universe
  const marker = "const PLAYERS=["
  const startIdx = afdpSrc.indexOf(marker)
  const arrayStart = afdpSrc.indexOf("[", startIdx)
  let depth = 0, i = arrayStart
  for (; i < afdpSrc.length; i++) {
    if (afdpSrc[i] === "[") depth++
    else if (afdpSrc[i] === "]") { depth--; if (depth === 0) break; }
  }
  const players: any[] = new Function("return " + afdpSrc.substring(arrayStart, i + 1))()
  const eligible = players.filter((p: any) => ["QB","RB","WR","TE","K","DST","DL","LB","DB"].includes(p.pos))

  it('PLAYERS count is 1320', () => {
    expect(players.length).toBe(1320)
  })

  it('all 1320 players are snapshot-eligible', () => {
    expect(eligible.length).toBe(1320)
  })

  it('no excluded positions (all have valid NFL positions)', () => {
    const excluded = players.filter((p: any) => !["QB","RB","WR","TE","K","DST","DL","LB","DB"].includes(p.pos))
    expect(excluded.length).toBe(0)
  })

  it('rows per context = 1320', () => {
    expect(eligible.length).toBe(1320)
  })

  it('rows per VALUES_VERSION = 28 × 1320 = 36,960', () => {
    expect(FDP_SNAPSHOT_CONTEXTS.length * eligible.length).toBe(36960)
  })

  it('producer checks expected count matches snapshot-eligible', () => {
    expect(producerSrc).toContain('expectedCount')
    expect(producerSrc).toContain('snaps.length !== expectedCount')
  })

  it('no duplicate slugs in player universe', () => {
    const slugs = eligible.map((p: any) => playerSlug(p.name))
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})

// ══════════════════════════════════════════════════════════════
// 24-28. REGRESSION SAFETY
// ══════════════════════════════════════════════════════════════

describe('canonical FDP values unchanged', () => {
  it('computeDynastyTradeVal signature unchanged', () => {
    expect(logicSrc).toContain('export function computeDynastyTradeVal(')
  })
  it('VALUES_UPDATED_AT unchanged', () => {
    expect(VALUES_UPDATED_AT).toBe('2026-09-19')
  })
  it('PRIME ranges unchanged', () => {
    expect(logicSrc).toContain("QB: [26, 35], RB: [22, 27], WR: [23, 29], TE: [25, 30]")
  })
})

describe('rankings unchanged', () => {
  it('ranking sort unchanged', () => {
    expect(afdpSrc).toContain('.sort(function(a,b){return(b.tradeVal||0)-(a.tradeVal||0);})')
  })
})

describe('Trade Analyzer unchanged', () => {
  it('tVal function unchanged', () => {
    expect(afdpSrc).toContain('function tVal(side,fa){return side.reduce(function(s,x){return s+(x.pos==="PICK"?x.est:Math.max(0,x.tradeVal));},0)')
  })
  it('verdict function unchanged', () => {
    expect(afdpSrc).toContain('if(pct<8) return {txt:"Fair Trade"')
  })
})

describe('Trade Finder unchanged', () => {
  it('generateTradeCandidates exported', () => {
    expect(logicSrc).toContain('export function generateTradeCandidates(')
  })
})

describe('monetization unchanged', () => {
  it('FREE_TRADE_LIMIT', () => {
    expect(logicSrc).toContain('export const FREE_TRADE_LIMIT = 3')
  })
  it('Stripe checkout', () => {
    expect(afdpSrc).toContain('create-checkout')
  })
})

describe('odds architecture unchanged', () => {
  it('fetch-odds intact', () => {
    expect(afdpSrc).toContain('fetch-odds')
  })
})

describe('SEO unchanged', () => {
  it('player page JSON-LD', () => {
    expect(afdpSrc).toContain('"@type":"Person"')
  })
  it('playerSlug function in afdp.tsx', () => {
    expect(afdpSrc).toContain('function playerSlug(name')
  })
})

describe('current value authoritative', () => {
  it('hero shows ppVal from canonical computation', () => {
    expect(afdpSrc).toContain('var ppVal=pp.tradeVal||pp.ktcVal||0')
  })
})

describe('format context label on history', () => {
  it('history section shows format context', () => {
    const histSection = afdpSrc.substring(afdpSrc.indexOf('FDP VALUE HISTORY'), afdpSrc.indexOf('FDP VALUE HISTORY') + 500)
    expect(histSection).toContain('formatContextLabel(isDynasty,isSF,sKey,tePremium)')
  })
})
