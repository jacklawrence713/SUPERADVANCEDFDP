/**
 * Team Dynasty Capital Analysis
 * Shows each NFL team's dynasty asset pool and roster composition
 */

export interface TeamDynastyCapital {
  teamName: string;
  teamShort: string;
  slug: string;
  division: string;
  totalCapital: number;
  playerCount: number;
  topPlayers: Array<{
    name: string;
    pos: string;
    age: number;
    value: number;
    rank: number;
  }>;
  positionBreakdown: { [pos: string]: number };
  avgAge: number;
  rebuilding: boolean;
}

export function generateTeamDynastyCapitalHtml(
  team: TeamDynastyCapital,
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  const posOrder = ['QB', 'RB', 'WR', 'TE', 'IDP'];
  const posCount = posOrder
    .filter(p => team.positionBreakdown[p] > 0)
    .map(p => `${p}: ${team.positionBreakdown[p]}`)
    .join(' | ');

  const topPlayersHtml = team.topPlayers
    .slice(0, 15)
    .map(
      p => `
    <tr>
      <td>${p.rank}</td>
      <td style="font-weight:600">${p.name}</td>
      <td>${p.pos}</td>
      <td>${p.age}</td>
      <td style="color:#7c4dff;font-weight:600">${p.value.toLocaleString()}</td>
    </tr>`
    )
    .join('');

  const statusBadge = team.rebuilding
    ? '<span style="background:#d9534f;color:white;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600">Rebuilding</span>'
    : '<span style="background:#5cb85c;color:white;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600">Contending</span>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${team.teamName} Dynasty Assets | Fantasy Football Analysis | Fantasy Draft Pros</title>
  <meta name="description" content="Analyze ${team.teamName}'s dynasty capital and asset pool. See top players, position composition, and long-term roster outlook.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/research/team-dynasty-capital/${team.slug}/">
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://fantasydraftpros.com"},
      {"@type": "ListItem", "position": 2, "name": "Research", "item": "https://fantasydraftpros.com/research/"},
      {"@type": "ListItem", "position": 3, "name": "Team Dynasty Capital", "item": "https://fantasydraftpros.com/research/team-dynasty-capital/"},
      {"@type": "ListItem", "position": 4, "name": "${team.teamName}", "item": "https://fantasydraftpros.com/research/team-dynasty-capital/${team.slug}/"}
    ]
  }</script>
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #fff; }
    .subtitle { font-size: 14px; color: #9b96b8; margin-bottom: 20px; }
    .team-header { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .team-info h2 { font-size: 20px; color: #7c4dff; margin-bottom: 12px; }
    .metric { margin-bottom: 16px; }
    .metric-label { font-size: 12px; color: #9b96b8; margin-bottom: 4px; }
    .metric-value { font-size: 24px; font-weight: 800; color: #fff; }
    .section { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .section h2 { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #7c4dff; }
    .section p { font-size: 14px; color: #9b96b8; margin-bottom: 16px; line-height: 1.8; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #7c4dff; font-weight: 700; font-size: 12px; color: #7c4dff; }
    td { padding: 8px; border-bottom: 1px solid #333; }
    .pos-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-top: 12px; }
    .pos-card { background: #2a2a35; border-radius: 8px; padding: 12px; border: 1px solid #444; text-align: center; }
    .pos-card-label { font-size: 12px; color: #9b96b8; margin-bottom: 4px; }
    .pos-card-value { font-size: 20px; font-weight: 800; color: #7c4dff; }
    .status-note { background: #2a2a35; border-left: 3px solid #7c4dff; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #9b96b8; margin-bottom: 12px; }
    a { color: #7c4dff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${team.teamName} Dynasty Capital Analysis</h1>
    <p class="subtitle">${team.division} | NFL Dynasty Asset Portfolio</p>

    <div class="team-header">
      <div class="team-info">
        <h2>${team.teamName}</h2>
        <div class="metric">
          <div class="metric-label">Total Dynasty Capital</div>
          <div class="metric-value">${team.totalCapital.toLocaleString()}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Top Dynasty Assets</div>
          <div class="metric-value">${team.playerCount}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Average Asset Age</div>
          <div class="metric-value">${team.avgAge.toFixed(1)} yrs</div>
        </div>
      </div>
      <div>
        <h2>Position Composition</h2>
        <div class="pos-grid">
          ${posOrder
            .filter(p => team.positionBreakdown[p] > 0)
            .map(
              p => `
          <div class="pos-card">
            <div class="pos-card-label">${p}</div>
            <div class="pos-card-value">${team.positionBreakdown[p]}</div>
          </div>`
            )
            .join('')}
        </div>
        <p style="font-size:12px;color:#9b96b8;margin-top:16px">${posCount}</p>
      </div>
    </div>

    <div class="section">
      <h2>Top 15 Dynasty Assets</h2>
      <p>Highest-value players in ${team.teamName}'s current roster.</p>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Position</th>
            <th>Age</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          ${topPlayersHtml}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Roster Outlook</h2>
      <div class="status-note">
        ${statusBadge}
        <p style="margin-top:8px;font-size:13px">
          ${team.rebuilding
            ? `${team.teamName} appears to be in a rebuilding phase with a younger asset pool and lower immediate capital concentration. Focus on long-term value accumulation.`
            : `${team.teamName} has a strong contending roster with significant dynasty capital concentrated in proven assets.`}
        </p>
      </div>
      <p>
        With ${team.avgAge.toFixed(1)} years average age in top assets, ${team.teamName}'s dynasty window is ${
          team.avgAge < 26
            ? 'just opening - excellent long-term position'
            : team.avgAge < 28
              ? 'in its peak - contending window now'
              : 'aging - consider long-term rebuild'
        }. Monitor draft capital allocation and free agency moves for ${team.teamName} to assess future direction.
      </p>
    </div>

    <div class="section">
      <h2>Compare Teams</h2>
      <p>Explore dynasty capital across the NFL:</p>
      <p style="margin-top:12px;font-size:13px">
        <a href="https://fantasydraftpros.com/research/team-dynasty-capital/">← All Teams</a> |
        <a href="https://fantasydraftpros.com/research/">Research Hub</a> |
        <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">Trade Calculator</a>
      </p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
