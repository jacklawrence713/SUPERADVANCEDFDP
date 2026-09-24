// Extracted business logic from afdp.tsx for testability.
// These functions mirror the production code exactly — do NOT modify afdp.tsx.

export const PRIME: Record<string, [number, number]> = {
  QB: [26, 35], RB: [22, 27], WR: [23, 29], TE: [25, 30],
  K: [25, 38], DST: [0, 99], DL: [23, 30], LB: [23, 30], DB: [23, 29],
};

export const FREE_RANK_LIMIT = 20;
export const FREE_TRADE_LIMIT = 3;
export const VALUES_UPDATED_AT = "2026-09-19";
export const VALUES_VERSION = "2026-09-19.1"; // date.revision — incremented on each canonical value release

export const ADMIN_EMAILS = [
  "jacklawrence713@gmail.com", "modgy28@hotmail.com",
  "sbesk787@gmail.com", "starrrya@yahoo.com",
];
export const FULL_ACCESS_EMAILS = [
  "stevengroller@yahoo.com", "nzajac23@gmail.com",
  "coryhardy22@gmail.com", "heathermholdsworth@gmail.com",
  "cssum0@hotmail.com", "theprez@yahoo.com", "theprez27@yahoo.com",
];

export function isAdminEmail(e: string | null | undefined): boolean {
  return ADMIN_EMAILS.indexOf((e || "").toLowerCase().trim()) !== -1;
}

export function isFullAccessEmail(e: string | null | undefined): boolean {
  return FULL_ACCESS_EMAILS.indexOf((e || "").toLowerCase().trim()) !== -1;
}

export function dynastyBonus(pos: string, age: number): number {
  if (pos === "DST" || pos === "K" || pos === "PICK") return 1;
  var lo = PRIME[pos] ? PRIME[pos][0] : 25;
  var yRate = pos === "QB" ? 0.020 : 0.045;
  if (age < lo) return 1 + (lo - age) * yRate;
  if (age > lo + 6) return Math.max(0.45, 1 - (age - lo - 6) * 0.065);
  return 1;
}

export function getBaselines(teams: number, sf: boolean): Record<string, number> {
  return {
    QB: sf ? teams * 2 : teams,
    RB: teams * 2, WR: teams * 2, TE: teams,
    K: teams, DST: teams, DL: teams, LB: teams, DB: teams,
  };
}

export function ageGrade(pos: string, age: number): { g: string; c: string } {
  if (pos === "DST" || pos === "PICK") return { g: "N/A", c: "#5c5880" };
  var lo = PRIME[pos] ? PRIME[pos][0] : 25;
  var hi = PRIME[pos] ? PRIME[pos][1] : 30;
  var d = Math.abs(age - (lo + hi) / 2);
  if (d <= 1.5) return { g: "A+", c: "#10b981" };
  if (d <= 3) return { g: "A", c: "#34d399" };
  if (age < lo) return { g: "B", c: "#f1c40f" };
  if (age > hi + 5) return { g: "D", c: "#ef4444" };
  return { g: "C", c: "#f97316" };
}

export function tierLabel(pr: number, pos: string): { t: number; c: string } {
  var ct: Record<string, number[]> = {
    QB: [1, 3, 6, 12], RB: [1, 4, 8, 16], WR: [1, 4, 8, 16],
    TE: [1, 2, 4, 8], K: [1, 3, 5, 8], DST: [1, 2, 4, 6],
    DL: [1, 3, 6, 10], LB: [1, 3, 6, 10], DB: [1, 3, 6, 10],
    PICK: [1, 2, 4, 6],
  };
  var t = ct[pos] || [1, 4, 8, 16];
  if (pr <= t[0]) return { t: 1, c: "#f1c40f" };
  if (pr <= t[1]) return { t: 2, c: "#818cf8" };
  if (pr <= t[2]) return { t: 3, c: "#10b981" };
  if (pr <= t[3]) return { t: 4, c: "#a78bfa" };
  return { t: 5, c: "#4b5563" };
}

export function scarcityLabel(pr: number, bl: number): { l: string; c: string } {
  var r = pr / bl;
  if (r <= 0.25) return { l: "Elite", c: "#f1c40f" };
  if (r <= 0.5) return { l: "Scarce", c: "#f87171" };
  if (r <= 0.75) return { l: "Available", c: "#10b981" };
  return { l: "Deep", c: "#4b5563" };
}

export function makePick(pk: { round: number; est: number; [key: string]: any }) {
  var fdpBoost = pk.round <= 1 ? 1.05 : pk.round <= 2 ? 1.03 : 1.0;
  var tv = Math.round(pk.est * fdpBoost);
  return Object.assign({}, pk, {
    pos: "PICK", age: 0, pts: tv, vbd: tv, tradeVal: tv,
    ag: { g: "N/A", c: "#5c5880" },
    tier: tierLabel(pk.round, "PICK"),
    scarcity: { l: "—", c: "#5c5880" },
    auction: tv, ffabVal: tv, rank: 999, team: "—",
  });
}

// Canonical redraft VBD multiplier — default for adminTvMult.
export var REDRAFT_TV_MULT = 80;

// Canonical redraft trade value computation.
// Used by: afdp.tsx rankedPlayers (redraft path), snapshot producer.
export function computeRedraftTradeVal(
  pos: string,
  posRank: number,
  baseTV: number,
  opts: { isSF: boolean },
): number {
  var rdPk = pos === "QB" ? (opts.isSF ? 7000 : 3500)
    : pos === "RB" ? 8000
    : pos === "TE" ? 5000
    : pos === "K" || pos === "DST" ? 2500
    : pos === "DL" ? 4000
    : pos === "LB" ? 3000
    : pos === "DB" ? 2800
    : 7500; // WR
  var rdDc = pos === "TE" ? 0.850 : 0.900;
  var rdFloor = Math.round(Math.max(100, rdPk * Math.pow(rdDc, posRank - 1)));
  return Math.max(rdFloor, Math.min(9500, Math.max(100, baseTV)));
}

// Dynasty trade value computation — the ONE canonical implementation.
// Used by: afdp.tsx rankedPlayers, SEO page generator (vite.config.ts), tests.
// uncapped=true returns the raw calculated value (internal use for tie-breaking only).
// uncapped=false (default) returns the capped 0–9,999 FDP Value shown to users.
export function computeDynastyTradeVal(
  pos: string, age: number, ktcVal: number | undefined,
  posRank: number, projSKey: number,
  opts: { isSF: boolean; sKey: string; tePremium: number; idpMode: boolean },
  uncapped?: boolean,
): number {
  var isIDP = pos === "DL" || pos === "LB" || pos === "DB";
  var cfg = pos === "QB" ? (opts.isSF ? { pk: 7660, dc: 0.927 } : { pk: 5800, dc: 0.912 })
    : pos === "RB" ? { pk: 9987, dc: 0.921 }
    : pos === "TE" ? { pk: 8756, dc: 0.833 }
    : pos === "DL" ? { pk: 5500, dc: 0.940 }
    : pos === "LB" ? { pk: 4500, dc: 0.935 }
    : pos === "DB" ? { pk: 4200, dc: 0.930 }
    : { pk: 9950, dc: 0.927 }; // WR
  var ab = dynastyBonus(pos, age);
  var sfQbBoost = (opts.isSF && pos === "QB") ? 1.25 : 1;
  var fmtAdj = 1;
  if (opts.sKey === "Standard") {
    if (pos === "RB") fmtAdj = 1.06;
    else if (pos === "WR") fmtAdj = 0.95;
    else if (pos === "TE") fmtAdj = 0.92;
  } else if (opts.sKey === "Half") {
    if (pos === "RB") fmtAdj = 1.03;
    else if (pos === "TE") fmtAdj = 0.96;
  }
  var tepAdj = (opts.tePremium > 0 && pos === "TE") ? 1.15 : 1;
  var idpAdj = (opts.idpMode && isIDP) ? 1.12 : 1;
  var result: number;
  if (ktcVal) {
    result = Math.round(ktcVal * ab * sfQbBoost * fmtAdj * tepAdj * idpAdj);
  } else {
    var rv = cfg.pk * Math.pow(cfg.dc, posRank - 1);
    var rankVal = Math.round(Math.max(100, Math.min(9500, rv * ab)));
    var rawFloor = pos !== "QB" ? Math.round((projSKey || 0) * (isIDP ? 5 : 15) * ab) : 0;
    var formulaVal = pos !== "QB" ? Math.max(rankVal, Math.min(3500, rawFloor)) : rankVal;
    result = Math.round(formulaVal * fmtAdj * tepAdj * idpAdj);
  }
  return uncapped ? result : Math.min(9999, result);
}

