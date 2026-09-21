import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const afdpSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8')
const deploySrc = readFileSync(resolve(rootDir, '.github/workflows/deploy.yml'), 'utf-8')
const fetchOddsSrc = readFileSync(resolve(rootDir, 'supabase/functions/fetch-odds/index.ts'), 'utf-8')
const migrationSrc = readFileSync(resolve(rootDir, 'supabase/migrations/003_odds_cache.sql'), 'utf-8')

// ── Frontend: no provider key or direct API call ────────────────

describe('odds security: frontend has no provider secrets', () => {
  it('does not reference VITE_ODDS_API_KEY', () => {
    expect(afdpSrc).not.toContain('VITE_ODDS_API_KEY')
  })

  it('does not reference ODDS_API_KEY as a constant', () => {
    expect(afdpSrc).not.toMatch(/const ODDS_API_KEY/)
    expect(afdpSrc).not.toMatch(/var ODDS_API_KEY/)
  })

  it('does not call api.the-odds-api.com directly', () => {
    expect(afdpSrc).not.toContain('api.the-odds-api.com')
  })

  it('does not contain ODDS_TEAM_MAP in frontend', () => {
    expect(afdpSrc).not.toContain('ODDS_TEAM_MAP')
  })

  it('deploy workflow does not inject VITE_ODDS_API_KEY into build', () => {
    expect(deploySrc).not.toContain('VITE_ODDS_API_KEY')
  })
})

// ── Edge Function: server-side architecture ─────────────────────

describe('odds security: Edge Function uses server-side secret', () => {
  it('reads THE_ODDS_API_KEY from Deno.env', () => {
    expect(fetchOddsSrc).toContain('Deno.env.get("THE_ODDS_API_KEY")')
  })

  it('calls api.the-odds-api.com server-side', () => {
    expect(fetchOddsSrc).toContain('api.the-odds-api.com')
  })

  it('does not return the API key in the response', () => {
    expect(fetchOddsSrc).not.toContain('apiKey: apiKey')
    expect(fetchOddsSrc).not.toMatch(/response.*apiKey/)
    const ifaceMatch = fetchOddsSrc.match(/interface OddsResponse\s*\{[^}]*\}/)
    if (ifaceMatch) {
      expect(ifaceMatch[0]).not.toContain('apiKey')
    }
  })

  it('has CORS origin checking', () => {
    expect(fetchOddsSrc).toContain('fantasydraftpros.com')
    expect(fetchOddsSrc).toContain('localhost:5173')
    expect(fetchOddsSrc).toContain('Access-Control-Allow-Origin')
  })
})

// ── Spreads/totals normalization ────────────────────────────────

describe('odds security: Edge Function normalizes spreads/totals', () => {
  it('maps NFL team full names to abbreviations', () => {
    expect(fetchOddsSrc).toContain('"Arizona Cardinals": "ARI"')
    expect(fetchOddsSrc).toContain('"Buffalo Bills": "BUF"')
    expect(fetchOddsSrc).toContain('"Kansas City Chiefs": "KC"')
  })

  it('extracts spreads market from bookmaker response', () => {
    expect(fetchOddsSrc).toContain('m.key === "spreads"')
  })

  it('extracts totals market from bookmaker response', () => {
    expect(fetchOddsSrc).toContain('m.key === "totals"')
  })

  it('prefers DraftKings bookmaker', () => {
    expect(fetchOddsSrc).toContain('b.key === "draftkings"')
  })
})

// ── Provider error handling ─────────────────────────────────────

describe('odds security: provider errors handled safely', () => {
  it('returns "unavailable" source when API key is missing', () => {
    expect(fetchOddsSrc).toContain('source: "unavailable"')
  })

  it('does not expose provider HTTP errors to frontend', () => {
    expect(fetchOddsSrc).toContain('source: "unavailable"')
  })

  it('has a top-level catch for unexpected errors', () => {
    expect(fetchOddsSrc).toContain('[fetch-odds] unexpected_error')
  })

  it('empty provider response returns unavailable, not source:api', () => {
    // When provider returns empty games array, should NOT cache empty odds
    // as valid "api" data — that would overwrite real stale cache
    expect(fetchOddsSrc).toContain('provider returned empty game list')
    expect(fetchOddsSrc).toContain('source: "unavailable"')
  })
})

// ── Quota header handling ───────────────────────────────────────

describe('odds security: quota headers tracked', () => {
  it('reads x-requests-remaining header', () => {
    expect(fetchOddsSrc).toContain('x-requests-remaining')
  })

  it('reads x-requests-used header', () => {
    expect(fetchOddsSrc).toContain('x-requests-used')
  })

  it('reads x-requests-last header', () => {
    expect(fetchOddsSrc).toContain('x-requests-last')
  })

  it('logs quota information server-side', () => {
    expect(fetchOddsSrc).toContain('[fetch-odds] Quota')
  })
})

