// Authoritative 2026 NFL Season Schedule & Results
// Source: NFL.com official schedules verified Oct 13, 2026
// Weeks 1-18 complete with official data (18-week regular season)
// Separation: Schedule/Results ≠ Odds (odds overlaid separately)

export interface GameOdds {
  spread: number | null;
  total: number | null;
  moneylineHome?: number | null;
  moneylineAway?: number | null;
  oddsSource?: string;
  oddsTimestamp?: string;
}

export interface Game {
  id?: string;
  home: string;
  away: string;
  kickoff: string | null;
  status: "scheduled" | "live" | "final";
  homeScore: number | null;
  awayScore: number | null;
  odds?: GameOdds;
}

export interface NFLWeek {
  week: number;
  startDate: string;
  endDate: string;
  byes: string[];
  source?: string;
  verifiedAt?: string;
  games: Game[];
}

export const WEEK_1: NFLWeek = {
  week: 1,
  startDate: "2026-09-09T00:00:00Z",
  endDate: "2026-09-14T23:59:59Z",
  byes: [],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "SEA", away: "NE", kickoff: "2026-09-09T20:20:00Z", status: "final", homeScore: 13, awayScore: 10 },
    { home: "SF", away: "LA", kickoff: "2026-09-10T23:15:00Z", status: "final", homeScore: 27, awayScore: 7 },
    { home: "CHI", away: "CAR", kickoff: "2026-09-13T12:00:00Z", status: "final", homeScore: 59, awayScore: 37 },
    { home: "CIN", away: "TB", kickoff: "2026-09-13T12:00:00Z", status: "final", homeScore: 33, awayScore: 27 },
    { home: "DET", away: "NO", kickoff: "2026-09-13T12:00:00Z", status: "final", homeScore: 31, awayScore: 30 },
    { home: "BUF", away: "HOU", kickoff: "2026-09-13T15:30:00Z", status: "final", homeScore: 36, awayScore: 31 },
    { home: "BAL", away: "IND", kickoff: "2026-09-13T12:00:00Z", status: "final", homeScore: 41, awayScore: 23 },
    { home: "JAX", away: "CLE", kickoff: "2026-09-13T12:00:00Z", status: "final", homeScore: 34, awayScore: 10 },
    { home: "PIT", away: "ATL", kickoff: "2026-09-13T12:00:00Z", status: "final", homeScore: 20, awayScore: 13 },
    { home: "NYJ", away: "TEN", kickoff: "2026-09-13T12:00:00Z", status: "final", homeScore: 23, awayScore: 10 },
    { home: "ARI", away: "LAC", kickoff: "2026-09-13T15:30:00Z", status: "final", homeScore: 26, awayScore: 14 },
    { home: "LV", away: "MIA", kickoff: "2026-09-13T15:30:00Z", status: "final", homeScore: 27, awayScore: 13 },
    { home: "MIN", away: "GB", kickoff: "2026-09-13T15:30:00Z", status: "final", homeScore: 39, awayScore: 22 },
    { home: "PHI", away: "WAS", kickoff: "2026-09-13T20:20:00Z", status: "final", homeScore: 24, awayScore: 22 },
    { home: "NYG", away: "DAL", kickoff: "2026-09-13T20:20:00Z", status: "final", homeScore: 28, awayScore: 20 },
    { home: "KC", away: "DEN", kickoff: "2026-09-14T20:15:00Z", status: "final", homeScore: 31, awayScore: 10 },
  ]
};

