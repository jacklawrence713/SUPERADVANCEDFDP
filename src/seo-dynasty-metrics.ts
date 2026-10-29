/**
 * Dynasty Metrics & Advanced Statistics
 * Statistical analysis for dynasty strategy
 */

export function generateDynastyMetricsHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dynasty Metrics | Advanced Statistical Analysis | Fantasy Draft Pros</title>
  <meta name="description" content="Dynasty fantasy metrics and advanced statistics. Understand volume metrics, efficiency stats, and predictive indicators.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/analysis/dynasty-metrics/">
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
    <h1>Dynasty Metrics & Statistics</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Advanced statistics for dynasty decision-making</p>

    <div class="section">
      <h2>Volume Metrics</h2>
      
      <h3>Snap Count Percentage</h3>
      <p>Percentage of snaps played. Higher snap % = job security and opportunity. Monitor snap % trends for role changes.</p>

      <h3>Target Share</h3>
      <p>Percentage of team passing targets. Rising target share indicates increased importance. Falling share suggests reduced role.</p>

      <h3>Red Zone Touches</h3>
      <p>Goal-line opportunity metric. Key predictor of TD upside. Track red zone carry/target trends year-over-year.</p>

      <h3>Air Yards (WR)</h3>
      <p>Intended air yards per target. Higher depth of target (more air yards) = bigger plays. Compare to aDOT (average depth of target).</p>
    </div>

    <div class="section">
      <h2>Efficiency Metrics</h2>
      <ul>
        <li><strong>Yards Per Touch:</strong> Production per opportunity. Higher YPT = elite efficiency.</li>
        <li><strong>Yards Per Target:</strong> WR efficiency. Elite: 1.5+ per target.</li>
        <li><strong>TD:Carry Ratio:</strong> Touchdown efficiency. RBs: 1 TD per 10 carries is elite baseline.</li>
        <li><strong>Breakaway Rate:</strong> Percentage of long plays (20+ yards). Indicates big-play ability.</li>
      </ul>
    </div>

    <div class="section">
      <h2>Predictive Metrics</h2>
      <p>Volume metrics predict future performance better than past production. Rising snap % and target share indicate upcoming breakouts. Falling metrics signal decline ahead.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
