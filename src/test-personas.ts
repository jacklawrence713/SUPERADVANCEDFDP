/**
 * Test Personas & Security Infrastructure for Prompts 26-34
 *
 * This module provides SAFE test persona definitions for:
 * - Anonymous (no account)
 * - Free (authenticated, plan=free)
 * - Pro (authenticated, plan=pro)
 * - Elite (authenticated, plan=elite)
 * - Downgraded (authenticated, plan=free, former paid)
 *
 * CRITICAL REQUIREMENTS:
 * - Production is FAIL-CLOSED: fixture tools refuse to operate against production
 * - No hardcoded app bypasses (no forcePro, testPro, etc.)
 * - Personas use actual application data model (public.users, auth.users)
 * - No secrets committed
 * - No passwords in code
 *
 * ENVIRONMENT DETECTION:
 * Local Supabase: localhost:54321 (API) or SUPABASE_URL env var
 * Staging: explicitly approved SUPABASE_URL only
 * Production: automatically BLOCKED
 */

/**
 * Application-level user profile as FDP reads it from Supabase
 */
export interface ApplicationProfile {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'elite';
  is_pro: boolean;
  is_admin: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Test persona definition
 */
export interface TestPersona {
  /** Persona identifier (e.g. 'free', 'pro') */
  id: string;

  /** Human-readable description */
  description: string;

  /** Test email (not real, obviously fake) */
  email: string;

  /** Application profile state as returned from public.users */
  profile: ApplicationProfile;

  /** Expected UI/API entitlements */
  expectedAccess: {
    rankingsFull: boolean;
    tradeAnalyzerUI: boolean;
    tradeAnalyzerAPI: boolean;
    leagueConnect: boolean;
    tradeFinder: boolean;
    leagueIntelligence: boolean;
    vegasLines: boolean;
    valueHistory: boolean;
    whyValueChanged: boolean;
    billingPortal: boolean;
  };

