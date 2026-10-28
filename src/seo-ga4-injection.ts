/**
 * GA4 Event Tracking Injection (Phase 23.1)
 *
 * Injects GA4 tracking implementation and event recommendations
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { generateGA4EventStrategy, getHighPriorityEvents } from './seo-ga4-event-tracking'

export interface GA4InjectionResult {
  pagesProcessed: number
  trackingRecommendationsAdded: number
  eventImplementationsAdded: number
}

export function injectGA4EventTracking(distDir: string): GA4InjectionResult {
  let pagesProcessed = 0
  let trackingRecommendationsAdded = 0
  let eventImplementationsAdded = 0

  const allEvents = generateGA4EventStrategy()
  const highPriority = getHighPriorityEvents()

  // Create page to events map
  const pageEventMap: Record<string, any[]> = {
    'trade-calculator': [allEvents[0], allEvents[1]],
    'rankings': [allEvents[2]],
    'guides': [allEvents[3], allEvents[4], allEvents[5]],
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

          // Skip if already has Phase 23.1
          if (content.includes('Phase 23.1')) continue

          // Find matching events for this page
          let matchedEvents: any[] = []
          for (const [pattern, events] of Object.entries(pageEventMap)) {
            if (normalizedPath.includes(pattern)) {
              matchedEvents.push(...events)
            }
          }

          if (matchedEvents.length > 0) {
            // Add GA4 tracking recommendation block
            const topEvent = matchedEvents[0]
            const trackingBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #06b6d4">
    <h3 style="color:#06b6d4;margin-top:0;font-size:14px">GA4 Event Tracking</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">Primary event: <strong>${topEvent.eventName}</strong></p>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">Trigger: ${topEvent.triggerCondition}</p>
    <p style="color:#9b96b8;margin:8px 0;font-size:11px">Expected monthly volume: ${topEvent.expectedMonthlyVolume.toLocaleString()} | Conversion value: ${topEvent.conversionValue} pts</p>
    <!-- Phase 23.1a: GA4 Tracking Recommendation -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${trackingBlock}\n  </body>`)
              trackingRecommendationsAdded++
            }
          }

          // Add detailed event implementation for high-priority pages
          if ((normalizedPath.includes('trade-calculator') || normalizedPath.includes('guides')) && matchedEvents.length > 0) {
            const events = matchedEvents.slice(0, 2)
            const implementationBlock = `<div style="margin-top:40px;padding:20px;background:#7c4dff;border-radius:8px;border-left:4px solid #06b6d4">
    <h3 style="color:#06b6d4;margin-top:0;font-size:14px">📊 GA4 Event Implementation</h3>
    <p style="color:#e0d5ff;margin:8px 0;font-size:12px">${matchedEvents.length} tracked events for this page</p>
    <ul style="list-style:none;padding:0;margin:8px 0;">
      ${events
        .map(
          (evt) =>
            `<li style="margin:8px 0;padding:8px;background:rgba(0,0,0,0.3);border-radius:4px;font-size:11px;color:#e0d5ff">
        <strong>${evt.eventName}</strong><br>
        <span style="color:#d0d0ff">Category: ${evt.eventCategory} | Value: ${evt.conversionValue} pts</span>
      </li>`
        )
        .join('')}
    </ul>
    <!-- Phase 23.1b: Event Implementation -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${implementationBlock}\n  </body>`)
              eventImplementationsAdded++
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
  return { pagesProcessed, trackingRecommendationsAdded, eventImplementationsAdded }
}
