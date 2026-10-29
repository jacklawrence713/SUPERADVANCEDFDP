/**
 * Historical Performance Analysis
 * Analyzing past dynasty trends and performance patterns
 */

export function generateHistoricalPerformanceHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Historical Dynasty Performance | Trend Analysis | Fantasy Draft Pros</title>
  <meta name="description" content="Analyze historical dynasty performance patterns and trends. Learn from past player valuations, career arcs, and position trends to improve future decisions.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/analysis/historical-performance/">
  <script type="application/ld+json">{"@context": "https://schema.org", "@type": "Article", "headline": "Historical Dynasty Performance Analysis"}</script>
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
    <h1>Historical Dynasty Performance Analysis</h1>
    <p class="subtitle">Learn from past player performances and dynasty trends to predict future value</p>

    <div class="section">
      <h2>Position-Specific Career Arcs</h2>
      <div class="box">
        <h3>RB Careers (Peak 26-28)</h3>
        <ul>
          <li>Elite RBs typically peak ages 26-28, producing 3-4 elite seasons</li>
          <li>Decline accelerates after age 30 (workload and injury risk increase)</li>
          <li>Historical data: Most RBs drafted top-5 produce 5-7 productive seasons total</li>
          <li>Learning: Sell elite RBs at age 29+ (declining value, replacement available)</li>
        </ul>
      </div>
      <div class="box">
        <h3>WR Careers (Peak 27-30)</h3>
        <ul>
          <li>Elite WRs peak later (ages 27-30) with longer prime windows</li>
          <li>Gradual decline after 30, but can remain productive into early 30s</li>
          <li>Historical data: Elite WRs sustain production for 7-9 seasons</li>
          <li>Learning: Hold elite WRs longer than RBs (age 31+ often still valuable)</li>
        </ul>
      </div>
      <div class="box">
        <h3>TE Careers (Peak 28-32)</h3>
        <ul>
          <li>Tight ends peak latest (ages 28-32), longest career windows</li>
          <li>Decline is gradual; elite TEs maintain value into mid-30s</li>
          <li>Historical data: Elite TEs produce 8-10 productive seasons</li>
          <li>Learning: Hold elite TEs (age 32+ still often valuable)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Draft Capital vs. Performance</h2>
      <div class="box">
        <h3>Round 1-2 RBs vs. Other Positions</h3>
        <ul>
          <li>Elite RBs drafted early produce strong 5-6 year windows</li>
          <li>WRs drafted early have longer productive careers (less drop-off)</li>
          <li>Historical pattern: Position scarcity (RB) drives early draft capital over player age</li>
        </ul>
      </div>
      <div class="box">
        <h3>Hit Rate by Draft Position</h3>
        <ul>
          <li>Top-12 picks: 70-80% hit rate (3+ productive seasons)</li>
          <li>Rounds 2-3: 40-50% hit rate (many don't produce as expected)</li>
          <li>Rounds 4+: 20-30% hit rate (high bust rate, but some breakouts)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Role Trajectory & Opportunity Changes</h2>
      <div class="box">
        <h3>Backfield Role Changes</h3>
        <ul>
          <li>Players promoted from backup to starter typically produce year 1-2 after promotion</li>
          <li>Early career role changes (years 1-3): 60-70% adjust to new role successfully</li>
          <li>Late career role changes (age 27+): Only 30-40% adapt to expanded role</li>
        </ul>
      </div>
      <div class="box">
        <h3>Team Changes Impact</h3>
        <ul>
          <li>Players changing teams see 20-30% production variance (offense fit matters)</li>
          <li>WRs switching teams typically show 1-2 year adjustment period</li>
          <li>RBs in new offenses: High-volume backfields → immediate production; committee → wait and see</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Injury History Predictability</h2>
      <ul>
        <li>Players with 1 major injury: 50% chance of future injury</li>
        <li>Players with 2+ injuries: 70%+ chance of future injury (recurring risk)</li>
        <li>Lower-body injuries: Higher recurrence rate than upper-body</li>
        <li>Historical pattern: Soft-tissue injuries predispose to future soft-tissue injuries</li>
      </ul>
    </div>

    <div class="section">
      <h2>Value Transition Patterns</h2>
      <div class="box">
        <h3>Buy-Low Candidates (Historically)</h3>
        <ul>
          <li>Players in down production years (2nd/3rd year post-draft)</li>
          <li>Injury recovery (years 1-2 post-injury tend to see sharp value rebound)</li>
          <li>Role players taking over (get 1 down year before breakout)</li>
        </ul>
      </div>
      <div class="box">
        <h3>Sell-High Signals</h3>
        <ul>
          <li>Ages 28-30 (especially RBs): Peak value before decline</li>
          <li>One-year breakouts in new role (uncertain sustainability)</li>
          <li>Players with injury history and recent re-injury (recurrence risk high)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Use Historical Data for Your Strategy</h2>
      <p>Review past player arcs in our <a href="https://fantasydraftpros.com/dynasty-rankings/">rankings</a> to identify patterns. Players at similar ages/roles typically follow historical trends—use that to time sales and acquisitions.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
