/**
 * Format-Specific Ranking Pages (Phase 13.1)
 *
 * Generates ranking pages for Superflex, TE Premium, and IDP formats
 * with values adjusted for each specific scoring format.
 */

import { SeoRankedPlayer } from './seo-data'
import { formatTradeValue } from './seo-data'

export type FormatType = 'superflex' | 'te-premium' | 'idp'

/**
 * Generate Superflex ranking page (2QB format with boosted QB values)
 */
export function generateSuperfexRankingPageHtml(
  players: SeoRankedPlayer[],
  appScripts: string,
  appPreloads: string,
  darkModeScript: string,
): string {
  const title = 'Superflex Rankings 2026 | Fantasy Draft Pros'
  const url = 'https://fantasydraftpros.com/rankings/superflex/'
  const desc = 'Superflex (2QB) dynasty rankings for 2026. Compare all positions with QB values boosted. FDP Values for 1,000+ players in 2QB leagues.'

  // Top 50 for display
  const topPlayers = players.slice(0, 50)
  const tableRows = topPlayers.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><a href="https://fantasydraftpros.com/players/${p.slug}/" style="color:#7c4dff;text-decoration:none">${escHtml(p.name)}</a></td>
      <td>${p.pos}</td>
      <td>${p.team}</td>
      <td style="color:#f59e0b;font-weight:700">${formatTradeValue(p.tradeVal)}</td>
    </tr>
  `).join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />
  <meta property="og:title" content="Superflex (2QB) Dynasty Rankings 2026" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="https://fantasydraftpros.com/logo-horizontal.png" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <style>
    body { background:#13111e; color:#e0dce8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:960px; margin:0 auto; padding:40px 20px; line-height:1.7; }
    a { color:#7c4dff; text-decoration:none; }
    a:hover { text-decoration:underline; }
    h1 { color:#7c4dff; font-size:28px; margin-bottom:8px; }
    .subtitle { color:#9b96b8; font-size:14px; margin-bottom:24px; }
    table { width:100%; border-collapse:collapse; margin:24px 0; }
    th { text-align:left; padding:12px 8px; color:#7c4dff; font-weight:700; border-bottom:2px solid #7c4dff; font-size:13px; }
    td { padding:10px 8px; border-bottom:1px solid #2a254044; font-size:13px; }
    tr:hover { background:#1a1829; }
    .cta { display:inline-block; background:#7c4dff; color:#fff; padding:12px 24px; border-radius:8px; font-weight:700; margin:20px 0; }
    .cta:hover { background:#6a3de8; text-decoration:none; }
    nav { margin-top:40px; padding-top:20px; border-top:1px solid #2a2540; }
  </style>
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <h1>Superflex Dynasty Rankings 2026</h1>
  <p class="subtitle">2QB format with boosted QB values</p>
  <p>${desc}</p>
  <p style="font-size:14px;color:#9b96b8;margin-bottom:16px"><strong>In Superflex leagues:</strong> QB scarcity increases significantly, boosting all QB values. QBs typically start appearing in round 1-2 of drafts.</p>

  <table>
    <thead>
      <tr>
        <th>Rank</th>
        <th>Player</th>
        <th>Pos</th>
        <th>Team</th>
        <th>FDP Value (SF)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <p style="font-size:14px;color:#9b96b8">Compare Superflex strategy with our <a href="https://fantasydraftpros.com/guides/superflex-strategy/" style="color:#7c4dff">Superflex Strategy Guide</a>.</p>
  <a href="https://fantasydraftpros.com/#rankings" class="cta">View Full Rankings →</a>

  <nav>
    <p style="font-size:14px;color:#fff;font-weight:700;margin-bottom:12px">Other Format Rankings</p>
    <ul style="font-size:13px;padding-left:20px;line-height:2;color:#9b96b8">
      <li><a href="https://fantasydraftpros.com/rankings/qb/">QB Rankings</a></li>
      <li><a href="https://fantasydraftpros.com/rankings/rb/">RB Rankings</a></li>
      <li><a href="https://fantasydraftpros.com/rankings/wr/">WR Rankings</a></li>
      <li><a href="https://fantasydraftpros.com/rankings/te/">TE Rankings</a></li>
      <li><a href="https://fantasydraftpros.com/rankings/te-premium/">TE Premium Rankings</a></li>
      <li style="margin-top:8px"><a href="https://fantasydraftpros.com/">Fantasy Draft Pros — Home</a></li>
    </ul>
  </nav>

  <div id="root"></div>
  ${appScripts}
</body>
</html>`
}

