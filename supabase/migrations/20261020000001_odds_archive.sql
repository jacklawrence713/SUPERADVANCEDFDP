-- Historical odds archive for prior weeks and season data
-- Stores all odds fetches with NFL week/season context for historical analysis

CREATE TABLE IF NOT EXISTS public.odds_archive (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  nfl_week INT NOT NULL,
  nfl_season INT NOT NULL,
  game_date TIMESTAMPTZ NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_spread FLOAT,
  away_spread FLOAT,
  total FLOAT,
  bookmakers_count INT DEFAULT 1,
  source TEXT DEFAULT 'api', -- 'api' or 'manual'
  raw_response JSONB,
  INDEX idx_odds_archive_week (nfl_week, nfl_season),
  INDEX idx_odds_archive_teams (home_team, away_team),
  INDEX idx_odds_archive_date (game_date DESC),
  INDEX idx_odds_archive_created (created_at DESC)
);

-- Enable RLS
ALTER TABLE public.odds_archive ENABLE ROW LEVEL SECURITY;

-- Allow service_role to insert (from edge functions)
CREATE POLICY "service_role_insert" ON public.odds_archive
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to SELECT (for historical view)
CREATE POLICY "authenticated_select" ON public.odds_archive
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow anon to select (for public historical data)
CREATE POLICY "anon_select" ON public.odds_archive
  FOR SELECT
  USING (true);

-- Grant permissions
GRANT USAGE ON SEQUENCE odds_archive_id_seq TO authenticated, anon, service_role;
GRANT INSERT ON public.odds_archive TO service_role;
GRANT SELECT ON public.odds_archive TO authenticated, anon, service_role;

-- Helper: Get latest odds for a week/season
CREATE OR REPLACE FUNCTION public.get_week_odds(p_week INT, p_season INT)
RETURNS TABLE (
  home_team TEXT,
  away_team TEXT,
  home_spread FLOAT,
  away_spread FLOAT,
  total FLOAT,
  game_date TIMESTAMPTZ
) AS $$
  SELECT
    home_team,
    away_team,
    home_spread,
    away_spread,
    total,
    game_date
  FROM public.odds_archive
  WHERE nfl_week = p_week AND nfl_season = p_season
  ORDER BY created_at DESC;
$$ LANGUAGE SQL STABLE;

-- Grant execute on helper function
GRANT EXECUTE ON FUNCTION public.get_week_odds(INT, INT) TO authenticated, anon, service_role;
