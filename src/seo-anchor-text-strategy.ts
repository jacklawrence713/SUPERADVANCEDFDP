/**
 * Anchor Text Optimization (Phase 22.3)
 *
 * Strategies for optimizing anchor text distribution and relevance
 */

export interface AnchorTextProfile {
  targetUrl: string
  pageTitle: string
  currentAnchorTexts: string[]
  recommendedAnchorTexts: string[]
  brandAnchorRatio: number
  keywordAnchorRatio: number
  genericAnchorRatio: number
  optimalDistribution: { brand: number; keyword: number; generic: number; semantic: number }
  priority: 'high' | 'medium' | 'low'
}

/**
 * Generate anchor text strategy for key pages
 */
export function generateAnchorTextStrategy(): AnchorTextProfile[] {
  return [
    {
      targetUrl: '/rankings/qb/',
      pageTitle: 'Dynasty QB Rankings',
      currentAnchorTexts: ['QB rankings', 'dynasty rankings', 'click here'],
      recommendedAnchorTexts: [
        'dynasty QB rankings',
        'top quarterback values',
        'dynasty rankings',
        'best QBs for dynasty',
        'quarterback trade value',
      ],
      brandAnchorRatio: 15,
      keywordAnchorRatio: 45,
      genericAnchorRatio: 40,
      optimalDistribution: { brand: 15, keyword: 60, generic: 20, semantic: 5 },
      priority: 'high',
    },
    {
      targetUrl: '/guides/how-to-value-a-dynasty-trade/',
      pageTitle: 'How to Value a Dynasty Trade',
      currentAnchorTexts: ['trade guide', 'valuation', 'how to value trade'],
      recommendedAnchorTexts: [
        'dynasty trade valuation guide',
        'how to value a trade',
        'trade value calculation',
        'dynasty trade framework',
        'evaluate dynasty trades',
      ],
      brandAnchorRatio: 10,
      keywordAnchorRatio: 55,
      genericAnchorRatio: 35,
      optimalDistribution: { brand: 10, keyword: 65, generic: 20, semantic: 5 },
      priority: 'high',
    },
    {
      targetUrl: '/dynasty-trade-calculator/',
      pageTitle: 'Dynasty Trade Calculator',
      currentAnchorTexts: ['trade calculator', 'calculator tool'],
      recommendedAnchorTexts: [
        'dynasty trade calculator',
        'trade value calculator',
        'calculate trade value',
        'AI trade analyzer',
        'dynasty calculator tool',
      ],
      brandAnchorRatio: 20,
      keywordAnchorRatio: 50,
      genericAnchorRatio: 30,
      optimalDistribution: { brand: 20, keyword: 55, generic: 20, semantic: 5 },
      priority: 'high',
    },
    {
      targetUrl: '/guides/superflex-strategy/',
      pageTitle: 'Superflex Strategy Guide',
      currentAnchorTexts: ['superflex guide', 'SF strategy'],
      recommendedAnchorTexts: [
        'superflex strategy guide',
        '2QB strategy',
        'superflex format strategy',
        'how to win at superflex',
        'SF league tactics',
      ],
      brandAnchorRatio: 12,
      keywordAnchorRatio: 58,
      genericAnchorRatio: 30,
      optimalDistribution: { brand: 12, keyword: 65, generic: 18, semantic: 5 },
      priority: 'medium',
    },
    {
      targetUrl: '/dynasty-buy-low/',
      pageTitle: 'Dynasty Buy Low Candidates',
      currentAnchorTexts: ['buy low', 'buying low candidates'],
      recommendedAnchorTexts: [
        'dynasty buy low candidates',
        'buy low targets',
        'undervalued dynasty players',
        'trading for cheap',
        'dynasty bargain players',
      ],
      brandAnchorRatio: 14,
      keywordAnchorRatio: 52,
      genericAnchorRatio: 34,
      optimalDistribution: { brand: 14, keyword: 60, generic: 21, semantic: 5 },
      priority: 'medium',
    },
  ]
}

/**
 * Analyze current anchor text distribution
 */
export function analyzeAnchorDistribution(profile: AnchorTextProfile): { isBalanced: boolean; issues: string[] } {
  const issues: string[] = []

  if (profile.genericAnchorRatio > profile.optimalDistribution.generic + 10) {
    issues.push(`Too many generic anchors (${profile.genericAnchorRatio}% vs optimal ${profile.optimalDistribution.generic}%)`)
  }

  if (profile.keywordAnchorRatio < profile.optimalDistribution.keyword - 10) {
    issues.push(`Too few keyword-rich anchors (${profile.keywordAnchorRatio}% vs optimal ${profile.optimalDistribution.keyword}%)`)
  }

  const isBalanced = issues.length === 0

  return { isBalanced, issues }
}

/**
 * Get high-priority anchor text optimization targets
 */
export function getHighPriorityAnchorTargets(): AnchorTextProfile[] {
  return generateAnchorTextStrategy()
    .filter((p) => p.priority === 'high')
    .filter((p) => !analyzeAnchorDistribution(p).isBalanced)
}

/**
 * Generate anchor text improvement recommendations
 */
export function generateAnchorImprovements(): Array<{ page: string; current: string; target: string; impact: string }> {
  const profiles = generateAnchorTextStrategy()

  return profiles.slice(0, 3).map((p) => {
    const analysis = analyzeAnchorDistribution(p)
    return {
      page: p.pageTitle,
      current: `Brand: ${p.brandAnchorRatio}%, Keyword: ${p.keywordAnchorRatio}%, Generic: ${p.genericAnchorRatio}%`,
      target: `Brand: ${p.optimalDistribution.brand}%, Keyword: ${p.optimalDistribution.keyword}%, Generic: ${p.optimalDistribution.generic}%`,
      impact: analysis.issues.length > 0 ? analysis.issues[0] : 'Anchor text distribution is optimal',
    }
  })
}

/**
 * Calculate anchor text value (relevance + specificity)
 */
export function calculateAnchorTextValue(anchorText: string, targetTopic: string): number {
  const lowerAnchor = anchorText.toLowerCase()
  const lowerTopic = targetTopic.toLowerCase()

  let score = 0

  // Exact match bonus
  if (lowerAnchor === lowerTopic) score += 40
  // Partial match bonus
  else if (lowerAnchor.includes(lowerTopic) || lowerTopic.includes(lowerAnchor)) score += 25
  // Semantic relevance
  else if (lowerAnchor.includes('dynasty') && lowerTopic.includes('dynasty')) score += 15

  // Length quality (5-7 words ideal)
  const wordCount = anchorText.split(' ').length
  if (wordCount >= 3 && wordCount <= 8) score += 10
  else if (wordCount <= 2) score -= 5

  // Generic anchors penalty
  if (['click here', 'read more', 'learn more', 'more info'].includes(lowerAnchor)) score -= 30

  return Math.max(0, Math.min(100, score))
}
