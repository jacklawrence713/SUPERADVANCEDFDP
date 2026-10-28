/**
 * Seasonal Content Injection (Phase 21.1)
 *
 * Injects seasonal content recommendations into pages
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateSeasonalContentCalendar, getSeasonalContentForMonth } from './seo-seasonal-content'

export interface SeasonalInjectionResult {
  pagesProcessed: number
  seasonalBlocksAdded: number
  seasonalCalendarsInjected: number
}

export function injectSeasonalContent(distDir: string): SeasonalInjectionResult {
  let pagesProcessed = 0
  let seasonalBlocksAdded = 0
  let seasonalCalendarsInjected = 0

  const currentMonth = new Date().toLocaleString('default', { month: 'long' })
  const currentSeason = getSeasonalContentForMonth(currentMonth)

  function walkAndInject(dir: string, depth: number = 0): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = resolve(dir, entry.name)

        if (entry.isDirectory() && depth < 3) {
          walkAndInject(fullPath, depth + 1)
        } else if (entry.isFile() && entry.name === 'index.html') {
          pagesProcessed++
          let content = readFileSync(fullPath, 'utf-8')

          // Skip if already has Phase 21.1
          if (content.includes('Phase 21.1')) continue

          // Add seasonal content recommendations
          if (currentSeason) {
            const seasonalBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #f59e0b">
    <h3 style="color:#f59e0b;margin-top:0;font-size:14px">Seasonal Content Focus (${currentSeason.season})</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">Peak search volume: ${currentSeason.searchVolume.toLocaleString()} monthly searches</p>
    <div style="margin-top:12px">
      <strong style="color:#f59e0b;font-size:12px">Content to focus on:</strong>
      <ul style="list-style:none;padding:0;margin:8px 0;font-size:12px;color:#9b96b8">
        ${currentSeason.recommendedContentFocus.map((focus) => `<li style="margin:4px 0">→ ${focus}</li>`).join('')}
      </ul>
    </div>
    <!-- Phase 21.1: Seasonal Content Recommendations -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${seasonalBlock}\n  </body>`)
              seasonalBlocksAdded++
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

  // Add seasonal calendar to guides
  try {
    const guidesPath = resolve(distDir, 'guides', 'index.html')
    if (existsSync(guidesPath)) {
      let guideContent = readFileSync(guidesPath, 'utf-8')

      if (!guideContent.includes('Phase 21.1-calendar')) {
        const calendar = generateSeasonalContentCalendar()
        const calendarHtml = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #6b6580">
    <h3 style="color:#6b6580;margin-top:0;font-size:14px">Seasonal Content Calendar</h3>
    ${calendar
      .map(
        (season) => `
    <div style="margin:16px 0;padding:12px;background:#0a0913;border-radius:4px">
      <strong style="color:#7c4dff;font-size:12px">${season.season}</strong>
      <p style="margin:4px 0;color:#9b96b8;font-size:11px">Volume: ${season.searchVolume.toLocaleString()} | Type: ${season.contentType}</p>
    </div>
    `
      )
      .join('')}
    <!-- Phase 21.1-calendar: Seasonal Calendar -->
  </div>`

        guideContent = guideContent.replace('</body>', `\n  ${calendarHtml}\n  </body>`)
        writeFileSync(guidesPath, guideContent)
        seasonalCalendarsInjected++
      }
    }
  } catch (e) {
    // Skip errors
  }

  return { pagesProcessed, seasonalBlocksAdded, seasonalCalendarsInjected }
}
