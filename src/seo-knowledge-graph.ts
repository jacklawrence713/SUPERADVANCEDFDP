/**
 * Dynamic Content Recommendations & Knowledge Graph (Phase 16)
 *
 * Builds relationships between:
 * - Players by position, age, team, value tier
 * - Guides to tools to rankings
 * - Strategies to specific player recommendations
 * - Formats to position-specific insights
 */

export interface PlayerRelationship {
  playerName: string
  relationType: 'comparable' | 'position-peer' | 'team-mate' | 'age-cohort' | 'value-tier'
  relatedPlayers: string[]
  confidence: number
}

/**
 * Generate knowledge graph connections for player pages
 */
export function generatePlayerKnowledgeGraph(
  playerName: string,
  position: string,
  team: string,
  age: number,
  value: number,
  allPlayers: any[]
): PlayerRelationship[] {
  const relationships: PlayerRelationship[] = []

  // Find position peers (same position, ±5 years old)
  const positionPeers = allPlayers
    .filter(p =>
      p.pos === position &&
      p.name !== playerName &&
      Math.abs(p.age - age) <= 5
    )
    .sort((a, b) => Math.abs(a.tradeVal - value) - Math.abs(b.tradeVal - value))
    .slice(0, 3)
    .map(p => p.name)

  if (positionPeers.length > 0) {
    relationships.push({
      playerName,
      relationType: 'position-peer',
      relatedPlayers: positionPeers,
      confidence: 0.9,
    })
  }

  // Find team mates (same team)
  const teamMates = allPlayers
    .filter(p => p.team === team && p.name !== playerName)
    .slice(0, 3)
    .map(p => p.name)

  if (teamMates.length > 0) {
    relationships.push({
      playerName,
      relationType: 'team-mate',
      relatedPlayers: teamMates,
      confidence: 0.85,
    })
  }

  // Find age cohort (similar age ±2 years, any position)
  const ageCohort = allPlayers
    .filter(p =>
      p.name !== playerName &&
      Math.abs(p.age - age) <= 2 &&
      p.pos !== position
    )
    .sort((a, b) => a.age - b.age)
    .slice(0, 4)
    .map(p => p.name)

  if (ageCohort.length > 0) {
    relationships.push({
      playerName,
      relationType: 'age-cohort',
      relatedPlayers: ageCohort,
      confidence: 0.75,
    })
  }

  // Find value tier (similar value ±15%)
  const valueTolerance = value * 0.15
  const valueTier = allPlayers
    .filter(p =>
      p.name !== playerName &&
      Math.abs(p.tradeVal - value) <= valueTolerance
    )
    .slice(0, 3)
    .map(p => p.name)

  if (valueTier.length > 0) {
    relationships.push({
      playerName,
      relationType: 'value-tier',
      relatedPlayers: valueTier,
      confidence: 0.8,
    })
  }

  return relationships
}

/**
 * Generate content topic clusters
 */
