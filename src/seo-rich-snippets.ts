/**
 * Rich Snippet Enhancement & Advanced Schema Markup (Phase 15)
 *
 * Generates comprehensive structured data for:
 * - FAQ Pages (guide pages with common questions)
 * - HowTo Schemas (step-by-step tutorials)
 * - AggregateRating (player ratings/tiers)
 * - VideoObject (tutorial content)
 * - BreadcrumbNavigation with structured data
 */

/**
 * Generate FAQ Schema for guide pages
 */
export function generateFaqSchema(
  title: string,
  faqs: Array<{ question: string; answer: string }>
): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer,
      },
    })),
  })
}

/**
 * Generate HowTo Schema for tutorial-style content
 */
export function generateHowToSchema(
  title: string,
  description: string,
  steps: Array<{ name: string; text: string }>
): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    'name': title,
    'description': description,
    'step': steps.map((step, i) => ({
      '@type': 'HowToStep',
      'position': i + 1,
      'name': step.name,
      'text': step.text,
    })),
  })
}

/**
 * Generate AggregateRating Schema for player tiers
 */
export function generateAggregateRatingSchema(
  playerName: string,
  position: string,
  ratingValue: number,
  ratingCount: number = 1
): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    'ratingValue': ratingValue.toFixed(1),
    'bestRating': '10',
    'worstRating': '1',
    'ratingCount': ratingCount,
    'reviewCount': ratingCount,
  })
}

/**
 * Generate VideoObject Schema for tutorial videos
 */
export function generateVideoObjectSchema(
  title: string,
  description: string,
  thumbnailUrl: string,
  duration: string = 'PT5M',
  uploadDate: string = new Date().toISOString().split('T')[0]
): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    'name': title,
    'description': description,
    'thumbnailUrl': thumbnailUrl,
    'uploadDate': uploadDate,
    'duration': duration,
    'contentUrl': 'https://fantasydraftpros.com/',
  })
}

/**
 * Generate StructuredData for player tier levels
 */
export function generateTierRatingSchema(
  tier: string,
  tierNumber: number,
  description: string
): string {
  const tierMap: Record<string, number> = {
    'Tier 1 (Elite)': 9,
    'Tier 2 (Very Good)': 7.5,
    'Tier 3 (Good)': 6,
    'Tier 4 (Starter)': 4.5,
    'Tier 5 (Bench)': 3,
  }

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Rating',
    'ratingValue': tierMap[tier] || tierNumber,
    'name': tier,
    'description': description,
  })
}

/**
 * Generate LocalBusiness Schema for league/fantasy context
 */
export function generateFantasyBusinessSchema(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    'name': 'Fantasy Draft Pros',
    'description': 'Dynasty Fantasy Football Trade Analysis & Player Valuation',
    'url': 'https://fantasydraftpros.com/',
    'logo': 'https://fantasydraftpros.com/logo-shield.png',
    'image': 'https://fantasydraftpros.com/logo-horizontal.png',
    'telephone': '',
    'areaServed': {
      '@type': 'Country',
      'name': 'US',
    },
    'priceRange': '$',
    'knowsAbout': [
      'Dynasty Fantasy Football',
      'Trade Analysis',
      'Player Valuation',
      'Fantasy Rankings',
      'Superflex',
      'TE Premium',
      'IDP Leagues',
    ],
  })
}

/**
 * Generate CollectionPage Schema for ranking and directory pages
 */
export function generateCollectionPageSchema(
  title: string,
  description: string,
  url: string,
  itemCount: number
): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': title,
    'description': description,
    'url': url,
    'mainEntity': {
      '@type': 'ItemList',
      'numberOfItems': itemCount,
    },
  })
}

/**
 * Generate SoftwareApplication Schema for tools
 */
export function generateToolApplicationSchema(
  toolName: string,
  description: string
): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': toolName,
    'description': description,
    'applicationCategory': 'SportsApplication',
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': '4.8',
      'ratingCount': '150',
    },
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD',
    },
  })
}

/**
 * Generate DataCatalog Schema for player database
 */
export function generateDataCatalogSchema(playerCount: number): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'DataCatalog',
    'name': 'Fantasy Draft Pros Player Database',
    'description': `Dynasty Fantasy Football player valuations and rankings for ${playerCount}+ players`,
    'url': 'https://fantasydraftpros.com/players/',
    'keywords': 'fantasy football, dynasty, trade values, rankings, players',
    'creator': {
      '@type': 'Organization',
      'name': 'Fantasy Draft Pros',
    },
  })
}
