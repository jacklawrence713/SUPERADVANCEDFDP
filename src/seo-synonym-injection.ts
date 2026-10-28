/**
 * Keyword Synonym Injection (Phase 20.5)
 *
 * Injects keyword variations and synonyms into pages
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateKeywordSynonyms, getKeywordVariations } from './seo-keyword-synonyms'

export interface SynonymInjectionResult {
  pagesProcessed: number
  synonymBlocksAdded: number
  variationsInjected: number
}

export function injectKeywordSynonyms(distDir: string): SynonymInjectionResult {
  let pagesProcessed = 0
  let synonymBlocksAdded = 0
  let variationsInjected = 0

  const allSynonyms = generateKeywordSynonyms()

  // Map pages to their primary keywords
  const pageToKeywordMap: Record<string, string> = {
    'dynasty-trade-analyzer': 'dynasty trade value',
    'rankings': 'dynasty rankings',
    'superflex': 'superflex dynasty',
    'dynasty-buy-low': 'dynasty buy low',
    'rebuild': 'dynasty rebuild',
  }

  function walkAndInject(dir: string, depth: number = 0): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = resolve(dir, entry.name)
        const normalizedPath = fullPath.replace(/\\/g, '/')

        if (entry.isDirectory() && depth < 3) {
          walkAndInject(fullPath, depth + 1)
        } else if (entry.isFile() && entry.name === 'index.html') {
          pagesProcessed++
          let content = readFileSync(fullPath, 'utf-8')

          // Skip if already has Phase 20.5
          if (content.includes('Phase 20.5')) continue

          // Find matching keyword
          let matchedKeyword: string | null = null
          for (const [pattern, keyword] of Object.entries(pageToKeywordMap)) {
            if (normalizedPath.includes(pattern)) {
              matchedKeyword = keyword
              break
            }
          }

          if (matchedKeyword) {
            const synonymGroup = allSynonyms.find((s) => s.primary === matchedKeyword)
            if (!synonymGroup) continue

            // Add synonym block
            const synonymBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #6b6580">
    <h3 style="color:#6b6580;margin-top:0;font-size:14px">Alternative Names & Variations</h3>
    <p style="color:#9b96b8;margin:8px 0;font-size:12px">This topic is also known as: ${synonymGroup.synonyms.join(', ')}</p>
    <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px">
      ${synonymGroup.synonyms.map((s) => `<span style="background:#0a0913;color:#6b6580;padding:4px 8px;border-radius:4px;font-size:11px">${s}</span>`).join('')}
    </div>
    <!-- Phase 20.5: Keyword Synonyms -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${synonymBlock}\n  </body>`)
              synonymBlocksAdded++
            }

            // Add synonym variations to meta keywords
            const allVariations = getKeywordVariations(matchedKeyword)
            const metaKeywords = `  <meta name="keywords" content="${allVariations.join(', ')}" />
  <!-- Phase 20.5: Keyword Variations -->`

            if (content.includes('</head>')) {
              content = content.replace('</head>', `  ${metaKeywords}\n</head>`)
              variationsInjected++
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
  return { pagesProcessed, synonymBlocksAdded, variationsInjected }
}
