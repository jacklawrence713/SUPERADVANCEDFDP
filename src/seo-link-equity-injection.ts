/**
 * Internal Link Equity Injection (Phase 22.1)
 *
 * Injects link equity optimization recommendations into pages
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { generateLinkEquityStrategy, getHighPriorityEquityGaps } from './seo-internal-link-equity'

export interface LinkEquityInjectionResult {
  pagesProcessed: number
  equityRecommendationsAdded: number
  equityIndicatorsAdded: number
}

export function injectLinkEquityOptimization(distDir: string): LinkEquityInjectionResult {
  let pagesProcessed = 0
  let equityRecommendationsAdded = 0
  let equityIndicatorsAdded = 0

  const allPages = generateLinkEquityStrategy()
  const highPriority = getHighPriorityEquityGaps()

  // Create page map
  const pageMap: Record<string, any> = {}
  for (const page of allPages) {
    const path = page.url.replace(/\//g, '\\').toLowerCase()
    pageMap[path] = page
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

          // Skip if already has Phase 22.1
          if (content.includes('Phase 22.1')) continue

          // Find matching page
          let matchedPage: any = null
          for (const [pattern, page] of Object.entries(pageMap)) {
            if (normalizedPath.includes(pattern)) {
              matchedPage = page
              break
            }
          }

          if (matchedPage) {
            // Add link equity indicator
            const equityColor = matchedPage.currentEquity >= 80 ? '#10b981' : matchedPage.currentEquity >= 65 ? '#f59e0b' : '#ef4444'
            const equityBlock = `<div style="margin-top:40px;padding:16px;background:#0a0913;border-radius:4px;border-left:3px solid ${equityColor}">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12px;color:#9b96b8">Link Equity Score</span>
      <span style="font-size:20px;font-weight:700;color:${equityColor}">${matchedPage.currentEquity}/100</span>
    </div>
    <p style="margin:8px 0 0 0;font-size:11px;color:#6b6580">Inbound: ${matchedPage.inboundLinks} | Outbound: ${matchedPage.outboundLinks}</p>
    <!-- Phase 22.1a: Link Equity Indicator -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${equityBlock}\n  </body>`)
              equityIndicatorsAdded++
            }
          }

          // Add equity recommendations for high-priority pages
          const isPriority = highPriority.some((p) => normalizedPath.includes(p.url.replace(/\//g, '\\').toLowerCase()))
          if (isPriority && matchedPage) {
            const recommendationBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #7c4dff">
    <h3 style="color:#7c4dff;margin-top:0;font-size:14px">Link Equity Optimization</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">Current equity: ${matchedPage.currentEquity}/100 | Target: ${matchedPage.targetEquity}/100</p>
    <ul style="list-style:none;padding:0;margin:8px 0;font-size:12px;color:#9b96b8">
      ${matchedPage.recommendations.map((rec: string) => `<li style="margin:6px 0">→ ${rec}</li>`).join('')}
    </ul>
    <!-- Phase 22.1b: Equity Recommendations -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${recommendationBlock}\n  </body>`)
              equityRecommendationsAdded++
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
  return { pagesProcessed, equityRecommendationsAdded, equityIndicatorsAdded }
}
