/**
 * Player Directory Page Generator
 *
 * Generates crawlable player directory pages:
 * - /players/ (master directory)
 * - /players/{pos}/ (position-specific directories)
 *
 * These pages link to individual player pages and provide
 * discovery, ranking, and FDP value information.
 */

import { SeoRankedPlayer } from './seo-data'

export interface PlayerDirectory {
  slug: string
  title: string
  description: string
  h1: string
  players: SeoRankedPlayer[]
  totalCount: number
}

/**
 * Generate master player directory (/players/)
 */
export function generatePlayerDirectoryHtml(
  directory: PlayerDirectory,
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  const topPlayers = directory.players.slice(0, 100)

  const playerRows = topPlayers
    .map(
      p => `
    <tr style="border-bottom:1px solid #2a2837">
      <td style="padding:12px;text-align:center;color:#7c4dff;font-weight:600">${p.rank}</td>
      <td style="padding:12px"><a href="/players/${p.slug}/" style="color:#7c4dff;text-decoration:none">${escapeHtml(p.name)}</a></td>
      <td style="padding:12px;color:#9b96b8;text-align:center">${p.pos}</td>
      <td style="padding:12px;color:#9b96b8;text-align:center">${p.team}</td>
      <td style="padding:12px;color:#9b96b8;text-align:center">${p.age}</td>
      <td style="padding:12px;text-align:right;font-weight:600;color:#7c4dff">${p.tradeVal.toLocaleString()}</td>
    </tr>
  `
    )
    .join('')

  const positionLinks = [
    { pos: 'QB', slug: '/players/qb/' },
    { pos: 'RB', slug: '/players/rb/' },
    { pos: 'WR', slug: '/players/wr/' },
    { pos: 'TE', slug: '/players/te/' },
    { pos: 'IDP', slug: '/players/idp/' },
  ]
    .map(
      p => `<a href="${p.slug}" style="padding:8px 16px;background:#2a2837;color:#7c4dff;text-decoration:none;border-radius:4px;display:inline-block;margin-right:8px;margin-bottom:8px">${p.pos}</a>`
    )
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(directory.title)}</title>
  <meta name="description" content="${escapeHtml(directory.description)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://fantasydraftpros.com${directory.slug}" />
  <meta property="og:title" content="${escapeHtml(directory.title)}" />
  <meta property="og:description" content="${escapeHtml(directory.description)}" />
  <meta property="og:url" content="https://fantasydraftpros.com${directory.slug}" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <div id="root">
    <div style="background:#13111e;color:#e0dce8;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="max-width:1000px;margin:0 auto">
        <nav style="font-size:13px;margin-bottom:24px">
          <a href="/" style="color:#7c4dff;text-decoration:none">Fantasy Draft Pros</a>
          <span style="color:#6b6580"> / </span>
          <span style="color:#9b96b8">${escapeHtml(directory.h1)}</span>
        </nav>

        <h1 style="color:#7c4dff;font-size:32px;margin:0 0 12px 0">${escapeHtml(directory.h1)}</h1>
        <p style="font-size:13px;color:#9b96b8;margin-bottom:24px">${directory.totalCount.toLocaleString()} players ranked</p>

        ${
          directory.slug === '/players/'
            ? `
          <div style="margin-bottom:32px">
            <p style="margin-bottom:16px;color:#e0dce8">Browse by position:</p>
            <div>${positionLinks}</div>
          </div>
        `
            : ''
        }

        <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
          <thead>
            <tr style="border-bottom:2px solid #3a3649">
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">#</th>
              <th style="padding:12px;text-align:left;color:#7c4dff;font-weight:600;font-size:12px">Player</th>
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Pos</th>
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Team</th>
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Age</th>
              <th style="padding:12px;text-align:right;color:#7c4dff;font-weight:600;font-size:12px">FDP Value</th>
            </tr>
          </thead>
          <tbody>
            ${playerRows}
          </tbody>
        </table>

        <div style="background:#1a1825;padding:24px;border-radius:8px;margin-bottom:32px">
          <h2 style="color:#7c4dff;font-size:16px;margin:0 0 12px 0">Explore More</h2>
          <ul style="list-style:none;padding:0;margin:0;column-count:2;column-gap:32px">
            <li style="margin-bottom:8px"><a href="/dynasty-rankings/" style="color:#7c4dff;text-decoration:none">Dynasty Rankings</a></li>
            <li style="margin-bottom:8px"><a href="/dynasty-trade-analyzer/" style="color:#7c4dff;text-decoration:none">Trade Analyzer</a></li>
            <li style="margin-bottom:8px"><a href="/dynasty-trade-calculator/" style="color:#7c4dff;text-decoration:none">Trade Calculator</a></li>
            <li style="margin-bottom:8px"><a href="/superflex-rankings/" style="color:#7c4dff;text-decoration:none">Superflex Rankings</a></li>
            <li style="margin-bottom:8px"><a href="/te-premium-rankings/" style="color:#7c4dff;text-decoration:none">TE Premium Rankings</a></li>
            <li style="margin-bottom:8px"><a href="/idp-dynasty-rankings/" style="color:#7c4dff;text-decoration:none">IDP Rankings</a></li>
          </ul>
        </div>

        <p style="font-size:12px;color:#6b6580;margin-bottom:0">
          Players are ranked by <a href="/fdp-value/" style="color:#7c4dff">FDP Value</a>,
          a 0–9,999 dynasty trade valuation scale. <a href="/methodology/" style="color:#7c4dff">Learn more</a>.
        </p>
      </div>
    </div>
  </div>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Fantasy Draft Pros", "item": "https://fantasydraftpros.com" },
      { "@type": "ListItem", "position": 2, "name": "${escapeJsonString(directory.h1)}", "item": "https://fantasydraftpros.com${directory.slug}" }
    ]
  }
  </script>

  ${appScripts}
