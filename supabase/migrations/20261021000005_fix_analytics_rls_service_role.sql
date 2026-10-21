-- Fix analytics_events RLS to ensure service_role can SELECT
-- This allows the admin-analytics edge function to fetch data

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "anon_no_select" ON analytics_events;
DROP POLICY IF EXISTS "service_role_select" ON analytics_events;
DROP POLICY IF EXISTS "service_role_admin_select" ON analytics_events;
DROP POLICY IF EXISTS "authenticated_can_read" ON analytics_events;
DROP POLICY IF EXISTS "anon_cannot_select" ON analytics_events;

-- Create clear policies for each role
CREATE POLICY "service_role_full_access" ON analytics_events
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_select" ON analytics_events
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "anon_insert_only" ON analytics_events
  FOR INSERT
  WITH CHECK (auth.role() = 'anon');

-- Ensure grants are correct for service role
GRANT SELECT ON analytics_events TO service_role;
GRANT INSERT ON analytics_events TO anon;
GRANT SELECT ON analytics_events TO authenticated;
