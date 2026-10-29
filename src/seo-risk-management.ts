/**
 * Risk Management & Portfolio Protection
 * Strategies for managing dynasty roster risk
 */

export function generateRiskManagementHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dynasty Risk Management | Portfolio Protection Strategy | Fantasy Draft Pros</title>
  <meta name="description" content="Dynasty risk management guide. Assess roster risk, implement downside protection, and hedge against uncertainty.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/strategy/risk-management/">
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 12px; color: #fff; }
    .section { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .section h2 { font-size: 20px; color: #7c4dff; margin-bottom: 16px; }
    .section h3 { font-size: 16px; color: #7c4dff; margin: 16px 0 8px; }
    .section p { font-size: 13px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .section ul { margin-left: 20px; font-size: 13px; color: #9b96b8; line-height: 1.8; }
    .risk-box { background: #2a2a35; border-left: 3px solid #7c4dff; padding: 12px 16px; border-radius: 4px; margin: 12px 0; }
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Dynasty Risk Management</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Manage portfolio risk and protect against uncertainty</p>

    <div class="section">
      <h2>Risk Assessment Framework</h2>
      
      <h3>Player Risk Categories</h3>
      <ul>
        <li><strong>Injury Risk:</strong> History, current health, recovery likelihood</li>
        <li><strong>Age Risk:</strong> Decline trajectory, remaining peak years</li>
        <li><strong>Role Risk:</strong> Job security, competition, role stability</li>
        <li><strong>Team Risk:</strong> Organizational changes, coaching turnover</li>
        <li><strong>Performance Risk:</strong> Consistency, floor/ceiling variance</li>
      </ul>

      <div class="risk-box">
        <strong>Risk Scoring:</strong> Rate each player 1-5 on each risk category. High-risk players should be discounted or hedged.
      </div>
    </div>

    <div class="section">
      <h2>Hedging Strategies</h2>
      
      <h3>Backup Insurance</h3>
      <p>Roster backups at key positions. If star RB gets injured, backup ready. Insurance costs little but protects against catastrophic loss.</p>

      <h3>Diversification</h3>
      <p>Don't concentrate all value in one team or position. Spread risk across franchise. Multiple contention windows reduce single-season dependency.</p>

      <h3>Age Distribution</h3>
      <p>Balance young and proven. All-young rosters face uncertainty. All-old rosters face cliff. Mixed age provides stability.</p>

      <h3>Trade Insurance</h3>
      <p>When trading for injury-prone players, demand discount. When selling injury-prone, maximize value while tradeable.</p>
    </div>

    <div class="section">
      <h2>Portfolio Risk Metrics</h2>
      <ul>
        <li><strong>Concentration Risk:</strong> Top 5 players % of total value</li>
        <li><strong>Age Risk:</strong> Roster average age vs optimal</li>
        <li><strong>Injury Risk:</strong> Cumulative durability concerns</li>
        <li><strong>Role Risk:</strong> Job security across roster</li>
      </ul>
    </div>

    <div class="section">
      <h2>Risk vs Reward</h2>
      <p>High-risk players offer upside. Don't eliminate risk entirely—managed risk creates value. Balance certainty with upside potential.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
