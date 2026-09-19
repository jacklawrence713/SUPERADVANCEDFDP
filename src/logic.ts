// Extracted business logic from afdp.tsx for testability.
// These functions mirror the production code exactly — do NOT modify afdp.tsx.

export const PRIME: Record<string, [number, number]> = {
  QB: [26, 35], RB: [22, 27], WR: [23, 29], TE: [25, 30],
  K: [25, 38], DST: [0, 99], DL: [23, 30], LB: [23, 30], DB: [23, 29],
};

export const FREE_RANK_LIMIT = 20;
export const FREE_TRADE_LIMIT = 3;
export const VALUES_UPDATED_AT = "2026-09-19";

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

// Dynasty trade value computation — the ONE canonical implementation.
// Used by: afdp.tsx rankedPlayers, SEO page generator (vite.config.ts), tests.
export function computeDynastyTradeVal(
  pos: string, age: number, ktcVal: number | undefined,
  posRank: number, projSKey: number,
  opts: { isSF: boolean; sKey: string; tePremium: number; idpMode: boolean },
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
  if (ktcVal) {
    var rawVal = Math.round(ktcVal * ab * sfQbBoost * fmtAdj * tepAdj * idpAdj);
    return (opts.isSF && pos === "QB") ? rawVal : Math.min(9999, rawVal);
  }
  var rv = cfg.pk * Math.pow(cfg.dc, posRank - 1);
  var rankVal = Math.round(Math.max(100, (opts.isSF && pos === "QB") ? rv * ab : Math.min(9500, rv * ab)));
  var rawFloor = pos !== "QB" ? Math.round((projSKey || 0) * (isIDP ? 5 : 15) * ab) : 0;
  var formulaVal = pos !== "QB" ? Math.max(rankVal, Math.min(3500, rawFloor)) : rankVal;
  return Math.round(formulaVal * fmtAdj * tepAdj * idpAdj);
}

export function playerSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
