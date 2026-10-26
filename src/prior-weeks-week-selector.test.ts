import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

describe('Prior Weeks Week Selector - Regression Tests', () => {
  const afdpPath = resolve(__dirname, '../afdp.tsx');
  let afdpContent: string;

  beforeAll(() => {
    afdpContent = readFileSync(afdpPath, 'utf-8');
  });

  it('should have selectedHistoryWeek state variable', () => {
    expect(afdpContent).toMatch(/selectedHistoryWeek/);
    expect(afdpContent).toMatch(/setSelectedHistoryWeek/);
  });

  it('should have week selector dropdown in Prior Weeks', () => {
    expect(afdpContent).toMatch(/React.createElement\("select"/);
    expect(afdpContent).toMatch(/selectedHistoryWeek/);
    expect(afdpContent).toMatch(/Week:/);
  });

  it('should generate week options dynamically from PAST_WEEKS', () => {
    expect(afdpContent).toMatch(/PAST_WEEKS.map.*option/);
    expect(afdpContent).not.toMatch(/Week 1.*Week 2.*Week 3.*Week 4.*Week 5.*Week 6.*Week 7/);
  });

  it('should default to most recent completed week', () => {
    expect(afdpContent).toMatch(/selectedHistoryWeek/);
    expect(afdpContent).toMatch(/PAST_WEEKS\[PAST_WEEKS\.length-1\]\.week/);
  });

  it('should find and render only selected week', () => {
    expect(afdpContent).toMatch(/selectedHistory=PAST_WEEKS.find/);
    expect(afdpContent).toMatch(/selectedHistoryWeek/);
    expect(afdpContent).toMatch(/var pw=selectedHistory/);
  });

  it('should NOT use map to render all weeks simultaneously', () => {
    // Should not have PAST_WEEKS.slice().reverse().map rendering all weeks
    const mapCount = (afdpContent.match(/PAST_WEEKS\.slice\(\)\.reverse\(\)\.map/g) || []).length;
    expect(mapCount).toBe(0);
  });

  it('should update historical props loading for selected week only', () => {
    expect(afdpContent).toMatch(/selectedHistoryWeek/);
    expect(afdpContent).toMatch(/triggerPropGrading/);
    expect(afdpContent).not.toMatch(/PAST_WEEKS\.forEach.*triggerPropGrading/);
  });

  it('should handle empty historical props gracefully', () => {
    // Should show a message when week not selected or props not available
    expect(afdpContent).toMatch(/No week selected|No.*props available/);
  });

  it('should have game results display for selected week', () => {
    expect(afdpContent).toMatch(/pwGames/);
    expect(afdpContent).toMatch(/spreadCover/);
    expect(afdpContent).toMatch(/ouResult/);
  });

  it('should have ATS results display', () => {
    expect(afdpContent).toMatch(/FAVORITES/);
    expect(afdpContent).toMatch(/DOGS/);
  });

  it('should have O/U results display', () => {
    expect(afdpContent).toMatch(/OVER.*UNDER/);
  });

  it('selector should be mobile-friendly', () => {
    expect(afdpContent).toMatch(/minHeight:44/);
    expect(afdpContent).toMatch(/minWidth:100/);
  });

  it('should have selectedHistoryWeek for Prior Weeks section', () => {
    // Verify selectedHistoryWeek is declared as state
    expect(afdpContent).toMatch(/\[selectedHistoryWeek,setSelectedHistoryWeek\]/);
    // Verify it's used in the Prior Weeks rendering
    expect(afdpContent).toMatch(/selectedHistoryWeek.*PAST_WEEKS/);
  });

  it('should have dropdown onChange handler', () => {
    expect(afdpContent).toMatch(/onChange:function\(e\)\{setSelectedHistoryWeek\(Number/);
  });

  it('should display week label in selector', () => {
    expect(afdpContent).toMatch(/Week.*selectedHistoryWeek/);
  });

  it('should have useEffect with selectedHistoryWeek dependency', () => {
    expect(afdpContent).toMatch(/useEffect/);
    expect(afdpContent).toMatch(/selectedHistoryWeek/);
    expect(afdpContent).toMatch(/vegasSubTab/);
  });
});
