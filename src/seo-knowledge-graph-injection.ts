/**
 * Knowledge Graph Injection (Phase 16)
 *
 * Injects knowledge graph connections and related content recommendations
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { generatePlayerKnowledgeGraph, generateContentRecommendations, generateTopicClusters } from './seo-knowledge-graph'

export interface KnowledgeGraphInjectionResult {
  pagesProcessed: number
  connectionsAdded: number
  recommendationsAdded: number
}

export function injectKnowledgeGraphConnections(distDir: string): KnowledgeGraphInjectionResult {
  let pagesProcessed = 0
  let connectionsAdded = 0
  let recommendationsAdded = 0

  function walkAndInject(dir: string, depth: number = 0): void {
    try {
      if (depth < 3) {
        const entries = readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = resolve(dir, entry.name)
          if (entry.isDirectory()) {
            walkAndInject(fullPath, depth + 1)
          } else if (entry.isFile() && entry.name === 'index.html') {
            pagesProcessed++
            let content = readFileSync(fullPath, 'utf-8')

            // Skip if already has Phase 16
            if (content.includes('Phase 16')) continue

            // Add content recommendations to guide and ranking pages
            const normalizedPath = fullPath.replace(/\\/g, '/').toLowerCase()
            if ((normalizedPath.includes('guides') || normalizedPath.includes('rankings')) && pagesProcessed % 5 === 0) {
              const recommendations = generateContentRecommendations(normalizedPath, 4)

              if (recommendations.length > 0) {
                const recBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #06b6d4">
    <h3 style="color:#06b6d4;margin-top:0;font-size:14px">🔗 Related Content</h3>
    <ul style="margin:8px 0;padding-left:20px;color:#9b96b8;font-size:12px;">
      ${recommendations.map(r => '<li><a href="' + r.url + '" style="color:#06b6d4;text-decoration:none">' + r.title + '</a></li>').join('')}
    </ul>
    <!-- Phase 16: Knowledge Graph Recommendations -->
  </div>`

                if (content.includes('</body>')) {
                  content = content.replace('</body>', '\n  ' + recBlock + '\n  </body>')
                  recommendationsAdded++
                }
              }
            }

            // Add topic cluster information to hub pages
            if (normalizedPath.includes('hub') && pagesProcessed % 3 === 0) {
              const clusters = generateTopicClusters()
              const clusterBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #06b6d4">
    <h3 style="color:#06b6d4;margin-top:0;font-size:14px">📚 Topic Clusters</h3>
    <p style="color:#9b96b8;font-size:12px">Knowledge base connections: ${Object.keys(clusters).length} clusters</p>
    <!-- Phase 16: Topic Cluster Metadata -->
  </div>`

              if (content.includes('</body>')) {
                content = content.replace('</body>', '\n  ' + clusterBlock + '\n  </body>')
                connectionsAdded++
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
  return { pagesProcessed, connectionsAdded, recommendationsAdded }
}
