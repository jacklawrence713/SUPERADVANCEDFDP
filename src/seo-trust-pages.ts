/**
 * Trust & Authority Pages (Phase 9)
 *
 * Build institutional credibility:
 * - /about/ — What is Fantasy Draft Pros
 * - /methodology/ — How FDP Value works
 * - /editorial-policy/ — Data integrity and independence
 */

/**
 * Generate About page
 */
export function generateAboutHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>About Fantasy Draft Pros | Dynasty Trade Valuation Tool</title>
  <meta name="description" content="Fantasy Draft Pros is a dynasty trade calculator and player valuation platform. Learn what we do, which league formats we support, and how we calculate values." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://fantasydraftpros.com/about/" />
  <meta property="og:title" content="About Fantasy Draft Pros" />
  <meta property="og:url" content="https://fantasydraftpros.com/about/" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <div id="root">
    <div style="background:#13111e;color:#e0dce8;padding:60px 20px">
      <div style="max-width:900px;margin:0 auto">
        <nav style="font-size:12px;color:#9b96b8;margin-bottom:32px">
          <a href="/" style="color:#7c4dff;text-decoration:none">Fantasy Draft Pros</a>
          <span style="color:#6b6580"> / </span>
          <span>About</span>
        </nav>

        <h1 style="color:#7c4dff;font-size:40px;margin:0 0 16px 0">About Fantasy Draft Pros</h1>
        <p style="font-size:16px;color:#9b96b8;margin:0 0 32px 0">Dynasty trade calculator and player valuation platform</p>

        <!-- What We Do -->
        <section style="margin-bottom:48px">
          <h2 style="color:#7c4dff;font-size:28px;margin:0 0 16px 0">What We Do</h2>
          <p style="font-size:16px;color:#e0dce8;line-height:1.8;margin:0 0 12px 0">Fantasy Draft Pros is a comprehensive dynasty fantasy football platform designed to help league members make better trading decisions through data-driven player valuations.</p>
          <p style="font-size:16px;color:#e0dce8;line-height:1.8;margin:0">We provide real-time trade analysis, player rankings, and strategic tools to navigate dynasty leagues across all popular scoring formats and league configurations.</p>
        </section>

        <!-- Core Tools -->
        <section style="margin-bottom:48px;background:#1a1825;padding:32px;border-radius:8px;border-left:4px solid #7c4dff">
          <h2 style="color:#7c4dff;font-size:24px;margin:0 0 24px 0">Core Tools</h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
            <div>
              <h3 style="color:#7c4dff;font-size:16px;margin:0 0 8px 0">Trade Analyzer</h3>
              <p style="color:#9b96b8;font-size:14px;line-height:1.6;margin:0">Evaluate any proposed trade instantly using real FDP Values. See trade fairness, get suggestions for improvements, and refine your strategy.</p>
            </div>
            <div>
              <h3 style="color:#7c4dff;font-size:16px;margin:0 0 8px 0">Player Valuation</h3>
              <p style="color:#9b96b8;font-size:14px;line-height:1.6;margin:0">Browse 1,000+ players with age-adjusted dynasty values. Sort by position, team, age, or value. Explore comparable players.</p>
            </div>
            <div>
              <h3 style="color:#7c4dff;font-size:16px;margin:0 0 8px 0">Rankings</h3>
              <p style="color:#9b96b8;font-size:14px;line-height:1.6;margin:0">Current-year dynasty rankings for all positions. Available in multiple format configurations with real-time updates.</p>
            </div>
            <div>
              <h3 style="color:#7c4dff;font-size:16px;margin:0 0 8px 0">Strategy Insights</h3>
              <p style="color:#9b96b8;font-size:14px;line-height:1.6;margin:0">Buy-low candidates, sell-high opportunities, and draft pick value comparisons. Data-driven strategy recommendations.</p>
            </div>
          </div>
        </section>

        <!-- League Formats -->
        <section style="margin-bottom:48px">
          <h2 style="color:#7c4dff;font-size:24px;margin:0 0 24px 0">League Formats Supported</h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div style="background:#1a1825;padding:20px;border-radius:8px">
              <h3 style="color:#7c4dff;font-size:14px;margin:0 0 8px 0;font-weight:700">Standard Dynasty (1QB)</h3>
              <ul style="list-style:none;padding:0;margin:0;color:#9b96b8;font-size:13px">
                <li style="padding:4px 0">PPR, Half PPR, Standard</li>
                <li style="padding:4px 0">Full IDP support</li>
                <li style="padding:4px 0">2-16 team leagues</li>
              </ul>
            </div>
            <div style="background:#1a1825;padding:20px;border-radius:8px">
              <h3 style="color:#7c4dff;font-size:14px;margin:0 0 8px 0;font-weight:700">Superflex (2QB)</h3>
              <ul style="list-style:none;padding:0;margin:0;color:#9b96b8;font-size:13px">
                <li style="padding:4px 0">QB value adjustments</li>
                <li style="padding:4px 0">Early pick modeling</li>
                <li style="padding:4px 0">SF-specific rankings</li>
              </ul>
            </div>
            <div style="background:#1a1825;padding:20px;border-radius:8px">
              <h3 style="color:#7c4dff;font-size:14px;margin:0 0 8px 0;font-weight:700">TE Premium</h3>
              <ul style="list-style:none;padding:0;margin:0;color:#9b96b8;font-size:13px">
                <li style="padding:4px 0">Configurable TE boost</li>
                <li style="padding:4px 0">Scarcity modeling</li>
                <li style="padding:4px 0">TEP rankings</li>
              </ul>
            </div>
            <div style="background:#1a1825;padding:20px;border-radius:8px">
              <h3 style="color:#7c4dff;font-size:14px;margin:0 0 8px 0;font-weight:700">IDP Leagues</h3>
              <ul style="list-style:none;padding:0;margin:0;color:#9b96b8;font-size:13px">
                <li style="padding:4px 0">DL, LB, DB rankings</li>
                <li style="padding:4px 0">Defensive scoring</li>
                <li style="padding:4px 0">Position scarcity</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Platform Features -->
        <section style="margin-bottom:48px">
          <h2 style="color:#7c4dff;font-size:24px;margin:0 0 16px 0">Platform Features</h2>
          <ul style="list-style:none;padding:0;margin:0;color:#e0dce8;font-size:14px">
            <li style="padding:12px 0;border-bottom:1px solid #2a2837">✓ Real-time trade evaluation with instant fairness assessment</li>
            <li style="padding:12px 0;border-bottom:1px solid #2a2837">✓ 1,000+ dynasty players with current valuations</li>
            <li style="padding:12px 0;border-bottom:1px solid #2a2837">✓ Multiple scoring format support (PPR, Half, Standard)</li>
            <li style="padding:12px 0;border-bottom:1px solid #2a2837">✓ Comparable player suggestions based on value</li>
            <li style="padding:12px 0;border-bottom:1px solid #2a2837">✓ Draft pick value comparisons (2024-2026)</li>
            <li style="padding:12px 0;border-bottom:1px solid #2a2837">✓ Buy-low and sell-high analysis</li>
            <li style="padding:12px 0;border-bottom:1px solid #2a2837">✓ Position-specific and superflex rankings</li>
            <li style="padding:12px 0">✓ Strategy guides and trade education</li>
          </ul>
        </section>

        <!-- Not Affiliated -->
        <section style="background:#1a1825;padding:20px;border-radius:8px;border-left:4px solid #f59e0b">
          <p style="color:#9b96b8;font-size:13px;margin:0"><strong>Note:</strong> Fantasy Draft Pros is an independent platform. We are not affiliated with the NFL, ESPN, Sleeper, Yahoo Sports, or any sportsbook. All player valuations are proprietary calculations.</p>
        </section>

        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #2a2837">
          <p style="color:#9b96b8;font-size:13px;margin:0">Learn more about our <a href="/methodology/" style="color:#7c4dff">valuation methodology</a> or read our <a href="/editorial-policy/" style="color:#7c4dff">editorial policy</a>.</p>
        </div>
      </div>
    </div>
  </div>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Fantasy Draft Pros",
    "url": "https://fantasydraftpros.com",
    "description": "Dynasty fantasy football trade calculator and player valuation platform",
    "logo": "https://fantasydraftpros.com/logo-shield.png",
    "sameAs": []
  }
  </script>

  ${appScripts}
