/**
 * Free Agent Ranking & Acquisition Strategy
 * Identifying and acquiring undervalued free agents and waiver pickups
 */

export function generateFreeAgentRankingHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Free Agent Ranking Strategy | Dynasty Free Agency Guide | Fantasy Draft Pros</title>
  <meta name="description" content="Master free agent ranking and acquisition strategy in dynasty leagues. Learn how to identify undervalued free agents, evaluate free agency priority, and make smart pickups.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/strategy/free-agent-ranking/">
  <script type="application/ld+json">{"@context": "https://schema.org", "@type": "Article", "headline": "Free Agent Ranking Strategy"}</script>
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
    <h1>Free Agent Ranking Strategy</h1>
    <p class="subtitle">Identify and acquire undervalued free agents to strengthen your roster</p>

    <div class="section">
      <h2>Free Agent Categories</h2>
      <div class="box">
        <h3>Buy-Low Candidates</h3>
        <ul>
          <li>Injured players recovering (mid-season returns)</li>
          <li>Role players in declining situations (scheme changes, draft capital shifts)</li>
          <li>Bounce-back players from underproductive season</li>
        </ul>
      </div>
      <div class="box">
        <h3>Handcuff & Backup Opportunities</h3>
        <ul>
          <li>Backup RBs in new offenses with injury potential</li>
          <li>Backup-eligible WRs with breakout potential</li>
          <li>Third TE on depth chart with talent</li>
        </ul>
      </div>
      <div class="box">
        <h3>Lottery Tickets</h3>
        <ul>
          <li>Recently drafted prospects in limited action</li>
          <li>Injured players in early rehab (will be unavailable)</li>
          <li>Waiver wire pickups with sudden role increase</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Free Agent Evaluation Framework</h2>
      <ul>
        <li>Opportunity: Does player have clear path to increased role?</li>
        <li>Talent: Does player profile suggest NFL viability?</li>
        <li>Timeline: How long until increased opportunity materializes (within season)?</li>
        <li>Cost: Is free agent cost lower than equivalent drafted player value?</li>
      </ul>
    </div>

    <div class="section">
      <h2>Seasonal Timing of Free Agency</h2>
      <div class="box">
        <h3>Offseason Free Agency (March-July)</h3>
        <p>Best opportunity for depth pickups and lottery tickets. Competition is low, prices are fair. Stock up on backup RBs, backup-eligible WRs, and prospect stashes.</p>
      </div>
      <div class="box">
        <h3>Training Camp & Preseason (August)</h3>
        <p>Biggest free agent value. Watch preseason film for breakout candidates. Backup RBs earning starter minutes, undrafted WRs showing skill. Prices still low before season starts.</p>
      </div>
      <div class="box">
        <h3>In-Season Free Agency (September-February)</h3>
        <p>Reactive pickups for injuries and role changes. Expect higher prices as competition increases. Focus on immediate needs vs. speculative lottery.</p>
      </div>
    </div>

    <div class="section">
      <h2>Free Agent Acquisition Strategy</h2>
      <ul>
        <li>Identify tier-2 options in same role as your starter for backup/hedge</li>
        <li>Target young players in low-volume situations (breakout candidates)</li>
        <li>Prioritize injury recovery players returning to active use (mid-season value)</li>
        <li>Look for offseason role changes (new team, coaching change) impacting opportunity</li>
      </ul>
    </div>

    <div class="section">
      <h2>When NOT to Use Free Agency</h2>
      <ul>
        <li>Don't chase aging players past their peak (value will decline)</li>
        <li>Don't overspend on lottery tickets (reserve bench space for proven depth)</li>
        <li>Don't take roleplayers from weak offenses (limit upside)</li>
      </ul>
    </div>

    <div class="section">
      <h2>Use FDP Rankings for Free Agent Targets</h2>
      <p>Check our <a href="https://fantasydraftpros.com/dynasty-rankings/">dynasty rankings</a> to identify undervalued players and tier gaps. Free agents often represent best value relative to drafted player cost.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
