/**
 * Link Velocity & Growth Metrics (Phase 22.6)
 *
 * Tracks link growth velocity and generates performance metrics
 */

export interface LinkVelocityMetrics {
  period: string
  linksAcquired: number
  newReferringDomains: number
  averageDomainAuthority: number
  totalDomainAuthority: number
  referralTraffic: number
  growthRate: number
  sustainability: 'low' | 'moderate' | 'high'
}

export interface LinkHealthScore {
  metric: string
  current: number
  target: number
  status: 'on-track' | 'at-risk' | 'exceeding'
  trend: 'up' | 'down' | 'stable'
}

/**
 * Generate projected link velocity metrics
 */
export function generateLinkVelocityMetrics(): LinkVelocityMetrics[] {
  return [
    {
      period: 'Month 1-3 (Q1 2027)',
      linksAcquired: 8,
      newReferringDomains: 7,
      averageDomainAuthority: 58,
      totalDomainAuthority: 410,
      referralTraffic: 1200,
      growthRate: 100,
      sustainability: 'moderate',
    },
    {
      period: 'Month 4-6 (Q2 2027)',
      linksAcquired: 12,
      newReferringDomains: 11,
      averageDomainAuthority: 64,
      totalDomainAuthority: 705,
      referralTraffic: 2400,
      growthRate: 72,
      sustainability: 'high',
    },
    {
      period: 'Month 7-9 (Q3 2027)',
      linksAcquired: 9,
      newReferringDomains: 8,
      averageDomainAuthority: 72,
      totalDomainAuthority: 648,
      referralTraffic: 2800,
      growthRate: 58,
      sustainability: 'high',
    },
    {
      period: 'Month 10-12 (Q4 2027)',
      linksAcquired: 15,
      newReferringDomains: 13,
      averageDomainAuthority: 66,
      totalDomainAuthority: 862,
      referralTraffic: 3600,
      growthRate: 44,
      sustainability: 'high',
    },
  ]
}

/**
 * Generate link health scorecard
 */
export function generateLinkHealthScorecard(): LinkHealthScore[] {
  return [
    {
      metric: 'Total Referring Domains',
      current: 0,
      target: 40,
      status: 'on-track',
      trend: 'up',
    },
    {
      metric: 'Average Link Quality (DA)',
      current: 0,
      target: 65,
      status: 'on-track',
      trend: 'up',
    },
    {
      metric: 'Monthly Link Velocity',
      current: 0,
      target: 3,
      status: 'on-track',
      trend: 'up',
    },
    {
      metric: 'Organic Traffic from Links',
      current: 0,
      target: 10000,
      status: 'at-risk',
      trend: 'stable',
    },
    {
      metric: 'Domain Authority (site)',
      current: 45,
      target: 65,
      status: 'at-risk',
      trend: 'up',
    },
    {
      metric: 'Link Diversity Ratio',
      current: 78,
      target: 85,
      status: 'on-track',
      trend: 'up',
    },
  ]
}

/**
 * Calculate link velocity acceleration
 */
export function calculateVelocityAcceleration(): { startingPace: number; endingPace: number; acceleration: number; monthsToTarget: number } {
  const metrics = generateLinkVelocityMetrics()
  const startingPace = metrics[0].linksAcquired / 3 // Links per month
  const endingPace = metrics[metrics.length - 1].linksAcquired / 3

  const acceleration = ((endingPace - startingPace) / startingPace) * 100
  const monthsToTarget = Math.ceil(40 / (endingPace / 1.5)) // Assuming growth continues

  return { startingPace: Math.round(startingPace * 100) / 100, endingPace: Math.round(endingPace * 100) / 100, acceleration, monthsToTarget }
}

/**
 * Generate link monitoring KPIs
 */
export function generateMonitoringKPIs(): Array<{ kpi: string; baseline: number; month3: number; month6: number; month12: number }> {
  const metrics = generateLinkVelocityMetrics()
  const totalLinks = metrics.reduce((sum, m) => sum + m.linksAcquired, 0)
  const avgDA = metrics.reduce((sum, m) => sum + m.averageDomainAuthority, 0) / metrics.length

  return [
    {
      kpi: 'Total Backlinks',
      baseline: 120,
      month3: 128,
      month6: 140,
      month12: 155,
    },
    {
      kpi: 'Referring Domains',
      baseline: 25,
      month3: 32,
      month6: 43,
      month12: 56,
    },
    {
      kpi: 'Avg Domain Authority',
      baseline: 52,
      month3: 58,
      month6: 64,
      month12: 66,
    },
    {
      kpi: 'Monthly Link Velocity',
      baseline: 2,
      month3: 2.7,
      month6: 4,
      month12: 5,
    },
    {
      kpi: 'Referral Traffic',
      baseline: 200,
      month3: 1400,
      month6: 3800,
      month12: 10000,
    },
  ]
}

/**
 * Identify link health risks
 */
export function identifyLinkHealthRisks(): Array<{ risk: string; severity: 'high' | 'medium' | 'low'; mitigation: string }> {
  return [
    {
      risk: 'Anchor text over-optimization (60%+ keyword anchors)',
      severity: 'high',
      mitigation: 'Maintain natural anchor text distribution (40-50% keyword, 30-40% brand, 10-20% generic)',
    },
    {
      risk: 'Link velocity spike (unnatural growth pattern)',
      severity: 'high',
      mitigation: 'Spread link acquisition evenly; avoid sudden spikes from automated tools',
    },
    {
      risk: 'Low-quality link sources (DA < 30)',
      severity: 'medium',
      mitigation: 'Filter opportunities; focus on DA 50+ sources; avoid link farms and directories',
    },
    {
      risk: 'Slow backlink growth (< 1 link/month)',
      severity: 'medium',
      mitigation: 'Increase outreach frequency; create more linkable assets; expand outreach channels',
    },
    {
      risk: 'Link relevance mismatch (links from unrelated topics)',
      severity: 'medium',
      mitigation: 'Focus on fantasy football niche sources; ensure contextual relevance',
    },
  ]
}
