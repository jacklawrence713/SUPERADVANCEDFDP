import { NFL_2026_WEEKS } from './src/data/nfl-2026-weeks.ts';

// Validation
const allTeams = new Set(['NE', 'MIA', 'NYJ', 'BUF', 'BAL', 'PIT', 'CLE', 'CIN', 'IND', 'TEN', 'HOU', 'JAX', 'LAC', 'KC', 'LV', 'DEN', 'PHI', 'NYG', 'DAL', 'WAS', 'CHI', 'MIN', 'GB', 'DET', 'TB', 'NO', 'CAR', 'ATL', 'SF', 'SEA', 'LA', 'ARI']);

console.log('════════════════════════════════════════════════════════');
console.log('FULL-SEASON VALIDATION');
console.log('════════════════════════════════════════════════════════\n');

// Basic counts
console.log('BASIC COUNTS:');
console.log(`Weeks: ${NFL_2026_WEEKS.length} (expect 18)`);

let totalGames = 0;
for (const week of NFL_2026_WEEKS) {
  totalGames += week.games.length;
}
console.log(`Total games: ${totalGames} (expect 272)`);
console.log();

// Per-week breakdown
console.log('WEEK-BY-WEEK BREAKDOWN:');
console.log('WEEK | GAMES | BYES | TEAMS | VALID');
console.log('-----|-------|------|-------|-------');

let validWeeks = 0;
for (const week of NFL_2026_WEEKS) {
  const teamsInGames = week.games.length * 2;
  const totalTeams = teamsInGames + week.byes.length;
  const valid = totalTeams === 32 ? '✓' : '✗';
  if (totalTeams === 32) validWeeks++;
  console.log(`${week.week.toString().padStart(4)} | ${week.games.length.toString().padStart(5)} | ${week.byes.length.toString().padStart(4)} | ${totalTeams.toString().padStart(5)} | ${valid}`);
}
console.log();
console.log(`Valid weeks: ${validWeeks}/18`);
console.log();

// Per-team game count
console.log('PER-TEAM GAME COUNT:');
console.log('TEAM | GAMES | HOME | AWAY | BYE | VALID');
console.log('-----|-------|------|------|-----|-------');

const teamGames = {};
const teamHome = {};
const teamAway = {};
const teamByes = {};

for (const team of allTeams) {
  teamGames[team] = 0;
  teamHome[team] = 0;
  teamAway[team] = 0;
  teamByes[team] = 0;
}

for (const week of NFL_2026_WEEKS) {
  for (const game of week.games) {
    if (!allTeams.has(game.home) || !allTeams.has(game.away)) {
      console.log(`⚠️  INVALID TEAM in game: ${game.away} @ ${game.home}`);
    }
    if (game.home === game.away) {
      console.log(`⚠️  DUPLICATE TEAM in game: ${game.home} @ ${game.away}`);
    }
    teamGames[game.home]++;
    teamGames[game.away]++;
    teamHome[game.home]++;
    teamAway[game.away]++;
  }
  for (const bye of week.byes) {
    if (!allTeams.has(bye)) {
      console.log(`⚠️  INVALID BYE TEAM: ${bye}`);
    }
    teamByes[bye]++;
    if (week.games.some(g => g.home === bye || g.away === bye)) {
      console.log(`⚠️  BYE TEAM PLAYS: ${bye} in Week ${week.week}`);
    }
  }
}

const sortedTeams = Array.from(allTeams).sort();
let validTeams = 0;
for (const team of sortedTeams) {
  const valid = teamGames[team] === 17 ? '✓' : '✗';
  if (teamGames[team] === 17) validTeams++;
  console.log(`${team} | ${teamGames[team].toString().padStart(5)} | ${teamHome[team].toString().padStart(4)} | ${teamAway[team].toString().padStart(4)} | ${teamByes[team].toString().padStart(3)} | ${valid}`);
}
console.log();
console.log(`Valid teams: ${validTeams}/32`);
console.log();

// Summary
console.log('════════════════════════════════════════════════════════');
if (NFL_2026_WEEKS.length === 18 && totalGames === 272 && validWeeks === 18 && validTeams === 32) {
  console.log('✓ ALL VALIDATIONS PASS');
  console.log('✓ 18 weeks');
  console.log('✓ 272 total games');
  console.log('✓ All 32 teams with 17 games each');
  console.log('✓ All weeks accounting for 32 teams');
  process.exit(0);
} else {
  console.log('✗ VALIDATION FAILED');
  if (NFL_2026_WEEKS.length !== 18) console.log(`  Weeks: ${NFL_2026_WEEKS.length} (expected 18)`);
  if (totalGames !== 272) console.log(`  Games: ${totalGames} (expected 272)`);
  if (validWeeks !== 18) console.log(`  Valid weeks: ${validWeeks}/18`);
  if (validTeams !== 32) console.log(`  Valid teams: ${validTeams}/32`);
  process.exit(1);
}