export function playerSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── Centralized product statistics ──────────────────────────────
// Single source of truth for public-facing claims. Derived from
// the actual PLAYERS dataset or verified feature inventory.
export const PRODUCT_STATS = {
  // Platform import support — only platforms with real API/automated import
  // Yahoo is manual paste (same as Manual Import with Yahoo instructions) — not counted
  SUPPORTED_PLATFORMS: ["Sleeper", "ESPN"] as const,
  PLATFORM_COUNT: 2,
  // Scoring formats: PPR, Half PPR, Standard — the three base scoring systems
  SCORING_FORMATS: ["PPR", "Half PPR", "Standard"] as const,
  // Additional mode toggles: Superflex, TE Premium, IDP
  MODE_TOGGLES: ["Superflex", "TE Premium", "IDP"] as const,
} as const;

// ── Format context label ─────────────────────────────────────
// Returns a human-readable label for the active scoring configuration.
export function formatContextLabel(
  isDynasty: boolean, isSF: boolean, sKey: string, tePremium: number,
): string {
  var parts: string[] = [];
  parts.push(isDynasty ? "Dynasty" : "Redraft");
  parts.push(isSF ? "Superflex" : "1QB");
  parts.push(sKey === "Standard" ? "Standard" : sKey === "Half" ? "Half PPR" : "PPR");
  if (tePremium > 0) parts.push("TEP");
  return parts.join(" \u00B7 ");
}

// ── "Why this value?" explanation ────────────────────────────
// Returns only the factors that ACTUALLY influenced a specific player's
// FDP Value via computeDynastyTradeVal(). Never references factors not
// in the canonical calculation.
export type ValueFactor = { label: string; detail: string; impact: "positive" | "negative" | "neutral" };

export function explainFdpValue(
  pos: string, age: number, ktcVal: number | undefined,
  opts: { isSF: boolean; sKey: string; tePremium: number; idpMode: boolean },
): ValueFactor[] {
  var factors: ValueFactor[] = [];
  var isIDP = pos === "DL" || pos === "LB" || pos === "DB";

  // Base valuation source
  if (ktcVal) {
    factors.push({ label: "Base valuation", detail: "Market-informed player value", impact: "neutral" });
  } else {
    factors.push({ label: "Base valuation", detail: "Position rank decay model", impact: "neutral" });
  }

  // Age / dynasty bonus
  var ab = dynastyBonus(pos, age);
  if (pos !== "DST" && pos !== "K" && pos !== "PICK") {
    var lo = PRIME[pos] ? PRIME[pos][0] : 25;
    if (ab > 1) {
      factors.push({ label: "Age adjustment", detail: "Pre-prime youth bonus (age " + age.toFixed(1) + ")", impact: "positive" });
    } else if (ab < 1) {
      factors.push({ label: "Age adjustment", detail: "Post-prime aging curve (age " + age.toFixed(1) + ")", impact: "negative" });
    } else {
      factors.push({ label: "Age adjustment", detail: "In or near prime window (age " + age.toFixed(1) + ")", impact: "neutral" });
    }
  }

  // Superflex QB boost
  if (opts.isSF && pos === "QB") {
    factors.push({ label: "Superflex boost", detail: "QB value increased for SF leagues", impact: "positive" });
  }

  // Scoring format
  var fmtAdj = 1;
  if (opts.sKey === "Standard") {
    if (pos === "RB") fmtAdj = 1.06;
    else if (pos === "WR") fmtAdj = 0.95;
    else if (pos === "TE") fmtAdj = 0.92;
  } else if (opts.sKey === "Half") {
    if (pos === "RB") fmtAdj = 1.03;
    else if (pos === "TE") fmtAdj = 0.96;
  }
  if (fmtAdj !== 1) {
    var fmtName = opts.sKey === "Standard" ? "Standard" : "Half PPR";
    factors.push({
      label: "Scoring format",
      detail: fmtName + " adjustment (" + (fmtAdj > 1 ? "+" : "") + ((fmtAdj - 1) * 100).toFixed(0) + "%)",
      impact: fmtAdj > 1 ? "positive" : "negative",
    });
  }

  // TE Premium
  if (opts.tePremium > 0 && pos === "TE") {
    factors.push({ label: "TE Premium", detail: "TE value boosted for TEP leagues (+15%)", impact: "positive" });
  }

  // IDP mode
  if (opts.idpMode && isIDP) {
    factors.push({ label: "IDP mode", detail: "IDP player value boosted (+12%)", impact: "positive" });
  }

  return factors;
}

export function tVal(
  side: Array<{ pos: string; tradeVal?: number; est?: number }>,
  fa: number,
  budget: number,
): number {
  return side.reduce(function (s, x) {
    return s + (x.pos === "PICK" ? (x.est || 0) : Math.max(0, x.tradeVal || 0));
  }, 0) + ((fa || 0) * (2000 / Math.max(50, budget)));
}

export function verdict(
  tvA: number,
  tvB: number,
): { txt: string; sub: string; c: string; pct: number } {
  var diff = tvA - tvB;
  var maxVal = Math.max(tvA, tvB);
  if (maxVal === 0) return { txt: "Fair Trade", sub: "Both sides get equal value", c: "#22c55e", pct: 50 };
  var pct = Math.abs(diff) / maxVal * 100;
  if (pct < 8) return { txt: "Fair Trade", sub: "Both sides get equal value", c: "#22c55e", pct: 50 };
  if (diff > 0) return { txt: "Team A Overpays", sub: "Team B wins by " + pct.toFixed(0) + "%", c: "#ef4444", pct: Math.max(15, 50 - pct / 2) };
  return { txt: "Team B Overpays", sub: "Team A wins by " + pct.toFixed(0) + "%", c: "#f59e0b", pct: Math.min(85, 50 + pct / 2) };
}

// ── Trade Context Analysis ──────────────────────────────────────

export function computeTradeAgeImpact(
  sent: Array<{ pos: string; age?: number }>,
  received: Array<{ pos: string; age?: number }>,
): {
  avgAgeSent: number | null; avgAgeReceived: number | null;
  sentWithAge: number; receivedWithAge: number;
  preSent: number; primeSent: number; postSent: number;
  preReceived: number; primeReceived: number; postReceived: number;
} {
  var sentP = sent.filter(function (p) { return p.pos !== "PICK" && p.age != null && p.age > 0; });
  var rcvdP = received.filter(function (p) { return p.pos !== "PICK" && p.age != null && p.age > 0; });
  function avg(arr: Array<{ age?: number }>) {
    return arr.length > 0 ? arr.reduce(function (s, p) { return s + (p.age || 0); }, 0) / arr.length : null;
  }
  function classify(arr: Array<{ pos: string; age?: number }>) {
    var pre = 0, prime = 0, post = 0;
    arr.forEach(function (p) {
      var lo = PRIME[p.pos] ? PRIME[p.pos][0] : 25;
      var hi = PRIME[p.pos] ? PRIME[p.pos][1] : 30;
      if (p.age! < lo) pre++; else if (p.age! > hi) post++; else prime++;
    });
    return { pre: pre, prime: prime, post: post };
  }
  var sc = classify(sentP); var rc = classify(rcvdP);
  return {
    avgAgeSent: avg(sentP), avgAgeReceived: avg(rcvdP),
    sentWithAge: sentP.length, receivedWithAge: rcvdP.length,
    preSent: sc.pre, primeSent: sc.prime, postSent: sc.post,
    preReceived: rc.pre, primeReceived: rc.prime, postReceived: rc.post,
  };
}

