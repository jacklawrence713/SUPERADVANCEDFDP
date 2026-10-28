/**
 * Authority Expansion Injection (Phase 21.3)
 *
 * Injects authority expansion and content deepening recommendations
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateAuthorityExpansionStrategy, generateContentHierarchy } from './seo-authority-expansion'

export interface ExpansionInjectionResult {
  pagesProcessed: number
  expansionOpportunitiesAdded: number
  hierarchiesInjected: number
}

export function injectAuthorityExpansion(distDir: string): ExpansionInjectionResult {
  let pagesProcessed = 0
  let expansionOpportunitiesAdded = 0
  let hierarchiesInjected = 0

  const expansions = generateAuthorityExpansionStrategy()

  // Map topic pages to expansions
  const topicPageMap: Record<string, string> = {
    'trade': 'Dynasty Trade Valuation',
    'superflex': 'Superflex Format Strategy',
    'rebuild': 'Dynasty Rebuild Strategy',
    'rookie': 'Rookie Evaluation Framework',
    'te-premium': 'TE Premium Format Mastery',
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

          // Skip if already has Phase 21.3
          if (content.includes('Phase 21.3')) continue

          // Find matching expansion
          let matchedExpansion: string | null = null
          for (const [pattern, topic] of Object.entries(topicPageMap)) {
            if (normalizedPath.includes(pattern)) {
              matchedExpansion = topic
              break
            }
          }

          if (matchedExpansion) {
            const expansion = expansions.find((e) => e.parentTopic === matchedExpansion)
            if (!expansion) continue

            // Add expansion opportunities
            const expansionBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #6b6580">
    <h3 style="color:#6b6580;margin-top:0;font-size:14px">Authority Expansion Opportunities</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">Deepen this topic cluster with advanced content:</p>
    <ul style="list-style:none;padding:0;margin:8px 0;font-size:12px;color:#9b96b8">
      ${expansion.expansionOpportunities.map((opp) => `<li style="margin:6px 0">→ ${opp}</li>`).join('')}
    </ul>
    <!-- Phase 21.3: Authority Expansion -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${expansionBlock}\n  </body>`)
              expansionOpportunitiesAdded++
            }

            // Add content hierarchy for main topic pages
            if (normalizedPath.includes('/guides/') || normalizedPath.includes('/trading-strategies/')) {
              const hierarchy = generateContentHierarchy(expansion.parentTopic)
              const hierarchyBlock = `<div style="margin-top:40px;padding:20px;background:#0a0913;border-radius:8px;border-left:4px solid #6b6580">
    <h3 style="color:#6b6580;margin-top:0;font-size:14px">Content Hierarchy</h3>
    <div style="font-size:12px;color:#9b96b8;line-height:1.8">
      ${hierarchy.map((h) => `<div style="margin-left:${(h.level - 1) * 12}px;color:${h.status === 'Existing' ? '#10b981' : '#f59e0b'}">L${h.level} · ${h.title} (${h.type})</div>`).join('')}
    </div>
    <!-- Phase 21.3-hierarchy: Content Hierarchy -->
  </div>`

              if (content.includes('</body>')) {
                content = content.replace('</body>', `\n  ${hierarchyBlock}\n  </body>`)
                hierarchiesInjected++
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
  return { pagesProcessed, expansionOpportunitiesAdded, hierarchiesInjected }
}