export function generateTopicClusters(): Record<string, { title: string; description: string; keywords: string[]; content: string[] }> {
  return {
    'rookie-evaluation': {
      title: 'Rookie Evaluation & Selection',
      description: 'Guide to evaluating rookie prospects and understanding rookie draft strategy',
      keywords: ['rookie', 'draft class', 'prospect', 'first-year', 'upside'],
      content: ['/guides/how-to-value-a-dynasty-trade/', '/dynasty-rankings/', '/players/'],
    },
    'trade-strategy': {
      title: 'Trade Analysis & Execution',
      description: 'Master the art of making winning trades in dynasty leagues',
      keywords: ['trade', 'value', 'exchange', 'deal', 'offer'],
      content: [
        '/dynasty-trade-analyzer/',
        '/dynasty-trade-calculator/',
        '/guides/how-to-value-a-dynasty-trade/',
        '/trading-strategies/',
      ],
    },
    'rebuild-strategy': {
      title: 'Rebuild & Asset Accumulation',
      description: 'Strategy for rebuilding teams and accumulating young assets',
      keywords: ['rebuild', 'tank', 'youth', 'acquisition', 'asset'],
      content: ['/dynasty-buy-low/', '/guides/', '/dynasty-rankings/'],
    },
    'superflex-mastery': {
      title: 'Superflex League Strategy',
      description: 'Comprehensive guide to thriving in 2QB/Superflex leagues',
      keywords: ['superflex', '2qb', 'quarterback', 'dual-qb', 'flex'],
      content: [
        '/guides/superflex-strategy/',
        '/rankings/superflex/',
        '/comparisons/qb/',
        '/format-strategy/',
      ],
    },
    'te-premium-mastery': {
      title: 'TE Premium Scoring Strategy',
      description: 'How to win in tight end premium leagues',
      keywords: ['te premium', 'tight end', 'scarcity', 'scoring boost'],
      content: [
        '/guides/te-premium-strategy/',
        '/rankings/te-premium/',
        '/comparisons/te/',
        '/format-strategy/',
      ],
    },
    'idp-dynasty': {
      title: 'IDP & Defensive Scoring Strategy',
      description: 'Individual defensive player valuation and strategy',
      keywords: ['idp', 'defensive', 'dl', 'lb', 'db', 'defense'],
      content: [
        '/guides/idp-dynasty-values/',
        '/rankings/idp-overall/',
        '/rankings/dl/',
        '/rankings/lb/',
        '/rankings/db/',
      ],
    },
    'position-strategy': {
      title: 'Position-Specific Dynasty Strategy',
      description: 'Deep dives into each position\'s unique dynasty considerations',
      keywords: ['position', 'qb', 'rb', 'wr', 'te', 'depth'],
      content: [
        '/position-guides/',
        '/rankings/qb/',
        '/rankings/rb/',
        '/rankings/wr/',
        '/rankings/te/',
        '/comparisons/',
      ],
    },
  }
}

/**
 * Generate related content recommendations for pages
 */
export function generateContentRecommendations(
  currentPath: string,
  maxRecommendations: number = 5
): Array<{ title: string; url: string; type: string; relevance: number }> {
  const clusters = generateTopicClusters()
  const recommendations: Array<{ title: string; url: string; type: string; relevance: number }> = []

  // Match current page to clusters
  for (const [clusterId, cluster] of Object.entries(clusters)) {
    for (const contentUrl of cluster.content) {
      if (currentPath.includes(contentUrl.replace(/\//g, ''))) {
        // Current page is in this cluster, recommend other cluster content
        for (const otherUrl of cluster.content) {
          if (!currentPath.includes(otherUrl.replace(/\//g, ''))) {
            recommendations.push({
              title: cluster.title,
              url: otherUrl,
              type: clusterId,
              relevance: 0.8,
            })
          }
        }
      }
    }
  }

  return recommendations.slice(0, maxRecommendations)
}

/**
 * Generate Season/Timeline-based content
 */
export function generateSeasonalContent(): Record<string, { season: string; phase: string; focus: string; tools: string[] }> {
  return {
    'offseason': {
      season: 'Offseason',
      phase: 'June-August',
      focus: 'Rookies, trades, roster building',
      tools: ['/dynasty-trade-analyzer/', '/dynasty-rankings/', '/dynasty-buy-low/'],
    },
    'draft-season': {
      season: 'Draft Season',
      phase: 'August-September',
      focus: 'Draft strategy, prospect evaluation',
      tools: ['/dynasty-rankings/', '/guides/how-to-value-a-dynasty-trade/', '/comparisons/'],
    },
    'regular-season': {
      season: 'Regular Season',
      phase: 'September-December',
      focus: 'Weekly rankings, start/sit, trades',
      tools: ['/dynasty-rankings/', '/dynasty-trade-analyzer/', '/trading-strategies/'],
    },
    'post-season': {
      season: 'Post-Season',
      phase: 'December-February',
      focus: 'Trade deadline, tanking, rebuilding',
      tools: ['/dynasty-buy-low/', '/dynasty-sell-high/', '/trading-strategies/'],
    },
  }
}
