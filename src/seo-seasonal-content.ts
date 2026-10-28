/**
 * Seasonal Content Calendar & Search Patterns (Phase 21.1)
 *
 * Maps fantasy football search trends by season
 */

export interface SeasonalPeriod {
  season: string
  months: string[]
  searchVolume: number
  topKeywords: string[]
  contentType: string
  peakSearches: Array<{ keyword: string; volume: number }>
  recommendedContentFocus: string[]
}

/**
 * Generate seasonal content calendar for fantasy football
 */
export function generateSeasonalContentCalendar(): SeasonalPeriod[] {
  return [
    {
      season: 'Offseason (January-March)',
      months: ['January', 'February', 'March'],
      searchVolume: 12400,
      topKeywords: ['dynasty rankings', 'dynasty strategy', 'trade value', 'rookie evaluation'],
      contentType: 'Strategy Guides, Rankings Updates, Valuation Tools',
      peakSearches: [
        { keyword: 'dynasty rankings 2026', volume: 4200 },
        { keyword: 'rookie evaluation criteria', volume: 2800 },
        { keyword: 'dynasty trade value calculator', volume: 2100 },
        { keyword: 'offseason dynasty strategy', volume: 1800 },
        { keyword: 'dynasty buy low candidates', volume: 1500 },
      ],
      recommendedContentFocus: [
        'Update rankings with offseason moves',
        'Publish rookie evaluation guides',
        'Create trade value recalculation posts',
        'Generate buy-low opportunity analysis',
        'Prepare draft guides',
      ],
    },
    {
      season: 'Draft Season (April-June)',
      months: ['April', 'May', 'June'],
      searchVolume: 18900,
      topKeywords: ['rookie draft strategy', 'draft picks', 'rookie rankings', 'draft preparation'],
      contentType: 'Draft Guides, Rookie Content, Preparation Resources',
      peakSearches: [
        { keyword: 'dynasty rookie draft strategy', volume: 5400 },
        { keyword: 'best rookie picks 2026', volume: 3200 },
        { keyword: 'draft preparation checklist', volume: 2100 },
        { keyword: 'rookie tier list', volume: 1900 },
        { keyword: 'draft day tips and strategy', volume: 1600 },
      ],
      recommendedContentFocus: [
        'Create comprehensive draft guides',
        'Publish rookie tier rankings',
        'Generate draft strategy videos/tutorials',
        'Release draft preparation checklists',
        'Update rookie analysis with new data',
      ],
    },
    {
      season: 'Regular Season (July-November)',
      months: ['July', 'August', 'September', 'October', 'November'],
      searchVolume: 24100,
      topKeywords: ['trade analysis', 'sell-high candidates', 'player updates', 'weekly strategy'],
      contentType: 'Weekly Updates, Trade Analysis, Performance Tracking',
      peakSearches: [
        { keyword: 'dynasty sell high candidates', volume: 4800 },
        { keyword: 'dynasty trade deadline', volume: 3200 },
        { keyword: 'week X waiver wire dynasty', volume: 2900 },
        { keyword: 'buy low injured players', volume: 2100 },
        { keyword: 'dynasty trade analysis this week', volume: 1800 },
      ],
      recommendedContentFocus: [
        'Weekly trade analysis and recommendations',
        'Monitor and update player values',
        'Create sell-high opportunity posts',
        'Cover trade deadline strategy',
        'Publish waiver wire articles',
        'Track injury impacts on value',
      ],
    },
    {
      season: 'Playoff Season (December)',
      months: ['December'],
      searchVolume: 9800,
      topKeywords: ['playoff strategy', 'championship preparation', 'final trades', 'contention window'],
      contentType: 'Playoff Guides, Championship Strategy, Evaluation',
      peakSearches: [
        { keyword: 'dynasty playoff strategy', volume: 3100 },
        { keyword: 'championship contention window', volume: 2200 },
        { keyword: 'final dynasty trades', volume: 1600 },
        { keyword: 'playoff team evaluation', volume: 1300 },
        { keyword: 'rebuild vs contention decision', volume: 900 },
      ],
      recommendedContentFocus: [
        'Create playoff strategy guides',
        'Analyze contention windows',
        'Evaluate trade deadline decisions',
        'Generate year-end rankings',
        'Plan for next season based on results',
      ],
    },
  ]
}

/**
 * Get seasonal content for specific month
 */
export function getSeasonalContentForMonth(month: string): SeasonalPeriod | undefined {
  const calendar = generateSeasonalContentCalendar()
  return calendar.find((period) => period.months.some((m) => m.toLowerCase().includes(month.toLowerCase())))
}

/**
 * Generate content update timeline
 */
export function generateContentUpdateTimeline(): Array<{ date: string; action: string; priority: string; estimatedTraffic: number }> {
  return [
    {
      date: 'January 1-15',
      action: 'Update dynasty rankings with offseason FA signings',
      priority: 'High',
      estimatedTraffic: 2800,
    },
    {
      date: 'January 16-31',
      action: 'Publish comprehensive rookie evaluation framework',
      priority: 'High',
      estimatedTraffic: 3200,
    },
    {
      date: 'February',
      action: 'Create offseason dynasty strategy guides',
      priority: 'High',
      estimatedTraffic: 2400,
    },
    {
      date: 'March',
      action: 'Finalize trade value calculations for new season',
      priority: 'Medium',
      estimatedTraffic: 1800,
    },
    {
      date: 'April 1-15',
      action: 'Launch comprehensive draft preparation content',
      priority: 'Critical',
      estimatedTraffic: 4200,
    },
    {
      date: 'April 16-30',
      action: 'Publish draft day strategies and tactics',
      priority: 'Critical',
      estimatedTraffic: 3800,
    },
    {
      date: 'May-June (Weekly)',
      action: 'Update rookie analysis with latest information',
      priority: 'High',
      estimatedTraffic: 2200,
    },
    {
      date: 'July-November (Bi-Weekly)',
      action: 'Publish trade analysis and player value updates',
      priority: 'High',
      estimatedTraffic: 2500,
    },
    {
      date: 'December 1-15',
      action: 'Create playoff strategy guides and analysis',
      priority: 'High',
      estimatedTraffic: 2100,
    },
    {
      date: 'December 16-31',
      action: 'Generate year-end rankings and next season prep',
      priority: 'Medium',
      estimatedTraffic: 1600,
    },
  ]
}

/**
 * Calculate expected seasonal traffic boost
 */
export function getSeasonalTrafficPotential(season: string): number {
  const calendar = generateSeasonalContentCalendar()
  const period = calendar.find((p) => p.season.includes(season))
  return period?.searchVolume || 0
}
