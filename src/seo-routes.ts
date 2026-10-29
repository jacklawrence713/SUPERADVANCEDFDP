/**
 * Central SEO Route Registry
 *
 * Single source-of-truth for all public SEO routes.
 * Used for:
 * - Page generation
 * - Sitemap generation
 * - Navigation/footer
 * - HTML sitemap
 * - Tests
 *
 * Do not maintain separate route lists manually.
 */

export type SeoCategory = 'ranking' | 'tool' | 'hub' | 'guide' | 'authority' | 'directory'
export type SeoChangefreq = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

/**
 * Represents a public SEO route
 */
export interface SeoRoute {
  /** URL path without trailing slash (except homepage) */
  slug: string

  /** Page <title> */
  title: string

  /** Meta description (130-160 chars recommended) */
  description: string

  /** Content category */
  category: SeoCategory

  /** Sitemap priority (0.0-1.0) */
  priority?: number

  /** Sitemap changefreq */
  changefreq?: SeoChangefreq

  /** Whether to index the page */
  index?: boolean

  /** If true, use VALUES_UPDATED_AT as lastmod */
  usesPlayerData?: boolean

  /** For ranking pages: which position (QB, RB, WR, TE, DL, LB, DB) */
  positionFilter?: string

  /** Display group in navigations (footer, sitemap, etc.) */
  navGroup?: string

  /** H1 text for the page */
  h1?: string

  /** Whether this is dynamically generated at build time */
  dynamic?: boolean
}

/**
 * Home page
 */
const HOME: SeoRoute = {
  slug: '/',
  title: 'Dynasty Trade Calculator & Analyzer | Fantasy Draft Pros',
  description:
    'Trade dynasty players with confidence. Fantasy Draft Pros calculates FDP Values for 1,000+ players across 1QB, Superflex, TE Premium, and IDP leagues.',
  category: 'tool',
  priority: 1.0,
  changefreq: 'weekly',
  navGroup: 'Primary',
}

/**
 * Core tools (main application pages with SEO landing content)
 */
const TOOLS: SeoRoute[] = [
  {
    slug: '/dynasty-trade-analyzer/',
    title: 'Dynasty Trade Analyzer | Compare Player Values | Fantasy Draft Pros',
    description:
      'Analyze dynasty trades instantly. Input player values, see trade fairness, explore similar trades, and refine your dynasty strategy.',
    category: 'tool',
    priority: 0.95,
    changefreq: 'weekly',
    h1: 'Dynasty Trade Analyzer',
    usesPlayerData: true,
  },
  {
    slug: '/dynasty-trade-calculator/',
    title: 'Dynasty Trade Calculator | Trade Value Comparison Tool',
    description:
      'Calculate dynasty trade values with FDP Values. Compare players across positions, ages, and scoring formats.',
    category: 'tool',
    priority: 0.9,
    changefreq: 'weekly',
    h1: 'Dynasty Trade Calculator',
    usesPlayerData: true,
  },
  {
    slug: '/fantasy-football-trade-analyzer/',
    title: 'Fantasy Football Trade Analyzer | Redraft Trade Evaluator',
    description:
      'Analyze fantasy football trades for 2026 season. Get instant trade suggestions and fair value comparisons.',
    category: 'tool',
    priority: 0.8,
    changefreq: 'weekly',
    h1: 'Fantasy Football Trade Analyzer',
    usesPlayerData: true,
  },
  {
    slug: '/fantasy-football-trade-calculator/',
    title: 'Fantasy Football Trade Calculator | 2026 Trade Tool',
    description:
      'Calculate redraft trade values for your fantasy football league. Compare player values and explore trade scenarios.',
    category: 'tool',
    priority: 0.8,
    changefreq: 'weekly',
    h1: 'Fantasy Football Trade Calculator',
    usesPlayerData: true,
  },
  {
    slug: '/superflex-trade-calculator/',
    title: 'Superflex Trade Calculator | SF Dynasty Values',
    description:
      'Superflex trade calculator with adjusted QB values. Calculate fair trades in 2QB and SF leagues.',
    category: 'tool',
    priority: 0.85,
    changefreq: 'weekly',
    h1: 'Superflex Trade Calculator',
    usesPlayerData: true,
  },
  {
    slug: '/sleeper-trade-calculator/',
    title: 'Sleeper Trade Calculator | Sleeper League Trade Values',
    description:
      'Trade values for Sleeper leagues. Calculate FDP Values for Sleeper dynasty trades.',
    category: 'tool',
    priority: 0.8,
    changefreq: 'weekly',
    h1: 'Sleeper Trade Calculator',
    usesPlayerData: true,
  },
  {
    slug: '/dynasty-trade-value-chart/',
    title: 'Dynasty Trade Value Chart | FDP Player Rankings',
    description:
      'Trade value chart with FDP Values for 1,000+ dynasty players. See top ranked players, position tiers, and trade equivalents.',
    category: 'tool',
    priority: 0.9,
    changefreq: 'weekly',
    h1: 'Dynasty Trade Value Chart',
    usesPlayerData: true,
  },
  {
    slug: '/fdp-value/',
    title: 'What is FDP Value? | Dynasty Valuation Explained',
    description:
      'Learn how FDP Value works. Fantasy Draft Pros valuation system uses a 0-9,999 scale with age adjustments, Superflex, TE Premium, and IDP support.',
    category: 'authority',
    priority: 0.8,
    changefreq: 'monthly',
    h1: 'What is FDP Value?',
    usesPlayerData: true,
  },
]