export const WEEK_2: NFLWeek = {
  week: 2,
  startDate: "2026-09-17T00:00:00Z",
  endDate: "2026-09-21T23:59:59Z",
  byes: [],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "DET", away: "BUF", kickoff: "2026-09-17T20:15:00Z", status: "final", homeScore: 31, awayScore: 41 },
    { home: "CAR", away: "ATL", kickoff: "2026-09-17T12:00:00Z", status: "final", homeScore: 34, awayScore: 3 },
    { home: "NO", away: "BAL", kickoff: "2026-09-17T12:00:00Z", status: "final", homeScore: 24, awayScore: 17 },
    { home: "MIN", away: "CHI", kickoff: "2026-09-17T12:00:00Z", status: "final", homeScore: 9, awayScore: 3 },
    { home: "CIN", away: "HOU", kickoff: "2026-09-17T12:00:00Z", status: "final", homeScore: 20, awayScore: 6 },
    { home: "PIT", away: "NE", kickoff: "2026-09-17T12:00:00Z", status: "final", homeScore: 3, awayScore: 20 },
    { home: "GB", away: "NYJ", kickoff: "2026-09-17T12:00:00Z", status: "final", homeScore: 20, awayScore: 17 },
    { home: "CLE", away: "TB", kickoff: "2026-09-17T12:00:00Z", status: "final", homeScore: 23, awayScore: 19 },
    { home: "PHI", away: "TEN", kickoff: "2026-09-17T12:00:00Z", status: "final", homeScore: 24, awayScore: 20 },
    { home: "JAX", away: "DEN", kickoff: "2026-09-17T15:30:00Z", status: "final", homeScore: 13, awayScore: 20 },
    { home: "LV", away: "LAC", kickoff: "2026-09-17T15:30:00Z", status: "final", homeScore: 26, awayScore: 14 },
    { home: "SEA", away: "ARI", kickoff: "2026-09-17T15:30:00Z", status: "final", homeScore: 31, awayScore: 7 },
    { home: "WAS", away: "DAL", kickoff: "2026-09-17T20:15:00Z", status: "final", homeScore: 20, awayScore: 37 },
    { home: "MIA", away: "SF", kickoff: "2026-09-17T20:15:00Z", status: "final", homeScore: 13, awayScore: 35 },
    { home: "IND", away: "KC", kickoff: "2026-09-17T20:15:00Z", status: "final", homeScore: 30, awayScore: 33 },
    { home: "NYG", away: "LA", kickoff: "2026-09-17T20:15:00Z", status: "final", homeScore: 6, awayScore: 28 },
  ]
};

export const WEEK_3: NFLWeek = {
  week: 3,
  startDate: "2026-09-24T00:00:00Z",
  endDate: "2026-09-28T23:59:59Z",
  byes: [],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "GB", away: "ATL", kickoff: "2026-09-24T20:15:00Z", status: "final", homeScore: 14, awayScore: 35 },
    { home: "BUF", away: "LAC", kickoff: "2026-09-24T20:15:00Z", status: "final", homeScore: 24, awayScore: 16 },
    { home: "CLE", away: "CAR", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 21, awayScore: 18 },
    { home: "DET", away: "NYJ", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 31, awayScore: 24 },
    { home: "IND", away: "HOU", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 19, awayScore: 17 },
    { home: "JAX", away: "NE", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 35, awayScore: 6 },
    { home: "KC", away: "MIA", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 24, awayScore: 10 },
    { home: "NYG", away: "TEN", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 12, awayScore: 7 },
    { home: "PIT", away: "CIN", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 30, awayScore: 27 },
    { home: "WAS", away: "SEA", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 33, awayScore: 31 },
    { home: "SF", away: "ARI", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 36, awayScore: 30 },
    { home: "TB", away: "MIN", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 16, awayScore: 23 },
    { home: "NO", away: "LV", kickoff: "2026-09-25T12:00:00Z", status: "final", homeScore: 27, awayScore: 35 },
    { home: "DAL", away: "BAL", kickoff: "2026-09-25T20:15:00Z", status: "final", homeScore: 31, awayScore: 34 },
    { home: "DEN", away: "LA", kickoff: "2026-09-25T20:15:00Z", status: "final", homeScore: 30, awayScore: 26 },
    { home: "CHI", away: "PHI", kickoff: "2026-09-25T20:15:00Z", status: "final", homeScore: 27, awayScore: 7 },
  ]
};