export function computeTradePositionalImpact(
  sent: Array<{ pos: string; tradeVal?: number }>,
  received: Array<{ pos: string; tradeVal?: number }>,
): Array<{ pos: string; valSent: number; valReceived: number; countSent: number; countReceived: number; net: number }> {
  return ["QB", "RB", "WR", "TE"].map(function (pos) {
    var valS = sent.filter(function (p) { return p.pos === pos; }).reduce(function (s, p) { return s + (p.tradeVal || 0); }, 0);
    var valR = received.filter(function (p) { return p.pos === pos; }).reduce(function (s, p) { return s + (p.tradeVal || 0); }, 0);
    return {
      pos: pos, valSent: valS, valReceived: valR,
      countSent: sent.filter(function (p) { return p.pos === pos; }).length,
      countReceived: received.filter(function (p) { return p.pos === pos; }).length,
      net: valR - valS,
    };
  }).filter(function (d) { return d.valSent > 0 || d.valReceived > 0; });
}

export function computeTradeDraftCapitalImpact(
  sent: Array<{ pos: string; tradeVal?: number; est?: number }>,
  received: Array<{ pos: string; tradeVal?: number; est?: number }>,
): { picksSentCount: number; picksReceivedCount: number; pickValSent: number; pickValReceived: number; netPickVal: number } {
  var ps = sent.filter(function (p) { return p.pos === "PICK"; });
  var pr = received.filter(function (p) { return p.pos === "PICK"; });
  var valS = ps.reduce(function (s, p) { return s + (p.tradeVal || p.est || 0); }, 0);
  var valR = pr.reduce(function (s, p) { return s + (p.tradeVal || p.est || 0); }, 0);
  return {
    picksSentCount: ps.length, picksReceivedCount: pr.length,
    pickValSent: valS, pickValReceived: valR, netPickVal: valR - valS,
  };
}

export function generateTradeWarnings(
  sent: Array<{ pos: string; name?: string }>,
  received: Array<{ pos: string; name?: string }>,
  opts: {
    isSF: boolean; picksSentCount: number;
    userRoster?: Array<{ pos: string; name: string }> | null;
    hasSlotData?: boolean;
  },
): string[] {
  var w: string[] = [];
  if (opts.isSF) {
    var qbS = sent.filter(function (p) { return p.pos === "QB"; }).length;
    var qbR = received.filter(function (p) { return p.pos === "QB"; }).length;
    if (qbS > qbR) {
      if (opts.userRoster) {
        var rQBs = opts.userRoster.filter(function (p) { return p.pos === "QB"; }).length;
        var postQBs = rQBs - qbS + qbR;
        if (postQBs <= 1) w.push("Trade leaves only " + postQBs + " QB on roster in Superflex.");
      } else {
        w.push("Trading away a QB without receiving one back in Superflex.");
      }
    }
  }
  if (opts.userRoster) {
    var teS = sent.filter(function (p) { return p.pos === "TE"; }).length;
    var teR = received.filter(function (p) { return p.pos === "TE"; }).length;
    var rTEs = opts.userRoster.filter(function (p) { return p.pos === "TE"; }).length;
    if (rTEs - teS + teR <= 0) w.push("Trade removes all TEs from roster.");
  }
  if (opts.picksSentCount >= 3) w.push("Sending " + opts.picksSentCount + " draft picks — significant future capital.");
  if (opts.userRoster && !opts.hasSlotData) w.push("Lineup settings unavailable — lineup impact cannot be calculated.");
  return w;
}

// ── Trade Finder Logic ──────────────────────────────────────

export var TF_MAX_CANDIDATES = 8;
export var TF_MAX_TARGETS = 5;
export var TF_MAX_ASSETS = 5;
export var TF_FAIRNESS_THRESHOLD = 25;

export function computeTeamPosValues(
  players: Array<{ pos: string; tradeVal?: number }>,
): Record<string, number> {
  var r: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  players.forEach(function (p) { if (r[p.pos] !== undefined) r[p.pos] += (p.tradeVal || 0); });
  return r;
}

export function computePosRanksForTeams(
  teamPosVals: Array<Record<string, number>>,
): Array<Record<string, number>> {
  return teamPosVals.map(function (v, i) {
    var ranks: Record<string, number> = {};
    ["QB", "RB", "WR", "TE"].forEach(function (pos) {
      var rank = 1;
      teamPosVals.forEach(function (o, j) { if (j !== i && (o[pos] || 0) > (v[pos] || 0)) rank++; });
      ranks[pos] = rank;
    });
    return ranks;
  });
}

export function computeTeamNeeds(
  posRanks: Record<string, number>,
  posVals: Record<string, number>,
  n: number,
): Array<{ pos: string; rank: number; n: number; val: number; isNeed: boolean; isSurplus: boolean }> {
  return ["QB", "RB", "WR", "TE"].map(function (pos) {
    var rank = posRanks[pos] || 1;
    return {
      pos: pos, rank: rank, n: n, val: posVals[pos] || 0,
      isNeed: rank > Math.ceil(n * 0.5),
      isSurplus: rank <= Math.max(1, Math.ceil(n * 0.33)),
    };
  });
}

export function computePartnerScore(
  userNeeds: Array<{ pos: string; isNeed: boolean; isSurplus: boolean }>,
  partnerNeeds: Array<{ pos: string; isNeed: boolean; isSurplus: boolean }>,
): number {
  var score = 0;
  ["QB", "RB", "WR", "TE"].forEach(function (pos) {
    var un = userNeeds.find(function (n) { return n.pos === pos; });
    var pn = partnerNeeds.find(function (n) { return n.pos === pos; });
    if (!un || !pn) return;
    if (un.isNeed && pn.isSurplus) score += 3;
    if (pn.isNeed && un.isSurplus) score += 3;
    if (un.isNeed && !pn.isNeed && !pn.isSurplus) score += 1;
    if (pn.isNeed && !un.isNeed && !un.isSurplus) score += 1;
  });
  return score;
}

interface TFPlayerInput { name: string; pos: string; tradeVal?: number; est?: number; age?: number }
interface TFTeamInput { idx: number; name: string; players: TFPlayerInput[] }
export interface TFCandidate {
  partnerIdx: number; partnerName: string;
  userSends: TFPlayerInput[]; userReceives: TFPlayerInput[];
  userVal: number; partnerVal: number; fairnessPct: number;
  score: number; fitLabel: string; fairnessLabel: string; key: string;
}

