/**
 * Build-time SEO Integration
 *
 * Exports functions used by vite.config.ts to generate
 * landing pages, directories, and other SEO pages.
 */

import { resolve } from 'path'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { generatePlayerDirectoryHtml, generatePositionDirectoryHtml } from './seo-player-directory'
import { generateLandingPageHtml } from './seo-page-generator'
import { SEO_ROUTES, findRoute, SeoRoute } from './seo-routes'
import { SeoRankedPlayer } from './seo-data'

/**
 * Generate all player directory pages
 */
export function generatePlayerDirectories(
  distDir: string,
  allPlayers: SeoRankedPlayer[],
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): { generated: number; urls: string[] } {
  const playersDir = resolve(distDir, 'players')
  if (!existsSync(playersDir)) mkdirSync(playersDir, { recursive: true })

  let generated = 0
  const urls: string[] = []

  // Generate master /players/ page
  const masterDir = resolve(playersDir, 'index.html')
  const masterHtml = generatePlayerDirectoryHtml(
    {
      slug: '/players/',
      title: 'Dynasty Players Directory | Browse 1,000+ Fantasy Football Players',
      description:
        'Browse all 1,000+ dynasty fantasy football players. Find players by position, team, age, and FDP Value.',
      h1: 'Dynasty Players Directory',
      players: allPlayers,
      totalCount: allPlayers.length,
    },
    appScripts,
    appPreloads,
    darkModeScript
  )
  writeFileSync(masterDir, masterHtml)
  urls.push('/players/')
  generated++

  // Generate position directories
  const positions = ['QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB']
  for (const pos of positions) {
    const posPlayers = allPlayers.filter(p => p.pos === pos)
    if (posPlayers.length === 0) continue

    const posDir = resolve(playersDir, pos.toLowerCase())
    if (!existsSync(posDir)) mkdirSync(posDir, { recursive: true })

    const posHtml = generatePositionDirectoryHtml(pos, posPlayers, appScripts, appPreloads, darkModeScript)
    writeFileSync(resolve(posDir, 'index.html'), posHtml)
    urls.push(`/players/${pos.toLowerCase()}/`)
    generated++
  }

  console.log(`[spa-routes] Generated ${generated} player directory pages`)
  return { generated, urls }
}

/**
 * Generate landing pages for registry routes
 * (guides, authority, strategy, hubs, etc.)
 *
 * Note: Phase 10 custom guide generators create their own specific
 * guide content, so we skip those routes here to avoid duplicates.
 */
export function generateRegistryLandingPages(
  distDir: string,
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): { generated: number; urls: string[] } {
  const categoriesToGenerate = ['guide', 'authority', 'hub']
  // Skip these guide routes - they're handled by Phase 10 custom generators
  const phase10GuideRoutes = new Set([
    '/guides/',
    '/guides/how-to-value-a-dynasty-trade/',
    '/guides/dynasty-trade-calculator-guide/',
    '/guides/superflex-strategy/',
    '/guides/te-premium-strategy/',
    '/guides/idp-dynasty-values/',
  ])
  const generated = new Map<string, boolean>()
  const urls: string[] = []

  for (const route of SEO_ROUTES) {
    if (!categoriesToGenerate.includes(route.category)) continue
    if (route.slug === '/') continue // Skip homepage
    if (phase10GuideRoutes.has(route.slug)) continue // Skip Phase 10 guides (handled separately)
    if (generated.has(route.slug)) continue // Skip duplicates

    // Create directory structure
    const urlPath = route.slug.replace(/\/$/, '') // Remove trailing slash
    const parts = urlPath.split('/').filter(Boolean)
    let pageDir = distDir

    for (const part of parts) {
      pageDir = resolve(pageDir, part)
    }

    if (!existsSync(pageDir)) mkdirSync(pageDir, { recursive: true })

    // Generate landing page HTML
    const content = generateLandingPageContent(route)
    const html = generateLandingPageHtml(
      route,
      content,
      appScripts,
      appPreloads,
      darkModeScript
    )

    writeFileSync(resolve(pageDir, 'index.html'), html)
    generated.set(route.slug, true)
    urls.push(route.slug)
  }

  const count = generated.size
  console.log(`[spa-routes] Generated ${count} landing pages for guides/authority/strategy`)
  return { generated: count, urls }
}

