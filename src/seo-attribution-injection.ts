/**
 * Attribution Model Injection (Phase 23.3)
 *
 * Injects attribution model recommendations into pages
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { generateAttributionModels, generateUserJourneys, generateAttributionInsights } from './seo-attribution-models'

export interface AttributionInjectionResult {
  pagesProcessed: number
  modelRecommendationsAdded: number
  journeyInsightsAdded: number
}

export function injectAttributionModels(distDir: string): AttributionInjectionResult {
  let pagesProcessed = 0
  let modelRecommendationsAdded = 0
  let journeyInsightsAdded = 0

  const models = generateAttributionModels()
  const journeys = generateUserJourneys()
  const insights = generateAttributionInsights()

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

          // Skip if already has Phase 23.3
          if (content.includes('Phase 23.3')) continue

          // Add attribution model recommendation to key conversion pages
          if ((normalizedPath.includes('trade-calculator') || normalizedPath.includes('rankings')) && pagesProcessed % 3 === 0) {
            const model = models[2] // Linear attribution for general pages
            const modelBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #06b6d4">
    <h3 style="color:#06b6d4;margin-top:0;font-size:14px">📊 Recommended Attribution Model</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">Best model: <strong>${model.modelName}</strong></p>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">${model.description}</p>
    <p style="color:#9b96b8;margin:8px 0;font-size:11px">Credit distribution: First ${model.creditDistribution.first}% | Middle ${model.creditDistribution.middle}% | Last ${model.creditDistribution.last}%</p>
    <!-- Phase 23.3a: Attribution Model -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${modelBlock}\n  </body>`)
              modelRecommendationsAdded++
            }
          }

          // Add journey insight blocks
          if ((normalizedPath.includes('guides') || normalizedPath.includes('players')) && pagesProcessed % 4 === 0) {
            const journey = journeys[0]
            const journeyBlock = `<div style="margin-top:40px;padding:20px;background:#7c4dff;border-radius:8px;border-left:4px solid #06b6d4">
    <h3 style="color:#06b6d4;margin-top:0;font-size:14px">🛤️ Typical User Journey</h3>
    <p style="color:#e0d5ff;margin:8px 0;font-size:12px">Common conversion path:</p>
    <div style="font-size:11px;color:#e0d5ff;margin:8px 0;">
      ${journey.touchpoints.map((tp, idx) => `<div style="margin:4px 0">${idx + 1}. ${tp}</div>`).join('')}
    </div>
    <p style="color:#9b96b8;margin:8px 0;font-size:11px">Value: ${journey.conversionValue} pts | Probability: ${journey.probability}%</p>
    <!-- Phase 23.3b: Journey Insight -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${journeyBlock}\n  </body>`)
              journeyInsightsAdded++
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
  return { pagesProcessed, modelRecommendationsAdded, journeyInsightsAdded }
}
