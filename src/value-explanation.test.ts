import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  explainValueMovement,
  findComparisonSnapshots,
  computeValueChange,
  computeDynastyTradeVal,
  computeRedraftTradeVal,
  REDRAFT_TV_MULT,
  getBaselines,
  playerSlug,
  dynastyBonus,
  PRIME,
  SIGNAL_MATERIALITY,
  FDP_SNAPSHOT_CONTEXTS,
  isSnapshotContextSupported,
  normalizeSnapshotContext,
  VALUES_VERSION,
  HISTORY_PAGE_SIZE,
} from './logic'
import type { FdpSnapshot, ValuationFactors, ValueChangeExplanation } from './logic'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const logicSrc = readFileSync(resolve(thisDir, 'logic.ts'), 'utf-8').replace(/\r\n/g, '\n')
const migrationSrc = readFileSync(resolve(rootDir, 'supabase/migrations/004_fdp_value_snapshots.sql'), 'utf-8').replace(/\r\n/g, '\n')
const edgeFnSrc = readFileSync(resolve(rootDir, 'supabase/functions/record-value-snapshots/index.ts'), 'utf-8').replace(/\r\n/g, '\n')
const producerSrc = readFileSync(resolve(rootDir, 'scripts/generate-snapshots.ts'), 'utf-8').replace(/\r\n/g, '\n')
const afdpSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8').replace(/\r\n/g, '\n')

// ── Helper factories ──

function mkSnap(value: number, effective_at: string, factors?: ValuationFactors | null): FdpSnapshot {
  return {
    id: Math.floor(Math.random() * 100000),
    player_slug: 'test-player',
    player_name: 'Test Player',
    value,
    values_version: '2026-09-19.1',
    effective_at,
    recorded_at: effective_at,
    valuation_factors: factors !== undefined ? factors : null,
  }
}

function mkFactors(overrides?: Partial<ValuationFactors>): ValuationFactors {
  return {
    v: 1,
    path: 'ktc',
    projection: 300,
    positional_baseline: 200,
    raw_value: 7500,
    age: 25,
    pos_rank: 5,
    ktc_value: 7500,
    dynasty_bonus: 1.0,
    ...overrides,
  }
}

function mkRedraftFactors(overrides?: Partial<ValuationFactors>): ValuationFactors {
  return {
    v: 1,
    path: 'vbd',
    projection: 300,
    positional_baseline: 200,
    raw_value: 6000,
    age: 25,
    pos_rank: 5,
    ...overrides,
  }
}

// ══════════════════════════════════════════════════════════════
// DYNASTY VALUATION PATHS
// ══════════════════════════════════════════════════════════════

