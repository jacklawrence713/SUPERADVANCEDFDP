/**
 * SEO Keyword Analysis Report Generator (Phase 20.6)
 *
 * Generates comprehensive keyword analysis report with recommendations
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'
import {
  analyzeKeywordOpportunities,
  getTopOpportunities,
  segmentByDifficulty,
  calculateTotalAddressableMarket,
  generatePriorityRankings,
} from './seo-keyword-analysis'

export interface KeywordReportResult {
  reportGenerated: boolean
  reportPath: string
  keywordsAnalyzed: number
  totalTraffic: number
}

export function generateKeywordAnalysisReport(distDir: string): KeywordReportResult {
  const opportunities = analyzeKeywordOpportunities()
  const topOps = getTopOpportunities(8)
  const byDifficulty = segmentByDifficulty()
  const totalTraffic = calculateTotalAddressableMarket(opportunities)
  const priorities = generatePriorityRankings()

  const reportHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Keyword Analysis Report - Fantasy Draft Pros</title>
  <style>
    body {
      background: #13111e;
      color: #e0dce8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.7;
      padding: 40px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #7c4dff;
      font-size: 28px;
      margin-bottom: 8px;
    }
    h2 {
      color: #7c4dff;
      font-size: 20px;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    h3 {
      color: #7c4dff;
      font-size: 16px;
      margin: 12px 0;
    }
    .timestamp {
      color: #9b96b8;
      font-size: 13px;
      margin-bottom: 24px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: #1a1829;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #7c4dff;
    }
    .stat-value {
      color: #7c4dff;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
    }
    .stat-label {
      color: #9b96b8;
      font-size: 12px;
      margin-top: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      background: #1a1829;
      border-radius: 8px;
      overflow: hidden;
    }
    th {
      background: #0a0913;
      color: #7c4dff;
      padding: 12px;
      text-align: left;
      font-weight: 700;
      font-size: 13px;
      border-bottom: 2px solid #7c4dff;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #2a2540;
      font-size: 13px;
    }
    tr:hover {
      background: #0a0913;
    }
    .opportunity-high {
      color: #10b981;
      font-weight: 700;
    }
    .opportunity-medium {
      color: #f59e0b;
    }
    .opportunity-low {
      color: #ef4444;
    }
    .difficulty-low {
      color: #10b981;
    }
    .difficulty-medium {
      color: #f59e0b;
    }
    .difficulty-high {
      color: #ef4444;
    }
    .recommendation {
      background: #1a1829;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 12px;
      border-left: 4px solid #7c4dff;
    }
    .priority {
      display: inline-block;
      background: #7c4dff;
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      margin-right: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>SEO Keyword Analysis Report</h1>
    <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>

    <div class="stats-grid">
      <div class="stat-card">
        <p class="stat-value">${opportunities.length}</p>
        <p class="stat-label">Keywords Analyzed</p>
      </div>
      <div class="stat-card">
        <p class="stat-value">${totalTraffic.toLocaleString()}</p>
        <p class="stat-label">Estimated Monthly Traffic</p>
      </div>
      <div class="stat-card">
        <p class="stat-value">${byDifficulty.easy.length}</p>
        <p class="stat-label">Easy Opportunities</p>
      </div>
      <div class="stat-card">
        <p class="stat-value">${Math.round(opportunities.reduce((sum, k) => sum + k.difficulty, 0) / opportunities.length)}</p>
        <p class="stat-label">Average Difficulty</p>
      </div>
    </div>

    <h2>Top Keyword Opportunities</h2>
    <table>
      <thead>
        <tr>
          <th>Keyword</th>
          <th>Volume</th>
          <th>Difficulty</th>
          <th>Opportunity</th>
          <th>Est. Traffic</th>
          <th>Recommendation</th>
        </tr>
      </thead>
      <tbody>
        ${topOps
          .map(
            (opp) => `
        <tr>
          <td><strong>${opp.keyword}</strong></td>
          <td>${opp.searchVolume.toLocaleString()}</td>
          <td class="difficulty-${opp.difficulty < 30 ? 'low' : opp.difficulty < 45 ? 'medium' : 'high'}">${opp.difficulty}</td>
          <td class="opportunity-${opp.opportunity > 85 ? 'high' : opp.opportunity > 70 ? 'medium' : 'low'}">${opp.opportunity}</td>
          <td>${opp.estimatedTraffic}</td>
          <td>Target position #${opp.recommendedPosition}</td>
        </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <h2>Keywords by Difficulty Level</h2>
    <h3>Easy (Difficulty &lt; 25)</h3>
    <p style="color: #9b96b8;">${byDifficulty.easy.length} keywords - Quick wins</p>
    <ul style="list-style: none; padding: 0;">
      ${byDifficulty.easy
        .map(
          (k) =>
            `<li style="margin: 8px 0; color: #7c4dff;"><strong>${k.keyword}</strong> (Volume: ${k.searchVolume}, Traffic: ${k.estimatedTraffic})</li>`
        )
        .join('')}
    </ul>

    <h3>Medium (Difficulty 25-40)</h3>
    <p style="color: #9b96b8;">${byDifficulty.medium.length} keywords - Balanced targets</p>
    <ul style="list-style: none; padding: 0;">
      ${byDifficulty.medium
        .map(
          (k) =>
            `<li style="margin: 8px 0; color: #7c4dff;"><strong>${k.keyword}</strong> (Volume: ${k.searchVolume}, Traffic: ${k.estimatedTraffic})</li>`
        )
        .join('')}
    </ul>

    <h3>Hard (Difficulty &gt; 40)</h3>
    <p style="color: #9b96b8;">${byDifficulty.hard.length} keywords - Long-term targets</p>
    <ul style="list-style: none; padding: 0;">
      ${byDifficulty.hard
        .map(
          (k) =>
            `<li style="margin: 8px 0; color: #7c4dff;"><strong>${k.keyword}</strong> (Volume: ${k.searchVolume}, Traffic: ${k.estimatedTraffic})</li>`
        )
        .join('')}
    </ul>

    <h2>Priority Implementation Roadmap</h2>
    ${priorities
      .map(
        (p) => `
    <div class="recommendation">
      <span class="priority">Priority #${p.rank}</span>
      <strong style="color: #7c4dff; font-size: 14px;">${p.keyword}</strong>
      <p style="margin: 8px 0; color: #9b96b8; font-size: 12px;">${p.reason}</p>
      <p style="margin: 0; color: #6b6580; font-size: 12px;">Expected Timeline: ${p.expectedTimeline}</p>
    </div>
    `
      )
      .join('')}

    <h2>Strategic Recommendations</h2>
    <div style="background: #1a1829; padding: 20px; border-radius: 8px; margin-top: 20px;">
      <ol style="color: #9b96b8; line-height: 2;">
        <li><strong style="color: #7c4dff;">Prioritize Easy Keywords First:</strong> Target 5-6 keywords with difficulty &lt; 25 for quick wins and momentum</li>
        <li><strong style="color: #7c4dff;">Build Content Clusters:</strong> Group semantically related keywords around pillar pages</li>
        <li><strong style="color: #7c4dff;">Optimize Meta Tags:</strong> Ensure all pages have keyword-optimized titles and descriptions</li>
        <li><strong style="color: #7c4dff;">Internal Linking Strategy:</strong> Connect related keywords through contextual internal links</li>
        <li><strong style="color: #7c4dff;">Long-tail Focus:</strong> Target long-tail variations for higher conversion rates</li>
        <li><strong style="color: #7c4dff;">Monitor & Iterate:</strong> Track rankings monthly and adjust strategy based on performance</li>
      </ol>
    </div>

    <h2>Traffic Potential Summary</h2>
    <div style="background: linear-gradient(135deg, #7c4dff, #6a3de8); padding: 30px; border-radius: 8px; color: #fff; margin-top: 20px; text-align: center;">
      <p style="font-size: 24px; font-weight: 700; margin: 0;">${totalTraffic.toLocaleString()} Monthly Visits</p>
      <p style="margin: 12px 0; opacity: 0.9;">Addressable market across analyzed keywords</p>
      <p style="margin: 0; font-size: 12px; opacity: 0.8;">Based on current rankings and expected CTR</p>
    </div>
  </div>
</body>
</html>`

  const reportPath = resolve(distDir, 'keyword-analysis-report.html')
  writeFileSync(reportPath, reportHtml)

  return {
    reportGenerated: true,
    reportPath,
    keywordsAnalyzed: opportunities.length,
    totalTraffic,
  }
}
