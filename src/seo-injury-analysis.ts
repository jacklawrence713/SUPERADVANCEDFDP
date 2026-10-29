/**
 * Injury Risk Assessment & Analysis
 * Player injury history and risk indicators
 */

export function generateInjuryAnalysisHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Injury Risk Assessment | Dynasty Player Health Analysis | Fantasy Draft Pros</title>
  <meta name="description" content="Assess injury risk for dynasty players. Understand injury history patterns, recovery timelines, and durability impact on dynasty value.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/analysis/injury-risk/">
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 12px; color: #fff; }
    .section { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .section h2 { font-size: 20px; color: #7c4dff; margin-bottom: 16px; }
    .section p { font-size: 13px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .risk-box { background: #2a2a35; border-left: 3px solid #7c4dff; padding: 12px 16px; border-radius: 4px; margin: 12px 0; }
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Injury Risk Assessment</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Evaluate player durability and injury risk for dynasty decision-making</p>

    <div class="section">
      <h2>Injury History Analysis</h2>
      <p>Track player injury frequency and severity. Single ACL tear is different from recurring soft tissue injuries. Recent injuries carry more weight than historical ones.</p>
      
      <div class="risk-box">
        <strong>High Risk Indicators:</strong>
        <p style="font-size: 12px; color: #9b96b8; margin-top: 4px;">Recurrent injuries, recent injuries, multiple injury types, lengthy recovery, missed games in current season.</p>
      </div>

      <div class="risk-box">
        <strong>Low Risk Indicators:</strong>
        <p style="font-size: 12px; color: #9b96b8; margin-top: 4px;">One-time injuries years ago, successful return to form, clean current health, full games played.</p>
      </div>
    </div>

    <div class="section">
      <h2>Durability Impact on Value</h2>
      <p>Dynasty values should discount injury-prone players. A 23-year-old with recurring soft tissue injuries is worth less than an equally-producing 27-year-old with clean health. Durability is a dynasty asset.</p>
    </div>

    <div class="section">
      <h2>Recovery Timeline Expectations</h2>
      <ul style="margin-left: 20px; font-size: 13px; color: #9b96b8; line-height: 1.8;">
        <li><strong>Soft Tissue (hamstring, calf):</strong> 2-6 weeks typical</li>
        <li><strong>Ankle Sprain:</strong> 1-4 weeks depending on grade</li>
        <li><strong>ACL Tear:</strong> 9-12 months, significant uncertainty on return form</li>
        <li><strong>MCL Sprain:</strong> 2-8 weeks depending on severity</li>
        <li><strong>Concussion:</strong> Variable, depends on protocol and individual recovery</li>
      </ul>
    </div>

    <div class="section">
      <h2>Dynasty Durability Premium</h2>
      <p>Healthy players command premium in dynasty. A durable, consistent player often outperforms higher-ceiling injury-prone peers. Value consistency and health in long-term decisions.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
