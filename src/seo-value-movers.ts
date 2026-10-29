/**
 * Dynasty Value Movers Page
 *
 * Aggregate of biggest value risers and fallers.
 * Requires historical value snapshots.
 * For now, creates infrastructure for future snapshots.
 */

export interface ValueMover {
  name: string
  pos: string
  team: string
  slug: string
  currentVal: number
  previousVal?: number
  change?: number
  pctChange?: number
}

export function generateValueMoversHtml(
  risers: ValueMover[],
  fallers: ValueMover[],
  valuesDate: string,
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  const riserRows = risers
    .slice(0, 20)
    .map((p, i) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #333;color:#7c4dff">${i + 1}</td>
      <td style="padding:8px;border-bottom:1px solid #333"><a href="https://fantasydraftpros.com/players/${p.slug}/" style="color:#7c4dff;text-decoration:none">${escapeHtml(p.name)}</a></td>
      <td style="padding:8px;border-bottom:1px solid #333">${p.pos}</td>
      <td style="padding:8px;border-bottom:1px solid #333">${p.team}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right;color:#22c55e">${p.currentVal.toLocaleString()}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right;color:#22c55e">+${(p.change || 0).toLocaleString()}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right;color:#22c55e">+${((p.pctChange || 0) * 100).toFixed(1)}%</td>
    </tr>`)
    .join('')

  const fallerRows = fallers
    .slice(0, 20)
    .map((p, i) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #333;color:#7c4dff">${i + 1}</td>
      <td style="padding:8px;border-bottom:1px solid #333"><a href="https://fantasydraftpros.com/players/${p.slug}/" style="color:#7c4dff;text-decoration:none">${escapeHtml(p.name)}</a></td>
      <td style="padding:8px;border-bottom:1px solid #333">${p.pos}</td>
      <td style="padding:8px;border-bottom:1px solid #333">${p.team}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right;color:#ef4444">${p.currentVal.toLocaleString()}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right;color:#ef4444">${(p.change || 0).toLocaleString()}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right;color:#ef4444">${((p.pctChange || 0) * 100).toFixed(1)}%</td>
    </tr>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dynasty Value Movers | Biggest Risers & Fallers | Fantasy Draft Pros</title>
  <meta name="description" content="See which dynasty players are rising and falling in FDP Value. Track the biggest value movers in dynasty fantasy football.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/dynasty-value-movers/">
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://fantasydraftpros.com"},
      {"@type": "ListItem", "position": 2, "name": "Dynasty Value Movers", "item": "https://fantasydraftpros.com/dynasty-value-movers/"}
    ]
  }</script>
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #fff; }
    .subtitle { font-size: 14px; color: #9b96b8; margin-bottom: 20px; }
    .section { margin-bottom: 32px; background: #1a1a24; border-radius: 12px; padding: 20px; border: 1px solid #333; }
    .section h2 { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #7c4dff; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #7c4dff; font-weight: 700; font-size: 12px; color: #7c4dff; }
    td { padding: 8px; }
    .riser { color: #22c55e; }
    .faller { color: #ef4444; }
    .updated { font-size: 12px; color: #9b96b8; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Dynasty Value Movers</h1>
    <p class="subtitle">Track the biggest risers and fallers in dynasty fantasy football</p>

    <div class="section">
      <h2 style="color:#22c55e">📈 Biggest Risers</h2>
      <p style="margin-bottom:16px;font-size:14px;color:#9b96b8">Players gaining the most value</p>
      ${
        riserRows
          ? `<table>
        <thead><tr><th>#</th><th>Player</th><th>Pos</th><th>Team</th><th>Current Value</th><th>Change</th><th>% Change</th></tr></thead>
        <tbody>${riserRows}</tbody>
      </table>`
          : '<p style="color:#9b96b8;font-size:14px">Historical value snapshots not yet available. Check back soon.</p>'
      }
    </div>

    <div class="section">
      <h2 style="color:#ef4444">📉 Biggest Fallers</h2>
      <p style="margin-bottom:16px;font-size:14px;color:#9b96b8">Players losing the most value</p>
      ${
        fallerRows
          ? `<table>
        <thead><tr><th>#</th><th>Player</th><th>Pos</th><th>Team</th><th>Current Value</th><th>Change</th><th>% Change</th></tr></thead>
        <tbody>${fallerRows}</tbody>
      </table>`
          : '<p style="color:#9b96b8;font-size:14px">Historical value snapshots not yet available. Check back soon.</p>'
      }
    </div>

    <div class="section">
      <h2>About Value Movers</h2>
      <p style="font-size:14px;line-height:1.8;color:#9b96b8">
        Value movers show which dynasty players have gained or lost the most FDP Value recently.
        This data requires historical value snapshots, which are being collected going forward.
      </p>
      <p style="font-size:14px;line-height:1.8;color:#9b96b8;margin-top:12px">
        Use the <a href="https://fantasydraftpros.com/dynasty-trade-analyzer/" style="color:#7c4dff">Trade Analyzer</a> to evaluate any player trade.
      </p>
    </div>

    <p class="updated">Values as of: ${valuesDate}</p>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, m => map[m])
}
