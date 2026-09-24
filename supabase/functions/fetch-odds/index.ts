// Supabase Edge Function: fetch-odds
// Server-side proxy for The Odds API — keeps provider key off the client.
// Supports: NFL game markets (spreads, totals) with multi-bookmaker consensus.
//
// Cache architecture:
//   Layer 1: In-memory cache (_memCache) — fastest, isolate-local
//   Layer 2: DB cache (odds_cache table) — shared across isolates/regions
//   Stampede protection:
//     Intra-isolate: _inflight promise coalescing
//     Cross-isolate: DB-backed refresh lease via claim_odds_refresh RPC
//   Stale-while-revalidate: losers of the lease serve previous cached data
//
// Consensus methodology:
//   For each game, all available bookmaker lines are collected.
//   Spread: median of home-team spreads (normalized to home perspective before median).
//   Total: median of all bookmaker totals.
//   Moneyline: median of home/away moneylines independently.
//   Minimum 1 bookmaker required; bookmaker count reported per game.

import { createClient } from "npm:@supabase/supabase-js@2.39.0";

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

// NFL team name mapping (provider full names -> FDP abbreviations)
const ODDS_TEAM_MAP: { [k: string]: string } = {
  "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL",
  "Buffalo Bills": "BUF", "Carolina Panthers": "CAR", "Chicago Bears": "CHI",
  "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE", "Dallas Cowboys": "DAL",
  "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB",
  "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX",
  "Kansas City Chiefs": "KC", "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC",
  "Los Angeles Rams": "LAR", "Miami Dolphins": "MIA", "Minnesota Vikings": "MIN",
  "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG",
  "New York Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT",
  "San Francisco 49ers": "SF", "Seattle Seahawks": "SEA", "Tampa Bay Buccaneers": "TB",
  "Tennessee Titans": "TEN", "Washington Commanders": "WAS",
};

// Allowed request modes — server-side allowlist prevents arbitrary query construction
const ALLOWED_MODES = ["games"] as const;

// ── In-memory cache (shared within a single Deno Deploy isolate) ──
let _memCache: { data: OddsResponse; ts: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ── Intra-isolate stampede protection ────────────────────────────
// If a provider fetch is in-flight within this isolate, subsequent
// requests wait for it instead of making duplicate API calls.
let _inflight: Promise<OddsResponse> | null = null;

interface TeamOdds {
  spread: number | null;
  total: number | null;
  opp: string;
  homeTeam: string;     // actual home team abbreviation from provider
  awayTeam: string;     // actual away team abbreviation from provider
  commenceTime?: string; // ISO kickoff time
  eventId?: string;  // provider event ID for stable identity
  spreadBookmakers?: number; // number of bookmakers contributing spread consensus
  totalBookmakers?: number; // number of bookmakers contributing total consensus
}

interface OddsResponse {
  odds: { [team: string]: TeamOdds };
  source: "api" | "cache" | "unavailable";
  fetchedAt: string;
  stale?: boolean; // true only when serving expired cache during stale-while-revalidate
}

interface DbCacheEntry {
  response: OddsResponse;
  age: number;
}

/** Compute median of a numeric array. Returns null for empty. */
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
        refreshing_until: null, // Clear the lease after successful refresh
      }, { onConflict: "id" });
  } catch {
    // Cache write failure is non-fatal
  }
}

