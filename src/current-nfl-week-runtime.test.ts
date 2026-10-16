import { describe, it, expect } from 'vitest';
import { getCurrentNFLWeek } from './data/nfl-2026-weeks';
import * as fs from 'fs';
import * as path from 'path';

/**
 * REGRESSION TEST: getCurrentNFLWeek Runtime Error
 *
 * This test verifies that:
 * 1. getCurrentNFLWeek is exported from src/data/nfl-2026-weeks.ts
 * 2. afdp.tsx can import and use getCurrentNFLWeek without ReferenceError
 * 3. The function is callable at runtime
 *
 * Background: Production deployed with getCurrentNFLWeek aliased on import
 * but called without the alias in afdp.tsx, causing ReferenceError.
 */

describe('getCurrentNFLWeek Runtime Resolution', () => {
  it('getCurrentNFLWeek is exported from canonical data module', () => {
    expect(typeof getCurrentNFLWeek).toBe('function');
  });

  it('getCurrentNFLWeek is callable and returns expected shape', () => {
    const result = getCurrentNFLWeek(new Date('2026-10-15'));

    expect(result).toBeDefined();
    expect(result.week).toBeDefined();
    expect(result.label).toBeDefined();
    expect(typeof result.week).toBe('number');
    expect(typeof result.label).toBe('string');
  });

  it('afdp.tsx imports getCurrentNFLWeek correctly (no alias)', () => {
    // This test verifies the import line in afdp.tsx is correct
    // by checking the source directly
    const afdpPath = path.join(process.cwd(), 'afdp.tsx');
    const afdpContent = fs.readFileSync(afdpPath, 'utf-8');

    // Verify the import exists and does NOT have the problematic alias
    expect(afdpContent).toMatch(/import\s*{[^}]*getCurrentNFLWeek[^}]*}\s*from\s*["']\.\/src\/data\/nfl-2026-weeks["']/);

    // Verify the alias that was causing the bug does NOT exist in import
    expect(afdpContent).not.toMatch(/getCurrentNFLWeek\s+as\s+getCanonicalCurrentNFLWeek/);

    // Verify getCurrentNFLWeek is being called directly in code
    expect(afdpContent).toMatch(/getCurrentNFLWeek\(\)/);
  });

  it('no duplicate getCurrentNFLWeek implementation in afdp.tsx', () => {
    // Ensure there's no local function definition that could shadow the import
    const afdpPath = path.join(process.cwd(), 'afdp.tsx');
    const afdpContent = fs.readFileSync(afdpPath, 'utf-8');

    // Check that function keyword + getCurrentNFLWeek doesn't exist as local definition
    const localFunctionPattern = /(function\s+getCurrentNFLWeek|const\s+getCurrentNFLWeek\s*=|let\s+getCurrentNFLWeek\s*=)/;
    expect(afdpContent).not.toMatch(localFunctionPattern);
  });
});
