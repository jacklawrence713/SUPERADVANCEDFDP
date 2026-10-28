/**
 * Topical Cluster Injection (Phase 19.5)
 *
 * Injects cluster navigation and schema into pages
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateTopicClusters, generateClusterSchema, generateClusterSummaryHtml } from './seo-topical-clusters'

export interface ClusterInjectionResult {
  pagesProcessed: number
  clusterSchemasAdded: number
  clusterNavigationAdded: number
}

export function injectTopicalClusters(distDir: string): ClusterInjectionResult {
  let pagesProcessed = 0
  let clusterSchemasAdded = 0
  let clusterNavigationAdded = 0

  const clusters = generateTopicClusters()

  // Map page patterns to cluster IDs
  const pageToClusterMap: Record<string, string> = {
    'fdp-value': 'dynasty-valuation',
    'trade-analyzer': 'dynasty-valuation',
    'trade-calculator': 'dynasty-valuation',
    'format-strategy': 'position-scarcity',
    'superflex': 'position-scarcity',
    'te-premium': 'position-scarcity',
    'rankings': 'player-ranking-analysis',
    'comparisons': 'player-ranking-analysis',
    'buy-low': 'rebuild-contention',
    'sell-high': 'rebuild-contention',
    'draft-pick': 'rebuild-contention',
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

          // Skip if already has Phase 19.5
          if (content.includes('Phase 19.5')) continue

          // Find matching cluster
          let matchedCluster: string | null = null
          for (const [pattern, clusterId] of Object.entries(pageToClusterMap)) {
            if (normalizedPath.includes(pattern)) {
              matchedCluster = clusterId
              break
            }
          }

          if (matchedCluster) {
            const cluster = clusters.find((c) => c.id === matchedCluster)
            if (!cluster) continue

            // Add cluster schema
            const clusterSchema = generateClusterSchema(cluster)
            const schemaTag = `  <script type="application/ld+json">\n${clusterSchema}\n</script>\n  <!-- Phase 19.5a: Topical Cluster Schema -->\n  `

            if (content.includes('</head>')) {
              content = content.replace('</head>', `  ${schemaTag}</head>`)
              clusterSchemasAdded++
            }

            // Add cluster navigation block
            const clusterNav = generateClusterSummaryHtml(cluster.id)
            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${clusterNav}\n  </body>`)
              clusterNavigationAdded++
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
  return { pagesProcessed, clusterSchemasAdded, clusterNavigationAdded }
}
