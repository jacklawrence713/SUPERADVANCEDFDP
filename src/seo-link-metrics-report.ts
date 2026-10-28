/**
 * Link Metrics Report & Dashboard (Phase 22.6)
 *
 * Generates comprehensive link metrics and monitoring dashboard
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'
import {
  generateLinkVelocityMetrics,
  generateLinkHealthScorecard,
  calculateVelocityAcceleration,
  generateMonitoringKPIs,
  identifyLinkHealthRisks,
} from './seo-link-velocity'

export interface LinkMetricsReportResult {
  reportPath: string
  metricsIncluded: number
  kpisTracked: number
}

export function generateLinkMetricsReport(distDir: string): LinkMetricsReportResult {
  try {
    const velocityMetrics = generateLinkVelocityMetrics()
    const healthScores = generateLinkHealthScorecard()
    const acceleration = calculateVelocityAcceleration()
    const kpis = generateMonitoringKPIs()
    const risks = identifyLinkHealthRisks()

    const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Link Metrics & Growth Dashboard - Phase 22.6</title>
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
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 40px; }
    .kpi-card {
      background: #1a1829;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #7c4dff;
    }
    .kpi-value { font-size: 28px; font-weight: 700; color: #7c4dff; margin: 6px 0; }
    .kpi-label { font-size: 12px; color: #9b96b8; }
    .section {
      background: #1a1829;
      padding: 24px;
      border-radius: 8px;
      border-top: 3px solid #7c4dff;
      margin-bottom: 24px;
    }
    .section h2 { font-size: 18px; margin-bottom: 16px; color: #7c4dff; }
    .metric-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
      gap: 12px;
      padding: 12px;
      border-bottom: 1px solid #2a2635;
      align-items: center;
      font-size: 12px;
    }
    .metric-row:last-child { border-bottom: none; }
    .metric-label { color: #9b96b8; }
    .metric-value { font-weight: 600; color: #e0d5ff; }
    .trend-up { color: #10b981; }
    .trend-down { color: #ef4444; }
    .health-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 6px;
    }
    .health-good { background: #10b981; }
    .health-warning { background: #f59e0b; }
    .health-critical { background: #ef4444; }
    .velocity-chart {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    .velocity-bar {
      background: #0a0913;
      padding: 12px;
      border-radius: 4px;
      border-left: 3px solid #06b6d4;
    }
    .velocity-label { font-size: 11px; color: #6b6580; margin-bottom: 6px; }
    .velocity-value { font-size: 16px; font-weight: 700; color: #06b6d4; }
    .risk-item {
      background: #0a0913;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 4px;
      border-left: 3px solid #f59e0b;
    }
    .risk-severity { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; display: inline-block; margin-top: 4px; }
    .severity-high { background: #ef4444; color: #fff; }
    .severity-medium { background: #f59e0b; color: #fff; }
    .severity-low { background: #3b82f6; color: #fff; }
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
      <h1>🔗 Link Growth & Velocity Dashboard</h1>
      <div class="subtitle">Phase 22.6: 12-Month Link Metrics & Performance Tracking</div>
    </header>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Year 1 Target</div>
        <div class="kpi-value">${velocityMetrics.reduce((sum, m) => sum + m.linksAcquired, 0)}</div>
        <div class="kpi-label">total links</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Target Domains</div>
        <div class="kpi-value">${velocityMetrics.reduce((sum, m) => sum + m.newReferringDomains, 0)}</div>
        <div class="kpi-label">referring domains</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Est. DA Gain</div>
        <div class="kpi-value">20+</div>
        <div class="kpi-label">domain authority</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Traffic Goal</div>
        <div class="kpi-value">10K</div>
        <div class="kpi-label">monthly from links</div>
      </div>
    </div>

    <div class="section">
      <h2>📊 Quarterly Link Velocity</h2>
      <div class="velocity-chart">
        ${velocityMetrics
          .map(
            (metric) => `
          <div class="velocity-bar">
            <div class="velocity-label">${metric.period}</div>
            <div class="velocity-value">${metric.linksAcquired}</div>
            <div style="font-size: 10px; color: #9b96b8; margin-top: 4px;">
              ${metric.newReferringDomains} domains | DA ${metric.averageDomainAuthority}
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>

    <div class="section">
      <h2>❤️ Link Health Scorecard</h2>
      ${healthScores
        .map(
          (score) => `
        <div class="metric-row">
          <div class="metric-label">
            <span class="health-indicator health-${score.status === 'on-track' ? 'good' : score.status === 'at-risk' ? 'warning' : 'critical'}"></span>
            ${score.metric}
          </div>
          <div class="metric-value">${score.current}</div>
          <div class="metric-value">${score.target}</div>
          <div class="metric-value" style="${score.status === 'on-track' ? 'color: #10b981;' : score.status === 'at-risk' ? 'color: #f59e0b;' : 'color: #ef4444;'}">${score.status}</div>
          <div class="metric-value ${score.trend === 'up' ? 'trend-up' : 'trend-down'}">${score.trend === 'up' ? '↑' : '↓'} ${score.trend}</div>
        </div>
      `
        )
        .join('')}
    </div>

    <div class="section">
      <h2>📈 12-Month KPI Projections</h2>
      <div class="metric-row" style="background: #0a0913; font-weight: 600; border-radius: 4px;">
        <div>KPI</div>
        <div style="text-align: center;">Start</div>
        <div style="text-align: center;">Q1 (3mo)</div>
        <div style="text-align: center;">Q2 (6mo)</div>
        <div style="text-align: center;">Year End</div>
      </div>
      ${kpis
        .map(
          (kpi) => `
        <div class="metric-row">
          <div class="metric-label">${kpi.kpi}</div>
          <div>${kpi.baseline}</div>
          <div>${kpi.month3}</div>
          <div>${kpi.month6}</div>
          <div class="trend-up">${kpi.month12}</div>
        </div>
      `
        )
        .join('')}
    </div>

    <div class="section">
      <h2>⚡ Link Velocity Acceleration</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-top: 16px;">
        <div style="background: #0a0913; padding: 16px; border-radius: 4px;">
          <div style="font-size: 11px; color: #9b96b8; margin-bottom: 6px;">Starting Pace</div>
          <div style="font-size: 20px; font-weight: 700; color: #06b6d4;">${acceleration.startingPace}/mo</div>
        </div>
        <div style="background: #0a0913; padding: 16px; border-radius: 4px;">
          <div style="font-size: 11px; color: #9b96b8; margin-bottom: 6px;">Ending Pace</div>
          <div style="font-size: 20px; font-weight: 700; color: #10b981;">${acceleration.endingPace}/mo</div>
        </div>
        <div style="background: #0a0913; padding: 16px; border-radius: 4px;">
          <div style="font-size: 11px; color: #9b96b8; margin-bottom: 6px;">Acceleration</div>
          <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${Math.round(acceleration.acceleration)}%</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>🚨 Link Health Risks & Mitigation</h2>
      ${risks
        .map(
          (risk) => `
        <div class="risk-item">
          <div style="font-weight: 600; color: #e0d5ff;">${risk.risk}</div>
          <div style="margin-top: 6px; font-size: 12px; color: #9b96b8;">
            <strong>Mitigation:</strong> ${risk.mitigation}
          </div>
          <span class="risk-severity severity-${risk.severity.toLowerCase()}">${risk.severity.toUpperCase()}</span>
        </div>
      `
        )
        .join('')}
    </div>

    <footer>
      <p>Generated: ${new Date().toLocaleString()} | Link Metrics Report for Phase 22.6 | 12-Month Growth Projections</p>
    </footer>
  </div>
</body>
</html>
    `

    const reportPath = resolve(distDir, 'link-metrics-report.html')
    writeFileSync(reportPath, reportHtml)

    return {
      reportPath,
      metricsIncluded: velocityMetrics.length,
      kpisTracked: kpis.length,
    }
  } catch (e) {
    console.error('Link metrics report generation failed:', e)
    return { reportPath: '', metricsIncluded: 0, kpisTracked: 0 }
  }
}
