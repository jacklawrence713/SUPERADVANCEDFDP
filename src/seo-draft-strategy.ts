/**
 * Dynasty Draft Strategy Guides
 * Comprehensive guides for draft strategy by position and round
 */

export function generateDraftStrategyHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dynasty Draft Strategy Guide | Position-by-Position Planning | Fantasy Draft Pros</title>
  <meta name="description" content="Complete dynasty draft strategy guide. Learn how to approach each round, draft by position, value peaks, and startup draft tactics.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/guides/dynasty-draft-strategy/">
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 12px; color: #fff; }
    .subtitle { font-size: 16px; color: #9b96b8; margin-bottom: 24px; }
    .section { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .section h2 { font-size: 20px; color: #7c4dff; margin-bottom: 16px; }
    .section p { font-size: 13px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .section ul { margin-left: 20px; font-size: 13px; color: #9b96b8; line-height: 1.8; }
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Dynasty Draft Strategy</h1>
    <p class="subtitle">Complete guide to startup draft planning and strategy</p>

    <div class="section">
      <h2>Early Rounds (1-4): Build Your Foundation</h2>
      <p>Focus on securing the top dynasty assets. Positions: Elite QB, Elite RB, Elite WR, Premier TE. These players will anchor your contention window.</p>
      <ul>
        <li><strong>Round 1:</strong> Target top-3 RBs or WRs with long careers ahead</li>
        <li><strong>Round 2:</strong> Balance with opposing position or top QB in Superflex</li>
        <li><strong>Round 3-4:</strong> Add depth at premium positions</li>
      </ul>
    </div>

    <div class="section">
      <h2>Middle Rounds (5-8): Depth & Balance</h2>
      <p>Build positional depth and address weaknesses. Mix proven producers with upside prospects. This is where league depth separates contenders.</p>
      <ul>
        <li>Add second-tier starters at each position</li>
        <li>Consider future value (young players trending up)</li>
        <li>Balance proven production with upside</li>
      </ul>
    </div>

    <div class="section">
      <h2>Late Rounds (9+): Prospects & Upside</h2>
      <p>Shift focus to upside potential and youth. These picks often determine your multi-year trajectory. Prioritize young players with breakout potential.</p>
      <ul>
        <li>Draft high-upside receivers and runners</li>
        <li>Target previous draft capital holders</li>
        <li>Speculate on athletic upside</li>
      </ul>
    </div>

    <div class="section">
      <h2>Key Strategy Principles</h2>
      <ul>
        <li><strong>Value vs Need:</strong> Always take best available over positional need</li>
        <li><strong>Age Curve:</strong> Understand when each position peaks</li>
        <li><strong>Positional Scarcity:</strong> Some positions have fewer elite options</li>
        <li><strong>League Tendencies:</strong> Adjust based on league draft patterns</li>
        <li><strong>Flexibility:</strong> Build a flexible roster for future trading</li>
      </ul>
    </div>

    <div class="section">
      <h2>Use FDP Rankings</h2>
      <p>Our <a href="https://fantasydraftpros.com/dynasty-rankings/">dynasty rankings</a> are optimized for draft strategy. Use position-specific rankings to plan your approach.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
