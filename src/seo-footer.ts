/**
 * SEO Footer — Crawlable Homepage Navigation (Phase 11)
 *
 * Generates an HTML footer with real <a> links to all public SEO routes.
 * Improves:
 * - Search engine crawlability of secondary pages
 * - Link equity distribution from homepage
 * - User navigation (especially for noscript)
 * - Internal link graph strength
 */

import { SEO_ROUTES, getRoutesByGroup } from './seo-routes'

/**
 * Generate a comprehensive SEO footer with organized link sections
 */
export function generateSeoFooter(): string {
  const groups = new Map<string, typeof SEO_ROUTES>()

  // Organize routes by navGroup
  for (const route of SEO_ROUTES) {
    if (!route.navGroup || !route.index !== false) continue // Skip no-nav routes
    if (!groups.has(route.navGroup)) groups.set(route.navGroup, [])
    groups.get(route.navGroup)!.push(route)
  }

  // Build HTML sections in logical order
  const sections: string[] = []

  // Tools Section
  const toolRoutes = SEO_ROUTES.filter(r => r.navGroup === 'Primary' || r.category === 'tool')
  if (toolRoutes.length > 0) {
    sections.push(`
    <div style="margin-bottom:32px">
      <h3 style="color:#7c4dff;font-size:14px;font-weight:700;margin:0 0 12px 0;text-transform:uppercase">Tools</h3>
      <ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${toolRoutes.map(r => `<li><a href="${r.slug}" style="color:#7c4dff;text-decoration:none;font-size:13px">${r.title.split(' | ')[0]}</a></li>`).join('')}
      </ul>
    </div>
    `)
  }

  // Rankings Section
  const rankingRoutes = SEO_ROUTES.filter(r => r.category === 'ranking')
  if (rankingRoutes.length > 0) {
    sections.push(`
    <div style="margin-bottom:32px">
      <h3 style="color:#7c4dff;font-size:14px;font-weight:700;margin:0 0 12px 0;text-transform:uppercase">Rankings</h3>
      <ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${rankingRoutes.map(r => `<li><a href="${r.slug}" style="color:#7c4dff;text-decoration:none;font-size:13px">${r.title.split(' | ')[0]}</a></li>`).join('')}
      </ul>
    </div>
    `)
  }

  // Players Section
  const playerRoutes = SEO_ROUTES.filter(r => r.category === 'directory')
  if (playerRoutes.length > 0) {
    sections.push(`
    <div style="margin-bottom:32px">
      <h3 style="color:#7c4dff;font-size:14px;font-weight:700;margin:0 0 12px 0;text-transform:uppercase">Players</h3>
      <ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${playerRoutes.map(r => `<li><a href="${r.slug}" style="color:#7c4dff;text-decoration:none;font-size:13px">${r.title.split(' | ')[0]}</a></li>`).join('')}
      </ul>
    </div>
    `)
  }

  // Guides Section
  const guideRoutes = SEO_ROUTES.filter(r => r.navGroup === 'Guides')
  if (guideRoutes.length > 0) {
    sections.push(`
    <div style="margin-bottom:32px">
      <h3 style="color:#7c4dff;font-size:14px;font-weight:700;margin:0 0 12px 0;text-transform:uppercase">Guides</h3>
      <ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${guideRoutes.map(r => `<li><a href="${r.slug}" style="color:#7c4dff;text-decoration:none;font-size:13px">${r.title.split(' | ')[0]}</a></li>`).join('')}
      </ul>
    </div>
    `)
  }

  // Strategy Section
  const strategyRoutes = SEO_ROUTES.filter(r => r.slug.includes('buy-low') || r.slug.includes('sell-high') || r.slug.includes('draft-pick'))
  if (strategyRoutes.length > 0) {
    sections.push(`
    <div style="margin-bottom:32px">
      <h3 style="color:#7c4dff;font-size:14px;font-weight:700;margin:0 0 12px 0;text-transform:uppercase">Strategy</h3>
      <ul style="list-style:none;padding:0;margin:0">
        ${strategyRoutes.map(r => `<li style="margin-bottom:8px"><a href="${r.slug}" style="color:#7c4dff;text-decoration:none;font-size:13px">${r.title.split(' | ')[0]}</a></li>`).join('')}
      </ul>
    </div>
    `)
  }

  // About Section
  const aboutRoutes = SEO_ROUTES.filter(r => r.navGroup === 'About')
  if (aboutRoutes.length > 0) {
    sections.push(`
    <div style="margin-bottom:32px">
      <h3 style="color:#7c4dff;font-size:14px;font-weight:700;margin:0 0 12px 0;text-transform:uppercase">About</h3>
      <ul style="list-style:none;padding:0;margin:0">
        ${aboutRoutes.map(r => `<li style="margin-bottom:8px"><a href="${r.slug}" style="color:#7c4dff;text-decoration:none;font-size:13px">${r.title.split(' | ')[0]}</a></li>`).join('')}
      </ul>
    </div>
    `)
  }

  return `
  <footer style="background:#0a0913;color:#9b96b8;padding:48px 20px;margin-top:60px;border-top:1px solid #2a2837">
    <div style="max-width:1200px;margin:0 auto">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:32px;margin-bottom:48px;font-size:13px">
        ${sections.join('')}
      </div>

      <div style="border-top:1px solid #2a2837;padding-top:24px;font-size:12px;color:#6b6580">
        <p style="margin:0 0 8px 0">Fantasy Draft Pros helps fantasy football coaches make better decisions. Trade analyzer, FDP Values for 1,000+ players, dynasty rankings, and league-aware recommendations.</p>
        <p style="margin:0 0 8px 0">Supports 1QB, Superflex (2QB), TE Premium, IDP (Defensive), PPR, Half PPR, and Standard scoring. Import from Sleeper, ESPN, and other platforms.</p>
        <p style="margin:0">© ${new Date().getFullYear()} Fantasy Draft Pros. Not affiliated with NFL, ESPN, Sleeper, or any sportsbook.</p>
      </div>
    </div>
  </footer>
  `
}

