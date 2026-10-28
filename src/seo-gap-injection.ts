/**
 * Content Gap Injection (Phase 20.4)
 *
 * Injects content gap opportunities and expansion suggestions
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { analyzeContentGaps, getGapsByPriority } from './seo-gap-analysis'

export interface GapInjectionResult {
  pagesProcessed: number
  gapOpportunitiesAdded: number
  gapsIdentified: number
}

export function injectContentGaps(distDir: string): GapInjectionResult {
  let pagesProcessed = 0
  let gapOpportunitiesAdded = 0

  const allGaps = analyzeContentGaps()
  const highPriorityGaps = getGapsByPriority('high')
  const mediumPriorityGaps = getGapsByPriority('medium')

  // Map pages to suggested gaps
  const pageToGapMap: Record<string, string[]> = {
    'guides': highPriorityGaps.map((g) => g.keyword).slice(0, 3),
    'dynasty-basics': highPriorityGaps.filter((g) => g.keyword.includes('rookie')).map((g) => g.keyword),
    'trading-strategies': highPriorityGaps.filter((g) => g.keyword.includes('trade')).map((g) => g.keyword),
  }

  function walkAndInject(dir: string, depth: number = 0): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = resolve(dir, entry.name)
        const normalizedPath = fullPath.replace(/\\/g, '/')

        if (entry.isDirectory() && depth < 3) {
          walkAndInject(fullPath, depth + 1)
        } else if (entry.isFile() && entry.name === 'index.html') {
          pagesProcessed++
          let content = readFileSync(fullPath, 'utf-8')

          // Skip if already has Phase 20.4
          if (content.includes('Phase 20.4')) continue

          // Find relevant gaps for this page
          let relevantGaps: string[] = []
          for (const [pattern, gaps] of Object.entries(pageToGapMap)) {
            if (normalizedPath.includes(pattern)) {
              relevantGaps = gaps
              break
            }
          }

          if (relevantGaps.length > 0) {
            // Add content gap opportunity block
            const gapBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #f59e0b">
    <h3 style="color:#f59e0b;margin-top:0;font-size:14px">Content We're Working On</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">Upcoming guides based on community search interests:</p>
    <ul style="list-style:none;padding:0;margin:8px 0">
      ${relevantGaps
        .map(
          (gap) =>
            `<li style="margin:6px 0;color:#7c4dff;font-size:12px">→ ${gap.charAt(0).toUpperCase() + gap.slice(1)}</li>`
        )
        .join('')}
    </ul>
    <!-- Phase 20.4: Content Gap Opportunities -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${gapBlock}\n  </body>`)
              gapOpportunitiesAdded++
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
  return { pagesProcessed, gapOpportunitiesAdded, gapsIdentified: allGaps.length }
}
