/**
 * Knowledge Graph Post-Processor (Phase 16)
 *
 * Injects smart content recommendations based on topic clustering
 * and player relationships.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateContentRecommendations, generateTopicClusters } from './seo-knowledge-graph'

export interface KnowledgeGraphResult {
  pagesProcessed: number
  recommendationsAdded: number
  clustersIdentified: number
}

export function injectKnowledgeGraphConnections(distDir: string): KnowledgeGraphResult {
  let pagesProcessed = 0
  let recommendationsAdded = 0
  const clustersIdentified = new Set<string>()

  const clusters = generateTopicClusters()

  function walkAndInject(dir: string, relativePath: string = ''): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = resolve(dir, entry.name)
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

        if (entry.isDirectory()) {
          walkAndInject(fullPath, relPath)
        } else if (entry.isFile() && entry.name === 'index.html') {
          pagesProcessed++
          let content = readFileSync(fullPath, 'utf-8')

          // Skip if already has Phase 16
          if (content.includes('Phase 16')) continue

          // Generate recommendations for this path
          const recommendations = generateContentRecommendations(fullPath, 3)

          if (recommendations.length > 0) {
            // Build recommendation HTML
            const recHtml = `<div style="margin-top:32px;padding:16px;background:#1a1829;border-radius:8px;border-left:3px solid #7c4dff">
    <h3 style="color:#7c4dff;margin-top:0;font-size:14px">Related Topics</h3>
    <ul style="list-style:none;padding:0;margin:0;font-size:13px">
    ${recommendations
      .map(
        r =>
          `<li style="margin:6px 0"><a href="${r.url}" style="color:#7c4dff">${r.title}</a> <span style="color:#6b6580;font-size:12px">(${(r.relevance * 100).toFixed(0)}%)</span></li>`
      )
      .join('')}
    </ul>
    </div>
    <!-- Phase 16: Knowledge Graph Recommendations -->`

            // Inject before </body>
            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${recHtml}\n  </body>`)
              recommendationsAdded++

              // Track clusters
              recommendations.forEach(r => clustersIdentified.add(r.type))
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
  return {
    pagesProcessed,
    recommendationsAdded,
    clustersIdentified: clustersIdentified.size,
  }
}
