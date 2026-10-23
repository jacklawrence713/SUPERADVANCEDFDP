// Supabase Edge Function: fetch-espn-stats
// Fetches historical NFL game results and player statistics from ESPN API

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

interface GameResult {
  week: number;
  awayTeam: string;
  homeTeam: string;
  awayScore: number;
  homeScore: number;
  date: string;
  status: string;
}

// Fetch games for a specific NFL season/week
async function fetchNFLGames(week: number, season: number = 2026): Promise<GameResult[]> {
  try {
    const url = `${ESPN_BASE_URL}/scoreboard?week=${week}&season=${season}`;
    console.log(`[fetch-espn] Fetching games for Week ${week}, Season ${season}...`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[fetch-espn] HTTP ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const games: GameResult[] = [];
    
    if (data.events && Array.isArray(data.events)) {
      for (const event of data.events) {
        if (!event.competitions || event.competitions.length === 0) continue;
        
        const comp = event.competitions[0];
        if (!comp.competitors || comp.competitors.length < 2) continue;
        
        const away = comp.competitors[0];
        const home = comp.competitors[1];
        
        const isComplete = comp.status?.type === "final" || comp.status?.type === "completed";
        
        games.push({
          week,
          awayTeam: away.team?.abbreviation || "UNK",
          homeTeam: home.team?.abbreviation || "UNK",
          awayScore: parseInt(away.score) || 0,
          homeScore: parseInt(home.score) || 0,
          date: comp.date || event.date || new Date().toISOString(),
          status: isComplete ? "final" : comp.status?.description || "scheduled",
        });
      }
    }
    
    console.log(`[fetch-espn] Retrieved ${games.length} games for Week ${week}`);
    return games;
  } catch (error) {
    console.error(`[fetch-espn] Error fetching games:`, error);
    return [];
  }
}

// Main handler
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const week = parseInt(url.searchParams.get("week") || "1");
  const season = parseInt(url.searchParams.get("season") || "2026");
  
  try {
    if (action === "games") {
      const games = await fetchNFLGames(week, season);
      return new Response(JSON.stringify({ success: true, games }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[fetch-espn] Error:", error);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
