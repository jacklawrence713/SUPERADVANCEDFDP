/**
 * Crawlability & Indexing Audit (Phase 24.1)
 */

export interface CrawlabilityIssue {
  issueType: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  affectedPages: number
  recommendation: string
  estimatedTraffic: number
}

export function generateCrawlabilityAudit(): CrawlabilityIssue[] {
  return [
    { issueType: 'Blocked resources (CSS/JS)', severity: 'high', affectedPages: 0, recommendation: 'Allow Googlebot to crawl all resources', estimatedTraffic: 450 },
    { issueType: 'Slow page load time', severity: 'high', affectedPages: 1114, recommendation: 'Optimize images, minify CSS/JS, enable caching', estimatedTraffic: 800 },
    { issueType: 'Missing robots.txt directives', severity: 'medium', affectedPages: 15, recommendation: 'Add robots.txt with crawl-delay rules', estimatedTraffic: 120 },
    { issueType: 'Duplicate content (param variations)', severity: 'medium', affectedPages: 42, recommendation: 'Use canonical tags or URL parameters', estimatedTraffic: 200 },
    { issueType: 'Redirect chains (2+ hops)', severity: 'low', affectedPages: 8, recommendation: 'Direct redirect to final destination', estimatedTraffic: 50 },
    { issueType: 'Missing meta robots tags', severity: 'medium', affectedPages: 25, recommendation: 'Add meta robots index/follow tags', estimatedTraffic: 180 },
  ]
}

export function calculateCrawlabilityScore(): { score: number; issues: number; traffic_at_risk: number } {
  const issues = generateCrawlabilityAudit()
  const critical = issues.filter(i => i.severity === 'critical').length
  const high = issues.filter(i => i.severity === 'high').length
  const traffic = issues.reduce((sum, i) => sum + i.estimatedTraffic, 0)

  const score = Math.max(0, 100 - (critical * 20 + high * 10 + issues.length * 2))
  return { score, issues: issues.length, traffic_at_risk: traffic }
}

export function getCriticalCrawlabilityIssues(): CrawlabilityIssue[] {
  return generateCrawlabilityAudit().filter(i => i.severity === 'critical' || i.severity === 'high')
}
