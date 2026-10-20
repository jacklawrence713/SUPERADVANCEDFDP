-- Admin functions for unique visitor tracking
-- These functions provide admin-level analytics queries for the analytics_events table

-- Get unique daily visitors for a date range
CREATE OR REPLACE FUNCTION public.get_unique_visitors(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '14 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  visitor_date DATE,
  unique_count INT,
  total_events INT
) AS $$
  SELECT
    DATE(created_at) as visitor_date,
    COUNT(DISTINCT visitor_id)::INT as unique_count,
    COUNT(*)::INT as total_events
  FROM analytics_events
  WHERE created_at >= p_start_date AND created_at <= p_end_date
  GROUP BY DATE(created_at)
  ORDER BY visitor_date DESC;
$$ LANGUAGE SQL STABLE;

-- Get top visitors by event count
CREATE OR REPLACE FUNCTION public.get_top_visitors(p_limit INT DEFAULT 20)
RETURNS TABLE (
  visitor_id TEXT,
  event_count INT,
  last_seen TIMESTAMP WITH TIME ZONE,
  first_seen TIMESTAMP WITH TIME ZONE,
  unique_event_types INT
) AS $$
  SELECT
    ae.visitor_id,
    COUNT(*)::INT as event_count,
    MAX(ae.created_at) as last_seen,
    MIN(ae.created_at) as first_seen,
    COUNT(DISTINCT ae.event_type)::INT as unique_event_types
  FROM analytics_events ae
  GROUP BY ae.visitor_id
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
$$ LANGUAGE SQL STABLE;

-- Get daily visitor summary statistics
CREATE OR REPLACE FUNCTION public.get_daily_visitor_summary(p_days INT DEFAULT 14)
RETURNS TABLE (
  total_unique_visitors INT,
  total_events INT,
  avg_events_per_visitor NUMERIC,
  most_active_day DATE,
  most_active_day_count INT
) AS $$
  WITH daily_summary AS (
    SELECT
      DATE(created_at) as visit_date,
      COUNT(DISTINCT visitor_id) as daily_unique,
      COUNT(*) as daily_events
    FROM analytics_events
    WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY DATE(created_at)
  )
  SELECT
    (SELECT COUNT(DISTINCT visitor_id)::INT FROM analytics_events WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL),
    (SELECT COUNT(*)::INT FROM analytics_events WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL),
    ROUND((SELECT COUNT(*)::NUMERIC FROM analytics_events WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL) /
          NULLIF((SELECT COUNT(DISTINCT visitor_id)::NUMERIC FROM analytics_events WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL), 0), 2),
    (SELECT visit_date FROM daily_summary ORDER BY daily_unique DESC LIMIT 1),
    (SELECT daily_unique::INT FROM daily_summary ORDER BY daily_unique DESC LIMIT 1)
  FROM daily_summary LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Get event type breakdown and distribution
CREATE OR REPLACE FUNCTION public.get_event_type_breakdown(p_days INT DEFAULT 14)
RETURNS TABLE (
  event_type TEXT,
  event_count INT,
  unique_visitors INT,
  percentage NUMERIC
) AS $$
  WITH event_stats AS (
    SELECT
      event_type,
      COUNT(*) as total_count,
      COUNT(DISTINCT visitor_id) as unique_visitor_count
    FROM analytics_events
    WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY event_type
  ),
  totals AS (
    SELECT SUM(total_count) as grand_total FROM event_stats
  )
  SELECT
    es.event_type,
    es.total_count::INT,
    es.unique_visitor_count::INT,
    ROUND((es.total_count::NUMERIC / t.grand_total * 100), 2)
  FROM event_stats es, totals t
  ORDER BY es.total_count DESC;
$$ LANGUAGE SQL STABLE;

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.get_unique_visitors(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_top_visitors(INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_daily_visitor_summary(INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_event_type_breakdown(INT) TO authenticated, service_role;