export function generateTradeCandidates(config: {
  userIdx: number; teams: TFTeamInput[];
  posFilter?: string | null; partnerIdx?: number | null; targetPlayerName?: string | null;
}): TFCandidate[] {
  var userTeam = config.teams.find(function (t) { return t.idx === config.userIdx; });
  if (!userTeam || config.teams.length < 2) return [];
  var n = config.teams.length;

  var allPosVals = config.teams.map(function (t) { return computeTeamPosValues(t.players); });
  var allPosRanks = computePosRanksForTeams(allPosVals);
  var allNeeds = config.teams.map(function (_t, i) { return computeTeamNeeds(allPosRanks[i], allPosVals[i], n); });
  var userNeeds = allNeeds[config.userIdx] || [];

  var userOffPlayers = userTeam.players.filter(function (p) {
    return ["QB", "RB", "WR", "TE"].indexOf(p.pos) >= 0 && (p.tradeVal || 0) >= 500;
  });
  // IDP players as secondary balancing assets (not modeled in needs)
  var userIdpPlayers = userTeam.players.filter(function (p) {
    return ["DL", "LB", "DB"].indexOf(p.pos) >= 0 && (p.tradeVal || 0) >= 500;
  }).sort(function (a, b) { return (b.tradeVal || 0) - (a.tradeVal || 0); }).slice(0, 3);
  var userPicks = userTeam.players.filter(function (p) {
    return p.pos === "PICK" && (p.est || p.tradeVal || 0) >= 300;
  }).sort(function (a, b) { return (b.est || b.tradeVal || 0) - (a.est || a.tradeVal || 0); }).slice(0, 3);

  var all: TFCandidate[] = [];
  var seen: Record<string, boolean> = {};
  function gv(p: TFPlayerInput) { return p.pos === "PICK" ? (p.est || p.tradeVal || 0) : (p.tradeVal || 0); }

  config.teams.forEach(function (partner) {
    if (partner.idx === config.userIdx) return;
    if (config.partnerIdx != null && partner.idx !== config.partnerIdx) return;
    var pOffP = partner.players.filter(function (p) { return ["QB", "RB", "WR", "TE"].indexOf(p.pos) >= 0; });
    if (pOffP.length === 0) return;
    var pNeeds = allNeeds[partner.idx] || [];
    var compScore = computePartnerScore(userNeeds, pNeeds);
    // Partner picks available for user to receive
    var pPicks = partner.players.filter(function (p) {
      return p.pos === "PICK" && (p.est || p.tradeVal || 0) >= 300;
    }).sort(function (a, b) { return (b.est || b.tradeVal || 0) - (a.est || a.tradeVal || 0); }).slice(0, 3);
    // Partner IDP as receivable secondary balancing assets (symmetric with user IDP sends)
    var pIdpPlayers = partner.players.filter(function (p) {
      return ["DL", "LB", "DB"].indexOf(p.pos) >= 0 && (p.tradeVal || 0) >= 500;
    }).sort(function (a, b) { return (b.tradeVal || 0) - (a.tradeVal || 0); }).slice(0, 3);

    // Identify targets
    var tgts: TFPlayerInput[];
    if (config.targetPlayerName) {
      var tp = partner.players.find(function (p) { return p.name === config.targetPlayerName; });
      tgts = tp ? [tp] : [];
    } else {
      tgts = pOffP.filter(function (p) {
        if ((p.tradeVal || 0) < 500) return false;
        if (config.posFilter && config.posFilter !== "ALL" && p.pos !== config.posFilter) return false;
        var un = userNeeds.find(function (nd) { return nd.pos === p.pos; });
        return un && un.isNeed;
      }).sort(function (a, b) { return (b.tradeVal || 0) - (a.tradeVal || 0); }).slice(0, TF_MAX_TARGETS);
      if (tgts.length < TF_MAX_TARGETS) {
        var ex = pOffP.filter(function (p) {
          if ((p.tradeVal || 0) < 2000) return false;
          if (tgts.some(function (t) { return t.name === p.name; })) return false;
          if (config.posFilter && config.posFilter !== "ALL" && p.pos !== config.posFilter) return false;
          var pn2 = pNeeds.find(function (nd) { return nd.pos === p.pos; });
          return pn2 && pn2.isSurplus;
        }).sort(function (a, b) { return (b.tradeVal || 0) - (a.tradeVal || 0); }).slice(0, TF_MAX_TARGETS - tgts.length);
        tgts = tgts.concat(ex);
      }
    }
    if (tgts.length === 0) return;

    // Sort user assets by trade desirability for this partner
    var uAsts = userOffPlayers.slice().sort(function (a, b) {
      var aS = 0, bS = 0;
      var aN = userNeeds.find(function (nd) { return nd.pos === a.pos; });
      var bN = userNeeds.find(function (nd) { return nd.pos === b.pos; });
      var aPN = pNeeds.find(function (nd) { return nd.pos === a.pos; });
      var bPN = pNeeds.find(function (nd) { return nd.pos === b.pos; });
      if (aN && aN.isSurplus) aS += 3; if (bN && bN.isSurplus) bS += 3;
      if (aPN && aPN.isNeed) aS += 3; if (bPN && bPN.isNeed) bS += 3;
      if (aN && aN.isNeed) aS -= 2; if (bN && bN.isNeed) bS -= 2;
      if (aS !== bS) return bS - aS;
      return (b.tradeVal || 0) - (a.tradeVal || 0);
    }).slice(0, TF_MAX_ASSETS);

    function tryPkg(sends: TFPlayerInput[], receives: TFPlayerInput[]) {
      var ns: Record<string, boolean> = {}; var dup = false;
      sends.concat(receives).forEach(function (p) { if (ns[p.name]) dup = true; ns[p.name] = true; });
      if (dup) return;
      var uV = sends.reduce(function (s, p) { return s + gv(p); }, 0);
      var pV = receives.reduce(function (s, p) { return s + gv(p); }, 0);
      if (uV === 0 || pV === 0) return;
      var mx = Math.max(uV, pV); var pct = Math.abs(uV - pV) / mx * 100;
      if (pct > TF_FAIRNESS_THRESHOLD) return;
      var sN = sends.map(function (p) { return p.name; }).sort().join("+");
      var rN = receives.map(function (p) { return p.name; }).sort().join("+");
      var key = sN + "\u2194" + rN;
      if (seen[key]) return; seen[key] = true;
      // Bidirectional fit
      var uFit = 0, pFit = 0;
      ["QB", "RB", "WR", "TE"].forEach(function (pos) {
        var sV = sends.filter(function (p) { return p.pos === pos; }).reduce(function (s, p) { return s + gv(p); }, 0);
        var rV = receives.filter(function (p) { return p.pos === pos; }).reduce(function (s, p) { return s + gv(p); }, 0);
        if (sV === 0 && rV === 0) return;
        var un = userNeeds.find(function (nd) { return nd.pos === pos; });
        var pn2 = pNeeds.find(function (nd) { return nd.pos === pos; });
        if (un && un.isNeed && rV > sV) uFit += 3;
        else if (un && un.isSurplus && sV > rV) uFit += 1;
        else if (un && un.isNeed && sV > rV) uFit -= 2;
        if (pn2 && pn2.isNeed && sV > rV) pFit += 3;
        else if (pn2 && pn2.isSurplus && rV > sV) pFit += 1;
        else if (pn2 && pn2.isNeed && rV > sV) pFit -= 2;
      });
      var simp = Math.max(0, 4 - (sends.length + receives.length - 2));
      var fBonus = Math.max(0, (TF_FAIRNESS_THRESHOLD - pct) / TF_FAIRNESS_THRESHOLD * 3);
      var sc2 = uFit + pFit * 0.6 + compScore * 0.5 + simp * 0.4 + fBonus;
      // Cap fit label at "Possible Fit" if partner roster worsens
      var fl = pFit < 0 ? "Possible Fit" : sc2 >= 5 ? "Strong Fit" : sc2 >= 2 ? "Good Fit" : "Possible Fit";
      // Canonical fairness label aligned with Trade Analyzer (8% threshold)
      var fLabel = pct < 8 ? "Fair" : uV > pV ? "Value favors you" : "Value favors partner";
      all.push({ partnerIdx: partner.idx, partnerName: partner.name, userSends: sends, userReceives: receives, userVal: uV, partnerVal: pV, fairnessPct: pct, score: sc2, fitLabel: fl, fairnessLabel: fLabel, key: key });
    }

    // 1-for-1
    tgts.forEach(function (tg) {
      uAsts.forEach(function (a) { tryPkg([a], [tg]); });
      userPicks.forEach(function (pk) { tryPkg([pk], [tg]); });
    });
    // 2-for-1
    tgts.forEach(function (tg) {
      for (var i = 0; i < Math.min(uAsts.length, 4); i++) {
        for (var j = i + 1; j < Math.min(uAsts.length, 5); j++) { tryPkg([uAsts[i], uAsts[j]], [tg]); }
        userPicks.forEach(function (pk) { tryPkg([uAsts[i], pk], [tg]); });
        // IDP + offensive player for target
        userIdpPlayers.forEach(function (idp) { tryPkg([uAsts[i], idp], [tg]); });
      }
    });
    // Player for player + partner pick
    tgts.forEach(function (tg) {
      pPicks.forEach(function (ppk) {
        uAsts.forEach(function (a) { tryPkg([a], [tg, ppk]); });
      });
    });
    // 1-for-2
    for (var ti = 0; ti < Math.min(tgts.length, 3); ti++) {
      for (var tj = ti + 1; tj < Math.min(tgts.length, 4); tj++) {
        var t1 = tgts[ti], t2 = tgts[tj];
        uAsts.forEach(function (a) { tryPkg([a], [t1, t2]); });
      }
    }
    // 2-for-2 (limited)
    for (var ti2 = 0; ti2 < Math.min(tgts.length, 3); ti2++) {
      for (var tj2 = ti2 + 1; tj2 < Math.min(tgts.length, 3); tj2++) {
        for (var ai = 0; ai < Math.min(uAsts.length, 3); ai++) {
          for (var aj = ai + 1; aj < Math.min(uAsts.length, 3); aj++) {
            tryPkg([uAsts[ai], uAsts[aj]], [tgts[ti2], tgts[tj2]]);
          }
        }
      }
    }
    // Player + player for player + partner pick
    tgts.forEach(function (tg) {
      pPicks.forEach(function (ppk) {
        for (var pi = 0; pi < Math.min(uAsts.length, 3); pi++) {
          for (var pj = pi + 1; pj < Math.min(uAsts.length, 3); pj++) {
            tryPkg([uAsts[pi], uAsts[pj]], [tg, ppk]);
          }
        }
      });
    });
    // Player for player + partner IDP (symmetric with user IDP sends)
    tgts.forEach(function (tg) {
      pIdpPlayers.forEach(function (pidp) {
        uAsts.forEach(function (a) { tryPkg([a], [tg, pidp]); });
      });
    });
    // Player + player for player + partner IDP
    tgts.forEach(function (tg) {
      pIdpPlayers.forEach(function (pidp) {
        for (var pi2 = 0; pi2 < Math.min(uAsts.length, 3); pi2++) {
          for (var pj2 = pi2 + 1; pj2 < Math.min(uAsts.length, 3); pj2++) {
            tryPkg([uAsts[pi2], uAsts[pj2]], [tg, pidp]);
          }
        }
      });
    });
  });

  all.sort(function (a, b) { return b.score - a.score || a.fairnessPct - b.fairnessPct || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0); });
  return all.slice(0, TF_MAX_CANDIDATES);
}

