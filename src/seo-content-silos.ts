/**
 * Content Silo Architecture (Phase 19.4)
 *
 * Organizes content into thematic silos for:
 * - Topical authority building
 * - Silo-specific internal linking
 * - Category-based navigation
 * - Topic cluster organization
 */

export interface ContentSilo {
  id: string
  name: string
  slug: string
  description: string
  parentPages: string[]
  childPages: string[]
  keywords: string[]
  priority: number
}

/**
 * Define content silos for dynasty fantasy football
 */
export function getContentSilos(): ContentSilo[] {
  return [
    {
      id: 'dynasty-basics',
      name: 'Dynasty Basics',
      slug: 'dynasty-basics',
      description: 'Fundamental concepts and getting started with dynasty leagues',
      parentPages: ['/dynasty-basics/', '/guides/'],
      childPages: [
        '/guides/how-to-value-a-dynasty-trade/',
        '/dynasty-rankings/',
        '/players/',
      ],
      keywords: ['dynasty', 'dynasty fantasy', 'league format', 'getting started'],
      priority: 1,
    },
    {
      id: 'trading-strategy',
      name: 'Trading Strategy',
      slug: 'trading-strategies',
      description: 'Trade analysis, valuation, and strategic trading techniques',
      parentPages: ['/trading-strategies/', '/guides/'],
      childPages: [
        '/guides/how-to-value-a-dynasty-trade/',
        '/dynasty-trade-analyzer/',
        '/dynasty-trade-calculator/',
        '/dynasty-buy-low/',
        '/dynasty-sell-high/',
      ],
      keywords: ['trade', 'trade value', 'buy low', 'sell high', 'trading'],
      priority: 1,
    },
    {
      id: 'format-strategy',
      name: 'Format Strategy',
      slug: 'format-strategy',
      description: 'League format variations and format-specific strategies',
      parentPages: ['/format-strategy/', '/guides/'],
      childPages: [
        '/guides/superflex-strategy/',
        '/guides/te-premium-strategy/',
        '/guides/idp-dynasty-values/',
        '/comparisons/qb/',
        '/rankings/superflex/',
        '/rankings/te-premium/',
        '/rankings/idp-overall/',
      ],
      keywords: ['superflex', 'TE premium', 'IDP', 'format', 'scoring'],
      priority: 1,
    },
    {
      id: 'player-analysis',
      name: 'Player Analysis',
      slug: 'player-analysis',
      description: 'Player rankings, comparisons, and individual player analysis',
      parentPages: ['/players/', '/rankings/'],
      childPages: [
        '/rankings/qb/',
        '/rankings/rb/',
        '/rankings/wr/',
        '/rankings/te/',
        '/comparisons/qb/',
        '/comparisons/rb/',
      ],
      keywords: ['player ranking', 'player value', 'comparison', 'analysis'],
      priority: 1,
    },
    {
      id: 'rebuild-strategy',
      name: 'Rebuild Strategy',
      slug: 'rebuild-strategy',
      description: 'Team rebuilding and long-term strategic planning',
      parentPages: ['/guides/'],
      childPages: [
        '/dynasty-draft-pick-values/',
        '/guides/how-to-value-a-dynasty-trade/',
      ],
      keywords: ['rebuild', 'tank', 'strategy', 'long-term', 'timeline'],
      priority: 2,
    },
    {
      id: 'tools-resources',
      name: 'Tools & Resources',
      slug: 'tools-resources',
      description: 'Dynasty tools and calculators for league management',
      parentPages: ['/dynasty-trade-analyzer/', '/dynasty-trade-calculator/'],
      childPages: [
        '/dynasty-trade-value-chart/',
        '/fdp-value/',
      ],
      keywords: ['tool', 'calculator', 'analyzer', 'resource'],
      priority: 2,
    },
  ]
}

/**
 * Get silo-specific breadcrumb navigation
 */
export function generateSiloBreadcrumbs(siloId: string, currentPage: string): string {
  const silos = getContentSilos()
  const silo = silos.find((s) => s.id === siloId)
  if (!silo) return ''

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: silo.name, url: `/silo/${silo.slug}/` },
    { name: currentPage, url: '#' },
  ]

  return breadcrumbs
    .map(
      (b, i) =>
        `<span>${i > 0 ? ' / ' : ''}<a href="${b.url}" style="color:#7c4dff">${b.name}</a></span>`
    )
    .join('')
}

/**
 * Get related pages within same silo
 */
export function getSiloRelatedPages(siloId: string, limit: number = 5): string[] {
  const silos = getContentSilos()
  const silo = silos.find((s) => s.id === siloId)
  if (!silo) return []
  return [...silo.parentPages, ...silo.childPages].slice(0, limit)
}

/**
 * Generate silo landing page
 */
export function generateSiloLandingPageHtml(siloId: string, appScripts: string, appPreloads: string, darkModeScript: string): string {
  const silos = getContentSilos()
  const silo = silos.find((s) => s.id === siloId)
  if (!silo) return ''

  const relatedPages = getSiloRelatedPages(siloId)
  const breadcrumbNav = generateSiloBreadcrumbs(siloId, silo.name)

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${silo.name} - Dynasty Fantasy Football | Fantasy Draft Pros</title>
  <meta name="description" content="${silo.description} Learn strategies, analysis, and tools at Fantasy Draft Pros." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://fantasydraftpros.com/silo/${silo.slug}/" />
  <meta property="og:title" content="${silo.name} - Dynasty Fantasy Football" />
  <meta property="og:description" content="${silo.description}" />
  <meta property="og:url" content="https://fantasydraftpros.com/silo/${silo.slug}/" />
  <meta property="og:type" content="article" />
  <meta property="og:image" content="https://fantasydraftpros.com/logo-horizontal.png" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <div id="root"><div style="background:#13111e;color:#e0dce8;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;line-height:1.7">
    <nav style="margin-bottom:24px;font-size:13px;color:#9b96b8">${breadcrumbNav}</nav>

    <h1 style="color:#7c4dff;font-size:28px;margin-bottom:8px">${silo.name}</h1>
    <p style="color:#9b96b8;font-size:14px;margin-bottom:24px">${silo.description}</p>

    <div style="background:#1a1829;padding:20px;border-radius:8px;margin-bottom:32px">
      <h2 style="color:#7c4dff;font-size:18px;margin-top:0">Explore This Topic</h2>
      <ul style="list-style:none;padding:0;margin:0">
        ${relatedPages
          .map(
            (page) =>
              `<li style="margin:12px 0"><a href="${page}" style="color:#7c4dff;font-weight:600">${page.split('/')[1]?.replace(/-/g, ' ') || 'Home'} →</a></li>`
          )
          .join('')}
      </ul>
    </div>

    <div style="background:#0a0913;padding:20px;border-radius:8px;border-left:4px solid #7c4dff">
      <h3 style="color:#7c4dff;margin-top:0">Key Topics</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${silo.keywords
          .map(
            (k) =>
              `<span style="background:#1a1829;color:#7c4dff;padding:6px 12px;border-radius:4px;font-size:12px">${k}</span>`
          )
          .join('')}
      </div>
    </div>
  </div></div>
  ${appScripts}
</body>
</html>`
}
