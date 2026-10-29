/**
 * Extension Timing & Strategy
 * Strategic timing for player contract extensions
 */

export function generateExtensionTimingHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extension Timing Strategy | Contract Extensions | Fantasy Draft Pros</title>
  <meta name="description" content="Master extension timing and contract extension strategy. Learn when to extend stars and how to time extensions for cap optimization.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/strategy/extension-timing/">
  <script type="application/ld+json">{"@context": "https://schema.org", "@type": "Article", "headline": "Extension Timing Strategy"}</script>
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
    <h1>Extension Timing & Strategy</h1>
    <p class="subtitle">Strategic timing for player contract extensions</p>

    <div class="section">
      <h2>When to Extend Players</h2>
      <div class="box">
        <h3>Extend Early If:</h3>
        <ul>
          <li>Star player entering final contract year (negotiate before free agency)</li>
          <li>Young star showing elite production (lock in before value spikes)</li>
          <li>Player has injury concerns (negotiate while healthy)</li>
          <li>Market rates rising (sign early at lower rates)</li>
        </ul>
      </div>
      <div class="box">
        <h3>Delay Extension If:</h3>
        <ul>
          <li>Multiple years remaining (no urgency yet)</li>
          <li>Injury concerns pending (wait for medical clarity)</li>
          <li>Performance uncertain (prove production first)</li>
          <li>Cap space limited (wait for flexibility)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Extension Timing Scenarios</h2>
      <div class="box">
        <h3>Early Extension (2+ Years Before Free Agency)</h3>
        <ul>
          <li>Advantage: Lower salary (player has less leverage)</li>
          <li>Disadvantage: Cap space now vs. later</li>
          <li>Best for: Young stars, injury concerns, retention priority</li>
        </ul>
      </div>
      <div class="box">
        <h3>Timely Extension (1 Year Before Free Agency)</h3>
        <ul>
          <li>Advantage: Time to negotiate fairly, proven production</li>
          <li>Disadvantage: Higher salary (player has leverage)</li>
          <li>Best for: Established stars, strong cap position</li>
        </ul>
      </div>
      <div class="box">
        <h3>Last-Minute Extension (Final Contract Year)</h3>
        <ul>
          <li>Advantage: Proven performance data for negotiation</li>
          <li>Disadvantage: Maximum leverage for player (highest salary)</li>
          <li>Best for: Risk management (avoid free agency)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Extension Contract Structure</h2>
      <div class="box">
        <h3>Extension Years</h3>
        <ul>
          <li>2-3 year extension: Moderate commit, flexibility maintained</li>
          <li>4-5 year extension: Long-term commit, reduced flexibility</li>
          <li>6+ year extension: Max security, minimal flexibility</li>
        </ul>
      </div>
      <div class="box">
        <h3>Salary Structure</h3>
        <ul>
          <li>Front-loaded: More money early (star preference, higher immediate cap)</li>
          <li>Back-loaded: More money later (cap flexibility, player risk)</li>
          <li>Level: Equal yearly (fair split of risk)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Extension Cap Impact</h2>
      <div class="box">
        <h3>Cap Space vs. Extension Timing</h3>
        <ul>
          <li>Limited cap space: Extend early (spread out new money)</li>
          <li>Ample cap space: Extend later (more leverage for team)</li>
          <li>Uncertain cap: Extend with flexibility clauses (incentives)</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Multi-Star Extension Strategy</h2>
      <ul>
        <li>Prioritize elite stars (extension first)</li>
        <li>Stagger extensions (don't extend all stars same year)</li>
        <li>Plan reset years (when multiple stars become free agents)</li>
        <li>Maintain flexibility (keep some unextended players)</li>
      </ul>
    </div>

    <div class="section">
      <h2>Common Extension Mistakes</h2>
      <ul>
        <li>Extending underperformers (lock in declining players)</li>
        <li>Over-committing years (too much cap locked long-term)</li>
        <li>Delaying too long (losing negotiating leverage)</li>
        <li>Failing to plan reset years (all stars hit free agency together)</li>
      </ul>
    </div>

    <div class="section">
      <h2>Use FDP Values for Extension Decisions</h2>
      <p>Use our <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">trade calculator</a> to evaluate extension value. Compare star contract cost vs. production to ensure extensions are fair and cap-efficient.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
