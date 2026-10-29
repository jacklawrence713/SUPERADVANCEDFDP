/**
 * Dynasty League Setup & Configuration Guides
 * Comprehensive guides for setting up different dynasty league formats
 */

export interface LeagueFormat {
  name: string;
  shortName: string;
  slug: string;
  description: string;
  qbImpact: string;
  rbImpact: string;
  wrImpact: string;
  teImpact: string;
  advantages: string[];
  disadvantages: string[];
  setupComplexity: 'Easy' | 'Moderate' | 'Complex';
  recommendedTeamSize: string;
}

export function generateLeagueSetupHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dynasty League Setup Guide | How to Start a Dynasty Fantasy League</title>
  <meta name="description" content="Complete guide to setting up a dynasty fantasy football league. Learn league formats, scoring settings, roster construction, and best practices.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/dynasty-league-setup/">
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://fantasydraftpros.com"},
      {"@type": "ListItem", "position": 2, "name": "Dynasty League Setup", "item": "https://fantasydraftpros.com/dynasty-league-setup/"}
    ]
  }</script>
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 12px; color: #fff; }
    .subtitle { font-size: 16px; color: #9b96b8; margin-bottom: 24px; }
    .intro { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .intro p { font-size: 14px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .formats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .format-card { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; transition: all 0.3s; }
    .format-card:hover { border-color: #7c4dff; transform: translateY(-2px); }
    .format-card h2 { font-size: 20px; color: #7c4dff; margin-bottom: 8px; font-weight: 700; }
    .format-short { font-size: 12px; color: #9b96b8; margin-bottom: 12px; font-weight: 600; }
    .format-card p { font-size: 13px; color: #9b96b8; line-height: 1.7; margin-bottom: 16px; }
    .complexity { display: inline-block; background: #2a2a35; color: #7c4dff; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 12px; }
    .learn-more { display: inline-block; color: #7c4dff; text-decoration: none; font-weight: 600; font-size: 13px; }
    .learn-more:hover { text-decoration: underline; }
    .setup-steps { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .setup-steps h2 { font-size: 20px; color: #7c4dff; margin-bottom: 16px; }
    .step { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #333; }
    .step:last-child { border-bottom: none; }
    .step-num { display: inline-block; background: #7c4dff; color: #0f0f15; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 800; margin-right: 8px; }
    .step-title { font-weight: 700; color: #fff; margin-bottom: 4px; }
    .step-desc { font-size: 13px; color: #9b96b8; }
    a { color: #7c4dff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Dynasty League Setup Guide</h1>
    <p class="subtitle">Complete guide to starting and configuring your dynasty fantasy football league</p>

    <div class="intro">
      <p><strong>What is Dynasty Fantasy Football?</strong></p>
      <p>Dynasty leagues allow you to keep your drafted players year-after-year, creating persistent rosters and long-term strategy. Unlike redraft leagues that reset each season, dynasty leagues emphasize youth development, long-term value, and multi-year planning.</p>
      <p style="margin-top: 12px;"><strong>This guide covers:</strong></p>
      <ul style="margin-left: 20px; font-size: 13px; color: #9b96b8; line-height: 1.8;">
        <li>Choosing a league format (1QB, Superflex, TE Premium, IDP)</li>
        <li>Scoring settings and their impact</li>
        <li>Roster construction best practices</li>
        <li>Startup draft strategy</li>
        <li>League rules and governance</li>
      </ul>
    </div>

    <h2 style="font-size: 24px; margin: 32px 0 20px; color: #fff;">League Formats</h2>
    <div class="formats-grid">
      <div class="format-card">
        <h2>1QB Standard</h2>
        <div class="format-short">Single Quarterback</div>
        <p>The traditional dynasty format. One QB slot emphasizes RB/WR depth and TE scarcity. Most accessible for new dynasty players.</p>
        <div class="complexity">Easy Setup</div>
        <p style="font-size: 12px; margin-top: 12px;"><a href="https://fantasydraftpros.com/dynasty-league-setup/1qb-leagues/" class="learn-more">Learn more →</a></p>
      </div>

      <div class="format-card">
        <h2>Superflex (2QB)</h2>
        <div class="format-short">Dual Quarterback</div>
        <p>Two QB slots (one QB, one Superflex). Dramatically increases QB value and scarcity. Popular among experienced dynasty players.</p>
        <div class="complexity">Moderate Setup</div>
        <p style="font-size: 12px; margin-top: 12px;"><a href="https://fantasydraftpros.com/dynasty-league-setup/superflex-leagues/" class="learn-more">Learn more →</a></p>
      </div>

      <div class="format-card">
        <h2>TE Premium</h2>
        <div class="format-short">Tight End Emphasis</div>
        <p>Extra TE scoring (0.5-1.0 PPR bonus) creates TE scarcity and value concentration. Best for leagues wanting positional complexity.</p>
        <div class="complexity">Moderate Setup</div>
        <p style="font-size: 12px; margin-top: 12px;"><a href="https://fantasydraftpros.com/dynasty-league-setup/te-premium-leagues/" class="learn-more">Learn more →</a></p>
      </div>

      <div class="format-card">
        <h2>IDP Dynasty</h2>
        <div class="format-short">Individual Defensive Players</div>
        <p>Draft defensive players individually (DL, LB, DB). Adds roster depth and trading complexity. Advanced format.</p>
        <div class="complexity">Complex Setup</div>
        <p style="font-size: 12px; margin-top: 12px;"><a href="https://fantasydraftpros.com/dynasty-league-setup/idp-leagues/" class="learn-more">Learn more →</a></p>
      </div>
    </div>

    <div class="setup-steps">
      <h2>5 Steps to Start Your Dynasty League</h2>
      <div class="step">
        <div><span class="step-num">1</span><div class="step-title">Choose Your Format</div></div>
        <div class="step-desc">Decide on league format (1QB, Superflex, TE Premium, IDP) and number of teams (8-14 is standard). Ensure all league members agree on complexity level.</div>
      </div>
      <div class="step">
        <div><span class="step-num">2</span><div class="step-title">Set Scoring Settings</div></div>
        <div class="step-desc">Configure PPR/Half-PPR/Standard scoring. Set position scoring multipliers. Establish bench size, bench depth, and trade deadline rules.</div>
      </div>
      <div class="step">
        <div><span class="step-num">3</span><div class="step-title">Design Roster Construction</div></div>
        <div class="step-desc">Determine starter slots (QB, RB, WR, FLEX, TE, etc.), bench size, and taxi squad size. Balance competitive balance with roster flexibility.</div>
      </div>
      <div class="step">
        <div><span class="step-num">4</span><div class="step-title">Plan Your Startup Draft</div></div>
        <div class="step-desc">Choose draft format (serpentine, auction, etc.). Establish draft order. Set round timing and trade rules during draft.</div>
      </div>
      <div class="step">
        <div><span class="step-num">5</span><div class="step-title">Establish League Governance</div></div>
        <div class="step-desc">Create voting rules for rule changes. Set trade evaluation standards. Establish veto rules and commissioner authority.</div>
      </div>
    </div>

    <div style="background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px;">
      <h2 style="color: #7c4dff; margin-bottom: 12px;">Use FDP Values for Your League</h2>
      <p style="font-size: 13px; color: #9b96b8; margin-bottom: 12px;">
        Fantasy Draft Pros provides trade values for every major dynasty format. Use our <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">trade calculator</a> during your startup draft and throughout the season to evaluate fair trades.
      </p>
      <p style="font-size: 13px; color: #9b96b8;">
        Our <a href="https://fantasydraftpros.com/dynasty-rankings/">dynasty rankings</a> are designed specifically for dynasty league strategy across 1QB, Superflex, TE Premium, and IDP formats.
      </p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}

export function generateLeagueFormatPageHtml(
  format: LeagueFormat,
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${format.name} Dynasty League Guide | Setup & Strategy | Fantasy Draft Pros</title>
  <meta name="description" content="${format.description} Learn how to set up a ${format.name} dynasty league, scoring settings, roster construction, and optimal strategy.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/dynasty-league-setup/${format.slug}/">
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${format.name} Dynasty League Setup",
    "description": "${format.description}",
    "author": {"@type": "Organization", "name": "Fantasy Draft Pros"}
  }</script>
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 8px; color: #fff; }
    .subtitle { font-size: 14px; color: #9b96b8; margin-bottom: 24px; }
    .section { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .section h2 { font-size: 20px; color: #7c4dff; margin-bottom: 16px; }
    .section p { font-size: 13px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .impact-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .impact-card { background: #2a2a35; border-radius: 8px; padding: 12px; border: 1px solid #444; }
    .impact-label { font-size: 11px; color: #9b96b8; margin-bottom: 4px; font-weight: 600; }
    .impact-value { font-size: 14px; color: #7c4dff; font-weight: 700; }
    .pros, .cons { margin: 16px 0; }
    .pros h3, .cons h3 { font-size: 14px; color: #7c4dff; margin-bottom: 8px; font-weight: 700; }
    .pros ul, .cons ul { margin-left: 20px; font-size: 13px; color: #9b96b8; line-height: 1.8; }
    a { color: #7c4dff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${format.name}</h1>
    <p class="subtitle">Complete guide to ${format.shortName} dynasty league setup and strategy</p>

    <div class="section">
      <h2>Format Overview</h2>
      <p>${format.description}</p>
      <p><strong>Setup Complexity:</strong> ${format.setupComplexity}</p>
      <p><strong>Recommended Team Size:</strong> ${format.recommendedTeamSize}</p>
    </div>

    <div class="section">
      <h2>Position Impact</h2>
      <div class="impact-grid">
        <div class="impact-card">
          <div class="impact-label">QB Impact</div>
          <div class="impact-value">${format.qbImpact}</div>
        </div>
        <div class="impact-card">
          <div class="impact-label">RB Impact</div>
          <div class="impact-value">${format.rbImpact}</div>
        </div>
        <div class="impact-card">
          <div class="impact-label">WR Impact</div>
          <div class="impact-value">${format.wrImpact}</div>
        </div>
        <div class="impact-card">
          <div class="impact-label">TE Impact</div>
          <div class="impact-value">${format.teImpact}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Advantages</h2>
      <div class="pros">
        <ul>
          ${format.advantages.map(adv => `<li>${adv}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Considerations</h2>
      <div class="cons">
        <ul>
          ${format.disadvantages.map(dis => `<li>${dis}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>League Setup Recommendations</h2>
      <p>
        When setting up your ${format.name} dynasty league:
      </p>
      <ul style="margin-left: 20px; font-size: 13px; color: #9b96b8; line-height: 1.8; margin-top: 12px;">
        <li>Start with 10-12 teams for balanced competition</li>
        <li>Use PPR or Half-PPR scoring for position balance</li>
        <li>Consider a taxi squad for prospect development</li>
        <li>Set a 1-2 week trade deadline before playoffs</li>
        <li>Use FDP Values for trade evaluation throughout the season</li>
      </ul>
    </div>

    <div class="section">
      <h2>Get Dynasty Values for This Format</h2>
      <p>
        Fantasy Draft Pros provides ${format.name}-specific valuations. Use our
        <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">trade calculator</a>
        to evaluate trades and plan your draft strategy.
      </p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
