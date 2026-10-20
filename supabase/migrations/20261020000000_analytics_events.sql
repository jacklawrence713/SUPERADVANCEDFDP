-- Analytics Events Table for tracking site usage, user activity, and trades
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  visitor_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- page_view, tab_change, trade_analyzed, etc.
  event_data JSONB DEFAULT '{}'::JSONB,
  INDEX idx_analytics_created_at (created_at DESC),
  INDEX idx_analytics_event_type (event_type),
  INDEX idx_analytics_visitor_id (visitor_id),
  INDEX idx_analytics_user_email ((event_data->>'user_email'))
);

-- Enable RLS (Row Level Security)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role (edge functions) to insert
CREATE POLICY "service_role_insert" ON analytics_events
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Allow service role to select (for admin analytics)
CREATE POLICY "service_role_select" ON analytics_events
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Policy: Allow anon to insert (for browser tracking)
CREATE POLICY "anon_insert" ON analytics_events
  FOR INSERT
  WITH CHECK (auth.role() = 'anon');

-- Policy: Deny direct select from browser (no anon select)
CREATE POLICY "anon_no_select" ON analytics_events
  FOR SELECT
  USING (false);

-- Grant permissions
GRANT USAGE ON SEQUENCE analytics_events_id_seq TO authenticated, anon, service_role;
GRANT INSERT ON analytics_events TO authenticated, anon, service_role;
GRANT SELECT ON analytics_events TO service_role;
