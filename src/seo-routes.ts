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
 * Research Hub & Research Content Pages (Phase 2)
 */
const RESEARCH_HUB: SeoRoute = {
  slug: '/research/',
  title: 'Dynasty Research Hub | Advanced Analysis & Insights | Fantasy Draft Pros',
  description:
    'In-depth dynasty fantasy football research. Explore team dynasty capital, age curves, player tiers, and advanced analysis from FDP experts.',
  category: 'hub',
  priority: 0.85,
  changefreq: 'monthly',
  h1: 'Dynasty Research Hub',
  navGroup: 'Resources',
  dynamic: true,
}

const RESEARCH_CONTENT_PAGES: SeoRoute[] = [
  {
    slug: '/research/team-dynasty-capital/',
    title: 'Team Dynasty Capital | NFL Team Asset Analysis | Fantasy Draft Pros',
    description:
      'Comprehensive analysis of each NFL team\'s dynasty asset pool. See which teams have the most valuable dynasty players and project future roster strength.',
    category: 'hub',
    priority: 0.8,
    changefreq: 'weekly',
    h1: 'Team Dynasty Capital Analysis',
    usesPlayerData: true,
    navGroup: 'Resources',
    dynamic: true,
  },
  {
    slug: '/research/age-curves/',
    title: 'Dynasty Age Curves | Player Value Peaks by Position | Fantasy Draft Pros',
    description:
      'Understand player value trajectories by age. Analyze peak value windows for each position and plan multi-year dynasty strategies.',
    category: 'hub',
    priority: 0.75,
    changefreq: 'monthly',
    h1: 'Age Curves & Position Value Trajectories',
    usesPlayerData: true,
    navGroup: 'Resources',
    dynamic: true,
  },
  {
    slug: '/research/player-tiers/',
    title: 'Dynasty Player Tiers | Value Clustering Analysis | Fantasy Draft Pros',
    description:
      'Discover natural clustering of player values. Identify bargains within tiers and understand the dynasty asset hierarchy.',
    category: 'hub',
    priority: 0.75,
    changefreq: 'monthly',
    h1: 'Player Tier Analysis',
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
 * Phase 3: Dynasty Setup, Drafting, Trading & Rebuilding
 */
const LEAGUE_SETUP_PAGES: SeoRoute[] = [
  {
    slug: '/dynasty-league-setup/',
    title: 'Dynasty League Setup Guide | How to Start a League',
    description: 'Complete guide to setting up dynasty fantasy football leagues. Learn formats, scoring, roster construction, and best practices.',
    category: 'guide',
    priority: 0.8,
    changefreq: 'monthly',
    h1: 'Dynasty League Setup',
    navGroup: 'Guides',
    dynamic: true,
  },
  {
    slug: '/dynasty-league-setup/1qb-leagues/',
    title: '1QB Dynasty League Setup | Single Quarterback Format',
    description: 'Guide to 1QB dynasty league setup and strategy. The traditional format emphasizing RB/WR depth.',
    category: 'guide',
    priority: 0.7,
    changefreq: 'monthly',
    h1: '1QB Dynasty League',
  },
  {
    slug: '/dynasty-league-setup/superflex-leagues/',
    title: 'Superflex Dynasty League Setup | 2QB Format Guide',
    description: 'Superflex/2QB dynasty league setup guide. Learn how 2 QB slots change draft strategy and player values.',
    category: 'guide',
    priority: 0.7,
    changefreq: 'monthly',
    h1: 'Superflex Dynasty League',
  },
  {
    slug: '/dynasty-league-setup/te-premium-leagues/',
    title: 'TE Premium Dynasty League Setup | Tight End Emphasis',
    description: 'TE Premium dynasty league guide. Set up tight end premium scoring and strategy.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'TE Premium Dynasty League',
  },
  {
    slug: '/dynasty-league-setup/idp-leagues/',
    title: 'IDP Dynasty League Setup | Individual Defensive Players',
    description: 'IDP dynasty league setup and strategy guide. Draft defensive players individually.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'IDP Dynasty League',
  },
]

const DRAFT_STRATEGY_PAGES: SeoRoute[] = [
  {
    slug: '/guides/dynasty-draft-strategy/',
    title: 'Dynasty Draft Strategy Guide | Round-by-Round Planning',
    description: 'Complete dynasty draft strategy guide. Learn how to approach each round, draft by position, and startup draft tactics.',
    category: 'guide',
    priority: 0.75,
    changefreq: 'monthly',
    h1: 'Dynasty Draft Strategy',
    navGroup: 'Guides',
    dynamic: true,
  },
]

const TRADE_SCENARIO_PAGES: SeoRoute[] = [
  {
    slug: '/guides/trade-scenarios/',
    title: 'Common Dynasty Trade Scenarios | Trade Pattern Examples',
    description: 'Explore common dynasty trade scenarios and patterns. Learn 2-for-1s, 3-for-1s, and trade structures.',
    category: 'guide',
    priority: 0.7,
    changefreq: 'monthly',
    h1: 'Trade Scenarios',
    navGroup: 'Guides',
    dynamic: true,
  },
]

const REBUILD_PAGES: SeoRoute[] = [
  {
    slug: '/guides/rebuild-strategy/',
    title: 'Dynasty Rebuild Strategy | Multi-Year Roadmaps',
    description: 'Dynasty rebuild strategy guide. Learn multi-year rebuilding timelines and transitioning back to contention.',
    category: 'guide',
    priority: 0.7,
    changefreq: 'monthly',
    h1: 'Rebuild Strategy',
    navGroup: 'Guides',
    dynamic: true,
  },
]



/**
 * Phase 4: Advanced Formats, Player Analysis, & Analytics (20+ pages)
 */
const ADVANCED_FORMAT_PAGES: SeoRoute[] = [
  {
    slug: '/guides/keeper-leagues/',
    title: 'Keeper League Strategy | Keeper vs Dynasty',
    description: 'Keeper league guide. Compare keeper vs dynasty strategies and keeper cost evaluation.',
    category: 'guide',
    priority: 0.7,
    changefreq: 'monthly',
    h1: 'Keeper League Strategy',
    navGroup: 'Guides',
    dynamic: true,
  },
  {
    slug: '/guides/auction-draft-strategy/',
    title: 'Auction Draft Strategy | Bidding Tactics',
    description: 'Auction draft guide. Master bidding strategy and value identification in auction formats.',
    category: 'guide',
    priority: 0.7,
    changefreq: 'monthly',
    h1: 'Auction Draft Strategy',
    navGroup: 'Guides',
    dynamic: true,
  },
  {
    slug: '/guides/best-ball-strategy/',
    title: 'Best Ball League Strategy | No-Lineup Format',
    description: 'Best ball strategy guide. Draft tactics for automatic lineup optimization.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Best Ball Strategy',
    navGroup: 'Guides',
    dynamic: true,
  },
  {
    slug: '/guides/scoring-formats/',
    title: 'Scoring Formats | PPR vs Half-PPR vs Standard',
    description: 'Scoring format guide. Understand PPR, Half-PPR, and Standard scoring impact on values.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Scoring Formats',
    navGroup: 'Guides',
    dynamic: true,
  },
  {
    slug: '/guides/league-comparison/',
    title: 'League Type Comparison | Keeper vs Dynasty vs Best Ball',
    description: 'Compare league formats. Understand keeper, dynasty, best ball, and redraft differences.',
    category: 'guide',
    priority: 0.7,
    changefreq: 'monthly',
    h1: 'League Comparison',
    navGroup: 'Guides',
    dynamic: true,
  },
]

const PLAYER_ANALYSIS_PAGES: SeoRoute[] = [
  {
    slug: '/analysis/player-development/',
    title: 'Player Development Arcs | Career Trajectories',
    description: 'Analyze player development patterns and career arcs. Predict future performance based on trajectory.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Player Development',
    navGroup: 'Analysis',
    dynamic: true,
  },
  {
    slug: '/analysis/breakout-candidates/',
    title: 'Breakout Candidates | Rising Fantasy Stars',
    description: 'Identify breakout candidates. Discover rising stars with role expansion and opportunity.',
    category: 'guide',
    priority: 0.7,
    changefreq: 'weekly',
    h1: 'Breakout Candidates',
    navGroup: 'Analysis',
    dynamic: true,
  },
]

const ANALYTICS_PAGES: SeoRoute[] = [
  {
    slug: '/analysis/league-benchmarking/',
    title: 'League Benchmarking | Compare Your League',
    description: 'Benchmark your league. Compare roster construction, ADP, and competitiveness metrics.',
    category: 'guide',
    priority: 0.6,
    changefreq: 'monthly',
    h1: 'League Benchmarking',
    navGroup: 'Analysis',
    dynamic: true,
  },
  {
    slug: '/analysis/dynasty-metrics/',
    title: 'Dynasty Metrics | Advanced Statistics',
    description: 'Advanced dynasty statistics. Understand volume metrics, efficiency, and predictive indicators.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Dynasty Metrics',
    navGroup: 'Analysis',
    dynamic: true,
  },
  {
    slug: '/analysis/injury-risk/',
    title: 'Injury Risk Assessment | Player Durability',
    description: 'Assess player injury risk. Understand durability impact on dynasty value.',
    category: 'guide',
    priority: 0.6,
    changefreq: 'weekly',
    h1: 'Injury Risk Analysis',
    navGroup: 'Analysis',
    dynamic: true,
  },
]



/**
 * Phase 5: Risk Management, Waiver Strategy, Seasonal Timing & Cap Management (10+ pages)
 */
const RISK_MANAGEMENT_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/risk-management/',
    title: 'Dynasty Risk Management | Portfolio Protection',
    description: 'Risk management guide. Assess roster risk, implement hedging strategies, and protect against uncertainty.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Risk Management',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const WAIVER_STRATEGY_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/waiver-wire-guide/',
    title: 'Waiver Wire Strategy | Free Agent Acquisition',
    description: 'Waiver wire guide. Learn weekly acquisition tactics, priority systems, and bench optimization.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'weekly',
    h1: 'Waiver Wire Strategy',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const SEASONAL_TIMING_PAGES: SeoRoute[] = [
  {
    slug: '/analysis/seasonal-trends/',
    title: 'Seasonal Trends | Value Evolution Analysis',
    description: 'Analyze seasonal trends. Understand value shifts through preseason, regular season, and playoffs.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Seasonal Trends',
    navGroup: 'Analysis',
    dynamic: true,
  },
  {
    slug: '/analysis/playoff-performance/',
    title: 'Playoff Performance | Consistency Analysis',
    description: 'Playoff strategy. Understand consistency metrics and playoff-specific performance patterns.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Playoff Performance',
    navGroup: 'Analysis',
    dynamic: true,
  },
  {
    slug: '/strategy/trade-deadline/',
    title: 'Trade Deadline Strategy | Mid-Season Adjustments',
    description: 'Trade deadline guide. Master deadline acquisitions and mid-season roster pivots.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Trade Deadline',
    navGroup: 'Strategy',
    dynamic: true,
  },
  {
    slug: '/analysis/mid-season-adjustments/',
    title: 'Mid-Season Analysis | Halfway Point Evaluation',
    description: 'Mid-season adjustments guide. Evaluate halfway performance and adjust strategy.',
    category: 'guide',
    priority: 0.6,
    changefreq: 'weekly',
    h1: 'Mid-Season Adjustments',
    navGroup: 'Analysis',
    dynamic: true,
  },
]

const CAP_MANAGEMENT_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/salary-cap-management/',
    title: 'Salary Cap Management | Contract Strategy',
    description: 'Cap management guide. Learn multi-year contract planning, dead cap navigation, and cap efficiency.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Salary Cap Management',
    navGroup: 'Strategy',
    dynamic: true,
  },
  {
    slug: '/strategy/rookie-contracts/',
    title: 'Rookie Scale Contracts | Contract Economics',
    description: 'Rookie contract guide. Understand rookie scale economics and extension decisions.',
    category: 'guide',
    priority: 0.6,
    changefreq: 'monthly',
    h1: 'Rookie Contracts',
    navGroup: 'Strategy',
    dynamic: true,
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

// PHASE 5 ADDITIONAL ROUTES (Continuation)

const HEDGE_STRATEGIES_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/hedge-strategies/',
    title: 'Dynasty Hedge Strategies | Portfolio Insurance',
    description: 'Hedge strategies guide. Learn backup planning, age diversification, and risk mitigation tactics.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Hedge Strategies',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const INJURY_CONTINGENCY_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/injury-contingency/',
    title: 'Injury Contingency Planning | Recovery Strategies',
    description: 'Injury contingency guide. Plan backup strategies and injury recovery timelines.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Injury Contingency',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const FREE_AGENT_RANKING_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/free-agent-ranking/',
    title: 'Free Agent Ranking Strategy | Acquisition Guide',
    description: 'Free agent ranking guide. Identify and acquire undervalued free agents.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'weekly',
    h1: 'Free Agent Ranking',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const WAIVER_TIMING_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/waiver-timing/',
    title: 'Waiver Timing Strategy | Priority Management',
    description: 'Waiver timing guide. Master weekly acquisition priority and waiver position strategy.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'weekly',
    h1: 'Waiver Timing',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const BENCH_OPTIMIZATION_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/bench-optimization/',
    title: 'Bench Optimization | Depth Strategy',
    description: 'Bench optimization guide. Maximize bench productivity and roster depth.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Bench Optimization',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const DEPTH_ACQUISITION_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/depth-acquisition/',
    title: 'Depth Acquisition Strategy | Roster Building',
    description: 'Depth acquisition guide. Build sustainable roster depth for contention.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Depth Acquisition',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const HISTORICAL_PERFORMANCE_PAGES: SeoRoute[] = [
  {
    slug: '/analysis/historical-performance/',
    title: 'Historical Dynasty Performance | Trend Analysis',
    description: 'Historical performance analysis. Learn from past player arcs and valuation trends.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Historical Performance',
    navGroup: 'Analysis',
    dynamic: true,
  },
]

const BYE_WEEK_STRATEGY_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/bye-week-strategy/',
    title: 'Bye Week Strategy | Schedule Management',
    description: 'Bye week strategy guide. Navigate NFL bye weeks and schedule planning.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Bye Week Strategy',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const BOOM_BUST_MANAGEMENT_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/boom-bust-management/',
    title: 'Boom-Bust Management | Volatility Strategy',
    description: 'Boom-bust management guide. Manage high-variance players and volatility.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Boom-Bust Management',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const PORTFOLIO_BALANCE_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/portfolio-balance/',
    title: 'Portfolio Balance Strategy | Diversification',
    description: 'Portfolio balance guide. Diversify roster composition and manage asset allocation.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Portfolio Balance',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const CONTRACT_STRUCTURING_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/contract-structuring/',
    title: 'Contract Structuring | Salary Management',
    description: 'Contract structuring guide. Navigate cap implications and contract strategy.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Contract Structuring',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const DEAD_CAP_NAVIGATION_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/dead-cap-navigation/',
    title: 'Dead Cap Navigation | Cap Penalties Strategy',
    description: 'Dead cap guide. Navigate salary cap penalties and dead cap implications.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Dead Cap Navigation',
    navGroup: 'Strategy',
    dynamic: true,
  },
]


