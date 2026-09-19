import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs'
import { computeDynastyTradeVal, playerSlug, tierLabel, VALUES_UPDATED_AT } from './src/logic'

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
      let ranked: RankedPlayer[]
      try {
        const players = parsePlayers(resolve(__dirname, 'afdp.tsx'))
        ranked = rankAllPlayers(players)
        console.log(`[spa-routes] Parsed ${players.length} players, computed canonical values`)
      } catch (e) {
        console.error('[spa-routes] Failed to parse PLAYERS:', e)
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

      // Generate player pages
      const playersDir = resolve(distDir, 'players')
      if (!existsSync(playersDir)) mkdirSync(playersDir, { recursive: true })
      let generated = 0
      for (const player of deduped) {
        const shouldIndex = isIndexEligible(player)
        // Find 3 comparable players (same position, closest value, excluding self)
        const comps = deduped
          .filter(c => c.name !== player.name && c.pos === player.pos)
          .sort((a, b) => Math.abs(a.tradeVal - player.tradeVal) - Math.abs(b.tradeVal - player.tradeVal))
          .slice(0, 3)
        const dir = resolve(playersDir, player.slug)
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        writeFileSync(resolve(dir, 'index.html'), generatePlayerHtml(player, comps, appScripts, appPreloads, darkModeScript, shouldIndex))
        generated++
      }
      console.log(`[spa-routes] Generated ${generated} player pages (${indexable.length} indexed, ${noindex.length} noindex)`)

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

      // Generate sitemap — only indexable pages, lastmod from VALUES_UPDATED_AT
      const sitemap = generateSitemap(indexable.map(p => p.slug), VALUES_UPDATED_AT)
      writeFileSync(resolve(distDir, 'sitemap.xml'), sitemap)
      console.log(`[spa-routes] Generated sitemap.xml with ${indexable.length} player URLs`)
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