/**
 * Standard dynasty rankings (1QB, PPR, full IDP)
 */
const DYNASTY_RANKINGS: SeoRoute[] = [
  {
    slug: '/dynasty-rankings/',
    title: 'Dynasty Rankings | Top 100 Fantasy Football Players',
    description:
      'Dynasty fantasy football rankings with FDP Values. See top 100 players ranked by trade value across all positions.',
    category: 'ranking',
    priority: 0.95,
    changefreq: 'weekly',
    h1: 'Dynasty Fantasy Football Rankings',
    usesPlayerData: true,
    navGroup: 'Rankings',
  },
  {
    slug: '/dynasty-qb-rankings/',
    title: 'Dynasty QB Rankings | Top Quarterbacks Trade Values',
    description:
      'Dynasty QB rankings with FDP Values. Top 50 quarterbacks ranked by trade value for dynasty fantasy football.',
    category: 'ranking',
    priority: 0.9,
    changefreq: 'weekly',
    h1: 'Dynasty QB Rankings',
    usesPlayerData: true,
    positionFilter: 'QB',
    navGroup: 'Rankings',
    dynamic: true,
  },
  {
    slug: '/dynasty-rb-rankings/',
    title: 'Dynasty RB Rankings | Top Running Backs Trade Values',
    description:
      'Dynasty RB rankings with FDP Values. Top 50 running backs ranked by trade value for dynasty fantasy football.',
    category: 'ranking',
    priority: 0.9,
    changefreq: 'weekly',
    h1: 'Dynasty RB Rankings',
    usesPlayerData: true,
    positionFilter: 'RB',
    navGroup: 'Rankings',
    dynamic: true,
  },
  {
    slug: '/dynasty-wr-rankings/',
    title: 'Dynasty WR Rankings | Top Wide Receivers Trade Values',
    description:
      'Dynasty WR rankings with FDP Values. Top 50 wide receivers ranked by trade value for dynasty fantasy football.',
    category: 'ranking',
    priority: 0.9,
    changefreq: 'weekly',
    h1: 'Dynasty WR Rankings',
    usesPlayerData: true,
    positionFilter: 'WR',
    navGroup: 'Rankings',
    dynamic: true,
  },
  {
    slug: '/dynasty-te-rankings/',
    title: 'Dynasty TE Rankings | Top Tight Ends Trade Values',
    description:
      'Dynasty TE rankings with FDP Values. Top 50 tight ends ranked by trade value for dynasty fantasy football.',
    category: 'ranking',
    priority: 0.9,
    changefreq: 'weekly',
    h1: 'Dynasty TE Rankings',
    usesPlayerData: true,
    positionFilter: 'TE',
    navGroup: 'Rankings',
    dynamic: true,
  },
  {
    slug: '/idp-dynasty-rankings/',
    title: 'Dynasty IDP Rankings | DL, LB, DB Trade Values',
    description:
      'Dynasty IDP rankings for defensive line, linebacker, and defensive back positions. FDP Values for IDP leagues.',
    category: 'ranking',
    priority: 0.8,
    changefreq: 'weekly',
    h1: 'Dynasty IDP Rankings',
    usesPlayerData: true,
    navGroup: 'Rankings',
  },
]

