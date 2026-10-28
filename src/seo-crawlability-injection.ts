/**
 * Crawlability Audit Injection (Phase 24.1)
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { calculateCrawlabilityScore, getCriticalCrawlabilityIssues } from './seo-crawlability-audit'

export function injectCrawlabilityAudit(distDir: string): { pagesProcessed: number; auditsAdded: number } {
  let pagesProcessed = 0, auditsAdded = 0
  const score = calculateCrawlabilityScore()
  const criticalIssues = getCriticalCrawlabilityIssues()

  function walk(dir: string, depth: number = 0): void {
    try {
      if (depth < 3) {
        const entries = readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = resolve(dir, entry.name)
          if (entry.isDirectory()) {
            walk(fullPath, depth + 1)
          } else if (entry.isFile() && entry.name === 'index.html') {
            pagesProcessed++
            let content = readFileSync(fullPath, 'utf-8')
            if (!content.includes('Phase 24.1') && pagesProcessed % 10 === 0) {
              const block = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #06b6d4">
    <h3 style="color:#06b6d4;margin-top:0;font-size:14px">🔍 Crawlability Score: ${score.score}/100</h3>
    <p style="color:#9b96b8;font-size:12px">Issues: ${score.issues} | Traffic at risk: ${score.traffic_at_risk}</p>
    <!-- Phase 24.1 -->
  </div>`
              if (content.includes('</body>')) {
                content = content.replace('</body>', `\n  ${block}\n  </body>`)
                auditsAdded++
                writeFileSync(fullPath, content)
              }
            }
          }
        }
      }
    } catch (e) {}
  }
  walk(distDir)
  return { pagesProcessed, auditsAdded }
}
