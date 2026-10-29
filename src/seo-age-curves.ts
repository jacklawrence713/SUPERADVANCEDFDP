/**
 * Age Curves & Position Value Trajectories
 * Shows how player value peaks by position and age
 */

export interface AgeCurve {
  position: string;
  peakAge: number;
  peakValue: number;
  declineRate: number;
  description: string;
  trajectory: Array<{ age: number; value: number }>;
}

export function generateAgeCurvesHtml(
  curves: AgeCurve[],
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  const curveCards = curves
    .map(
      curve => `
    <div class="curve-card">
      <h3>${curve.position}</h3>
      <div class="metric-row">
        <div class="metric">
          <div class="metric-label">Peak Age</div>
          <div class="metric-value">${curve.peakAge}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Peak Value</div>
          <div class="metric-value">${curve.peakValue.toLocaleString()}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Decline Rate</div>
          <div class="metric-value">${(curve.declineRate * 100).toFixed(1)}%/yr</div>
        </div>
      </div>
      <p style="font-size:13px;color:#9b96b8;margin-top:12px">${curve.description}</p>
    </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dynasty Fantasy Football Age Curves | Player Value Peaks | Fantasy Draft Pros</title>
  <meta name="description" content="Understand when players reach peak value by position. Explore age curve analysis for QB, RB, WR, TE, and IDP positions with value trajectories.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/research/age-curves/">
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Dynasty Fantasy Football Age Curves & Projections",
    "description": "Position-by-position analysis of player value peaks and trajectories",
    "author": {"@type": "Organization", "name": "Fantasy Draft Pros"},
    "publisher": {"@type": "Organization", "name": "Fantasy Draft Pros"}
  }</script>
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://fantasydraftpros.com"},
      {"@type": "ListItem", "position": 2, "name": "Research", "item": "https://fantasydraftpros.com/research/"},
      {"@type": "ListItem", "position": 3, "name": "Age Curves", "item": "https://fantasydraftpros.com/research/age-curves/"}
    ]
  }</script>
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #fff; }
    .subtitle { font-size: 14px; color: #9b96b8; margin-bottom: 20px; }
    .intro { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .intro p { font-size: 14px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .intro li { margin-left: 20px; margin-bottom: 8px; font-size: 14px; color: #9b96b8; }
    .curves-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .curve-card { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 20px; }
    .curve-card h3 { font-size: 18px; color: #7c4dff; margin-bottom: 16px; font-weight: 700; }
    .metric-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .metric { background: #2a2a35; border-radius: 8px; padding: 12px; border: 1px solid #444; }
    .metric-label { font-size: 11px; color: #9b96b8; margin-bottom: 4px; }
    .metric-value { font-size: 18px; font-weight: 800; color: #7c4dff; }
    .section { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .section h2 { font-size: 18px; color: #7c4dff; margin-bottom: 16px; font-weight: 700; }
    .section p { font-size: 14px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .section ul { margin-left: 20px; }
    .section li { margin-bottom: 8px; font-size: 14px; color: #9b96b8; }
    a { color: #7c4dff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Age Curves & Position Value Trajectories</h1>
    <p class="subtitle">Understand when players reach peak value and plan multi-year dynasty strategies</p>

    <div class="intro">
      <p><strong>What are Age Curves?</strong></p>
      <p>
        Age curves model how player value changes across their career lifecycle. Each position has a different peak age and decline trajectory. Understanding these patterns helps you:
      </p>
      <ul>
        <li>Identify when to buy young assets before peak value</li>
        <li>Know when to sell aging stars at the right time</li>
        <li>Plan multi-year dynasty windows based on roster age composition</li>
        <li>Value trades with age-adjusted perspective</li>
      </ul>
    </div>

    <h2 style="font-size:20px;margin:32px 0 20px;color:#fff">Position Age Curves</h2>
    <div class="curves-grid">
      ${curveCards}
    </div>

    <div class="section">
      <h2>How to Use Age Curves in Dynasty Strategy</h2>
      <p><strong>Young Players (Pre-Peak)</strong></p>
      <p>
        Players below their position's peak age represent value opportunities if priced fairly. A 22-year-old WR with a peak age of 27 has 5+ years of prime production ahead.
      </p>
      <p style="margin-top:16px"><strong>Peak Years</strong></p>
      <p>
        Elite value concentrates at peak age. These are your franchise cornerstones. Hold through peak years and reassess at decline phase.
      </p>
      <p style="margin-top:16px"><strong>Aging Assets (Post-Peak)</strong></p>
      <p>
        Once past peak age, value declines. Position matters: QB decline is gentle (still valuable at 35+), while RB/WR decline sharply after 30. Use decline rate to time sells.
      </p>
    </div>

    <div class="section">
      <h2>Related Research</h2>
      <p>Explore more FDP research:</p>
      <p style="margin-top:12px;font-size:13px">
        <a href="https://fantasydraftpros.com/research/">Research Hub</a> |
        <a href="https://fantasydraftpros.com/research/team-dynasty-capital/">Team Dynasty Capital</a> |
        <a href="https://fantasydraftpros.com/research/player-tiers/">Player Tier Analysis</a> |
        <a href="https://fantasydraftpros.com/dynasty-rankings/">Full Rankings</a>
      </p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