export function computeOptimalLineupFromSlots(
  plrs: Array<{ pos: string; name: string; tradeVal?: number }>,
  ss: { QB: number; RB: number; WR: number; TE: number; FLEX: number; SUPER_FLEX: number },
): { starterVal: number; benchVal: number } {
  var used: Record<string, boolean> = {};
  var starters: Array<{ pos: string; name: string; tradeVal?: number }> = [];
  function fill(pos: string, ct: number) {
    var e = plrs.filter(function (p) { return p.pos === pos && !used[p.name]; }).sort(function (a, b) { return (b.tradeVal || 0) - (a.tradeVal || 0); });
    for (var j = 0; j < ct && j < e.length; j++) { starters.push(e[j]); used[e[j].name] = true; }
  }
  fill("QB", ss.QB); fill("RB", ss.RB); fill("WR", ss.WR); fill("TE", ss.TE);
  var fl = plrs.filter(function (p) { return ["RB", "WR", "TE"].indexOf(p.pos) >= 0 && !used[p.name]; }).sort(function (a, b) { return (b.tradeVal || 0) - (a.tradeVal || 0); });
  for (var j = 0; j < ss.FLEX && j < fl.length; j++) { starters.push(fl[j]); used[fl[j].name] = true; }
  var sf = plrs.filter(function (p) { return ["QB", "RB", "WR", "TE"].indexOf(p.pos) >= 0 && !used[p.name]; }).sort(function (a, b) { return (b.tradeVal || 0) - (a.tradeVal || 0); });
  for (var j = 0; j < ss.SUPER_FLEX && j < sf.length; j++) { starters.push(sf[j]); used[sf[j].name] = true; }
  var bench = plrs.filter(function (p) { return !used[p.name]; });
  return {
    starterVal: starters.reduce(function (s, p) { return s + (p.tradeVal || 0); }, 0),
    benchVal: bench.reduce(function (s, p) { return s + (p.tradeVal || 0); }, 0),
  };
}

// ── FDP Value History Constants ──────────────────────────────

/** Page size for paginated ALL history fetch. */
export var HISTORY_PAGE_SIZE = 500;

// ── FDP Value History Logic ──────────────────────────────────

export interface ValuationFactors {
  /** Schema version for forward compatibility */
  v: number;
  /**
   * Which canonical calculation path determined the final FDP Value.
   *
   * Dynasty paths:
   *   'ktc'          — ktcVal present; result = round(ktcVal * ageBonus * modifiers)
   *   'rank_decay'   — no ktcVal; result = round(pkCurve(posRank) * ageBonus * modifiers)
   *   'proj_floor'   — no ktcVal, non-QB; projection floor exceeded rank curve
   *
   * Redraft paths:
   *   'vbd'          — baseTV (from VBD) dominated rank-decay floor
   *   'rank_floor'   — rank-decay floor dominated baseTV
   */
  path: string;
  /** Raw fantasy points projection used (sKey-based, before dynasty/TEP boosts) */
  projection: number;
  /** Positional baseline subtracted for VBD */
  positional_baseline: number;
  /** Value before 9,999 display cap */
  raw_value: number;
  /** Player age at snapshot time */
  age: number;
  /** Positional rank from VBD sort */
  pos_rank: number;
  /** Market value input — dynasty only, when present */
  ktc_value?: number;
  /** Dynasty age bonus multiplier — dynasty only */
  dynasty_bonus?: number;
}

export interface FdpSnapshot {
  id?: number;  // bigint identity — stable cursor key for keyset pagination
  player_slug: string;
  player_name: string;
  value: number;
  values_version: string;
  effective_at: string;
  recorded_at: string;
  valuation_factors?: ValuationFactors | null;
}

export interface FdpValueChange {
  current: number;
  prior: number | null;
  delta: number | null;
  pctChange: number | null;
  priorDate: string | null;
}

/**
 * Compute value change between latest snapshot and the most recent snapshot
 * at or before `daysAgo` days from the latest.
 * Returns null fields if no qualifying prior snapshot exists.
 */
export function computeValueChange(
  snapshots: FdpSnapshot[],
  daysAgo: number,
): FdpValueChange {
  if (snapshots.length === 0) return { current: 0, prior: null, delta: null, pctChange: null, priorDate: null };
  // snapshots should be sorted newest-first by effective_at
  var latest = snapshots[0];
  if (snapshots.length < 2) return { current: latest.value, prior: null, delta: null, pctChange: null, priorDate: null };
  var latestDate = latest.effective_at || latest.recorded_at;
  var cutoff = new Date(latestDate);
  cutoff.setDate(cutoff.getDate() - daysAgo);
  var cutoffMs = cutoff.getTime();
  // Find most recent snapshot at or before cutoff
  var prior: FdpSnapshot | null = null;
  for (var i = 1; i < snapshots.length; i++) {
    var snapDate = snapshots[i].effective_at || snapshots[i].recorded_at;
    if (new Date(snapDate).getTime() <= cutoffMs) {
      prior = snapshots[i];
      break;
    }
  }
  if (!prior) return { current: latest.value, prior: null, delta: null, pctChange: null, priorDate: null };
  var d = latest.value - prior.value;
  // pctChange is null when prior is 0 (undefined denominator), except 0→0 which is 0%
  var pct: number | null = prior.value === 0 ? (d === 0 ? 0 : null) : Math.round((d / prior.value) * 1000) / 10;
  return { current: latest.value, prior: prior.value, delta: d, pctChange: pct, priorDate: prior.effective_at || prior.recorded_at };
}

/**
 * Build context key for snapshot queries.
 */
export function snapshotContextKey(opts: {
  leagueType: string; scoring: string; superflex: boolean; tePremium: number; idp: boolean;
}): string {
  return opts.leagueType + ":" + opts.scoring + ":" + (opts.superflex ? "SF" : "1QB") + ":TEP" + opts.tePremium + ":" + (opts.idp ? "IDP" : "STD");
}

/** Canonical TEP levels selectable in the app. */
export var TEP_LEVELS = [0, 0.25, 0.5, 1.0] as const;

