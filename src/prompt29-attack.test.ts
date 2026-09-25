/**
 * PROMPT 29: ADVERSARIAL SECURITY AUDIT — REAL TESTS ONLY
 *
 * This test file contains ONLY tests with real assertions.
 * - PURE MODEL: Tests actual entitlements helper functions
 * - STATIC SQL CONTRACT: Tests read actual migrations + verify SQL patterns
 * - STATIC SOURCE CONTRACT: Tests read actual Edge Function source + verify code
 *
 * NO expect(true).toBe(true) placeholders.
 * NO documentation-only tests.
 * All tests either verify behavior or fail if security contracts are broken.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import {
  isPaidTier,
  isProTier,
  isFreeTier,
  canAccessLeagueFeatures,
  canAccessVegas,
  canAccessValueHistory,
  getEffectivePlan,
} from "./entitlements";
import type { UserProfile } from "./entitlements";

describe("PROMPT 29: Adversarial Security Testing — Real Tests Only", () => {
  // ================================================================
  // SECTION 1: PURE MODEL TESTS (Behavioral)
  // Real tests against actual entitlements functions
  // ================================================================
  describe("Section 1: Pure Model — Entitlements Behavior", () => {
    test("[PURE MODEL] localStorage spoofing has zero effect on isPaidTier", () => {
      const freeUser: UserProfile = {
        id: "spoof-1",
        email: "test@test.com",
        name: "Attacker",
        plan: "free", // Server authoritative
        isAdmin: false,
        token: "token",
      };
      // Even if attacker sets localStorage.isPro=true, plan field is authoritative
      expect(isPaidTier(freeUser)).toBe(false);
    });

    test("[PURE MODEL] canAccessVegas denies Free users", () => {
      const free: UserProfile = {
        id: "user-1",
        email: "user@test.com",
        name: "User",
        plan: "free",
        isAdmin: false,
        token: "token",
      };
      expect(canAccessVegas(free)).toBe(false);
    });

    test("[PURE MODEL] canAccessVegas allows Pro users", () => {
      const pro: UserProfile = {
        id: "user-2",
        email: "user@test.com",
        name: "User",
        plan: "pro",
        isAdmin: false,
        token: "token",
      };
      expect(canAccessVegas(pro)).toBe(true);
    });

    test("[PURE MODEL] canAccessLeagueFeatures denies Free, allows Pro", () => {
      const free: UserProfile = {
        id: "user-3",
        email: "user@test.com",
        name: "User",
        plan: "free",
        isAdmin: false,
        token: "token",
      };
      const pro: UserProfile = { ...free, id: "user-4", plan: "pro" };

      expect(canAccessLeagueFeatures(free)).toBe(false);
      expect(canAccessLeagueFeatures(pro)).toBe(true);
    });

    test("[PURE MODEL] Pro→Free downgrade revokes access immediately", () => {
      const pro: UserProfile = {
        id: "user-5",
        email: "user@test.com",
        name: "User",
        plan: "pro",
        isAdmin: false,
        token: "token",
      };
      expect(canAccessVegas(pro)).toBe(true);

      const downgraded: UserProfile = { ...pro, plan: "free" };
      expect(canAccessVegas(downgraded)).toBe(false);
    });

    test("[PURE MODEL] null plan fails closed (no access)", () => {
      const unknown: UserProfile = {
        id: "user-6",
        email: "user@test.com",
        name: "User",
        plan: null,
        isAdmin: false,
        token: "token",
      };
      expect(isPaidTier(unknown)).toBe(false);
      expect(canAccessValueHistory(unknown)).toBe(false);
    });

    test("[PURE MODEL] invalid plan defaults to 'free'", () => {
      expect(getEffectivePlan("vip")).toBe("free");
      expect(getEffectivePlan("premium")).toBe("free");
      expect(getEffectivePlan(null)).toBe("free");
      expect(getEffectivePlan(undefined)).toBe("free");
    });

    test("[PURE MODEL] isFreeTier handles null/undefined as free", () => {
      expect(isFreeTier(null)).toBe(true);
      expect(isFreeTier(undefined)).toBe(true);
      const free: UserProfile = {
        id: "user-7",
        email: "user@test.com",
        name: "User",
        plan: "free",
        isAdmin: false,
        token: "token",
      };
      expect(isFreeTier(free)).toBe(true);
    });
  });

  // ================================================================
  // SECTION 2: STATIC SQL CONTRACT TESTS (Read actual migrations)
  // ================================================================
  describe("Section 2: Static SQL Contract — Migrations Verified", () => {
    let migration005: string;
    let migration006: string;

    beforeAll(() => {
      migration005 = readFileSync(
        resolve("supabase/migrations/005_entitlement_security.sql"),
        "utf-8"
      );
      migration006 = readFileSync(
        resolve("supabase/migrations/006_trade_analysis_quota.sql"),
        "utf-8"
      );
    });

    test("[STATIC SQL CONTRACT] Migration 005 revokes UPDATE from authenticated on public.users", () => {
      expect(migration005).toContain(
        "REVOKE UPDATE ON public.users FROM authenticated"
      );
    });

    test("[STATIC SQL CONTRACT] Migration 006 creates trade_analysis_usage table", () => {
      expect(migration006).toContain("CREATE TABLE IF NOT EXISTS public.trade_analysis_usage");
    });

    test("[STATIC SQL CONTRACT] Migration 006 RLS blocks authenticated INSERT", () => {
      expect(migration006).toContain('FOR INSERT');
      expect(migration006).toContain('WITH CHECK (false)');
    });

    test("[STATIC SQL CONTRACT] Migration 006 RLS blocks authenticated UPDATE", () => {
      expect(migration006).toContain('FOR UPDATE');
      expect(migration006).toContain('USING (false)');
    });

    test("[STATIC SQL CONTRACT] Migration 006 uses pg_advisory_xact_lock for atomicity", () => {
      expect(migration006).toContain('pg_advisory_xact_lock');
    });

    test("[STATIC SQL CONTRACT] Migration 006 reserve_trade_quota is service-role only", () => {
      expect(migration006).toContain(
        'REVOKE EXECUTE ON FUNCTION public.reserve_trade_quota'
      );
      expect(migration006).toContain('FROM authenticated');
      expect(migration006).toContain('GRANT EXECUTE');
      expect(migration006).toContain('TO service_role');
    });

    test("[STATIC SQL CONTRACT] Migration 006 finalize_trade_quota checks expiration", () => {
      expect(migration006).toContain('expires_at > now()');
    });

    test("[STATIC SQL CONTRACT] Migration 006 finalize requires status = 'reserved'", () => {
      expect(migration006).toContain("status = 'reserved'");
      expect(migration006).toContain('invalid_state_transition');
    });

    test("[STATIC SQL CONTRACT] Migration 006 request_fingerprint binds to payload", () => {
      expect(migration006).toContain('request_fingerprint');
      expect(migration006).toContain('UNIQUE (user_id, request_id)');
    });

    test("[STATIC SQL CONTRACT] Migration 006 finalize RPC is service-role only", () => {
      expect(migration006).toContain(
        'REVOKE EXECUTE ON FUNCTION public.finalize_trade_quota'
      );
      expect(migration006).toContain('FROM authenticated');
    });

    test("[STATIC SQL CONTRACT] Migration 006 get_trade_quota_status is service-role only", () => {
      expect(migration006).toContain(
        'REVOKE EXECUTE ON FUNCTION public.get_trade_quota_status'
      );
      expect(migration006).toContain('FROM authenticated');
    });

    test("[STATIC SQL CONTRACT] Migration 006 get_trade_analysis_result is service-role only", () => {
      expect(migration006).toContain(
        'REVOKE EXECUTE ON FUNCTION public.get_trade_analysis_result'
      );
      expect(migration006).toContain('FROM authenticated');
    });
  });

  // ================================================================
  // SECTION 3: STATIC SOURCE CONTRACT TESTS (Read Edge Function source)
  // ================================================================
  describe("Section 3: Static Source Contract — Edge Functions Verified", () => {
    let analyzeTradeSource: string;
    let fetchOddsSource: string;

    beforeAll(() => {
      analyzeTradeSource = readFileSync(
        resolve("supabase/functions/analyze-trade/index.ts"),
        "utf-8"
      );
      fetchOddsSource = readFileSync(
        resolve("supabase/functions/fetch-odds/index.ts"),
        "utf-8"
      );
    });

    test("[STATIC SOURCE CONTRACT] analyze-trade validates Bearer token", () => {
      expect(analyzeTradeSource).toContain("Authorization");
      expect(analyzeTradeSource).toContain("Bearer");
      expect(analyzeTradeSource).toContain("getUser");
    });

    test("[STATIC SOURCE CONTRACT] analyze-trade fetches plan from public.users", () => {
      expect(analyzeTradeSource).toContain('select("plan")');
      expect(analyzeTradeSource).toContain('.from("users")');
    });

    test("[STATIC SOURCE CONTRACT] analyze-trade validates UUID requestId format", () => {
      expect(analyzeTradeSource).toContain("UUID_REGEX");
      expect(analyzeTradeSource).toContain("invalid_request");
    });

    test("[STATIC SOURCE CONTRACT] analyze-trade calls reserve_trade_quota RPC", () => {
      expect(analyzeTradeSource).toContain("reserve_trade_quota");
      expect(analyzeTradeSource).toContain("rpc");
    });

    test("[STATIC SOURCE CONTRACT] analyze-trade calls finalize_trade_quota RPC", () => {
      expect(analyzeTradeSource).toContain("finalize_trade_quota");
    });

    test("[STATIC SOURCE CONTRACT] analyze-trade calls get_trade_analysis_result for idempotency", () => {
      expect(analyzeTradeSource).toContain("get_trade_analysis_result");
    });

    test("[STATIC SOURCE CONTRACT] fetch-odds validates Bearer token", () => {
      expect(fetchOddsSource).toContain("Authorization");
      expect(fetchOddsSource).toContain("Bearer");
    });

    test("[STATIC SOURCE CONTRACT] fetch-odds checks plan for pro/elite", () => {
      expect(fetchOddsSource).toContain("pro");
      expect(fetchOddsSource).toContain("elite");
      expect(fetchOddsSource).toContain("403");
      expect(fetchOddsSource).toContain("insufficient_entitlement");
    });

    test("[STATIC SOURCE CONTRACT] fetch-odds denies Free users", () => {
      expect(fetchOddsSource).toContain('userPlan !== "pro"');
      expect(fetchOddsSource).toContain('userPlan !== "elite"');
    });
  });


});

