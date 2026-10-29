/**
 * Scoring Formats & PPR Impact Analysis
 * PPR vs Half-PPR vs Standard scoring impact
 */

export function generateScoringFormatsHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scoring Formats | PPR vs Half-PPR vs Standard | Fantasy Draft Pros</title>
  <meta name="description" content="Compare fantasy football scoring formats. Understand PPR vs Half-PPR vs Standard scoring impact on player values and strategy.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/guides/scoring-formats/">
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 12px; color: #fff; }
    .section { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .section h2 { font-size: 20px; color: #7c4dff; margin-bottom: 16px; }
    .section p { font-size: 13px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .format-box { background: #2a2a35; border-left: 3px solid #7c4dff; padding: 12px 16px; border-radius: 4px; margin: 12px 0; }
    .format-title { font-weight: 700; color: #fff; }
    .format-desc { font-size: 12px; color: #9b96b8; margin-top: 4px; }
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Scoring Formats & Impact Analysis</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Understand how PPR, Half-PPR, and Standard scoring change player values and strategy</p>

    <div class="section">
      <h2>PPR (Points Per Reception)</h2>
      <div class="format-box">
        <div class="format-title">Scoring: 1 point per catch</div>
        <div class="format-desc">Most common scoring format. Slot receivers and pass-catching RBs get significant value boost. Increases positional scarcity.</div>
      </div>
      <p style="margin-top: 12px;"><strong>Strategy Impact:</strong> Pass-catchers become premium. Slot WRs valued higher. Pass-catching RBs (pass game specialists) more valuable. TE scarcity increases.</p>
    </div>

    <div class="section">
      <h2>Half-PPR (0.5 points per reception)</h2>
      <div class="format-box">
        <div class="format-title">Scoring: 0.5 points per catch</div>
        <div class="format-desc">Middle ground between PPR and Standard. Balanced scoring rewarding both receptions and rushing yards.</div>
      </div>
      <p style="margin-top: 12px;"><strong>Strategy Impact:</strong> More balanced value distribution. Volume still matters but touchdown upside valued higher. RBs vs WRs more competitive.</p>
    </div>

    <div class="section">
      <h2>Standard (Non-PPR)</h2>
      <div class="format-box">
        <div class="format-title">Scoring: Touchdowns and yards only</div>
        <div class="format-desc">Traditional scoring format. Touchdown dependency is high. Big-play potential rewarded over volume.</div>
      </div>
      <p style="margin-top: 12px;"><strong>Strategy Impact:</strong> Red-zone priority increases. Rushing volume more valuable than receiving volume. Touchdown upside dominant. TE value decreases.</p>
    </div>

    <div class="section">
      <h2>Position Value Changes by Format</h2>
      <p><strong>PPR Impact:</strong> RB (↑ pass-catchers), WR (→ stable), TE (↑ significant), QB (→ stable)</p>
      <p style="margin-top: 8px;"><strong>Half-PPR Impact:</strong> RB (↑ slight), WR (→ stable), TE (↑ moderate), QB (→ stable)</p>
      <p style="margin-top: 8px;"><strong>Standard Impact:</strong> RB (→ stable), WR (↓ slight), TE (↓ significant), QB (→ stable)</p>
    </div>

    <div class="section">
      <h2>Scoring Format Strategy</h2>
      <p>Always adjust your draft strategy to your league's scoring. PPR emphasizes slot players. Standard emphasizes workload. Half-PPR balances both.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
