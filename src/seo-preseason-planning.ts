/**
 * Preseason Planning & Preparation
 * Preparing your dynasty roster for the upcoming season
 */

export function generatePreseasonsplanningHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preseason Planning | Dynasty Preparation Guide | Fantasy Draft Pros</title>
  <meta name="description" content="Master preseason planning and dynasty roster preparation. Learn offseason strategy, rookie evaluation, and season preparation tactics.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/analysis/preseason-planning/">
  <script type="application/ld+json">{"@context": "https://schema.org", "@type": "Article", "headline": "Preseason Planning"}</script>
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
    <h1>Preseason Planning & Preparation</h1>
    <p class="subtitle">Prepare your dynasty roster for the upcoming season</p>

    <div class="section">
      <h2>Offseason Dynasty Checklist</h2>
      <div class="box">
        <h3>March-April: Trade & Roster Review</h3>
        <ul>
          <li>Evaluate roster strength vs. contention window</li>
          <li>Execute mid-tier trades (sell-high aging assets)</li>
          <li>Target free-agent depth signings</li>
          <li>Monitor rookie contract news</li>
        </ul>
      </div>
      <div class="box">
        <h3>April-May: NFL Draft Preparation</h3>
        <ul>
          <li>Study draft class (talent evaluation, landing spot impact)</li>
          <li>Identify rookie breakout candidates</li>
          <li>Plan rookie trades and acquisitions</li>
          <li>Adjust projections based on draft results</li>
        </ul>
      </div>
      <div class="box">
        <h3>May-June: Free Agency Window</h3>
        <ul>
          <li>Acquire depth at waiver prices (offseason is cheapest)</li>
          <li>Target backup-eligible players</li>
          <li>Plan handcuff acquisitions</li>
          <li>Build prospect stashes</li>
        </ul>
      </div>
      <div class="box">
        <h3>July-August: Training Camp & Preseason</h3>
        <ul>
          <li>Monitor training camp battles (backup RBs earning roles)</li>
          <li>Watch preseason film (breakout candidates)</li>
          <li>Track injury reports (potential role changes)</li>
          <li>Identify surprise competition (undrafted FAs)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Rookie Evaluation & Strategy</h2>
      <div class="box">
        <h3>Rookie Scouting Timeline</h3>
        <ul>
          <li><strong>Pre-Draft (January-April):</strong> Film study, measurables, college production</li>
          <li><strong>Draft Weekend (April):</strong> Landing spot evaluation, team fit, role clarity</li>
          <li><strong>Immediate Post-Draft (April-May):</strong> Initial trade valuations</li>
          <li><strong>Training Camp (July-August):</strong> On-field performance validation</li>
          <li><strong>Preseason (August-September):</strong> Game performance, depth chart clarity</li>
        </ul>
      </div>
      <div class="box">
        <h3>Rookie Buy/Sell Timing</h3>
        <ul>
          <li>Buy high: Pre-draft (highest optimism)</li>
          <li>Buy low: After draft (disappointing landing spot)</li>
          <li>Hold: Training camp (collect more data)</li>
          <li>Sell high: Breakout preseason performances</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Roster Audit & Strengths/Weaknesses</h2>
      <ul>
        <li>Identify positional strengths (which positions are elite?)</li>
        <li>Identify weaknesses (which positions need depth?)</li>
        <li>Calculate contention window (when is your peak year?)</li>
        <li>Plan upgrades (which positions should you target?)</li>
        <li>Set trade targets (who would improve your roster?)</li>
      </ul>
    </div>

    <div class="section">
      <h2>Preseason Depth Chart Impact</h2>
      <div class="box">
        <h3>Monitoring Role Changes</h3>
        <ul>
          <li>Backup RBs earning starter reps (potential breakouts)</li>
          <li>Rookie WRs entering rotations (first-year opportunities)</li>
          <li>Depth chart reshuffling (veteran competition)</li>
          <li>Injury developments (role changes mid-preseason)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Season-Long Preparation</h2>
      <ul>
        <li>Set draft targets and value tiers for season</li>
        <li>Establish trade market expectations</li>
        <li>Plan bye-week coverage (identify potential conflicts)</li>
        <li>Prepare waiver-wire strategy for week 1</li>
        <li>Set playoff timeline and targets</li>
      </ul>
    </div>

    <div class="section">
      <h2>Use FDP Values for Preseason Planning</h2>
      <p>Use our <a href="https://fantasydraftpros.com/dynasty-rankings/">dynasty rankings</a> to establish preseason value baselines. Compare rookie projections and identify undervalued players before the season starts.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
