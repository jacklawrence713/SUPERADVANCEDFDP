/**
 * Player Comparison Pages
 * Head-to-head player matchup analysis for trade decision making
 */

export interface PlayerForComparison {
  name: string;
  pos: string;
  team: string;
  age: number;
  tradeVal: number;
  rank: number;
  slug: string;
}

export function generatePlayerComparisonHtml(
  player1: PlayerForComparison,
  player2: PlayerForComparison,
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  const valueDiff = Math.abs(player1.tradeVal - player2.tradeVal);
  const valueDiffPct = ((valueDiff / Math.max(player1.tradeVal, player2.tradeVal)) * 100).toFixed(1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${player1.name} vs ${player2.name} | Dynasty Trade Comparison | Fantasy Draft Pros</title>
  <meta name="description" content="Head-to-head comparison of ${player1.name} and ${player2.name}. Compare dynasty values and trading guidance.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/compare/${player1.slug}/${player2.slug}/">
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #fff; }
    .comparison-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
    .player-card { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 20px; }
    .player-card h2 { font-size: 20px; color: #7c4dff; margin-bottom: 12px; font-weight: 700; }
    .section { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 32px; }
    .section h2 { font-size: 18px; color: #7c4dff; margin-bottom: 16px; font-weight: 700; }
    .section p { font-size: 13px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${player1.name} vs ${player2.name}</h1>
    <div class="comparison-grid">
      <div class="player-card">
        <h2>${player1.name}</h2>
        <p><strong>Position:</strong> ${player1.pos}</p>
        <p><strong>Age:</strong> ${player1.age} | <strong>Rank:</strong> #${player1.rank}</p>
        <p><strong>Value:</strong> <span style="color:#7c4dff;font-weight:700">${player1.tradeVal.toLocaleString()}</span></p>
      </div>
      <div class="player-card">
        <h2>${player2.name}</h2>
        <p><strong>Position:</strong> ${player2.pos}</p>
        <p><strong>Age:</strong> ${player2.age} | <strong>Rank:</strong> #${player2.rank}</p>
        <p><strong>Value:</strong> <span style="color:#7c4dff;font-weight:700">${player2.tradeVal.toLocaleString()}</span></p>
      </div>
    </div>
    <div class="section">
      <h2>Comparison</h2>
      <p>Value difference: ${valueDiffPct}%. Use our <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">trade calculator</a> to evaluate fair trade scenarios.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
