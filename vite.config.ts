import { generateDynastyBasicsHubHtml, generateTradingStrategiesHubHtml, generateFormatStrategyHubHtml, generatePositionGuideHubHtml } from './src/seo-topical-hubs'
import { generatePlayerComparisonPageHtml } from './src/seo-player-comparison'
import { enhanceInternalLinking } from './src/seo-internal-linking'
import { injectRichSnippets } from './src/seo-rich-snippet-injection'
import { injectKnowledgeGraphConnections } from './src/seo-knowledge-graph-injection'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { computeDynastyTradeVal, playerSlug, tierLabel, VALUES_UPDATED_AT } from './src/logic'
import { generateSeoData, getPositionRankingTitle, getPositionRankingDescription, formatTradeValue } from './src/seo-data'

import { generatePlayerDirectoryHtml, generatePositionDirectoryHtml } from './src/seo-player-directory'
import { generateLandingPageHtml } from './src/seo-page-generator'
import { generateDynastyHubHtml } from './src/seo-authority-hubs'
import { generateBuyLowHtml, generateSellHighHtml, generateDraftPickValuesHtml } from './src/seo-strategy-pages'
import { generateAboutHtml, generateMethodologyHtml, generateEditorialPolicyHtml } from './src/seo-trust-pages'
import { generateEnhancedPlayerHtml } from './src/seo-player-pages'
import { generateSuperfexRankingPageHtml, generateTePremiumRankingPageHtml, generateIdpOverallRankingPageHtml } from './src/seo-format-rankings'
import { SEO_ROUTES, findRoute } from './src/seo-routes'
import { generatePlayerDirectories, generateRegistryLandingPages } from './src/build-seo-integration'
import { generateSitemap as generateSitemapRegistry } from './src/build-sitemap'
import { getStaticSeoFooterHtml } from './src/seo-footer-static'
import { injectSchemaMarkupIntoPages } from './src/seo-schema-injection'
import { generateDynastyBasicsHubHtml, generateTradingStrategiesHubHtml, generateFormatStrategyHubHtml, generatePositionGuideHubHtml } from './src/seo-topical-hubs'
import { generatePlayerComparisonPageHtml } from './src/seo-player-comparison'
import { enhanceInternalLinking } from './src/seo-internal-linking'
import { injectRichSnippets } from './src/seo-rich-snippet-injection'
import { injectKnowledgeGraphConnections } from './src/seo-knowledge-graph-injection'
// Parse the PLAYERS array from afdp.tsx source at build time.
function parsePlayers(srcPath: string): Array<{ name: string; pos: string; age: number; team: string; ktcVal?: number; proj: { PPR: number; Half: number; Standard: number }; note?: string }> {
  const src = readFileSync(srcPath, 'utf-8')
  const marker = 'const PLAYERS=['
  const startIdx = src.indexOf(marker)
  if (startIdx === -1) throw new Error('PLAYERS array not found in afdp.tsx')
  const arrayStart = src.indexOf('[', startIdx)
  let depth = 0
  let i = arrayStart
  for (; i < src.length; i++) {
    if (src[i] === '[') depth++
    else if (src[i] === ']') { depth--; if (depth === 0) break }
  }
  return new Function('return ' + src.substring(arrayStart, i + 1))() as any
}

type RankedPlayer = {
  name: string; pos: string; age: number; team: string; ktcVal?: number
  slug: string; tradeVal: number; posRank: number; rank: number
  proj: { PPR: number; Half: number; Standard: number }; note?: string
}

// Compute canonical dynasty PPR trade values for all players.
function rankAllPlayers(players: ReturnType<typeof parsePlayers>): RankedPlayer[] {
  const defaultOpts = { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false }
  const withVals = players.map(p => ({
    name: p.name, pos: p.pos, age: p.age, team: p.team, ktcVal: p.ktcVal,
    slug: playerSlug(p.name),
    tradeVal: computeDynastyTradeVal(p.pos, p.age, p.ktcVal, 1, p.proj?.PPR || 0, defaultOpts),
    posRank: 0, rank: 0,
    proj: p.proj || { PPR: 0, Half: 0, Standard: 0 },
    note: p.note,
  }))
  withVals.sort((a, b) => b.tradeVal - a.tradeVal)
  const posCount: Record<string, number> = {}
  withVals.forEach((p, i) => {
    posCount[p.pos] = (posCount[p.pos] || 0) + 1
    p.posRank = posCount[p.pos]
    p.rank = i + 1
  })
  return withVals
}

// Eligibility: player gets a generated page (accessible via URL).
function isPageEligible(p: RankedPlayer): boolean {
  if (!p.team || p.team === 'FA') return false
  if (p.pos === 'K' || p.pos === 'DST') return false
  if (p.tradeVal < 100) return false
  return true
}

