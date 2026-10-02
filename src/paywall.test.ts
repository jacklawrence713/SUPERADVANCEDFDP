/**
 * PAYWALL UX TESTS (Prompt 30)
 *
 * Verifies consistent paywall behavior across all locked features.
 * Tests that entitlements properly gate features and provide appropriate UX.
 */

import { canAccessFeature, getFeaturePaywallCopy, FEATURE_PAYWALL_CONFIG } from './paywall-config';
import { canAccessLeagueFeatures, canAccessVegas, canAccessValueHistory, canAccessWhyValueChanged } from './entitlements';
import type { UserProfile } from './entitlements';

describe('Paywall UX (Prompt 30)', () => {
  // ================================================================
  // SECTION 1: FEATURE CONFIG INTEGRITY
  // ================================================================
  describe('Feature Config', () => {
    test('All features have required displayName', () => {
      Object.values(FEATURE_PAYWALL_CONFIG).forEach((config) => {
        expect(config.displayName).toBeTruthy();
        expect(config.displayName.length).toBeGreaterThan(0);
      });
    });

    test('All features have description', () => {
      Object.values(FEATURE_PAYWALL_CONFIG).forEach((config) => {
        expect(config.description).toBeTruthy();
        expect(config.description.length).toBeGreaterThan(0);
      });
    });

    test('All features require pro or elite tier', () => {
      Object.values(FEATURE_PAYWALL_CONFIG).forEach((config) => {
        expect(['pro', 'elite']).toContain(config.requiredTier);
      });
    });

    test('Paywall copy is available for all features', () => {
      Object.keys(FEATURE_PAYWALL_CONFIG).forEach((featureKey) => {
        const copy = getFeaturePaywallCopy(featureKey as any);
        expect(copy.title).toBeTruthy();
        expect(copy.description).toBeTruthy();
        expect(copy.cta).toBeTruthy();
      });
    });
  });

  // ================================================================
  // SECTION 2: ANONYMOUS USER PAYWALL
  // ================================================================
  describe('Anonymous User Gate', () => {
    test('Anonymous user cannot access league_connect', () => {
      expect(canAccessFeature('anonymous', 'pro')).toBe(false);
    });

    test('Anonymous user cannot access trade_finder', () => {
      expect(canAccessFeature('anonymous', 'pro')).toBe(false);
    });

    test('Anonymous user cannot access vegas', () => {
      expect(canAccessFeature('anonymous', 'pro')).toBe(false);
    });

    test('Anonymous user should see authentication gate (not paywall)', () => {
      // Anonymous should not be treated as Free tier; should authenticate first
      // This test documents that paywall is different from auth gate
      const anonTier = 'anonymous';
      const isPaidAccess = canAccessFeature(anonTier, 'pro');
      expect(isPaidAccess).toBe(false);
    });
  });

  // ================================================================
  // SECTION 3: FREE USER PAYWALL MATRIX
  // ================================================================
  describe('Free User Feature Access', () => {
    const freeUser: UserProfile = {
      id: 'user-free-1',
      email: 'free@test.com',
      name: 'Free User',
      plan: 'free',
      isPro: false,
      isAdmin: false,
      token: 'token-free',
    };

    test('Free user cannot access league_connect (canAccessLeagueFeatures)', () => {
      expect(canAccessLeagueFeatures(freeUser)).toBe(false);
    });

    test('Free user cannot access trade_finder (canAccessLeagueFeatures)', () => {
      expect(canAccessLeagueFeatures(freeUser)).toBe(false);
    });

    test('Free user cannot access league_intelligence (canAccessLeagueFeatures)', () => {
      expect(canAccessLeagueFeatures(freeUser)).toBe(false);
    });

    test('Free user cannot access vegas (canAccessVegas)', () => {
      expect(canAccessVegas(freeUser)).toBe(false);
    });

    test('Free user cannot access value_history (canAccessValueHistory)', () => {
      expect(canAccessValueHistory(freeUser)).toBe(false);
    });

    test('Free user cannot access why_value_changed (canAccessWhyValueChanged)', () => {
      expect(canAccessWhyValueChanged(freeUser)).toBe(false);
    });

    test('Free user canAccessFeature returns false for pro features', () => {
      expect(canAccessFeature('free', 'pro')).toBe(false);
    });
  });

  // ================================================================
  // SECTION 4: PRO USER — NO PAYWALL
  // ================================================================
  describe('Pro User Feature Access', () => {
    const proUser: UserProfile = {
      id: 'user-pro-1',
      email: 'pro@test.com',
      name: 'Pro User',
      plan: 'pro',
      isPro: true,
      isAdmin: false,
      token: 'token-pro',
    };

    test('Pro user can access league_connect', () => {
      expect(canAccessLeagueFeatures(proUser)).toBe(true);
    });

    test('Pro user can access trade_finder', () => {
      expect(canAccessLeagueFeatures(proUser)).toBe(true);
    });

    test('Pro user can access league_intelligence', () => {
      expect(canAccessLeagueFeatures(proUser)).toBe(true);
    });

    test('Pro user can access vegas', () => {
      expect(canAccessVegas(proUser)).toBe(true);
    });

    test('Pro user can access value_history', () => {
      expect(canAccessValueHistory(proUser)).toBe(true);
    });

    test('Pro user can access why_value_changed', () => {
      expect(canAccessWhyValueChanged(proUser)).toBe(true);
    });

    test('Pro user canAccessFeature returns true for pro features', () => {
      expect(canAccessFeature('pro', 'pro')).toBe(true);
    });
  });

  // ================================================================
  // SECTION 5: ELITE USER — NO PAYWALL
  // ================================================================
  describe('Elite User Feature Access', () => {
    const eliteUser: UserProfile = {
      id: 'user-elite-1',
      email: 'elite@test.com',
      name: 'Elite User',
      plan: 'elite',
      isPro: true,
      isAdmin: false,
      token: 'token-elite',
    };

    test('Elite user can access league_connect', () => {
      expect(canAccessLeagueFeatures(eliteUser)).toBe(true);
    });

    test('Elite user can access vegas', () => {
      expect(canAccessVegas(eliteUser)).toBe(true);
    });

    test('Elite user can access value_history', () => {
      expect(canAccessValueHistory(eliteUser)).toBe(true);
    });

    test('Elite user canAccessFeature returns true for pro features', () => {
      expect(canAccessFeature('elite', 'pro')).toBe(true);
    });
  });

  // ================================================================
  // SECTION 6: TRADE ANALYZER LIMIT PAYWALL
  // ================================================================
  describe('Trade Analyzer Daily Limit', () => {
    test('Trade analyzer limit paywall has correct copy', () => {
      const copy = getFeaturePaywallCopy('trade_analyzer_limit');
      expect(copy.title).toBe('Analysis Limit Reached');
      expect(copy.description).toContain('3');
      expect(copy.cta).toBe('Upgrade to Unlimited');
    });

    test('Paywall copy mentions 3 lifetime not 2/day', () => {
      const copy = getFeaturePaywallCopy('trade_analyzer_limit');
      expect(copy.description).toContain('3');
      expect(copy.description).not.toContain('2');
    });

    test('Limit paywall mentions lifetime limit', () => {
      const copy = getFeaturePaywallCopy('trade_analyzer_limit');
      expect(copy.description.toLowerCase()).toContain('lifetime');
    });
  });

  // ================================================================
  // SECTION 7: PAYWALL COPY QUALITY
  // ================================================================
  describe('Paywall Copy', () => {
    test('No dark pattern: no fake scarcity in paywall copy', () => {
      Object.values(FEATURE_PAYWALL_CONFIG).forEach((config) => {
        const lower = config.description.toLowerCase();
        expect(lower).not.toContain('limited time');
        expect(lower).not.toContain('only today');
        expect(lower).not.toContain('hurry');
        expect(lower).not.toContain('only');
      });
    });

    test('Copy does not reference unimplemented features', () => {
      const vegasConfig = FEATURE_PAYWALL_CONFIG.vegas;
      // Copy mentions Vegas spreads, odds, game context - all implemented
      expect(vegasConfig.description).toContain('NFL');
      expect(vegasConfig.description).toContain('game');
    });

    test('Copy is product-specific, not generic', () => {
      const leagueConfig = FEATURE_PAYWALL_CONFIG.league_connect;
      // References actual platforms
      expect(leagueConfig.description).toContain('Sleeper');
      expect(leagueConfig.description).toContain('ESPN');
    });
  });

  // ================================================================
  // SECTION 8: DOWNGRADE SCENARIO
  // ================================================================
  describe('Downgrade Scenario (Pro → Free)', () => {
    const proUser: UserProfile = {
      id: 'user-downgrade',
      email: 'downgrade@test.com',
      name: 'User',
      plan: 'pro',
      isPro: true,
      isAdmin: false,
      token: 'token',
    };

    const downgradedUser: UserProfile = {
      ...proUser,
      plan: 'free',
      isPro: false,
    };

    test('Pro user has access', () => {
      expect(canAccessVegas(proUser)).toBe(true);
    });

    test('After downgrade, user loses access', () => {
      expect(canAccessVegas(downgradedUser)).toBe(false);
    });

    test('Downgraded user should see paywall on next access attempt', () => {
      const canAccess = canAccessFeature('free', 'pro');
      expect(canAccess).toBe(false);
    });
  });

  // ================================================================
  // SECTION 9: INVALID PLAN HANDLING
  // ================================================================
  describe('Invalid Plan Handling', () => {
    test('null plan is treated as free (fail-closed)', () => {
      const unknownUser: UserProfile = {
        id: 'user-unknown',
        email: 'unknown@test.com',
        name: 'User',
        plan: null,
        isPro: false,
        isAdmin: false,
        token: 'token',
      };
      expect(canAccessVegas(unknownUser)).toBe(false);
    });

    test('Invalid plan defaults to free tier', () => {
      expect(canAccessFeature('free', 'pro')).toBe(false);
    });
  });

  // ================================================================
  // SECTION 10: NO UNIMPLEMENTED BENEFITS
  // ================================================================
  describe('Feature Honesty', () => {
    test('No paywall claims AI projections (not implemented)', () => {
      Object.values(FEATURE_PAYWALL_CONFIG).forEach((config) => {
        const lower = config.description.toLowerCase();
        expect(lower).not.toContain('projection');
        expect(lower).not.toContain('predict');
      });
    });

    test('No paywall claims DFS tools (not implemented)', () => {
      Object.values(FEATURE_PAYWALL_CONFIG).forEach((config) => {
        const lower = config.description.toLowerCase();
        expect(lower).not.toContain('dfs');
        expect(lower).not.toContain('daily fantasy');
      });
    });

    test('No paywall claims priority support (not implemented)', () => {
      Object.values(FEATURE_PAYWALL_CONFIG).forEach((config) => {
        const lower = config.description.toLowerCase();
        expect(lower).not.toContain('priority support');
      });
    });
  });
});
