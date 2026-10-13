// Vegas Lines Rebuild - Hotfix Tests
// Tests that verify the new canonical schedule structure

import { describe, it, expect } from 'vitest';
import {
  WEEK_1, WEEK_2, WEEK_3, WEEK_4, WEEK_5, WEEK_6, getWeekByNumber, getCurrentNFLWeek
} from './data/nfl-2026-weeks';

describe('Vegas lines: Week 5 authoritative schedule', () => {

  it('Week 5 schedule exists with correct dates', () => {
    expect(WEEK_5).toBeDefined();
    expect(WEEK_5.week).toBe(5);
    expect(WEEK_5.startDate).toContain('2026-10-08');
    expect(WEEK_5.endDate).toContain('2026-10-12');
  });

  it('Week 5 has 15 games', () => {
    expect(WEEK_5.games.length).toBe(15);
  });

  it('Week 5 contains DAL @ TB', () => {
    const game = WEEK_5.games.find(g => g.home === 'DAL' && g.away === 'TB');
    expect(game).toBeDefined();
    expect(game?.status).toBe('scheduled');
  });

  it('Week 5 contains LAR @ BUF (Monday)', () => {
    const game = WEEK_5.games.find(g => g.home === 'LAR' && g.away === 'BUF');
    expect(game).toBeDefined();
    expect(game?.status).toBe('scheduled');
    expect(game?.kickoff).toContain('2026-10-12T20:15:00Z');
  });

  it('Week 5 has correct byes (CAR, KC)', () => {
    expect(WEEK_5.byes).toEqual(['CAR', 'KC']);
    expect(WEEK_5.byes.length).toBe(2);
  });

  it('Week 5 does not include bye teams in games', () => {
    const teams = WEEK_5.games.flatMap(g => [g.home, g.away]);
    expect(teams).not.toContain('CAR');
    expect(teams).not.toContain('KC');
  });

  it('Week 5: 15 games * 2 teams + 2 byes = 32 total teams', () => {
    const teams = new Set(WEEK_5.games.flatMap(g => [g.home, g.away]));
    expect(teams.size + WEEK_5.byes.length).toBe(32);
  });

});

describe('Vegas lines: Week 6 authoritative schedule', () => {

  it('Week 6 schedule exists', () => {
    expect(WEEK_6).toBeDefined();
    expect(WEEK_6.week).toBe(6);
  });

  it('Week 6 has 14 games', () => {
    expect(WEEK_6.games.length).toBe(14);
  });

  it('Week 6 contains DEN @ SEA (Thursday)', () => {
    const game = WEEK_6.games.find(g => g.home === 'DEN' && g.away === 'SEA');
    expect(game).toBeDefined();
    expect(game?.kickoff).toContain('2026-10-15T20:15:00Z');
  });

  it('Week 6 has correct byes (CIN, DET, MIA, MIN)', () => {
    expect(WEEK_6.byes).toEqual(['CIN', 'DET', 'MIA', 'MIN']);
    expect(WEEK_6.byes.length).toBe(4);
  });

  it('Week 6 does not include bye teams in games', () => {
    const teams = WEEK_6.games.flatMap(g => [g.home, g.away]);
    WEEK_6.byes.forEach(bye => {
      expect(teams).not.toContain(bye);
    });
  });

  it('Week 6: 14 games * 2 teams + 4 byes = 32 total teams', () => {
    const teams = new Set(WEEK_6.games.flatMap(g => [g.home, g.away]));
    expect(teams.size + WEEK_6.byes.length).toBe(32);
  });

});

describe('Vegas lines: week progression', () => {

  it('getCurrentNFLWeek function exists', () => {
    expect(typeof getCurrentNFLWeek).toBe('function');
  });

  it('Oct 12 maps to Week 5', () => {
    const testDate = new Date(2026, 9, 12); // Oct 12, 2026 (0-indexed month)
    const current = getCurrentNFLWeek(testDate);
    expect(current.week).toBe(5);
  });

  it('Oct 15+ maps to Week 6', () => {
    const testDate = new Date(2026, 9, 15); // Oct 15, 2026
    const current = getCurrentNFLWeek(testDate);
    expect(current.week).toBe(6);
  });

  it('getWeekByNumber works for all weeks', () => {
    expect(getWeekByNumber(1)?.week).toBe(1);
    expect(getWeekByNumber(2)?.week).toBe(2);
    expect(getWeekByNumber(3)?.week).toBe(3);
    expect(getWeekByNumber(4)?.week).toBe(4);
    expect(getWeekByNumber(5)?.week).toBe(5);
    expect(getWeekByNumber(6)?.week).toBe(6);
  });

});

describe('Vegas lines: all weeks verified', () => {

  it('All 6 weeks exist with correct structure', () => {
    [WEEK_1, WEEK_2, WEEK_3, WEEK_4, WEEK_5, WEEK_6].forEach(week => {
      expect(week.week).toBeDefined();
      expect(week.startDate).toBeDefined();
      expect(week.endDate).toBeDefined();
      expect(Array.isArray(week.games)).toBe(true);
      expect(Array.isArray(week.byes)).toBe(true);
    });
  });

  it('Weeks 1-4 have all results populated', () => {
    [WEEK_1, WEEK_2, WEEK_3, WEEK_4].forEach(week => {
      expect(week.games.every(g => g.status === 'final')).toBe(true);
      expect(week.games.every(g => g.homeScore !== null && g.awayScore !== null)).toBe(true);
    });
  });

  it('Week 5 has scheduled games', () => {
    expect(WEEK_5.games.some(g => g.status === 'scheduled')).toBe(true);
  });

  it('Week 6 has scheduled games', () => {
    expect(WEEK_6.games.some(g => g.status === 'scheduled')).toBe(true);
  });

});