</body>
</html>`
}

/**
 * Generate Methodology page
 */
export function generateMethodologyHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FDP Valuation Methodology | How We Calculate Dynasty Player Values</title>
  <meta name="description" content="Learn how FDP Value works. Our methodology uses age adjustments, positional scarcity, and scoring format impacts to value 1,000+ dynasty players on a 0-9,999 scale." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://fantasydraftpros.com/methodology/" />
  <meta property="og:title" content="FDP Valuation Methodology" />
  <meta property="og:url" content="https://fantasydraftpros.com/methodology/" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <div id="root">
    <div style="background:#13111e;color:#e0dce8;padding:60px 20px">
      <div style="max-width:900px;margin:0 auto">
        <nav style="font-size:12px;color:#9b96b8;margin-bottom:32px">
          <a href="/" style="color:#7c4dff;text-decoration:none">Fantasy Draft Pros</a>
          <span style="color:#6b6580"> / </span>
          <span>Methodology</span>
        </nav>

        <h1 style="color:#7c4dff;font-size:40px;margin:0 0 16px 0">FDP Valuation Methodology</h1>
        <p style="font-size:16px;color:#9b96b8;margin:0 0 32px 0">How we calculate dynasty player values</p>

        <!-- The Scale -->
        <section style="margin-bottom:48px">
          <h2 style="color:#7c4dff;font-size:28px;margin:0 0 16px 0">The FDP Value Scale</h2>
          <p style="font-size:16px;color:#e0dce8;line-height:1.8;margin:0 0 16px 0">FDP Value uses a 0–9,999 scale to rank all dynasty fantasy football players. This scale represents relative trade value in dynasty leagues:</p>
          <div style="background:#1a1825;padding:24px;border-radius:8px;margin:0">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
              <div>
                <div style="font-size:14px;color:#7c4dff;font-weight:700;margin-bottom:4px">Top Tier (8000+)</div>
                <p style="font-size:13px;color:#9b96b8;margin:0">Elite players commanding peak trade value. This tier includes top-5 overall players and rare positional talents.</p>
              </div>
              <div>
                <div style="font-size:14px;color:#7c4dff;font-weight:700;margin-bottom:4px">Starter Tier (3000–7999)</div>
                <p style="font-size:13px;color:#9b96b8;margin:0">Reliable weekly producers with meaningful dynasty value. Bulk of active trade market.</p>
              </div>
              <div>
                <div style="font-size:14px;color:#7c4dff;font-weight:700;margin-bottom:4px">Bench Tier (1000–2999)</div>
                <p style="font-size:13px;color:#9b96b8;margin:0">Developmental prospects and veterans in decline. Useful depth players.</p>
              </div>
              <div>
                <div style="font-size:14px;color:#7c4dff;font-weight:700;margin-bottom:4px">Speculative (0–999)</div>
                <p style="font-size:13px;color:#9b96b8;margin:0">Lottery tickets, practice squad, and unproven rookies. High variance.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Key Factors -->
        <section style="margin-bottom:48px">
          <h2 style="color:#7c4dff;font-size:28px;margin:0 0 24px 0">Key Valuation Factors</h2>

          <div style="margin-bottom:32px;background:#1a1825;padding:24px;border-radius:8px;border-left:4px solid #7c4dff">
            <h3 style="color:#7c4dff;font-size:18px;margin:0 0 12px 0">Age & Career Stage</h3>
            <p style="color:#9b96b8;font-size:14px;line-height:1.6;margin:0">Players in their prime earning years (ages 24–28) command peak value. Younger players receive youth bonuses due to longer career runways. Older players face age-related discounts as production declines.</p>
          </div>

          <div style="margin-bottom:32px;background:#1a1825;padding:24px;border-radius:8px;border-left:4px solid #06b6d4">
            <h3 style="color:#06b6d4;font-size:18px;margin:0 0 12px 0">Positional Scarcity</h3>
            <p style="color:#9b96b8;font-size:14px;line-height:1.6;margin:0">Elite talent at each position follows a scarcity curve. Running back and wide receiver depth differs significantly from quarterback and tight end supply. This affects relative value and trade demand.</p>
          </div>

          <div style="margin-bottom:32px;background:#1a1825;padding:24px;border-radius:8px;border-left:4px solid #10b981">
            <h3 style="color:#10b981;font-size:18px;margin:0 0 12px 0">Scoring Format</h3>
            <p style="color:#9b96b8;font-size:14px;line-height:1.6;margin:0">Values adjust for PPR, Half PPR, and Standard scoring. PPR scoring increases value for high-volume receivers. Standard scoring emphasizes touchdown production.</p>
          </div>

          <div style="margin-bottom:32px;background:#1a1825;padding:24px;border-radius:8px;border-left:4px solid #8b5cf6">
            <h3 style="color:#8b5cf6;font-size:18px;margin:0 0 12px 0">League Configuration</h3>
            <p style="color:#9b96b8;font-size:14px;line-height:1.6;margin:0"><strong>Superflex:</strong> QB values increase significantly in 2QB leagues. <strong>TE Premium:</strong> Tight end value increases with scoring boost. <strong>IDP:</strong> Defensive positions receive their own valuation curves.</p>
          </div>

          <div style="background:#1a1825;padding:24px;border-radius:8px;border-left:4px solid #f59e0b">
            <h3 style="color:#f59e0b;font-size:18px;margin:0 0 12px 0">Current Performance</h3>
            <p style="color:#9b96b8;font-size:14px;line-height:1.6;margin:0">We track recent production, role changes, opportunity metrics, and injury status. Values reflect current NFL reality rather than historical production.</p>
          </div>
        </section>

        <!-- What We Don't Do -->
        <section style="margin-bottom:48px">
          <h2 style="color:#7c4dff;font-size:24px;margin:0 0 16px 0">What We Don't Do</h2>
          <ul style="list-style:none;padding:0;margin:0;color:#e0dce8;font-size:14px">
            <li style="padding:12px 0;border-bottom:1px solid #2a2837">✗ We don't speculate on trades or free agency moves</li>
            <li style="padding:12px 0;border-bottom:1px solid #2a2837">✗ We don't report news or injury information</li>
            <li style="padding:12px 0;border-bottom:1px solid #2a2837">✗ We don't predict future performance</li>
            <li style="padding:12px 0;border-bottom:1px solid #2a2837">✗ We don't incorporate gambling or sportsbook data</li>
            <li style="padding:12px 0">✗ We don't adjust values based on personal preference or bias</li>
          </ul>
        </section>

        <!-- Updates -->
        <section style="background:#1a1825;padding:24px;border-radius:8px">
          <h2 style="color:#7c4dff;font-size:18px;margin:0 0 12px 0">Regular Updates</h2>
          <p style="color:#9b96b8;font-size:14px;line-height:1.6;margin:0">We update player values as market conditions and real-world information changes. Our data reflects current player performance and career stage. Values are recalibrated quarterly to maintain accuracy.</p>
        </section>

        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #2a2837">
          <p style="color:#9b96b8;font-size:13px;margin:0">Have questions about methodology? Read our <a href="/editorial-policy/" style="color:#7c4dff">editorial policy</a> or explore <a href="/dynasty-rankings/" style="color:#7c4dff">current rankings</a>.</p>
        </div>
      </div>
    </div>
  </div>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "FDP Valuation Methodology",
    "description": "How Fantasy Draft Pros calculates dynasty player values",
    "url": "https://fantasydraftpros.com/methodology/",
    "author": { "@type": "Organization", "name": "Fantasy Draft Pros" },
    "publisher": { "@type": "Organization", "name": "Fantasy Draft Pros" }
  }
  </script>

  ${appScripts}
</body>
</html>`
}

