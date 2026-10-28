/**
 * E-E-A-T Post-Processor (Phase 17)
 *
 * Injects expertise, authority, and trustworthiness signals
 * into generated pages to improve credibility.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import {
  generateAuthorByline,
  generateTrustSection,
  generateExpertBioBlock,
  generateEeatSchema,
  generateExpertProfiles,
} from './seo-eat-enhancement'

export interface EeatInjectionResult {
  pagesProcessed: number
  authorBylineAdded: number
  trustSectionAdded: number
  expertBioAdded: number
  verificationAdded: number
}

export function injectEeatSignals(distDir: string): EeatInjectionResult {
  let pagesProcessed = 0
  let authorBylineAdded = 0
  let trustSectionAdded = 0
  let expertBioAdded = 0
  let verificationAdded = 0

  const today = new Date().toISOString().split('T')[0]
  const expertProfiles = generateExpertProfiles()
  const fantasyDraftProsTeam = expertProfiles['fantasy-draft-pros-team']

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

          // Skip if already has Phase 17
          if (content.includes('Phase 17')) continue

          // Determine content type based on file path
          let shouldAddByline = false
          let shouldAddTrustSection = false
          let shouldAddExpertBio = false

          // Strategy pages (buy-low, sell-high, draft-pick-values)
          if (
            fullPath.includes('dynasty-buy-low') ||
            fullPath.includes('dynasty-sell-high') ||
            fullPath.includes('dynasty-draft-pick-values')
          ) {
            shouldAddByline = true
            shouldAddTrustSection = true
            shouldAddExpertBio = true
          }

          // Ranking pages
          if (fullPath.includes('rankings')) {
            shouldAddByline = true
            verificationAdded++
          }

          // Add author byline
          if (shouldAddByline) {
            const byline = generateAuthorByline('Fantasy Draft Pros Team', today, today)
            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${byline}\n  </body>`)
              authorBylineAdded++
            }
          }

          // Add trust section
          if (shouldAddTrustSection) {
            const trustSection = generateTrustSection()
            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${trustSection}\n  </body>`)
              trustSectionAdded++
            }
          }

          // Add expert bio block
          if (shouldAddExpertBio) {
            const bioBlock = generateExpertBioBlock(fantasyDraftProsTeam)
            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${bioBlock}\n  </body>`)
              expertBioAdded++
            }
          }

          // Add EEAT schema to content pages
          if (shouldAddByline) {
            const eeatSchema = generateEeatSchema(
              'Dynasty Fantasy Football Analysis',
              'Fantasy Draft Pros Team',
              today,
              today,
              fantasyDraftProsTeam.expertise
            )
            const schemaTag = `<script type="application/ld+json">\n${eeatSchema}\n</script>\n  <!-- Phase 17: E-E-A-T Schema -->\n  `
            if (content.includes('</head>')) {
              content = content.replace('</head>', `  ${schemaTag}</head>`)
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
  return {
    pagesProcessed,
    authorBylineAdded,
    trustSectionAdded,
    expertBioAdded,
    verificationAdded,
  }
}