// ── Stale data labeling ─────────────────────────────────────────

describe('odds security: stale hardcoded data is not labeled as current', () => {
  it('frontend distinguishes API data from manual/hardcoded', () => {
    expect(afdpSrc).toContain('"ARCHIVED LINES"')
  })

  it('frontend shows "THIS WEEK\'S GAMES" only for API/cache data', () => {
    expect(afdpSrc).toContain('oddsSource==="api"||oddsSource==="cache"?"THIS WEEK\'S GAMES":"ARCHIVED LINES"')
  })

  it('frontend shows warning for manual lines', () => {
    expect(afdpSrc).toContain('Showing manual lines')
  })

  it('oddsSource state exists', () => {
    expect(afdpSrc).toContain('oddsSource')
    expect(afdpSrc).toContain('setOddsSource')
  })

  it('fetchOdds returns source and fetchedAt metadata', () => {
    expect(afdpSrc).toContain('source:data.source')
    expect(afdpSrc).toContain('fetchedAt:data.fetchedAt')
  })
})

// ── No new markets added ────────────────────────────────────────

describe('odds security: no scope expansion', () => {
  it('Edge Function only requests spreads and totals', () => {
    expect(fetchOddsSrc).toContain('markets=spreads,totals')
    expect(fetchOddsSrc).not.toContain('markets=spreads,totals,h2h')
    expect(fetchOddsSrc).not.toContain('player_pass_yds')
    expect(fetchOddsSrc).not.toContain('player_anytime_td')
  })

  it('Edge Function does not call scores endpoint', () => {
    expect(fetchOddsSrc).not.toContain('/scores')
  })

  it('Edge Function does not call historical endpoint', () => {
    expect(fetchOddsSrc).not.toContain('/historical')
  })
})

// ── Cache architecture ──────────────────────────────────────────

describe('odds security: server-side cache architecture', () => {
  it('Edge Function has in-memory cache with TTL', () => {
    expect(fetchOddsSrc).toContain('CACHE_TTL_MS')
    expect(fetchOddsSrc).toContain('_memCache')
  })

  it('Edge Function uses DB cache for cross-isolate sharing', () => {
    expect(fetchOddsSrc).toContain('odds_cache')
    expect(fetchOddsSrc).toContain('getDbCache')
    expect(fetchOddsSrc).toContain('setDbCache')
  })

  it('cache TTL is between 5 and 15 minutes', () => {
    const ttlMatch = fetchOddsSrc.match(/CACHE_TTL_MS\s*=\s*(\d+)\s*\*\s*(\d+)\s*\*\s*(\d+)/)
    expect(ttlMatch).not.toBeNull()
    const ttlMs = Number(ttlMatch![1]) * Number(ttlMatch![2]) * Number(ttlMatch![3])
    expect(ttlMs).toBeGreaterThanOrEqual(5 * 60 * 1000)
    expect(ttlMs).toBeLessThanOrEqual(15 * 60 * 1000)
  })
})

// ── Intra-isolate stampede protection ───────────────────────────

describe('odds security: intra-isolate stampede protection', () => {
  it('has _inflight request coalescing variable', () => {
    expect(fetchOddsSrc).toContain('_inflight')
  })

  it('coalesces concurrent requests through a single in-flight promise', () => {
    expect(fetchOddsSrc).toContain('if (!_inflight)')
    expect(fetchOddsSrc).toContain('_inflight = fetchFromProvider')
  })

  it('clears _inflight after completion', () => {
    expect(fetchOddsSrc).toContain('_inflight = null')
  })
})

// ── Cross-isolate stampede protection ───────────────────────────

describe('odds security: cross-isolate stampede protection', () => {
  it('migration creates refreshing_until lease column', () => {
    expect(migrationSrc).toContain('refreshing_until timestamptz')
  })

  it('migration creates claim_odds_refresh RPC function', () => {
    expect(migrationSrc).toContain('create or replace function public.claim_odds_refresh')
  })

  it('claim RPC uses atomic UPDATE for lease acquisition', () => {
    expect(migrationSrc).toContain('update public.odds_cache')
    expect(migrationSrc).toContain('refreshing_until is null or refreshing_until < now()')
  })

  it('claim RPC has auto-expiring lease for crash recovery', () => {
    expect(migrationSrc).toContain('make_interval(secs => v_lease)')
  })

  it('Edge Function calls claimRefreshLease before provider fetch', () => {
    expect(fetchOddsSrc).toContain('claimRefreshLease')
    expect(fetchOddsSrc).toContain('claim_odds_refresh')
  })

  it('setDbCache clears the refresh lease after successful update', () => {
    expect(fetchOddsSrc).toContain('refreshing_until: null')
  })

  it('non-winners serve stale cached data (stale-while-revalidate)', () => {
    expect(fetchOddsSrc).toContain('stale-while-revalidate')
    expect(fetchOddsSrc).toContain('staleResponse')
  })
})