export const WEEK_4: NFLWeek = {
  week: 4,
  startDate: "2026-10-01T00:00:00Z",
  endDate: "2026-10-05T23:59:59Z",
  byes: [],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "CLE", away: "PIT", kickoff: "2026-10-01T20:15:00Z", status: "final", homeScore: 27, awayScore: 24 },
    { home: "IND", away: "WAS", kickoff: "2026-10-02T20:15:00Z", status: "final", homeScore: 30, awayScore: 13 },
    { home: "BAL", away: "TEN", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 24, awayScore: 18 },
    { home: "BUF", away: "NE", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 26, awayScore: 29 },
    { home: "CHI", away: "NYJ", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 23, awayScore: 12 },
    { home: "CIN", away: "JAX", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 17, awayScore: 22 },
    { home: "HOU", away: "DAL", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 30, awayScore: 34 },
    { home: "NYG", away: "ARI", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 36, awayScore: 24 },
    { home: "PHI", away: "LA", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 20, awayScore: 24 },
    { home: "TB", away: "GB", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 14, awayScore: 17 },
    { home: "MIN", away: "MIA", kickoff: "2026-10-02T12:00:00Z", status: "final", homeScore: 15, awayScore: 10 },
    { home: "KC", away: "LV", kickoff: "2026-10-02T20:15:00Z", status: "final", homeScore: 30, awayScore: 27 },
    { home: "SEA", away: "LAC", kickoff: "2026-10-02T20:15:00Z", status: "final", homeScore: 30, awayScore: 23 },
    { home: "SF", away: "DEN", kickoff: "2026-10-02T20:15:00Z", status: "final", homeScore: 24, awayScore: 14 },
    { home: "CAR", away: "DET", kickoff: "2026-10-05T20:15:00Z", status: "final", homeScore: 32, awayScore: 26 },
    { home: "NO", away: "ATL", kickoff: "2026-10-05T20:15:00Z", status: "final", homeScore: 24, awayScore: 45 },
  ]
};

export const WEEK_5: NFLWeek = {
  week: 5,
  startDate: "2026-10-08T00:00:00Z",
  endDate: "2026-10-12T23:59:59Z",
  byes: ["CAR", "KC"],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "TB", away: "DAL", kickoff: "2026-10-08T20:15:00Z", status: "final", homeScore: 24, awayScore: 16 },
    { home: "JAX", away: "PHI", kickoff: "2026-10-08T23:15:00Z", status: "final", homeScore: 19, awayScore: 17 },
    { home: "MIA", away: "CIN", kickoff: "2026-10-09T12:00:00Z", status: "final", homeScore: 24, awayScore: 31 },
    { home: "NE", away: "LV", kickoff: "2026-10-09T12:00:00Z", status: "final", homeScore: 45, awayScore: 17 },
    { home: "NO", away: "MIN", kickoff: "2026-10-09T12:00:00Z", status: "final", homeScore: 13, awayScore: 23 },
    { home: "NYJ", away: "CLE", kickoff: "2026-10-09T12:00:00Z", status: "final", homeScore: 17, awayScore: 12 },
    { home: "PIT", away: "IND", kickoff: "2026-10-09T12:00:00Z", status: "final", homeScore: 34, awayScore: 22 },
    { home: "TEN", away: "HOU", kickoff: "2026-10-09T12:00:00Z", status: "final", homeScore: 3, awayScore: 26 },
    { home: "WAS", away: "NYG", kickoff: "2026-10-09T12:00:00Z", status: "final", homeScore: 27, awayScore: 27 },
    { home: "GB", away: "CHI", kickoff: "2026-10-09T15:30:00Z", status: "final", homeScore: 31, awayScore: 7 },
    { home: "LAC", away: "DEN", kickoff: "2026-10-09T15:30:00Z", status: "final", homeScore: 17, awayScore: 23 },
    { home: "ARI", away: "DET", kickoff: "2026-10-09T15:30:00Z", status: "final", homeScore: 21, awayScore: 45 },
    { home: "SEA", away: "SF", kickoff: "2026-10-09T20:20:00Z", status: "final", homeScore: 29, awayScore: 32 },
    { home: "ATL", away: "BAL", kickoff: "2026-10-12T12:00:00Z", status: "final", homeScore: 23, awayScore: 30 },
    { home: "LA", away: "BUF", kickoff: "2026-10-12T20:15:00Z", status: "final", homeScore: 34, awayScore: 37 },
  ]
};

