/**
 * A/B Testing Injection (Phase 23.5)
 *
 * Injects A/B testing recommendations into pages
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { generateABTestingRoadmap } from './seo-ab-testing-strategy'

export interface TestingInjectionResult {
  pagesProcessed: number
  testRecommendationsAdded: number
  testingInsightsAdded: number
}

export function injectABTestingStrategy(distDir: string): TestingInjectionResult {
  let pagesProcessed = 0
  let testRecommendationsAdded = 0
  let testingInsightsAdded = 0

  const tests = generateABTestingRoadmap()

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

          // Skip if already has Phase 23.5
          if (content.includes('Phase 23.5')) continue

          // Add testing recommendations to high-impact pages
          if (normalizedPath.includes('trade-calculator')) {
            const test = tests[1] // Form simplification test
            const testBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #f59e0b">
    <h3 style="color:#f59e0b;margin-top:0;font-size:14px">🧪 Active A/B Test</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px"><strong>${test.testName}</strong></p>
    <p style="color:#9b96b8;margin:8px 0;font-size:11px">Hypothesis: ${test.hypothesis}</p>
    <p style="color:#9b96b8;margin:8px 0;font-size:11px">Expected lift: ${test.expectedLift}% | Sample size: ${test.sampleSize.toLocaleString()}</p>
    <!-- Phase 23.5a: Testing Recommendation -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${testBlock}\n  </body>`)
              testRecommendationsAdded++
            }
          }

          // Add testing insights to rankings/guides
          if ((normalizedPath.includes('rankings') || normalizedPath.includes('guides')) && pagesProcessed % 3 === 0) {
            const relevantTests = tests.filter(t =>
              (normalizedPath.includes('rankings') && t.testId === 'test_004') ||
              (normalizedPath.includes('guides') && t.testId === 'test_003')
            )

            if (relevantTests.length > 0) {
              const test = relevantTests[0]
              const insightBlock = `<div style="margin-top:40px;padding:20px;background:#7c4dff;border-radius:8px;border-left:4px solid #f59e0b">
    <h3 style="color:#f59e0b;margin-top:0;font-size:14px">📊 Recommended Test</h3>
    <p style="color:#e0d5ff;margin:8px 0;font-size:12px">${test.testName}</p>
    <p style="color:#9b96b8;margin:8px 0;font-size:11px">Control: ${test.control}</p>
    <p style="color:#9b96b8;margin:8px 0;font-size:11px">Variant: ${test.variant}</p>
    <p style="color:#9b96b8;margin:8px 0;font-size:11px">Expected: ${test.expectedLift}% lift | Impact: ${test.estimatedImpact} monthly value</p>
    <!-- Phase 23.5b: Testing Insight -->
  </div>`

              if (content.includes('</body>')) {
                content = content.replace('</body>', `\n  ${insightBlock}\n  </body>`)
                testingInsightsAdded++
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
  return { pagesProcessed, testRecommendationsAdded, testingInsightsAdded }
}
