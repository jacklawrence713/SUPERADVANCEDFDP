/**
 * Mid-Season Analysis & Adjustments
 * Halfway point evaluations and roster changes
 */

export function generateMidSeasonAdjustmentsHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mid-Season Analysis | Halfway Point Adjustments | Fantasy Draft Pros</title>
  <meta name="description" content="Mid-season analysis guide. Evaluate halfway point performance, make roster adjustments, and pivot strategy.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/analysis/mid-season-adjustments/">
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
    <h1>Mid-Season Analysis & Adjustments</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Halfway point evaluation and roster strategy adjustment</p>

    <div class="section">
      <h2>Halfway Point Evaluation</h2>
      
      <h3>Sample Size Now Meaningful</h3>
      <p>8 weeks of data meaningful for trend identification. Outliers likely regression targets. Breakouts likely sustainable with increased opportunity.</p>

      <h3>Injuries Visible</h3>
      <p>Durability concerns emerging. Injury-prone players showing pattern. Durability advantage players reaching peak value.</p>

      <h3>Role Changes Finalized</h3>
      <p>Offense snap counts stabilized. Role clarity established. Promotion/demotion trends visible. Opportunity now predictable.</p>
    </div>

    <div class="section">
      <h2>Midseason Pivots</h2>
      
      <h3>From Contention to Rebuild</h3>
      <p>If below .500 at halfway, evaluate rebuild vs contention push. Early pivot to rebuild maximizes asset return before deadline.</p>

      <h3>From Rebuild to Surprise Contention</h3>
      <p>Unexpected strong start. Evaluate if sustainable or mirage. If genuine contention, add pieces at deadline.</p>

      <h3>Injury-Driven Changes</h3>
      <p>Star player injury changes championship calculus. Evaluate whether to push or rebuild around replacement.</p>
    </div>

    <div class="section">
      <h2>Roster Adjustment Targets</h2>
      <ul>
        <li>Underperformers (sell high before regression worse)</li>
        <li>Breakout performers (buy if legitimately improved)</li>
        <li>Injury replacements (upgrade depth after injuries)</li>
        <li>Aging stars (time to trade before further decline)</li>
      </ul>
    </div>

    <div class="section">
      <h2>Second-Half Strategy</h2>
      <p>Adjust expectations based on halfway performance. Contenders focus on impact additions. Rebuilds stockpile. Keep flexibility for deadline.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
