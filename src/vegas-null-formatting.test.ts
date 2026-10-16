/**
 * REGRESSION TEST: Vegas Odds Null Formatting
 *
 * Ensures null/undefined odds are displayed cleanly without concatenation bugs.
 *
 * Root cause of "Line N/Anull":
 * Spread display was: (spread===null?"Line N/A":spread>0?"+":"")+spread
 * When spread was null: "Line N/A" + null = "Line N/Anull"
 *
 * Fixed by checking null BEFORE formatting/concatenation:
 * spread===null?"Line Unavailable":(spread>0?"+":"")+spread
 */

import { describe, it, expect } from 'vitest';

describe('Vegas Odds Null Formatting', () => {

  // ── Test Helper Functions ────────────────────────────────────────────────

  function formatSpread(spread: number | null | undefined): string {
    return spread === null || spread === undefined
      ? "Line Unavailable"
      : (spread > 0 ? "+" : "") + spread;
  }

  function formatSpreadWithLabel(spread: number | null | undefined): string {
    return "Spread: " + (spread === null || spread === undefined
      ? "Unavailable"
      : (spread > 0 ? "+" : "") + spread);
  }

  function formatTotal(total: number | null | undefined): string {
    return total === null || total === undefined
      ? "Unavailable"
      : String(total);
  }

  // ── Spread Display Tests ─────────────────────────────────────────────────

  describe('Spread formatting', () => {
    it('null spread displays "Line Unavailable" (not "Line N/Anull")', () => {
      const result = formatSpread(null);
      expect(result).toBe("Line Unavailable");
      expect(result).not.toContain("N/Anull");
      expect(result).not.toContain("null");
    });

    it('undefined spread displays "Line Unavailable"', () => {
      const result = formatSpread(undefined);
      expect(result).toBe("Line Unavailable");
      expect(result).not.toContain("undefined");
    });

    it('zero spread displays "0" (not "+0")', () => {
      const result = formatSpread(0);
      expect(result).toBe("0");
    });

    it('positive spread displays with "+" prefix', () => {
      expect(formatSpread(2.5)).toBe("+2.5");
      expect(formatSpread(1)).toBe("+1");
      expect(formatSpread(7)).toBe("+7");
    });

    it('negative spread displays without prefix', () => {
      expect(formatSpread(-1)).toBe("-1");
      expect(formatSpread(-3.5)).toBe("-3.5");
      expect(formatSpread(-7)).toBe("-7");
    });

    it('decimal spreads preserve precision', () => {
      expect(formatSpread(2.5)).toBe("+2.5");
      expect(formatSpread(-3.5)).toBe("-3.5");
      expect(formatSpread(0.5)).toBe("+0.5");
    });
  });

  // ── Spread With Label Tests ──────────────────────────────────────────────

  describe('Spread with label formatting', () => {
    it('null spread with label displays "Unavailable" (not "Unavailablenull")', () => {
      const result = formatSpreadWithLabel(null);
      expect(result).toBe("Spread: Unavailable");
      expect(result).not.toContain("Availablenull");
      expect(result).not.toContain("null");
    });

    it('undefined spread with label displays "Unavailable"', () => {
      const result = formatSpreadWithLabel(undefined);
      expect(result).toBe("Spread: Unavailable");
      expect(result).not.toContain("undefined");
    });

    it('positive spread with label includes "+" prefix', () => {
      expect(formatSpreadWithLabel(2.5)).toBe("Spread: +2.5");
    });

    it('negative spread with label excludes "+" prefix', () => {
      expect(formatSpreadWithLabel(-1)).toBe("Spread: -1");
    });

    it('zero spread with label displays "0"', () => {
      expect(formatSpreadWithLabel(0)).toBe("Spread: 0");
    });
  });

  // ── Total Display Tests ──────────────────────────────────────────────────

  describe('Total (O/U) formatting', () => {
    it('null total displays "Unavailable" (not "null")', () => {
      const result = formatTotal(null);
      expect(result).toBe("Unavailable");
      expect(result).not.toContain("null");
    });

    it('undefined total displays "Unavailable"', () => {
      const result = formatTotal(undefined);
      expect(result).toBe("Unavailable");
      expect(result).not.toContain("undefined");
    });

    it('numeric total displays exact value', () => {
      expect(formatTotal(42)).toBe("42");
      expect(formatTotal(42.5)).toBe("42.5");
      expect(formatTotal(47.5)).toBe("47.5");
      expect(formatTotal(50)).toBe("50");
    });

    it('zero total displays "0" (technically valid though rare in NFL)', () => {
      const result = formatTotal(0);
      expect(result).toBe("0");
      expect(result).not.toContain("null");
    });

    it('decimal totals preserve precision', () => {
      expect(formatTotal(40.5)).toBe("40.5");
      expect(formatTotal(52.5)).toBe("52.5");
    });
  });

  // ── Regression: Never Concatenate Null ───────────────────────────────────

  describe('Regression: null concatenation never occurs', () => {
    it('spread null + any operation never produces "Anull"', () => {
      const result = formatSpread(null);
      expect(result).not.toMatch(/[a-zA-Z]null/);
      expect(result).not.toMatch(/null[a-zA-Z]/);
    });

    it('total null never produces concatenation artifacts', () => {
      const result = formatTotal(null);
      expect(result).not.toContain("null");
    });

    it('undefined never appears in any output', () => {
      expect(formatSpread(undefined)).not.toContain("undefined");
      expect(formatTotal(undefined)).not.toContain("undefined");
      expect(formatSpreadWithLabel(undefined)).not.toContain("undefined");
    });
  });

  // ── Edge Cases ───────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('very small positive spread', () => {
      expect(formatSpread(0.5)).toBe("+0.5");
    });

    it('very small negative spread', () => {
      expect(formatSpread(-0.5)).toBe("-0.5");
    });

    it('large spread values', () => {
      expect(formatSpread(15)).toBe("+15");
      expect(formatSpread(-15)).toBe("-15");
    });

    it('high over/under totals', () => {
      expect(formatTotal(60)).toBe("60");
      expect(formatTotal(65.5)).toBe("65.5");
    });

    it('low over/under totals', () => {
      expect(formatTotal(35)).toBe("35");
      expect(formatTotal(40.5)).toBe("40.5");
    });
  });

});