// Generate position-specific ranking page HTML
function generateRankingPageHtml(
  position: string,
  players: RankedPlayer[],
  count: number,
  valuesDate: string,
  appScripts: string,
  appPreloads: string,
  darkModeScript: string,
): string {
  const title = getPositionRankingTitle(position)
  const desc = getPositionRankingDescription(position, count)
  const url = `https://fantasydraftpros.com/rankings/${position.toLowerCase()}/`
  const canonicalTitle = `${title} 2026 | Fantasy Draft Pros`

  const tableRows = players.slice(0, count).map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><a href="https://fantasydraftpros.com/players/${p.slug}/" style="color:#7c4dff;text-decoration:none">${escHtml(p.name)}</a></td>
      <td>${p.pos}</td>
      <td>${p.team}</td>
      <td style="color:#f59e0b;font-weight:700">${formatTradeValue(p.tradeVal)}</td>
    </tr>
  `).join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${canonicalTitle}</title>
  <meta name="description" content="${desc}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />
  <meta property="og:title" content="${title} 2026" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="https://fantasydraftpros.com/logo-horizontal.png" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <style>
    body { background:#13111e; color:#e0dce8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:960px; margin:0 auto; padding:40px 20px; line-height:1.7; }
    a { color:#7c4dff; text-decoration:none; }
    a:hover { text-decoration:underline; }
    h1 { color:#7c4dff; font-size:28px; margin-bottom:8px; }
    .subtitle { color:#9b96b8; font-size:14px; margin-bottom:24px; }
    table { width:100%; border-collapse:collapse; margin:24px 0; }
    th { text-align:left; padding:12px 8px; color:#7c4dff; font-weight:700; border-bottom:2px solid #7c4dff; font-size:13px; }
    td { padding:10px 8px; border-bottom:1px solid #2a254044; font-size:13px; }
    tr:hover { background:#1a1829; }
    .cta { display:inline-block; background:#7c4dff; color:#fff; padding:12px 24px; border-radius:8px; font-weight:700; margin:20px 0; }
    .cta:hover { background:#6a3de8; text-decoration:none; }
    nav { margin-top:40px; padding-top:20px; border-top:1px solid #2a2540; }
  </style>
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <h1>${title}</h1>
  <p class="subtitle">Updated ${valuesDate}</p>
  <p>${desc}</p>

  <table>
    <thead>
      <tr>
        <th>Rank</th>
        <th>Player</th>
        <th>Pos</th>
        <th>Team</th>
        <th>FDP Value</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <p style="font-size:14px;color:#9b96b8">Browse the <a href="https://fantasydraftpros.com/#rankings">full dynasty rankings</a> to search, filter, and compare all ${count}+ players.</p>
  <a href="https://fantasydraftpros.com/#rankings" class="cta">View Full Rankings →</a>

  <nav>
    <p style="font-size:14px;color:#fff;font-weight:700;margin-bottom:12px">More Dynasty Rankings</p>
    <ul style="font-size:13px;padding-left:20px;line-height:2;color:#9b96b8">
      ${['QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB'].filter(p => p !== position).map(p =>
        `<li><a href="https://fantasydraftpros.com/rankings/${p.toLowerCase()}/">${getPositionRankingTitle(p)}</a></li>`
      ).join('')}
      <li style="margin-top:8px"><a href="https://fantasydraftpros.com/">Fantasy Draft Pros — Home</a></li>
    </ul>
  </nav>

  <div id="root"></div>
  ${appScripts}
</body>
</html>`
}

// Index eligibility: page gets indexed by Google (in sitemap, robots=index).
// Higher bar than page eligibility — only fantasy-relevant players.
const INDEX_THRESHOLD = 1000
function isIndexEligible(p: RankedPlayer): boolean {
  return p.tradeVal >= INDEX_THRESHOLD
}