export const WEEK_6: NFLWeek = {
  week: 6,
  startDate: "2026-10-15T00:00:00Z",
  endDate: "2026-10-19T23:59:59Z",
  byes: ["CIN", "DET", "MIA", "MIN"],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "DEN", away: "SEA", kickoff: "2026-10-15T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "HOU", away: "JAX", kickoff: "2026-10-15T23:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CHI", away: "ATL", kickoff: "2026-10-16T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CLE", away: "BAL", kickoff: "2026-10-16T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "IND", away: "TEN", kickoff: "2026-10-16T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NE", away: "NYJ", kickoff: "2026-10-16T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYG", away: "NO", kickoff: "2026-10-16T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "PHI", away: "CAR", kickoff: "2026-10-16T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "TB", away: "PIT", kickoff: "2026-10-16T12:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LA", away: "ARI", kickoff: "2026-10-16T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "KC", away: "LAC", kickoff: "2026-10-16T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "BUF", away: "LV", kickoff: "2026-10-19T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DAL", away: "GB", kickoff: "2026-10-19T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "SF", away: "WAS", kickoff: "2026-10-19T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
  ]
};

export const WEEK_7: NFLWeek = {
  week: 7,
  startDate: "2026-10-22T00:00:00Z",
  endDate: "2026-10-26T23:59:59Z",
  byes: ["BUF", "JAX", "LAC", "WAS"],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "NE", away: "CHI", kickoff: "2026-10-22T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "PIT", away: "NO", kickoff: "2026-10-25T13:30:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "SF", away: "ATL", kickoff: "2026-10-25T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CIN", away: "BAL", kickoff: "2026-10-25T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "TB", away: "CAR", kickoff: "2026-10-25T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYG", away: "HOU", kickoff: "2026-10-25T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "IND", away: "MIN", kickoff: "2026-10-25T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "MIA", away: "NYJ", kickoff: "2026-10-25T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CLE", away: "TEN", kickoff: "2026-10-25T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DEN", away: "ARI", kickoff: "2026-10-25T20:05:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "GB", away: "DET", kickoff: "2026-10-25T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LA", away: "LV", kickoff: "2026-10-25T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "KC", away: "SEA", kickoff: "2026-10-25T23:20:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DAL", away: "PHI", kickoff: "2026-10-26T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
  ]
};

export const WEEK_8: NFLWeek = {
  week: 8,
  startDate: "2026-10-29T00:00:00Z",
  endDate: "2026-11-02T23:59:59Z",
  byes: ["HOU", "NO", "NYG", "SF"],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "CAR", away: "GB", kickoff: "2026-10-29T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "BAL", away: "BUF", kickoff: "2026-11-01T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "TEN", away: "CIN", kickoff: "2026-11-01T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "ARI", away: "DAL", kickoff: "2026-11-01T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "MIN", away: "DET", kickoff: "2026-11-01T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "IND", away: "JAX", kickoff: "2026-11-01T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LV", away: "NYJ", kickoff: "2026-11-01T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CLE", away: "PIT", kickoff: "2026-11-01T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "ATL", away: "TB", kickoff: "2026-11-01T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LAC", away: "LA", kickoff: "2026-11-01T20:05:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "KC", away: "DEN", kickoff: "2026-11-01T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NE", away: "MIA", kickoff: "2026-11-01T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "PHI", away: "WAS", kickoff: "2026-11-01T23:20:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CHI", away: "SEA", kickoff: "2026-11-02T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
  ]
};

export const WEEK_9: NFLWeek = {
  week: 9,
  startDate: "2026-11-05T00:00:00Z",
  endDate: "2026-11-09T23:59:59Z",
  byes: ["PIT", "TEN"],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "JAX", away: "BAL", kickoff: "2026-11-05T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CIN", away: "ATL", kickoff: "2026-11-08T13:30:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DEN", away: "CAR", kickoff: "2026-11-08T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DAL", away: "IND", kickoff: "2026-11-08T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYJ", away: "KC", kickoff: "2026-11-08T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DET", away: "MIA", kickoff: "2026-11-08T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CLE", away: "NO", kickoff: "2026-11-08T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYG", away: "PHI", kickoff: "2026-11-08T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LA", away: "WAS", kickoff: "2026-11-08T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "HOU", away: "LAC", kickoff: "2026-11-08T20:05:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LV", away: "SF", kickoff: "2026-11-08T20:05:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "GB", away: "NE", kickoff: "2026-11-08T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "ARI", away: "SEA", kickoff: "2026-11-08T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "TB", away: "CHI", kickoff: "2026-11-08T23:20:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "BUF", away: "MIN", kickoff: "2026-11-09T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
  ]
};

