/**
 * Enhanced Player Page Generation (Phase 6)
 *
 * Improves individual player pages with:
 * - Links to position ranking pages
 * - Clickable comparable player links
 * - Trade analyzer CTAs
 * - Breadcrumb navigation
 * - Better internal linking
 * - Enhanced structured data
 */

import { tierLabel } from './logic'

export interface EnhancedPlayerPageOptions {
  name: string
  pos: string
  team: string
  age: number
  tradeVal: number
  posRank: number
  rank: number
  slug: string
  proj?: { PPR: number; Half: number; Standard: number }
  note?: string
  shouldIndex: boolean
  valuesDate: string
  comparablePlayers: Array<{
    name: string
    pos: string
    team: string
    slug: string
    tradeVal: number
  }>
}

/**
 * Generate enhanced player page HTML with Phase 6 improvements
 */
export function generateEnhancedPlayerHtml(
  opts: EnhancedPlayerPageOptions,
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  const {
    name,
    pos,
    team,
    age,
    tradeVal,
    posRank,
    rank,
    slug,
    proj,
    note,
    shouldIndex,
    valuesDate,
    comparablePlayers,
  } = opts

  const nameEsc = escapeHtml(name)
  const nameJson = escapeJson(name)
  const url = `https://fantasydraftpros.com/players/${slug}/`
  const valStr = tradeVal.toLocaleString('en-US')
  const tier = tierLabel(posRank, pos)

  // SEO metadata
  const title = `${nameEsc} Dynasty Value & Trade Analysis 2026 | Fantasy Draft Pros`
  const desc = `${nameEsc} dynasty trade value: ${valStr}. ${pos}${posRank} for ${team}. Age ${age}. Dynasty rankings, comparable players, and trade analysis.`
  const robotsMeta = shouldIndex
    ? 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
    : 'noindex, follow'

  // Position ranking page
  const positionRankingUrl = `/dynasty-${pos.toLowerCase()}-rankings/`

  // Breadcrumb navigation
  const breadcrumbs = [
    { name: 'Fantasy Draft Pros', url: 'https://fantasydraftpros.com' },
    { name: 'Players', url: 'https://fantasydraftpros.com/players/' },
    { name: `${pos}s`, url: `https://fantasydraftpros.com/players/${pos.toLowerCase()}/` },
    { name: nameEsc, url: url },
  ]

  const breadcrumbJson = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((b, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: b.name,
        item: b.url,
      })),
    },
    null,
    2
  )

  // Person schema with enhanced data
  const personSchema = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: nameEsc,
      url: url,
      description: `${nameEsc} is a ${pos} for the ${team}. Dynasty trade value: ${valStr}. Age ${age}. Overall rank #${rank}, position rank #${posRank}.`,
      jobTitle: 'Professional Football Player',
      worksFor: {
        '@type': 'SportsTeam',
        name: team,
      },
      affiliation: {
        '@type': 'SportsTeam',
        name: team,
      },
    },
    null,
    2
  )

  // Comparable players HTML with links
  const comparableLinkHtml =
    comparablePlayers.length > 0
      ? `
    <div style="background:#1a1825;padding:16px;border-radius:8px;margin:24px 0">
      <h2 style="color:#7c4dff;font-size:14px;font-weight:700;margin:0 0 12px 0;text-transform:uppercase">Comparable Players</h2>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${comparablePlayers
          .slice(0, 5)
          .map(
            (c) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #2a2837">
          <div>
            <a href="/players/${c.slug}/" style="color:#7c4dff;text-decoration:none;font-weight:600">${escapeHtml(c.name)}</a>
            <div style="font-size:12px;color:#9b96b8">${c.pos} · ${c.team}</div>
          </div>
          <div style="text-align:right;font-weight:600;color:#7c4dff">${c.tradeVal.toLocaleString('en-US')}</div>
        </div>
        `
          )
          .join('')}
      </div>
    </div>
  `
      : ''

  // Projections HTML
  const projHtml =
    proj && proj.PPR > 0
      ? `<div style="display:flex;gap:16px;justify-content:center;margin:12px 0;font-size:12px;color:#9b96b8">
      <span>PPR: <b style="color:#e0dce8">${proj.PPR}</b></span>
      <span>Half: <b style="color:#e0dce8">${proj.Half}</b></span>
      <span>Standard: <b style="color:#e0dce8">${proj.Standard}</b></span>
    </div>`
      : ''

  // Note HTML
  const noteHtml = note
    ? `<div style="font-size:12px;color:#9b96b8;margin:12px 0;font-style:italic;padding:12px;background:#1a1825;border-left:3px solid #7c4dff;border-radius:4px">${escapeHtml(note)}</div>`
    : ''

  // Related links section
  const relatedLinksHtml = `
    <div style="background:#1a1825;padding:16px;border-radius:8px;margin:24px 0">
      <h2 style="color:#7c4dff;font-size:14px;font-weight:700;margin:0 0 12px 0;text-transform:uppercase">Explore</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
        <a href="${positionRankingUrl}" style="color:#7c4dff;text-decoration:none;padding:8px;border:1px solid #3a3649;border-radius:4px;text-align:center">${pos} Rankings</a>
        <a href="/dynasty-trade-analyzer/" style="color:#7c4dff;text-decoration:none;padding:8px;border:1px solid #3a3649;border-radius:4px;text-align:center">Trade Analyzer</a>
        <a href="/dynasty-trade-calculator/" style="color:#7c4dff;text-decoration:none;padding:8px;border:1px solid #3a3649;border-radius:4px;text-align:center">Trade Calculator</a>
        <a href="/dynasty-rankings/" style="color:#7c4dff;text-decoration:none;padding:8px;border:1px solid #3a3649;border-radius:4px;text-align:center">All Rankings</a>
      </div>
    </div>
  `

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${title}</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <meta name="author" content="Fantasy Draft Pros" />
  <meta name="robots" content="${robotsMeta}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Fantasy Draft Pros" />
  <meta property="og:title" content="${nameEsc} Dynasty Value &amp; Trade Analysis 2026" />
  <meta property="og:description" content="${escapeHtml(desc.substring(0, 160))}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="https://fantasydraftpros.com/logo-horizontal.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${nameEsc} Dynasty Value &amp; Trade Analysis" />
  <meta name="twitter:description" content="${escapeHtml(desc.substring(0, 160))}" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <script type="application/ld+json">
${personSchema}
  </script>
  <script type="application/ld+json">
${breadcrumbJson}
  </script>
  <script>
${darkModeScript}
  </script>
  ${appPreloads}
</head>
<body>
  <div id="root">
    <div style="background:#13111e;color:#e0dce8;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;line-height:1.7">
      <!-- Breadcrumb Navigation -->
      <nav style="font-size:12px;color:#9b96b8;margin-bottom:24px">
        <a href="/" style="color:#7c4dff;text-decoration:none">Fantasy Draft Pros</a>
        <span style="color:#6b6580"> / </span>
        <a href="/players/" style="color:#7c4dff;text-decoration:none">Players</a>
        <span style="color:#6b6580"> / </span>
        <a href="/players/${pos.toLowerCase()}/" style="color:#7c4dff;text-decoration:none">${pos}s</a>
        <span style="color:#6b6580"> / </span>
        <span>${nameEsc}</span>
      </nav>

      <!-- Player Header -->
      <h1 style="color:#7c4dff;font-size:32px;margin:0 0 8px 0">${nameEsc}</h1>
      <div style="display:flex;gap:16px;font-size:14px;color:#9b96b8;margin-bottom:16px">
        <span>${pos}</span>
        <span>·</span>
        <span>${team}</span>
        <span>·</span>
        <span>Age ${age}</span>
      </div>

      <!-- FDP Value Display -->
      <div style="background:#1a1825;padding:16px;border-radius:8px;margin-bottom:24px">
        <div style="font-size:12px;color:#9b96b8;margin-bottom:4px">FDP Dynasty Value</div>
        <div style="font-size:32px;font-weight:800;color:#f59e0b;margin-bottom:12px">${valStr}</div>
        <div style="display:flex;gap:24px;font-size:13px">
          <div>
            <div style="color:#9b96b8;margin-bottom:2px">Overall Rank</div>
            <div style="color:#7c4dff;font-weight:600">#${rank}</div>
          </div>
          <div>
            <div style="color:#9b96b8;margin-bottom:2px">${pos} Rank</div>
            <div style="color:#7c4dff;font-weight:600">#${posRank}</div>
          </div>
          <div>
            <div style="color:#9b96b8;margin-bottom:2px">Tier</div>
            <div style="color:${tier.c};font-weight:600">${tier.t}</div>
          </div>
        </div>
      </div>

      ${projHtml}
      ${noteHtml}

      <!-- Comparable Players -->
      ${comparableLinkHtml}

      <!-- Related Links -->
      ${relatedLinksHtml}

      <!-- Footer Info -->
      <div style="border-top:1px solid #2a2837;padding-top:16px;margin-top:24px;font-size:12px;color:#6b6580">
        <p style="margin:0">Values as of <strong>${valuesDate}</strong>. Learn more about <a href="/methodology/" style="color:#7c4dff">FDP Value methodology</a>.</p>
      </div>

      <p style="font-size:14px;color:#9b96b8;margin-top:24px">Loading full analysis...</p>
    </div>
  </div>
  ${appScripts}
</body>
</html>`
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

/**
 * Escape JSON string (for embedding in JSON-LD)
 */
function escapeJson(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}
