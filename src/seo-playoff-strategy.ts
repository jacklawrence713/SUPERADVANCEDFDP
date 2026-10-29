/**
 * Playoff Performance & Consistency Analysis
 * Understanding playoff vs regular season performance
 */

export function generatePlayoffStrategyHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playoff Strategy | Consistency Analysis | Fantasy Draft Pros</title>
  <meta name="description" content="Playoff strategy guide. Understand playoff performance patterns, consistency metrics, and championship timing.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/analysis/playoff-performance/">
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
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Playoff Performance & Strategy</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Playoff consistency analysis and championship timing</p>

    <div class="section">
      <h2>Consistency Matters in Playoffs</h2>
      <p>Playoff games have no flexibility. You start whoever is healthy. Consistent players (high floor) outvalue boom/bust (high ceiling) in playoffs.</p>
      <p style="margin-top: 12px;">A WR with 12 PPR floor and 18 PPR ceiling beats a WR with 6 PPR floor and 25 PPR ceiling in playoffs.</p>
    </div>

    <div class="section">
      <h2>Playoff Performance Patterns</h2>
      
      <h3>Regular Season Over/Under Performers</h3>
      <p>Some players regress in playoffs (tougher defenses). Some elevate (big-game performers). Identify which type you roster.</p>

      <h3>Playoff Schedule Advantage</h3>
      <p>Teams facing weak playoff defenses have playoff value boost. Playoff matchups matter more than regular season trends.</p>

      <h3>Injury Concern</h3>
      <p>Playoff injuries more damaging (no waiver replacements). Durability premium in playoffs.</p>
    </div>

    <div class="section">
      <h2>Playoff Preparation</h2>
      <ul>
        <li>Identify your starting lineup 2-3 weeks before playoffs (avoid last-minute surprises)</li>
        <li>Monitor playoff schedule for bye weeks and matchups</li>
        <li>Stock backup at injury-prone positions</li>
        <li>Trade for playoff upgrades before deadline</li>
      </ul>
    </div>

    <div class="section">
      <h2>Mid-Season Playoff Positioning</h2>
      <p>Starting week 5-6, draft decisions shift from regular season value to playoff utility. Flexibility becomes premium.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
