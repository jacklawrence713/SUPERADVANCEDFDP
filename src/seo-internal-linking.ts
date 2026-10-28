/**
 * Enhanced Internal Linking & Related Content (Phase 14)
 *
 * Post-processing to inject strategic internal links and related content
 * suggestions throughout the site to strengthen internal link equity.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'

export interface InternalLinkingResult {
  filesProcessed: number
  relatedContentAdded: number
}

export function enhanceInternalLinking(distDir: string): InternalLinkingResult {
  let filesProcessed = 0
  let relatedContentAdded = 0

  const relatedContentMap: Record<string, string> = {
    'rankings': `<div style="margin-top:32px;padding:16px;background:#1a1829;border-radius:8px;border-left:3px solid #7c4dff">
    <h3 style="color:#7c4dff;margin-top:0;font-size:14px">Related Rankings</h3>
    <ul style="list-style:none;padding:0;margin:0;font-size:13px">
    <li style="margin:6px 0"><a href="https://fantasydraftpros.com/rankings/superflex/" style="color:#7c4dff">Superflex Rankings</a></li>
    <li style="margin:6px 0"><a href="https://fantasydraftpros.com/rankings/te-premium/" style="color:#7c4dff">TE Premium Rankings</a></li>
    <li style="margin:6px 0"><a href="https://fantasydraftpros.com/rankings/idp-overall/" style="color:#7c4dff">IDP Overall</a></li>
    <li style="margin:6px 0"><a href="https://fantasydraftpros.com/comparisons/" style="color:#7c4dff">Player Comparisons</a></li>
    </ul>
    </div>`,
    
    'players': `<div style="margin-top:32px;padding:16px;background:#1a1829;border-radius:8px;border-left:3px solid #7c4dff">
    <h3 style="color:#7c4dff;margin-top:0;font-size:14px">Related Tools</h3>
    <ul style="list-style:none;padding:0;margin:0;font-size:13px">
    <li style="margin:6px 0"><a href="https://fantasydraftpros.com/dynasty-trade-analyzer/" style="color:#7c4dff">Trade Analyzer</a></li>
    <li style="margin:6px 0"><a href="https://fantasydraftpros.com/dynasty-rankings/" style="color:#7c4dff">All Rankings</a></li>
    <li style="margin:6px 0"><a href="https://fantasydraftpros.com/comparisons/" style="color:#7c4dff">Player Comparisons</a></li>
    </ul>
    </div>`,
    
    'guides': `<div style="margin-top:32px;padding:16px;background:#1a1829;border-radius:8px;border-left:3px solid #7c4dff">
    <h3 style="color:#7c4dff;margin-top:0;font-size:14px">Apply This Knowledge</h3>
    <ul style="list-style:none;padding:0;margin:0;font-size:13px">
    <li style="margin:6px 0"><a href="https://fantasydraftpros.com/dynasty-trade-analyzer/" style="color:#7c4dff">Trade Analyzer</a></li>
    <li style="margin:6px 0"><a href="https://fantasydraftpros.com/trading-strategies/" style="color:#7c4dff">Trading Strategies</a></li>
    <li style="margin:6px 0"><a href="https://fantasydraftpros.com/dynasty-rankings/" style="color:#7c4dff">View Rankings</a></li>
    </ul>
    </div>`,
  }

  function walkAndEnhance(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = resolve(dir, entry.name)
        
        if (entry.isDirectory()) {
          walkAndEnhance(fullPath)
        } else if (entry.isFile() && entry.name === 'index.html') {
          filesProcessed++
          let content = readFileSync(fullPath, 'utf-8')

          // Skip if already enhanced
          if (content.includes('<!-- Phase 14')) continue

          let injected = false
          
          // Check path patterns
          if (fullPath.includes('rankings') && !fullPath.includes('superflex') && !fullPath.includes('te-premium') && !fullPath.includes('idp')) {
            const relatedContent = relatedContentMap['rankings']
            content = content.replace('</body>', `\n  <!-- Phase 14: Related Rankings -->\n  ${relatedContent}\n  </body>`)
            injected = true
          } else if (fullPath.includes('/players/') && !fullPath.includes('/rankings/') && !fullPath.includes('/comparisons/')) {
            const relatedContent = relatedContentMap['players']
            content = content.replace('</body>', `\n  <!-- Phase 14: Related Tools -->\n  ${relatedContent}\n  </body>`)
            injected = true
          } else if (fullPath.includes('/guides/') || fullPath.includes('/dynasty-buy-low/') || fullPath.includes('/dynasty-sell-high/')) {
            const relatedContent = relatedContentMap['guides']
            content = content.replace('</body>', `\n  <!-- Phase 14: Apply Knowledge -->\n  ${relatedContent}\n  </body>`)
            injected = true
          }

          if (injected) {
            writeFileSync(fullPath, content)
            relatedContentAdded++
          }
        }
      }
    } catch (e) {
      // Skip errors
    }
  }

  walkAndEnhance(distDir)
  return { filesProcessed, relatedContentAdded }
}