/**
 * Superflex rankings
 */
const SUPERFLEX_RANKINGS: SeoRoute[] = [
  {
    slug: '/superflex-rankings/',
    title: 'Superflex Rankings | 2QB Dynasty Player Values',
    description:
      'Superflex rankings with adjusted QB values. See how player values change in 2QB and Superflex leagues.',
    category: 'ranking',
    priority: 0.85,
    changefreq: 'weekly',
    h1: 'Superflex Rankings',
    usesPlayerData: true,
    navGroup: 'Rankings',
    dynamic: true,
  },
]

/**
 * TE Premium rankings
 */
const TE_PREMIUM_RANKINGS: SeoRoute[] = [
  {
    slug: '/te-premium-rankings/',
    title: 'TE Premium Rankings | Tight End Premium League Values',
    description:
      'TE Premium rankings with boosted TE values. See how tight ends rank when TE Premium scoring is enabled.',
    category: 'ranking',
    priority: 0.8,
    changefreq: 'weekly',
    h1: 'TE Premium Rankings',
    usesPlayerData: true,
    navGroup: 'Rankings',
    dynamic: true,
  },
]

/**
 * Player directories (not individual player pages)
 */
const PLAYER_DIRECTORIES: SeoRoute[] = [
  {
    slug: '/players/',
    title: 'Dynasty Players Directory | Browse 1,000+ Fantasy Football Players',
    description:
      'Browse all 1,000+ dynasty fantasy football players. Find players by position, team, age, and FDP Value.',
    category: 'directory',
    priority: 0.85,
    changefreq: 'weekly',
    h1: 'Dynasty Players Directory',
    usesPlayerData: true,
    navGroup: 'Players',
  },
  {
    slug: '/players/qb/',
    title: 'Dynasty QB Players | Quarterbacks Directory',
    description: 'Browse all dynasty QB players with FDP Values and rankings.',
    category: 'directory',
    priority: 0.8,
    changefreq: 'weekly',
    h1: 'Dynasty QB Directory',
    usesPlayerData: true,
    positionFilter: 'QB',
    navGroup: 'Players',
  },
  {
    slug: '/players/rb/',
    title: 'Dynasty RB Players | Running Backs Directory',
    description: 'Browse all dynasty RB players with FDP Values and rankings.',
    category: 'directory',
    priority: 0.8,
    changefreq: 'weekly',
    h1: 'Dynasty RB Directory',
    usesPlayerData: true,
    positionFilter: 'RB',
    navGroup: 'Players',
  },
  {
    slug: '/players/wr/',
    title: 'Dynasty WR Players | Wide Receivers Directory',
    description: 'Browse all dynasty WR players with FDP Values and rankings.',
    category: 'directory',
    priority: 0.8,
    changefreq: 'weekly',
    h1: 'Dynasty WR Directory',
    usesPlayerData: true,
    positionFilter: 'WR',
    navGroup: 'Players',
  },
  {
    slug: '/players/te/',
    title: 'Dynasty TE Players | Tight Ends Directory',
    description: 'Browse all dynasty TE players with FDP Values and rankings.',
    category: 'directory',
    priority: 0.8,
    changefreq: 'weekly',
    h1: 'Dynasty TE Directory',
    usesPlayerData: true,
    positionFilter: 'TE',
    navGroup: 'Players',
  },
  {
    slug: '/players/idp/',
    title: 'Dynasty IDP Players | DL, LB, DB Directory',
    description: 'Browse all dynasty IDP players with FDP Values and rankings.',
    category: 'directory',
    priority: 0.75,
    changefreq: 'weekly',
    h1: 'Dynasty IDP Directory',
    usesPlayerData: true,
    navGroup: 'Players',
  },
]

