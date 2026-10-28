/**
 * Semantic Keyword Research & Clustering (Phase 20.1)
 *
 * Generates keyword clusters and LSI keywords for semantic SEO
 */

export interface KeywordCluster {
  primary: string
  variants: string[]
  lsiKeywords: string[]
  semanticRelated: string[]
  searchVolume: number
  difficulty: number
  category: string
}

export interface SemanticMapping {
  keyword: string
  semanticVariations: string[]
  relatedConcepts: string[]
  entityReferences: string[]
  searchIntent: string
}

/**
 * Generate semantic keyword clusters for dynasty fantasy football
 */
export function generateSemanticKeywordClusters(): KeywordCluster[] {
  return [
    {
      primary: 'dynasty fantasy football',
      variants: ['dynasty league', 'dynasty format', 'dynasty game'],
      lsiKeywords: ['long-term league', 'keeper league variant', 'multi-year roster', 'perpetual league'],
      semanticRelated: ['dynasty trade', 'dynasty strategy', 'dynasty rankings', 'dynasty value'],
      searchVolume: 12400,
      difficulty: 28,
      category: 'Core Concept',
    },
    {
      primary: 'dynasty trade value',
      variants: ['player trade value', 'dynasty trade worth', 'trade valuation', 'trade value calculator'],
      lsiKeywords: ['player worth', 'exchange value', 'asset valuation', 'trade equivalent'],
      semanticRelated: ['dynasty rankings', 'player comparison', 'trade analyzer', 'player evaluation'],
      searchVolume: 8200,
      difficulty: 32,
      category: 'Valuation',
    },
    {
      primary: 'superflex dynasty',
      variants: ['2QB dynasty', 'SF league', 'superflex format', 'two quarterback'],
      lsiKeywords: ['flex QB', 'quarterback scarcity', 'dual QB slot', 'premium QB value'],
      semanticRelated: ['quarterback rankings', 'QB strategy', 'positional scarcity', 'format strategy'],
      searchVolume: 6800,
      difficulty: 26,
      category: 'Format Variation',
    },
    {
      primary: 'tight end premium',
      variants: ['TE premium', 'TEP dynasty', 'tight end scarcity', 'TE scoring boost'],
      lsiKeywords: ['positional premium', 'TE value boost', 'scoring adjustment', 'position multiplier'],
      semanticRelated: ['positional scarcity', 'scoring format', 'format strategy', 'TE rankings'],
      searchVolume: 3400,
      difficulty: 22,
      category: 'Format Variation',
    },
    {
      primary: 'dynasty buy low',
      variants: ['buy-low candidates', 'undervalued players', 'buy low sell high', 'value opportunities'],
      lsiKeywords: ['discounted assets', 'opportunity targets', 'underperforming assets', 'bargain trades'],
      semanticRelated: ['dynasty rebuild', 'trade strategy', 'player evaluation', 'value investing'],
      searchVolume: 4100,
      difficulty: 30,
      category: 'Strategy',
    },
    {
      primary: 'dynasty rebuild strategy',
      variants: ['rebuild timeline', 'team rebuild', 'dynasty tank', 'asset accumulation'],
      lsiKeywords: ['long-term plan', 'asset gathering', 'youth investment', 'contention window'],
      semanticRelated: ['draft picks', 'player trading', 'team planning', 'season analysis'],
      searchVolume: 5600,
      difficulty: 28,
      category: 'Strategy',
    },
    {
      primary: 'dynasty rookie evaluation',
      variants: ['rookie rankings', 'prospect grading', 'rookie tier list', 'first year players'],
      lsiKeywords: ['incoming talent', 'young player assessment', 'prospect analysis', 'college evaluation'],
      semanticRelated: ['draft strategy', 'player development', 'talent evaluation', 'draft picks'],
      searchVolume: 3900,
      difficulty: 25,
      category: 'Player Analysis',
    },
    {
      primary: 'IDP dynasty',
      variants: ['individual defensive players', 'IDP scoring', 'defensive player rankings', 'IDP league'],
      lsiKeywords: ['defense scoring', 'individual defense', 'linebacker points', 'defensive stats'],
      semanticRelated: ['defensive strategy', 'position scarcity', 'scoring format', 'IDP rankings'],
      searchVolume: 2800,
      difficulty: 24,
      category: 'Format Variation',
    },
  ]
}

/**
 * Generate semantic keyword mappings
 */
export function generateSemanticMappings(): SemanticMapping[] {
  return [
    {
      keyword: 'dynasty fantasy football',
      semanticVariations: ['dynasty league', 'dynasty fantasy', 'long-term fantasy league', 'perpetual fantasy league'],
      relatedConcepts: ['keeper league', 'long-form competition', 'roster control', 'multi-year strategy'],
      entityReferences: ['NFL', 'fantasy sports', 'league management', 'fantasy competition'],
      searchIntent: 'informational - learning about format',
    },
    {
      keyword: 'how to value a dynasty trade',
      semanticVariations: ['dynasty trade valuation', 'evaluating dynasty trades', 'trade value assessment', 'player trade pricing'],
      relatedConcepts: ['asset valuation', 'negotiation framework', 'decision-making', 'value comparison'],
      entityReferences: ['trade calculator', 'player ranking', 'value system', 'market assessment'],
      searchIntent: 'informational - how-to guide',
    },
    {
      keyword: 'superflex league strategy',
      semanticVariations: ['2QB dynasty strategy', 'superflex tactics', 'quarterback scarcity strategy', 'SF league winning'],
      relatedConcepts: ['positional scarcity', 'draft strategy', 'value adjustment', 'format adaptation'],
      entityReferences: ['quarterback value', 'draft position', 'late-round QB', 'position premium'],
      searchIntent: 'informational - strategic guidance',
    },
  ]
}

/**
 * Get LSI keywords for a primary keyword
 */
export function getLsiKeywords(primaryKeyword: string): string[] {
  const clusters = generateSemanticKeywordClusters()
  const cluster = clusters.find((c) => c.primary === primaryKeyword)
  return cluster ? cluster.lsiKeywords : []
}

/**
 * Get semantically related keywords
 */
export function getSemanticRelated(keyword: string): string[] {
  const clusters = generateSemanticKeywordClusters()
  const cluster = clusters.find((c) => c.primary === keyword)
  return cluster ? cluster.semanticRelated : []
}

/**
 * Generate semantic keyword density recommendations
 */
export function generateKeywordDensityRecommendations(): Array<{ keyword: string; recommendedDensity: number; minWords: number }> {
  return [
    { keyword: 'dynasty', recommendedDensity: 2.5, minWords: 300 },
    { keyword: 'trade value', recommendedDensity: 2.0, minWords: 400 },
    { keyword: 'player', recommendedDensity: 1.8, minWords: 300 },
    { keyword: 'ranking', recommendedDensity: 1.5, minWords: 300 },
    { keyword: 'strategy', recommendedDensity: 1.8, minWords: 400 },
  ]
}
