/**
 * Featured Snippet Injection (Phase 19.1)
 *
 * Injects answer schema and featured snippet optimizations into pages
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateFeaturedSnippetOpportunities, generateAnswerSchema } from './seo-featured-snippets'

export interface SnippetInjectionResult {
  pagesProcessed: number
  answerSchemasAdded: number
  faqBlocksAdded: number
}

export function injectFeaturedSnippetOptimization(distDir: string): SnippetInjectionResult {
  let pagesProcessed = 0
  let answerSchemasAdded = 0
  let faqBlocksAdded = 0

  const snippets = generateFeaturedSnippetOpportunities()

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

          // Skip if already has Phase 19.1
          if (content.includes('Phase 19.1')) continue

          // Target guide pages and FAQ pages for featured snippet optimization
          const isGuide = normalizedPath.includes('/guides/')
          const isAbout = normalizedPath.includes('/about')
          const isMethodology = normalizedPath.includes('/methodology')
          const isFAQ = normalizedPath.includes('/faq') || normalizedPath.includes('/featured-snippets')

          if (isGuide || isAbout || isMethodology || isFAQ) {
            // Add relevant AnswerObject schemas
            const relevantSnippets = snippets.slice(0, 3) // Add top 3 answer schemas
            const answerSchemas = relevantSnippets.map((s) =>
              generateAnswerSchema(s.question, s.answer)
            )

            if (content.includes('</head>')) {
              const schemaScripts = answerSchemas
                .map((schema) => `  <script type="application/ld+json">\n${schema}\n</script>`)
                .join('\n')
              const marker = `${schemaScripts}\n  <!-- Phase 19.1: Featured Snippet Optimization -->\n  `
              content = content.replace('</head>', `  ${marker}</head>`)
              answerSchemasAdded++
            }

            // Add featured snippet FAQ block
            if (isGuide) {
              const faqBlock = `<div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #7c4dff">
    <h3 style="color:#7c4dff;margin-top:0;font-size:16px">Featured Snippet FAQ</h3>
    <p style="color:#9b96b8;margin:12px 0;font-size:13px">Common questions answered for featured snippet optimization</p>
    <div style="margin-top:16px;display:grid;gap:12px">
      ${snippets
        .slice(0, 3)
        .map(
          (s) => `<div style="background:#0a0913;padding:12px;border-left:2px solid #7c4dff;border-radius:4px">
        <strong style="color:#7c4dff;font-size:13px">${s.question}</strong>
        <p style="margin:6px 0;font-size:12px;color:#9b96b8">${s.answer}</p>
      </div>`
        )
        .join('')}
    </div>
    <!-- Phase 19.1: Featured Snippet FAQ Block -->
  </div>`

              if (content.includes('</body>')) {
                content = content.replace('</body>', `\n  ${faqBlock}\n  </body>`)
                faqBlocksAdded++
              }
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
  return { pagesProcessed, answerSchemasAdded, faqBlocksAdded }
}