/**
 * Research & market analysis pages (Phase 1)
 */
const RESEARCH_PAGES: SeoRoute[] = [
  {
    slug: '/fdp-market-index/',
    title: 'FDP Market Index | Dynasty Fantasy Football Market Metrics',
    description:
      'Proprietary FDP Market Index - Aggregate dynasty fantasy football market metrics. See position strength, top player values, and market composition.',
    category: 'hub',
    priority: 0.85,
    changefreq: 'weekly',
    h1: 'FDP Market Index',
    usesPlayerData: true,
    navGroup: 'Resources',
    dynamic: true,
  },
  {
    slug: '/dynasty-value-movers/',
    title: 'Dynasty Value Movers | Biggest Risers & Fallers',
    description:
      'See which dynasty players are rising and falling in FDP Value. Track the biggest value movers in dynasty fantasy football.',
    category: 'hub',
    priority: 0.8,
    changefreq: 'weekly',
    h1: 'Dynasty Value Movers',
    usesPlayerData: true,
    navGroup: 'Resources',
    dynamic: true,
  },
]

/**
 * NFL Team Hubs (Phase 1) - Fantasy football content for all 32 teams
 */
const NFL_TEAM_HUBS: SeoRoute[] = [
  {
    slug: '/nfl/',
    title: 'NFL Teams Fantasy Football | Dynasty Guides for All 32 Teams',
    description:
      'Explore fantasy football dynasty guides for all 32 NFL teams. View team rosters, highest-value assets, and trading recommendations.',
    category: 'directory',
    priority: 0.85,
    changefreq: 'monthly',
    h1: 'NFL Teams Fantasy Football',
    navGroup: 'Teams',
    dynamic: true,
  },
  // Dynamic team hub routes: /nfl/{slug}/fantasy-football/ (32 URLs)
  // Each page shows top 15 players by FDP Value, position breakdown, trade analyzer links
  // Priority: 0.8, usesPlayerData: true, changefreq: weekly
]

/**
 * Individual player pages (Phase 1 - Dynamic)
 * ~1,000 URLs generated at build time from player database
 * Both indexable (~686 URLs) and noindex (~314 URLs) based on FDP Value threshold
 */
const DYNAMIC_PLAYER_PAGES: SeoRoute = {
  slug: '/players/{slug}/',
  title: 'Dynasty Player Page | Trade Value & Analysis',
  description:
    'Dynasty player page with trade value, rankings, comparable players, and trading guidance.',
  category: 'directory',
  priority: 0.6,
  changefreq: 'weekly',
  h1: 'Player Profile',
  usesPlayerData: true,
  dynamic: true,
  index: true, // Indexable based on FDP Value threshold
}

/**
 * Topical authority hubs
 */
const AUTHORITY_HUBS: SeoRoute[] = [
  {
    slug: '/dynasty-fantasy-football/',
    title: 'Dynasty Fantasy Football Guide | Rules, Strategy, Rankings',
    description:
      'Complete dynasty fantasy football guide. Learn dynasty rules, valuation methods, trading strategies, and explore FDP rankings.',
    category: 'hub',
    priority: 0.85,
    changefreq: 'monthly',
    h1: 'Dynasty Fantasy Football',
    navGroup: 'Resources',
  },
]

/**
 * Strategy pages
 */
