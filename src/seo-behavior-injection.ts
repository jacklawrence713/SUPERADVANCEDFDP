/**
 * User Behavior Injection (Phase 23.4)
 *
 * Injects user behavior tracking and optimization recommendations
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { generateHeatmapZones, generateUserBehaviorMetrics, identifyHighFrictionZones } from './seo-user-behavior-tracking'

export interface BehaviorInjectionResult {
  pagesProcessed: number
  heatmapRecommendationsAdded: number
  frictionAnalysisAdded: number
}

export function injectUserBehaviorTracking(distDir: string): BehaviorInjectionResult {
  let pagesProcessed = 0
  let heatmapRecommendationsAdded = 0
  let frictionAnalysisAdded = 0

  const zones = generateHeatmapZones()
  const metrics = generateUserBehaviorMetrics()
  const frictionZones = identifyHighFrictionZones()

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

          // Skip if already has Phase 23.4
          if (content.includes('Phase 23.4')) continue

          // Add heatmap zone analysis to high-traffic pages
          if (normalizedPath.includes('trade-calculator') && pagesProcessed % 2 === 0) {
            const topZones = zones.slice(0, 2)
            const heatmapBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #10b981">
    <h3 style="color:#10b981;margin-top:0;font-size:14px">🔥 Heatmap Analysis</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">Click rate performance by zone:</p>
    ${topZones
      .map(
        (zone) => `
    <div style="margin:8px 0;padding:8px;background:#0a0913;border-radius:4px;font-size:11px">
      <strong style="color:#10b981">${zone.zoneName}</strong><br>
      <span style="color:#9b96b8">Expected: ${zone.expectedClickRate}% | Current: ${zone.currentPerformance}% | Opportunity: +${zone.optimizationPotential}%</span>
    </div>
  `
      )
      .join('')}
    <!-- Phase 23.4a: Heatmap Analysis -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${heatmapBlock}\n  </body>`)
              heatmapRecommendationsAdded++
            }
          }

          // Add friction analysis to conversion pages
          if (normalizedPath.includes('rankings') || normalizedPath.includes('guides')) {
            const topFriction = frictionZones.slice(0, 2)
            if (topFriction.length > 0) {
              const frictionBlock = `<div style="margin-top:40px;padding:20px;background:#7c4dff;border-radius:8px;border-left:4px solid #f59e0b">
    <h3 style="color:#f59e0b;margin-top:0;font-size:14px">⚠️ User Friction Analysis</h3>
    <p style="color:#e0d5ff;margin:8px 0;font-size:12px">High-friction zones identified:</p>
    ${topFriction
      .map(
        (friction) => `
    <div style="margin:8px 0;padding:8px;background:rgba(0,0,0,0.3);border-radius:4px;font-size:11px">
      <strong style="color:#f59e0b">${friction.zone}</strong><br>
      <span style="color:#e0d5ff">Gap: ${friction.friction}% | ${friction.impact}</span>
    </div>
  `
      )
      .join('')}
    <!-- Phase 23.4b: Friction Analysis -->
  </div>`

              if (content.includes('</body>')) {
                content = content.replace('</body>', `\n  ${frictionBlock}\n  </body>`)
                frictionAnalysisAdded++
              }
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
  return { pagesProcessed, heatmapRecommendationsAdded, frictionAnalysisAdded }
}