/**
 * Generate a simple noscript footer with essential links for users without JavaScript
 */
export function generateNoscriptFooter(): string {
  const essentialRoutes = SEO_ROUTES.filter(r => r.priority && r.priority > 0.7)

  return `
  <footer style="background:#0a0913;color:#9b96b8;padding:40px 20px;margin-top:60px;border-top:1px solid #2a2837">
    <div style="max-width:800px;margin:0 auto;font-size:13px;line-height:1.8">
      <h2 style="color:#7c4dff;font-size:16px;margin:0 0 16px 0">Dynasty Tools & Resources</h2>
      <ul style="list-style:none;padding:0;margin:0">
        ${essentialRoutes.slice(0, 15).map(r => `<li style="margin-bottom:8px"><a href="${r.slug}" style="color:#7c4dff">${r.title.split(' | ')[0]}</a></li>`).join('')}
      </ul>

      <h2 style="color:#7c4dff;font-size:16px;margin:24px 0 16px 0">Learn Dynasty</h2>
      <p style="margin:0 0 12px 0">New to dynasty? Start with our <a href="/guides/" style="color:#7c4dff">dynasty guides</a> to learn strategy, valuation, and trade tactics.</p>
      <p style="margin:0">Browse <a href="/players/" style="color:#7c4dff">all 1,000+ players</a> with FDP Values, or check <a href="/dynasty-rankings/" style="color:#7c4dff">full dynasty rankings</a>.</p>

      <p style="margin:24px 0 0 0;font-size:12px;color:#6b6580">
        Fantasy Draft Pros — Trade analyzer and FDP Values for dynasty fantasy football. © ${new Date().getFullYear()}
      </p>
    </div>
  </footer>
  `
}