const WAIVER_PROJECTIONS_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/waiver-projections/',
    title: 'Waiver Wire Projections | Weekly Pickups',
    description: 'Waiver projections guide. Identify breakout candidates and weekly pickup opportunities.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'weekly',
    h1: 'Waiver Projections',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const BACKUP_RB_STRATEGY_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/backup-rb-strategy/',
    title: 'Backup RB Strategy | Handcuff Value Guide',
    description: 'Backup RB strategy guide. Master handcuff value and backup running back timing.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Backup RB Strategy',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const FLEX_STREAMING_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/flex-streaming-strategy/',
    title: 'Flex Streaming Strategy | Position Flexibility',
    description: 'Flex streaming guide. Maximize position flexibility and weekly roster construction.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'weekly',
    h1: 'Flex Streaming',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const PRESEASON_PLANNING_PAGES: SeoRoute[] = [
  {
    slug: '/analysis/preseason-planning/',
    title: 'Preseason Planning | Dynasty Preparation Guide',
    description: 'Preseason planning guide. Prepare your roster for the upcoming season with strategy and preparation.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'yearly',
    h1: 'Preseason Planning',
    navGroup: 'Analysis',
    dynamic: true,
  },
]

const PLAYOFF_PREPARATION_PAGES: SeoRoute[] = [
  {
    slug: '/analysis/playoff-preparation/',
    title: 'Playoff Preparation Strategy | Championship Timing',
    description: 'Playoff preparation guide. Position your roster for playoff success and championship positioning.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Playoff Preparation',
    navGroup: 'Analysis',
    dynamic: true,
  },
]

