/**
 * External Link Opportunity Identification (Phase 22.2)
 *
 * Identifies potential external link sources and partnership opportunities
 */

export interface ExternalLinkOpportunity {
  domain: string
  domainAuthority: number
  relevance: number
  targetUrl: string
  linkType: 'guest-post' | 'resource' | 'partnership' | 'citation' | 'mention'
  difficulty: 'easy' | 'moderate' | 'hard'
  estimatedTraffic: number
  outreachStrategy: string
  priority: 'high' | 'medium' | 'low'
}

/**
 * Generate external link opportunities
 */
export function generateExternalLinkOpportunities(): ExternalLinkOpportunity[] {
  return [
    {
      domain: 'dynasty-fantasy-pro.com',
      domainAuthority: 68,
      relevance: 95,
      targetUrl: '/guides/how-to-value-a-dynasty-trade/',
      linkType: 'guest-post',
      difficulty: 'moderate',
      estimatedTraffic: 450,
      outreachStrategy: 'Guest post on trade valuation strategies (1,200 words)',
      priority: 'high',
    },
    {
      domain: 'the-score.com/fantasy',
      domainAuthority: 92,
      relevance: 88,
      targetUrl: '/rankings/qb/',
      linkType: 'resource',
      difficulty: 'hard',
      estimatedTraffic: 1200,
      outreachStrategy: 'Featured resource link in weekly dynasty QB rankings article',
      priority: 'high',
    },
    {
      domain: 'fantasy-football-analytics.io',
      domainAuthority: 71,
      relevance: 92,
      targetUrl: '/dynasty-trade-calculator/',
      linkType: 'tool-integration',
      difficulty: 'moderate',
      estimatedTraffic: 320,
      outreachStrategy: 'Tool integration partnership (bi-directional link)',
      priority: 'high',
    },
    {
      domain: 'reddit-fantasy-football-guides.com',
      domainAuthority: 54,
      relevance: 86,
      targetUrl: '/guides/superflex-strategy/',
      linkType: 'resource',
      difficulty: 'easy',
      estimatedTraffic: 280,
      outreachStrategy: 'Resource link in megathread seasonal guide compilation',
      priority: 'medium',
    },
    {
      domain: 'fantasy-football-almanac.net',
      domainAuthority: 65,
      relevance: 89,
      targetUrl: '/dynasty-basics/',
      linkType: 'citation',
      difficulty: 'moderate',
      estimatedTraffic: 210,
      outreachStrategy: 'Citation link in definitive dynasty league guide',
      priority: 'medium',
    },
    {
      domain: 'rotoballer.com',
      domainAuthority: 79,
      relevance: 91,
      targetUrl: '/guides/te-premium-strategy/',
      linkType: 'guest-post',
      difficulty: 'hard',
      estimatedTraffic: 680,
      outreachStrategy: 'Guest post on TE premium format strategy and breakpoints',
      priority: 'high',
    },
    {
      domain: 'espn-fantasy-blog.com',
      domainAuthority: 85,
      relevance: 87,
      targetUrl: '/',
      linkType: 'mention',
      difficulty: 'hard',
      estimatedTraffic: 900,
      outreachStrategy: 'Media mention/feature in dynasty trade analysis roundup',
      priority: 'high',
    },
    {
      domain: 'fantasy-league-academy.com',
      domainAuthority: 58,
      relevance: 84,
      targetUrl: '/guides/dynasty-rebuild-strategy/',
      linkType: 'partnership',
      difficulty: 'moderate',
      estimatedTraffic: 390,
      outreachStrategy: 'Educational partnership (course/lesson links)',
      priority: 'medium',
    },
  ]
}

/**
 * Get high-priority link opportunities
 */
export function getHighPriorityOpportunities(): ExternalLinkOpportunity[] {
  return generateExternalLinkOpportunities()
    .filter((opp) => opp.priority === 'high')
    .sort((a, b) => b.estimatedTraffic - a.estimatedTraffic)
}

/**
 * Calculate total traffic potential from external links
 */
export function calculateExternalTrafficPotential(opportunities: ExternalLinkOpportunity[]): number {
  return opportunities.reduce((sum, opp) => sum + opp.estimatedTraffic, 0)
}

/**
 * Group opportunities by domain authority
 */
export function groupByDomainAuthority(opportunities: ExternalLinkOpportunity[]): Record<string, ExternalLinkOpportunity[]> {
  return opportunities.reduce(
    (acc, opp) => {
      const tier = opp.domainAuthority >= 80 ? 'authority-80plus' : opp.domainAuthority >= 65 ? 'authority-65-79' : 'authority-below-65'
      if (!acc[tier]) acc[tier] = []
      acc[tier].push(opp)
      return acc
    },
    {} as Record<string, ExternalLinkOpportunity[]>
  )
}

/**
 * Generate link building roadmap
 */
export function generateLinkBuildingRoadmap(): Array<{ phase: string; month: string; targets: number; expectedTraffic: number; strategy: string }> {
  const allOpps = generateExternalLinkOpportunities()
  const traffic = calculateExternalTrafficPotential(allOpps)

  return [
    {
      phase: 'Phase 1: Quick Wins',
      month: 'Month 1',
      targets: 3,
      expectedTraffic: Math.round(traffic * 0.25),
      strategy: 'Focus on easy-difficulty resource links (reddit, fantasy-league-academy, etc)',
    },
    {
      phase: 'Phase 2: Medium Authority',
      month: 'Months 2-3',
      targets: 3,
      expectedTraffic: Math.round(traffic * 0.35),
      strategy: 'Guest posts on moderate-difficulty domains (dynasty-pro, fantasy-analytics, etc)',
    },
    {
      phase: 'Phase 3: Premium Links',
      month: 'Months 4-6',
      targets: 2,
      expectedTraffic: Math.round(traffic * 0.4),
      strategy: 'High-difficulty links from major publications (The Score, Rotoballer, ESPN)',
    },
  ]
}
