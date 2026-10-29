/**
 * NFL Team Directory
 * Lists all 32 NFL teams with links to fantasy hubs
 */

export interface TeamInfo {
  name: string
  short: string
  division: string
  conference: string
  slug: string
}

const TEAMS: TeamInfo[] = [
  // AFC East
  { name: 'Buffalo Bills', short: 'BUF', division: 'AFC East', conference: 'AFC', slug: 'buffalo-bills' },
  { name: 'Miami Dolphins', short: 'MIA', division: 'AFC East', conference: 'AFC', slug: 'miami-dolphins' },
  { name: 'New England Patriots', short: 'NE', division: 'AFC East', conference: 'AFC', slug: 'new-england-patriots' },
  { name: 'New York Jets', short: 'NYJ', division: 'AFC East', conference: 'AFC', slug: 'new-york-jets' },
  // AFC Central
  { name: 'Baltimore Ravens', short: 'BAL', division: 'AFC North', conference: 'AFC', slug: 'baltimore-ravens' },
  { name: 'Pittsburgh Steelers', short: 'PIT', division: 'AFC North', conference: 'AFC', slug: 'pittsburgh-steelers' },
  { name: 'Cleveland Browns', short: 'CLE', division: 'AFC North', conference: 'AFC', slug: 'cleveland-browns' },
  { name: 'Cincinnati Bengals', short: 'CIN', division: 'AFC North', conference: 'AFC', slug: 'cincinnati-bengals' },
  // AFC South
  { name: 'Houston Texans', short: 'HOU', division: 'AFC South', conference: 'AFC', slug: 'houston-texans' },
  { name: 'Jacksonville Jaguars', short: 'JAX', division: 'AFC South', conference: 'AFC', slug: 'jacksonville-jaguars' },
  { name: 'Indianapolis Colts', short: 'IND', division: 'AFC South', conference: 'AFC', slug: 'indianapolis-colts' },
  { name: 'Tennessee Titans', short: 'TEN', division: 'AFC South', conference: 'AFC', slug: 'tennessee-titans' },
  // AFC West
  { name: 'Denver Broncos', short: 'DEN', division: 'AFC West', conference: 'AFC', slug: 'denver-broncos' },
  { name: 'Kansas City Chiefs', short: 'KC', division: 'AFC West', conference: 'AFC', slug: 'kansas-city-chiefs' },
  { name: 'Las Vegas Raiders', short: 'LV', division: 'AFC West', conference: 'AFC', slug: 'las-vegas-raiders' },
  { name: 'Los Angeles Chargers', short: 'LAC', division: 'AFC West', conference: 'AFC', slug: 'los-angeles-chargers' },
  // NFC East
  { name: 'Dallas Cowboys', short: 'DAL', division: 'NFC East', conference: 'NFC', slug: 'dallas-cowboys' },
  { name: 'Philadelphia Eagles', short: 'PHI', division: 'NFC East', conference: 'NFC', slug: 'philadelphia-eagles' },
  { name: 'Washington Commanders', short: 'WAS', division: 'NFC East', conference: 'NFC', slug: 'washington-commanders' },
  { name: 'New York Giants', short: 'NYG', division: 'NFC East', conference: 'NFC', slug: 'new-york-giants' },
  // NFC North
  { name: 'Chicago Bears', short: 'CHI', division: 'NFC North', conference: 'NFC', slug: 'chicago-bears' },
  { name: 'Detroit Lions', short: 'DET', division: 'NFC North', conference: 'NFC', slug: 'detroit-lions' },
  { name: 'Green Bay Packers', short: 'GB', division: 'NFC North', conference: 'NFC', slug: 'green-bay-packers' },
  { name: 'Minnesota Vikings', short: 'MIN', division: 'NFC North', conference: 'NFC', slug: 'minnesota-vikings' },
  // NFC South
  { name: 'Atlanta Falcons', short: 'ATL', division: 'NFC South', conference: 'NFC', slug: 'atlanta-falcons' },
  { name: 'Carolina Panthers', short: 'CAR', division: 'NFC South', conference: 'NFC', slug: 'carolina-panthers' },
  { name: 'New Orleans Saints', short: 'NO', division: 'NFC South', conference: 'NFC', slug: 'new-orleans-saints' },
  { name: 'Tampa Bay Buccaneers', short: 'TB', division: 'NFC South', conference: 'NFC', slug: 'tampa-bay-buccaneers' },
  // NFC West
  { name: 'Arizona Cardinals', short: 'ARI', division: 'NFC West', conference: 'NFC', slug: 'arizona-cardinals' },
  { name: 'Los Angeles Rams', short: 'LAR', division: 'NFC West', conference: 'NFC', slug: 'los-angeles-rams' },
  { name: 'San Francisco 49ers', short: 'SF', division: 'NFC West', conference: 'NFC', slug: 'san-francisco-49ers' },
  { name: 'Seattle Seahawks', short: 'SEA', division: 'NFC West', conference: 'NFC', slug: 'seattle-seahawks' },
]

export function getTeams(): TeamInfo[] {
  return TEAMS
}

export function getTeamBySlug(slug: string): TeamInfo | undefined {
  return TEAMS.find(t => t.slug === slug)
}

export function generateTeamDirectoryHtml(appScripts: string, appPreloads: string, darkModeScript: string): string {
  const divisions = [...new Set(TEAMS.map(t => t.division))].sort()
  const divsHTML = divisions
    .map(div => {
      const teamsInDiv = TEAMS.filter(t => t.division === div).sort((a, b) => a.name.localeCompare(b.name))
      const teamsHTML = teamsInDiv
        .map(t => `<li><a href="https://fantasydraftpros.com/nfl/${t.slug}/fantasy-football/" style="color:#7c4dff;text-decoration:none">${escapeHtml(t.name)}</a></li>`)
        .join('')
      return `<div style="margin-bottom:24px">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#7c4dff">${div}</h3>
        <ul style="list-style:none;padding:0">
          ${teamsHTML}
        </ul>
      </div>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NFL Teams Fantasy Football | Dynasty Guides | Fantasy Draft Pros</title>
  <meta name="description" content="Explore fantasy football dynasty guides for all 32 NFL teams. View team rosters, highest-value assets, and trading recommendations.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fantasydraftpros.com/nfl/">
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://fantasydraftpros.com"},
      {"@type": "ListItem", "position": 2, "name": "NFL Teams", "item": "https://fantasydraftpros.com/nfl/"}
    ]
  }</script>
  ${appPreloads}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f15; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #fff; }
    .subtitle { font-size: 14px; color: #9b96b8; margin-bottom: 20px; }
    .section { background: #1a1a24; border-radius: 12px; padding: 20px; border: 1px solid #333; }
    h3 { color: #7c4dff; }
    li { margin-bottom: 8px; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>NFL Teams Fantasy Football</h1>
    <p class="subtitle">Explore dynasty fantasy guides for all 32 NFL teams</p>

    <div class="section">
      ${divsHTML}
    </div>
  </div>
  ${darkModeScript}
  ${appScripts}
</body>
</html>`
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, m => map[m])
}
