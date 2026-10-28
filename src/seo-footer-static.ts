/**
 * Static SEO Footer Content (Phase 12)
 *
 * Simplified footer HTML for injection into all generated pages.
 * Avoids route dependency issues by using static links.
 */

export function getStaticSeoFooterHtml(): string {
  return `
  <footer style="background:#0a0913;color:#9b96b8;padding:48px 20px;margin-top:60px;border-top:1px solid #2a2837">
    <div style="max-width:1200px;margin:0 auto">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:32px;margin-bottom:48px;font-size:13px">
        
        <!-- Tools -->
        <div style="margin-bottom:16px">
          <h3 style="color:#7c4dff;font-size:14px;font-weight:700;margin:0 0 12px 0;text-transform:uppercase">Tools</h3>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px">
            <li><a href="/dynasty-trade-analyzer/" style="color:#7c4dff;text-decoration:none;font-size:13px">Trade Analyzer</a></li>
            <li><a href="/dynasty-trade-calculator/" style="color:#7c4dff;text-decoration:none;font-size:13px">Trade Calculator</a></li>
            <li><a href="/dynasty-trade-value-chart/" style="color:#7c4dff;text-decoration:none;font-size:13px">Value Chart</a></li>
            <li><a href="/superflex-trade-calculator/" style="color:#7c4dff;text-decoration:none;font-size:13px">Superflex Calc</a></li>
          </ul>
        </div>

        <!-- Rankings -->
        <div style="margin-bottom:16px">
          <h3 style="color:#7c4dff;font-size:14px;font-weight:700;margin:0 0 12px 0;text-transform:uppercase">Rankings</h3>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px">
            <li><a href="/dynasty-rankings/" style="color:#7c4dff;text-decoration:none;font-size:13px">Overall</a></li>
            <li><a href="/dynasty-qb-rankings/" style="color:#7c4dff;text-decoration:none;font-size:13px">QB Rankings</a></li>
            <li><a href="/dynasty-rb-rankings/" style="color:#7c4dff;text-decoration:none;font-size:13px">RB Rankings</a></li>
            <li><a href="/superflex-rankings/" style="color:#7c4dff;text-decoration:none;font-size:13px">Superflex</a></li>
          </ul>
        </div>

        <!-- Guides -->
        <div style="margin-bottom:16px">
          <h3 style="color:#7c4dff;font-size:14px;font-weight:700;margin:0 0 12px 0;text-transform:uppercase">Guides</h3>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px">
            <li><a href="/guides/" style="color:#7c4dff;text-decoration:none;font-size:13px">Guides Hub</a></li>
            <li><a href="/guides/how-to-value-a-dynasty-trade/" style="color:#7c4dff;text-decoration:none;font-size:13px">Trade Valuation</a></li>
            <li><a href="/guides/superflex-strategy/" style="color:#7c4dff;text-decoration:none;font-size:13px">Superflex Guide</a></li>
            <li><a href="/dynasty-buy-low/" style="color:#7c4dff;text-decoration:none;font-size:13px">Buy-Low Players</a></li>
          </ul>
        </div>

        <!-- Resources -->
        <div style="margin-bottom:16px">
          <h3 style="color:#7c4dff;font-size:14px;font-weight:700;margin:0 0 12px 0;text-transform:uppercase">Resources</h3>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px">
            <li><a href="/players/" style="color:#7c4dff;text-decoration:none;font-size:13px">Player Directory</a></li>
            <li><a href="/about/" style="color:#7c4dff;text-decoration:none;font-size:13px">About FDP</a></li>
            <li><a href="/methodology/" style="color:#7c4dff;text-decoration:none;font-size:13px">Methodology</a></li>
            <li><a href="/dynasty-fantasy-football/" style="color:#7c4dff;text-decoration:none;font-size:13px">Dynasty Hub</a></li>
          </ul>
        </div>
      </div>

      <div style="border-top:1px solid #2a2837;padding-top:24px;font-size:12px;color:#6b6580">
        <p style="margin:0 0 8px 0">Fantasy Draft Pros helps dynasty coaches make better decisions. Trade analyzer, rankings, guides, and FDP Values for 1,000+ players across 1QB, Superflex, TE Premium, and IDP leagues.</p>
        <p style="margin:0">© ${new Date().getFullYear()} Fantasy Draft Pros. Not affiliated with NFL, ESPN, Sleeper, or any sportsbook.</p>
      </div>
    </div>
  </footer>
  `
}
