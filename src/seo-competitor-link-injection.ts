/**
 * Competitor Backlink Injection (Phase 22.5)
 *
 * Injects competitor link intelligence and opportunity analysis
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { generateCompetitorBacklinkAnalysis, identifyLinkGaps, generateLinkBuildingRecommendations } from './seo-competitor-backlink-analysis'

export interface CompetitorLinkInjectionResult {
  pagesProcessed: number
  competitorAnalysisAdded: number
  opportunityRecsAdded: number
}

export function injectCompetitorBacklinkAnalysis(distDir: string): CompetitorLinkInjectionResult {
  let pagesProcessed = 0
  let competitorAnalysisAdded = 0
  let opportunityRecsAdded = 0

  const competitors = generateCompetitorBacklinkAnalysis()
  const allRecommendations = generateLinkBuildingRecommendations()
  const topCompetitor = competitors[0] // Dynasty-pro as primary competitor

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

          // Skip if already has Phase 22.5
          if (content.includes('Phase 22.5')) continue

          // Add competitor analysis block to high-value pages
          if (normalizedPath.includes('/rankings/') || normalizedPath.includes('/guides/') || normalizedPath === '/') {
            const gaps = identifyLinkGaps(topCompetitor.competitor)

            const competitorBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #f59e0b">
    <h3 style="color:#f59e0b;margin-top:0;font-size:14px">Competitive Link Intelligence</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">vs <strong>${topCompetitor.competitor}</strong> (DA ${topCompetitor.domainAuthority}, ${topCompetitor.backlinks} backlinks)</p>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">Identified link gaps: ${gaps.opportunities} new opportunities | Estimated traffic potential: ${gaps.estimatedTraffic.toLocaleString()} monthly</p>
    <ul style="list-style:none;padding:0;margin:8px 0;font-size:12px;color:#9b96b8">
      ${gaps.gaps.slice(0, 2).map((gap) => `<li style="margin:4px 0">→ ${gap}</li>`).join('')}
    </ul>
    <!-- Phase 22.5a: Competitor Analysis -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${competitorBlock}\n  </body>`)
              competitorAnalysisAdded++
            }
          }

          // Add opportunity recommendations for high-value pages
          if ((normalizedPath.includes('/rankings/') || normalizedPath.includes('/guides/')) && pagesProcessed % 5 === 0) {
            const topOpps = allRecommendations.slice(0, 3)
            const oppBlock = `<div style="margin-top:40px;padding:20px;background:#7c4dff;border-radius:8px;border-left:4px solid #f59e0b">
    <h3 style="color:#f59e0b;margin-top:0;font-size:14px">🎯 Link Building Opportunities</h3>
    <p style="color:#e0d5ff;margin:8px 0;font-size:12px">Top 3 link sources based on competitor analysis:</p>
    <ul style="list-style:none;padding:0;margin:8px 0;">
      ${topOpps
        .map(
          (opp, idx) =>
            `<li style="margin:8px 0;padding:8px;background:rgba(0,0,0,0.3);border-radius:4px;font-size:12px;color:#e0d5ff">
        <div style="font-weight:600">${idx + 1}. ${opp.opportunity}</div>
        <div style="font-size:11px;color:#d0d0ff;margin-top:4px">${opp.action}</div>
        <div style="font-size:11px;color:#9b96b8;margin-top:4px">Difficulty: ${opp.difficulty} | Traffic: ${opp.potentialTraffic.toLocaleString()}</div>
      </li>`
        )
        .join('')}
    </ul>
    <!-- Phase 22.5b: Opportunity Recommendations -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${oppBlock}\n  </body>`)
              opportunityRecsAdded++
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
  return { pagesProcessed, competitorAnalysisAdded, opportunityRecsAdded }
}
