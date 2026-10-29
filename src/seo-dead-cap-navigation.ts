/**
 * Dead Cap Navigation & Cap Penalties
 * Managing dead cap and navigating salary cap restrictions
 */

export function generateDeadCapNavigationHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dead Cap Navigation | Salary Cap Penalties | Fantasy Draft Pros</title>
  <meta name="description" content="Master dead cap management and salary cap navigation in dynasty leagues. Learn cap penalties, trade implications, and strategic cap planning to avoid dead cap pitfalls.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/strategy/dead-cap-navigation/">
  <script type="application/ld+json">{"@context": "https://schema.org", "@type": "Article", "headline": "Dead Cap Navigation Strategy"}</script>
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
    <h1>Dead Cap Navigation</h1>
    <p class="subtitle">Navigate salary cap penalties and avoid dead cap pitfalls</p>

    <div class="section">
      <h2>Understanding Dead Cap</h2>
      <p>Dead cap is salary owed to players no longer on your roster. Common causes: cuts, trades, restructures. Dead cap counts against your salary cap but provides no player value.</p>
      <div class="box">
        <h3>How Dead Cap Occurs</h3>
        <ul>
          <li><strong>Cutting players:</strong> Signing bonuses count as dead cap in year of cut</li>
          <li><strong>Failed trades:</strong> If traded player fails physically, cap hit may return</li>
          <li><strong>Restructures gone wrong:</strong> Converting salary to bonus creates future dead cap</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Types of Dead Cap</h2>
      <div class="box">
        <h3>Immediate Dead Cap</h3>
        <ul>
          <li>Signing bonus remaining when player is cut (immediate cap hit)</li>
          <li>Example: Cut player with $2M signing bonus, $1M already counted = $1M dead cap</li>
          <li>Impact: Limits cap flexibility in year of cut</li>
        </ul>
      </div>
      <div class="box">
        <h3>Future Dead Cap</h3>
        <ul>
          <li>Dead cap spread across future years (less painful than immediate)</li>
          <li>Example: 5-year deal cut in year 2 with $500k/year remaining = $2M future dead cap</li>
          <li>Impact: Limits future cap space (multi-year burden)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Avoiding Dead Cap</h2>
      <div class="box">
        <h3>Contract Structure</h3>
        <ul>
          <li>Minimize signing bonuses on risky players (injury, performance uncertainty)</li>
          <li>Use incentives instead (player must perform to earn money)</li>
          <li>Keep short-term deals (easier to exit without dead cap)</li>
        </ul>
      </div>
      <div class="box">
        <h3>Roster Decisions</h3>
        <ul>
          <li>Don't cut players with large signing bonuses (avoid dead cap)</li>
          <li>Trade underperformers instead (move dead cap to other team)</li>
          <li>Plan exits early (rework contracts before deadline)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Dead Cap Trade Strategy</h2>
      <div class="box">
        <h3>Moving Dead Cap</h3>
        <ul>
          <li>Include dead cap in trades (other team assumes cap hit)</li>
          <li>Offer incentives to buyer: Reduce draft picks, add prospects, sweeten deal</li>
          <li>Target rebuilding teams with extra cap space (willing to absorb dead cap)</li>
        </ul>
      </div>
      <div class="box">
        <h3>Timing</h3>
        <ul>
          <li>Trade underperforming stars before they become dead cap risks</li>
          <li>Mid-season trades: Other teams may absorb cap hits to make playoffs</li>
          <li>Offseason trades: Most favorable terms (buyers planning ahead)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Rebuilding with Cap Space</h2>
      <ul>
        <li>Reset by shedding high-dead-cap players (clear cap space)</li>
        <li>Absorb dead cap strategically (take on cap hits for extra picks)</li>
        <li>Target teams with aging rosters (willing to trade dead cap for youth)</li>
      </ul>
    </div>

    <div class="section">
      <h2>Multi-Year Cap Planning</h2>
      <div class="box">
        <h3>Monitor Cap Projection</h3>
        <ul>
          <li>Year 1: Immediate dead cap (low impact if managed)</li>
          <li>Year 2-3: Staggered dead cap (future planning needed)</li>
          <li>Year 4+: Long-term dead cap (major constraint on future flexibility)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Common Dead Cap Mistakes</h2>
      <ul>
        <li>Cutting players with large signing bonuses (preventable dead cap)</li>
        <li>Not monitoring dead cap accumulation (builds up unnoticed)</li>
        <li>Signing aging players to long deals with large bonuses (high dead cap risk)</li>
        <li>Restructuring without exit plan (pushes dead cap into future)</li>
      </ul>
    </div>

    <div class="section">
      <h2>Use FDP Values for Cap Strategy</h2>
      <p>Compare player value against cap costs using our <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">trade calculator</a>. Identify overpaid players and plan cap management strategies to avoid dead cap pitfalls.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
