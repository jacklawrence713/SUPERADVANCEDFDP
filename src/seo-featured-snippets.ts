/**
 * Featured Snippet & Position Zero Optimization (Phase 19.1)
 *
 * Optimizes pages for Google featured snippets by:
 * - Creating answer-focused content blocks
 * - Implementing AnswerObject schema markup
 * - Targeting featured snippet query patterns
 * - Optimizing FAQ and definition content
 */

export interface FeaturedSnippetContent {
  question: string
  answer: string
  type: 'paragraph' | 'list' | 'table' | 'definition'
  keywords: string[]
  estimatedVolume: number
  difficulty: number
}

/**
 * Generate featured snippet opportunities based on search queries
 */
export function generateFeaturedSnippetOpportunities(): FeaturedSnippetContent[] {
  return [
    {
      question: 'What is dynasty fantasy football?',
      answer: 'Dynasty fantasy football is a long-term league format where players retain roster control across multiple seasons, building lasting team value and strategy depth.',
      type: 'definition',
      keywords: ['dynasty fantasy', 'dynasty league', 'what is dynasty'],
      estimatedVolume: 8900,
      difficulty: 20,
    },
    {
      question: 'How do you calculate dynasty trade value?',
      answer: 'Dynasty trade value combines player age, production history, positional scarcity, remaining prime years, and league-specific scoring format into a composite ranking score.',
      type: 'definition',
      keywords: ['trade value', 'calculate value', 'dynasty valuation'],
      estimatedVolume: 5600,
      difficulty: 25,
    },
    {
      question: 'What is superflex in dynasty fantasy?',
      answer: 'Superflex (SF) is a league format allowing a second quarterback in the flex position, significantly increasing QB scarcity and value compared to traditional 1-QB leagues.',
      type: 'definition',
      keywords: ['superflex', '2qb', 'SF dynasty'],
      estimatedVolume: 4200,
      difficulty: 22,
    },
    {
      question: 'What is tight end premium in dynasty?',
      answer: 'Tight End Premium (TE Premium/TEP) boosts tight end scoring by 1.5x or more, recognizing positional scarcity and creating distinct valuation strategies in dynasty leagues.',
      type: 'definition',
      keywords: ['TE premium', 'tight end premium', 'TEP dynasty'],
      estimatedVolume: 2100,
      difficulty: 18,
    },
    {
      question: 'How to value a dynasty trade',
      answer: 'Step 1: Get both sides\' FDP Values. Step 2: Compare total value. Step 3: Assess timing and fit. Step 4: Consider contention window. Step 5: Make win-now vs rebuild decision.',
      type: 'list',
      keywords: ['how to value', 'trade valuation', 'evaluate trade'],
      estimatedVolume: 3200,
      difficulty: 28,
    },
    {
      question: 'What is IDP in dynasty fantasy?',
      answer: 'Individual Defensive Player (IDP) leagues score individual defensive players (DL, LB, DB) instead of team defenses, adding depth and requiring year-round roster management.',
      type: 'definition',
      keywords: ['IDP', 'individual defensive player', 'IDP scoring'],
      estimatedVolume: 1800,
      difficulty: 20,
    },
    {
      question: 'How to rebuild a dynasty team',
      answer: 'Step 1: Sell aging stars. Step 2: Accumulate picks and youth. Step 3: Target players entering prime. Step 4: Accept short-term losses. Step 5: Execute 2-3 year rebuild timeline.',
      type: 'list',
      keywords: ['rebuild strategy', 'dynasty rebuild', 'tank'],
      estimatedVolume: 2400,
      difficulty: 24,
    },
    {
      question: 'What is buy low in dynasty?',
      answer: 'Buy-low refers to acquiring players experiencing temporary underperformance or injury recovery at discount valuations, expecting value appreciation when circumstances improve.',
      type: 'definition',
      keywords: ['buy low', 'buy-low candidates', 'value opportunities'],
      estimatedVolume: 1600,
      difficulty: 26,
    },
    {
      question: 'How many dynasty players should I have?',
      answer: 'Dynasty rosters typically range 25-35 players including bench/taxi squad depth, balancing active production with future draft capital and young prospect development.',
      type: 'definition',
      keywords: ['dynasty roster size', 'roster depth', 'bench players'],
      estimatedVolume: 900,
      difficulty: 15,
    },
    {
      question: 'What is a contention window?',
      answer: 'A contention window is the multi-year period when a dynasty team\'s core players are in their prime, maximizing championship probability before age/decline forces rebuild.',
      type: 'definition',
      keywords: ['contention window', 'championship window', 'prime years'],
      estimatedVolume: 1400,
      difficulty: 21,
    },
  ]
}

