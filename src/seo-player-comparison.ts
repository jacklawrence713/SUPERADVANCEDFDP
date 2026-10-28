/**
 * Player Comparison Pages (Phase 13.4)
 *
 * Generate comparison pages for top players to enable
 * side-by-side analysis of similar players by position.
 */

export interface PlayerComparisonData {
  name: string
  pos: string
  team: string
  age: number
  tradeVal: number
  posRank: number
  rank: number
  slug: string
}

/**
 * Generate a player comparison page for top players by position
 */
export function generatePlayerComparisonPageHtml(
  players: PlayerComparisonData[],
  position: string,
  appScripts: string,
  appPreloads: string,
  darkModeScript: string,
): string {
  const title = `Top ${position} Comparisons 2026 | Dynasty Fantasy Football | Fantasy Draft Pros`
  const url = `https://fantasydraftpros.com/comparisons/${position.toLowerCase()}/`
  const desc = `Compare top dynasty ${position}s side-by-side. Analyze value, age, production, and dynasty potential for 2026.`

  // Get top 10 players for comparison
  const topPlayers = players.filter(p => p.pos === position).slice(0, 10)

  const comparisonTable = `
    <div style="overflow-x:auto;margin:24px 0">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#1a1829">
            <th style="text-align:left;padding:12px 8px;color:#7c4dff;border-bottom:2px solid #7c4dff;font-weight:700">Player</th>
            <th style="text-align:center;padding:12px 8px;color:#7c4dff;border-bottom:2px solid #7c4dff;font-weight:700">Team</th>
            <th style="text-align:center;padding:12px 8px;color:#7c4dff;border-bottom:2px solid #7c4dff;font-weight:700">Age</th>
            <th style="text-align:center;padding:12px 8px;color:#7c4dff;border-bottom:2px solid #7c4dff;font-weight:700">Rank</th>
            <th style="text-align:right;padding:12px 8px;color:#7c4dff;border-bottom:2px solid #7c4dff;font-weight:700">FDP Value</th>
          </tr>
        </thead>
        <tbody>
          ${topPlayers.map((p, i) => `
            <tr style="border-bottom:1px solid #2a254044;${i % 2 === 0 ? 'background:#0a0913' : ''}">
              <td style="padding:10px 8px"><a href="https://fantasydraftpros.com/players/${p.slug}/" style="color:#7c4dff;text-decoration:none;font-weight:700">${p.name}</a></td>
              <td style="text-align:center;padding:10px 8px;color:#9b96b8">${p.team}</td>
              <td style="text-align:center;padding:10px 8px;color:#9b96b8">${p.age}</td>
              <td style="text-align:center;padding:10px 8px;color:#9b96b8">#${p.posRank}</td>
              <td style="text-align:right;padding:10px 8px;color:#f59e0b;font-weight:700">${p.tradeVal.toLocaleString('en-US')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />
  <meta property="og:title" content="Top ${position} Comparisons 2026" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="https://fantasydraftpros.com/logo-horizontal.png" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <style>
    body { background:#13111e; color:#e0dce8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:1000px; margin:0 auto; padding:40px 20px; line-height:1.7; }
    a { color:#7c4dff; text-decoration:none; }
    a:hover { text-decoration:underline; }
    h1 { color:#7c4dff; font-size:28px; margin-bottom:8px; }
    h2 { color:#7c4dff; font-size:18px; margin:24px 0 12px 0; }
    .subtitle { color:#9b96b8; font-size:14px; margin-bottom:24px; }
    .insights { background:#1a1829; padding:16px; border-radius:8px; margin:20px 0; border-left:3px solid #7c4dff; }
    .insights h3 { color:#7c4dff; margin-top:0; font-size:14px; }
    nav { margin-top:40px; padding-top:20px; border-top:1px solid #2a2540; }
  </style>
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <h1>Top ${position} Comparisons</h1>
  <p class="subtitle">Compare the best dynasty ${position}s side-by-side (2026)</p>
  <p>${desc}</p>

  <h2>Player Comparison Chart</h2>
  ${comparisonTable}

  <h2>What to Look For When Comparing Players</h2>
  <div class="insights">
    <h3>🎯 Value Differences</h3>
    <p>Look for players with similar production but different FDP Values. Value discrepancies = trade opportunities.</p>
  </div>
  <div class="insights">
    <h3>📊 Age & Timeline</h3>
    <p>Younger players have longer careers ahead. Compare age to understand remaining production window and trade timeline.</p>
  </div>
  <div class="insights">
    <h3>🏆 Ranking Tiers</h3>
    <p>Players 5+ spots apart in the rankings represent meaningful value tiers. Use rankings to identify upgrade opportunities.</p>
  </div>

  <nav>
    <p style="font-size:14px;color:#fff;font-weight:700;margin-bottom:12px">Other Position Comparisons</p>
    <ul style="font-size:13px;padding-left:20px;line-height:2;color:#9b96b8">
      ${['QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB'].map(p =>
        `<li><a href="https://fantasydraftpros.com/comparisons/${p.toLowerCase()}/">${p} Comparisons</a></li>`
      ).join('')}
      <li style="margin-top:8px"><a href="https://fantasydraftpros.com/dynasty-rankings/">Full Rankings</a></li>
    </ul>
  </nav>

  <div id="root"></div>
  ${appScripts}
</body>
</html>`
}
