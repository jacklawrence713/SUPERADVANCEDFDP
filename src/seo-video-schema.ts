/**
 * Video Schema & Multimedia Expansion (Phase 19.2)
 *
 * Generates video metadata and schema for tutorial/educational content
 */

export interface VideoMetadata {
  title: string
  description: string
  url: string
  thumbnailUrl: string
  uploadDate: string
  duration: string
  keywords: string[]
  category: string
}

/**
 * Generate video metadata for dynasty tutorial content
 */
export function generateVideoMetadata(): VideoMetadata[] {
  return [
    {
      title: 'Dynasty Trade Calculator Tutorial - How to Analyze Trades',
      description: 'Learn how to use the Fantasy Draft Pros dynasty trade calculator to evaluate trades. Step-by-step tutorial covering player values, trade analysis, and decision making.',
      url: 'https://fantasydraftpros.com/videos/trade-calculator-tutorial/',
      thumbnailUrl: 'https://fantasydraftpros.com/thumbnails/trade-calculator.jpg',
      uploadDate: '2026-10-21T00:00:00Z',
      duration: 'PT8M30S',
      keywords: ['dynasty trade', 'trade calculator', 'trade analyzer', 'tutorial'],
      category: 'Education',
    },
    {
      title: 'Dynasty Rankings Explained - How to Use the Rankings Tool',
      description: 'Complete guide to dynasty player rankings. Understand FDP values, position rankings, tier levels, and how to apply rankings to your league strategy.',
      url: 'https://fantasydraftpros.com/videos/rankings-tutorial/',
      thumbnailUrl: 'https://fantasydraftpros.com/thumbnails/rankings.jpg',
      uploadDate: '2026-10-21T00:00:00Z',
      duration: 'PT6M45S',
      keywords: ['dynasty rankings', 'player values', 'tier levels', 'ranking system'],
      category: 'Education',
    },
    {
      title: 'Superflex Dynasty Strategy - How to Win 2QB Leagues',
      description: 'Expert strategy guide for superflex (2QB) dynasty leagues. Learn QB scarcity principles, valuation adjustments, and optimal draft strategies.',
      url: 'https://fantasydraftpros.com/videos/superflex-strategy/',
      thumbnailUrl: 'https://fantasydraftpros.com/thumbnails/superflex.jpg',
      uploadDate: '2026-10-21T00:00:00Z',
      duration: 'PT10M15S',
      keywords: ['superflex', '2qb', 'dynasty strategy', 'league format'],
      category: 'Strategy',
    },
    {
      title: 'TE Premium Dynasty - Tight End Scarcity Strategy',
      description: 'Master tight end premium leagues. Understand TE scarcity, scoring adjustments, and how to build championship rosters in TEP formats.',
      url: 'https://fantasydraftpros.com/videos/te-premium-strategy/',
      thumbnailUrl: 'https://fantasydraftpros.com/thumbnails/te-premium.jpg',
      uploadDate: '2026-10-21T00:00:00Z',
      duration: 'PT7M30S',
      keywords: ['TE premium', 'tight end', 'scarcity', 'scoring format'],
      category: 'Strategy',
    },
    {
      title: 'Dynasty Rebuild Strategy - How to Rebuild Your Team',
      description: 'Complete rebuild guide for struggling dynasty teams. Learn timing, asset accumulation, timeline planning, and how to execute a successful multi-year rebuild.',
      url: 'https://fantasydraftpros.com/videos/rebuild-strategy/',
      thumbnailUrl: 'https://fantasydraftpros.com/thumbnails/rebuild.jpg',
      uploadDate: '2026-10-21T00:00:00Z',
      duration: 'PT9M00S',
      keywords: ['rebuild', 'dynasty strategy', 'asset management', 'timeline'],
      category: 'Strategy',
    },
  ]
}

/**
 * Generate VideoObject schema for tutorial content
 */
export function generateVideoSchema(video: VideoMetadata): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    'name': video.title,
    'description': video.description,
    'thumbnailUrl': video.thumbnailUrl,
    'uploadDate': video.uploadDate,
    'duration': video.duration,
    'contentUrl': video.url,
    'embedUrl': video.url,
    'author': {
      '@type': 'Organization',
      'name': 'Fantasy Draft Pros',
      'url': 'https://fantasydraftpros.com',
    },
    'keywords': video.keywords.join(', '),
  })
}

/**
 * Generate video sitemap XML for video discovery
 */
export function generateVideoSitemap(videos: VideoMetadata[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
`

  for (const video of videos) {
    xml += `  <url>
    <loc>${video.url}</loc>
    <video:video>
      <video:thumbnail_loc>${video.thumbnailUrl}</video:thumbnail_loc>
      <video:title>${escapeXml(video.title)}</video:title>
      <video:description>${escapeXml(video.description)}</video:description>
      <video:content_loc>${video.url}</video:content_loc>
      <video:duration>${parseDuration(video.duration)}</video:duration>
      <video:publication_date>${video.uploadDate}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:tag>${video.keywords.join('</video:tag><video:tag>')}</video:tag>
    </video:video>
  </url>
`
  }

  xml += `</urlset>\n`
  return xml
}

/**
 * Parse ISO 8601 duration to seconds
 */
function parseDuration(iso8601: string): number {
  const match = iso8601.match(/PT(\d+)M(\d+)S/)
  if (!match) return 0
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
