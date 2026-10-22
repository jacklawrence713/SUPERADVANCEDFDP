# HISTORICAL PLAYER PROPS SCHEMA PROPOSAL

**Status:** Design Phase (NO MIGRATION APPLIED)
**Date:** 2026-10-22
**Purpose:** Store weekly player prop lines and actual results for grading

---

## PROBLEM STATEMENT

Currently:
- Historical player props are NOT stored anywhere
- Week 1-6 prop data is lost (never persisted)
- Cannot grade historical props without stored line data
- Prior Weeks tab cannot show prop grading history

Solution:
- Create schema to persist weekly player props
- Implement grading logic (line vs actual)
- Enable Prior Weeks → Player Props Results view

---

## SCHEMA DESIGN

### Table 1: `historical_player_props`

Stores all player prop lines offered by sportsbooks for past weeks.

```sql
CREATE TABLE historical_player_props (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

  -- Identifiers
  week INT NOT NULL,                          -- NFL week (1-18)
  season INT NOT NULL,                        -- Season (2026)
  event_id TEXT NOT NULL,                     -- Game event ID from The Odds API

  -- Player Info
  player_id INT,                              -- FK to players.id (if exists)
  player_name TEXT NOT NULL,                  -- "Ja'Marr Chase"
  team TEXT NOT NULL,                         -- "CIN" (3-letter abbreviation)
  opponent TEXT NOT NULL,                     -- "KC" (opponent)
  position TEXT,                              -- "WR", "QB", "RB", "TE"

  -- Prop Market Details
  market_key TEXT NOT NULL,                   -- "player_rec_yds", "player_pass_yds", etc.
  market_display TEXT,                        -- "Receiving Yards", "Passing Yards", etc.
  line DECIMAL(5, 1) NOT NULL,                -- 78.5
  over_price INT,                             -- -110, +105, etc. (implied odds)
  under_price INT,

  -- Source & Bookmaker
  bookmaker TEXT NOT NULL,                    -- "draftkings", "fanduel", etc.
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- When we fetched this

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Indexes
  UNIQUE(event_id, player_name, market_key, bookmaker, week),
  INDEX idx_week_season (week, season),
  INDEX idx_player_market (player_name, market_key),
  INDEX idx_captured (captured_at),
  INDEX idx_event (event_id)
);
```

### Table 2: `historical_prop_results`

Stores actual player statistics and prop grades.

```sql
CREATE TABLE historical_prop_results (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

  -- Link to prop
  prop_id BIGINT NOT NULL REFERENCES historical_player_props(id) ON DELETE CASCADE,

  -- Identifiers (denormalized for query speed)
  week INT NOT NULL,
  season INT NOT NULL,
  player_name TEXT NOT NULL,
  market_key TEXT NOT NULL,

  -- Actual Statistic
  actual_value DECIMAL(7, 1),                 -- 96 (actual receiving yards)
  stat_source TEXT,                           -- "nfl.com", "espn.com", etc.
  stat_fetched_at TIMESTAMP WITH TIME ZONE,

  -- Grading
  grade TEXT,                                 -- "OVER", "UNDER", "PUSH", "DNP", "VOID", "RESULT_UNAVAILABLE"
  grade_logic TEXT,                           -- "actual (96) > line (78.5)" for transparency
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by TEXT,                             -- "system" or user ID

  -- Metadata
  player_participated BOOLEAN,                -- true if player played, false if DNP
  game_status TEXT,                           -- "final", "postponed", etc.
  notes TEXT,                                 -- "Player injured in Q2, left game"

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Indexes
  INDEX idx_grade (grade),
  INDEX idx_player_week (player_name, week),
  INDEX idx_graded (graded_at),
  UNIQUE(prop_id)
);
```

---

## ROW-LEVEL SECURITY (RLS)

### For `historical_player_props`:
```sql
-- Anyone can read (published historical data)
CREATE POLICY "Anyone can read historical props"
  ON historical_player_props
  FOR SELECT
  USING (true);

-- Only service_role (system) can insert/update
CREATE POLICY "Service role can insert/update props"
  ON historical_player_props
  FOR INSERT, UPDATE
  USING (auth.role() = 'service_role');
```

### For `historical_prop_results`:
```sql
-- Anyone can read (published results)
CREATE POLICY "Anyone can read prop results"
  ON historical_prop_results
  FOR SELECT
  USING (true);

-- Only service_role can insert/update
CREATE POLICY "Service role can grade props"
  ON historical_prop_results
  FOR INSERT, UPDATE
  USING (auth.role() = 'service_role');
```

---

## DATA RETENTION

### Historical Props (Line Data):
- Retained: 2 seasons (current + previous)
- Retention: Full accuracy important for grading
- Cleanup: Delete propositions older than 2 years (monthly batch)

### Prop Results (Grades):
- Retained: Indefinitely (historical record)
- Purpose: Accuracy tracking, model validation
- Cleanup: None (archive if needed)

---

## INDEXES & PERFORMANCE