const CONTRACT_RENEGOTIATION_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/contract-renegotiation/',
    title: 'Contract Renegotiation & Buyouts | Cap Management',
    description: 'Contract renegotiation guide. Manage player contracts and strategic buyouts for cap flexibility.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Contract Renegotiation',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const CAP_PROJECTIONS_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/cap-projections/',
    title: 'Salary Cap Projections | Multi-Year Planning',
    description: 'Cap projections guide. Forecast cap needs and plan long-term financial strategy.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Cap Projections',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const EXTENSION_TIMING_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/extension-timing/',
    title: 'Extension Timing Strategy | Contract Extensions',
    description: 'Extension timing guide. Master when and how to extend player contracts strategically.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Extension Timing',
    navGroup: 'Strategy',
    dynamic: true,
  },
]

const LUXURY_TAX_PAGES: SeoRoute[] = [
  {
    slug: '/strategy/luxury-tax-management/',
    title: 'Luxury Tax Management | Cap Penalties',
    description: 'Luxury tax guide. Navigate tax thresholds and avoid penalties in cap leagues.',
    category: 'guide',
    priority: 0.65,
    changefreq: 'monthly',
    h1: 'Luxury Tax Management',
    navGroup: 'Strategy',
    dynamic: true,
  },
]
export const SEO_ROUTES: SeoRoute[] = [
  HOME,
  ...TOOLS,
  ...DYNASTY_RANKINGS,
  ...SUPERFLEX_RANKINGS,
  ...TE_PREMIUM_RANKINGS,
  ...PLAYER_DIRECTORIES,
  ...RESEARCH_PAGES,
  RESEARCH_HUB,
  ...RESEARCH_CONTENT_PAGES,
  ...NFL_TEAM_HUBS,
  DYNAMIC_PLAYER_PAGES,
  ...AUTHORITY_HUBS,
  ...STRATEGY_PAGES,
  ...TRUST_PAGES,
  ...GUIDES,
  ...LEAGUE_SETUP_PAGES,
  ...DRAFT_STRATEGY_PAGES,
  ...TRADE_SCENARIO_PAGES,
  ...REBUILD_PAGES,
  ...ADVANCED_FORMAT_PAGES,
  ...PLAYER_ANALYSIS_PAGES,
  ...ANALYTICS_PAGES,
  ...RISK_MANAGEMENT_PAGES,
  ...WAIVER_STRATEGY_PAGES,
  ...SEASONAL_TIMING_PAGES,
  ...CAP_MANAGEMENT_PAGES,
  ...HEDGE_STRATEGIES_PAGES,
  ...INJURY_CONTINGENCY_PAGES,
  ...FREE_AGENT_RANKING_PAGES,
  ...WAIVER_TIMING_PAGES,
  ...BENCH_OPTIMIZATION_PAGES,
  ...DEPTH_ACQUISITION_PAGES,
  ...HISTORICAL_PERFORMANCE_PAGES,
  ...BYE_WEEK_STRATEGY_PAGES,
  ...BOOM_BUST_MANAGEMENT_PAGES,
  ...PORTFOLIO_BALANCE_PAGES,
  ...CONTRACT_STRUCTURING_PAGES,
  ...DEAD_CAP_NAVIGATION_PAGES,
  ...WAIVER_PROJECTIONS_PAGES,
  ...BACKUP_RB_STRATEGY_PAGES,
  ...FLEX_STREAMING_PAGES,
  ...PRESEASON_PLANNING_PAGES,
  ...PLAYOFF_PREPARATION_PAGES,
  ...CONTRACT_RENEGOTIATION_PAGES,
  ...CAP_PROJECTIONS_PAGES,
  ...EXTENSION_TIMING_PAGES,
  ...LUXURY_TAX_PAGES,
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
