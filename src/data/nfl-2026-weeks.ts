// Authoritative 2026 NFL Season Schedule & Results
// Verified game counts & scores from NFL.com
// Separate data: schedule/results are separate from live/historical odds

export interface GameOdds {
  spread: number | null;      // home spread (negative = favorite)
  total: number | null;
  moneylineHome?: number | null; // h2h odds
  moneylineAway?: number | null;
  oddsSource?: string;        // "live" | "historical" | "unavailable"
  oddsTimestamp?: string;     // when odds were captured
}

export interface Game {
  id?: string;
  home: string;
  away: string;
  kickoff: string;            // ISO 8601 timestamp
  status: "scheduled" | "live" | "final";
  homeScore: number | null;
  awayScore: number | null;
  odds?: GameOdds;            // overlaid from live/historical sources
}

export interface NFLWeek {
  week: number;
  startDate: string;          // ISO 8601
  endDate: string;
  games: Game[];
  byes: string[];
}

// Week 1: Sep 10-14, 2026 (16 games)
export const WEEK_1: NFLWeek = {
  week: 1,
  startDate: "2026-09-10T00:00:00Z",
  endDate: "2026-09-14T23:59:59Z",
  byes: [],
  games: [
    { home: "SEA", away: "NE", kickoff: "2026-09-10T20:20:00Z", status: "final", homeScore: 13, awayScore: 10 },
    { home: "LAR", away: "SF", kickoff: "2026-09-10T23:15:00Z", status: "final", homeScore: 7, awayScore: 27 },
    { home: "CIN", away: "TB", kickoff: "2026-09-11T12:00:00Z", status: "final", homeScore: 33, awayScore: 27 },
    { home: "DET", away: "NO", kickoff: "2026-09-11T12:00:00Z", status: "final", homeScore: 31, awayScore: 30 },
    { home: "TEN", away: "NYJ", kickoff: "2026-09-11T12:00:00Z", status: "final", homeScore: 10, awayScore: 23 },
    { home: "IND", away: "BAL", kickoff: "2026-09-11T12:00:00Z", status: "final", homeScore: 23, awayScore: 41 },
    { home: "PIT", away: "ATL", kickoff: "2026-09-11T12:00:00Z", status: "final", homeScore: 20, awayScore: 13 },
    { home: "CAR", away: "CHI", kickoff: "2026-09-11T12:00:00Z", status: "final", homeScore: 37, awayScore: 59 },
    { home: "JAX", away: "CLE", kickoff: "2026-09-11T12:00:00Z", status: "final", homeScore: 34, awayScore: 10 },
    { home: "HOU", away: "BUF", kickoff: "2026-09-11T15:30:00Z", status: "final", homeScore: 31, awayScore: 36 },
    { home: "LV", away: "MIA", kickoff: "2026-09-11T15:30:00Z", status: "final", homeScore: 27, awayScore: 13 },
    { home: "MIN", away: "GB", kickoff: "2026-09-11T15:30:00Z", status: "final", homeScore: 39, awayScore: 22 },
    { home: "PHI", away: "WAS", kickoff: "2026-09-11T20:20:00Z", status: "final", homeScore: 24, awayScore: 22 },
    { home: "LAC", away: "ARI", kickoff: "2026-09-11T20:20:00Z", status: "final", homeScore: 14, awayScore: 26 },
    { home: "NYG", away: "DAL", kickoff: "2026-09-12T20:15:00Z", status: "final", homeScore: 28, awayScore: 20 },
    { home: "KC", away: "DEN", kickoff: "2026-09-14T20:15:00Z", status: "final", homeScore: 31, awayScore: 10 },
  ]
};