// Legacy slugs that may already be indexed by Google.
const LEGACY_SLUG_REDIRECTS: Record<string, string> = {
  'jamarr-chase': 'ja-marr-chase',
  'dandre-swift': 'd-andre-swift',
  'devon-achane': 'de-von-achane',
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escJson(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

// Generate player-specific SEO HTML with real FDP data in the fallback content.
function generatePlayerHtml(
  player: RankedPlayer,
  comps: RankedPlayer[],
  appScripts: string,
  appPreloads: string,
  darkModeScript: string,
  shouldIndex: boolean,
): string {
  const { pos, team, age, tradeVal, posRank, rank, slug, proj, note } = player
  const name = escHtml(player.name)
  const jsonName = escJson(player.name)
  const url = `https://fantasydraftpros.com/players/${slug}/`
  const valStr = tradeVal.toLocaleString('en-US')
  const tier = tierLabel(posRank, pos)
  const title = `${name} Dynasty Value & Trade Analysis 2026 | Fantasy Draft Pros`
  const desc = `${name} dynasty trade value: ${valStr}. ${pos}${posRank} for ${team}. Age ${age}. Dynasty rankings, comparable players, and trade analysis at Fantasy Draft Pros.`
  const ogDesc = `${name} dynasty trade value: ${valStr}. ${pos} for ${team}. Rankings and trade analysis.`
  const robotsMeta = shouldIndex
    ? 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
    : 'noindex, follow'

  // Build comparable players HTML for fallback
  const compsHtml = comps.length > 0
    ? `<div style="margin-top:16px"><div style="font-size:13px;font-weight:700;color:#7c4dff;margin-bottom:6px">Comparable Players</div>${comps.map(c =>
        `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #2a254044;font-size:13px"><span style="color:#e0dce8">${escHtml(c.name)} <span style="color:#9b96b8">${c.pos} · ${c.team}</span></span><span style="color:#f59e0b;font-weight:700">${c.tradeVal.toLocaleString('en-US')}</span></div>`
      ).join('')}</div>`
    : ''

  // Build projection + note HTML
  const projHtml = proj.PPR > 0
    ? `<div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:12px;color:#9b96b8"><span>PPR: <b style="color:#e0dce8">${proj.PPR}</b></span><span>Half: <b style="color:#e0dce8">${proj.Half}</b></span><span>Std: <b style="color:#e0dce8">${proj.Standard}</b></span></div>`
    : ''
  const noteHtml = note
    ? `<div style="font-size:12px;color:#9b96b8;margin-top:8px;font-style:italic">${escHtml(note)}</div>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta name="author" content="Fantasy Draft Pros" />
  <meta name="robots" content="${robotsMeta}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Fantasy Draft Pros" />
  <meta property="og:title" content="${name} Dynasty Value &amp; Trade Analysis 2026" />
  <meta property="og:description" content="${ogDesc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="https://fantasydraftpros.com/logo-horizontal.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@FantasyDraftPros" />
  <meta name="twitter:title" content="${name} Dynasty Value &amp; Trade Analysis 2026" />
  <meta name="twitter:description" content="${ogDesc}" />
  <meta name="twitter:image" content="https://fantasydraftpros.com/logo-horizontal.png" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <link rel="apple-touch-icon" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "${jsonName}",
    "url": "${url}",
    "description": "${jsonName} is a ${pos} for the ${team}. FDP dynasty value: ${valStr}.",
    "jobTitle": "Professional Football Player",
    "memberOf": {
      "@type": "SportsTeam",
      "name": "${team}"
    }
  }
  </script>
  <script>
${darkModeScript}
</script>
  ${appScripts}
  ${appPreloads}
</head>
<body>
  <div id="root"><div id="fb" style="background:#13111e;color:#9b96b8;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;line-height:1.7;text-align:center">
    <h1 style="color:#7c4dff;font-size:28px;margin-bottom:8px">${name} — Dynasty Profile</h1>
    <p style="font-size:16px;color:#ffffff;margin-bottom:8px">${pos} | ${team} | Age ${age}</p>
    <p style="font-size:24px;color:#f59e0b;font-weight:800;margin-bottom:8px">FDP Dynasty Value: ${valStr}</p>
    <div style="display:flex;gap:16px;justify-content:center;margin-bottom:8px;font-size:13px">
      <span style="color:#9b96b8">Overall: <b style="color:#e0dce8">#${rank}</b></span>
      <span style="color:#9b96b8">${pos}: <b style="color:#e0dce8">#${posRank}</b></span>
      <span style="color:#9b96b8">Tier: <b style="color:${tier.c}">${tier.t}</b></span>
    </div>${projHtml}${noteHtml}
    <p style="font-size:13px;color:#5c5880;margin-top:12px;margin-bottom:16px">Values as of ${VALUES_UPDATED_AT}</p>${compsHtml}
    <p style="font-size:14px;color:#9b96b8;margin-top:16px">Loading full analysis...</p>
  </div></div>
  <noscript>
    <div style="background:#13111e;color:#ffffff;padding:40px 20px;font-family:sans-serif;text-align:center">
      <h1 style="color:#7c4dff">${name} — Dynasty Value &amp; Trade Analysis</h1>
      <p>${name} is a ${pos} for ${team}. FDP dynasty value: ${valStr}. Overall rank #${rank}, ${pos}${posRank}. Visit <a href="https://fantasydraftpros.com/" style="color:#7c4dff">Fantasy Draft Pros</a> for full trade analysis, dynasty rankings, and comparable players.</p>
    </div>
  </noscript>
</body>
</html>`
}