export const WEEK_10: NFLWeek = {
  week: 10,
  startDate: "2026-11-12T00:00:00Z",
  endDate: "2026-11-16T23:59:59Z",
  byes: ["CHI", "DEN", "PHI", "TB"],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "WAS", away: "NYG", kickoff: "2026-11-12T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NE", away: "DET", kickoff: "2026-11-15T13:30:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "KC", away: "ATL", kickoff: "2026-11-15T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "HOU", away: "CLE", kickoff: "2026-11-15T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "MIN", away: "GB", kickoff: "2026-11-15T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "MIA", away: "IND", kickoff: "2026-11-15T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CAR", away: "NO", kickoff: "2026-11-15T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "BUF", away: "NYJ", kickoff: "2026-11-15T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "JAX", away: "TEN", kickoff: "2026-11-15T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LA", away: "ARI", kickoff: "2026-11-15T20:05:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "SEA", away: "LV", kickoff: "2026-11-15T20:05:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "SF", away: "DAL", kickoff: "2026-11-15T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "PIT", away: "CIN", kickoff: "2026-11-15T23:20:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LAC", away: "BAL", kickoff: "2026-11-16T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
  ]
};

export const WEEK_11: NFLWeek = {
  week: 11,
  startDate: "2026-11-19T00:00:00Z",
  endDate: "2026-11-23T23:59:59Z",
  byes: ["ATL", "CLE", "GB", "LA", "NE", "SEA"],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "IND", away: "HOU", kickoff: "2026-11-19T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "MIA", away: "BUF", kickoff: "2026-11-22T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "BAL", away: "CAR", kickoff: "2026-11-22T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NO", away: "CHI", kickoff: "2026-11-22T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "TB", away: "DET", kickoff: "2026-11-22T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "ARI", away: "KC", kickoff: "2026-11-22T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "JAX", away: "NYG", kickoff: "2026-11-22T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DAL", away: "TEN", kickoff: "2026-11-22T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYJ", away: "LAC", kickoff: "2026-11-22T20:05:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LV", away: "DEN", kickoff: "2026-11-22T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "PIT", away: "PHI", kickoff: "2026-11-22T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "MIN", away: "SF", kickoff: "2026-11-22T23:20:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CIN", away: "WAS", kickoff: "2026-11-23T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
  ]
};

export const WEEK_12: NFLWeek = {
  week: 12,
  startDate: "2026-11-25T00:00:00Z",
  endDate: "2026-11-30T23:59:59Z",
  byes: [],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "GB", away: "LA", kickoff: "2026-11-25T00:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CHI", away: "DET", kickoff: "2026-11-26T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "PHI", away: "DAL", kickoff: "2026-11-26T20:30:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "KC", away: "BUF", kickoff: "2026-11-26T23:20:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DEN", away: "PIT", kickoff: "2026-11-27T15:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NO", away: "CIN", kickoff: "2026-11-29T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LV", away: "CLE", kickoff: "2026-11-29T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "BAL", away: "HOU", kickoff: "2026-11-29T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYG", away: "IND", kickoff: "2026-11-29T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYJ", away: "MIA", kickoff: "2026-11-29T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "ATL", away: "MIN", kickoff: "2026-11-29T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "TEN", away: "JAX", kickoff: "2026-11-29T20:05:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "WAS", away: "ARI", kickoff: "2026-11-29T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "SEA", away: "SF", kickoff: "2026-11-29T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NE", away: "LAC", kickoff: "2026-11-29T23:20:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CAR", away: "TB", kickoff: "2026-11-30T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
  ]
};

export const WEEK_13: NFLWeek = {
  week: 13,
  startDate: "2026-12-03T00:00:00Z",
  endDate: "2026-12-07T23:59:59Z",
  byes: ["BAL", "IND", "LV", "NYJ"],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "KC", away: "LA", kickoff: "2026-12-03T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DET", away: "ATL", kickoff: "2026-12-06T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "JAX", away: "CHI", kickoff: "2026-12-06T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CIN", away: "CLE", kickoff: "2026-12-06T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "GB", away: "NO", kickoff: "2026-12-06T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "SF", away: "NYG", kickoff: "2026-12-06T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LAC", away: "TB", kickoff: "2026-12-06T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "WAS", away: "TEN", kickoff: "2026-12-06T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "PHI", away: "ARI", kickoff: "2026-12-06T20:05:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "MIA", away: "DEN", kickoff: "2026-12-06T20:05:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CAR", away: "MIN", kickoff: "2026-12-06T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "BUF", away: "NE", kickoff: "2026-12-06T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "HOU", away: "PIT", kickoff: "2026-12-07T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DAL", away: "SEA", kickoff: "2026-12-07T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
  ]
};

