/**
 * Schema Markup Post-Processing (Phase 13.2)
 *
 * Injects Schema.org structured data into generated HTML pages
 * after the build phase. This avoids modifying all page generators.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateBreadcrumbSchema, generateArticleSchema } from './seo-schema-markup'

export interface SchemaInjectionResult {
  pagesProcessed: number
  schemaInjected: number
  breadcrumbsAdded: number
}

/**
 * Walk dist directory and inject schema markup into generated pages
 */
export function injectSchemaMarkupIntoPages(distDir: string): SchemaInjectionResult {
  let pagesProcessed = 0
  let schemaInjected = 0
  let breadcrumbsAdded = 0

  function walkAndInject(dir: string, relativePath: string = ''): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = resolve(dir, entry.name)
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

        if (entry.isDirectory()) {
          walkAndInject(fullPath, relPath)
        } else if (entry.isFile() && entry.name === 'index.html') {
          pagesProcessed++
          const content = readFileSync(fullPath, 'utf-8')

          // Skip if already has schema markup
          if (content.includes('BreadcrumbList')) continue

          let modified = content
          const pagePath = `/${relPath.split('index.html')[0]}`.replace(/\/\//, '/')

          // Add BreadcrumbList schema to all pages (except homepage)
          if (pagePath !== '/' && pagePath !== '') {
            const breadcrumbSchema = generateBreadcrumbSchema(pagePath)
            const schemaTag = `<script type="application/ld+json">\n${breadcrumbSchema}\n</script>\n  `
            modified = modified.replace('</head>', `  ${schemaTag}</head>`)
            breadcrumbsAdded++
            schemaInjected++
          }

          // Add Article schema to guide and strategy pages
          if (pagePath.includes('/guides/') || pagePath.includes('/dynasty-')) {
            modified = injectArticleSchemaForPage(modified, pagePath)
            if (modified.includes('ArticleSchema')) {
              schemaInjected++
            }
          }

          if (modified !== content) {
            writeFileSync(fullPath, modified)
          }
        }
      }
    } catch (e) {
      // Skip errors on directories we can't read
    }
  }

  walkAndInject(distDir)
  return { pagesProcessed, schemaInjected, breadcrumbsAdded }
}

/**
 * Intelligently inject Article schema based on page content
 */
function injectArticleSchemaForPage(content: string, pagePath: string): string {
  // Extract title from page (look for h1 or og:title)
  const titleMatch = content.match(/<title>([^<]+)<\/title>/)
  const ogTitleMatch = content.match(/<meta property="og:title" content="([^"]+)"/)
  const ogDescMatch = content.match(/<meta property="og:description" content="([^"]+)"/)
  const ogImageMatch = content.match(/<meta property="og:image" content="([^"]+)"/)

  if (!titleMatch) return content

  const title = ogTitleMatch?.[1] || titleMatch[1]
  const description = ogDescMatch?.[1] || ''
  const imageUrl = ogImageMatch?.[1] || 'https://fantasydraftpros.com/logo-horizontal.png'
  const url = `https://fantasydraftpros.com${pagePath}`

  // Create Article schema
  const today = new Date().toISOString().split('T')[0]
  const articleSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': title,
    'description': description,
    'url': url,
    'image': imageUrl,
    'datePublished': today,
    'author': {
      '@type': 'Organization',
      'name': 'Fantasy Draft Pros',
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Fantasy Draft Pros',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://fantasydraftpros.com/logo-shield.png',
      },
    },
  })

  const schemaTag = `<script type="application/ld+json">\n${articleSchema}\n</script>\n  `
  return content.replace('</head>', `  ${schemaTag}</head>`)
}
