/**
 * Entitlements & Authorization Model
 *
 * Canonical tier identity source: plan field (from Supabase public.users)
 * Authority: Server-loaded profile, never client localStorage
 * Tier values: 'free' | 'pro' | 'elite'
 *
 * IMPORTANT: This module defines read-only tier checks.
 * Do NOT use localStorage isPro as authoritative.
 * Always derive from server-loaded plan field.
 */

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'elite' | null | undefined;
  isAdmin: boolean;
  token: string;
}

/**
 * Canonical tier checks — use these instead of scattered isPro checks
 */

export const isPaidTier = (profile: UserProfile | null | undefined): boolean => {
  if (!profile?.plan) return false;
  return profile.plan === 'pro' || profile.plan === 'elite';
};

export const isProTier = (profile: UserProfile | null | undefined): boolean => {
  if (!profile?.plan) return false;
  return profile.plan === 'pro' || profile.plan === 'elite';
};

export const isEliteTier = (profile: UserProfile | null | undefined): boolean => {
  return profile?.plan === 'elite';
};

export const isFreeTier = (profile: UserProfile | null | undefined): boolean => {
  if (!profile?.plan) return true; // Treat null/undefined as Free (fail-closed)
  return profile.plan === 'free';
};

/**
 * Feature-specific entitlement checks
 * (Use these for clarity rather than isPaidTier directly)
 */

export const canAccessLeagueFeatures = (profile: UserProfile | null | undefined): boolean => {
  // League Connect, Trade Finder, League Intelligence = Pro/Elite only
  return isPaidTier(profile);
};

export const canAccessVegas = (profile: UserProfile | null | undefined): boolean => {
  // Vegas/Game Intelligence = Pro/Elite only
  return isPaidTier(profile);
};

export const canAccessValueHistory = (profile: UserProfile | null | undefined): boolean => {
  // Value History = Pro/Elite only
  return isPaidTier(profile);
};

export const canAccessWhyValueChanged = (profile: UserProfile | null | undefined): boolean => {
  // Why Value Changed (inherits Value History entitlement) = Pro/Elite only
  return isPaidTier(profile);
};

/**
 * Trade Analyzer entitlements
 * Note: Prompt 27 does NOT implement 2/day quota enforcement
 * That is handled in Prompt 28
 */

export const canAccessUnlimitedTradeAnalyzer = (profile: UserProfile | null | undefined): boolean => {
  // Pro/Elite = unlimited (no daily quota)
  return isPaidTier(profile);
};

/**
 * Billings/Account management
 */

export const canAccessBillingPortal = (profile: UserProfile | null | undefined): boolean => {
  // Authenticated users (Free, Pro, Elite) can access billing
  return profile?.id !== null && profile?.id !== undefined;
};

export const isManagedSubscription = (profile: UserProfile | null | undefined): boolean => {
  // True if user is paid (show "Manage" instead of "Upgrade")
  return isPaidTier(profile);
};

/**
 * Admin checks
 * Note: isAdmin is separate from plan/entitlement
 */

export const isAdmin = (profile: UserProfile | null | undefined): boolean => {
  return profile?.isAdmin === true;
};

/**
 * Invalid/unknown plan safety check
 */

export const isValidPlan = (plan: any): plan is 'free' | 'pro' | 'elite' => {
  return plan === 'free' || plan === 'pro' || plan === 'elite';
};

/**
 * Fail-closed for unknown plans
 */

export const getEffectivePlan = (plan: any): 'free' | 'pro' | 'elite' => {
  if (isValidPlan(plan)) return plan;
  return 'free'; // Unknown plan → no paid entitlements
};
