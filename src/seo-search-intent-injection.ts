/**
 * Search Intent Post-Processor (Phase 18)
 *
 * Optimizes pages for specific search intents by:
 * - Adding intent-aligned CTAs
 * - Cross-linking related intent content
 * - Creating bridges between similar intents
 * - Optimizing for long-tail keywords
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateSearchIntentMap, generateLongTailKeywords, analyzeContentGaps } from './seo-search-intent'

export interface SearchIntentResult {
  pagesProcessed: number
  intentOptimized: number
  crossLinksAdded: number
  ctasAdded: number
}

export function optimizeForSearchIntent(distDir: string): SearchIntentResult {
  let pagesProcessed = 0
  let intentOptimized = 0
  let crossLinksAdded = 0
  let ctasAdded = 0

  const intentMap = generateSearchIntentMap()
  const gaps = analyzeContentGaps()

  // Map intents to page patterns
  const intentPageMap: Record<string, Array<{ pattern: string; intent: string; cta: string }>> = {
    informational: [
      {
        pattern: '/dynasty-basics/',
        intent: 'informational',
        cta: '<a href="https://fantasydraftpros.com/dynasty-trade-analyzer/" style="background:#7c4dff;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:700">Try the Trade Analyzer →</a>',
      },
      {
        pattern: '/guides/',
        intent: 'informational',
        cta: '<a href="https://fantasydraftpros.com/dynasty-rankings/" style="background:#7c4dff;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:700">View Rankings →</a>',
      },
    ],
    commercial: [
      {
        pattern: '/dynasty-trade-analyzer/',
        intent: 'commercial',
        cta: '<a href="https://fantasydraftpros.com/guides/how-to-value-a-dynasty-trade/" style="background:#7c4dff;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:700">Learn Valuation Strategy →</a>',
      },
      {
        pattern: '/format-strategy/',
        intent: 'commercial',
        cta: '<a href="https://fantasydraftpros.com/comparisons/" style="background:#7c4dff;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:700">Compare Players →</a>',
      },
    ],
    transactional: [
      {
        pattern: '/dynasty-trade-calculator/',
        intent: 'transactional',
        cta: '<a href="https://fantasydraftpros.com/guides/how-to-value-a-dynasty-trade/" style="background:#7c4dff;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:700">Learn Valuation First →</a>',
      },
      {
        pattern: '/players/',
        intent: 'transactional',
        cta: '<a href="https://fantasydraftpros.com/dynasty-trade-analyzer/" style="background:#7c4dff;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:700">Analyze a Trade →</a>',
      },
    ],
    navigational: [
      {
        pattern: '/rankings/',
        intent: 'navigational',
        cta: '<a href="https://fantasydraftpros.com/dynasty-trade-analyzer/" style="background:#7c4dff;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:700">Analyze Trades with These Rankings →</a>',
      },
    ],
  }

  function walkAndOptimize(dir: string, depth: number = 0): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = resolve(dir, entry.name)
        const normalizedPath = fullPath.replace(/\\/g, '/')

        if (entry.isDirectory() && depth < 3) {
          walkAndOptimize(fullPath, depth + 1)
        } else if (entry.isFile() && entry.name === 'index.html') {
          pagesProcessed++
          let content = readFileSync(fullPath, 'utf-8')

          // Skip if already has Phase 18
          if (content.includes('Phase 18')) continue

          // Determine intent based on path
          let addedOptimization = false

          for (const [intentType, patterns] of Object.entries(intentPageMap)) {
            for (const patternData of patterns) {
              if (normalizedPath.includes(patternData.pattern)) {
                // Add intent-aligned section before </body>
                const intentSection = `<div style="background:#1a1829;padding:20px;border-radius:8px;margin:24px 0;border-left:4px solid #7c4dff">
    <h3 style="color:#7c4dff;margin-top:0;font-size:16px">Next Step</h3>
    <p style="margin:8px 0;font-size:14px;color:#9b96b8">Ready to apply this knowledge to your league?</p>
    <p style="margin:12px 0">${patternData.cta}</p>
    <!-- Phase 18: Search Intent Optimization -->
    </div>`

                if (content.includes('</body>')) {
                  content = content.replace('</body>', `\n  ${intentSection}\n  </body>`)
                  ctasAdded++
                  addedOptimization = true
                }

                // Add cross-link to related content
                const crossLinkSection = `<div style="margin-top:24px;padding:16px;background:#0a0913;border-radius:4px;border-left:2px solid #7c4dff;font-size:13px;color:#9b96b8">
    <strong style="color:#7c4dff">Related Content:</strong> Explore more on <a href="https://fantasydraftpros.com/" style="color:#7c4dff">Fantasy Draft Pros</a>
    </div>`

                if (content.includes('</body>') && normalizedPath.includes(patternData.pattern)) {
                  content = content.replace('</body>', `\n  ${crossLinkSection}\n  </body>`)
                  crossLinksAdded++
                }
              }
            }
          }

          if (addedOptimization) {
            intentOptimized++
            writeFileSync(fullPath, content)
          }
        }
      }
    } catch (e) {
      // Skip errors
    }
  }

  walkAndOptimize(distDir)
  return { pagesProcessed, intentOptimized, crossLinksAdded, ctasAdded }
}
