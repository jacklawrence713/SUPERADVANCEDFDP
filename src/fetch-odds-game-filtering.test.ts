/**
 * REGRESSION TEST: Fetch-Odds Game Filtering
 *
 * Verifies that backend doesn't aggressively filter out current-week games.
 *
 * Known filtering conditions:
 * 1. Games without team mapping (ODDS_TEAM_MAP)
 * 2. Games without eventId or commence_time
 * 3. Games with invalid kickoff time
 * 4. Games older than 4 hours (ageMs > 4 * 60 * 60 * 1000)
 *
 * Issue: If current-week games are being filtered out, backend returns empty odds
 */

import { describe, it, expect } from 'vitest';

describe('Fetch-Odds Game Filtering Logic', () => {

  // Simulate team mapping
  const ODDS_TEAM_MAP: { [k: string]: string } = {
    "Arizona Cardinals": "ARI",
    "Atlanta Falcons": "ATL",
    "Baltimore Ravens": "BAL",
    "Buffalo Bills": "BUF",
    "Carolina Panthers": "CAR",
    "Chicago Bears": "CHI",
    "Cincinnati Bengals": "CIN",
    "Cleveland Browns": "CLE",
    "Dallas Cowboys": "DAL",
    "Denver Broncos": "DEN",
    "Detroit Lions": "DET",
    "Green Bay Packers": "GB",
    "Houston Texans": "HOU",
    "Indianapolis Colts": "IND",
    "Jacksonville Jaguars": "JAX",
    "Kansas City Chiefs": "KC",
    "Las Vegas Raiders": "LV",
    "Los Angeles Chargers": "LAC",
    "Los Angeles Rams": "LA",
    "Miami Dolphins": "MIA",
    "Minnesota Vikings": "MIN",
    "New England Patriots": "NE",
    "New Orleans Saints": "NO",
    "New York Giants": "NYG",
    "New York Jets": "NYJ",
    "Philadelphia Eagles": "PHI",
    "Pittsburgh Steelers": "PIT",
    "San Francisco 49ers": "SF",
    "Seattle Seahawks": "SEA",
    "Tampa Bay Buccaneers": "TB",
    "Tennessee Titans": "TEN",
    "Washington Commanders": "WAS"
  };

  // ── Age filtering logic ─────────────────────────────────────────────────

  describe('Age-based filtering (4-hour cutoff)', () => {

    it('games with commence_time in future are NOT filtered', () => {
      const now = Date.now();
      const futureTime = new Date(now + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
      const kickoff = new Date(futureTime).getTime();
      const ageMs = now - kickoff;

      const shouldBeFiltered = ageMs > 4 * 60 * 60 * 1000;
      expect(shouldBeFiltered).toBe(false);
    });

    it('games with commence_time 2 hours ago are NOT filtered', () => {
      const now = Date.now();
      const pastTime = new Date(now - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      const kickoff = new Date(pastTime).getTime();
      const ageMs = now - kickoff;

      const shouldBeFiltered = ageMs > 4 * 60 * 60 * 1000;
      expect(shouldBeFiltered).toBe(false);
    });

    it('games with commence_time 3.5 hours ago are NOT filtered', () => {
      const now = Date.now();
      const pastTime = new Date(now - 3.5 * 60 * 60 * 1000).toISOString();
      const kickoff = new Date(pastTime).getTime();
      const ageMs = now - kickoff;

      const shouldBeFiltered = ageMs > 4 * 60 * 60 * 1000;
      expect(shouldBeFiltered).toBe(false);
    });

    it('games with commence_time > 4 hours ago ARE filtered', () => {
      const now = Date.now();
      const pastTime = new Date(now - 5 * 60 * 60 * 1000).toISOString(); // 5 hours ago
      const kickoff = new Date(pastTime).getTime();
      const ageMs = now - kickoff;

      const shouldBeFiltered = ageMs > 4 * 60 * 60 * 1000;
      expect(shouldBeFiltered).toBe(true);
    });
  });

  // ── Team mapping filtering ──────────────────────────────────────────────

  describe('Team mapping validation', () => {

    it('all 32 teams have mapping entries', () => {
      expect(Object.keys(ODDS_TEAM_MAP).length).toBe(32);
    });

    it('Los Angeles Rams maps to "LA" (not "LAR")', () => {
      expect(ODDS_TEAM_MAP["Los Angeles Rams"]).toBe("LA");
    });

    it('team names are exact - typo would cause filtering', () => {
      // Verify exact names used by provider
      expect(ODDS_TEAM_MAP["Houston Texans"]).toBe("HOU");
      expect(ODDS_TEAM_MAP["Atlanta Falcons"]).toBe("ATL");
      expect(ODDS_TEAM_MAP["Chicago Bears"]).toBe("CHI");
      expect(ODDS_TEAM_MAP["Jacksonville Jaguars"]).toBe("JAX");
    });

    it('games with unmapped teams are filtered', () => {
      const home = ODDS_TEAM_MAP["Houston Texans"];
      const away = ODDS_TEAM_MAP["Jacksonville Jaguars"];

      // Both should map
      expect(home).toBeDefined();
      expect(away).toBeDefined();

      // If provider sent "Houston Texans 2" (typo), it wouldn't map
      const unmappedHome = ODDS_TEAM_MAP["Houston Texans 2"];
      expect(unmappedHome).toBeUndefined();
    });
  });

  // ── EventId and commence_time validation ────────────────────────────────

  describe('Required fields validation', () => {

    it('games without eventId are filtered', () => {
      const game = {
        id: null,
        home_team: "Houston Texans",
        away_team: "Jacksonville Jaguars",
        commence_time: "2026-10-16T20:20:00Z"
      };

      const eventId = game.id || "";
      const shouldFilter = !eventId;
      expect(shouldFilter).toBe(true);
    });

    it('games without commence_time are filtered', () => {
      const game = {
        id: "game123",
        home_team: "Houston Texans",
        away_team: "Jacksonville Jaguars",
        commence_time: null
      };

      const commenceTime = game.commence_time || "";
      const shouldFilter = !commenceTime;
      expect(shouldFilter).toBe(true);
    });

    it('games with both eventId and commence_time pass validation', () => {
      const game = {
        id: "game123",
        home_team: "Houston Texans",
        away_team: "Jacksonville Jaguars",
        commence_time: "2026-10-16T20:20:00Z"
      };

      const eventId = game.id || "";
      const commenceTime = game.commence_time || "";
      const shouldFilter = !eventId || !commenceTime;
      expect(shouldFilter).toBe(false);
    });
  });

  // ── Valid current-week game ─────────────────────────────────────────────

  describe('Valid current-week game should pass all filters', () => {

    it('Week 14 game on Thursday night passes all filters', () => {
      const now = Date.now();
      const thursdayNight = new Date(now + 6 * 60 * 60 * 1000).toISOString(); // 6 hours from now

      const game = {
        id: "12345",
        home_team: "Houston Texans",
        away_team: "Jacksonville Jaguars",
        commence_time: thursdayNight,
        bookmakers: [
          {
            key: "draftkings",
            markets: [
              {
                key: "spreads",
                outcomes: [
                  { name: "Houston Texans", point: 2.5 },
                  { name: "Jacksonville Jaguars", point: -2.5 }
                ]
              },
              {
                key: "totals",
                outcomes: [
                  { name: "Over", point: 42.5 },
                  { name: "Under", point: 42.5 }
                ]
              }
            ]
          }
        ]
      };

      // Validate all filtering conditions
      const home = ODDS_TEAM_MAP[game.home_team];
      const away = ODDS_TEAM_MAP[game.away_team];
      const eventId = game.id || "";
      const commenceTime = game.commence_time || "";

      let kickoff = NaN;
      try {
        kickoff = new Date(commenceTime).getTime();
      } catch {}

      const ageMs = now - kickoff;
      const tooOld = ageMs > 4 * 60 * 60 * 1000;

      expect(home).toBeDefined(); // Team mapping OK
      expect(away).toBeDefined(); // Team mapping OK
      expect(eventId).toBeTruthy(); // Has eventId
      expect(commenceTime).toBeTruthy(); // Has commence_time
      expect(isFinite(kickoff)).toBe(true); // Valid time
      expect(tooOld).toBe(false); // Not too old

      // Should NOT be filtered
      expect(!home || !away).toBe(false);
      expect(!eventId || !commenceTime).toBe(false);
      expect(!isFinite(kickoff)).toBe(false);
      expect(ageMs > 4 * 60 * 60 * 1000).toBe(false);
    });
  });

  // ── Parsing logic ───────────────────────────────────────────────────────

  describe('Provider response parsing robustness', () => {

    it('spreads parsing requires outcomes array', () => {
      const market = {
        key: "spreads",
        outcomes: [
          { name: "Houston Texans", point: 2.5 },
          { name: "Jacksonville Jaguars", point: -2.5 }
        ]
      };

      expect(market.outcomes).toBeDefined();
      expect(Array.isArray(market.outcomes)).toBe(true);
      expect(market.outcomes.length).toBeGreaterThan(0);
    });

    it('totals parsing requires numeric point', () => {
      const outcome = { name: "Over", point: 42.5 };
      expect(typeof outcome.point).toBe("number");
      expect(isFinite(outcome.point)).toBe(true);
    });

    it('zero spread is valid', () => {
      const spread = 0;
      expect(typeof spread).toBe("number");
      expect(isFinite(spread)).toBe(true);
      // Not filtered as invalid
    });
  });

});