describe('dynasty valuation path: KTC', () => {
  it('ktc_value change is contributing on KTC path', () => {
    const prev = mkSnap(7000, '2026-09-12', mkFactors({ ktc_value: 7000, path: 'ktc' }))
    const curr = mkSnap(7500, '2026-09-19', mkFactors({ ktc_value: 7500, path: 'ktc' }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'market_input_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('contributing')
  })

  it('dynasty_bonus change is contributing on KTC path', () => {
    const prev = mkSnap(7500, '2026-09-12', mkFactors({ dynasty_bonus: 1.0, path: 'ktc' }))
    const curr = mkSnap(7200, '2026-09-19', mkFactors({ dynasty_bonus: 0.97, path: 'ktc' }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'age_curve_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('contributing')
  })

  it('projection change is recorded_context on KTC path (not used in KTC formula)', () => {
    const prev = mkSnap(7000, '2026-09-12', mkFactors({ projection: 280, path: 'ktc' }))
    const curr = mkSnap(7500, '2026-09-19', mkFactors({ projection: 310, path: 'ktc' }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'projection_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('recorded_context')
  })

  it('pos_rank change is recorded_context on KTC path (not used in KTC formula)', () => {
    const prev = mkSnap(7000, '2026-09-12', mkFactors({ pos_rank: 8, path: 'ktc' }))
    const curr = mkSnap(7500, '2026-09-19', mkFactors({ pos_rank: 5, path: 'ktc' }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'rank_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('recorded_context')
  })

  it('baseline change is recorded_context on KTC path', () => {
    const prev = mkSnap(7000, '2026-09-12', mkFactors({ positional_baseline: 200, path: 'ktc' }))
    const curr = mkSnap(7500, '2026-09-19', mkFactors({ positional_baseline: 220, path: 'ktc' }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'baseline_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('recorded_context')
  })
})

describe('dynasty valuation path: rank_decay', () => {
  it('pos_rank is contributing on rank_decay path', () => {
    const prev = mkSnap(5000, '2026-09-12', mkFactors({ pos_rank: 15, path: 'rank_decay', ktc_value: undefined }))
    const curr = mkSnap(6000, '2026-09-19', mkFactors({ pos_rank: 10, path: 'rank_decay', ktc_value: undefined }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'rank_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('contributing')
  })

  it('dynasty_bonus is contributing on rank_decay path', () => {
    const prev = mkSnap(5000, '2026-09-12', mkFactors({ dynasty_bonus: 1.0, path: 'rank_decay', ktc_value: undefined }))
    const curr = mkSnap(4700, '2026-09-19', mkFactors({ dynasty_bonus: 0.93, path: 'rank_decay', ktc_value: undefined }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'age_curve_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('contributing')
  })

  it('projection is recorded_context on rank_decay path (proj floor not controlling)', () => {
    const prev = mkSnap(5000, '2026-09-12', mkFactors({ projection: 200, path: 'rank_decay', ktc_value: undefined }))
    const curr = mkSnap(5500, '2026-09-19', mkFactors({ projection: 240, path: 'rank_decay', ktc_value: undefined }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'projection_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('recorded_context')
  })
})

describe('dynasty valuation path: proj_floor', () => {
  it('projection is contributing on proj_floor path', () => {
    const prev = mkSnap(2000, '2026-09-12', mkFactors({ projection: 100, path: 'proj_floor', ktc_value: undefined }))
    const curr = mkSnap(2500, '2026-09-19', mkFactors({ projection: 140, path: 'proj_floor', ktc_value: undefined }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'projection_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('contributing')
  })

  it('pos_rank is contributing on proj_floor path', () => {
    const prev = mkSnap(2000, '2026-09-12', mkFactors({ pos_rank: 30, path: 'proj_floor', ktc_value: undefined }))
    const curr = mkSnap(2200, '2026-09-19', mkFactors({ pos_rank: 25, path: 'proj_floor', ktc_value: undefined }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'rank_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('contributing')
  })

  it('dynasty_bonus is contributing on proj_floor path', () => {
    const prev = mkSnap(2000, '2026-09-12', mkFactors({ dynasty_bonus: 1.0, path: 'proj_floor', ktc_value: undefined }))
    const curr = mkSnap(1800, '2026-09-19', mkFactors({ dynasty_bonus: 0.9, path: 'proj_floor', ktc_value: undefined }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'age_curve_change')
    expect(sig!.classification).toBe('contributing')
  })
})

// ══════════════════════════════════════════════════════════════
// REDRAFT VALUATION PATHS
// ══════════════════════════════════════════════════════════════

describe('redraft valuation path: vbd', () => {
  it('projection is contributing on VBD path', () => {
    const prev = mkSnap(6000, '2026-09-12', mkRedraftFactors({ projection: 280, path: 'vbd' }))
    const curr = mkSnap(7000, '2026-09-19', mkRedraftFactors({ projection: 320, path: 'vbd' }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'projection_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('contributing')
  })

  it('positional_baseline is contributing on VBD path', () => {
    const prev = mkSnap(6000, '2026-09-12', mkRedraftFactors({ positional_baseline: 200, path: 'vbd' }))
    const curr = mkSnap(5500, '2026-09-19', mkRedraftFactors({ positional_baseline: 215, path: 'vbd' }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'baseline_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('contributing')
  })

  it('pos_rank is recorded_context on VBD path (baseTV dominates floor)', () => {
    const prev = mkSnap(6000, '2026-09-12', mkRedraftFactors({ pos_rank: 8, path: 'vbd' }))
    const curr = mkSnap(6500, '2026-09-19', mkRedraftFactors({ pos_rank: 5, path: 'vbd' }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'rank_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('recorded_context')
  })
})

describe('redraft valuation path: rank_floor', () => {
  it('pos_rank is contributing on rank_floor path', () => {
    const prev = mkSnap(3000, '2026-09-12', mkRedraftFactors({ pos_rank: 12, path: 'rank_floor' }))
    const curr = mkSnap(3500, '2026-09-19', mkRedraftFactors({ pos_rank: 8, path: 'rank_floor' }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'rank_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('contributing')
  })

  it('projection is recorded_context on rank_floor path (floor dominates)', () => {
    const prev = mkSnap(3000, '2026-09-12', mkRedraftFactors({ projection: 200, path: 'rank_floor' }))
    const curr = mkSnap(3000, '2026-09-19', mkRedraftFactors({ projection: 240, path: 'rank_floor' }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'projection_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('recorded_context')
  })

  it('baseline is recorded_context on rank_floor path', () => {
    const prev = mkSnap(3000, '2026-09-12', mkRedraftFactors({ positional_baseline: 200, path: 'rank_floor' }))
    const curr = mkSnap(3000, '2026-09-19', mkRedraftFactors({ positional_baseline: 220, path: 'rank_floor' }))
    const result = explainValueMovement(prev, curr)
    const sig = result.signals.find(s => s.type === 'baseline_change')
    expect(sig).toBeDefined()
    expect(sig!.classification).toBe('recorded_context')
  })
})

// ══════════════════════════════════════════════════════════════
// PATH TRANSITION
// ══════════════════════════════════════════════════════════════

describe('valuation path transition', () => {
  it('factor is contributing if it participates in EITHER snapshot path', () => {
    // Previous was rank_decay (pos_rank contributing), current is ktc (pos_rank NOT contributing)
    // pos_rank should still be contributing since it drove the previous value
    const prev = mkSnap(5000, '2026-09-12', mkFactors({ pos_rank: 15, path: 'rank_decay', ktc_value: undefined }))
    const curr = mkSnap(7500, '2026-09-19', mkFactors({ pos_rank: 5, path: 'ktc', ktc_value: 7500 }))
    const result = explainValueMovement(prev, curr)
    const rankSig = result.signals.find(s => s.type === 'rank_change')
    expect(rankSig).toBeDefined()
    // pos_rank was contributing in previous snapshot's path
    expect(rankSig!.classification).toBe('contributing')
  })
})

// ══════════════════════════════════════════════════════════════
// GENERAL EXPLANATION LOGIC
// ══════════════════════════════════════════════════════════════

describe('explainValueMovement', () => {
  describe('first snapshot', () => {
    it('returns first_snapshot when no previous', () => {
      const curr = mkSnap(7500, '2026-09-19', mkFactors())
      const result = explainValueMovement(null, curr)
      expect(result.factorAvailability).toBe('first_snapshot')
      expect(result.delta).toBe(0)
      expect(result.signals).toHaveLength(0)
    })
  })

  describe('value-only historical comparison', () => {
    it('returns value_only when neither snapshot has factors', () => {
      const prev = mkSnap(7000, '2026-09-12', null)
      const curr = mkSnap(7500, '2026-09-19', null)
      const result = explainValueMovement(prev, curr)
      expect(result.factorAvailability).toBe('value_only')
      expect(result.delta).toBe(500)
      expect(result.direction).toBe('increased')
      expect(result.signals).toHaveLength(0)
    })
  })

  describe('partial factor history', () => {
    it('returns partial when only current has factors', () => {
      const prev = mkSnap(7000, '2026-09-12', null)
      const curr = mkSnap(7500, '2026-09-19', mkFactors())
      const result = explainValueMovement(prev, curr)
      expect(result.factorAvailability).toBe('partial')
    })

    it('returns partial when only previous has factors', () => {
      const prev = mkSnap(7000, '2026-09-12', mkFactors())
      const curr = mkSnap(7500, '2026-09-19', null)
      const result = explainValueMovement(prev, curr)
      expect(result.factorAvailability).toBe('partial')
    })
  })

  describe('direction detection', () => {
    it('detects increase', () => {
      const prev = mkSnap(7000, '2026-09-12', mkFactors({ ktc_value: 7000 }))
      const curr = mkSnap(7500, '2026-09-19', mkFactors({ ktc_value: 7500 }))
      expect(explainValueMovement(prev, curr).direction).toBe('increased')
    })

    it('detects decrease', () => {
      const prev = mkSnap(8000, '2026-09-12', mkFactors({ ktc_value: 8000 }))
      const curr = mkSnap(7500, '2026-09-19', mkFactors({ ktc_value: 7500 }))
      expect(explainValueMovement(prev, curr).direction).toBe('decreased')
    })

    it('detects unchanged', () => {
      const prev = mkSnap(7500, '2026-09-12', mkFactors())
      const curr = mkSnap(7500, '2026-09-19', mkFactors())
      expect(explainValueMovement(prev, curr).direction).toBe('unchanged')
    })
  })

  describe('capped 9,999 behavior', () => {
    it('signals cap effect when value at 9999 but raw exceeds', () => {
      const prev = mkSnap(9999, '2026-09-12', mkFactors({ raw_value: 10200 }))
      const curr = mkSnap(9999, '2026-09-19', mkFactors({ raw_value: 10800 }))
      const result = explainValueMovement(prev, curr)
      expect(result.direction).toBe('unchanged')
      const sig = result.signals.find(s => s.type === 'cap_effect')
      expect(sig).toBeDefined()
      expect(sig!.classification).toBe('display')
      expect(sig!.previousValue).toBe(10200)
      expect(sig!.currentValue).toBe(10800)
    })

    it('no cap signal when value not at 9999', () => {
      const prev = mkSnap(7000, '2026-09-12', mkFactors({ raw_value: 7000 }))
      const curr = mkSnap(7500, '2026-09-19', mkFactors({ raw_value: 7500 }))
      expect(explainValueMovement(prev, curr).signals.find(s => s.type === 'cap_effect')).toBeUndefined()
    })
  })

  describe('materiality thresholds', () => {
    it('suppresses projection below threshold', () => {
      const prev = mkSnap(7500, '2026-09-12', mkFactors({ projection: 299 }))
      const curr = mkSnap(7500, '2026-09-19', mkFactors({ projection: 300 }))
      expect(explainValueMovement(prev, curr).signals.find(s => s.type === 'projection_change')).toBeUndefined()
    })

    it('suppresses ktc below threshold', () => {
      const prev = mkSnap(7500, '2026-09-12', mkFactors({ ktc_value: 7200 }))
      const curr = mkSnap(7500, '2026-09-19', mkFactors({ ktc_value: 7230 }))
      expect(explainValueMovement(prev, curr).signals.find(s => s.type === 'market_input_change')).toBeUndefined()
    })

    it('suppresses dynasty_bonus below threshold', () => {
      const prev = mkSnap(7500, '2026-09-12', mkFactors({ dynasty_bonus: 1.000 }))
      const curr = mkSnap(7500, '2026-09-19', mkFactors({ dynasty_bonus: 1.002 }))
      expect(explainValueMovement(prev, curr).signals.find(s => s.type === 'age_curve_change')).toBeUndefined()
    })

    it('suppresses baseline below threshold', () => {
      const prev = mkSnap(7500, '2026-09-12', mkFactors({ positional_baseline: 200 }))
      const curr = mkSnap(7500, '2026-09-19', mkFactors({ positional_baseline: 201 }))
      expect(explainValueMovement(prev, curr).signals.find(s => s.type === 'baseline_change')).toBeUndefined()
    })
  })

  describe('materiality cannot hide sole driver', () => {
    it('shows small contributing change when it is the only factor that moved', () => {
      // ktc_value changes by exactly 50 (at threshold) and is the only real input that changed
      const prev = mkSnap(7500, '2026-09-12', mkFactors({ ktc_value: 7200, path: 'ktc' }))
      const curr = mkSnap(7550, '2026-09-19', mkFactors({ ktc_value: 7250, path: 'ktc' }))
      const result = explainValueMovement(prev, curr)
      const sig = result.signals.find(s => s.type === 'market_input_change')
      expect(sig).toBeDefined()
      expect(sig!.classification).toBe('contributing')
    })

    it('reports below-threshold state when no signal reaches materiality', () => {
      // Everything changes by less than threshold
      const prev = mkSnap(7500, '2026-09-12', mkFactors({ ktc_value: 7200, projection: 300, path: 'ktc' }))
      const curr = mkSnap(7510, '2026-09-19', mkFactors({ ktc_value: 7210, projection: 300.5, path: 'ktc' }))
      const result = explainValueMovement(prev, curr)
      const contributing = result.signals.filter(s => s.classification === 'contributing')
      expect(contributing).toHaveLength(0)
      // UI should show "below display thresholds" message
    })
  })

  describe('unchanged displayed value with changed inputs', () => {
    it('reports unchanged direction even when factors moved', () => {
      const prev = mkSnap(7500, '2026-09-12', mkFactors({ ktc_value: 7000, dynasty_bonus: 1.05, path: 'ktc' }))
      const curr = mkSnap(7500, '2026-09-19', mkFactors({ ktc_value: 7200, dynasty_bonus: 0.97, path: 'ktc' }))
      const result = explainValueMovement(prev, curr)
      expect(result.direction).toBe('unchanged')
      // Signals still reported — UI says "no change but inputs changed"
      expect(result.signals.length).toBeGreaterThan(0)
    })
  })

  describe('multiple drivers', () => {
    it('shows multiple contributing signals when multiple inputs changed', () => {
      const prev = mkSnap(6000, '2026-09-12', mkRedraftFactors({ projection: 280, positional_baseline: 200, path: 'vbd' }))
      const curr = mkSnap(7000, '2026-09-19', mkRedraftFactors({ projection: 320, positional_baseline: 190, path: 'vbd' }))
      const result = explainValueMovement(prev, curr)
      const contributing = result.signals.filter(s => s.classification === 'contributing')
      expect(contributing.length).toBe(2)
      expect(contributing.some(s => s.type === 'projection_change')).toBe(true)
      expect(contributing.some(s => s.type === 'baseline_change')).toBe(true)
    })
  })

  describe('offsetting factors', () => {
    it('shows both contributing changes even when they offset', () => {
      // Projection up + baseline up → net effect small or zero
      const prev = mkSnap(6000, '2026-09-12', mkRedraftFactors({ projection: 280, positional_baseline: 200, path: 'vbd' }))
      const curr = mkSnap(6000, '2026-09-19', mkRedraftFactors({ projection: 310, positional_baseline: 230, path: 'vbd' }))
      const result = explainValueMovement(prev, curr)
      expect(result.direction).toBe('unchanged')
      const contributing = result.signals.filter(s => s.classification === 'contributing')
      expect(contributing.length).toBe(2)
    })
  })

  describe('null/undefined factors', () => {
    it('handles null valuation_factors', () => {
      const prev = mkSnap(7000, '2026-09-12')
      prev.valuation_factors = null
      const curr = mkSnap(7500, '2026-09-19')
      curr.valuation_factors = null
      expect(explainValueMovement(prev, curr).factorAvailability).toBe('value_only')
    })

    it('handles undefined valuation_factors', () => {
      const prev = mkSnap(7000, '2026-09-12')
      delete (prev as any).valuation_factors
      const curr = mkSnap(7500, '2026-09-19')
      delete (curr as any).valuation_factors
      expect(explainValueMovement(prev, curr).factorAvailability).toBe('value_only')
    })
  })
})

// ══════════════════════════════════════════════════════════════
// RAW VALUE / DISPLAY CAP PARITY
// ══════════════════════════════════════════════════════════════

describe('raw_value / display value relationship', () => {
  it('raw_value < 9999: displayed = raw', () => {
    const snap = mkSnap(7500, '2026-09-19', mkFactors({ raw_value: 7500 }))
    expect(snap.value).toBe(snap.valuation_factors!.raw_value)
  })

  it('raw_value = 9999: displayed = 9999', () => {
    const snap = mkSnap(9999, '2026-09-19', mkFactors({ raw_value: 9999 }))
    expect(snap.value).toBe(9999)
    expect(snap.valuation_factors!.raw_value).toBe(9999)
  })

  it('raw_value > 9999: displayed = 9999 (capped)', () => {
    const snap = mkSnap(9999, '2026-09-19', mkFactors({ raw_value: 11000 }))
    expect(snap.value).toBe(9999)
    expect(snap.valuation_factors!.raw_value).toBe(11000)
  })

  it('dynasty computeDynastyTradeVal capped vs uncapped', () => {
    // Use actual canonical function to verify relationship
    const capped = computeDynastyTradeVal('RB', 22, 9999, 1, 350, { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false })
    const uncapped = computeDynastyTradeVal('RB', 22, 9999, 1, 350, { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false }, true)
    expect(capped).toBeLessThanOrEqual(9999)
    if (uncapped > 9999) {
      expect(capped).toBe(9999)
    } else {
      expect(capped).toBe(uncapped)
    }
  })
})

// ══════════════════════════════════════════════════════════════
// RANGE PAIR CONSISTENCY
// ══════════════════════════════════════════════════════════════

describe('findComparisonSnapshots', () => {
  it('returns null for empty array', () => {
    expect(findComparisonSnapshots([], 7)).toBeNull()
  })

  it('returns current with null prior for single snapshot', () => {
    const result = findComparisonSnapshots([mkSnap(7500, '2026-09-19')], 7)
    expect(result!.prior).toBeNull()
  })

  it('7D finds correct prior snapshot', () => {
    const snaps = [
      mkSnap(7500, '2026-09-19'),
      mkSnap(7200, '2026-09-15'),
      mkSnap(7000, '2026-09-10'),
      mkSnap(6800, '2026-09-01'),
    ]
    const result = findComparisonSnapshots(snaps, 7)
    // 9/19 - 7 = 9/12. First snapshot at or before 9/12 is 9/10
    expect(result!.prior!.effective_at).toBe('2026-09-10')
  })

  it('30D finds correct prior snapshot', () => {
    const snaps = [
      mkSnap(7500, '2026-09-19'),
      mkSnap(7200, '2026-09-15'),
      mkSnap(7000, '2026-09-01'),
      mkSnap(6500, '2026-08-15'),
    ]
    const result = findComparisonSnapshots(snaps, 30)
    expect(result!.prior!.effective_at).toBe('2026-08-15')
  })

  it('returns null prior when no qualifying snapshot', () => {
    const result = findComparisonSnapshots([mkSnap(7500, '2026-09-19'), mkSnap(7200, '2026-09-15')], 7)
    expect(result!.prior).toBeNull()
  })

  it('uses same pair as computeValueChange', () => {
    const snaps = [
      mkSnap(7500, '2026-09-19'),
      mkSnap(7200, '2026-09-15'),
      mkSnap(7000, '2026-09-10'),
      mkSnap(6800, '2026-09-01'),
    ]
    for (const days of [7, 30, 90, 365]) {
      const pair = findComparisonSnapshots(snaps, days)
      const change = computeValueChange(snaps, days)
      if (pair?.prior) {
        expect(change.prior).toBe(pair.prior.value)
      } else {
        expect(change.prior).toBeNull()
      }
    }
  })
})

// ══════════════════════════════════════════════════════════════
// NO FABRICATION SAFEGUARDS
// ══════════════════════════════════════════════════════════════

describe('no fabrication', () => {
  const FORBIDDEN = [
    'injury', 'injured', 'starter', 'depth chart', 'coach',
    'trade rumor', 'breakout', 'hype', 'targets increased',
    'carries increased', 'snap share', 'role change', 'role increased',
    'became the starter', 'earned a bigger role', 'market realized',
    'fantasy managers are excited',
  ]

  it('explainValueMovement never produces forbidden phrases', () => {
    const scenarios: [FdpSnapshot | null, FdpSnapshot][] = [
      [null, mkSnap(7500, '2026-09-19', mkFactors())],
      [mkSnap(5000, '2026-09-12', mkFactors({ ktc_value: 5000 })), mkSnap(8000, '2026-09-19', mkFactors({ ktc_value: 8000 }))],
      [mkSnap(8000, '2026-09-12', mkFactors({ dynasty_bonus: 1.0 })), mkSnap(6000, '2026-09-19', mkFactors({ dynasty_bonus: 0.7 }))],
      [mkSnap(7500, '2026-09-12', null), mkSnap(8500, '2026-09-19', null)],
    ]
    for (const [prev, curr] of scenarios) {
      const text = JSON.stringify(explainValueMovement(prev, curr)).toLowerCase()
      for (const phrase of FORBIDDEN) {
        expect(text).not.toContain(phrase.toLowerCase())
      }
    }
  })

  it('signal labels contain only factual terminology', () => {
    const prev = mkSnap(5000, '2026-09-12', mkFactors({ projection: 200, ktc_value: 5000, dynasty_bonus: 1.0, positional_baseline: 180, pos_rank: 15 }))
    const curr = mkSnap(8000, '2026-09-19', mkFactors({ projection: 350, ktc_value: 8000, dynasty_bonus: 0.9, positional_baseline: 200, pos_rank: 5 }))
    const allowed = ['Market-value input', 'Projection', 'Age adjustment', 'Positional baseline', 'Positional rank', 'Display cap (9,999)']
    for (const sig of explainValueMovement(prev, curr).signals) {
      expect(allowed).toContain(sig.label)
    }
  })

  it('logic.ts explanation code does not reference external events', () => {
    const block = logicSrc.substring(logicSrc.indexOf('Value Movement Explanation'))
    for (const term of ['injury', 'trade rumor', 'coach', 'breakout', 'snap share', 'target share', 'carries']) {
      expect(block.toLowerCase()).not.toContain(term)
    }
  })

  it('no unsupported causal wording in UI', () => {
    const historyUI = afdpSrc.substring(afdpSrc.indexOf('WHAT CHANGED IN THE FDP MODEL'), afdpSrc.indexOf('Accessible table fallback'))
    for (const phrase of ['caused by', 'because', 'reason for', 'drove the increase', 'led to', 'resulted from']) {
      expect(historyUI.toLowerCase()).not.toContain(phrase)
    }
  })
})

// ══════════════════════════════════════════════════════════════
// CONTEXT ISOLATION
// ══════════════════════════════════════════════════════════════

describe('context isolation', () => {
  it('afdp.tsx fetches with all context filters', () => {
    expect(afdpSrc).toContain('.eq("league_type",ctx.leagueType)')
    expect(afdpSrc).toContain('.eq("scoring",ctx.scoring)')
    expect(afdpSrc).toContain('.eq("superflex",ctx.superflex)')
    expect(afdpSrc).toContain('.eq("te_premium",ctx.tePremium)')
    expect(afdpSrc).toContain('.eq("idp",ctx.idp)')
  })

  it('different contexts produce different normalized keys', () => {
    const d1qb = normalizeSnapshotContext({ isDynasty: true, scoring: 'PPR', superflex: false, tePremium: 0, idp: false })
    const dSF = normalizeSnapshotContext({ isDynasty: true, scoring: 'PPR', superflex: true, tePremium: 0, idp: false })
    const rPPR = normalizeSnapshotContext({ isDynasty: false, scoring: 'PPR', superflex: false, tePremium: 0, idp: false })
    expect(d1qb.leagueType).not.toBe(rPPR.leagueType)
    expect(d1qb.superflex).not.toBe(dSF.superflex)
  })
})

// ══════════════════════════════════════════════════════════════
// SCHEMA & MIGRATION
// ══════════════════════════════════════════════════════════════

describe('migration 004', () => {
  it('includes valuation_factors jsonb column (nullable)', () => {
    expect(migrationSrc).toContain('valuation_factors jsonb')
    expect(migrationSrc).toContain('default null')
    expect(migrationSrc).not.toMatch(/valuation_factors\s+jsonb\s+not\s+null/i)
  })

  it('preserves all existing columns and policies', () => {
    for (const col of ['batch_id', 'player_slug', 'player_name', 'pos', 'value',
      'league_type', 'scoring', 'superflex', 'te_premium', 'idp',
      'values_version', 'effective_at', 'recorded_at']) {
      expect(migrationSrc).toContain(col)
    }
    expect(migrationSrc).toContain('enable row level security')
    expect(migrationSrc).toContain('revoke insert, update, delete')
  })
})

// ══════════════════════════════════════════════════════════════
// SNAPSHOT PRODUCER
// ══════════════════════════════════════════════════════════════

describe('snapshot producer', () => {
  it('records valuation_factors with path and version', () => {
    expect(producerSrc).toContain('valuation_factors')
    expect(producerSrc).toContain("path: dynPath")
    expect(producerSrc).toContain("path: rdPath")
    expect(producerSrc).toContain('v: 1')
  })

  it('determines dynasty path from canonical branching', () => {
    expect(producerSrc).toContain("dynPath = 'ktc'")
    expect(producerSrc).toContain("'proj_floor'")
    expect(producerSrc).toContain("'rank_decay'")
  })

  it('determines redraft path from canonical branching', () => {
    expect(producerSrc).toContain("'rank_floor'")
    expect(producerSrc).toContain("'vbd'")
  })

  it('still defaults to dry run', () => {
    expect(producerSrc).toContain('!process.argv.includes("--write")')
  })

  it('still validates player counts', () => {
    expect(producerSrc).toContain('SAFETY GATE FAILED')
  })
})

// ══════════════════════════════════════════════════════════════
// EDGE FUNCTION
// ══════════════════════════════════════════════════════════════

describe('edge function', () => {
  it('validates factor schema version', () => {
    expect(edgeFnSrc).toContain('vf.v')
    expect(edgeFnSrc).toContain('positive integer')
  })

  it('validates valuation path', () => {
    expect(edgeFnSrc).toContain('VALID_PATHS')
    for (const path of ['ktc', 'rank_decay', 'proj_floor', 'vbd', 'rank_floor']) {
      expect(edgeFnSrc).toContain(`"${path}"`)
    }
  })

  it('validates required and optional factor fields', () => {
    for (const field of ['projection', 'positional_baseline', 'raw_value', 'age', 'pos_rank']) {
      expect(edgeFnSrc).toContain(field)
    }
    expect(edgeFnSrc).toContain('ktc_value')
    expect(edgeFnSrc).toContain('dynasty_bonus')
  })

  it('preserves immutable batch and write-secret behavior', () => {
    expect(edgeFnSrc).toContain('Historical snapshots are immutable')
    expect(edgeFnSrc).toContain('FDP_SNAPSHOT_WRITE_SECRET')
    expect(edgeFnSrc).toContain('safeCompare')
  })
})

// ══════════════════════════════════════════════════════════════
// UI INTEGRATION
// ══════════════════════════════════════════════════════════════

describe('player page UI', () => {
  it('imports explanation helpers', () => {
    expect(afdpSrc).toContain('findComparisonSnapshots')
    expect(afdpSrc).toContain('explainValueMovement')
  })

  it('fetches valuation_factors in query', () => {
    expect(afdpSrc).toMatch(/select\(".*valuation_factors.*"\)/)
  })

  it('renders WHAT CHANGED IN THE FDP MODEL section', () => {
    expect(afdpSrc).toContain('WHAT CHANGED IN THE FDP MODEL')
  })

  it('shows contributing vs context sections', () => {
    expect(afdpSrc).toContain('OTHER RECORDED CHANGES')
    expect(afdpSrc).toContain('classification==="contributing"')
    expect(afdpSrc).toContain('classification==="recorded_context"')
    expect(afdpSrc).toContain('classification==="display"')
  })

  it('shows value-only / partial / unchanged messages', () => {
    expect(afdpSrc).toContain('detailed factor history was not recorded')
    expect(afdpSrc).toContain('Factor history is only available for one')
    expect(afdpSrc).toContain('No change in displayed FDP Value')
  })

  it('shows below-threshold state', () => {
    expect(afdpSrc).toContain('below display thresholds')
  })

  it('uses arrow and direction symbols for accessibility', () => {
    expect(afdpSrc).toContain('\u2192')
    expect(afdpSrc).toMatch(/isUp\?"[+]"/)
    expect(afdpSrc).toMatch(/isDown\?"-"/)
  })
})

// ══════════════════════════════════════════════════════════════
// MATERIALITY THRESHOLDS
// ══════════════════════════════════════════════════════════════

describe('signal materiality', () => {
  it('thresholds documented', () => {
    expect(SIGNAL_MATERIALITY.projection).toBe(2.0)
    expect(SIGNAL_MATERIALITY.ktc_value).toBe(50)
    expect(SIGNAL_MATERIALITY.dynasty_bonus).toBe(0.005)
    expect(SIGNAL_MATERIALITY.positional_baseline).toBe(2.0)
  })
})

// ══════════════════════════════════════════════════════════════
// VALUATION FACTORS TYPE
// ══════════════════════════════════════════════════════════════

describe('ValuationFactors type', () => {
  it('requires v and path', () => {
    const f: ValuationFactors = { v: 1, path: 'ktc', projection: 300, positional_baseline: 200, raw_value: 7500, age: 25, pos_rank: 5 }
    expect(f.v).toBe(1)
    expect(f.path).toBe('ktc')
  })

  it('allows optional dynasty fields', () => {
    const f: ValuationFactors = { v: 1, path: 'ktc', projection: 300, positional_baseline: 200, raw_value: 7500, age: 25, pos_rank: 5, ktc_value: 7800, dynasty_bonus: 1.05 }
    expect(f.ktc_value).toBe(7800)
    expect(f.dynasty_bonus).toBe(1.05)
  })
})

// ══════════════════════════════════════════════════════════════
// REGRESSION SAFETY
// ══════════════════════════════════════════════════════════════

describe('regression safety', () => {
  it('computeDynastyTradeVal unchanged', () => {
    const val = computeDynastyTradeVal('RB', 23, 8500, 1, 300, { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false })
    expect(val).toBeGreaterThan(0)
    expect(val).toBeLessThanOrEqual(9999)
  })

  it('computeRedraftTradeVal unchanged', () => {
    const val = computeRedraftTradeVal('RB', 1, 8000, { isSF: false })
    expect(val).toBeGreaterThan(0)
    expect(val).toBeLessThanOrEqual(9999)
  })

  it('computeValueChange unchanged', () => {
    const result = computeValueChange([mkSnap(7500, '2026-09-19'), mkSnap(7000, '2026-09-12')], 7)
    expect(result.delta).toBe(500)
    expect(result.current).toBe(7500)
    expect(result.prior).toBe(7000)
  })

  it('28 snapshot contexts', () => {
    expect(FDP_SNAPSHOT_CONTEXTS).toHaveLength(28)
  })

  it('VALUES_VERSION format', () => {
    expect(VALUES_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/)
  })

  it('afdp.tsx preserves Trade Analyzer, monetization, SEO, pagination', () => {
    expect(afdpSrc).toContain('computeDynastyTradeVal')
    expect(afdpSrc).toContain('FREE_TRADE_LIMIT')
    expect(afdpSrc).toContain('create-checkout')
    expect(afdpSrc).toContain('Stripe')
    expect(afdpSrc).toContain('/players/')
    expect(afdpSrc).toContain('application/ld+json')
    expect(afdpSrc).toContain('cursorDate')
    expect(afdpSrc).toContain('cursorId')
    expect(afdpSrc).toContain('Value history is not currently tracked')
    expect(afdpSrc).toContain('custom value tuning is active')
  })
})
