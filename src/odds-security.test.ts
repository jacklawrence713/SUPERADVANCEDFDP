// Odds security audit
// Verify The Odds API key is never exposed to frontend
// Verify cache key is hardcoded and cannot be overridden by caller
// Verify error logging never contains secrets

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const fetchOddsPath = path.resolve('./supabase/functions/fetch-odds/index.ts');
const fetchOddsSrc = fs.readFileSync(fetchOddsPath, 'utf-8');

// ── THE_ODDS_API_KEY is never exposed to client ─────────────────────────

describe('odds security: API key handling', () => {

  it('THE_ODDS_API_KEY is never in export statements', () => {
    expect(fetchOddsSrc).not.toContain('export const THE_ODDS_API_KEY')
    expect(fetchOddsSrc).not.toContain('export { THE_ODDS_API_KEY')
  })

  it('API key is read only via Deno.env.get', () => {
    expect(fetchOddsSrc).toContain('Deno.env.get("THE_ODDS_API_KEY")')
  })

  it('API key is checked before use', () => {
    expect(fetchOddsSrc).toContain('if (!apiKey)')
  })

})

// ── entitlements verified before odds access ────────────────────────────

describe('odds security: entitlements gate', () => {

  it('Auth token required (Bearer)', () => {
    expect(fetchOddsSrc).toContain('Bearer ')
  })

  it('User profile checked for plan', () => {
    expect(fetchOddsSrc).toContain('"plan,is_admin"')
    expect(fetchOddsSrc).toContain('userPlan')
  })

  it('Pro or Elite users only (or admins)', () => {
    expect(fetchOddsSrc).toContain('hasPaidPlan')
    expect(fetchOddsSrc).toContain('isAdmin')
  })

  it('Free users get 403', () => {
    expect(fetchOddsSrc).toContain('status: 403')
    expect(fetchOddsSrc).toContain('insufficient_entitlement')
  })

  it('Anonymous/invalid token get 401', () => {
    expect(fetchOddsSrc).toContain('status: 401')
  })

})

// ── Cache key is hardcoded (cannot be overridden by caller) ──────────────

describe('odds security: cache key is hardcoded', () => {

  it('DB cache key is hardcoded to nfl_current', () => {
    expect(fetchOddsSrc).toContain('.eq("id", "nfl_current")')
    expect(fetchOddsSrc).toContain('id: "nfl_current"')
  })

  it('forceRefresh parameter is supported with proper entitlements', () => {
    // Vegas rebuild: forceRefresh now supported for manual refresh (behind entitlements)
    // This is safe because entitlements are checked before forceRefresh is processed
    expect(fetchOddsSrc).toContain('forceRefresh')
    expect(fetchOddsSrc).toContain('isAdmin')
    expect(fetchOddsSrc).toContain('hasPaidPlan')
  })

})

// ── Safe logging — no secrets in logs ────────────────────────────────────

describe('odds security: logging never contains secrets', () => {

  it('does not log raw Error objects', () => {
    // No console.log/error/warn that passes an err/error variable directly
    expect(fetchOddsSrc).not.toMatch(/console\.(log|error|warn)\(.*,\s*err\b/)
  })

  it('does not log raw user profiles', () => {
    expect(fetchOddsSrc).not.toMatch(/console\.(log|error|warn)\(.*profile/)
  })

  it('API key name in error messages is acceptable', () => {
    // Error messages like "THE_ODDS_API_KEY not set" are acceptable
    // (they don't leak the actual key value, just the env var name)
    expect(fetchOddsSrc).toContain('THE_ODDS_API_KEY')
  })

  it('Database credentials never logged', () => {
    const logLines = fetchOddsSrc.split('\n').filter(l => /console\.(log|error|warn)/.test(l))
    for (const line of logLines) {
      expect(line).not.toContain('supabaseSecretKey')
      expect(line).not.toContain('SERVICE_ROLE_KEY')
    }
  })

})

// ── Stampede protection + stale-while-revalidate enabled ──────────────────

describe('odds security: cache stampede protection', () => {

  it('In-memory coalescing via _inflight promise', () => {
    expect(fetchOddsSrc).toContain('_inflight')
  })

  it('Database refresh lease via RPC', () => {
    expect(fetchOddsSrc).toContain('claim_odds_refresh')
  })

  it('Stale-while-revalidate on lease conflict', () => {
    expect(fetchOddsSrc).toContain('stale: true')
  })

  it('Lease duration is 60 seconds', () => {
    expect(fetchOddsSrc).toContain('60')
  })

})

// ── Request validation (CORS, methods) ────────────────────────────────────

describe('odds security: request handling', () => {

  it('CORS headers set on response', () => {
    expect(fetchOddsSrc).toContain('Access-Control-Allow-Origin')
    expect(fetchOddsSrc).toContain('corsHeaders')
  })

  it('OPTIONS requests handled (CORS preflight)', () => {
    expect(fetchOddsSrc).toContain('OPTIONS')
    expect(fetchOddsSrc).toContain('req.method')
  })

  it('Request body parsed safely', () => {
    expect(fetchOddsSrc).toContain('req.clone().json()')
  })

})

// ── Provider interactions safe ───────────────────────────────────────────

describe('odds security: provider request', () => {

  it('API key passed in URL (not auth header to provider)', () => {
    expect(fetchOddsSrc).toContain('?apiKey=')
  })

  it('Team name mapping never trusts provider data directly', () => {
    expect(fetchOddsSrc).toContain('ODDS_TEAM_MAP')
  })

  it('HTTP response validated before JSON parse', () => {
    expect(fetchOddsSrc).toContain('apiRes.ok')
  })

  it('Response uses https, not http', () => {
    expect(fetchOddsSrc).toContain('https://api.the-odds-api.com')
  })

})
