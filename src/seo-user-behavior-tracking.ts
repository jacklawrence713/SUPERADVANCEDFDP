/**
 * Heat Map & User Behavior Analysis (Phase 23.4)
 *
 * Defines user behavior tracking points and heatmap analysis
 */

export interface HeatmapZone {
  zoneName: string
  pageSection: string
  expectedClickRate: number
  currentPerformance: number
  bounceImpact: number
  optimizationPotential: number
}

export interface UserBehaviorMetric {
  metric: string
  description: string
  benchmark: number
  current: number
  target: number
  importance: 'high' | 'medium' | 'low'
}

/**
 * Generate heatmap zones for key pages
 */
export function generateHeatmapZones(): HeatmapZone[] {
  return [
    {
      zoneName: 'Above-the-Fold CTA (Calculator)',
      pageSection: 'top-section',
      expectedClickRate: 45,
      currentPerformance: 35,
      bounceImpact: -10,
      optimizationPotential: 15,
    },
    {
      zoneName: 'Primary Tool Input Area',
      pageSection: 'main-content',
      expectedClickRate: 70,
      currentPerformance: 58,
      bounceImpact: -12,
      optimizationPotential: 20,
    },
    {
      zoneName: 'Calculate Button',
      pageSection: 'action-button',
      expectedClickRate: 85,
      currentPerformance: 72,
      bounceImpact: -15,
      optimizationPotential: 18,
    },
    {
      zoneName: 'Results Display Area',
      pageSection: 'results',
      expectedClickRate: 90,
      currentPerformance: 88,
      bounceImpact: -2,
      optimizationPotential: 4,
    },
    {
      zoneName: 'Related Resources Links',
      pageSection: 'sidebar',
      expectedClickRate: 25,
      currentPerformance: 12,
      bounceImpact: -8,
      optimizationPotential: 22,
    },
    {
      zoneName: 'Guide Headline (CTA)',
      pageSection: 'header',
      expectedClickRate: 30,
      currentPerformance: 22,
      bounceImpact: -8,
      optimizationPotential: 12,
    },
  ]
}

/**
 * Generate user behavior metrics
 */
export function generateUserBehaviorMetrics(): UserBehaviorMetric[] {
  return [
    {
      metric: 'Scroll Depth (50%)',
      description: 'Percentage of users scrolling to 50% of page',
      benchmark: 75,
      current: 62,
      target: 80,
      importance: 'high',
    },
    {
      metric: 'Click-Through Rate (Primary CTA)',
      description: 'CTR on primary call-to-action button',
      benchmark: 12,
      current: 8,
      target: 15,
      importance: 'high',
    },
    {
      metric: 'Time on Page',
      description: 'Average seconds spent on page',
      benchmark: 180,
      current: 145,
      target: 200,
      importance: 'high',
    },
    {
      metric: 'Bounce Rate',
      description: 'Percentage of sessions with no interaction',
      benchmark: 35,
      current: 42,
      target: 28,
      importance: 'high',
    },
    {
      metric: 'Return Visitor Rate',
      description: 'Percentage of returning users',
      benchmark: 40,
      current: 35,
      target: 45,
      importance: 'medium',
    },
    {
      metric: 'Form Completion Rate',
      description: 'Percentage completing tool inputs',
      benchmark: 65,
      current: 58,
      target: 75,
      importance: 'high',
    },
  ]
}

/**
 * Identify high-friction zones
 */
export function identifyHighFrictionZones(): Array<{ zone: string; friction: number; impact: string; recommendation: string }> {
  const zones = generateHeatmapZones()

  return zones
    .filter((z) => z.currentPerformance < z.expectedClickRate - 5)
    .sort((a, b) => b.optimizationPotential - a.optimizationPotential)
    .map((z) => ({
      zone: z.zoneName,
      friction: Math.round(z.expectedClickRate - z.currentPerformance),
      impact: `Could recover ${z.optimizationPotential}% click potential`,
      recommendation: `Improve ${z.pageSection} with better UX, clearer messaging, or visual hierarchy`,
    }))
}

/**
 * Calculate behavior-based conversion lift
 */
export function calculateConversionLift(): Array<{ improvement: string; current: number; potential: number; lift_percentage: number }> {
  return [
    { improvement: 'Reduce bounce rate to 28%', current: 42, potential: 28, lift_percentage: 33 },
    { improvement: 'Increase scroll depth to 80%', current: 62, potential: 80, lift_percentage: 29 },
    { improvement: 'Improve primary CTA CTR to 15%', current: 8, potential: 15, lift_percentage: 88 },
    { improvement: 'Increase time on page by 25%', current: 145, potential: 200, lift_percentage: 38 },
  ]
}

/**
 * Generate behavior optimization checklist
 */
export function generateBehaviorOptimizations(): Array<{ optimization: string; difficulty: string; impact: string; effort_hours: number }> {
  return [
    {
      optimization: 'Improve above-fold CTA visibility and prominence',
      difficulty: 'Easy',
      impact: '+12% CTA clicks',
      effort_hours: 4,
    },
    {
      optimization: 'Simplify form inputs and add inline help',
      difficulty: 'Medium',
      impact: '+18% form completions',
      effort_hours: 12,
    },
    {
      optimization: 'Add progress indicators to multi-step processes',
      difficulty: 'Medium',
      impact: '+15% completion rate',
      effort_hours: 8,
    },
    {
      optimization: 'Optimize page load speed (target <2s)',
      difficulty: 'Hard',
      impact: '-8% bounce rate',
      effort_hours: 24,
    },
    {
      optimization: 'Add exit-intent offers to reduce bounce',
      difficulty: 'Easy',
      impact: '+5% re-engagement',
      effort_hours: 3,
    },
  ]
}
