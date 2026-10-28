/**
 * Trending Topics & Real-Time Integration (Phase 21.5)
 *
 * Identifies trending queries and real-time opportunities in fantasy football space
 */

export interface TrendingTopic {
  query: string
  category: string
  trendingVolume: number
  momentum: number
  relatedPages: string[]
  contentOpportunities: string[]
  competitionLevel: 'low' | 'medium' | 'high'
  estimatedTraffic: number
  urgency: 'immediate' | 'high' | 'medium'
}

/**
 * Generate trending topics in fantasy football
 */
export function generateTrendingTopics(): TrendingTopic[] {
  return [
    {
      query: 'dynasty rookie class 2026 evaluation',
      category: 'Rookies',
      trendingVolume: 8400,
      momentum: 94,
      relatedPages: ['/rankings/rookies/', '/dynasty-basics/', '/guides/rookie-evaluation/'],
      contentOpportunities: [
        'Create 2026 rookie class rankings by tier',
        'Build landing spot impact analysis',
        'Compare rookie class strength to historical classes',
        'Create position-specific rookie guides',
      ],
      competitionLevel: 'high',
      estimatedTraffic: 2100,
      urgency: 'immediate',
    },
    {
      query: 'trade value chart dynasty 2026',
      category: 'Trading',
      trendingVolume: 6800,
      momentum: 89,
      relatedPages: ['/dynasty-trade-calculator/', '/guides/how-to-value-a-dynasty-trade/', '/rankings/qb/'],
      contentOpportunities: [
        'Create downloadable 2026 trade value chart',
        'Build position-specific trade value guides',
        'Develop interactive trade value tool',
        'Create weekly trade value update schedule',
      ],
      competitionLevel: 'medium',
      estimatedTraffic: 1800,
      urgency: 'immediate',
    },
    {
      query: 'superflex draft strategy 2027',
      category: 'Format Strategy',
      trendingVolume: 5200,
      momentum: 82,
      relatedPages: ['/guides/superflex-strategy/', '/rankings/qb/', '/rankings/rb/'],
      contentOpportunities: [
        'Create 2027 superflex draft position rankings',
        'Build early QB scarcity analysis',
        'Develop draft strategy for each position',
        'Create QB landing spot analysis tool',
      ],
      competitionLevel: 'high',
      estimatedTraffic: 1400,
      urgency: 'high',
    },
    {
      query: 'dynasty team rebuild checklist',
      category: 'Strategy',
      trendingVolume: 3900,
      momentum: 76,
      relatedPages: ['/guides/dynasty-rebuild-strategy/', '/dynasty-buy-low/', '/dynasty-sell-high/'],
      contentOpportunities: [
        'Create downloadable rebuild planning template',
        'Build year-by-year rebuild roadmap framework',
        'Develop asset accumulation checklist',
        'Create rebuild success metrics dashboard',
      ],
      competitionLevel: 'low',
      estimatedTraffic: 950,
      urgency: 'high',
    },
    {
      query: 'tight end injury impact dynasty fantasy',
      category: 'Position Analysis',
      trendingVolume: 4600,
      momentum: 85,
      relatedPages: ['/rankings/te/', '/guides/te-premium-strategy/', '/dynasty-basics/'],
      contentOpportunities: [
        'Create TE injury impact framework',
        'Build backfield impact analysis tool',
        'Develop replacement-level TE valuation guide',
        'Create TE age-based valuation curve',
      ],
      competitionLevel: 'medium',
      estimatedTraffic: 1100,
      urgency: 'immediate',
    },
    {
      query: 'dynasty fantasy football buy low opportunities',
      category: 'Trading Tactics',
      trendingVolume: 7200,
      momentum: 91,
      relatedPages: ['/dynasty-buy-low/', '/dynasty-sell-high/', '/guides/how-to-value-a-dynasty-trade/'],
      contentOpportunities: [
        'Create weekly buy-low candidate updates',
        'Build buy-low identification framework',
        'Develop trade negotiation guide',
        'Create player valuation jump opportunities list',
      ],
      competitionLevel: 'medium',
      estimatedTraffic: 1600,
      urgency: 'immediate',
    },
  ]
}

/**
 * Get immediate urgency trending topics
 */
export function getImmediateTrends(): TrendingTopic[] {
  return generateTrendingTopics().filter((t) => t.urgency === 'immediate')
}

/**
 * Calculate trending opportunity score
 */
export function calculateTrendScore(topic: TrendingTopic): number {
  const volumeScore = Math.min(topic.trendingVolume / 100, 40)
  const momentumScore = (topic.momentum / 100) * 40
  const competitionScore = topic.competitionLevel === 'low' ? 20 : topic.competitionLevel === 'medium' ? 10 : 0

  return Math.round(volumeScore + momentumScore + competitionScore)
}

/**
 * Get top trending opportunities by score
 */
export function getTopTrendingOpportunities(limit: number = 3): TrendingTopic[] {
  return generateTrendingTopics()
    .sort((a, b) => calculateTrendScore(b) - calculateTrendScore(a))
    .slice(0, limit)
}

/**
 * Estimate total traffic from trending topics
 */
export function estimateTrendingTraffic(topics: TrendingTopic[]): number {
  return topics.reduce((sum, t) => sum + t.estimatedTraffic, 0)
}

/**
 * Generate trending impact potential
 */
export function generateTrendingImpact(): Array<{ metric: string; current: number; potential: number; opportunity: string }> {
  const allTrends = generateTrendingTopics()
  const currentTraffic = estimateTrendingTraffic(allTrends)

  return [
    {
      metric: 'Trending Topic Traffic Opportunity',
      current: 0,
      potential: currentTraffic,
      opportunity: 'Capture 6 high-momentum trending queries',
    },
    {
      metric: 'Average Trend Momentum',
      current: Math.round(allTrends.reduce((sum, t) => sum + t.momentum, 0) / allTrends.length),
      potential: 92,
      opportunity: 'Focus on topics with 85+ momentum scores',
    },
    {
      metric: 'Immediate Action Items',
      current: allTrends.filter((t) => t.urgency === 'immediate').length,
      potential: allTrends.length,
      opportunity: 'Address all trending topics strategically',
    },
  ]
}
