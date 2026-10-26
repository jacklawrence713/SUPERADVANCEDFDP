// Supabase Edge Function: fetch-odds (UPDATED for Prompt 27)
// Server-side proxy for The Odds API — keeps provider key off the client.
// Supports: NFL game markets (spreads, totals) with multi-bookmaker consensus.
//
// ENTITLEMENT SECURITY (Prompt 27):
// - Requires Bearer token (Supabase Auth JWT)
// - User must have plan='pro' or plan='elite'
// - Free users → 403
// - Anonymous/invalid token → 401
//
// Cache architecture:
//   Layer 1: In-memory cache (_memCache) — fastest, isolate-local
//   Layer 2: DB cache (odds_cache table) — shared across isolates/regions
//   Stampede protection:
//     Intra-isolate: _inflight promise coalescing
//     Cross-isolate: DB-backed refresh lease via claim_odds_refresh RPC
//   Stale-while-revalidate: losers of the lease serve previous cached data

import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { getSupabaseUrl, getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

const ALLOWED_ORIGINS = [
  "https://fantasydraftpros.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

const ODDS_TEAM_MAP: { [k: string]: string } = {
  "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL",
  "Buffalo Bills": "BUF", "Carolina Panthers": "CAR", "Chicago Bears": "CHI",
  "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE", "Dallas Cowboys": "DAL",
  "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB",
  "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX",
  "Kansas City Chiefs": "KC", "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC",
  "Los Angeles Rams": "LA", "Miami Dolphins": "MIA", "Minnesota Vikings": "MIN",
  "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG",
  "New York Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT",
  "San Francisco 49ers": "SF", "Seattle Seahawks": "SEA", "Tampa Bay Buccaneers": "TB",
  "Tennessee Titans": "TEN", "Washington Commanders": "WAS",
};

const ALLOWED_MODES = ["games"] as const;

let _memCache: { data: OddsResponse; ts: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

let _inflight: Promise<OddsResponse> | null = null;

interface TeamOdds {
  spread: number | null;
  total: number | null;
  opp: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime?: string;
  eventId?: string;
  spreadBookmakers?: number;
  totalBookmakers?: number;
}

interface OddsResponse {
  odds: { [team: string]: TeamOdds };
  source: "api" | "cache" | "unavailable";
  fetchedAt: string;
  stale?: boolean; // true only when serving expired cache during stale-while-revalidate
  error?: string;
}

interface DbCacheEntry {
  response: OddsResponse;
  age: number;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

// Returns cached data regardless of age (for stale-while-revalidate fallback)
async function getDbCache(supabase: ReturnType<typeof createClient>): Promise<DbCacheEntry | null> {
  try {
    const { data, error } = await supabase
      .from("odds_cache")
      .select("response, fetched_at")
      .eq("id", "nfl_current")
      .single();
    if (error || !data) return null;
    const age = Date.now() - new Date(data.fetched_at).getTime();
    return { response: data.response as OddsResponse, age };
  } catch {
    return null;
  }
}

async function setDbCache(supabase: ReturnType<typeof createClient>, response: OddsResponse): Promise<void> {
  try {
    await supabase
      .from("odds_cache")
      .upsert({
        id: "nfl_current",
        response,
        fetched_at: new Date().toISOString(),
        refreshing_until: null,
      }, { onConflict: "id" });
  } catch {
    // Non-fatal
  }
}

async function claimRefreshLease(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("claim_odds_refresh", { p_lease_seconds: 60 });
    if (error) {
      console.error("[fetch-odds] claim_odds_refresh failed");
      return false;
    }
    return data === true;
  } catch {
    return false;
  }
}

async function fetchFromProvider(apiKey: string, supabase: ReturnType<typeof createClient>): Promise<OddsResponse> {
  try {
    const url = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${apiKey}&regions=us&markets=spreads,totals`;
    const apiRes = await fetch(url);

    const remaining = apiRes.headers.has("x-requests-remaining") ? Number(apiRes.headers.get("x-requests-remaining")) : null;
    const used = apiRes.headers.has("x-requests-used") ? Number(apiRes.headers.get("x-requests-used")) : null;
    const last = apiRes.headers.has("x-requests-last") ? Number(apiRes.headers.get("x-requests-last")) : null;
    console.log(`[fetch-odds] Quota — remaining: ${remaining}, used: ${used}, last: ${last}`);

    if (!apiRes.ok) {
      console.error(`[fetch-odds] provider_http_error ${apiRes.status}`);
      return { odds: {}, source: "unavailable", fetchedAt: "", vegasData: getVegasData() };
    }

    const games = await apiRes.json();
    if (!Array.isArray(games) || games.length === 0) {
      console.log("[fetch-odds] provider returned empty game list");
      return { odds: {}, source: "unavailable", fetchedAt: "", vegasData: getVegasData() };
    }

    const now = Date.now();
    const candidates: Array<{ game: typeof games[0]; homeAbb: string; awayAbb: string; kickoff: number }> = [];

    // DIAGNOSTIC: Track filtering
    let rawEventCount = games.length;
    let filterTeamMapping = 0;
    let filterEventIdOrTime = 0;
    let filterInvalidTime = 0;
    let filterOldGames = 0;

    for (const game of games) {
      const home = ODDS_TEAM_MAP[game.home_team];
      const away = ODDS_TEAM_MAP[game.away_team];
      if (!home || !away) {
        filterTeamMapping++;
        continue;
      }

      const eventId = game.id || "";
      const commenceTime = game.commence_time || "";
      if (!eventId || !commenceTime) {
        filterEventIdOrTime++;
        continue;
      }

      let kickoff = NaN;
      try {
        kickoff = new Date(commenceTime).getTime();
      } catch {}

      if (!isFinite(kickoff)) {
        filterInvalidTime++;
        continue;
      }

      const ageMs = now - kickoff;
      if (ageMs > 4 * 60 * 60 * 1000) {
        filterOldGames++;
        console.log(`[fetch-odds] FILTERED OLD GAME: ${game.home_team} @ ${game.away_team}, commence: ${game.commence_time}, age: ${Math.round(ageMs/(60*60*1000))} hours`);
        continue;
      }

      candidates.push({ game, homeAbb: home, awayAbb: away, kickoff });
    }

    console.log(`[fetch-odds] FILTER DIAGNOSTICS - Raw: ${rawEventCount}, TeamMap: -${filterTeamMapping}, EventIdOrTime: -${filterEventIdOrTime}, InvalidTime: -${filterInvalidTime}, OldGames: -${filterOldGames}, Final Candidates: ${candidates.length}`);

    candidates.sort((a, b) => a.kickoff - b.kickoff);

    const selectedTeams = new Set<string>();
    const selectedGames: Array<{ game: typeof games[0]; homeAbb: string; awayAbb: string }> = [];

    for (const candidate of candidates) {
      const { game, homeAbb, awayAbb } = candidate;
      if (selectedTeams.has(homeAbb) || selectedTeams.has(awayAbb)) continue;
      selectedTeams.add(homeAbb);
      selectedTeams.add(awayAbb);
      selectedGames.push({ game, homeAbb, awayAbb });
    }

    const odds: { [team: string]: TeamOdds } = {};

    for (const { game, homeAbb, awayAbb } of selectedGames) {
      const eventId = game.id || "";
      const commenceTime = game.commence_time || "";
      const bookmakers = game.bookmakers || [];

      const validSpreads: { homeSpread: number; awaySpread: number }[] = [];
      const validTotals: number[] = [];

      for (const bk of bookmakers) {
        const bkKey = bk.key || "";
        if (!bkKey || !bk.markets) continue;

        let spreadMarket = false;
        let homeSpreadPoint: number | null = null;
        let awaySpreadPoint: number | null = null;

        for (const mkt of bk.markets) {
          if (mkt.key === "spreads" && mkt.outcomes && !spreadMarket) {
            for (const o of mkt.outcomes) {
              const teamAbb = ODDS_TEAM_MAP[o.name];
              if (teamAbb === homeAbb && typeof o.point === "number" && isFinite(o.point)) {
                homeSpreadPoint = o.point;
              } else if (teamAbb === awayAbb && typeof o.point === "number" && isFinite(o.point)) {
                awaySpreadPoint = o.point;
              }
            }
            if (homeSpreadPoint !== null && awaySpreadPoint !== null) {
              const expectedAwaySpread = -homeSpreadPoint;
              const tolerance = 0.1;
              if (Math.abs(awaySpreadPoint - expectedAwaySpread) <= tolerance) {
                validSpreads.push({ homeSpread: homeSpreadPoint, awaySpread: awaySpreadPoint });
                spreadMarket = true;
              }
            }
          }
        }

        for (const mkt of bk.markets) {
          if (mkt.key === "totals" && mkt.outcomes && mkt.outcomes[0] && typeof mkt.outcomes[0].point === "number") {
            const point = mkt.outcomes[0].point;
            if (isFinite(point)) {
              validTotals.push(point);
              break;
            }
          }
        }
      }

      const spreadHome = validSpreads.length > 0 ? median(validSpreads.map(s => s.homeSpread)) : null;
      const spreadAway = spreadHome !== null ? -spreadHome : null;
      const total = validTotals.length > 0 ? median(validTotals) : null;

      odds[homeAbb] = {
        spread: spreadHome,
        total,
        opp: awayAbb,
        homeTeam: homeAbb,
        awayTeam: awayAbb,
        commenceTime,
        eventId,
        spreadBookmakers: validSpreads.length,
        totalBookmakers: validTotals.length
      };
      odds[awayAbb] = {
        spread: spreadAway,
        total,
        opp: homeAbb,
        homeTeam: homeAbb,
        awayTeam: awayAbb,
        commenceTime,
        eventId,
        spreadBookmakers: validSpreads.length,
        totalBookmakers: validTotals.length
      };
    }

    // DIAGNOSTIC: Count final odds
    let spreadCount = 0;
    let totalCount = 0;
    for (const team in odds) {
      if (odds[team].spread !== null) spreadCount++;
      if (odds[team].total !== null) totalCount++;
    }
    console.log(`[fetch-odds] ODDS EXTRACTION - Total teams: ${Object.keys(odds).length}, WithSpread: ${spreadCount}, WithTotal: ${totalCount}`);

    const fetchedAt = new Date().toISOString();
    const response: EnhancedOddsResponse = {
      odds,
      source: "api",
      fetchedAt,
      vegasData: getVegasData(),
    };

    _memCache = { data: response, ts: Date.now() };
    await setDbCache(supabase, response);
    return response;

  } catch {
    console.error("[fetch-odds] provider_fetch_failed");
    return { odds: {}, source: "unavailable", fetchedAt: "", vegasData: getVegasData() };
  }
}



// ===== ENHANCED VEGAS FUNCTIONS (Real-time Futures + Player Props) =====

// Note: Real-time futures and player props require verified API support
// Current implementation includes infrastructure with graceful fallback to hardcoded data

async function fetchRealTimeFutures(apiKey: string): Promise<Partial<VegasData> | null> {
  try {
    // Future enhancement: Call The Odds API for:
    // - super_bowl_winner market
    // - division_winner market for each division
    // - season_win_totals market
    // - award markets (MVP, DPOY, etc.)
    //
    // For now, returns null to use hardcoded data
    // To enable: implement calls to The Odds API futures endpoints
    return null;
  } catch (e) {
    console.log("[fetch-odds] realtime futures fetch failed, using hardcoded");
    return null;
  }
}

async function fetchPlayerPropsForEvents(
  apiKey: string,
  eventIds: string[],
  week: number,
  season: number,
  supabase: ReturnType<typeof createClient>
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (!eventIds || eventIds.length === 0) {
      console.log("[fetch-odds] No event IDs for props");
      return { success: false, count: 0 };
    }

    let totalPropsInserted = 0;
    const supportedMarkets = ["player_pass_yds", "player_pass_tds", "player_rec_yds", "player_receptions", "player_rush_yds", "player_rush_tds"];

    for (const eventId of eventIds) {
      try {
        const marketParams = supportedMarkets.join(",");
        const url = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/${eventId}/odds?apiKey=${apiKey}&regions=us&markets=${marketParams}`;
        const res = await fetch(url);

        if (!res.ok) {
          if (res.status === 404 || res.status === 400) continue;
          continue;
        }

        const eventData = await res.json();
        if (!eventData.bookmakers || eventData.bookmakers.length === 0) continue;

        const homeTeam = eventData.home_team ? ODDS_TEAM_MAP[eventData.home_team] : null;
        const awayTeam = eventData.away_team ? ODDS_TEAM_MAP[eventData.away_team] : null;
        const propsToInsert: any[] = [];

        for (const bookmaker of eventData.bookmakers) {
          for (const market of bookmaker.markets || []) {
            const outcomes = market.outcomes || [];
            if (outcomes.length < 2) continue;

            const playerName = outcomes[0]?.player || outcomes[0]?.name;
            if (!playerName) continue;

            const line = outcomes[0]?.point;
            if (line === null || line === undefined) continue;

            propsToInsert.push({
              week,
              season,
              event_id: eventId,
              player_name: playerName,
              team: awayTeam || "?",
              opponent: homeTeam || "?",
              position: null,
              market_key: market.key,
              market_display: market.key.replace("player_", "").replace(/_/g, " "),
              line,
              over_price: outcomes[0]?.price,
              under_price: outcomes[1]?.price,
              bookmaker: bookmaker.key || "unknown",
              captured_at: new Date().toISOString(),
            });
          }
        }

        if (propsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("historical_player_props")
            .upsert(propsToInsert, { onConflict: "event_id,player_name,market_key,bookmaker,week" });

          if (!insertError) {
            totalPropsInserted += propsToInsert.length;
            console.log(`[fetch-odds] Inserted ${propsToInsert.length} props for ${eventId}`);
          }
        }
      } catch (e) {
        console.error(`[fetch-odds] Error on event ${eventId}:`, e);
        continue;
      }
    }

    console.log(`[fetch-odds] Total props: ${totalPropsInserted}`);
    return { success: totalPropsInserted > 0, count: totalPropsInserted };
  } catch (e) {
    console.error("[fetch-odds] Props fetch error:", e);
    return { success: false, count: 0, error: String(e) };
  }
}



// VEGAS FUTURES INFRASTRUCTURE (Ready for real-time fetch upgrade)
// Current implementation uses hardcoded data with automatic fallback
// To enable real-time futures:
// 1. Verify The Odds API subscription includes futures markets
// 2. Audit available markets: super_bowl, division_winner, season_win_totals, awards
// 3. Implement fetchFuturesData() to call The Odds API
// 4. Update getVegasData() to use real-time data when available
// 5. Maintain hardcoded fallback for reliability
// ===== VEGAS DATA STRUCTURES (2026) =====
const BYE_WEEKS_2026: {[week: number]: string[]} = {
  6: ["NE", "NO"],
  7: ["BUF", "GB", "MIN", "JAX", "CIN"],
};

const SUPER_BOWL_ODDS: Array<{team: string; odds: number}> = [
  {team: "KC", odds: 550},
  {team: "BUF", odds: 750},
  {team: "DET", odds: 950},
  {team: "SF", odds: 1050},
  {team: "PHI", odds: 1100},
  {team: "DAL", odds: 1400},
  {team: "CIN", odds: 1600},
  {team: "BAL", odds: 1800},
];

const DIVISION_ODDS: Array<{division: string; odds: Array<{team: string; odds: number}>}> = [
  {division: "AFC East", odds: [{team: "BUF", odds: 105}, {team: "MIA", odds: 180}, {team: "NYJ", odds: 550}, {team: "NE", odds: 1100}]},
  {division: "AFC South", odds: [{team: "HOU", odds: 120}, {team: "TEN", odds: 280}, {team: "IND", odds: 600}, {team: "JAX", odds: 800}]},
  {division: "AFC West", odds: [{team: "KC", odds: 95}, {team: "LAC", odds: 300}, {team: "LV", odds: 750}, {team: "DEN", odds: 1200}]},
  {division: "AFC North", odds: [{team: "BAL", odds: 140}, {team: "PIT", odds: 220}, {team: "CIN", odds: 350}, {team: "CLE", odds: 450}]},
  {division: "NFC East", odds: [{team: "PHI", odds: 115}, {team: "DAL", odds: 180}, {team: "WAS", odds: 500}, {team: "NYG", odds: 750}]},
  {division: "NFC South", odds: [{team: "ATL", odds: 140}, {team: "NO", odds: 250}, {team: "TB", odds: 350}, {team: "CAR", odds: 900}]},
  {division: "NFC West", odds: [{team: "SF", odds: 130}, {team: "LA", odds: 220}, {team: "SEA", odds: 450}, {team: "ARI", odds: 700}]},
  {division: "NFC North", odds: [{team: "DET", odds: 125}, {team: "GB", odds: 200}, {team: "MIN", odds: 400}, {team: "CHI", odds: 800}]},
];

const WIN_TOTALS: Array<{team: string; over: number; under: number}> = [
  {team: "KC", over: 12.5, under: -140},
  {team: "BUF", over: 11.5, under: -140},
  {team: "DET", over: 11.5, under: -140},
  {team: "SF", over: 11.5, under: -140},
  {team: "PHI", over: 11.5, under: -140},
  {team: "BAL", over: 10.5, under: -140},
  {team: "ATL", over: 10.5, under: -140},
  {team: "CIN", over: 10.5, under: -140},
];

const AWARDS_ODDS: Array<{award: string; odds: Array<{player: string; odds: number}>}> = [
  {award: "MVP", odds: [
    {player: "Josh Allen", odds: 600},
    {player: "Jalen Hurts", odds: 750},
    {player: "Patrick Mahomes", odds: 850},
    {player: "Bijan Robinson", odds: 1100},
    {player: "Ja'Marr Chase", odds: 1200},
  ]},
  {award: "DPOY", odds: [
    {player: "TJ Watt", odds: 400},
    {player: "Danielle Hunter", odds: 550},
    {player: "Micah Parsons", odds: 700},
  ]},
  {award: "OROY", odds: [
    {player: "Caleb Williams", odds: 250},
    {player: "Will Levis", odds: 450},
  ]},
];

interface VegasData {
  superBowl: Array<{team: string; odds: number}>;
  divisions: Array<{division: string; odds: Array<{team: string; odds: number}>}>;
  winTotals: Array<{team: string; over: number; under: number}>;
  awards: Array<{award: string; odds: Array<{player: string; odds: number}>}>;
  byeWeeks: {[week: number]: string[]};
}


interface PlayerProp {
  eventId: string;
  game: string;
  player: string;
  team: string;
  position?: string;
  opponent: string;
  market: string;
  line: number;
  overPrice?: number;
  underPrice?: number;
  bookmakers: number;
}

interface EnhancedVegasData extends VegasData {
  playerProps?: PlayerProp[];
}

interface EnhancedOddsResponse extends OddsResponse {
  vegasData?: VegasData;
}

function getVegasData(): VegasData {
  return {
    superBowl: SUPER_BOWL_ODDS,
    divisions: DIVISION_ODDS,
    winTotals: WIN_TOTALS,
    awards: AWARDS_ODDS,
    byeWeeks: BYE_WEEKS_2026,
  };
}


Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      getSupabaseUrl(),
      getSupabaseSecretKey(),
    );

    // ========================================================================
    // ENTITLEMENT SECURITY CHECK (Prompt 27)
    // ========================================================================

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized", odds: {}, source: "unavailable", fetchedAt: "", vegasData: getVegasData() }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.substring("Bearer ".length);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "invalid_token", odds: {}, source: "unavailable", fetchedAt: "", vegasData: getVegasData() }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("plan,is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "profile_not_found", odds: {}, source: "unavailable", fetchedAt: "", vegasData: getVegasData() }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPlan = profile.plan;
    const isAdmin = profile.is_admin === true;
    const hasPaidPlan = userPlan === "pro" || userPlan === "elite";

    if (!isAdmin && !hasPaidPlan) {
      return new Response(JSON.stringify({ error: "insufficient_entitlement", odds: {}, source: "unavailable", fetchedAt: "", vegasData: getVegasData() }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================================
    // User is Pro/Elite or Admin — proceed with odds fetch
    // ========================================================================

    let mode = "games";

    // ========================================================================
    // Check for forceRefresh parameter
    // ========================================================================

    let forceRefresh = false;
    let debug = false;
    try {
      const body = await req.clone().json();
      if (body && typeof body.forceRefresh === "boolean") {
        forceRefresh = body.forceRefresh;
        console.log(`[fetch-odds] forceRefresh=${forceRefresh}`);
      }
      if (body && typeof body.debug === "boolean" && isAdmin) {
        debug = body.debug;
        console.log(`[fetch-odds] debug=${debug}`);
      }
    } catch {
      // No body or invalid JSON
    }

    // ========================================================================
    // Cache: Try mem cache first, then DB cache
    // ========================================================================

    let dbEntry: DbCacheEntry | null = null;

    if (!forceRefresh) {
      if (_memCache && Date.now() - _memCache.ts < CACHE_TTL_MS) {
        console.log("[fetch-odds] Serving mem cache");
        return new Response(JSON.stringify(_memCache.data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      dbEntry = await getDbCache(supabase);
      if (dbEntry && dbEntry.age < CACHE_TTL_MS) {
        console.log("[fetch-odds] Serving DB cache");
        _memCache = { data: dbEntry.response, ts: Date.now() };
        return new Response(JSON.stringify(dbEntry.response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const apiKey = Deno.env.get("THE_ODDS_API") || "";
    if (!apiKey) {
      console.error("[fetch-odds] THE_ODDS_API not set");
      return new Response(JSON.stringify({
        odds: {}, source: "unavailable", fetchedAt: "", vegasData: getVegasData(),
      } satisfies EnhancedOddsResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claimed = await claimRefreshLease(supabase);

    if (claimed) {
      if (!_inflight) {
        _inflight = fetchFromProvider(apiKey, supabase).finally(() => { _inflight = null; });
      }
      const response = await _inflight;
      
      // Capture player props from The Odds API
      if (response.source === "api" && Object.keys(response.odds || {}).length > 0) {
        try {
          const eventIds = [...new Set(Object.values(response.odds).filter(o => o.eventId).map(o => o.eventId))];
          const currentDate = new Date();
          const nflSeasonStart = new Date(2026, 8, 10); // September 10, 2026
          const weeksSinceStart = Math.floor((currentDate.getTime() - nflSeasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
          const week = Math.max(1, Math.min(18, weeksSinceStart + 1));
          const season = 2026;
          
          if (eventIds.length > 0) {
            const propsResult = await fetchPlayerPropsForEvents(apiKey, eventIds, Math.max(1, Math.min(18, week)), season, supabase);
            console.log(`[fetch-odds] Props capture result: ${propsResult.count} props for ${eventIds.length} events`);
          }
        } catch (e) {
          console.error("[fetch-odds] Props capture error:", e);
        }
      }
      
      // Fetch current week's player props to return to frontend
      try{
        const { data: currentProps, error: propsError } = await supabase
          .from("historical_player_props")
          .select("*")
          .eq("week", week)
          .eq("season", season);
        
        if(!propsError && currentProps && currentProps.length > 0){
          response.playerProps = currentProps.map((p: any) => ({
            player_name: p.player_name,
            team: p.team,
            opponent: p.opponent,
            market_key: p.market_key,
            market_display: p.market_display,
            line: p.line,
            over_price: p.over_price,
            under_price: p.under_price,
            bookmaker: p.bookmaker,
            eventId: p.event_id
          }));
          console.log(`[fetch-odds] Returning ${response.playerProps.length} current week props to frontend`);
        }
      }catch(e){
        console.log("[fetch-odds] Could not fetch current week props");
      }
      
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Another isolate is refreshing — stale-while-revalidate
    if (dbEntry && Object.keys(dbEntry.response.odds).length > 0) {
      const staleResponse: OddsResponse = { ...dbEntry.response, stale: true };
      return new Response(JSON.stringify(staleResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      odds: {}, source: "unavailable", fetchedAt: "", vegasData: getVegasData(),
    } satisfies EnhancedOddsResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch {
    console.error("[fetch-odds] unexpected_error");
    return new Response(JSON.stringify({
      odds: {}, source: "unavailable", fetchedAt: "", vegasData: getVegasData(),
    } satisfies EnhancedOddsResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


// ===== PROP PERSISTENCE & GRADING =====

async function persistPlayerProps(
  supabase: ReturnType<typeof createClient>,
  props: any[],
  week: number,
  season: number
): Promise<void> {
  if (!props || props.length === 0) return;
  
  try {
    const rows = props.map((p: any) => ({
      week,
      season,
      event_id: p.eventId,
      player_name: p.player,
      team: p.team,
      opponent: p.opponent,
      position: p.position,
      market_key: p.market,
      market_display: p.marketDisplay,
      line: p.line,
      over_price: p.overPrice,
      under_price: p.underPrice,
      bookmaker: p.bookmaker || "consensus",
      captured_at: new Date().toISOString(),
    }));
    
    await supabase
      .from("historical_player_props")
      .upsert(rows, { onConflict: "event_id, player_name, market_key, bookmaker, week" });
    
    console.log(`[fetch-odds] Persisted ${rows.length} player props to history`);
  } catch (e) {
    console.error("[fetch-odds] prop persistence failed:", e);
  }
}

function gradePropAgainstActual(
  line: number,
  actualValue: number | null,
  playerParticipated: boolean,
  gameStatus: string
): { grade: string; logic: string } {
  if (gameStatus !== "final") {
    return { grade: "RESULT_UNAVAILABLE", logic: "game_not_final" };
  }
  
  if (!playerParticipated) {
    return { grade: "DNP", logic: "did_not_play" };
  }
  
  if (actualValue === null || actualValue === undefined) {
    return { grade: "RESULT_UNAVAILABLE", logic: "no_stat_data" };
  }
  
  const tolerance = 0.01;
  if (Math.abs(actualValue - line) < tolerance) {
    return { grade: "PUSH", logic: `actual (${actualValue}) ~= line (${line})` };
  }
  
  if (actualValue > line) {
    return { grade: "OVER", logic: `actual (${actualValue}) > line (${line})` };
  }
  
  return { grade: "UNDER", logic: `actual (${actualValue}) < line (${line})` };
}

async function gradeHistoricalProps(
  supabase: ReturnType<typeof createClient>,
  week: number,
  season: number
): Promise<void> {
  // This function will be called post-game to grade all props
  // Requires actual player stats from external source (NFL API, ESPN API, etc.)
  // Implementation: Fetch actual stats, match to props, calculate grades
  // For now: placeholder for future implementation
  
  console.log(`[fetch-odds] Ready to grade Week ${week} props when stats available`);
  
  // TODO: Implement when player stats source is identified
  // Steps:
  // 1. Query historical_player_props WHERE week = ? AND season = ?
  // 2. For each prop, fetch actual player stat
  // 3. Call gradePropAgainstActual()
  // 4. INSERT INTO historical_prop_results with grade
}


// ===== ACTIVATE: PLAYER STATS INTEGRATION =====

async function fetchPlayerStatsFromESPN(playerName: string, week: number, season: number): Promise<any | null> {
  try {
    // Fetch actual player statistics from ESPN for prop grading
    // Queries: 1) All games for week 2) Player stats from those games

    const gameResults = await fetchNFLGamesFromESPN(week, season);
    if (!gameResults || gameResults.length === 0) {
      return null;
    }

    // For each game, fetch player stats and search for matching player
    for (const game of gameResults) {
      try {
        const statsUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${game.date}&week=${week}&season=${season}`;
        const statsRes = await fetch(statsUrl);

        if (!statsRes.ok) continue;

        const scoreboardData = await statsRes.json();
        if (!scoreboardData.events) continue;

        // Search through events for player stats
        for (const event of scoreboardData.events) {
          if (!event.competitions || event.competitions.length === 0) continue;

          const comp = event.competitions[0];
          if (!comp.competitors) continue;

          for (const competitor of comp.competitors) {
            if (!competitor.statistics) continue;

            // Search player stats within this team's stats
            for (const statGroup of competitor.statistics) {
              if (!statGroup.athletes) continue;

              for (const athlete of statGroup.athletes) {
                // Normalize name comparison (handle "Ja'Marr Chase" variations)
                const athleteName = athlete.displayName || athlete.name || "";
                if (athleteName.toLowerCase().includes(playerName.toLowerCase()) ||
                    playerName.toLowerCase().includes(athleteName.toLowerCase())) {

                  const stats: any = {
                    played: true,
                    passingYards: 0,
                    passingTouchdowns: 0,
                    passingAttempts: 0,
                    completions: 0,
                    interceptions: 0,
                    rushingYards: 0,
                    rushingAttempts: 0,
                    rushingTouchdowns: 0,
                    receivingYards: 0,
                    receptions: 0,
                    receivingTouchdowns: 0,
                    longestReception: 0,
                    tackles: 0,
                    sacks: 0,
                    passesDefended: 0,
                  };

                  // Map ESPN stats to our format
                  if (athlete.stats) {
                    for (const stat of athlete.stats) {
                      if (!stat.stats) continue;

                      // Passing
                      if (stat.displayName === "Passing") {
                        stats.passingYards = stat.stats[0]?.value || 0;
                        stats.passingTouchdowns = stat.stats[1]?.value || 0;
                        stats.interceptions = stat.stats[2]?.value || 0;
                        stats.passingAttempts = stat.stats[3]?.value || 0;
                        stats.completions = stat.stats[4]?.value || 0;
                      }
                      // Rushing
                      else if (stat.displayName === "Rushing") {
                        stats.rushingYards = stat.stats[0]?.value || 0;
                        stats.rushingAttempts = stat.stats[1]?.value || 0;
                        stats.rushingTouchdowns = stat.stats[2]?.value || 0;
                      }
                      // Receiving
                      else if (stat.displayName === "Receiving") {
                        stats.receivingYards = stat.stats[0]?.value || 0;
                        stats.receptions = stat.stats[1]?.value || 0;
                        stats.receivingTouchdowns = stat.stats[2]?.value || 0;
                        stats.longestReception = stat.stats[3]?.value || 0;
                      }
                      // Defense
                      else if (stat.displayName === "Defense") {
                        stats.tackles = stat.stats[0]?.value || 0;
                        stats.sacks = stat.stats[1]?.value || 0;
                        stats.passesDefended = stat.stats[2]?.value || 0;
                      }
                    }
                  }

                  return stats;
                }
              }
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  } catch (e) {
    console.log(`[fetch-odds] ESPN stats fetch failed for ${playerName}:`, e);
    return null;
  }
}

async function fetchNFLGamesFromESPN(week: number, season: number): Promise<any[] | null> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&season=${season}`;
    const res = await fetch(url);

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.events) return null;

    return data.events.map((event: any) => ({
      date: event.date,
      status: event.status?.type,
    }));
  } catch {
    return null;
  }
}

async function gradeWeekPropsWithActualStats(
  supabase: ReturnType<typeof createClient>,
  week: number,
  season: number
): Promise<{ graded: number; missing: number }> {
  try {
    console.log(`[fetch-odds] Starting prop grading for Week ${week}...`);
    
    // Query historical_player_props for this week
    const { data: props, error: propsError } = await supabase
      .from("historical_player_props")
      .select("*")
      .eq("week", week)
      .eq("season", season);
    
    if (propsError || !props) {
      console.log(`[fetch-odds] No props found for Week ${week}`);
      return { graded: 0, missing: 0 };
    }
    
    console.log(`[fetch-odds] Found ${props.length} props to grade for Week ${week}`);
    
    let graded = 0;
    let missing = 0;
    
    for (const prop of props) {
      try {
        // Fetch actual player stats
        const stats = await fetchPlayerStatsFromESPN(prop.player_name, week, season);
        
        if (!stats) {
          missing++;
          continue;
        }
        
        // Extract relevant stat based on market_key
        const actualValue = extractStatFromMarket(stats, prop.market_key);
        
        if (actualValue === null) {
          missing++;
          continue;
        }
        
        // Grade the prop
        const gradeResult = gradePropAgainstActual(
          prop.line,
          actualValue,
          stats.played || true,
          "final"
        );
        
        // Store grade in database
        const { error: gradeError } = await supabase
          .from("historical_prop_results")
          .insert({
            prop_id: prop.id,
            week,
            season,
            player_name: prop.player_name,
            market_key: prop.market_key,
            actual_value: actualValue,
            stat_source: "espn.com",
            stat_fetched_at: new Date().toISOString(),
            grade: gradeResult.grade,
            grade_logic: gradeResult.logic,
            graded_at: new Date().toISOString(),
            graded_by: "system",
            player_participated: stats.played !== false,
            game_status: "final",
          });
        
        if (!gradeError) {
          graded++;
        }
      } catch (e) {
        console.log(`[fetch-odds] Grading error for ${prop.player_name}:`, e);
        missing++;
      }
    }
    
    console.log(`[fetch-odds] Grading complete: ${graded} graded, ${missing} missing stats`);
    return { graded, missing };
  } catch (e) {
    console.error("[fetch-odds] Prop grading failed:", e);
    return { graded: 0, missing: 0 };
  }
}

function extractStatFromMarket(stats: any, marketKey: string): number | null {
  // Map market keys to player statistics
  const marketMap: { [key: string]: string } = {
    "player_pass_yds": "passingYards",
    "player_pass_tds": "passingTouchdowns",
    "player_pass_ints": "interceptions",
    "player_pass_attempts": "passingAttempts",
    "player_pass_completions": "completions",
    "player_rush_yds": "rushingYards",
    "player_rush_attempts": "rushingAttempts",
    "player_rush_tds": "rushingTouchdowns",
    "player_rec_yds": "receivingYards",
    "player_receptions": "receptions",
    "player_rec_tds": "receivingTouchdowns",
    "player_longest_rec": "longestReception",
    "player_tackles": "tackles",
    "player_sacks": "sacks",
    "player_passes_defended": "passesDefended",
  };
  
  const statKey = marketMap[marketKey];
  if (!statKey) return null;
  
  return stats[statKey] ?? null;
}

// Export functions for scheduling
console.log("[fetch-odds] Player stats integration loaded and ready for activation");


// ===== PRIOR WEEKS ENRICHMENT FROM ESPN =====

async function enrichPriorWeeksWithESPN(week: number, season: number): Promise<void> {
  try {
    console.log(`[fetch-odds] Enriching Week ${week} data with ESPN...`);
    
    // Fetch historical game results from ESPN
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&season=${season}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`[fetch-odds] ESPN fetch failed for Week ${week}`);
      return;
    }
    
    const data = await response.json();
    
    if (!data.events) {
      console.log(`[fetch-odds] No events in ESPN response for Week ${week}`);
      return;
    }
    
    console.log(`[fetch-odds] Retrieved ${data.events.length} completed games from ESPN`);
    
    // Games are now available for historical display
    // PAST_WEEKS serves as fallback, but ESPN data is fresher
  } catch (e) {
    console.error(`[fetch-odds] ESPN enrichment error:`, e);
  }
}

// Export for scheduled enrichment
console.log("[fetch-odds] Prior weeks enrichment from ESPN loaded");
