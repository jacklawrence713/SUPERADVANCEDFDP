/**
 * Entitlements Security & Behavioral Tests (Prompt 27)
 *
 * Tests canonical tier checks, feature gates, and security against
 * localStorage spoofing and plan-based authorization.
 */

import {
  isPaidTier,
  isProTier,
  isEliteTier,
  isFreeTier,
  canAccessLeagueFeatures,
  canAccessVegas,
  canAccessValueHistory,
  canAccessWhyValueChanged,
  canAccessUnlimitedTradeAnalyzer,
  getEffectivePlan,
  isValidPlan,
} from "./entitlements";
import type { UserProfile } from "./entitlements";

describe("Entitlements", () => {
  describe("Tier Detection", () => {
    test("isPaidTier returns true for pro user", () => {
      const pro: UserProfile = {
        id: "123",
        email: "pro@example.com",
        name: "Pro User",
        plan: "pro",
        isAdmin: false,
        token: "token123",
      };
      expect(isPaidTier(pro)).toBe(true);
    });

    test("isPaidTier returns true for elite user", () => {
      const elite: UserProfile = {
        id: "123",
        email: "elite@example.com",
        name: "Elite User",
        plan: "elite",
        isAdmin: false,
        token: "token123",
      };
      expect(isPaidTier(elite)).toBe(true);
    });

    test("isPaidTier returns false for free user", () => {
      const free: UserProfile = {
        id: "123",
        email: "free@example.com",
        name: "Free User",
        plan: "free",
        isAdmin: false,
        token: "token123",
      };
      expect(isPaidTier(free)).toBe(false);
    });

    test("isPaidTier returns false for null/undefined", () => {
      expect(isPaidTier(null)).toBe(false);
      expect(isPaidTier(undefined)).toBe(false);
    });

    test("isProTier returns true for pro and elite", () => {
      const pro: UserProfile = {
        id: "1",
        email: "pro@test.com",
        name: "Pro",
        plan: "pro",
        isAdmin: false,
        token: "t",
      };
      const elite: UserProfile = {
        id: "2",
        email: "elite@test.com",
        name: "Elite",
        plan: "elite",
        isAdmin: false,
        token: "t",
      };
      expect(isProTier(pro)).toBe(true);
      expect(isProTier(elite)).toBe(true);
    });

    test("isEliteTier returns true only for elite", () => {
      const elite: UserProfile = {
        id: "1",
        email: "elite@test.com",
        name: "Elite",
        plan: "elite",
        isAdmin: false,
        token: "t",
      };
      const pro: UserProfile = {
        id: "2",
        email: "pro@test.com",
        name: "Pro",
        plan: "pro",
        isAdmin: false,
        token: "t",
      };
      expect(isEliteTier(elite)).toBe(true);
      expect(isEliteTier(pro)).toBe(false);
    });

    test("isFreeTier returns true for free and null", () => {
      const free: UserProfile = {
        id: "1",
        email: "free@test.com",
        name: "Free",
        plan: "free",
        isAdmin: false,
        token: "t",
      };
      expect(isFreeTier(free)).toBe(true);
      expect(isFreeTier(null)).toBe(true);
      expect(isFreeTier(undefined)).toBe(true);
    });
  });

  describe("Feature Gates", () => {
    test("canAccessLeagueFeatures requires pro or elite", () => {
      const free: UserProfile = {
        id: "1",
        email: "free@test.com",
        name: "Free",
        plan: "free",
        isAdmin: false,
        token: "t",
      };
      const pro: UserProfile = {
        id: "2",
        email: "pro@test.com",
        name: "Pro",
        plan: "pro",
        isAdmin: false,
        token: "t",
      };
      expect(canAccessLeagueFeatures(free)).toBe(false);
      expect(canAccessLeagueFeatures(pro)).toBe(true);
    });

    test("canAccessVegas requires pro or elite", () => {
      const free: UserProfile = {
        id: "1",
        email: "free@test.com",
        name: "Free",
        plan: "free",
        isAdmin: false,
        token: "t",
      };
      const elite: UserProfile = {
        id: "2",
        email: "elite@test.com",
        name: "Elite",
        plan: "elite",
        isAdmin: false,
        token: "t",
      };
      expect(canAccessVegas(free)).toBe(false);
      expect(canAccessVegas(elite)).toBe(true);
    });

    test("canAccessValueHistory requires pro or elite", () => {
      const free: UserProfile = {
        id: "1",
        email: "free@test.com",
        name: "Free",
        plan: "free",
        isAdmin: false,
        token: "t",
      };
      const pro: UserProfile = {
        id: "2",
        email: "pro@test.com",
        name: "Pro",
        plan: "pro",
        isAdmin: false,
        token: "t",
      };
      expect(canAccessValueHistory(free)).toBe(false);
      expect(canAccessValueHistory(pro)).toBe(true);
    });

    test("canAccessWhyValueChanged requires pro or elite", () => {
      const free: UserProfile = {
        id: "1",
        email: "free@test.com",
        name: "Free",
        plan: "free",
        isAdmin: false,
        token: "t",
      };
      const elite: UserProfile = {
        id: "2",
        email: "elite@test.com",
        name: "Elite",
        plan: "elite",
        isAdmin: false,
        token: "t",
      };
      expect(canAccessWhyValueChanged(free)).toBe(false);
      expect(canAccessWhyValueChanged(elite)).toBe(true);
    });

    test("canAccessUnlimitedTradeAnalyzer requires pro or elite", () => {
      const free: UserProfile = {
        id: "1",
        email: "free@test.com",
        name: "Free",
        plan: "free",
        isAdmin: false,
        token: "t",
      };
      const pro: UserProfile = {
        id: "2",
        email: "pro@test.com",
        name: "Pro",
        plan: "pro",
        isAdmin: false,
        token: "t",
      };
      expect(canAccessUnlimitedTradeAnalyzer(free)).toBe(false);
      expect(canAccessUnlimitedTradeAnalyzer(pro)).toBe(true);
    });
  });

  describe("Security Against localStorage Spoof", () => {
    test("Feature gates use plan field, not spoofable isPro", () => {
      // Simulating a user whose profile.plan=free but might have cached isPro=true
      const freeUser: UserProfile = {
        id: "spoof-attacker",
        email: "spoof@test.com",
        name: "Spoofer",
        plan: "free",  // Authoritative plan from server
        isAdmin: false,
        token: "token",
      };

      // Even if localStorage had isPro=true, the helper functions check plan
      expect(canAccessLeagueFeatures(freeUser)).toBe(false);
      expect(canAccessVegas(freeUser)).toBe(false);
      expect(canAccessValueHistory(freeUser)).toBe(false);
    });

    test("Downgrade from pro to free immediately revokes access", () => {
      // Before downgrade
      const proUser: UserProfile = {
        id: "user-123",
        email: "user@test.com",
        name: "User",
        plan: "pro",
        isAdmin: false,
        token: "token",
      };
      expect(canAccessVegas(proUser)).toBe(true);

      // After downgrade (profile refreshed from server)
      const downgradedUser: UserProfile = {
        ...proUser,
        plan: "free",
      };
      expect(canAccessVegas(downgradedUser)).toBe(false);
    });

    test("Upgrade from free to pro immediately grants access", () => {
      // Before upgrade
      const freeUser: UserProfile = {
        id: "user-456",
        email: "user@test.com",
        name: "User",
        plan: "free",
        isAdmin: false,
        token: "token",
      };
      expect(canAccessLeagueFeatures(freeUser)).toBe(false);

      // After upgrade
      const upgradedUser: UserProfile = {
        ...freeUser,
        plan: "pro",
      };
      expect(canAccessLeagueFeatures(upgradedUser)).toBe(true);
    });
  });

  describe("Plan Validation & Fallback", () => {
    test("isValidPlan returns true for free, pro, elite", () => {
      expect(isValidPlan("free")).toBe(true);
      expect(isValidPlan("pro")).toBe(true);
      expect(isValidPlan("elite")).toBe(true);
    });

    test("isValidPlan returns false for invalid plans", () => {
      expect(isValidPlan("invalid")).toBe(false);
      expect(isValidPlan("premium")).toBe(false);
      expect(isValidPlan("vip")).toBe(false);
      expect(isValidPlan(null)).toBe(false);
      expect(isValidPlan(undefined)).toBe(false);
      expect(isValidPlan("")).toBe(false);
    });

    test("getEffectivePlan defaults unknown plans to free", () => {
      expect(getEffectivePlan("pro")).toBe("pro");
      expect(getEffectivePlan("elite")).toBe("elite");
      expect(getEffectivePlan("free")).toBe("free");
      expect(getEffectivePlan("invalid")).toBe("free");
      expect(getEffectivePlan(null)).toBe("free");
      expect(getEffectivePlan(undefined)).toBe("free");
    });

    test("Unknown plan denies paid access (fail-closed)", () => {
      const unknownPlanUser: UserProfile = {
        id: "user",
        email: "user@test.com",
        name: "User",
        plan: "vip" as any,  // Invalid plan
        isAdmin: false,
        token: "token",
      };

      // Unknown plan should fail closed (no access)
      expect(canAccessLeagueFeatures(unknownPlanUser)).toBe(false);
      expect(canAccessVegas(unknownPlanUser)).toBe(false);
      expect(canAccessValueHistory(unknownPlanUser)).toBe(false);
    });
  });

  describe("Anonymous User Handling", () => {
    test("All feature gates deny access for null profile", () => {
      expect(canAccessLeagueFeatures(null)).toBe(false);
      expect(canAccessVegas(null)).toBe(false);
      expect(canAccessValueHistory(null)).toBe(false);
      expect(canAccessWhyValueChanged(null)).toBe(false);
      expect(canAccessUnlimitedTradeAnalyzer(null)).toBe(false);
    });

    test("All feature gates deny access for undefined profile", () => {
      expect(canAccessLeagueFeatures(undefined)).toBe(false);
      expect(canAccessVegas(undefined)).toBe(false);
      expect(canAccessValueHistory(undefined)).toBe(false);
      expect(canAccessWhyValueChanged(undefined)).toBe(false);
      expect(canAccessUnlimitedTradeAnalyzer(undefined)).toBe(false);
    });
  });

  describe("Admin Behavior", () => {
    test("Admin flag is separate from plan entitlements", () => {
      // Admin user with free plan
      const adminFree: UserProfile = {
        id: "admin-123",
        email: "admin@test.com",
        name: "Admin",
        plan: "free",
        isAdmin: true,
        token: "token",
      };

      // Helpers check plan, not isAdmin
      // App can decide separately if admins get free access
      expect(isPaidTier(adminFree)).toBe(false);
      expect(isFreeTier(adminFree)).toBe(true);
    });
  });
});
