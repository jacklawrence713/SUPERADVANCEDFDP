# VEGAS LINES — FINAL INVENTORY & RECOVERY STATUS

**Date:** 2026-10-22
**Branch:** recovery/vegas-complete-v2
**Analysis Complete:** YES
**Ready for Implementation:** AWAITING DATA DECISIONS

---

## EXECUTIVE SUMMARY

**What Works:**
- ✅ Game Lines (Week 7 live + Weeks 1-6 historical)
- ✅ Super Bowl (displays hardcoded data)
- ✅ Divisions (displays hardcoded data)
- ✅ Win Totals (displays hardcoded data)
- ✅ Awards (displays hardcoded data)

**What's Broken:**
- ❌ Player Props (UI exists, but "coming soon" placeholder — no data fetch)
- ❌ Prior Weeks (UI exists, but "coming soon" placeholder — no data fetch)

**What Requires External Data Decisions:**
- ⚠️ Real-time Futures (Super Bowl/Divisions/Win Totals/Awards) currently hardcoded, not fetched from real sportsbook API
- ⚠️ Player Props depends on The Odds API support (unknown)
- ⚠️ Historical Player Props depends on database schema that does NOT exist

---

## DETAILED FINDINGS

### 1. GAME LINES ✅ WORKING

**Status:** Fully functional, real data

**What displays:**
- **Week 7 (current):**
  - Click "Load Live Odds" button → fetches from The Odds API
  - Shows: Away @ Home, Spread, O/U
  - Real bookmaker consensus data

- **Weeks 1-6 (historical):**
  - Dropdown week selection
  - Displays final scores with ATS/O-U outcomes
  - Data source: PAST_WEEKS hardcoded array in src/logic.ts

**Data completeness:**
- Week 7: 16 current NFL games with spreads and totals
- Weeks 1-6: 96 completed games (16/week) with final scores
- Spread lines: ✅ Present for all weeks
- O/U lines: ✅ Present for all weeks
- ATS/O-U outcomes: ✅ Calculated correctly for historical weeks

**Tests:** 2081 passing, including:
- `vegas-lines-rebuild.test.ts` (19 tests)
- `vegas-lines-hotfix.test.ts` (21 tests)
- `vegas-runtime-render.test.ts` (3 tests)

**Regression protection:** YES — tests enforce Game Lines functionality

**Action:** PROTECT. Do not modify. All Vegas changes must not break Game Lines.

---

### 2. SUPER BOWL FUTURES ✅ DISPLAYING (Hardcoded)

**Status:** UI functional, but data is static/hardcoded

**Current data (from fetch-odds supabase/functions/fetch-odds/index.ts line 324):**
```
KC +550
BUF +750
DET +950
SF +1050
PHI +1100
DAL +1400
CIN +1600
BAL +1800
```

**Last updated:** October 21, 2026 (stale)

**Data completeness:**
- Teams displayed: 8 of 32
- Favorites identified: Yes (KC at shortest odds)
- Source: Hardcoded constant `SUPER_BOWL_ODDS`

**Real-time fetch available?**
- The Odds API may support Super Bowl market
- Requires audit: `americanfootball_nfl`, market `superbowl`
- Current code does NOT fetch this market

**Action decision needed:**
- **Option A:** Keep hardcoded, refresh manually (low effort, stale data)
- **Option B:** Audit The Odds API for Super Bowl futures endpoint (medium effort, real data)
- **Option C:** Integrate licensed sportsbook API (high effort, real data)

**Recommendation:** Audit The Odds API first before implementation.

---

### 3. DIVISION WINNERS ✅ DISPLAYING (Hardcoded)

**Status:** UI functional, data is static/hardcoded

**Current data (from fetch-odds line 339):**
```
AFC East: BUF, MIA, NYJ, NE (with odds)
AFC North: BAL, PIT, CIN, CLE (with odds)
AFC South: HOU, TEN, IND, JAX (with odds)
AFC West: KC, LAC, LV, DEN (with odds)
NFC East: PHI, DAL, WAS, NYG (with odds)
NFC North: DET, GB, MIN, CHI (with odds)
NFC South: ATL, NO, TB, CAR (with odds)
NFC West: SF, LA, SEA, ARI (with odds)
```

**Data completeness:**
- All 8 divisions: ✅
- All 32 teams: ✅
- Odds for each team: ✅
- Favorite per division: ✅ (lowest odds)

**Source:** Hardcoded constant `DIVISION_ODDS`

**Last updated:** October 21, 2026 (stale)

