/**
 * FDP Market Index - Proprietary Market Research
 *
 * Aggregate market-level insights using real player value data.
 * These are actual metrics that can be cited/linked by other sites.
 */

export interface MarketMetrics {
  avgTop25: number
  avgTop100: number
  qbStrength: number
  rbStrength: number
  wrStrength: number
  teStrength: number
  idpStrength: number
  avgAgeTop100: number
  percentTop100ByPos: { [pos: string]: number }
}

export function generateMarketIndexHtml(
  metrics: MarketMetrics,
  playerCount: number,
  valuesDate: string,
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FDP Market Index | Dynasty Fantasy Football Market Metrics | Fantasy Draft Pros</title>
  <meta name="description" content="Proprietary FDP Market Index - Aggregate dynasty fantasy football market metrics. See position strength, top player values, and market composition.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/fdp-market-index/">
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "FDP Market Index",
    "description": "Proprietary dynasty fantasy football market research from Fantasy Draft Pros",
    "datePublished": "${valuesDate}",
    "dateModified": "${valuesDate}",
    "author": {"@type": "Organization", "name": "Fantasy Draft Pros"},
    "publisher": {"@type": "Organization", "name": "Fantasy Draft Pros"}
  }</script>
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://fantasydraftpros.com"},
      {"@type": "ListItem", "position": 2, "name": "FDP Market Index", "item": "https://fantasydraftpros.com/fdp-market-index/"}
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
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .metric-card { background: #2a2a35; border-radius: 8px; padding: 16px; border: 1px solid #444; }
    .metric-label { font-size: 12px; color: #9b96b8; margin-bottom: 4px; }
    .metric-value { font-size: 24px; font-weight: 800; color: #7c4dff; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #7c4dff; font-weight: 700; font-size: 12px; color: #7c4dff; }
    td { padding: 8px; border-bottom: 1px solid #333; }
    .description { font-size: 14px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .updated { font-size: 12px; color: #9b96b8; margin-top: 12px; }
    .research-note { background: #2a2a35; border-left: 3px solid #7c4dff; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #9b96b8; margin: 12px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>FDP Market Index</h1>
    <p class="subtitle">Proprietary dynasty fantasy football market research</p>

    <div class="section">
      <h2>Overall Market Composition</h2>
      <p class="description">High-level market overview based on ${playerCount}+ players in the FDP database.</p>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-label">Average Top 25 Value</div>
          <div class="metric-value">${metrics.avgTop25.toLocaleString()}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Average Top 100 Value</div>
          <div class="metric-value">${metrics.avgTop100.toLocaleString()}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Average Age (Top 100)</div>
          <div class="metric-value">${metrics.avgAgeTop100.toFixed(1)} yrs</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Players Ranked</div>
          <div class="metric-value">${playerCount}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Position Market Strength</h2>
      <p class="description">Relative value strength by position. Higher score indicates more concentrated value in that position.</p>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-label">QB Market Strength</div>
          <div class="metric-value">${metrics.qbStrength.toFixed(1)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">RB Market Strength</div>
          <div class="metric-value">${metrics.rbStrength.toFixed(1)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">WR Market Strength</div>
          <div class="metric-value">${metrics.wrStrength.toFixed(1)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">TE Market Strength</div>
          <div class="metric-value">${metrics.teStrength.toFixed(1)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">IDP Market Strength</div>
          <div class="metric-value">${metrics.idpStrength.toFixed(1)}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Top 100 Position Distribution</h2>
      <p class="description">What percentage of the top 100 dynasty assets are at each position.</p>
      <table>
        <thead><tr><th>Position</th><th>% of Top 100</th></tr></thead>
        <tbody>
          ${Object.entries(metrics.percentTop100ByPos)
            .sort((a, b) => b[1] - a[1])
            .map(([pos, pct]) => `<tr><td>${pos}</td><td>${(pct * 100).toFixed(1)}%</td></tr>`)
            .join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Methodology</h2>
      <p class="description">
        FDP Market Index metrics are calculated from real player values in the FDP database as of ${valuesDate}.
      </p>
      <ul style="margin-left: 20px; font-size: 14px; color: #9b96b8; line-height: 2">
        <li><strong>Market Strength:</strong> Average FDP Value for top players at that position</li>
        <li><strong>Position Distribution:</strong> Count of top-100 ranked players at each position</li>
        <li><strong>Average Age:</strong> Mean age of top-100 players</li>
      </ul>
      <div class="research-note">
        These metrics represent a snapshot of the FDP player value database. They are recalculated whenever player values are updated and can be used as a reference point for understanding market composition.
      </div>
    </div>

    <div class="section">
      <h2>Related Research</h2>
      <p style="font-size:14px;color:#9b96b8">
        Explore more FDP research: <a href="https://fantasydraftpros.com/research/" style="color:#7c4dff">Research Hub</a> ·
        <a href="https://fantasydraftpros.com/dynasty-rankings/" style="color:#7c4dff">Full Rankings</a> ·
        <a href="https://fantasydraftpros.com/dynasty-value-movers/" style="color:#7c4dff">Value Movers</a>
      </p>
    </div>

    <p class="updated">Market Index updated: ${valuesDate}</p>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`
}
