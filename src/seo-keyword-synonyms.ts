/**
 * Keyword Synonym & Variation Generation (Phase 20.5)
 *
 * Creates keyword synonym databases and variations
 */

export interface KeywordSynonym {
  primary: string
  synonyms: string[]
  longtail: string[]
  conversational: string[]
  questionFormat: string[]
  entityType: string
}

/**
 * Generate comprehensive keyword synonyms
 */
export function generateKeywordSynonyms(): KeywordSynonym[] {
  return [
    {
      primary: 'dynasty trade value',
      synonyms: ['trade valuation', 'player worth', 'trade price', 'asset value', 'exchange rate'],
      longtail: [
        'how to calculate dynasty trade value',
        'dynasty player trade worth',
        'what is my dynasty player worth',
        'dynasty trade value calculator',
      ],
      conversational: ['what is he worth in a trade', 'how much is this player worth', 'trade fair value'],
      questionFormat: [
        'What is dynasty trade value?',
        'How do you calculate trade value?',
        'How much is this player worth?',
      ],
      entityType: 'Valuation Concept',
    },
    {
      primary: 'dynasty rankings',
      synonyms: ['player rankings', 'top players', 'ranked players', 'player tier list', 'dynasty player list'],
      longtail: [
        'best dynasty fantasy players 2026',
        'dynasty player rankings by position',
        'top dynasty football players',
        'dynasty rankings with trade value',
      ],
      conversational: ['who are the top players', 'whos ranking number one', 'who should i draft'],
      questionFormat: [
        'What are the top dynasty players?',
        'Who is ranked number 1?',
        'Where do I find dynasty rankings?',
      ],
      entityType: 'Ranking List',
    },
    {
      primary: 'superflex dynasty',
      synonyms: ['2QB league', 'SF league', 'superflex format', 'dual QB', 'two quarterback'],
      longtail: [
        'superflex dynasty league strategy',
        'how to win superflex leagues',
        'QB values in superflex format',
        'best superflex dynasty players',
      ],
      conversational: ['how do superflex leagues work', 'should i play superflex', 'is superflex better'],
      questionFormat: [
        'What is superflex in dynasty?',
        'How does superflex affect QB value?',
        'Should I join a superflex league?',
      ],
      entityType: 'Format Type',
    },
    {
      primary: 'dynasty rebuild',
      synonyms: ['team rebuild', 'rebuild strategy', 'tank year', 'asset accumulation', 'youth building'],
      longtail: [
        'how to rebuild a dynasty team',
        'dynasty rebuild strategy guide',
        'dynasty rebuild timeline',
        'best dynasty rebuild tactics',
      ],
      conversational: [
        'should i rebuild my team',
        'how long does a rebuild take',
        'is it time to rebuild',
      ],
      questionFormat: [
        'How do you rebuild a dynasty team?',
        'When should you start rebuilding?',
        'What is a dynasty rebuild?',
      ],
      entityType: 'Strategy Type',
    },
    {
      primary: 'dynasty buy low',
      synonyms: [
        'undervalued players',
        'buy-low candidates',
        'value opportunities',
        'discount trades',
        'underperforming assets',
      ],
      longtail: [
        'dynasty buy low candidates 2026',
        'best buy low targets dynasty',
        'who to buy low on in dynasty',
        'dynasty buy low sell high strategy',
      ],
      conversational: [
        'who should i target in trades',
        'whos undervalued this year',
        'who is a good trade target',
      ],
      questionFormat: [
        'Who are buy-low candidates?',
        'What does buy-low mean in dynasty?',
        'How do you find buy-low opportunities?',
      ],
      entityType: 'Strategy Concept',
    },
  ]
}

/**
 * Create keyword synonym mapping for search
 */
export function buildSynonymMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  const synonyms = generateKeywordSynonyms()

  for (const group of synonyms) {
    map[group.primary] = [group.primary, ...group.synonyms, ...group.longtail]

    for (const synonym of group.synonyms) {
      if (!map[synonym]) {
        map[synonym] = [group.primary, ...group.synonyms]
      }
    }
  }

  return map
}

/**
 * Get all variations for a keyword
 */
export function getKeywordVariations(keyword: string): string[] {
  const synonyms = generateKeywordSynonyms()
  const group = synonyms.find((s) => s.primary === keyword || s.synonyms.includes(keyword))
  if (!group) return [keyword]
  return [
    group.primary,
    ...group.synonyms,
    ...group.longtail.slice(0, 2),
    ...group.conversational.slice(0, 2),
  ]
}

/**
 * Generate content variation suggestions
 */
export function generateContentVariationSuggestions(keyword: string): Array<{ variation: string; type: string; targetAudience: string }> {
  const synonyms = generateKeywordSynonyms()
  const group = synonyms.find((s) => s.primary === keyword)
  if (!group) return []

  return [
    {
      variation: group.longtail[0],
      type: 'Long-tail guide',
      targetAudience: 'Users seeking detailed information',
    },
    {
      variation: group.conversational[0],
      type: 'FAQ answer',
      targetAudience: 'Conversational searchers',
    },
    {
      variation: group.questionFormat[0],
      type: 'Featured snippet',
      targetAudience: 'Question-based queries',
    },
  ]
}
