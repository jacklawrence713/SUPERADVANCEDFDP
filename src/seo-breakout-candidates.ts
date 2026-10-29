/**
 * Breakout Candidates & Rising Stars
 * Identifying players poised for fantasy relevance
 */

export function generateBreakoutCandidatesHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Breakout Candidates | Rising Fantasy Stars | Fantasy Draft Pros</title>
  <meta name="description" content="Identify breakout candidates in dynasty. Discover rising stars with upside, role expansion, and increased opportunity.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/analysis/breakout-candidates/">
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
    <h1>Breakout Candidates</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Identify rising stars and opportunities for dynasty gains</p>

    <div class="section">
      <h2>Breakout Indicators</h2>
      
      <h3>Role Expansion</h3>
      <p>Increasing snap count, target share, or red zone touches. Clear opportunity increase signals imminent production growth.</p>

      <h3>Youth + Upside</h3>
      <p>Players under 26 with late-bloomer patterns. Historical data shows year 2-4 breakouts common for certain archetypes.</p>

      <h3>Opportunity Change</h3>
      <p>New team, veteran retirement, injury to starter. Vacated opportunity is breakout catalyst. Target players inheriting roles.</p>

      <h3>Efficiency Trending Up</h3>
      <p>Improving yards per touch, efficiency metrics, TD production. Production trending up despite low volume indicates breakout imminent.</p>
    </div>

    <div class="section">
      <h2>Breakout by Position</h2>
      
      <h3>RB Breakouts</h3>
      <p>Usually require major opportunity (lead back role). Target 2nd-year or youth with clear path to carries. Volume drives RB breakouts.</p>

      <h3>WR Breakouts</h3>
      <p>Route tree expansion and target share growth. Year 2-3 breakouts common. Target players with increasing air yards and snap %. Chemistry with QB develops over time.</p>

      <h3>TE Breakouts</h3>
      <p>Longest development arc. Blocking skills develop, red zone targets increase years 2-4. Patience rewarded.</p>
    </div>

    <div class="section">
      <h2>Breakout vs Flash in Pan</h2>
      <p>Distinguish sustained breakouts from one-week explosions. Track volume over multiple weeks. Real breakouts show volume increases alongside production. Flash performances lack volume foundation.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
