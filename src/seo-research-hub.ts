/**
 * Research Hub
 * Central hub for all research content (team dynasty capital, age curves, tiers)
 */

export function generateResearchHubHtml(appScripts: string, appPreloads: string, darkModeScript: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fantasy Research Hub | Dynasty Analysis & Insights | Fantasy Draft Pros</title>
  <meta name="description" content="In-depth dynasty fantasy football research. Explore team dynasty capital, age curves, player tiers, and advanced analysis from FDP experts.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/research/">
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://fantasydraftpros.com"},
      {"@type": "ListItem", "position": 2, "name": "Research Hub", "item": "https://fantasydraftpros.com/research/"}
    ]
  }</script>
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #fff; }
    .subtitle { font-size: 14px; color: #9b96b8; margin-bottom: 20px; }
    .research-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .research-card { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; transition: all 0.3s; }
    .research-card:hover { border-color: #7c4dff; transform: translateY(-2px); }
    .research-card h2 { font-size: 18px; color: #7c4dff; margin-bottom: 12px; font-weight: 700; }
    .research-card p { font-size: 14px; color: #9b96b8; margin-bottom: 16px; line-height: 1.8; }
    .research-card a { display: inline-block; color: #7c4dff; text-decoration: none; font-weight: 600; }
    .research-card a:hover { text-decoration: underline; }
    .research-meta { font-size: 12px; color: #7c4dff; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Dynasty Research Hub</h1>
    <p class="subtitle">Deep analysis, data-driven insights, and advanced dynasty strategy</p>

    <div class="research-grid">
      <div class="research-card">
        <div class="research-meta">32 Team Studies</div>
        <h2>Team Dynasty Capital</h2>
        <p>Comprehensive analysis of each NFL team's dynasty asset pool. See which teams have the most valuable dynasty players and project future roster strength.</p>
        <a href="https://fantasydraftpros.com/research/team-dynasty-capital/">Explore Teams →</a>
      </div>

      <div class="research-card">
        <div class="research-meta">Position Analysis</div>
        <h2>Age Curves & Projections</h2>
        <p>Understand player value trajectories by age. Analyze peak value windows for each position and plan multi-year dynasty strategies.</p>
        <a href="https://fantasydraftpros.com/research/age-curves/">View Analysis →</a>
      </div>

      <div class="research-card">
        <div class="research-meta">Market Segmentation</div>
        <h2>Player Tier Analysis</h2>
        <p>Discover natural clustering of player values. Identify bargains within tiers and understand the dynasty asset hierarchy.</p>
        <a href="https://fantasydraftpros.com/research/player-tiers/">See Tiers →</a>
      </div>
    </div>

    <div style="background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-top: 32px;">
      <h2 style="color: #7c4dff; margin-bottom: 12px;">About FDP Research</h2>
      <p style="font-size: 14px; color: #9b96b8; line-height: 1.8;">
        Fantasy Draft Pros research is built on real player valuation data. Our analysis tools process 1,000+ players across multiple league formats (1QB, Superflex, TE Premium, IDP) to identify patterns, trends, and opportunities. Each research piece is grounded in actual FDP Value calculations and updated regularly with new data.
      </p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`
}
