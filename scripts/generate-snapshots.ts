/**
 * FDP Value Snapshot Producer (Local/Admin)
 *
 * Generates canonical FDP Value snapshot payloads for all supported contexts.
 * ORCHESTRATOR ONLY — all canonical valuation logic is imported from src/logic.ts.
 * No separate valuation engine.
 *
 * Usage:
 *   npx tsx scripts/generate-snapshots.ts                   # DRY RUN (default)
 *   npx tsx scripts/generate-snapshots.ts --write           # POST to Edge Function
 *
 * DRY RUN: prints summary + sample players, writes JSON artifacts to scripts/output/
 * WRITE: requires FDP_SNAPSHOT_WRITE_SECRET and EDGE_URL env vars
 *
 * Does NOT contain service-role or write secrets in source.
 */

import { readFileSync } from "fs";
import { mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Import ALL canonical logic from src/logic.ts ──
import {
  PRIME,
  dynastyBonus,
  computeDynastyTradeVal,
  computeRedraftTradeVal,
  REDRAFT_TV_MULT,
  getBaselines,
  playerSlug,
  VALUES_VERSION,
  parseValuesVersion,
  FDP_SNAPSHOT_CONTEXTS,
  isSnapshotContextSupported,
} from "../src/logic";

const thisDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(thisDir, "..");

// Parse PLAYERS array from afdp.tsx
const afdpSrc = readFileSync(resolve(rootDir, "afdp.tsx"), "utf-8");
function parsePlayers(): Array<{ name: string; pos: string; age: number; team: string; ktcVal?: number; proj?: Record<string, number> }> {
  const marker = "const PLAYERS=[";
  const startIdx = afdpSrc.indexOf(marker);
  if (startIdx === -1) throw new Error("PLAYERS array not found in afdp.tsx");
  const arrayStart = afdpSrc.indexOf("[", startIdx);
  let depth = 0, i = arrayStart;
  for (; i < afdpSrc.length; i++) {
    if (afdpSrc[i] === "[") depth++;
    else if (afdpSrc[i] === "]") { depth--; if (depth === 0) break; }
  }
  return new Function("return " + afdpSrc.substring(arrayStart, i + 1))() as any;
}

// Canonical teams for snapshot baselines
const CANONICAL_TEAMS = 12;

interface SnapshotContext {
  leagueType: string;
  scoring: string;
  superflex: boolean;
  tePremium: number;
  idp: boolean;
}

/**
 * Generate canonical dynasty values for a context.
 * Replicates the app's VBD-based posRank pipeline then calls computeDynastyTradeVal.
 */
function generateDynastyValues(players: any[], ctx: SnapshotContext) {
  // Dynasty sKey is ALWAYS "PPR" (hardcoded in app line 3146)
  const sKey = "PPR";
  const isSF = ctx.superflex;
  const tePremium = ctx.tePremium;

  // Compute baselines
  const bl = getBaselines(CANONICAL_TEAMS, isSF);
  const eligible = players.filter((p: any) =>
    ["QB", "RB", "WR", "TE", "K", "DST", "DL", "LB", "DB"].includes(p.pos)
  );

  // Group by position for baseline computation
  const byPos: Record<string, any[]> = {};
  eligible.forEach((p: any) => {
    if (!byPos[p.pos]) byPos[p.pos] = [];
    byPos[p.pos].push(p);
  });

  // Compute baseline values per position (same as app lines 3154-3156)
  const baseVal: Record<string, number> = {};
  Object.keys(byPos).forEach((pos) => {
    const sorted = byPos[pos].slice().sort((a: any, b: any) => (b.proj?.[sKey] || 0) - (a.proj?.[sKey] || 0));
    const idx = Math.min((bl[pos] || CANONICAL_TEAMS) - 1, sorted.length - 1);
    baseVal[pos] = sorted[idx]?.proj?.[sKey] || 0;
  });

  // Compute VBD for each player (same as app lines 3166-3186)
  const withVbd = eligible.map((p: any) => {
    let pts = (p.proj?.[sKey] || p.proj?.PPR || 0);
    // TEP projection boost (app line 3177)
    if (p.pos === "TE" && tePremium > 0) {
      const estRec = p.proj?.PPR && p.proj?.Standard ? Math.round((p.proj.PPR - p.proj.Standard) * 0.7) : 45;
      pts += tePremium * estRec;
    }
    // Dynasty bonus on projections (app line 3178)
    pts = pts * dynastyBonus(p.pos, p.age);
    // KTC override for dynasty ranking (app line 3180)
    if (p.ktcVal) pts = p.ktcVal * 0.037;
    const raw = pts - (baseVal[p.pos] || 0);
    const vbd = isSF && p.pos === "QB" ? raw * 1.38 : raw;
    return { ...p, _pts: pts, _vbd: vbd };
  });

  // Sort by VBD for posRank (same as app Pass 1, lines 3189-3194)
  withVbd.sort((a, b) => b._vbd - a._vbd);
  const prc: Record<string, number> = {};
  withVbd.forEach((p) => {
    prc[p.pos] = (prc[p.pos] || 0) + 1;
    p._posRank = prc[p.pos];
  });

  // Compute dynasty trade values using canonical helper
  return withVbd.map((p) => ({
    player_slug: playerSlug(p.name),
    player_name: p.name,
    pos: p.pos,
    value: Math.min(9999, Math.max(0, computeDynastyTradeVal(
      p.pos, p.age, p.ktcVal, p._posRank, p.proj?.[sKey] || 0,
      { isSF, sKey, tePremium, idpMode: ctx.idp },
    ))),
  }));
}

/**
 * Generate canonical redraft values for a context.
 * Replicates the app's VBD pipeline then calls computeRedraftTradeVal.
 */
function generateRedraftValues(players: any[], ctx: SnapshotContext) {
  const sKey = ctx.scoring;
  const isSF = ctx.superflex;
  const tePremium = ctx.tePremium;

  const bl = getBaselines(CANONICAL_TEAMS, isSF);
  const eligible = players.filter((p: any) =>
    ["QB", "RB", "WR", "TE", "K", "DST", "DL", "LB", "DB"].includes(p.pos)
  );

  const byPos: Record<string, any[]> = {};
  eligible.forEach((p: any) => {
    if (!byPos[p.pos]) byPos[p.pos] = [];
    byPos[p.pos].push(p);
  });

  const baseVal: Record<string, number> = {};
  Object.keys(byPos).forEach((pos) => {
    const sorted = byPos[pos].slice().sort((a: any, b: any) =>
      ((b.proj?.[sKey] || b.proj?.PPR || 0) - (a.proj?.[sKey] || a.proj?.PPR || 0))
    );
    const idx = Math.min((bl[pos] || CANONICAL_TEAMS) - 1, sorted.length - 1);
    baseVal[pos] = sorted[idx]?.proj?.[sKey] || sorted[idx]?.proj?.PPR || 0;
  });

  const withVbd = eligible.map((p: any) => {
    let pts = (p.proj?.[sKey] || p.proj?.PPR || 0);
    // TEP projection boost
    if (p.pos === "TE" && tePremium > 0) {
      const estRec = p.proj?.PPR && p.proj?.Standard ? Math.round((p.proj.PPR - p.proj.Standard) * 0.7) : 45;
      pts += tePremium * estRec;
    }
    // Redraft: NO dynastyBonus, NO KTC override
    const raw = pts - (baseVal[p.pos] || 0);
    const vbd = isSF && p.pos === "QB" ? raw * 1.38 : raw;
    return { ...p, _pts: pts, _vbd: vbd };
  });

  // Sort by VBD for posRank
  withVbd.sort((a, b) => b._vbd - a._vbd);
  const prc: Record<string, number> = {};
  withVbd.forEach((p) => {
    prc[p.pos] = (prc[p.pos] || 0) + 1;
    p._posRank = prc[p.pos];
  });

  // Compute redraft trade values using canonical helper
  return withVbd.map((p) => {
    const baseTV = Math.round(p._vbd * REDRAFT_TV_MULT);
    return {
      player_slug: playerSlug(p.name),
      player_name: p.name,
      pos: p.pos,
      value: Math.min(9999, Math.max(0, computeRedraftTradeVal(
        p.pos, p._posRank, baseTV, { isSF },
      ))),
    };
  });
}

function generateForContext(players: any[], ctx: SnapshotContext) {
  const snaps = ctx.leagueType === "dynasty"
    ? generateDynastyValues(players, ctx)
    : generateRedraftValues(players, ctx);

  // Deterministic ordering
  return snaps.sort((a, b) => a.player_slug.localeCompare(b.player_slug));
}

// ── Main ──
const isDryRun = !process.argv.includes("--write");
const players = parsePlayers();
const versionParsed = parseValuesVersion(VALUES_VERSION);
if (!versionParsed) {
  console.error("Invalid VALUES_VERSION format:", VALUES_VERSION);
  process.exit(1);
}

console.log("=== FDP Value Snapshot Producer ===");
console.log(`Mode: ${isDryRun ? "DRY RUN" : "WRITE"}`);
console.log(`Values Version: ${VALUES_VERSION}`);
console.log(`Effective Date: ${versionParsed.date}`);
console.log(`Player Universe: ${players.length} players`);
console.log(`Contexts: ${FDP_SNAPSHOT_CONTEXTS.length}`);
console.log("");

const outputDir = resolve(thisDir, "output");
try { mkdirSync(outputDir, { recursive: true }); } catch {}

// Expected snapshot-eligible player count (all positions in PLAYERS)
const expectedCount = players.filter((p: any) =>
  ["QB", "RB", "WR", "TE", "K", "DST", "DL", "LB", "DB"].includes(p.pos)
).length;
console.log(`Snapshot-eligible players: ${expectedCount}`);
console.log("");

const spotCheckNames = ["Josh Allen", "Bijan Robinson", "Ja'Marr Chase", "Brock Bowers"];

for (const ctx of FDP_SNAPSHOT_CONTEXTS) {
  const label = `${ctx.leagueType}:${ctx.scoring}:${ctx.superflex ? "SF" : "1QB"}:TEP${ctx.tePremium}`;
  const snaps = generateForContext(players, ctx);

  // ── Write-integrity safety gate ──
  // 1. Context must be in supported matrix
  if (!isSnapshotContextSupported(ctx)) {
    console.error(`  SAFETY GATE FAILED: context ${label} not in FDP_SNAPSHOT_CONTEXTS`);
    process.exit(1);
  }
  // 2. Player count must match snapshot-eligible universe
  if (snaps.length !== expectedCount) {
    console.error(`  SAFETY GATE FAILED: expected ${expectedCount} players, got ${snaps.length} in ${label}`);
    process.exit(1);
  }
  // 3. No duplicate slugs
  const slugSet = new Set(snaps.map(s => s.player_slug));
  if (slugSet.size !== snaps.length) {
    console.error(`  SAFETY GATE FAILED: ${snaps.length - slugSet.size} duplicate slugs in ${label}`);
    process.exit(1);
  }
  // 4. All values must be finite integers 0-9999
  const badRows = snaps.filter(s => !Number.isFinite(s.value) || s.value < 0 || s.value > 9999 || !Number.isInteger(s.value));
  if (badRows.length > 0) {
    console.error(`  SAFETY GATE FAILED: ${badRows.length} invalid values in ${label}`);
    badRows.slice(0, 5).forEach(r => console.error(`    ${r.player_name}: ${r.value}`));
    process.exit(1);
  }

  console.log(`[${label}] ${snaps.length} players`);

  // Spot check
  for (const name of spotCheckNames) {
    const s = snaps.find(s => s.player_name === name);
    if (s) console.log(`  ${s.player_name}: ${s.value}`);
  }

  // Write artifact
  const payload = {
    values_version: VALUES_VERSION,
    effective_at: versionParsed.date,
    context: {
      league_type: ctx.leagueType,
      scoring: ctx.scoring,
      superflex: ctx.superflex,
      te_premium: ctx.tePremium,  // numeric: 0, 0.25, 0.5, or 1.0
      idp: ctx.idp,
    },
    snapshots: snaps,
  };

  const filename = `snapshot-${label.replace(/:/g, "-")}.json`;
  writeFileSync(resolve(outputDir, filename), JSON.stringify(payload, null, 2));

  if (!isDryRun) {
    const edgeUrl = process.env.EDGE_URL;
    const writeSecret = process.env.FDP_SNAPSHOT_WRITE_SECRET;
    if (!edgeUrl || !writeSecret) {
      console.error("WRITE mode requires EDGE_URL and FDP_SNAPSHOT_WRITE_SECRET env vars");
      process.exit(1);
    }
    console.log(`  → POSTing to ${edgeUrl}/record-value-snapshots ...`);
    const res = await fetch(`${edgeUrl}/record-value-snapshots`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${writeSecret}`,
      },
      body: JSON.stringify(payload),
    });
    const resBody = await res.json();
    console.log(`  → ${res.status}: ${JSON.stringify(resBody)}`);
  }

  console.log("");
}

console.log("Done.");
if (isDryRun) {
  console.log(`Artifacts written to: ${outputDir}`);
  console.log("Run with --write to POST to Edge Function.");
}
