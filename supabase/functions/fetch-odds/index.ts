// Supabase Edge Function: fetch-odds
// Server-side proxy for The Odds API — keeps provider key off the client.
// Currently supports: NFL spreads + totals (Prompt 22 will add markets).
//
// Cache architecture:
//   Layer 1: In-memory cache (_memCache) — fastest, isolate-local
//   Layer 2: DB cache (odds_cache table) — shared across isolates/regions
//   Stampede protection:
//     Intra-isolate: _inflight promise coalescing
//     Cross-isolate: DB-backed refresh lease via claim_odds_refresh RPC
//   Stale-while-revalidate: losers of the lease serve previous cached data

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

// ── In-memory cache (shared within a single Deno Deploy isolate) ──
let _memCache: { data: OddsResponse; ts: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ── Intra-isolate stampede protection ────────────────────────────
// If a provider fetch is in-flight within this isolate, subsequent
// requests wait for it instead of making duplicate API calls.
let _inflight: Promise<OddsResponse> | null = null;

interface TeamOdds {
  spread: number;
  total: number;
  opp: string;
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
    // Current markets: spreads,totals (Prompt 22 will add h2h, props, etc.)
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
        fetchedAt: new Date().toISOString(),
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
        fetchedAt: new Date().toISOString(),
      };
    }

    // Normalize provider response
    const odds: { [team: string]: TeamOdds } = {};
    for (const game of games) {
      const home = ODDS_TEAM_MAP[game.home_team];
      const away = ODDS_TEAM_MAP[game.away_team];
      if (!home || !away) continue;

      let spreadHome = 0, spreadAway = 0, total = 45;
      const bk = game.bookmakers?.find((b: any) => b.key === "draftkings") || game.bookmakers?.[0];
      if (bk) {
        const sm = bk.markets?.find((m: any) => m.key === "spreads");
        const tm = bk.markets?.find((m: any) => m.key === "totals");
        if (sm) {
          for (const o of sm.outcomes) {
            if (ODDS_TEAM_MAP[o.name] === home) spreadHome = o.point;
            if (ODDS_TEAM_MAP[o.name] === away) spreadAway = o.point;
          }
        }
        if (tm?.outcomes?.[0]) total = tm.outcomes[0].point;
      }
      odds[home] = { spread: spreadHome, total, opp: away };
      odds[away] = { spread: spreadAway, total, opp: home };
    }

    const response: OddsResponse = {
      odds,
      source: "api",
      fetchedAt: new Date().toISOString(),
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
      fetchedAt: new Date().toISOString(),
    };
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
        odds: {}, source: "unavailable", fetchedAt: new Date().toISOString(),
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
      odds: {}, source: "unavailable", fetchedAt: new Date().toISOString(),
    } satisfies OddsResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch {
    // SECURITY: never log the caught error — it could contain secrets.
    console.error("[fetch-odds] unexpected_error");
    return new Response(JSON.stringify({
      odds: {}, source: "unavailable", fetchedAt: new Date().toISOString(),
    } satisfies OddsResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
