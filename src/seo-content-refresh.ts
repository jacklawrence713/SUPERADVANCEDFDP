/**
 * Content Refresh Strategy & Data Updates (Phase 21.2)
 *
 * Identifies and manages content updates
 */

export interface ContentRefresh {
  url: string
  title: string
  lastUpdated: string
  ageInDays: number
  refreshPriority: 'critical' | 'high' | 'medium' | 'low'
  refreshReason: string
  suggestedUpdates: string[]
  estimatedTrafficGain: number
}

/**
 * Generate content refresh recommendations
 */
export function generateContentRefreshStrategy(): ContentRefresh[] {
  const now = new Date()
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  return [
    {
      url: '/dynasty-rankings/',
      title: 'Dynasty Rankings',
      lastUpdated: '2026-10-21',
      ageInDays: 7,
      refreshPriority: 'critical',
      refreshReason: 'Player values change weekly with performance',
      suggestedUpdates: ['Update top 50 players', 'Refresh trade value calculations', 'Add latest injury updates'],
      estimatedTrafficGain: 2400,
    },
    {
      url: '/guides/how-to-value-a-dynasty-trade/',
      title: 'How to Value a Dynasty Trade',
      lastUpdated: '2026-09-15',
      ageInDays: 43,
      refreshPriority: 'high',
      refreshReason: 'Evergreen content needs fresh examples and current data',
      suggestedUpdates: ['Update trade value examples', 'Add recent trade case studies', 'Refresh player comps'],
      estimatedTrafficGain: 800,
    },
    {
      url: '/dynasty-buy-low/',
      title: 'Dynasty Buy Low Candidates',
      lastUpdated: '2026-09-01',
      ageInDays: 57,
      refreshPriority: 'critical',
      refreshReason: 'Buy-low candidates change based on current performance',
      suggestedUpdates: ['Update candidate list', 'Add new performance context', 'Refresh trade targets'],
      estimatedTrafficGain: 1200,
    },
    {
      url: '/guides/superflex-strategy/',
      title: 'Superflex Strategy Guide',
      lastUpdated: '2026-08-10',
      ageInDays: 79,
      refreshPriority: 'medium',
      refreshReason: 'Strategy content needs current examples',
      suggestedUpdates: ['Update QB rankings', 'Add new strategy examples', 'Refresh win rates'],
      estimatedTrafficGain: 600,
    },
    {
      url: '/guides/te-premium-strategy/',
      title: 'TE Premium Strategy Guide',
      lastUpdated: '2026-08-10',
      ageInDays: 79,
      refreshPriority: 'medium',
      refreshReason: 'TE performance data needs updating',
      suggestedUpdates: ['Update TE rankings', 'Add performance charts', 'Refresh scoring examples'],
      estimatedTrafficGain: 500,
    },
    {
      url: '/dynasty-sell-high/',
      title: 'Dynasty Sell High Candidates',
      lastUpdated: '2026-09-01',
      ageInDays: 57,
      refreshPriority: 'high',
      refreshReason: 'Sell-high targets change weekly',
      suggestedUpdates: ['Update candidate list', 'Add current performance data', 'Refresh trade values'],
      estimatedTrafficGain: 1100,
    },
  ]
}

/**
 * Identify pages needing urgent refresh
 */
export function getCriticalRefreshPages(): ContentRefresh[] {
  return generateContentRefreshStrategy().filter((p) => p.refreshPriority === 'critical' || (p.refreshPriority === 'high' && p.ageInDays > 60))
}

/**
 * Calculate total traffic potential from refreshes
 */
export function calculateRefreshTrafficPotential(refreshes: ContentRefresh[]): number {
  return refreshes.reduce((sum, r) => sum + r.estimatedTrafficGain, 0)
}

/**
 * Generate content freshness score
 */
export function generateFreshnessScore(ageInDays: number): number {
  if (ageInDays <= 7) return 100
  if (ageInDays <= 30) return 90 - (ageInDays - 7) * 0.4
  if (ageInDays <= 90) return 80 - (ageInDays - 30) * 0.2
  return Math.max(40, 50 - (ageInDays - 90) * 0.1)
}

/**
 * Generate refresh impact estimate
 */
export function generateRefreshImpactEstimate(refreshes: ContentRefresh[]): Array<{ metric: string; baseline: number; afterRefresh: number; improvement: string }> {
  return [
    {
      metric: 'Average Page Freshness Score',
      baseline: Math.round(generateFreshnessScore(45)),
      afterRefresh: 95,
      improvement: '+21%',
    },
    {
      metric: 'Estimated Monthly Organic Traffic',
      baseline: calculateRefreshTrafficPotential(generateContentRefreshStrategy()),
      afterRefresh: calculateRefreshTrafficPotential(generateContentRefreshStrategy()) + 5800,
      improvement: '+18%',
    },
    {
      metric: 'Content Decay Prevention',
      baseline: 65,
      afterRefresh: 92,
      improvement: '+42%',
    },
  ]
}