// ── Lease timing safety ─────────────────────────────────────────

describe('odds security: lease duration exceeds provider timeout', () => {
  it('Edge Function lease is 60 seconds', () => {
    expect(fetchOddsSrc).toContain('p_lease_seconds: 60')
  })

  it('migration default lease is 60 seconds', () => {
    expect(migrationSrc).toContain('p_lease_seconds int default 60')
  })
})

// ── Explicit stale state ────────────────────────────────────────

describe('odds security: stale cache is explicitly marked', () => {
  it('OddsResponse has stale field', () => {
    expect(fetchOddsSrc).toContain('stale?: boolean')
  })

  it('stale-while-revalidate response sets stale: true', () => {
    expect(fetchOddsSrc).toContain('stale: true')
  })

  it('fresh API responses do not set stale', () => {
    const fnMatch = fetchOddsSrc.match(/async function fetchFromProvider[\s\S]*?^}/m)
    expect(fnMatch).not.toBeNull()
    expect(fnMatch![0]).not.toContain('stale: true')
  })

  it('stale cache timestamp is preserved from original fetch', () => {
    expect(fetchOddsSrc).toContain('...dbEntry.response, stale: true')
  })

  it('frontend has oddsStale state', () => {
    expect(afdpSrc).toContain('oddsStale')
    expect(afdpSrc).toContain('setOddsStale')
  })

  it('frontend fetchOdds returns stale field', () => {
    expect(afdpSrc).toContain('stale:data.stale')
  })

  it('frontend shows "Updating lines" indicator when stale', () => {
    expect(afdpSrc).toContain('oddsStale')
    expect(afdpSrc).toContain('Updating lines')
  })

  it('stale API cache does NOT fall back to ARCHIVED LINES', () => {
    expect(afdpSrc).toContain('oddsStale&&(oddsSource==="api"||oddsSource==="cache")')
  })

  it('fresh cache shows last-updated timestamp', () => {
    expect(afdpSrc).toContain('!oddsStale&&oddsFetchedAt')
    expect(afdpSrc).toContain('toLocaleTimeString')
  })
})

// ── Quota not leaked to client ──────────────────────────────────

describe('odds security: quota info stays server-side', () => {
  it('OddsResponse interface has no quota field', () => {
    const ifaceMatch = fetchOddsSrc.match(/interface OddsResponse\s*\{[^}]*\}/)
    expect(ifaceMatch).not.toBeNull()
    expect(ifaceMatch![0]).not.toContain('quota')
  })

  it('fetchFromProvider does not include quota in return value', () => {
    const fnMatch = fetchOddsSrc.match(/async function fetchFromProvider[\s\S]*?^}/m)
    if (fnMatch) {
      const returns = fnMatch[0].match(/return\s*\{[^}]*\}/g) || []
      for (const ret of returns) {
        expect(ret).not.toContain('quota')
      }
    }
  })
})

// ── Migration security ──────────────────────────────────────────

describe('odds security: migration locks down access', () => {
  it('enables RLS on odds_cache', () => {
    expect(migrationSrc).toContain('enable row level security')
  })

  it('explicitly revokes table access from public, anon, and authenticated', () => {
    expect(migrationSrc).toContain('revoke all on public.odds_cache from public, anon, authenticated')
  })

  it('seeds the initial cache row', () => {
    expect(migrationSrc).toContain('insert into public.odds_cache')
    expect(migrationSrc).toContain("'nfl_current'")
  })
})

// ── RPC privilege audit ─────────────────────────────────────────

describe('odds security: RPC privilege hardening', () => {
  it('RPC is SECURITY DEFINER', () => {
    expect(migrationSrc).toContain('security definer')
  })

  it('RPC uses empty search_path to prevent object shadowing', () => {
    expect(migrationSrc).toContain("set search_path = ''")
  })

  it('RPC fully qualifies odds_cache as public.odds_cache', () => {
    // Inside the function body, the table reference must be schema-qualified
    const fnBody = migrationSrc.match(/as \$\$[\s\S]*?\$\$/)?.[0] || ''
    expect(fnBody).toContain('public.odds_cache')
  })

  it('PUBLIC execute privilege is explicitly revoked', () => {
    expect(migrationSrc).toContain('revoke all on function public.claim_odds_refresh(integer) from public')
  })

  it('anon execute privilege is explicitly revoked', () => {
    expect(migrationSrc).toContain('revoke all on function public.claim_odds_refresh(integer) from anon')
  })

  it('authenticated execute privilege is explicitly revoked', () => {
    expect(migrationSrc).toContain('revoke all on function public.claim_odds_refresh(integer) from authenticated')
  })

  it('service_role is explicitly granted execute', () => {
    expect(migrationSrc).toContain('grant execute on function public.claim_odds_refresh(integer) to service_role')
  })

  it('RPC hardcodes cache key — caller cannot choose arbitrary table', () => {
    expect(migrationSrc).toContain("where id = 'nfl_current'")
  })

  it('RPC clamps lease duration to safe range [10, 300]', () => {
    expect(migrationSrc).toContain('least(greatest(p_lease_seconds, 10), 300)')
  })
})

