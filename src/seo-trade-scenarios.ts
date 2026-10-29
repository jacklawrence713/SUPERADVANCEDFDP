/**
 * Trade Scenario Templates
 * Common trade pattern examples and guidance
 */

export function generateTradeScenarioHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dynasty Trade Scenarios | Common Trade Patterns | Fantasy Draft Pros</title>
  <meta name="description" content="Explore common dynasty trade scenarios and patterns. Learn how to structure 2-for-1s, 3-for-1s, and age-arbitrage trades.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/guides/trade-scenarios/">
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 12px; color: #fff; }
    .section { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .section h2 { font-size: 20px; color: #7c4dff; margin-bottom: 16px; }
    .scenario { background: #2a2a35; border-left: 3px solid #7c4dff; padding: 12px 16px; border-radius: 4px; margin: 12px 0; }
    .scenario-title { font-weight: 700; color: #fff; margin-bottom: 4px; }
    .scenario-text { font-size: 12px; color: #9b96b8; }
    .section p { font-size: 13px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Dynasty Trade Scenarios</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Common trade patterns and how to evaluate them</p>

    <div class="section">
      <h2>2-for-1 Trades (Trading Down)</h2>
      <p>Trading 2 players for 1 elite player. Common when consolidating depth into a star.</p>
      <div class="scenario">
        <div class="scenario-title">Example: Upgrade at RB</div>
        <div class="scenario-text">Send: Mid-tier RB + depth WR | Get: Elite RB. Good for contenders needing a star player.</div>
      </div>
      <div class="scenario">
        <div class="scenario-title">Example: Consolidate WR</div>
        <div class="scenario-text">Send: Two solid WRs | Get: Elite WR. Streamlines roster when you have depth.</div>
      </div>
    </div>

    <div class="section">
      <h2>3-for-1 Trades (Major Consolidation)</h2>
      <p>Trading 3 players/picks for 1 star. Typical in playoff-push scenarios.</p>
      <div class="scenario">
        <div class="scenario-title">Example: Buy a Star</div>
        <div class="scenario-text">Send: 2 depth pieces + early pick | Get: Elite RB/WR. Aggressive contention move.</div>
      </div>
    </div>

    <div class="section">
      <h2>Age Arbitrage Trades</h2>
      <p>Trading older assets for younger players with similar value. Common in rebuilds.</p>
      <div class="scenario">
        <div class="scenario-title">Example: Rebuild Shift</div>
        <div class="scenario-text">Send: 28-year-old elite RB | Get: 23-year-old promising RB + pick. Extends window.</div>
      </div>
    </div>

    <div class="section">
      <h2>Draft Capital Trades</h2>
      <p>Trading players for future draft picks. Useful for rebuilds or contention flexibility.</p>
      <div class="scenario">
        <div class="scenario-title">Example: Acquire Picks</div>
        <div class="scenario-text">Send: Aging veteran | Get: 2024 1st rounder. Rebuild currency shift.</div>
      </div>
    </div>

    <div class="section">
      <h2>Trade Evaluation</h2>
      <p>Always use the <a href="https://fantasydraftpros.com/dynasty-trade-analyzer/">Trade Analyzer</a> to verify trade fairness before proposing.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