// Atomically claim the refresh lease. Returns true if this caller won.
// Uses DB-backed coordination so only one isolate refreshes at a time.
// Lease: 60s — safely above Deno Deploy's ~30s fetch timeout + processing.
// The Odds API typically responds in 1–5s; 60s covers worst-case network.
// On crash, other workers serve stale data until the 60s lease expires.
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
  // SECURITY: all errors caught locally so no raw Error (which may contain
  // the provider URL with apiKey) can propagate to the top-level catch.
  try {
    // Markets: spreads, totals (game lines only, no moneylines).
    const url = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${apiKey}&regions=us&markets=spreads,totals`;
    const apiRes = await fetch(url);

    // Read quota headers (server-side only — not included in client response)
    const remaining = apiRes.headers.has("x-requests-remaining") ? Number(apiRes.headers.get("x-requests-remaining")) : null;
    const used = apiRes.headers.has("x-requests-used") ? Number(apiRes.headers.get("x-requests-used")) : null;
    const last = apiRes.headers.has("x-requests-last") ? Number(apiRes.headers.get("x-requests-last")) : null;
    console.log(`[fetch-odds] Quota — remaining: ${remaining}, used: ${used}, last: ${last}`);

    if (!apiRes.ok) {
      console.error(`[fetch-odds] provider_http_error ${apiRes.status}`);
      return {
        odds: {},
        source: "unavailable",
        fetchedAt: "",
      };
    }

    const games = await apiRes.json();
    if (!Array.isArray(games) || games.length === 0) {
      // Empty provider response (e.g. offseason): do NOT cache empty odds
      // over valid previous data. Return unavailable; lease expires naturally.
      console.log("[fetch-odds] provider returned empty game list");
      return {
        odds: {},
        source: "unavailable",
        fetchedAt: "",
      };
    }

    // Step 1: Collect valid candidate games (valid IDs, times, not >4h old)
    const now = Date.now();
    const candidates: Array<{ game: typeof games[0]; homeAbb: string; awayAbb: string; kickoff: number }> = [];

    for (const game of games) {
      const home = ODDS_TEAM_MAP[game.home_team];
      const away = ODDS_TEAM_MAP[game.away_team];
      if (!home || !away) continue;

      const eventId = game.id || "";
      const commenceTime = game.commence_time || "";
      if (!eventId || !commenceTime) continue;

      let kickoff = NaN;
      try {
        kickoff = new Date(commenceTime).getTime();
      } catch {}

      // Skip games with invalid/unparseable timestamps
      if (!isFinite(kickoff)) continue;

      // Exclude games >4 hours in the past
      const ageMs = now - kickoff;
      if (ageMs > 4 * 60 * 60 * 1000) continue;

      candidates.push({ game, homeAbb: home, awayAbb: away, kickoff });
    }

    // Step 2: Sort candidates by commenceTime (earliest first)
    candidates.sort((a, b) => a.kickoff - b.kickoff);

    // Step 3: Greedily select games (each team appears at most once, matchups coherent)
    const selectedTeams = new Set<string>();
    const selectedGames: Array<{ game: typeof games[0]; homeAbb: string; awayAbb: string }> = [];

    for (const candidate of candidates) {
      const { game, homeAbb, awayAbb } = candidate;
      // If either team already selected, skip
      if (selectedTeams.has(homeAbb) || selectedTeams.has(awayAbb)) continue;
      // Select this game
      selectedTeams.add(homeAbb);
      selectedTeams.add(awayAbb);
      selectedGames.push({ game, homeAbb, awayAbb });
    }

    // Step 4: Compute consensus for each selected game
    const odds: { [team: string]: TeamOdds } = {};

    for (const { game, homeAbb, awayAbb } of selectedGames) {
      const eventId = game.id || "";
      const commenceTime = game.commence_time || "";
      const bookmakers = game.bookmakers || [];

      // Collect valid spread and total data from bookmakers
      const validSpreads: { homeSpread: number; awaySpread: number }[] = [];
      const validTotals: number[] = [];

      for (const bk of bookmakers) {
        const bkKey = bk.key || "";
        if (!bkKey) continue;

        if (!bk.markets) continue;

        // Find spread market: require BOTH home and away outcomes, finite points
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
            // Valid spread if we have both home and away, and they're opposite (within tolerance)
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

        // Find total market: require finite point value
        for (const mkt of bk.markets) {
          if (mkt.key === "totals" && mkt.outcomes && mkt.outcomes[0] && typeof mkt.outcomes[0].point === "number") {
            const point = mkt.outcomes[0].point;
            if (isFinite(point)) {
              validTotals.push(point);
              break; // One total per bookmaker
            }
          }
        }
      }

      // Compute consensus: null if no valid markets
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

    const fetchedAt = new Date().toISOString();
    const response: OddsResponse = {
      odds,
      source: "api",
      fetchedAt,
    };

    // Update caches
    _memCache = { data: response, ts: Date.now() };
    await setDbCache(supabase, response);
    return response;

  } catch {
    // SECURITY: never log the caught error — it may contain the provider URL
    // which includes apiKey. Log only a safe fixed string.
    console.error("[fetch-odds] provider_fetch_failed");
    return {
      odds: {},
      source: "unavailable",
      fetchedAt: "",
    };
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate mode parameter (server-side allowlist)
    let mode = "games";
    try {
      const body = await req.clone().json();
      if (body && typeof body.mode === "string") {
        if (!(ALLOWED_MODES as readonly string[]).includes(body.mode)) {
          return new Response(JSON.stringify({
            odds: {}, source: "unavailable", fetchedAt: "",
            error: "invalid_mode",
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        mode = body.mode;
      }
    } catch {
      // No body or invalid JSON — use default mode
    }

    // 1. In-memory cache (fastest, within same isolate)
    if (_memCache && Date.now() - _memCache.ts < CACHE_TTL_MS) {
      return new Response(JSON.stringify(_memCache.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 2. DB cache (shared across isolates/regions)
    const dbEntry = await getDbCache(supabase);
    if (dbEntry && dbEntry.age < CACHE_TTL_MS) {
      _memCache = { data: dbEntry.response, ts: Date.now() };
      return new Response(JSON.stringify(dbEntry.response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Cache expired or missing — need provider key to refresh
    const apiKey = Deno.env.get("THE_ODDS_API_KEY") || "";
    if (!apiKey) {
      return new Response(JSON.stringify({
        odds: {}, source: "unavailable", fetchedAt: "",
      } satisfies OddsResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Cross-isolate coordination: claim the refresh lease
    const claimed = await claimRefreshLease(supabase);

    if (claimed) {
      // Won the lease — fetch from provider (with intra-isolate coalescing)
      if (!_inflight) {
        _inflight = fetchFromProvider(apiKey, supabase).finally(() => { _inflight = null; });
      }
      const response = await _inflight;
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Another isolate is refreshing — stale-while-revalidate
    // Serve previous cached data marked stale (preserves original fetchedAt)
    if (dbEntry && Object.keys(dbEntry.response.odds).length > 0) {
      const staleResponse: OddsResponse = { ...dbEntry.response, stale: true };
      return new Response(JSON.stringify(staleResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. No cached data at all and another worker is refreshing — return unavailable
    return new Response(JSON.stringify({
      odds: {}, source: "unavailable", fetchedAt: "",
    } satisfies OddsResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch {
    // SECURITY: never log the caught error — it could contain secrets.
    console.error("[fetch-odds] unexpected_error");
    return new Response(JSON.stringify({
      odds: {}, source: "unavailable", fetchedAt: "",
    } satisfies OddsResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