const STRATEGY_PAGES: SeoRoute[] = [
  {
    slug: '/dynasty-buy-low/',
    title: 'Dynasty Buy Low Players | Undervalued Trade Targets',
    description:
      'Find dynasty buy-low candidates. Discover undervalued players with upside in dynasty leagues.',
    category: 'guide',
    priority: 0.7,
    changefreq: 'weekly',
    h1: 'Dynasty Buy Low Opportunities',
    usesPlayerData: true,
    navGroup: 'Resources',
  },
  {
    slug: '/dynasty-sell-high/',
    title: 'Dynasty Sell High Players | Peak Value Trades',
    description:
      'Find dynasty sell-high candidates. Discover players at peak value before declining.',
    category: 'guide',
    priority: 0.7,
    changefreq: 'weekly',
    h1: 'Dynasty Sell High Opportunities',
    usesPlayerData: true,
    navGroup: 'Resources',
  },
  {
    slug: '/dynasty-draft-pick-values/',
    title: 'Dynasty Draft Pick Values | 2026-2028 Pick Trade Values',
    description:
      'Dynasty draft pick trade values. See how 2026, 2027, and 2028 draft picks compare to player values.',
    category: 'guide',
    priority: 0.75,
    changefreq: 'weekly',
    h1: 'Dynasty Draft Pick Values',
    usesPlayerData: true,
    navGroup: 'Resources',
  },
]

/**
 * Trust and authority pages
 */
const TRUST_PAGES: SeoRoute[] = [
  {
    slug: '/about/',
    title: 'About Fantasy Draft Pros | Dynasty Trade Valuation Tool',
    description:
      'About Fantasy Draft Pros. Learn what we do, which league formats we support, and how we calculate player values.',
    category: 'authority',
    priority: 0.7,
    changefreq: 'yearly',
    h1: 'About Fantasy Draft Pros',
    navGroup: 'About',
  },
  {
    slug: '/methodology/',
    title: 'FDP Valuation Methodology | How We Calculate Player Values',
    description:
      'FDP Valuation methodology. Understand how we calculate dynasty player values, age adjustments, positional scarcity, and format support.',
    category: 'authority',
    priority: 0.75,
    changefreq: 'monthly',
    h1: 'FDP Valuation Methodology',
    navGroup: 'About',
  },
  {
    slug: '/editorial-policy/',
    title: 'Editorial Policy | Data Integrity and Corrections',
    description:
      'Editorial policy for Fantasy Draft Pros. Learn how we maintain data accuracy, handle corrections, and ensure independence.',
    category: 'authority',
    priority: 0.65,
    changefreq: 'yearly',
    h1: 'Editorial Policy',
    navGroup: 'About',
  },
]

/**
 * Guides hub and articles
 */
const GUIDES: SeoRoute[] = [
  {
    slug: '/guides/',
    title: 'Dynasty Guides | Strategy Articles and Tutorials',
    description:
      'Dynasty fantasy football guides and strategy articles. Learn how to value trades, use tools, and optimize league strategy.',
    category: 'guide',
    priority: 0.8,
    changefreq: 'monthly',
    h1: 'Dynasty Guides',
    navGroup: 'Guides',
  },
  {
    slug: '/guides/how-to-value-a-dynasty-trade/',
    title: 'How to Value a Dynasty Trade | Trade Evaluation Guide',
    description:
      'Complete guide to valuing dynasty trades. Learn framework, age adjustments, positional scarcity, and when to trade.',
    category: 'guide',
    priority: 0.75,
    changefreq: 'monthly',
    h1: 'How to Value a Dynasty Trade',
    navGroup: 'Guides',
  },
  {
    slug: '/guides/dynasty-trade-calculator-guide/',
    title: 'Dynasty Trade Calculator Guide | How to Use FDP Values',
    description:
      'Guide to using the FDP Dynasty Trade Calculator. Learn how to input trades, interpret values, and make better decisions.',
    category: 'guide',
    priority: 0.7,
    changefreq: 'monthly',
    h1: 'Dynasty Trade Calculator Guide',
    navGroup: 'Guides',
  },
  {
    slug: '/guides/superflex-strategy/',
    title: 'Superflex Dynasty Strategy | 2QB League Tactics',
    description:
      'Superflex dynasty strategy guide. Learn QB value, early picks, and trade strategy for 2QB and Superflex leagues.',
    category: 'guide',
    priority: 0.7,
    changefreq: 'monthly',
    h1: 'Superflex Dynasty Strategy',
    navGroup: 'Guides',
  },
  {
    slug: '/guides/te-premium-strategy/',
    title: 'TE Premium Dynasty Strategy | Tight End Scarcity Tactics',
    description:
      'TE Premium dynasty strategy. Understand tight end value in TE Premium leagues and optimal draft/trade tactics.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'TE Premium Dynasty Strategy',
    navGroup: 'Guides',
  },
  {
    slug: '/guides/idp-dynasty-values/',
    title: 'IDP Dynasty Values | DL, LB, DB Trade Valuation',
    description:
      'IDP dynasty values guide. Learn how to value defensive line, linebacker, and defensive back positions in IDP leagues.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'IDP Dynasty Values',
    navGroup: 'Guides',
  },
]

