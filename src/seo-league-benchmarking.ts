/**
 * League Benchmarking & Comparison Analysis
 * Compare your league to league averages and standards
 */

export function generateLeagueBenchmarkingHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>League Benchmarking | Compare Your League | Fantasy Draft Pros</title>
  <meta name="description" content="Compare your fantasy league to benchmarks. Understand average draft positions, roster construction, and league competitiveness metrics.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/analysis/league-benchmarking/">
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 12px; color: #fff; }
    .section { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .section h2 { font-size: 20px; color: #7c4dff; margin-bottom: 16px; }
    .section p { font-size: 13px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .metric { background: #2a2a35; border-left: 3px solid #7c4dff; padding: 12px 16px; border-radius: 4px; margin: 12px 0; }
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>League Benchmarking Guide</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Compare your league to industry standards and benchmarks</p>

    <div class="section">
      <h2>Key Benchmarking Metrics</h2>
      
      <div class="metric">
        <strong>Average Draft Position (ADP)</strong>
        <p style="font-size: 12px; color: #9b96b8; margin-top: 4px;">Compare your league's draft ADP to industry consensus. Identifies where your league values players differently.</p>
      </div>

      <div class="metric">
        <strong>Positional Spending</strong>
        <p style="font-size: 12px; color: #9b96b8; margin-top: 4px;">How much budget/picks go to each position? More RB spending = RB-heavy league. Adjust your strategy accordingly.</p>
      </div>

      <div class="metric">
        <strong>Roster Construction Standards</strong>
        <p style="font-size: 12px; color: #9b96b8; margin-top: 4px;">Typical roster composition. Do teams roster 3 QBs or 1? Aggressive TE stacking? Identifies league norms.</p>
      </div>

      <div class="metric">
        <strong>Trade Frequency</strong>
        <p style="font-size: 12px; color: #9b96b8; margin-top: 4px;">How many trades occur? Active trading leagues are more competitive and dynamic. Affects strategy.</p>
      </div>
    </div>

    <div class="section">
      <h2>Using Benchmarks for Advantage</h2>
      <p>If your league spends heavily on RBs but undervalues WRs, target WRs earlier. If TE is ignored, grab elite TE in middle rounds.</p>
      <p style="margin-top: 12px;">Understanding league tendencies gives you a competitive edge in player value perception and timing.</p>
    </div>

    <div class="section">
      <h2>Competitive Assessment</h2>
      <p>League benchmarks reveal competitiveness level. Highly structured leagues with minimal variance are more competitive. Chaos leagues with wild ADP swings are less predictable but offer arbitrage.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