// Generate a redirect page for legacy slugs.
function generateRedirectHtml(oldSlug: string, canonicalSlug: string): string {
  const url = `https://fantasydraftpros.com/players/${canonicalSlug}/`
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Redirecting...</title>
  <link rel="canonical" href="${url}" />
  <meta http-equiv="refresh" content="0;url=${url}" />
  <meta name="robots" content="noindex, follow" />
  <script>window.location.replace("${url}");</script>
</head>
<body>
  <p>Redirecting to <a href="${url}">${url}</a>...</p>
</body>
</html>`
}

// Generate sitemap.xml — only includes indexable pages.
// Player lastmod uses VALUES_UPDATED_AT (the date player data was last updated).
// Static pages omit lastmod — no legitimate modification date available at build time.
function generateSitemap(indexableSlugs: string[], valuesDate: string): string {
  const staticRoutes = [
    { loc: '/', priority: '1.0', freq: 'daily' },
    { loc: '/dynasty-trade-analyzer/', priority: '0.9', freq: 'weekly' },
    { loc: '/dynasty-trade-calculator/', priority: '0.9', freq: 'weekly' },
    { loc: '/dynasty-trade-value-chart/', priority: '0.9', freq: 'weekly' },
    { loc: '/fantasy-football-trade-analyzer/', priority: '0.9', freq: 'weekly' },
    { loc: '/fantasy-football-trade-calculator/', priority: '0.9', freq: 'weekly' },
    { loc: '/dynasty-rankings/', priority: '0.9', freq: 'weekly' },
    { loc: '/sleeper-trade-calculator/', priority: '0.8', freq: 'weekly' },
    { loc: '/superflex-trade-calculator/', priority: '0.8', freq: 'weekly' },
    { loc: '/fdp-value/', priority: '0.7', freq: 'monthly' },
    { loc: '/rankings/qb/', priority: '0.8', freq: 'weekly' },
    { loc: '/rankings/rb/', priority: '0.8', freq: 'weekly' },
    { loc: '/rankings/wr/', priority: '0.8', freq: 'weekly' },
    { loc: '/rankings/te/', priority: '0.8', freq: 'weekly' },
    { loc: '/rankings/dl/', priority: '0.7', freq: 'weekly' },
    { loc: '/rankings/lb/', priority: '0.7', freq: 'weekly' },
    { loc: '/rankings/db/', priority: '0.7', freq: 'weekly' },
    { loc: '/rankings/superflex/', priority: '0.8', freq: 'weekly' },
    { loc: '/rankings/te-premium/', priority: '0.8', freq: 'weekly' },
    { loc: '/rankings/idp-overall/', priority: '0.7', freq: 'weekly' },
  ]
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  for (const r of staticRoutes) {
    xml += `  <url><loc>https://fantasydraftpros.com${r.loc}</loc><changefreq>${r.freq}</changefreq><priority>${r.priority}</priority></url>\n`
  }
  for (const slug of indexableSlugs) {
    xml += `  <url><loc>https://fantasydraftpros.com/players/${slug}/</loc><lastmod>${valuesDate}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`
  }
  xml += `</urlset>\n`
  return xml
}