/**
 * Site map (human-readable directory)
 */
const SITEMAP_PAGE: SeoRoute = {
  slug: '/sitemap/',
  title: 'Sitemap | Fantasy Draft Pros',
  description: 'Browse all Fantasy Draft Pros pages. Tools, rankings, guides, and player directory.',
  category: 'directory',
  priority: 0.5,
  changefreq: 'monthly',
  h1: 'Sitemap',
  navGroup: 'Footer',
  index: false, // Noindex — not needed in search results
}

/**
 * All public SEO routes
 */
export const SEO_ROUTES: SeoRoute[] = [
  HOME,
  ...TOOLS,
  ...DYNASTY_RANKINGS,
  ...SUPERFLEX_RANKINGS,
  ...TE_PREMIUM_RANKINGS,
  ...PLAYER_DIRECTORIES,
  ...RESEARCH_PAGES,
  ...NFL_TEAM_HUBS,
  DYNAMIC_PLAYER_PAGES,
  ...AUTHORITY_HUBS,
  ...STRATEGY_PAGES,
  ...TRUST_PAGES,
  ...GUIDES,
  SITEMAP_PAGE,
]

/**
 * Find a route by slug
 */
export function findRoute(slug: string): SeoRoute | undefined {
  return SEO_ROUTES.find(r => r.slug === slug)
}

/**
 * Get routes by category
 */
export function getRoutesByCategory(category: SeoCategory): SeoRoute[] {
  return SEO_ROUTES.filter(r => r.category === category)
}

/**
 * Get routes by nav group
 */
export function getRoutesByGroup(group: string): SeoRoute[] {
  return SEO_ROUTES.filter(r => r.navGroup === group)
}

/**
 * Get all distinct nav groups
 */
export function getNavGroups(): string[] {
  const groups = new Set(SEO_ROUTES.map(r => r.navGroup).filter(Boolean))
  return Array.from(groups).sort()
}

/**
 * Get routes that use player data (should have lastmod = VALUES_UPDATED_AT)
 */
export function getPlayerDataRoutes(): SeoRoute[] {
  return SEO_ROUTES.filter(r => r.usesPlayerData)
}

/**
 * Get dynamic routes (generated at build time)
 */
export function getDynamicRoutes(): SeoRoute[] {
  return SEO_ROUTES.filter(r => r.dynamic)
}

/**
 * Get indexable routes (exclude noindex)
 */
export function getIndexableRoutes(): SeoRoute[] {
  return SEO_ROUTES.filter(r => r.index !== false)
}

/**
 * Get routes for sitemap (indexable, not redirect/404)
 */
export function getSitemapRoutes(): SeoRoute[] {
  return getIndexableRoutes().filter(r => !r.slug.includes('/redirect/'))
}
