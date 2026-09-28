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
  "Los Angeles Rams": "LAR", "Miami Dolphins": "MIA", "Minnesota Vikings": "MIN",
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
      return { odds: {}, source: "unavailable", fetchedAt: "" };
    }

    const games = await apiRes.json();
    if (!Array.isArray(games) || games.length === 0) {
      console.log("[fetch-odds] provider returned empty game list");
      return { odds: {}, source: "unavailable", fetchedAt: "" };
    }

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

      if (!isFinite(kickoff)) continue;

      const ageMs = now - kickoff;
      if (ageMs > 4 * 60 * 60 * 1000) continue;

      candidates.push({ game, homeAbb: home, awayAbb: away, kickoff });
    }

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

    const fetchedAt = new Date().toISOString();
    const response: OddsResponse = {
      odds,
      source: "api",
      fetchedAt,
    };

    _memCache = { data: response, ts: Date.now() };
    await setDbCache(supabase, response);
    return response;

  } catch {
    console.error("[fetch-odds] provider_fetch_failed");
    return { odds: {}, source: "unavailable", fetchedAt: "" };
  }
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
      return new Response(JSON.stringify({
        error: "unauthorized",
        odds: {},
        source: "unavailable",
        fetchedAt: "",
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.substring("Bearer ".length);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: "invalid_token",
        odds: {},
        source: "unavailable",
        fetchedAt: "",
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({
        error: "profile_not_found",
        odds: {},
        source: "unavailable",
        fetchedAt: "",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPlan = profile.plan;
    if (userPlan !== "pro" && userPlan !== "elite") {
      return new Response(JSON.stringify({
        error: "insufficient_entitlement",
        odds: {},
        source: "unavailable",
        fetchedAt: "",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================================
    // User is Pro/Elite — proceed with odds fetch
    // ========================================================================

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
      // No body
    }

    if (_memCache && Date.now() - _memCache.ts < CACHE_TTL_MS) {
      return new Response(JSON.stringify(_memCache.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dbEntry = await getDbCache(supabase);
    if (dbEntry && dbEntry.age < CACHE_TTL_MS) {
      _memCache = { data: dbEntry.response, ts: Date.now() };
      return new Response(JSON.stringify(dbEntry.response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("THE_ODDS_API_KEY") || "";
    if (!apiKey) {
      return new Response(JSON.stringify({
        odds: {}, source: "unavailable", fetchedAt: "",
      } satisfies OddsResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claimed = await claimRefreshLease(supabase);

    if (claimed) {
      if (!_inflight) {
        _inflight = fetchFromProvider(apiKey, supabase).finally(() => { _inflight = null; });
      }
      const response = await _inflight;
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
      odds: {}, source: "unavailable", fetchedAt: "",
    } satisfies OddsResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch {
    console.error("[fetch-odds] unexpected_error");
    return new Response(JSON.stringify({
      odds: {}, source: "unavailable", fetchedAt: "",
    } satisfies OddsResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