/**
 * Supported FDP snapshot contexts.
 *
 * Dynasty: scoring is ALWAYS "PPR" (sKey hardcoded in app — line 3146).
 *   Format controls do not change dynasty trade values.
 *   TEP is binary for dynasty: computeDynastyTradeVal uses threshold (tePremium > 0 → 1.15×).
 *   Stored as numeric 0 or 1.0 for consistency.
 *   1QB/SF × TEP{0,1.0} = 4 dynasty contexts.
 *
 * Redraft: PPR/Half/Standard × 1QB/SF × TEP{0,0.25,0.5,1.0} = 24 contexts.
 *   Each TEP level produces different canonical Redraft values through VBD projection boosts.
 *   No approximate history — each level gets its own historical series.
 *
 * IDP: not separately snapshotted (niche feature, low user volume).
 *   Player page shows explicit "not tracked" message when IDP mode enabled.
 *
 * Total: 4 dynasty + 24 redraft = 28 contexts.
 */
export var FDP_SNAPSHOT_CONTEXTS: Array<{
  leagueType: string; scoring: string; superflex: boolean; tePremium: number; idp: boolean;
}> = [
  // Dynasty (sKey always "PPR" — format control is irrelevant for dynasty values)
  // TEP is binary: 0 or 1.0 (any tePremium > 0 → 1.15× TE boost in computeDynastyTradeVal)
  { leagueType: "dynasty", scoring: "PPR", superflex: false, tePremium: 0, idp: false },
  { leagueType: "dynasty", scoring: "PPR", superflex: true, tePremium: 0, idp: false },
  { leagueType: "dynasty", scoring: "PPR", superflex: false, tePremium: 1.0, idp: false },
  { leagueType: "dynasty", scoring: "PPR", superflex: true, tePremium: 1.0, idp: false },
  // Redraft: PPR × 1QB/SF × TEP{0,0.25,0.5,1.0}
  { leagueType: "redraft", scoring: "PPR", superflex: false, tePremium: 0, idp: false },
  { leagueType: "redraft", scoring: "PPR", superflex: true, tePremium: 0, idp: false },
  { leagueType: "redraft", scoring: "PPR", superflex: false, tePremium: 0.25, idp: false },
  { leagueType: "redraft", scoring: "PPR", superflex: true, tePremium: 0.25, idp: false },
  { leagueType: "redraft", scoring: "PPR", superflex: false, tePremium: 0.5, idp: false },
  { leagueType: "redraft", scoring: "PPR", superflex: true, tePremium: 0.5, idp: false },
  { leagueType: "redraft", scoring: "PPR", superflex: false, tePremium: 1.0, idp: false },
  { leagueType: "redraft", scoring: "PPR", superflex: true, tePremium: 1.0, idp: false },
  // Redraft: Half × 1QB/SF × TEP{0,0.25,0.5,1.0}
  { leagueType: "redraft", scoring: "Half", superflex: false, tePremium: 0, idp: false },
  { leagueType: "redraft", scoring: "Half", superflex: true, tePremium: 0, idp: false },
  { leagueType: "redraft", scoring: "Half", superflex: false, tePremium: 0.25, idp: false },
  { leagueType: "redraft", scoring: "Half", superflex: true, tePremium: 0.25, idp: false },
  { leagueType: "redraft", scoring: "Half", superflex: false, tePremium: 0.5, idp: false },
  { leagueType: "redraft", scoring: "Half", superflex: true, tePremium: 0.5, idp: false },
  { leagueType: "redraft", scoring: "Half", superflex: false, tePremium: 1.0, idp: false },
  { leagueType: "redraft", scoring: "Half", superflex: true, tePremium: 1.0, idp: false },
  // Redraft: Standard × 1QB/SF × TEP{0,0.25,0.5,1.0}
  { leagueType: "redraft", scoring: "Standard", superflex: false, tePremium: 0, idp: false },
  { leagueType: "redraft", scoring: "Standard", superflex: true, tePremium: 0, idp: false },
  { leagueType: "redraft", scoring: "Standard", superflex: false, tePremium: 0.25, idp: false },
  { leagueType: "redraft", scoring: "Standard", superflex: true, tePremium: 0.25, idp: false },
  { leagueType: "redraft", scoring: "Standard", superflex: false, tePremium: 0.5, idp: false },
  { leagueType: "redraft", scoring: "Standard", superflex: true, tePremium: 0.5, idp: false },
  { leagueType: "redraft", scoring: "Standard", superflex: false, tePremium: 1.0, idp: false },
  { leagueType: "redraft", scoring: "Standard", superflex: true, tePremium: 1.0, idp: false },
];

/** Parse VALUES_VERSION "YYYY-MM-DD.N" into date and revision. Returns null if malformed or invalid calendar date. */
export function parseValuesVersion(v: string): { date: string; revision: number } | null {
  var m = v.match(/^(\d{4}-\d{2}-\d{2})\.(\d+)$/);
  if (!m) return null;
  // Validate calendar date: reject impossible dates like 2026-13-40 or 2026-02-30
  var parts = m[1].split("-");
  var y = parseInt(parts[0], 10), mo = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
  var dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return { date: m[1], revision: parseInt(m[2], 10) };
}

/**
 * Normalize a user's live format context into the canonical snapshot context.
 *
 * Dynasty: scoring always "PPR"; TEP normalized to 0 or 1.0 (binary threshold).
 * Redraft: exact TEP level preserved (0, 0.25, 0.5, 1.0).
 * IDP: passed through (will be rejected by isSnapshotContextSupported).
 */
export function normalizeSnapshotContext(opts: {
  isDynasty: boolean; scoring: string; superflex: boolean; tePremium: number; idp: boolean;
}): { leagueType: string; scoring: string; superflex: boolean; tePremium: number; idp: boolean } {
  if (opts.isDynasty) {
    // Dynasty: sKey hardcoded to PPR, TEP is binary (any > 0 → 1.0)
    return {
      leagueType: "dynasty", scoring: "PPR", superflex: opts.superflex,
      tePremium: opts.tePremium > 0 ? 1.0 : 0, idp: opts.idp,
    };
  }
  // Redraft: exact TEP level preserved
  return {
    leagueType: "redraft", scoring: opts.scoring, superflex: opts.superflex,
    tePremium: opts.tePremium, idp: opts.idp,
  };
}

/** Check if a snapshot context is in the supported matrix. */
export function isSnapshotContextSupported(ctx: {
  leagueType: string; scoring: string; superflex: boolean; tePremium: number; idp: boolean;
}): boolean {
  for (var i = 0; i < FDP_SNAPSHOT_CONTEXTS.length; i++) {
    var c = FDP_SNAPSHOT_CONTEXTS[i];
    if (c.leagueType === ctx.leagueType && c.scoring === ctx.scoring
      && c.superflex === ctx.superflex && c.tePremium === ctx.tePremium
      && c.idp === ctx.idp) return true;
  }
  return false;
}

// ── Value Movement Explanation ──────────────────────────────

// Materiality thresholds — minimum meaningful change to surface as a signal.
// Suppresses noise from tiny floating-point differences or insignificant shifts.
export var SIGNAL_MATERIALITY = {
  projection: 2.0,        // fantasy points
  ktc_value: 50,           // market-value integer units
  dynasty_bonus: 0.005,    // multiplier delta
  positional_baseline: 2.0, // fantasy points
};

export interface ValueChangeSignal {
  type: string;  // projection_change | market_input_change | age_curve_change | baseline_change | rank_change | cap_effect
  label: string;
  previousValue: number | null;
  currentValue: number | null;
  delta: number | null;
  /** 'contributing' = proven to participate in calculation path; 'recorded_context' = recorded change not proven to drive value; 'display' = display-layer effect */
  classification: 'contributing' | 'recorded_context' | 'display';
}

export interface ValueChangeExplanation {
  direction: 'increased' | 'decreased' | 'unchanged';
  delta: number;
  percentChange: number | null;
  signals: ValueChangeSignal[];
  /** 'detailed' = both snapshots have factors; 'partial' = only one does; 'value_only' = neither; 'first_snapshot' = no prior */
  factorAvailability: 'detailed' | 'partial' | 'value_only' | 'first_snapshot';
}