  /** Notes about this persona */
  notes: string;
}

/**
 * ANONYMOUS PERSONA
 * No account, no auth, no entitlements
 *
 * Used for testing:
 * - Login-required behavior
 * - 401 API responses
 * - Anonymous route protection
 */
export const PERSONA_ANONYMOUS: TestPersona = {
  id: 'anonymous',
  description: 'No account, no authentication',
  email: 'N/A',
  profile: {
    id: '',
    email: '',
    name: '',
    plan: 'free',
    is_pro: false,
    is_admin: false,
  },
  expectedAccess: {
    rankingsFull: false,
    tradeAnalyzerUI: false,
    tradeAnalyzerAPI: false,
    leagueConnect: false,
    tradeFinder: false,
    leagueIntelligence: false,
    vegasLines: false,
    valueHistory: false,
    whyValueChanged: false,
    billingPortal: false,
  },
  notes:
    'No Supabase Auth user. Tests login-required behavior and 401 responses.',
};

/**
 * FREE PERSONA
 * Authenticated, plan=free, is_pro=false
 *
 * Current behavior (Prompt 25):
 * - Trade Analyzer UI: shows 3/day counter (browser-local, UTC bucket)
 * - Trade Analyzer API: accepts requests if authenticated, NO server-side limit (unmetered)
 * - League/Trade features: UI-gated only, visible but dysfunctional
 * - Vegas: visible but should be gated (currently leaks)
 * - Value History: top 20 players via UI filter, all available via API
 *
 * Used for testing:
 * - Paywall visibility
 * - Browser-local trade count behavior
 * - Multi-device trade count bypass
 * - RLS vulnerability (can self-modify is_pro)
 * - API entitlement enforcement gaps
 * - Feature gate client-only weakness
 */
export const PERSONA_FREE = (baseId: string = 'test-free'): TestPersona => ({
  id: baseId,
  description: 'Authenticated Free account',
  email: `fdp-${baseId}@test-localhost`,
  profile: {
    id: baseId,
    email: `fdp-${baseId}@test-localhost`,
    name: 'Free Test User',
    plan: 'free',
    is_pro: false,
    is_admin: false,
    stripe_customer_id: undefined,
    stripe_subscription_id: undefined,
    subscription_status: 'inactive',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  expectedAccess: {
    rankingsFull: false, // Top 20 only (UI filter)
    tradeAnalyzerUI: true, // Visible, but counter shows 3/day
    tradeAnalyzerAPI: true, // Accepts requests (NO server limit yet)
    leagueConnect: false, // UI-gated, not functional
    tradeFinder: false, // UI-gated
    leagueIntelligence: false, // UI-gated
    vegasLines: true, // Currently leaks to Free (Prompt 27 will fix)
    valueHistory: true, // Top 20 via UI filter, API returns all
    whyValueChanged: true, // No gate yet
    billingPortal: false, // Shows "Upgrade"
  },
  notes:
    'CURRENT BEHAVIOR: Browser localStorage 3/day counter + unmetered API. Prompt 28 will enforce 3 lifetime.',
});

/**
 * PRO PERSONA
 * Authenticated, plan=pro, is_pro=true
 *
 * Current behavior (Prompt 25):
 * - Identical to Elite in current code (is_pro boolean doesn't distinguish)
 * - League features: UI visible
 * - All rankings: available
 *
 * Used for testing:
 * - Pro feature access
 * - Pro vs Elite distinction (may be same UI for now)
 * - Upgrade/downgrade flows
 * - Stripe subscription lifecycle
 */
export const PERSONA_PRO = (baseId: string = 'test-pro'): TestPersona => ({
  id: baseId,
  description: 'Authenticated Pro account',
  email: `fdp-${baseId}@test-localhost`,
  profile: {
    id: baseId,
    email: `fdp-${baseId}@test-localhost`,
    name: 'Pro Test User',
    plan: 'pro',
    is_pro: true,
    is_admin: false,
    stripe_customer_id: 'cus_test_pro',
    stripe_subscription_id: 'sub_test_pro',
    subscription_status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  expectedAccess: {
    rankingsFull: true,
    tradeAnalyzerUI: true, // Unlimited
    tradeAnalyzerAPI: true, // Unlimited
    leagueConnect: true,
    tradeFinder: true,
    leagueIntelligence: true,
    vegasLines: true,
    valueHistory: true,
    whyValueChanged: true,
    billingPortal: true, // Show "Manage"
  },
  notes:
    'CURRENT: identical to Elite because is_pro is boolean. Prompt 27 may differentiate.',
});

/**
 * ELITE PERSONA
 * Authenticated, plan=elite, is_pro=true
 *
 * Distinct from Pro only via plan field (is_pro boolean same).
 * Prompt 27 will decide feature differentiation.
 *
 * Used for testing:
 * - Elite tier distinction
 * - Elite-specific features (if any)
 * - Stripe Elite subscriptions
 * - Multi-tier entitlement logic
 */
export const PERSONA_ELITE = (baseId: string = 'test-elite'): TestPersona => ({
  id: baseId,
  description: 'Authenticated Elite account',
  email: `fdp-${baseId}@test-localhost`,
  profile: {
    id: baseId,
    email: `fdp-${baseId}@test-localhost`,
    name: 'Elite Test User',
    plan: 'elite',
    is_pro: true,
    is_admin: false,
    stripe_customer_id: 'cus_test_elite',
    stripe_subscription_id: 'sub_test_elite',
    subscription_status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  expectedAccess: {
    rankingsFull: true,
    tradeAnalyzerUI: true, // Unlimited
    tradeAnalyzerAPI: true, // Unlimited
    leagueConnect: true,
    tradeFinder: true,
    leagueIntelligence: true,
    vegasLines: true,
    valueHistory: true,
    whyValueChanged: true,
    billingPortal: true, // Show "Manage"
  },
  notes: 'CURRENT: same as Pro since is_pro boolean. Prompt 27 will define Elite-only features if any.',
});

/**
 * DOWNGRADED PERSONA
 * Authenticated, plan=free, is_pro=false, BUT subscription_status was active
 *
 * Represents a user who previously paid but subscription expired/cancelled.
 *
 * Used for testing:
 * - Loss of entitlement
 * - Stale localStorage state
 * - Saved league data remains but features unavailable
 * - Billing portal shows re-upgrade option
 */
export const PERSONA_DOWNGRADED = (baseId: string = 'test-downgraded'): TestPersona => ({
  id: baseId,
  description: 'Downgraded (formerly Pro)',
  email: `fdp-${baseId}@test-localhost`,
  profile: {
    id: baseId,
    email: `fdp-${baseId}@test-localhost`,
    name: 'Downgraded Test User',
    plan: 'free',
    is_pro: false,
    is_admin: false,
    stripe_customer_id: 'cus_test_downgraded',
    stripe_subscription_id: undefined,
    subscription_status: 'cancelled',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  expectedAccess: {
    rankingsFull: false, // Reverted to Free access
    tradeAnalyzerUI: true, // Counter shows 3/day
    tradeAnalyzerAPI: true, // No server limit
    leagueConnect: false, // Reverted to gated
    tradeFinder: false,
    leagueIntelligence: false,
    vegasLines: true, // Leaks (same as Free)
    valueHistory: true, // Top 20 only
    whyValueChanged: true,
    billingPortal: false, // Shows "Upgrade"
  },
  notes:
    'Former Pro downgraded. Tests loss of entitlement, stale state, and re-upgrade flows.',
});

/**
 * PRODUCTION GUARD
 * Prevents fixture tools from operating against production
 *
 * Fails CLOSED — any suspicion of production → abort
 */
export function validateEnvironmentIsSafe(): {
  isSafe: boolean;
  environment: string;
  reason?: string;
} {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseLocalUrl = process.env.SUPABASE_LOCAL_URL || '';

  // Check 1: Explicitly approved local/staging
  if (
    supabaseUrl.includes('localhost') ||
    supabaseUrl.includes('127.0.0.1') ||
    supabaseLocalUrl.includes('localhost')
  ) {
    return { isSafe: true, environment: 'local' };
  }

  // Check 2: Approved staging project (if configured)
  const approvedStaging = process.env.APPROVED_STAGING_PROJECT_REF || '';
  if (approvedStaging && supabaseUrl.includes(approvedStaging)) {
    return { isSafe: true, environment: 'staging' };
  }

  // Check 3: Known production project → BLOCK
  if (supabaseUrl.includes('wizdxspglxpvvogiivsv')) {
    return {
      isSafe: false,
      environment: 'PRODUCTION',
      reason: 'Detected production project reference. Fixture creation is BLOCKED.',
    };
  }

  // Check 4: No environment configured → BLOCK
  if (!supabaseUrl) {
    return {
      isSafe: false,
      environment: 'UNKNOWN',
      reason: 'VITE_SUPABASE_URL not set. Cannot verify environment safety.',
    };
  }

  // Check 5: Unknown URL → BLOCK (fail closed)
  return {
    isSafe: false,
    environment: 'UNKNOWN',
    reason:
      'Cannot verify environment safety. Set VITE_SUPABASE_URL to localhost or APPROVED_STAGING_PROJECT_REF.',
  };
}

/**
 * All available test personas
 */
export const TEST_PERSONAS = {
  anonymous: PERSONA_ANONYMOUS,
  free: PERSONA_FREE,
  pro: PERSONA_PRO,
  elite: PERSONA_ELITE,
  downgraded: PERSONA_DOWNGRADED,
};

/**
 * Persona registry type for accessing personas
 */
export type PersonaKey = keyof typeof TEST_PERSONAS;
