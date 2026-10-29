/**
 * Boom-Bust Management & Volatility
 * Managing high-variance players and production volatility
 */

export function generateBoomBustManagementHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boom-Bust Management | Volatility Strategy | Fantasy Draft Pros</title>
  <meta name="description" content="Master boom-bust management in dynasty leagues. Learn to manage high-variance players, understand volatility patterns, and balance risk in your roster.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/strategy/boom-bust-management/">
  <script type="application/ld+json">{"@context": "https://schema.org", "@type": "Article", "headline": "Boom-Bust Management Strategy"}</script>
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
    <h1>Boom-Bust Management</h1>
    <p class="subtitle">Navigate high-variance players and weekly volatility in dynasty leagues</p>

    <div class="section">
      <h2>Understanding Boom-Bust Players</h2>
      <p>Some players are volatile—wildly inconsistent week-to-week production. Boom-bust players have high ceiling but low floor, creating roster unpredictability.</p>
      <div class="box">
        <h3>Common Boom-Bust Profiles</h3>
        <ul>
          <li><strong>Deep Threats:</strong> WRs dependent on big plays (20+ yard catches) for volume</li>
          <li><strong>Backup RBs:</strong> Timeshare backs getting 5-10 carries/week (low consistency)</li>
          <li><strong>TE Dependent:</strong> TEs in pass-heavy offense with target dependency</li>
          <li><strong>Game Script Dependent:</strong> Players whose role changes with game flow (comebacks, blowouts)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Identifying Boom-Bust Risk</h2>
      <div class="box">
        <h3>Red Flags</h3>
        <ul>
          <li>Wide variance in weekly points (10 points vs. 25 points consistently)</li>
          <li>High target/carry share with low yardage consistency (volume doesn't translate)</li>
          <li>Role dependent on backup QB or unproven offensive line</li>
          <li>Performance heavily game-script dependent (success tied to trailing/winning margins)</li>
        </ul>
      </div>
      <div class="box">
        <h3>Green Flags (Reduced Boom-Bust)</h3>
        <ul>
          <li>Consistent target/carry share week-to-week</li>
          <li>Reliable role (starter, clear backup plan, frequent plays)</li>
          <li>Healthy offense with multiple scoring options (doesn't rely on one play type)</li>
          <li>Performance stable across game scripts (produces in wins and losses)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Managing Boom-Bust in Your Roster</h2>
      <ul>
        <li><strong>Balance:</strong> Don't stack too many boom-bust players (limits ceiling)</li>
        <li><strong>Reduce exposure:</strong> Pair boom-bust WRs with high-floor RBs for consistency</li>
        <li><strong>Bench depth:</strong> Use boom-bust players as flex options, not mandatory starters</li>
        <li><strong>Trade strategically:</strong> Sell boom-bust after ceiling games (peak value trading moment)</li>
      </ul>
    </div>

    <div class="section">
      <h2>Boom-Bust Trading Tactics</h2>
      <div class="box">
        <h3>Selling Boom-Bust</h3>
        <ul>
          <li>After boom games: 25+ point weeks create perception of reliability (sell high)</li>
          <li>Trade to teams needing ceiling (rebuilds, playoff teams taking shots)</li>
          <li>Package with high-floor depth (make trade attractive despite volatility)</li>
        </ul>
      </div>
      <div class="box">
        <h3>Buying Boom-Bust</h3>
        <ul>
          <li>After bust games: Discounted value despite talent (buy low)</li>
          <li>Pair with proven depth to stabilize overall output</li>
          <li>Accept volatility as trade-off for upside potential</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Boom-Bust Strategy for Different Contexts</h2>
      <div class="box">
        <h3>Contending Teams</h3>
        <p>Minimize boom-bust exposure (consistency matters in playoff weeks). Use for depth/flex, not mandatory starters.</p>
      </div>
      <div class="box">
        <h3>Rebuilding Teams</h3>
        <p>Can afford boom-bust risk (ceiling matters more than floor). Use to maximize upside during rebuild window.</p>
      </div>
    </div>

    <div class="section">
      <h2>Use FDP Values to Manage Volatility</h2>
      <p>Use our <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">trade calculator</a> to evaluate boom-bust trades. Volatile players should trade at discounts relative to consistent peers—understand the volatility tax.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
