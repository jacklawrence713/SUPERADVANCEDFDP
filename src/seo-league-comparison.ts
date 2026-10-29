/**
 * League Type Comparison & Format Guide
 * Compare keeper, dynasty, best ball, and redraft
 */

export function generateLeagueComparisonHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>League Type Comparison | Keeper vs Dynasty vs Best Ball | Fantasy Draft Pros</title>
  <meta name="description" content="Compare fantasy league types. Understand keeper, dynasty, best ball, and redraft formats and which suits your league.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/guides/league-comparison/">
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 12px; color: #fff; }
    .comparison { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 16px 0; }
    .comp-card { background: #2a2a35; border-left: 3px solid #7c4dff; padding: 16px; border-radius: 4px; }
    .comp-label { font-weight: 700; color: #fff; margin-bottom: 8px; }
    .comp-text { font-size: 12px; color: #9b96b8; }
    .section { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .section h2 { font-size: 20px; color: #7c4dff; margin-bottom: 16px; }
    .section p { font-size: 13px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Fantasy League Type Comparison</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Understand keeper, dynasty, best ball, and redraft formats</p>

    <div class="section">
      <h2>Format Comparison Matrix</h2>
      <div class="comparison">
        <div class="comp-card">
          <div class="comp-label">Redraft</div>
          <div class="comp-text">Annual reset. No keepers. Pure draft skill. Fastest pace, least planning required.</div>
        </div>
        <div class="comp-card">
          <div class="comp-label">Keeper (1-4)</div>
          <div class="comp-text">Keep limited players. Annual draft core. Hybrid approach. Medium complexity.</div>
        </div>
        <div class="comp-card">
          <div class="comp-label">Dynasty</div>
          <div class="comp-text">Unlimited keepers. Long-term planning. Highest complexity. Multi-year strategy required.</div>
        </div>
        <div class="comp-card">
          <div class="comp-label">Best Ball</div>
          <div class="comp-text">Auto-start optimal lineup. No weekly decisions. Pure draft strategy. Least management.</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Which Format For You?</h2>
      <p><strong>Redraft:</strong> Casual leagues wanting annual resets. Time-constrained players. New participants.</p>
      <p style="margin-top: 12px;"><strong>Keeper:</strong> Experienced players wanting multi-year elements. Balance between redraft and dynasty.</p>
      <p style="margin-top: 12px;"><strong>Dynasty:</strong> Serious enthusiasts. Long-term commitment. Complex strategy enjoyment. Deep player knowledge.</p>
      <p style="margin-top: 12px;"><strong>Best Ball:</strong> Draft enthusiasts without time for weekly decisions. Pure skill assessment wanted.</p>
    </div>

    <div class="section">
      <h2>Strategy Differences</h2>
      <p>Each format requires different approaches. Redraft values immediate production. Dynasty values youth and long-term arcs. Keeper balances both. Best Ball rewards depth and consistency.</p>
      <p style="margin-top: 12px;">Use <a href="https://fantasydraftpros.com/dynasty-rankings/">FDP Rankings</a> customized for your format to maximize strategic advantage.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
