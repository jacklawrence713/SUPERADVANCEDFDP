# PLAYER PROPS AUDIT — THE ODDS API CAPABILITY ANALYSIS

**Date:** 2026-10-22
**Status:** Infrastructure Ready, External API Audit Required
**Current Implementation:** Placeholder ("Player props coming soon")

---

## THE ODDS API — CURRENT CONFIGURATION

### Current Endpoint (Game Lines):
```
GET https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/
?apiKey={KEY}
&regions=us
&markets=spreads,totals
```

**Markets currently fetched:**
- `spreads` — Team spread (home spread point)
- `totals` — Over/Under combined score

**Sport:** `americanfootball_nfl`

---

## PLAYER PROPS MARKET AUDIT

### What We Need:
- Real-time player prop markets for active NFL games
- Examples: passing yards over 275.5, receptions over 5.5, rushing yards, TDs, etc.
- Per-event (game-specific) data
- Bookmaker consensus

### The Odds API Player Props Support:

#### Potentially Available Markets (Based on Standard API Structure):
The Odds API typically supports player props through:

1. **Event-Specific Endpoint**
   - Endpoint: `/v4/sports/americanfootball_nfl/events/{eventId}/odds`
   - Markets: player prop market keys (e.g., `player_pass_yds`, `player_receptions`, etc.)
   - Requires: Event ID from game list
   - Status: **UNKNOWN if available in current tier**

2. **Prop Markets Likely Supported:**
   - `player_pass_yds` — Passing yards over/under
   - `player_pass_tds` — Passing touchdowns
   - `player_receptions` — Reception count
   - `player_rec_yds` — Receiving yards
   - `player_rush_yds` — Rushing yards
   - `player_rush_tds` — Rushing touchdowns
   - `player_longest_pass_completion` — Longest pass play
   - `player_anytime_td` — Anytime touchdown scorer
   - (Others possible: interceptions, fumbles, sacks, tackles, etc.)

3. **Bookmaker Coverage:**
   - DraftKings
   - FanDuel
   - BetMGM
   - FanDuel
   - Caesars/William Hill
   - PointsBet

---

## IMPLEMENTATION CHECKLIST

### Step 1: Verify API Tier Support
- [ ] Check The Odds API subscription documentation
- [ ] Confirm player props market availability
- [ ] Verify event-specific endpoint access
- [ ] Document quota cost (requests per API call)

### Step 2: Test Event ID Structure
- [ ] Confirm event IDs from game list match props endpoint
- [ ] Test single event props fetch
- [ ] Verify bookmaker structure matches game odds format

### Step 3: Market Key Mapping
- [ ] Map supported markets to player positions (QB, RB, WR, TE)
- [ ] Confirm market availability per sportsbook
- [ ] Document unsupported markets

### Step 4: Implementation
- [ ] Create `fetchPlayerProps(eventId)` function
- [ ] Normalize across bookmakers (median consensus)
- [ ] Handle missing props (some sportsbooks may not support all markets)
- [ ] Cache props data (same TTL as game odds)

### Step 5: UI Integration
- [ ] Render player props for each active game
- [ ] Group by market type
- [ ] Show bookmaker consensus + spread
- [ ] Add loading/error states

---

## INFRASTRUCTURE READINESS

### Already in Place:
✅ Event IDs captured from game list (line 220 in fetch-odds)
✅ Bookmaker consensus logic exists (median function, line 84)
✅ Cache architecture ready (add-on to existing odds cache)
✅ CORS headers configured
✅ Auth/entitlement checks in place

### Ready to Add:
```typescript
async function fetchPlayerProps(
  apiKey: string,
  eventIds: string[],
  supabase: ReturnType<typeof createClient>
): Promise<PlayerProp[]> {
  // Fetch props for each event from The Odds API
  // Normalize across bookmakers
  // Return array of player props
}

interface PlayerProp {
  eventId: string;
  game: string;           // "BAL @ KC"
  player: string;
  team: string;
  position?: string;
  market: string;         // "player_pass_yds"
  line: number;
  overPrice?: number;
  underPrice?: number;
  bookmakers: number;     // count of sportsbooks offering
}
```

---

## RISK ASSESSMENT

### Low Risk (If Audited & Available):
- API is proven (already using for game odds)
- Bookmaker structure known
- Cache architecture in place
- Graceful fallback to "unavailable" if endpoint fails

### Medium Risk (Tier Limitation):
- Current subscription may not include player props
- Event-specific endpoint may not be available
- Quota cost unknown (could be higher than expected)

### High Risk (Not Addressed):
- None identified if market is available

---

## NEXT STEPS

1. **Audit The Odds API documentation**
   - Verify player props market support
   - Confirm event-specific endpoint availability
   - Document quota cost

2. **If Available:**
   - Implement `fetchPlayerProps()`
   - Test with sample event IDs
   - Add to render path
   - Deploy with feature flag (optional)

3. **If Unavailable:**
   - Document provider limitation
   - Keep placeholder with explanation
   - Suggest workaround: manual prop line entry + data import

---

## ESTIMATED EFFORT

- **Audit:** 1-2 hours (confirm API capability)
- **Implementation:** 3-4 hours (fetch + normalize + cache + render)
- **Testing:** 1-2 hours (unit + integration + E2E)
- **Total:** 5-8 hours if available

---

## DECISION POINT

**Deploy Player Props when:**
- [ ] The Odds API audit confirms market support
- [ ] Event ID structure verified
- [ ] Quota cost acceptable
- [ ] Implementation complete
- [ ] All tests passing
- [ ] Local UI review approved

**Keep Placeholder when:**
- [ ] The Odds API does not support player props on current tier
- [ ] Event-specific endpoint unavailable
- [ ] Decision made to not pursue external API integration

---

## CURRENT STATUS

🔄 **INFRASTRUCTURE READY, AWAITING API AUDIT**

Player Props UI exists and will render real data as soon as:
1. API capability confirmed
2. Fetch function implemented
3. Tests pass

No deployment blocker if decision is to keep placeholder.

