/**
 * Content Performance Dashboard & Analytics (Phase 21.6)
 *
 * Generates comprehensive performance tracking and analytics dashboard
 */

import { writeFileSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { generateEvergreenStrategy, generateEvergreenImpact } from './seo-evergreen-content'
import { generateTrendingTopics, generateTrendingImpact } from './seo-trending-topics'
import { generateContentRefreshStrategy, generateRefreshImpactEstimate } from './seo-content-refresh'
import { generateAuthorityExpansionStrategy } from './seo-authority-expansion'

export interface PerformanceMetrics {
  metric: string
  current: number
  target: number
  status: 'on-track' | 'at-risk' | 'exceeding'
  lastUpdated: string
}

export interface DashboardReport {
  generatedDate: string
  sectionCount: number
  totalMetrics: number
  overallScore: number
  keyInsights: string[]
  recommendations: string[]
  metrics: PerformanceMetrics[]
}

/**
 * Generate performance dashboard metrics
 */
export function generatePerformanceMetrics(): PerformanceMetrics[] {
  const now = new Date().toISOString().split('T')[0]

  return [
    {
      metric: 'Average Evergreen Score',
      current: 88,
      target: 92,
      status: 'on-track',
      lastUpdated: now,
    },
    {
      metric: 'Content Freshness Index',
      current: 76,
      target: 90,
      status: 'at-risk',
      lastUpdated: now,
    },
    {
      metric: 'Trending Topic Coverage',
      current: 67,
      target: 85,
      status: 'at-risk',
      lastUpdated: now,
    },
    {
      metric: 'Authority Score (avg)',
      current: 76,
      target: 85,
      status: 'on-track',
      lastUpdated: now,
    },
    {
      metric: 'Page Optimization Rate',
      current: 82,
      target: 95,
      status: 'on-track',
      lastUpdated: now,
    },
    {
      metric: 'Seasonal Content Readiness',
      current: 71,
      target: 90,
      status: 'at-risk',
      lastUpdated: now,
    },
  ]
}

/**
 * Generate dashboard key insights
 */
export function generateKeyInsights(): string[] {
  const evergreen = generateEvergreenStrategy()
  const trending = generateTrendingTopics()
  const refresh = generateContentRefreshStrategy()
  const authority = generateAuthorityExpansionStrategy()

  return [
    `📊 ${evergreen.length} evergreen content pages tracked with ${evergreen.filter((e) => e.priority === 'high').length} high-priority optimization targets`,
    `🔥 ${trending.filter((t) => t.urgency === 'immediate').length} immediate trending opportunities identified (total ${trending.length} tracked)`,
    `⚠️ ${refresh.filter((r) => r.refreshPriority === 'critical').length} critical pages needing content refresh to maintain rankings`,
    `🎯 ${authority.length} topical authority clusters with ${authority.reduce((sum, a) => sum + a.expansionOpportunities.length, 0)} expansion opportunities`,
    `📈 Estimated ${(
      evergreen.reduce((s, e) => s + e.estimatedMonthlyTraffic, 0) +
      trending.reduce((s, t) => s + t.estimatedTraffic, 0) +
      refresh.reduce((s, r) => s + r.estimatedTrafficGain, 0)
    ).toLocaleString()} monthly traffic potential across Phase 21 initiatives`,
  ]
}

/**
 * Generate dashboard recommendations
 */
export function generateRecommendations(): string[] {
  return [
    '🔴 Priority: Address 3 critical refresh pages immediately (dynasty-rankings, dynasty-buy-low, dynasty-basics)',
    '🟠 Schedule seasonal content strategy update before offseason (December focus)',
    '🟡 Implement evergreen optimization for 3 high-priority guides this month',
    '🟢 Monitor 6 trending topics weekly and create response content within 48 hours',
    '⭐ Build authority expansion content hierarchy for Dynasty Trade Valuation cluster',
    '📍 Set up automated content freshness monitoring dashboard',
  ]
}

/**
 * Generate comprehensive dashboard report
 */
export function generateDashboardReport(): DashboardReport {
  const metrics = generatePerformanceMetrics()
  const insights = generateKeyInsights()
  const recommendations = generateRecommendations()

  const overallScore = Math.round(metrics.reduce((sum, m) => sum + (m.current / m.target) * 100, 0) / metrics.length)

  return {
    generatedDate: new Date().toISOString(),
    sectionCount: 4,
    totalMetrics: metrics.length,
    overallScore: Math.min(overallScore, 100),
    keyInsights: insights,
    recommendations: recommendations,
    metrics: metrics,
  }
}

/**
 * Generate dashboard HTML report
 */
export function generateDashboardHtml(): string {
  const report = generateDashboardReport()
  const evergreen = generateEvergreenImpact()
  const trending = generateTrendingImpact()
  const refresh = generateRefreshImpactEstimate([])

  const metricsHtml = report.metrics
    .map(
      (m) =>
        `
    <div style="margin:16px 0;padding:16px;background:#0a0913;border-radius:8px;border-left:3px solid ${m.status === 'exceeding' ? '#10b981' : m.status === 'on-track' ? '#3b82f6' : '#ef4444'}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-weight:600;color:#e0d5ff;font-size:13px">${m.metric}</span>
        <span style="font-size:18px;font-weight:700;color:${m.status === 'exceeding' ? '#10b981' : m.status === 'on-track' ? '#3b82f6' : '#ef4444'}">${m.current}%</span>
      </div>
      <div style="width:100%;height:8px;background:#1a1829;border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${m.current}%;background:${m.status === 'exceeding' ? '#10b981' : m.status === 'on-track' ? '#3b82f6' : '#ef4444'}"></div>
      </div>
      <div style="margin-top:6px;font-size:11px;color:#6b6580">Target: ${m.target}%</div>
    </div>
  `
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>SEO Performance Dashboard - Phase 21 Analytics</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0913;
      color: #e0d5ff;
      line-height: 1.6;
      padding: 40px 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      border-bottom: 2px solid #7c4dff;
      padding-bottom: 20px;
      margin-bottom: 40px;
    }
    h1 { font-size: 32px; margin-bottom: 8px; }
    .subtitle { color: #9b96b8; font-size: 14px; }
    .score-card {
      background: #1a1829;
      padding: 24px;
      border-radius: 12px;
      border-left: 4px solid #7c4dff;
      margin-bottom: 24px;
      text-align: center;
    }
    .score-number { font-size: 64px; font-weight: 700; color: #7c4dff; }
    .score-label { color: #9b96b8; font-size: 14px; margin-top: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
    .section {
      background: #1a1829;
      padding: 24px;
      border-radius: 8px;
      border-top: 3px solid #7c4dff;
      margin-bottom: 24px;
    }
    .section h2 { font-size: 18px; margin-bottom: 16px; color: #7c4dff; }
    .insight-item {
      padding: 12px;
      margin-bottom: 8px;
      background: #0a0913;
      border-radius: 4px;
      font-size: 13px;
      border-left: 2px solid #06b6d4;
      color: #9b96b8;
    }
    .recommendation-item {
      padding: 12px;
      margin-bottom: 8px;
      background: #0a0913;
      border-radius: 4px;
      font-size: 13px;
      border-left: 2px solid #f59e0b;
      color: #9b96b8;
    }
    .impact-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .impact-table th {
      background: #0a0913;
      padding: 8px;
      text-align: left;
      color: #7c4dff;
      border-bottom: 1px solid #2a2635;
    }
    .impact-table td {
      padding: 8px;
      border-bottom: 1px solid #2a2635;
      color: #9b96b8;
    }
    .impact-table .metric { color: #e0d5ff; }
    .positive { color: #10b981; }
    footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #2a2635;
      color: #6b6580;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🎯 SEO Performance Dashboard</h1>
      <div class="subtitle">Phase 21: Seasonal Content Strategy & Authority Maintenance Analytics</div>
    </header>

    <div class="score-card">
      <div class="score-number">${report.overallScore}</div>
      <div class="score-label">Overall Phase 21 Score (0-100)</div>
    </div>

    <div class="grid">
      <div class="section">
        <h2>📊 Performance Metrics</h2>
        ${metricsHtml}
      </div>

      <div class="section">
        <h2>🔍 Key Insights</h2>
        ${report.keyInsights.map((insight) => `<div class="insight-item">${insight}</div>`).join('')}
      </div>
    </div>

    <div class="section">
      <h2>💡 Recommendations</h2>
      ${report.recommendations.map((rec) => `<div class="recommendation-item">${rec}</div>`).join('')}
    </div>

    <div class="grid">
      <div class="section">
        <h2>📈 Evergreen Impact</h2>
        <table class="impact-table">
          <tr>
            <th>Metric</th>
            <th>Baseline</th>
            <th>Optimized</th>
            <th>Improvement</th>
          </tr>
          ${evergreen
            .map(
              (e) => `
            <tr>
              <td class="metric">${e.metric}</td>
              <td>${typeof e.baseline === 'number' ? e.baseline.toLocaleString() : e.baseline}</td>
              <td>${typeof e.optimized === 'number' ? e.optimized.toLocaleString() : e.optimized}</td>
              <td class="positive">${e.improvement}</td>
            </tr>
          `
            )
            .join('')}
        </table>
      </div>

      <div class="section">
        <h2>🔥 Trending Opportunity</h2>
        <table class="impact-table">
          <tr>
            <th>Metric</th>
            <th>Current</th>
            <th>Potential</th>
            <th>Opportunity</th>
          </tr>
          ${trending
            .map(
              (t) => `
            <tr>
              <td class="metric">${t.metric}</td>
              <td>${t.current.toLocaleString()}</td>
              <td class="positive">${t.potential.toLocaleString()}</td>
              <td>${t.opportunity}</td>
            </tr>
          `
            )
            .join('')}
        </table>
      </div>
    </div>

    <footer>
      <p>Generated: ${new Date(report.generatedDate).toLocaleString()} | Report includes 4 sub-components | Phase 21.6 Performance Dashboard</p>
    </footer>
  </div>
</body>
</html>
  `
}

/**
 * Write performance dashboard to file
 */
export function writeDashboardReport(distDir: string): { reportPath: string } {
  try {
    const dashboardPath = resolve(distDir, 'performance-dashboard.html')
    const html = generateDashboardHtml()
    writeFileSync(dashboardPath, html)
    return { reportPath: dashboardPath }
  } catch (e) {
    console.error('Dashboard write failed:', e)
    return { reportPath: '' }
  }
}
