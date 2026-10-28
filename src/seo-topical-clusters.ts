/**
 * Advanced Topical Authority (Phase 19.5)
 *
 * Expands knowledge graph into comprehensive topic clusters
 */

export interface TopicCluster {
  id: string
  name: string
  parentTopic: string
  childTopics: string[]
  pillarPage: string
  clusterPages: string[]
  estimatedSearchVolume: number
}

/**
 * Generate advanced topic clusters for topical authority
 */
export function generateTopicClusters(): TopicCluster[] {
  return [
    {
      id: 'dynasty-valuation',
      name: 'Dynasty Valuation Cluster',
      parentTopic: 'Dynasty Fundamentals',
      childTopics: ['Player Values', 'Trade Valuation', 'Age Adjustments', 'Scoring Formats'],
      pillarPage: '/fdp-value/',
      clusterPages: [
        '/guides/how-to-value-a-dynasty-trade/',
        '/dynasty-trade-analyzer/',
        '/dynasty-trade-calculator/',
        '/players/',
      ],
      estimatedSearchVolume: 18500,
    },
    {
      id: 'position-scarcity',
      name: 'Position Scarcity Cluster',
      parentTopic: 'Strategic Analysis',
      childTopics: ['QB Scarcity', 'RB Depth', 'WR Consistency', 'TE Premium'],
      pillarPage: '/format-strategy/',
      clusterPages: [
        '/guides/superflex-strategy/',
        '/guides/te-premium-strategy/',
        '/rankings/superflex/',
        '/rankings/te-premium/',
      ],
      estimatedSearchVolume: 12200,
    },
    {
      id: 'player-ranking-analysis',
      name: 'Player Ranking Cluster',
      parentTopic: 'Player Analysis',
      childTopics: [
        'Current Rankings',
        'Position Rankings',
        'Tier Levels',
        'Player Comparisons',
      ],
      pillarPage: '/rankings/',
      clusterPages: [
        '/rankings/qb/',
        '/rankings/rb/',
        '/rankings/wr/',
        '/rankings/te/',
        '/comparisons/qb/',
        '/comparisons/rb/',
      ],
      estimatedSearchVolume: 28400,
    },
    {
      id: 'rebuild-contention',
      name: 'Team Strategy Cluster',
      parentTopic: 'Long-term Planning',
      childTopics: [
        'Rebuild Strategies',
        'Contention Windows',
        'Asset Accumulation',
        'Draft Pick Values',
      ],
      pillarPage: '/guides/how-to-value-a-dynasty-trade/',
      clusterPages: [
        '/dynasty-buy-low/',
        '/dynasty-sell-high/',
        '/dynasty-draft-pick-values/',
      ],
      estimatedSearchVolume: 9800,
    },
    {
      id: 'league-formats',
      name: 'League Format Cluster',
      parentTopic: 'Format Variations',
      childTopics: ['Superflex', 'TE Premium', 'IDP', 'Scoring Systems'],
      pillarPage: '/format-strategy/',
      clusterPages: [
        '/guides/superflex-strategy/',
        '/guides/te-premium-strategy/',
        '/guides/idp-dynasty-values/',
      ],
      estimatedSearchVolume: 11600,
    },
  ]
}

/**
 * Generate cluster-specific schema markup
 */
export function generateClusterSchema(cluster: TopicCluster): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Dynasty Basics',
        'item': 'https://fantasydraftpros.com/dynasty-basics/',
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': cluster.parentTopic,
        'item': `https://fantasydraftpros.com/${cluster.parentTopic.toLowerCase().replace(/ /g, '-')}/`,
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'name': cluster.name,
        'item': `https://fantasydraftpros.com/cluster/${cluster.id}/`,
      },
    ],
  })
}

/**
 * Get related clusters for cross-promotion
 */
export function getRelatedClusters(clusterId: string): TopicCluster[] {
  const clusters = generateTopicClusters()
  return clusters.filter((c) => c.id !== clusterId).slice(0, 3)
}

/**
 * Generate cluster summary page
 */
export function generateClusterSummaryHtml(clusterId: string): string {
  const clusters = generateTopicClusters()
  const cluster = clusters.find((c) => c.id === clusterId)
  if (!cluster) return ''

  const relatedClusters = getRelatedClusters(clusterId)

  return `
  <div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #7c4dff">
    <h3 style="color:#7c4dff;margin-top:0;font-size:16px">Topic Cluster Overview</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:13px">Estimated Search Volume: ${cluster.estimatedSearchVolume.toLocaleString()} monthly</p>

    <div style="margin-top:16px">
      <h4 style="color:#7c4dff;font-size:13px;margin:12px 0">Related Topics</h4>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${cluster.childTopics
          .map((t) => `<span style="background:#0a0913;color:#7c4dff;padding:4px 8px;border-radius:4px;font-size:12px">${t}</span>`)
          .join('')}
      </div>
    </div>

    ${
      relatedClusters.length > 0
        ? `<div style="margin-top:16px">
      <h4 style="color:#7c4dff;font-size:13px;margin:12px 0">Related Clusters</h4>
      <ul style="list-style:none;padding:0;margin:0;font-size:12px">
        ${relatedClusters.map((c) => `<li style="margin:4px 0"><a href="/cluster/${c.id}/" style="color:#7c4dff">${c.name}</a></li>`).join('')}
      </ul>
    </div>`
        : ''
    }

    <!-- Phase 19.5: Topical Authority Cluster -->
  </div>
  `
}
