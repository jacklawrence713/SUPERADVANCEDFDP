/**
 * Trending Topics Injection (Phase 21.5)
 *
 * Injects trending topic insights and real-time opportunities into pages
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateTrendingTopics, getImmediateTrends } from './seo-trending-topics'

export interface TrendingInjectionResult {
  pagesProcessed: number
  trendingInsightsAdded: number
  trendingAlertsAdded: number
}

export function injectTrendingTopics(distDir: string): TrendingInjectionResult {
  let pagesProcessed = 0
  let trendingInsightsAdded = 0
  let trendingAlertsAdded = 0

  const allTrends = generateTrendingTopics()
  const immediateTrends = getImmediateTrends()

  // Create trend map for page matching
  const trendMap: Record<string, any[]> = {}
  for (const trend of allTrends) {
    for (const page of trend.relatedPages) {
      const path = page.replace(/\//g, '\\').toLowerCase()
      if (!trendMap[path]) {
        trendMap[path] = []
      }
      trendMap[path].push(trend)
    }
  }

  function walkAndInject(dir: string, depth: number = 0): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = resolve(dir, entry.name)
        const normalizedPath = fullPath.replace(/\\/g, '/').toLowerCase()

        if (entry.isDirectory() && depth < 3) {
          walkAndInject(fullPath, depth + 1)
        } else if (entry.isFile() && entry.name === 'index.html') {
          pagesProcessed++
          let content = readFileSync(fullPath, 'utf-8')

          // Skip if already has Phase 21.5
          if (content.includes('Phase 21.5')) continue

          // Find matching trending topics
          const matchedTrends: any[] = []
          for (const [pattern, trends] of Object.entries(trendMap)) {
            if (normalizedPath.includes(pattern)) {
              matchedTrends.push(...trends)
            }
          }

          if (matchedTrends.length > 0) {
            // Add trending insights block
            const topTrend = matchedTrends[0]
            const trendingBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #06b6d4">
    <h3 style="color:#06b6d4;margin-top:0;font-size:14px">Trending Insights</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">Search momentum: <strong>${topTrend.trendingVolume.toLocaleString()} searches</strong> (${topTrend.momentum}% trending)</p>
    <div style="margin-top:12px">
      <strong style="color:#06b6d4;font-size:12px">Related searches gaining traction:</strong>
      <ul style="list-style:none;padding:0;margin:8px 0;font-size:12px;color:#9b96b8">
        <li style="margin:4px 0">→ ${topTrend.query}</li>
        ${matchedTrends.slice(1, 2).map((t: any) => `<li style="margin:4px 0">→ ${t.query}</li>`).join('')}
      </ul>
    </div>
    <!-- Phase 21.5a: Trending Insights -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${trendingBlock}\n  </body>`)
              trendingInsightsAdded++
            }
          }

          // Add immediate action alerts for high-priority pages
          const immediateMatch = immediateTrends.find((t) =>
            t.relatedPages.some((p) => normalizedPath.includes(p.replace(/\//g, '\\').toLowerCase()))
          )

          if (immediateMatch) {
            const alertBlock = `<div style="margin-top:40px;padding:20px;background:#7c3aed;border-radius:8px;border-left:4px solid #06b6d4">
    <h3 style="color:#06b6d4;margin-top:0;font-size:14px;text-transform:uppercase">⚡ Trending Opportunity Alert</h3>
    <p style="color:#e0d5ff;margin:8px 0;font-size:12px"><strong>"${immediateMatch.query}"</strong> is gaining traction (${immediateMatch.momentum}% momentum)</p>
    <ul style="list-style:none;padding:0;margin:8px 0;font-size:12px;color:#e0d5ff">
      ${immediateMatch.contentOpportunities.slice(0, 2).map((opp: string) => `<li style="margin:4px 0">→ ${opp}</li>`).join('')}
    </ul>
    <!-- Phase 21.5b: Trending Alert -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${alertBlock}\n  </body>`)
              trendingAlertsAdded++
            }
          }

          writeFileSync(fullPath, content)
        }
      }
    } catch (e) {
      // Skip errors
    }
  }

  walkAndInject(distDir)
  return { pagesProcessed, trendingInsightsAdded, trendingAlertsAdded }
}
