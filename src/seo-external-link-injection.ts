/**
 * External Link Opportunity Injection (Phase 22.2)
 *
 * Injects external link building recommendations into pages
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { generateExternalLinkOpportunities, getHighPriorityOpportunities } from './seo-external-link-opportunities'

export interface ExternalLinkInjectionResult {
  pagesProcessed: number
  linkOpportunitiesAdded: number
  outreachRecommendationsAdded: number
}

export function injectExternalLinkOpportunities(distDir: string): ExternalLinkInjectionResult {
  let pagesProcessed = 0
  let linkOpportunitiesAdded = 0
  let outreachRecommendationsAdded = 0

  const allOpportunities = generateExternalLinkOpportunities()
  const highPriority = getHighPriorityOpportunities()

  // Create URL to opportunities map
  const urlMap: Record<string, any[]> = {}
  for (const opp of allOpportunities) {
    const path = opp.targetUrl.replace(/\//g, '\\').toLowerCase()
    if (!urlMap[path]) {
      urlMap[path] = []
    }
    urlMap[path].push(opp)
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

          // Skip if already has Phase 22.2
          if (content.includes('Phase 22.2')) continue

          // Find matching opportunities
          const matchedOpps: any[] = []
          for (const [pattern, opps] of Object.entries(urlMap)) {
            if (normalizedPath.includes(pattern)) {
              matchedOpps.push(...opps)
            }
          }

          if (matchedOpps.length > 0) {
            // Add link opportunities block
            const topOpp = matchedOpps[0]
            const opportunityBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #06b6d4">
    <h3 style="color:#06b6d4;margin-top:0;font-size:14px">External Link Opportunities</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">Featured opportunity: <strong>${topOpp.domain}</strong> (DA: ${topOpp.domainAuthority})</p>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">${topOpp.outreachStrategy}</p>
    <p style="color:#9b96b8;margin:8px 0;font-size:11px">Estimated traffic: ${topOpp.estimatedTraffic} monthly | Type: ${topOpp.linkType}</p>
    <!-- Phase 22.2a: Link Opportunities -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${opportunityBlock}\n  </body>`)
              linkOpportunitiesAdded++
            }
          }

          // Add outreach recommendations for high-priority pages
          const isHighPriority = highPriority.some((opp) => normalizedPath.includes(opp.targetUrl.replace(/\//g, '\\').toLowerCase()))

          if (isHighPriority && matchedOpps.length > 0) {
            const topThree = matchedOpps.slice(0, 3)
            const outreachBlock = `<div style="margin-top:40px;padding:20px;background:#7c4dff;border-radius:8px;border-left:4px solid #06b6d4">
    <h3 style="color:#06b6d4;margin-top:0;font-size:14px">🎯 Link Building Targets</h3>
    <p style="color:#e0d5ff;margin:8px 0;font-size:12px">${matchedOpps.length} external link opportunities for this page</p>
    <ul style="list-style:none;padding:0;margin:8px 0;font-size:12px;color:#e0d5ff">
      ${topThree
        .map(
          (opp: any) =>
            `<li style="margin:8px 0;padding:8px;background:rgba(0,0,0,0.3);border-radius:4px">
        <strong>${opp.domain}</strong> (DA ${opp.domainAuthority}) - ${opp.linkType}
        <br><span style="color:#d0d0ff;font-size:11px">${opp.outreachStrategy}</span>
      </li>`
        )
        .join('')}
    </ul>
    <!-- Phase 22.2b: Outreach Recommendations -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${outreachBlock}\n  </body>`)
              outreachRecommendationsAdded++
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
  return { pagesProcessed, linkOpportunitiesAdded, outreachRecommendationsAdded }
}