/**
 * Generate TE Premium ranking page (TE scoring boost format)
 */
export function generateTePremiumRankingPageHtml(
  players: SeoRankedPlayer[],
  appScripts: string,
  appPreloads: string,
  darkModeScript: string,
): string {
  const title = 'TE Premium Rankings 2026 | Fantasy Draft Pros'
  const url = 'https://fantasydraftpros.com/rankings/te-premium/'
  const desc = 'TE Premium (Tight End Premium) dynasty rankings for 2026. All positions with boosted TE scoring. FDP Values for 1,000+ players in TE Premium leagues.'

  // Top 50 for display
  const topPlayers = players.slice(0, 50)
  const tableRows = topPlayers.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><a href="https://fantasydraftpros.com/players/${p.slug}/" style="color:#7c4dff;text-decoration:none">${escHtml(p.name)}</a></td>
      <td>${p.pos}</td>
      <td>${p.team}</td>
      <td style="color:#f59e0b;font-weight:700">${formatTradeValue(p.tradeVal)}</td>
    </tr>
  `).join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />
  <meta property="og:title" content="TE Premium Dynasty Rankings 2026" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="https://fantasydraftpros.com/logo-horizontal.png" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <style>
    body { background:#13111e; color:#e0dce8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:960px; margin:0 auto; padding:40px 20px; line-height:1.7; }
    a { color:#7c4dff; text-decoration:none; }
    a:hover { text-decoration:underline; }
    h1 { color:#7c4dff; font-size:28px; margin-bottom:8px; }
    .subtitle { color:#9b96b8; font-size:14px; margin-bottom:24px; }
    table { width:100%; border-collapse:collapse; margin:24px 0; }
    th { text-align:left; padding:12px 8px; color:#7c4dff; font-weight:700; border-bottom:2px solid #7c4dff; font-size:13px; }
    td { padding:10px 8px; border-bottom:1px solid #2a254044; font-size:13px; }
    tr:hover { background:#1a1829; }
    .cta { display:inline-block; background:#7c4dff; color:#fff; padding:12px 24px; border-radius:8px; font-weight:700; margin:20px 0; }
    .cta:hover { background:#6a3de8; text-decoration:none; }
    nav { margin-top:40px; padding-top:20px; border-top:1px solid #2a2540; }
  </style>
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <h1>TE Premium Dynasty Rankings 2026</h1>
  <p class="subtitle">Tight End Premium scoring format</p>
  <p>${desc}</p>
  <p style="font-size:14px;color:#9b96b8;margin-bottom:16px"><strong>In TE Premium leagues:</strong> Tight end scoring is boosted (0.5-1 PPR bonus), creating scarcity. Elite TEs become premium assets.</p>

  <table>
    <thead>
      <tr>
        <th>Rank</th>
        <th>Player</th>
        <th>Pos</th>
        <th>Team</th>
        <th>FDP Value (TEP)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <p style="font-size:14px;color:#9b96b8">Learn more about TE Premium strategy with our <a href="https://fantasydraftpros.com/guides/te-premium-strategy/" style="color:#7c4dff">TE Premium Strategy Guide</a>.</p>
  <a href="https://fantasydraftpros.com/#rankings" class="cta">View Full Rankings →</a>

  <nav>
    <p style="font-size:14px;color:#fff;font-weight:700;margin-bottom:12px">Other Format Rankings</p>
    <ul style="font-size:13px;padding-left:20px;line-height:2;color:#9b96b8">
      <li><a href="https://fantasydraftpros.com/rankings/superflex/">Superflex Rankings</a></li>
      <li><a href="https://fantasydraftpros.com/rankings/qb/">QB Rankings</a></li>
      <li><a href="https://fantasydraftpros.com/rankings/rb/">RB Rankings</a></li>
      <li><a href="https://fantasydraftpros.com/rankings/wr/">WR Rankings</a></li>
      <li><a href="https://fantasydraftpros.com/rankings/te/">TE Rankings</a></li>
      <li style="margin-top:8px"><a href="https://fantasydraftpros.com/">Fantasy Draft Pros — Home</a></li>
    </ul>
  </nav>

  <div id="root"></div>
  ${appScripts}
</body>
</html>`
}

