// Enhanced fetch-odds with historical archiving
// Archives all fetched odds to odds_archive table for historical analysis

import { createClient } from "npm:@supabase/supabase-js@2.39.0";

// Determine NFL week from date (2026 season example)
function getNFLWeek(date: Date = new Date()): { week: number; season: number } {
  const season = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  const seasonStart = new Date(season, 8, 1); // Sept 1
  const weeksDiff = Math.floor((date.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  // Regular season starts ~week 1 (late Aug), so week = weeksDiff - 3
  const week = Math.max(1, Math.min(18, weeksDiff - 3));
  return { week, season };
}

// Archive odds to historical table (non-blocking, fire-and-forget)
async function archiveOdds(
  supabase: any,
  odds: Record<string, any>,
  commenceTime?: string
): Promise<void> {
  try {
    const { week, season } = getNFLWeek(new Date(commenceTime || Date.now()));

    // Build archive records from odds object
    const records: any[] = [];
    const processedGames = new Set<string>();

    Object.entries(odds).forEach(([team, data]: [string, any]) => {
      if (!data.homeTeam || !data.awayTeam) return;

      const gameKey = [data.homeTeam, data.awayTeam].sort().join("-");
      if (processedGames.has(gameKey)) return;
      processedGames.add(gameKey);

      records.push({
        nfl_week: week,
        nfl_season: season,
        game_date: commenceTime ? new Date(commenceTime).toISOString() : new Date().toISOString(),
        home_team: data.homeTeam,
        away_team: data.awayTeam,
        home_spread: data.spread || null,
        away_spread: data.spread ? -data.spread : null,
        total: data.total || null,
        bookmakers_count: data.spreadBookmakers || 1,
        source: "api",
        raw_response: { odds: data }
      });
    });

    if (records.length > 0) {
      await supabase
        .from("odds_archive")
        .insert(records)
        .catch((e: any) => console.error("[archive-odds] insert_failed:", e.message));
    }
  } catch (err) {
    console.error("[archive-odds] error:", err);
    // Non-fatal, don't block response
  }
}

// Export: archive odds to historical table
export async function archiveWeekOdds(
  supabase: any,
  week: number,
  season: number,
  oddsData: Record<string, any>[]
): Promise<void> {
  // Handle batch archiving if historical data is provided
  try {
    const records = oddsData.map((game: any) => ({
      nfl_week: week,
      nfl_season: season,
      game_date: game.commence_time || new Date().toISOString(),
      home_team: game.home_team,
      away_team: game.away_team,
      home_spread: game.home_spread || null,
      away_spread: game.away_spread || null,
      total: game.total || null,
      bookmakers_count: game.bookmakers?.length || 1,
      source: "api",
      raw_response: game
    }));

    if (records.length > 0) {
      await supabase
        .from("odds_archive")
        .insert(records)
        .catch((e: any) => console.error("[batch-archive] failed:", e.message));
    }
  } catch (err) {
    console.error("[archiveWeekOdds] error:", err);
  }
}

export { archiveOdds };
