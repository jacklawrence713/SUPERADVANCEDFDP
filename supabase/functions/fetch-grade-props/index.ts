// Supabase Edge Function: fetch-grade-props
// On-demand grading of historical player props
// Called when user views Prior Weeks tab
// Grades ungraded props by fetching actual player stats from ESPN

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

async function fetchPlayerStatsFromESPN(playerName: string, week: number, season: number): Promise<any | null> {
  try {
    const gameResults = await fetchNFLGamesFromESPN(week, season);
    if (!gameResults || gameResults.length === 0) {
      return null;
    }

    for (const game of gameResults) {
      try {
        const statsUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${game.date}&week=${week}&season=${season}`;
        const statsRes = await fetch(statsUrl);

        if (!statsRes.ok) continue;

        const scoreboardData = await statsRes.json();
        if (!scoreboardData.events) continue;

        for (const event of scoreboardData.events) {
          if (!event.competitions || event.competitions.length === 0) continue;

          const comp = event.competitions[0];
          if (!comp.competitors) continue;

          for (const competitor of comp.competitors) {
            if (!competitor.statistics) continue;

            for (const statGroup of competitor.statistics) {
              if (!statGroup.athletes) continue;

              for (const athlete of statGroup.athletes) {
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

                  if (athlete.stats) {
                    for (const stat of athlete.stats) {
                      if (!stat.stats) continue;

                      if (stat.displayName === "Passing") {
                        stats.passingYards = stat.stats[0]?.value || 0;
                        stats.passingTouchdowns = stat.stats[1]?.value || 0;
                        stats.interceptions = stat.stats[2]?.value || 0;
                        stats.passingAttempts = stat.stats[3]?.value || 0;
                        stats.completions = stat.stats[4]?.value || 0;
                      }
                      else if (stat.displayName === "Rushing") {
                        stats.rushingYards = stat.stats[0]?.value || 0;
                        stats.rushingAttempts = stat.stats[1]?.value || 0;
                        stats.rushingTouchdowns = stat.stats[2]?.value || 0;
                      }
                      else if (stat.displayName === "Receiving") {
                        stats.receivingYards = stat.stats[0]?.value || 0;
                        stats.receptions = stat.stats[1]?.value || 0;
                        stats.receivingTouchdowns = stat.stats[2]?.value || 0;
                        stats.longestReception = stat.stats[3]?.value || 0;
                      }
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
    console.log(`[fetch-grade-props] ESPN stats fetch failed for ${playerName}:`, e);
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

function extractStatFromMarket(stats: any, marketKey: string): number | null {
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

async function gradeWeekProps(
  supabase: ReturnType<typeof createClient>,
  week: number,
  season: number
): Promise<{ graded: number; missing: number; errors: string[] }> {
  const errors: string[] = [];

  try {
    console.log(`[fetch-grade-props] Starting prop grading for Week ${week}...`);

    // Query ungraded props
    const { data: props, error: propsError } = await supabase
      .from("historical_player_props")
      .select("*")
      .eq("week", week)
      .eq("season", season);

    if (propsError || !props) {
      const msg = `No props found for Week ${week}`;
      console.log(`[fetch-grade-props] ${msg}`);
      errors.push(msg);
      return { graded: 0, missing: 0, errors };
    }

    console.log(`[fetch-grade-props] Found ${props.length} props to grade for Week ${week}`);

    let graded = 0;
    let missing = 0;

    for (const prop of props) {
      try {
        // Check if already graded
        const { data: existing } = await supabase
          .from("historical_prop_results")
          .select("id")
          .eq("prop_id", prop.id)
          .single();

        if (existing) {
          continue; // Already graded
        }

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
          stats.played !== false,
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
        } else {
          missing++;
        }
      } catch (e) {
        const msg = `Grading error for ${prop.player_name}: ${String(e)}`;
        console.log(`[fetch-grade-props] ${msg}`);
        errors.push(msg);
        missing++;
      }
    }

    console.log(`[fetch-grade-props] Grading complete: ${graded} graded, ${missing} missing stats`);
    return { graded, missing, errors };
  } catch (e) {
    const msg = `Prop grading failed: ${String(e)}`;
    console.error(`[fetch-grade-props] ${msg}`);
    errors.push(msg);
    return { graded: 0, missing: 0, errors };
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

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.substring("Bearer ".length);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    let week = 1;
    let season = 2026;

    try {
      const body = await req.clone().json();
      if (body.week) week = Number(body.week);
      if (body.season) season = Number(body.season);
    } catch {
      // No body, use defaults
    }

    // Grade props for this week
    const result = await gradeWeekProps(supabase, week, season);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[fetch-grade-props] Unexpected error:", e);
    return new Response(JSON.stringify({ error: "server_error", details: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
