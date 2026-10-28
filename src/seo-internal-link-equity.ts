/**
 * Internal Link Equity Distribution (Phase 22.1)
 *
 * Strategies for optimally distributing link equity across site hierarchy
 */

export interface LinkEquityPage {
  url: string
  title: string
  currentEquity: number
  targetEquity: number
  inboundLinks: number
  outboundLinks: number
  priority: 'high' | 'medium' | 'low'
  equityGap: number
  recommendations: string[]
}

/**
 * Generate internal link equity distribution strategy
 */
export function generateLinkEquityStrategy(): LinkEquityPage[] {
  return [
    {
      url: '/',
      title: 'Home - Dynasty Fantasy Football',
      currentEquity: 100,
      targetEquity: 100,
      inboundLinks: 0,
      outboundLinks: 12,
      priority: 'high',
      equityGap: 0,
      recommendations: [
        'Maintain primary hub role with strategic outbound links',
        'Link to all major topic hubs and high-traffic pages',
        'Distribute equity evenly across 4 main categories',
        'Update quarterly with new content links',
      ],
    },
    {
      url: '/rankings/',
      title: 'Dynasty Rankings Hub',
      currentEquity: 78,
      targetEquity: 85,
      inboundLinks: 24,
      outboundLinks: 8,
      priority: 'high',
      equityGap: 7,
      recommendations: [
        'Strengthen with more homepage internal links',
        'Link to position-specific ranking pages',
        'Create comparison pages linking to rankings',
        'Add internal links from player pages',
      ],
    },
    {
      url: '/guides/',
      title: 'Guides Hub',
      currentEquity: 72,
      targetEquity: 80,
      inboundLinks: 18,
      outboundLinks: 6,
      priority: 'high',
      equityGap: 8,
      recommendations: [
        'Increase homepage equity transfer',
        'Link from all strategy pages to guides',
        'Create guide recommendation blocks on tools',
        'Add breadcrumb trails to improve hierarchy',
      ],
    },
    {
      url: '/dynasty-trade-calculator/',
      title: 'Dynasty Trade Calculator',
      currentEquity: 65,
      targetEquity: 75,
      inboundLinks: 15,
      outboundLinks: 4,
      priority: 'medium',
      equityGap: 10,
      recommendations: [
        'Add contextual links from trade guides',
        'Link from player pages with trade value info',
        'Create tool comparison pages',
        'Link from trending content sections',
      ],
    },
    {
      url: '/dynasty-basics/',
      title: 'Dynasty Fantasy Football Basics',
      currentEquity: 68,
      targetEquity: 78,
      inboundLinks: 12,
      outboundLinks: 7,
      priority: 'high',
      equityGap: 10,
      recommendations: [
        'Strategic homepage links (2-3x)',
        'Link from guide hub to basics intro',
        'Add links from advanced content back to basics',
        'Create "Start Here" recommendation blocks',
      ],
    },
    {
      url: '/players/',
      title: 'Player Directory',
      currentEquity: 55,
      targetEquity: 68,
      inboundLinks: 1320,
      outboundLinks: 2,
      priority: 'medium',
      equityGap: 13,
      recommendations: [
        'Consolidate player page equity hierarchy',
        'Link to position-specific directories',
        'Create player comparison tool links',
        'Add position ranking links from player pages',
      ],
    },
  ]
}

/**
 * Calculate link equity flow through site
 */
export function calculateEquityFlow(pages: LinkEquityPage[]): { totalEquity: number; averageEquity: number; distribution: string } {
  const totalEquity = pages.reduce((sum, p) => sum + p.currentEquity, 0)
  const averageEquity = Math.round(totalEquity / pages.length)
  const distribution = pages.filter((p) => p.equityGap > 5).length > 0 ? 'unbalanced' : 'balanced'

  return { totalEquity, averageEquity, distribution }
}

/**
 * Get highest priority equity gaps
 */
export function getHighPriorityEquityGaps(): LinkEquityPage[] {
  return generateLinkEquityStrategy()
    .filter((p) => p.priority === 'high' && p.equityGap > 5)
    .sort((a, b) => b.equityGap - a.equityGap)
}

/**
 * Generate equity distribution improvement plan
 */
export function generateEquityImprovementPlan(): Array<{ area: string; current: number; target: number; strategy: string }> {
  const pages = generateLinkEquityStrategy()
  const highPriority = getHighPriorityEquityGaps()

  return [
    {
      area: 'Homepage Authority Transfer',
      current: pages[0].outboundLinks,
      target: 15,
      strategy: 'Increase homepage links to key pages from 12 to 15 (guides, rankings, basics)',
    },
    {
      area: 'Hub Page Equity Distribution',
      current: highPriority.length,
      target: 4,
      strategy: 'Strengthen 4 main hubs with 20-30% more internal equity through strategic linking',
    },
    {
      area: 'Content Clustering Linkage',
      current: 5,
      target: 8,
      strategy: 'Create topic cluster link patterns (4 thematic clusters with 2+ levels)',
    },
    {
      area: 'Player Page Equity Consolidation',
      current: 55,
      target: 68,
      strategy: 'Consolidate 1,320 player pages through directory hierarchy and position ranking links',
    },
  ]
}