/**
 * Generate AnswerObject schema markup for featured snippet optimization
 */
export function generateAnswerSchema(question: string, answer: string, author: string = 'Fantasy Draft Pros'): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    'mainEntity': {
      '@type': 'Question',
      'name': question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': answer,
        'author': {
          '@type': 'Organization',
          'name': author,
          'url': 'https://fantasydraftpros.com',
        },
      },
    },
  })
}

/**
 * Generate featured snippet FAQ page HTML
 */
export function generateFeaturedSnippetPageHtml(
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  const snippets = generateFeaturedSnippetOpportunities()
  const faqItems = snippets
    .map(
      (s) => `<div style="margin:24px 0;padding:16px;background:#0a0913;border-left:4px solid #7c4dff;border-radius:4px">
    <h3 style="color:#7c4dff;margin-top:0;font-size:16px">${s.question}</h3>
    <p style="margin:8px 0;font-size:14px;color:#e0dce8;line-height:1.6">${s.answer}</p>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;font-size:12px">
      ${s.keywords.map((k) => `<span style="background:#1a1829;color:#7c4dff;padding:4px 8px;border-radius:4px">${k}</span>`).join('')}
    </div>
  </div>`
    )
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dynasty Fantasy Football FAQ - Featured Questions Answered | Fantasy Draft Pros</title>
  <meta name="description" content="Get answers to top dynasty fantasy football questions. Featured snippet optimized answers covering valuation, strategy, rebuild, superflex, TE Premium, and IDP." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://fantasydraftpros.com/featured-snippets/" />
  <meta property="og:title" content="Dynasty Fantasy FAQ - Top Questions Answered" />
  <meta property="og:description" content="Expert answers to the most common dynasty fantasy football questions, optimized for featured snippet placement." />
  <meta property="og:url" content="https://fantasydraftpros.com/featured-snippets/" />
  <meta property="og:type" content="article" />
  <meta property="og:image" content="https://fantasydraftpros.com/logo-horizontal.png" />
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <div id="root"><div style="background:#13111e;color:#e0dce8;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;line-height:1.7">
    <h1 style="color:#7c4dff;font-size:28px;margin-bottom:8px">Dynasty Fantasy Football FAQ</h1>
    <p style="color:#9b96b8;font-size:14px;margin-bottom:24px">Featured snippet optimized answers to the most common dynasty fantasy questions</p>

    <div style="background:#1a1829;padding:20px;border-radius:8px;margin-bottom:32px">
      <h2 style="color:#7c4dff;font-size:18px;margin-top:0">Top Questions Answered</h2>
      <p style="color:#9b96b8;margin:12px 0">Get expert answers to frequently asked questions about dynasty league strategy, valuation, and format variations.</p>
    </div>

    ${faqItems}

    <div style="margin-top:40px;padding:20px;background:#1a1829;border-radius:8px;border-left:4px solid #7c4dff">
      <h3 style="color:#7c4dff;margin-top:0">Learn More</h3>
      <ul style="color:#9b96b8;margin:12px 0;line-height:1.8">
        <li><a href="https://fantasydraftpros.com/guides/" style="color:#7c4dff">Read comprehensive guides →</a></li>
        <li><a href="https://fantasydraftpros.com/dynasty-rankings/" style="color:#7c4dff">Check dynasty rankings →</a></li>
        <li><a href="https://fantasydraftpros.com/dynasty-trade-analyzer/" style="color:#7c4dff">Analyze trades →</a></li>
      </ul>
    </div>
  </div></div>
  ${appScripts}
</body>
</html>`
}