// Build-time plugin: generates player SEO pages, redirects, sitemap.
function spaRoutesPlugin() {
  return {
    name: 'spa-routes',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist')
      const index = readFileSync(resolve(distDir, 'index.html'), 'utf-8')

      // 404.html for GitHub Pages SPA fallback
      writeFileSync(resolve(distDir, '404.html'), index)

      // Extract SPA script/preload tags from built index.html
      const scriptMatch = index.match(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/g) || []
      const preloadMatch = index.match(/<link rel="modulepreload"[^>]*>/g) || []
      const inlineScriptMatch = index.match(/<script>\n?([\s\S]*?)<\/script>/)
      const appScripts = scriptMatch.join('\n  ')
      const appPreloads = preloadMatch.join('\n  ')
      const darkModeScript = inlineScriptMatch ? inlineScriptMatch[1].trim() : ''

      // Parse PLAYERS from afdp.tsx and compute canonical values
      let ranked: RankedPlayer[], players: any[]
      try {
        players = parsePlayers(resolve(__dirname, 'afdp.tsx'))
        ranked = rankAllPlayers(players)
        console.log(`[spa-routes] Parsed ${players.length} players, computed canonical values`)
      } catch (e) {
        console.error('[spa-routes] Failed to parse PLAYERS:', e)
        return
      }

      // Generate dynamic SEO data (top 50-100 per position, Superflex, TE Premium)
      let seoData
      try {
        seoData = generateSeoData(players, { sf: false, tep: false, idp: true })
        console.log(`[spa-routes] Generated SEO data context - values dated ${seoData.valuesDate}`)
      } catch (e) {
        console.error('[spa-routes] Failed to generate SEO data:', e)
        return
      }

      // Filter and deduplicate
      const pageEligible = ranked.filter(isPageEligible)
      const slugSet = new Set<string>()
      const deduped: RankedPlayer[] = []
      for (const p of pageEligible) {
        if (!slugSet.has(p.slug)) {
          slugSet.add(p.slug)
          deduped.push(p)
        }
      }

      // Split into indexable vs noindex
      const indexable = deduped.filter(isIndexEligible)
      const noindex = deduped.filter(p => !isIndexEligible(p))

      // Build lookup for comparable players (same position, close value)
      const bySlug = new Map(deduped.map(p => [p.slug, p]))

      // Generate player pages with Phase 6 enhancements
      const playersDir = resolve(distDir, 'players')
      if (!existsSync(playersDir)) mkdirSync(playersDir, { recursive: true })
      let generated = 0
      for (const player of deduped) {
        const shouldIndex = isIndexEligible(player)
        // Find 5 comparable players (same position, closest value, excluding self)
        const comps = deduped
          .filter(c => c.name !== player.name && c.pos === player.pos)
          .sort((a, b) => Math.abs(a.tradeVal - player.tradeVal) - Math.abs(b.tradeVal - player.tradeVal))
          .slice(0, 5)
        const dir = resolve(playersDir, player.slug)
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        
        // Generate enhanced player page with Phase 6 improvements
        const playerHtml = generateEnhancedPlayerHtml(
          {
            name: player.name,
            pos: player.pos,
            team: player.team,
            age: player.age,
            tradeVal: player.tradeVal,
            posRank: player.posRank,
            rank: player.rank,
            slug: player.slug,
            proj: player.proj,
            note: player.note,
            shouldIndex: shouldIndex,
            valuesDate: VALUES_UPDATED_AT,
            comparablePlayers: comps.map(c => ({
              name: c.name,
              pos: c.pos,
              team: c.team,
              slug: c.slug,
              tradeVal: c.tradeVal,
            })),
          },
          appScripts,
          appPreloads,
          darkModeScript
        )
        writeFileSync(resolve(dir, 'index.html'), playerHtml)
        generated++
      }
      console.log(`[spa-routes] Generated ${generated} player pages (${indexable.length} indexed, ${noindex.length} noindex) with Phase 6 internal links`)

      // Generate redirect pages for legacy slugs
      let redirects = 0
      for (const [oldSlug, canonicalSlug] of Object.entries(LEGACY_SLUG_REDIRECTS)) {
        if (bySlug.has(canonicalSlug) && !slugSet.has(oldSlug)) {
          const dir = resolve(playersDir, oldSlug)
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
          writeFileSync(resolve(dir, 'index.html'), generateRedirectHtml(oldSlug, canonicalSlug))
          redirects++
        }
      }
      if (redirects > 0) console.log(`[spa-routes] Generated ${redirects} legacy slug redirects`)

      // Generate position-specific ranking pages from SEO data (all 7 positions)
      const rankingsDir = resolve(distDir, 'rankings')
      if (!existsSync(rankingsDir)) mkdirSync(rankingsDir, { recursive: true })
      const positions = ['QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB']
      let rankingPages = 0
      for (const pos of positions) {
        const posData = seoData[`top${pos}` as keyof typeof seoData] as any[]
        if (posData && posData.length > 0) {
          // Convert SeoRankedPlayer to RankedPlayer format for display
          const posRanked = posData.map(p => ({
            name: p.name, pos: p.pos, team: p.team, age: p.age,
            slug: p.slug, tradeVal: p.tradeVal, posRank: p.posRank, rank: p.rank,
            ktcVal: p.ktcVal, proj: p.proj || { PPR: 0, Half: 0, Standard: 0 }, note: p.note
          }))
          const posDir = resolve(rankingsDir, pos.toLowerCase())
          if (!existsSync(posDir)) mkdirSync(posDir, { recursive: true })
          const rankingHtml = generateRankingPageHtml(pos, posRanked, 50, seoData.valuesDate, appScripts, appPreloads, darkModeScript)
          writeFileSync(resolve(posDir, 'index.html'), rankingHtml)
          rankingPages++
        }
      }
      console.log(`[spa-routes] Generated ${rankingPages} position ranking pages with current SEO data`)

      // Phase 13.1: Generate format-specific ranking pages (Superflex, TE Premium, IDP Overall)
      let formatRankingPages = 0

      // Superflex rankings
      try {
        const superfexDir = resolve(rankingsDir, 'superflex')
        if (!existsSync(superfexDir)) mkdirSync(superfexDir, { recursive: true })
        const superfexHtml = generateSuperfexRankingPageHtml(seoData.allPlayers, appScripts, appPreloads, darkModeScript)
        writeFileSync(resolve(superfexDir, 'index.html'), superfexHtml)
        formatRankingPages++
      } catch (e) {
        console.error('[spa-routes] Failed to generate Superflex rankings:', e)
      }

      // TE Premium rankings
      try {
        const tePremiumDir = resolve(rankingsDir, 'te-premium')
        if (!existsSync(tePremiumDir)) mkdirSync(tePremiumDir, { recursive: true })
        const tePremiumHtml = generateTePremiumRankingPageHtml(seoData.allPlayers, appScripts, appPreloads, darkModeScript)
        writeFileSync(resolve(tePremiumDir, 'index.html'), tePremiumHtml)
        formatRankingPages++
      } catch (e) {
        console.error('[spa-routes] Failed to generate TE Premium rankings:', e)
      }

      // IDP Overall rankings
      try {
        const idpOverallDir = resolve(rankingsDir, 'idp-overall')
        if (!existsSync(idpOverallDir)) mkdirSync(idpOverallDir, { recursive: true })
        const idpOverallHtml = generateIdpOverallRankingPageHtml(seoData.allPlayers, appScripts, appPreloads, darkModeScript)
        writeFileSync(resolve(idpOverallDir, 'index.html'), idpOverallHtml)
        formatRankingPages++
      } catch (e) {
        console.error('[spa-routes] Failed to generate IDP Overall rankings:', e)
      }

      if (formatRankingPages > 0) {
        console.log(`[spa-routes] Generated ${formatRankingPages} format-specific ranking pages (Superflex, TE Premium, IDP Overall) for Phase 13.1`)
      }

      // Generate /fdp-value/ SEO page
      const fdpValueDir = resolve(distDir, 'fdp-value')
      if (!existsSync(fdpValueDir)) mkdirSync(fdpValueDir, { recursive: true })
      const fdpValueHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>What is FDP Value? — Dynasty Player Valuation Explained | Fantasy Draft Pros</title>
  <meta name="description" content="Learn how FDP Value works. Fantasy Draft Pros uses a 0-9,999 scale to rank 1,000+ dynasty players. Understand age adjustments, Superflex, TE Premium, and scoring format impacts." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://fantasydraftpros.com/fdp-value/" />
  <meta property="og:title" content="What is FDP Value? — Fantasy Draft Pros" />
  <meta property="og:description" content="FDP Value is Fantasy Draft Pros' proprietary dynasty valuation system. 0-9,999 scale with age, Superflex, TE Premium, and format adjustments." />
  <meta property="og:url" content="https://fantasydraftpros.com/fdp-value/" />
  <meta property="og:type" content="article" />
  <meta property="og:image" content="https://fantasydraftpros.com/logo-horizontal.png" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <div id="root"><div style="background:#13111e;color:#e0dce8;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:680px;margin:0 auto;line-height:1.7">
    <h1 style="color:#7c4dff;font-size:28px;margin-bottom:8px">What is FDP Value?</h1>
    <p style="font-size:13px;color:#9b96b8;margin-bottom:24px">Values as of ${VALUES_UPDATED_AT}</p>
    <h2 style="color:#7c4dff;font-size:18px">The FDP Value Scale</h2>
    <p>FDP Value is Fantasy Draft Pros' own dynasty player valuation system. Every player is assigned a value from 0 to 9,999 based on their dynasty fantasy football trade worth. Higher value = greater dynasty trade value.</p>
    <h2 style="font-size:18px">What Determines FDP Value?</h2>
    <ul>
      <li><strong>Base Valuation</strong> — Market-informed base value or position-rank decay model</li>
      <li><strong>Age &amp; Dynasty Bonus</strong> — Youth bonus for pre-prime players, decline for post-prime</li>
      <li><strong>Superflex</strong> — QB values boosted in SF leagues</li>
      <li><strong>Scoring Format</strong> — Standard, Half PPR, and PPR affect positional values</li>
      <li><strong>TE Premium</strong> — TE values boosted when TEP is enabled</li>
      <li><strong>IDP Mode</strong> — DL, LB, DB values boosted when IDP is on</li>
    </ul>
    <h2 style="font-size:18px">Rankings</h2>
    <p>Players are ranked by FDP Value. The highest value is Overall Rank #1. Position Rank determines Tier (Tier 1 = elite, Tier 5 = borderline starter).</p>
    <p><a href="/" style="color:#7c4dff">Back to Trade Analyzer</a></p>
  </div></div>
  ${appScripts}
</body>
</html>`
      writeFileSync(resolve(fdpValueDir, 'index.html'), fdpValueHtml)
      console.log('[spa-routes] Generated /fdp-value/ info page')

      // Generate player directory pages (/players/, /players/{pos}/)
      const { generated: dirGenerated, urls: dirUrls } = generatePlayerDirectories(
        distDir,
        seoData.allPlayers,
        appScripts,
        appPreloads,
        darkModeScript
      )

      // Generate landing pages for guides, authority, strategy pages
      const { generated: landingGenerated, urls: landingUrls } = generateRegistryLandingPages(
        distDir,
        appScripts,
        appPreloads,
        darkModeScript
      )

      // Collect all new SEO page URLs for sitemap
      const allSeoPageUrls = [...dirUrls, ...landingUrls]

      // Generate sitemap — includes registry routes, player pages, directories, and landing pages
      const sitemap = generateSitemapRegistry(
        indexable.map(p => p.slug),
        dirUrls,
        landingUrls,
        VALUES_UPDATED_AT
      )
      writeFileSync(resolve(distDir, 'sitemap.xml'), sitemap)
      console.log(`[spa-routes] Generated sitemap.xml with ${indexable.length} player + ${dirUrls.length} directory + ${landingUrls.length} landing pages`)

      // Phase 7: Generate Dynasty Authority Hub
      const dynastyHubDir = resolve(distDir, 'dynasty-fantasy-football')
      if (!existsSync(dynastyHubDir)) mkdirSync(dynastyHubDir, { recursive: true })
      const dynastyHubHtml = generateDynastyHubHtml(appScripts, appPreloads, darkModeScript)
      writeFileSync(resolve(dynastyHubDir, 'index.html'), dynastyHubHtml)
      console.log('[spa-routes] Generated /dynasty-fantasy-football/ authority hub')

      // Phase 8: Generate Strategy Pages with real player data
      // Buy-Low candidates
      const buyLowDir = resolve(distDir, 'dynasty-buy-low')
      if (!existsSync(buyLowDir)) mkdirSync(buyLowDir, { recursive: true })
      const buyLowHtml = generateBuyLowHtml(seoData.allPlayers, appScripts, appPreloads, darkModeScript)
      writeFileSync(resolve(buyLowDir, 'index.html'), buyLowHtml)

      // Sell-High candidates
      const sellHighDir = resolve(distDir, 'dynasty-sell-high')
      if (!existsSync(sellHighDir)) mkdirSync(sellHighDir, { recursive: true })
      const sellHighHtml = generateSellHighHtml(seoData.allPlayers, appScripts, appPreloads, darkModeScript)
      writeFileSync(resolve(sellHighDir, 'index.html'), sellHighHtml)

      // Draft Pick Values
      const pickValuesDir = resolve(distDir, 'dynasty-draft-pick-values')
      if (!existsSync(pickValuesDir)) mkdirSync(pickValuesDir, { recursive: true })
      const pickValuesHtml = generateDraftPickValuesHtml(seoData.allPlayers, appScripts, appPreloads, darkModeScript)
      writeFileSync(resolve(pickValuesDir, 'index.html'), pickValuesHtml)

      console.log('[spa-routes] Generated 3 strategy pages (buy-low, sell-high, draft-pick-values) with real player data')

      // Phase 9: Generate Trust & Authority Pages
      // About page
      const aboutDir = resolve(distDir, 'about')
      if (!existsSync(aboutDir)) mkdirSync(aboutDir, { recursive: true })
      const aboutHtml = generateAboutHtml(appScripts, appPreloads, darkModeScript)
      writeFileSync(resolve(aboutDir, 'index.html'), aboutHtml)

      // Methodology page
      const methodologyDir = resolve(distDir, 'methodology')
      if (!existsSync(methodologyDir)) mkdirSync(methodologyDir, { recursive: true })
      const methodologyHtml = generateMethodologyHtml(appScripts, appPreloads, darkModeScript)
      writeFileSync(resolve(methodologyDir, 'index.html'), methodologyHtml)

      // Editorial Policy page
      const editorialDir = resolve(distDir, 'editorial-policy')
      if (!existsSync(editorialDir)) mkdirSync(editorialDir, { recursive: true })
      const editorialHtml = generateEditorialPolicyHtml(appScripts, appPreloads, darkModeScript)
      writeFileSync(resolve(editorialDir, 'index.html'), editorialHtml)

      console.log('[spa-routes] Generated 3 trust pages (about, methodology, editorial-policy) for institutional credibility')

      // Phase 12: Inject SEO footer into all generated pages for internal link equity
      const staticFooterHtml = getStaticSeoFooterHtml()
      let footerInjected = 0

      function walkDirAndInjectFooter(dir: string, footer: string) {
        try {
          const entries = readdirSync(dir, { withFileTypes: true })
          for (const entry of entries) {
            if (entry.isDirectory()) {
              walkDirAndInjectFooter(resolve(dir, entry.name), footer)
            } else if (entry.isFile() && entry.name === 'index.html') {
              const filePath = resolve(dir, entry.name)
              // Skip main homepage (already has Phase 11 footer)
              if (filePath === resolve(distDir, 'index.html')) continue

              let content = readFileSync(filePath, 'utf-8')
              // Skip if already has footer (prevent double-injection)
              if (content.includes('Fantasy Draft Pros helps dynasty coaches')) continue

              // Inject footer before </body>
              if (content.includes('</body>')) {
                content = content.replace('</body>', footer + '\n</body>')
                writeFileSync(filePath, content)
                footerInjected++
              }
            }
          }
        } catch (e) {
          // Skip errors on directories we can't read
        }
      }

      walkDirAndInjectFooter(distDir, staticFooterHtml)
      console.log(`[spa-routes] Injected SEO footer into ${footerInjected} generated pages for internal link equity (Phase 12)`)

      // Phase 13.2: Inject Schema Markup into all generated pages
      try {
        const schemaResult = injectSchemaMarkupIntoPages(distDir)
        console.log(`[spa-routes] Injected schema markup into ${schemaResult.pagesProcessed} pages (${schemaResult.breadcrumbsAdded} breadcrumbs) for Phase 13.2`)
      } catch (e) {
        console.error('[spa-routes] Failed to inject schema markup:', e)
      }

      // Phase 13.3: Generate Topical Authority Hubs for thematic content clustering
      const topicalHubsDir = [
        { dir: 'dynasty-basics', gen: generateDynastyBasicsHubHtml, name: 'Dynasty Basics' },
        { dir: 'trading-strategies', gen: generateTradingStrategiesHubHtml, name: 'Trading Strategies' },
        { dir: 'format-strategy', gen: generateFormatStrategyHubHtml, name: 'Format Strategy' },
        { dir: 'position-guides', gen: generatePositionGuideHubHtml, name: 'Position Guides' }
      ]
      let hubsGenerated = 0
      for (const hub of topicalHubsDir) {
        try {
          const hubDir = resolve(distDir, hub.dir)
          if (!existsSync(hubDir)) mkdirSync(hubDir, { recursive: true })
          const hubHtml = hub.gen(appScripts, appPreloads, darkModeScript)
          writeFileSync(resolve(hubDir, 'index.html'), hubHtml)
          hubsGenerated++
        } catch (e) {
          console.error(`[spa-routes] Failed to generate ${hub.name} hub:`, e)
        }
      }
      if (hubsGenerated > 0) {
        console.log(`[spa-routes] Generated ${hubsGenerated} topical authority hubs for Phase 13.3`)

      // Phase 13.4: Generate Player Comparison Pages for position-specific analysis
      const comparisonsDir = resolve(distDir, 'comparisons')
      if (!existsSync(comparisonsDir)) mkdirSync(comparisonsDir, { recursive: true })
      
      const positions = ['QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB']
      let comparisonsGenerated = 0
      
      for (const pos of positions) {
        try {
          const posDir = resolve(comparisonsDir, pos.toLowerCase())
          if (!existsSync(posDir)) mkdirSync(posDir, { recursive: true })
          
          const comparisonHtml = generatePlayerComparisonPageHtml(
            seoData.allPlayers,
            pos,
            appScripts,
            appPreloads,
            darkModeScript
          )
          writeFileSync(resolve(posDir, 'index.html'), comparisonHtml)
          comparisonsGenerated++
        } catch (e) {
          console.error(`[spa-routes] Failed to generate ${pos} comparison page:`, e)
        }
      }
      
      if (comparisonsGenerated > 0) {
        console.log(`[spa-routes] Generated ${comparisonsGenerated} player comparison pages for Phase 13.4`)

      // Phase 14: Enhance Internal Linking & Related Content
      try {
        const internalLinkResult = enhanceInternalLinking(distDir)
        console.log(`[spa-routes] Enhanced internal linking on ${internalLinkResult.filesProcessed} pages (${internalLinkResult.relatedContentAdded} related content blocks) for Phase 14`)
      } catch (e) {
        console.error('[spa-routes] Failed to enhance internal linking:', e)
      }

      // Phase 15: Inject Rich Snippets & Advanced Schema Markup
      try {
        const richSnippetResult = injectRichSnippets(distDir, ranked.length)
        console.log(`[spa-routes] Injected rich snippets (${richSnippetResult.faqSchemasAdded} FAQ + ${richSnippetResult.howToSchemasAdded} HowTo + ${richSnippetResult.dataCatalogAdded} DataCatalog) for Phase 15`)
      } catch (e) {
        console.error('[spa-routes] Failed to inject rich snippets:', e)
      }

      // Phase 16: Inject Knowledge Graph Connections & Content Recommendations
      try {
        const kgResult = injectKnowledgeGraphConnections(distDir)
        console.log(`[spa-routes] Injected knowledge graph connections into ${kgResult.recommendationsAdded} pages (${kgResult.clustersIdentified} topic clusters) for Phase 16`)
      } catch (e) {
        console.error('[spa-routes] Failed to inject knowledge graph:', e)
      }
      }
      }

    }
  }
}

export default defineConfig({
  plugins: [react(), spaRoutesPlugin()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.[hash].js',
        chunkFileNames: 'assets/app-[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      }
    }
  }
})