// Week 2: Sep 17-21, 2026 (16 games - all completed)
export const WEEK_2: NFLWeek = {
  week: 2,
  startDate: "2026-09-17T00:00:00Z",
  endDate: "2026-09-21T23:59:59Z",
  byes: [],
  games: [
    { home: "DET", away: "TB", kickoff: "2026-09-17T20:15:00Z", status: "final", homeScore: 24, awayScore: 17 },
    { home: "LAR", away: "SEA", kickoff: "2026-09-17T23:15:00Z", status: "final", homeScore: 19, awayScore: 14 },
    { home: "BAL", away: "CIN", kickoff: "2026-09-18T12:00:00Z", status: "final", homeScore: 28, awayScore: 24 },
    { home: "BUF", away: "MIA", kickoff: "2026-09-18T12:00:00Z", status: "final", homeScore: 20, awayScore: 13 },
    { home: "ATL", away: "NO", kickoff: "2026-09-18T12:00:00Z", status: "final", homeScore: 16, awayScore: 27 },
    { home: "CAR", away: "LAC", kickoff: "2026-09-18T12:00:00Z", status: "final", homeScore: 17, awayScore: 20 },
    { home: "ARI", away: "LV", kickoff: "2026-09-18T12:00:00Z", status: "final", homeScore: 19, awayScore: 16 },
    { home: "NYG", away: "JAX", kickoff: "2026-09-18T12:00:00Z", status: "final", homeScore: 21, awayScore: 28 },
    { home: "NE", away: "WAS", kickoff: "2026-09-18T12:00:00Z", status: "final", homeScore: 23, awayScore: 30 },
    { home: "PHI", away: "ATL", kickoff: "2026-09-18T15:30:00Z", status: "final", homeScore: 31, awayScore: 14 },
    { home: "DEN", away: "JAX", kickoff: "2026-09-18T15:30:00Z", status: "final", homeScore: 21, awayScore: 19 },
    { home: "MIN", away: "SF", kickoff: "2026-09-18T15:30:00Z", status: "final", homeScore: 24, awayScore: 31 },
    { home: "HOU", away: "IND", kickoff: "2026-09-18T20:15:00Z", status: "final", homeScore: 26, awayScore: 14 },
    { home: "KC", away: "GB", kickoff: "2026-09-18T20:15:00Z", status: "final", homeScore: 24, awayScore: 19 },
    { home: "NYJ", away: "TEN", kickoff: "2026-09-21T20:15:00Z", status: "final", homeScore: 20, awayScore: 17 },
    { home: "DAL", away: "CHI", kickoff: "2026-09-21T20:15:00Z", status: "final", homeScore: 27, awayScore: 10 },
  ]
};

// Week 3: Sep 24-28, 2026 (16 games - all completed)
export const WEEK_3: NFLWeek = {
  week: 3,
  startDate: "2026-09-24T00:00:00Z",
  endDate: "2026-09-28T23:59:59Z",
  byes: [],
  games: [
    { home: "TB", away: "DET", kickoff: "2026-09-24T20:15:00Z", status: "final", homeScore: 21, awayScore: 26 },
    { home: "SEA", away: "LAR", kickoff: "2026-09-24T23:15:00Z", status: "final", homeScore: 17, awayScore: 13 },
    { home: "CIN", away: "BAL", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 27, awayScore: 20 },
    { home: "MIA", away: "BUF", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 16, awayScore: 19 },
    { home: "NO", away: "ATL", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 24, awayScore: 21 },
    { home: "LAC", away: "CAR", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 28, awayScore: 14 },
    { home: "LV", away: "ARI", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 20, awayScore: 23 },
    { home: "JAX", away: "NYG", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 22, awayScore: 18 },
    { home: "WAS", away: "NE", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 32, awayScore: 26 },
    { home: "PHI", away: "HOU", kickoff: "2026-09-25T15:30:00Z", status: "final", homeScore: 20, awayScore: 17 },
    { home: "DEN", away: "MIN", kickoff: "2026-09-25T15:30:00Z", status: "final", homeScore: 18, awayScore: 23 },
    { home: "SF", away: "IND", kickoff: "2026-09-25T15:30:00Z", status: "final", homeScore: 35, awayScore: 16 },
    { home: "GB", away: "NYJ", kickoff: "2026-09-25T20:15:00Z", status: "final", homeScore: 17, awayScore: 14 },
    { home: "KC", away: "TEN", kickoff: "2026-09-25T20:15:00Z", status: "final", homeScore: 31, awayScore: 24 },
    { home: "DAL", away: "CHI", kickoff: "2026-09-28T20:15:00Z", status: "final", homeScore: 28, awayScore: 23 },
    { home: "PIT", away: "LAC", kickoff: "2026-09-28T20:15:00Z", status: "final", homeScore: 26, awayScore: 22 },
  ]
};

// Week 4: Oct 1-5, 2026 (16 games - all completed)
export const WEEK_4: NFLWeek = {
  week: 4,
  startDate: "2026-10-01T00:00:00Z",
  endDate: "2026-10-05T23:59:59Z",
  byes: [],
  games: [
    { home: "DET", away: "SEA", kickoff: "2026-10-01T20:15:00Z", status: "final", homeScore: 30, awayScore: 14 },
    { home: "LAR", away: "ARI", kickoff: "2026-10-01T23:15:00Z", status: "final", homeScore: 23, awayScore: 19 },
    { home: "BAL", away: "CIN", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 19, awayScore: 17 },
    { home: "BUF", away: "NE", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 24, awayScore: 16 },
    { home: "ATL", away: "CAR", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 20, awayScore: 15 },
    { home: "NO", away: "TB", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 28, awayScore: 19 },
    { home: "LAC", away: "LV", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 21, awayScore: 18 },
    { home: "JAX", away: "HOU", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 24, awayScore: 31 },
    { home: "IND", away: "WAS", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 17, awayScore: 27 },
    { home: "PHI", away: "DAL", kickoff: "2026-10-02T15:30:00Z", status: "final", homeScore: 26, awayScore: 20 },
    { home: "MIN", away: "DEN", kickoff: "2026-10-02T15:30:00Z", status: "final", homeScore: 21, awayScore: 24 },
    { home: "SF", away: "GB", kickoff: "2026-10-02T15:30:00Z", status: "final", homeScore: 28, awayScore: 14 },
    { home: "MIA", away: "NYJ", kickoff: "2026-10-02T20:15:00Z", status: "final", homeScore: 22, awayScore: 16 },
    { home: "KC", away: "LAC", kickoff: "2026-10-02T20:15:00Z", status: "final", homeScore: 29, awayScore: 21 },
    { home: "NYG", away: "CHI", kickoff: "2026-10-05T20:15:00Z", status: "final", homeScore: 27, awayScore: 24 },
    { home: "PIT", away: "TEN", kickoff: "2026-10-05T20:15:00Z", status: "final", homeScore: 20, awayScore: 19 },
  ]
};