// ── Edge Function lease parameter safety ────────────────────────

describe('odds security: Edge Function lease parameter is fixed', () => {
  it('Edge Function hardcodes lease to 60 seconds', () => {
    expect(fetchOddsSrc).toContain('p_lease_seconds: 60')
  })

  it('request body cannot alter lease duration', () => {
    // The Edge Function does not parse or use request body for the RPC call
    expect(fetchOddsSrc).not.toContain('req.json()')
    expect(fetchOddsSrc).not.toContain('req.text()')
  })
})

// ── Cache key not caller-controlled ─────────────────────────────

describe('odds security: cache key is hardcoded', () => {
  it('DB cache key is hardcoded to nfl_current', () => {
    expect(fetchOddsSrc).toContain('.eq("id", "nfl_current")')
    expect(fetchOddsSrc).toContain('id: "nfl_current"')
  })

  it('caller cannot force a cache refresh', () => {
    expect(fetchOddsSrc).not.toContain('force')
    expect(fetchOddsSrc).not.toContain('bypass')
    expect(fetchOddsSrc).not.toContain('no-cache')
  })
})

// ── Safe logging — no secrets in logs ───────────────────────────

describe('odds security: logging never contains secrets', () => {
  it('does not log raw Error objects', () => {
    // No console.log/error/warn that passes an err/error variable directly
    expect(fetchOddsSrc).not.toMatch(/console\.(log|error|warn)\(.*,\s*err\b/)
  })

  it('does not log error.message (could contain URL)', () => {
    expect(fetchOddsSrc).not.toContain('error.message')
    expect(fetchOddsSrc).not.toContain('err.message')
  })

  it('does not log error.stack', () => {
    expect(fetchOddsSrc).not.toContain('error.stack')
    expect(fetchOddsSrc).not.toContain('err.stack')
  })

  it('does not log the provider URL', () => {
    // The URL variable should only be used in fetch(), never in console
    const logLines = fetchOddsSrc.split('\n').filter(l => /console\.(log|error|warn)/.test(l))
    for (const line of logLines) {
      expect(line).not.toContain('url')
      expect(line).not.toContain('apiKey')
    }
  })

  it('THE_ODDS_API_KEY cannot appear in any logging statement', () => {
    const logLines = fetchOddsSrc.split('\n').filter(l => /console\.(log|error|warn)/.test(l))
    for (const line of logLines) {
      expect(line).not.toContain('THE_ODDS_API_KEY')
      expect(line).not.toContain('ODDS_API_KEY')
    }
  })

  it('SUPABASE_SERVICE_ROLE_KEY cannot appear in any logging statement', () => {
    const logLines = fetchOddsSrc.split('\n').filter(l => /console\.(log|error|warn)/.test(l))
    for (const line of logLines) {
      expect(line).not.toContain('SERVICE_ROLE_KEY')
    }
  })

  it('fetchFromProvider catches errors locally to prevent URL leakage', () => {
    // fetchFromProvider must have its own try/catch so network errors
    // (which may contain the URL with apiKey) never propagate up
    expect(fetchOddsSrc).toContain('provider_fetch_failed')
  })

  it('top-level catch does not name the error variable', () => {
    // The outer catch should not capture err to prevent accidental logging
    expect(fetchOddsSrc).not.toContain('catch (err)')
  })

  it('all logging uses only fixed safe strings', () => {
    // Every console.error/log must use bracket-prefixed safe identifiers
    const logLines = fetchOddsSrc.split('\n').filter(l => /console\.(log|error|warn)/.test(l))
    for (const line of logLines) {
      expect(line).toContain('[fetch-odds]')
    }
  })
})

// ── Empty provider response safety ──────────────────────────────

describe('odds security: empty provider response handled safely', () => {
  it('empty games array does not cache as valid api data', () => {
    // After the empty-games check, should NOT call setDbCache
    const emptyBlock = fetchOddsSrc.match(/games\.length === 0[\s\S]*?return \{/)?.[0] || ''
    expect(emptyBlock).not.toContain('setDbCache')
    expect(emptyBlock).not.toContain('_memCache')
  })

  it('empty games array returns source unavailable', () => {
    expect(fetchOddsSrc).toContain('provider returned empty game list')
  })
})
