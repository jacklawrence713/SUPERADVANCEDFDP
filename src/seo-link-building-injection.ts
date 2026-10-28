/**
 * Link Building Strategy Injection (Phase 22.4)
 *
 * Injects link building strategy and timeline recommendations
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { generateLinkBuildingStrategy, calculateTotalLinkPotential, generateMonthlyChecklist } from './seo-link-building-strategy'

export interface LinkBuildingInjectionResult {
  strategyReportPath: string
  phasesDocumented: number
  tacticsIncluded: number
}

export function injectLinkBuildingStrategy(distDir: string): LinkBuildingInjectionResult {
  try {
    const phases = generateLinkBuildingStrategy()
    const potential = calculateTotalLinkPotential(phases)
    const checklist = generateMonthlyChecklist()

    const strategyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Link Building Strategy & Timeline - Phase 22.4</title>
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
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 40px; }
    .kpi-card {
      background: #1a1829;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #7c4dff;
    }
    .kpi-value { font-size: 32px; font-weight: 700; color: #7c4dff; margin: 8px 0; }
    .kpi-label { font-size: 12px; color: #9b96b8; }
    .phase-section {
      background: #1a1829;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 24px;
      border-top: 3px solid #7c4dff;
    }
    .phase-title { font-size: 18px; font-weight: 600; color: #7c4dff; margin-bottom: 12px; }
    .phase-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px; font-size: 12px; }
    .meta-item { background: #0a0913; padding: 8px; border-radius: 4px; color: #9b96b8; }
    .meta-label { color: #6b6580; font-size: 11px; }
    .tactics-list { list-style: none; padding: 0; margin: 12px 0; }
    .tactics-list li {
      padding: 8px 12px;
      margin: 6px 0;
      background: #0a0913;
      border-left: 2px solid #06b6d4;
      border-radius: 4px;
      font-size: 13px;
      color: #9b96b8;
    }
    .resource-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 12px; }
    .resource-tag {
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid #06b6d4;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 11px;
      color: #06b6d4;
    }
    .checklist-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 24px; }
    .checklist-item {
      background: #0a0913;
      padding: 16px;
      border-radius: 8px;
      border-left: 3px solid #f59e0b;
    }
    .checklist-task { font-weight: 600; color: #e0d5ff; margin-bottom: 6px; font-size: 13px; }
    .checklist-meta { font-size: 11px; color: #9b96b8; margin: 4px 0; }
    .priority-high { color: #ef4444; }
    .priority-medium { color: #f59e0b; }
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
      <h1>🔗 Link Building Strategy & Timeline</h1>
      <div class="subtitle">Phase 22.4: 12-Month Comprehensive Link Acquisition Roadmap</div>
    </header>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Expected Links</div>
        <div class="kpi-value">${potential.totalLinks}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Est. Referral Traffic</div>
        <div class="kpi-value">${potential.totalTraffic.toLocaleString()}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Monthly Pace</div>
        <div class="kpi-value">${potential.avgLinksPerMonth}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Strategy Duration</div>
        <div class="kpi-value">12 Mo</div>
      </div>
    </div>

    ${phases
      .map(
        (phase) => `
    <div class="phase-section">
      <div class="phase-title">${phase.phase}</div>

      <div class="phase-meta">
        <div class="meta-item">
          <div class="meta-label">Quarter</div>
          <div>${phase.quarter}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Duration</div>
          <div>${phase.duration}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Targets</div>
          <div>${phase.targets} opportunities</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Expected Links</div>
          <div>${phase.expectedLinks} links</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Est. Traffic</div>
          <div>${phase.estimatedTraffic.toLocaleString()}</div>
        </div>
      </div>

      <div style="margin-top: 12px; color: #9b96b8; font-size: 13px; font-style: italic;">
        <strong>Strategy:</strong> ${phase.strategy}
      </div>

      <div style="margin-top: 12px;">
        <strong style="color: #06b6d4; font-size: 13px;">Tactics</strong>
        <ul class="tactics-list">
          ${phase.tactics.map((tactic) => `<li>${tactic}</li>`).join('')}
        </ul>
      </div>

      <div style="margin-top: 12px;">
        <strong style="color: #10b981; font-size: 13px; display: block; margin-bottom: 8px;">Success Metrics</strong>
        ${phase.successMetrics.map((metric) => `<div style="font-size: 12px; color: #9b96b8; margin-bottom: 4px;">✓ ${metric}</div>`).join('')}
      </div>

      <div style="margin-top: 12px;">
        <strong style="color: #f59e0b; font-size: 13px; display: block; margin-bottom: 8px;">Resources Needed</strong>
        <div class="resource-grid">
          ${phase.resourcesNeeded.map((resource) => `<div class="resource-tag">${resource}</div>`).join('')}
        </div>
      </div>
    </div>
  `
      )
      .join('')}

    <div class="phase-section">
      <div class="phase-title">📋 Monthly Execution Checklist</div>
      <div class="checklist-grid">
        ${checklist
          .map(
            (item) => `
          <div class="checklist-item">
            <div class="checklist-task">${item.task}</div>
            <div class="checklist-meta">Frequency: <strong>${item.frequency}</strong></div>
            <div class="checklist-meta">Owner: ${item.owner}</div>
            <div class="checklist-meta">Priority: <span class="priority-${item.priority.toLowerCase()}">${item.priority}</span></div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>

    <footer>
      <p>Generated: ${new Date().toLocaleString()} | Link Building Strategy for Phase 22.4 | 4-Phase 12-Month Roadmap</p>
    </footer>
  </div>
</body>
</html>
    `

    const strategyPath = resolve(distDir, 'link-building-strategy.html')
    writeFileSync(strategyPath, strategyHtml)

    return {
      strategyReportPath: strategyPath,
      phasesDocumented: phases.length,
      tacticsIncluded: phases.reduce((sum, p) => sum + p.tactics.length, 0),
    }
  } catch (e) {
    console.error('Link building strategy injection failed:', e)
    return { strategyReportPath: '', phasesDocumented: 0, tacticsIncluded: 0 }
  }
}
