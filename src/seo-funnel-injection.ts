/**
 * Conversion Funnel Injection (Phase 23.2)
 *
 * Injects funnel tracking and optimization recommendations
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { generateConversionFunnels, calculateFunnelMetrics } from './seo-conversion-funnel'

export interface FunnelInjectionResult {
  pagesProcessed: number
  funnelTrackingAdded: number
  optimizationRecsAdded: number
}

export function injectConversionFunnels(distDir: string): FunnelInjectionResult {
  let pagesProcessed = 0
  let funnelTrackingAdded = 0
  let optimizationRecsAdded = 0

  const funnels = generateConversionFunnels()

  // Create funnel entry point map
  const entryPointMap: Record<string, any> = {}
  for (const funnel of funnels) {
    const path = funnel.entryPoint.replace(/\//g, '\\').toLowerCase()
    if (!entryPointMap[path]) {
      entryPointMap[path] = []
    }
    entryPointMap[path].push(funnel)
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

          // Skip if already has Phase 23.2
          if (content.includes('Phase 23.2')) continue

          // Find matching funnels
          let matchedFunnels: any[] = []
          for (const [pattern, funns] of Object.entries(entryPointMap)) {
            if (normalizedPath.includes(pattern)) {
              matchedFunnels.push(...funns)
            }
          }

          if (matchedFunnels.length > 0) {
            const funnel = matchedFunnels[0]
            const metrics = calculateFunnelMetrics(funnel)

            // Add funnel tracking block
            const funnelBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #f59e0b">
    <h3 style="color:#f59e0b;margin-top:0;font-size:14px">📈 Conversion Funnel: ${funnel.funnelName}</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">Overall conversion rate: <strong>${metrics.overallConversionRate}%</strong></p>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">${funnel.steps.length} steps | ~${funnel.estimatedMonthlyCompletions.toLocaleString()} completions/month</p>
    <div style="display:grid;grid-template-columns:repeat(${funnel.steps.length},1fr);gap:8px;margin:12px 0;">
      ${funnel.steps
        .map(
          (step, idx) =>
            `<div style="background:#0a0913;padding:8px;border-radius:4px;text-align:center;font-size:11px;color:#9b96b8">
        Step ${step.stepNumber}<br><strong style="color:#f59e0b">${step.conversionRate}%</strong>
      </div>`
        )
        .join('')}
    </div>
    <!-- Phase 23.2a: Funnel Tracking -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${funnelBlock}\n  </body>`)
              funnelTrackingAdded++
            }
          }

          // Add optimization recommendations for high-conversion pages
          if (normalizedPath.includes('trade-calculator') && matchedFunnels.length > 0) {
            const funnel = matchedFunnels[0]
            const metrics = calculateFunnelMetrics(funnel)
            const worstStep = funnel.steps.reduce((min, step, idx) => (step.conversionRate < funnel.steps[min].conversionRate ? idx : min), 0)

            const optimizationBlock = `<div style="margin-top:40px;padding:20px;background:#7c4dff;border-radius:8px;border-left:4px solid #f59e0b">
    <h3 style="color:#f59e0b;margin-top:0;font-size:14px">🎯 Funnel Optimization Opportunity</h3>
    <p style="color:#e0d5ff;margin:8px 0;font-size:12px">Bottleneck: "${funnel.steps[worstStep].name}" (${funnel.steps[worstStep].conversionRate}% conv rate)</p>
    <p style="color:#9b96b8;margin:8px 0;font-size:11px">Potential gain: +${Math.round((funnel.estimatedMonthlyCompletions * (1 - funnel.steps[worstStep].conversionRate / 100)) / 2)} monthly completions</p>
    <ul style="list-style:none;padding:0;margin:8px 0;font-size:11px;color:#e0d5ff">
      <li style="margin:4px 0">→ Simplify input form fields</li>
      <li style="margin:4px 0">→ Add contextual help tooltips</li>
      <li style="margin:4px 0">→ Improve button prominence</li>
    </ul>
    <!-- Phase 23.2b: Optimization Recommendations -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${optimizationBlock}\n  </body>`)
              optimizationRecsAdded++
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
  return { pagesProcessed, funnelTrackingAdded, optimizationRecsAdded }
}
