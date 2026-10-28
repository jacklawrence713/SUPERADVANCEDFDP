/**
 * Content Refresh Injection (Phase 21.2)
 *
 * Injects content refresh and update recommendations
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateContentRefreshStrategy, getCriticalRefreshPages, generateFreshnessScore } from './seo-content-refresh'

export interface RefreshInjectionResult {
  pagesProcessed: number
  refreshRecommendationsAdded: number
  freshnessIndicatorsAdded: number
}

export function injectContentRefresh(distDir: string): RefreshInjectionResult {
  let pagesProcessed = 0
  let refreshRecommendationsAdded = 0
  let freshnessIndicatorsAdded = 0

  const refreshes = generateContentRefreshStrategy()
  const criticalRefreshes = getCriticalRefreshPages()

  // Map pages to refresh data
  const pageToRefreshMap: Record<string, any> = {}
  for (const refresh of refreshes) {
    const path = refresh.url.replace(/\//g, '\\').toLowerCase()
    pageToRefreshMap[path] = refresh
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

          // Skip if already has Phase 21.2
          if (content.includes('Phase 21.2')) continue

          // Find matching refresh data
          let matchedRefresh: any = null
          for (const [pattern, refresh] of Object.entries(pageToRefreshMap)) {
            if (normalizedPath.includes(pattern)) {
              matchedRefresh = refresh
              break
            }
          }

          if (matchedRefresh) {
            // Calculate freshness score
            const freshnessScore = generateFreshnessScore(matchedRefresh.ageInDays)

            // Add freshness indicator
            const freshnessColor = freshnessScore >= 80 ? '#10b981' : freshnessScore >= 60 ? '#f59e0b' : '#ef4444'
            const freshnessBlock = `<div style="margin-top:40px;padding:16px;background:#0a0913;border-radius:4px;border-left:3px solid ${freshnessColor}">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12px;color:#9b96b8">Content Freshness Score</span>
      <span style="font-size:20px;font-weight:700;color:${freshnessColor}">${Math.round(freshnessScore)}/100</span>
    </div>
    <p style="margin:8px 0 0 0;font-size:11px;color:#6b6580">Last updated ${matchedRefresh.ageInDays} days ago</p>
    <!-- Phase 21.2a: Freshness Indicator -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${freshnessBlock}\n  </body>`)
              freshnessIndicatorsAdded++
            }

            // Add refresh recommendations for critical pages
            if (matchedRefresh.refreshPriority === 'critical' || matchedRefresh.refreshPriority === 'high') {
              const refreshBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #ef4444">
    <h3 style="color:#ef4444;margin-top:0;font-size:14px">Recommended Updates</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">${matchedRefresh.refreshReason}</p>
    <ul style="list-style:none;padding:0;margin:8px 0;font-size:12px">
      ${matchedRefresh.suggestedUpdates.map((update: string) => `<li style="color:#7c4dff;margin:6px 0">✓ ${update}</li>`).join('')}
    </ul>
    <!-- Phase 21.2b: Refresh Recommendations -->
  </div>`

              if (content.includes('</body>')) {
                content = content.replace('</body>', `\n  ${refreshBlock}\n  </body>`)
                refreshRecommendationsAdded++
              }
            }

            writeFileSync(fullPath, content)
          }
        }
      }
    } catch (e) {
      // Skip errors
    }
  }

  walkAndInject(distDir)
  return { pagesProcessed, refreshRecommendationsAdded, freshnessIndicatorsAdded }
}
