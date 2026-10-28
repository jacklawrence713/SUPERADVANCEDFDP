/**
 * Strategy Pages (Phase 8)
 *
 * Data-driven strategy pages:
 * - Buy-Low candidates
 * - Sell-High candidates
 * - Draft Pick Values
 *
 * These use real player data from the app.
 */

import { SeoRankedPlayer } from './seo-data'

/**
 * Generate Buy-Low candidates page
 */
export function generateBuyLowHtml(
  topPlayers: SeoRankedPlayer[],
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  // Select undervalued players (low age, good value)
  const buyLow = topPlayers
    .filter(p => p.age <= 24 && p.tradeVal >= 500)
    .slice(0, 30)

  const playerRows = buyLow
    .map(
      p => `
    <tr style="border-bottom:1px solid #2a2837">
      <td style="padding:12px"><a href="/players/${p.slug}/" style="color:#7c4dff;text-decoration:none;font-weight:600">${escapeHtml(p.name)}</a></td>
      <td style="padding:12px;text-align:center;color:#9b96b8">${p.pos}</td>
      <td style="padding:12px;text-align:center;color:#9b96b8">${p.team}</td>
      <td style="padding:12px;text-align:center;color:#9b96b8">${p.age}</td>
      <td style="padding:12px;text-align:right;font-weight:600;color:#7c4dff">${p.tradeVal.toLocaleString('en-US')}</td>
      <td style="padding:12px;text-align:center;font-size:12px;color:#6b6580">#${p.rank}</td>
    </tr>
  `
    )
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dynasty Buy-Low Candidates | Undervalued Players with Upside</title>
  <meta name="description" content="Discover dynasty buy-low candidates. Young players with excellent upside valued below peak. Find trade targets at a discount with FDP Values." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://fantasydraftpros.com/dynasty-buy-low/" />
  <meta property="og:title" content="Dynasty Buy-Low Candidates" />
  <meta property="og:url" content="https://fantasydraftpros.com/dynasty-buy-low/" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <div id="root">
    <div style="background:#13111e;color:#e0dce8;padding:40px 20px">
      <div style="max-width:1000px;margin:0 auto">
        <h1 style="color:#7c4dff;font-size:32px;margin:0 0 12px 0">Dynasty Buy-Low Candidates</h1>
        <p style="color:#9b96b8;font-size:14px;margin:0 0 24px 0">Young players with excellent upside valued below peak</p>

        <div style="background:#1a1825;padding:16px;border-radius:8px;margin-bottom:24px">
          <p style="color:#9b96b8;font-size:14px;margin:0">Buy-low players have strong future outlook but are currently undervalued. Look for young talent (age 24 or under) with proven production. These players offer the best risk/reward in dynasty trade markets.</p>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
          <thead>
            <tr style="border-bottom:2px solid #3a3649">
              <th style="padding:12px;text-align:left;color:#7c4dff;font-weight:600;font-size:12px">Player</th>
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Pos</th>
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Team</th>
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Age</th>
              <th style="padding:12px;text-align:right;color:#7c4dff;font-weight:600;font-size:12px">Value</th>
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Rank</th>
            </tr>
          </thead>
          <tbody>${playerRows}</tbody>
        </table>

        <div style="background:#1a1825;padding:16px;border-radius:8px">
          <a href="/dynasty-trade-analyzer/" style="color:#7c4dff;text-decoration:none;font-weight:600">→ Analyze trades with buy-low players</a>
        </div>
      </div>
    </div>
  </div>
  ${appScripts}
</body>
</html>`
}

/**
 * Generate Sell-High candidates page
 */
export function generateSellHighHtml(
  topPlayers: SeoRankedPlayer[],
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  // Select peak-value players (age 28+, high value, established production)
  const sellHigh = topPlayers
    .filter(p => p.age >= 27 && p.tradeVal >= 1500)
    .slice(0, 30)

  const playerRows = sellHigh
    .map(
      p => `
    <tr style="border-bottom:1px solid #2a2837">
      <td style="padding:12px"><a href="/players/${p.slug}/" style="color:#7c4dff;text-decoration:none;font-weight:600">${escapeHtml(p.name)}</a></td>
      <td style="padding:12px;text-align:center;color:#9b96b8">${p.pos}</td>
      <td style="padding:12px;text-align:center;color:#9b96b8">${p.team}</td>
      <td style="padding:12px;text-align:center;color:#9b96b8">${p.age}</td>
      <td style="padding:12px;text-align:right;font-weight:600;color:#7c4dff">${p.tradeVal.toLocaleString('en-US')}</td>
      <td style="padding:12px;text-align:center;font-size:12px;color:#6b6580">#${p.rank}</td>
    </tr>
  `
    )
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dynasty Sell-High Candidates | Peak Value Players</title>
  <meta name="description" content="Identify dynasty sell-high candidates at peak value. Veteran players approaching decline with maximum trade value. Time to maximize returns." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://fantasydraftpros.com/dynasty-sell-high/" />
  <meta property="og:title" content="Dynasty Sell-High Candidates" />
  <meta property="og:url" content="https://fantasydraftpros.com/dynasty-sell-high/" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <div id="root">
    <div style="background:#13111e;color:#e0dce8;padding:40px 20px">
      <div style="max-width:1000px;margin:0 auto">
        <h1 style="color:#7c4dff;font-size:32px;margin:0 0 12px 0">Dynasty Sell-High Candidates</h1>
        <p style="color:#9b96b8;font-size:14px;margin:0 0 24px 0">Veteran players at peak value before potential decline</p>

        <div style="background:#1a1825;padding:16px;border-radius:8px;margin-bottom:24px">
          <p style="color:#9b96b8;font-size:14px;margin:0">Sell-high candidates are established stars reaching the tail end of their peak production years. These players have maximum trade value now before age-related decline. Strategic sellers maximize the return on aging assets.</p>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
          <thead>
            <tr style="border-bottom:2px solid #3a3649">
              <th style="padding:12px;text-align:left;color:#7c4dff;font-weight:600;font-size:12px">Player</th>
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Pos</th>
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Team</th>
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Age</th>
              <th style="padding:12px;text-align:right;color:#7c4dff;font-weight:600;font-size:12px">Value</th>
              <th style="padding:12px;text-align:center;color:#7c4dff;font-weight:600;font-size:12px">Rank</th>
            </tr>
          </thead>
          <tbody>${playerRows}</tbody>
        </table>

        <div style="background:#1a1825;padding:16px;border-radius:8px">
          <a href="/dynasty-trade-analyzer/" style="color:#7c4dff;text-decoration:none;font-weight:600">→ Find trade partners for sell-high deals</a>
        </div>
      </div>
    </div>
  </div>
  ${appScripts}
</body>
</html>`
}

