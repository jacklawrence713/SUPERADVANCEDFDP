# VEGAS DATA DOMAINS — 6 SEPARATE ARCHITECTURES

## Overview

Vegas Lines currently treats all data as one `vegasData` blob. This should be separated into 6 independent domains, each with its own source, fetch path, normalization, and render logic.

---

## DOMAIN 1: CURRENT GAME ODDS

**What it is:**
Real-time NFL game lines for the current week (this week's games)

**UI Section:**
GAME LINES tab, Week 7 (current week)

**Authoritative Source:**
The Odds API (sport: americanfootball_nfl, markets: spreads, totals)

**Data Fetch Path:**
`fetchVegasOdds()` → The Odds API → normalize spreads/totals

**Normalized Model:**
```typescript
interface GameOdds {
  awayTeam: string;
  homeTeam: string;
  spread: number | null;    // home team spread (negative = underdog)
  total: number | null;     // combined o/u line
  opp: string;              // opponent abbreviation
  eventId: string;
  commenceTime: string;
  spreadBookmakers: number;
  totalBookmakers: number;
  capturedAt: string;
}
```

**Current State:**
✅ Working properly — Real data from The Odds API

**Completeness:**
- All 16 current-week games returned
- Spread present for all or most
- O/U present for all or most

---

## DOMAIN 2: NFL FUTURES

**What it is:**
Full-season futures: Super Bowl winner, division winner, season win totals, season awards (MVP, DPOY, etc.)

**UI Sections:**
- SUPER BOWL tab
- DIVISIONS tab
- WIN TOTALS tab
- AWARDS tab

**Authoritative Source:**
⚠️ CURRENTLY HARDCODED — should be The Odds API or licensed sportsbook futures

**Potential Sources:**
1. The Odds API (`sports/americanfootball_nfl`, markets: `superbowl`, `division`, `win_totals`, `awards`)
2. Licensed sportsbook API (DraftKings, FanDuel, etc.)
3. Manual odds entry + daily refresh

**Desired Normalized Model:**
```typescript
interface SuperBowlOdds {
  team: string;
  odds: number;           // american odds (+550, +750, etc.)
  probability?: number;   // derived
  impliedProb?: number;   // calculated
}

interface DivisionOdds {
  division: string;       // "AFC East", "NFC West", etc.
  teams: Array<{
    team: string;
    odds: number;
    probability?: number;
  }>;
}

interface WinTotalOdds {
  team: string;
  over: number;
  under: number;
  overPrice?: number;      // -115, +105, etc.
  underPrice?: number;
  predictedWins?: number;  // what FDP projects
}

interface AwardOdds {
  award: string;           // "MVP", "DPOY", etc.
  candidates: Array<{
    player: string;
    team?: string;
    odds: number;
  }>;
}
```

**Current State:**
❌ Hardcoded static data in fetch-odds Edge Function
- Last updated: October 21, 2026 (stale)
- No real-time futures fetch

**Decision Required:**
1. Fetch real futures from The Odds API?
2. Keep hardcoded and refresh manually?
3. Hybrid: fetch when possible, fallback to hardcoded?

**Completeness if fetched:**
- Super Bowl: 32 teams expected
- Divisions: 8 divisions × 4 teams = 32 teams
- Win Totals: 32 teams expected
- Awards: unknown number of award categories

---

## DOMAIN 3: CURRENT PLAYER PROPS

**What it is:**
Real-time player prop markets for THIS WEEK's games (e.g., "Lamar Jackson passing yards over 275.5")

**UI Section:**
PLAYER PROPS tab (when selecting current week)

**Authoritative Source:**
The Odds API (requires per-event player props endpoint)

**Data Fetch Path:**
NOT CURRENTLY IMPLEMENTED
- Would need: `fetchPlayerProps()` function
- For each live game, fetch event ID
- Call The Odds API player props endpoint
- Normalize across bookmakers

**Desired Normalized Model:**
```typescript
interface PlayerProp {
  week: number;
  eventId: string;
  game: string;                // "BAL @ KC"
  player: string;
  team: string;
  position?: string;           // QB, RB, WR, TE
  opponent: string;
  market: string;              // "passing_yards", "receptions", etc.
  line: number;
  overPrice: number;           // -110, -115, etc.
  underPrice: number;
  bookmaker: string;           // which sportsbook
  capturedAt: string;
}
```

**Supported Markets (to be confirmed from git history):**
- Passing Yards
- Passing TDs
- Passing Attempts
- Completions
- Interceptions
- Rushing Yards
- Rushing Attempts
- Receiving Yards
- Receptions
- Receiving TDs
- Anytime TD
- Longest Reception / Rush
- (others TBD from historical implementation)

**Current State:**
❌ Missing entirely — Shows "coming soon" placeholder

**Decision Required:**
1. Does The Odds API support player props with current subscription?
2. What event ID structure does it use?
3. How many markets are supported?

**Completeness:**
Unknown — requires provider audit

---

## DOMAIN 4: HISTORICAL GAME RESULTS

**What it is:**
Final scores and game results for completed NFL weeks (Weeks 1-6)

**UI Section:**
PRIOR WEEKS tab → Game Results subtab

**Authoritative Source:**
PAST_WEEKS hardcoded array in logic.ts (or could source from NFL official API)

**Data Fetch Path:**
Read from PAST_WEEKS structure:
```typescript
[
  {
    week: 1,
    lines: [[away, home, spread, total], ...],
    results: {
      "BAL-KC": [13, 19],  // away score, home score
      ...
    }
  },
  ...
]
```

**Normalized Model:**
```typescript
interface GameResult {
  week: number;
  awayTeam: string;
  homeTeam: string;
  awayScore: number;
  homeScore: number;
  status: "final" | "postponed" | "cancelled";
  spreadLine?: number;
  spreadOutcome?: "cover" | "push" | "loss";
  totalLine?: number;
  totalOutcome?: "over" | "push" | "under";
  kickoffTime?: string;
  venue?: string;
}
```

**Current State:**
✅ Data exists in PAST_WEEKS
❌ UI shows "Historical data coming soon" — not connected to rendering

**Completeness:**
- Week 1: 16 games
- Week 2: 16 games
- ...
- Week 6: 16 games
- Total: 96 completed games with scores and odds

**Next Step:**
Connect PAST_WEEKS.results to render path for Prior Weeks tab

---

## DOMAIN 5: HISTORICAL PLAYER PROPS & RESULTS

**What it is:**
Player prop lines from completed weeks + actual player stats to grade props

**UI Section:**
PRIOR WEEKS tab → Player Prop Results subtab

**Authoritative Source:**
⚠️ DOES NOT EXIST YET
- Needs: database table to store historical props
- Needs: actual player statistics source to grade them

**Desired Normalized Model:**
```typescript
interface HistoricalPlayerProp {
  week: number;
  season: number;           // 2026
  eventId: string;
  player: string;
  team: string;
  opponent: string;
  position: string;
  market: string;           // "passing_yards", etc.
  line: number;
  overPrice: number;
  underPrice: number;
  bookmaker: string;
  capturedAt: string;

  // Grading (added after game is final)
  actualValue?: number;     // e.g., actual passing yards = 285
  grade?: "OVER" | "UNDER" | "PUSH" | "DNP" | "VOID" | "RESULT_UNAVAILABLE";
  gradedAt?: string;
}
```

**Grading Logic:**
- OVER: actual > line
- UNDER: actual < line
- PUSH: actual === line
- DNP: Player did not participate (must verify from game data)
- VOID: Market was voided (must verify from sportsbook)
- RESULT_UNAVAILABLE: No actual stat found

**Current State:**
❌ Missing entirely
- No historical props stored
- No actual player stats fetched
- No grading logic

**Decision Required:**
1. Where to store historical props? (New database table?)
2. Where to get actual player stats? (NFL official API? ESPN API? Pro Football Reference?)
3. Should we persist props for future weeks, or only retain what was already stored?

**Completeness:**
- Week 1-6 historical props: UNKNOWN (may not have been persisted)
- Actual player stats: UNKNOWN (source not identified)

---

## DOMAIN 6: ACTUAL PLAYER STAT RESULTS

**What it is:**
Official NFL player statistics for grading historical props

**Sources:**
- NFL official stats
- ESPN API
- Pro Football Reference
- (to be identified from codebase)

**Needed Stats:**
- Passing Yards, TDs, Completions, Attempts, Interceptions
- Rushing Yards, Attempts
- Receiving Yards, Receptions, TDs
- Longest plays
- TD type (rushing, receiving, etc.)
- Game status (played, DNP, inactive)

**Model:**
```typescript
interface PlayerStats {
  week: number;
  season: number;
  player: string;
  team: string;
  position: string;
  opponent: string;

  // Passing
  passingYards?: number;
  passingTouchdowns?: number;
  interceptions?: number;
  passingAttempts?: number;
  completions?: number;

  // Rushing
  rushingYards?: number;
  rushingAttempts?: number;

  // Receiving
  receivingYards?: number;
  receptions?: number;
  receivingTouchdowns?: number;

  // Other
  longestReception?: number;
  longestRush?: number;
  anytimeTouchdown?: boolean;

  // Status
  played: boolean;
  gameStatus: "final" | "postponed";
  capturedAt: string;
}
```

**Current State:**
❌ No identified source in codebase
- No fetch function for player stats
- No storage
- No grading integration

**Decision Required:**
1. Which official source to use?
2. Real-time fetch or post-game batch?
3. Where to store?

**Completeness:**
Unknown — requires identification of source

---

## DOMAIN SUMMARY TABLE

| Domain | Source | Storage | Fetch | Render | Status |
|--------|--------|---------|-------|--------|--------|
| 1. Current Game Odds | The Odds API | Memory + DB cache | Real-time | ✅ Connected | ✅ Working |
| 2. NFL Futures | Hardcoded | fetch-odds function | Manual/Static | ✅ Connected | ❌ Static |
| 3. Current Player Props | The Odds API (TBD) | Memory | NOT IMPLEMENTED | ❌ Placeholder | ❌ Missing |
| 4. Historical Game Results | PAST_WEEKS array | logic.ts | Load from array | ❌ Not connected | ❌ Placeholder |
| 5. Historical Props + Grading | Database (TBD) | (Does not exist) | NOT IMPLEMENTED | ❌ Placeholder | ❌ Missing |
| 6. Player Stats | Unknown | Unknown | NOT IMPLEMENTED | N/A | ❌ Missing |

---

## ARCHITECTURE DECISIONS

### For Real Futures (Domain 2):
**Option A: Real-time fetch**
- Fetch Super Bowl, divisions, win totals, awards from The Odds API
- Update every 1-6 hours
- Pro: Real data, current odds
- Con: Requires The Odds API to support these markets

**Option B: Keep hardcoded**
- Keep current hardcoded structure
- Update manually 1-2× per week
- Pro: No additional API dependency
- Con: Stale data, requires manual refresh

**Recommendation:** Determine if The Odds API supports these markets in current subscription tier first.

### For Player Props (Domain 3):
**Required:**
1. Audit The Odds API player props endpoint
2. Identify event ID structure
3. Determine quota cost
4. Implement `fetchPlayerProps()` function

### For Historical Grading (Domain 5):
**Required:**
1. Audit whether Weeks 1-6 props were ever persisted
2. If not persisted, decide: restore historical or start from Week 7?
3. Identify player stats source
4. Design database migration if needed

---

## NEXT PHASES

- Phase 5: Protect Game Lines (regression test)
- Phase 6: Decide on Futures strategy (real vs static)
- Phase 10-11: Implement Player Props
- Phase 15-18: Decide on Historical Props + Grading