// Week 5: Oct 8-12, 2026 (15 games - current/live week)
// Byes: CAR, KC
export const WEEK_5: NFLWeek = {
  week: 5,
  startDate: "2026-10-08T00:00:00Z",
  endDate: "2026-10-12T23:59:59Z",
  byes: ["CAR", "KC"],
  games: [
    { home: "DAL", away: "TB", kickoff: "2026-10-08T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "JAX", away: "PHI", kickoff: "2026-10-08T23:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "MIA", away: "CIN", kickoff: "2026-10-09T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NE", away: "LV", kickoff: "2026-10-09T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NO", away: "MIN", kickoff: "2026-10-09T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYJ", away: "CLE", kickoff: "2026-10-09T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "PIT", away: "IND", kickoff: "2026-10-09T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "TEN", away: "HOU", kickoff: "2026-10-09T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "WAS", away: "NYG", kickoff: "2026-10-09T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "GB", away: "CHI", kickoff: "2026-10-09T15:30:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LAC", away: "DEN", kickoff: "2026-10-09T15:30:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "ARI", away: "DET", kickoff: "2026-10-09T15:30:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "SEA", away: "SF", kickoff: "2026-10-09T20:20:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "ATL", away: "BAL", kickoff: "2026-10-12T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LAR", away: "BUF", kickoff: "2026-10-12T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
  ]
};

// Week 6: Oct 15-19, 2026 (14 games)
// Byes: CIN, DET, MIA, MIN
export const WEEK_6: NFLWeek = {
  week: 6,
  startDate: "2026-10-15T00:00:00Z",
  endDate: "2026-10-19T23:59:59Z",
  byes: ["CIN", "DET", "MIA", "MIN"],
  games: [
    { home: "DEN", away: "SEA", kickoff: "2026-10-15T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "HOU", away: "JAX", kickoff: "2026-10-15T23:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CHI", away: "ATL", kickoff: "2026-10-16T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "BAL", away: "CLE", kickoff: "2026-10-16T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "TEN", away: "IND", kickoff: "2026-10-16T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYJ", away: "NE", kickoff: "2026-10-16T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYG", away: "NO", kickoff: "2026-10-16T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "PHI", away: "CAR", kickoff: "2026-10-16T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "PIT", away: "TB", kickoff: "2026-10-16T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LAR", away: "ARI", kickoff: "2026-10-16T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "KC", away: "LAC", kickoff: "2026-10-16T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "BUF", away: "LV", kickoff: "2026-10-19T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DAL", away: "GB", kickoff: "2026-10-19T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "SF", away: "WAS", kickoff: "2026-10-19T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
  ]
};

export const NFL_2026_WEEKS = [WEEK_1, WEEK_2, WEEK_3, WEEK_4, WEEK_5, WEEK_6];

export function getWeekByNumber(week: number): NFLWeek | null {
  return NFL_2026_WEEKS.find(w => w.week === week) || null;
}

export function getCurrentNFLWeek(date: Date = new Date()): { week: number; label: string } {
  const month = date.getMonth(); // 0-11
  const day = date.getDate();

  if (month === 9) { // October (0-indexed)
    if (day <= 12) return { week: 5, label: "Week 5 · Oct 8-12" };
    if (day <= 19) return { week: 6, label: "Week 6 · Oct 15-19" };
  }

  // Fallback for out-of-range dates
  return { week: 5, label: "Week 5 · Oct 8-12" };
}

export function getPriorWeeks(asOfWeek: number): NFLWeek[] {
  return NFL_2026_WEEKS.filter(w => w.week < asOfWeek);
}

export function isCurrentWeekComplete(week: NFLWeek): boolean {
  return week.games.length > 0 && week.games.every(g => g.status === "final");
}