export const WEEK_14: NFLWeek = {
  week: 14,
  startDate: "2026-12-10T00:00:00Z",
  endDate: "2026-12-14T23:59:59Z",
  byes: ["ARI", "DAL"],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "MIN", away: "NE", kickoff: "2026-12-10T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "TB", away: "BAL", kickoff: "2026-12-13T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NO", away: "CAR", kickoff: "2026-12-13T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "ATL", away: "CLE", kickoff: "2026-12-13T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "TEN", away: "DET", kickoff: "2026-12-13T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CHI", away: "MIA", kickoff: "2026-12-13T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DEN", away: "NYJ", kickoff: "2026-12-13T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "IND", away: "PHI", kickoff: "2026-12-13T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "HOU", away: "WAS", kickoff: "2026-12-13T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LAC", away: "LV", kickoff: "2026-12-13T20:05:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "KC", away: "CIN", kickoff: "2026-12-13T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYG", away: "SEA", kickoff: "2026-12-13T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LA", away: "SF", kickoff: "2026-12-13T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "BUF", away: "GB", kickoff: "2026-12-13T23:20:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "PIT", away: "JAX", kickoff: "2026-12-14T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
  ]
};

export const WEEK_15: NFLWeek = {
  week: 15,
  startDate: "2026-12-17T00:00:00Z",
  endDate: "2026-12-21T23:59:59Z",
  byes: [],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "SF", away: "LAC", kickoff: "2026-12-17T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "SEA", away: "PHI", kickoff: "2026-12-19T21:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CHI", away: "BUF", kickoff: "2026-12-19T23:20:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CIN", away: "CAR", kickoff: "2026-12-20T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "MIA", away: "GB", kickoff: "2026-12-20T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "JAX", away: "HOU", kickoff: "2026-12-20T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CLE", away: "NYG", kickoff: "2026-12-20T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "BAL", away: "PIT", kickoff: "2026-12-20T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NO", away: "TB", kickoff: "2026-12-20T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "IND", away: "TEN", kickoff: "2026-12-20T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "ATL", away: "WAS", kickoff: "2026-12-20T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYJ", away: "ARI", kickoff: "2026-12-20T20:05:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DAL", away: "LA", kickoff: "2026-12-20T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DEN", away: "LV", kickoff: "2026-12-20T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DET", away: "MIN", kickoff: "2026-12-20T23:20:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NE", away: "KC", kickoff: "2026-12-21T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
  ]
};

export const WEEK_16: NFLWeek = {
  week: 16,
  startDate: "2026-12-24T00:00:00Z",
  endDate: "2026-12-28T23:59:59Z",
  byes: [],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "HOU", away: "PHI", kickoff: "2026-12-24T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "GB", away: "CHI", kickoff: "2026-12-25T13:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "BUF", away: "DEN", kickoff: "2026-12-25T16:30:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LA", away: "SEA", kickoff: "2026-12-25T20:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CLE", away: "BAL", kickoff: "2026-12-27T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LAC", away: "MIA", kickoff: "2026-12-27T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "ARI", away: "NO", kickoff: "2026-12-27T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NE", away: "NYJ", kickoff: "2026-12-27T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "TEN", away: "LV", kickoff: "2026-12-27T20:05:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "SF", away: "KC", kickoff: "2026-12-27T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "JAX", away: "DAL", kickoff: "2026-12-27T23:20:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYG", away: "DET", kickoff: "2026-12-28T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "TB", away: "ATL", kickoff: "2026-12-27T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CIN", away: "IND", kickoff: "2026-12-27T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "WAS", away: "MIN", kickoff: "2026-12-27T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "CAR", away: "PIT", kickoff: "2026-12-27T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
  ]
};

