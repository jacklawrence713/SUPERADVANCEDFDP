/**
 * Salary Cap Projections & Multi-Year Planning
 * Long-term cap planning and financial forecasting
 */

export function generateCapProjectionsHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Salary Cap Projections | Multi-Year Planning | Fantasy Draft Pros</title>
  <meta name="description" content="Master salary cap projections and multi-year financial planning. Learn to forecast cap needs and plan long-term contract strategy.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/strategy/cap-projections/">
  <script type="application/ld+json">{"@context": "https://schema.org", "@type": "Article", "headline": "Cap Projections Strategy"}</script>
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
    <h1>Salary Cap Projections & Multi-Year Planning</h1>
    <p class="subtitle">Forecast cap needs and plan long-term financial strategy</p>

    <div class="section">
      <h2>Understanding Cap Projections</h2>
      <p>Cap projections estimate future salary cap availability based on existing contracts, pending free agents, and expected signings.</p>
      <div class="box">
        <h3>Components of Cap Projection</h3>
        <ul>
          <li>Estimated salary cap (grows ~5-10% annually)</li>
          <li>Existing contract obligations (known future costs)</li>
          <li>Dead cap commitments (spreading from past restructures)</li>
          <li>Expected draft class spending</li>
          <li>Free agent re-signing budget</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Multi-Year Cap Planning</h2>
      <div class="box">
        <h3>Year 1 (Current Year) Planning</h3>
        <ul>
          <li>Maximize competitive window (spend to ceiling if contending)</li>
          <li>Front-load spending (sign stars early in year)</li>
          <li>Use restructures if needed (convert salary to bonus)</li>
        </ul>
      </div>
      <div class="box">
        <h3>Years 2-3 (Medium-Term) Planning</h3>
        <ul>
          <li>Balance star retention vs. rebuilding needs</li>
          <li>Plan extension timing (when to extend aging stars)</li>
          <li>Manage dead cap from year 1 decisions</li>
          <li>Prepare for free agent departures</li>
        </ul>
      </div>
      <div class="box">
        <h3>Years 4+ (Long-Term) Planning</h3>
        <ul>
          <li>Reset with young core (post-contention plan)</li>
          <li>Plan rookies and prospects (future cap allocation)</li>
          <li>Minimize dead cap (clean slate)</li>
          <li>Build for next contention window</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Cap Floor & Ceiling Management</h2>
      <div class="box">
        <h3>Cap Floor Strategy (Minimum Spend)</h3>
        <ul>
          <li>Most leagues require spending 90% of cap</li>
          <li>Plan minimum spending to meet floor</li>
          <li>Avoid penalties for under-spending</li>
          <li>Use depth signings if approaching floor</li>
        </ul>
      </div>
      <div class="box">
        <h3>Cap Ceiling Strategy (Maximum Spend)</h3>
        <ul>
          <li>Don't exceed cap ceiling (automatic penalties)</li>
          <li>Plan major signings within ceiling limits</li>
          <li>Monitor spending pace through year</li>
          <li>Use restructures to stay under ceiling</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Cap Projection Scenarios</h2>
      <div class="box">
        <h3>Best Case (Optimistic)</h3>
        <ul>
          <li>Assume high free agent retention</li>
          <li>Stars stay healthy (no restructures needed)</li>
          <li>Cap grows faster than expected</li>
          <li>Result: More spending flexibility</li>
        </ul>
      </div>
      <div class="box">
        <h3>Base Case (Realistic)</h3>
        <ul>
          <li>Some free agents leave</li>
          <li>Normal injuries (minor restructures)</li>
          <li>Cap growth as expected</li>
          <li>Result: Balanced spending plan</li>
        </ul>
      </div>
      <div class="box">
        <h3>Worst Case (Conservative)</h3>
        <ul>
          <li>Key free agents depart</li>
          <li>Star injuries (major restructures needed)</li>
          <li>Cap growth slower than expected</li>
          <li>Result: Significant cap constraints</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>Using Projections for Strategy</h2>
      <ul>
        <li>Contending teams: Spend to ceiling (maximize chances)</li>
        <li>Rebuilding teams: Target cap flexibility (draft prospects)</li>
        <li>Transitioning teams: Plan extension timing (manage stars strategically)</li>
        <li>All teams: Monitor projections quarterly (adjust as data changes)</li>
      </ul>
    </div>

    <div class="section">
      <h2>Common Projection Mistakes</h2>
      <ul>
        <li>Ignoring dead cap (underestimating future obligations)</li>
        <li>Overestimating free agent retention (plan for departures)</li>
        <li>Failing to account for draft class costs</li>
        <li>Not planning for injuries (star injuries require restructures)</li>
      </ul>
    </div>

    <div class="section">
      <h2>Use FDP Values for Cap Planning</h2>
      <p>Use our <a href="https://fantasydraftpros.com/dynasty-trade-calculator/">trade calculator</a> to evaluate contract value vs. player production. Identify cap-inefficient contracts for restructuring or trading.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
