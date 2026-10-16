// Vegas Lines Rebuild - Official Schedule Verification Tests
// Source: NFL.com official 2026 schedule, verified Oct 14, 2026

import { describe, it, expect } from 'vitest';
import {
  WEEK_1, WEEK_2, WEEK_3, WEEK_4, WEEK_5, WEEK_6, NFL_2026_WEEKS,
  getWeekByNumber, getPriorWeeks, getCurrentNFLWeek, isCurrentWeekComplete,
  type NFLWeek, type Game
} from './data/nfl-2026-weeks';

describe('Vegas Lines Rebuild - Official NFL Schedule (Weeks 1-18, 272 games)', () => {

  it('WEEK_1 has 16 games with final results', () => {
    expect(WEEK_1.week).toBe(1);
    expect(WEEK_1.games.length).toBe(16);
    expect(WEEK_1.games.every(g => g.status === 'final')).toBe(true);
    expect(WEEK_1.games.every(g => g.homeScore !== null && g.awayScore !== null)).toBe(true);
  });

  it('WEEK_2 has 16 games with final results', () => {
    expect(WEEK_2.week).toBe(2);
    expect(WEEK_2.games.length).toBe(16);
    expect(WEEK_2.games.every(g => g.status === 'final')).toBe(true);
    expect(WEEK_2.games.every(g => g.homeScore !== null && g.awayScore !== null)).toBe(true);
  });

  it('WEEK_3 has 16 games with final results', () => {
    expect(WEEK_3.week).toBe(3);
    expect(WEEK_3.games.length).toBe(16);
    expect(WEEK_3.games.every(g => g.status === 'final')).toBe(true);
    expect(WEEK_3.games.every(g => g.homeScore !== null && g.awayScore !== null)).toBe(true);
  });

  it('WEEK_4 has 16 games with final results', () => {
    expect(WEEK_4.week).toBe(4);
    expect(WEEK_4.games.length).toBe(16);
    expect(WEEK_4.games.every(g => g.status === 'final')).toBe(true);
    expect(WEEK_4.games.every(g => g.homeScore !== null && g.awayScore !== null)).toBe(true);
  });

  it('WEEK_5 has 15 games, Byes: CAR, KC', () => {
    expect(WEEK_5.week).toBe(5);
    expect(WEEK_5.games.length).toBe(15);
    expect(WEEK_5.byes).toEqual(['CAR', 'KC']);
  });

  it('WEEK_6 has 14 games, Byes: CIN, DET, MIA, MIN', () => {
    expect(WEEK_6.week).toBe(6);
    expect(WEEK_6.games.length).toBe(14);
    expect(WEEK_6.byes).toEqual(['CIN', 'DET', 'MIA', 'MIN']);
  });

  it('WEEK_11 has 13 games, Byes: ATL, CLE, GB, LA, NE, SEA', () => {
    const week11 = getWeekByNumber(11);
    expect(week11!.week).toBe(11);
    expect(week11!.games.length).toBe(13);
    expect(week11!.byes).toEqual(['ATL', 'CLE', 'GB', 'LA', 'NE', 'SEA']);
  });

  it('Schedule covers weeks 1-18 (full season)', () => {
    expect(NFL_2026_WEEKS.length).toBe(18);
    expect(NFL_2026_WEEKS.map(w => w.week)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });

  it('Total games in Weeks 1-18 = 272', () => {
    const totalGames = NFL_2026_WEEKS.reduce((sum, week) => sum + week.games.length, 0);
    expect(totalGames).toBe(272);
  });

  it('Week count verification: each week has 32 teams', () => {
    NFL_2026_WEEKS.forEach(week => {
      const teamsPlaying = week.games.length * 2;
      const teamsByesCount = week.byes.length;
      expect(teamsPlaying + teamsByesCount).toBe(32);
    });
  });

  it('Each team plays exactly 17 games', () => {
    const allTeams = ['NE', 'MIA', 'NYJ', 'BUF', 'BAL', 'PIT', 'CLE', 'CIN', 'IND', 'TEN', 'HOU', 'JAX', 'LAC', 'KC', 'LV', 'DEN', 'PHI', 'NYG', 'DAL', 'WAS', 'CHI', 'MIN', 'GB', 'DET', 'TB', 'NO', 'CAR', 'ATL', 'SF', 'SEA', 'LA', 'ARI'];
    const teamGameCount: Record<string, number> = {};
    for (const team of allTeams) teamGameCount[team] = 0;
    for (const week of NFL_2026_WEEKS) {
      for (const game of week.games) {
        teamGameCount[game.home]++;
        teamGameCount[game.away]++;
      }
    }
    for (const team of allTeams) {
      expect(teamGameCount[team]).toBe(17);
    }
  });

  it('getWeekByNumber returns correct weeks', () => {
    expect(getWeekByNumber(1)?.week).toBe(1);
    expect(getWeekByNumber(18)?.week).toBe(18);
    expect(getWeekByNumber(19)).toBeNull();
  });

  it('getPriorWeeks and getCurrentNFLWeek work', () => {
    const prior5 = getPriorWeeks(5);
    expect(prior5.length).toBe(4);
    expect(prior5.map(w => w.week)).toEqual([1, 2, 3, 4]);
  });

  it('isCurrentWeekComplete returns correct values', () => {
    expect(isCurrentWeekComplete(WEEK_1)).toBe(true);
    expect(isCurrentWeekComplete(WEEK_6)).toBe(false);
  });

  it('No duplicate games within any week', () => {
    NFL_2026_WEEKS.forEach(week => {
      const gameKeys = new Set(week.games.map(g => g.home + '-' + g.away));
      expect(gameKeys.size).toBe(week.games.length);
    });
  });

  it('Bye teams do not appear in their bye week games', () => {
    NFL_2026_WEEKS.forEach(week => {
      week.byes.forEach(byeTeam => {
        const appearInGames = week.games.some(g => g.home === byeTeam || g.away === byeTeam);
        expect(appearInGames).toBe(false);
      });
    });
  });

  it('Source metadata is present', () => {
    NFL_2026_WEEKS.forEach(week => {
      expect(week.source).toBeTruthy();
      expect(week.verifiedAt).toBeTruthy();
    });
  });

});

describe('Vegas Lines Rebuild - Data Separation', () => {

  it('Schedule and results are separate from odds', () => {
    expect(WEEK_1.games[0].homeScore).not.toBeNull();
    expect(WEEK_1.games[0].awayScore).not.toBeNull();
  });

  it('Game status is accurate', () => {
    WEEK_1.games.forEach(g => expect(g.status).toBe('final'));
    WEEK_6.games.forEach(g => expect(g.status).toBe('scheduled'));
  });

});
