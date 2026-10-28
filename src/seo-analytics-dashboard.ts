/**
 * Analytics Dashboard & ROI Reporting (Phase 23.6)
 *
 * Generates comprehensive analytics dashboard and ROI reporting
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { generateGA4EventStrategy, calculateGA4ROI } from './seo-ga4-event-tracking'
import { generateConversionFunnels, calculateFunnelRevenuePercentage } from './seo-conversion-funnel'
import { generateABTestingRoadmap, calculateCumulativeTestingImpact } from './seo-ab-testing-strategy'

export interface AnalyticsReportResult {
  reportPath: string
  metricsIncluded: number
  funnelsAnalyzed: number
}

export function generateAnalyticsDashboard(distDir: string): AnalyticsReportResult {
  try {
    const ga4Events = generateGA4EventStrategy()
    const ga4ROI = calculateGA4ROI()
    const funnels = generateConversionFunnels()
    const funnelRevenue = calculateFunnelRevenuePercentage(funnels)
    const tests = generateABTestingRoadmap()
    const testingImpact = calculateCumulativeTestingImpact()

    const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Advanced Analytics Dashboard - Phase 23</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0913;
      color: #e0d5ff;
      line-height: 1.6;
      padding: 40px 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    header { border-bottom: 2px solid #7c4dff; padding-bottom: 20px; margin-bottom: 40px; }
    h1 { font-size: 32px; margin-bottom: 8px; }
    .subtitle { color: #9b96b8; font-size: 14px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 40px; }
    .kpi-card {
      background: #1a1829;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #7c4dff;
    }
    .kpi-value { font-size: 24px; font-weight: 700; color: #7c4dff; margin: 6px 0; }
    .kpi-label { font-size: 11px; color: #9b96b8; }
    .section {
      background: #1a1829;
      padding: 24px;
      border-radius: 8px;
      border-top: 3px solid #7c4dff;
      margin-bottom: 24px;
    }
    .section h2 { font-size: 18px; margin-bottom: 16px; color: #7c4dff; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      background: #0a0913;
      padding: 10px;
      text-align: left;
      color: #7c4dff;
      border-bottom: 1px solid #2a2635;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #2a2635;
      color: #9b96b8;
    }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
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
      <h1>📊 Advanced Analytics Dashboard</h1>
      <div class="subtitle">Phase 23: GA4 Tracking, Funnels, Attribution & Testing ROI</div>
    </header>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Tracked Events</div>
        <div class="kpi-value">${ga4Events.length}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Monthly Volume</div>
        <div class="kpi-value">${(ga4ROI.monthlyTrackingVolume / 1000).toFixed(1)}K</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Conversion Funnels</div>
        <div class="kpi-value">${funnels.length}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Active Tests</div>
        <div class="kpi-value">${tests.length}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Testing Potential</div>
        <div class="kpi-value">+${testingImpact.total_lift_percentage}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Annual Impact</div>
        <div class="kpi-value">$${(testingImpact.estimated_annual_gain / 1000).toFixed(0)}K</div>
      </div>
    </div>

    <div class="section">
      <h2>GA4 Event Tracking Overview</h2>
      <table>
        <tr>
          <th>Event Name</th>
          <th>Category</th>
          <th>Monthly Volume</th>
          <th>Conversion Value</th>
          <th>Priority</th>
        </tr>
        ${ga4Events.map(e => '<tr><td>' + e.eventName + '</td><td>' + e.eventCategory + '</td><td>' + e.expectedMonthlyVolume.toLocaleString() + '</td><td>' + e.conversionValue + ' pts</td><td>' + e.priority + '</td></tr>').join('')}
      </table>
    </div>

    <div class="section">
      <h2>Conversion Funnel Performance</h2>
      <table>
        <tr>
          <th>Funnel Name</th>
          <th>Monthly Completions</th>
          <th>Revenue/Month</th>
          <th>% of Total</th>
        </tr>
        ${funnelRevenue.map(f => '<tr><td>' + f.funnel + '</td><td>' + f.completions.toLocaleString() + '</td><td>$' + f.revenue.toLocaleString() + '</td><td>' + f.percentage + '%</td></tr>').join('')}
      </table>
    </div>

    <div class="section">
      <h2>A/B Testing & Optimization Roadmap</h2>
      <table>
        <tr>
          <th>Test Name</th>
          <th>Expected Lift</th>
          <th>Sample Size</th>
          <th>Duration (days)</th>
          <th>Est. Impact</th>
        </tr>
        ${tests.map(t => '<tr><td>' + t.testName + '</td><td class="positive">+' + t.expectedLift + '%</td><td>' + t.sampleSize.toLocaleString() + '</td><td>' + t.duration + '</td><td class="positive">+' + t.estimatedImpact + '</td></tr>').join('')}
      </table>
    </div>

    <div class="section">
      <h2>Phase 23 Implementation Summary</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div style="background: #0a0913; padding: 16px; border-radius: 8px;">
          <div style="font-weight: 600; color: #06b6d4; margin-bottom: 12px;">GA4 & Event Tracking</div>
          <div style="font-size: 12px; color: #9b96b8; line-height: 1.8;">
            ✓ ${ga4Events.length} tracked events<br>
            ✓ ${ga4ROI.monthlyTrackingVolume.toLocaleString()} monthly tracked actions<br>
            ✓ Real-time conversion attribution<br>
            ✓ User behavior insights
          </div>
        </div>
        <div style="background: #0a0913; padding: 16px; border-radius: 8px;">
          <div style="font-weight: 600; color: #06b6d4; margin-bottom: 12px;">Conversion Optimization</div>
          <div style="font-size: 12px; color: #9b96b8; line-height: 1.8;">
            ✓ ${funnels.length} conversion funnels mapped<br>
            ✓ Multi-touch attribution models<br>
            ✓ User behavior heatmaps<br>
            ✓ Friction analysis & fixes
          </div>
        </div>
      </div>
    </div>

    <footer>
      <p>Generated: ${new Date().toLocaleString()} | Advanced Analytics Dashboard for Phase 23 | GA4 + Funnels + Attribution + Testing</p>
    </footer>
  </div>
</body>
</html>
    `

    const reportPath = resolve(distDir, 'analytics-dashboard.html')
    writeFileSync(reportPath, reportHtml)

    return {
      reportPath,
      metricsIncluded: ga4Events.length,
      funnelsAnalyzed: funnels.length,
    }
  } catch (e) {
    console.error('Analytics dashboard generation failed:', e)
    return { reportPath: '', metricsIncluded: 0, funnelsAnalyzed: 0 }
  }
}
