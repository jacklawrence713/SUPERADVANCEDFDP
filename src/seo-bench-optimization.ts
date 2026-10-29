/**
 * Bench Optimization & Depth Strategy
 * Maximizing bench productivity and roster depth allocation
 */

export function generateBenchOptimizationHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bench Optimization Strategy | Depth Management | Fantasy Draft Pros</title>
  <meta name="description" content="Master bench optimization and depth allocation in dynasty leagues. Learn how to structure your bench, evaluate depth value, and optimize roster construction.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/strategy/bench-optimization/">
  <script type="application/ld+json">{"@context": "https://schema.org", "@type": "Article", "headline": "Bench Optimization Strategy"}</script>
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
    .box { background: #2a2a35; border-left: 3px solid #7c4dff; padding: 16px; margin: 16px 0; border-radius: 8px; }
    .box h3 { color: #7c4dff; margin-bottom: 8px; font-size: 14px; font-weight: 700; }
    ul { margin-left: 20px; font-size: 13px; color: #9b96b8; line-height: 1.8; }
    a { color: #7c4dff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Bench Optimization Strategy</h1>
    <p class="subtitle">Maximize bench productivity through strategic depth allocation</p>

    <div class="section">
      <h2>Bench Composition Framework</h2>
      <div class="box">
        <h3>Optimal Bench Structure</h3>
        <ul>
          <li><strong>Starter Insurance (20%):</strong> Handcuffs, backup-eligible WRs, depth at your weak positions</li>
          <li><strong>High Upside (30%):</strong> Young prospects, breakout candidates, rising talent</li>
          <li><strong>Lottery Tickets (20%):</strong> Deep prospects, preseason sleepers, speculative plays</li>
          <li><strong>Flexible (30%):</strong> Trade leverage, filler for inactive slots, player development</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Bench Depth by Position</h2>
      <div class="box">
        <h3>RB Bench Depth (Most Important)</h3>
        <ul>
          <li>Own 3-4 healthy RBs minimum (injury volatility)</li>
          <li>Allocate bench spots: 1 handcuff, 1 backup-eligible prospect, 1 depth tier-2</li>
          <li>Avoid: 2+ mediocre RBs from same offense (limits upside)</li>
        </ul>
      </div>
      <div class="box">
        <h3>WR Bench Depth (Highly Variable)</h3>
        <ul>
          <li>Own 3-5 healthy WRs depending on roster depth</li>
          <li>Allocate bench: 1 backup-eligible WR, 1-2 breakout prospects, 1 depth play</li>
          <li>Flexibility: WRs have longest peak windows, can punt on depth</li>
        </ul>
      </div>
      <div class="box">
        <h3>TE Bench Depth (Specialized)</h3>
        <ul>
          <li>Own 1-2 backup TEs (rarely 3+)</li>
          <li>Secondary TE fills gap if starter injured</li>
          <li>Deep TE prospects have minimal value (rarely produce)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Bench Optimization Strategies</h2>
      <ul>
        <li><strong>Age Diversification:</strong> Mix veteran depth with young prospects on bench</li>
        <li><strong>Injury Insurance:</strong> Prioritize handcuffs over speculative lottery</li>
        <li><strong>Offensive Concentration:</strong> Don't stack bench with players from same offense</li>
        <li><strong>Flexibility:</strong> Keep bench spots for opportunistic trades and waiver pickups</li>
      </ul>
    </div>

    <div class="section">
      <h2>When to Bench Players</h2>
      <div class="box">
        <h3>Keep on Bench</h3>
        <ul>
          <li>Young players with long dynasty windows (hold for development)</li>
          <li>Handcuffs and backup insurance (immediate value if starter injured)</li>
          <li>Players with imminent role increases (one preseason/injury away from stardom)</li>
        </ul>
      </div>
      <div class="box">
        <h3>Trade Off Bench</h3>
        <ul>
          <li>Depth players without clear path to increased role</li>
          <li>Aged players declining in value</li>
          <li>Redundant players (3rd TE, 5th WR without breakout potential)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Bench Management During Season</h2>
      <ul>
        <li>Review bench weekly: Are players moving up/down team depth charts?</li>
        <li>Make swaps: Trade declining depth for rising prospects</li>
        <li>Respond to injuries: Add handcuff if starter gets injured</li>
        <li>Anticipate opportunities: Bench space for playoff/trade deadline acquisitions</li>
      </ul>
    </div>

    <div class="section">
      <h2>Use FDP Values to Evaluate Bench Trades</h2>
      <p>Compare depth value using our <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">trade calculator</a>. Your bench should have cumulative value supporting your contention window.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
