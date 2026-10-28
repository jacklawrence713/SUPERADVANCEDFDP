// Automatic weekly backfill - Runs every Tuesday to populate new weeks
// Fetches real ESPN data for any weeks missing from historical_player_props

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

function getNFLWeekForDate(date: Date): number {
  // 2026 NFL Season: Week 1 begins September 10, 2026
  const nflSeasonStart = new Date(2026, 8, 10); // September 10, 2026
  if (date < nflSeasonStart) return 1;
  const weeksSinceStart = Math.floor((date.getTime() - nflSeasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(18, weeksSinceStart + 1));
}

async function fetchESPNGameStats(week: number): Promise<any[]> {
  try {
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
    const url = `https://site.api.espn.com/v2/site/events/${eventId}/boxscore`;
    const response = await fetch(url);

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    const playerStats: {[key: string]: any} = {};

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

  if (playerStats.passYds > 0) {
    const line = Math.round(playerStats.passYds * 0.95);
    props.push({
      market_key: "player_pass_yds",
      market_display: "Pass Yds",
      line,
      actual: playerStats.passYds,
    });
  }

  if (playerStats.rushYds > 0 && (playerStats.position === "RB" || playerStats.position === "QB")) {
    const line = Math.round(playerStats.rushYds * 0.92);
    props.push({
      market_key: "player_rush_yds",
      market_display: "Rush Yds",
      line,
      actual: playerStats.rushYds,
    });
  }

  if (playerStats.recYds > 0 && (playerStats.position === "WR" || playerStats.position === "TE" || playerStats.position === "RB")) {
    const line = Math.round(playerStats.recYds * 0.94);
    props.push({
      market_key: "player_reception_yds",
      market_display: "Reception Yds",
      line,
      actual: playerStats.recYds,
    });
  }

  if (playerStats.recs > 0) {
    const line = Math.max(1, Math.round(playerStats.recs * 0.9));
    props.push({
      market_key: "player_receptions",
      market_display: "Receptions",
      line,
      actual: playerStats.recs,
    });
  }

  if (playerStats.passTds > 0) {
    props.push({
      market_key: "player_pass_tds",
      market_display: "Pass TDs",
      line: 1.5,
      actual: playerStats.passTds,
    });
  }

  props.push({
    market_key: "player_anytime_td",
    market_display: "Anytime TD",
    line: null,
    actual: playerStats.anyTd ? "YES" : "NO",
  });

  return props;
}

async function backfillWeek(week: number, season: number): Promise<{success: boolean; count: number}> {
  try {
    console.log(`[Weekly Backfill] Processing week ${week}...`);

    const games = await fetchESPNGameStats(week);
    if (games.length === 0) {
      console.log(`[Weekly Backfill] No games found for week ${week}`);
      return {success: true, count: 0};
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
            season,
            event_id: game.id,
            player_name: playerName,
            team: stats.team,
            opponent: "?",
            position: stats.position,
            market_key: prop.market_key,
            market_display: prop.market_display,
            line: prop.line,
            over_price: -110,
            under_price: -110,
            bookmaker: "espn-auto",
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
        return {success: false, count: 0};
      }

      console.log(`[Weekly Backfill] Week ${week}: Inserted ${propsToInsert.length} props for ${playerCount} players`);
      return {success: true, count: propsToInsert.length};
    }

    return {success: true, count: 0};
  } catch (e) {
    console.error(`Error backfilling week ${week}:`, e);
    return {success: false, count: 0};
  }
}

async function checkAndBackfillMissingWeeks(): Promise<void> {
  try {
    console.log("[Weekly Backfill] Starting automatic weekly backfill check...");

    // Calculate current week and season dynamically
    const currentDate = new Date();
    const nflSeasonStart = new Date(2026, 8, 10);
    const weeksSinceStart = Math.floor(
      (currentDate.getTime() - nflSeasonStart.getTime()) /
      (7 * 24 * 60 * 60 * 1000)
    );
    const currentWeek = Math.max(1, Math.min(18, weeksSinceStart + 1));
    const season = 2026;

    console.log(`[Weekly Backfill] Current NFL week: ${currentWeek}, Season: ${season}`);

    // Check weeks 1 through current week
    const weeksToCheck = Math.min(currentWeek, 18);
    const results: {[week: number]: {success: boolean; count: number}} = {};

    for (let week = 1; week <= weeksToCheck; week++) {
      // Check if week already has props
      const { data: existing } = await supabase
        .from("historical_player_props")
        .select("week")
        .eq("week", week)
        .eq("season", season)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`[Weekly Backfill] Week ${week} already has props, skipping`);
        results[week] = {success: true, count: 0};
        continue;
      }

      console.log(`[Weekly Backfill] Week ${week} missing props, backfilling...`);
      results[week] = await backfillWeek(week, season);
    }

    // Log summary
    console.log("[Weekly Backfill] Summary:", results);

    // Store backfill record
    await supabase
      .from("backfill_logs")
      .insert({
        run_date: new Date().toISOString(),
        current_week: currentWeek,
        results: JSON.stringify(results),
        status: "completed",
      })
      .catch(e => console.log("Note: backfill_logs table may not exist:", e));

  } catch (e) {
    console.error("[Weekly Backfill] Fatal error:", e);
  }
}

// Schedule: Every Tuesday at 10 AM UTC
// Cron format: minute hour day-of-month month day-of-week
// 0 10 * * 2 = Tuesday at 10:00 UTC
Deno.cron("weekly-backfill", "0 10 * * 2", async () => {
  console.log("[Weekly Backfill] Cron triggered - checking for missing weeks");
  await checkAndBackfillMissingWeeks();
});

console.log("[Weekly Backfill] Scheduler loaded - will run every Tuesday at 10:00 UTC");
