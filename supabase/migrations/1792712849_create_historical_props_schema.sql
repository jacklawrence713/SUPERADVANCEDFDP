-- Create historical player props tables

CREATE TABLE IF NOT EXISTS historical_player_props (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  week INT NOT NULL,
  season INT NOT NULL,
  event_id TEXT NOT NULL,
  player_id INT,
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  opponent TEXT NOT NULL,
  position TEXT,
  market_key TEXT NOT NULL,
  market_display TEXT,
  line DECIMAL(5, 1) NOT NULL,
  over_price INT,
  under_price INT,
  bookmaker TEXT NOT NULL,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, player_name, market_key, bookmaker, week)
);

CREATE INDEX IF NOT EXISTS idx_week_season ON historical_player_props(week, season);
CREATE INDEX IF NOT EXISTS idx_player_market ON historical_player_props(player_name, market_key);
CREATE INDEX IF NOT EXISTS idx_captured ON historical_player_props(captured_at);
CREATE INDEX IF NOT EXISTS idx_event ON historical_player_props(event_id);

CREATE TABLE IF NOT EXISTS historical_prop_results (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  prop_id BIGINT NOT NULL REFERENCES historical_player_props(id) ON DELETE CASCADE,
  week INT NOT NULL,
  season INT NOT NULL,
  player_name TEXT NOT NULL,
  market_key TEXT NOT NULL,
  actual_value DECIMAL(7, 1),
  stat_source TEXT,
  stat_fetched_at TIMESTAMP WITH TIME ZONE,
  grade TEXT,
  grade_logic TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by TEXT,
  player_participated BOOLEAN,
  game_status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(prop_id)
);

CREATE INDEX IF NOT EXISTS idx_grade ON historical_prop_results(grade);
CREATE INDEX IF NOT EXISTS idx_player_week ON historical_prop_results(player_name, week);
CREATE INDEX IF NOT EXISTS idx_graded ON historical_prop_results(graded_at);

ALTER TABLE historical_player_props ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_prop_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can read historical props" ON historical_player_props FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Service role manages historical props" ON historical_player_props FOR INSERT, UPDATE, DELETE USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Anyone can read prop results" ON historical_prop_results FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Service role grades props" ON historical_prop_results FOR INSERT, UPDATE, DELETE USING (auth.role() = 'service_role');
