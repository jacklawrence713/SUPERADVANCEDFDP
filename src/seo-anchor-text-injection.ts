/**
 * Anchor Text Injection (Phase 22.3)
 *
 * Injects anchor text optimization recommendations into pages
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { generateAnchorTextStrategy, analyzeAnchorDistribution } from './seo-anchor-text-strategy'

export interface AnchorTextInjectionResult {
  pagesProcessed: number
  anchorAnalysisAdded: number
  optimizationRecsAdded: number
}

export function injectAnchorTextOptimization(distDir: string): AnchorTextInjectionResult {
  let pagesProcessed = 0
  let anchorAnalysisAdded = 0
  let optimizationRecsAdded = 0

  const profiles = generateAnchorTextStrategy()

  // Create URL to profile map
  const urlMap: Record<string, any> = {}
  for (const profile of profiles) {
    const path = profile.targetUrl.replace(/\//g, '\\').toLowerCase()
    urlMap[path] = profile
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

          // Skip if already has Phase 22.3
          if (content.includes('Phase 22.3')) continue

          // Find matching profile
          let matchedProfile: any = null
          for (const [pattern, profile] of Object.entries(urlMap)) {
            if (normalizedPath.includes(pattern)) {
              matchedProfile = profile
              break
            }
          }

          if (matchedProfile) {
            const analysis = analyzeAnchorDistribution(matchedProfile)

            // Add anchor text analysis block
            const analysisColor = analysis.isBalanced ? '#10b981' : '#f59e0b'
            const analysisBlock = `<div style="margin-top:40px;padding:16px;background:#0a0913;border-radius:4px;border-left:3px solid ${analysisColor}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:12px;color:#9b96b8">Anchor Text Distribution</span>
      <span style="font-size:12px;font-weight:700;color:${analysisColor}">${analysis.isBalanced ? '✓ Balanced' : '⚠ Needs Optimization'}</span>
    </div>
    <p style="margin:6px 0;font-size:11px;color:#6b6580">Brand: ${matchedProfile.brandAnchorRatio}% | Keyword: ${matchedProfile.keywordAnchorRatio}% | Generic: ${matchedProfile.genericAnchorRatio}%</p>
    <!-- Phase 22.3a: Anchor Analysis -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${analysisBlock}\n  </body>`)
              anchorAnalysisAdded++
            }

            // Add optimization recommendations if needed
            if (!analysis.isBalanced && matchedProfile.priority === 'high') {
              const optimalDist = matchedProfile.optimalDistribution
              const recommendationBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #7c4dff">
    <h3 style="color:#7c4dff;margin-top:0;font-size:14px">Anchor Text Optimization</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">Recommended anchor distribution:</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0;font-size:11px">
      <div style="background:#0a0913;padding:8px;border-radius:4px;color:#9b96b8">
        <strong style="color:#7c4dff">Brand Anchors</strong><br>${optimalDist.brand}% (current: ${matchedProfile.brandAnchorRatio}%)
      </div>
      <div style="background:#0a0913;padding:8px;border-radius:4px;color:#9b96b8">
        <strong style="color:#7c4dff">Keyword Anchors</strong><br>${optimalDist.keyword}% (current: ${matchedProfile.keywordAnchorRatio}%)
      </div>
      <div style="background:#0a0913;padding:8px;border-radius:4px;color:#9b96b8">
        <strong style="color:#7c4dff">Generic Anchors</strong><br>${optimalDist.generic}% (current: ${matchedProfile.genericAnchorRatio}%)
      </div>
      <div style="background:#0a0913;padding:8px;border-radius:4px;color:#9b96b8">
        <strong style="color:#7c4dff">Semantic Anchors</strong><br>${optimalDist.semantic}% (new)
      </div>
    </div>
    <p style="color:#9b96b8;margin:8px 0 0 0;font-size:11px;color:#6b6580">${analysis.issues.join(' · ')}</p>
    <!-- Phase 22.3b: Anchor Recommendations -->
  </div>`

              if (content.includes('</body>')) {
                content = content.replace('</body>', `\n  ${recommendationBlock}\n  </body>`)
                optimizationRecsAdded++
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
  return { pagesProcessed, anchorAnalysisAdded, optimizationRecsAdded }
}
