-- Fix analytics_events RLS to ensure admin functions can read data
-- Drop conflicting policy if it exists
DROP POLICY IF EXISTS "anon_no_select" ON analytics_events;
DROP POLICY IF EXISTS "service_role_select" ON analytics_events;

-- Create explicit service_role policy for admin analytics
CREATE POLICY "service_role_admin_select" ON analytics_events
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own analytics (optional, for future features)
CREATE POLICY "authenticated_can_read" ON analytics_events
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Keep anon insert but deny anon select
CREATE POLICY "anon_cannot_select" ON analytics_events
  FOR SELECT
  USING (false);

-- Ensure grants are correct
GRANT SELECT ON analytics_events TO service_role;
GRANT SELECT ON analytics_events TO authenticated;
