/**
 * International Schema Injection (Phase 19.3)
 *
 * Injects hreflang tags and multi-language schema into pages
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateHrefLangTags, generateLanguageMeta, generateMultiLanguageSchema } from './seo-international'

export interface InternationalInjectionResult {
  pagesProcessed: number
  hrefLangsAdded: number
  languageMetaAdded: number
  multiLanguageSchemasAdded: number
}

export function injectInternationalOptimization(distDir: string): InternationalInjectionResult {
  let pagesProcessed = 0
  let hrefLangsAdded = 0
  let languageMetaAdded = 0
  let multiLanguageSchemasAdded = 0

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

          // Skip if already has Phase 19.3
          if (content.includes('Phase 19.3')) continue

          // Extract current URL from canonical link or construct it
          let canonicalUrl = 'https://fantasydraftpros.com/'
          const canonicalMatch = content.match(/link rel="canonical" href="([^"]+)"/)
          if (canonicalMatch) {
            canonicalUrl = canonicalMatch[1]
          }

          // Add hreflang tags
          if (content.includes('</head>')) {
            const hrefLangTags = generateHrefLangTags(canonicalUrl)
            const hrefLangMarker = `${hrefLangTags}\n  <!-- Phase 19.3a: hreflang International Tags -->\n  `
            content = content.replace('</head>', `  ${hrefLangMarker}</head>`)
            hrefLangsAdded++
          }

          // Add language meta tags (og:locale)
          if (content.includes('</head>')) {
            const languageMeta = generateLanguageMeta('en')
            const languageMarker = `${languageMeta}\n  <!-- Phase 19.3b: Language Meta Tags -->\n  `
            content = content.replace('</head>', `  ${languageMarker}</head>`)
            languageMetaAdded++
          }

          // Add multi-language schema for main pages
          if (
            fullPath.includes('/index.html') &&
            !fullPath.includes('/players/') &&
            !fullPath.includes('/rankings/') &&
            !fullPath.includes('/comparisons/')
          ) {
            const multiLangSchema = generateMultiLanguageSchema('Fantasy Draft Pros - Dynasty Fantasy Football Analysis', canonicalUrl)
            const schemaTag = `  <script type="application/ld+json">\n${multiLangSchema}\n</script>\n  <!-- Phase 19.3c: Multi-Language Schema -->\n  `

            if (content.includes('</head>')) {
              content = content.replace('</head>', `  ${schemaTag}</head>`)
              multiLanguageSchemasAdded++
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
  return { pagesProcessed, hrefLangsAdded, languageMetaAdded, multiLanguageSchemasAdded }
}
