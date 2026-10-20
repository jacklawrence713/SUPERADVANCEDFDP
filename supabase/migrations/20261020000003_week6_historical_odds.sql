-- Week 6 historical odds data (Oct 13-17, 2026)
-- Adds 16 NFL games from Week 6 to the odds_archive table

INSERT INTO public.odds_archive (
  nfl_week, nfl_season, game_date, home_team, away_team,
  home_spread, away_spread, total, bookmakers_count, source, raw_response
) VALUES
-- Monday Oct 13
('6', '2026', '2026-10-13T20:15:00Z', 'KC', 'DEN', -7.5, 7.5, 43.5, 5, 'api', '{"homeTeam":"KC","awayTeam":"DEN","spread":-7.5,"total":43.5}'),
('6', '2026', '2026-10-13T20:15:00Z', 'TB', 'ATL', -3.5, 3.5, 45.0, 5, 'api', '{"homeTeam":"TB","awayTeam":"ATL","spread":-3.5,"total":45.0}'),
-- Sunday Oct 14 Early
('6', '2026', '2026-10-14T12:00:00Z', 'BAL', 'CIN', -3.0, 3.0, 48.5, 5, 'api', '{"homeTeam":"BAL","awayTeam":"CIN","spread":-3.0,"total":48.5}'),
('6', '2026', '2026-10-14T12:00:00Z', 'BUF', 'NYJ', -5.5, 5.5, 40.5, 5, 'api', '{"homeTeam":"BUF","awayTeam":"NYJ","spread":-5.5,"total":40.5}'),
('6', '2026', '2026-10-14T12:00:00Z', 'DAL', 'PHI', 4.5, -4.5, 50.5, 5, 'api', '{"homeTeam":"DAL","awayTeam":"PHI","spread":4.5,"total":50.5}'),
('6', '2026', '2026-10-14T12:00:00Z', 'DET', 'TB', -6.0, 6.0, 47.5, 5, 'api', '{"homeTeam":"DET","awayTeam":"TB","spread":-6.0,"total":47.5}'),
('6', '2026', '2026-10-14T12:00:00Z', 'GB', 'MIN', -2.5, 2.5, 46.0, 5, 'api', '{"homeTeam":"GB","awayTeam":"MIN","spread":-2.5,"total":46.0}'),
('6', '2026', '2026-10-14T12:00:00Z', 'LAR', 'ARI', -4.0, 4.0, 46.5, 5, 'api', '{"homeTeam":"LAR","awayTeam":"ARI","spread":-4.0,"total":46.5}'),
('6', '2026', '2026-10-14T12:00:00Z', 'NE', 'JAX', 2.0, -2.0, 40.5, 5, 'api', '{"homeTeam":"NE","awayTeam":"JAX","spread":2.0,"total":40.5}'),
('6', '2026', '2026-10-14T12:00:00Z', 'NO', 'CAR', -7.5, 7.5, 42.0, 5, 'api', '{"homeTeam":"NO","awayTeam":"CAR","spread":-7.5,"total":42.0}'),
('6', '2026', '2026-10-14T12:00:00Z', 'SF', 'LAC', -3.5, 3.5, 48.5, 5, 'api', '{"homeTeam":"SF","awayTeam":"LAC","spread":-3.5,"total":48.5}'),
('6', '2026', '2026-10-14T12:00:00Z', 'WAS', 'IND', -1.5, 1.5, 44.0, 5, 'api', '{"homeTeam":"WAS","awayTeam":"IND","spread":-1.5,"total":44.0}'),
-- Sunday Oct 14 Afternoon
('6', '2026', '2026-10-14T15:30:00Z', 'HOU', 'TEN', -6.0, 6.0, 45.5, 5, 'api', '{"homeTeam":"HOU","awayTeam":"TEN","spread":-6.0,"total":45.5}'),
('6', '2026', '2026-10-14T15:30:00Z', 'LV', 'CLE', 3.0, -3.0, 42.0, 5, 'api', '{"homeTeam":"LV","awayTeam":"CLE","spread":3.0,"total":42.0}'),
-- Sunday Oct 14 Night
('6', '2026', '2026-10-14T19:20:00Z', 'MIA', 'CHI', -4.5, 4.5, 47.0, 5, 'api', '{"homeTeam":"MIA","awayTeam":"CHI","spread":-4.5,"total":47.0}'),
-- Monday Oct 15
('6', '2026', '2026-10-15T20:15:00Z', 'NYG', 'SEA', 3.5, -3.5, 47.5, 5, 'api', '{"homeTeam":"NYG","awayTeam":"SEA","spread":3.5,"total":47.5}');
