/**
 * Advanced Internal Linking Strategy (Phase 20.3)
 *
 * Implements semantic link clusters and topical authority chains
 */

export interface LinkChain {
  sourceUrl: string
  targetUrl: string
  anchorText: string
  semanticRelevance: number
  authority: number
  topicCluster: string
}

export interface AnchorTextVariation {
  primary: string
  variations: string[]
  branded: string
  longtail: string
}

/**
 * Generate advanced internal linking strategies
 */
export function generateAdvancedLinkingStrategy(): LinkChain[] {
  return [
    // Dynasty Basics cluster
    {
      sourceUrl: '/dynasty-basics/',
      targetUrl: '/guides/how-to-value-a-dynasty-trade/',
      anchorText: 'learn how to value trades',
      semanticRelevance: 0.95,
      authority: 8,
      topicCluster: 'dynasty-valuation',
    },
    {
      sourceUrl: '/dynasty-basics/',
      targetUrl: '/rankings/',
      anchorText: 'view current dynasty rankings',
      semanticRelevance: 0.88,
      authority: 9,
      topicCluster: 'player-rankings',
    },
    // Trade Analyzer cluster
    {
      sourceUrl: '/dynasty-trade-analyzer/',
      targetUrl: '/guides/how-to-value-a-dynasty-trade/',
      anchorText: 'valuation framework',
      semanticRelevance: 0.92,
      authority: 8,
      topicCluster: 'dynasty-valuation',
    },
    {
      sourceUrl: '/dynasty-trade-analyzer/',
      targetUrl: '/dynasty-rankings/',
      anchorText: 'dynasty player values',
      semanticRelevance: 0.90,
      authority: 9,
      topicCluster: 'player-rankings',
    },
    // Format Strategy cluster
    {
      sourceUrl: '/format-strategy/',
      targetUrl: '/guides/superflex-strategy/',
      anchorText: 'superflex strategy guide',
      semanticRelevance: 0.96,
      authority: 8,
      topicCluster: 'format-strategy',
    },
    {
      sourceUrl: '/format-strategy/',
      targetUrl: '/guides/te-premium-strategy/',
      anchorText: 'TE premium scoring guide',
      semanticRelevance: 0.96,
      authority: 8,
      topicCluster: 'format-strategy',
    },
    // Rebuild Strategy cluster
    {
      sourceUrl: '/guides/',
      targetUrl: '/dynasty-draft-pick-values/',
      anchorText: 'draft pick valuation',
      semanticRelevance: 0.88,
      authority: 7,
      topicCluster: 'rebuild-strategy',
    },
  ]
}

/**
 * Generate anchor text variations
 */
export function generateAnchorTextVariations(): Record<string, AnchorTextVariation> {
  return {
    'trade-value': {
      primary: 'trade value',
      variations: ['dynasty trade value', 'player trade worth', 'asset valuation', 'trade calculator'],
      branded: 'FDP trade value',
      longtail: 'how to calculate dynasty trade value',
    },
    'rankings': {
      primary: 'rankings',
      variations: ['dynasty rankings', 'player rankings', 'current rankings', 'FDP rankings'],
      branded: 'Fantasy Draft Pros rankings',
      longtail: 'up-to-date dynasty player rankings',
    },
    'strategy': {
      primary: 'strategy',
      variations: ['dynasty strategy', 'trading strategy', 'winning strategy', 'competitive strategy'],
      branded: 'FDP strategy guides',
      longtail: 'expert dynasty league strategy',
    },
    'rebuild': {
      primary: 'rebuild',
      variations: ['dynasty rebuild', 'rebuild strategy', 'team rebuild', 'rebuild timeline'],
      branded: 'dynasty rebuild guide',
      longtail: 'how to rebuild a dynasty team',
    },
  }
}

/**
 * Calculate link relevance score
 */
export function calculateLinkRelevance(sourceContent: string, targetContent: string, keyword: string): number {
  const sourceMatches = (sourceContent.match(new RegExp(keyword, 'gi')) || []).length
  const targetMatches = (targetContent.match(new RegExp(keyword, 'gi')) || []).length
  const totalMatches = Math.min(sourceMatches + targetMatches, 5)
  return Math.min(1.0, totalMatches / 5)
}

/**
 * Generate link velocity recommendations
 */
export function generateLinkVelocityRecommendations(): Array<{ linkType: string; frequency: string; riskLevel: string }> {
  return [
    {
      linkType: 'Internal topical links',
      frequency: '3-5 per page',
      riskLevel: 'Low - natural and beneficial',
    },
    {
      linkType: 'Contextual links',
      frequency: '1-3 per 500 words',
      riskLevel: 'Low - highly relevant',
    },
    {
      linkType: 'Navigation links',
      frequency: 'Sitewide',
      riskLevel: 'Low - structural',
    },
    {
      linkType: 'Anchor text diversity',
      frequency: 'Vary 80% of anchors',
      riskLevel: 'Low - natural variation',
    },
  ]
}
