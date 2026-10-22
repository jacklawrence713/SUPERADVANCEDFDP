# PLAYER STATISTICS INTEGRATION — ARCHITECTURE & OPTIONS

**Status:** Infrastructure Design (Ready for Source Selection)
**Purpose:** Fetch actual NFL player statistics for prop grading

---

## STATISTICS NEEDED

For prop grading, we need actual game statistics:

### Passing (QB):
- Passing Yards
- Passing Touchdowns
- Passing Attempts
- Completions
- Interceptions

### Rushing (RB, QB):
- Rushing Yards
- Rushing Attempts
- Rushing Touchdowns

### Receiving (WR, TE, RB):
- Receiving Yards
- Receptions (catches)
- Receiving Touchdowns
- Longest Reception

### Defensive (DL, LB, DB):
- Sacks
- Tackles
- Passes Defended (DBs)
- Interceptions

### Game Status:
- Did player participate (played vs DNP)
- Game status (final, postponed, etc.)

---

## DATA SOURCE OPTIONS

### Option 1: ESPN API (Recommended)
**Pros:**
- Comprehensive statistics
- Real-time updates
- Well-documented endpoints
- Covers all positions

**Cons:**
- Requires API key (free tier available)
- Rate limits apply
- Authentication needed

**Endpoint Pattern:**
```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{teamId}/players
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates={date}
```

**Implementation:**
```typescript
async function fetchPlayerStatsFromESPN(
  playerId: string,
  date: string
): Promise<PlayerStats> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/players/${playerId}`;
  const res = await fetch(url);
  const data = await res.json();
  return normalizeESPNStats(data);
}
```

**Status:** 🟢 RECOMMENDED - Use ESPN official API

---

### Option 2: NFL Official API (nfl.com)
**Pros:**
- Official source
- Most authoritative
- Complete coverage

**Cons:**
- Limited/no public API
- Data available via web scraping only
- Terms of service restrictions

**Implementation:** Not recommended (legal/ToS concerns)

---

### Option 3: Pro Football Reference (pro-football-reference.com)
**Pros:**
- Accurate historical data
- Well-structured HTML
- Covers all seasons

**Cons:**
- Requires web scraping
- Slow (HTML parsing)
- ToS may restrict automated access

**Implementation:** Not recommended (performance + legal)

---

### Option 4: Sports Data APIs (Third-Party)
**Options:**
- SportRadar API (paid)
- Stats Perform API (paid)
- BetMGM/FanDuel data (partner access)

**Pros:**
- Professional grade
- Real-time updates
- Official partnerships

**Cons:**
- Requires paid subscription
- May be expensive

**Status:** 🟡 EXPENSIVE - Consider if ESPN fails

---

## RECOMMENDED IMPLEMENTATION

### Source: ESPN API (Free Tier)
**Why:** Free, comprehensive, widely-used, no authentication for public endpoints

**Architecture:**

```typescript
interface PlayerStats {
  playerId: string;
  playerName: string;
  team: string;
  date: string;
  gameId: string;

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
  longestReception?: number;

  // Defense
  sacks?: number;
  tackles?: number;
  passesDefended?: number;

  // Status
  played: boolean;
  gameStatus: "final" | "postponed" | "cancelled";
  position: string;
}

async function fetchGameStats(gameId: string, date: string): Promise<PlayerStats[]> {
  // 1. Get game from ESPN scoreboard
  // 2. Parse teams and player stats
  // 3. Normalize to PlayerStats format
  // 4. Return array of all player stats
}

async function fetchPlayerGameStats(
  playerName: string,
  team: string,
  date: string
): Promise<PlayerStats | null> {
  // 1. Get all stats for game on date
  // 2. Find matching player
  // 3. Return normalized stats
}
```

**Fetch Schedule:**
- Trigger: Post-game (8 hours after game kickoff)
- Frequency: Once per week (for each finished game)
- Batch: Query all games in week, extract all players

**Caching:**
- Cache game stats for 24 hours
- Re-fetch if grading not yet done
- Archive historical stats

---

## IMPLEMENTATION PHASES

### Phase 1: Stub Implementation (CURRENT)
✅ Infrastructure in place
✅ Function signatures defined
✅ Type definitions created
⏳ Awaiting source selection

### Phase 2: ESPN Integration (NEXT)
- [ ] Verify ESPN API access (free tier)
- [ ] Test endpoint responses
- [ ] Build normalization logic
- [ ] Handle edge cases (missing data, name variations)

### Phase 3: Grading Integration
- [ ] Hook fetchPlayerStats() into gradeHistoricalProps()
- [ ] Batch grade all props for week
- [ ] Store results in historical_prop_results
- [ ] Log grading status

### Phase 4: UI Display
- [ ] Show player stats in Prior Weeks
- [ ] Display grades with logic explanation
- [ ] Color-code grades (green=hit, red=miss, yellow=push)

---

## CURRENT STATUS

🟢 **Architecture Ready**
- PlayerStats interface defined
- Fetch/grade functions stubbed
- Database schema prepared
- Awaiting ESPN API verification

---

## NEXT STEP

Select ESPN as stats source → Implement fetchGameStats() → Test with Week 7 games → Deploy

