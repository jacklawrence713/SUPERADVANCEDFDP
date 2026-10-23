# PHASE 3 — CURRENT VEGAS INVENTORY

**Date:** 2026-10-22
**Branch:** recovery/vegas-complete-v2
**Current Commit:** 6e090aa (master trade analysis fix)

## Summary

Currently: Game Lines works. All other sections show placeholder text or empty state.

---

## SECTION-BY-SECTION ANALYSIS

### 1. GAME LINES

**UI exists:** YES (lines 8670+)

**Current behavior:**
- Week 7: Button to "Load Live Odds" from The Odds API
- Weeks 1-6: Displays historical data from PAST_WEEKS hardcoded array
- Shows away @ home, spread, O/U
- Respects bye weeks filtering

**Data request exists:** YES
- `fetchVegasOdds()` called via "Load Live Odds" button
- Provides real data from The Odds API

**Real data source exists:** YES
- The Odds API (current week)
- PAST_WEEKS hardcoded array (prior weeks)

**Data returned:** YES (via oddsResponse.odds object)

**Render path connected:** YES

**Historical implementation found:** YES
- Commit f329dc5: Vegas Lines rebuild - complete tab functionality with prior weeks
- Commit 105bca8: Complete Vegas Lines rebuild Phase 2

**Status:** ✅ WORKING

---

### 2. SUPER BOWL

**UI exists:** YES (line 8762+)

**Current UI rendering:** Displays (vd.superBowl||[]).map(...)

**Data request exists:** YES
- vegasData returned from fetchVegasOdds()

**Real data source exists:** YES (but STATIC)
- fetch-odds returns SUPER_BOWL_ODDS hardcoded array
- Contains: KC +550, BUF +750, DET +950, SF +1050, PHI +1100, DAL +1400, CIN +1600, BAL +1800

**Data returned:** YES (via oddsResponse.vegasData.superBowl)

**Render path connected:** YES

**Historical implementation found:** YES
- Commit 55d4615: Add Vegas data infrastructure
- Commit 1ce5306: fix: add vegasData to initial state

**Status:** ✅ SHOWS DATA (but hardcoded static odds, not real-time futures)

---

### 3. DIVISIONS

**UI exists:** YES (line 8776+)

**Current UI rendering:** Displays all 8 divisions with (vd.divisions||[]).map(...)

**Data request exists:** YES

**Real data source exists:** YES (but STATIC)
- fetch-odds returns DIVISION_ODDS hardcoded array with all 8 divisions and teams

**Data returned:** YES (via oddsResponse.vegasData.divisions)

**Render path connected:** YES

**Historical implementation found:** YES
- Commit 55d4615: Add Vegas data infrastructure

**Status:** ✅ SHOWS DATA (but hardcoded static odds, not real-time division futures)

---

### 4. WIN TOTALS

**UI exists:** YES (line 8794+)

**Current UI rendering:** Displays teams with (vd.winTotals||[]).map(...)

**Data request exists:** YES

**Real data source exists:** YES (but STATIC)
- fetch-odds returns WIN_TOTALS hardcoded array with OVER/UNDER lines

**Data returned:** YES (via oddsResponse.vegasData.winTotals)

**Render path connected:** YES

**Historical implementation found:** YES
- Commit 55d4615: Add Vegas data infrastructure

**Status:** ✅ SHOWS DATA (but hardcoded static lines, not real-time season win totals)

---

### 5. AWARDS

**UI exists:** YES (line 8809+)

**Current UI rendering:** Displays awards with (vd.awards||[]).map(...)

**Data request exists:** YES

**Real data source exists:** YES (but STATIC)
- fetch-odds returns AWARDS_ODDS hardcoded array
- Contains MVP and DPOY awards with candidates and odds

**Data returned:** YES (via oddsResponse.vegasData.awards)

**Render path connected:** YES

**Historical implementation found:** YES
- Commit 55d4615: Add Vegas data infrastructure

**Status:** ✅ SHOWS DATA (but hardcoded static odds, not real-time award futures)

---

### 6. PLAYER PROPS

**UI exists:** YES (line 8823)

**Current UI rendering:** "Player props coming soon"

**Data request exists:** PARTIALLY
- fetchVegasOdds() does NOT fetch player props separately from The Odds API

**Real data source exists:** UNKNOWN
- The Odds API MAY support player props endpoint (requires event ID)
- No code currently fetches props

**Data returned:** NO

**Render path connected:** YES (but placeholder only)

**Historical implementation found:** YES
- Commit 8483156: populate Vegas Lines with all data - Player Props

**Status:** ❌ BROKEN — Shows "coming soon" placeholder only

---

### 7. PRIOR WEEKS (History Tab)

**UI exists:** YES (line 8825)

**Current UI rendering:** "Historical data coming soon"

**Data request exists:** NO
- No separate fetch for historical prop data

**Real data source exists:** PARTIAL
- PAST_WEEKS has game lines/results, NO player props data

**Data returned:** NO

**Render path connected:** YES (but placeholder only)

**Historical implementation found:** YES
- Commit 8483156: populate Vegas Lines with all data

**Status:** ❌ BROKEN — Shows "coming soon" placeholder only

---

## CRITICAL FINDINGS

### What Works:
1. Game Lines ✅
2. Super Bowl ✅ (hardcoded static)
3. Divisions ✅ (hardcoded static)
4. Win Totals ✅ (hardcoded static)
5. Awards ✅ (hardcoded static)

### What's Broken:
1. **Player Props** — Placeholder only, no data fetched or stored
2. **Prior Weeks History** — Placeholder only, no historical props database

### Architecture Issues:

1. **Static Futures** — Super Bowl, Divisions, Win Totals, Awards are hardcoded, not from real sportsbook API
2. **Missing Props** — No infrastructure for current or historical player props
3. **PAST_WEEKS** — Only contains game lines/scores, not player props

---

## NEXT ACTION

Proceed to Phase 4: Define 6 real data domains based on these findings.

