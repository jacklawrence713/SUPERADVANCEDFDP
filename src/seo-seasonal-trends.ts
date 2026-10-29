/**
 * Seasonal Trends & Value Evolution Analysis
 * How dynasty values shift through seasons
 */

export function generateSeasonalTrendsHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seasonal Trends | Mid-Season Value Evolution | Fantasy Draft Pros</title>
  <meta name="description" content="Analyze seasonal trends in dynasty fantasy football. Understand value evolution, mid-season adjustments, and timing opportunities.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/analysis/seasonal-trends/">
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
    .timeline { background: #2a2a35; border-left: 3px solid #7c4dff; padding: 12px 16px; border-radius: 4px; margin: 12px 0; }
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Seasonal Trends & Value Evolution</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Understand how dynasty values shift throughout the season</p>

    <div class="section">
      <h2>Preseason Phase</h2>
      <div class="timeline">
        <strong>Key Dynamics:</strong> Hype cycles, draft capital allocation, unknown performance. Values in flux based on minimal data.
      </div>
      <p style="margin-top: 12px;">Strategy: Avoid panic trading. Preseason values highly speculative. Wait for Week 1-4 before major moves.</p>
    </div>

    <div class="section">
      <h2>Early Season (Weeks 1-4)</h2>
      <div class="timeline">
        <strong>Key Dynamics:</strong> Role clarity emerges, snap counts stabilize, true performance vs expectations revealed.
      </div>
      <p style="margin-top: 12px;">Strategy: Identify breakouts vs busts quickly. Early season underperformers become buy-lows. Surprise performers become sell-highs.</p>
    </div>

    <div class="section">
      <h2>Mid-Season (Weeks 5-10)</h2>
      <div class="timeline">
        <strong>Key Dynamics:</strong> Trade deadline approaches, injury toll mounts, playoff positioning clear. Values most fluid.
      </div>
      <p style="margin-top: 12px;">Strategy: Peak trading window. Contenders sell depth for stars. Rebuilds acquire picks. Buyers most aggressive.</p>
    </div>

    <div class="section">
      <h2>Trade Deadline & Playoff Push</h2>
      <div class="timeline">
        <strong>Key Dynamics:</strong> Deadline acquisitions, playoff seeding locked, injury reserves drain talent.
      </div>
      <p style="margin-top: 12px;">Strategy: Final contention moves. Injury backups valuable. Waiver activity peaks as teams scramble.</p>
    </div>

    <div class="section">
      <h2>Playoff Phase</h2>
      <div class="timeline">
        <strong>Key Dynamics:</strong> Short-term production matters. Consistency over upside. Championship window narrow.
      </div>
      <p style="margin-top: 12px;">Strategy: Stack playoff teams. Avoid new injuries. Stream for matchups.</p>
    </div>

    <div class="section">
      <h2>Offseason Value Reset</h2>
      <p>Post-championship, values reset based on full-season performance. Draft prospect rankings finalized. Next offseason trading begins immediately post-championship.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
