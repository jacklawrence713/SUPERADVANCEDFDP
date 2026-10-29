/**
 * Rookie Scale Contracts & Economics
 * Understanding rookie contract value and constraints
 */

export function generateRookieContractsHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rookie Scale Contracts | Contract Economics | Fantasy Draft Pros</title>
  <meta name="description" content="Rookie contract guide. Understand rookie scale contracts, extension economics, and rookie cap management.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/strategy/rookie-contracts/">
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
    <h1>Rookie Scale Contracts</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Understand rookie contract economics and cap advantages</p>

    <div class="section">
      <h2>Rookie Scale Basics</h2>
      <p>Rookie contracts are salary-capped determined by draft slot. 1st overall pick has highest cap hit (typically $35-40M). Late picks have minimal cap hit ($700K-1M).</p>
      <p style="margin-top: 12px;"><strong>Cap Advantage:</strong> Rookie year contracts are extremely underpriced relative to performance for stars. A 1st overall QB on rookie deal is massive cap gain.</p>
    </div>

    <div class="section">
      <h2>Draft Slot Economics</h2>
      
      <h3>1st Rounders</h3>
      <p>Expensive cap hit. Need star performance to justify. 5th year option decision at year 4.</p>

      <h3>2nd Rounders</h3>
      <p>Moderate cap hit. Good value window if productive. Breakout candidates have massive cap gain.</p>

      <h3>3rd-5th Rounders</h3>
      <p>Minimal cap cost. Huge upside value if productive. Late round picks outperforming draft capital = best cap value.</p>
    </div>

    <div class="section">
      <h2>Extension Decisions</h2>
      <p>Year 4, 5th year option decision. Re-sign star before market inflation or use franchise tag. Decision point critical.</p>
      <p style="margin-top: 12px;"><strong>Strategy:</strong> Lock in breakout rookies before extension. Late-round picks who became stars have best extension value—sign long-term at reasonable rates before market realizes value.</p>
    </div>

    <div class="section">
      <h2>Rookie Contract Trading</h2>
      <p>Underperforming 1st rounders tradeable at discount (cap hit burden). Breakout late-rounders have peak trade value during contract year (cheap cap + proven production).</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
