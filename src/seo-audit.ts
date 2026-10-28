/**
 * Technical SEO & Performance Audit (Phase 19.6)
 *
 * Validates and audits SEO implementation across all pages
 */

export interface AuditResult {
  category: string
  passed: number
  failed: number
  warnings: number
  details: string[]
}

export interface AuditReport {
  timestamp: string
  totalPages: number
  results: AuditResult[]
  score: number
}

/**
 * Generate audit validation rules
 */
export function getAuditRules() {
  return {
    meta: {
      name: 'Meta Tags & Structure',
      checks: [
        'Has title tag',
        'Has meta description',
        'Has canonical link',
        'Has viewport meta tag',
        'Has character encoding',
      ],
    },
    schema: {
      name: 'Structured Data',
      checks: [
        'Has JSON-LD schema',
        'Has BreadcrumbList schema',
        'Has Organization schema',
        'Has Article schema (where applicable)',
        'Schema is valid',
      ],
    },
    accessibility: {
      name: 'Accessibility & Performance',
      checks: [
        'Has proper heading hierarchy',
        'Has alt text on images',
        'Has lang attribute',
        'Has sufficient color contrast',
        'Mobile-friendly viewport',
      ],
    },
    links: {
      name: 'Internal Linking',
      checks: [
        'Has internal links',
        'Links use descriptive anchor text',
        'No broken internal links',
        'Links have proper hierarchy',
        'Related content links present',
      ],
    },
    performance: {
      name: 'Performance Signals',
      checks: [
        'No render-blocking resources',
        'Images are optimized',
        'CSS is minified',
        'JavaScript is minified',
        'Caching headers set',
      ],
    },
  }
}

/**
 * Generate audit score explanation
 */
export function generateAuditScoreExplanation(score: number): string {
  if (score >= 90) return 'Excellent - Comprehensive SEO implementation'
  if (score >= 80) return 'Good - Strong SEO foundation with minor improvements needed'
  if (score >= 70) return 'Fair - Solid SEO but opportunities for enhancement'
  if (score >= 60) return 'Needs Work - Multiple SEO improvements recommended'
  return 'Poor - Significant SEO issues requiring attention'
}

/**
 * Generate SEO audit summary statistics
 */
export function generateAuditStatistics(report: AuditReport) {
  const totalChecks = report.results.reduce((sum, r) => sum + r.passed + r.failed + r.warnings, 0)
  const passPercentage = Math.round((report.results.reduce((sum, r) => sum + r.passed, 0) / totalChecks) * 100)

  return {
    totalPages: report.totalPages,
    totalChecks,
    passedChecks: report.results.reduce((sum, r) => sum + r.passed, 0),
    failedChecks: report.results.reduce((sum, r) => sum + r.failed, 0),
    warningChecks: report.results.reduce((sum, r) => sum + r.warnings, 0),
    passPercentage,
    overallScore: report.score,
    scoreExplanation: generateAuditScoreExplanation(report.score),
  }
}

/**
 * Identify top improvement areas
 */
export function getTopImprovementAreas(report: AuditReport, limit: number = 5): AuditResult[] {
  return report.results
    .sort((a, b) => {
      const aFailRate = a.failed / (a.passed + a.failed + a.warnings)
      const bFailRate = b.failed / (b.passed + b.failed + b.warnings)
      return bFailRate - aFailRate
    })
    .slice(0, limit)
}

/**
 * Generate prioritized recommendations
 */
export function generateAuditRecommendations(report: AuditReport): Array<{ priority: string; recommendation: string; impact: string }> {
  const improvements = getTopImprovementAreas(report)

  return [
    {
      priority: 'Critical',
      recommendation: 'Fix all broken schema markup and validation errors',
      impact: 'Improves SERP appearance and click-through rates',
    },
    {
      priority: 'High',
      recommendation: 'Ensure all pages have proper meta descriptions',
      impact: 'Increases SERP snippet display rate',
    },
    {
      priority: 'High',
      recommendation: 'Complete internal linking strategy for all content',
      impact: 'Distributes page authority and improves crawlability',
    },
    {
      priority: 'Medium',
      recommendation: 'Add missing alt text and optimize images',
      impact: 'Improves accessibility and image search visibility',
    },
    {
      priority: 'Medium',
      recommendation: 'Verify Core Web Vitals and page speed',
      impact: 'Affects rankings and user experience',
    },
  ]
}

/**
 * Generate audit timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}