/**
 * Find the two snapshots used for a range comparison.
 * Returns the latest snapshot and the most recent snapshot at or before daysAgo from the latest.
 * Snapshots must be sorted newest-first by effective_at.
 */
export function findComparisonSnapshots(
  snapshots: FdpSnapshot[],
  daysAgo: number,
): { current: FdpSnapshot; prior: FdpSnapshot | null } | null {
  if (snapshots.length === 0) return null;
  var latest = snapshots[0];
  if (snapshots.length < 2) return { current: latest, prior: null };
  var cutoff = new Date(latest.effective_at || latest.recorded_at);
  cutoff.setDate(cutoff.getDate() - daysAgo);
  var cutoffMs = cutoff.getTime();
  for (var i = 1; i < snapshots.length; i++) {
    var snapDate = snapshots[i].effective_at || snapshots[i].recorded_at;
    if (new Date(snapDate).getTime() <= cutoffMs) {
      return { current: latest, prior: snapshots[i] };
    }
  }
  return { current: latest, prior: null };
}

/**
 * Determine whether a factor is a contributing model change for a given valuation path.
 *
 * Dynasty paths:
 *   'ktc'        — ktcVal * ageBonus * modifiers → ktc_value and dynasty_bonus are contributing
 *   'rank_decay' — pkCurve(posRank) * ageBonus * modifiers → pos_rank and dynasty_bonus are contributing
 *   'proj_floor' — projSKey floor exceeded rank curve → projection, pos_rank, dynasty_bonus are contributing
 *
 * Redraft paths:
 *   'vbd'        — baseTV dominates → projection and positional_baseline are contributing (they produce baseTV)
 *   'rank_floor' — rank floor dominates → pos_rank is contributing
 */
var PATH_CONTRIBUTING_FACTORS: Record<string, string[]> = {
  ktc: ['ktc_value', 'dynasty_bonus'],
  rank_decay: ['pos_rank', 'dynasty_bonus'],
  proj_floor: ['projection', 'pos_rank', 'dynasty_bonus'],
  vbd: ['projection', 'positional_baseline'],
  rank_floor: ['pos_rank'],
};

/**
 * Deterministic explanation of why FDP Value changed between two snapshots.
 *
 * Returns ONLY factual, computable signals derived from recorded valuation factors.
 * Never fabricates causality — only reports structured model inputs.
 *
 * Signal classification is PATH-AWARE:
 *   'contributing'      — factor proven to participate in the current snapshot's calculation path
 *   'recorded_context'  — factor changed but did not participate in the active calculation path
 *   'display'           — display-layer effect (e.g. 9,999 cap)
 */
export function explainValueMovement(
  previous: FdpSnapshot | null,
  current: FdpSnapshot,
): ValueChangeExplanation {
  var noDelta = current.value - current.value; // structural zero, not a hardcoded historical value
  if (!previous) {
    return { direction: 'unchanged', delta: noDelta, percentChange: null, signals: [], factorAvailability: 'first_snapshot' };
  }

  var delta = current.value - previous.value;
  var direction: 'increased' | 'decreased' | 'unchanged' = delta > 0 ? 'increased' : delta < 0 ? 'decreased' : 'unchanged';
  var pct: number | null = previous.value === 0 ? (delta === 0 ? 0 : null) : Math.round((delta / previous.value) * 1000) / 10;

  var pf = previous.valuation_factors;
  var cf = current.valuation_factors;

  // Neither snapshot has factor data
  if (!pf && !cf) {
    return { direction, delta, percentChange: pct, signals: [], factorAvailability: 'value_only' };
  }
  // Only one snapshot has factor data
  if (!pf || !cf) {
    return { direction, delta, percentChange: pct, signals: [], factorAvailability: 'partial' };
  }

  // Both have factor data — path-aware deterministic comparison
  var signals: ValueChangeSignal[] = [];
  var currContributing = PATH_CONTRIBUTING_FACTORS[cf.path] || [];
  var prevContributing = PATH_CONTRIBUTING_FACTORS[pf.path] || [];

  function isContributing(factor: string): boolean {
    return currContributing.indexOf(factor) >= 0 || prevContributing.indexOf(factor) >= 0;
  }

  // 1. Market-value input change
  var prevKtc = pf.ktc_value ?? null;
  var currKtc = cf.ktc_value ?? null;
  if (prevKtc !== null && currKtc !== null) {
    var ktcDelta = currKtc - prevKtc;
    if (Math.abs(ktcDelta) >= SIGNAL_MATERIALITY.ktc_value) {
      signals.push({ type: 'market_input_change', label: 'Market-value input', previousValue: prevKtc, currentValue: currKtc, delta: ktcDelta, classification: isContributing('ktc_value') ? 'contributing' : 'recorded_context' });
    }
  } else if (prevKtc !== currKtc) {
    signals.push({ type: 'market_input_change', label: 'Market-value input', previousValue: prevKtc, currentValue: currKtc, delta: null, classification: isContributing('ktc_value') ? 'contributing' : 'recorded_context' });
  }

  // 2. Projection change
  var projDelta = cf.projection - pf.projection;
  if (Math.abs(projDelta) >= SIGNAL_MATERIALITY.projection) {
    signals.push({ type: 'projection_change', label: 'Projection', previousValue: +pf.projection.toFixed(1), currentValue: +cf.projection.toFixed(1), delta: +projDelta.toFixed(1), classification: isContributing('projection') ? 'contributing' : 'recorded_context' });
  }

  // 3. Age curve change (dynasty — dynastyBonus multiplier)
  if (cf.dynasty_bonus !== undefined && pf.dynasty_bonus !== undefined) {
    var abDelta = cf.dynasty_bonus - pf.dynasty_bonus;
    if (Math.abs(abDelta) >= SIGNAL_MATERIALITY.dynasty_bonus) {
      signals.push({ type: 'age_curve_change', label: 'Age adjustment', previousValue: +pf.dynasty_bonus.toFixed(3), currentValue: +cf.dynasty_bonus.toFixed(3), delta: +abDelta.toFixed(3), classification: isContributing('dynasty_bonus') ? 'contributing' : 'recorded_context' });
    }
  }

  // 4. Positional baseline change
  var blDelta = cf.positional_baseline - pf.positional_baseline;
  if (Math.abs(blDelta) >= SIGNAL_MATERIALITY.positional_baseline) {
    signals.push({ type: 'baseline_change', label: 'Positional baseline', previousValue: +pf.positional_baseline.toFixed(1), currentValue: +cf.positional_baseline.toFixed(1), delta: +blDelta.toFixed(1), classification: isContributing('positional_baseline') ? 'contributing' : 'recorded_context' });
  }

  // 5. Positional rank change — classification depends on valuation path
  var rankDelta = cf.pos_rank - pf.pos_rank;
  if (rankDelta !== 0) {
    signals.push({ type: 'rank_change', label: 'Positional rank', previousValue: pf.pos_rank, currentValue: cf.pos_rank, delta: rankDelta, classification: isContributing('pos_rank') ? 'contributing' : 'recorded_context' });
  }

  // 6. Display cap effect
  var currCapped = current.value === 9999 && cf.raw_value > 9999;
  var prevCapped = previous.value === 9999 && pf.raw_value > 9999;
  if (currCapped || prevCapped) {
    signals.push({ type: 'cap_effect', label: 'Display cap (9,999)', previousValue: prevCapped ? pf.raw_value : previous.value, currentValue: currCapped ? cf.raw_value : current.value, delta: cf.raw_value - pf.raw_value, classification: 'display' });
  }

  return { direction, delta, percentChange: pct, signals, factorAvailability: 'detailed' };
}

// ── Data Freshness Helpers ──────────────────────────────────

/**
 * Format a YYYY-MM-DD calendar date for display without timezone rollover.
 * Parses as local-date parts, not as UTC ISO string.
 * Example: "2026-09-19" → "Sep 19, 2026"
 */
export function formatCalendarDate(dateStr: string): string {
  var parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10) - 1;
  var d = parseInt(parts[2], 10);
  var dt = new Date(y, m, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return dateStr;
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[m] + " " + d + ", " + y;
}

