/**
 * Injury Contingency Planning
 * Position-specific backup strategies and injury-adjusted valuations
 */

export function generateInjuryContingencyHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Injury Contingency Planning | Dynasty Recovery Strategy | Fantasy Draft Pros</title>
  <meta name="description" content="Master injury contingency planning for dynasty leagues. Learn position-specific backup strategies, injury-adjusted valuations, and recovery timeline planning.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/strategy/injury-contingency/">
  <script type="application/ld+json">{"@context": "https://schema.org", "@type": "Article", "headline": "Injury Contingency Planning", "description": "Comprehensive guide to injury recovery strategies in dynasty fantasy football"}</script>
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
    .position-box { background: #2a2a35; border-left: 3px solid #7c4dff; padding: 16px; margin: 16px 0; border-radius: 8px; }
    .position-box h3 { color: #7c4dff; margin-bottom: 8px; font-size: 14px; font-weight: 700; }
    ul { margin-left: 20px; font-size: 13px; color: #9b96b8; line-height: 1.8; }
    a { color: #7c4dff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Injury Contingency Planning</h1>
    <p class="subtitle">Prepare for star injuries with position-specific backup strategies and recovery plans</p>

    <div class="section">
      <h2>Injury-Adjusted Valuations</h2>
      <p>When a star player is injured, their trade value drops 50-70% even if recovery is expected. Plan your backup strategy before the injury happens, not after panic trading.</p>
      <ul>
        <li>Short-term injuries (4-8 weeks): Value drops 40-50%, backup becomes immediate role player</li>
        <li>Long-term injuries (season-ending): Value drops 60-80%, rebuilding likely unless significant overpay</li>
        <li>Injury history (recurring): Value devaluation compounds, handcuff becomes essential</li>
      </ul>
    </div>

    <div class="section">
      <h2>RB Injury Contingency</h2>
      <div class="position-box">
        <h3>Elite RB (Top 12) Injury Protocol</h3>
        <ul>
          <li>Handcuff backup RB is non-negotiable backup plan</li>
          <li>If no handcuff: Target free-agent RBs from same offense immediately</li>
          <li>Recovery timeline: 4-6 weeks typical for soft tissue, 8-12 weeks for ACL/MCL</li>
          <li>Playoff consideration: Injuries in weeks 12-14 may end season for full recovery</li>
        </ul>
      </div>
      <div class="position-box">
        <h3>Secondary RB (Tier-2) Injury Response</h3>
        <ul>
          <li>Activate tier-3 RB from bench or waiver wire</li>
          <li>Seek trade upgrade if backup is unproven</li>
          <li>Expect 2-3 game adjustment period before backup establishes role</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>WR Injury Contingency</h2>
      <div class="position-box">
        <h3>WR Injury Recovery</h3>
        <ul>
          <li>Target share redistributes to other WRs in same offense</li>
          <li>Monitor backup-eligible WRs for breakout opportunities</li>
          <li>Recovery timeline: 6-8 weeks for lower-body, 4-6 weeks for upper-body</li>
          <li>Career risk: Multiple injuries can permanently affect value (sell-high candidates)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>TE Injury Contingency</h2>
      <div class="position-box">
        <h3>Elite TE Backup Plan</h3>
        <ul>
          <li>Few true backup TEs; plan to replace rather than backup</li>
          <li>Target secondary TE from same or different offense</li>
          <li>Recovery timeline: 8-12 weeks typical for TE injuries (often ACL/significant)</li>
          <li>Lower body injuries: Consider selling elite TE if recurring ankle/knee issues</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>QB Injury Contingency</h2>
      <div class="position-box">
        <h3>Starter QB Injury</h3>
        <ul>
          <li>Backup QB typically available in waivers (low value outside injured dynasty)</li>
          <li>Recovery: 2-4 weeks for shoulder, 4-8 weeks for leg/mobility injuries</li>
          <li>Plan: Own 2 QBs if your starter has injury history (mobility QBs especially)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Building Injury Contingency Into Your Roster</h2>
      <ul>
        <li>Handcuff all injury-prone star RBs (tier-1 and tier-2)</li>
        <li>Own backup-eligible WRs in depth charts (upside stashes)</li>
        <li>Plan bench depth for TE/WR position coverage</li>
        <li>Monitor injury news during offseason to adjust roster composition</li>
      </ul>
    </div>

    <div class="section">
      <h2>Use FDP Values for Injury Response</h2>
      <p>When injuries occur, use our <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">trade calculator</a> to evaluate injured player value and backup options. Don't panic trade—understand fair value for injured stars.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
