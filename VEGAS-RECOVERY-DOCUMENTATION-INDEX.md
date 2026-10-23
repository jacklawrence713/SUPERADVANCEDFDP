# VEGAS LINES RECOVERY — COMPLETE DOCUMENTATION

**Recovery Branch:** recovery/vegas-complete-v2
**Date:** 2026-10-22
**Analysis Status:** COMPLETE
**Implementation Status:** AWAITING DECISIONS
**Deployment Status:** NOT DEPLOYED

---

## DOCUMENTATION GENERATED

### 1. VEGAS-RECOVERY-PHASE3-INVENTORY.md
**Purpose:** Section-by-section audit of current Vegas implementation

**Contains:**
- Game Lines: ✅ WORKING
- Super Bowl: ✅ SHOWS DATA (hardcoded)
- Divisions: ✅ SHOWS DATA (hardcoded)
- Win Totals: ✅ SHOWS DATA (hardcoded)
- Awards: ✅ SHOWS DATA (hardcoded)
- Player Props: ❌ BROKEN (placeholder)
- Prior Weeks: ❌ BROKEN (placeholder)

**Key Finding:** Player Props and Prior Weeks tabs were NEVER fully implemented—they exist as UI shells only.

---

### 2. VEGAS-DATA-DOMAINS.md
**Purpose:** Define 6 independent data architectures for Vegas