/**
 * Generate Editorial Policy page
 */
export function generateEditorialPolicyHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Editorial Policy | Data Integrity & Independence | Fantasy Draft Pros</title>
  <meta name="description" content="Fantasy Draft Pros editorial policy. Learn how we maintain data integrity, handle corrections, ensure independence, and provide transparent dynasty valuations." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://fantasydraftpros.com/editorial-policy/" />
  <meta property="og:title" content="Editorial Policy" />
  <meta property="og:url" content="https://fantasydraftpros.com/editorial-policy/" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <div id="root">
    <div style="background:#13111e;color:#e0dce8;padding:60px 20px">
      <div style="max-width:900px;margin:0 auto">
        <nav style="font-size:12px;color:#9b96b8;margin-bottom:32px">
          <a href="/" style="color:#7c4dff;text-decoration:none">Fantasy Draft Pros</a>
          <span style="color:#6b6580"> / </span>
          <span>Editorial Policy</span>
        </nav>

        <h1 style="color:#7c4dff;font-size:40px;margin:0 0 16px 0">Editorial Policy</h1>
        <p style="font-size:16px;color:#9b96b8;margin:0 0 32px 0">Commitment to data integrity and transparency</p>

        <!-- Our Commitment -->
        <section style="margin-bottom:48px;background:#1a1825;padding:32px;border-radius:8px;border-left:4px solid #7c4dff">
          <h2 style="color:#7c4dff;font-size:24px;margin:0 0 12px 0">Our Commitment</h2>
          <p style="color:#9b96b8;font-size:14px;line-height:1.6;margin:0">Fantasy Draft Pros is committed to providing accurate, transparent, and independent dynasty player valuations. We maintain editorial independence and prioritize user trust above all other considerations.</p>
        </section>

        <!-- Data-Driven Methodology -->
        <section style="margin-bottom:48px">
          <h2 style="color:#7c4dff;font-size:24px;margin:0 0 16px 0">Data-Driven Methodology</h2>
          <p style="color:#e0dce8;font-size:14px;line-height:1.6;margin:0 0 12px 0">All FDP values are calculated using consistent, mathematical models based on:</p>
          <ul style="list-style:none;padding:0;margin:0;color:#e0dce8;font-size:14px">
            <li style="padding:8px 0">• Current player performance data</li>
            <li style="padding:8px 0">• Positional scarcity curves</li>
            <li style="padding:8px 0">• Age and career stage adjustments</li>
            <li style="padding:8px 0">• Historical dynasty trade market analysis</li>
            <li style="padding:8px 0">• Scoring format variations</li>
          </ul>
          <p style="color:#9b96b8;font-size:13px;margin:12px 0 0 0">We do not adjust values based on personal preference, brand partnerships, or external pressure.</p>
        </section>

        <!-- Corrections Process -->
        <section style="margin-bottom:48px;background:#1a1825;padding:24px;border-radius:8px">
          <h2 style="color:#7c4dff;font-size:24px;margin:0 0 12px 0">How We Handle Corrections</h2>
          <p style="color:#9b96b8;font-size:14px;line-height:1.6;margin:0 0 12px 0">If you identify an error in player data or calculations:</p>
          <ol style="list-style-position:inside;padding:0;margin:0;color:#9b96b8;font-size:14px">
            <li style="padding:8px 0">We review your report promptly</li>
            <li style="padding:8px 0">We verify the issue against our data sources</li>
            <li style="padding:8px 0">We correct the data and update values if warranted</li>
            <li style="padding:8px 0">We note the correction for transparency</li>
          </ol>
          <p style="color:#9b96b8;font-size:13px;margin:12px 0 0 0;font-style:italic">Corrections are applied prospectively to future valuations.</p>
        </section>

        <!-- Independence -->
        <section style="margin-bottom:48px">
          <h2 style="color:#7c4dff;font-size:24px;margin:0 0 16px 0">Editorial Independence</h2>
          <p style="color:#e0dce8;font-size:14px;line-height:1.6;margin:0 0 12px 0">Fantasy Draft Pros maintains complete editorial independence. We are not:</p>
          <ul style="list-style:none;padding:0;margin:0;color:#e0dce8;font-size:14px">
            <li style="padding:8px 0">✓ Owned by or affiliated with the NFL, ESPN, Sleeper, Yahoo, or any sportsbook</li>
            <li style="padding:8px 0">✓ Compensated by teams, players, or league platforms for value adjustments</li>
            <li style="padding:8px 0">✓ Influenced by advertising relationships in our valuation process</li>
            <li style="padding:8px 0">✓ Required to promote any particular league platform or scoring format</li>
          </ul>
          <p style="color:#9b96b8;font-size:13px;margin:12px 0 0 0">Our valuations serve dynasty league players, not platform or business interests.</p>
        </section>

        <!-- Information Types -->
        <section style="margin-bottom:48px;background:#1a1825;padding:24px;border-radius:8px">
          <h2 style="color:#7c4dff;font-size:24px;margin:0 0 12px 0">Information Types</h2>
          <p style="color:#9b96b8;font-size:13px;margin:0 0 12px 0"><strong>Valuations</strong> (FDP Values) are opinions based on data. They represent our best estimate of dynasty trade value given available information.</p>
          <p style="color:#9b96b8;font-size:13px;margin:0"><strong>Player Data</strong> (age, team, position) are factual. We maintain accuracy in roster information.</p>
        </section>

        <!-- Transparency -->
        <section style="margin-bottom:48px">
          <h2 style="color:#7c4dff;font-size:24px;margin:0 0 16px 0">Transparency</h2>
          <ul style="list-style:none;padding:0;margin:0;color:#e0dce8;font-size:14px">
            <li style="padding:12px 0;border-bottom:1px solid #2a2837">✓ We explain our <a href="/methodology/" style="color:#7c4dff">valuation methodology</a> publicly</li>
            <li style="padding:12px 0;border-bottom:1px solid #2a2837">✓ We document value update frequency and dates</li>
            <li style="padding:12px 0;border-bottom:1px solid #2a2837">✓ We acknowledge where assumptions exist</li>
            <li style="padding:12px 0">✓ We welcome user feedback on valuation accuracy</li>
          </ul>
        </section>

        <!-- Disclaimer -->
        <section style="background:#1a1825;padding:24px;border-radius:8px;border-left:4px solid #f59e0b">
          <h2 style="color:#f59e0b;font-size:18px;margin:0 0 12px 0">Disclaimer</h2>
          <p style="color:#9b96b8;font-size:13px;line-height:1.6;margin:0">Fantasy Draft Pros provides valuations and analysis for entertainment and informational purposes. Users make their own trading decisions. We do not guarantee outcomes or provide financial advice. Dynasty fantasy football involves risk. Trade responsibly.</p>
        </section>

        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #2a2837">
          <p style="color:#9b96b8;font-size:13px;margin:0">Learn more about our <a href="/methodology/" style="color:#7c4dff">methodology</a> or explore <a href="/dynasty-rankings/" style="color:#7c4dff">current rankings</a>.</p>
        </div>
      </div>
    </div>
  </div>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Editorial Policy",
    "description": "Fantasy Draft Pros editorial policy and commitment to transparency",
    "url": "https://fantasydraftpros.com/editorial-policy/",
    "author": { "@type": "Organization", "name": "Fantasy Draft Pros" }
  }
  </script>

  ${appScripts}
</body>
</html>`
}
