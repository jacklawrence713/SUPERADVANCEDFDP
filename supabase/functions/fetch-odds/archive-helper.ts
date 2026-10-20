// Helper to calculate NFL week from date
export function getNFLWeek(date: Date = new Date()): { week: number; season: number } {
  const season = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  const seasonStart = new Date(season, 8, 1); // Sept 1
  const daysDiff = Math.floor((date.getTime() - seasonStart.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.max(1, Math.min(18, Math.floor(daysDiff / 7) - 3));
  return { week, season };
}

// Archive odds to historical table (non-blocking)
export async function archiveOdds(supabase: any, odds: any): Promise<void> {
  try {
    const { week, season } = getNFLWeek();
    const records: any[] = [];
    const seen = new Set<string>();

    Object.entries(odds).forEach(([_, data]: [string, any]) => {
      if (!data.homeTeam || !data.awayTeam) return;
      const key = [data.homeTeam, data.awayTeam].sort().join("-");
      if (seen.has(key)) return;
      seen.add(key);

      records.push({
        nfl_week: week,
        nfl_season: season,
        game_date: data.commenceTime || new Date().toISOString(),
        home_team: data.homeTeam,
        away_team: data.awayTeam,
        home_spread: data.spread || null,
        away_spread: data.spread ? -data.spread : null,
        total: data.total || null,
        bookmakers_count: data.spreadBookmakers || 1,
        source: "api"
      });
    });

    if (records.length > 0) {
      await supabase.from("odds_archive").insert(records).catch((e: any) => {
        console.error("[odds-archive] failed:", e?.message);
      });
    }
  } catch (err) {
    console.error("[odds-archive] error:", err);
  }
}