**Defines:**
1. **CURRENT GAME ODDS** — Real-time Week 7 games (The Odds API) ✅
2. **NFL FUTURES** — Super Bowl, divisions, win totals, awards (currently hardcoded)
3. **CURRENT PLAYER PROPS** — Real-time player prop markets (UNKNOWN if available)
4. **HISTORICAL GAME RESULTS** — Weeks 1-6 final scores (data exists, not connected)
5. **HISTORICAL PLAYER PROPS** — Prior week props + grading (database doesn't exist)
6. **ACTUAL PLAYER STAT RESULTS** — Official NFL stats for grading (source not identified)

**Key Finding:** Each domain has different source, storage, fetch, and render requirements.

---

### 3. VEGAS-RECOVERY-STRATEGY.md
**Purpose:** Detailed recovery roadmap with phases and effort estimates

**Contains:**
- Phase A: Protect Game Lines (tests)
- Phase B: Connect Historical Game Results (UI)
- Phase C: Audit The Odds API (documentation)
- Phase D: Upgrade Futures (optional)
- Phase E: Design Historical Props (optional)

**Effort:**
- Phase A: LOW
- Phase B: LOW
- Phase C: MEDIUM
- Phase D: HIGH
- Phase E: HIGH

---

### 4. VEGAS-FINAL-STATUS-BEFORE-RECOVERY.md
**Purpose:** Comprehensive pre-implementation inventory with action items

**Contains:**
- Detailed status of each Vegas feature
- External data dependencies identified
- Database schema audit results
- Code locations for all Vegas components
- Success criteria
- **5 Critical Decisions Required Before Implementation**

**Key Finding:** Recovery is possible for features with real data (Game Lines, historical game results). Player Props and historical player props require external data sources.

---

## CURRENT STATE SUMMARY

### Working Features ✅
| Feature | Data | Status | Last Updated |
|---------|------|--------|--------------|
| Game Lines Week 7 | Real-time API | ✅ Functional | Real-time |
| Game Lines Weeks 1-6 | Hardcoded array | ✅ Functional | Oct 21, 2026 |
| Super Bowl | Hardcoded | ✅ Displays | Oct 21, 2026 |
| Divisions | Hardcoded | ✅ Displays | Oct 21, 2026 |
| Win Totals | Hardcoded | ✅ Displays | Oct 21, 2026 |
| Awards | Hardcoded | ✅ Displays | Oct 21, 2026 |

### Broken Features ❌
| Feature | Reason | Required to Fix |
|---------|--------|-----------------|
| Player Props | No data fetch | Audit The Odds API |
| Prior Weeks (Props) | No data storage | Create database schema + identify stats source |

### Placeholder Features ⚠️
| Feature | Should Show | Currently Shows |
|---------|-------------|-----------------|
| Prior Weeks (Games) | Final scores + ATS/O-U | "Historical data coming soon" |
| Player Props | Real prop lines | "Player props coming soon" |

---

## EXTERNAL DATA DEPENDENCIES

### Resolved (Currently Used):
- ✅ The Odds API for current NFL game odds/spreads/totals (live Week 7)
- ✅ Hardcoded PAST_WEEKS array for historical game results (Weeks 1-6)
- ✅ Hardcoded Super Bowl/Divisions/Win Totals/Awards data

### Unresolved (Blocking Features):
- ❓ The Odds API player props endpoint (unknown if available/supported)
- ❓ Player statistics source (NFL, ESPN, Pro Football Reference?) — NOT identified
- ❓ Historical props database schema — DOES NOT EXIST

---

## CRITICAL DECISIONS REQUIRED

### Decision 1: Real-Time Futures vs Hardcoded?
**Applies to:** Super Bowl, Divisions, Win Totals, Awards

**Option A: Keep Hardcoded**
- Pros: No additional API dependency, works now
- Cons: Data stale (Oct 21), requires manual refresh
- Effort: LOW (just update hardcoded values)

**Option B: Fetch Real-Time**
- Pros: Real odds, automatic refresh
- Cons: Depends on The Odds API supporting these markets
- Effort: MEDIUM (requires API audit + integration)

**Action:** Audit The Odds API documentation for these markets first

---

### Decision 2: Connect Prior Weeks Game Results?
**Applies to:** Prior Weeks tab (Game Results subtab)

**Option A: Connect**
- Pros: Low effort, uses existing data, provides value
- Cons: Requires UI modification (code already complex)
- Effort: LOW

**Option B: Leave as Placeholder**
- Pros: No code changes
- Cons: Tab remains non-functional
- Effort: ZERO

**Recommendation:** LOW EFFORT, HIGH VALUE — implement if safe

---

### Decision 3: Implement Player Props?
**Applies to:** Player Props tab + current/historical rendering

**Option A: Implement (if available)**
- Requires: The Odds API supports event-specific player props
- Requires: Identified all supported markets
- Requires: Database schema for current props
- Effort: HIGH

**Option B: Document Unavailable**
- Show meaningful message explaining limitation
- Effort: LOW

**Action:** Must audit The Odds API first

---

### Decision 4: Historical Player Props?
**Applies to:** Prior Weeks (Player Props Results subtab)

**Option A: Persist Future Props**
- Requires: Database schema creation
- Requires: Player stats source identification
- Requires: Grading logic
- Effort: HIGH
- Value: Medium-term feature

**Option B: Abandon**
- Accept that historical props not available
- Effort: ZERO
- Impact: Prior Weeks can only show game results, not props

**Action:** Design schema proposal (no migration) before deciding

---

### Decision 5: Which Player Stats Source?
**If** pursuing historical props, must identify:

**Candidates:**
- NFL official statistics (official but limited API)
- ESPN API (comprehensive but auth required)
- Pro Football Reference (scraping required)
- FanDuel/DraftKings (limited, requires auth)

**Action:** Identify best source, verify API access before schema design

---

## IMPLEMENTATION RECOMMENDATIONS

### Short-Term (Immediate, No External Decisions):
1. **Protect Game Lines**
   - Regression tests already exist
   - Verify all 2078 tests pass
   - Establish baseline before any changes

2. **Connect Prior Weeks Game Results (Optional)**
   - Low-effort feature to complete
   - Uses existing PAST_WEEKS data
   - Provides meaningful user value

### Medium-Term (Requires Audit):
1. **Audit The Odds API**
   - Player props endpoint support?
   - Futures markets support (Super Bowl, divisions, etc.)?
   - Event ID requirements?
   - Quota costs?
   - Bookmaker structure?

2. **Make Futures Decision**
   - Proceed with real-time fetch OR
   - Document static/hardcoded approach OR
   - Hybrid (fetch when available, fallback to hardcoded)

3. **Make Player Props Decision**
   - Implement if available OR
   - Document provider limitation

### Long-Term (Requires Schema Design & Stats Source):
1. **Design Historical Props Persistence**
   - Create migration proposal (do NOT apply yet)
   - Include: schema, indexes, RLS

2. **Identify Player Stats Source**
   - Audit available APIs
   - Verify access/cost
   - Design grading logic

---

## TEST RESULTS

✅ **All 2081 tests passing**
- 51 test files
- Vegas-specific tests:
  - `vegas-lines-rebuild.test.ts` (19 tests)
  - `vegas-lines-hotfix.test.ts` (21 tests)
  - `vegas-runtime-render.test.ts` (3 tests)

✅ **TypeScript check:** Passing
✅ **Build:** Successful (869 KB app bundle)
✅ **Schedule validation:** 32 teams, 18 weeks, 272 games

---

## FILES MODIFIED

**None yet.** Branch contains analysis documentation only.

---

## FILES READY TO MODIFY

When implementation proceeds:
- `afdp.tsx` (lines 8823-8825 for Player Props + Prior Weeks)
- `supabase/functions/fetch-odds/index.ts` (if fetching real-time futures)
- Database migrations (if creating historical props schema)

---

## NEXT STEP

**DO NOT PROCEED with implementation until:**

1. ✅ Game Lines protection baseline established
2. ⏳ Decision 1: Keep hardcoded futures or fetch real-time?
3. ⏳ Decision 2: Connect Prior Weeks games or leave as placeholder?
4. ⏳ Decision 3: Implement Player Props? (requires audit)
5. ⏳ Decision 4: Persist historical props? (requires schema)
6. ⏳ Decision 5: Player stats source identified?

Once user provides decisions, proceed with implementation phases.

---

## DEPLOYMENT READINESS

**Current Status:** NOT READY FOR DEPLOYMENT
- Analysis: ✅ Complete
- Recovery decisions: ⏳ Pending
- Implementation: ⏳ Not started
- Testing: ✅ Ready (2081 tests passing)

**Deploy when:**
- All decisions confirmed
- Implementation phases complete
- Regression tests passing
- All 2081+ tests passing
- TypeScript check passing
- Build successful
- Local UI verification complete

---

## RECOVERY SCOPE CONFIRMATION

**Confirmed Recoverable:**
- ✅ Game Lines (current + historical)
- ✅ Super Bowl display (hardcoded)
- ✅ Divisions display (hardcoded)
- ✅ Win Totals display (hardcoded)
- ✅ Awards display (hardcoded)
- ✅ Prior Weeks (game results display) — IF CHOSEN

**Confirmed NOT Recoverable (missing external data):**
- ❌ Player Props (requires The Odds API audit)
- ❌ Historical Player Props (requires database schema + stats source)

**Conditionally Recoverable (requires decisions):**
- 🔄 Real-time Futures (depends on API capability and business decision)
- 🔄 Historical Props (depends on schema design decision)

---

## SUMMARY

Vegas Lines recovery is technically feasible for all restorable features. The primary blockers are:

1. **External data decisions** (real-time vs hardcoded futures)
2. **API audit** (The Odds API player props support)
3. **Database design** (historical props persistence)
4. **Stats source** (player statistics provider)

All documentation necessary for implementation is complete. Awaiting user decisions to proceed.

