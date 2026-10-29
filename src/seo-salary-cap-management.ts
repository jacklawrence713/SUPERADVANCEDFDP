/**
 * Salary Cap Management & Contract Strategy
 * Multi-year contract planning and cap efficiency
 */

export function generateSalaryCapManagementHubHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Salary Cap Management | Contract Strategy | Fantasy Draft Pros</title>
  <meta name="description" content="Salary cap management guide. Learn multi-year contract planning, dead cap navigation, and cap efficiency strategies.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/strategy/salary-cap-management/">
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
    .section ul { margin-left: 20px; font-size: 13px; color: #9b96b8; line-height: 1.8; }
    a { color: #7c4dff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Salary Cap Management</h1>
    <p style="color: #9b96b8; margin-bottom: 24px;">Master multi-year contract planning and cap efficiency</p>

    <div class="section">
      <h2>Cap Fundamentals</h2>
      <p><strong>Salary Cap:</strong> Annual spending limit (typically $250-300). All player contracts count against cap each year.</p>
      <p style="margin-top: 12px;"><strong>Dead Cap:</strong> Money owed to departed players. Counts against cap but provides no production. Dead cap limits future flexibility.</p>
      <p style="margin-top: 12px;"><strong>Cap Space:</strong> Remaining capacity for new signings/trades. Positive space allows acquisitions. Negative space (over cap) requires restructures or cuts.</p>
    </div>

    <div class="section">
      <h2>Contract Management Strategies</h2>
      
      <h3>Front-Load Years</h3>
      <p>Higher early-year cap hits, lower future years. Useful for aging stars nearing end of window. Frees future cap for younger players.</p>

      <h3>Back-Load Years</h3>
      <p>Lower early-year hits, higher future years. Spread cost over career. Risky if performance declines or player leaves.</p>

      <h3>Void Years</h3>
      <p>Contract extends beyond player career. Allows cap spreading but creates future dead cap if player released.</p>

      <h3>Restructures</h3>
      <p>Convert salary to bonus, spreading cost. Creates future dead cap but frees immediate space.</p>
    </div>

    <div class="section">
      <h2>Contention Window Planning</h2>
      <p>Align highest spending during contention years (ages 28-32 typically). During rebuilds, keep cap flexible. Lock in stars during prime years.</p>
    </div>

    <div class="section">
      <h2>Dead Cap Minimization</h2>
      <ul>
        <li>Avoid long-term deals for injury-prone players</li>
        <li>Plan cuts in advance for aging assets</li>
        <li>Use conditional contracts for uncertain performers</li>
        <li>Trade players early if declining to avoid dead cap</li>
      </ul>
    </div>

    <div class="section">
      <h2>Cap Space as Currency</h2>
      <p>Teams with cap space can acquire salary dumps + assets. Trading for overpaid players with value creates arbitrage opportunity.</p>
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`;
}
