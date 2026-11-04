import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Roster Impact Regression Tests', () => {
  const afdpSrc = readFileSync(resolve(__dirname, '../afdp.tsx'), 'utf-8');

  it('should initialize rosterImpact as null, not an incomplete object', () => {
    expect(afdpSrc).toContain('var rosterImpact=null;');
    // Ensure the old incomplete object initialization is removed
    expect(afdpSrc).not.toContain('var rosterImpact={ownr:[],lnA:null,lnB:null};');
  });

  it('should check all required rosterImpact properties before rendering', () => {
    // Should check bVal, aVal, delta, pgA, pgB existence
    const rosterImpactRenderCheck = afdpSrc.match(
      /ctx\.rosterImpact&&ctx\.rosterImpact\.bVal!=null&&ctx\.rosterImpact\.aVal!=null&&ctx\.rosterImpact\.delta!=null&&ctx\.rosterImpact\.pgA&&ctx\.rosterImpact\.pgB/
    );
    expect(rosterImpactRenderCheck).toBeTruthy();
  });

  it('should not render Roster Impact section when properties are missing', () => {
    // The conditional check should prevent rendering if any required property is undefined/null
    expect(afdpSrc).toContain('ctx.rosterImpact&&ctx.rosterImpact.bVal!=null');
    expect(afdpSrc).toContain('ctx.rosterImpact.aVal!=null');
    expect(afdpSrc).toContain('ctx.rosterImpact.delta!=null');
  });

  it('should preserve Trade Analyzer functionality', () => {
    // Ensure analyze trade button handler exists
    expect(afdpSrc).toContain('callEdgeFn("analyze-trade"');
    // Ensure trade context is still computed
    expect(afdpSrc).toContain('var tradeContext=useMemo');
  });

  it('should preserve posImpact rendering when available', () => {
    // posImpact should still render independently
    expect(afdpSrc).toContain('ctx.posImpact.length>0&&React.createElement');
  });

  it('should not crash when accessing undefined tradeVal properties', () => {
    // The code should use fallback operators for trade values
    expect(afdpSrc).toMatch(/\(.*\.tradeVal.*\|\|.*0.*\)/);
  });
});
