/**
 * NFL Team Fantasy Football Hubs
 *
 * Generate authoritative team-specific fantasy pages for all 32 NFL teams.
 * Each page shows:
 * - Highest-value dynasty assets on that team
 * - Position breakdown
 * - Trade analyzer link
 * - Dynasty rankings link
 */

export interface TeamHubData {
  teamName: string
  teamShort: string
  slug: string
  players: Array<{
    name: string
    pos: string
    age: number
    tradeVal: number
    rank: number
    posRank: number
    slug: string
  }>
}

export function generateTeamHubHtml(team: TeamHubData, valuesDate: string, appScripts: string, appPreloads: string, darkModeScript: string): string {
  const topPlayers = team.players.slice(0, 15)
  const posCounts: { [key: string]: number } = {}
  team.players.forEach(p => {
    posCounts[p.pos] = (posCounts[p.pos] || 0) + 1
  })

  const posBreakdown = Object.entries(posCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([pos, count]) => `<tr><td style="padding:8px;border-bottom:1px solid #333">${pos}</td><td style="padding:8px;border-bottom:1px solid #333">${count}</td></tr>`)
    .join('')

  const playerRows = topPlayers
    .map((p, i) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #333;color:#7c4dff">${i + 1}</td>
      <td style="padding:8px;border-bottom:1px solid #333"><a href="https://fantasydraftpros.com/players/${p.slug}/" style="color:#7c4dff;text-decoration:none">${escapeHtml(p.name)}</a></td>
      <td style="padding:8px;border-bottom:1px solid #333">${p.pos}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right">${p.age}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right">${p.rank}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right">${p.posRank}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right;color:#7c4dff;font-weight:700">${p.tradeVal.toLocaleString()}</td>
    </tr>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(team.teamName)} Fantasy Football Dynasty Guide | FDP</title>
  <meta name="description" content="Explore ${escapeHtml(team.teamName)} dynasty fantasy football assets. See team's highest-value players, FDP rankings, and trade recommendations.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/nfl/${team.slug}/fantasy-football/">
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://fantasydraftpros.com"},
      {"@type": "ListItem", "position": 2, "name": "NFL Teams", "item": "https://fantasydraftpros.com/nfl/"},
      {"@type": "ListItem", "position": 3, "name": "${escapeHtml(team.teamName)}", "item": "https://fantasydraftpros.com/nfl/${team.slug}/fantasy-football/"}
    ]
  }</script>
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #fff; }
    .subtitle { font-size: 14px; color: #9b96b8; margin-bottom: 20px; }
    .section { margin-bottom: 32px; background: #1a1a24; border-radius: 12px; padding: 20px; border: 1px solid #333; }
    .section h2 { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #7c4dff; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #7c4dff; font-weight: 700; font-size: 12px; color: #7c4dff; }
    td { padding: 8px; }
    .cta-btn { display: inline-block; padding: 12px 24px; background: #7c4dff; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; margin-top: 12px; }
    .cta-btn:hover { background: #6a3dd9; }
    .team-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .stat-card { background: #2a2a35; border-radius: 8px; padding: 12px; border: 1px solid #444; }
    .stat-label { font-size: 12px; color: #9b96b8; }
    .stat-value { font-size: 20px; font-weight: 800; color: #7c4dff; }
    .updated { font-size: 12px; color: #9b96b8; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(team.teamName)} Fantasy Football Dynasty Guide</h1>
    <p class="subtitle">Top dynasty assets, team breakdown, and trading recommendations for ${escapeHtml(team.teamName)}</p>

    <div class="section">
      <h2>Team Composition</h2>
      <p style="margin-bottom:16px;font-size:14px;color:#9b96b8">Players by position on ${escapeHtml(team.teamName)}</p>
      <table>
        <thead><tr><th>Position</th><th>Count</th></tr></thead>
        <tbody>${posBreakdown}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Highest-Value Dynasty Assets</h2>
      <p style="margin-bottom:16px;font-size:14px;color:#9b96b8">Top 15 ${escapeHtml(team.teamName)} players by FDP Value (dynasty PPR)</p>
      <table>
        <thead><tr><th>#</th><th>Player</th><th>Pos</th><th>Age</th><th>Overall Rank</th><th>Position Rank</th><th>FDP Value</th></tr></thead>
        <tbody>${playerRows}</tbody>
      </table>
      <a href="https://fantasydraftpros.com/dynasty-rankings/?team=${team.teamShort}" class="cta-btn">View Full Team Rankings</a>
    </div>

    <div class="section">
      <h2>Dynasty Tools</h2>
      <p style="margin-bottom:12px;font-size:14px;color:#9b96b8">Analyze ${escapeHtml(team.teamName)} players in trades</p>
      <a href="https://fantasydraftpros.com/dynasty-trade-analyzer/" class="cta-btn">Trade Analyzer</a>
      <a href="https://fantasydraftpros.com/dynasty-rankings/" class="cta-btn">Full Rankings</a>
      <a href="https://fantasydraftpros.com/nfl/" class="cta-btn">All Teams</a>
    </div>

    <p class="updated">Dynasty values updated: ${valuesDate}</p>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, m => map[m])
}
