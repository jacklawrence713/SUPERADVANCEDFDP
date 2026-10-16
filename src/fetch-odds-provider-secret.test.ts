import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * REGRESSION TEST: Provider Secret Configuration
 *
 * Ensures fetch-odds uses the correct production secret name.
 *
 * Root cause of 2026-10-16 incident:
 * - Production secret: THE_ODDS_API
 * - Code was looking for: THE_ODDS_API_KEY
 * - Result: Empty unavailable response, no provider call
 */

const fetchOddsPath = path.resolve('./supabase/functions/fetch-odds/index.ts');
const fetchOddsSrc = fs.readFileSync(fetchOddsPath, 'utf-8');

describe('fetch-odds Provider Secret Configuration', () => {

  it('Uses THE_ODDS_API environment variable (not THE_ODDS_API_KEY)', () => {
    // Production has secret: THE_ODDS_API
    // Code must look for: THE_ODDS_API
    expect(fetchOddsSrc).toContain('Deno.env.get("THE_ODDS_API")');
  });

  it('Checks that provider API key is not empty before use', () => {
    expect(fetchOddsSrc).toContain('if (!apiKey)');
  });

  it('Returns unavailable response if provider secret is missing', () => {
    expect(fetchOddsSrc).toContain('source: "unavailable"');
    expect(fetchOddsSrc).toContain('THE_ODDS_API not set');
  });

  it('Uses correct provider hostname', () => {
    expect(fetchOddsSrc).toContain('https://api.the-odds-api.com');
  });

  it('Requests correct sport/regions/markets', () => {
    expect(fetchOddsSrc).toContain('americanfootball_nfl');
    expect(fetchOddsSrc).toContain('regions=us');
    expect(fetchOddsSrc).toContain('markets=spreads,totals');
  });

  it('Does not use hardcoded API key', () => {
    // Never hardcode secrets in source code
    expect(fetchOddsSrc).not.toMatch(/apiKey=[\da-zA-Z]/);
  });

});
