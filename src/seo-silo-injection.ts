/**
 * Content Silo Injection (Phase 19.4)
 *
 * Injects silo-based navigation and breadcrumbs into pages
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { getContentSilos, generateSiloBreadcrumbs, getSiloRelatedPages } from './seo-content-silos'

export interface SiloInjectionResult {
  pagesProcessed: number
  breadcrumbsAdded: number
  siloNavigationAdded: number
}

export function injectSiloOptimization(distDir: string): SiloInjectionResult {
  let pagesProcessed = 0
  let breadcrumbsAdded = 0
  let siloNavigationAdded = 0

  const silos = getContentSilos()

  // Map paths to silo IDs
  const pathToSiloMap: Record<string, string> = {
    'dynasty-basics': 'dynasty-basics',
    'trading-strategies': 'trading-strategy',
    'format-strategy': 'format-strategy',
    'rankings': 'player-analysis',
    'players': 'player-analysis',
    'comparisons': 'player-analysis',
    'dynasty-buy-low': 'trading-strategy',
    'dynasty-sell-high': 'trading-strategy',
    'dynasty-draft-pick-values': 'rebuild-strategy',
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

          // Skip if already has Phase 19.4
          if (content.includes('Phase 19.4')) continue

          // Find matching silo
          let matchedSilo: string | null = null
          for (const [path, siloId] of Object.entries(pathToSiloMap)) {
            if (normalizedPath.includes(path)) {
              matchedSilo = siloId
              break
            }
          }

          if (matchedSilo) {
            // Add silo breadcrumbs
            const breadcrumbNav = generateSiloBreadcrumbs(matchedSilo, 'Current Page')
            const breadcrumbHtml = `<nav style="margin-bottom:20px;padding:12px;background:#0a0913;border-radius:4px;font-size:12px;color:#9b96b8">${breadcrumbNav}<!-- Phase 19.4a: Silo Breadcrumbs --></nav>`

            if (content.includes('<body>')) {
              content = content.replace('<body>', `<body>\n  ${breadcrumbHtml}`)
              breadcrumbsAdded++
            }

            // Add related pages within silo
            const relatedPages = getSiloRelatedPages(matchedSilo, 4)
            if (relatedPages.length > 0) {
              const siloNav = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #7c4dff">
    <h3 style="color:#7c4dff;margin-top:0;font-size:14px">Explore This Silo</h3>
    <ul style="list-style:none;padding:0;margin:8px 0;font-size:13px">
      ${relatedPages
        .map(
          (page) =>
            `<li style="margin:6px 0"><a href="${page}" style="color:#7c4dff">${page.split('/').filter((s) => s).pop()?.replace(/-/g, ' ')} →</a></li>`
        )
        .join('')}
    </ul>
    <!-- Phase 19.4b: Silo Navigation -->
  </div>`

              if (content.includes('</body>')) {
                content = content.replace('</body>', `\n  ${siloNav}\n  </body>`)
                siloNavigationAdded++
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
  return { pagesProcessed, breadcrumbsAdded, siloNavigationAdded }
}
