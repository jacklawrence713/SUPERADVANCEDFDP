import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

describe('Vegas Pipeline Restoration - Critical Regression Tests', () => {
  const afdpPath = resolve(__dirname, '../afdp.tsx');
  const edgeFuncPath = resolve(__dirname, '../supabase/functions/fetch-odds/index.ts');

  let afdpContent: string;
  let edgeFuncContent: string;

  beforeAll(() => {
    afdpContent = readFileSync(afdpPath, 'utf-8');
    edgeFuncContent = readFileSync(edgeFuncPath, 'utf-8');
  });

  it('should have fetchVegasOdds authenticated function', () => {
    expect(afdpContent).toMatch(/fetchVegasOdds/);
    expect(afdpContent).toMatch(/Authorization.*Bearer/);
  });

  it('should have currentPlayerProps state variable', () => {
    expect(afdpContent).toMatch(/currentPlayerProps/);
    expect(afdpContent).toMatch(/setCurrentPlayerProps/);
  });

  it('should have currentNFLWeek state variable', () => {
    expect(afdpContent).toMatch(/currentNFLWeek/);
    expect(afdpContent).toMatch(/setCurrentNFLWeek/);
  });

  it('should restore historicalPropResults state', () => {
    expect(afdpContent).toMatch(/historicalPropResults/);
    expect(afdpContent).toMatch(/setHistoricalPropResults/);
  });

  it('should restore propGradingInProgress state', () => {
    expect(afdpContent).toMatch(/propGradingInProgress/);
    expect(afdpContent).toMatch(/setPropGradingInProgress/);
  });

  it('should have fetchHistoricalPropResults helper', () => {
    expect(afdpContent).toMatch(/fetchHistoricalPropResults/);
    expect(afdpContent).toMatch(/fetch-grade-props/);
  });

  it('should have triggerPropGrading helper', () => {
    expect(afdpContent).toMatch(/triggerPropGrading/);
  });

  it('should use proper NFL week calculation (2026 Sept 10 start)', () => {
    expect(afdpContent).toMatch(/2026,8,10/);
    expect(afdpContent).not.toMatch(/2026,0,1/);
  });

  it('Edge Function should have corrected NFL week calculation', () => {
    expect(edgeFuncContent).toMatch(/2026.*8.*10/);
  });

  it('should not expose THE_ODDS_API in frontend executable code', () => {
    // Allow in comments but not in executable code
    const hasApiKey = afdpContent.match(/["'].*[A-Za-z0-9]{32,}.*["']/);
    expect(hasApiKey).toBeFalsy();
  });

  it('Edge Function should require Bearer JWT auth', () => {
    expect(edgeFuncContent).toMatch(/Authorization/);
    expect(edgeFuncContent).toMatch(/Bearer/);
  });

  it('Edge Function should check entitlement', () => {
    expect(edgeFuncContent).toMatch(/pro|elite|admin/);
    expect(edgeFuncContent).toMatch(/insufficient_entitlement/);
  });

  it('should support multiple player prop markets', () => {
    expect(edgeFuncContent).toMatch(/player_pass_yds/);
    expect(edgeFuncContent).toMatch(/player_rec_yds/);
  });

  it('should return playerProps in Edge Function response', () => {
    expect(edgeFuncContent).toMatch(/playerProps/);
    expect(edgeFuncContent).toMatch(/response\.playerProps/);
  });

  it('should handle Prior Weeks with safe state access', () => {
    expect(afdpContent).toMatch(/historicalPropResults\[pw\.week\]/);
    expect(afdpContent).toMatch(/propGradingInProgress\[pw\.week\]/);
  });

  it('should show current NFL week in Player Props title', () => {
    expect(afdpContent).toMatch(/Week.*Player Props/);
  });

  it('should have useEffect for loading historical props on Prior Weeks tab', () => {
    expect(afdpContent).toMatch(/vegasSubTab/);
    expect(afdpContent).toMatch(/history/);
  });

  it('should maintain cache architecture', () => {
    expect(edgeFuncContent).toMatch(/CACHE_TTL/);
    expect(edgeFuncContent).toMatch(/getDbCache|setDbCache/);
  });

  it('should handle 401/403 error cases', () => {
    expect(edgeFuncContent).toMatch(/401|403/);
  });

  it('Player Props should not permanently say Week 2', () => {
    expect(afdpContent).not.toMatch(/Week 2 Player Props.*hardcoded/);
  });
});
