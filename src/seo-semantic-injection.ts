/**
 * Semantic Keyword Injection (Phase 20.1)
 *
 * Injects semantic keywords and LSI keywords into pages
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateSemanticKeywordClusters, getSemanticRelated } from './seo-semantic-keywords'

export interface SemanticInjectionResult {
  pagesProcessed: number
  semanticKeywordsAdded: number
  lsiBlocksAdded: number
}

export function injectSemanticKeywords(distDir: string): SemanticInjectionResult {
  let pagesProcessed = 0
  let semanticKeywordsAdded = 0
  let lsiBlocksAdded = 0

  const clusters = generateSemanticKeywordClusters()

  // Map page patterns to keyword clusters
  const pageToClusterMap: Record<string, string> = {
    'dynasty-basics': 'dynasty fantasy football',
    'trade-analyzer': 'dynasty trade value',
    'superflex': 'superflex dynasty',
    'te-premium': 'tight end premium',
    'buy-low': 'dynasty buy low',
    'rebuild': 'dynasty rebuild strategy',
    'rookie': 'dynasty rookie evaluation',
    'idp': 'IDP dynasty',
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

          // Skip if already has Phase 20.1
          if (content.includes('Phase 20.1')) continue

          // Find matching keyword cluster
          let matchedCluster: string | null = null
          for (const [pattern, keyword] of Object.entries(pageToClusterMap)) {
            if (normalizedPath.includes(pattern)) {
              matchedCluster = keyword
              break
            }
          }

          if (matchedCluster) {
            const cluster = clusters.find((c) => c.primary === matchedCluster)
            if (!cluster) continue

            // Add semantic keyword block
            const semanticBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #7c4dff">
    <h3 style="color:#7c4dff;margin-top:0;font-size:14px">Related Search Terms</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">People also search for: ${cluster.variants.join(', ')}</p>
    <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px">
      ${cluster.semanticRelated
        .map(
          (keyword) =>
            `<a href="https://fantasydraftpros.com/?q=${encodeURIComponent(keyword)}" style="background:#0a0913;color:#7c4dff;padding:4px 8px;border-radius:4px;text-decoration:none;font-size:12px">${keyword}</a>`
        )
        .join('')}
    </div>
    <!-- Phase 20.1a: Semantic Keywords -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${semanticBlock}\n  </body>`)
              semanticKeywordsAdded++
            }

            // Add LSI keyword hints in hidden meta
            const lsiKeywords = cluster.lsiKeywords
            const lsiMeta = `  <meta name="keywords" content="${[cluster.primary, ...cluster.variants, ...lsiKeywords].join(', ')}" />
  <!-- Phase 20.1b: LSI Keywords -->`

            if (content.includes('</head>')) {
              content = content.replace('</head>', `  ${lsiMeta}\n</head>`)
              lsiBlocksAdded++
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
  return { pagesProcessed, semanticKeywordsAdded, lsiBlocksAdded }
}
