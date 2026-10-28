/**
 * SEO Data Layer
 *
 * Derives search-friendly data from real application sources.
 * This layer ensures SEO pages always use current, accurate data.
 *
 * No hardcoded stale dates, hardcoded player lists, or fabricated rankings.
 */

import { computeDynastyTradeVal, playerSlug, tierLabel, VALUES_UPDATED_AT } from './logic'

/**
 * Represents a ranked player for SEO purposes
 */
export interface SeoRankedPlayer {
  name: string
  pos: string
  team: string
  age: number
  ktcVal: number
  proj?: { PPR?: number; Half?: number; Standard?: number }
  note?: string
  slug: string
  tradeVal: number
  posRank: number
  rank: number
}

/**
 * SEO Data Context
 * Contains top players, rankings, and metadata for generating SEO content
 */
export interface SeoDataContext {
  valuesDate: string
  allPlayers: SeoRankedPlayer[]
  topOverall: SeoRankedPlayer[]
  topQB: SeoRankedPlayer[]
  topRB: SeoRankedPlayer[]
  topWR: SeoRankedPlayer[]
  topTE: SeoRankedPlayer[]
  topIDP: SeoRankedPlayer[]
  topPick: SeoRankedPlayer[] // Early 1st round value equivalents
  superflex: {
    topOverall: SeoRankedPlayer[]
    topQB: SeoRankedPlayer[]
  }
  tePremium: {
    topOverall: SeoRankedPlayer[]
    topTE: SeoRankedPlayer[]
  }
}

/**
 * Generate SEO data context from parsed players
 *
 * @param players Parsed players from afdp.tsx with name, pos, age, ktcVal, proj, note
 * @param opts Optional calculation options (superflex, tePremium, etc.)
 * @returns SEO data context with all derived ranking data
 */
export function generateSeoData(
  players: any[],
  opts: { sf?: boolean; tep?: boolean; idp?: boolean } = {}
): SeoDataContext {
  // Rank all players with standard dynasty settings (1QB, PPR, full IDP)
  const ranked = rankPlayersForSeo(players, { sf: false, tep: false, idp: true })

  // Separate by position
  const qbs = ranked.filter(p => p.pos === 'QB')
  const rbs = ranked.filter(p => p.pos === 'RB')
  const wrs = ranked.filter(p => p.pos === 'WR')
  const tes = ranked.filter(p => p.pos === 'TE')
  const idps = ranked.filter(p => ['DL', 'LB', 'DB'].includes(p.pos))

  // For Superflex: recalculate with SF enabled
  const sfRanked = rankPlayersForSeo(players, { sf: true, tep: false, idp: true })
  const sfQbs = sfRanked.filter(p => p.pos === 'QB')

  // For TE Premium: recalculate with TEP enabled
  const tepRanked = rankPlayersForSeo(players, { sf: false, tep: true, idp: true })
  const tepTes = tepRanked.filter(p => p.pos === 'TE')

  return {
    valuesDate: VALUES_UPDATED_AT,
    allPlayers: ranked,
    topOverall: ranked.slice(0, 100),
    topQB: qbs.slice(0, 50),
    topRB: rbs.slice(0, 50),
    topWR: wrs.slice(0, 50),
    topTE: tes.slice(0, 50),
    topIDP: idps.slice(0, 50),
    topPick: ranked.slice(0, 50), // Players valued like 1st round picks
    superflex: {
      topOverall: sfRanked.slice(0, 100),
      topQB: sfQbs.slice(0, 20),
    },
    tePremium: {
      topOverall: tepRanked.slice(0, 100),
      topTE: tepTes.slice(0, 20),
    },
  }
}

/**
 * Rank players for SEO with standard dynasty settings
 */
function rankPlayersForSeo(
  players: any[],
  opts: { sf?: boolean; tep?: boolean; idp?: boolean } = {}
): SeoRankedPlayer[] {
  // Compute trade values using standard options
  const calcOpts = {
    sf: opts.sf ?? false,
    tep: opts.tep ?? false,
    idp: opts.idp ?? true,
  }

  const ranked = players
    .map(p => ({
      name: p.name,
      pos: p.pos,
      team: p.team,
      age: p.age,
      ktcVal: p.ktcVal,
      proj: p.proj,
      note: p.note,
      slug: playerSlug(p.name),
      tradeVal: computeDynastyTradeVal(
        p.pos,
        p.age,
        p.ktcVal,
        1,
        (p.proj || {}).PPR || 0,
        calcOpts
      ),
    }))
    .sort((a, b) => b.tradeVal - a.tradeVal)
    .map((p, idx) => {
      // Add positional rank
      const posRank =
        players
          .filter(x => x.pos === p.pos)
          .sort(
            (a, b) =>
              computeDynastyTradeVal(
                b.pos,
                b.age,
                b.ktcVal,
                1,
                (b.proj || {}).PPR || 0,
                calcOpts
              ) -
              computeDynastyTradeVal(
                a.pos,
                a.age,
                a.ktcVal,
                1,
                (a.proj || {}).PPR || 0,
                calcOpts
              )
          )
          .findIndex(x => x.name === p.name) + 1

      return {
        ...p,
        posRank,
        rank: idx + 1,
      }
    })

  return ranked
}

/**
 * Get comparable players for a given player
 * Returns same-position players closest in trade value
 */
export function getComparablePlayers(
  player: SeoRankedPlayer,
  allPlayers: SeoRankedPlayer[],
  count: number = 3
): SeoRankedPlayer[] {
  return allPlayers
    .filter(p => p.pos === player.pos && p.name !== player.name)
    .sort((a, b) => Math.abs(a.tradeVal - player.tradeVal) - Math.abs(b.tradeVal - player.tradeVal))
    .slice(0, count)
}

/**
 * Format a trade value for display
 */
export function formatTradeValue(val: number): string {
  return val.toLocaleString()
}

/**
 * Get position-specific ranking page title
 */
export function getPositionRankingTitle(pos: string): string {
  const titles: Record<string, string> = {
    QB: 'Dynasty QB Rankings',
    RB: 'Dynasty RB Rankings',
    WR: 'Dynasty WR Rankings',
    TE: 'Dynasty TE Rankings',
    DL: 'Dynasty DL Rankings',
    LB: 'Dynasty LB Rankings',
    DB: 'Dynasty DB Rankings',
  }
  return titles[pos] || `Dynasty ${pos} Rankings`
}

/**
 * Get position-specific ranking page description
 */
export function getPositionRankingDescription(pos: string, count: number = 50): string {
  const descriptions: Record<string, string> = {
    QB: `Top dynasty QB rankings and trade values. Compare ${count} elite quarterbacks with FDP Values, age adjustments, and position rank.`,
    RB: `Top dynasty RB rankings and trade values. Compare ${count} elite running backs with FDP Values, team impact, and positional scarcity.`,
    WR: `Top dynasty WR rankings and trade values. Compare ${count} elite wide receivers with FDP Values, route assignments, and target share.`,
    TE: `Top dynasty TE rankings and trade values. Compare ${count} elite tight ends with FDP Values, positional scarcity, and scoring impact.`,
    DL: `Top dynasty DL (defensive line) IDP rankings and trade values. Compare ${count} elite pass rushers with FDP Values and sack rates.`,
    LB: `Top dynasty LB (linebacker) IDP rankings and trade values. Compare ${count} elite defenders with FDP Values and tackle rates.`,
    DB: `Top dynasty DB (defensive back) IDP rankings and trade values. Compare ${count} elite defensive backs with FDP Values and interception rates.`,
  }
  return descriptions[pos] || `Top dynasty ${pos} rankings and trade values.`
}
