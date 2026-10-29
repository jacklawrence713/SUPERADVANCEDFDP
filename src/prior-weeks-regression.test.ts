import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('P0: Prior Weeks orphaned variable regression', () => {
  it('should not reference historicalPropResults in afdp.tsx', () => {
    const afdpPath = resolve(__dirname, '../afdp.tsx');
    const content = readFileSync(afdpPath, 'utf-8');

    // Verify no references to the orphaned historical props state
    expect(content).not.toMatch(/historicalPropResults\[/);
    expect(content).not.toMatch(/historicalPropResults,/);
  });

  it('should not reference propGradingInProgress in afdp.tsx', () => {
    const afdpPath = resolve(__dirname, '../afdp.tsx');
    const content = readFileSync(afdpPath, 'utf-8');

    // Verify no references to the orphaned grading state
    expect(content).not.toMatch(/propGradingInProgress\[/);
    expect(content).not.toMatch(/propGradingInProgress,/);
  });

  it('should not have orphaned Graded Props comment block', () => {
    const afdpPath = resolve(__dirname, '../afdp.tsx');
    const content = readFileSync(afdpPath, 'utf-8');

    // Verify the orphaned comment block is removed
    expect(content).not.toMatch(/Graded Props \(from database\)/);
  });

  it('should still have Prior Weeks section intact', () => {
    const afdpPath = resolve(__dirname, '../afdp.tsx');
    const content = readFileSync(afdpPath, 'utf-8');

    // Verify Prior Weeks section still exists
    expect(content).toMatch(/Prior Weeks Results/);
    expect(content).toMatch(/PAST_WEEKS\.slice\(\)\.reverse\(\)/);
  });

  it('should still have game score display intact', () => {
    const afdpPath = resolve(__dirname, '../afdp.tsx');
    const content = readFileSync(afdpPath, 'utf-8');

    // Verify game results rendering still works
    expect(content).toMatch(/pwGames\.map/);
    expect(content).toMatch(/spreadCover/);
    expect(content).toMatch(/ouResult/);
  });

  it('should still have ATS/O-U results intact', () => {
    const afdpPath = resolve(__dirname, '../afdp.tsx');
    const content = readFileSync(afdpPath, 'utf-8');

    // Verify ATS and O/U grading still present
    expect(content).toMatch(/FAVORITES/);
    expect(content).toMatch(/DOGS/);
  });
});
