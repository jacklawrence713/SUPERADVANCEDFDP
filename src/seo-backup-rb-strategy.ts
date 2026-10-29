/**
 * Backup RB Strategy & Handcuff Value
 * Maximizing backup running back value and handcuff opportunities
 */

export function generateBackupRbStrategyHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Backup RB Strategy | Handcuff Value | Fantasy Draft Pros</title>
  <meta name="description" content="Master backup RB strategy and handcuff value in dynasty leagues. Learn when to own backup RBs, handcuff valuation, and role transition timing.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/strategy/backup-rb-strategy/">
  <script type="application/ld+json">{"@context": "https://schema.org", "@type": "Article", "headline": "Backup RB Strategy"}</script>
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
    <h1>Backup RB Strategy</h1>
    <p class="subtitle">Maximize backup RB value and handcuff opportunities in dynasty</p>

    <div class="section">
      <h2>When to Own Backup RBs</h2>
      <p>Backup RBs are dynasty's most valuable insurance. When a starter goes down, the backup jumps 3-5 tiers instantly, potentially becoming a top-24 asset.</p>
      <div class="box">
        <h3>Own Backup RB If:</h3>
        <ul>
          <li>Starter has history of soft-tissue injuries (recurring risk)</li>
          <li>Backup is young, talented, and career-track positive</li>
          <li>High-volume offense with quality opportunity</li>
          <li>Starter age 28+ (closer to end-of-prime window)</li>
        </ul>
      </div>
      <div class="box">
        <h3>Skip Backup RB If:</h3>
        <ul>
          <li>Starter has clean injury history (rare re-injury)</li>
          <li>Backup is aging or unproven (low upside)</li>
          <li>Committee backfield (unclear handcuff value)</li>
          <li>Starter age 24-27 (long remaining prime window)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Handcuff Value Tiers</h2>
      <div class="box">
        <h3>Elite Handcuff (Reserve 2-3 Round Pick Value)</h3>
        <ul>
          <li>Examples: James Cook (behind Josh Allen), Anthony McFarland (Shanahan system)</li>
          <li>Young backup, proven talent, clear path to starting role</li>
          <li>If starter injured: Becomes instant top-12 asset</li>
          <li>Hold year-round, sell high if starter injured</li>
        </ul>
      </div>
      <div class="box">
        <h3>Standard Handcuff (Reserve 3-4 Round Pick Value)</h3>
        <ul>
          <li>Solid backup with some question marks</li>
          <li>If starter injured: Becomes top-24 to tier-2 asset</li>
          <li>Valuable insurance, trade only if starter completely healthy</li>
          <li>Examples: committee backups, unproven prospects</li>
        </ul>
      </div>
      <div class="box">
        <h3>Speculative Handcuff (Reserve 5+ Pick Value)</h3>
        <ul>
          <li>Backup with age, injury, or talent concerns</li>
          <li>If starter injured: Becomes tier-3 to tier-4 asset</li>
          <li>Hold only on elite starter (insurance value)</li>
          <li>Example: Aging backups, low-ceiling prospects</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Trading Backup RBs</h2>
      <div class="box">
        <h3>Sell Backup RB High When:</h3>
        <ul>
          <li>Starter gets injured (peak value period)</li>
          <li>Backup gets 1-2 strong performances (uncertainty discount lifting)</li>
          <li>Entering playoffs (contenders want insurance)</li>
          <li>Before draft (backup prospect value increases)</li>
        </ul>
      </div>
      <div class="box">
        <h3>Buy Backup RB Low When:</h3>
        <ul>
          <li>Starter just returned from injury (backups worth nothing)</li>
          <li>Starter on stable team (low injury risk perceived)</li>
          <li>Offseason (lowest competition for backup acquisition)</li>
          <li>Before role clarity (wait for preseason/training camp)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Role Transition Timing</h2>
      <ul>
        <li><strong>Weeks 1-4:</strong> Backup value relatively low (starter healthy)</li>
        <li><strong>Weeks 5-8:</strong> Peak backup value as injury risk compounds</li>
        <li><strong>Weeks 9-12:</strong> High backup value (playoff positioning matters)</li>
        <li><strong>Weeks 13-17:</strong> Backup value depends on starter health status</li>
      </ul>
    </div>

    <div class="section">
      <h2>Backup RB Development Arcs</h2>
      <div class="box">
        <h3>Prospect → Backup → Starter Arc</h3>
        <ul>
          <li>Year 1 (Prospect): Draft pick, no NFL experience (low value)</li>
          <li>Year 2-3 (Backup): Earns backup role, proves capability (handcuff value emerges)</li>
          <li>Year 4+ (Starter): Takes over from injured/aging starter (peak value)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Use FDP Values for Backup RB Decisions</h2>
      <p>Compare backup RB value vs. unaffiliated tier-2 RB using our <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">trade calculator</a>. Handcuffs should trade at premium relative to standalone players due to injury insurance value.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