/**
 * Generate IDP Overall ranking page (all defensive positions combined)
 */
export function generateIdpOverallRankingPageHtml(
  players: SeoRankedPlayer[],
  appScripts: string,
  appPreloads: string,
  darkModeScript: string,
): string {
  const title = 'IDP Dynasty Rankings 2026 | Fantasy Draft Pros'
  const url = 'https://fantasydraftpros.com/rankings/idp-overall/'
  const desc = 'IDP (Defensive) dynasty rankings for 2026. Compare all defensive positions (DL, LB, DB). FDP Values for 1,000+ players in IDP leagues.'

  const topPlayers = players.slice(0, 50)
  const tableRows = topPlayers.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><a href="https://fantasydraftpros.com/players/${p.slug}/" style="color:#7c4dff;text-decoration:none">${escHtml(p.name)}</a></td>
      <td>${p.pos}</td>
      <td>${p.team}</td>
      <td style="color:#f59e0b;font-weight:700">${formatTradeValue(p.tradeVal)}</td>
    </tr>
  `).join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />
  <meta property="og:title" content="IDP Dynasty Rankings 2026" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="https://fantasydraftpros.com/logo-horizontal.png" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <style>
    body { background:#13111e; color:#e0dce8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:960px; margin:0 auto; padding:40px 20px; line-height:1.7; }
    a { color:#7c4dff; text-decoration:none; }
    a:hover { text-decoration:underline; }
    h1 { color:#7c4dff; font-size:28px; margin-bottom:8px; }
    .subtitle { color:#9b96b8; font-size:14px; margin-bottom:24px; }
    table { width:100%; border-collapse:collapse; margin:24px 0; }
    th { text-align:left; padding:12px 8px; color:#7c4dff; font-weight:700; border-bottom:2px solid #7c4dff; font-size:13px; }
    td { padding:10px 8px; border-bottom:1px solid #2a254044; font-size:13px; }
    tr:hover { background:#1a1829; }
    .cta { display:inline-block; background:#7c4dff; color:#fff; padding:12px 24px; border-radius:8px; font-weight:700; margin:20px 0; }
    .cta:hover { background:#6a3de8; text-decoration:none; }
    nav { margin-top:40px; padding-top:20px; border-top:1px solid #2a2540; }
  </style>
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <h1>IDP Dynasty Rankings 2026</h1>
  <p class="subtitle">Defensive players: DL, LB, DB</p>
  <p>${desc}</p>
  <p style="font-size:14px;color:#9b96b8;margin-bottom:16px"><strong>In IDP leagues:</strong> Defensive players are individually rostered and scored. Position scarcity and consistency are key valuation factors.</p>

  <table>
    <thead>
      <tr>
        <th>Rank</th>
        <th>Player</th>
        <th>Pos</th>
        <th>Team</th>
        <th>FDP Value (IDP)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <p style="font-size:14px;color:#9b96b8">Master IDP strategy with our <a href="https://fantasydraftpros.com/guides/idp-dynasty-values/" style="color:#7c4dff">IDP Dynasty Values Guide</a>.</p>
  <a href="https://fantasydraftpros.com/#rankings" class="cta">View Full Rankings →</a>

  <nav>
    <p style="font-size:14px;color:#fff;font-weight:700;margin-bottom:12px">IDP Position Rankings</p>
    <ul style="font-size:13px;padding-left:20px;line-height:2;color:#9b96b8">
      <li><a href="https://fantasydraftpros.com/rankings/dl/">Defensive Line (DL)</a></li>
      <li><a href="https://fantasydraftpros.com/rankings/lb/">Linebacker (LB)</a></li>
      <li><a href="https://fantasydraftpros.com/rankings/db/">Defensive Back (DB)</a></li>
      <li style="margin-top:8px"><a href="https://fantasydraftpros.com/rankings/qb/">Back to Offensive Rankings</a></li>
      <li style="margin-top:8px"><a href="https://fantasydraftpros.com/">Fantasy Draft Pros — Home</a></li>
    </ul>
  </nav>

  <div id="root"></div>
  ${appScripts}
</body>
</html>`
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
