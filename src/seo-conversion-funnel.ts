/**
 * Conversion Funnel Mapping & Analysis (Phase 23.2)
 *
 * Defines conversion funnels for key user paths and revenue drivers
 */

export interface FunnelStep {
  stepNumber: number
  name: string
  url: string
  expectedUsers: number
  conversionRate: number
}

export interface ConversionFunnel {
  funnelName: string
  funnelType: 'tool-usage' | 'content-consumption' | 'information-gathering' | 'decision-making'
  steps: FunnelStep[]
  entryPoint: string
  exitPoint: string
  totalDropoff: number
  estimatedMonthlyCompletions: number
  revenue: number
  priority: 'high' | 'medium' | 'low'
}

/**
 * Generate key conversion funnels
 */
export function generateConversionFunnels(): ConversionFunnel[] {
  return [
    {
      funnelName: 'Trade Calculator Completion Funnel',
      funnelType: 'tool-usage',
      steps: [
        { stepNumber: 1, name: 'Landing on Calculator', url: '/dynasty-trade-calculator/', expectedUsers: 2400, conversionRate: 100 },
        { stepNumber: 2, name: 'Entering Player Data', url: '/dynasty-trade-calculator/', expectedUsers: 1680, conversionRate: 70 },
        { stepNumber: 3, name: 'Clicking Calculate', url: '/dynasty-trade-calculator/', expectedUsers: 1344, conversionRate: 80 },
        { stepNumber: 4, name: 'Viewing Results', url: '/dynasty-trade-calculator/', expectedUsers: 1209, conversionRate: 90 },
      ],
      entryPoint: '/dynasty-trade-calculator/',
      exitPoint: '/dynasty-trade-calculator/',
      totalDropoff: 50,
      estimatedMonthlyCompletions: 1209,
      revenue: 15,
      priority: 'high',
    },
    {
      funnelName: 'Guide-to-Tool Conversion Funnel',
      funnelType: 'decision-making',
      steps: [
        { stepNumber: 1, name: 'View Guide', url: '/guides/how-to-value-a-dynasty-trade/', expectedUsers: 1600, conversionRate: 100 },
        { stepNumber: 2, name: 'Read Guide Content', url: '/guides/how-to-value-a-dynasty-trade/', expectedUsers: 1280, conversionRate: 80 },
        { stepNumber: 3, name: 'Click Calculator Link', url: '/guides/how-to-value-a-dynasty-trade/', expectedUsers: 512, conversionRate: 40 },
        { stepNumber: 4, name: 'Use Calculator Tool', url: '/dynasty-trade-calculator/', expectedUsers: 410, conversionRate: 80 },
      ],
      entryPoint: '/guides/how-to-value-a-dynasty-trade/',
      exitPoint: '/dynasty-trade-calculator/',
      totalDropoff: 74,
      estimatedMonthlyCompletions: 410,
      revenue: 20,
      priority: 'high',
    },
    {
      funnelName: 'Rankings-to-Player-Page Funnel',
      funnelType: 'information-gathering',
      steps: [
        { stepNumber: 1, name: 'View Rankings Page', url: '/rankings/qb/', expectedUsers: 4200, conversionRate: 100 },
        { stepNumber: 2, name: 'Scroll through Rankings', url: '/rankings/qb/', expectedUsers: 3360, conversionRate: 80 },
        { stepNumber: 3, name: 'Click Player Link', url: '/rankings/qb/', expectedUsers: 1680, conversionRate: 50 },
        { stepNumber: 4, name: 'View Player Details', url: '/players/*', expectedUsers: 1512, conversionRate: 90 },
      ],
      entryPoint: '/rankings/qb/',
      exitPoint: '/players/*',
      totalDropoff: 64,
      estimatedMonthlyCompletions: 1512,
      revenue: 5,
      priority: 'high',
    },
    {
      funnelName: 'Strategy Learning Funnel',
      funnelType: 'content-consumption',
      steps: [
        { stepNumber: 1, name: 'Land on Guide Hub', url: '/guides/', expectedUsers: 2200, conversionRate: 100 },
        { stepNumber: 2, name: 'Select Strategy Guide', url: '/guides/', expectedUsers: 1540, conversionRate: 70 },
        { stepNumber: 3, name: 'Read Full Guide', url: '/guides/*', expectedUsers: 1232, conversionRate: 80 },
        { stepNumber: 4, name: 'Engage with Resources', url: '/guides/*', expectedUsers: 738, conversionRate: 60 },
      ],
      entryPoint: '/guides/',
      exitPoint: '/guides/*',
      totalDropoff: 66,
      estimatedMonthlyCompletions: 738,
      revenue: 8,
      priority: 'medium',
    },
  ]
}

/**
 * Calculate funnel effectiveness
 */
export function calculateFunnelMetrics(funnel: ConversionFunnel): {
  overallConversionRate: number
  stepDropoffs: number[]
  avgStepConversionRate: number
} {
  const overallConversionRate = (funnel.estimatedMonthlyCompletions / funnel.steps[0].expectedUsers) * 100
  const stepDropoffs = funnel.steps.map((step, idx) => {
    if (idx === 0) return 0
    return 100 - (step.expectedUsers / funnel.steps[0].expectedUsers) * 100
  })
  const avgStepConversionRate = funnel.steps.reduce((sum, s) => sum + s.conversionRate, 0) / funnel.steps.length

  return { overallConversionRate: Math.round(overallConversionRate * 100) / 100, stepDropoffs, avgStepConversionRate }
}

/**
 * Get high-priority funnels
 */
export function getHighPriorityFunnels(): ConversionFunnel[] {
  return generateConversionFunnels().filter((f) => f.priority === 'high')
}

/**
 * Calculate total funnel revenue potential
 */
export function calculateFunnelRevenuePercentage(funnels: ConversionFunnel[]): Array<{ funnel: string; completions: number; revenue: number; percentage: number }> {
  const totalCompletions = funnels.reduce((sum, f) => sum + f.estimatedMonthlyCompletions, 0)
  const totalRevenue = funnels.reduce((sum, f) => sum + f.estimatedMonthlyCompletions * f.revenue, 0)

  return funnels.map((f) => ({
    funnel: f.funnelName,
    completions: f.estimatedMonthlyCompletions,
    revenue: f.estimatedMonthlyCompletions * f.revenue,
    percentage: Math.round((f.estimatedMonthlyCompletions / totalCompletions) * 100),
  }))
}

/**
 * Identify funnel optimization opportunities
 */
export function identifyOptimizationOpportunities(): Array<{ funnel: string; issue: string; impact: string; recommendation: string }> {
  const funnels = generateConversionFunnels()

  return funnels.slice(0, 3).map((f) => {
    const metrics = calculateFunnelMetrics(f)
    const worstStep = f.steps.reduce((min, step, idx) => (step.conversionRate < f.steps[min].conversionRate ? idx : min), 0)

    return {
      funnel: f.funnelName,
      issue: `Step ${worstStep + 1} has lowest conversion (${f.steps[worstStep].conversionRate}%)`,
      impact: `Could gain ~${Math.round((f.estimatedMonthlyCompletions * (1 - f.steps[worstStep].conversionRate / 100)) / 2)} additional completions`,
      recommendation: `Optimize "${f.steps[worstStep].name}" with UX improvements, clearer CTAs, or reduced friction`,
    }
  })
}
