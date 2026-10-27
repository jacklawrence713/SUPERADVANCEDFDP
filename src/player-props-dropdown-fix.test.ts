import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

describe('Player Props Dropdown UI Fix - Regression Tests', () => {
  const afdpPath = resolve(__dirname, '../afdp.tsx');
  let afdpContent: string;

  beforeAll(() => {
    afdpContent = readFileSync(afdpPath, 'utf-8');
  });

  it('should have selectedPlayerPropsWeek state variable', () => {
    expect(afdpContent).toMatch(/selectedPlayerPropsWeek/);
    expect(afdpContent).toMatch(/setSelectedPlayerPropsWeek/);
  });

  it('should find selected week from PAST_WEEKS array', () => {
    expect(afdpContent).toMatch(/PAST_WEEKS\.find\(function\(pw\)\{return pw\.week===selectedPlayerPropsWeek/);
  });

  it('should extract props from selected week', () => {
    expect(afdpContent).toMatch(/selectedPropsWeekData&&selectedPropsWeekData\.props/);
  });

  it('should extract propResults from selected week', () => {
    expect(afdpContent).toMatch(/selectedPropsWeekData&&selectedPropsWeekData\.propResults/);
  });

  it('should use selectedWeekProps instead of WEEKLY_PROPS', () => {
    expect(afdpContent).toMatch(/selectedWeekProps\.forEach\(function\(p\)\{/);
    // Verify WEEKLY_PROPS is not used for the rendering loop
    const weeklyPropsLoop = afdpContent.match(/WEEKLY_PROPS\.forEach\(function\(p\)\{if\(!wgrouped\[p\.stat\]\)/);
    expect(weeklyPropsLoop).toBeFalsy();
  });

  it('should use selectedWeekPropResults for result lookup', () => {
    expect(afdpContent).toMatch(/var actual=selectedWeekPropResults\[rKey\]/);
  });

  it('should NOT use PROP_RESULTS for historical weeks', () => {
    const propResultsLookup = afdpContent.match(/var actual=PROP_RESULTS\[rKey\]/);
    expect(propResultsLookup).toBeFalsy();
  });

  it('should display historical week subtitle for weeks 1-6', () => {
    expect(afdpContent).toMatch(/selectedPlayerPropsWeek>=1&&selectedPlayerPropsWeek<=6/);
    expect(afdpContent).toMatch(/Week.*historical props.*Lines and actual outcomes/);
  });

  it('should NOT show "No current player props available" for historical weeks', () => {
    expect(afdpContent).toMatch(/selectedPlayerPropsWeek>=1&&selectedPlayerPropsWeek<=6\?"Week "\+selectedPlayerPropsWeek\+" historical props/);
  });

  it('should fallback to empty array if selected week has no props', () => {
    expect(afdpContent).toMatch(/selectedPropsWeekData&&selectedPropsWeekData\.props\?selectedPropsWeekData\.props:\[\]/);
  });

  it('should fallback to empty object if selected week has no propResults', () => {
    expect(afdpContent).toMatch(/selectedPropsWeekData&&selectedPropsWeekData\.propResults\?selectedPropsWeekData\.propResults:\{\}/);
  });

  it('should initialize wgrouped with correct type for selected week props', () => {
    expect(afdpContent).toMatch(/var wgrouped:\{[^\}]*any[^\}]*\}={}/);
  });

  it('should render week selector dropdown with options 1-6', () => {
    expect(afdpContent).toMatch(/React.createElement\("select",\{value:selectedPlayerPropsWeek/);
    expect(afdpContent).toMatch(/\[1,2,3,4,5,6\]\.map\(function\(w\)\{/);
  });

  it('should preserve onChange handler for week selector', () => {
    expect(afdpContent).toMatch(/onChange:function\(e\)\{setSelectedPlayerPropsWeek\(Number\(e\.target\.value\)\);/);
  });

  it('Player Props title should show selected week dynamically', () => {
    expect(afdpContent).toMatch(/React.createElement\("div",\{style:\{fontWeight:800,fontSize:16,color:T\.text,marginBottom:4\}\},"Week "\+selectedPlayerPropsWeek\+" Player Props"/);
  });

  it('should not modify PAST_WEEKS structure', () => {
    expect(afdpContent).toMatch(/PAST_WEEKS\[PAST_WEEKS\.length-1\]\.week/);
  });

  it('should not modify currentPlayerProps (used for live current week)', () => {
    expect(afdpContent).toMatch(/var \[currentPlayerProps,setCurrentPlayerProps\]/);
  });

  it('should maintain Prior Weeks week selector independently', () => {
    expect(afdpContent).toMatch(/selectedHistoryWeek/);
    expect(afdpContent).toMatch(/selectedPlayerPropsWeek/);
    expect(afdpContent.indexOf('selectedHistoryWeek')).not.toBe(afdpContent.indexOf('selectedPlayerPropsWeek'));
  });

  it('should group props by stat category correctly', () => {
    expect(afdpContent).toMatch(/if\(!wgrouped\[p\.stat\]\)wgrouped\[p\.stat\]=\[\];wgrouped\[p\.stat\]\.push\(p\);/);
  });
});
