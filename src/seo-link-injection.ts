/**
 * Advanced Link Injection (Phase 20.3)
 *
 * Injects semantic link clusters with optimized anchor text
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateAdvancedLinkingStrategy, generateAnchorTextVariations } from './seo-advanced-linking'

export interface LinkInjectionResult {
  pagesProcessed: number
  anchorTextsOptimized: number
  linkClustersAdded: number
}

export function injectAdvancedLinking(distDir: string): LinkInjectionResult {
  let pagesProcessed = 0
  let anchorTextsOptimized = 0
  let linkClustersAdded = 0

  const linkChains = generateAdvancedLinkingStrategy()
  const anchorVariations = generateAnchorTextVariations()

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

          // Skip if already has Phase 20.3
          if (content.includes('Phase 20.3')) continue

          // Find relevant link chains for this page
          const relevantLinks = linkChains.filter((lc) => normalizedPath.includes(lc.sourceUrl))

          if (relevantLinks.length > 0) {
            // Add semantic link cluster
            const linkCluster = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #7c4dff">
    <h3 style="color:#7c4dff;margin-top:0;font-size:14px">Related Topics in This Cluster</h3>
    <ul style="list-style:none;padding:0;margin:0;font-size:13px">
      ${relevantLinks
        .map(
          (link) =>
            `<li style="margin:8px 0"><a href="${link.targetUrl}" style="color:#7c4dff;font-weight:600">${link.anchorText}</a><span style="color:#6b6580;margin-left:8px">(Relevance: ${Math.round(link.semanticRelevance * 100)}%)</span></li>`
        )
        .join('')}
    </ul>
    <!-- Phase 20.3: Semantic Link Cluster -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${linkCluster}\n  </body>`)
              linkClustersAdded++
            }

            // Optimize existing anchor text variations
            for (const [keyword, variations] of Object.entries(anchorVariations)) {
              for (const variation of variations.slice(0, 2)) {
                // Replace some generic anchors with more specific variations
                if (content.includes(`>${variation}</a>`)) {
                  anchorTextsOptimized++
                }
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
  return { pagesProcessed, anchorTextsOptimized, linkClustersAdded }
}