/**
 * Generate appropriate content for a landing page based on route category
 */
function generateLandingPageContent(route: SeoRoute): string {
  if (route.category === 'guide') {
    if (route.slug === '/guides/') {
      return `
        <section>
          <h2 style="color:#7c4dff;font-size:18px;margin:24px 0 12px 0">Dynasty Strategy Guides</h2>
          <p>Learn the fundamentals and advanced tactics for dynasty fantasy football.</p>
          <ul style="list-style:none;padding:0">
            <li style="margin:12px 0"><a href="/guides/how-to-value-a-dynasty-trade/" style="color:#7c4dff">How to Value a Dynasty Trade</a></li>
            <li style="margin:12px 0"><a href="/guides/dynasty-trade-calculator-guide/" style="color:#7c4dff">Dynasty Trade Calculator Guide</a></li>
            <li style="margin:12px 0"><a href="/guides/superflex-strategy/" style="color:#7c4dff">Superflex Strategy</a></li>
            <li style="margin:12px 0"><a href="/guides/te-premium-strategy/" style="color:#7c4dff">TE Premium Strategy</a></li>
            <li style="margin:12px 0"><a href="/guides/idp-dynasty-values/" style="color:#7c4dff">IDP Dynasty Values</a></li>
          </ul>
        </section>
      `
    }

    // Individual guide pages
    const guides: Record<string, string> = {
      '/guides/how-to-value-a-dynasty-trade/':
        '<h2 style="color:#7c4dff;font-size:18px;margin:24px 0 12px 0">Key Principles</h2><p>A strong dynasty trade is about perceived value differences between both sides. The goal is to identify when you and your counterpart disagree on player values.</p><h2 style="color:#7c4dff;font-size:18px;margin:24px 0 12px 0">Use FDP Value</h2><p>Check <a href="/dynasty-trade-analyzer/" style="color:#7c4dff">our trade analyzer</a> to understand current market values and identify imbalances.</p>',
      '/guides/dynasty-trade-calculator-guide/':
        '<h2 style="color:#7c4dff;font-size:18px;margin:24px 0 12px 0">Getting Started</h2><p>The <a href="/dynasty-trade-calculator/" style="color:#7c4dff">Dynasty Trade Calculator</a> helps you explore trade scenarios with real FDP Values.</p><p>Input any combination of players and see the total value for each side.</p>',
      '/guides/superflex-strategy/':
        '<h2 style="color:#7c4dff;font-size:18px;margin:24px 0 12px 0">Superflex Basics</h2><p>In Superflex (2QB) leagues, quarterback value increases significantly. QB demand drives up their price.</p><p>Check <a href="/superflex-rankings/" style="color:#7c4dff">Superflex rankings</a> to see how values change.</p>',
      '/guides/te-premium-strategy/':
        '<h2 style="color:#7c4dff;font-size:18px;margin:24px 0 12px 0">TE Premium Strategy</h2><p>When TE scoring is boosted, tight end value increases. Position scarcity becomes even more important.</p><p>See <a href="/te-premium-rankings/" style="color:#7c4dff">TE Premium rankings</a> for comparisons.</p>',
      '/guides/idp-dynasty-values/':
        '<h2 style="color:#7c4dff;font-size:18px;margin:24px 0 12px 0">IDP Valuation</h2><p>Defensive positions (DL, LB, DB) have their own valuation curve. Learn how to value them relative to offensive players.</p><p>Check <a href="/idp-dynasty-rankings/" style="color:#7c4dff">IDP rankings</a> for current values.</p>',
    }

    return guides[route.slug] || '<p>Coming soon.</p>'
  }

  if (route.category === 'authority') {
    const content: Record<string, string> = {
      '/about/':
        '<p>Fantasy Draft Pros is a dynasty fantasy football trade calculator and player valuation tool.</p><p>We support the following league formats: <strong>1QB, Superflex (2QB), TE Premium, and IDP (full defensive scoring)</strong>.</p><h2 style="color:#7c4dff;font-size:18px;margin:24px 0 12px 0">Tools</h2><ul style="list-style:none;padding:0"><li style="margin:8px 0"><a href="/dynasty-trade-analyzer/" style="color:#7c4dff">Dynasty Trade Analyzer</a> — Analyze any trade</li><li style="margin:8px 0"><a href="/dynasty-trade-calculator/" style="color:#7c4dff">Dynasty Trade Calculator</a> — Explore scenarios</li><li style="margin:8px 0"><a href="/dynasty-rankings/" style="color:#7c4dff">Dynasty Rankings</a> — Browse all players</li><li style="margin:8px 0"><a href="/superflex-rankings/" style="color:#7c4dff">Superflex Rankings</a> — 2QB leagues</li></ul>',
      '/methodology/':
        '<p>FDP Value is our proprietary dynasty player valuation system.</p><h2 style="color:#7c4dff;font-size:18px;margin:24px 0 12px 0">The Scale</h2><p>All players are valued from 0 to 9,999. Higher value = greater trade value.</p><h2 style="color:#7c4dff;font-size:18px;margin:24px 0 12px 0">Factors</h2><ul style="list-style:none;padding:0"><li style="margin:8px 0"><strong>Age Adjustment</strong> — Youth bonus for pre-prime players</li><li style="margin:8px 0"><strong>Position Scarcity</strong> — Supply and demand for each position</li><li style="margin:8px 0"><strong>Scoring Format</strong> — PPR, Half PPR, Standard impacts value</li><li style="margin:8px 0"><strong>Superflex/TE Premium</strong> — Format multipliers applied</li><li style="margin:8px 0"><strong>IDP Support</strong> — Full defensive scoring support</li></ul>',
      '/editorial-policy/':
        '<p>Fantasy Draft Pros maintains data integrity through a consistent, transparent process.</p><h2 style="color:#7c4dff;font-size:18px;margin:24px 0 12px 0">Independence</h2><p>We are not affiliated with the NFL, ESPN, Sleeper, or any sportsbook. Our values are independent market-informed assessments.</p><h2 style="color:#7c4dff;font-size:18px;margin:24px 0 12px 0">Corrections</h2><p>If you spot an error, please contact us. We correct data errors promptly and transparently.</p>',
    }
    return content[route.slug] || '<p>Coming soon.</p>'
  }

  if (route.category === 'hub') {
    return `
      <p>Dynasty fantasy football is a long-term strategy game where you build a roster across multiple seasons.</p>
      <h2 style="color:#7c4dff;font-size:18px;margin:24px 0 12px 0">Learn Dynasty</h2>
      <ul style="list-style:none;padding:0">
        <li style="margin:8px 0"><a href="/methodology/" style="color:#7c4dff">How We Value Players</a></li>
        <li style="margin:8px 0"><a href="/guides/how-to-value-a-dynasty-trade/" style="color:#7c4dff">How to Value a Trade</a></li>
        <li style="margin:8px 0"><a href="/guides/superflex-strategy/" style="color:#7c4dff">Superflex Strategy</a></li>
      </ul>
      <h2 style="color:#7c4dff;font-size:18px;margin:24px 0 12px 0">Tools</h2>
      <ul style="list-style:none;padding:0">
        <li style="margin:8px 0"><a href="/dynasty-trade-analyzer/" style="color:#7c4dff">Dynasty Trade Analyzer</a></li>
        <li style="margin:8px 0"><a href="/dynasty-rankings/" style="color:#7c4dff">Dynasty Rankings</a></li>
        <li style="margin:8px 0"><a href="/superflex-rankings/" style="color:#7c4dff">Superflex Rankings</a></li>
      </ul>
    `
  }

  return '<p>Coming soon.</p>'
}
