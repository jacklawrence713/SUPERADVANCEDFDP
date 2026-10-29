/**
 * Player Development Arcs & Career Trajectories
 * Analysis of player career paths and development patterns
 */

export function generatePlayerDevelopmentHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Player Development Arcs | Career Trajectory Analysis | Fantasy Draft Pros</title>
  <meta name="description" content="Analyze player development arcs and career trajectories. Understand growth patterns and predict future performance based on historical data.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/analysis/player-development/">
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
    .arc-pattern { background: #2a2a35; border-left: 3px solid #7c4dff; padding: 12px 16px; border-radius: 4px; margin: 12px 0; }
    .pattern-name { font-weight: 700; color: #fff; }
    .pattern-desc { font-size: 12px; color: #9b96b8; margin-top: 4px; }
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Player Development Arcs</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Understand career trajectory patterns and predict future player performance</p>

    <div class="section">
      <h2>Development Arc Patterns</h2>
      
      <div class="arc-pattern">
        <div class="pattern-name">Early Bloomer</div>
        <div class="pattern-desc">Immediate production as rookie/year 1. Follows normal age curve. Most common. Example: elite rookie seasons.</div>
      </div>

      <div class="arc-pattern">
        <div class="pattern-name">Late Bloomer</div>
        <div class="pattern-desc">Breakout in years 2-4 after role development. Higher upside remaining. Value accumulation play.</div>
      </div>

      <div class="arc-pattern">
        <div class="pattern-name">Plateau</div>
        <div class="pattern-desc">Early success followed by stagnation. Workload declines or role changes. Sell signal.</div>
      </div>

      <div class="arc-pattern">
        <div class="pattern-name">Decline</div>
        <div class="pattern-desc">Downward trajectory despite tenure. Injury, competition, age effect. Exit opportunity.</div>
      </div>
    </div>

    <div class="section">
      <h2>Position-Specific Development Patterns</h2>
      
      <h3>Running Backs</h3>
      <p>Peak years 2-5. Heavy reliance on opportunity. Late bloomers need clear path to volume. Decline sharp post-age-30.</p>

      <h3>Wide Receivers</h3>
      <p>Peak years 3-7. Longer career arcs. Route running improves with experience. Decline gradual post-age-32.</p>

      <h3>Tight Ends</h3>
      <p>Longest development window. Peak years 4-9. Often bloom late due to blocking role growth. Career longevity high.</p>

      <h3>Quarterbacks</h3>
      <p>System-dependent. Some peak early (year 2), others years 4-6. Plateau common. Decline manageable until mid-30s.</p>
    </div>

    <div class="section">
      <h2>Identifying Development Stage</h2>
      <ul style="margin-left: 20px; font-size: 13px; color: #9b96b8; line-height: 1.8;">
        <li>Track year-over-year production trends</li>
        <li>Evaluate opportunity changes (role growth, team changes)</li>
        <li>Monitor snap count and usage percentage</li>
        <li>Adjust for injury/recovery years</li>
        <li>Consider coaching/scheme fit</li>
      </ul>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
