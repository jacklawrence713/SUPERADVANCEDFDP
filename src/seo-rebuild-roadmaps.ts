/**
 * Dynasty Rebuild Roadmaps
 * Multi-year rebuilding strategy frameworks
 */

export function generateRebuildRoadmapHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dynasty Rebuild Strategy | Multi-Year Roadmaps | Fantasy Draft Pros</title>
  <meta name="description" content="Dynasty rebuild strategy guides. Learn how to execute rebuilds, multi-year timelines, and transitioning back to contention.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/guides/rebuild-strategy/">
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 12px; color: #fff; }
    .section { background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .section h2 { font-size: 20px; color: #7c4dff; margin-bottom: 16px; }
    .section h3 { font-size: 16px; color: #7c4dff; margin: 16px 0 8px; }
    .section p { font-size: 13px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .section ul { margin-left: 20px; font-size: 13px; color: #9b96b8; line-height: 1.8; margin-bottom: 12px; }
    .timeline { background: #2a2a35; border-left: 3px solid #7c4dff; padding: 12px 16px; border-radius: 4px; margin: 12px 0; }
    .timeline-year { font-weight: 700; color: #fff; }
    .timeline-text { font-size: 12px; color: #9b96b8; margin-top: 4px; }
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Dynasty Rebuild Strategy</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Complete guide to planning and executing a multi-year rebuild</p>

    <div class="section">
      <h2>Understanding Rebuilds</h2>
      <p>A rebuild is a strategic shift toward accumulating young assets and draft capital, typically spanning 2-3 years. Rebuilds are most effective when:</p>
      <ul>
        <li>Your roster is aging without a clear contention window</li>
        <li>You have limited draft capital and need to reset</li>
        <li>You want to leverage your position for maximum youth/picks</li>
        <li>Your league allows multi-year planning</li>
      </ul>
    </div>

    <div class="section">
      <h2>The 3-Year Rebuild Timeline</h2>
      
      <div class="timeline">
        <div class="timeline-year">Year 1: Sell Phase</div>
        <div class="timeline-text">Trade aging stars for young players and 1st rounders. Build draft capital. Accept losing record. Target 30-40% of projected points.</div>
      </div>

      <div class="timeline">
        <div class="timeline-year">Year 2: Development Phase</div>
        <div class="timeline-text">Use accumulated picks. Develop young roster. Begin competitive signaling. Still expect below-average record (40-50% projected).</div>
      </div>

      <div class="timeline">
        <div class="timeline-year">Year 3: Transition Phase</div>
        <div class="timeline-text">Trade remaining assets for missing pieces. Develop core. Approach competitiveness (60-70% projected). Position for contention window.</div>
      </div>
    </div>

    <div class="section">
      <h2>Rebuild Strategy by Phase</h2>
      
      <h3>Phase 1: Sell High Assets</h3>
      <ul>
        <li>Identify players over 28-30 with declining trajectories</li>
        <li>Target teams in contention to maximize return</li>
        <li>Trade for future 1st rounders and young assets</li>
        <li>Consolidate depth into tradeable pieces</li>
      </ul>

      <h3>Phase 2: Draft and Develop</h3>
      <ul>
        <li>Use accumulated picks in top-heavy manner</li>
        <li>Prioritize positional value and athletic upside</li>
        <li>Give young players time to develop (2-3 seasons)</li>
        <li>Avoid trading young pieces prematurely</li>
      </ul>

      <h3>Phase 3: Contention Setup</h3>
      <ul>
        <li>Fill final gaps with proven veterans</li>
        <li>Trade to address weak positions</li>
        <li>Secure impact talent at premium positions</li>
        <li>Build depth around core young assets</li>
      </ul>
    </div>

    <div class="section">
      <h2>Common Rebuild Mistakes</h2>
      <ul>
        <li><strong>Selling too low:</strong> Panic selling aging stars. Hold for 1-2 more seasons to maximize return.</li>
        <li><strong>Trading young assets:</strong> Don't trade your young core during rebuilds. These are your future.</li>
        <li><strong>Impatience:</strong> Rebuilds take time. Don't abort early or give up on the plan.</li>
        <li><strong>Over-drafting:</strong> Avoid using every pick. Build trade ammunition for needed pieces.</li>
      </ul>
    </div>

    <div class="section">
      <h2>Rebuild Tools</h2>
      <p>Use these FDP tools to execute your rebuild:</p>
      <ul>
        <li><a href="https://fantasydraftpros.com/dynasty-trade-analyzer/">Trade Analyzer</a> - Evaluate rebuild trades fairly</li>
        <li><a href="https://fantasydraftpros.com/dynasty-rankings/">Rankings</a> - Identify rebuild targets</li>
        <li><a href="https://fantasydraftpros.com/dynasty-draft-pick-values/">Pick Values</a> - Understand draft capital worth</li>
      </ul>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