```sql
-- Query patterns

-- Pattern 1: Fetch all props for a week
SELECT * FROM historical_player_props
WHERE week = 7 AND season = 2026
ORDER BY player_name;
-- Index: idx_week_season ✓

-- Pattern 2: Fetch props for specific player/market
SELECT * FROM historical_player_props
WHERE player_name = 'Ja\'Marr Chase' AND market_key = 'player_rec_yds';
-- Index: idx_player_market ✓

-- Pattern 3: Fetch with results (for Prior Weeks display)
SELECT
  pp.player_name, pp.team, pp.opponent, pp.market_display,
  pp.line, pr.actual_value, pr.grade
FROM historical_player_props pp
LEFT JOIN historical_prop_results pr ON pr.prop_id = pp.id
WHERE pp.week = 7 AND pp.season = 2026
ORDER BY pp.player_name;
-- Indexes: idx_week_season + single prop_id lookup ✓

-- Pattern 4: Grading accuracy (analytics)
SELECT
  market_key,
  COUNT(*) as total_props,
  SUM(CASE WHEN grade = 'OVER' THEN 1 ELSE 0 END) as overs,
  SUM(CASE WHEN grade = 'UNDER' THEN 1 ELSE 0 END) as unders,
  SUM(CASE WHEN grade = 'PUSH' THEN 1 ELSE 0 END) as pushes
FROM historical_prop_results
WHERE season = 2026
GROUP BY market_key;
-- Index: idx_grade ✓
```

---

## MIGRATION SQL (Ready But NOT Applied)

```sql
-- Create tables
CREATE TABLE historical_player_props (
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

CREATE INDEX idx_week_season ON historical_player_props(week, season);
CREATE INDEX idx_player_market ON historical_player_props(player_name, market_key);
CREATE INDEX idx_captured ON historical_player_props(captured_at);
CREATE INDEX idx_event ON historical_player_props(event_id);

CREATE TABLE historical_prop_results (
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

CREATE INDEX idx_grade ON historical_prop_results(grade);
CREATE INDEX idx_player_week ON historical_prop_results(player_name, week);
CREATE INDEX idx_graded ON historical_prop_results(graded_at);

-- Enable RLS
ALTER TABLE historical_player_props ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_prop_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies (see above)
CREATE POLICY "Anyone can read historical props" ...
CREATE POLICY "Service role can insert/update props" ...
CREATE POLICY "Anyone can read prop results" ...
CREATE POLICY "Service role can grade props" ...
```

---

## GRADING LOGIC

### Numeric Over/Under Props:
```typescript
function gradeProp(line: number, actual: number): string {
  if (actual === null || actual === undefined) return "RESULT_UNAVAILABLE";
  if (actual > line) return "OVER";
  if (actual < line) return "UNDER";
  if (Math.abs(actual - line) < 0.01) return "PUSH"; // floating point tolerance
  return "RESULT_UNAVAILABLE";
}
```

### Special Cases:
```typescript
function gradePlayerProp(
  line: number,
  actual: number | null,
  playerParticipated: boolean,
  gameStatus: string
): string {
  // Game status checks
  if (gameStatus !== "final") return "RESULT_UNAVAILABLE";

  // Participation checks
  if (!playerParticipated) return "DNP";  // Did Not Play
  if (actual === null) return "RESULT_UNAVAILABLE";

  // Void checks (provider must indicate)
  // (No auto-detection; rely on provider data)

  // Numeric comparison
  return (actual > line) ? "OVER" : (actual < line) ? "UNDER" : "PUSH";
}
```

---

## IMPLEMENTATION ROADMAP

### Phase 1: Schema Setup (NOT YET APPLIED)
- [ ] Create `historical_player_props` table
- [ ] Create `historical_prop_results` table
- [ ] Create indexes
- [ ] Enable RLS

### Phase 2: Persistence Layer (After Phase 1)
- [ ] Implement `persistPlayerProps()` function in fetch-odds
- [ ] Call after fetching live props (capture weekly snapshot)
- [ ] Store in historical_player_props with week/season/event_id

### Phase 3: Grading Layer (After Phase 2)
- [ ] Implement `fetchPlayerStats()` (identify source)
- [ ] Implement `gradePropResult()` function
- [ ] Schedule daily grade task (post-game, ~12 hours after kickoff)
- [ ] Store results in historical_prop_results

### Phase 4: UI (After Phase 3)
- [ ] Query historical_prop_results in Prior Weeks tab
- [ ] Render: Player, Market, Line, Actual, Grade
- [ ] Sort by week, player, market
- [ ] Add filters by market/player

---

## DECISION POINTS

### Before Applying Migration:
1. **Confirm** you want to persist historical props
2. **Identify** player stats source (NFL, ESPN, etc.)
3. **Verify** data retention policy acceptable
4. **Review** RLS policies meet security requirements

### Go/No-Go:
- **Go:** Apply migration, implement phases 1-4
- **No-Go:** Keep placeholder, document as "unavailable"

---

## STORAGE ESTIMATES

### Data Volume (Annual):
- Props per week: ~500 (varies by bookmaker coverage)
- Weeks per season: 18
- Seasons retained: 2
- **Total rows:** ~18,000 props + 18,000 results = 36,000 rows
- **Storage:** ~5-10 MB (well within Supabase free tier)

### Growth Rate:
- Per week: 500 rows (negligible)
- Monthly: 2,000 rows
- Annually: 18,000 rows (manageable)

---

## READY TO DEPLOY?

✅ **Schema Design:** Complete
✅ **RLS Policies:** Defined
✅ **Grading Logic:** Specified
✅ **Data Retention:** Planned
✅ **Indexes:** Optimized

⏳ **Awaiting:**
- [ ] Your approval to apply migration
- [ ] Player stats source identification
- [ ] Grading task scheduling decision

---

## MIGRATION APPLICATION COMMAND

**DO NOT RUN until approved:**

```bash
supabase db push  # If using Supabase migrations
# OR
supabase migration new create_historical_props_schema
supabase db push
```

**This design is ready for review. No changes will be applied without explicit approval.**

