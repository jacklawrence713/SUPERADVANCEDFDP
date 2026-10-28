/**
 * Rich Snippet Post-Processor (Phase 15)
 *
 * Injects advanced schema markup into generated pages
 * after build to enhance search results.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import {
  generateFaqSchema,
  generateHowToSchema,
  generateAggregateRatingSchema,
  generateDataCatalogSchema,
  generateToolApplicationSchema,
} from './seo-rich-snippets'

export interface RichSnippetResult {
  pagesProcessed: number
  faqSchemasAdded: number
  howToSchemasAdded: number
  ratingSchemasAdded: number
  dataCatalogAdded: number
}

export function injectRichSnippets(distDir: string, playerCount: number = 1320): RichSnippetResult {
  let pagesProcessed = 0
  let faqSchemasAdded = 0
  let howToSchemasAdded = 0
  let ratingSchemasAdded = 0
  let dataCatalogAdded = 0

  // Guide page FAQs
  const guideFaqs: Record<string, Array<{ question: string; answer: string }>> = {
    'how-to-value-a-dynasty-trade': [
      {
        question: 'What is a good dynasty trade?',
        answer: 'A good dynasty trade exploits value discrepancies where you and your trade partner have different opinions on player values. Your goal is to gain relative value in the transaction.',
      },
      {
        question: 'How do I use FDP Value in trades?',
        answer: 'Use FDP Value as a market-informed baseline for player worth. Look for players whose FDP Value differs significantly from other valuations—that gap represents a trade opportunity.',
      },
      {
        question: 'Should I trade for young players or proven veterans?',
        answer: 'It depends on your team window. If competing now, trade for proven producers. If rebuilding, acquire young players with higher remaining value and production upside.',
      },
    ],
    'superflex-strategy': [
      {
        question: 'Why do QBs cost more in Superflex?',
        answer: 'In Superflex leagues, you need TWO starting-caliber QBs instead of one. This creates massive QB scarcity, dramatically increasing quarterback trade values.',
      },
      {
        question: 'When should I draft a QB in Superflex?',
        answer: 'QBs typically start coming off the board in rounds 1-2 of Superflex startups instead of rounds 8-10 in 1QB leagues. Plan accordingly in your draft strategy.',
      },
    ],
    'te-premium-strategy': [
      {
        question: 'What makes TE Premium different from standard scoring?',
        answer: 'TE Premium boosts tight end scoring (typically +0.5 to +1.0 PPR per catch), creating position scarcity at the TE position and making elite TEs premium assets.',
      },
      {
        question: 'Which tight ends should I target in TE Premium?',
        answer: 'Focus on elite, young tight ends with years of production ahead. Unlike redraft, you cannot stream TEs in dynasty—secure one elite option early.',
      },
    ],
  }

  // HowTo Schemas for tools
  const toolHowTos: Record<string, { title: string; description: string; steps: Array<{ name: string; text: string }> }> = {
    'dynasty-trade-analyzer': {
      title: 'How to Use the Dynasty Trade Analyzer',
      description: 'Step-by-step guide to analyzing dynasty trades using FDP Values and trade comparison tools.',
      steps: [
        { name: 'Select Players', text: 'Choose the players involved in the potential trade for both sides.' },
        { name: 'View FDP Values', text: 'See the current FDP Value for each player on the 0-9,999 scale.' },
        { name: 'Compare Total Value', text: 'Sum the total value for each side—look for value imbalances.' },
        { name: 'Evaluate Fit', text: 'Consider positional needs, age, and team window alignment.' },
        { name: 'Make Decision', text: 'Accept trades where you gain relative value compared to your counterpart.' },
      ],
    },
    'dynasty-trade-calculator': {
      title: 'How to Calculate Dynasty Trade Value',
      description: 'Use the calculator to explore trade scenarios and understand player value relationships.',
      steps: [
        { name: 'Build Your Scenario', text: 'Input any combination of players you want to evaluate.' },
        { name: 'Add Players', text: 'Add players to each side of the proposed trade.' },
        { name: 'See Total Value', text: 'Review the total FDP Value for each side of the trade.' },
        { name: 'Adjust Until Fair', text: 'Add or remove players until you find a balanced trade.' },
        { name: 'Propose to League', text: 'Once satisfied, propose the trade to your trading partner.' },
      ],
    },
  }

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
          let content = readFileSync(fullPath, 'utf-8')

          // Skip if already has Phase 15
          if (content.includes('Phase 15')) continue

          // Add FAQ schema to guide pages
          for (const [guidePath, faqs] of Object.entries(guideFaqs)) {
            if (fullPath.includes(`/guides/${guidePath}`) || fullPath.includes(guidePath)) {
              const faqSchema = generateFaqSchema(guidePath, faqs)
              const schemaTag = `<script type="application/ld+json">\n${faqSchema}\n</script>\n  `
              content = content.replace('</head>', `  ${schemaTag}</head>`)
              faqSchemasAdded++
              break
            }
          }

          // Add HowTo schema to tool pages
          for (const [toolPath, howTo] of Object.entries(toolHowTos)) {
            if (fullPath.includes(toolPath)) {
              const howToSchema = generateHowToSchema(howTo.title, howTo.description, howTo.steps)
              const schemaTag = `<script type="application/ld+json">\n${howToSchema}\n</script>\n  `
              content = content.replace('</head>', `  ${schemaTag}</head>`)
              howToSchemasAdded++
              break
            }
          }

          // Add DataCatalog schema to player directory
          if (fullPath.includes('/players/index.html')) {
            const dataCatalogSchema = generateDataCatalogSchema(playerCount)
            const schemaTag = `<script type="application/ld+json">\n${dataCatalogSchema}\n</script>\n  `
            content = content.replace('</head>', `  ${schemaTag}</head>`)
            dataCatalogAdded++
          }

          // Add rating schemas to ranking pages
          if (fullPath.includes('/rankings/') && !fullPath.includes('/superflex') && !fullPath.includes('/te-premium')) {
            const ratingSchema = generateAggregateRatingSchema('Dynasty Player', 'Multi-Position', 6.5, 1320)
            const schemaTag = `<script type="application/ld+json">\n${ratingSchema}\n</script>\n  `
            content = content.replace('</head>', `  ${schemaTag}</head>`)
            ratingSchemasAdded++
          }

          // Write updated content
          if (
            faqSchemasAdded > 0 ||
            howToSchemasAdded > 0 ||
            ratingSchemasAdded > 0 ||
            dataCatalogAdded > 0
          ) {
            writeFileSync(fullPath, content)
          }
        }
      }
    } catch (e) {
      // Skip errors
    }
  }

  walkAndInject(distDir)
  return {
    pagesProcessed,
    faqSchemasAdded,
    howToSchemasAdded,
    ratingSchemasAdded,
    dataCatalogAdded,
  }
}
