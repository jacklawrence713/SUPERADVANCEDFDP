/**
 * GA4 Event Tracking Implementation (Phase 23.1)
 *
 * Defines GA4 events and tracking strategy for conversion measurement
 */

export interface GA4Event {
  eventName: string
  eventCategory: string
  triggerCondition: string
  parameters: Record<string, string>
  priority: 'high' | 'medium' | 'low'
  conversionValue: number
  expectedMonthlyVolume: number
}

export interface TrackingImplementation {
  eventId: string
  trackingType: 'page_view' | 'event' | 'conversion' | 'user_engagement'
  implementation: string
  dataLayer: Record<string, string>
  estimatedCoverage: number
}

/**
 * Generate GA4 event tracking strategy
 */
export function generateGA4EventStrategy(): GA4Event[] {
  return [
    {
      eventName: 'view_calculator_tool',
      eventCategory: 'engagement',
      triggerCondition: 'User visits /dynasty-trade-calculator/',
      parameters: { tool_name: 'trade_calculator', page_section: 'main_tool' },
      priority: 'high',
      conversionValue: 5,
      expectedMonthlyVolume: 2400,
    },
    {
      eventName: 'calculate_trade_value',
      eventCategory: 'conversion',
      triggerCondition: 'User clicks "Calculate" button in trade calculator',
      parameters: { action_type: 'calculation', tool_name: 'trade_calculator' },
      priority: 'high',
      conversionValue: 15,
      expectedMonthlyVolume: 1800,
    },
    {
      eventName: 'view_player_ranking',
      eventCategory: 'engagement',
      triggerCondition: 'User views ranking page (/rankings/*)',
      parameters: { ranking_type: 'position', page_section: 'main_content' },
      priority: 'high',
      conversionValue: 3,
      expectedMonthlyVolume: 4200,
    },
    {
      eventName: 'view_guide_page',
      eventCategory: 'engagement',
      triggerCondition: 'User views guide page (/guides/*)',
      parameters: { guide_type: 'strategy_guide', content_section: 'main' },
      priority: 'medium',
      conversionValue: 4,
      expectedMonthlyVolume: 1600,
    },
    {
      eventName: 'click_external_resource',
      eventCategory: 'engagement',
      triggerCondition: 'User clicks outbound link to external resources',
      parameters: { link_type: 'external', destination_domain: 'variable' },
      priority: 'medium',
      conversionValue: 2,
      expectedMonthlyVolume: 800,
    },
    {
      eventName: 'read_time_milestone',
      eventCategory: 'engagement',
      triggerCondition: 'User spends 2+ minutes on a page',
      parameters: { time_threshold: '120', content_type: 'guide' },
      priority: 'medium',
      conversionValue: 3,
      expectedMonthlyVolume: 2200,
    },
    {
      eventName: 'scroll_depth_milestone',
      eventCategory: 'engagement',
      triggerCondition: 'User scrolls to 50% of page content',
      parameters: { scroll_depth: '50', content_type: 'variable' },
      priority: 'low',
      conversionValue: 1,
      expectedMonthlyVolume: 3400,
    },
    {
      eventName: 'comparison_tool_interaction',
      eventCategory: 'conversion',
      triggerCondition: 'User uses player comparison tool',
      parameters: { tool_type: 'comparison', players_compared: 'variable' },
      priority: 'high',
      conversionValue: 12,
      expectedMonthlyVolume: 900,
    },
  ]
}

/**
 * Get high-priority GA4 events
 */
export function getHighPriorityEvents(): GA4Event[] {
  return generateGA4EventStrategy().filter((e) => e.priority === 'high')
}

/**
 * Calculate total conversion value potential
 */
export function calculateConversionPotential(events: GA4Event[]): number {
  return events.reduce((sum, e) => sum + e.conversionValue * (e.expectedMonthlyVolume / 1000), 0)
}

/**
 * Generate GA4 implementation checklist
 */
export function generateGA4ImplementationChecklist(): Array<{ task: string; implementation: string; priority: string; estimatedImpact: string }> {
  return [
    {
      task: 'Install GA4 tag and basic configuration',
      implementation: 'Add Google Tag Manager container with GA4 property',
      priority: 'High',
      estimatedImpact: 'Foundation for all tracking',
    },
    {
      task: 'Implement page_view conversion events',
      implementation: 'Track all tool and guide page visits as events',
      priority: 'High',
      estimatedImpact: '+1,200-4,200 monthly tracked actions',
    },
    {
      task: 'Setup conversion action tracking',
      implementation: 'Track calculator interactions, tool usage, guide engagement',
      priority: 'High',
      estimatedImpact: '+2,700 monthly conversions',
    },
    {
      task: 'Configure user engagement metrics',
      implementation: 'Track scroll depth, time on page, resource clicks',
      priority: 'Medium',
      estimatedImpact: '+6,400 engagement signals monthly',
    },
    {
      task: 'Setup custom event parameters',
      implementation: 'Add tool names, guide types, player comparisons as event parameters',
      priority: 'Medium',
      estimatedImpact: 'Detailed segmentation & analysis',
    },
    {
      task: 'Configure conversion goals and funnels',
      implementation: 'Define multi-step funnels for key user paths',
      priority: 'Medium',
      estimatedImpact: 'Funnel analysis & optimization',
    },
  ]
}

/**
 * Calculate GA4 implementation ROI
 */
export function calculateGA4ROI(): { totalConversionValue: number; monthlyTrackingVolume: number; valuePerUser: number } {
  const events = generateGA4EventStrategy()
  const totalConversionValue = calculateConversionPotential(events)
  const monthlyTrackingVolume = events.reduce((sum, e) => sum + e.expectedMonthlyVolume, 0)
  const valuePerUser = Math.round((totalConversionValue / monthlyTrackingVolume) * 100) / 100

  return { totalConversionValue, monthlyTrackingVolume, valuePerUser }
}