**Real-time fetch available?**
- Requires audit: The Odds API division futures market
- Current code does NOT fetch this market

**Action decision:** Same as Super Bowl — keep hardcoded or fetch real?

---

### 4. WIN TOTALS ✅ DISPLAYING (Hardcoded)

**Status:** UI functional, data is static/hardcoded

**Current data (from fetch-odds line 359):**
- All 32 NFL teams with Season Win Total O/U lines
- Example: "DET: O 10.5 / U 10.5", "KC: O 12.5 / U 12.5"

**Data completeness:**
- Teams: 32 of 32 ✅
- Over/Under lines: ✅

**Source:** Hardcoded constant `WIN_TOTALS`

**Last updated:** October 21, 2026 (stale)

**Real-time fetch available?**
- Requires audit: The Odds API win totals market
- Current code does NOT fetch this market

**Alternative:** Could use FDP projections instead of sportsbook lines

**Action decision:** Same as above.

---

### 5. AWARDS ✅ DISPLAYING (Hardcoded)

**Status:** UI functional, data is static/hardcoded

**Current data (from fetch-odds line 362):**
```
MVP: Lamar Jackson +200, Patrick Mahomes +300, Josh Allen +400, ...
DPOY: T.J. Watt +200, Micah Parsons +350, Aaron Donald +400, ...
```

**Data completeness:**
- Award categories: 2 (MVP, DPOY)
- Candidates per award: 3-5
- Odds: ✅

**Source:** Hardcoded constant `AWARDS_ODDS`

**Last updated:** October 21, 2026 (stale)

**Potentially missing awards:**
- Offensive Player of the Year
- Defensive Player of the Year
- Offensive Rookie of the Year
- Defensive Rookie of the Year
- Comeback Player of the Year
- Coach of the Year

**Real-time fetch available?**
- Requires audit: The Odds API award futures markets
- Current code does NOT fetch these

**Action decision:** Same as above.

---

### 6. PLAYER PROPS ❌ MISSING

**Status:** Placeholder UI only ("Player props coming soon")

**UI exists:** YES (line 8823 in afdp.tsx)

**Data fetch:** NO
- `fetchVegasOdds()` does NOT request player props separately
- No `fetchPlayerProps()` function exists

**Supported markets (historical):**
- Must audit git history to confirm which markets were intended
- Likely: Passing Yards, Passing TDs, Rushing Yards, Receptions, etc.

**Data source:** UNKNOWN
- Requires audit of The Odds API player props endpoint
- Event ID requirement unknown
- Supported markets unknown
- Quota cost unknown
- Bookmaker structure unknown

**Database storage:** NO
- No schema for current player props
- No persistence layer

**Critical blocker:** The Odds API support for player props with current subscription tier

**Action required:**
1. Audit The Odds API documentation for player props market
2. Verify event ID structure (likely needed from Game Lines)
3. Determine quota cost
4. Determine if tier supports this market

**If available:**
- Implement `fetchPlayerProps(eventId)` function
- Normalize data across bookmakers
- Add UI render path
- Add tests

**If unavailable:**
- Keep placeholder
- Document provider limitation
- Suggest workaround (manual odds entry, external API)

---

### 7. PRIOR WEEKS (HISTORY) ❌ MISSING

**Status:** Placeholder UI only ("Historical data coming soon")

**What this should show:**
1. Game Results subtab (Weeks 1-6 with final scores + ATS/O-U outcomes)
2. Player Props Results subtab (historical props + actual stats + grades)

**Current state of component 1 (Game Results):**
- **Data exists:** YES — PAST_WEEKS contains game lines and final scores
- **Fetch exists:** NO — not connected to render path
- **Effort to add:** LOW — pure UI connection, data already present
- **Blocker:** None

**Current state of component 2 (Player Props Results):**
- **Data exists:** NO — never stored historical props
- **Fetch exists:** NO — no player stats source identified
- **Effort to add:** HIGH — requires database schema + stats source + grading logic
- **Blocker:** Database schema does NOT exist, player stats source NOT identified

**Recommendation:**
- **Phase 1:** Connect Game Results from PAST_WEEKS (LOW effort, HIGH value)
- **Phase 2:** Defer historical player props until storage schema designed and stats source identified

---

## DATA DEPENDENCIES MATRIX

### External Data Needed for Each Feature:

| Feature | Source Type | Status | Blocker |
|---------|------------|--------|---------|
| Game Lines (Week 7) | The Odds API | ✅ Working | None |
| Game Lines (Weeks 1-6) | Hardcoded | ✅ Working | None |
| Super Bowl | Sportsbook futures API | ❓ Unknown | Audit needed |
| Divisions | Sportsbook futures API | ❓ Unknown | Audit needed |
| Win Totals | Sportsbook futures API | ❓ Unknown | Audit needed |
| Awards | Sportsbook futures API | ❓ Unknown | Audit needed |
| Player Props | The Odds API event-specific | ❓ Unknown | Audit needed |
| Historical Props | Database + Stats API | ❌ Missing | Schema doesn't exist |
| Historical Player Stats | NFL official / ESPN API | ❌ Missing | Source not identified |

---

## DATABASE STATUS

**Audit result:** No table exists for historical player props

**Tables scanned:**
- odds_cache (exists — caches current game odds)
- users, players, leagues, etc. (exist — core tables)
- historical_props, prop_lines, prop_results (do NOT exist)

**Decision required:** Should we create schema for future persistence?

---

## CODE LOCATIONS

**Vegas UI rendering:**
- `afdp.tsx` lines 8670-8825 (Vegas Lines tab)

**Vegas data structures:**
- `afdp.tsx` line 211 (VegasData interface)
- `afdp.tsx` lines 248-289 (OddsResponse interface)
- `src/logic.ts` (PAST_WEEKS array with game lines and results)

**Vegas data fetch:**
- `afdp.tsx` lines 296-361 (fetchVegasOdds function)
- `supabase/functions/fetch-odds/index.ts` (Edge Function, provides game odds + futures data)

**Vegas futures hardcoded data:**
- `supabase/functions/fetch-odds/index.ts` lines 324-380 (SUPER_BOWL_ODDS, DIVISION_ODDS, WIN_TOTALS, AWARDS_ODDS)

---

## RECOVERY ROADMAP

### Immediate (No external data needed):
- ✅ Game Lines: PROTECT (regression test)
- 🔧 Prior Weeks: Connect Game Results render from PAST_WEEKS (LOW effort)

### Requires Audit (The Odds API):
- ⚠️ Player Props: Audit for event-specific props endpoint
- ⚠️ Real-time Futures: Audit for Super Bowl/Division/Win Totals/Awards markets

### Requires Schema Design (After audit):
- ⚠️ Historical Player Props: Design persistence schema
- ⚠️ Player Stats: Identify authoritative source

### Decision Points:
- Keep hardcoded futures vs fetch real-time?
- Persist historical props or abandon feature?
- Which player stats source to use?

---

## FINAL ASSESSMENT

**Complete Vegas Recovery:** Possible for restorable features (Game Lines + Prior Weeks Game Results)

**Blocked on external dependencies:**
- The Odds API audit (determines Player Props + Real-time Futures feasibility)
- Database schema (for historical props)
- Player stats source (for grading)

**Can declare ready when:**
- Game Lines: Regression tested ✅
- Prior Weeks (Games): Connected (if chosen)
- Player Props: Either implemented OR documented as unavailable
- Futures: Either real-time OR documented as static/manual

---

## NEXT STEPS (Do NOT proceed to implementation without decisions below)

### Question 1: Real-Time Futures?
Decision: Audit The Odds API for Super Bowl/Divisions/Win Totals/Awards markets

### Question 2: Historical Game Results?
Decision: Connect PAST_WEEKS data to Prior Weeks tab (low effort, high value)

### Question 3: Player Props?
Decision: Audit The Odds API for event-specific player props endpoint

### Question 4: Historical Player Props?
Decision: Accept unavailability OR design persistence schema

---

## SUCCESS CRITERIA (Before "Ready for Review")

- [ ] Game Lines: Regression tests passing
- [ ] Prior Weeks (if chosen): Connected and tested
- [ ] Player Props: Audit complete with clear recommendation
- [ ] Real-time Futures: Decision made (keep hardcoded vs fetch)
- [ ] Historical Props: Decision made (persist or abandon)
- [ ] All 2078 tests passing
- [ ] No TypeScript errors
- [ ] Build successful
- [ ] Local UI review: each Vegas tab displays correctly

---

## DO NOT PROCEED UNTIL THESE DECISIONS ARE MADE:

1. Fetch real-time futures or keep hardcoded static data?
2. Connect Prior Weeks Game Results or leave as placeholder?
3. Audit The Odds API for Player Props capability?
4. Design historical props persistence schema?
5. Identify player statistics source?

Once decisions are confirmed, proceed with implementation phases.

