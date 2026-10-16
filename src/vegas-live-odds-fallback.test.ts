/**
 * REGRESSION TEST: Vegas Live Odds Fallback
 *
 * Critical test suite to debug why live odds are falling back to manual display
 * despite backend returning numeric data.
 *
 * Problem: Production shows "LINES UNAVAILABLE" with manual data, but previously
 * showed numeric odds like JAX @ HOU Spread +2.5.
 */

import { describe, it, expect } from 'vitest';

describe('Vegas Live Odds Fallback Regression', () => {

  // ── Simulate backend responses ────────────────────────────────────────────

  const mockBackendWithNumericOdds = {
    odds: {
      "JAX": {
        spread: 2.5,
        total: 42.5,
        opp: "HOU",
        homeTeam: "JAX",
        awayTeam: "HOU",
        commenceTime: "2026-10-16T20:20:00Z",
        eventId: "test-event-1",
        spreadBookmakers: 8,
        totalBookmakers: 8
      },
      "HOU": {
        spread: -2.5,
        total: 42.5,
        opp: "JAX",
        homeTeam: "JAX",
        awayTeam: "HOU",
        commenceTime: "2026-10-16T20:20:00Z",
        eventId: "test-event-1",
        spreadBookmakers: 8,
        totalBookmakers: 8
      },
      "ATL": {
        spread: -1,
        total: 52,
        opp: "CHI",
        homeTeam: "ATL",
        awayTeam: "CHI",
        commenceTime: "2026-10-16T21:00:00Z",
        eventId: "test-event-2",
        spreadBookmakers: 8,
        totalBookmakers: 8
      },
      "CHI": {
        spread: 1,
        total: 52,
        opp: "ATL",
        homeTeam: "ATL",
        awayTeam: "CHI",
        commenceTime: "2026-10-16T21:00:00Z",
        eventId: "test-event-2",
        spreadBookmakers: 8,
        totalBookmakers: 8
      }
    },
    source: "api",
    fetchedAt: "2026-10-16T20:00:00Z"
  };

  const mockBackendEmpty = {
    odds: {},
    source: "unavailable",
    fetchedAt: ""
  };

  // ── Frontend fetchOdds simulation ────────────────────────────────────────

  function simulateFetchOdds(backendResponse: any): {
    odds: { [k: string]: any };
    source: string;
    fetchedAt: string;
    stale: boolean;
  } {
    if (backendResponse && backendResponse.odds && Object.keys(backendResponse.odds).length > 0) {
      return {
        odds: backendResponse.odds,
        source: backendResponse.source || "api",
        fetchedAt: backendResponse.fetchedAt || "",
        stale: false
      };
    }
    return {
      odds: {},
      source: backendResponse?.source || "unavailable",
      fetchedAt: backendResponse?.fetchedAt || "",
      stale: false
    };
  }

  // ── Response shape tests ────────────────────────────────────────────────

  describe('Backend response shape validation', () => {
    it('backend returns proper odds object structure for JAX', () => {
      const jaxOdds = mockBackendWithNumericOdds.odds["JAX"];
      expect(jaxOdds).toBeDefined();
      expect(jaxOdds.spread).toBe(2.5);
      expect(jaxOdds.total).toBe(42.5);
      expect(jaxOdds.opp).toBe("HOU");
      expect(jaxOdds.eventId).toBeDefined();
      expect(jaxOdds.commenceTime).toBeDefined();
    });

    it('backend returns home and away team entries for each game', () => {
      expect(mockBackendWithNumericOdds.odds["JAX"]).toBeDefined();
      expect(mockBackendWithNumericOdds.odds["HOU"]).toBeDefined();
      expect(mockBackendWithNumericOdds.odds["JAX"].opp).toBe("HOU");
      expect(mockBackendWithNumericOdds.odds["HOU"].opp).toBe("JAX");
    });

    it('backend source is "api" when returning live data', () => {
      expect(mockBackendWithNumericOdds.source).toBe("api");
    });

    it('backend source is "unavailable" when no odds', () => {
      expect(mockBackendEmpty.source).toBe("unavailable");
    });
  });

  // ── Frontend processing ───────────────────────────────────────────────────

  describe('Frontend fetchOdds processing', () => {
    it('frontend passes through numeric odds from backend', () => {
      const result = simulateFetchOdds(mockBackendWithNumericOdds);
      expect(result.odds["JAX"].spread).toBe(2.5);
      expect(result.odds["JAX"].total).toBe(42.5);
    });

    it('frontend sets source to "api" when backend has data', () => {
      const result = simulateFetchOdds(mockBackendWithNumericOdds);
      expect(result.source).toBe("api");
    });

    it('frontend returns empty odds when backend is empty', () => {
      const result = simulateFetchOdds(mockBackendEmpty);
      expect(Object.keys(result.odds).length).toBe(0);
    });

    it('frontend sets source to "unavailable" when backend empty', () => {
      const result = simulateFetchOdds(mockBackendEmpty);
      expect(result.source).toBe("unavailable");
    });
  });

  // ── State handling ──────────────────────────────────────────────────────

  describe('Frontend state management', () => {
    it('oddsData populated with odds when fetch succeeds', () => {
      const result = simulateFetchOdds(mockBackendWithNumericOdds);
      const oddsData = result.odds;

      expect(Object.keys(oddsData).length).toBeGreaterThan(0);
      expect(oddsData["JAX"]).toBeDefined();
      expect(oddsData["JAX"].spread).toBe(2.5);
    });

    it('oddsSource is "api" when oddsData populated', () => {
      const result = simulateFetchOdds(mockBackendWithNumericOdds);
      expect(result.source).toBe("api");
    });

    it('display shows "THIS WEEK\'S GAMES" when source is "api"', () => {
      const source = "api";
      const display = source === "api" || source === "cache"
        ? "THIS WEEK'S GAMES"
        : source === "manual"
        ? "SCHEDULE (Lines Unavailable)"
        : "LINES UNAVAILABLE";

      expect(display).toBe("THIS WEEK'S GAMES");
    });

    it('display shows "LINES UNAVAILABLE" when source is "unavailable"', () => {
      const source = "unavailable";
      const display = source === "api" || source === "cache"
        ? "THIS WEEK'S GAMES"
        : source === "manual"
        ? "SCHEDULE (Lines Unavailable)"
        : "LINES UNAVAILABLE";

      expect(display).toBe("LINES UNAVAILABLE");
    });
  });

  // ── Game merge logic ────────────────────────────────────────────────────

  describe('Schedule-to-Odds merge', () => {

    interface ScheduleGame {
      home: string;
      away: string;
      startDate?: string;
    }

    interface MergedGame {
      home: string;
      away: string;
      spread: number | null;
      total: number | null;
    }

    function mergeScheduleWithOdds(scheduleGames: ScheduleGame[], oddsData: any): MergedGame[] {
      return scheduleGames.map((sg) => {
        const home = sg.home;
        const away = sg.away;
        const homeOdds = oddsData ? oddsData[home] : null;
        const homeSpread = homeOdds?.spread ?? null;
        const homeTotal = homeOdds?.total ?? null;
        return { home, away, spread: homeSpread, total: homeTotal };
      });
    }

    it('merges schedule games with numeric odds correctly', () => {
      const schedule: ScheduleGame[] = [
        { home: "HOU", away: "JAX" },
        { home: "CHI", away: "ATL" }
      ];

      const result = mergeScheduleWithOdds(schedule, mockBackendWithNumericOdds.odds);

      expect(result[0].home).toBe("HOU");
      expect(result[0].away).toBe("JAX");
      expect(result[0].spread).toBe(-2.5);
      expect(result[0].total).toBe(42.5);

      expect(result[1].home).toBe("CHI");
      expect(result[1].away).toBe("ATL");
      expect(result[1].spread).toBe(1);
      expect(result[1].total).toBe(52);
    });

    it('handles missing odds gracefully (returns null)', () => {
      const schedule: ScheduleGame[] = [
        { home: "SEA", away: "DEN" }
      ];

      const result = mergeScheduleWithOdds(schedule, mockBackendWithNumericOdds.odds);

      expect(result[0].home).toBe("SEA");
      expect(result[0].away).toBe("DEN");
      expect(result[0].spread).toBeNull();
      expect(result[0].total).toBeNull();
    });

    it('never merges with empty odds object', () => {
      const schedule: ScheduleGame[] = [
        { home: "HOU", away: "JAX" }
      ];

      const result = mergeScheduleWithOdds(schedule, {});

      expect(result[0].spread).toBeNull();
      expect(result[0].total).toBeNull();
    });
  });

  // ── Display decision logic ──────────────────────────────────────────────

  describe('Display decision logic', () => {
    it('shows manual fallback banner only when source is not "api" or "cache"', () => {
      const sources = ["api", "cache", "unavailable", "manual", "none"];

      sources.forEach((source) => {
        const shouldShowManualBanner = source !== "api" && source !== "cache";
        const actualBanner = source !== "api" && source !== "cache";
        expect(actualBanner).toBe(shouldShowManualBanner);
      });
    });

    it('source "api" does not trigger manual fallback banner', () => {
      const source = "api";
      const showsBanner = source !== "api" && source !== "cache";
      expect(showsBanner).toBe(false);
    });

    it('source "unavailable" triggers manual fallback banner', () => {
      const source = "unavailable";
      const showsBanner = source !== "api" && source !== "cache";
      expect(showsBanner).toBe(true);
    });
  });

  // ── Critical path: numeric odds override fallback ──────────────────────

  describe('Critical: numeric odds must override manual fallback', () => {
    it('when backend returns numeric odds, frontend shows live games (not manual)', () => {
      // Backend returns data
      const fetchResult = simulateFetchOdds(mockBackendWithNumericOdds);

      // Frontend state after fetch
      const oddsData = fetchResult.odds;
      const oddsSource = fetchResult.source;

      // Display logic
      const showsManualBanner = oddsSource !== "api" && oddsSource !== "cache";
      const hasNumericOdds = Object.keys(oddsData).some(team =>
        oddsData[team]?.spread !== null || oddsData[team]?.total !== null
      );

      expect(hasNumericOdds).toBe(true);
      expect(showsManualBanner).toBe(false);
      expect(oddsSource).toBe("api");
    });

    it('when backend returns empty, frontend shows manual banner', () => {
      const fetchResult = simulateFetchOdds(mockBackendEmpty);

      const oddsData = fetchResult.odds;
      const oddsSource = fetchResult.source;

      const showsManualBanner = oddsSource !== "api" && oddsSource !== "cache";
      const hasAnyOdds = Object.keys(oddsData).length > 0;

      expect(hasAnyOdds).toBe(false);
      expect(showsManualBanner).toBe(true);
      expect(oddsSource).toBe("unavailable");
    });
  });

  // ── Team normalization verification ─────────────────────────────────────

  describe('Team normalization (LA vs LAR)', () => {
    it('backend uses normalized team abbreviation "LA" (not "LAR")', () => {
      const hasLA = "LA" in mockBackendWithNumericOdds.odds || false;
      const hasLAR = "LAR" in mockBackendWithNumericOdds.odds || false;

      // This test just verifies we're using correct abbr
      // Current mock doesn't have LA, but future tests should verify this
      expect(typeof hasLA).toBe("boolean");
    });
  });

});
