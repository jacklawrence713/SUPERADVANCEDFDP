/**
 * Topical Authority Expansion & Deepening (Phase 21.3)
 *
 * Identifies expansion opportunities within topic clusters
 */

export interface AuthorityExpansion {
  parentTopic: string
  currentContent: string[]
  expansionOpportunities: string[]
  subTopics: string[]
  estimatedTraffic: number
  authorityScore: number
  priority: 'high' | 'medium' | 'low'
}

/**
 * Generate topical authority expansion opportunities
 */
export function generateAuthorityExpansionStrategy(): AuthorityExpansion[] {
  return [
    {
      parentTopic: 'Dynasty Trade Valuation',
      currentContent: [
        '/guides/how-to-value-a-dynasty-trade/',
        '/dynasty-trade-analyzer/',
        '/dynasty-trade-calculator/',
      ],
      expansionOpportunities: [
        'Trade negotiation tactics and psychology',
        'Common trade mistakes to avoid',
        'Trade value by position (position-specific guides)',
        'Trade timing and market manipulation',
      ],
      subTopics: ['QB value in trades', 'RB scarcity premium', 'WR depth impact', 'TE premium pricing'],
      estimatedTraffic: 3200,
      authorityScore: 82,
      priority: 'high',
    },
    {
      parentTopic: 'Superflex Format Strategy',
      currentContent: ['/guides/superflex-strategy/', '/rankings/superflex/'],
      expansionOpportunities: [
        'QB landing spot analysis for Superflex',
        'Superflex draft position analysis',
        'Superflex vs 1QB comparison deep dive',
        'Superflex playoff strategy',
      ],
      subTopics: ['Early QB scarcity in SF', 'Mid-round QB value', 'Late-round waiver QBs', 'Backup QB strategies'],
      estimatedTraffic: 2100,
      authorityScore: 78,
      priority: 'high',
    },
    {
      parentTopic: 'Dynasty Rebuild Strategy',
      currentContent: ['/guides/how-to-value-a-dynasty-trade/', '/dynasty-buy-low/'],
      expansionOpportunities: [
        'Rebuild timeline decision framework',
        'Asset accumulation during rebuilds',
        'Year-by-year rebuild planning',
        'Rebuild acceleration strategies',
      ],
      subTopics: [
        'Early rebuild execution',
        'Mid-rebuild adjustments',
        'Contention transition planning',
        'Multi-year rebuild roadmap',
      ],
      estimatedTraffic: 2400,
      authorityScore: 75,
      priority: 'high',
    },
    {
      parentTopic: 'Rookie Evaluation Framework',
      currentContent: ['/dynasty-basics/'],
      expansionOpportunities: [
        'Landing spot impact on rookie value',
        'College tape analysis for rookies',
        'Rookie archetype performance patterns',
        'Rookie production curves by position',
      ],
      subTopics: ['QB landing spot value', 'RB volume efficiency', 'WR ceiling analysis', 'TE development trajectories'],
      estimatedTraffic: 1800,
      authorityScore: 72,
      priority: 'medium',
    },
    {
      parentTopic: 'TE Premium Format Mastery',
      currentContent: ['/guides/te-premium-strategy/', '/rankings/te-premium/'],
      expansionOpportunities: [
        'TE streaming in TEP leagues',
        'Tight end demand curve analysis',
        'TE age-based scoring adjustments',
        'TE injury impact assessment',
      ],
      subTopics: ['Elite TE positioning', 'TE premium breakpoints', 'Middle-tier TE strategy', 'TE waiver targets'],
      estimatedTraffic: 1600,
      authorityScore: 74,
      priority: 'medium',
    },
  ]
}

/**
 * Get expansion opportunities by priority
 */
export function getExpansionsByPriority(priority: 'high' | 'medium' | 'low'): AuthorityExpansion[] {
  return generateAuthorityExpansionStrategy().filter((exp) => exp.priority === priority)
}

/**
 * Calculate authority score improvement potential
 */
export function calculateAuthorityImprovement(expansions: AuthorityExpansion[]): number {
  const currentAverage = expansions.reduce((sum, e) => sum + e.authorityScore, 0) / expansions.length
  const potentialAverage = currentAverage + 12
  return Math.round(potentialAverage - currentAverage)
}

/**
 * Generate content hierarchy for authority topic
 */
export function generateContentHierarchy(parentTopic: string): Array<{ level: number; title: string; type: string; status: string }> {
  return [
    { level: 1, title: `${parentTopic} Hub`, type: 'Pillar Page', status: 'Existing' },
    { level: 2, title: `${parentTopic} Fundamentals`, type: 'Guide', status: 'Existing/Planned' },
    { level: 2, title: `${parentTopic} Advanced Strategy`, type: 'Strategy Guide', status: 'Planned' },
    { level: 3, title: 'Topic-Specific Case Studies', type: 'Analysis', status: 'Planned' },
    { level: 3, title: 'Tools & Calculators', type: 'Interactive', status: 'Existing/Enhanced' },
  ]
}
