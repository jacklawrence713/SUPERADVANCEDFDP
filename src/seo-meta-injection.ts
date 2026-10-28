/**
 * Meta Tag Injection (Phase 20.2)
 *
 * Injects optimized meta tags and CTR-focused descriptions
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateOptimizedMetaDescriptions, generateOptimizedOgTags } from './seo-meta-optimization'

export interface MetaInjectionResult {
  pagesProcessed: number
  descriptionsOptimized: number
  ogTagsAdded: number
}

export function injectOptimizedMeta(distDir: string): MetaInjectionResult {
  let pagesProcessed = 0
  let descriptionsOptimized = 0
  let ogTagsAdded = 0

  const optimizations = generateOptimizedMetaDescriptions()

  // Map page patterns to optimizations
  const pageToOptMap: Record<string, keyof typeof optimizations> = {
    'dynasty-basics': 'dynasty-basics',
    'dynasty-trade-analyzer': 'trade-analyzer',
    'rankings': 'rankings',
    'superflex': 'superflex',
    'te-premium': 'te-premium',
    'dynasty-buy-low': 'buy-low',
    '/guides/': 'guides',
    'featured-snippets': 'featured-snippets',
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

          // Skip if already has Phase 20.2
          if (content.includes('Phase 20.2')) continue

          // Find matching optimization
          let matchedOpt: keyof typeof optimizations | null = null
          for (const [pattern, optKey] of Object.entries(pageToOptMap)) {
            if (normalizedPath.includes(pattern)) {
              matchedOpt = optKey
              break
            }
          }

          if (matchedOpt) {
            const opt = optimizations[matchedOpt]

            // Replace or add meta description
            const descRegex = /<meta name="description" content="[^"]*" \/>/
            if (descRegex.test(content)) {
              content = content.replace(
                descRegex,
                `<meta name="description" content="${opt.description}" />`
              )
            } else {
              content = content.replace(
                '</head>',
                `  <meta name="description" content="${opt.description}" />\n</head>`
              )
            }
            descriptionsOptimized++

            // Add optimized OG tags
            const ogTags = generateOptimizedOgTags(opt.title, opt.description, `https://fantasydraftpros.com${normalizedPath}`)
            const ogRegex = /<meta property="og:title"[^>]*\/>/
            if (ogRegex.test(content)) {
              // Replace existing OG tags block
              const ogBlockEnd = content.indexOf('</head>')
              const lastOgTag = content.lastIndexOf('<meta property="og:', ogBlockEnd)
              const endOfLastOgTag = content.indexOf('>', lastOgTag) + 1
              if (lastOgTag > -1) {
                content = content.substring(0, lastOgTag) + ogTags + '\n' + content.substring(endOfLastOgTag)
              }
            } else {
              content = content.replace('</head>', `  ${ogTags}\n  <!-- Phase 20.2: Optimized OG Tags -->\n</head>`)
            }
            ogTagsAdded++

            writeFileSync(fullPath, content)
          }
        }
      }
    } catch (e) {
      // Skip errors
    }
  }

  walkAndInject(distDir)
  return { pagesProcessed, descriptionsOptimized, ogTagsAdded }
}
