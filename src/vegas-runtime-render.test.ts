import { describe, it, expect } from 'vitest';
import {
  getCurrentNFLWeek, getWeekByNumber, getPriorWeeks,
  type NFLWeek, type Game
} from './data/nfl-2026-weeks';

describe('Vegas Lines Runtime Rendering', () => {

  it('getCurrentNFLWeek returns week info, getWeekByNumber returns full week', () => {
    const currentWeekInfo = getCurrentNFLWeek();
    expect(currentWeekInfo.week).toBeDefined();
    expect(typeof currentWeekInfo.week).toBe('number');
    
    const weekInfo = getWeekByNumber(currentWeekInfo.week);
    expect(weekInfo).toBeDefined();
    expect(weekInfo?.games).toBeDefined();
    expect(Array.isArray(weekInfo?.games)).toBe(true);
  });

  it('current week schedule mapping (games -> Vegas format) succeeds', () => {
    const currentWeekInfo = getCurrentNFLWeek();
    const weekInfo = getWeekByNumber(currentWeekInfo.week);
    
    const scheduleGames = (weekInfo || { games: [] }).games;
    expect(scheduleGames).toBeDefined();

    const games = scheduleGames.map(function(sg) {
      var home = sg.home;
      var away = sg.away;
      return { home, away, spread: null, total: null, eventId: null };
    });

    expect(games.length).toBeGreaterThan(0);
    expect(games[0]).toHaveProperty('home');
    expect(games[0]).toHaveProperty('away');
  });

  it('Vegas current week with empty odds data still builds schedule', () => {
    const currentWeekInfo = getCurrentNFLWeek();
    const weekInfo = getWeekByNumber(currentWeekInfo.week);
    const oddsData = null;

    const scheduleGames = (weekInfo || { games: [] }).games;
    const games = scheduleGames.map(function(sg) {
      var home = sg.home, away = sg.away;
      var homeOdds = oddsData ? oddsData[home] : null;
      var homeSpread = homeOdds?.spread ?? null;
      var homeTotal = homeOdds?.total ?? null;
      return { home, away, spread: homeSpread, total: homeTotal, eventId: homeOdds?.eventId ?? null };
    });

    expect(games.length).toBeGreaterThan(0);
    expect(games.every(g => g.home && g.away)).toBe(true);
  });

  it('Game object has correct canonical properties (not tuples)', () => {
    const currentWeekInfo = getCurrentNFLWeek();
    const weekInfo = getWeekByNumber(currentWeekInfo.week);

    if (weekInfo && weekInfo.games.length > 0) {
      const game = weekInfo.games[0];

      expect(game).toHaveProperty('home');
      expect(game).toHaveProperty('away');
      expect(game).toHaveProperty('status');
      expect(game).toHaveProperty('homeScore');
      expect(game).toHaveProperty('awayScore');

      expect(typeof (game as any)[0]).toBe('undefined');
      expect(typeof (game as any)[1]).toBe('undefined');
    }
  });

  it('Vegas code uses getWeekByNumber and accesses .games', () => {
    const fs = require('fs');
    const path = require('path');
    const afdpPath = path.join(process.cwd(), 'afdp.tsx');
    const afdpContent = fs.readFileSync(afdpPath, 'utf-8');

    expect(afdpContent).not.toMatch(/weekInfo\.lines/);
    expect(afdpContent).toContain('getWeekByNumber');
    expect(afdpContent).toContain('scheduleGames=(weekInfo||{games:[]}).games');
  });

});