</body>
</html>`
}

/**
 * Generate position-specific player directory (/players/{pos}/)
 */
export function generatePositionDirectoryHtml(
  position: string,
  players: SeoRankedPlayer[],
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  const positionFull: Record<string, string> = {
    QB: 'Quarterbacks',
    RB: 'Running Backs',
    WR: 'Wide Receivers',
    TE: 'Tight Ends',
    DL: 'Defensive Line',
    LB: 'Linebackers',
    DB: 'Defensive Backs',
  }

  const title = `Dynasty ${positionFull[position]} Directory | Players & Trade Values`
  const description = `Browse all ${positionFull[position].toLowerCase()} with FDP Values and dynasty trade rankings. Find players by value and position rank.`
  const h1 = `Dynasty ${positionFull[position]} Directory`

  const playerRows = players
    .slice(0, 50)
    .map(
      (p, idx) => `
    <tr style="border-bottom:1px solid #2a2837">
      <td style="padding:12px;text-align:center;color:#7c4dff;font-weight:600">${p.posRank}</td>
      <td style="padding:12px"><a href="/players/${p.slug}/" style="color:#7c4dff;text-decoration:none">${escapeHtml(p.name)}</a></td>
      <td style="padding:12px;color:#9b96b8;text-align:center">${p.team}</td>
      <td style="padding:12px;color:#9b96b8;text-align:center">${p.age}</td>
      <td style="padding:12px;text-align:right;font-weight:600;color:#7c4dff">${p.tradeVal.toLocaleString()}</td>
      <td style="padding:12px;text-align:center;color:#9b96b8;font-size:12px">#${p.rank}</td>
    </tr>
  `
    )
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://fantasydraftpros.com/players/${position.toLowerCase()}/" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="https://fantasydraftpros.com/players/${position.toLowerCase()}/" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <div id="root">
    <div style="background:#13111e;color:#e0dce8;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="max-width:900px;margin:0 auto">
        <nav style="font-size:13px;margin-bottom:24px">
          <a href="/" style="color:#7c4dff;text-decoration:none">Fantasy Draft Pros</a>
          <span style="color:#6b6580"> / </span>
          <a href="/players/" style="color:#7c4dff;text-decoration:none">Players</a>
          <span style="color:#6b6580"> / </span>
          <span style="color:#9b96b8">${escapeHtml(h1)}</span>
        </nav>

        <h1 style="color:#7c4dff;font-size:32px;margin:0 0 12px 0">${escapeHtml(h1)}</h1>
        <p style="font-size:13px;color:#9b96b8;margin-bottom:24px">${players.length} players ranked</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
          <thead>
            <tr style="border-bottom:2px solid #3a3649">
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Pos Rank</th>
              <th style="padding:12px;text-align:left;color:#7c4dff;font-weight:600;font-size:12px">Player</th>
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Team</th>
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Age</th>
              <th style="padding:12px;text-align:right;color:#7c4dff;font-weight:600;font-size:12px">FDP Value</th>
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Overall</th>
            </tr>
          </thead>
          <tbody>
            ${playerRows}
          </tbody>
        </table>

        <div style="background:#1a1825;padding:24px;border-radius:8px">
          <h2 style="color:#7c4dff;font-size:16px;margin:0 0 12px 0">Related</h2>
          <ul style="list-style:none;padding:0;margin:0">
            <li style="margin-bottom:8px"><a href="/dynasty-${position.toLowerCase()}-rankings/" style="color:#7c4dff;text-decoration:none">Dynasty ${positionFull[position]} Rankings</a></li>
            <li style="margin-bottom:8px"><a href="/dynasty-trade-analyzer/" style="color:#7c4dff;text-decoration:none">Trade Analyzer</a></li>
            <li style="margin-bottom:8px"><a href="/players/" style="color:#7c4dff;text-decoration:none">All Players</a></li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Fantasy Draft Pros", "item": "https://fantasydraftpros.com" },
      { "@type": "ListItem", "position": 2, "name": "Players", "item": "https://fantasydraftpros.com/players/" },
      { "@type": "ListItem", "position": 3, "name": "${escapeJsonString(h1)}", "item": "https://fantasydraftpros.com/players/${position.toLowerCase()}/" }
    ]
  }
  </script>

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
 * Escape JSON string for embedding in JSON-LD
 */
function escapeJsonString(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}
