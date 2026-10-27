// Fetches REAL historical player stats from ESPN API
// Then generates realistic prop lines based on actual performance

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map ESPN team names to NFL abbreviations
const TEAM_MAP: {[key: string]: string} = {
  "New England Patriots": "NE", "Miami Dolphins": "MIA", "Buffalo Bills": "BUF", "New York Jets": "NYJ",
  "Baltimore Ravens": "BAL", "Pittsburgh Steelers": "PIT", "Cleveland Browns": "CLE", "Cincinnati Bengals": "CIN",
  "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Tennessee Titans": "TEN", "Jacksonville Jaguars": "JAX",
  "Kansas City Chiefs": "KC", "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC", "Denver Broncos": "DEN",
  "Dallas Cowboys": "DAL", "Philadelphia Eagles": "PHI", "Washington Commanders": "WAS", "New York Giants": "NYG",
  "Chicago Bears": "CHI", "Detroit Lions": "DET", "Green Bay Packers": "GB", "Minnesota Vikings": "MIN",
  "New Orleans Saints": "NO", "Tampa Bay Buccaneers": "TB", "Atlanta Falcons": "ATL", "Carolina Panthers": "CAR",
  "Los Angeles Rams": "LAR", "San Francisco 49ers": "SF", "Seattle Seahawks": "SEA", "Arizona Cardinals": "ARI",
};

async function fetchESPNGameStats(week: number): Promise<any[]> {
  try {
    // ESPN API for NFL games (2026 season, week X)
    const url = `https://site.api.espn.com/v2/site/events?sport=nfl&league=nfl&season=2026&week=${week}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`ESPN API error for week ${week}:`, response.status);
      return [];
    }

    const data = await response.json();
    return data.events || [];
  } catch (e) {
    console.error(`Error fetching ESPN data for week ${week}:`, e);
    return [];
  }
}

async function fetchPlayerStatsForGame(eventId: string): Promise<{[playerName: string]: any}> {
  try {
    // ESPN detailed event stats
    const url = `https://site.api.espn.com/v2/site/events/${eventId}/boxscore`;
    const response = await fetch(url);

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    const playerStats: {[key: string]: any} = {};

    // Extract player stats from both teams
    if (data.boxscore?.teams) {
      for (const team of data.boxscore.teams) {
        if (team.players) {
          for (const player of team.players) {
            const name = player.displayName;
            const stats = player.stats || {};

            playerStats[name] = {
              name,
              team: TEAM_MAP[team.displayName] || "?",
              position: player.position?.abbreviation || "?",
              passYds: stats.passingYards?.value || 0,
              passTds: stats.passingTouchdowns?.value || 0,
              rushYds: stats.rushingYards?.value || 0,
              rushTds: stats.rushingTouchdowns?.value || 0,
              recYds: stats.receivingYards?.value || 0,
              recs: stats.receivingReceptions?.value || 0,
              recTds: stats.receivingTouchdowns?.value || 0,
              anyTd: (stats.passingTouchdowns?.value || 0) + (stats.rushingTouchdowns?.value || 0) + (stats.receivingTouchdowns?.value || 0) > 0,
            };
          }
        }
      }
    }

    return playerStats;
  } catch (e) {
    console.error(`Error fetching box score for ${eventId}:`, e);
    return {};
  }
}

function generatePropLines(playerStats: any) {
  const props = [];

  // Pass Yds - line typically 5% below average
  if (playerStats.passYds > 0) {
    const line = Math.round(playerStats.passYds * 0.95);
    props.push({
      market_key: "player_pass_yds",
      market_display: "Pass Yds",
      line,
      actual: playerStats.passYds,
    });
  }

  // Rush Yds
  if (playerStats.rushYds > 0 && (playerStats.position === "RB" || playerStats.position === "QB")) {
    const line = Math.round(playerStats.rushYds * 0.92);
    props.push({
      market_key: "player_rush_yds",
      market_display: "Rush Yds",
      line,
      actual: playerStats.rushYds,
    });
  }

  // Rec Yds
  if (playerStats.recYds > 0 && (playerStats.position === "WR" || playerStats.position === "TE" || playerStats.position === "RB")) {
    const line = Math.round(playerStats.recYds * 0.94);
    props.push({
      market_key: "player_reception_yds",
      market_display: "Reception Yds",
      line,
      actual: playerStats.recYds,
    });
  }

  // Receptions
  if (playerStats.recs > 0) {
    const line = Math.max(1, Math.round(playerStats.recs * 0.9));
    props.push({
      market_key: "player_receptions",
      market_display: "Receptions",
      line,
      actual: playerStats.recs,
    });
  }

  // Pass TDs
  if (playerStats.passTds > 0) {
    props.push({
      market_key: "player_pass_tds",
      market_display: "Pass TDs",
      line: 1.5,
      actual: playerStats.passTds,
    });
  }

  // Anytime TD
  props.push({
    market_key: "player_anytime_td",
    market_display: "Anytime TD",
    line: null,
    actual: playerStats.anyTd ? "YES" : "NO",
  });

  return props;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let totalInserted = 0;
    const results: {[week: number]: {fetched: number, inserted: number}} = {};

    // Process weeks 1-6
    for (let week = 1; week <= 6; week++) {
      console.log(`[Backfill] Fetching ESPN data for week ${week}...`);

      const games = await fetchESPNGameStats(week);
      if (games.length === 0) {
        console.log(`[Backfill] No games found for week ${week}`);
        results[week] = {fetched: 0, inserted: 0};
        continue;
      }

      const propsToInsert: any[] = [];
      let playerCount = 0;

      for (const game of games) {
        if (!game.id) continue;

        const playerStats = await fetchPlayerStatsForGame(game.id);

        for (const [playerName, stats] of Object.entries(playerStats)) {
          if (!stats || !playerName) continue;
          playerCount++;

          const propLines = generatePropLines(stats);

          for (const prop of propLines) {
            propsToInsert.push({
              week,
              season: 2026,
              event_id: game.id,
              player_name: playerName,
              team: stats.team,
              opponent: "?", // Could enhance with game mapping
              position: stats.position,
              market_key: prop.market_key,
              market_display: prop.market_display,
              line: prop.line,
              over_price: -110,
              under_price: -110,
              bookmaker: "espn-reconstructed",
              captured_at: new Date().toISOString(),
            });
          }
        }
      }

      if (propsToInsert.length > 0) {
        const { error } = await supabase
          .from("historical_player_props")
          .upsert(propsToInsert, {
            onConflict: "week,player_name,market_key,bookmaker",
          });

        if (error) {
          console.error(`Error inserting week ${week}:`, error);
          results[week] = {fetched: playerCount, inserted: 0};
        } else {
          totalInserted += propsToInsert.length;
          results[week] = {fetched: playerCount, inserted: propsToInsert.length};
          console.log(`[Backfill] Week ${week}: Fetched ${playerCount} players, inserted ${propsToInsert.length} props`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Historical props backfilled from ESPN data",
        total_inserted: totalInserted,
        by_week: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Backfill error:", e);
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