/**
 * Format an ISO timestamp for user display.
 * Example: "2026-09-22T20:32:00Z" → "Sep 22 at 8:32 PM" (browser locale)
 */
export function formatFetchTimestamp(isoStr: string): string {
  if (!isoStr) return "";
  var dt = new Date(isoStr);
  if (isNaN(dt.getTime())) return "";
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var h = dt.getHours();
  var ampm = h >= 12 ? "PM" : "AM";
  var h12 = h % 12 || 12;
  var min = dt.getMinutes().toString().padStart(2, "0");
  return months[dt.getMonth()] + " " + dt.getDate() + " at " + h12 + ":" + min + " " + ampm;
}

/**
 * Compute relative time string from an ISO timestamp.
 * Returns null if timestamp is invalid or missing.
 * Example: "3 min ago", "2 hr ago", "1 day ago"
 */
export function formatRelativeTime(isoStr: string, nowMs?: number): string | null {
  if (!isoStr) return null;
  var dt = new Date(isoStr);
  if (isNaN(dt.getTime())) return null;
  var now = nowMs ?? Date.now();
  var diffSec = Math.floor((now - dt.getTime()) / 1000);
  if (diffSec < 0) return "just now";
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return Math.floor(diffSec / 60) + " min ago";
  if (diffSec < 86400) return Math.floor(diffSec / 3600) + " hr ago";
  return Math.floor(diffSec / 86400) + " day ago";
}

/**
 * Normalized provider identifiers for freshness storage.
 * Use these stable lowercase keys — never raw display labels.
 */
export type FreshnessProvider = 'sleeper' | 'espn' | 'manual';

/**
 * Derive normalized provider from a league_id string.
 * ESPN league IDs are prefixed "espn_", manual is "manual", everything else is Sleeper.
 */
export function deriveProvider(leagueId: string): FreshnessProvider {
  if (leagueId === "manual") return "manual";
  if (leagueId.startsWith("espn_")) return "espn";
  return "sleeper";
}

/**
 * LocalStorage key for league fetch timestamp, scoped to account+provider+leagueId.
 * accountId should be the stable Supabase user UUID, or "anon" for logged-out users.
 * Always includes normalized provider prefix to prevent cross-provider collision.
 */
export function leagueFetchedAtKey(accountId: string, provider: FreshnessProvider, leagueId: string): string {
  return "fdp_lfetch_" + (accountId || "anon") + "*" + provider + "*" + leagueId;
}

/**
 * User-facing label for how roster data was obtained.
 * Sleeper/ESPN: "fetched" (external API). Manual: "imported" (user-entered).
 */
export function freshnessFetchVerb(provider: FreshnessProvider): string {
  return provider === "manual" ? "imported" : "fetched";
}

// ── Game Intelligence Helpers ───────────────────────────────

/**
 * NFL team full name → FDP abbreviation mapping.
 * Matches the provider (The Odds API) team naming convention.
 * All 32 NFL teams represented.
 */
export const NFL_TEAM_MAP: { [fullName: string]: string } = {
  "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL",
  "Buffalo Bills": "BUF", "Carolina Panthers": "CAR", "Chicago Bears": "CHI",
  "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE", "Dallas Cowboys": "DAL",
  "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB",
  "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX",
  "Kansas City Chiefs": "KC", "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC",
  "Los Angeles Rams": "LAR", "Miami Dolphins": "MIA", "Minnesota Vikings": "MIN",
  "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG",
  "New York Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT",
  "San Francisco 49ers": "SF", "Seattle Seahawks": "SEA", "Tampa Bay Buccaneers": "TB",
  "Tennessee Titans": "TEN", "Washington Commanders": "WAS",
};

/** Reverse map: FDP abbreviation → full team name. */
export const NFL_ABBREV_TO_FULL: { [abbrev: string]: string } = Object.fromEntries(
  Object.entries(NFL_TEAM_MAP).map(([full, abbrev]) => [abbrev, full])
);

/**
 * Compute a team's implied scoring total from their spread and the game total.
 * Formula: implied = (gameTotal - teamSpread) / 2
 *   spread negative = favored → higher implied total
 *   spread positive = underdog → lower implied total
 * Returns null if inputs are missing or invalid.
 */
export function computeImpliedTotal(teamSpread: number | null, gameTotal: number | null): number | null {
  // Return null if either spread or total is missing/invalid
  if (teamSpread === null || gameTotal === null || !isFinite(teamSpread) || !isFinite(gameTotal) || gameTotal <= 0) return null;
  var result = (gameTotal - teamSpread) / 2;
  return Math.round(result * 10) / 10; // one decimal
}

/**
 * Compute the median of a numeric array. Used for multi-bookmaker consensus lines.
 * Returns null for empty arrays.
 */
export function medianLine(values: number[]): number | null {
  if (values.length === 0) return null;
  var sorted = values.slice().sort(function(a, b) { return a - b; });
  var mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Game environment classification based on a team's implied total
 * relative to the current slate of games.
 *
 * Algorithm: percentile rank within slate implied totals.
 *   >= 75th percentile → HIGH
 *   >= 50th → ABOVE_AVG
 *   >= 25th → AVERAGE
 *   >= 10th → BELOW_AVG
 *   < 10th → LOW
 */
export type GameEnvironment = 'HIGH' | 'ABOVE_AVG' | 'AVERAGE' | 'BELOW_AVG' | 'LOW';

export function classifyGameEnvironment(teamImplied: number, slateImpliedTotals: number[]): GameEnvironment {
  if (slateImpliedTotals.length === 0) return 'AVERAGE';
  var below = 0;
  for (var i = 0; i < slateImpliedTotals.length; i++) {
    if (slateImpliedTotals[i] < teamImplied) below++;
  }
  var pct = below / slateImpliedTotals.length;
  if (pct >= 0.75) return 'HIGH';
  if (pct >= 0.50) return 'ABOVE_AVG';
  if (pct >= 0.25) return 'AVERAGE';
  if (pct >= 0.10) return 'BELOW_AVG';
  return 'LOW';
}

/** Human-readable label for game environment. */
export function gameEnvironmentLabel(env: GameEnvironment): string {
  switch (env) {
    case 'HIGH': return 'High scoring environment';
    case 'ABOVE_AVG': return 'Above-average scoring environment';
    case 'AVERAGE': return 'Average scoring environment';
    case 'BELOW_AVG': return 'Below-average scoring environment';
    case 'LOW': return 'Low scoring environment';
  }
}

/** Slate rank for a team's implied total (1 = highest). */
export function slateImpliedRank(teamImplied: number, slateImpliedTotals: number[]): number {
  var above = 0;
  for (var i = 0; i < slateImpliedTotals.length; i++) {
    if (slateImpliedTotals[i] > teamImplied) above++;
  }
  return above + 1;
}

/**
 * Event selection: choose the relevant current/upcoming NFL game for a team.
 *
 * Rules:
 * 1. Filter events for this team
 * 2. Require valid eventId + commenceTime
 * 3. Deduplicate by eventId (if multiple with same ID, keep first valid)
 * 4. Exclude events clearly in the past (>4 hours old relative to now)
 * 5. Prefer nearest upcoming event
 * 6. If no valid event exists, return null
 *
 * Deterministic: reordering provider events does not change the result.
 */
export function selectRelevantGameEvent(
  team: string,
  oddsData: { [teamAbb: string]: { opp: string; eventId?: string; commenceTime?: string } } | null,
  now?: number
): { eventId: string; commenceTime: string } | null {
  if (!oddsData || !oddsData[team]) return null;

  var g = oddsData[team];
  var eventId = g.eventId || '';
  var commenceTime = g.commenceTime || '';

  // Require both ID and time
  if (!eventId || !commenceTime) return null;

  try {
    var kickoff = new Date(commenceTime).getTime();
    // Reject malformed timestamps (getTime() returns NaN for invalid dates)
    if (!isFinite(kickoff)) return null;

    var currentTime = now || Date.now();
    var ageMs = currentTime - kickoff;

    // Exclude games >4 hours old (clearly past)
    if (ageMs > 4 * 60 * 60 * 1000) return null;

    return { eventId, commenceTime };
  } catch {
    return null;
  }
}
