import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { writeFileSync, readFileSync, readdirSync, statSync } from 'fs'
import { computeDynastyTradeVal, playerSlug, VALUES_UPDATED_AT } from './src/logic'

// Parse the PLAYERS array from afdp.tsx source at build time.
// Uses bracket-counting to find the array boundaries, then evaluates it.
function parsePlayers(srcPath: string): Array<{ name: string; pos: string; age: number; team: string; ktcVal?: number; proj: { PPR: number; Half: number; Standard: number } }> {
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
  const arrayStr = src.substring(arrayStart, i + 1)
  return new Function('return ' + arrayStr)() as any
}

// Compute canonical dynasty PPR trade values for all players, returning
// sorted list with posRank and overall rank assigned.
function rankAllPlayers(players: ReturnType<typeof parsePlayers>) {
  const defaultOpts = { isSF: false, sKey: 'PPR', tePremium: 0, idpMode: false }
  const withVals = players.map(p => ({
    name: p.name,
    pos: p.pos,
    age: p.age,
    team: p.team,
    ktcVal: p.ktcVal,
    slug: playerSlug(p.name),
    tradeVal: computeDynastyTradeVal(p.pos, p.age, p.ktcVal, 1, p.proj?.PPR || 0, defaultOpts),
    posRank: 0,
    rank: 0,
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

// Generate player-specific HTML that includes:
// - Player-specific title, meta description, canonical URL, OG, Twitter, JSON-LD
// - The SPA app scripts (React hydrates on load, replacing the fallback content)
// Crawlers see unique, canonical metadata; users get the full SPA experience.
function generatePlayerHtml(
  player: { name: string; pos: string; age: number; team: string; tradeVal: number; posRank: number; rank: number; slug: string },
  appScripts: string,
  appPreloads: string,
  darkModeScript: string,
): string {
  const { pos, team, age, tradeVal, posRank, slug } = player
  // Escape for safe HTML attribute and JSON-LD insertion
  const name = player.name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const jsonName = player.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const url = `https://fantasydraftpros.com/players/${slug}/`
  const valStr = tradeVal.toLocaleString('en-US')
  const title = `${name} Dynasty Value & Trade Analysis 2026 | Fantasy Draft Pros`
  const desc = `${name} dynasty trade value: ${valStr}. ${pos}${posRank} for ${team}. Age ${age}. Dynasty rankings, comparable players, and trade analysis at Fantasy Draft Pros.`
  const ogDesc = `${name} dynasty trade value: ${valStr}. ${pos} for ${team}. Rankings and trade analysis.`

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta name="author" content="Fantasy Draft Pros" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
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
    <p style="font-size:13px;color:#5c5880;margin-bottom:24px">Values as of ${VALUES_UPDATED_AT}</p>
    <p style="font-size:14px;color:#9b96b8">Loading full analysis...</p>
  </div></div>
  <noscript>
    <div style="background:#13111e;color:#ffffff;padding:40px 20px;font-family:sans-serif;text-align:center">
      <h1 style="color:#7c4dff">${name} — Dynasty Value &amp; Trade Analysis</h1>
      <p>${name} is a ${pos} for ${team}. FDP dynasty value: ${valStr}. Visit <a href="https://fantasydraftpros.com/" style="color:#7c4dff">Fantasy Draft Pros</a> for full trade analysis, dynasty rankings, and comparable players.</p>
    </div>
  </noscript>
</body>
</html>`
}

// Build-time plugin: generates 404.html for SPA routing and player-specific
// SEO pages with canonical FDP values from the shared valuation engine.
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
      // Extract entire inline script block (dark mode + error handlers)
      const inlineScriptMatch = index.match(/<script>\n?([\s\S]*?)<\/script>/)
      const appScripts = scriptMatch.join('\n  ')
      const appPreloads = preloadMatch.join('\n  ')
      const darkModeScript = inlineScriptMatch ? inlineScriptMatch[1].trim() : ''

      // Parse PLAYERS from afdp.tsx and compute canonical values
      let ranked: ReturnType<typeof rankAllPlayers>
      try {
        const players = parsePlayers(resolve(__dirname, 'afdp.tsx'))
        ranked = rankAllPlayers(players)
        console.log(`[spa-routes] Parsed ${players.length} players, computed canonical values`)
      } catch (e) {
        console.error('[spa-routes] Failed to parse PLAYERS:', e)
        // Fallback: overwrite with SPA shell (better than stale static pages)
        const playersDir = resolve(distDir, 'players')
        try {
          const slugs = readdirSync(playersDir).filter(f => statSync(resolve(playersDir, f)).isDirectory())
          for (const slug of slugs) { writeFileSync(resolve(playersDir, slug, 'index.html'), index) }
          console.log(`[spa-routes] Fallback: overwrote ${slugs.length} player pages with SPA shell`)
        } catch { /* no player dirs */ }
        return
      }

      // Build slug→player lookup
      const bySlug = new Map(ranked.map(p => [p.slug, p]))

      // Generate player-specific SEO pages for each existing directory
      const playersDir = resolve(distDir, 'players')
      try {
        const slugDirs = readdirSync(playersDir).filter(f => statSync(resolve(playersDir, f)).isDirectory())
        let generated = 0
        for (const slug of slugDirs) {
          const player = bySlug.get(slug)
          if (player) {
            const html = generatePlayerHtml(player, appScripts, appPreloads, darkModeScript)
            writeFileSync(resolve(playersDir, slug, 'index.html'), html)
            generated++
          } else {
            // Unknown slug — use SPA shell as fallback
            writeFileSync(resolve(playersDir, slug, 'index.html'), index)
            console.warn(`[spa-routes] Unknown player slug "${slug}" — using SPA shell`)
          }
        }
        console.log(`[spa-routes] Generated ${generated} player-specific SEO pages`)
      } catch {
        // No player directories — that's fine
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
