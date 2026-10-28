/**
 * Evergreen Content Injection (Phase 21.4)
 *
 * Injects evergreen optimization recommendations into pages
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateEvergreenStrategy } from './seo-evergreen-content'

export interface EvergreenInjectionResult {
  pagesProcessed: number
  optimizationRecommendationsAdded: number
  evergreenIndicatorsAdded: number
}

export function injectEvergreenContent(distDir: string): EvergreenInjectionResult {
  let pagesProcessed = 0
  let optimizationRecommendationsAdded = 0
  let evergreenIndicatorsAdded = 0

  const evergreen = generateEvergreenStrategy()

  // Map URLs to evergreen data
  const urlMap: Record<string, any> = {}
  for (const eg of evergreen) {
    const path = eg.url.replace(/\//g, '\\').toLowerCase()
    urlMap[path] = eg
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

          // Skip if already has Phase 21.4
          if (content.includes('Phase 21.4')) continue

          // Find matching evergreen content
          let matchedEvergreen: any = null
          for (const [pattern, eg] of Object.entries(urlMap)) {
            if (normalizedPath.includes(pattern)) {
              matchedEvergreen = eg
              break
            }
          }

          if (matchedEvergreen) {
            // Add evergreen score indicator
            const scoreColor =
              matchedEvergreen.evergreenScore >= 90 ? '#10b981' : matchedEvergreen.evergreenScore >= 80 ? '#f59e0b' : '#ef4444'
            const evergreenBlock = `<div style="margin-top:40px;padding:16px;background:#0a0913;border-radius:4px;border-left:3px solid ${scoreColor}">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12px;color:#9b96b8">Evergreen Score</span>
      <span style="font-size:20px;font-weight:700;color:${scoreColor}">${matchedEvergreen.evergreenScore}/100</span>
    </div>
    <p style="margin:8px 0 0 0;font-size:11px;color:#6b6580">Traffic consistency: ${matchedEvergreen.trafficConsistency}% | Estimated ${matchedEvergreen.estimatedMonthlyTraffic.toLocaleString()} monthly visits</p>
    <!-- Phase 21.4a: Evergreen Indicator -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${evergreenBlock}\n  </body>`)
              evergreenIndicatorsAdded++
            }

            // Add optimization recommendations for high-priority pages
            if (matchedEvergreen.priority === 'high') {
              const optimizationBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #7c4dff">
    <h3 style="color:#7c4dff;margin-top:0;font-size:14px">Evergreen Optimization Opportunities</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">Maintain authority with these enhancements:</p>
    <ul style="list-style:none;padding:0;margin:8px 0;font-size:12px;color:#9b96b8">
      ${matchedEvergreen.optimizationOpportunities.map((opp: string) => `<li style="margin:6px 0">→ ${opp}</li>`).join('')}
    </ul>
    <!-- Phase 21.4b: Optimization Recommendations -->
  </div>`

              if (content.includes('</body>')) {
                content = content.replace('</body>', `\n  ${optimizationBlock}\n  </body>`)
                optimizationRecommendationsAdded++
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
  return { pagesProcessed, optimizationRecommendationsAdded, evergreenIndicatorsAdded }
}
