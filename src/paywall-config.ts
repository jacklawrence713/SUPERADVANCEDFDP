/**
 * PAYWALL CONFIGURATION (Prompt 30)
 *
 * Centralized feature gating and paywall copy.
 * Preserves FDP branding while providing consistent locked-feature UX.
 *
 * Server-side entitlement enforcement remains authoritative in Edge Functions / RLS.
 * This config controls frontend presentation only.
 */

export type FeatureKey =
  | 'league_connect'
  | 'trade_finder'
  | 'league_intelligence'
  | 'vegas'
  | 'value_history'
  | 'why_value_changed'
  | 'trade_analyzer_limit';

export type AccessTier = 'anonymous' | 'free' | 'pro' | 'elite';

export interface FeatureConfig {
  key: FeatureKey;
  displayName: string;
  description: string;
  requiredTier: 'pro' | 'elite'; // Both Pro and Elite can access; no Elite-exclusive features in this phase
  shortCopy?: string;
}

export const FEATURE_PAYWALL_CONFIG: Record<FeatureKey, FeatureConfig> = {
  league_connect: {
    key: 'league_connect',
    displayName: 'League Connect',
    description: 'Import and analyze leagues from Sleeper or ESPN.',
    requiredTier: 'pro',
    shortCopy: 'Compare trade opportunities across your connected league.'
  },
  trade_finder: {
    key: 'trade_finder',
    displayName: 'Trade Finder',
    description: 'Find and evaluate potential trades from your league.',
    requiredTier: 'pro',
    shortCopy: 'Discover profitable trades in your league.'
  },
  league_intelligence: {
    key: 'league_intelligence',
    displayName: 'League Intelligence',
    description: 'Analyze team rosters, scoring, and standings context.',
    requiredTier: 'pro',
    shortCopy: 'Get detailed analysis of your league landscape.'
  },
  vegas: {
    key: 'vegas',
    displayName: 'Game Lines',
    description: 'View NFL game lines, Vegas spreads, and fantasy-relevant context.',
    requiredTier: 'pro',
    shortCopy: 'See Vegas lines and game context.'
  },
  value_history: {
    key: 'value_history',
    displayName: 'Value History',
    description: 'Track FDP Dynasty Value changes over time for every player.',
    requiredTier: 'pro',
    shortCopy: 'See FDP Value history and movement.'
  },
  why_value_changed: {
    key: 'why_value_changed',
    displayName: 'Value Explanation',
    description: 'Understand the factors driving recent Value changes.',
    requiredTier: 'pro',
    shortCopy: 'Learn why player values are changing.'
  },
  trade_analyzer_limit: {
    key: 'trade_analyzer_limit',
    displayName: 'Trade Analyzer',
    description: 'Unlimited AI-powered trade analysis.',
    requiredTier: 'pro',
    shortCopy: 'Free users get 3 lifetime analyses. Upgrade for unlimited.'
  }
};

/**
 * Get paywall copy for a feature
 */
export function getFeaturePaywallCopy(feature: FeatureKey): { title: string; description: string; cta: string } {
  const config = FEATURE_PAYWALL_CONFIG[feature];

  if (feature === 'trade_analyzer_limit') {
    return {
      title: 'Analysis Limit Reached',
      description: 'Free accounts get 3 total successful Trade Analyzer analyses. Lifetime limit, no daily reset.',
      cta: 'Upgrade to Unlimited'
    };
  }

  return {
    title: `${config.displayName} is a Pro Feature`,
    description: config.description,
    cta: 'Upgrade to Pro'
  };
}

/**
 * Whether user can access a feature based on tier
 */
export function canAccessFeature(userTier: AccessTier, requiredTier: 'pro' | 'elite'): boolean {
  if (userTier === 'elite') return true;
  if (userTier === 'pro') return requiredTier === 'pro';
  return false;
}

/**
 * Get human-readable tier display name
 */
export function getTierDisplay(tier: AccessTier): string {
  switch (tier) {
    case 'anonymous': return 'Anonymous';
    case 'free': return 'Free';
    case 'pro': return 'Pro';
    case 'elite': return 'Elite';
  }
}
