/**
 * Auction Draft Strategy Guide
 * Comprehensive auction format strategy for dynasty and redraft
 */

export function generateAuctionStrategyHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auction Draft Strategy | Dynasty Auction Guide | Fantasy Draft Pros</title>
  <meta name="description" content="Comprehensive auction draft strategy guide. Learn auction bidding tactics, value identification, and auction timing for dynasty and redraft.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/guides/auction-draft-strategy/">
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
    .section ul { margin-left: 20px; font-size: 13px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Auction Draft Strategy</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Master auction bidding and value identification for dynasty and redraft leagues</p>

    <div class="section">
      <h2>Auction Draft Fundamentals</h2>
      <p>Auction drafts differ from snake/serpentine by allowing bidding on all players. Each team has a salary cap (typically $200). Bidding strategy is critical.</p>
      <h3>Key Principles</h3>
      <ul>
        <li><strong>Value Over Average:</strong> Identify players going for less than market value</li>
        <li><strong>Scarcity:</strong> Don't overpay for positional depth; focus on scarce positions</li>
        <li><strong>Salary Cap Management:</strong> Track remaining budget and adjust spending</li>
        <li><strong>League Tendencies:</strong> Understand how your league bids (aggressive, conservative, positional bias)</li>
      </ul>
    </div>

    <div class="section">
      <h2>Auction Bidding Strategies</h2>
      
      <h3>Early Aggression</h3>
      <p>Bid confidently on elite players early when budgets are full. Lock in top talent before competition intensifies. Prevents bidding wars later.</p>

      <h3>Mid-Draft Value Hunting</h3>
      <p>Let others spend on positional depth. Target undervalued players in mid-rounds. This is where elite value emerges.</p>

      <h3>Late Budget Flexibility</h3>
      <p>Save budget for breakout candidates and league value pops. Final $5-10 can fill remaining needs cheaply with end-of-bench depth.</p>
    </div>

    <div class="section">
      <h2>Positional Auction Strategy</h2>
      <ul>
        <li><strong>QB:</strong> Wait until late. Positional depth is deep. Stream if needed.</li>
        <li><strong>RB:</strong> Star tier expensive. Target mid-tier backs who outperform cost.</li>
        <li><strong>WR:</strong> Deepest position. Find value in 30-50 range.</li>
        <li><strong>TE:</strong> Scarce. One of few positions worth early spending.</li>
      </ul>
    </div>

    <div class="section">
      <h2>Common Auction Mistakes</h2>
      <ul>
        <li>Overpaying for league consensus tier (everyone knows value is high)</li>
        <li>Ignoring positional scarcity (weak TE class needs higher spending)</li>
        <li>Spending full budget early (losing flexibility)</li>
        <li>Chasing your league's bids instead of identifying true value</li>
      </ul>
    </div>

    <div class="section">
      <h2>Use FDP Values for Auction</h2>
      <p>Reference <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">FDP Values</a> to understand external market consensus. Bid based on value vs cost, not just ADP/consensus.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
