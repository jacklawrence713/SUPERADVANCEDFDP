/**
 * Depth Acquisition & Building Strategy
 * Strategic depth building for competitive and rebuilding rosters
 */

export function generateDepthAcquisitionHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Depth Acquisition Strategy | Building Dynasty Rosters | Fantasy Draft Pros</title>
  <meta name="description" content="Master depth acquisition strategies for dynasty leagues. Learn how to build sustainable roster depth, acquire depth affordably, and construct competitive rosters.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/strategy/depth-acquisition/">
  <script type="application/ld+json">{"@context": "https://schema.org", "@type": "Article", "headline": "Depth Acquisition Strategy"}</script>
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
    <h1>Depth Acquisition Strategy</h1>
    <p class="subtitle">Build sustainable roster depth through strategic acquisitions and trades</p>

    <div class="section">
      <h2>Depth Building for Contenders</h2>
      <div class="box">
        <h3>Competitive Window (Years 1-3)</h3>
        <ul>
          <li>Prioritize tier-2 depth over youth (win now vs. future)</li>
          <li>Target buy-low candidates in post-injury recovery</li>
          <li>Acquire handcuffs for injury-prone stars (playoff insurance)</li>
          <li>Fill position gaps with proven depth, not prospects</li>
        </ul>
      </div>
      <div class="box">
        <h3>Depth Acquisition Timing</h3>
        <ul>
          <li>Offseason: Best value on backup RBs and depth tier players</li>
          <li>Early season: Target underperforming players (buy-low opportunity)</li>
          <li>Mid-season: Acquire injury backups and playoff insurance</li>
          <li>Late season: Grab playoff depth from non-contenders</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Depth Building for Rebuilds</h2>
      <div class="box">
        <h3>Rebuilding Strategy (Years 1-2)</h3>
        <ul>
          <li>Acquire youth over proven depth (long-term value)</li>
          <li>Target breakout candidates and backup-eligible prospects</li>
          <li>Stash young players with limited current value</li>
          <li>Use depth acquisitions to move expiring players for picks/youth</li>
        </ul>
      </div>
      <div class="box">
        <h3>Rebuild Depth Targets</h3>
        <ul>
          <li>Young RBs in crowded backfields (backup-eligible)</li>
          <li>WR prospects on inactive depth charts (upcoming breakouts)</li>
          <li>Third-year players with rising camp reports</li>
          <li>UDFA (undrafted free agents) with measurables and team interest</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Depth Acquisition Sources</h2>
      <div class="box">
        <h3>Trade Market</h3>
        <ul>
          <li>Buy-low aging depth (contenders selling declining players)</li>
          <li>Package multiple depth players for one upgrade</li>
          <li>Target rebuilding teams' young depth (most affordable)</li>
        </ul>
      </div>
      <div class="box">
        <h3>Waiver Wire</h3>
        <ul>
          <li>Best source for injury backups and role-change pickups</li>
          <li>Capture breakout candidates before trade market prices spike</li>
          <li>Free agents after waivers for low-priority depth</li>
        </ul>
      </div>
      <div class="box">
        <h3>Offseason/Free Agency</h3>
        <ul>
          <li>Lowest prices on depth players (no in-season demand spike)</li>
          <li>Best timing for building prospect stashes</li>
          <li>Handcuff and backup acquisitions most affordable</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Balancing Depth with Flexibility</h2>
      <ul>
        <li>Don't over-allocate to position depth (need trade flexibility)</li>
        <li>Keep 1-2 bench spots for emergency acquisitions and waivers</li>
        <li>Trade redundant depth for upgrades at weak positions</li>
        <li>Maintain depth pipeline without roster bloat</li>
      </ul>
    </div>

    <div class="section">
      <h2>Depth Evaluation Framework</h2>
      <ul>
        <li>Compare tier gaps: Where is value cheapest relative to starters?</li>
        <li>Project timeline: How many years of useful production left?</li>
        <li>Opportunity cost: What are you giving up to acquire this depth?</li>
        <li>Win probability: Does this depth increase playoff odds?</li>
      </ul>
    </div>

    <div class="section">
      <h2>Use FDP Values for Depth Evaluation</h2>
      <p>Use our <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">trade calculator</a> to compare depth value and identify tier gaps. Depth represents best value when positioned at value transitions (tier-2 to tier-3, etc).</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