/**
 * Generate Draft Pick Values page
 */
export function generateDraftPickValuesHtml(
  topPlayers: SeoRankedPlayer[],
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  // Get early, mid, late 1st round equivalents
  const early1st = topPlayers.slice(0, 3)
  const mid1st = topPlayers.slice(5, 8)
  const late1st = topPlayers.slice(10, 13)
  const early2nd = topPlayers.slice(15, 18)

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dynasty Draft Pick Values | 2026-2028 Pick Trade Values</title>
  <meta name="description" content="Dynasty draft pick trade values for 2026, 2027, 2028. Compare draft picks to player values and identify pick trade opportunities." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://fantasydraftpros.com/dynasty-draft-pick-values/" />
  <meta property="og:title" content="Dynasty Draft Pick Values" />
  <meta property="og:url" content="https://fantasydraftpros.com/dynasty-draft-pick-values/" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <div id="root">
    <div style="background:#13111e;color:#e0dce8;padding:40px 20px">
      <div style="max-width:1000px;margin:0 auto">
        <h1 style="color:#7c4dff;font-size:32px;margin:0 0 12px 0">Dynasty Draft Pick Values</h1>
        <p style="color:#9b96b8;font-size:14px;margin:0 0 24px 0">Compare 2026-2028 draft picks to player trade values</p>

        <div style="background:#1a1825;padding:16px;border-radius:8px;margin-bottom:32px">
          <p style="color:#9b96b8;font-size:14px;margin:0">Draft picks are future assets in the dynasty trade market. Use these equivalencies to compare picks against established players in trades.</p>
        </div>

        <section style="margin-bottom:32px">
          <h2 style="color:#7c4dff;font-size:20px;margin:0 0 16px 0">2026 Early 1st Round</h2>
          <div style="background:#1a1825;padding:16px;border-radius:8px">
            <p style="color:#9b96b8;font-size:13px;margin:0 0 12px 0">Equivalent to these players:</p>
            <ul style="list-style:none;padding:0;margin:0">
              ${early1st.map(p => `<li style="padding:8px 0;border-bottom:1px solid #2a2837"><a href="/players/${p.slug}/" style="color:#7c4dff;text-decoration:none">${escapeHtml(p.name)}</a> <span style="color:#6b6580">(${p.pos} · ${p.team})</span> - <strong style="color:#7c4dff">${p.tradeVal.toLocaleString()}</strong></li>`).join('')}
            </ul>
          </div>
        </section>

        <section style="margin-bottom:32px">
          <h2 style="color:#7c4dff;font-size:20px;margin:0 0 16px 0">2026 Mid 1st Round</h2>
          <div style="background:#1a1825;padding:16px;border-radius:8px">
            <p style="color:#9b96b8;font-size:13px;margin:0 0 12px 0">Equivalent to these players:</p>
            <ul style="list-style:none;padding:0;margin:0">
              ${mid1st.map(p => `<li style="padding:8px 0;border-bottom:1px solid #2a2837"><a href="/players/${p.slug}/" style="color:#7c4dff;text-decoration:none">${escapeHtml(p.name)}</a> <span style="color:#6b6580">(${p.pos} · ${p.team})</span> - <strong style="color:#7c4dff">${p.tradeVal.toLocaleString()}</strong></li>`).join('')}
            </ul>
          </div>
        </section>

        <section style="margin-bottom:32px">
          <h2 style="color:#7c4dff;font-size:20px;margin:0 0 16px 0">2026 Late 1st Round</h2>
          <div style="background:#1a1825;padding:16px;border-radius:8px">
            <p style="color:#9b96b8;font-size:13px;margin:0 0 12px 0">Equivalent to these players:</p>
            <ul style="list-style:none;padding:0;margin:0">
              ${late1st.map(p => `<li style="padding:8px 0;border-bottom:1px solid #2a2837"><a href="/players/${p.slug}/" style="color:#7c4dff;text-decoration:none">${escapeHtml(p.name)}</a> <span style="color:#6b6580">(${p.pos} · ${p.team})</span> - <strong style="color:#7c4dff">${p.tradeVal.toLocaleString()}</strong></li>`).join('')}
            </ul>
          </div>
        </section>

        <section style="margin-bottom:32px">
          <h2 style="color:#7c4dff;font-size:20px;margin:0 0 16px 0">2026 Early 2nd Round</h2>
          <div style="background:#1a1825;padding:16px;border-radius:8px">
            <p style="color:#9b96b8;font-size:13px;margin:0 0 12px 0">Equivalent to these players:</p>
            <ul style="list-style:none;padding:0;margin:0">
              ${early2nd.map(p => `<li style="padding:8px 0;border-bottom:1px solid #2a2837"><a href="/players/${p.slug}/" style="color:#7c4dff;text-decoration:none">${escapeHtml(p.name)}</a> <span style="color:#6b6580">(${p.pos} · ${p.team})</span> - <strong style="color:#7c4dff">${p.tradeVal.toLocaleString()}</strong></li>`).join('')}
            </ul>
          </div>
        </section>

        <div style="background:#1a1825;padding:16px;border-radius:8px">
          <a href="/dynasty-trade-calculator/" style="color:#7c4dff;text-decoration:none;font-weight:600">→ Use calculator for custom pick comparisons</a>
        </div>
      </div>
    </div>
  </div>
  ${appScripts}
</body>
</html>`
}

/**
 * Escape HTML
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, m => map[m])
}