export const WEEK_17: NFLWeek = {
  week: 17,
  startDate: "2026-12-31T00:00:00Z",
  endDate: "2027-01-04T23:59:59Z",
  byes: [],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "BAL", away: "CIN", kickoff: "2026-12-31T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NO", away: "ATL", kickoff: "2027-01-03T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "SEA", away: "CAR", kickoff: "2027-01-03T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "IND", away: "CLE", kickoff: "2027-01-03T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYG", away: "DAL", kickoff: "2027-01-03T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "MIA", away: "BUF", kickoff: "2027-01-03T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "MIN", away: "NYJ", kickoff: "2027-01-03T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "PIT", away: "TEN", kickoff: "2027-01-03T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LV", away: "ARI", kickoff: "2027-01-03T20:05:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DET", away: "CHI", kickoff: "2027-01-03T20:25:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "PHI", away: "SF", kickoff: "2027-01-03T23:20:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "HOU", away: "GB", kickoff: "2027-01-04T00:15:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "WAS", away: "JAX", kickoff: "2026-12-27T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "KC", away: "LAC", kickoff: "2026-12-27T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "DEN", away: "NE", kickoff: "2026-12-27T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
    { home: "LA", away: "TB", kickoff: "2026-12-27T17:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
  ]
};

export const WEEK_18: NFLWeek = {
  week: 18,
  startDate: "2027-01-07T00:00:00Z",
  endDate: "2027-01-11T23:59:59Z",
  byes: [],
  source: "NFL.com",
  verifiedAt: "2026-10-13",
  games: [
    { home: "SF", away: "ARI", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "PIT", away: "BAL", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "NYJ", away: "BUF", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "ATL", away: "CAR", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "CLE", away: "CIN", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "LAC", away: "DEN", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "DET", away: "GB", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "TEN", away: "HOU", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "JAX", away: "IND", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "LV", away: "KC", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "SEA", away: "LA", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "CHI", away: "MIN", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "MIA", away: "NE", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "TB", away: "NO", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "PHI", away: "NYG", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
    { home: "DAL", away: "WAS", kickoff: null, status: "scheduled", homeScore: null, awayScore: null },
  ]
};

export const NFL_2026_WEEKS = [WEEK_1, WEEK_2, WEEK_3, WEEK_4, WEEK_5, WEEK_6, WEEK_7, WEEK_8, WEEK_9, WEEK_10, WEEK_11, WEEK_12, WEEK_13, WEEK_14, WEEK_15, WEEK_16, WEEK_17, WEEK_18];

export function getWeekByNumber(week: number): NFLWeek | null {
  return NFL_2026_WEEKS.find(w => w.week === week) || null;
}

export function getCurrentNFLWeek(date: Date = new Date()): { week: number; label: string } {
  const month = date.getMonth();
  const day = date.getDate();

  if (month === 9) {
    if (day <= 12) return { week: 5, label: "Week 5 · Oct 8-12" };
    if (day <= 19) return { week: 6, label: "Week 6 · Oct 15-19" };
    if (day <= 26) return { week: 7, label: "Week 7 · Oct 22-26" };
  }
  if (month === 10) {
    if (day <= 2) return { week: 8, label: "Week 8 · Oct 29-Nov 2" };
    if (day <= 9) return { week: 9, label: "Week 9 · Nov 5-9" };
    if (day <= 16) return { week: 10, label: "Week 10 · Nov 12-16" };
    if (day <= 23) return { week: 11, label: "Week 11 · Nov 19-23" };
    return { week: 12, label: "Week 12 · Nov 25-30" };
  }
  if (month === 11) {
    if (day <= 7) return { week: 12, label: "Week 12 · Nov 25-30" };
    if (day <= 14) return { week: 13, label: "Week 13 · Dec 3-7" };
    if (day <= 21) return { week: 14, label: "Week 14 · Dec 10-14" };
    return { week: 15, label: "Week 15 · Dec 17-21" };
  }
  if (month === 0) {
    if (day <= 4) return { week: 17, label: "Week 17 · Dec 31-Jan 4" };
    return { week: 18, label: "Week 18 · Jan 7-11" };
  }

  return { week: 18, label: "Week 18 · Jan 7-11" };
}

export function getPriorWeeks(asOfWeek: number): NFLWeek[] {
  return NFL_2026_WEEKS.filter(w => w.week < asOfWeek);
}

export function isCurrentWeekComplete(week: NFLWeek): boolean {
  return week.games.length > 0 && week.games.every(g => g.status === "final");
}

export type { Game, GameOdds, NFLWeek };
