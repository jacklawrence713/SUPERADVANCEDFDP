/**
 * Portfolio Balance & Diversification
 * Managing roster composition and asset diversification
 */

export function generatePortfolioBalanceHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio Balance Strategy | Roster Diversification | Fantasy Draft Pros</title>
  <meta name="description" content="Master portfolio balance and diversification in dynasty leagues. Learn optimal roster composition, position balance, and diversification strategies.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/strategy/portfolio-balance/">
  <script type="application/ld+json">{"@context": "https://schema.org", "@type": "Article", "headline": "Portfolio Balance Strategy"}</script>
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 12px; color: #fff; }
    .subtitle { font-size: 16px; color: #9b96b8; margin-bottom: 24px; }
    .section { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .section h2 { font-size: 20px; color: #7c4dff; margin-bottom: 16px; }
    .section p { font-size: 13px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .box { background: #2a2a35; border-left: 3px solid #7c4dff; padding: 16px; margin: 16px 0; border-radius: 8px; }
    .box h3 { color: #7c4dff; margin-bottom: 8px; font-size: 14px; font-weight: 700; }
    ul { margin-left: 20px; font-size: 13px; color: #9b96b8; line-height: 1.8; }
    a { color: #7c4dff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Portfolio Balance Strategy</h1>
    <p class="subtitle">Diversify your roster across positions, ages, and team situations</p>

    <div class="section">
      <h2>Position Balance Framework</h2>
      <div class="box">
        <h3>Ideal Roster Composition (12-team league)</h3>
        <ul>
          <li><strong>RBs (4-5):</strong> Most important position; allocate 35-40% of dynasty value here</li>
          <li><strong>WRs (4-5):</strong> Deep position; allocate 35-40% of value, can go lighter than RBs</li>
          <li><strong>QBs (1-2):</strong> Position scarcity low; allocate 5-10% of value</li>
          <li><strong>TEs (1-2):</strong> Scarcity high; allocate 5-10% of value (elite TE > backup TE)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Age Diversification</h2>
      <div class="box">
        <h3>Balanced Age Portfolio</h3>
        <ul>
          <li><strong>Peak Age (27-30):</strong> 30-40% of value (proven stars, reliable production)</li>
          <li><strong>Rising Age (24-26):</strong> 30-40% of value (emerging stars, longer windows)</li>
          <li><strong>Young Age (21-23):</strong> 15-20% of value (prospect upside, breakout candidates)</li>
          <li><strong>Deep Youth (19-20):</strong> 5-10% of value (speculative lottery, minimal current value)</li>
        </ul>
      </div>
      <div class="box">
        <h3>Why Age Balance Matters</h3>
        <ul>
          <li>Too old: Roster peaks, then declines sharply (age cliff)</li>
          <li>Too young: No current production (not competitive)</li>
          <li>Balanced: Sustained contention window (3-5 years)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Situation Diversification</h2>
      <div class="box">
        <h3>Team Situation Mix</h3>
        <ul>
          <li><strong>Contenders (3-4):</strong> Stars in high-volume offenses (current production focus)</li>
          <li><strong>Competitors (3-4):</strong> Solid contributors with multi-year windows</li>
          <li><strong>Rebuilds (2-3):</strong> Young prospects with long runways (future focus)</li>
          <li><strong>Unclear (1-2):</strong> Situations to monitor (could breakout or bust)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Volatility Diversification</h2>
      <div class="box">
        <h3>Balancing Risk</h3>
        <ul>
          <li><strong>High-Floor (40-50%):</strong> Consistent production, proven track record</li>
          <li><strong>Mid-Range (30-40%):</strong> Good producers with some volatility</li>
          <li><strong>Ceiling Plays (10-20%):</strong> Boom-bust upside, lottery ticket exposure</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Portfolio Rebalancing During Season</h2>
      <ul>
        <li>Quarterly review: Check position balance, age distribution, situation mix</li>
        <li>Sell stars past peak: Trade aging assets for younger alternatives</li>
        <li>Acquire depth: Add consistency if too heavy on ceiling plays</li>
        <li>Shift for window: Shift balance toward proven depth if in contention window</li>
      </ul>
    </div>

    <div class="section">
      <h2>Portfolio Metrics</h2>
      <div class="box">
        <h3>Track These</h3>
        <ul>
          <li>Average roster age (target 25-26)</li>
          <li>RB:WR value ratio (target 1:1 to 1.2:1)</li>
          <li>Contender to rebuilder ratio in your roster</li>
          <li>Concentration in top-3 players (target 30-40% of total value)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Use FDP Values for Portfolio Analysis</h2>
      <p>Use our <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">trade calculator</a> to analyze your portfolio's value distribution. Identify concentration risks and opportunities to rebalance toward your contention window.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
