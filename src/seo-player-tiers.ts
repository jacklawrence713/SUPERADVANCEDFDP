/**
 * Player Tier Analysis
 * Market segmentation and value clustering analysis
 */

export interface PlayerTier {
  name: string;
  description: string;
  valueRange: { min: number; max: number };
  playerCount: number;
  characteristics: string[];
  tradingNote: string;
}

export function generatePlayerTiersHtml(
  tiers: PlayerTier[],
  totalPlayers: number,
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  const tierCards = tiers
    .map(
      tier => `
    <div class="tier-card">
      <h3>${tier.name}</h3>
      <div class="value-range">${tier.valueRange.min.toLocaleString()} - ${tier.valueRange.max.toLocaleString()}</div>
      <p style="font-size:13px;color:#9b96b8;margin:12px 0">${tier.description}</p>
      <div class="tier-stats">
        <div class="stat">
          <div class="stat-label">Players</div>
          <div class="stat-value">${tier.playerCount}</div>
        </div>
        <div class="stat">
          <div class="stat-label">% of Market</div>
          <div class="stat-value">${((tier.playerCount / totalPlayers) * 100).toFixed(1)}%</div>
        </div>
      </div>
      <div class="characteristics">
        ${tier.characteristics.map(c => `<span class="badge">${c}</span>`).join('')}
      </div>
      <p style="font-size:12px;color:#7c4dff;margin-top:12px;font-style:italic">${tier.tradingNote}</p>
    </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dynasty Player Tiers | Value Clustering Analysis | Fantasy Draft Pros</title>
  <meta name="description" content="Discover natural clustering of dynasty player values. Identify bargains within tiers and understand the player asset hierarchy for smart dynasty trading.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/research/player-tiers/">
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Dynasty Fantasy Football Player Tiers",
    "description": "Market segmentation and value clustering analysis for dynasty player values",
    "author": {"@type": "Organization", "name": "Fantasy Draft Pros"},
    "publisher": {"@type": "Organization", "name": "Fantasy Draft Pros"}
  }</script>
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://fantasydraftpros.com"},
      {"@type": "ListItem", "position": 2, "name": "Research", "item": "https://fantasydraftpros.com/research/"},
      {"@type": "ListItem", "position": 3, "name": "Player Tiers", "item": "https://fantasydraftpros.com/research/player-tiers/"}
    ]
  }</script>
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #fff; }
    .subtitle { font-size: 14px; color: #9b96b8; margin-bottom: 20px; }
    .intro { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .intro p { font-size: 14px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .intro ul { margin-left: 20px; }
    .intro li { margin-bottom: 8px; font-size: 14px; color: #9b96b8; }
    .tiers-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .tier-card { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 20px; position: relative; }
    .tier-card h3 { font-size: 20px; color: #7c4dff; margin-bottom: 8px; font-weight: 700; }
    .value-range { font-size: 14px; color: #9b96b8; margin-bottom: 12px; font-family: monospace; font-weight: 600; }
    .tier-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
    .stat { background: #2a2a35; border-radius: 8px; padding: 12px; border: 1px solid #444; }
    .stat-label { font-size: 11px; color: #9b96b8; margin-bottom: 4px; }
    .stat-value { font-size: 18px; font-weight: 800; color: #7c4dff; }
    .characteristics { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
    .badge { background: #2a2a35; color: #7c4dff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; border: 1px solid #444; }
    .section { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .section h2 { font-size: 18px; color: #7c4dff; margin-bottom: 16px; font-weight: 700; }
    .section p { font-size: 14px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .section ul { margin-left: 20px; }
    .section li { margin-bottom: 8px; font-size: 14px; color: #9b96b8; }
    a { color: #7c4dff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Player Tier Analysis</h1>
    <p class="subtitle">Market segmentation and value clustering for dynasty fantasy football</p>

    <div class="intro">
      <p><strong>What is Tier Analysis?</strong></p>
      <p>
        Player values don't distribute evenly—they cluster into natural tiers. Elite tier assets command premium prices. Mid-tier players offer value. Understanding these clusters helps you:
      </p>
      <ul>
        <li>Identify natural breakpoints in player value</li>
        <li>Find bargains between tier boundaries</li>
        <li>Structure trades with tier-aware leverage</li>
        <li>Understand why some players are "buy lows" vs "sell highs"</li>
      </ul>
    </div>

    <h2 style="font-size:20px;margin:32px 0 20px;color:#fff">Dynasty Player Tiers</h2>
    <div class="tiers-grid">
      ${tierCards}
    </div>

    <div class="section">
      <h2>Trading Within Tiers</h2>
      <p><strong>Tier Parity Trades</strong></p>
      <p>
        Trading within the same tier (e.g., one elite for another elite) are often fair value. These trades shift positional exposure without unfair advantage.
      </p>
      <p style="margin-top:16px"><strong>Trading Up Tiers</strong></p>
      <p>
        Trading up tiers requires significant asset accumulation. A 3-for-1 trade from low-tier players to a mid-tier star, or 2-for-1 from mid-tier to elite tier, represent typical upgrade patterns.
      </p>
      <p style="margin-top:16px"><strong>Tier Arbitrage</strong></p>
      <p>
        Bargains emerge at tier boundaries. A player priced at low end of mid-tier might outperform elite tier pricing. Scout tier edges for league advantage.
      </p>
    </div>

    <div class="section">
      <h2>Related Research</h2>
      <p>Explore more FDP research:</p>
      <p style="margin-top:12px;font-size:13px">
        <a href="https://fantasydraftpros.com/research/">Research Hub</a> |
        <a href="https://fantasydraftpros.com/research/age-curves/">Age Curves</a> |
        <a href="https://fantasydraftpros.com/research/team-dynasty-capital/">Team Dynasty Capital</a> |
        <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">Trade Calculator</a>
      </p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
