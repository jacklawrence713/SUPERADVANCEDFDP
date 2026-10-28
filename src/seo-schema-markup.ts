/**
 * Enhanced Schema Markup (Phase 13.2)
 *
 * Generates Schema.org structured data for:
 * - BreadcrumbList (for navigation hierarchy)
 * - FAQPage (for guide pages)
 * - Article (for strategy/guide pages)
 * - AggregateOffer (for pricing/plans)
 */

/**
 * Generate BreadcrumbList schema for a page
 * Example: /rankings/superflex/ → Home > Rankings > Superflex
 */
export function generateBreadcrumbSchema(pagePath: string): string {
  const segments = pagePath.split('/').filter(Boolean)
  const breadcrumbs: Array<{ name: string; url: string }> = [
    { name: 'Home', url: 'https://fantasydraftpros.com/' }
  ]

  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`
    const name = formatSegmentName(segment)
    breadcrumbs.push({ name, url: `https://fantasydraftpros.com${currentPath}/` })
  }

  const items = breadcrumbs.map((bc, i) => ({
    '@type': 'ListItem',
    'position': i + 1,
    'name': bc.name,
    'item': bc.url,
  }))

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items,
  })
}

/**
 * Generate FAQPage schema for guide pages
 */
export function generateFaqPageSchema(
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
 * Generate Article schema for guide/strategy pages
 */
export function generateArticleSchema(
  title: string,
  description: string,
  url: string,
  imageUrl: string,
  datePublished: string,
  author: string = 'Fantasy Draft Pros'
): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': title,
    'description': description,
    'url': url,
    'image': imageUrl,
    'datePublished': datePublished,
    'author': {
      '@type': 'Organization',
      'name': author,
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Fantasy Draft Pros',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://fantasydraftpros.com/logo-shield.png',
      },
    },
  })
}

/**
 * Generate WebApplication schema for app pages
 */
export function generateWebApplicationSchema(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': 'Fantasy Draft Pros',
    'description': 'Dynasty fantasy football trade analyzer and player valuation tool',
    'url': 'https://fantasydraftpros.com/',
    'applicationCategory': 'SportsApplication',
    'offers': [
      {
        '@type': 'Offer',
        'name': 'Free Plan',
        'price': '0',
        'priceCurrency': 'USD',
      },
      {
        '@type': 'Offer',
        'name': 'Pro Plan',
        'price': '2.99',
        'priceCurrency': 'USD',
        'billingIncrement': 'P1M',
      },
    ],
  })
}

/**
 * Generate rich snippet for player pages
 */
export function generatePlayerRichSnippet(
  name: string,
  position: string,
  team: string,
  value: number
): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    'name': name,
    'jobTitle': `Professional ${position} - ${team}`,
    'url': `https://fantasydraftpros.com/players/${slugify(name)}/`,
    'knowsAbout': 'Fantasy Football',
    'memberOf': {
      '@type': 'SportsTeam',
      'name': team,
    },
  })
}

/**
 * Generate SearchAction schema for site search
 */
export function generateSearchActionSchema(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'url': 'https://fantasydraftpros.com/',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': 'https://fantasydraftpros.com/#trade?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  })
}

/**
 * Generate Table of Contents schema for long-form guides
 */
export function generateTableOfContentsSchema(
  url: string,
  headings: Array<{ text: string; id: string }>
): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    'hasPart': headings.map(h => ({
      '@type': 'WebPageElement',
      'isPartOf': {
        '@id': url,
      },
      'name': h.text,
      'url': `${url}#${h.id}`,
    })),
  })
}

/**
 * Generate VideoObject schema for video content
 */
export function generateVideoSchema(
  title: string,
  description: string,
  thumbnailUrl: string,
  uploadDate: string,
  duration: string = 'PT5M'
): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    'name': title,
    'description': description,
    'thumbnailUrl': thumbnailUrl,
    'uploadDate': uploadDate,
    'duration': duration,
  })
}

/**
 * Helper: Format URL segment to readable name
 * Example: "superflex-rankings" → "Superflex Rankings"
 */
function formatSegmentName(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Helper: Convert name to slug
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
}
